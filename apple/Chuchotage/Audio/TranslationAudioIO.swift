import Foundation

protocol TranslationAudioIO: AnyObject, Sendable {
    func start(settings: TranslationSettings) async throws -> AsyncStream<PcmAudioChunk>
    func updateSettings(_ settings: TranslationSettings) async
    func playTranslatedAudio(_ pcm16: Data) async
    func consumeUnexpectedStopErrorMessage() async -> String?
    func stop() async
}

extension TranslationAudioIO {
    func updateSettings(_ settings: TranslationSettings) async {}
    func consumeUnexpectedStopErrorMessage() async -> String? { nil }
}

final class UnavailableTranslationAudioIO: TranslationAudioIO, @unchecked Sendable {
    func start(settings: TranslationSettings) async throws -> AsyncStream<PcmAudioChunk> {
        throw TranslationAudioIOError.notImplemented
    }

    func playTranslatedAudio(_ pcm16: Data) async {}

    func stop() async {}
}

enum TranslationAudioIOError: LocalizedError, Sendable {
    case notImplemented
    case microphonePermissionDenied
    case headsetInputUnavailable
    case microphoneUnavailable
    case builtInMicrophoneUnavailable
    case headsetMicrophoneUnavailable
    case headphoneOutputUnavailable
    case audioSessionConfigurationFailed
    case audioEngineStartUnavailable
    case audioEngineStartFailed(String)
    case unsupportedCaptureFormat
    case systemAudioRequiresMacOS14_2
    case systemAudioCapturePermissionDenied
    case systemAudioCaptureStartFailed(String)
    case outputDeviceUnavailable(String)
    case iOSDeviceAudioUnavailable

    var errorDescription: String? {
        switch self {
        case .notImplemented:
            return L10n.string(
                "error.appleAudioNotWired",
                defaultValue: "Apple audio capture and playback are not wired yet."
            )
        case .microphonePermissionDenied:
            return L10n.string(
                "error.microphonePermissionDenied",
                defaultValue: "Microphone access is needed to translate live audio. Enable microphone access for Chuchotage in Settings."
            )
        case .headsetInputUnavailable:
            return L10n.string(
                "error.headsetInputUnavailable",
                defaultValue: "Headset mic was selected, but no headset-style input device is available. Connect a headset microphone or choose the built-in input."
            )
        case .microphoneUnavailable:
            return L10n.string(
                "error.microphoneUnavailable",
                defaultValue: "No microphone is available for translation."
            )
        case .builtInMicrophoneUnavailable:
            return L10n.string(
                "error.builtInMicrophoneUnavailable",
                defaultValue: "The built-in microphone is not available. Choose Headset mic or disconnect external audio and try again."
            )
        case .headsetMicrophoneUnavailable:
            return L10n.string(
                "error.headsetMicrophoneUnavailable",
                defaultValue: "Connect a headset or Bluetooth microphone, or choose Phone mic before starting translation."
            )
        case .headphoneOutputUnavailable:
            return L10n.string(
                "error.headphoneOutputUnavailable",
                defaultValue: "Connect headphones or a Bluetooth audio output, or choose System default before starting translation."
            )
        case .audioSessionConfigurationFailed:
            return L10n.string(
                "error.audioRouteConfigurationFailed",
                defaultValue: "Chuchotage could not configure this audio route. Check your audio device and try again."
            )
        case .audioEngineStartUnavailable:
            return L10n.string(
                "error.audioEngineStartUnavailable",
                defaultValue: "Chuchotage could not start live audio. Check microphone access and try again."
            )
        case .audioEngineStartFailed(let message):
            return L10n.format(
                "error.macAudioStartFailed",
                defaultValue: "Could not start Mac audio capture: %@",
                message
            )
        case .unsupportedCaptureFormat:
            return L10n.string(
                "error.unsupportedCaptureFormat",
                defaultValue: "The current audio capture format is not supported for translation."
            )
        case .systemAudioRequiresMacOS14_2:
            return L10n.string(
                "error.systemAudioRequiresMacOS14_2",
                defaultValue: "Mac audio capture requires macOS 14.2 or newer."
            )
        case .systemAudioCapturePermissionDenied:
            return L10n.string(
                "error.systemAudioCapturePermissionDenied",
                defaultValue: "System audio recording is needed to translate Mac playback. Enable it for Chuchotage in System Settings > Privacy & Security > Screen & System Audio Recording."
            )
        case .systemAudioCaptureStartFailed(let message):
            return L10n.format(
                "error.macAudioStartFailed",
                defaultValue: "Could not start Mac audio capture: %@",
                message
            )
        case .outputDeviceUnavailable(let name):
            return L10n.format(
                "error.outputDeviceUnavailable",
                defaultValue: "The selected output device is unavailable: %@. Choose another output and start translation again.",
                name
            )
        case .iOSDeviceAudioUnavailable:
            return L10n.string(
                "error.iOSDeviceAudioUnavailable",
                defaultValue: "Device audio capture is not available on iPhone. Choose Phone mic or Headset mic."
            )
        }
    }
}
