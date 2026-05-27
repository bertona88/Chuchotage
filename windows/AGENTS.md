# Windows Companion Guidance

## Scope

This folder contains the Windows companion app for Chuchotage.

Keep Windows work scoped to the Windows companion unless the user explicitly asks for shared cross-platform changes. Do not let Windows work change Android package identity, iOS bundle identity, app-store metadata, or unrelated platform behavior.

The Windows companion should run as a normal user app without admin elevation, bundled virtual audio drivers, a Teams integration, or a deployed Chuchotage backend.

Shared product, UX, brand, listening/routing, and copy guidance lives in `../docs/product-design-guidelines.md`. Keep Windows-specific implementation and packaging guidance here.

Normal no-admin routing should follow the shared design guidance: guide the user to use two separate Windows playback devices, one for the source app audio that Chuchotage captures and one for translated playback. If the user explicitly has administrator access, an advanced route may use an admin-provided virtual playback device as the capture endpoint and real headphones as translated playback. Do not make a virtual device mandatory, and do not add driver installation to the app unless the user explicitly asks for that work.

## Architecture

- Electron UI: `Chuchotage.Electron/`.
- Headless .NET bridge/backend: `Chuchotage.Windows/`.
- Electron owns the visible desktop UI, packaging scripts, shortcuts, and user-local installation.
- The .NET backend owns WASAPI audio capture/playback, session volume mixing, credential exchange, and OpenAI Realtime Translation.
- Electron and .NET communicate over newline-delimited JSON on stdin/stdout.

Do not recreate the old WinForms UI.

## Runtime Behavior

The companion captures selected Windows playback audio with WASAPI loopback, streams it to OpenAI Realtime Translation, and plays translated audio to a selected output device.

For same-headset testing, prefer the app's Windows audio-session mixer over virtual audio devices.

Use OpenAI Realtime Translation with the dedicated translation endpoint and model:

- WebSocket endpoint: `wss://api.openai.com/v1/realtime/translations?model=gpt-realtime-translate`.
- Model: `gpt-realtime-translate`.
- Configure only the target output language.

## Build And Install

Build and install the Electron Windows companion from `Chuchotage.Electron/` on a Windows machine:

```powershell
npm install
npm run install:user
```

This publishes the .NET backend, stages it into the Electron app, packages Electron for win-x64, copies the result to `%LOCALAPPDATA%/Programs/Chuchotage Electron`, and updates Start Menu/Desktop shortcuts.

If the machine has the .NET runtime but no admin rights for an SDK install, use the Microsoft user-local install script instead of `winget` or a machine-wide installer.

For no-admin backend work, invoke `%USERPROFILE%/.dotnet/dotnet.exe` explicitly when needed:

```powershell
$dotnet = Join-Path $env:USERPROFILE ".dotnet/dotnet.exe"
& $dotnet build .\windows\Chuchotage.Windows\Chuchotage.Windows.csproj -c Release
& $dotnet publish .\windows\Chuchotage.Windows\Chuchotage.Windows.csproj -c Release -r win-x64 --self-contained true -p:PublishSingleFile=true
```

Build and runtime validation require a Windows machine with the .NET SDK.

## Artifacts

Keep generated Electron/backend output out of git:

- `Chuchotage.Electron/backend/`
- `Chuchotage.Electron/dist/`
- `Chuchotage.Electron/node_modules/`
- .NET `bin/` and `obj/`

The .NET publish output is not the end-user app by itself. For local smoke testing, run or install the Electron wrapper.

## Security

The Windows companion may read Codex/ChatGPT auth from `%USERPROFILE%/.codex/auth.json` when the API key field is left empty. Treat those tokens as secrets: never print, log, commit, paste, or expose their values.
