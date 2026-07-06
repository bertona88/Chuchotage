# Chuchotage Tickets


NEW TICKETS AND PRODUCT GUIDELINES
- Triaged 2026-06-03: mobile headphone feedback-loop parity is tracked as CHU-026.
- Triaged 2026-06-03: iOS same-device media/app-audio translation uses ReplayKit, specifically a Broadcast Upload Extension, and is tracked as CHU-019.
- Triaged 2026-06-03: stale board cleanup marked Android public-release work and beta-signup cleanup done, moved Windows process-loopback from prototype build to validation, and updated outreach to the current linguistics/interpreting CRM batch.



Lightweight Linear-style board for product and implementation follow-up. Keep ticket scope small, update status as work moves, and preserve cross-platform product boundaries unless a ticket explicitly targets multiple surfaces.

Status values: `Backlog`, `Ready`, `In Progress`, `Blocked`, `Done`.

## Current Product Priority

State 2026-06-03:
- Chuchotage is now publicly listed on both iOS and Android. Prefer validation, spend control, privacy/listing accuracy, hardware smoke, and platform packaging over adding a new major mode.
- Near-term order:
  1. Stabilize and split the current dirty worktree so Android, Apple, website, marketing, server, and Windows changes can be reasoned about separately.
  2. Keep Android/iOS public-store behavior and privacy/listing claims aligned with the app that is actually shipping.
  3. Decide the ongoing sponsored-trial posture: keep the soft-capped path live with better accounting, or hide/tighten it if spend or abuse signals appear.
  4. Run real hardware smoke where repo tests cannot answer the question: Android/iPhone headphone routes, Apple auth/audio, and Windows process-loopback capture.
  5. Keep iOS ReplayKit and Windows audio-capture work evidence-led; do not claim source-app audio behavior until real devices prove it.
  6. Keep marketing/outreach lightweight and tied to the public product promise that is actually shippable today.

## Board

### CHU-001 - Android Auth And Credential Readiness

Status: In Progress
Priority: P1
Area: Android / Network / Compose UX / Debug

Keep all Android auth and credential paths production-ready behind one provider/onboarding surface: personal API key, ChatGPT/Codex login, and optional sponsored trial credentials.

Acceptance:
- API key, ChatGPT/Codex-token, and sponsored-trial credentials expose the same provider concepts: `isAvailable()`, `getRealtimeSessionCredential()`, `refreshCredentialIfNeeded()`, `revokeOrClear()`, `displayName`, and debug-only risk/status metadata.
- Provider selection produces the correct Realtime Translation credential and session configuration. API-key sessions may send the usual session config; client-secret sessions avoid conflicting `session.update` calls.
- First-run UX stays ChatGPT-first, with `I don't have ChatGPT` opening the sponsored path and `Use an OpenAI API key` available as the manual fallback.
- API-key fallback copy explains the local-storage privacy shape, including copy equivalent to `Your key stays on this device.`
- Sponsored-trial auth generates and stores a random install ID through the secure/local preference path, avoids hardware identifiers, and has clear quota/expiry fallback to ChatGPT sign-in or API-key mode.
- Debug builds may show provider availability, credential freshness, session-token mode, and risk/status metadata. Release builds stay clean, and no raw API keys, ChatGPT tokens, refresh tokens, or client secrets are displayed or logged.
- Add focused tests around provider selection, credential freshness, token/session-update behavior, and auth reducer/UX state where practical.
- Android post-launch/device smoke covers API-key auth, ChatGPT login/client-secret exchange, sponsored trial if enabled, and start/stop cleanup on a real device.

State 2026-05-17:
- Implemented `TranslationSessionTokenProvider` with API key, ChatGPT, and sponsored-trial providers.
- `TranslationForegroundService` now consumes the active provider instead of routing credential kinds inline.
- Current ChatGPT/Codex-token path worked in practice on the tested Android flow, and those credentials could be exchanged for Realtime Translation client secrets.
- Reworked Android first-run auth into a ChatGPT-first entry screen with `I don't have ChatGPT` and `Use an OpenAI API key` as secondary/manual paths.
- Callback URL/access-token paste remains available behind a quiet fallback and during active ChatGPT sign-in.
- Implemented sponsored-trial credential kind backed by a generated UUID stored through the secure credential store; no hardware identifiers are used.
- Added a first-run `Trial` auth mode that enables sponsored trial translation.
- Local unit tests and debug build passed; no tokens, secrets, or credential values were recorded.

State 2026-05-25:
- Keep this open until the Android device pass covers API-key, ChatGPT, and sponsored-trial/session-token paths end to end.
- Remaining follow-up: real-device auth/session smoke, provider-selection tests, richer debug metadata, and a short developer note about reinstall/reset behavior.

State 2026-06-03:
- Consolidated the previous auth-related board items into this ticket: ChatGPT/Codex viability, first-run auth UX, sponsored-trial install ID, sponsored-trial auth/onboarding UX, API-key mode copy, and debug auth diagnostics.
- Keep external continuity risk visible: OpenAI product/API/terms or Google Play interpretation could change later. Revisit if those signals change.
- API-key privacy copy is now present as `Your key is stored on this device and used only during active translation.`
- Sponsored-trial UX has the intended first-run entry point and actionable limit fallback copy. Keep this ticket open for provider-contract polish, debug metadata, tests, and real-device auth/session smoke.

### CHU-004 - Sponsored Trial Accounting And Guardrails

Status: In Progress
Priority: P1
Area: Backend / Product / Security

Finish the optional sponsored/free trial backend guardrails now that the client-secret endpoint exists.

Acceptance:
- Keep the client-secret issuance endpoint functional.
- Add a trial-status endpoint if the app needs explicit remaining/quota state instead of relying only on client-secret errors.
- Track `install_id`, minutes used, sessions started, timestamps, optional hashed IP, and basic rate limits.
- Enforce max session duration and quota server-side.
- Keep or add an emergency disable flag for sponsored trial.
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

State 2026-06-03:
- The endpoint design itself is no longer the work: `POST /api/trial/realtime-translation-client-secret` exists, validates install IDs, applies in-memory IP/install-id rate limits, and creates 10-minute Realtime Translation client secrets.
- Remaining work is persistent accounting, minutes-used tracking, explicit max-session/quota enforcement beyond short token TTL/rate limits, emergency disable behavior, and budget monitoring.

### CHU-007 - Sponsored Mode Privacy And Play Docs

Status: Done
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
- Previously waiting on Play Data Safety/release-review guidance and meeting/class consent guidance. The release-docs portion is now closed; CHU-024 tracks consent copy.

State 2026-06-03:
- Marked Done for the sponsored-mode release-docs pass. Privacy and repo docs now distinguish backend-free credential modes from backend-mediated sponsored trial, and the public Google Play listing has Data safety declarations.
- Meeting/class consent copy is tracked separately as CHU-024 so this ticket does not stay open for unrelated trust copy.

### CHU-008 - Realtime Pricing And Budget Monitoring

Status: Ready
Priority: P1
Area: Product / OpenAI / Operations

Create or refresh the ongoing checklist for current Realtime Translation pricing and sponsored-trial experiment-budget monitoring.

Acceptance:
- Verify current `gpt-realtime-translate` pricing before changing quotas, budget caps, or public trial size.
- Estimate cost for 10 sponsored minutes per install.
- Define a 1000 EUR experiment budget guardrail.
- Document where usage and spend should be monitored.

State 2026-05-25:
- Do this before or during the sponsored soft launch, but do not block launch on a perfect quota ledger.
- Current working assumption from official pricing checked on 2026-05-25: `gpt-realtime-translate` is roughly USD 0.034 per audio minute, so a 10-minute trial costs about USD 0.34 per activated trial install before overhead.
- Use a small OpenAI project budget cap and monitor early usage manually. If usage spikes, disable trial first and harden quota second.

State 2026-06-03:
- Still open, but no longer a pre-Android-launch item. Treat it as ongoing sponsored-trial spend hygiene and re-check official pricing before changing quota, budget caps, or public trial size.

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

State 2026-06-03:
- Android is now public, but this is still not a stale implementation ticket. Keep deferred unless sponsored-trial costs make silence gating urgent, because the continuous-audio translation risk remains unresolved.

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
- Fold this into the Android post-launch smoke matrix: phone speaker, wired headset, USB audio, Bluetooth classic/SCO, and BLE where available.

### CHU-012 - Headphone Feedback Guard

Status: Done
Priority: P2
Area: Android / UX / Audio Routing

Warn or block risky microphone-input plus phone-speaker output configurations.

Acceptance:
- If input is phone/headset mic and output is phone speaker, show a clear headphone warning.
- Decide whether to block by default or require confirmation.
- Do not block device-audio capture unnecessarily.
- Add tests for routing warning state where practical.

State 2026-05-17:
- Implemented a confirmation guard for phone/headset microphone input routed to the phone speaker.
- Shows headphone feedback-loop guidance in Settings and before starting a risky session.
- Device-audio capture is not blocked by the guard; widget/non-UI starts open the app or stop at the service backstop instead of starting unconfirmed.
- Added focused unit tests for the routing warning state.

### CHU-026 - Mobile Headphone Feedback Guard Parity

Status: In Progress
Priority: P1
Area: Android / iOS / UX / Audio Routing

Make the mobile apps unmistakable about the bad setup where translated speech plays from the phone speaker while the phone microphone is listening.

Acceptance:
- Android and iPhone both show clear headphone guidance when phone-mic plus phone-speaker routing can create a repeat loop.
- Treat system-default output with no connected headphone/earbud route as risky on mobile when the platform exposes enough route information.
- The start flow requires an explicit user choice before starting a risky microphone-to-speaker session.
- The warning explains the actual failure mode: translated speech can feed back into the mic and make Chuchotage repeat itself.
- Offer a clear `Use headphones` path and keep `Start anyway` as an explicit opt-in.
- Do not block Android device-audio capture unnecessarily.
- Keep copy firm and practical without insulting the user.
- Smoke test on real Android and iPhone hardware with phone speaker, wired headphones, and Bluetooth headphones before marking Done.

State 2026-06-03:
- Android already had the CHU-012 confirmation guard; this pass strengthened the warning copy.
- iPhone now uses a start-time confirmation instead of only a passive inline warning.
- Remaining before Done: real-device Android and iPhone smoke with phone speaker, wired headphones, and Bluetooth headphones.

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

Status: Done
Priority: P3
Area: Android / Product Design

Resolve the spec request for current input source on the main screen against current guidance that audio-source selection belongs in Settings.

Acceptance:
- Decide whether to show a small read-only current source on the main translate tab.
- If product guidance changes, update `docs/product-design-guidelines.md` and `app/AGENTS.md`.
- Keep the main screen sparse.

State 2026-06-03:
- Marked Done. Current product guidance keeps Android audio-source selection in Settings and keeps the main translate tab focused on start/stop, status, transcript, and the compact output-language selector.
- No main-screen source label is needed unless new user evidence reopens the decision.

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

### CHU-018 - Remove Beta Signup After Beta Ends

Status: Done
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

State 2026-06-03:
- Marked Done for repository/product cleanup. `/api/beta` remains removed with a server test, public website signup surfaces are gone, and docs now say not to reintroduce beta-signup naming.
- If a deployed unit is still named `chuchotage-beta`, treat that as operator-local service maintenance rather than keeping this product ticket open.

### CHU-019 - iOS ReplayKit Media Audio Translation

Status: Backlog
Priority: P2
Area: Apple / Audio / Product Research

Investigate and implement the possible iOS/iPadOS equivalent of Android `Device audio`: translating media or app audio coming from the same iPhone/iPad through a ReplayKit Broadcast Upload Extension.

Plan:
- Follow `docs/ios-replaykit-device-audio-plan.md`.

Acceptance:
- Add a clear iOS app entry point for starting the ReplayKit broadcast flow, likely through `RPSystemBroadcastPickerView` or the best current Apple-supported equivalent.
- Add a debug-only ReplayKit broadcast probe that meters `audioApp` and `audioMic` buffers without storing content.
- Validate real iPhone and iPad behavior with Zoom, YouTube/browser media, other ordinary media playback, and headphones/Bluetooth/speaker routes.
- If same-device media/app audio is capturable, convert ReplayKit `audioApp` buffers to mono PCM16 at 24 kHz and feed the existing Realtime Translation path.
- Keep the product honest about platform limits: ReplayKit may provide audio buffers, but it may not provide app-volume control or capture privacy-sensitive call audio from every source app.
- Keep screen/video buffers discarded and keep transcripts ephemeral.
- Add explicit Settings, permission, privacy, TestFlight, and App Review copy before exposing any user-facing iOS `Device audio` option.
- If ReplayKit cannot reliably capture Zoom/app audio, keep the feature blocked and prefer Zoom RTMS/SDK as the Zoom-specific path.

State 2026-05-25:
- Keep this behind Apple hardware smoke. Do not expose iOS `Device audio` copy until ReplayKit evidence exists on real devices.

State 2026-06-03:
- User-facing shorthand: this is the "kit thing" for translating media coming from the phone. The concrete Apple framework is ReplayKit, and the implementation shape is a Broadcast Upload Extension that receives `audioApp` sample buffers during a user-approved screen broadcast.
- Existing notes are in `docs/ios-replaykit-device-audio-plan.md`.
- Android public release is no longer a blocker for this ticket; the blocker is iOS/iPadOS ReplayKit proof on real hardware.

### CHU-020 - Android Public Google Play Release

Status: Done
Priority: P1
Area: Android / Release / Product

Turn the Android build into a conservative public Google Play release.

Acceptance:
- Run `./gradlew test` and `./gradlew assembleDebug` or release-equivalent validation before release handoff.
- Real-device smoke: API-key auth, ChatGPT login/client-secret exchange, sponsored trial if enabled, phone mic, headset mic, Android device audio, foreground notification stop, widget toggle/backoff, transcript panes, and start/stop cleanup.
- Ship sponsored trial only as a soft capped path: install-id/IP rate limits, short secret TTL, max session duration, emergency disable flag, and small OpenAI project budget cap.
- Verify Play listing/app-content claims still match the shipped behavior.
- Avoid direct APK distribution for normal testers; prefer Play testing and production-track flow.

State 2026-05-25:
- This was the highest-leverage product move when Android production access was still the nearest public-platform unlock.

State 2026-06-03:
- Marked Done. Android is publicly listed on Google Play, and the repo-wide guidance/README now treat Android as a public platform.
- Future Android work should be tracked as post-launch validation, bug fixes, listing/privacy accuracy, or sponsored-trial guardrails instead of reopening this release ticket.

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

### CHU-022 - Windows Process Loopback Exclusion Validation

Status: In Progress
Priority: P2
Area: Windows / Audio / Architecture

Validate the implemented Windows process-loopback exclusion path so single-headset desktop use can work without admin rights or virtual drivers on supported Windows builds.

Acceptance:
- Keep the capture backend alongside endpoint loopback rather than replacing the current path.
- Use Windows process-loopback exclusion where available, targeting the backend process tree unless validation proves the Electron parent process is the better exclusion target.
- On a Windows machine, confirm captured PCM contains browser/Teams/media audio and excludes Chuchotage playback.
- Validate Bluetooth/headset and communications-device behavior on at least one supported Windows build.
- Keep the Electron UI current; do not revive the removed WinForms UI.
- Keep UI language centered on `Single headset` and `Separate devices`.

State 2026-05-25:
- Do this before more Windows UI polish. The current audio-session mixer proved a limitation, not the final architecture.

State 2026-06-03:
- Prototype implementation is no longer pending: `ProcessExcludingLoopbackAudioCapture` exists, `TranslationRuntime` selects it for same-device routing, Electron exposes `Single headset` / `Separate devices`, and `windows/README.md` documents the process-loopback path.
- Remaining work is real Windows validation, especially captured PCM content, Chuchotage-playback exclusion, Bluetooth/headset behavior, and source-app volume interactions.

### CHU-023 - First Linguistics Outreach Batch

Status: Ready
Priority: P2
Area: Marketing / CRM / Learning

Run the first small founder-led outreach motion to learn which linguistics, didactics, and interpreting-adjacent contacts respond to the current product promise.

Acceptance:
- Re-check source pages for the current high-priority leads in `marketing/crm/leads.csv`.
- Draft three to five personalized emails from `andrea@chuchotage.ai`.
- Ask for explicit approval before sending.
- After sending, update `marketing/crm/leads.csv` status/stage and append `marketing/crm/outreach-log.csv`.
- Review replies before touching second-wave or fallback contacts.

State 2026-05-25:
- Keep this small until Android release readiness and trial-safety questions are resolved. Outreach should sell the current listen-along product, not future conversation mode.

State 2026-06-03:
- The old school/parent-association wording was stale. The current CRM batch is linguistics, didactics, research-center, and interpreting-adjacent leads.
- Android is public now, but outreach should still stay small and ask for feedback, not endorsement.

### CHU-024 - Product Privacy And Meeting Consent Copy

Status: Ready
Priority: P2
Area: Product / Privacy / Copy

Add concise user-facing guidance for meetings, classes, and organizational settings where live audio may require permission before using AI translation.

Acceptance:
- Add short copy to product/design guidance and release-review notes.
- Keep it factual: Chuchotage sends selected live audio to OpenAI for translation during active sessions.
- Do not imply transcript/audio storage, analytics, recording, or a Chuchotage audio relay.
- Decide whether Android Settings, website FAQ/privacy, or future store-review notes need the copy in the next release/listing pass.

State 2026-05-25:
- Tester feedback surfaced this as a trust issue. It is small copy work with high policy and user-confidence value.

State 2026-06-03:
- Still open, but no longer a before-public-release blocker because Android is already public.
- Partial notes exist in `docs/android-initial-test-feedback.md` and `docs/google-play-production-access-draft.md`; the remaining work is to put concise reusable guidance into product/design guidance and whichever user-facing surfaces should carry it.
