# Chuchotage Open Source Release

Use this checklist before making the repository public or publishing a GitHub Release with an APK. It is intentionally stricter than normal day-to-day development because the repository has local Play, DNS, hosting, and signing workflows around it.

## Status

Chuchotage is a cross-platform app repository. iOS has a public App Store listing, Android has a public Google Play listing, and desktop companion/download artifacts should be released only when the relevant signing, notarization, and packaging checks pass.

Before announcing the project as open source, choose and add a `LICENSE` file. Until a license is present, the code is public source at most, not clearly open source.

## Release Preconditions

- `AGENTS.local.md` is ignored and not tracked.
- No OpenAI API keys, ChatGPT/Codex tokens, OAuth tokens, Play service account JSON, signing properties, keystores, Namecheap credentials, DNS credentials, or review keys are tracked.
- `local.properties`, `.env`, generated credential files, APKs, AABs, and signing artifacts are ignored.
- Raw Codex/chat session exports are not tracked. Public provenance belongs in curated files such as `docs/provenance/ideas.md` and `docs/provenance/manifesto.md`.
- Private tester, WhatsApp, CRM, outreach, account setup, deployment, store-console, signing, notarization, and local machine operation notes are not tracked.
- The privacy policy remains accurate: no ads, no analytics SDKs, no hosted Chuchotage backend for normal use, credentials stored locally, and microphone audio sent directly to OpenAI only during active translation.
- The README clearly says users need their own OpenAI credential or ChatGPT login/token.
- The Android package name remains `com.andreabertoncini.chuchotage`.
- `versionCode` is higher than any APK/AAB already distributed to the same testers.

## Automated Check

Run this before making the repository public, tagging a release, or attaching a binary:

```bash
./scripts/open_source_check.sh
```

The script fails on tracked files or strings that look like secret material. It warns on a dirty worktree, missing license, local/private path references, or generated directories. Warnings are not automatically blockers, but each one should be intentionally reviewed.

For an extra manual pass, inspect the tracked file list:

```bash
git status --short
git ls-files
git grep -n -I -E '(@s\.whatsapp\.net|wacli|AuthKey_|appstore-connect\.env|notarizationpassword|/Users/andreabertoncini|hetzner_wofi_ed25519)' -- . ':!OPEN_SOURCE_RELEASE.md' ':!scripts/open_source_check.sh'
```

If a secret ever appears in tracked history, do not just delete it in a later commit. Revoke or rotate the credential, then clean history before making the repository public.

## APK Distribution While Play Testing

Preferred APK source:

1. Build/upload the AAB to Google Play testing.
2. Download the signed universal APK from Play Console's App Bundle Explorer.
3. Attach that APK to a GitHub Release marked as a pre-release.

That APK is signed with the Play app-signing key, which avoids update conflicts for testers who later install through Google Play. A locally signed debug APK is acceptable only for quick developer testing; users may need to uninstall it before installing the Play-signed version.

Do not commit APKs or AABs to git history. Attach them to GitHub Releases or host them on the website.

## GitHub Release Template

Use a tag such as:

```text
android-v0.1.1-vc2
```

Suggested release title:

```text
Chuchotage Android 0.1.1 testing build
```

Suggested notes:

```markdown
Pre-release Android build for Chuchotage testers.

- Requires Android 8.0 or newer.
- Requires your own OpenAI API key or ChatGPT/Codex-style login/token.
- No Chuchotage backend is required for normal use.
- Microphone audio is sent directly to OpenAI only while translation is active.
- This APK is for off-store testing; public Android users should prefer the Google Play listing when available.

SHA-256:
```

Generate the checksum with:

```bash
shasum -a 256 path/to/chuchotage.apk
```

Suggested asset name:

```text
chuchotage-android-0.1.1-vc2-universal.apk
```

## Tester Install Notes

Tell testers:

- Install from Google Play when possible.
- If using the APK, Android will ask them to allow installs from that download source.
- If they installed a debug or differently signed APK earlier, they may need to uninstall it before installing the Play-signed APK.
- They should provide their own OpenAI credential and not share it with anyone.
- Sideloaded APK installs may not update cleanly to the Play-signed app if the signing lineage differs.

## Final Public-Repo Pass

Before flipping repository visibility:

1. Run `./scripts/open_source_check.sh`.
2. Add or confirm `LICENSE`.
3. Review `README.md` from the perspective of a stranger.
4. Confirm GitHub issue templates or Discussions are acceptable, if enabled.
5. Confirm the Play review/testing key is not present anywhere in code, docs, releases, or chat-export artifacts.
6. Confirm raw chat/session logs, private CRM/outreach work, WhatsApp-derived material, store-console workflows, and deployment notes remain only in private ignored locations.
7. Confirm release assets are attached to GitHub Releases, not committed.
8. Confirm old local-only deployment notes remain only in ignored private notes such as `AGENTS.local.md`.
