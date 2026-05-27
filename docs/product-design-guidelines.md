# Chuchotage Product Design Guidelines

Status: shared product guidance for all Chuchotage surfaces
Primary product today: cross-platform Chuchotage apps

Use this file as the single source of truth for Chuchotage product shape, UX, brand, and user-facing guidance across iOS, Android, macOS, Windows companion work, the website, and future platform surfaces. Keep platform-specific build, packaging, API, and local implementation details in the relevant platform docs.

## Product Shape

Chuchotage is simple, direct, personal-use realtime speech translation.

- Normal API-key and ChatGPT use must not require a deployed Chuchotage backend. Sponsored trial may use a small Chuchotage endpoint to create a short-lived OpenAI Realtime Translation client secret.
- Credentials and app preferences should stay on the user's device.
- During API-key and ChatGPT translation, the selected audio source and translation configuration go directly from the user's device to OpenAI. During sponsored trial, selected output language and rate-limit metadata go to Chuchotage to create a short-lived token; audio still goes from the app to OpenAI, not through a Chuchotage audio server.
- Keep the main experience focused on listening and translating, not dashboards, meeting management, saved transcript history, or analytics.
- Keep public positioning cross-platform. iOS is publicly listed on the App Store, Android is publicly listed on Google Play, and desktop downloads should be described according to the release artifacts actually available.

## Core Translation UX

The main translation surface should feel like an instrument the user can trust in the moment:

- One primary `Start translation` / `Stop translation` control.
- Automatic source-language detection.
- Target output language chosen in setup, settings, or a compact Android-style main-screen selector. Keep it lightweight; do not turn the main translation surface into a busy settings panel.
- Small operational status text, such as `Ready`, `Connecting`, `Listening`, and `Error`.
- Restrained audio/signal level feedback around the primary control.
- During an active session, live transcript panes for translated and original speech are part of the v1 product UI. The primary control may compact to a small lower-right stop control so the screen can prioritize those panes. Hide decorative waveform filler in this mode, auto-scroll each pane to the latest text, cap retained text to the current session, and clear it when translation stops.
- Treat live transcripts as ephemeral session UI: keep them in memory, never persist them to local history, exports, sync, logs, analytics, crash reports, or a Chuchotage backend unless transcript storage is explicitly added with updated product, privacy, legal, and Play Data Safety guidance.
- Clear release of microphone, device-audio capture, socket, and playback resources when translation stops.

Avoid adding a source-language picker, conversation mode, dashboard, saved transcript history, transcript export/search/management, or meeting-style captions beyond the active-session panes unless the task explicitly asks for it or the translation API shape changes.

## Listening And Routing Guidance

Chuchotage is audio-first, so user guidance should prevent bad listening setups before they feel like app bugs.

- Mobile app surfaces should gently remind users to wear headphones or earbuds for translated audio, especially in onboarding, permission/setup moments, settings, or first-run hints.
- Do not make headphones mandatory for every mobile session, but explain that headphones reduce echo, avoid the phone microphone recapturing translated speech, and keep translated audio more private.
- Focus background may be offered as optional headphone-only masking for live acoustic bleed-through; keep it local, low, and ducked under translated speech.
- Keep the reminder short and practical. Avoid alarmist copy.
- If a user selects a headset or earbud microphone and it is unavailable, fail clearly instead of silently falling back to the wrong microphone.
- On Android, keep audio-source selection in Settings. `Device audio` may be offered on Android 10+ through the platform playback-capture prompt, but copy must make clear that Android only exposes apps/audio that permit capture.
- On iOS/iPadOS, same-device app-audio translation is possible only as a planned ReplayKit broadcast feature. Keep current iOS surfaces microphone-first until `docs/ios-replaykit-device-audio-plan.md` is implemented and real-device tests prove app audio, especially Zoom call audio, is capturable and usable.
- On desktop, avoid translation feedback loops by keeping source capture and translated playback separate.
- For Windows no-admin usage, prefer two output devices: one for source app audio that Chuchotage captures, and one for translated playback.
- For admin-approved Windows setups, an already installed virtual playback device may be used as the capture endpoint, with real headphones or speakers used for translated playback. Chuchotage should not make virtual drivers mandatory.

## Visual Direction

The brand is dark, quiet, and signal-led.

- Use ink/navy surfaces, signal-blue accents, warm cream marks, pale text, precise rings, and restrained glow.
- Current Android brand colors are `Ink` `#07131D`, `InkDeep` `#02070C`, `Surface` `#0C1B26`, `SurfaceRaised` `#122838`, `Ring` `#2A3B47`, `SignalBlue` `#1D9BDA`, `SignalBlueSoft` `#68C8F4`, `Cream` `#F2E9DD`, `Text` `#E8EDF1`, and `Muted` `#A1ADB7`.
- The primary translation control should feel like a dark circular instrument, not an emergency button.
- Warm alert colors are for errors or explicit experiments, not the default primary action.
- Prefer abstract whisper, signal, translation, aperture, pulse, or language-bridge imagery.
- Do not default to earbud/headphone hardware imagery for the central brand mark unless explicitly requested.
- Keep layouts sparse and tactile: one clear action, calm hierarchy, and no decorative clutter.

## Copy Tone

Copy should be small, concrete, and reassuring.

- Prefer operational words over marketing claims.
- Explain setup problems in terms of what the user can do next.
- Keep privacy and credential claims aligned with actual app behavior.
- Do not imply Chuchotage records, stores, analyzes, or hosts user audio unless that behavior has been intentionally added and documented. Be precise about the sponsored-trial endpoint: it can mint short-lived translation tokens, but it is not an audio relay or transcript store.
- Do not make claims about a platform until that platform actually supports the behavior.

## Platform Adaptation

Each platform may adapt the shared shape to its job:

- iOS is a public mobile app on the App Store.
- Android is the native Android app and is publicly listed on Google Play.
- macOS can share Apple code and visual language, but should not quietly redefine the product.
- Windows is a companion app focused on capturing selected playback audio and playing translated output to a selected device.
- The website should describe the real product plainly and avoid privacy, backend, analytics, or credential claims that conflict with app behavior.

When guidance conflicts, prefer this order:

1. User's explicit current task.
2. Security and privacy requirements.
3. This shared design guidance for product shape, UX, brand, listening/routing, and copy.
4. Platform-specific `AGENTS.md` for implementation, build, packaging, and platform exceptions.
5. Older discussion notes or Codex session transcripts.
