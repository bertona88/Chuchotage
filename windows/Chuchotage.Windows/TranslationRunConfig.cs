using Chuchotage.Windows.Audio;

namespace Chuchotage.Windows;

internal sealed record TranslationRunConfig(
    string BearerToken,
    bool ShouldSendSessionUpdate,
    string TargetLanguageCode,
    int MixPercent,
    AudioSessionInfo OriginalSession,
    AudioDeviceInfo CaptureDevice,
    AudioDeviceInfo PlaybackDevice);
