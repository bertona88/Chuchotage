# Chuchotage Apple Platforms

Native SwiftUI implementation for iOS and macOS inside the cross-platform Chuchotage monorepo.

This is intentionally Apple-local code. Android and Windows live in sibling folders and are useful references for product behavior, Realtime request shapes, audio routing, and error handling, but Apple work should stay under `apple/` unless a task explicitly asks for shared repository changes.

## Current Status

The iOS app has a public App Store listing at `https://apps.apple.com/it/app/chuchotage/id6770434335`.

The Apple implementation builds and has a real shared layer: SwiftUI shell, product settings, supported output languages, credential models and validation, Keychain credential storage, ChatGPT-first setup UI, sponsored-trial and API-key fallbacks, PCM16 helpers, OpenAI Realtime Translation request/event handling, WebSocket transport, ChatGPT OAuth login/refresh, client-secret exchange, and a `TranslationRuntime` coordinator.

Apple audio I/O is now platform-specific:

- iOS is microphone listen-along with translated audio playback.
- iOS/iPadOS same-device app-audio translation is possible as a future ReplayKit broadcast feature, but it is not implemented in the current app. See `../docs/ios-replaykit-device-audio-plan.md`.
- macOS captures Mac playback audio with Core Audio process taps on macOS 14.2+ and excludes Chuchotage playback from the capture mix.

Remaining release/readiness work is platform-specific:

- Ongoing iPhone and macOS audio smoke testing, especially permissions, route changes, ChatGPT OAuth callback behavior, sponsored-trial live endpoint behavior, and long-running sessions.
- Any hardware-only fixes that shake out from real-device testing.

See `REAL_IMPLEMENTATION_PLAN.md` for remaining Apple implementation work.

## Local Setup

Install Xcode from the Mac App Store, then generate the project:

```bash
cd apple
xcodegen generate
open ChuchotageApple.xcodeproj
```

The project defines two app schemes:

- `Chuchotage iOS`
- `Chuchotage macOS`

For iPhone testing, connect the device by USB or Wi-Fi, select the `Chuchotage iOS` scheme, choose the iPhone as the run destination, and set a signing team in Xcode if prompted.

## Boundaries

Keep Apple code inside this folder. Android and Windows are sibling implementations and reference points; do not change them from Apple work unless a task explicitly asks for shared cross-platform changes.
