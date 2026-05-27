# Real Life Subtitles Campaign Cut

This folder contains the cleaner vertical cut assembled from the real Grok downloads, not the earlier browser-frame capture.

## Outputs

- `chuchotage-real-life-subtitles-final.mp4` — 22.5s vertical 1080x1920 campaign cut with burned-in captions and AAC stereo audio.
- `chuchotage-real-life-subtitles-final-audio.m4a` — AAC audio extracted from the final cut.
- `chuchotage-real-life-subtitles-final-audio.wav` — 48 kHz stereo WAV extracted from the final cut.
- `chuchotage-real-life-subtitles-final-contact-sheet.jpg` — visual QA contact sheet.
- `campaign-subtitles.ass` — timed title, subtitle, and end-card overlay file.
- `chuchotage-real-life-subtitles-final-it.mp4` — Italian-caption version using a Whisper pass over the generated source audio, with campaign title and end card localized.
- `chuchotage-real-life-subtitles-final-it-audio.m4a` — AAC audio extracted from the Italian-caption cut.
- `chuchotage-real-life-subtitles-final-it-audio.wav` — 48 kHz stereo WAV extracted from the Italian-caption cut.
- `chuchotage-real-life-subtitles-final-it-contact-sheet.jpg` — visual QA contact sheet for the Italian-caption cut.
- `campaign-subtitles-it.ass` — Italian timed overlay file for burned-in captions.
- `campaign-subtitles-it.srt` — Italian sidecar captions.
- `chuchotage-real-life-subtitles-final-it-branded.mp4` — Italian-caption cut with imagegen branded opening and ending cards.
- `chuchotage-real-life-subtitles-final-it-branded-audio.m4a` — AAC audio extracted from the branded Italian cut.
- `chuchotage-real-life-subtitles-final-it-branded-audio.wav` — 48 kHz stereo WAV extracted from the branded Italian cut.
- `chuchotage-real-life-subtitles-final-it-branded-contact-sheet.jpg` — visual QA contact sheet for the branded Italian cut.
- `campaign-subtitles-it-branded.ass` — timed overlay file for the imagegen-card cut.

## Imagegen Assets

- `../assets/branded-title-card-imagegen.png` — generated opening card background.
- `../assets/branded-end-card-imagegen.png` — generated ending card background.

## Source Inputs

The source Grok downloads were copied into `../source-downloads/`:

- `01-train-station-source.mp4`
- `02-market-source.mp4`
- `03-museum-source.mp4`

Original source audio was also extracted into `../audio/` as both `.m4a` and `.wav`.

A local Whisper pass over the final audio is saved in `../whisper/`. The generated transcript was used as the basis for the Italian caption translation; minor cleanup was applied where generated-video speech was unclear.

## Timeline

- `00:00-00:01.5` — title beat.
- `00:01.5-00:07.5` — train station moment.
- `00:07.5-00:13.5` — market/vendor moment.
- `00:13.5-00:19.5` — museum/tour moment.
- `00:19.5-00:22.5` — Chuchotage end card.
