using System.Runtime.InteropServices;
using NAudio.CoreAudioApi;
using NAudio.CoreAudioApi.Interfaces;
using NAudio.Wasapi.CoreAudioApi.Interfaces;
using NAudio.Wave;

namespace Chuchotage.Windows.Audio;

internal sealed class ProcessExcludingLoopbackAudioCapture : IAudioCaptureSource
{
    private const string VirtualAudioDeviceProcessLoopback = "VAD\\Process_Loopback";
    private const int VtBlob = 65;
    private static readonly Guid IIDIAudioClient = new("1CB9AD4C-DBFA-4c32-B178-C2F568A703B2");

    private readonly object _gate = new();

    private AudioClient? _audioClient;
    private NAudio.CoreAudioApi.AudioCaptureClient? _captureClient;
    private Pcm16AudioConverter? _converter;
    private AutoResetEvent? _sampleReady;
    private Thread? _captureThread;
    private volatile bool _stopping;
    private int _blockAlign;

    public event Action<byte[], float>? PcmAvailable;
    public event Action<string>? CaptureFailed;

    public void Start(int excludedProcessId)
    {
        Stop();

        _stopping = false;
        _blockAlign = 4;

        var captureFormat = new WaveFormat(44_100, 16, 2);
        _converter = new Pcm16AudioConverter(captureFormat);
        _sampleReady = new AutoResetEvent(false);

        try
        {
            _audioClient = ActivateAudioClientAsync(excludedProcessId).GetAwaiter().GetResult();
            _audioClient.Initialize(
                AudioClientShareMode.Shared,
                AudioClientStreamFlags.Loopback
                    | AudioClientStreamFlags.EventCallback
                    | AudioClientStreamFlags.AutoConvertPcm,
                0,
                0,
                captureFormat,
                Guid.Empty);
            _audioClient.SetEventHandle(_sampleReady.SafeWaitHandle.DangerousGetHandle());
            _captureClient = _audioClient.AudioCaptureClient;
            _captureThread = new Thread(CaptureLoop)
            {
                IsBackground = true,
                Name = "Chuchotage process loopback capture",
            };
            _audioClient.Start();
            _captureThread.Start();
        }
        catch
        {
            Stop();
            throw;
        }
    }

    public void Stop()
    {
        lock (_gate)
        {
            _stopping = true;
            _sampleReady?.Set();
        }

        if (_captureThread is not null && _captureThread.IsAlive && _captureThread != Thread.CurrentThread)
        {
            try
            {
                _captureThread.Join(TimeSpan.FromSeconds(2));
            }
            catch
            {
                // Capture shutdown is best effort when the app is stopping.
            }
        }

        lock (_gate)
        {
            try
            {
                _audioClient?.Stop();
            }
            catch
            {
                // The audio client may already be stopped.
            }

            _captureClient?.Dispose();
            _audioClient?.Dispose();
            _sampleReady?.Dispose();

            _captureClient = null;
            _audioClient = null;
            _sampleReady = null;
            _captureThread = null;
            _converter = null;
        }
    }

    public void Dispose() => Stop();

    private void CaptureLoop()
    {
        while (!_stopping)
        {
            try
            {
                var waitHandle = _sampleReady;
                if (waitHandle is null)
                {
                    return;
                }

                waitHandle.WaitOne(TimeSpan.FromMilliseconds(250));
                DrainCapturePackets();
            }
            catch (Exception error)
            {
                if (!_stopping)
                {
                    CaptureFailed?.Invoke(error.Message);
                }

                return;
            }
        }
    }

    private void DrainCapturePackets()
    {
        var captureClient = _captureClient;
        var converter = _converter;
        if (captureClient is null || converter is null)
        {
            return;
        }

        while (!_stopping && captureClient.GetNextPacketSize() > 0)
        {
            var buffer = captureClient.GetBuffer(
                out var framesAvailable,
                out var captureFlags,
                out _,
                out _);
            var bytesRecorded = framesAvailable * _blockAlign;
            if (bytesRecorded <= 0)
            {
                captureClient.ReleaseBuffer(framesAvailable);
                continue;
            }

            var sourceBytes = new byte[bytesRecorded];
            if (!captureFlags.HasFlag(AudioClientBufferFlags.Silent))
            {
                Marshal.Copy(buffer, sourceBytes, 0, bytesRecorded);
            }

            captureClient.ReleaseBuffer(framesAvailable);

            var pcm = converter.ConvertToRealtimePcm16(sourceBytes, bytesRecorded);
            if (pcm.Length == 0)
            {
                continue;
            }

            PcmAvailable?.Invoke(pcm, PcmVolumeMeter.Level(pcm));
        }
    }

    private static async Task<AudioClient> ActivateAudioClientAsync(int excludedProcessId)
    {
        var completionHandler = new ActivateCompletionHandler();
        var activationParams = new AudioClientActivationParams
        {
            ActivationType = AudioClientActivationType.ProcessLoopback,
            ProcessLoopbackParams = new AudioClientProcessLoopbackParams
            {
                ProcessLoopbackMode = ProcessLoopbackMode.ExcludeTargetProcessTree,
                TargetProcessId = (uint)excludedProcessId,
            },
        };

        var activationParamsPointer = IntPtr.Zero;
        var propVariantPointer = IntPtr.Zero;
        IActivateAudioInterfaceAsyncOperation? operation = null;

        try
        {
            activationParamsPointer = Marshal.AllocHGlobal(Marshal.SizeOf<AudioClientActivationParams>());
            Marshal.StructureToPtr(activationParams, activationParamsPointer, fDeleteOld: false);

            var propVariant = new PropVariantBlob
            {
                VariantType = VtBlob,
                Blob = new Blob
                {
                    Size = Marshal.SizeOf<AudioClientActivationParams>(),
                    Data = activationParamsPointer,
                },
            };

            propVariantPointer = Marshal.AllocHGlobal(Marshal.SizeOf<PropVariantBlob>());
            Marshal.StructureToPtr(propVariant, propVariantPointer, fDeleteOld: false);

            var audioClientInterfaceId = IIDIAudioClient;
            Marshal.ThrowExceptionForHR(ActivateAudioInterfaceAsync(
                VirtualAudioDeviceProcessLoopback,
                ref audioClientInterfaceId,
                propVariantPointer,
                completionHandler,
                out operation));

            var audioClient = await completionHandler.Task
                .WaitAsync(TimeSpan.FromSeconds(10))
                .ConfigureAwait(false);
            return new AudioClient(audioClient);
        }
        finally
        {
            if (operation is not null)
            {
                Marshal.ReleaseComObject(operation);
            }

            if (propVariantPointer != IntPtr.Zero)
            {
                Marshal.FreeHGlobal(propVariantPointer);
            }

            if (activationParamsPointer != IntPtr.Zero)
            {
                Marshal.FreeHGlobal(activationParamsPointer);
            }
        }
    }

    [DllImport("Mmdevapi.dll", CharSet = CharSet.Unicode, ExactSpelling = true)]
    private static extern int ActivateAudioInterfaceAsync(
        [MarshalAs(UnmanagedType.LPWStr)] string deviceInterfacePath,
        ref Guid riid,
        IntPtr activationParams,
        IActivateAudioInterfaceCompletionHandler completionHandler,
        out IActivateAudioInterfaceAsyncOperation activationOperation);

    [StructLayout(LayoutKind.Sequential)]
    private struct AudioClientActivationParams
    {
        public AudioClientActivationType ActivationType;
        public AudioClientProcessLoopbackParams ProcessLoopbackParams;
    }

    private enum AudioClientActivationType
    {
        Default = 0,
        ProcessLoopback = 1,
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct AudioClientProcessLoopbackParams
    {
        public uint TargetProcessId;
        public ProcessLoopbackMode ProcessLoopbackMode;
    }

    private enum ProcessLoopbackMode
    {
        IncludeTargetProcessTree = 0,
        ExcludeTargetProcessTree = 1,
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct PropVariantBlob
    {
        public ushort VariantType;
        public ushort Reserved1;
        public ushort Reserved2;
        public ushort Reserved3;
        public Blob Blob;
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct Blob
    {
        public int Size;
        public IntPtr Data;
    }

    [ComVisible(true)]
    [ClassInterface(ClassInterfaceType.None)]
    private sealed class ActivateCompletionHandler : IActivateAudioInterfaceCompletionHandler
    {
        private readonly TaskCompletionSource<IAudioClient> _completion =
            new(TaskCreationOptions.RunContinuationsAsynchronously);

        public Task<IAudioClient> Task => _completion.Task;

        public void ActivateCompleted(IActivateAudioInterfaceAsyncOperation activateOperation)
        {
            try
            {
                activateOperation.GetActivateResult(out var activateResult, out var activatedInterface);
                Marshal.ThrowExceptionForHR(activateResult);
                _completion.TrySetResult((IAudioClient)activatedInterface);
            }
            catch (Exception error)
            {
                _completion.TrySetException(error);
            }
        }
    }
}
