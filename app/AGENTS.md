# Android Product Guidance

## Scope

This folder contains the native Android app. Android is one Chuchotage product surface in the cross-platform monorepo and is publicly listed on Google Play at `https://play.google.com/store/apps/details?id=com.andreabertoncini.chuchotage`.

Keep Android changes simple, direct, personal-use, and on-device. Normal app use must not require a deployed Chuchotage backend. Do not change other platform surfaces from this folder unless the task explicitly asks for shared cross-platform work.

Shared product, UX, brand, listening/routing, and copy guidance lives in `../docs/product-design-guidelines.md`. Keep Android-specific instructions here and update the shared guide for cross-platform design rules.

## Platform

- Language/platform: Android/Kotlin.
- UI: Jetpack Compose in `src/main/java/com/andreabertoncini/chuchotage/MainActivity.kt`.
- Package/application id: `com.andreabertoncini.chuchotage`; do not change it casually.
- App label: `Chuchotage`.
- Minimum SDK: 26.

## Package Map

- Runtime translation: `service/`.
- Translation settings: `settings/`.
- State management: `state/`.
- Audio capture/playback and PCM utilities: `audio/`.
- OpenAI credential, OAuth, Realtime event, and client-secret code: `network/`.
- Home-screen app widget: `widget/` plus related `res/layout` and `res/xml` files.
- Debug-only demo recording support: `demo/`.

## UX

- Follow the shared translation UX and mobile headphone/earbud reminder guidance in `../docs/product-design-guidelines.md`.
- Keep audio-source selection in Settings. The main translate tab should stay focused on start/stop, status, transcript, and the compact output-language selector.
- Live transcript panes for translated and original speech are product UI during an active session, not debug-only UI. Keep them ephemeral and do not add transcript persistence, history, logs, analytics, sync, export, or backend storage unless explicitly requested with matching privacy guidance.
- Settings offers `Phone mic`, `Headset mic`, and Android `Device audio` where supported. Device audio requires Android playback-capture consent for each session and only captures apps/audio that Android allows.
- Widget taps should toggle the same foreground service as the app. If microphone/audio permission, device-audio capture consent, or credentials are missing, open the app instead.

## Runtime

- `TranslationController` is the single source of truth for translation state and input volume.
- `TranslationForegroundService` owns the active session and handles `TranslationActions.ACTION_START`, `ACTION_STOP`, and `ACTION_TOGGLE`.
- `TranslationSession` connects directly to OpenAI Realtime Translation using the saved on-device credential.
- Audio capture uses mono PCM16 targeting 24 kHz, with resampling when needed.
- Android device-audio capture uses MediaProjection and `AudioPlaybackCaptureConfiguration` on Android 10+.
- If headset input is selected but unavailable, fail clearly instead of silently using the wrong mic.
- Playback uses `AudioTrack` for mono PCM16 translated audio at 24 kHz.

## Credentials And Network

Support personal OpenAI API keys, ChatGPT/Codex-style login credentials, and optional sponsored trial mode. Store credentials and sponsored-trial install IDs through the secure on-device storage path. Normal API-key and ChatGPT/Codex use must stay direct from the app to OpenAI; sponsored trial may ask the Chuchotage support service for a short-lived Realtime Translation client secret.

Use OpenAI Realtime Translation, not the conversational Realtime voice-agent flow:

- WebSocket endpoint: `wss://api.openai.com/v1/realtime/translations?model=gpt-realtime-translate`.
- Model: `gpt-realtime-translate`.
- Configure target language with `session.audio.output.language`.
- On first run, the default output language follows the Android system language when it is in `TranslationLanguages`; otherwise it falls back to English (`en`). Saved user choices always win.
- Input transcription should continue to use `gpt-realtime-whisper` unless explicitly changed.
- Expected events include `session.output_audio.delta`, `session.output_transcript.delta`, `session.input_transcript.delta`, and errors.

When using a Realtime Translation client secret, session configuration is embedded in the client-secret request, so avoid sending a conflicting `session.update`.

## Brand

Follow `../docs/product-design-guidelines.md` for the shared dark, signal-led Chuchotage visual system.

## Build And Test

Run Android commands from the repository root:

```bash
./gradlew test
./gradlew assembleDebug
```

Use `./gradlew connectedDebugAndroidTest` only when a device or emulator is available.

For release bundles:

```bash
./gradlew clean bundleRelease
```

Only upload to Google Play after explicit user approval.

For Play uploads, check the last uploaded Play version before publishing. If the local `versionCode` has already been used, bump `versionCode` and `versionName`, rebuild the release bundle, and upload the fresh bundle on the first publish attempt.

## Security

Do not print, log, commit, paste, rotate, or delete API keys, ChatGPT tokens, OAuth tokens, service account JSON, signing properties, upload keystores, `local.properties`, `.env`, or generated release credential material.
