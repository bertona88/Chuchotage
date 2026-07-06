import Foundation

struct RealtimeTranslationSessionToken: Equatable, Sendable {
    let value: String
    let shouldSendSessionUpdate: Bool
    let credentialKind: OpenAICredentialKind
}

enum OpenAIRequestHeaders {
    static var userAgent: String {
        let version = Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "0.1.0"
        let bundleID = Bundle.main.bundleIdentifier ?? "com.andreabertoncini.chuchotage"
        return "Chuchotage/\(version) (\(platformName); \(bundleID); +https://www.chuchotage.ai)"
    }

    private static var platformName: String {
        #if os(iOS)
        return "iOS"
        #elseif os(macOS)
        return "macOS"
        #else
        return "Apple"
        #endif
    }
}

enum RealtimeTranslationEvent: Equatable, Sendable {
    case outputAudio(Data)
    case inputTranscriptDelta(String)
    case outputTranscriptDelta(String)
    case error(String)
    case sessionClosed
    case ignored
}

enum RealtimeTranslationEventParser {
    static func parse(_ message: String) -> RealtimeTranslationEvent {
        guard
            let data = message.data(using: .utf8),
            let root = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
            let type = root["type"] as? String
        else {
            return .ignored
        }

        switch type {
        case "session.output_audio.delta":
            guard
                let base64Audio = root["delta"] as? String,
                let pcm = PcmAudioCodec.decodeBase64Pcm16(base64Audio)
            else {
                return .ignored
            }
            return .outputAudio(pcm)

        case "session.input_transcript.delta":
            return .inputTranscriptDelta(root["delta"] as? String ?? "")

        case "session.output_transcript.delta":
            return .outputTranscriptDelta(root["delta"] as? String ?? "")

        case "session.closed":
            return .sessionClosed

        case "error":
            let nested = root["error"] as? [String: Any]
            let message = nested?["message"] as? String
                ?? root["message"] as? String
                ?? L10n.string(
                    "error.realtimeTranslationFailed",
                    defaultValue: "Realtime translation failed."
                )
            return .error(
                message.isEmpty
                    ? L10n.string(
                        "error.realtimeTranslationFailed",
                        defaultValue: "Realtime translation failed."
                    )
                    : message
            )

        default:
            return .ignored
        }
    }
}

enum RealtimeTranslationRequestBuilder {
    static func inputAudioAppendEvent(_ pcm16: Data) throws -> String {
        try jsonString([
            "type": "session.input_audio_buffer.append",
            "audio": PcmAudioCodec.encodeBase64Pcm16(pcm16),
        ])
    }

    static func sessionUpdateEvent(targetLanguageCode: String) throws -> String {
        try jsonString(sessionUpdateObject(targetLanguageCode: targetLanguageCode))
    }

    static func sessionCloseEvent() throws -> String {
        try jsonString(["type": "session.close"])
    }

    static func clientSecretRequestBody(targetLanguageCode: String) throws -> Data {
        try JSONSerialization.data(
            withJSONObject: [
                "expires_after": [
                    "anchor": "created_at",
                    "seconds": 600,
                ],
                "session": sessionObject(targetLanguageCode: targetLanguageCode, includeModel: true),
            ],
            options: []
        )
    }

    private static func sessionUpdateObject(targetLanguageCode: String) -> [String: Any] {
        [
            "type": "session.update",
            "session": sessionObject(targetLanguageCode: targetLanguageCode, includeModel: false),
        ]
    }

    private static func sessionObject(targetLanguageCode: String, includeModel: Bool) -> [String: Any] {
        var session: [String: Any] = [
            "audio": [
                "input": [
                    "transcription": [
                        "model": "gpt-realtime-whisper",
                    ],
                    "noise_reduction": NSNull(),
                ],
                "output": [
                    "language": TranslationLanguages.sanitizeOutputLanguageCode(targetLanguageCode),
                ],
            ],
        ]

        if includeModel {
            session["model"] = "gpt-realtime-translate"
        }

        return session
    }

    private static func jsonString(_ object: [String: Any]) throws -> String {
        let data = try JSONSerialization.data(withJSONObject: object, options: [])
        return String(data: data, encoding: .utf8) ?? "{}"
    }
}
