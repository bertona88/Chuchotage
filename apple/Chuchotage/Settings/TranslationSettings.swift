import Foundation

enum AudioInputSource: String, CaseIterable, Codable, Identifiable, Sendable {
    #if os(macOS)
    case systemAudio = "system_audio"
    #else
    case builtIn = "phone"
    case headset = "headset"
    case deviceAudio = "device_audio"
    #endif

    var id: String { rawValue }

    var storageValue: String { rawValue }

    var title: String {
        switch self {
        #if os(macOS)
        case .systemAudio:
            return L10n.string("audioInput.macAudio", defaultValue: "Mac audio")
        #else
        case .builtIn:
            return L10n.string("audioInput.phoneMic", defaultValue: "Phone mic")
        case .headset:
            return L10n.string("audioInput.headsetMic", defaultValue: "Headset mic")
        case .deviceAudio:
            return L10n.string("audioInput.deviceAudio", defaultValue: "Device audio")
        #endif
        }
    }

    static var selectableCases: [AudioInputSource] {
        #if os(macOS)
        return [.systemAudio]
        #else
        return [.builtIn, .headset]
        #endif
    }

    static var defaultSource: AudioInputSource {
        #if os(macOS)
        return .systemAudio
        #else
        return .builtIn
        #endif
    }

    static func fromStorage(_ value: String?) -> AudioInputSource {
        #if os(macOS)
        return value == systemAudio.storageValue ? .systemAudio : .defaultSource
        #else
        selectableCases.first { $0.storageValue == value } ?? .builtIn
        #endif
    }
}

enum AudioOutputRoute: String, CaseIterable, Codable, Identifiable, Sendable {
    case systemDefault = "system_default"
    case deviceSpeaker = "phone_speaker"
    case headphones = "headphones"

    var id: String { rawValue }

    var storageValue: String { rawValue }

    var title: String {
        switch self {
        case .systemDefault:
            return L10n.string("audioOutput.systemDefault", defaultValue: "System default")
        case .deviceSpeaker:
            #if os(macOS)
            return L10n.string("audioOutput.macSpeakers", defaultValue: "Mac speakers")
            #else
            return L10n.string("audioOutput.phoneSpeaker", defaultValue: "Phone speaker")
            #endif
        case .headphones:
            return L10n.string("audioOutput.headphones", defaultValue: "Headphones")
        }
    }

    static func fromStorage(_ value: String?) -> AudioOutputRoute {
        allCases.first { $0.storageValue == value } ?? .systemDefault
    }
}

struct TranslationSettings: Codable, Equatable, Sendable {
    var targetLanguageCode: String
    var conversationLocalLanguageCode: String
    var conversationPartnerLanguageCode: String
    var audioInputSource: AudioInputSource
    var audioOutputRoute: AudioOutputRoute
    var macAudioBlendPercent: Int

    init(
        targetLanguageCode: String = TranslationLanguages.defaultTargetLanguageCode,
        conversationLocalLanguageCode: String = TranslationLanguages.defaultTargetLanguageCode,
        conversationPartnerLanguageCode: String? = nil,
        audioInputSource: AudioInputSource = .defaultSource,
        audioOutputRoute: AudioOutputRoute = .systemDefault,
        macAudioBlendPercent: Int = MacAudioBlend.defaultPercent
    ) {
        let sanitizedConversationLocalLanguageCode =
            TranslationLanguages.sanitizeOutputLanguageCode(conversationLocalLanguageCode)

        self.targetLanguageCode = TranslationLanguages.sanitizeOutputLanguageCode(targetLanguageCode)
        self.conversationLocalLanguageCode = sanitizedConversationLocalLanguageCode
        self.conversationPartnerLanguageCode = TranslationLanguages.sanitizeOutputLanguageCode(
            conversationPartnerLanguageCode
                ?? TranslationLanguages.defaultConversationPartnerLanguageCode(for: sanitizedConversationLocalLanguageCode)
        )
        self.audioInputSource = audioInputSource
        self.audioOutputRoute = audioOutputRoute
        self.macAudioBlendPercent = MacAudioBlend.clampPercent(macAudioBlendPercent)
    }

    var targetLanguage: TranslationLanguage {
        TranslationLanguages.outputLanguage(for: targetLanguageCode)
    }

    var conversationLocalLanguage: TranslationLanguage {
        TranslationLanguages.outputLanguage(for: conversationLocalLanguageCode)
    }

    var conversationPartnerLanguage: TranslationLanguage {
        TranslationLanguages.outputLanguage(for: conversationPartnerLanguageCode)
    }

    var notificationTitle: String {
        L10n.format(
            "translation.notificationTitle",
            defaultValue: "Translating to %@",
            targetLanguage.name
        )
    }

    func needsAudioRouteReset(comparedTo next: TranslationSettings) -> Bool {
        audioInputSource != next.audioInputSource
            || audioOutputRoute != next.audioOutputRoute
            || macAudioBlendPercent != next.macAudioBlendPercent
    }
}

enum ConversationSpeaker: String, Equatable, Sendable {
    case local
    case partner

    func targetLanguageCode(
        localLanguageCode: String,
        partnerLanguageCode: String
    ) -> String {
        switch self {
        case .local:
            return TranslationLanguages.sanitizeOutputLanguageCode(partnerLanguageCode)
        case .partner:
            return TranslationLanguages.sanitizeOutputLanguageCode(localLanguageCode)
        }
    }
}

enum MacAudioBlend {
    static let minimumPercent = 0
    static let maximumPercent = 100
    static let defaultPercent = 100

    static func clampPercent(_ percent: Int) -> Int {
        min(maximumPercent, max(minimumPercent, percent))
    }

    static func gains(for percent: Int) -> (original: Double, translated: Double) {
        let translated = Double(clampPercent(percent)) / 100.0
        return (original: 1.0 - translated, translated: translated)
    }
}

protocol TranslationSettingsStoring: Sendable {
    func read() -> TranslationSettings
    func save(_ settings: TranslationSettings)
}

final class UserDefaultsTranslationSettingsStore: TranslationSettingsStoring, @unchecked Sendable {
    private let userDefaults: UserDefaults

    init(userDefaults: UserDefaults = .standard) {
        self.userDefaults = userDefaults
    }

    func read() -> TranslationSettings {
        let conversationLocalLanguageCode = userDefaults.string(forKey: Keys.conversationLocalLanguage)
            ?? TranslationLanguages.defaultTargetLanguageCode

        return TranslationSettings(
            targetLanguageCode: userDefaults.string(forKey: Keys.targetLanguage)
                ?? TranslationLanguages.defaultTargetLanguageCode,
            conversationLocalLanguageCode: conversationLocalLanguageCode,
            conversationPartnerLanguageCode: userDefaults.string(forKey: Keys.conversationPartnerLanguage)
                ?? TranslationLanguages.defaultConversationPartnerLanguageCode(for: conversationLocalLanguageCode),
            audioInputSource: AudioInputSource.fromStorage(userDefaults.string(forKey: Keys.audioInputSource)),
            audioOutputRoute: AudioOutputRoute.fromStorage(userDefaults.string(forKey: Keys.audioOutputRoute)),
            macAudioBlendPercent: Self.readMacAudioBlendPercent(from: userDefaults)
        )
    }

    func save(_ settings: TranslationSettings) {
        userDefaults.set(
            TranslationLanguages.sanitizeOutputLanguageCode(settings.targetLanguageCode),
            forKey: Keys.targetLanguage
        )
        userDefaults.set(
            TranslationLanguages.sanitizeOutputLanguageCode(settings.conversationLocalLanguageCode),
            forKey: Keys.conversationLocalLanguage
        )
        userDefaults.set(
            TranslationLanguages.sanitizeOutputLanguageCode(settings.conversationPartnerLanguageCode),
            forKey: Keys.conversationPartnerLanguage
        )
        userDefaults.set(settings.audioInputSource.storageValue, forKey: Keys.audioInputSource)
        userDefaults.set(settings.audioOutputRoute.storageValue, forKey: Keys.audioOutputRoute)
        userDefaults.set(
            MacAudioBlend.clampPercent(settings.macAudioBlendPercent),
            forKey: Keys.macAudioBlendPercent
        )
    }

    private static func readMacAudioBlendPercent(from userDefaults: UserDefaults) -> Int {
        guard let number = userDefaults.object(forKey: Keys.macAudioBlendPercent) as? NSNumber else {
            return MacAudioBlend.defaultPercent
        }

        return MacAudioBlend.clampPercent(number.intValue)
    }

    private enum Keys {
        static let targetLanguage = "translation_settings.target_language"
        static let conversationLocalLanguage = "translation_settings.conversation_local_language"
        static let conversationPartnerLanguage = "translation_settings.conversation_partner_language"
        static let audioInputSource = "translation_settings.audio_input_source"
        static let audioOutputRoute = "translation_settings.audio_output_route"
        static let macAudioBlendPercent = "translation_settings.mac_audio_blend_percent"
    }
}
