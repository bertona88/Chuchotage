namespace Chuchotage.Windows.Audio;

internal interface IAudioCaptureSource : IDisposable
{
    event Action<byte[], float>? PcmAvailable;
    event Action<string>? CaptureFailed;

    void Stop();
}
