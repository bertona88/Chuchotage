#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APPLE_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
PROJECT="$APPLE_DIR/ChuchotageApple.xcodeproj"
SCHEME="Chuchotage macOS"
CONFIGURATION="${CONFIGURATION:-Release}"
DERIVED_DATA="${DERIVED_DATA:-/tmp/chuchotage-xcode-derived-macos-unsigned}"
KEEP_DERIVED_DATA="${KEEP_DERIVED_DATA:-0}"
DIST_DIR="$APPLE_DIR/build/dist"
STAGE_DIR="$APPLE_DIR/build/dmg-stage"
APP_NAME="Chuchotage"
APP_PATH="$DERIVED_DATA/Build/Products/$CONFIGURATION/$APP_NAME.app"

cd "$APPLE_DIR"

cleanup() {
  rm -rf "$STAGE_DIR"
  if [[ "$KEEP_DERIVED_DATA" != "1" ]]; then
    rm -rf "$DERIVED_DATA"
  fi
}
trap cleanup EXIT

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
  echo "Expected app was not built: $APP_PATH" >&2
  exit 1
fi

VERSION="$(/usr/libexec/PlistBuddy -c 'Print :CFBundleShortVersionString' "$APP_PATH/Contents/Info.plist")"
BUILD_NUMBER="$(/usr/libexec/PlistBuddy -c 'Print :CFBundleVersion' "$APP_PATH/Contents/Info.plist")"
DMG_PATH="$DIST_DIR/Chuchotage-${VERSION}-macOS-unsigned.dmg"
SHA_PATH="$DMG_PATH.sha256"
REPORT_PATH="$DIST_DIR/Chuchotage-${VERSION}-macOS-unsigned.txt"

find "$APP_PATH/Contents" \
  \( -name "*.framework" -o -name "*.dylib" -o -name "*.appex" -o -name "*.xpc" \) \
  -print0 |
  while IFS= read -r -d '' nested_code; do
    codesign --force --sign - --timestamp=none --options runtime "$nested_code"
  done

codesign --force --sign - --timestamp=none --options runtime "$APP_PATH"
codesign --verify --deep --strict --verbose=2 "$APP_PATH"

if codesign --display --entitlements - "$APP_PATH" 2>/dev/null | grep -q "com.apple.security.get-task-allow"; then
  echo "Refusing to package app with get-task-allow entitlement." >&2
  exit 1
fi

ditto "$APP_PATH" "$STAGE_DIR/$APP_NAME.app"
ln -s /Applications "$STAGE_DIR/Applications"

rm -f "$DMG_PATH" "$SHA_PATH" "$REPORT_PATH"
hdiutil create \
  -volname "$APP_NAME" \
  -srcfolder "$STAGE_DIR" \
  -ov \
  -format UDZO \
  "$DMG_PATH"
hdiutil verify "$DMG_PATH"
shasum -a 256 "$DMG_PATH" | tee "$SHA_PATH"

{
  echo "Chuchotage unsigned macOS preview DMG"
  echo "Website-ready: no"
  echo "Gatekeeper-clean: no"
  echo "Use scripts/package_release_macos.sh for public website distribution after Developer ID signing and notarization are available."
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
  echo "Gatekeeper assessment:"
  spctl --assess --type execute --verbose=4 "$APP_PATH" 2>&1 || true
  echo
  echo "SHA-256:"
  cat "$SHA_PATH"
} >"$REPORT_PATH"

echo "DMG: $DMG_PATH"
echo "SHA-256: $SHA_PATH"
echo "Report: $REPORT_PATH"
echo "Unsigned preview only. Do not publish this DMG as a normal website download."
