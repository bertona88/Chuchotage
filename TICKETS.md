# Chuchotage Tickets


NEW TICKETS AND PRODUCT GUIDELINES
- We need to display or detect when users are not using headphones and tell them to use headphones, otherwise there is feedback loop and the thing keeps repeating itself.



Lightweight Linear-style board for product and implementation follow-up. Keep ticket scope small, update status as work moves, and preserve cross-platform product boundaries unless a ticket explicitly targets multiple surfaces.

Status values: `Backlog`, `Ready`, `In Progress`, `Blocked`, `Done`.

## Current Product Priority

State 2026-05-25:
- Chuchotage has enough product surface for the next pass. Prefer validation, release readiness, spend control, and packaging over adding a new major mode.
- Near-term order:
  1. Stabilize and split the current dirty worktree so Android, Apple, website, marketing, and server changes can be reasoned about separately.
  2. Make an explicit sponsored-trial launch decision: either finish quota/accounting/UX and ship it, or hide it from the first public Android release.
  3. Treat Android as the next public-channel candidate because iOS is already public and Android production access is the nearest product unlock.
  4. Run Apple hardware smoke tests before doing more Apple feature work.
  5. Build the Windows process-loopback exclusion prototype before polishing the desktop UI further.
  6. Keep marketing/outreach lightweight and tied to the product promise that is actually shippable today.

## Board

### CHU-001 - Auth Provider Abstraction

Status: In Progress
Priority: P1
Area: Android / Network / Architecture

Build a first-class auth-provider layer so API key, ChatGPT/Codex-token, and sponsored-trial credentials expose the same runtime contract.

Acceptance:
- Define provider concepts equivalent to `isAvailable()`, `getRealtimeSessionCredential()`, `refreshCredentialIfNeeded()`, `revokeOrClear()`, `displayName`, and debug-only risk/status metadata.
- Keep personal API key and ChatGPT/Codex paths functional.
- Leave room for sponsored trial credentials without making normal app use require a Chuchotage backend.
- Add focused tests around provider selection and token/session-update behavior.

State 2026-05-17:
- Implemented `TranslationSessionTokenProvider` with API key, ChatGPT, and sponsored-trial providers.
- `TranslationForegroundService` now consumes the active provider instead of routing credential kinds inline.
- Local unit tests and debug build pass; still needs real Android device/end-to-end translation-session testing before marking Done.
- Provider-selection tests and richer debug metadata are still pending.

State 2026-05-25:
- Keep this open until the Android release-candidate device pass covers API-key, ChatGPT, and sponsored-trial/session-token paths end to end.
- Provider-selection tests are still useful, but release confidence now depends more on real-device auth and session behavior than more abstraction work.

### CHU-002 - Validate ChatGPT/Codex Token Production Viability

Status: Done
Priority: P1
Area: Android / OpenAI / Product Risk

Validate the existing ChatGPT/Codex-token path before treating it as production-safe.

Acceptance:
- Confirm whether the flow is technically stable on Android devices.
- Confirm whether the flow is allowed by current OpenAI terms and policies.
- Confirm whether it survives Google Play review expectations.
- Confirm whether ChatGPT/Codex credentials can reliably create Realtime Translation client secrets.
- Record results in repo docs without printing or storing tokens.

State 2026-05-17:
- Current ChatGPT/Codex-token path works in practice on the tested Android flow.
- ChatGPT/Codex credentials can currently be exchanged for Realtime Translation client secrets and used for active translation.
- Remaining risk is external continuity risk: OpenAI product/API/terms or Google Play interpretation could change later. Revisit if any of those signals change.
- No tokens, secrets, or credential values were recorded.

### CHU-003 - Rework First-Run Auth UX

Status: Done
Priority: P2
Area: Android / Compose UX

Change onboarding from a technical two-tab credential screen into the intended entry flow.

Acceptance:
- Primary action: `Sign in with ChatGPT`.
- Secondary action: `I don't have ChatGPT`.
- Manual fallback: `Use an OpenAI API key`.
- Keep callback/access-token fallback available without making it feel like the main path.
- Keep privacy policy and website links visible but calm.

State 2026-05-17:
- Reworked Android first-run auth into a ChatGPT-first entry screen with `I don't have ChatGPT` and `Use an OpenAI API key` as secondary/manual paths.
- Callback URL/access-token paste remains available behind a quiet fallback and during active ChatGPT sign-in.
- Local `testDebugUnitTest assembleDebug` passed with the repo's Mac JDK/Android SDK command.

### CHU-004 - Sponsored Trial Backend Design

Status: In Progress
Priority: P1
Area: Backend / Product / Security

Design the optional sponsored/free trial backend that issues short-lived Realtime Translation credentials while enforcing an early budget guardrail.

Acceptance:
- Define API endpoints for trial status and client-secret issuance.
- Track `install_id`, minutes used, sessions started, timestamps, optional hashed IP, and basic rate limits.
- Enforce max session duration and quota server-side.
- Keep anti-abuse simple; avoid hardware fingerprinting or invasive tracking.
- Keep this clearly optional so API-key and ChatGPT/Codex modes remain backend-free.

State 2026-05-17:
- Implemented and deployed `POST /api/trial/realtime-translation-client-secret` on the Hetzner Chuchotage service.
- Server holds `OPENAI_API_KEY`; Android receives only short-lived Realtime Translation client secrets.
- Basic IP/install-id rate limiting is in place and public HTTPS smoke test returned a redacted client secret.
- Persistent usage accounting, minutes-used tracking, max session duration, and budget monitoring are still pending.

State 2026-05-25:
- Product decision: ship sponsored trial as a soft capped launch path rather than blocking on perfect reinstall-proof quota.
- Minimum public guardrails: server-side install-id/IP rate limits, short client-secret TTL, max session duration, clear quota/expiry UX, an emergency disable flag, and a small OpenAI project budget cap.
- Accept the known risk that reinstalling may reset an app-local install ID. If abuse appears, harden later with Google Play Integrity Device Recall or account-backed trial identity.

### CHU-005 - Sponsored Trial Android Install ID

Status: In Progress
Priority: P2
Area: Android / Storage / Privacy

Generate and store a random install ID for sponsored trial accounting.

Acceptance:
- Generate UUID on first use of sponsored mode.
- Store locally through the app's secure/local preference path.
- Do not use hardware identifiers.
- Explain reinstall behavior in developer docs or ticket notes.

State 2026-05-17:
- Implemented sponsored-trial credential kind backed by a generated UUID stored through the secure credential store.
- No hardware identifiers are used.
- Still needs device validation and a short developer-doc note about reinstall/reset behavior.

### CHU-006 - Sponsored Trial UX

Status: In Progress
Priority: P2
Area: Android / Compose UX

Add the calm free-mode screens and state for the sponsored trial.

Acceptance:
- `I don't have ChatGPT` opens the sponsored path.
- Show `Try Chuchotage free` and `10 minutes sponsored by Chuchotage.`
- Show remaining time during sponsored use.
- Expiry copy offers ChatGPT sign-in or OpenAI API key without dark patterns.

State 2026-05-17:
- Added a first-run `Trial` auth mode that enables sponsored trial translation.
- Full intended UX is not complete yet: remaining time, quota/expiry states, and polished `I don't have ChatGPT` flow still need work.

State 2026-05-25:
- Sponsored trial is allowed to ship as a soft launch path. Keep copy modest and make expiry/fallback states clear.
- Do not overbuild remaining-time precision for v1; a simple `trial limit reached` state plus ChatGPT/API-key fallback is enough if server limits are enforced.

### CHU-007 - Sponsored Mode Privacy And Play Docs

Status: In Progress
Priority: P1
Area: Docs / Privacy / Release

Update privacy, product, and Play-facing guidance before any sponsored backend ships.

Acceptance:
- Privacy policy distinguishes backend-free credential modes from backend-backed sponsored mode.
- Play Data Safety notes cover install ID, quota metadata, and optional rate-limiting data.
- `server/AGENTS.md` no longer describes only beta signup if the sponsored service is implemented there.
- Website claims remain accurate.

State 2026-05-17:
- Updated privacy policy and deployed it to the public website.
- Updated `README.md` and `server/AGENTS.md` to distinguish backend-free modes from backend-backed sponsored trial mode.
- Play Data Safety notes and release-review guidance still need a dedicated pass before shipping a release with sponsored trial enabled.

State 2026-05-25:
- Still needed before a sponsored-trial Android release. Also add short meeting/class consent guidance because tester feedback surfaced privacy expectations for organizational use.

### CHU-008 - Realtime Pricing And Budget Monitoring

Status: Ready
Priority: P1
Area: Product / OpenAI / Operations

Create a launch checklist for current Realtime Translation pricing and experiment-budget monitoring.

Acceptance:
- Verify current `gpt-realtime-translate` pricing before launch.
- Estimate cost for 10 sponsored minutes per install.
- Define a 1000 EUR experiment budget guardrail.
- Document where usage and spend should be monitored.

State 2026-05-25:
- Do this before or during the sponsored soft launch, but do not block launch on a perfect quota ledger.
- Current working assumption from official pricing checked on 2026-05-25: `gpt-realtime-translate` is roughly USD 0.034 per audio minute, so a 10-minute trial costs about USD 0.34 per activated trial install before overhead.
- Use a small OpenAI project budget cap and monitor early usage manually. If usage spikes, disable trial first and harden quota second.

### CHU-009 - Local VAD And Silence Gating

Status: Backlog
Priority: P1
Area: Android / Audio / Cost Control

Reduce silent upstream audio when technically safe.

Investigation 2026-05-17:
- Candidate architecture documented in `docs/local-vad-ten-vad-architecture.md`.
- TEN VAD looks like a plausible edge VAD candidate if wrapped behind a Chuchotage-owned `SpeechActivityDetector` interface, with a pass-through/fallback mode.
- Proposed shape: run TEN VAD on a 16 kHz copy, keep the original 24 kHz PCM16 upload path, and let an app-owned gate handle pre-roll, hangover, short natural pauses, and long-silence suppression.
- Main unresolved risk: Realtime Translation explicitly expects continuous audio including silence between phrases, so aggressive local gating may break translation continuity, add latency, or clip words. Treat this as unproven until device/audio tests show it is safe.
- TEN VAD licensing and native Android packaging still need a separate comfort check before shipping.

Acceptance:
- Add local speech/silence detection for 24 kHz PCM16 chunks.
- Avoid streaming long silence where compatible with Realtime Translation behavior.
- Preserve translation continuity across natural pauses.
- Add unit tests for silence detection thresholds.

State 2026-05-25:
- Defer until after the Android release/trial-safety decision unless usage costs force it sooner. Aggressive gating remains risky because Realtime Translation expects continuous audio including silence.

### CHU-010 - Idle And Safety Auto-Stop

Status: Ready
Priority: P1
Area: Android / Runtime / Cost Control

Stop or pause sessions when continued listening is likely wasteful or unsafe.

Acceptance:
- Handle 30-60 seconds of silence with pause or stop behavior.
- Stop on app backgrounded where appropriate, screen locked if appropriate, audio route lost, Bluetooth/headset disconnect, headphones unplugged, and permission revocation.
- Keep user-visible status clear.
- Release mic/device-audio capture, socket, and playback resources.

State 2026-05-25:
- Prioritize route-lost, headset disconnect, permission revocation, and obviously stuck sessions before silence-VAD work. This is both cost control and user trust.

### CHU-011 - Headset Microphone Reliability Investigation

Status: In Progress
Priority: P2
Area: Android / Audio

Investigate headset microphone inconsistencies across wired, USB, Bluetooth SCO, and BLE devices.

Acceptance:
- Create a manual test matrix.
- Capture failure modes without logging secrets or audio content.
- Improve error states where Android cannot route to the selected headset mic.
- Keep the current rule: fail clearly instead of silently falling back.

State 2026-05-17:
- Fixed the obvious runtime gaps: Android 12+ Bluetooth/BLE headset routing now uses `setCommunicationDevice`, and headset capture verifies the actual routed recording device after `AudioRecord.startRecording`.
- Capture-route failures now flow through the normal fatal-error path instead of being lost in the background capture coroutine.
- Manual headset/device matrix still remains.

State 2026-05-25:
- Fold this into the Android release-candidate smoke matrix: phone speaker, wired headset, USB audio, Bluetooth classic/SCO, and BLE where available.

### CHU-012 - Headphone Feedback Guard

Status: Done
Priority: P2
Area: Android / UX / Audio Routing

Warn or block risky microphone-input plus phone-speaker output configurations.

Acceptance:
- If input is phone/headset mic and output is phone speaker, show `Use headphones to avoid audio feedback.`
- Decide whether to block by default or require confirmation.
- Do not block device-audio capture unnecessarily.
- Add tests for routing warning state where practical.

State 2026-05-17:
- Implemented a confirmation guard for phone/headset microphone input routed to the phone speaker.
- Shows `Use headphones to avoid audio feedback.` in Settings and before starting a risky session.
- Device-audio capture is not blocked by the guard; widget/non-UI starts open the app or stop at the service backstop instead of starting unconfirmed.
- Added focused unit tests for the routing warning state.

### CHU-013 - Device Audio Original-Sound Suppression

Status: Done
Priority: P2
Area: Android / Audio / Product Research

Investigate whether Android can provide parity with the Windows demo's original-audio suppression/mix behavior for device-audio translation.

Acceptance:
- Document what Android playback capture can and cannot control.
- Explore audio ducking, source-app volume limitations, and output route constraints.
- Avoid promising suppression if Android cannot provide it reliably.

State 2026-05-17:
- Checked Android playback capture and audio-focus behavior in `docs/android-device-audio-original-sound-suppression.md`.
- Finding: Android cannot provide Windows-style per-app original-source volume control; Chuchotage can only request best-effort ducking from other apps.
- Implemented an opt-in `Device audio` setting that requests transient ducking while translated audio plays.
- Product stance: YouTube/Chrome media are plausible first targets, Spotify podcasts need device testing, and WhatsApp voice messages should not be promised yet.

### CHU-014 - Reconcile Main Screen Source Visibility

Status: Backlog
Priority: P3
Area: Android / Product Design

Resolve the spec request for current input source on the main screen against current guidance that audio-source selection belongs in Settings.

Acceptance:
- Decide whether to show a small read-only current source on the main translate tab.
- If product guidance changes, update `docs/product-design-guidelines.md` and `app/AGENTS.md`.
- Keep the main screen sparse.

### CHU-015 - Reconcile Transcript Product Stance

Status: Done
Priority: P3
Area: Android / Product Design

Clarify whether active-session transcript panes are part of v1 or should return to debug/demo-only behavior.

Acceptance:
- Align `AGENTS.md`, `app/AGENTS.md`, and `docs/product-design-guidelines.md`.
- Preserve the privacy rule: no transcript persistence, history, analytics, logs, sync, exports, or backend storage.
- Keep UI calm and not dashboard-like.

State 2026-05-17:
- Decision: active-session translated and original transcript panes are part of the v1 product UI, not debug/demo-only UI.
- Product boundary remains ephemeral: transcripts are in-memory session UI only, cleared on stop, with no persistence, history, analytics, logs, sync, export, or Chuchotage backend storage.
- Aligned repo-wide, Android-local, and shared product guidance.

### CHU-016 - API Key Mode Copy Polish

Status: Ready
Priority: P3
Area: Android / Compose UX

Improve manual API-key mode copy so users understand the local-storage privacy shape.

Acceptance:
- Add copy equivalent to `Your key stays on this device.`
- Keep API key as an advanced/manual fallback, not the primary route.
- Keep secure storage unchanged.

### CHU-017 - Debug Auth Diagnostics

Status: Backlog
Priority: P3
Area: Android / Debug UX

Expose provider risk/status metadata only in debug builds.

Acceptance:
- Show provider availability, credential freshness, and session-token mode in debug builds only.
- Never print or display raw API keys, ChatGPT tokens, refresh tokens, or client secrets.
- Keep release UI clean.

### CHU-018 - Remove Beta Signup After Beta Ends

Status: In Progress
Priority: P3
Area: Website / Backend / Operations

Remove the public beta-signup path once Chuchotage no longer needs website beta access requests.

Acceptance:
- Remove or disable the website `Join beta` forms and related copy.
- Remove `POST /api/beta` from the Chuchotage support service if no longer needed.
- Remove unused Resend beta-signup env/config and keep sponsored-trial env/config intact if trial mode remains active.
- Rename the stale `chuchotage-beta` service to a more accurate service name if it still hosts non-beta endpoints.
- Update the privacy policy to remove website beta-request language after the form and endpoint are gone.

State 2026-05-24:
- Removed the public website signup forms, signup JavaScript, unused beta styles, `/api/beta` handler, Resend beta-signup config, and website beta-request privacy language.
- Sponsored-trial client-secret endpoint remains available.
- Follow-up remains to rename any deployed `chuchotage-beta` service/unit if it still hosts the sponsored-trial endpoint.

State 2026-05-25:
- Product-facing cleanup is mostly done. The remaining action is operational naming, so do it only when touching deployment/service management next.

### CHU-019 - iOS ReplayKit Device Audio Translation

Status: Backlog
Priority: P2
Area: Apple / Audio / Product Research

Investigate and implement the possible iOS/iPadOS equivalent of Android `Device audio` through a ReplayKit Broadcast Upload Extension.

Plan:
- Follow `docs/ios-replaykit-device-audio-plan.md`.

Acceptance:
- Add a debug-only ReplayKit broadcast probe that meters `audioApp` and `audioMic` buffers without storing content.
- Validate real iPhone and iPad behavior with Zoom, browser/video playback, and headphones/Bluetooth/speaker routes.
- If Zoom audio is capturable, convert ReplayKit audio buffers to mono PCM16 at 24 kHz and feed the existing Realtime Translation path.
- Keep screen/video buffers discarded and keep transcripts ephemeral.
- Add explicit Settings, permission, privacy, TestFlight, and App Review copy before exposing any user-facing iOS `Device audio` option.
- If ReplayKit cannot reliably capture Zoom/app audio, keep the feature blocked and prefer Zoom RTMS/SDK as the Zoom-specific path.

State 2026-05-25:
- Keep this behind Apple hardware smoke and Android public-release work. Do not expose iOS `Device audio` copy until ReplayKit evidence exists on real devices.

### CHU-020 - Android Release Candidate Pass

Status: Ready
Priority: P1
Area: Android / Release / Product

Turn the current Android build into a conservative public-release candidate.

Acceptance:
- Run `./gradlew test` and `./gradlew assembleDebug` or release-equivalent validation before candidate handoff.
- Real-device smoke: API-key auth, ChatGPT login/client-secret exchange, sponsored trial if enabled, phone mic, headset mic, Android device audio, foreground notification stop, widget toggle/backoff, transcript panes, and start/stop cleanup.
- Ship sponsored trial only as a soft capped path: install-id/IP rate limits, short secret TTL, max session duration, emergency disable flag, and small OpenAI project budget cap.
- Verify Play listing/app-content claims still match the shipped behavior.
- Avoid direct APK distribution for normal testers; prefer Play testing and production-track flow.

State 2026-05-25:
- This is the highest-leverage product move because iOS is already public and Android is the nearest unreleased public platform.

### CHU-025 - Sponsored Trial Reinstall Hardening

Status: Backlog
Priority: P3
Area: Android / Backend / Abuse Prevention

Harden sponsored trial identity if reinstall abuse becomes a real problem.

Acceptance:
- Evaluate Google Play Integrity Device Recall for Android trial-used state across reinstalls.
- Keep fallback behavior privacy-conscious; do not use hardware identifiers or invasive fingerprinting.
- Add server-side handling for a trusted `trial_used` or equivalent signal only after Play Integrity behavior is verified.
- Keep normal API-key and ChatGPT modes backend-free.

State 2026-05-25:
- Not a launch blocker. Current product decision accepts reinstall-reset risk for the first soft sponsored-trial release and relies on small budget caps plus manual monitoring.

### CHU-021 - Apple Hardware Smoke Pass

Status: Ready
Priority: P1
Area: Apple / iOS / macOS / Release

Validate the current Apple implementation on real iPhone and macOS hardware before adding more Apple features.

Acceptance:
- iPhone API-key mode: permission deny/allow, phone-vs-headset mic selection, transcript panes, translated playback, and cleanup.
- iPhone ChatGPT mode: `ASWebAuthenticationSession` callback, refresh path, client-secret retry on unauthorized.
- iPhone sponsored mode: live endpoint request with secret redaction, transcript panes, quota/backoff messaging.
- macOS mode: Core Audio tap permission prompt, browser/meeting-audio capture, playback exclusion, interruption/route recovery, and long-running session.
- Patch only hardware-observed defects before TestFlight/App Store/notarization planning.

State 2026-05-25:
- The shared Apple layer is already strong; real-device behavior is the blocker.

### CHU-022 - Windows Process Loopback Exclusion Prototype

Status: Ready
Priority: P2
Area: Windows / Audio / Architecture

Prototype capture of PC audio while excluding Chuchotage translated playback, so single-headset desktop use can work without admin rights or virtual drivers.

Acceptance:
- Add a capture backend alongside endpoint loopback rather than replacing the current path.
- Use Windows process-loopback exclusion where available, targeting the backend or Electron process tree after verification.
- First validate to a WAV file or local PCM sink before wiring OpenAI translation.
- Confirm captured PCM contains browser/Teams/media audio and excludes Chuchotage playback.
- Keep the Electron UI current; do not revive the removed WinForms UI.
- After backend proof, simplify UI language toward `Single headset` and `Separate devices`.

State 2026-05-25:
- Do this before more Windows UI polish. The current audio-session mixer proved a limitation, not the final architecture.

### CHU-023 - First Outreach Batch

Status: Ready
Priority: P2
Area: Marketing / CRM / Learning

Run the first small outreach motion to learn who responds to the current product promise.

Acceptance:
- Re-check source pages for the five active school/parent-association leads.
- Draft one personalized email per organization from `andrea@chuchotage.ai`.
- Ask for explicit approval before sending.
- After sending, update `marketing/crm/leads.csv` status/stage and append `marketing/crm/outreach-log.csv`.
- Review replies before touching second-wave or fallback contacts.

State 2026-05-25:
- Keep this small until Android release readiness and trial-safety questions are resolved. Outreach should sell the current listen-along product, not future conversation mode.

### CHU-024 - Product Privacy And Meeting Consent Copy

Status: Ready
Priority: P2
Area: Product / Privacy / Copy

Add concise user-facing guidance for meetings, classes, and organizational settings where live audio may require permission before using AI translation.

Acceptance:
- Add short copy to product/design guidance and release-review notes.
- Keep it factual: Chuchotage sends selected live audio to OpenAI for translation during active sessions.
- Do not imply transcript/audio storage, analytics, recording, or a Chuchotage audio relay.
- Decide whether Android Settings, website FAQ/privacy, or Play review notes need the copy before public release.

State 2026-05-25:
- Tester feedback surfaced this as a trust issue. It is small copy work with high policy and user-confidence value.
