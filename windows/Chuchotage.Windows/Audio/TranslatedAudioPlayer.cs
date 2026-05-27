using NAudio.CoreAudioApi;
using NAudio.Wave;

namespace Chuchotage.Windows.Audio;

internal sealed class TranslatedAudioPlayer : IDisposable
{
    private readonly object _gate = new();

    private BufferedWaveProvider? _buffer;
    private WasapiOut? _output;
    private float _gain = 1.0f;

    public void SetVolumePercent(int percent)
    {
        lock (_gate)
        {
            _gain = Math.Clamp(percent, 0, 200) / 100f;
        }
    }

    public void Start(MMDevice device)
    {
        Stop();

        _buffer = new BufferedWaveProvider(Pcm16AudioConverter.RealtimeFormat)
        {
            BufferDuration = TimeSpan.FromSeconds(5),
            DiscardOnBufferOverflow = true,
        };

        _output = new WasapiOut(device, AudioClientShareMode.Shared, useEventSync: false, latency: 100);
        _output.Init(_buffer);
        _output.Play();
    }

    public void Enqueue(byte[] pcm16)
    {
        lock (_gate)
        {
            var buffer = _gain == 1.0f ? pcm16 : ApplyGain(pcm16, _gain);
            _buffer?.AddSamples(buffer, 0, buffer.Length);
        }
    }

    public void Stop()
    {
        lock (_gate)
        {
            _output?.Stop();
            _output?.Dispose();
            _output = null;
            _buffer = null;
        }
    }

    public void Dispose() => Stop();

    private static byte[] ApplyGain(byte[] pcm16, float gain)
    {
        var output = new byte[pcm16.Length];
        for (var index = 0; index + 1 < pcm16.Length; index += 2)
        {
            var sample = (short)(pcm16[index] | (pcm16[index + 1] << 8));
            var scaled = Math.Clamp((int)Math.Round(sample * gain), short.MinValue, short.MaxValue);
            output[index] = (byte)(scaled & 0xFF);
            output[index + 1] = (byte)((scaled >> 8) & 0xFF);
        }

        if (pcm16.Length % 2 == 1)
        {
            output[^1] = pcm16[^1];
        }

        return output;
    }
}
