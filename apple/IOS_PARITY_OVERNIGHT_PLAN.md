# iOS Parity Overnight Plan

Goal: make the native iOS app as close as possible to the Android app, mainly in real feature behavior and secondarily in visual polish. No mockups, no fake screens, no fake networking/audio presented as real.

Important backend boundary: normal API-key and ChatGPT/Codex translation modes must remain client-to-OpenAI and must not require a Chuchotage backend. Android now also has an optional sponsored/free trial mode backed by the Chuchotage endpoint `POST https://www.chuchotage.ai/api/trial/realtime-translation-client-secret`; iOS parity should include that optional backend-mediated mode.

Each hourly automation agent must:

- Read `AGENTS.md`, `apple/AGENTS.md`, `app/AGENTS.md`, `docs/product-design-guidelines.md`, `apple/REAL_IMPLEMENTATION_PLAN.md`, and this file before changing code.
- Inspect `git status --short` before editing. Preserve existing user/agent changes, especially the currently dirty Xcode project file if it is still dirty.
- Work the numbered session schedule below in order. Start with the first `Pending` or `In Progress` session. If a prior session is unfinished, continue it before starting the next one unless it is blocked by a real external dependency.
- Do real implementation work in `apple/` with focused tests where practical. Use Android code as a behavior reference, not shared runtime code.
- Avoid mockups, placeholder-only views, fake networking, fake audio behavior presented as real, analytics, transcript persistence, or any committed secrets.
- Update this file at the start and end of the session with status, files changed, validation commands, blockers, and the next recommended action.
- If a session changes product scope or creates durable follow-up work, update `TICKETS.md` or the relevant Apple docs with concise state.

## Current Parity Map

- First-run auth:
  - Android: ChatGPT-first onboarding, plus `I don't have ChatGPT` sponsored-trial path, plus API-key fallback.
  - iOS: ChatGPT-first onboarding with explicit `I don't have ChatGPT` sponsored-trial path and `Use an OpenAI API key` fallback.
  - Parity: Mostly aligned.
- API-key auth:
  - Android: API key stored locally; direct Realtime translation to OpenAI.
  - iOS: API key stored in Keychain; direct Realtime translation to OpenAI.
  - Parity: Mostly aligned.
- ChatGPT auth:
  - Android: Browser OAuth + refresh + client-secret exchange for Realtime.
  - iOS: `ASWebAuthenticationSession` + loopback callback + refresh + client-secret exchange implemented.
  - Parity: Mostly aligned (still needs full real-device smoke coverage).
- Sponsored trial:
  - Android: Optional sponsored/free mode via `POST https://www.chuchotage.ai/api/trial/realtime-translation-client-secret`.
  - iOS: Sponsored credential mode + stable install-id persistence wired in onboarding/settings with endpoint token exchange through `SponsoredTrialClient`; provider now requests source transcript for original-pane parity.
  - Parity: Mostly aligned (live endpoint smoke still pending).
- Main translation surface:
  - Android: Start/stop, status, language, live translated/original transcript panes.
  - iOS: Start/stop, status, language, input level meter, and live translated/original transcript panes with auto-scroll.
  - Parity: Mostly aligned.
- Settings:
  - Android: Audio source in Settings, language, routes, privacy, credential actions.
  - iOS: Language, microphone source, output route, credential actions, headphone guidance.
  - Parity: Mostly aligned for settings placement (main-screen iOS mic picker removed in Session 1).
- Language defaults:
  - Android: default target language follows system language when supported, else English.
  - iOS: default target language now follows system language when supported, else English.
  - Parity: Aligned.
- Transcript behavior:
  - Android: live translated + original panes during active session, ephemeral and cleared on stop.
  - iOS: live translated + original panes during active session, ephemeral and cleared on stop.
  - Parity: Aligned.
- Audio routing:
  - Android: phone mic/headset mic/device audio (where supported), with clear headset-unavailable failures.
  - iOS: phone/headset microphone choices + output route controls; runtime now hard-fails missing headset and surfaces interruption/route-stop errors. Same-device app-audio translation is possible as a future ReplayKit broadcast feature, but it requires `../docs/ios-replaykit-device-audio-plan.md` and is not current parity.
  - Parity: Mostly aligned for microphone routing; not aligned for device audio until the ReplayKit plan is implemented and validated.
- Runtime cleanup:
  - Android: service stop releases capture/socket/playback.
  - iOS: runtime stop/failure cleanup is implemented and test-covered.
  - Parity: Mostly aligned.

## Seven Sessions

### 1. Baseline Parity Map, Build Health, And Small First Fix

Status: Completed

Objective: give every later agent a current iOS-versus-Android map, confirm what builds/tests locally, and close one small high-confidence gap.

Work:
- Add a compact `Current Parity Map` section to this file covering Android first-run auth, API-key auth, ChatGPT auth, sponsored trial, main translation, settings, language defaults, transcripts, audio routing, and runtime cleanup.
- Run the strongest locally viable Apple baseline command from `apple/REAL_IMPLEMENTATION_PLAN.md`.
- Do one small real fix discovered during the audit, preferably a test or model change that unblocks later sessions.
- Record any dirty files that predated the session and avoid overwriting them.

Validation:
- Record exact Apple commands and results.
- Record any unavailable Xcode/device dependency clearly.

### 2. Credential Entry UX And Credential-Kind Foundation

Status: Completed

Objective: make iOS credential entry follow Android's current real entry flow and prepare storage/modeling for all three credential modes.

Work:
- Make first-run/account UI ChatGPT-first.
- Keep `I don't have ChatGPT` as the path to sponsored trial.
- Keep `Use an OpenAI API key` as the manual fallback.
- Ensure the Apple credential model and Keychain/local storage can represent API key, ChatGPT tokens, and sponsored-trial install id without renaming or exposing secret values in UI/logs.
- If this is already mostly present, improve the missing behavior rather than rearranging copy.

Validation:
- Add or update tests for credential validation/storage where practical.
- Run Apple tests/builds that cover the changed files.

### 3. Sponsored Trial Backend Parity

Status: Completed

Objective: implement the optional iOS sponsored/free trial path equivalent to Android's backend-mediated mode.

Work:
- Implement or complete an iOS `SponsoredTrialClient` equivalent to Android's `SponsoredTrialClient`.
- Request `POST https://www.chuchotage.ai/api/trial/realtime-translation-client-secret` with `installation_id`, `target_language`, and `source_transcript_enabled`.
- Generate a random install id on first sponsored use, store it locally without hardware identifiers, and reuse it for future sponsored requests.
- Return a Realtime bearer/client-secret token that does not send a conflicting `session.update`.
- Surface Android-like sponsored errors: quota reached, backend unavailable, DNS/network failure, and "sign in with ChatGPT or use an API key to continue."
- Add focused tests using fake URL loading/network seams. Do not hit the live endpoint in unit tests.

Validation:
- Run the relevant Apple tests/build.
- If making a live smoke request manually, redact returned `value` and do not commit or print secrets.

### 4. ChatGPT Login, Refresh, And Client-Secret Parity

Status: Completed

Objective: make ChatGPT-token credentials usable for Realtime Translation on iOS without sending ChatGPT access tokens directly to the WebSocket.

Work:
- Implement or advance real ChatGPT browser sign-in using Apple platform APIs, PKCE S256, state validation, local callback handling where viable, and Keychain persistence.
- Implement or harden token refresh against `https://auth.openai.com/oauth/token`.
- Ensure `RealtimeTranslationClientSecretProvider` embeds the target language/session config and avoids conflicting `session.update` after client-secret use.
- Add 401/expiry handling that refreshes safely and retries where appropriate.
- Keep API-key mode independent and direct-to-OpenAI.
- Never print, log, or commit raw tokens/client secrets.

Validation:
- Add tests for PKCE/state/token parsing, refresh request building, credential freshness decisions, and API-key versus client-secret session-update behavior where possible.

### 5. Main Translation Screen And Settings Parity

Status: Completed

Objective: make the iOS visible product flow match Android's practical behavior.

Work:
- Ensure the main screen centers on credential readiness, start/stop, status, selected output language, input volume feedback, and live translated/original transcript panes during active sessions.
- Keep transcripts ephemeral and clear them on stop or fresh session start.
- Keep audio-source selection in Settings.
- Verify and improve target-language selection, default system-language fallback, privacy-policy access, credential clearing, microphone preference, and output-route choices where iOS supports them.
- Implement iOS-appropriate headphone/feedback safety warnings for risky microphone plus speaker configurations.

Validation:
- Add or update view-model/runtime/settings tests where practical.
- Run Apple tests/builds that cover the changed files.

### 6. iOS Audio Runtime Hardening

Status: Completed

Objective: make real iPhone microphone translation behavior robust and Android-like.

Work:
- Harden `IOSTranslationAudioIO` around microphone permission denial, built-in versus headset input preference, route changes, interruptions, start-failure cleanup, and translated playback release.
- Keep mono PCM16 at 24 kHz and continuous audio append behavior.
- Fail clearly when a requested headset mic is unavailable instead of silently using the wrong input.
- Improve user-facing runtime errors without leaking secrets.

Validation:
- Add testable seams/fakes where possible and run available Apple tests/builds.
- If a physical iPhone is unavailable, record exact manual smoke steps for the next device run.

### 7. End-To-End Polish, Verification, And Handoff

Status: Completed

Objective: leave the iOS app in the best real parity state possible after the overnight run.

Work:
- Run the broadest locally viable Apple validation: tests, generic iOS build, and any macOS shared-layer checks affected by shared Swift code.
- Fix the highest-impact remaining parity bugs found by validation.
- Tighten UI polish only after feature behavior is real: copy, spacing, status language, and Android-aligned visual tone.
- Update `apple/REAL_IMPLEMENTATION_PLAN.md`, this file, and any relevant tickets with what is now done and what still needs a real device, Apple account, OpenAI account, or live sponsored-endpoint smoke test.

Validation:
- Record exact commands and results.
- Leave a short next-day checklist for physical iPhone smoke testing and any unresolved auth/audio blockers.

## Session Log

### 2026-05-18 — Session 1 (Completed)

- Pre-session dirty files detected:
  - `apple/ChuchotageApple.xcodeproj/project.pbxproj` (modified)
  - `apple/IOS_PARITY_OVERNIGHT_PLAN.md` (untracked)
- Work completed:
  - Added `Current Parity Map` section with Android-vs-iOS status across auth, trial, runtime, transcripts, routing, and settings.
  - Ran baseline Apple validation commands from `apple/REAL_IMPLEMENTATION_PLAN.md`.
  - Implemented small parity fix: removed iOS main-screen microphone picker so audio-source selection stays in Settings (Android-aligned).
  - Added iOS credential-kind foundation for Android-sponsored-trial parity:
    - Added `sponsored_trial` to `OpenAICredentialKind`.
    - Added sponsored-trial install-id validation matching Android UUID pattern.
    - Added safe runtime guard message if sponsored trial is selected before Session 3 network implementation.
  - Added focused shared tests for sponsored-trial install-id validation and Keychain round-trip.
- Files changed this session:
  - `apple/Chuchotage/AppRootView.swift`
  - `apple/Chuchotage/Credentials/OpenAICredential.swift`
  - `apple/Chuchotage/Network/RealtimeTranslationClientSecretProvider.swift`
  - `apple/ChuchotageTests/RealtimeTranslationSharedTests.swift`
  - `apple/IOS_PARITY_OVERNIGHT_PLAN.md`
- Validation commands and results:
  - `xcodegen generate` -> success (project regenerated).
  - `DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer xcodebuild test -project ChuchotageApple.xcodeproj -scheme "Chuchotage macOS" -configuration Debug -destination "platform=macOS" -derivedDataPath /tmp/chuchotage-xcode-derived-macos CODE_SIGNING_ALLOWED=NO` -> **TEST SUCCEEDED** (30 tests, 0 failures).
  - `DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer xcodebuild -project ChuchotageApple.xcodeproj -scheme "Chuchotage iOS" -configuration Debug -destination "generic/platform=iOS" -derivedDataPath /tmp/chuchotage-xcode-derived-ios CODE_SIGNING_ALLOWED=NO build` -> **BUILD SUCCEEDED**.
- Blockers:
  - No local blocker for Session 2 coding work.
  - Real iPhone device validation is still required for end-to-end auth/audio smoke tests in later sessions.
- Next recommended action:
  - Start Session 2: make first-run/account UX ChatGPT-first with explicit `I don't have ChatGPT` -> sponsored trial path and `Use an OpenAI API key` fallback, while keeping secrets local and non-logged.

### 2026-05-18 — Session 2 (Completed)

- Pre-session dirty files detected:
  - `apple/Chuchotage/AppRootView.swift` (modified)
  - `apple/Chuchotage/Credentials/OpenAICredential.swift` (modified)
  - `apple/Chuchotage/Network/RealtimeTranslationClientSecretProvider.swift` (modified)
  - `apple/ChuchotageTests/RealtimeTranslationSharedTests.swift` (modified)
  - `apple/IOS_PARITY_OVERNIGHT_PLAN.md` (untracked)
  - `apple/ChuchotageApple.xcodeproj/project.pbxproj` (modified)
- Work completed:
  - Made first-run credential onboarding ChatGPT-first in `AppRootView` with explicit fallback branch.
  - Added explicit `I don't have ChatGPT` path that stores a sponsored-trial credential mode in Keychain using a stable install id.
  - Kept `Use an OpenAI API key` as manual fallback in the fallback branch, preserving local-only credential storage.
  - Extended `TranslationViewModel` to track credential kind (`api key`, `ChatGPT sign-in`, `sponsored free trial`) without exposing secret values.
  - Added sponsored-trial selection actions in iOS/macOS settings panels so account UX matches first-run choices.
  - Updated user-facing missing-credential runtime copy to mention ChatGPT, sponsored trial, and API key choices.
  - Added focused tests for sponsored-trial credential generation and install-id reuse.
- Files changed this session:
  - `apple/Chuchotage/TranslationViewModel.swift`
  - `apple/Chuchotage/AppRootView.swift`
  - `apple/Chuchotage/Settings/TranslationSettingsSheet.swift`
  - `apple/Chuchotage/Runtime/TranslationState.swift`
  - `apple/ChuchotageTests/TranslationViewModelTests.swift`
  - `apple/ChuchotageApple.xcodeproj/project.pbxproj` (regenerated via `xcodegen generate`)
  - `apple/IOS_PARITY_OVERNIGHT_PLAN.md`
- Validation commands and results:
  - `xcodegen generate` -> success (project regenerated).
  - `DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer xcodebuild test -project ChuchotageApple.xcodeproj -scheme "Chuchotage macOS" -configuration Debug -destination "platform=macOS" -derivedDataPath /tmp/chuchotage-xcode-derived-macos CODE_SIGNING_ALLOWED=NO` -> **TEST SUCCEEDED** (32 tests, 0 failures; includes new `TranslationViewModelTests`).
  - `DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer xcodebuild -project ChuchotageApple.xcodeproj -scheme "Chuchotage iOS" -configuration Debug -destination "generic/platform=iOS" -derivedDataPath /tmp/chuchotage-xcode-derived-ios CODE_SIGNING_ALLOWED=NO build` -> **BUILD SUCCEEDED**.
  - `rm -rf /tmp/chuchotage-xcode-derived-*` -> success.
- Blockers:
  - No local coding blocker for Session 3.
  - Sponsored backend parity is still incomplete until the iOS trial client calls `POST https://www.chuchotage.ai/api/trial/realtime-translation-client-secret`.
- Next recommended action:
  - Start Session 3: implement iOS `SponsoredTrialClient` + focused request/response/error tests, then wire it into `RealtimeTranslationClientSecretProvider` for sponsored credentials.

### 2026-05-18 — Session 3 (Completed)

- Pre-session dirty files detected:
  - `apple/Chuchotage/AppRootView.swift` (modified)
  - `apple/Chuchotage/Credentials/OpenAICredential.swift` (modified)
  - `apple/Chuchotage/Network/RealtimeTranslationClientSecretProvider.swift` (modified)
  - `apple/Chuchotage/Runtime/TranslationState.swift` (modified)
  - `apple/Chuchotage/Settings/TranslationSettingsSheet.swift` (modified)
  - `apple/Chuchotage/TranslationViewModel.swift` (modified)
  - `apple/ChuchotageApple.xcodeproj/project.pbxproj` (modified)
  - `apple/ChuchotageTests/RealtimeTranslationSharedTests.swift` (modified)
  - `apple/ChuchotageTests/TranslationViewModelTests.swift` (untracked)
  - `apple/IOS_PARITY_OVERNIGHT_PLAN.md` (untracked)
- Work completed:
  - Added real iOS sponsored backend token client in `SponsoredTrialClient` for `POST https://www.chuchotage.ai/api/trial/realtime-translation-client-secret`.
  - Added request body parity with Android: `installation_id`, sanitized `target_language`, and `source_transcript_enabled`.
  - Added Android-like retry and error handling for quota reached (`429`), backend unavailable (`403`/`503`), retryable `5xx`, DNS resolution failures, and general network failures.
  - Wired `.sponsoredTrial` credentials in `RealtimeTranslationClientSecretProvider` to use `SponsoredTrialClient` and return `shouldSendSessionUpdate = false`.
  - Added focused network seam tests in `SponsoredTrialClientTests` for request shape, transcript flag, quota error mapping, DNS mapping, and provider integration.
- Files changed this session:
  - `apple/Chuchotage/Network/SponsoredTrialClient.swift` (new)
  - `apple/Chuchotage/Network/RealtimeTranslationClientSecretProvider.swift`
  - `apple/ChuchotageTests/SponsoredTrialClientTests.swift` (new)
  - `apple/ChuchotageApple.xcodeproj/project.pbxproj` (regenerated via `xcodegen generate`)
  - `apple/IOS_PARITY_OVERNIGHT_PLAN.md`
- Validation commands and results:
  - `xcodegen generate` -> success (project regenerated).
  - `DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer xcodebuild test -project ChuchotageApple.xcodeproj -scheme "Chuchotage macOS" -configuration Debug -destination "platform=macOS" -derivedDataPath /tmp/chuchotage-xcode-derived-macos CODE_SIGNING_ALLOWED=NO` -> **TEST SUCCEEDED** (37 tests, 0 failures; includes new `SponsoredTrialClientTests`).
  - `DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer xcodebuild -project ChuchotageApple.xcodeproj -scheme "Chuchotage iOS" -configuration Debug -destination "generic/platform=iOS" -derivedDataPath /tmp/chuchotage-xcode-derived-ios CODE_SIGNING_ALLOWED=NO build` -> **BUILD SUCCEEDED**.
  - `rm -rf /tmp/chuchotage-xcode-derived-*` -> success.
- Blockers:
  - No local coding blocker for Session 4.
  - Real endpoint smoke for sponsored trial is still pending and must redact returned secret values.
- Next recommended action:
  - Start Session 4: harden ChatGPT login/refresh parity and add focused tests around refresh retry + unauthorized handling during client-secret creation.

### 2026-05-18 — Session 4 (Completed)

- Pre-session dirty files detected:
  - `apple/Chuchotage/AppRootView.swift` (modified)
  - `apple/Chuchotage/Credentials/OpenAICredential.swift` (modified)
  - `apple/Chuchotage/Network/RealtimeTranslationClientSecretProvider.swift` (modified)
  - `apple/Chuchotage/Runtime/TranslationState.swift` (modified)
  - `apple/Chuchotage/Settings/TranslationSettingsSheet.swift` (modified)
  - `apple/Chuchotage/TranslationViewModel.swift` (modified)
  - `apple/ChuchotageApple.xcodeproj/project.pbxproj` (modified)
  - `apple/ChuchotageTests/RealtimeTranslationSharedTests.swift` (modified)
  - `apple/ChuchotageTests/SponsoredTrialClientTests.swift` (untracked)
  - `apple/ChuchotageTests/TranslationViewModelTests.swift` (untracked)
  - `apple/IOS_PARITY_OVERNIGHT_PLAN.md` (untracked)
- Work completed:
  - Exposed reusable callback parser parity helper in `ChatGPTOAuthClient.authorizationCodeFromCallbackInput`, then wired loopback callback parsing through it for consistent state/code/error validation.
  - Hardened ChatGPT client-secret unauthorized refresh retry in `RealtimeTranslationClientSecretProvider` by accepting refreshed ChatGPT credentials with normalized non-empty values (single retry), avoiding unnecessary false-negative unauthorized failures.
  - Added focused Session 4 coverage in new `ChatGPTOAuthClientTests`:
    - Callback input parsing parity (full URL, request target path, bare localhost form, wrong-state rejection, OAuth error handling).
    - Refresh request building against `https://auth.openai.com/oauth/token` with JSON payload assertions.
    - Credential freshness behavior (`lastRefreshEpochSeconds` age and JWT expiry skew).
    - Invalid-grant refresh handling that requires reauthentication.
    - API-key versus ChatGPT client-secret session-update behavior.
    - Unauthorized client-secret creation retry with refreshed ChatGPT credential and Authorization header assertions.
- Files changed this session:
  - `apple/Chuchotage/Credentials/ChatGPTOAuthClient.swift`
  - `apple/Chuchotage/Network/RealtimeTranslationClientSecretProvider.swift`
  - `apple/ChuchotageTests/ChatGPTOAuthClientTests.swift` (new)
  - `apple/ChuchotageApple.xcodeproj/project.pbxproj` (regenerated via `xcodegen generate`)
  - `apple/IOS_PARITY_OVERNIGHT_PLAN.md`
- Validation commands and results:
  - `xcodegen generate` -> success (project regenerated).
  - `DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer xcodebuild test -project ChuchotageApple.xcodeproj -scheme "Chuchotage macOS" -configuration Debug -destination "platform=macOS" -derivedDataPath /tmp/chuchotage-xcode-derived-macos CODE_SIGNING_ALLOWED=NO` -> **TEST SUCCEEDED** (48 tests, 0 failures; includes new `ChatGPTOAuthClientTests`).
  - `DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer xcodebuild -project ChuchotageApple.xcodeproj -scheme "Chuchotage iOS" -configuration Debug -destination "generic/platform=iOS" -derivedDataPath /tmp/chuchotage-xcode-derived-ios CODE_SIGNING_ALLOWED=NO build` -> **BUILD SUCCEEDED**.
  - `rm -rf /tmp/chuchotage-xcode-derived-*` -> success.
- Blockers:
  - No local coding blocker for Session 5.
  - Full real-device ChatGPT sign-in/audio smoke remains required on physical iPhone and macOS.
- Next recommended action:
  - Start Session 5: implement iOS live translated/original transcript panes on the main translation screen, keep transcript state ephemeral/cleared on stop, and finish language/settings parity polish.

### 2026-05-18 — Session 5 (Completed)

- Pre-session dirty files detected:
  - `apple/Chuchotage/AppRootView.swift` (modified)
  - `apple/Chuchotage/Credentials/ChatGPTOAuthClient.swift` (modified)
  - `apple/Chuchotage/Credentials/OpenAICredential.swift` (modified)
  - `apple/Chuchotage/Network/RealtimeTranslationClientSecretProvider.swift` (modified)
  - `apple/Chuchotage/Runtime/TranslationState.swift` (modified)
  - `apple/Chuchotage/Settings/TranslationSettingsSheet.swift` (modified)
  - `apple/Chuchotage/TranslationViewModel.swift` (modified)
  - `apple/ChuchotageApple.xcodeproj/project.pbxproj` (modified)
  - `apple/ChuchotageTests/RealtimeTranslationSharedTests.swift` (modified)
  - `apple/ChuchotageTests/ChatGPTOAuthClientTests.swift` (untracked)
  - `apple/ChuchotageTests/SponsoredTrialClientTests.swift` (untracked)
  - `apple/ChuchotageTests/TranslationViewModelTests.swift` (untracked)
  - `apple/IOS_PARITY_OVERNIGHT_PLAN.md` (untracked)
- Work completed:
  - Added iOS live translated and original transcript panes on the main screen with auto-scrolling transcript views and active-session placeholders.
  - Wired `TranslationViewModel` transcript parity for both `session.input_transcript.delta` and `session.output_transcript.delta`, keeping transcript state ephemeral via session reset on stop/fresh start.
  - Enabled input volume feedback on iOS by showing the shared signal meter on the iOS translation surface.
  - Added iOS feedback-loop safety messaging for risky phone-mic plus phone-speaker routing in both the main translation surface and iOS Settings.
  - Added privacy-policy access in iOS Settings via `https://www.chuchotage.ai/privacy/`.
  - Implemented Android-aligned language-default parity helper: default output language now follows preferred system language when supported, else falls back to English.
  - Added focused tests for preferred-language normalization/fallback and transcript/audio runtime event forwarding.
- Files changed this session:
  - `apple/Chuchotage/AppRootView.swift`
  - `apple/Chuchotage/Settings/TranslationLanguages.swift`
  - `apple/Chuchotage/Settings/TranslationSettingsSheet.swift`
  - `apple/Chuchotage/TranslationViewModel.swift`
  - `apple/ChuchotageTests/RealtimeTranslationSharedTests.swift`
  - `apple/ChuchotageTests/TranslationRuntimeTests.swift`
  - `apple/ChuchotageTests/TranslationViewModelTests.swift`
  - `apple/IOS_PARITY_OVERNIGHT_PLAN.md`
- Validation commands and results:
  - `DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer xcodebuild test -project ChuchotageApple.xcodeproj -scheme "Chuchotage macOS" -configuration Debug -destination "platform=macOS" -derivedDataPath /tmp/chuchotage-xcode-derived-macos CODE_SIGNING_ALLOWED=NO` -> **TEST SUCCEEDED** (50 tests, 0 failures).
  - `DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer xcodebuild -project ChuchotageApple.xcodeproj -scheme "Chuchotage iOS" -configuration Debug -destination "generic/platform=iOS" -derivedDataPath /tmp/chuchotage-xcode-derived-ios CODE_SIGNING_ALLOWED=NO build` -> **BUILD SUCCEEDED**.
  - `rm -rf /tmp/chuchotage-xcode-derived-*` -> success.
- Blockers:
  - No local coding blocker for Session 6.
  - Full real-device iPhone smoke validation for runtime route-change and interruption handling remains pending.
- Next recommended action:
  - Start Session 6: harden `IOSTranslationAudioIO` for interruption/route-change failure paths and add focused tests or test seams around headset-required failures and cleanup idempotency.

### 2026-05-18 — Session 6 (Completed)

- Pre-session dirty files detected:
  - `apple/Chuchotage/AppRootView.swift` (modified)
  - `apple/Chuchotage/Credentials/ChatGPTOAuthClient.swift` (modified)
  - `apple/Chuchotage/Credentials/OpenAICredential.swift` (modified)
  - `apple/Chuchotage/Network/RealtimeTranslationClientSecretProvider.swift` (modified)
  - `apple/Chuchotage/Runtime/TranslationState.swift` (modified)
  - `apple/Chuchotage/Settings/TranslationLanguages.swift` (modified)
  - `apple/Chuchotage/Settings/TranslationSettingsSheet.swift` (modified)
  - `apple/Chuchotage/TranslationViewModel.swift` (modified)
  - `apple/ChuchotageApple.xcodeproj/project.pbxproj` (modified)
  - `apple/ChuchotageTests/RealtimeTranslationSharedTests.swift` (modified)
  - `apple/ChuchotageTests/TranslationRuntimeTests.swift` (modified)
  - `apple/ChuchotageTests/ChatGPTOAuthClientTests.swift` (untracked)
  - `apple/ChuchotageTests/SponsoredTrialClientTests.swift` (untracked)
  - `apple/ChuchotageTests/TranslationViewModelTests.swift` (untracked)
  - `apple/IOS_PARITY_OVERNIGHT_PLAN.md` (untracked)
- Work completed:
  - Hardened `IOSTranslationAudioIO` runtime behavior for active iOS sessions:
    - Added live `updateSettings` route reconfiguration while running (input/output route reapply plus validation) instead of previous no-op behavior.
    - Captured interruption and route-failure stop reasons, then stopped audio capture/playback with cleanup.
    - Added a consumable unexpected-stop error message hook so runtime can surface actionable user-facing failures.
  - Hardened `TranslationRuntime` to treat unexpected stream endings as real failures:
    - If audio capture stream ends while still running, runtime now fails session, cleans up, and reports a specific route/interruption message when available.
    - If Realtime event stream closes unexpectedly while still running, runtime now fails with a network/reconnect message and cleans up.
  - Extended runtime test coverage with focused session-6 seams:
    - Added test for unexpected audio capture end -> `.error` + fatal message + cleanup.
    - Added test for unexpected Realtime stream end -> `.error` + fatal message + cleanup.
- Files changed this session:
  - `apple/Chuchotage/Audio/TranslationAudioIO.swift`
  - `apple/Chuchotage/Audio/IOSTranslationAudioIO.swift`
  - `apple/Chuchotage/Runtime/TranslationRuntime.swift`
  - `apple/ChuchotageTests/TranslationRuntimeTests.swift`
  - `apple/IOS_PARITY_OVERNIGHT_PLAN.md`
- Validation commands and results:
  - `DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer xcodebuild test -project ChuchotageApple.xcodeproj -scheme "Chuchotage macOS" -configuration Debug -destination "platform=macOS" -derivedDataPath /tmp/chuchotage-xcode-derived-macos CODE_SIGNING_ALLOWED=NO` -> **TEST SUCCEEDED** (52 tests, 0 failures; includes new unexpected-stream runtime tests).
  - `DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer xcodebuild -project ChuchotageApple.xcodeproj -scheme "Chuchotage iOS" -configuration Debug -destination "generic/platform=iOS" -derivedDataPath /tmp/chuchotage-xcode-derived-ios CODE_SIGNING_ALLOWED=NO build` -> **BUILD SUCCEEDED**.
  - `rm -rf /tmp/chuchotage-xcode-derived-*` -> success.
- Blockers:
  - No local coding blocker for Session 7.
  - Physical iPhone validation is still required to confirm real interruption/route-change UX copy timing and route-recovery behavior on hardware.
- Next recommended action:
  - Start Session 7: run broad end-to-end verification sweep, fix highest-impact remaining parity defects, and leave a precise real-device smoke checklist for next-day execution.

### 2026-05-18 — Session 7 (Completed)

- Pre-session dirty files detected:
  - `apple/Chuchotage/AppRootView.swift` (modified)
  - `apple/Chuchotage/Audio/IOSTranslationAudioIO.swift` (modified)
  - `apple/Chuchotage/Audio/TranslationAudioIO.swift` (modified)
  - `apple/Chuchotage/Credentials/ChatGPTOAuthClient.swift` (modified)
  - `apple/Chuchotage/Credentials/OpenAICredential.swift` (modified)
  - `apple/Chuchotage/Network/RealtimeTranslationClientSecretProvider.swift` (modified)
  - `apple/Chuchotage/Runtime/TranslationRuntime.swift` (modified)
  - `apple/Chuchotage/Runtime/TranslationState.swift` (modified)
  - `apple/Chuchotage/Settings/TranslationLanguages.swift` (modified)
  - `apple/Chuchotage/Settings/TranslationSettingsSheet.swift` (modified)
  - `apple/Chuchotage/TranslationViewModel.swift` (modified)
  - `apple/ChuchotageApple.xcodeproj/project.pbxproj` (modified)
  - `apple/ChuchotageTests/RealtimeTranslationSharedTests.swift` (modified)
  - `apple/ChuchotageTests/TranslationRuntimeTests.swift` (modified)
  - `apple/ChuchotageTests/ChatGPTOAuthClientTests.swift` (untracked)
  - `apple/ChuchotageTests/SponsoredTrialClientTests.swift` (untracked)
  - `apple/ChuchotageTests/TranslationViewModelTests.swift` (untracked)
  - `apple/IOS_PARITY_OVERNIGHT_PLAN.md` (untracked)
- Work completed:
  - Ran full parity verification sweep for Apple targets (shared macOS tests + generic iOS build).
  - Fixed highest-impact remaining parity defect found during sweep: sponsored-trial sessions were requesting `source_transcript_enabled = false`, which could leave the original transcript pane empty in trial mode.
  - Updated `RealtimeTranslationClientSecretProvider` sponsored-trial path to request source transcripts and kept `shouldSendSessionUpdate = false` for client-secret sessions.
  - Updated focused provider coverage in `SponsoredTrialClientTests` to assert `source_transcript_enabled = true` for sponsored mode.
  - Updated parity/handoff docs (`IOS_PARITY_OVERNIGHT_PLAN.md` and `REAL_IMPLEMENTATION_PLAN.md`) to reflect completed iOS transcript/auth/runtime parity work and remaining real-device checks.
- Files changed this session:
  - `apple/Chuchotage/Network/RealtimeTranslationClientSecretProvider.swift`
  - `apple/ChuchotageTests/SponsoredTrialClientTests.swift`
  - `apple/REAL_IMPLEMENTATION_PLAN.md`
  - `apple/IOS_PARITY_OVERNIGHT_PLAN.md`
- Validation commands and results:
  - `DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer xcodebuild test -project ChuchotageApple.xcodeproj -scheme "Chuchotage macOS" -configuration Debug -destination "platform=macOS" -derivedDataPath /tmp/chuchotage-xcode-derived-macos CODE_SIGNING_ALLOWED=NO` -> **TEST SUCCEEDED** (52 tests, 0 failures).
  - `DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer xcodebuild -project ChuchotageApple.xcodeproj -scheme "Chuchotage iOS" -configuration Debug -destination "generic/platform=iOS" -derivedDataPath /tmp/chuchotage-xcode-derived-ios CODE_SIGNING_ALLOWED=NO build` -> **BUILD SUCCEEDED**.
  - Re-ran both commands after the sponsored-trial transcript fix -> **TEST SUCCEEDED** and **BUILD SUCCEEDED** again.
  - `rm -rf /tmp/chuchotage-xcode-derived-*` -> success.
- Blockers:
  - Physical iPhone and macOS smoke coverage is still required for real interruption/route-change behavior, Apple auth flow UX, and live sponsored endpoint verification with secret redaction.
- Next recommended action:
  - Run next-day hardware smoke checklist:
    1. iPhone API-key mode: start/stop, mic permission deny/allow, phone-vs-headset mic selection, transcript + audio output behavior.
    2. iPhone ChatGPT mode: sign-in callback, refresh-after-expiry path, client-secret retry on unauthorized.
    3. iPhone sponsored mode: live trial endpoint request, verify transcript panes populate, verify quota/backoff messaging.
    4. macOS system-audio mode: tap permission prompt, source/playback separation, interruption + route-change recovery.

### 2026-05-18 — Session 7 Follow-up (Completed)

- Pre-session dirty files detected:
  - `apple/Chuchotage/AppRootView.swift` (modified)
  - `apple/Chuchotage/Audio/IOSTranslationAudioIO.swift` (modified)
  - `apple/Chuchotage/Audio/TranslationAudioIO.swift` (modified)
  - `apple/Chuchotage/Credentials/ChatGPTOAuthClient.swift` (modified)
  - `apple/Chuchotage/Credentials/OpenAICredential.swift` (modified)
  - `apple/Chuchotage/Network/RealtimeTranslationClientSecretProvider.swift` (modified)
  - `apple/Chuchotage/Runtime/TranslationRuntime.swift` (modified)
  - `apple/Chuchotage/Runtime/TranslationState.swift` (modified)
  - `apple/Chuchotage/Settings/TranslationLanguages.swift` (modified)
  - `apple/Chuchotage/Settings/TranslationSettingsSheet.swift` (modified)
  - `apple/Chuchotage/TranslationViewModel.swift` (modified)
  - `apple/ChuchotageApple.xcodeproj/project.pbxproj` (modified)
  - `apple/ChuchotageTests/RealtimeTranslationSharedTests.swift` (modified)
  - `apple/ChuchotageTests/TranslationRuntimeTests.swift` (modified)
  - `apple/REAL_IMPLEMENTATION_PLAN.md` (modified)
  - `apple/Chuchotage/Network/SponsoredTrialClient.swift` (untracked)
  - `apple/ChuchotageTests/ChatGPTOAuthClientTests.swift` (untracked)
  - `apple/ChuchotageTests/SponsoredTrialClientTests.swift` (untracked)
  - `apple/ChuchotageTests/TranslationViewModelTests.swift` (untracked)
  - `apple/IOS_PARITY_OVERNIGHT_PLAN.md` (untracked)
- Work completed:
  - Added focused runtime parity coverage for live settings changes that trigger audio-route failure while translation is active.
  - New test asserts that runtime transitions to `.error`, surfaces the specific route/actionable fatal message, and cleans up audio/socket resources.
  - Hardened the runtime test fake audio seam to model one-time unexpected-stop message consumption, matching real runtime behavior.
- Files changed this session:
  - `apple/ChuchotageTests/TranslationRuntimeTests.swift`
  - `apple/IOS_PARITY_OVERNIGHT_PLAN.md`
- Validation commands and results:
  - `DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer xcodebuild test -project ChuchotageApple.xcodeproj -scheme "Chuchotage macOS" -configuration Debug -destination "platform=macOS" -derivedDataPath /tmp/chuchotage-xcode-derived-macos CODE_SIGNING_ALLOWED=NO` -> initial run failed due test-only enum mismatch (`AudioInputSource.headset` unavailable on macOS target); fixed in this session and re-ran.
  - `DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer xcodebuild test -project ChuchotageApple.xcodeproj -scheme "Chuchotage macOS" -configuration Debug -destination "platform=macOS" -derivedDataPath /tmp/chuchotage-xcode-derived-macos CODE_SIGNING_ALLOWED=NO` -> **TEST SUCCEEDED** (54 tests, 0 failures; includes new update-settings route-failure runtime test).
  - `DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer xcodebuild -project ChuchotageApple.xcodeproj -scheme "Chuchotage iOS" -configuration Debug -destination "generic/platform=iOS" -derivedDataPath /tmp/chuchotage-xcode-derived-ios CODE_SIGNING_ALLOWED=NO build` -> **BUILD SUCCEEDED**.
  - `rm -rf /tmp/chuchotage-xcode-derived-*` -> success.
- Blockers:
  - Physical iPhone and macOS smoke execution is still required for final parity confirmation of route/interruption behavior and live sponsored endpoint behavior.
- Next recommended action:
  - Execute the existing hardware checklist from Session 7 on real devices, then patch only the defects observed on-device.
