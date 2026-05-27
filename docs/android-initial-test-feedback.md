# Android Initial Test Feedback

Last reviewed: 2026-05-24

This note summarizes early Android closed-test feedback collected from WhatsApp tester conversations. It is intentionally sanitized for the repository: no phone numbers, email addresses, API keys, full chat logs, or private identifiers are included.

## Source Coverage

- Source: WhatsApp local message store, searched read-only after a bounded sync.
- Sync state: messages synced through 2026-05-24 after a one-shot WhatsApp refresh.
- Search anchors: `chuchotage`, current Play testing link, older internal-test Play link, APK mentions, and follow-up terms around login, install, audio, looping, language detection, translation quality, headphones, text translation, and meeting privacy.
- Scope: Android tester feedback only. Invite-only threads without product feedback are not listed in detail.

## High-Level Signal

The core translation experience is compelling when the app is set up correctly and the tester uses headphones. Multiple testers described the app as working surprisingly well across real language pairs and live/video scenarios.

The highest-friction areas are not the translation model itself. They are setup and operating conditions: credential entry, ChatGPT login, Play testing install state, direct APK trust, and audio feedback loops when phone microphones hear translated output from speakers.

Later feedback after the first closed-test round broadened the product question: testers still see the live listen-along mode as useful, but they also naturally ask for a fast text-first or two-language conversation mode for situations where sharing headphones is awkward or impossible.

## What Worked

- Realtime translation worked for several testers across German, Chinese, Italian, Spanish, English, and some Indian-language tests.
- One tester reported Chinese-to-English video listening worked closely enough to match creator-provided subtitles most of the time.
- Chinese-to-German on the same video segment was reported as very good and mostly correct.
- Italian-to-English and TED/video-style English tests worked while the tester spoke aloud as if asking someone questions.
- A later Google Meet or Zoom-style test was reported as working.
- The no-stop/no-click continuous listening mode was appreciated.
- A tester reported that the current live transcript direction is valuable enough to ask for a text-first update, not only translated audio.
- A tester described a travel or social situation where fast two-language text translation on one screen would be more practical than asking another person to wear headphones.
- The app felt impressive enough that testers used words equivalent to "scary", "fast", "seamless", "well made", and "incredible".
- The Chuchotage name drew positive curiosity.

## Main Issues

### Credential And Login Confusion

- Several testers were blocked at first-run setup because they did not know whether to use ChatGPT login or the API-key path.
- The API-key screen created confusion for nontechnical testers.
- ChatGPT/Codex login got stuck or kept loading for at least two testers.
- One tester got through GPT login but then froze during a Codex-related login stage.
- Short-lived/shared API keys introduced expiry uncertainty and support overhead.

### Play Testing And Install Friction

- At least one tester saw the Play link say they were a tester but could not download or reinstall the app after uninstalling.
- Earlier internal-test links and later closed-test links created confusion.
- Direct APK sharing worked as a workaround but looked untrustworthy to testers.
- One tester explicitly said that receiving an APK over WhatsApp could look like a scam if it came from anyone else.

### Audio Feedback Loops

- Multiple testers hit a loop where the app seemed to translate its own translated output.
- The loop appears especially likely when the phone microphone can hear PC speakers or phone output.
- Testers confirmed the experience improves substantially with headphones.
- The app currently needs clearer guidance or guardrails before/while using speaker audio without headphones.
- Later feedback reinforced that headphones are a usability barrier for spontaneous in-person translation: people may not want to share earbuds, and testers may postpone testing when they do not have headphones available.

### Translation Quality Edges

- A remote/local Indian language was not detected.
- One tester reported that the app detected language but translation was incorrect in a microphone-only test.
- A later Chinese test in a bar/noisy environment was intermittent: the tester said the app too often did not move into translation, and suspected background noise or multiple voices.
- Technical terms may be a risk in specialist meetings.
- Voice output can shift tone unexpectedly, from deep to high/strained.
- One tester saw the session stop following the source audio and then hit an error after unlocking the phone.
- Some output repeated several times even after the tester stopped speaking.

### UX Expectations

- Continuous translation is useful, but testers noticed it may begin translating while the source speaker is still talking.
- Several testers needed coaching on the intended use: listen to someone else speaking, wear headphones, avoid feeding translated output back into the mic.
- Testers naturally asked for richer routing modes, such as direct video/device audio input or a two-person translation mode.
- A text-first bidirectional mode came up as a concrete request: set two languages, let each person speak in turn, and show quick translated text on the same screen with a few seconds of acceptable delay.
- Organizational or meeting use raised a privacy expectation: before using the app in classes or meetings, users may need explicit permission because live conversation audio is shared with an AI translation service.

## Later WhatsApp Updates

These updates were found in WhatsApp messages synced on 2026-05-24 and searched after the first feedback note was written.

- A tester asked for live translation as text as well as audio. The request was motivated by a real in-person scenario where headphones were unavailable and the tester wanted to communicate across Italian/Ukrainian.
- The same thread framed bidirectional text translation as more useful than audio-only for travel, shops, negotiation, or casual conversation, because sharing earbuds with another person is socially and hygienically awkward.
- The tester accepted that a few seconds of delay would be fine if the text translation is fast and easy to read.
- A noisy public-place Chinese test had partial success but missed too much speech; the likely issue was background noise or multiple speakers entering the phone microphone.
- Some newly contacted Android testers were still in the "install later / need headphones / added to Play list" stage, so they do not yet count as substantive product feedback.
- A group discussion showed strong interest in the idea but surfaced a privacy/compliance objection for class or meeting audio: people may need organizer or IT approval before live conversations are sent to an AI service.

## Changes Already Made

These are the commits made on 2026-05-17 that directly or indirectly respond to the feedback above.

- `e26c45e` - Added the sponsored trial auth path and a shared session-token provider layer for API key, ChatGPT, and sponsored trial credentials. This reduces reliance on shared temporary API keys and gives the app a path for testers who do not have or do not want to use ChatGPT. The full sponsored-trial UX and quota states still need follow-up.
- `4ea23f4` - Reworked first-run auth UX so the primary path is `Sign in with ChatGPT`, with `I don't have ChatGPT` and manual OpenAI API key entry as secondary paths. This directly addresses tester confusion around the API-key screen and which credential mode to use.
- `39cf7c5` - Added the headphone feedback guard. Risky microphone-input plus phone-speaker output now shows `Use headphones to avoid audio feedback.` and requires explicit confirmation before starting from the app UI. Widget/non-UI starts are backed off to opening the app or stopping instead of silently entering the risky route. Unit tests were added for the routing warning state.
- `061085f` - Documented a local VAD and silence-gating architecture. This is not shipped behavior yet, but it records a possible future approach for long-silence handling, cost control, and repeated-output investigations while preserving Realtime Translation continuity.
- `d4ed806` - Reconciled the transcript product stance. Active-session translated and original transcript panes are now explicitly part of v1 UI, with the privacy boundary kept strict: no persistence, history, analytics, logs, sync, export, or backend transcript storage.
- `3fbaf5b` - Added Chuchotage marketing positioning and content ideas. This does not fix Android runtime issues, but it supports clearer external explanation of the product while tester feedback is still being shaped into release messaging.

## Remaining Android Follow-Ups

1. Validate the new first-run auth flow on real devices, especially ChatGPT login and the secondary sponsored/API-key paths.
2. Finish sponsored-trial UX details: remaining time, quota/expiry states, and calm copy for users without ChatGPT.
3. Validate the headphone feedback guard on real phone-speaker, wired-headset, USB, and Bluetooth routes.
4. Add clearer in-session copy for the intended v1 mode: listen-along one-way translation, not open speakerphone translation.
5. Improve Play testing instructions and fallback copy for testers who are invited but cannot install.
6. Avoid direct APK distribution for normal testers; use Play testing links whenever possible.
7. Add better error surfacing when a translation session stalls, loops, or loses the source stream.
8. Consider direct Android device-audio capture as the preferred route for video/meeting listening where supported.
9. Keep tracking voice stability and tone shifts as model/runtime quality issues, but prioritize setup and audio-routing friction first.
10. Consider a separate text-first two-language conversation mode, but keep it clearly distinct from the v1 one-way listen-along mode.
11. Add clearer privacy/meeting guidance for users who want to use Chuchotage in classes, work calls, or organizational meetings where AI tools may require approval.
12. Test noisy multi-speaker environments explicitly; the phone-mic path may need guidance, sensitivity controls, or better source-routing recommendations.

## Open Questions

- Should sponsored trial be enabled for the next tester build, or kept behind internal testing until quota/accounting UX is complete?
- Should microphone mode eventually refuse phone-speaker output, or is the current warning-plus-confirmation guard enough?
- What is the next focused test scenario: live in-person listening, video playback, Google Meet/Zoom-style meetings, or device-audio capture?
- Which Play testing instructions should be sent when testers see "already a tester" but cannot install?
