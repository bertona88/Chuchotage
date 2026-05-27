using System.Buffers;
using NAudio.Wave;

namespace Chuchotage.Windows.Audio;

internal sealed class Pcm16AudioConverter
{
    public static readonly WaveFormat RealtimeFormat = new(24_000, 16, 1);

    private readonly WaveFormat _sourceFormat;

    public Pcm16AudioConverter(WaveFormat sourceFormat)
    {
        _sourceFormat = sourceFormat;
    }

    public byte[] ConvertToRealtimePcm16(byte[] buffer, int bytesRecorded)
    {
        if (bytesRecorded <= 0)
        {
            return Array.Empty<byte>();
        }

        if (IsRealtimeFormat(_sourceFormat))
        {
            var copy = new byte[bytesRecorded];
            Array.Copy(buffer, copy, bytesRecorded);
            return copy;
        }

        using var sourceStream = new RawSourceWaveStream(
            new MemoryStream(buffer, 0, bytesRecorded, writable: false),
            _sourceFormat);
        using var resampler = new MediaFoundationResampler(sourceStream, RealtimeFormat)
        {
            ResamplerQuality = 60,
        };
        using var output = new MemoryStream();

        var rented = ArrayPool<byte>.Shared.Rent(RealtimeFormat.AverageBytesPerSecond / 5);
        try
        {
            int read;
            while ((read = resampler.Read(rented, 0, rented.Length)) > 0)
            {
                output.Write(rented, 0, read);
            }
        }
        finally
        {
            ArrayPool<byte>.Shared.Return(rented);
        }

        return output.ToArray();
    }

    private static bool IsRealtimeFormat(WaveFormat format)
    {
        return format.Encoding == WaveFormatEncoding.Pcm
            && format.SampleRate == RealtimeFormat.SampleRate
            && format.BitsPerSample == RealtimeFormat.BitsPerSample
            && format.Channels == RealtimeFormat.Channels;
    }
}
