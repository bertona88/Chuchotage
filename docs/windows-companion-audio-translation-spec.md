# Chuchotage Windows Companion Audio Translation Spec

Status: concept spec from product discussion
Date: 2026-05-11
Product context: cross-platform Chuchotage apps with a Windows companion
Shared design guidance: [`product-design-guidelines.md`](product-design-guidelines.md)

## Summary

Build a Windows desktop companion for Chuchotage that translates whatever audio the user is already hearing from the computer, then plays the translated audio to the user's selected headphones or output device.

The intended v1 is deliberately simple:

- Capture audio from a selected Windows output device using loopback capture.
- Treat the captured audio as the source stream for realtime translation.
- Use automatic source-language detection.
- Translate to a user-selected output language.
- Play translated audio through a chosen Windows playback device.
- Avoid a virtual audio driver, Teams integration, browser extension, or deployed backend.

In plain terms: if Teams, Zoom, a browser video, or any other app is playing through the selected output device, Chuchotage hears that mixed output and translates it.

## Product Goal

Let a user join a meeting, video, webinar, or call on Windows and hear translated audio in headphones without changing how the source app works.

This is the "easy-ish" target from the discussion:

> Translate whatever is coming out of my speakers/headphones.

It is not trying to isolate Teams-only audio in v1. If music, system sounds, browser audio, and Teams are all playing through the selected output device, they are all part of the captured mix.

## MVP User Flow

1. User opens Chuchotage for Windows.
2. User chooses target output language, defaulting to English.
3. User chooses capture source:
   - Default system output
   - A specific speaker/headphone output device
4. User chooses translated playback device:
   - Default headphones/output
   - A specific playback device
5. User presses `Start translation`.
6. App captures the selected output audio, streams it to Realtime Translation, and plays translated audio.
7. User presses `Stop translation` to release capture, network, and playback resources.

## V1 Scope

Included:

- Windows desktop app.
- User-mode audio loopback capture.
- No admin prompt as a design goal.
- No custom driver.
- No virtual audio cable dependency.
- No Teams SDK or meeting-platform integration.
- OpenAI Realtime Translation over WebSocket.
- Target-language selection.
- Capture-device and playback-device selection.
- Local credential storage.
- Clear error if audio capture or playback cannot start.
- Visible routing setup for:
  - No-admin testing with two separate output devices.
  - Admin-approved virtual playback devices when available.

Not included:

- Per-speaker diarization.
- Captions as a primary UI.
- Meeting transcript/history.
- Source-language picker.
- Cross-platform desktop app unless explicitly revisited.
- Installing, bundling, or managing a virtual audio device/router.
- App-specific translation controls for Teams, Zoom, browser tabs, etc.
- Hosted Chuchotage backend for normal use.

## Audio Architecture

Use Windows WASAPI loopback capture for the first implementation.

Recommended v1 capture mode:

- Capture from the selected render endpoint in shared mode.
- Convert the captured stream to mono PCM16 at 24 kHz.
- Feed the same translation session format used conceptually by Android.

Important behavior:

- This captures the mixed audio being rendered to the chosen endpoint.
- It does not require microphone access.
- It should not require admin rights.
- It should not install drivers.

Feedback prevention matters. The app must avoid recapturing its own translated playback. Options:

- Prefer modern Windows application loopback exclusion for the translator process when available.
- Let the user choose different capture and playback devices.
- For no-admin environments, guide the user to route the original app to one output device and translated playback to a second output device.
- For admin-available environments, allow the user to select an already installed virtual playback device for capture and real headphones for translated playback.
- Warn when capture and playback routing may create a translation feedback loop.
- As a fallback, keep app playback on a device not being captured.

## Translation Architecture

Use the OpenAI Realtime Translation flow already aligned with the Android app:

- Model: `gpt-realtime-translate`
- WebSocket endpoint: `wss://api.openai.com/v1/realtime/translations?model=gpt-realtime-translate`
- Source language: automatic.
- Target language: configured by user selection.
- Expected output events:
  - `session.output_audio.delta`
  - `session.output_transcript.delta`
  - `session.input_transcript.delta`
  - Error events

Audio format target:

- Mono PCM16
- 24 kHz
- Streamed continuously, including silence between phrases

## Credentials

The Windows companion should keep the same product principle as Android: personal-use, on-device credentials, no normal-use backend.

Supported credential modes should eventually mirror Android:

- Personal OpenAI API key.
- ChatGPT/Codex-style login/token credentials if feasible on Windows.

Storage:

- Store secrets locally through Windows secure storage, such as Windows Credential Manager or DPAPI-backed storage.
- Never log API keys, OAuth tokens, access tokens, refresh tokens, or generated client secrets.
- Do not require a deployed Chuchotage credential server for normal use.

## Packaging And Distribution

Development and private testing can start as a normal Windows `.exe`.

Likely distribution steps:

1. Local unsigned or development-signed `.exe` while proving the audio pipeline.
2. Per-user installer for broader private testing.
3. MSIX package for a polished install/update path.
4. Microsoft Store submission after the app is stable.

The preferred public path is probably MSIX through Microsoft Store because it can provide:

- Trusted install UX.
- Store-hosted distribution.
- Store-managed updates.
- Store signing for MSIX packages.
- Less "random exe from the internet" friction.

An `.exe` or `.msi` installer can still be used, but Store submission through that path may require publisher signing and app-managed updates.

## Admin Permission Model

The app should be designed to install and run without administrator permission.

Avoid anything that normally triggers admin requirements:

- Installing into `C:\Program Files`.
- Writing machine-wide registry keys.
- Installing a Windows service.
- Installing a driver as part of the normal app path.
- Installing a virtual audio device as part of the normal app path.
- Changing protected system audio settings.

Prefer:

- Per-user install location, such as `%LOCALAPPDATA%`.
- Current-user shortcuts.
- User-profile configuration.
- Windows secure per-user credential storage.
- MSIX or a user-scope installer.
- An optional advanced route where an admin installs or approves a virtual playback device outside Chuchotage, then Chuchotage captures that exposed device.

The observation from the Codex Windows app is relevant: corporate machines may allow signed, per-user, Store/MSIX-style apps even when they block many traditional installers. Chuchotage should aim for the same low-friction shape.

## Microsoft Store Compared With Google Play

As of 2026-05-11, Microsoft Store appears easier than Google Play for this specific Windows companion in several practical ways:

- Microsoft Store accepts classic Windows app types, including Win32, MSIX, MSI, and EXE paths.
- MSIX can provide Store signing, Store hosting, and automatic updates.
- Microsoft has announced free registration paths for individual developers and company accounts.
- Non-game Windows apps generally have flexible commerce options.

Google Play is already the route for the Android app, but it carries Android-specific work:

- Play Console account setup and verification.
- App bundle release flow.
- Privacy and data-safety forms.
- Personal-account testing requirements for newer accounts.
- Device verification requirements.
- Target SDK and Android policy churn.

For Windows, the pragmatic route is:

- Prove the app outside the Store.
- Package as MSIX once stable.
- Use Microsoft Store for trust and updates when ready.

## Technical Risks

Main risks:

- Audio feedback if translated playback is included in captured output.
- User confusion between the no-admin two-device route and the admin virtual-device route.
- Bluetooth headset behavior during bidirectional calls.
- Device switching during active meetings.
- Sample-rate conversion and buffering latency.
- Corporate endpoint policies blocking capture, network access, or non-Store installs.
- Users expecting Teams-only capture when v1 captures the whole output mix.
- Realtime latency under unstable network conditions.

Mitigations:

- Make the v1 promise explicit: captures selected output mix.
- Add clear source and playback device selectors.
- Add a visible route selector for no-admin physical separation versus admin virtual-device separation.
- Prefer process-exclusion loopback when available.
- Add visible routing warnings.
- Keep start/stop and status states simple.
- Start with a local prototype before investing in Store packaging.

## Open Questions

- Native stack: C#/.NET WinUI 3, WPF, or another desktop framework?
- Should the app share Kotlin multiplatform logic, or keep Windows implementation separate?
- Which Windows versions should be supported?
- Is ChatGPT/Codex login required for v1, or is API-key-only acceptable for the first prototype?
- Should translated playback duck original audio, or should users manage source volume themselves?
- Should the app expose captions later as optional debugging or accessibility support?

## Recommended Prototype Plan

1. Build a minimal Windows audio proof of concept:
   - Enumerate output devices.
   - Capture default output using WASAPI loopback.
   - Meter captured audio locally.
   - Play a local monitor output only if needed for testing.
2. Add PCM conversion:
   - Mono PCM16.
   - 24 kHz target.
3. Add Realtime Translation:
   - API key credential first.
   - Stream captured output audio.
   - Decode and play translated audio.
4. Add routing safety:
   - Device selectors.
   - Feedback warnings.
   - Process-exclusion loopback if supported.
5. Add simple UI:
   - One large start/stop control.
   - Target-language selector.
   - Capture source selector.
   - Playback output selector.
   - Small status text.
6. Package:
   - Local `.exe` for testing.
   - Per-user installer.
   - MSIX candidate.
   - Microsoft Store submission only after explicit approval.

## Reference Links

- Microsoft WASAPI loopback recording: https://learn.microsoft.com/en-us/windows/win32/coreaudio/loopback-recording
- Microsoft application loopback sample: https://learn.microsoft.com/en-us/samples/microsoft/windows-classic-samples/applicationloopbackaudio-sample/
- Microsoft Windows app distribution paths: https://learn.microsoft.com/windows/apps/package-and-deploy/choose-distribution-path
- Microsoft Store company registration update: https://blogs.windows.com/windowsdeveloper/2026/05/07/publish-to-microsoft-store-as-a-company-now-with-free-registration-and-faster-onboarding/
- Google Play Console setup: https://support.google.com/googleplay/android-developer/answer/6112435
- OpenAI Realtime Translation guide: https://developers.openai.com/api/docs/guides/realtime-translation
