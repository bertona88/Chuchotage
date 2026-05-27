# Google Play Production Access Draft

Prepared: 2026-05-24

Use this as paste-ready source text for the Google Play "Apply for production" questionnaire after the closed-test gate unlocks.

## About The Closed Test

### How testers were recruited

I recruited testers from my personal and professional network who use Android phones and could try a personal realtime speech translation app in realistic situations. Testers were invited through Google Play closed testing and were given simple instructions to install the app, grant the required permissions, add an OpenAI credential or use trial mode, and try the main translation flow.

### Tester engagement

Testers were asked to exercise the core user journey: install from Google Play, complete credential setup, choose an output language, start a translation session, grant microphone or device-audio permissions where needed, listen to translated audio, check the live transcript/status UI, and stop the foreground translation service cleanly.

The test also covered practical usage conditions: using headphones to avoid audio feedback, trying microphone input in real-world environments, testing Play install/update flow, and checking whether the app remains understandable for nontechnical users.

### Feedback received

Feedback was collected through Google Play testing feedback and direct tester conversations. The strongest positive signal was that the core translation experience is compelling when setup is complete and headphones are used. Testers described the app as simple, useful, fast, and impressive.

The main issues raised were around setup and real-world operating conditions rather than the translation concept itself: credential/login clarity, Play testing install friction, headphone guidance, audio feedback loops when the phone microphone hears translated output, and noisy environments with multiple speakers.

Later feedback also suggested a possible future text-first or bidirectional conversation mode for situations where sharing headphones is awkward. A group discussion raised an important privacy expectation for meetings or classes: users may need permission before sending live conversation audio to an AI translation service.

## About The App

### Intended audience

Chuchotage is intended for adults who want personal realtime speech translation for listen-along use, such as understanding spoken audio, conversations, videos, or meetings in another language.

### Value to users

Chuchotage provides a simple Android translation flow: the user chooses an output language, starts translation, and hears translated audio while the app shows current-session status and transcript information. The app is designed for personal use, stores credentials locally through Android secure storage, and does not require a Chuchotage account for normal API-key or ChatGPT/Codex usage.

The app is intentionally focused: no ads, no analytics SDK, no transcript history, and no persistent transcript storage. Normal API-key and ChatGPT/Codex translation sessions connect directly from the device to OpenAI for realtime translation.

### Expected installs

I expect a small initial production launch, likely in the lowest install range offered by the form. The goal is a conservative first public release, continued feedback collection, and gradual improvement rather than a large launch on day one.

## Production Readiness

### Changes made from testing

Based on closed-test feedback, I improved the first-run credential flow so users better understand ChatGPT/Codex login, API-key use, and trial mode. I added clearer headphone guidance and a guard for risky microphone-plus-speaker routes to reduce audio feedback loops. I also improved routing/settings behavior, foreground service handling, widget behavior, language selection, and privacy/product copy.

The testing feedback also led to clearer product direction: the production release remains focused on one-way listen-along translation, while text-first and bidirectional conversation flows are tracked as future product work.

### Why the app is ready for production

The closed testing release has completed the required tester period, the main translation flow has been exercised by testers, and the current release is available to closed testers through Google Play. Google Play Console currently shows no policy issues and the App content declarations are complete. The Android release bundle builds and signs successfully, and unit tests pass locally.

I plan to launch conservatively and continue monitoring tester/user feedback, Android vitals, policy status, and translation reliability after production access is granted.

## Short Version

Chuchotage was tested by a small Android closed-test group recruited from my personal/professional network. Testers tried install, credential setup, microphone/device-audio permissions, output-language selection, starting/stopping realtime translation, translated audio playback, and live transcript/status behavior.

Feedback was positive on the core experience: simple, fast, useful, and impressive when setup is complete and headphones are used. The main issues were setup clarity, Play install friction, headphone/audio-feedback guidance, noisy environments, and privacy expectations for meetings. I addressed several of these with improved credential UX, headphone feedback guards, settings/routing work, clearer privacy/product guidance, and a conservative v1 scope.

The app is ready for a limited production launch because the required closed-test criteria have been met, the release is already available to closed testers, Play Console shows no open policy issues, app content declarations are complete, local tests pass, and the release bundle builds/signs successfully.
