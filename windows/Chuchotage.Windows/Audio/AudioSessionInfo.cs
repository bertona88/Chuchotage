namespace Chuchotage.Windows.Audio;

internal sealed record AudioSessionInfo(
    string DeviceId,
    string SessionInstanceId,
    string DisplayName,
    string ProcessName,
    int ProcessId,
    bool IsNone = false)
{
    public static AudioSessionInfo None { get; } = new(
        DeviceId: string.Empty,
        SessionInstanceId: string.Empty,
        DisplayName: "Do not control original app",
        ProcessName: string.Empty,
        ProcessId: 0,
        IsNone: true);

    public override string ToString()
    {
        if (IsNone)
        {
            return DisplayName;
        }

        return string.IsNullOrWhiteSpace(ProcessName)
            ? DisplayName
            : $"{DisplayName} ({ProcessName})";
    }
}
