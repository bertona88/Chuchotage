using System.Threading.Channels;
using Chuchotage.Windows.Audio;
using Chuchotage.Windows.Diagnostics;
using Chuchotage.Windows.Realtime;

namespace Chuchotage.Windows;

internal sealed class TranslationRuntime : IAsyncDisposable
{
    private CancellationTokenSource? _sessionCts;
    private Channel<byte[]>? _audioChannel;
    private Task? _sendTask;
    private AudioDeviceService? _audioDeviceService;
    private NAudio.CoreAudioApi.MMDevice? _captureEndpoint;
    private NAudio.CoreAudioApi.MMDevice? _playbackEndpoint;
    private IAudioCaptureSource? _capture;
    private TranslatedAudioPlayer? _player;
    private RealtimeTranslationClient? _client;
    private AudioSessionInfo? _originalSession;
    private AudioSessionVolumeSnapshot? _originalVolumeSnapshot;
    private int _failureRaised;
    private int _disposeStarted;

    public event Action<float>? InputVolumeChanged;
    public event Action<string>? StatusChanged;
    public event Action<string>? FatalError;

    public async Task StartAsync(TranslationRunConfig config, CancellationToken cancellationToken)
    {
        _sessionCts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        _audioChannel = Channel.CreateBounded<byte[]>(new BoundedChannelOptions(capacity: 24)
        {
            FullMode = BoundedChannelFullMode.DropOldest,
            SingleReader = true,
            SingleWriter = false,
        });

        _client = new RealtimeTranslationClient();
        _audioDeviceService = new AudioDeviceService();
        _player = new TranslatedAudioPlayer();
        _originalSession = config.OriginalSession.IsNone ? null : config.OriginalSession;
        ApplyMixPercent(config.MixPercent);
        _capture = CreateCaptureSource(config);

        WireEvents(_client, _capture, _player, _audioChannel);

        try
        {
            StatusChanged?.Invoke("Connecting");
            try
            {
                await _client
                    .ConnectAsync(
                        config.BearerToken,
                        config.ShouldSendSessionUpdate,
                        config.TargetLanguageCode,
                        _sessionCts.Token)
                    .ConfigureAwait(false);
            }
            catch (Exception error)
            {
                AppLog.Error("OpenAI Realtime connection failed.", error);
                throw new InvalidOperationException($"OpenAI Realtime connection failed: {error.Message}", error);
            }

            try
            {
                _playbackEndpoint = _audioDeviceService.GetRenderDevice(config.PlaybackDevice.Id);
                _player.Start(_playbackEndpoint);
            }
            catch (Exception error)
            {
                AppLog.Error("Translated playback failed to start.", error);
                throw new InvalidOperationException(
                    $"Could not start translated playback on \"{config.PlaybackDevice.Name}\": {error.Message}",
                    error);
            }

            _sendTask = Task.Run(() => SendCapturedAudioLoopAsync(_sessionCts.Token), CancellationToken.None);
            try
            {
                if (_capture is ProcessExcludingLoopbackAudioCapture processCapture)
                {
                    processCapture.Start(Environment.ProcessId);
                }
                else if (_capture is LoopbackAudioCapture endpointCapture)
                {
                    _captureEndpoint = _audioDeviceService.GetRenderDevice(config.CaptureDevice.Id);
                    endpointCapture.Start(_captureEndpoint);
                }
                else
                {
                    throw new InvalidOperationException("Unknown capture source.");
                }
            }
            catch (Exception error)
            {
                AppLog.Error("Loopback capture failed to start.", error);
                throw new InvalidOperationException(
                    $"Could not capture audio from \"{config.CaptureDevice.Name}\": {error.Message}",
                    error);
            }

            StatusChanged?.Invoke("Listening");
        }
        catch
        {
            await DisposeAsync().ConfigureAwait(false);
            throw;
        }
    }

    public void SetMixPercent(int percent)
    {
        ApplyMixPercent(percent);
    }

    public async ValueTask DisposeAsync()
    {
        if (Interlocked.Exchange(ref _disposeStarted, 1) == 1)
        {
            return;
        }

        _sessionCts?.Cancel();
        _capture?.Stop();
        _audioChannel?.Writer.TryComplete();

        if (_sendTask is not null)
        {
            try
            {
                await _sendTask.ConfigureAwait(false);
            }
            catch
            {
                // The app is already stopping.
            }
        }

        if (_client is not null)
        {
            await _client.DisposeAsync().ConfigureAwait(false);
        }

        RestoreOriginalVolume();

        _player?.Dispose();
        _capture?.Dispose();
        _playbackEndpoint?.Dispose();
        _captureEndpoint?.Dispose();
        _audioDeviceService?.Dispose();
        _sessionCts?.Dispose();

        _client = null;
        _player = null;
        _capture = null;
        _originalSession = null;
        _originalVolumeSnapshot = null;
        _playbackEndpoint = null;
        _captureEndpoint = null;
        _audioDeviceService = null;
        _sessionCts = null;
        _audioChannel = null;
        _sendTask = null;
    }

    private void ApplyMixPercent(int percent)
    {
        var originalPercent = Math.Clamp(percent, 0, 100);
        var translatedPercent = 100 - originalPercent;
        _player?.SetVolumePercent(translatedPercent);

        if (_originalSession is null || _audioDeviceService is null)
        {
            return;
        }

        try
        {
            _originalVolumeSnapshot = _audioDeviceService.SetSessionVolume(
                _originalSession,
                originalPercent / 100f,
                _originalVolumeSnapshot);
        }
        catch (Exception error)
        {
            AppLog.Error("Could not set original app session volume.", error);
        }
    }

    private void RestoreOriginalVolume()
    {
        if (_originalSession is null || _audioDeviceService is null || _originalVolumeSnapshot is null)
        {
            return;
        }

        try
        {
            _audioDeviceService.RestoreSessionVolume(_originalSession, _originalVolumeSnapshot);
        }
        catch (Exception error)
        {
            AppLog.Error("Could not restore original app session volume.", error);
        }
    }

    private void WireEvents(
        RealtimeTranslationClient client,
        IAudioCaptureSource capture,
        TranslatedAudioPlayer player,
        Channel<byte[]> audioChannel)
    {
        client.OutputAudio += player.Enqueue;
        client.ErrorReceived += message => Fail(message);
        client.Closed += () => Fail("Realtime translation socket closed.");
        client.InputTranscriptDelta += _ => StatusChanged?.Invoke("Listening");
        client.OutputTranscriptDelta += _ => StatusChanged?.Invoke("Listening");

        capture.PcmAvailable += (pcm, level) =>
        {
            InputVolumeChanged?.Invoke(level);
            audioChannel.Writer.TryWrite(pcm);
        };
        capture.CaptureFailed += message => Fail($"Audio capture failed: {message}");
    }

    private static IAudioCaptureSource CreateCaptureSource(TranslationRunConfig config)
    {
        return string.Equals(config.CaptureDevice.Id, config.PlaybackDevice.Id, StringComparison.Ordinal)
            ? new ProcessExcludingLoopbackAudioCapture()
            : new LoopbackAudioCapture();
    }

    private async Task SendCapturedAudioLoopAsync(CancellationToken cancellationToken)
    {
        var channel = _audioChannel ?? throw new InvalidOperationException("Audio channel is not initialized.");
        var client = _client ?? throw new InvalidOperationException("Realtime client is not initialized.");

        try
        {
            await foreach (var pcm in channel.Reader.ReadAllAsync(cancellationToken).ConfigureAwait(false))
            {
                await client.SendInputAudioAsync(pcm, cancellationToken).ConfigureAwait(false);
            }
        }
        catch (OperationCanceledException)
        {
            // Normal shutdown.
        }
        catch (Exception error)
        {
            Fail(error.Message);
        }
    }

    private void Fail(string message)
    {
        if (Interlocked.Exchange(ref _failureRaised, 1) == 1)
        {
            return;
        }

        _sessionCts?.Cancel();
        _audioChannel?.Writer.TryComplete();
        _capture?.Stop();
        FatalError?.Invoke(string.IsNullOrWhiteSpace(message) ? "Translation stopped unexpectedly." : message);
    }
}
