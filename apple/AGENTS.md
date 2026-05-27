# Apple Platform Guidance

## Scope

This folder is the native Apple-platform implementation for Chuchotage, covering iOS and macOS only.

Keep Apple work isolated under `apple/` unless a task explicitly asks for shared repository changes. Do not change the Android package name, Google Play identity, or Android runtime behavior from this folder.

Shared product, UX, brand, listening/routing, and copy guidance lives in `../docs/product-design-guidelines.md`. Keep Apple-specific build and implementation guidance here.

The public iOS App Store listing is `https://apps.apple.com/it/app/chuchotage/id6770434335`.

## Product Shape

Mirror the cross-platform Chuchotage product shape and `../docs/product-design-guidelines.md` unless a platform convention requires a small adaptation. Use Android and Windows as behavior references for translation flow, Realtime request shapes, audio routing, and error handling, but keep Apple implementation work Apple-local.

## Implementation Direction

- Use Swift and SwiftUI.
- Keep shared Apple code in `Chuchotage/` until there is a clear reason to split iOS and macOS implementations.
- Treat real-device audio smoke testing, OAuth callback behavior on real devices, sponsored-trial live endpoint smoke, and hardware-only route/interruption fixes as the main implementation blockers.
- Keep current iOS microphone-first. Same-device iOS/iPadOS app-audio translation is possible only through the planned ReplayKit broadcast path in `../docs/ios-replaykit-device-audio-plan.md`; do not present it as shipped until that plan is implemented and real-device Zoom/audio tests pass. Keep macOS desktop-first: capture Mac playback audio with Core Audio process taps on macOS 14.2+ and avoid recapturing Chuchotage playback.
- Use XcodeGen from `project.yml` to regenerate the Xcode project.
- Do not commit Xcode user state, DerivedData, archives, or signing credentials.
- Treat Apple signing teams, provisioning profiles, App Store Connect state, TestFlight notes, and private credential paths as local/operator notes only.
- If the generated `.xcodeproj` has been locally edited with a signing team, remember that `xcodegen generate` can overwrite that local signing setup. Reapply signing in Xcode or from local operator notes after regeneration.

## Build

### App Store Connect And TestFlight

Keep TestFlight and App Store Connect automation account-local. Do not commit API keys, `.p8` files, JWTs, exporter credentials, provisioning profiles, or screenshots that reveal private account data.

The iOS app has a public App Store listing. Use App Store Connect API credentials from ignored local/operator notes when automating build lookup, beta review status, beta testers, beta groups, and future submission metadata.

Use the exact App Store Connect issuer ID, API key ID, private-key path, app ID, TestFlight group IDs, and current beta-review state only from `../AGENTS.local.md`. If those local notes are missing or stale, verify them in App Store Connect before changing testers, groups, submissions, or review metadata.

External TestFlight testers require Beta App Review before the build becomes available to them. Internal testers can use eligible builds without that external beta review step. Keep beta review contact details, phone numbers, support addresses, tester email addresses, and review notes in ignored local/operator notes unless the user explicitly asks to commit public process documentation.

### Distribution Readiness

Keep current Apple Developer Program enrollment, team/account state, certificate availability, App Store Connect state, and notarytool profile names in ignored local/operator notes such as `../AGENTS.local.md`. Do not assume those identities exist on another machine; always verify the local keychain before signing or packaging.

Public macOS DMG distribution is possible only when the local machine has:

- An `Apple Development` identity for local signed debug builds.
- An `Apple Distribution` identity for App Store-oriented distribution work.
- A `Developer ID Application` identity for website-distributed macOS builds.
- A stored notarytool keychain profile, with the profile name read from ignored local/operator notes or provided explicitly through `NOTARYTOOL_KEYCHAIN_PROFILE`.

Re-check the local keychain before packaging:

```bash
security find-identity -v -p codesigning
```

Use `scripts/package_unsigned_macos.sh` only for local preview artifacts. Use `scripts/package_release_macos.sh` for any website-ready macOS DMG, and do not publish a DMG unless signing, notarization, stapling, and Gatekeeper verification complete. The release path is:

```bash
NOTARYTOOL_KEYCHAIN_PROFILE=<local-notary-profile> ./scripts/package_release_macos.sh
```

If notarization credentials must be created again, store them in Keychain with `xcrun notarytool store-credentials` using an app-specific Apple password. Never paste, print, or commit the password. Local files containing app-specific passwords must stay ignored.

If an organization/team membership is used instead of individual enrollment, the team Account Holder or Admin must provide the required certificate/signing/notarization access. Keep team IDs, provisioning details, Apple account state, and notarization credentials in ignored local/operator notes, not in committed files.

Do not publish unsigned or ad-hoc DMGs to the public site. A browser-downloaded DMG should assess as `Notarized Developer ID` before it is shared with normal users.

### Xcode Setup

Use full Xcode, not only the Command Line Tools. Keep exact installed Xcode versions and machine-specific setup notes in ignored local/operator notes when they matter.

After installing or updating Xcode, check the selected developer directory:

```bash
xcode-select -p
```

If it still points at `/Library/Developer/CommandLineTools`, switch to full Xcode:

```bash
sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
```

For one-off command-line checks before changing the global selection, prefix commands with:

```bash
DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer
```

Check first-launch setup before debugging build failures:

```bash
xcodebuild -checkFirstLaunchStatus
```

If required, complete first-launch setup from Xcode or run:

```bash
sudo xcodebuild -runFirstLaunch
```

Keep the installed iOS platform component matched to the installed Xcode version. If iOS builds report an error like `iOS 26.5 is not installed`, install that iOS platform from `Xcode > Settings > Components` before trying to run on a device.

For iOS testing, prefer an available physical device when simulator runtimes are missing or too large for the current machine. Keep specific local device names and storage constraints in ignored local/operator notes.

### Project Generation

Generate the project from the `apple/` folder:

```bash
xcodegen generate
```

Open the generated project:

```bash
open ChuchotageApple.xcodeproj
```

### Validation

The macOS target should build without signing for local smoke checks:

```bash
DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer \
xcodebuild -project ChuchotageApple.xcodeproj \
  -scheme "Chuchotage macOS" \
  -configuration Debug \
  -destination "platform=macOS" \
  -derivedDataPath /tmp/chuchotage-xcode-derived-macos \
  CODE_SIGNING_ALLOWED=NO \
  build
```

Clean temporary derived data after command-line checks:

```bash
rm -rf /tmp/chuchotage-xcode-derived-*
```

For iPhone testing, select the `Chuchotage iOS` scheme and a connected iPhone. Set a signing team in `Signing & Capabilities` when Xcode prompts. A free Apple ID should be enough for local device runs; TestFlight and App Store distribution require Apple Developer Program membership.

Current iOS signing still needs at least one registered physical test device before Xcode can generate an iOS development provisioning profile. Connect and trust the device, then run the `Chuchotage iOS` scheme with automatic signing enabled.
