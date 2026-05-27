using NAudio.CoreAudioApi;
using NAudio.Wave;

namespace Chuchotage.Windows.Audio;

internal sealed class LoopbackAudioCapture : IAudioCaptureSource
{
    private WasapiLoopbackCapture? _capture;
    private Pcm16AudioConverter? _converter;

    public event Action<byte[], float>? PcmAvailable;
    public event Action<string>? CaptureFailed;

    public void Start(MMDevice device)
    {
        Stop();

        _capture = new WasapiLoopbackCapture(device);
        _converter = new Pcm16AudioConverter(_capture.WaveFormat);

        _capture.DataAvailable += HandleDataAvailable;
        _capture.RecordingStopped += HandleRecordingStopped;
        _capture.StartRecording();
    }

    public void Stop()
    {
        if (_capture is null)
        {
            return;
        }

        _capture.DataAvailable -= HandleDataAvailable;
        _capture.RecordingStopped -= HandleRecordingStopped;

        try
        {
            _capture.StopRecording();
        }
        catch
        {
            // Stop is best effort during cancellation and app shutdown.
        }

        _capture.Dispose();
        _capture = null;
        _converter = null;
    }

    public void Dispose() => Stop();

    private void HandleDataAvailable(object? sender, WaveInEventArgs args)
    {
        try
        {
            var converter = _converter;
            if (converter is null)
            {
                return;
            }

            var pcm = converter.ConvertToRealtimePcm16(args.Buffer, args.BytesRecorded);
            if (pcm.Length == 0)
            {
                return;
            }

            PcmAvailable?.Invoke(pcm, PcmVolumeMeter.Level(pcm));
        }
        catch (Exception error)
        {
            CaptureFailed?.Invoke(error.Message);
        }
    }

    private void HandleRecordingStopped(object? sender, StoppedEventArgs args)
    {
        if (args.Exception is not null)
        {
            CaptureFailed?.Invoke(args.Exception.Message);
        }
    }
}
