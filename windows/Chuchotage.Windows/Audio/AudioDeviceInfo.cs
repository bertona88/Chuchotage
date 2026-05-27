namespace Chuchotage.Windows.Audio;

internal sealed record AudioDeviceInfo(string Id, string Name)
{
    public override string ToString() => Name;
}
