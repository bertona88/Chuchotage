using NAudio.CoreAudioApi;
using System.Diagnostics;

namespace Chuchotage.Windows.Audio;

internal sealed class AudioDeviceService : IDisposable
{
    private readonly MMDeviceEnumerator _enumerator = new();

    public IReadOnlyList<AudioDeviceInfo> GetActiveRenderDevices()
    {
        return _enumerator
            .EnumerateAudioEndPoints(DataFlow.Render, DeviceState.Active)
            .Select(device => new AudioDeviceInfo(device.ID, FriendlyName(device)))
            .OrderBy(device => device.Name, StringComparer.CurrentCultureIgnoreCase)
            .ToList();
    }

    public AudioDeviceInfo? GetDefaultRenderDevice()
    {
        try
        {
            var device = _enumerator.GetDefaultAudioEndpoint(DataFlow.Render, Role.Multimedia);
            return new AudioDeviceInfo(device.ID, $"{FriendlyName(device)} (default)");
        }
        catch
        {
            return null;
        }
    }

    public void Dispose() => _enumerator.Dispose();

    public MMDevice GetRenderDevice(string deviceId)
    {
        return _enumerator.GetDevice(deviceId);
    }

    public IReadOnlyList<AudioSessionInfo> GetActiveRenderSessions(string deviceId)
    {
        if (string.IsNullOrWhiteSpace(deviceId))
        {
            return Array.Empty<AudioSessionInfo>();
        }

        using var device = GetRenderDevice(deviceId);
        device.AudioSessionManager.RefreshSessions();
        var sessions = device.AudioSessionManager.Sessions;
        var currentProcessId = Environment.ProcessId;
        var result = new List<AudioSessionInfo>();

        for (var index = 0; index < sessions.Count; index++)
        {
            AudioSessionControl? session = null;
            try
            {
                session = sessions[index];
                if (session.IsSystemSoundsSession)
                {
                    continue;
                }

                var processId = unchecked((int)session.GetProcessID);
                if (processId == 0 || processId == currentProcessId)
                {
                    continue;
                }

                var processName = ProcessNameFor(processId);
                var displayName = FirstNonBlank(session.DisplayName, FriendlyAppName(processName), $"Process {processId}");
                result.Add(new AudioSessionInfo(
                    deviceId,
                    session.GetSessionInstanceIdentifier,
                    displayName,
                    processName,
                    processId));
            }
            catch
            {
                // Audio sessions can disappear while we enumerate them.
            }
            finally
            {
                session?.Dispose();
            }
        }

        return result
            .GroupBy(session => session.SessionInstanceId, StringComparer.Ordinal)
            .Select(group => group.First())
            .OrderByDescending(IsLikelyTeamsSession)
            .ThenBy(session => session.DisplayName, StringComparer.CurrentCultureIgnoreCase)
            .ToList();
    }

    public AudioSessionVolumeSnapshot? SetSessionVolume(
        AudioSessionInfo sessionInfo,
        float volume,
        AudioSessionVolumeSnapshot? existingSnapshot = null)
    {
        if (sessionInfo.IsNone)
        {
            return existingSnapshot;
        }

        AudioSessionVolumeSnapshot? snapshot = existingSnapshot;
        WithSession(sessionInfo, session =>
        {
            var simpleVolume = session.SimpleAudioVolume;
            snapshot ??= new AudioSessionVolumeSnapshot(simpleVolume.Volume, simpleVolume.Mute);
            simpleVolume.Volume = Math.Clamp(volume, 0f, 1f);
            simpleVolume.Mute = false;
        });
        return snapshot;
    }

    public void RestoreSessionVolume(
        AudioSessionInfo sessionInfo,
        AudioSessionVolumeSnapshot? snapshot)
    {
        if (sessionInfo.IsNone || snapshot is null)
        {
            return;
        }

        WithSession(sessionInfo, session =>
        {
            var simpleVolume = session.SimpleAudioVolume;
            simpleVolume.Volume = snapshot.Volume;
            simpleVolume.Mute = snapshot.Muted;
        });
    }

    private static string FriendlyName(MMDevice device)
    {
        return string.IsNullOrWhiteSpace(device.FriendlyName) ? device.ID : device.FriendlyName;
    }

    private static string ProcessNameFor(int processId)
    {
        try
        {
            using var process = Process.GetProcessById(processId);
            return process.ProcessName;
        }
        catch
        {
            return string.Empty;
        }
    }

    private static string FriendlyAppName(string processName)
    {
        if (string.IsNullOrWhiteSpace(processName))
        {
            return string.Empty;
        }

        if (processName.Contains("teams", StringComparison.OrdinalIgnoreCase))
        {
            return "Microsoft Teams";
        }

        return processName;
    }

    private static string FirstNonBlank(params string[] values)
    {
        return values.FirstOrDefault(value => !string.IsNullOrWhiteSpace(value)) ?? string.Empty;
    }

    private static bool IsLikelyTeamsSession(AudioSessionInfo session)
    {
        return session.DisplayName.Contains("teams", StringComparison.OrdinalIgnoreCase)
            || session.ProcessName.Contains("teams", StringComparison.OrdinalIgnoreCase)
            || session.ProcessName.Contains("msedgewebview2", StringComparison.OrdinalIgnoreCase);
    }

    private void WithSession(AudioSessionInfo sessionInfo, Action<AudioSessionControl> action)
    {
        using var device = GetRenderDevice(sessionInfo.DeviceId);
        device.AudioSessionManager.RefreshSessions();
        var sessions = device.AudioSessionManager.Sessions;

        for (var index = 0; index < sessions.Count; index++)
        {
            AudioSessionControl? session = null;
            try
            {
                session = sessions[index];
                if (session.GetSessionInstanceIdentifier == sessionInfo.SessionInstanceId)
                {
                    action(session);
                    return;
                }
            }
            catch
            {
                // The app may have stopped producing audio; leave the system volume alone.
            }
            finally
            {
                session?.Dispose();
            }
        }
    }
}

internal sealed record AudioSessionVolumeSnapshot(float Volume, bool Muted);
