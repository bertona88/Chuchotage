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

struct MacCaptureApp: Identifiable, Equatable, Hashable, Sendable {
    let bundleID: String
    let displayName: String

    var id: String { bundleID }
}

enum MacCaptureSource: Codable, Equatable, Hashable, Identifiable, Sendable {
    case systemAudio
    case selectedApp(bundleID: String, displayName: String)
    case microphone

    var id: String { storageValue }

    var storageValue: String {
        switch self {
        case .systemAudio:
            return "system_audio"
        case .selectedApp(let bundleID, let displayName):
            let encodedName = displayName
                .addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed)
                ?? displayName
            return "app|\(bundleID)|\(encodedName)"
        case .microphone:
            return "microphone"
        }
    }

    var title: String {
        switch self {
        case .systemAudio:
            return L10n.string("macCapture.systemAudio", defaultValue: "System audio")
        case .selectedApp(_, let displayName):
            return displayName.isEmpty
                ? L10n.string("macCapture.selectedApp", defaultValue: "Selected app")
                : displayName
        case .microphone:
            return L10n.string("macCapture.microphone", defaultValue: "Microphone")
        }
    }

    var detail: String {
        switch self {
        case .systemAudio:
            return L10n.string(
                "macCapture.systemAudio.detail",
                defaultValue: "All Mac playback audio that macOS allows Chuchotage to capture."
            )
        case .selectedApp(let bundleID, _):
            return L10n.format(
                "macCapture.selectedApp.detail",
                defaultValue: "Only audio from %@ and related audio processes.",
                bundleID
            )
        case .microphone:
            return L10n.string(
                "macCapture.microphone.detail",
                defaultValue: "Nearby speech from the Mac microphone."
            )
        }
    }

    var listeningDescription: String {
        switch self {
        case .systemAudio:
            return L10n.string("status.guidance.macListeningSystem", defaultValue: "Listening to Mac audio.")
        case .selectedApp(_, let displayName):
            return L10n.format(
                "status.guidance.macListeningApp",
                defaultValue: "Listening to %@.",
                displayName.isEmpty
                    ? L10n.string("macCapture.selectedApp", defaultValue: "Selected app")
                    : displayName
            )
        case .microphone:
            return L10n.string("status.guidance.macListeningMic", defaultValue: "Listening to the microphone.")
        }
    }

    var requiresProcessTap: Bool {
        switch self {
        case .systemAudio, .selectedApp:
            return true
        case .microphone:
            return false
        }
    }

    static var defaultSource: MacCaptureSource { .systemAudio }

    static func fromStorage(_ value: String?) -> MacCaptureSource {
        guard let value, !value.isEmpty else { return .defaultSource }
        if value == "microphone" {
            return .microphone
        }
        if value == "system_audio" {
            return .systemAudio
        }
        if value.hasPrefix("app|") {
            let pieces = value.split(separator: "|", maxSplits: 2, omittingEmptySubsequences: false)
            if pieces.count == 3 {
                let bundleID = String(pieces[1])
                let displayName = String(pieces[2])
                    .removingPercentEncoding
                    ?? String(pieces[2])
                if !bundleID.isEmpty {
                    return .selectedApp(bundleID: bundleID, displayName: displayName)
                }
            }
        }
        return .defaultSource
    }
}

enum MacOriginalAudioMode: String, CaseIterable, Codable, Identifiable, Sendable {
    case leaveAlone = "leave_alone"
    case lower = "lower"
    case mute = "mute"

    var id: String { rawValue }
    var storageValue: String { rawValue }

    var title: String {
        switch self {
        case .leaveAlone:
            return L10n.string("macOriginal.leaveAlone", defaultValue: "Leave original")
        case .lower:
            return L10n.string("macOriginal.lower", defaultValue: "Lower original")
        case .mute:
            return L10n.string("macOriginal.mute", defaultValue: "Mute original")
        }
    }

    var detail: String {
        switch self {
        case .leaveAlone:
            return L10n.string(
                "macOriginal.leaveAlone.detail",
                defaultValue: "The source app keeps playing normally."
            )
        case .lower:
            return L10n.string(
                "macOriginal.lower.detail",
                defaultValue: "Chuchotage lowers original audio and plays translation over it."
            )
        case .mute:
            return L10n.string(
                "macOriginal.mute.detail",
                defaultValue: "Chuchotage mutes original playback while translation is active."
            )
        }
    }

    var translatedGain: Double { 1.0 }

    var originalMonitorGain: Double {
        switch self {
        case .leaveAlone, .mute:
            return 0
        case .lower:
            return 0.2
        }
    }

    static func fromStorage(_ value: String?) -> MacOriginalAudioMode {
        allCases.first { $0.storageValue == value } ?? .leaveAlone
    }
}

enum MacOutputDeviceSelection: Codable, Equatable, Hashable, Identifiable, Sendable {
    case systemDefault
    case device(uid: String, name: String)

    var id: String { storageValue }

    var storageValue: String {
        switch self {
        case .systemDefault:
            return "system_default"
        case .device(let uid, let name):
            let encodedName = name.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? name
            return "device|\(uid)|\(encodedName)"
        }
    }

    var title: String {
        switch self {
        case .systemDefault:
            return L10n.string("audioOutput.systemDefault", defaultValue: "System default")
        case .device(_, let name):
            return name.isEmpty
                ? L10n.string("macOutput.selectedDevice", defaultValue: "Selected output")
                : name
        }
    }

    var uid: String? {
        switch self {
        case .systemDefault:
            return nil
        case .device(let uid, _):
            return uid
        }
    }

    static func fromStorage(_ value: String?) -> MacOutputDeviceSelection {
        guard let value, !value.isEmpty else { return .systemDefault }
        if value == "system_default" {
            return .systemDefault
        }
        if value.hasPrefix("device|") {
            let pieces = value.split(separator: "|", maxSplits: 2, omittingEmptySubsequences: false)
            if pieces.count == 3 {
                let uid = String(pieces[1])
                let name = String(pieces[2]).removingPercentEncoding ?? String(pieces[2])
                if !uid.isEmpty {
                    return .device(uid: uid, name: name)
                }
            }
        }
        return .systemDefault
    }
}

struct TranslationSettings: Codable, Equatable, Sendable {
    var targetLanguageCode: String
    var conversationLocalLanguageCode: String
    var conversationPartnerLanguageCode: String
    var audioInputSource: AudioInputSource
    var audioOutputRoute: AudioOutputRoute
    var macAudioBlendPercent: Int
    var macCaptureSource: MacCaptureSource
    var macOriginalAudioMode: MacOriginalAudioMode
    var macOutputDeviceSelection: MacOutputDeviceSelection

    init(
        targetLanguageCode: String = TranslationLanguages.defaultTargetLanguageCode,
        conversationLocalLanguageCode: String = TranslationLanguages.defaultTargetLanguageCode,
        conversationPartnerLanguageCode: String? = nil,
        audioInputSource: AudioInputSource = .defaultSource,
        audioOutputRoute: AudioOutputRoute = .systemDefault,
        macAudioBlendPercent: Int = MacAudioBlend.defaultPercent,
        macCaptureSource: MacCaptureSource = .defaultSource,
        macOriginalAudioMode: MacOriginalAudioMode = .leaveAlone,
        macOutputDeviceSelection: MacOutputDeviceSelection = .systemDefault
    ) {
        let sanitizedConversationLocalLanguageCode =
            TranslationLanguages.sanitizeOutputLanguageCode(conversationLocalLanguageCode)
        self.targetLanguageCode = TranslationLanguages.sanitizeOutputLanguageCode(targetLanguageCode)
        self.conversationLocalLanguageCode = sanitizedConversationLocalLanguageCode
        self.conversationPartnerLanguageCode = TranslationLanguages.sanitizeOutputLanguageCode(
            conversationPartnerLanguageCode
                ?? TranslationLanguages.defaultConversationPartnerLanguageCode(
                    for: sanitizedConversationLocalLanguageCode
                )
        )
        self.audioInputSource = audioInputSource
        self.audioOutputRoute = audioOutputRoute
        self.macAudioBlendPercent = MacAudioBlend.clampPercent(macAudioBlendPercent)
        self.macCaptureSource = macCaptureSource
        self.macOriginalAudioMode = macOriginalAudioMode
        self.macOutputDeviceSelection = macOutputDeviceSelection
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
            || macCaptureSource != next.macCaptureSource
            || macOriginalAudioMode != next.macOriginalAudioMode
            || macOutputDeviceSelection != next.macOutputDeviceSelection
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

    static func gains(for mode: MacOriginalAudioMode) -> (original: Double, translated: Double) {
        (original: mode.originalMonitorGain, translated: mode.translatedGain)
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
            macAudioBlendPercent: Self.readMacAudioBlendPercent(from: userDefaults),
            macCaptureSource: MacCaptureSource.fromStorage(userDefaults.string(forKey: Keys.macCaptureSource)),
            macOriginalAudioMode: Self.readMacOriginalAudioMode(from: userDefaults),
            macOutputDeviceSelection: MacOutputDeviceSelection.fromStorage(
                userDefaults.string(forKey: Keys.macOutputDeviceSelection)
            )
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
        userDefaults.set(settings.macCaptureSource.storageValue, forKey: Keys.macCaptureSource)
        userDefaults.set(settings.macOriginalAudioMode.storageValue, forKey: Keys.macOriginalAudioMode)
        userDefaults.set(
            settings.macOutputDeviceSelection.storageValue,
            forKey: Keys.macOutputDeviceSelection
        )
    }

    private static func readMacAudioBlendPercent(from userDefaults: UserDefaults) -> Int {
        guard let number = userDefaults.object(forKey: Keys.macAudioBlendPercent) as? NSNumber else {
            return MacAudioBlend.defaultPercent
        }

        return MacAudioBlend.clampPercent(number.intValue)
    }

    private static func readMacOriginalAudioMode(from userDefaults: UserDefaults) -> MacOriginalAudioMode {
        if let explicit = userDefaults.string(forKey: Keys.macOriginalAudioMode) {
            return MacOriginalAudioMode.fromStorage(explicit)
        }

        guard userDefaults.object(forKey: Keys.macAudioBlendPercent) != nil else {
            return .leaveAlone
        }

        let legacyBlend = readMacAudioBlendPercent(from: userDefaults)
        if legacyBlend <= 0 {
            return .leaveAlone
        }
        if legacyBlend >= 100 {
            return .mute
        }
        return .lower
    }

    private enum Keys {
        static let targetLanguage = "translation_settings.target_language"
        static let conversationLocalLanguage = "translation_settings.conversation_local_language"
        static let conversationPartnerLanguage = "translation_settings.conversation_partner_language"
        static let audioInputSource = "translation_settings.audio_input_source"
        static let audioOutputRoute = "translation_settings.audio_output_route"
        static let macAudioBlendPercent = "translation_settings.mac_audio_blend_percent"
        static let macCaptureSource = "translation_settings.mac_capture_source"
        static let macOriginalAudioMode = "translation_settings.mac_original_audio_mode"
        static let macOutputDeviceSelection = "translation_settings.mac_output_device_selection"
    }
}
