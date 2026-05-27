<p align="center">
  <img src="docs/assets/socialmedia/cover.png" alt="Chuchotage live translator powered by OpenAI" width="100%">
</p>

# Chuchotage

Quiet realtime speech translation across mobile and desktop.

Chuchotage is a cross-platform translation product for iOS, Android, macOS, and Windows. It listens through the selected audio source, streams audio directly to OpenAI Realtime Translation, and plays translated speech through the current platform audio output. It is intentionally small: one primary start/stop control, automatic source-language detection, a compact output-language selector, and no hosted Chuchotage backend for normal use.

| | |
| --- | --- |
| iOS | Public on the App Store: <https://apps.apple.com/it/app/chuchotage/id6770434335> |
| Android | Public on Google Play: <https://play.google.com/store/apps/details?id=com.andreabertoncini.chuchotage> |
| macOS | Native SwiftUI app under `apple/` |
| Windows | Electron + .NET companion app under `windows/` |
| Android package | `com.andreabertoncini.chuchotage` |
| Minimum Android | Android 8.0, API 26 |
| License | Apache-2.0 |

## What It Does

- Starts and stops realtime translation from one large central control.
- Detects the input language automatically.
- Lets you choose the translated output language from the main screen or settings.
- Supports platform-appropriate audio sources, including microphone input on mobile and desktop playback capture where the operating system allows it.
- On Android, supports `Phone mic`, `Headset mic`, and Android `Device audio` source preferences in settings.
- On Android, runs translation in a foreground service with a notification stop action and includes a home-screen widget that toggles the same translation service.
- Stores credentials locally with platform secure storage.
- Uses either your own OpenAI API key, ChatGPT/Codex-style login credentials, or an optional sponsored trial token path.

## Privacy Shape

Chuchotage does not include ads or analytics SDKs. During normal API-key or ChatGPT use, the selected audio source and translation configuration are sent directly from the device to OpenAI. Optional sponsored trial sessions use a small Chuchotage endpoint only to create a short-lived Realtime Translation client secret; audio still streams from the app to OpenAI. Credentials and app preferences are stored on the device.

Privacy policy: [chuchotage.ai/privacy](https://www.chuchotage.ai/privacy/)

## Android Development

Clone the repository and build the debug app:

```bash
./gradlew assembleDebug
```

Install the generated debug APK from:

```text
app/build/outputs/apk/debug/app-debug.apk
```

On first launch:

1. Choose `ChatGPT`, `Trial`, or `API key`.
2. Sign in with ChatGPT, use sponsored trial mode, paste a personal ChatGPT/Codex `tokens.access_token`, or enter your own OpenAI API key.
3. Grant audio capture permission when starting translation.
4. Pick the output language from the main screen or settings, and choose the preferred audio source in settings.

To replace a saved credential, clear the app's storage from Android settings and relaunch.

## Development

Run unit tests:

```bash
./gradlew test
```

Build a debug APK:

```bash
./gradlew assembleDebug
```

Run device or emulator tests:

```bash
./gradlew connectedDebugAndroidTest
```

`connectedDebugAndroidTest` requires a connected Android device or emulator.

Build a release bundle:

```bash
./gradlew clean bundleRelease
```

The generated release bundle is:

```text
app/build/outputs/bundle/release/app-release.aab
```

Release signing, Play publishing credentials, local SDK paths, and deployment notes are intentionally not committed.

## Project Map

| Path | Purpose |
| --- | --- |
| `app/src/main/java/.../MainActivity.kt` | Compose UI, credential setup, translate/settings tabs |
| `app/src/main/java/.../service/` | Foreground service and active translation session |
| `app/src/main/java/.../network/` | OpenAI credentials, OAuth, client secrets, Realtime events |
| `app/src/main/java/.../audio/` | PCM capture, resampling, metering, playback |
| `app/src/main/java/.../settings/` | Output language, audio-source, and output-route preferences |
| `app/src/main/java/.../state/` | Translation state controller and reducer |
| `app/src/main/java/.../widget/` | Android home-screen widget |
| `app/src/main/java/.../demo/` | Debug-only demo recording support |
| `docs/` | Public website, privacy policy, shared product docs, and curated provenance notes |

## Realtime Translation

The app uses the OpenAI Realtime Translation endpoint with `gpt-realtime-translate`. Audio capture targets mono PCM16 at 24 kHz from the selected microphone or Android playback-capture source, and translated output audio is played with `AudioTrack`.

For ChatGPT/Codex-style credentials, the app exchanges the saved token on-device for a short-lived Realtime Translation client secret before opening the WebSocket. Sponsored trial mode asks the Chuchotage website service for a short-lived client secret backed by a server-held API key. Normal API-key and ChatGPT use do not require a Chuchotage server.

## Repository Notes

Public project guidance lives in [AGENTS.md](AGENTS.md). Shared product and design guidance lives in [docs/product-design-guidelines.md](docs/product-design-guidelines.md). Local operator notes, signing paths, Play Console details, DNS notes, and private credentials belong only in ignored local files.

Curated project provenance lives in [docs/provenance/](docs/provenance/). Raw Codex session transcripts in `docs/codex-sessions/` may contain private operational context and should be reviewed before any public release.

## License

Copyright 2026 Andrea Bertoncini.

Licensed under the Apache License, Version 2.0. See [LICENSE](LICENSE).

The license covers the source code. It does not grant trademark rights to the Chuchotage name, logo, app-store listing identity, or related branding.
