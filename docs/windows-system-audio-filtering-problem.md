# Windows System Audio Filtering Problem

This note is a handoff for a fresh implementation session. It describes why the current single-headset mixer is not enough, and what architecture is likely needed for Chuchotage to behave like an audio layer over the PC: translate whatever the PC is outputting, while excluding Chuchotage's own translated playback.

## Current State

The Windows companion currently has:

- An Electron UI in `windows/Chuchotage.Electron/`.
- A .NET backend in `windows/Chuchotage.Windows/`.
- Standard WASAPI endpoint loopback capture via `NAudio.WasapiLoopbackCapture`.
- Translated audio playback via `NAudio.WasapiOut`.
- OpenAI Realtime Translation streaming.
- A UI control for selecting an original app/audio session and a mix slider.

The newer Electron UI should be treated as the current user-facing UI. Avoid reviving or editing the removed WinForms UI unless explicitly requested.

## Observed Behavior

Two separate playback devices can work reasonably:

- Device A: source app output, such as Teams/browser/media.
- Device B: Chuchotage translated playback.

The problem appears when using one headset for both:

- `Capture output` = headset.
- `Translated playback` = same headset.

In that setup, endpoint loopback captures the whole mixed signal being sent to the headset. That includes:

- The original app audio.
- Chuchotage's translated audio.
- Potentially any other system/app audio.

This creates two linked problems:

- Chuchotage can recapture its own translated output and feed it back into translation.
- Lowering the original app's Windows session volume also lowers the signal that endpoint loopback captures, so the translator hears less or nothing.

## Why The Audio Session Mixer Fails

The attempted mixer controlled two volumes:

- Chuchotage translated playback volume.
- The selected original app's Windows audio-session volume.

That can make the user's headset sound more balanced, but it cannot create a clean translation input.

With endpoint loopback, the capture happens from the final render stream for the selected playback device. If Chuchotage turns down Teams in that render stream, it also turns down Teams for Chuchotage's own capture. So a slider position like "translated only" accidentally means "translation input is also nearly muted."

This is not primarily a UI issue. It is an audio routing/capture architecture issue.

## Desired Product Behavior

The target behavior is:

> Chuchotage acts like a layer above PC audio: it listens to whatever the PC is outputting, translates it, and plays translated audio back, without listening to itself.

In single-headset mode, that implies:

- Capture all normal PC audio that the user would otherwise hear.
- Exclude Chuchotage's own playback from the captured stream.
- Keep playback on the same headset.
- Avoid requiring admin permissions, virtual audio drivers, or machine-wide setup.

This is broader than "Teams translation." It should work for Teams, browsers, media players, or any app producing PC audio.

## Likely Correct Direction

The likely non-admin direction is Windows process loopback capture, using the newer application loopback APIs instead of standard endpoint loopback.

Microsoft's Application Loopback sample describes two important modes:

- Include a target process tree.
- Exclude a target process tree.

For Chuchotage's broad "everything except itself" goal, the important mode is:

```text
PROCESS_LOOPBACK_MODE_EXCLUDE_TARGET_PROCESS_TREE
```

The idea is to activate a loopback capture stream for all system audio except the selected process tree. If Chuchotage excludes the process tree that owns translated playback, it should capture normal PC output while ignoring its own translated audio.

Relevant Microsoft references:

- Application Loopback sample: `https://learn.microsoft.com/cs-cz/samples/microsoft/windows-classic-samples/applicationloopbackaudio-sample/`
- `PROCESS_LOOPBACK_MODE`: `https://learn.microsoft.com/en-us/windows/win32/api/audioclientactivationparams/ne-audioclientactivationparams-process_loopback_mode`
- `AUDIOCLIENT_PROCESS_LOOPBACK_PARAMS`: `https://learn.microsoft.com/en-us/windows/win32/api/audioclientactivationparams/ns-audioclientactivationparams-audioclient_process_loopback_params`

Important OS requirement from Microsoft docs: this API requires Windows 10 Build 20348 or later.

## Chuchotage Process Tree Detail

The current Electron app starts the .NET backend as a child process:

```text
Electron process
  -> Chuchotage.exe --server
```

The translated audio playback currently happens in the .NET backend process, not in the Electron renderer.

Possible exclusion strategies:

- Exclude the .NET backend process tree. This directly excludes the process that plays translated audio.
- Exclude the Electron process tree if the backend is always a child and future UI sounds should also be excluded.

The implementation session should verify which process ID should be passed to process-loopback capture. Excluding too much could accidentally remove source audio if the source app is launched as a child of Chuchotage, which should normally not happen.

## Implementation Shape

Suggested incremental plan:

1. Add a new capture backend alongside `LoopbackAudioCapture`.
   - Do not delete the existing endpoint loopback path at first.
   - Name it something like `ProcessExcludingLoopbackAudioCapture`.

2. Port or wrap the Microsoft Application Loopback sample logic.
   - This may require COM/Win32 interop not currently present in NAudio.
   - Keep it isolated in `windows/Chuchotage.Windows/Audio/`.

3. Add a backend capture mode:
   - `EndpointLoopback`: current behavior, useful for two-device testing.
   - `SystemExceptChuchotage`: desired single-headset behavior.

4. First validate capture to a WAV file or local PCM sink before OpenAI.
   - Start Chuchotage playback.
   - Play YouTube/Teams/media.
   - Confirm captured PCM contains the external audio and not Chuchotage's own playback.

5. Only then wire it into `TranslationRuntime`.

6. Update the Electron UI after the backend is proven.
   - Keep the current new UI styling.
   - Prefer a simple mode toggle instead of exposing low-level API terms.

## UI Implications

The current "Original app" selector and session-volume mix slider are probably not the main product answer.

For the desired broad behavior, the UI could become simpler:

- Mode: `Single headset` / `Separate devices`.
- Capture:
  - In `Single headset`, capture should mean "PC audio except Chuchotage."
  - In `Separate devices`, capture can remain a selected output endpoint.
- Playback: selected headset/output device.
- Mix:
  - If process-excluding capture works, the slider can control translated playback volume and maybe leave original app/system volume alone.
  - If the user wants "translated only," that may still require lowering the system/source app volume, but it should no longer break capture if capture happens before or independently of that volume control.

Do not assume the session-volume mixer should remain. It was useful as a quick experiment, but it is probably conceptually misleading.

## Open Questions

- Does process loopback with `EXCLUDE_TARGET_PROCESS_TREE` capture all render endpoints globally, or does it behave differently with Bluetooth headsets and communications devices?
- Can the API be used cleanly from .NET with the current project target, or should a small native helper DLL/EXE be used?
- Should Chuchotage exclude the backend process or the Electron parent process tree?
- Does Teams/browser audio appear in the resulting stream when routed to Bluetooth headset hands-free vs stereo endpoints?
- Does muting/lowering the source app after switching to process-loopback still affect captured audio? This needs empirical testing.

## Recommendation

In the next session, do not spend more time debugging the current session-volume dimmer. Treat it as an experiment that proved the limitation.

The next meaningful technical step is:

> Build a minimal "capture all system audio except Chuchotage" prototype using Windows process loopback exclusion, validate it locally, then wire it into the current Electron-backed app.

