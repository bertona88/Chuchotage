#if os(iOS)
@preconcurrency import AVFoundation
#endif
import SwiftUI

#if os(iOS)
private func defaultHeadphonesOrEarbudsConnected() -> Bool {
    return AVAudioSession.sharedInstance().currentRoute.outputs.contains { output in
        isHeadphoneOutput(output.portType)
    }
}

private func isHeadphoneOutput(_ portType: AVAudioSession.Port) -> Bool {
    switch portType {
    case .headphones, .bluetoothA2DP, .bluetoothHFP, .bluetoothLE:
        return true
    default:
        return false
    }
}
#else
private func defaultHeadphonesOrEarbudsConnected() -> Bool {
    return true
}
#endif

@MainActor
final class TranslationViewModel: ObservableObject {
    @Published var status: TranslationStatus = .ready
    @Published var inputVolume = 0.0
    @Published var lastErrorMessage: String?
    @Published private(set) var capturedAudioChunksReceived = 0
    @Published private(set) var translatedAudioChunksReceived = 0
    @Published private(set) var latestInputTranscript = ""
    @Published private(set) var latestOutputTranscript = ""
    @Published private(set) var hasCredential = false
    @Published private(set) var credentialKind: OpenAICredentialKind?
    @Published private(set) var credentialErrorMessage: String?
    @Published private(set) var isCredentialBusy = false
    @Published private(set) var chatGPTSignInStatusMessage: String?
    @Published var isFeedbackRiskConfirmationPresented = false
    #if os(macOS)
    @Published private(set) var macCaptureSourceOptions: [MacCaptureSource] = [.systemAudio, .microphone]
    @Published private(set) var macOutputDeviceOptions: [MacOutputDeviceSelection] = [.systemDefault]
    #endif
    @Published var settings: TranslationSettings {
        didSet {
            settingsStore.save(settings)
            updateRunningAudioSettingsIfNeeded(from: oldValue, to: settings)
        }
    }

    private let settingsStore: any TranslationSettingsStoring
    private let credentialStore: any OpenAICredentialStoring
    private let codexAuthCredentialImporter: CodexAuthCredentialImporter
    private let chatGPTOAuthClient: ChatGPTOAuthClient
    private let runtime: TranslationRuntime?
    private let headphonesOrEarbudsConnectedProvider: () -> Bool
    private var runtimeEventTask: Task<Void, Never>?
    private var acceptsRuntimeActivity = false
    private var credentialRefreshGeneration = 0
    private var pendingFeedbackRiskStart: PendingTranslationStart?

    private static let detectedAudioThreshold = 0.08
    private static let maxTranscriptCharacters = 8_192

    init(
        settingsStore: any TranslationSettingsStoring = UserDefaultsTranslationSettingsStore(),
        credentialStore: any OpenAICredentialStoring = EmptyOpenAICredentialStore(),
        codexAuthCredentialImporter: CodexAuthCredentialImporter = CodexAuthCredentialImporter(),
        chatGPTOAuthClient: ChatGPTOAuthClient = ChatGPTOAuthClient(),
        runtime: TranslationRuntime? = nil,
        headphonesOrEarbudsConnectedProvider: @escaping () -> Bool = defaultHeadphonesOrEarbudsConnected
    ) {
        self.settingsStore = settingsStore
        self.credentialStore = credentialStore
        self.codexAuthCredentialImporter = codexAuthCredentialImporter
        self.chatGPTOAuthClient = chatGPTOAuthClient
        self.runtime = runtime
        self.headphonesOrEarbudsConnectedProvider = headphonesOrEarbudsConnectedProvider
        self.settings = settingsStore.read()
        observeRuntimeEvents()
        refreshCredentialStatus()
        #if os(macOS)
        refreshMacAudioRoutingOptions()
        #endif
    }

    var isTranslating: Bool {
        status == .connecting || status == .listening
    }

    var statusTitle: String {
        switch status {
        case .ready:
            return L10n.string("status.readyToStart", defaultValue: "Ready to start")
        case .connecting, .listening, .error:
            return status.title
        }
    }

    var sessionGuidanceMessage: String {
        switch status {
        case .ready:
            return L10n.string(
                "status.guidance.ready",
                defaultValue: "Tap Start, then wait for Listening."
            )
        case .connecting:
            return L10n.string(
                "status.guidance.connecting",
                defaultValue: "Connecting. Wait before speaking."
            )
        case .listening:
            if hasReceivedTranslation {
                return L10n.string(
                    "status.guidance.live",
                    defaultValue: "Translation is live."
                )
            }
            if hasCapturedAudio {
                #if os(macOS)
                return settings.macCaptureSource.listeningDescription
                #else
                return L10n.string(
                    "status.guidance.audioHeard",
                    defaultValue: "Audio heard. Waiting for translation."
                )
                #endif
            }
            #if os(macOS)
            return settings.macCaptureSource.listeningDescription
            #else
            return L10n.string(
                "status.guidance.listening",
                defaultValue: "Listening now. Start speaking."
            )
            #endif
        case .error:
            return L10n.string(
                "status.guidance.error",
                defaultValue: "Check the message below."
            )
        }
    }

    var hasCapturedAudio: Bool {
        capturedAudioChunksReceived > 0
    }

    var hasReceivedTranslation: Bool {
        translatedAudioChunksReceived > 0 || !latestOutputTranscript.isEmpty
    }

    var shouldShowTranscriptPanes: Bool {
        isTranslating || !latestInputTranscript.isEmpty || !latestOutputTranscript.isEmpty
    }

    var feedbackRiskWarningMessage: String? {
        guard hasFeedbackRisk else { return nil }
        return L10n.string(
            "warning.feedbackRisk.phoneMicSpeaker.repeatLoop",
            defaultValue: "Use headphones. The phone speaker can feed translated speech back into the mic and make Chuchotage repeat itself."
        )
    }

    private var hasFeedbackRisk: Bool {
        #if os(iOS)
        let usesMicrophoneInput = settings.audioInputSource == .builtIn || settings.audioInputSource == .headset
        guard usesMicrophoneInput else { return false }
        return settings.audioOutputRoute == .deviceSpeaker ||
            (settings.audioOutputRoute == .systemDefault && !headphonesOrEarbudsConnectedProvider())
        #else
        return false
        #endif
    }

    var targetLanguage: TranslationLanguage {
        settings.targetLanguage
    }

    var conversationLocalLanguage: TranslationLanguage {
        settings.conversationLocalLanguage
    }

    var conversationPartnerLanguage: TranslationLanguage {
        settings.conversationPartnerLanguage
    }

    var targetLanguageCode: String {
        get { settings.targetLanguageCode }
        set { settings.targetLanguageCode = TranslationLanguages.sanitizeOutputLanguageCode(newValue) }
    }

    var conversationLocalLanguageCode: String {
        get { settings.conversationLocalLanguageCode }
        set { settings.conversationLocalLanguageCode = TranslationLanguages.sanitizeOutputLanguageCode(newValue) }
    }

    var conversationPartnerLanguageCode: String {
        get { settings.conversationPartnerLanguageCode }
        set { settings.conversationPartnerLanguageCode = TranslationLanguages.sanitizeOutputLanguageCode(newValue) }
    }

    var microphoneSource: AudioInputSource {
        get { settings.audioInputSource }
        set { settings.audioInputSource = newValue }
    }

    var audioOutputRoute: AudioOutputRoute {
        get { settings.audioOutputRoute }
        set { settings.audioOutputRoute = newValue }
    }

    var macAudioBlendPercent: Int {
        get { settings.macAudioBlendPercent }
        set { settings.macAudioBlendPercent = MacAudioBlend.clampPercent(newValue) }
    }

    var macCaptureSource: MacCaptureSource {
        get { settings.macCaptureSource }
        set { settings.macCaptureSource = newValue }
    }

    var macOriginalAudioMode: MacOriginalAudioMode {
        get { settings.macOriginalAudioMode }
        set { settings.macOriginalAudioMode = newValue }
    }

    var macOutputDeviceSelection: MacOutputDeviceSelection {
        get { settings.macOutputDeviceSelection }
        set { settings.macOutputDeviceSelection = newValue }
    }

    var canImportCodexCredential: Bool {
        CodexAuthCredentialImporter.isAvailableOnCurrentPlatform
    }

    var credentialModeTitle: String {
        guard let credentialKind else {
            return hasCredential
                ? L10n.string("credential.mode.saved", defaultValue: "Saved credential")
                : L10n.string("credential.mode.none", defaultValue: "No credential")
        }

        switch credentialKind {
        case .apiKey:
            return L10n.string("credential.mode.apiKey", defaultValue: "OpenAI API key")
        case .chatGPTAccessToken:
            return L10n.string("credential.mode.chatGPT", defaultValue: "ChatGPT sign-in")
        case .sponsoredTrial:
            return L10n.string("credential.mode.sponsoredTrial", defaultValue: "Sponsored free trial")
        }
    }

    func toggleTranslation() {
        if isTranslating {
            Task {
                await stopTranslation()
            }
        } else {
            requestTranslationStart()
        }
    }

    func stopTranslationFromSettings() {
        stopTranslationSession()
    }

    func stopTranslationSession() {
        Task {
            await stopTranslation()
        }
    }

    func startConversationTurn(targetLanguageCode: String) {
        requestTranslationStart(targetLanguageCode: targetLanguageCode, restartIfNeeded: true)
    }

    func startPendingTranslationDespiteFeedbackRisk() {
        let pendingStart = pendingFeedbackRiskStart ?? PendingTranslationStart()
        pendingFeedbackRiskStart = nil
        isFeedbackRiskConfirmationPresented = false
        Task {
            await startTranslation(
                targetLanguageCode: pendingStart.targetLanguageCode,
                restartIfNeeded: pendingStart.restartIfNeeded
            )
        }
    }

    func useHeadphonesForPendingFeedbackRisk() {
        let pendingStart = pendingFeedbackRiskStart ?? PendingTranslationStart()
        pendingFeedbackRiskStart = nil
        isFeedbackRiskConfirmationPresented = false
        #if os(iOS)
        settings.audioOutputRoute = .headphones
        #endif
        requestTranslationStart(
            targetLanguageCode: pendingStart.targetLanguageCode,
            restartIfNeeded: pendingStart.restartIfNeeded
        )
    }

    func cancelPendingFeedbackRiskStart() {
        pendingFeedbackRiskStart = nil
        isFeedbackRiskConfirmationPresented = false
    }

    #if os(macOS)
    func refreshMacAudioRoutingOptions() {
        var sources: [MacCaptureSource] = [.systemAudio]
        let appSources = MacAudioProcessCatalog.activeOutputApps().map {
            MacCaptureSource.selectedApp(bundleID: $0.bundleID, displayName: $0.displayName)
        }
        sources.append(contentsOf: appSources)
        sources.append(.microphone)
        if !sources.contains(settings.macCaptureSource) {
            sources.insert(settings.macCaptureSource, at: min(1, sources.count))
        }
        macCaptureSourceOptions = sources

        var outputSelections: [MacOutputDeviceSelection] = [.systemDefault]
        outputSelections.append(contentsOf: MacAudioOutputDeviceManager.outputDevices().map(\.selection))
        if !outputSelections.contains(settings.macOutputDeviceSelection) {
            outputSelections.append(settings.macOutputDeviceSelection)
        }
        macOutputDeviceOptions = outputSelections
    }
    #endif

    func saveApiKeyCredential(_ value: String) {
        let normalized = OpenAICredentialValidator.normalize(value)
        guard OpenAICredentialValidator.isPlausibleApiKey(normalized) else {
            credentialErrorMessage = L10n.string(
                "error.enterValidAPIKey",
                defaultValue: "Enter a valid OpenAI API key."
            )
            return
        }

        invalidateCredentialRefreshes()
        isCredentialBusy = true
        credentialErrorMessage = nil
        chatGPTSignInStatusMessage = nil

        Task {
            do {
                try await credentialStore.saveCredential(
                    OpenAICredential(kind: .apiKey, value: normalized)
                )
                hasCredential = true
                credentialKind = .apiKey
                chatGPTSignInStatusMessage = nil
            } catch {
                credentialErrorMessage = error.localizedDescription
            }
            isCredentialBusy = false
        }
    }

    func useSponsoredTrialCredential() {
        invalidateCredentialRefreshes()
        isCredentialBusy = true
        credentialErrorMessage = nil
        chatGPTSignInStatusMessage = nil

        Task {
            do {
                let sponsoredInstallID = try await sponsoredTrialInstallIDForSaving()
                try await credentialStore.saveCredential(
                    OpenAICredential(kind: .sponsoredTrial, value: sponsoredInstallID)
                )
                hasCredential = true
                credentialKind = .sponsoredTrial
                chatGPTSignInStatusMessage = nil
            } catch {
                credentialErrorMessage = error.localizedDescription
            }
            isCredentialBusy = false
        }
    }

    func clearCredential() {
        invalidateCredentialRefreshes()
        isCredentialBusy = true
        credentialErrorMessage = nil
        chatGPTSignInStatusMessage = nil

        Task {
            do {
                try await credentialStore.clearCredential()
                hasCredential = false
                credentialKind = nil
            } catch {
                credentialErrorMessage = error.localizedDescription
            }
            isCredentialBusy = false
        }
    }

    func importCodexCredential() {
        guard canImportCodexCredential else {
            credentialErrorMessage = L10n.string(
                "error.codexImportMacOnly",
                defaultValue: "Codex login import is only available on macOS."
            )
            return
        }

        invalidateCredentialRefreshes()
        isCredentialBusy = true
        credentialErrorMessage = nil
        chatGPTSignInStatusMessage = nil

        Task {
            do {
                let credential = try await codexAuthCredentialImporter.loadCredential()
                try await credentialStore.saveCredential(credential)
                hasCredential = true
                credentialKind = credential.kind
                chatGPTSignInStatusMessage = nil
            } catch {
                credentialErrorMessage = error.localizedDescription
            }
            isCredentialBusy = false
        }
    }

    func signInWithChatGPT() {
        invalidateCredentialRefreshes()
        isCredentialBusy = true
        credentialErrorMessage = nil
        chatGPTSignInStatusMessage = nil

        Task {
            do {
                let credential = try await chatGPTOAuthClient.login { [weak self] status in
                    self?.chatGPTSignInStatusMessage = status.message
                }
                try await credentialStore.saveCredential(credential)
                hasCredential = true
                credentialKind = credential.kind
                chatGPTSignInStatusMessage = nil
            } catch {
                chatGPTSignInStatusMessage = nil
                credentialErrorMessage = error.localizedDescription
            }
            isCredentialBusy = false
        }
    }

    func refreshCredentialStatus() {
        let generation = credentialRefreshGeneration
        Task {
            do {
                let status = try await credentialStore.loadCredentialStatus()
                guard generation == credentialRefreshGeneration else { return }
                hasCredential = status.hasCredential
                credentialKind = status.kind
                credentialErrorMessage = nil
                if !isCredentialBusy {
                    chatGPTSignInStatusMessage = nil
                }
            } catch {
                guard generation == credentialRefreshGeneration else { return }
                hasCredential = false
                credentialKind = nil
                credentialErrorMessage = error.localizedDescription
            }
        }
    }

    private func invalidateCredentialRefreshes() {
        credentialRefreshGeneration += 1
    }

    private func sponsoredTrialInstallIDForSaving() async throws -> String {
        if let existing = try await credentialStore.loadCredential(),
           existing.kind == .sponsoredTrial,
           OpenAICredentialValidator.isPlausibleSponsoredTrialInstallID(existing.value) {
            return existing.value
        }

        return UUID().uuidString.lowercased()
    }

    private func requestTranslationStart(
        targetLanguageCode: String? = nil,
        restartIfNeeded: Bool = false
    ) {
        if shouldConfirmFeedbackRiskBeforeStart {
            pendingFeedbackRiskStart = PendingTranslationStart(
                targetLanguageCode: targetLanguageCode,
                restartIfNeeded: restartIfNeeded
            )
            isFeedbackRiskConfirmationPresented = true
            return
        }

        Task {
            await startTranslation(targetLanguageCode: targetLanguageCode, restartIfNeeded: restartIfNeeded)
        }
    }

    private var shouldConfirmFeedbackRiskBeforeStart: Bool {
        hasFeedbackRisk && !isTranslating
    }

    private func startTranslation(
        targetLanguageCode: String? = nil,
        restartIfNeeded: Bool = false
    ) async {
        if isTranslating {
            guard restartIfNeeded else { return }
            await stopTranslation()
        }

        lastErrorMessage = nil
        inputVolume = 0
        resetSessionActivity()
        acceptsRuntimeActivity = true
        var sessionSettings = settings
        if let targetLanguageCode {
            sessionSettings.targetLanguageCode = TranslationLanguages.sanitizeOutputLanguageCode(targetLanguageCode)
        }

        guard let runtime else {
            acceptsRuntimeActivity = false
            handleError(
                L10n.string(
                    "error.runtimeUnavailable",
                    defaultValue: "Translation runtime is unavailable in this build."
                )
            )
            return
        }

        do {
            try await runtime.start(settings: sessionSettings)
        } catch {
            acceptsRuntimeActivity = false
            handleError(error.localizedDescription)
        }
    }

    private func stopTranslation() async {
        acceptsRuntimeActivity = false
        inputVolume = 0
        resetSessionActivity()

        if let runtime {
            await runtime.stop()
        } else {
            status = .ready
        }
    }

    private func updateRunningAudioSettingsIfNeeded(
        from oldSettings: TranslationSettings,
        to newSettings: TranslationSettings
    ) {
        guard isTranslating,
              oldSettings.needsAudioRouteReset(comparedTo: newSettings),
              let runtime else {
            return
        }

        Task {
            await runtime.updateSettings(newSettings)
        }
    }

    private func observeRuntimeEvents() {
        guard let runtime else { return }

        runtimeEventTask = Task { [weak self] in
            for await event in runtime.events {
                self?.handle(event)
            }
        }
    }

    private func handle(_ event: TranslationRuntimeEvent) {
        switch event {
        case .statusChanged(let nextStatus):
            status = nextStatus
            switch nextStatus {
            case .connecting, .listening:
                acceptsRuntimeActivity = true
            case .ready:
                acceptsRuntimeActivity = false
            case .error:
                break
            }
            if nextStatus != .listening {
                inputVolume = 0
            }
            if nextStatus == .ready {
                resetSessionActivity()
            }

        case .inputVolumeChanged(let level):
            guard acceptsRuntimeActivity else { return }
            inputVolume = max(0, level)
            if inputVolume >= Self.detectedAudioThreshold {
                capturedAudioChunksReceived += 1
            }

        case .outputAudioReceived:
            guard acceptsRuntimeActivity else { return }
            translatedAudioChunksReceived += 1

        case .inputTranscriptDelta(let delta):
            guard acceptsRuntimeActivity else { return }
            latestInputTranscript = trimmedTranscript(latestInputTranscript + delta)

        case .outputTranscriptDelta(let delta):
            guard acceptsRuntimeActivity else { return }
            latestOutputTranscript = trimmedTranscript(latestOutputTranscript + delta)

        case .fatalError(let message):
            guard acceptsRuntimeActivity else { return }
            handleError(message)
        }
    }

    private func handleError(_ message: String) {
        acceptsRuntimeActivity = false
        status = .error
        inputVolume = 0
        lastErrorMessage = message.isEmpty
            ? L10n.string(
                "error.translationStoppedUnexpectedly",
                defaultValue: "Translation stopped unexpectedly."
            )
            : message
    }

    private func resetSessionActivity() {
        capturedAudioChunksReceived = 0
        translatedAudioChunksReceived = 0
        latestInputTranscript = ""
        latestOutputTranscript = ""
    }

    private func trimmedTranscript(_ text: String) -> String {
        guard text.count > Self.maxTranscriptCharacters else { return text }
        return String(text.suffix(Self.maxTranscriptCharacters))
    }

    private struct PendingTranslationStart {
        var targetLanguageCode: String?
        var restartIfNeeded = false
    }
}
