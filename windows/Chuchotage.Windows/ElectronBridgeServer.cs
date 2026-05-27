using System.Text.Json;
using System.Text.Json.Serialization;
using Chuchotage.Windows.Audio;
using Chuchotage.Windows.Diagnostics;
using Chuchotage.Windows.Security;

namespace Chuchotage.Windows;

internal sealed class ElectronBridgeServer
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
    };

    private readonly AudioDeviceService _audioDeviceService = new();
    private readonly CredentialStore _credentialStore = new();
    private readonly CodexAuthTranslationCredentialProvider _codexCredentialProvider = new();
    private readonly object _writeLock = new();

    private TranslationRuntime? _runtime;
    private CancellationTokenSource? _startCts;

    public async Task RunAsync()
    {
        SendEvent("ready", await BuildStateAsync().ConfigureAwait(false));

        string? line;
        while ((line = await Console.In.ReadLineAsync().ConfigureAwait(false)) is not null)
        {
            if (string.IsNullOrWhiteSpace(line))
            {
                continue;
            }

            BridgeRequest? request;
            try
            {
                request = JsonSerializer.Deserialize<BridgeRequest>(line, JsonOptions);
            }
            catch (Exception error)
            {
                SendEvent("log", new { level = "error", message = $"Bad request JSON: {error.Message}" });
                continue;
            }

            if (request is null)
            {
                continue;
            }

            try
            {
                var data = await HandleAsync(request).ConfigureAwait(false);
                SendResponse(request.Id, true, data, null);
            }
            catch (Exception error)
            {
                AppLog.Error($"Electron bridge command failed: {request.Command}", error);
                SendResponse(request.Id, false, null, $"{error.Message}{Environment.NewLine}Log: {AppLog.Path}");
            }
        }

        await StopAsync("Ready").ConfigureAwait(false);
        _audioDeviceService.Dispose();
    }

    private async Task<object?> HandleAsync(BridgeRequest request)
    {
        return request.Command switch
        {
            "state" => await BuildStateAsync(request.CaptureDeviceId).ConfigureAwait(false),
            "sessions" => BuildSessions(request.CaptureDeviceId),
            "start" => await StartAsync(request).ConfigureAwait(false),
            "stop" => await StopAsync("Ready").ConfigureAwait(false),
            "setMix" => SetMix(request.MixPercent),
            "shutdown" => await ShutdownAsync().ConfigureAwait(false),
            _ => throw new InvalidOperationException($"Unknown command: {request.Command}"),
        };
    }

    private Task<object> BuildStateAsync(string? captureDeviceId = null)
    {
        var devices = _audioDeviceService.GetActiveRenderDevices();
        var defaultDeviceId = _audioDeviceService.GetDefaultRenderDevice()?.Id;
        var selectedCaptureDeviceId = FirstExistingDeviceId(devices, captureDeviceId, defaultDeviceId);

        return Task.FromResult<object>(new
        {
            languages = TranslationLanguages.SupportedOutputLanguages,
            defaultLanguageCode = TranslationLanguages.DefaultTargetLanguageCode,
            devices,
            defaultDeviceId = FirstExistingDeviceId(devices, defaultDeviceId, null),
            sessions = BuildSessions(selectedCaptureDeviceId),
            hasStoredApiKey = !string.IsNullOrWhiteSpace(_credentialStore.ReadApiKey()),
            hasCodexAuth = _codexCredentialProvider.HasCodexAuthFile,
            running = _runtime is not null,
        });
    }

    private IReadOnlyList<AudioSessionInfo> BuildSessions(string? captureDeviceId)
    {
        var sessions = new List<AudioSessionInfo> { AudioSessionInfo.None };
        if (string.IsNullOrWhiteSpace(captureDeviceId))
        {
            return sessions;
        }

        try
        {
            sessions.AddRange(_audioDeviceService.GetActiveRenderSessions(captureDeviceId));
        }
        catch (Exception error)
        {
            AppLog.Error("Electron bridge could not refresh app sessions.", error);
        }

        return sessions;
    }

    private async Task<object> StartAsync(BridgeRequest request)
    {
        if (_runtime is not null)
        {
            throw new InvalidOperationException("Translation is already running.");
        }

        var devices = _audioDeviceService.GetActiveRenderDevices();
        var captureDevice = FindDevice(devices, request.CaptureDeviceId, "capture output");
        var playbackDevice = FindDevice(devices, request.PlaybackDeviceId, "translated playback");
        var languageCode = TranslationLanguages.SanitizeOutputLanguageCode(request.TargetLanguageCode);
        var originalSession = FindSession(captureDevice.Id, request.OriginalSessionId);
        var credential = await BuildCredentialAsync(request.ApiKey, languageCode).ConfigureAwait(false);

        if (!string.IsNullOrWhiteSpace(request.ApiKey) && request.RememberKey)
        {
            _credentialStore.SaveApiKey(request.ApiKey.Trim());
        }
        else if (!request.RememberKey)
        {
            _credentialStore.DeleteApiKey();
        }

        _startCts = new CancellationTokenSource();
        _runtime = new TranslationRuntime();
        _runtime.InputVolumeChanged += level => SendEvent("volume", new { level });
        _runtime.StatusChanged += status => SendEvent("status", new { status });
        _runtime.FatalError += message => _ = StopAfterFatalErrorAsync(message);

        var config = new TranslationRunConfig(
            credential.BearerToken,
            credential.ShouldSendSessionUpdate,
            languageCode,
            Math.Clamp(request.MixPercent ?? 50, 0, 100),
            originalSession,
            captureDevice,
            playbackDevice);

        SendEvent("status", new { status = "Connecting" });
        try
        {
            await _runtime.StartAsync(config, _startCts.Token).ConfigureAwait(false);
        }
        catch
        {
            await StopAsync("Error").ConfigureAwait(false);
            throw;
        }

        SendEvent("running", new { running = true });

        return new { running = true };
    }

    private async Task<object> StopAsync(string finalStatus)
    {
        _startCts?.Cancel();
        _startCts?.Dispose();
        _startCts = null;

        var runtime = _runtime;
        _runtime = null;
        if (runtime is not null)
        {
            await runtime.DisposeAsync().ConfigureAwait(false);
        }

        SendEvent("volume", new { level = 0 });
        SendEvent("status", new { status = finalStatus });
        SendEvent("running", new { running = false });
        return new { running = false };
    }

    private object SetMix(int? percent)
    {
        var value = Math.Clamp(percent ?? 50, 0, 100);
        _runtime?.SetMixPercent(value);
        return new { mixPercent = value };
    }

    private async Task<object> ShutdownAsync()
    {
        await StopAsync("Ready").ConfigureAwait(false);
        Environment.ExitCode = 0;
        return new { shuttingDown = true };
    }

    private async Task StopAfterFatalErrorAsync(string message)
    {
        SendEvent("fatalError", new { message = string.IsNullOrWhiteSpace(message) ? "Translation stopped unexpectedly." : message });
        await StopAsync("Error").ConfigureAwait(false);
    }

    private async Task<TranslationCredential> BuildCredentialAsync(string? apiKeyInput, string languageCode)
    {
        var apiKey = apiKeyInput?.Trim();
        if (!string.IsNullOrWhiteSpace(apiKey))
        {
            return new TranslationCredential(apiKey, ShouldSendSessionUpdate: true, "OpenAI API key");
        }

        var storedApiKey = _credentialStore.ReadApiKey();
        if (!string.IsNullOrWhiteSpace(storedApiKey))
        {
            return new TranslationCredential(storedApiKey, ShouldSendSessionUpdate: true, "Stored OpenAI API key");
        }

        if (!_codexCredentialProvider.HasCodexAuthFile)
        {
            throw new InvalidOperationException("Enter an OpenAI API key, or sign in with Codex so ~/.codex/auth.json exists.");
        }

        return await _codexCredentialProvider.CreateCredentialAsync(languageCode, CancellationToken.None)
            .ConfigureAwait(false);
    }

    private AudioDeviceInfo FindDevice(IReadOnlyList<AudioDeviceInfo> devices, string? deviceId, string label)
    {
        return devices.FirstOrDefault(device => device.Id == deviceId)
            ?? devices.FirstOrDefault()
            ?? throw new InvalidOperationException($"Choose a {label} device.");
    }

    private AudioSessionInfo FindSession(string captureDeviceId, string? sessionId)
    {
        if (string.IsNullOrWhiteSpace(sessionId))
        {
            return AudioSessionInfo.None;
        }

        return BuildSessions(captureDeviceId).FirstOrDefault(session => session.SessionInstanceId == sessionId)
            ?? AudioSessionInfo.None;
    }

    private static string? FirstExistingDeviceId(
        IReadOnlyList<AudioDeviceInfo> devices,
        string? preferredDeviceId,
        string? fallbackDeviceId)
    {
        return devices.FirstOrDefault(device => device.Id == preferredDeviceId)?.Id
            ?? devices.FirstOrDefault(device => device.Id == fallbackDeviceId)?.Id
            ?? devices.FirstOrDefault()?.Id;
    }

    private void SendResponse(string? id, bool ok, object? data, string? error)
    {
        WriteJson(new BridgeEnvelope("response", id, ok, null, data, error));
    }

    private void SendEvent(string eventName, object? data)
    {
        WriteJson(new BridgeEnvelope("event", null, true, eventName, data, null));
    }

    private void WriteJson(BridgeEnvelope envelope)
    {
        var json = JsonSerializer.Serialize(envelope, JsonOptions);
        lock (_writeLock)
        {
            Console.Out.WriteLine(json);
            Console.Out.Flush();
        }
    }

    private sealed record BridgeRequest(
        string? Id,
        string Command,
        string? TargetLanguageCode,
        string? CaptureDeviceId,
        string? PlaybackDeviceId,
        string? OriginalSessionId,
        string? ApiKey,
        bool RememberKey,
        int? MixPercent);

    private sealed record BridgeEnvelope(
        string Type,
        string? Id,
        bool Ok,
        string? Event,
        object? Data,
        string? Error);
}
