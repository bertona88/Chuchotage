# Chuchotage Windows Companion

This folder contains the Windows companion app for Chuchotage.

It is intentionally separate from the iOS, Android, and macOS apps. Shared product guidance lives in the repository docs; Windows-specific implementation stays here unless a task explicitly asks for shared cross-platform changes.

Shared product design guidance lives in [`../docs/product-design-guidelines.md`](../docs/product-design-guidelines.md).

## What It Does

- Captures audio from a selected Windows playback/output device using WASAPI loopback.
- Converts captured audio to mono PCM16 at 24 kHz.
- Streams audio to OpenAI Realtime Translation over WebSocket.
- Plays translated PCM16 audio to a selected Windows playback device.
- Stores an optional OpenAI API key with DPAPI for the current Windows user.
- Can fall back to Codex/ChatGPT auth from `%USERPROFILE%\.codex\auth.json` when the API key field is left empty, exchanging that credential for a short-lived Realtime Translation client secret.
- Runs as a normal user app and requests `asInvoker`, so it should not ask for administrator elevation.

## Capture Modes

The companion keeps two capture paths:

- If the capture device and translated playback device are different, it uses standard endpoint loopback capture for the selected capture output.
- If the capture device and translated playback device are the same, it tries Windows process-loopback capture and excludes the Chuchotage backend process tree so translated playback is not fed back into translation.

Process-loopback exclusion requires Windows 10 Build 20348 or newer. If that path fails on a machine or headset route, use separate physical routing when possible:

- Put the source app audio, such as Teams or a browser, on one output device.
- Put Chuchotage translated playback on another output device, usually the headphones you will listen to.

If administrator access is available, an advanced setup can use an externally installed virtual playback device instead:

- Route the source app audio to the virtual device.
- Set Chuchotage capture to that virtual device.
- Set Chuchotage translated playback to the real headphones or speakers.

Chuchotage does not install or manage virtual audio drivers.

## Requirements

- Windows 10 2004 or newer, or Windows 11.
- .NET 8 SDK for development.
- Either an OpenAI API key with access to Realtime Translation, or a local Codex/ChatGPT auth file at `%USERPROFILE%\.codex\auth.json`.
- Active Windows playback device with audio from the source app.

## Run

From `windows\Chuchotage.Electron` on Windows:

```powershell
npm install
npm run install:user
```

You can paste an API key into the app, leave the field empty to use local Codex/ChatGPT auth when available, or set an API key before launch:

```powershell
$env:OPENAI_API_KEY = "<OPENAI_API_KEY>"
npm run start
```

## Build An EXE

The visible desktop app is the Electron wrapper. The .NET publish output below is the backend/bridge used by Electron, not the complete end-user app by itself.

Framework-dependent build:

```powershell
dotnet publish .\windows\Chuchotage.Windows\Chuchotage.Windows.csproj -c Release -r win-x64 --self-contained false
```

Single-file self-contained build:

```powershell
dotnet publish .\windows\Chuchotage.Windows\Chuchotage.Windows.csproj -c Release -r win-x64 --self-contained true -p:PublishSingleFile=true
```

Output lands under:

```text
windows\Chuchotage.Windows\bin\Release\net8.0-windows10.0.19041.0\win-x64\publish\
```

## Packaging Direction

The current local install path is the Electron user-scope package:

```powershell
cd windows\Chuchotage.Electron
npm install
npm run install:user
```

That command publishes the .NET backend, stages it into Electron, packages the app for win-x64, copies it to `%LOCALAPPDATA%\Programs\Chuchotage Electron`, and updates Start Menu/Desktop shortcuts.

MSIX or a more polished user-scope installer can still be considered later. The normal install path should avoid anything that requires administrator rights:

- No bundled virtual audio driver.
- No Windows service.
- No machine-wide registry writes.
- No install into `C:\Program Files` unless explicitly choosing a machine-wide installer later.

## Implementation Notes

- Audio capture: `NAudio.WasapiLoopbackCapture`
- Resampling: `NAudio.MediaFoundationResampler`
- Playback: `NAudio.WasapiOut`
- Realtime endpoint: `wss://api.openai.com/v1/realtime/translations?model=gpt-realtime-translate`
- Input event: `session.input_audio_buffer.append`
- Output event: `session.output_audio.delta`
- Target language field: `session.audio.output.language`
