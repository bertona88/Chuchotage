import Foundation

enum TranslationStatus: String, Sendable {
    case ready = "Ready"
    case connecting = "Connecting"
    case listening = "Listening"
    case error = "Error"

    var title: String {
        switch self {
        case .ready:
            return L10n.string("status.ready", defaultValue: "Ready")
        case .connecting:
            return L10n.string("status.connecting", defaultValue: "Connecting")
        case .listening:
            return L10n.string("status.listening", defaultValue: "Listening")
        case .error:
            return L10n.string("status.error", defaultValue: "Error")
        }
    }
}

enum TranslationRuntimeEvent: Equatable, Sendable {
    case statusChanged(TranslationStatus)
    case inputVolumeChanged(Double)
    case outputAudioReceived(Int)
    case inputTranscriptDelta(String)
    case outputTranscriptDelta(String)
    case fatalError(String)
}

enum TranslationRuntimeError: LocalizedError, Sendable {
    case missingCredential
    case stopped

    var errorDescription: String? {
        switch self {
        case .missingCredential:
            return L10n.string(
                "error.missingCredential",
                defaultValue: "Sign in with ChatGPT, continue with sponsored trial, or enter an API key before starting translation."
            )
        case .stopped:
            return L10n.string("error.translationStopped", defaultValue: "Translation stopped.")
        }
    }
}
