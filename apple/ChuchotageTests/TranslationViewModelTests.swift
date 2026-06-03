import XCTest
@testable import Chuchotage

@MainActor
final class TranslationViewModelTests: XCTestCase {
    func testInitialCredentialRefreshUsesStatusWithoutLoadingSecret() async throws {
        let credentialStore = StatusOnlyCredentialStore(
            status: .available(kind: .apiKey)
        )
        let viewModel = TranslationViewModel(
            settingsStore: InMemorySettingsStore(),
            credentialStore: credentialStore
        )

        try await waitForCredentialKind(.apiKey, on: viewModel)

        XCTAssertTrue(viewModel.hasCredential)
        XCTAssertEqual(viewModel.credentialKind, .apiKey)
        XCTAssertEqual(credentialStore.statusLoadCount, 1)
        XCTAssertEqual(credentialStore.secretLoadCount, 0)
    }

    func testUseSponsoredTrialCredentialSavesGeneratedInstallID() async throws {
        let credentialStore = InMemoryCredentialStore(initialCredential: nil)
        let viewModel = TranslationViewModel(
            settingsStore: InMemorySettingsStore(),
            credentialStore: credentialStore
        )

        viewModel.useSponsoredTrialCredential()
        try await waitForCredentialWrite(on: viewModel)

        let storedCredential = try await credentialStore.loadCredential()
        XCTAssertEqual(viewModel.credentialKind, .sponsoredTrial)
        XCTAssertTrue(viewModel.hasCredential)
        XCTAssertEqual(storedCredential?.kind, .sponsoredTrial)
        XCTAssertTrue(OpenAICredentialValidator.isPlausibleSponsoredTrialInstallID(storedCredential?.value ?? ""))
    }

    func testUseSponsoredTrialCredentialReusesExistingInstallID() async throws {
        let existingInstallID = "123e4567-e89b-12d3-a456-426614174000"
        let credentialStore = InMemoryCredentialStore(
            initialCredential: OpenAICredential(kind: .sponsoredTrial, value: existingInstallID)
        )
        let viewModel = TranslationViewModel(
            settingsStore: InMemorySettingsStore(),
            credentialStore: credentialStore
        )

        viewModel.useSponsoredTrialCredential()
        try await waitForCredentialWrite(on: viewModel)

        let storedCredential = try await credentialStore.loadCredential()
        XCTAssertEqual(storedCredential?.kind, .sponsoredTrial)
        XCTAssertEqual(storedCredential?.value, existingInstallID)
        XCTAssertEqual(viewModel.credentialModeTitle, "Sponsored free trial")
    }

    func testLiveAudioRouteChangesAreForwardedToRuntime() async throws {
        let credentialStore = InMemoryCredentialStore(
            initialCredential: OpenAICredential(kind: .apiKey, value: "sk-test-12345678901234567890")
        )
        let audioIO = ViewModelFakeTranslationAudioIO()
        let realtimeClient = ViewModelFakeRealtimeTranslationClient()
        let runtime = TranslationRuntime(
            credentialStore: credentialStore,
            audioIO: audioIO,
            realtimeClient: realtimeClient
        )
        let viewModel = TranslationViewModel(
            settingsStore: InMemorySettingsStore(),
            credentialStore: credentialStore,
            runtime: runtime,
            headphonesOrEarbudsConnectedProvider: { true }
        )

        viewModel.toggleTranslation()
        try await waitForStatus(.listening, on: viewModel)
        viewModel.audioOutputRoute = .deviceSpeaker

        try await waitForAudioSettingsUpdate(on: audioIO) { settings in
            settings.audioOutputRoute == .deviceSpeaker
        }

        await runtime.stop()
    }

    func testConversationTurnStartsRuntimeWithSelectedTargetLanguageWithoutChangingDefaultTarget() async throws {
        let credentialStore = InMemoryCredentialStore(
            initialCredential: OpenAICredential(kind: .apiKey, value: "sk-test-12345678901234567890")
        )
        let realtimeClient = ViewModelFakeRealtimeTranslationClient()
        let runtime = TranslationRuntime(
            credentialStore: credentialStore,
            audioIO: ViewModelFakeTranslationAudioIO(),
            realtimeClient: realtimeClient
        )
        let viewModel = TranslationViewModel(
            settingsStore: InMemorySettingsStore(
                settings: TranslationSettings(
                    targetLanguageCode: "en",
                    conversationLocalLanguageCode: "en",
                    conversationPartnerLanguageCode: "it"
                )
            ),
            credentialStore: credentialStore,
            runtime: runtime,
            headphonesOrEarbudsConnectedProvider: { true }
        )

        viewModel.startConversationTurn(targetLanguageCode: "it")
        try await waitForStatus(.listening, on: viewModel)

        let lastTargetLanguageCode = await realtimeClient.connectedTargetLanguageCode()
        XCTAssertEqual(lastTargetLanguageCode, "it")
        XCTAssertEqual(viewModel.targetLanguageCode, "en")
        await runtime.stop()
    }

    func testRuntimeErrorUpdatesErrorMessage() async throws {
        let credentialStore = InMemoryCredentialStore(
            initialCredential: OpenAICredential(kind: .apiKey, value: "sk-test-12345678901234567890")
        )
        let realtimeClient = ViewModelFakeRealtimeTranslationClient()
        let runtime = TranslationRuntime(
            credentialStore: credentialStore,
            audioIO: ViewModelFakeTranslationAudioIO(),
            realtimeClient: realtimeClient
        )
        let viewModel = TranslationViewModel(
            settingsStore: InMemorySettingsStore(),
            credentialStore: credentialStore,
            runtime: runtime,
            headphonesOrEarbudsConnectedProvider: { true }
        )

        viewModel.toggleTranslation()
        try await waitForStatus(.listening, on: viewModel)
        await realtimeClient.emit(.error("socket boom"))
        try await waitForErrorMessage("socket boom", on: viewModel)

        XCTAssertEqual(viewModel.status, .error)
        XCTAssertEqual(viewModel.lastErrorMessage, "socket boom")
        await runtime.stop()
    }

    func testSessionGuidanceSeparatesConnectingFromListening() {
        let viewModel = TranslationViewModel(
            settingsStore: InMemorySettingsStore(),
            credentialStore: InMemoryCredentialStore(initialCredential: nil)
        )

        XCTAssertEqual(viewModel.statusTitle, "Ready to start")
        XCTAssertEqual(viewModel.sessionGuidanceMessage, "Tap Start, then wait for Listening.")

        viewModel.status = .connecting
        XCTAssertEqual(viewModel.statusTitle, "Connecting")
        XCTAssertEqual(viewModel.sessionGuidanceMessage, "Connecting. Wait before speaking.")

        viewModel.status = .listening
        XCTAssertEqual(viewModel.statusTitle, "Listening")
        #if os(macOS)
        XCTAssertEqual(viewModel.sessionGuidanceMessage, "Listening to Mac audio.")
        #else
        XCTAssertEqual(viewModel.sessionGuidanceMessage, "Listening now. Start speaking.")
        #endif
    }

    #if os(iOS)
    func testFeedbackRiskWarningShownForPhoneMicPlusSpeaker() {
        let viewModel = TranslationViewModel(
            settingsStore: InMemorySettingsStore(
                settings: TranslationSettings(
                    targetLanguageCode: "en",
                    audioInputSource: .builtIn,
                    audioOutputRoute: .deviceSpeaker
                )
            ),
            credentialStore: InMemoryCredentialStore(initialCredential: nil)
        )

        XCTAssertEqual(
            viewModel.feedbackRiskWarningMessage,
            "Use headphones. The phone speaker can feed translated speech back into the mic and make Chuchotage repeat itself."
        )
    }

    func testFeedbackRiskWarningShownForSystemDefaultWithoutHeadphones() {
        let viewModel = TranslationViewModel(
            settingsStore: InMemorySettingsStore(
                settings: TranslationSettings(
                    targetLanguageCode: "en",
                    audioInputSource: .builtIn,
                    audioOutputRoute: .systemDefault
                )
            ),
            credentialStore: InMemoryCredentialStore(initialCredential: nil),
            headphonesOrEarbudsConnectedProvider: { false }
        )

        XCTAssertEqual(
            viewModel.feedbackRiskWarningMessage,
            "Use headphones. The phone speaker can feed translated speech back into the mic and make Chuchotage repeat itself."
        )
    }

    func testFeedbackRiskWarningHiddenForSystemDefaultWithHeadphones() {
        let viewModel = TranslationViewModel(
            settingsStore: InMemorySettingsStore(
                settings: TranslationSettings(
                    targetLanguageCode: "en",
                    audioInputSource: .builtIn,
                    audioOutputRoute: .systemDefault
                )
            ),
            credentialStore: InMemoryCredentialStore(initialCredential: nil),
            headphonesOrEarbudsConnectedProvider: { true }
        )

        XCTAssertNil(viewModel.feedbackRiskWarningMessage)
    }

    func testFeedbackRiskConfirmationBlocksImmediateStart() async throws {
        let credentialStore = InMemoryCredentialStore(
            initialCredential: OpenAICredential(kind: .apiKey, value: "sk-test-12345678901234567890")
        )
        let realtimeClient = ViewModelFakeRealtimeTranslationClient()
        let runtime = TranslationRuntime(
            credentialStore: credentialStore,
            audioIO: ViewModelFakeTranslationAudioIO(),
            realtimeClient: realtimeClient
        )
        let viewModel = TranslationViewModel(
            settingsStore: InMemorySettingsStore(settings: riskyPhoneSpeakerSettings()),
            credentialStore: credentialStore,
            runtime: runtime
        )

        viewModel.toggleTranslation()

        XCTAssertTrue(viewModel.isFeedbackRiskConfirmationPresented)
        XCTAssertEqual(viewModel.status, .ready)
        XCTAssertNil(await realtimeClient.connectedTargetLanguageCode())
    }

    func testFeedbackRiskStartAnywayStartsRuntime() async throws {
        let credentialStore = InMemoryCredentialStore(
            initialCredential: OpenAICredential(kind: .apiKey, value: "sk-test-12345678901234567890")
        )
        let realtimeClient = ViewModelFakeRealtimeTranslationClient()
        let runtime = TranslationRuntime(
            credentialStore: credentialStore,
            audioIO: ViewModelFakeTranslationAudioIO(),
            realtimeClient: realtimeClient
        )
        let viewModel = TranslationViewModel(
            settingsStore: InMemorySettingsStore(settings: riskyPhoneSpeakerSettings()),
            credentialStore: credentialStore,
            runtime: runtime
        )

        viewModel.toggleTranslation()
        viewModel.startPendingTranslationDespiteFeedbackRisk()
        try await waitForStatus(.listening, on: viewModel)

        XCTAssertFalse(viewModel.isFeedbackRiskConfirmationPresented)
        XCTAssertEqual(await realtimeClient.connectedTargetLanguageCode(), "en")
        await runtime.stop()
    }

    func testFeedbackRiskUseHeadphonesSwitchesRouteAndStartsRuntime() async throws {
        let credentialStore = InMemoryCredentialStore(
            initialCredential: OpenAICredential(kind: .apiKey, value: "sk-test-12345678901234567890")
        )
        let realtimeClient = ViewModelFakeRealtimeTranslationClient()
        let runtime = TranslationRuntime(
            credentialStore: credentialStore,
            audioIO: ViewModelFakeTranslationAudioIO(),
            realtimeClient: realtimeClient
        )
        let viewModel = TranslationViewModel(
            settingsStore: InMemorySettingsStore(settings: riskyPhoneSpeakerSettings()),
            credentialStore: credentialStore,
            runtime: runtime
        )

        viewModel.toggleTranslation()
        viewModel.useHeadphonesForPendingFeedbackRisk()
        try await waitForStatus(.listening, on: viewModel)

        XCTAssertFalse(viewModel.isFeedbackRiskConfirmationPresented)
        XCTAssertEqual(viewModel.audioOutputRoute, .headphones)
        XCTAssertEqual(await realtimeClient.connectedTargetLanguageCode(), "en")
        await runtime.stop()
    }

    func testFeedbackRiskWarningHiddenForHeadsetRouting() {
        let viewModel = TranslationViewModel(
            settingsStore: InMemorySettingsStore(
                settings: TranslationSettings(
                    targetLanguageCode: "en",
                    audioInputSource: .headset,
                    audioOutputRoute: .headphones
                )
            ),
            credentialStore: InMemoryCredentialStore(initialCredential: nil)
        )

        XCTAssertNil(viewModel.feedbackRiskWarningMessage)
    }

    private func riskyPhoneSpeakerSettings() -> TranslationSettings {
        TranslationSettings(
            targetLanguageCode: "en",
            audioInputSource: .builtIn,
            audioOutputRoute: .deviceSpeaker
        )
    }
    #endif

    private func waitForCredentialWrite(on viewModel: TranslationViewModel) async throws {
        let timeout = Date().addingTimeInterval(1.5)
        while viewModel.isCredentialBusy {
            if Date() > timeout {
                XCTFail("Timed out waiting for credential operation.")
                return
            }
            try await Task.sleep(nanoseconds: 25_000_000)
        }
    }

    private func waitForCredentialKind(
        _ expectedKind: OpenAICredentialKind,
        on viewModel: TranslationViewModel
    ) async throws {
        let timeout = Date().addingTimeInterval(1.5)
        while viewModel.credentialKind != expectedKind {
            if Date() > timeout {
                XCTFail("Timed out waiting for credential kind \(expectedKind).")
                return
            }
            try await Task.sleep(nanoseconds: 25_000_000)
        }
    }

    private func waitForStatus(
        _ expectedStatus: TranslationStatus,
        on viewModel: TranslationViewModel
    ) async throws {
        let timeout = Date().addingTimeInterval(1.5)
        while viewModel.status != expectedStatus {
            if Date() > timeout {
                XCTFail("Timed out waiting for status \(expectedStatus).")
                return
            }
            try await Task.sleep(nanoseconds: 25_000_000)
        }
    }

    private func waitForAudioSettingsUpdate(
        on audioIO: ViewModelFakeTranslationAudioIO,
        matching predicate: (TranslationSettings) -> Bool
    ) async throws {
        let timeout = Date().addingTimeInterval(1.5)
        while !audioIO.hasUpdatedSettings(matching: predicate) {
            if Date() > timeout {
                XCTFail("Timed out waiting for live audio settings update.")
                return
            }
            try await Task.sleep(nanoseconds: 25_000_000)
        }
    }

    private func waitForErrorMessage(
        _ expectedMessage: String,
        on viewModel: TranslationViewModel
    ) async throws {
        let timeout = Date().addingTimeInterval(1.5)
        while viewModel.lastErrorMessage != expectedMessage {
            if Date() > timeout {
                XCTFail("Timed out waiting for error message \(expectedMessage).")
                return
            }
            try await Task.sleep(nanoseconds: 25_000_000)
        }
    }
}

private final class StatusOnlyCredentialStore: OpenAICredentialStoring, @unchecked Sendable {
    private let lock = NSLock()
    private let status: OpenAICredentialStatus
    private var statusLoads = 0
    private var secretLoads = 0

    init(status: OpenAICredentialStatus) {
        self.status = status
    }

    var statusLoadCount: Int {
        lock.withLock { statusLoads }
    }

    var secretLoadCount: Int {
        lock.withLock { secretLoads }
    }

    func loadCredentialStatus() async throws -> OpenAICredentialStatus {
        lock.withLock {
            statusLoads += 1
        }
        return status
    }

    func loadCredential() async throws -> OpenAICredential? {
        lock.withLock {
            secretLoads += 1
        }
        return nil
    }

    func saveCredential(_ credential: OpenAICredential) async throws {}

    func clearCredential() async throws {}
}

private final class InMemoryCredentialStore: OpenAICredentialStoring, @unchecked Sendable {
    private let lock = NSLock()
    private var credential: OpenAICredential?

    init(initialCredential: OpenAICredential?) {
        credential = initialCredential
    }

    func loadCredential() async throws -> OpenAICredential? {
        lock.withLock { credential }
    }

    func saveCredential(_ credential: OpenAICredential) async throws {
        lock.withLock {
            self.credential = credential
        }
    }

    func clearCredential() async throws {
        lock.withLock {
            credential = nil
        }
    }
}

private struct InMemorySettingsStore: TranslationSettingsStoring {
    let settings: TranslationSettings

    init(settings: TranslationSettings = TranslationSettings()) {
        self.settings = settings
    }

    func read() -> TranslationSettings {
        settings
    }

    func save(_ settings: TranslationSettings) {}
}

private final class ViewModelFakeTranslationAudioIO: TranslationAudioIO, @unchecked Sendable {
    private let lock = NSLock()
    private var continuation: AsyncStream<PcmAudioChunk>.Continuation?
    private var updatedSettings: [TranslationSettings] = []

    func start(settings: TranslationSettings) async throws -> AsyncStream<PcmAudioChunk> {
        let streamPair = AsyncStream.makeStream(of: PcmAudioChunk.self)
        lock.withLock {
            continuation = streamPair.continuation
        }
        return streamPair.stream
    }

    func updateSettings(_ settings: TranslationSettings) async {
        lock.withLock {
            updatedSettings.append(settings)
        }
    }

    func playTranslatedAudio(_ pcm16: Data) async {}

    func stop() async {
        let capturedContinuation = lock.withLock { () -> AsyncStream<PcmAudioChunk>.Continuation? in
            let capturedContinuation = continuation
            continuation = nil
            return capturedContinuation
        }
        capturedContinuation?.finish()
    }

    func hasUpdatedSettings(matching predicate: (TranslationSettings) -> Bool) -> Bool {
        lock.withLock {
            updatedSettings.contains(where: predicate)
        }
    }
}

private actor ViewModelFakeRealtimeTranslationClient: RealtimeTranslationClienting {
    private var continuation: AsyncStream<RealtimeTranslationEvent>.Continuation?
    private(set) var lastTargetLanguageCode: String?

    func connect(
        bearerToken: RealtimeTranslationSessionToken,
        targetLanguageCode: String
    ) async throws -> AsyncStream<RealtimeTranslationEvent> {
        let streamPair = AsyncStream.makeStream(of: RealtimeTranslationEvent.self)
        continuation = streamPair.continuation
        lastTargetLanguageCode = targetLanguageCode
        return streamPair.stream
    }

    func sendInputAudio(_ pcm16: Data) async throws {}

    func disconnect() async {
        continuation?.finish()
        continuation = nil
    }

    func emit(_ event: RealtimeTranslationEvent) {
        continuation?.yield(event)
    }

    func connectedTargetLanguageCode() -> String? {
        lastTargetLanguageCode
    }
}
