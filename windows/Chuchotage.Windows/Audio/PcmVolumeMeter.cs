namespace Chuchotage.Windows.Audio;

internal static class PcmVolumeMeter
{
    public static float Level(byte[] pcm16)
    {
        if (pcm16.Length < 2)
        {
            return 0f;
        }

        var sampleCount = pcm16.Length / 2;
        double sumSquares = 0;

        for (var index = 0; index + 1 < pcm16.Length; index += 2)
        {
            var sample = (short)(pcm16[index] | (pcm16[index + 1] << 8));
            var normalized = sample / 32768.0;
            sumSquares += normalized * normalized;
        }

        var rms = Math.Sqrt(sumSquares / sampleCount);
        return (float)Math.Clamp(rms * 2.5, 0, 1);
    }
}
