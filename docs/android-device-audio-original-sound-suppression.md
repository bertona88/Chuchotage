# Android Device Audio Original-Sound Suppression

Checked: 2026-05-17

## Summary

Android cannot provide Windows-style per-app original-audio suppression for Chuchotage device-audio translation. The public Android path gives Chuchotage a capturable playback stream through MediaProjection, and it lets Chuchotage request audio focus so other apps may duck. It does not expose a reliable per-source app volume mixer.

The Android implementation therefore treats original-audio suppression as best-effort ducking:

- It is opt-in under Settings when `Device audio` is selected.
- While translated audio is written to Chuchotage playback, Chuchotage requests `AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK`.
- After a short hold window, Chuchotage abandons focus so the source app can return to normal.
- The setting is intentionally described as best effort because some apps pause, ignore ducking, use speech/private routing, or cannot be captured.

## Android Constraints

Playback capture and ducking are separate.

Playback capture:

- Android playback capture uses MediaProjection plus `AudioPlaybackCaptureConfiguration`.
- Captured audio must use eligible usages such as media, game, or unknown.
- The source app, profile, Android version, capture policy, and DRM/protected content can prevent capture.
- Capture gives Chuchotage a copy of eligible audio; it does not give Chuchotage control over source-app playback volume.

Audio focus ducking:

- `AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK` is a request to let Chuchotage speak while other media lowers itself.
- The source app may duck, pause, ignore focus changes, or behave differently by device/OS/app version.
- Speech-like content is especially risky: Android and source apps may avoid automatic ducking so the user does not miss speech.
- If the source app ducks before capture, the captured translation input can also become quieter.

Sources:

- Android playback capture: <https://developer.android.com/media/platform/av-capture>
- `AudioPlaybackCaptureConfiguration`: <https://developer.android.com/reference/android/media/AudioPlaybackCaptureConfiguration>
- Android audio focus: <https://developer.android.com/media/optimize/audio-focus>
- Chromium audio focus design notes: <https://chromium.googlesource.com/chromium/src/+/refs/heads/main/docs/media/audio_focus.md>

## App Expectations

These are product expectations, not guarantees. They should be validated on physical devices before stronger user-facing claims.

| Source | Capture expectation | Ducking expectation | Product stance |
| --- | --- | --- | --- |
| YouTube app video | Medium-high for ordinary videos; lower for protected/blocked content. | Medium-high because it behaves like media. | Good first manual-test target. Avoid promising perfect suppression. |
| Spotify podcast | Medium; needs device testing. | Medium-high for media focus, but podcasts are speech and may pause or resist ducking. | Plausible, but copy should remain best-effort. |
| Chrome media | Medium-high for normal HTML audio/video; lower for calls/WebRTC/private paths. | Medium because Chromium has explicit Android audio-focus handling. | Good target for web video/audio. Not a promise for web calls. |
| WhatsApp audio message | Low-to-medium; voice messages may use speech/private routing and may not be capturable. | Low-to-medium; could pause, route to earpiece, or ignore ducking. | Do not present WhatsApp voice-note suppression as a supported promise yet. |

## Current Implementation

Android live translation now has a best-effort device-audio ducking path:

- `TranslationSettings.deviceAudioDuckingEnabled` stores the opt-in flag.
- `TranslationSettings.shouldRequestOriginalAudioDucking()` only enables it for `AudioInputSource.DeviceAudio`.
- `PcmAudioPlayer` owns `OriginalAudioDucker` and calls it before writing translated PCM.
- `OriginalAudioDucker` requests transient ducking focus and abandons it after a short hold window.

The demo recorder does not apply separate demo-only ducking in the saved MP4. During translation it records the same input PCM being sent to Realtime plus the translated output PCM, so live Android audio focus ducking is the only ducking behavior being demonstrated.

## Manual Test Matrix

For CHU-013 validation, test each source on at least one Pixel and one Samsung device:

- Captures source audio at all.
- Keeps source playback running rather than pausing.
- Lowers the audible original while translated audio plays.
- Keeps translation quality acceptable when the source app ducks.
- Restores original playback volume promptly when translation output stops.

Recommended first pass:

- YouTube app ordinary video.
- Spotify podcast.
- Chrome YouTube/web video.
- WhatsApp voice message.
