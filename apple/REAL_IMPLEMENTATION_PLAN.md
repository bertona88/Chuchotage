# Chuchotage Apple Implementation Plan

Status: current plan for ongoing native iOS/macOS translation app work.

The iOS app has a public App Store listing at `https://apps.apple.com/it/app/chuchotage/id6770434335`. The Apple app currently builds and has a useful shared Swift layer with platform-specific audio I/O. ChatGPT sign-in/refresh, sponsored-trial client-secret exchange, transcript panes, and runtime hardening are implemented in shared code. Remaining readiness work is real-device smoke coverage (iPhone + macOS) and any hardware-only fixes that shake out. Android and Windows are implemented in sibling folders and are useful references; use them for behavior, not as shared runtime code.

Last verified on 2026-05-18:

- macOS shared-layer tests passed, 52/52.
- Generic iOS build succeeded with signing disabled.

## Current State

Already present:

- SwiftUI shell for iOS and macOS with one central translation control.
- Product settings for target language, preferred microphone source, and output route.
- Supported output language list aligned with the Android and Windows implementations.
- Credential model and plausibility validation for API keys and ChatGPT/Codex-style access tokens.
- Keychain-backed local credential storage and clearing.
- First-run ChatGPT-first setup UI with explicit sponsored-trial and API-key fallbacks, plus settings controls for language, routes, and credentials.
- macOS-only developer shortcut for importing `~/.codex/auth.json`; this is not Apple ChatGPT browser sign-in.
- PCM16 helpers for 24 kHz mono Realtime audio, base64 encoding/decoding, volume metering, and simple resampling.
- OpenAI Realtime Translation request builders for `session.input_audio_buffer.append`, API-key `session.update`, and ChatGPT-token client-secret request bodies.
- Apple ChatGPT OAuth sign-in (`ASWebAuthenticationSession` + loopback callback parsing), refresh, and client-secret retry handling for unauthorized responses.
- Sponsored/free-trial endpoint client for `POST https://www.chuchotage.ai/api/trial/realtime-translation-client-secret` with stable install-id usage and Android-parity error mapping.
- Realtime Translation WebSocket client for `wss://api.openai.com/v1/realtime/translations?model=gpt-realtime-translate`.
- `TranslationRuntime` coordinator that expects injected credential storage and audio I/O.
- iOS microphone capture and translated playback behind `IOSTranslationAudioIO`.
- macOS system playback capture behind `MacOSTranslationAudioIO`, using Core Audio process taps on macOS 14.2+ and excluding Chuchotage playback from the capture mix.
- iOS live translated + original transcript panes, ephemeral session transcript handling, and input volume meter on the main surface.
- Runtime handling for unexpected audio/realtime stream termination with user-safe errors and cleanup.
- Shared-layer tests for event parsing, request bodies, language sanitization, settings persistence, Keychain wrappers, Codex auth import, and PCM helpers.

Still missing or mocked:

- Physical iPhone and macOS smoke testing still needs to validate permissions, route changes, interruptions, Core Audio tap permission prompts, feedback prevention, and long-running sessions on real hardware.
- Sponsored-trial live endpoint smoke is still required with strict secret redaction.
- iOS/iPadOS same-device app-audio translation is possible as a ReplayKit broadcast feature, but it is not implemented. Follow `../docs/ios-replaykit-device-audio-plan.md` before adding a user-facing iOS `Device audio` source.
- Any hardware-only regressions discovered in the above checks still need follow-up fixes.

## Main Blockers

### 1. Real Apple Audio I/O

iOS and macOS now intentionally use different capture modes behind `TranslationAudioIO`.

iOS matches the Android listen-along product shape: capture live microphone audio, convert it to mono PCM16 at 24 kHz, append audio continuously to Realtime Translation, play translated PCM16 output at 24 kHz, and release capture/playback cleanly on Stop.

The adapter must honor the built-in mic versus headset mic preference. If headset input is selected and unavailable, fail clearly instead of silently using the wrong mic. Handle microphone permission denial, route changes, Bluetooth/headset changes, interruptions, foreground/background transitions, and cleanup after start failures.

An iOS/iPadOS equivalent to Android `Device audio` is a separate planned feature, not a small extension of `IOSTranslationAudioIO`. It requires a ReplayKit Broadcast Upload Extension, explicit screen-broadcast consent, app/extension state coordination, privacy/App Review copy, and real-device validation that Zoom or other source app audio appears in the ReplayKit audio buffers. See `../docs/ios-replaykit-device-audio-plan.md`.

macOS is desktop companion mode: capture Mac playback/system audio with Core Audio process taps on macOS 14.2+, exclude Chuchotage playback from capture, convert to mono PCM16 at 24 kHz, play translated output through the current system output, and fail clearly on unsupported OS versions or missing system-audio permission.

### 2. Apple ChatGPT Login And Token Refresh

Port the Android OAuth shape deliberately:

- Auth host: `https://auth.openai.com`.
- PKCE: S256.
- Client id: `app_EMoamEEZ73f0CkXaXp7hrann`.
- Redirect: localhost loopback where viable.
- Token exchange and refresh: `https://auth.openai.com/oauth/token`.

Use `ASWebAuthenticationSession` where possible, run a local callback listener only while login is active, validate OAuth `state`, exchange the one-time `code`, persist `id_token`, `access_token`, `refresh_token`, and refresh timestamp in Keychain, and refresh before expiry or after client-secret 401 responses. This is now implemented in shared code and needs real-device verification coverage.

Realtime Translation must keep using `RealtimeTranslationClientSecretProvider` for ChatGPT-token credentials. Do not use a ChatGPT access token directly as the WebSocket bearer.

### 3. Runtime Hardening For Real Audio

Before long live sessions, tighten the runtime around the real adapters:

- Confirm WebSocket/session readiness before starting capture, or add a clear first-message/open timeout.
- Bound audio buffering so bad networks do not grow memory indefinitely.
- Keep appending audio continuously, including silence between phrases, matching Android/Windows behavior.
- Make stop and start-failure cleanup idempotent.
- Ensure client-secret sessions do not send a conflicting `session.update`.
- Improve user-facing network and Realtime errors without leaking secrets.

### 4. Tests And Smoke Checks

Keep the existing shared tests. Add fake `TranslationAudioIO` and fake Realtime client seams so `TranslationRuntime` start/stop/failure behavior can be tested without OpenAI or hardware.

Add manual smoke checklists for iPhone and macOS because microphone permissions, route changes, Bluetooth/headset behavior, and playback latency require real devices.

## Definition Of Real

The Apple implementation becomes real when a user can:

1. Enter an API key or sign in with ChatGPT and keep the credential stored on-device.
2. Select a target output language in settings.
3. Tap `Start translation`.
4. Grant microphone permission on iOS or system-audio recording permission on macOS when needed.
5. Have live source audio captured, normalized to mono PCM16 at 24 kHz, and sent to OpenAI Realtime Translation.
6. Hear translated output audio through the selected or system output route.
7. Tap `Stop translation` and reliably release microphone, playback, socket, and session resources.
8. Relaunch the app and keep local settings and credentials without a deployed Chuchotage backend.

## Suggested Order

1. Run real iPhone smoke tests using API-key credentials (permissions, phone/headset routes, start/stop cleanup, transcript panes).
2. Run real iPhone smoke tests using ChatGPT sign-in credentials (OAuth callback, refresh, client-secret unauthorized retry).
3. Run real iPhone smoke tests using sponsored trial (live endpoint token exchange, transcript panes, quota/backoff messaging).
4. Run real macOS smoke tests using API-key and ChatGPT credentials with playback from a browser or meeting app.
5. Patch hardware-only route/interruption regressions found in the above checks.
6. Plan TestFlight/App Store/notarization only after local Apple translation works on real hardware.

## Validation Commands

From `apple/`:

```bash
xcodegen generate
DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer \
xcodebuild test \
  -project ChuchotageApple.xcodeproj \
  -scheme "Chuchotage macOS" \
  -configuration Debug \
  -destination "platform=macOS" \
  -derivedDataPath /tmp/chuchotage-xcode-derived-macos \
  CODE_SIGNING_ALLOWED=NO

DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer \
xcodebuild \
  -project ChuchotageApple.xcodeproj \
  -scheme "Chuchotage iOS" \
  -configuration Debug \
  -destination "generic/platform=iOS" \
  -derivedDataPath /tmp/chuchotage-xcode-derived-ios \
  CODE_SIGNING_ALLOWED=NO \
  build
```

Clean temporary derived data after checks:

```bash
rm -rf /tmp/chuchotage-xcode-derived-*
```

## Non-Goals For The First Real Apple Pass

- No deployed Chuchotage backend.
- No analytics SDK.
- No ads.
- No conversation dashboard.
- No visible transcript history as a primary v1 feature.
- No source-language picker while Realtime Translation handles automatic detection.
- No broad monorepo restructuring.
- No shared cross-platform runtime extraction in the first real Apple pass.
