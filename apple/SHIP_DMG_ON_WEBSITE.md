# Ship DMG On A Website

## Release Requirements

- Public DMG distribution requires active Apple Developer Program membership, a locally available `Developer ID Application` identity, Apple notarization credentials, stapling, and Gatekeeper verification.
- Keep current enrollment, team, certificate, keychain profile, and release-machine state in ignored local/operator notes such as `../AGENTS.local.md`; do not commit those values here.
- Unsigned preview DMGs are acceptable only as temporary test artifacts.
- If a browser-downloaded DMG shows `"Chuchotage.app" Not Opened` with `Apple could not verify`, that is the expected Gatekeeper result for an unsigned or ad-hoc signed preview build. Do not publish that artifact as the normal website download.
- Treat a DMG as website-ready only when the packaging report and Gatekeeper assessment confirm `Notarized Developer ID` for that exact artifact.

## Implemented

- macOS deployment target is `14.2`, matching the Core Audio process-tap requirement.
- `Release` macOS builds disable injected base signing entitlements.
- `scripts/package_unsigned_macos.sh` builds the macOS app without Xcode signing, ad-hoc signs it with hardened runtime, refuses `get-task-allow`, creates a read-only compressed DMG, verifies the DMG, and emits SHA-256 plus a packaging report.
- `scripts/package_release_macos.sh` is the website-release path. It requires a `Developer ID Application` identity, signs the app and DMG, submits the DMG to Apple notarization, staples the ticket, and verifies Gatekeeper assessment before writing release outputs.
- DMG contents are intentionally simple: `Chuchotage.app` and an `/Applications` symlink.

## Unsigned Preview Command

```bash
cd apple
./scripts/package_unsigned_macos.sh
```

Expected outputs:

- `build/dist/Chuchotage-<version>-macOS-unsigned.dmg`
- `build/dist/Chuchotage-<version>-macOS-unsigned.dmg.sha256`
- `build/dist/Chuchotage-<version>-macOS-unsigned.txt`

Use this only when debugging the built `.app` before it is packed:

```bash
KEEP_DERIVED_DATA=1 ./scripts/package_unsigned_macos.sh
```

Do not upload the unsigned preview to the public website. If a named tester needs it before notarization is available, share it through a private/manual channel and label it as Gatekeeper-blocked. It is not a user-installable release on a normal Gatekeeper-enabled Mac.

## Website Release Command

Use this when a Developer ID certificate and notarization credentials are available locally:

```bash
cd apple
NOTARYTOOL_KEYCHAIN_PROFILE=<local-notary-profile> \
  ./scripts/package_release_macos.sh
```

If a keychain profile has not been stored with `xcrun notarytool store-credentials`, the script also accepts `APPLE_ID`, `APPLE_TEAM_ID`, and `APPLE_APP_SPECIFIC_PASSWORD` from the environment. Do not commit or paste those values.

Expected release outputs:

- `build/dist/Chuchotage-<version>-macOS.dmg`
- `build/dist/Chuchotage-<version>-macOS.dmg.sha256`
- `build/dist/Chuchotage-<version>-macOS.txt`
- `build/dist/Chuchotage-<version>-macOS-notary.json`

## Pre-Website Technical Checklist

- Run `./scripts/package_release_macos.sh` from a clean worktree.
- Confirm the report says the app is signed with `Developer ID Application`, is stapled, and has no `com.apple.security.get-task-allow` entitlement.
- Confirm `hdiutil verify` succeeds.
- Confirm the binary is universal unless intentionally shipping Apple Silicon only.
- Download the DMG through the real website URL in Safari and Chrome, then test first launch on a Gatekeeper-enabled Mac.
- Keep the browser-added quarantine attribute during testing; do not strip it before launch testing.
- Publish the `.sha256` file next to the DMG.
- Serve the DMG over HTTPS with a stable versioned URL.
- Use `Content-Type: application/x-apple-diskimage`.
- Keep file size, checksum, build date, and minimum macOS version visible near the download link.
- For an unlisted tester page, use a non-obvious path, include `noindex,nofollow,noarchive`, and keep the page out of `sitemap.xml` and site navigation. Remember that this is still a public URL for anyone with the link.
- Do not use `.pkg`, postinstall scripts, helper tools, launch daemons, or auto-updaters for the unsigned preview.
- Keep generated `build/`, DerivedData, archives, signing material, and notarization credentials out of git.

## Known Unsigned Limitations

- Gatekeeper will not treat this as an identified-developer release.
- Some users may need Apple's manual Open Anyway flow.
- `spctl --assess --type execute` is expected to reject the unsigned preview app.
- The only real fix is Developer ID signing plus notarization.
- Do not tell normal website visitors to bypass Gatekeeper for Chuchotage. Remove the download or wait for the notarized release path instead.

## Release Maintenance

- Verify a `Developer ID Application` certificate is available in the release machine's login keychain.
- Keep notarization credentials stored with `xcrun notarytool store-credentials`, or provide them through local environment variables at release time.
- Record local profile names and machine-specific setup notes in ignored local/operator notes, not in this committed guide.
- Run `scripts/package_release_macos.sh`.
- Verify on a clean Gatekeeper-enabled Mac from a fresh browser download.
- Replace website copy and artifact naming so the normal download is not labeled unsigned preview.

## References

- Apple Developer: https://developer.apple.com/support/developer-id/
- Xcode help: https://help.apple.com/xcode/mac/current/en.lproj/dev033e997ca.html
- Apple notarization docs: https://developer.apple.com/documentation/security/notarizing_macos_software_before_distribution
