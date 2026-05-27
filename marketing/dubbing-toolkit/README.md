# Chuchotage Dubbing Toolkit

Local marketing utility for turning a source video into a realistic Chuchotage-style overdub.

It keeps the runtime path close to the app pipeline:

- extracts the video's original audio as mono PCM16 at 24 kHz;
- streams that PCM into OpenAI Realtime Translation with `gpt-realtime-translate`;
- listens for `session.output_audio.delta`, source transcript, and target transcript deltas;
- sends `session.close` and waits for `session.closed` so the translated tail can drain;
- aligns the translated speech over the original video audio;
- ducks the original track dynamically while translated speech is present;
- muxes the mixed audio back into the original video.

Official source for the protocol shape: [OpenAI Realtime translation](https://developers.openai.com/api/docs/guides/realtime-translation).

## Setup

Use Node 24+ and ffmpeg. This machine already has both at the time this tool was added.

```bash
cd marketing/dubbing-toolkit
npm test
```

Credentials are resolved locally:

1. `OPENAI_API_KEY`, when set.
2. `~/.codex/auth.json`, when available, using the same Codex/ChatGPT client-secret exchange pattern as the app prototypes.

The tool does not print token values. Do not commit generated videos, WAV files, transcripts, or credential files.

## Basic Use

```bash
cd marketing/dubbing-toolkit
npm run dub -- ../content/vertical-shorts/real-life-subtitles/01-train-station.mp4 --language it --out ../content/vertical-shorts/real-life-subtitles/01-train-station-dubbed-it.mp4
```

Default behavior uses adaptive alignment:

- original source track stays audible;
- translated voice starts around `650 ms` after each detected source speech phrase;
- original volume ducks to `28%` while translated speech is present;
- attack/release smoothing avoids hard volume jumps.

## Useful Controls

```bash
# Keep the translated output timing as returned by Realtime, just delayed.
npm run dub -- input.mp4 --language en --alignment fixed --base-delay-ms 750

# More "listen along" feel: original remains stronger.
npm run dub -- input.mp4 --language en --duck-volume 0.45 --translated-volume 0.9

# More voiceover/ad-like: translated speech dominates.
npm run dub -- input.mp4 --language it --duck-volume 0.18 --translated-volume 1.05

# Faster processing, if the service accepts the file stream comfortably.
npm run dub -- input.mp4 --language fr --realtime-factor 1.5
```

Supported target languages mirror the app list: `es`, `pt`, `fr`, `ja`, `ru`, `zh`, `de`, `ko`, `hi`, `id`, `vi`, `it`, `en`.

## Outputs

Each run writes sidecars under `marketing/dubbing-toolkit/runs/...` unless `--workdir` is provided:

- `source-24k-mono.wav`
- `translated-raw-<lang>.wav`
- `translated-aligned-<lang>.wav`
- `dubbed-audio-<lang>.wav`
- `source-transcript.txt`
- `target-transcript-<lang>.txt`
- `manifest.json`

The final MP4 is written to `--out`, or next to the input as `<name>-dubbed-<lang>.mp4`.

## Review Notes

This is for marketing production, so do a human listen before posting. The tool is intentionally flexible: phrase alignment, ducking depth, gains, and delay can all be adjusted per clip. It does not fabricate script content; the translated speech comes from the same Realtime Translation stream used by the product pipeline.
