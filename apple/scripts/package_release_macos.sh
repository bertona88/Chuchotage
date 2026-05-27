#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APPLE_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
PROJECT="$APPLE_DIR/ChuchotageApple.xcodeproj"
SCHEME="Chuchotage macOS"
CONFIGURATION="${CONFIGURATION:-Release}"
DERIVED_DATA="${DERIVED_DATA:-/tmp/chuchotage-xcode-derived-macos-release}"
KEEP_DERIVED_DATA="${KEEP_DERIVED_DATA:-0}"
DIST_DIR="$APPLE_DIR/build/dist"
STAGE_DIR="$APPLE_DIR/build/dmg-stage-release"
APP_NAME="Chuchotage"
APP_PATH="$DERIVED_DATA/Build/Products/$CONFIGURATION/$APP_NAME.app"
VERIFY_MOUNT=""

die() {
  echo "error: $*" >&2
  exit 1
}

cleanup() {
  if [[ -n "$VERIFY_MOUNT" && -d "$VERIFY_MOUNT" ]]; then
    hdiutil detach "$VERIFY_MOUNT" >/dev/null 2>&1 || true
    rmdir "$VERIFY_MOUNT" >/dev/null 2>&1 || true
  fi
  rm -rf "$STAGE_DIR"
  if [[ "$KEEP_DERIVED_DATA" != "1" ]]; then
    rm -rf "$DERIVED_DATA"
  fi
}
trap cleanup EXIT

find_developer_id_identity() {
  local configured_identity="${DEVELOPER_ID_APPLICATION_IDENTITY:-${SIGNING_IDENTITY:-}}"
  if [[ -n "$configured_identity" ]]; then
    echo "$configured_identity"
    return 0
  fi

  local identities=()
  while IFS= read -r identity; do
    identities+=("$identity")
  done < <(security find-identity -v -p codesigning | awk -F\" '/Developer ID Application:/ { print $2 }')

  if [[ "${#identities[@]}" -eq 0 ]]; then
    die "no Developer ID Application signing identity found. Install one or set DEVELOPER_ID_APPLICATION_IDENTITY."
  fi

  if [[ "${#identities[@]}" -gt 1 ]]; then
    printf 'found multiple Developer ID Application identities:\n' >&2
    printf '  %s\n' "${identities[@]}" >&2
    die "set DEVELOPER_ID_APPLICATION_IDENTITY to the exact identity to use."
  fi

  echo "${identities[0]}"
}

SIGNING_IDENTITY="$(find_developer_id_identity)"
NOTARY_ARGS=()
if [[ -n "${NOTARYTOOL_KEYCHAIN_PROFILE:-}" ]]; then
  NOTARY_ARGS=(--keychain-profile "$NOTARYTOOL_KEYCHAIN_PROFILE")
elif [[ -n "${APPLE_ID:-}" && -n "${APPLE_TEAM_ID:-}" && -n "${APPLE_APP_SPECIFIC_PASSWORD:-}" ]]; then
  NOTARY_ARGS=(
    --apple-id "$APPLE_ID"
    --team-id "$APPLE_TEAM_ID"
    --password "$APPLE_APP_SPECIFIC_PASSWORD"
  )
else
  die "set NOTARYTOOL_KEYCHAIN_PROFILE, or APPLE_ID plus APPLE_TEAM_ID plus APPLE_APP_SPECIFIC_PASSWORD."
fi

cd "$APPLE_DIR"

rm -rf "$DERIVED_DATA" "$STAGE_DIR"
mkdir -p "$DIST_DIR" "$STAGE_DIR"

xcodebuild \
  -project "$PROJECT" \
  -scheme "$SCHEME" \
  -configuration "$CONFIGURATION" \
  -destination "platform=macOS" \
  -derivedDataPath "$DERIVED_DATA" \
  CODE_SIGNING_ALLOWED=NO \
  CODE_SIGNING_REQUIRED=NO \
  CODE_SIGN_IDENTITY="" \
  CODE_SIGN_INJECT_BASE_ENTITLEMENTS=NO \
  build

if [[ ! -d "$APP_PATH" ]]; then
  die "expected app was not built: $APP_PATH"
fi

VERSION="$(/usr/libexec/PlistBuddy -c 'Print :CFBundleShortVersionString' "$APP_PATH/Contents/Info.plist")"
BUILD_NUMBER="$(/usr/libexec/PlistBuddy -c 'Print :CFBundleVersion' "$APP_PATH/Contents/Info.plist")"
DMG_PATH="$DIST_DIR/Chuchotage-${VERSION}-macOS.dmg"
SHA_PATH="$DMG_PATH.sha256"
REPORT_PATH="$DIST_DIR/Chuchotage-${VERSION}-macOS.txt"
NOTARY_LOG="$DIST_DIR/Chuchotage-${VERSION}-macOS-notary.json"

find "$APP_PATH/Contents" \
  \( -name "*.framework" -o -name "*.dylib" -o -name "*.appex" -o -name "*.xpc" \) \
  -print0 |
  while IFS= read -r -d '' nested_code; do
    codesign --force --sign "$SIGNING_IDENTITY" --timestamp --options runtime "$nested_code"
  done

codesign --force --sign "$SIGNING_IDENTITY" --timestamp --options runtime "$APP_PATH"
codesign --verify --deep --strict --verbose=2 "$APP_PATH"

if codesign --display --verbose=4 "$APP_PATH" 2>&1 | grep -q "Signature=adhoc"; then
  die "refusing to package an ad-hoc signed app for release."
fi

if codesign --display --entitlements - "$APP_PATH" 2>/dev/null | grep -q "com.apple.security.get-task-allow"; then
  die "refusing to package app with get-task-allow entitlement."
fi

ditto "$APP_PATH" "$STAGE_DIR/$APP_NAME.app"
ln -s /Applications "$STAGE_DIR/Applications"

rm -f "$DMG_PATH" "$SHA_PATH" "$REPORT_PATH" "$NOTARY_LOG"
hdiutil create \
  -volname "$APP_NAME" \
  -srcfolder "$STAGE_DIR" \
  -ov \
  -format UDZO \
  "$DMG_PATH"
hdiutil verify "$DMG_PATH"

codesign --force --sign "$SIGNING_IDENTITY" --timestamp "$DMG_PATH"
codesign --verify --verbose=2 "$DMG_PATH"

xcrun notarytool submit "$DMG_PATH" "${NOTARY_ARGS[@]}" --wait --output-format json | tee "$NOTARY_LOG"
xcrun stapler staple "$DMG_PATH"
xcrun stapler validate "$DMG_PATH"

spctl --assess --type open --context context:primary-signature --verbose=4 "$DMG_PATH"

VERIFY_MOUNT="$(mktemp -d /tmp/chuchotage-release-dmg.XXXXXX)"
hdiutil attach -nobrowse -readonly -mountpoint "$VERIFY_MOUNT" "$DMG_PATH" >/dev/null
spctl --assess --type execute --verbose=4 "$VERIFY_MOUNT/$APP_NAME.app"
hdiutil detach "$VERIFY_MOUNT" >/dev/null
rmdir "$VERIFY_MOUNT" >/dev/null 2>&1 || true
VERIFY_MOUNT=""

shasum -a 256 "$DMG_PATH" | tee "$SHA_PATH"

{
  echo "Chuchotage notarized macOS DMG"
  echo "Version: $VERSION"
  echo "Build: $BUILD_NUMBER"
  echo "Created: $(date -u '+%Y-%m-%dT%H:%M:%SZ')"
  echo "App build path: $APP_PATH"
  echo "DerivedData cleanup: $([[ "$KEEP_DERIVED_DATA" == "1" ]] && echo "kept" || echo "removed after packaging")"
  echo "DMG: $DMG_PATH"
  echo
  echo "Architectures:"
  lipo -info "$APP_PATH/Contents/MacOS/$APP_NAME"
  echo
  echo "Code signature:"
  codesign --display --verbose=4 "$APP_PATH" 2>&1
  echo
  echo "Entitlements:"
  codesign --display --entitlements - "$APP_PATH" 2>&1 || true
  echo
  echo "Stapler validation:"
  xcrun stapler validate "$DMG_PATH" 2>&1
  echo
  echo "Gatekeeper DMG assessment:"
  spctl --assess --type open --context context:primary-signature --verbose=4 "$DMG_PATH" 2>&1
  echo
  echo "SHA-256:"
  cat "$SHA_PATH"
} >"$REPORT_PATH"

echo "DMG: $DMG_PATH"
echo "SHA-256: $SHA_PATH"
echo "Report: $REPORT_PATH"
echo "Notary log: $NOTARY_LOG"
