# iOS ReplayKit Device-Audio Translation Plan

Status: planned investigation, not shipped.

This plan covers the possible iOS/iPadOS equivalent of Android `Device audio`: translating audio from another app on the same device, such as a Zoom call, by using ReplayKit live broadcast capture.

## Product Decision

Same-device app-audio translation on iOS is possible only as a planned ReplayKit broadcast feature, not as a normal `AVAudioSession` microphone/playback route.

The current iOS app remains microphone-first with `Phone mic` and `Headset mic`. Any user-facing `Device audio` promise on iOS or iPadOS must wait until this plan is implemented and real-device testing confirms the captured audio is usable.

## Why ReplayKit

Android device audio uses MediaProjection plus playback capture. Android can hand Chuchotage an audio capture stream from eligible apps after a platform consent prompt.

iOS does not provide normal apps with an equivalent API to tap another app's playback or call audio. ReplayKit is the closest public Apple path because a Broadcast Upload Extension can receive live `CMSampleBuffer` data for video, app audio, and microphone audio during a user-started screen broadcast.

This is similar to the Android Record demo path in product shape: a user-approved screen/capture session can carry audio. It is more serious than Android's current translation path because the capture surface is a screen broadcast extension, not a simple in-app audio recorder.

## Goals

- Let a user translate same-device app audio on iPhone or iPad when the source app and iOS permit ReplayKit broadcast audio.
- Validate Zoom-on-iOS as the first target scenario.
- Keep API-key and ChatGPT modes client-to-OpenAI without a deployed Chuchotage audio backend.
- Keep transcripts ephemeral and avoid storing screen, audio, or transcript content.
- Make permission, privacy, and failure copy explicit before any TestFlight or App Store build exposes the feature.

## Non-Goals

- Do not promise support for every iOS app, meeting app, DRM player, or call route.
- Do not use private APIs, jailbreak-only routes, packet capture, or unsupported audio-session tricks.
- Do not make ReplayKit the default iOS path while microphone translation remains the stable mobile behavior.
- Do not ship a Chuchotage-hosted audio relay as part of this plan.
- Do not persist broadcast video, source audio, translated audio, or transcripts.

## Architecture Sketch

1. Add a Broadcast Upload Extension under `apple/`.
2. Configure the extension for ReplayKit sample-buffer processing.
3. Add an App Group shared container for narrowly scoped state:
   - active target language
   - credential mode availability marker, never raw secrets unless Keychain access group design is explicitly reviewed
   - broadcast session state and user-visible errors
4. Route captured `audioApp` buffers from the extension into the existing 24 kHz mono PCM16 Realtime Translation pipeline.
5. Treat `audioMic` as optional and off by default for same-device app-audio translation unless a later product decision asks to include the user's voice.
6. Keep video buffers discarded unless required for synchronization/debug counters; never store them.
7. Decide how translated audio is played back:
   - preferred first spike: extension streams source audio to the main app/runtime or a local helper path, and main app owns translated playback if iOS lifecycle permits it
   - fallback spike: extension owns network translation and emits translated audio where extension constraints allow it
   - if neither is reliable, keep the feature blocked and prefer Zoom SDK/RTMS for Zoom-specific use
8. Add a clear Settings entry only after the spike proves viable:
   - `Device audio (experimental)`
   - copy: requires iOS Screen Broadcast, captures only audio iOS and the source app allow, and may not work for every call app

## Implementation Phases

### Phase 0: API And App Review Research

- Confirm current ReplayKit Broadcast Upload Extension capabilities, entitlements, memory limits, and background runtime behavior.
- Confirm whether the extension can access the needed Keychain/App Group material safely.
- Confirm privacy-policy and App Review language for screen broadcast audio translation.
- Confirm whether `audioApp` and `audioMic` sample-buffer types are enough for the target flows.

### Phase 1: Minimal Broadcast Probe

- Add a debug-only Broadcast Upload Extension.
- Count and meter `audioApp` and `audioMic` buffers without sending them off-device.
- Expose a local debug status in the main app: broadcast active, app audio level, mic level, buffer format.
- Test on real iPhone and iPad with:
  - YouTube or browser media playback
  - Zoom call audio
  - FaceTime call audio
  - a non-call podcast/music app
  - headphones, speaker, and Bluetooth routes

### Phase 2: PCM Adapter And Translation Spike

- Convert extension audio buffers to mono PCM16 at 24 kHz.
- Feed continuous audio, including silence, into the existing Realtime Translation event shape.
- Use a fake Realtime client first, then a real API-key session.
- Verify translated output latency, stability, and cleanup.
- Keep all logs content-free: levels, timestamps, route labels, and error categories only.

### Phase 3: Product Integration

- Add a Settings-only iOS source option after successful Phase 2 validation.
- Add clear preflight copy before launching the broadcast picker.
- Add runtime errors for:
  - broadcast not started
  - source app audio unavailable or silent
  - extension memory/runtime pressure
  - route conflict between call audio and translated playback
  - network/auth failure
- Decide whether to keep this as `Experimental` until several real Zoom sessions pass.

### Phase 4: Release Readiness

- Add focused unit tests for settings persistence, feature gating, and PCM conversion.
- Add manual smoke checklists for iPhone and iPad.
- Update privacy policy, website FAQ, TestFlight notes, and App Store review notes before exposing the feature.
- Run TestFlight with explicit testers and capture only non-content diagnostics.

## Validation Matrix

Minimum real-device checks before claiming support:

- iPhone, latest iOS available on the test device.
- iPad, latest iPadOS available on the test device.
- Wired or USB-C headset route.
- AirPods or Bluetooth headset route.
- Device speaker route, mainly to confirm feedback and route-conflict behavior.
- Zoom call where the user is a normal participant.
- Zoom call where the user is host or co-host, if host permissions affect broadcast audio.
- Source app muted and remote participants silent, to verify silence handling.
- Start, stop, app switch, lock screen, interruption, and route-change cleanup.

## Risks

- Zoom or iOS may omit call audio from ReplayKit `audioApp` buffers.
- ReplayKit may deliver silence for privacy-sensitive routes.
- The extension lifecycle may be too constrained for long translation sessions.
- Main app and extension coordination may make translated playback brittle.
- User trust and App Review risk are higher because the system flow is screen broadcast, even if Chuchotage discards video.
- Bluetooth/call routing may conflict with translated playback.

## Alternatives

- Zoom RTMS: technically cleaner for Zoom-specific audio because Zoom can stream meeting audio/transcripts over WebSockets, but it requires Zoom app setup, scopes, meeting authorization, and likely a different product architecture.
- Zoom SDK or Video SDK: can expose raw audio for Zoom sessions hosted inside a Chuchotage-owned Zoom experience, but it is not "run beside the normal Zoom app."
- Acoustic workaround: run Chuchotage on another device and listen through the microphone. This remains a fallback, not a feature-quality same-device solution.
- macOS Chuchotage: best current Apple route for meeting playback translation because macOS can capture playback/system audio directly.

## Documentation Rule

Until this plan is implemented and validated, all docs and UI copy should say:

- iOS/iPadOS same-device app-audio translation is possible as a planned ReplayKit broadcast feature.
- It is not part of the current iOS app.
- It requires a user-started screen broadcast and real-device validation.
- Android `Device audio` and macOS playback capture remain the implemented playback-audio paths today.
