# Local VAD And TEN VAD Wrapper Architecture

Status: candidate design, not yet validated.
Date checked: 2026-05-17.

## Goal

CHU-009 is about reducing waste from streaming long silence to Realtime Translation without damaging the live interpretation experience.

The important constraint is that OpenAI Realtime Translation is a continuous audio stream, not a turn-based voice-agent flow. The app should preserve natural pauses between phrases and avoid clipping speech starts or endings. Local VAD is therefore a conservative silence gate, not a hard "only send speech" switch.

## Why Wrap TEN VAD

TEN VAD looks like a promising edge detector because it is lightweight, supports Android native libraries, and is designed for frame-level speech activity detection. It should still be hidden behind a Chuchotage-owned interface instead of being wired directly through the audio pipeline.

Wrapping gives us:

- A stable app-level contract: speech probability in, gating decision out.
- A way to swap TEN VAD for Silero, WebRTC VAD, Cobra, or a simple energy gate if licensing, packaging, quality, or device behavior becomes a problem.
- Unit-testable gating policy independent of native VAD inference.
- A fallback path if TEN VAD fails to load on a device ABI.

## Proposed Pipeline

Current Android flow:

```text
AudioRecord -> PcmAudioRecorder -> 24 kHz mono PCM16 chunks -> TranslationSession -> WebSocket append
```

Candidate CHU-009 flow:

```text
AudioRecord
  -> PcmAudioRecorder
  -> 24 kHz mono PCM16 chunks
  -> LocalSpeechGate
       -> downsample copy to 16 kHz for TEN VAD
       -> keep original 24 kHz chunks in a short pre-roll buffer
       -> apply hysteresis, hangover, and long-silence policy
  -> TranslationSession sends allowed 24 kHz chunks
```

TEN VAD should classify a downsampled 16 kHz copy. The app should continue sending the original 24 kHz PCM16 chunks required by Realtime Translation.

## Interfaces

```kotlin
interface SpeechActivityDetector : AutoCloseable {
    fun analyze(pcm16Mono16Khz: ShortArray): SpeechActivity
}

data class SpeechActivity(
    val speechProbability: Float,
)

class LocalSpeechGate(
    private val detector: SpeechActivityDetector,
    private val config: LocalSpeechGateConfig,
) {
    fun process(pcm24Khz: ByteArray): List<ByteArray>
}
```

Expected implementations:

- `TenVadSpeechActivityDetector`: JNI/native wrapper around TEN VAD.
- `EnergySpeechActivityDetector`: small deterministic fallback for tests and unsupported devices.
- `NoopSpeechActivityDetector` or disabled gate: pass-through mode for emergency rollback.

## Gating Policy

The detector should not directly decide whether a chunk is sent. It should only emit speech likelihood. The app-owned gate should decide behavior with conservative thresholds:

- Pre-roll: keep roughly 300 ms before speech so word starts are not clipped.
- Speech onset: require multiple positive frames before entering speech.
- Speech hangover: keep roughly 700-1200 ms after speech so word endings and short pauses survive.
- Natural pauses: keep sending silence for short phrase gaps.
- Long silence: after a configurable long-silence window, suppress most upstream chunks until speech resumes.
- Heartbeat or keepalive audio: if Realtime Translation behaves poorly during full local silence, periodically send a tiny amount of silence or disable long-silence suppression.

This means false positives are acceptable and false negatives are not. Passing some noise costs money; clipping speech hurts the product.

## Suggested Defaults To Test

Initial tuning values should be treated as hypotheses:

- VAD sample rate: 16 kHz copy for TEN VAD.
- Translation stream: preserve 24 kHz PCM16.
- Speech probability threshold: start around TEN VAD default `0.5`, tune downward if speech starts are clipped.
- Onset duration: 100-200 ms.
- Pre-roll: 300 ms.
- Hangover: 900 ms.
- Long-silence suppression starts after: 2-5 seconds.
- Idle handoff to CHU-010: 30-60 seconds of silence may pause or stop the session.

## Integration Point

The smallest Android integration point is inside `TranslationSession.start`, where the recorder callback currently sends every `pcm24Khz` chunk.

Instead of:

```kotlin
socket.send(inputAudioAppendEvent(pcm24Khz))
```

the session would do:

```kotlin
for (chunk in speechGate.process(pcm24Khz)) {
    socket.send(inputAudioAppendEvent(chunk))
}
```

This keeps `PcmAudioRecorder` focused on capture/resampling and keeps Realtime event formatting inside `TranslationSession`.

## Tests

Unit tests should cover the policy without requiring TEN VAD native inference:

- Pure silence is passed briefly, then suppressed after the long-silence threshold.
- A speech onset flushes pre-roll before current speech.
- Short natural pauses remain continuous.
- Speech hangover preserves final syllables.
- Detector flapping does not rapidly open/close the gate.
- Disabled/fallback mode passes all chunks through.

Device tests should cover:

- Quiet room.
- Fan/air conditioning.
- Keyboard and taps.
- Music or TV in the background.
- Soft speech.
- Headset mic and phone mic.
- Android device-audio capture.

## Risks

- Realtime Translation may rely on continuous silence more than expected. Long local gaps could cause latency, dropped context, or delayed output.
- TEN VAD detects speech, not the intended speaker. Background speech can still open the gate.
- TEN VAD wants 16 kHz input, while translation wants 24 kHz, so the detector path must not mutate the upload path.
- Native packaging can fail across Android ABIs or Play review/device combinations.
- TEN VAD's license is not plain Apache 2.0; it includes additional Agora-related restrictions. This needs product/legal comfort before shipping.
- Thresholds tuned on one environment may behave badly in real-world noise.

## References Checked

- TEN VAD repository: https://github.com/TEN-framework/ten-vad
- TEN VAD license: https://github.com/TEN-framework/ten-vad/blob/main/LICENSE
- OpenAI Realtime Translation guide: https://developers.openai.com/cookbook/examples/voice_solutions/realtime_translation_guide
