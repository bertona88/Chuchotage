# Repository Guidance

## 1. Scope And Local Notes

This file is safe to commit; keep private deployment, credential, rollout, and machine-specific notes in ignored `AGENTS.local.md`, and read it only for operator-specific tasks.

Project tickets live in `TICKETS.md`; treat it as the lightweight Linear-style board for follow-up product and implementation work.

## 2. Product Focus

This repository is the cross-platform Chuchotage product monorepo.

Treat iOS, Android, macOS, Windows, website, and support-service work as separate product surfaces with clear ownership. Do not add or change another platform surface unless the task explicitly requires it.

Chuchotage is the product name across app stores and direct desktop downloads. The public iOS App Store listing is `https://apps.apple.com/it/app/chuchotage/id6770434335`; the public Android Google Play listing is `https://play.google.com/store/apps/details?id=com.andreabertoncini.chuchotage`.

Keep platform changes aligned with the current product shape: simple, direct, personal-use, and on-device where each operating system allows it. Normal app use must not require a deployed backend.

Keep cross-platform growth organized with strict platform boundaries. Prefer clearly named top-level platform areas, shared docs/specs/fixtures over shared runtime code unless there is a strong reason, and postpone broad repository restructuring until a platform need is active implementation work rather than future planning.

Shared product, UX, brand, audio-routing, and user-facing copy guidance lives in `docs/product-design-guidelines.md`. Update that file instead of duplicating design rules across platform docs.

Product-local guidance lives in `app/AGENTS.md`, `windows/AGENTS.md`, `apple/AGENTS.md`, `docs/AGENTS.md`, `server/AGENTS.md`, and `marketing/AGENTS.md`. Follow the local file for folder-specific work together with this repo-wide guidance.

### 2.1 Windows Companion

The Windows companion lives in `windows/`. It captures selected Windows playback audio with WASAPI loopback, streams it to OpenAI Realtime Translation, and plays translated audio to a selected output device.

Keep Windows work scoped to the Windows companion unless the user explicitly asks for shared cross-platform changes. Do not let Windows work change Android package identity, iOS bundle identity, app-store metadata, or unrelated platform behavior. The implementation README is `windows/README.md`; the product/technical concept spec is `docs/windows-companion-audio-translation-spec.md`; shared design guidance is `docs/product-design-guidelines.md`.

The Windows companion is intended to run as a normal user app without admin elevation, virtual audio drivers, a Teams integration, or a deployed Chuchotage backend. Build and runtime validation require a Windows machine with the .NET SDK.

The Windows UI is Electron in `windows/Chuchotage.Electron/`. Do not recreate the old WinForms UI. The .NET project in `windows/Chuchotage.Windows/` is now a headless bridge/backend: it owns WASAPI audio capture/playback, session volume mixing, credential exchange, and OpenAI Realtime Translation, and communicates with Electron over newline-delimited JSON on stdin/stdout. Electron owns the visible desktop UI, packaging scripts, shortcuts, and user-local installation.

Build and install the Electron Windows companion from `windows/Chuchotage.Electron/`:

```powershell
npm install
npm run install:user
```

This publishes the .NET backend, stages it into the Electron app, packages Electron for win-x64, copies the result to `%LOCALAPPDATA%/Programs/Chuchotage Electron`, and updates the Start Menu/Desktop shortcuts. Keep generated Electron/backend output out of git: `windows/Chuchotage.Electron/backend/`, `windows/Chuchotage.Electron/dist/`, `node_modules/`, and .NET `bin/`/`obj/` are local build artifacts.

If the machine has the .NET runtime but no admin rights for an SDK install, use the Microsoft user-local install script instead of `winget` or a machine-wide installer:

```powershell
$dotnetDir = Join-Path $env:USERPROFILE ".dotnet"
$script = Join-Path $env:TEMP "dotnet-install.ps1"
Invoke-WebRequest -Uri "https://dot.net/v1/dotnet-install.ps1" -OutFile $script
& $script -Channel 8.0 -InstallDir $dotnetDir -Architecture x64
& (Join-Path $dotnetDir "dotnet.exe") --info
```

For no-admin Windows backend work, invoke the SDK explicitly from `%USERPROFILE%/.dotnet/dotnet.exe` when needed:

```powershell
$dotnet = Join-Path $env:USERPROFILE ".dotnet/dotnet.exe"
& $dotnet build .\windows\Chuchotage.Windows\Chuchotage.Windows.csproj -c Release
& $dotnet publish .\windows\Chuchotage.Windows\Chuchotage.Windows.csproj -c Release -r win-x64 --self-contained true -p:PublishSingleFile=true
```

The .NET publish output is still under `windows/Chuchotage.Windows/bin/.../publish/`, but it is not the end-user app by itself. For normal local smoke testing, run or install the Electron wrapper. Do not commit generated `bin/` or `obj/` output.

The Windows companion may read Codex/ChatGPT auth from `%USERPROFILE%/.codex/auth.json` when the API key field is left empty. Treat those tokens as secrets: never print, log, commit, or paste their values. For same-headset testing, prefer the app's Windows audio-session mixer over virtual audio devices; virtual audio drivers usually need admin rights.

### 2.2 Apple Platforms

Native Apple-platform work lives in `apple/`, covering iOS and macOS from a shared SwiftUI scaffold.

Keep Apple work isolated under `apple/` unless a task explicitly asks for shared repository changes. iOS has a public App Store listing at `https://apps.apple.com/it/app/chuchotage/id6770434335`. Apple work must not change the Android package name, Play identity, Windows packaging, or unrelated platform behavior.

Apple implementations should follow the shared product shape and design guidance while respecting Apple platform conventions. Build/setup guidance lives in `apple/README.md`; folder-specific agent guidance lives in `apple/AGENTS.md`.

iOS/iPadOS same-device app-audio translation, including Zoom-on-device audio, is possible only as a planned ReplayKit broadcast feature. It is not current iOS behavior; follow `docs/ios-replaykit-device-audio-plan.md` before adding a user-facing iOS `Device audio` source.

## 3. Android App

### 3.1 Platform

- Main platform: Android/Kotlin.
- App module: `app/`.
- Google Play application id / package name: `com.andreabertoncini.chuchotage`. This is the permanent Play Console package name; do not change it casually.
- App label: `Chuchotage`.
- Minimum SDK: 26.
- UI: Jetpack Compose in `app/src/main/java/com/andreabertoncini/chuchotage/MainActivity.kt`.

### 3.2 Package Map

- Runtime translation: foreground translation service in `service/`.
- Translation settings: supported output language, preferred audio source, and output route in `settings/`.
- State management: `state/`.
- Audio capture/playback and PCM utilities: `audio/`.
- OpenAI credential, OAuth, Realtime event, and client-secret code: `network/`.
- Home-screen app widget: `widget/` plus related `res/layout` and `res/xml` files.

### 3.3 Credential Flow

The first-run credential flow supports:

- A personal OpenAI API key.
- ChatGPT/Codex-style login/token credentials.
- Optional sponsored trial mode, which stores a local install ID and asks the Chuchotage support service for a short-lived Realtime Translation client secret.

Credentials and sponsored-trial install IDs must be stored on-device through the secure storage path. Do not remove any credential mode unless the user explicitly asks. Normal API-key and ChatGPT/Codex use must stay backend-free; sponsored trial is the optional backend-mediated path.

### 3.4 Current UX

- Follow `docs/product-design-guidelines.md` for shared translation UX, visual direction, copy tone, and mobile headphone/earbud reminders.
- The main translate tab stays focused on start/stop, status, transcript, and the compact Android-style output-language selector. Audio-source selection belongs in Settings.
- Settings offers `Phone mic`, `Headset mic`, and Android `Device audio` where supported. Device audio uses Android playback capture, requires user approval through the MediaProjection prompt for each session, and only captures apps/audio that Android allows.
- Widget taps should toggle the same foreground service as the app. If microphone/audio permission, device-audio capture consent, or a credential is missing, the widget should open the app instead of trying to start translation.

### 3.5 Runtime Architecture

- `TranslationController` is the single source of truth for translation state and input volume.
- `TranslationForegroundService` owns the active session and responds to `TranslationActions.ACTION_START`, `ACTION_STOP`, and `ACTION_TOGGLE`.
- The foreground notification title should reflect the selected output language, such as `Translating to English`, and includes a Stop action that releases mic/device-audio capture, socket, and playback resources.
- `TranslationSession` connects directly to OpenAI Realtime Translate using the saved on-device credential.
- Audio capture uses mono PCM16 targeting 24 kHz, with resampling when the device captures at another supported native rate.
- Audio capture can prefer the built-in phone microphone, an attached headset/earbud microphone, or Android device playback audio on Android 10+ when the user grants MediaProjection consent and the source app permits playback capture.
- If headset input is selected but unavailable, fail clearly instead of silently using the wrong mic.
- Playback uses `AudioTrack` for mono PCM16 translated audio at 24 kHz.
- Realtime socket events send `session.input_audio_buffer.append` and handle output audio, transcript deltas, and error events.
- Live transcript panes for translated and original speech are part of the v1 product UI during an active session.
- Keep transcripts ephemeral: no transcript persistence, history, analytics, logs, sync, exports, or Chuchotage backend storage unless that is explicitly added with updated product, privacy, legal, and Play Data Safety guidance.

## 4. Product Design Guidelines

Shared product shape, UX, brand, listening/routing guidance, and copy tone live in `docs/product-design-guidelines.md`.

## 5. OpenAI Realtime Translation

### 5.1 Translation Endpoint

Official guide: `https://developers.openai.com/api/docs/guides/realtime-translation`. Treat it as the source of truth for endpoint, model, transport, and event names.

This app uses OpenAI Realtime Translation, not the conversational Realtime voice-agent flow.

- Use `gpt-realtime-translate` and the dedicated translation endpoints.
- Android WebSocket runtime should connect to `wss://api.openai.com/v1/realtime/translations?model=gpt-realtime-translate`.
- Do not use `/v1/realtime`, `/v1/realtime/calls`, or `response.create` for translation.
- The runtime error `Translation sessions are only supported on /v1/realtime/translations.` means the app is hitting the wrong endpoint.
- Translation starts from the incoming audio stream itself. Keep appending audio, including silence between phrases, and handle output events as they arrive.
- Realtime Translation source language is automatic.
- Configure only the target output language with `session.audio.output.language`, using the supported output language list in `TranslationLanguages`.
- On first run, the default output language follows the Android system language when it is in `TranslationLanguages`; otherwise it falls back to English (`en`). Saved user choices always win.
- Input transcription should continue to use `gpt-realtime-whisper` unless the user explicitly asks otherwise.
- Use one translation session per selected output language.
- If conversational translation is ever reintroduced, keep speaker tracks separate. v1 Android is listen-along one-way translation with automatic input detection.

### 5.2 Events

Expected translation events include:

- `session.output_audio.delta`
- `session.output_transcript.delta`
- `session.input_transcript.delta`
- Error events

### 5.3 Client Secrets

Client secrets for Realtime Translation are created with:

```text
POST https://api.openai.com/v1/realtime/translations/client_secrets
```

Use this short-lived secret path when exchanging ChatGPT/Codex tokens or when a client should not hold a main API key.

When using an API key credential, the WebSocket can send the usual `session.update`. When using a Realtime Translation client secret, session configuration is already embedded in the client-secret request, so avoid sending a conflicting `session.update`.

### 5.4 ChatGPT/Codex Auth Status

Current probe report: `docs/chatgpt-codex-auth-realtime-probe-report.md`.

As of the latest 2026-06-13 recheck, `~/.codex/auth.json` ChatGPT/Codex tokens can create Realtime and Realtime Translation client secrets, but the returned secrets fail when opening the Realtime WebSocket with `HTTP 500`. API-key-created Realtime Translation client secrets still work. The same ChatGPT/Codex tokens also fail normal OpenAI API endpoints such as `/v1/responses`, `/v1/models`, and `/v1/files`.

Do not treat ChatGPT/Codex sign-in or imported Codex auth as a production-supported Realtime credential path unless a fresh end-to-end health check proves the full stream works: mint translation client secret, open `wss://api.openai.com/v1/realtime/translations?model=gpt-realtime-translate`, send audio, receive output audio/transcript events, send `session.close`, and receive `session.closed`.

Production-supported credential paths should be a personal OpenAI API key, or sponsored-trial/server-minted Realtime Translation client secrets backed by a server-held OpenAI API key. Keep ChatGPT/Codex auth hidden, dev-only, or clearly fallback-gated while this status holds.

## 6. ChatGPT Login On Android

- Browser sign-in is implemented in `network/ChatGptOAuthClient.kt`.
- The flow uses `https://auth.openai.com`, PKCE S256, client id `app_EMoamEEZ73f0CkXaXp7hrann`, loopback redirect `http://localhost:{port}/auth/callback`, and callback ports `1455` then `1457`.
- Android Chrome redirects to `localhost:1455` or `localhost:1457` after login.
- The app runs a tiny local HTTP callback server during the login attempt and validates OAuth `state` before exchanging the one-time `code`.
- The callback response page is best-effort only. Browsers may close the localhost socket early and cause `Broken pipe`; that must not fail login after the app has already read the OAuth code.
- The callback server should remain tolerant of Android loopback quirks. Binding only to `127.0.0.1` can fail when Chrome resolves `localhost` differently, so keep the listener compatible with localhost routing on device.
- Token exchange and refresh happen against `https://auth.openai.com/oauth/token`.
- Android devices can transiently fail DNS during browser-to-app handoff, especially with VPN/private DNS. Keep retries/backoff and user-visible messages around DNS or connection failures.
- Store ChatGPT tokens through `SecureApiKeyStore`: `id_token`, `access_token`, `refresh_token`, and refresh timestamp.
- Treat tokens like password-grade secrets. Never log or print their values.
- Realtime Translate should not use the ChatGPT access token directly as the WebSocket bearer. `RealtimeTranslationClientSecretProvider` exchanges it for a short-lived Realtime Translation client secret. This path is currently not production-supported unless the end-to-end health check in section 5.4 passes.

## 7. Website And Privacy Policy

- Public website: `https://www.chuchotage.ai/`
- Public iOS App Store listing: `https://apps.apple.com/it/app/chuchotage/id6770434335`
- Public Android Google Play listing: `https://play.google.com/store/apps/details?id=com.andreabertoncini.chuchotage`
- Story/blog index: `https://www.chuchotage.ai/blog/`
- Name story: `https://www.chuchotage.ai/blog/why-chuchotage/`
- Privacy policy: `https://www.chuchotage.ai/privacy/`
- Sitemap: `https://www.chuchotage.ai/sitemap.xml`
- Robots: `https://www.chuchotage.ai/robots.txt`

Privacy policy links are present in the first-run credential screen and the settings tab. Keep the URL as `https://www.chuchotage.ai/privacy/` unless the website/domain changes.

The privacy policy says the app has no ads and no analytics SDKs, stores credentials locally through platform secure storage, sends selected audio and translation configuration directly to OpenAI during normal API-key and ChatGPT translation sessions, and uses the Chuchotage support service only for optional sponsored-trial token minting.

Operational website hosting and deployment notes belong in `AGENTS.local.md`.

## 8. Build And Test

Use Gradle for Android work:

```bash
./gradlew test
./gradlew assembleDebug
```

Use this only when a device or emulator is available:

```bash
./gradlew connectedDebugAndroidTest
```

Release bundle command for Google Play:

```bash
./gradlew clean bundleRelease
```

The generated release bundle is:

```text
app/build/outputs/bundle/release/app-release.aab
```

Relevant unit test areas:

- Audio encoding and volume metering in `app/src/test/java/.../audio/`.
- Realtime translation event parsing in `app/src/test/java/.../network/`.
- Translation settings and output language request bodies in `app/src/test/java/.../settings/`, `network/`, and `service/`.
- API key validation in `app/src/test/java/.../network/`.
- Translation state reducer behavior in `app/src/test/java/.../state/`.

Local machine-specific Java/Android SDK command forms belong in `AGENTS.local.md`.

## 9. Google Play Publishing

- Android is publicly listed on Google Play at `https://play.google.com/store/apps/details?id=com.andreabertoncini.chuchotage`.
- The Play Console app is named `Chuchotage` when preparing Android release work.
- The Play package name is `com.andreabertoncini.chuchotage`.
- Gradle Play Publisher is configured with plugin `com.github.triplet.play` version `3.13.0`.
- The local Gradle Play Publisher configuration defaults to the `internal` track as a `DRAFT` release and uses App Bundles by default unless intentionally changed for a public production upload.
- Only upload to Play Console after explicit user approval because it changes external state.
- Before the first upload attempt for a release, verify that `versionCode` is greater than any code already uploaded to Play Console. If the current checked-in version was the last successful Play upload, bump `versionCode` and `versionName` before building/publishing instead of letting Play reject the reused code.
- Do not print, commit, paste, rotate, or delete service account JSON, signing properties, upload keystores, or generated release credential material.

Useful publishing checks:

```bash
./gradlew tasks --group publishing
```

Publishing command, only after explicit approval:

```bash
./gradlew publishReleaseBundle
```

Account-specific publishing state, service-account details, signing paths, rollout notes, and reviewer instructions belong in `AGENTS.local.md`.

## 10. Apple Platform Status

Chuchotage is cross-platform. Native Apple implementation is active under `apple/` for iOS and macOS, and the iOS app has a public App Store listing at `https://apps.apple.com/it/app/chuchotage/id6770434335`.

Keep Apple platform work isolated under `apple/` unless the user explicitly asks for shared product or repository changes. Verify Apple's current membership terms before planning new distribution, signing, TestFlight, App Store release, or recurring Apple Developer Program commitments.

## 11. Security

- Do not commit API keys, ChatGPT tokens, OAuth tokens, `.env`, `local.properties`, keystore material, or generated credential files.
- Do not commit Google Play service account JSON, signing properties, upload keystores, or any generated release credential material.
- Do not commit DNS provider credentials or credential env files.
- Do not commit or paste temporary OpenAI API keys used for Google Play review.
- For local OpenAI service-account testing, use ignored `.secrets/openai-service.env` with `OPENAI_API_KEY=...`; load it only when explicitly needed, and report only validation status, never the key value.
- Put any temporary review API key only in Play Console review instructions, keep it low-limit/isolated, and revoke it after review.
- Keep credentials stored on-device through the platform secure storage path.
- The Android app should continue to support API key and ChatGPT/Codex token flows without requiring a separate server.
- Before making the repository public, tagging an open-source release, or attaching an APK to a public GitHub Release, follow `OPEN_SOURCE_RELEASE.md` and run `./scripts/open_source_check.sh`.

## 12. Working Style

- Prefer small, focused platform-local changes that match the existing package structure.
- Add or update unit tests when changing reducers, audio encoding/decoding, Realtime event parsing, credential validation, or other logic with clear behavior.
- Keep the v1 UI intentionally plain: credential setup when needed, then the main translation flow for the current platform.
- Avoid broad rewrites of generated build output or dependency files unless they are necessary for the requested platform work.
