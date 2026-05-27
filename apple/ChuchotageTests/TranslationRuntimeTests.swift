import Foundation
import XCTest
@testable import Chuchotage

final class TranslationRuntimeTests: XCTestCase {
    func testStartSuccessConnectsRealtimeAndStartsAudio() async throws {
        let audioIO = FakeTranslationAudioIO()
        let realtimeClient = FakeRealtimeTranslationClient()
        let runtime = TranslationRuntime(
            credentialStore: FakeOpenAICredentialStore(apiKey: "sk-test-12345678901234567890"),
            audioIO: audioIO,
            realtimeClient: realtimeClient
        )

        let eventTask = Task {
            try await waitForRuntimeEvents(runtime.events) { events in
                events.contains(.statusChanged(.listening))
            }
        }

        try await runtime.start(settings: TranslationSettings())
        let events = try await eventTask.value
        let connectCount = await realtimeClient.connectCount
        let shouldSendSessionUpdate = await realtimeClient.lastBearerToken?.shouldSendSessionUpdate

        XCTAssertEqual(Array(events.prefix(2)), [.statusChanged(.connecting), .statusChanged(.listening)])
        XCTAssertEqual(connectCount, 1)
        XCTAssertEqual(shouldSendSessionUpdate, true)
        XCTAssertEqual(audioIO.startCount, 1)
        await runtime.stop()
    }

    func testStopReleasesAudioAndRealtimeResources() async throws {
        let audioIO = FakeTranslationAudioIO()
        let realtimeClient = FakeRealtimeTranslationClient()
        let runtime = TranslationRuntime(
            credentialStore: FakeOpenAICredentialStore(apiKey: "sk-test-12345678901234567890"),
            audioIO: audioIO,
            realtimeClient: realtimeClient
        )

        let eventTask = Task {
            try await waitForRuntimeEvents(runtime.events) { events in
                events.contains(.statusChanged(.ready))
            }
        }

        try await runtime.start(settings: TranslationSettings())
        await runtime.stop()
        let events = try await eventTask.value
        let disconnectCount = await realtimeClient.disconnectCount

        XCTAssertTrue(events.contains(.statusChanged(.listening)))
        XCTAssertTrue(events.contains(.statusChanged(.ready)))
        XCTAssertEqual(audioIO.stopCount, 1)
        XCTAssertEqual(disconnectCount, 1)
    }

    func testStopDuringRealtimeConnectDoesNotResumeSession() async throws {
        let audioIO = FakeTranslationAudioIO()
        let realtimeClient = SuspendedConnectRealtimeTranslationClient()
        let runtime = TranslationRuntime(
            credentialStore: FakeOpenAICredentialStore(apiKey: "sk-test-12345678901234567890"),
            audioIO: audioIO,
            realtimeClient: realtimeClient
        )

        let readyEventTask = Task {
            try await waitForRuntimeEvents(runtime.events) { events in
                events.contains(.statusChanged(.ready))
            }
        }
        let startTask = Task {
            try await runtime.start(settings: TranslationSettings())
        }

        await realtimeClient.waitUntilConnectStarted()
        await runtime.stop()
        await realtimeClient.finishConnect()

        try await startTask.value
        let events = try await readyEventTask.value
        let disconnectCount = await realtimeClient.disconnectCount

        XCTAssertTrue(events.contains(.statusChanged(.connecting)))
        XCTAssertTrue(events.contains(.statusChanged(.ready)))
        XCTAssertFalse(events.contains(.statusChanged(.listening)))
        XCTAssertEqual(audioIO.startCount, 0)
        XCTAssertEqual(audioIO.stopCount, 1)
        XCTAssertGreaterThanOrEqual(disconnectCount, 1)
    }

    func testAudioSendFailureTransitionsToErrorAndCleansUp() async throws {
        let audioIO = FakeTranslationAudioIO()
        let realtimeClient = FakeRealtimeTranslationClient(sendError: FakeRuntimeError.sendFailed)
        let runtime = TranslationRuntime(
            credentialStore: FakeOpenAICredentialStore(apiKey: "sk-test-12345678901234567890"),
            audioIO: audioIO,
            realtimeClient: realtimeClient
        )

        let eventTask = Task {
            try await waitForRuntimeEvents(runtime.events) { events in
                events.contains(.statusChanged(.error)) && events.contains(.fatalError("send failed"))
            }
        }

        try await runtime.start(settings: TranslationSettings())
        audioIO.emit(PcmAudioChunk(pcm16: Data([0x00, 0x01]), level: 0.5))
        let events = try await eventTask.value
        let disconnectCount = await realtimeClient.disconnectCount

        XCTAssertTrue(events.contains { event in
            if case .inputVolumeChanged = event {
                return true
            }
            return false
        })
        XCTAssertTrue(events.contains(.statusChanged(.error)))
        XCTAssertTrue(events.contains(.fatalError("send failed")))
        XCTAssertEqual(audioIO.stopCount, 1)
        XCTAssertEqual(disconnectCount, 1)
    }

    func testRealtimeErrorTransitionsToErrorAndCleansUp() async throws {
        let audioIO = FakeTranslationAudioIO()
        let realtimeClient = FakeRealtimeTranslationClient()
        let runtime = TranslationRuntime(
            credentialStore: FakeOpenAICredentialStore(apiKey: "sk-test-12345678901234567890"),
            audioIO: audioIO,
            realtimeClient: realtimeClient
        )

        let eventTask = Task {
            try await waitForRuntimeEvents(runtime.events) { events in
                events.contains(.statusChanged(.error)) && events.contains(.fatalError("socket boom"))
            }
        }

        try await runtime.start(settings: TranslationSettings())
        await realtimeClient.emit(.error("socket boom"))
        let events = try await eventTask.value
        let disconnectCount = await realtimeClient.disconnectCount

        XCTAssertTrue(events.contains(.statusChanged(.error)))
        XCTAssertTrue(events.contains(.fatalError("socket boom")))
        XCTAssertEqual(audioIO.stopCount, 1)
        XCTAssertEqual(disconnectCount, 1)
    }

    func testUpdateSettingsForwardsToAudioIOWhileRunning() async throws {
        let audioIO = FakeTranslationAudioIO()
        let realtimeClient = FakeRealtimeTranslationClient()
        let runtime = TranslationRuntime(
            credentialStore: FakeOpenAICredentialStore(apiKey: "sk-test-12345678901234567890"),
            audioIO: audioIO,
            realtimeClient: realtimeClient
        )

        try await runtime.start(settings: TranslationSettings(macAudioBlendPercent: 100))
        await runtime.updateSettings(TranslationSettings(macAudioBlendPercent: 25))

        XCTAssertEqual(audioIO.updatedSettings.map(\.macAudioBlendPercent), [25])
        await runtime.stop()
    }

    func testUpdateSettingsRouteFailureTransitionsToErrorAndCleansUp() async throws {
        let message = "Connect a headset or Bluetooth microphone, or choose Phone mic before starting translation."
        let audioIO = FakeTranslationAudioIO(updateSettingsFailureMessage: message)
        let realtimeClient = FakeRealtimeTranslationClient()
        let runtime = TranslationRuntime(
            credentialStore: FakeOpenAICredentialStore(apiKey: "sk-test-12345678901234567890"),
            audioIO: audioIO,
            realtimeClient: realtimeClient
        )

        let eventTask = Task {
            try await waitForRuntimeEvents(runtime.events) { events in
                events.contains(.statusChanged(.error))
                    && events.contains(.fatalError(message))
            }
        }

        try await runtime.start(settings: TranslationSettings(macAudioBlendPercent: 100))
        await runtime.updateSettings(TranslationSettings(macAudioBlendPercent: 25))

        let events = try await eventTask.value
        let disconnectCount = await realtimeClient.disconnectCount

        XCTAssertTrue(events.contains(.statusChanged(.error)))
        XCTAssertTrue(events.contains(.fatalError(message)))
        XCTAssertEqual(audioIO.updatedSettings.map(\.macAudioBlendPercent), [25])
        XCTAssertEqual(audioIO.stopCount, 1)
        XCTAssertEqual(disconnectCount, 1)
    }

    func testRealtimeTranscriptAndOutputAudioEventsAreForwarded() async throws {
        let audioIO = FakeTranslationAudioIO()
        let realtimeClient = FakeRealtimeTranslationClient()
        let runtime = TranslationRuntime(
            credentialStore: FakeOpenAICredentialStore(apiKey: "sk-test-12345678901234567890"),
            audioIO: audioIO,
            realtimeClient: realtimeClient
        )

        let eventTask = Task {
            try await waitForRuntimeEvents(runtime.events) { events in
                events.contains(.inputTranscriptDelta("ciao "))
                    && events.contains(.outputTranscriptDelta("hello "))
                    && events.contains(.outputAudioReceived(2))
            }
        }

        try await runtime.start(settings: TranslationSettings())
        await realtimeClient.emit(.inputTranscriptDelta("ciao "))
        await realtimeClient.emit(.outputTranscriptDelta("hello "))
        await realtimeClient.emit(.outputAudio(Data([0x01, 0x02])))

        let events = try await eventTask.value
        XCTAssertTrue(events.contains(.inputTranscriptDelta("ciao ")))
        XCTAssertTrue(events.contains(.outputTranscriptDelta("hello ")))
        XCTAssertTrue(events.contains(.outputAudioReceived(2)))
        XCTAssertEqual(audioIO.playedAudio, [Data([0x01, 0x02])])

        await runtime.stop()
    }

    func testUpdateSettingsIsIgnoredWhenRuntimeIsStopped() async throws {
        let audioIO = FakeTranslationAudioIO()
        let runtime = TranslationRuntime(
            credentialStore: FakeOpenAICredentialStore(apiKey: "sk-test-12345678901234567890"),
            audioIO: audioIO,
            realtimeClient: FakeRealtimeTranslationClient()
        )

        await runtime.updateSettings(TranslationSettings(macAudioBlendPercent: 25))

        XCTAssertTrue(audioIO.updatedSettings.isEmpty)
    }

    func testStartFailureCleansUpPartialSession() async throws {
        let audioIO = FakeTranslationAudioIO(startError: FakeRuntimeError.audioStartFailed)
        let realtimeClient = FakeRealtimeTranslationClient()
        let runtime = TranslationRuntime(
            credentialStore: FakeOpenAICredentialStore(apiKey: "sk-test-12345678901234567890"),
            audioIO: audioIO,
            realtimeClient: realtimeClient
        )

        let eventTask = Task {
            try await waitForRuntimeEvents(runtime.events) { events in
                events.contains(.fatalError("audio start failed"))
            }
        }

        do {
            try await runtime.start(settings: TranslationSettings())
            XCTFail("Expected audio start failure to throw.")
        } catch FakeRuntimeError.audioStartFailed {
            XCTAssertTrue(true)
        }

        let events = try await eventTask.value
        let disconnectCount = await realtimeClient.disconnectCount

        XCTAssertTrue(events.contains(.statusChanged(.connecting)))
        XCTAssertTrue(events.contains(.fatalError("audio start failed")))
        XCTAssertEqual(audioIO.stopCount, 1)
        XCTAssertEqual(disconnectCount, 1)
    }

    func testUnexpectedAudioCaptureEndTransitionsToErrorAndCleansUp() async throws {
        let audioIO = FakeTranslationAudioIO(unexpectedStopMessage: "Connect a headset or choose Phone mic before starting translation.")
        let realtimeClient = FakeRealtimeTranslationClient()
        let runtime = TranslationRuntime(
            credentialStore: FakeOpenAICredentialStore(apiKey: "sk-test-12345678901234567890"),
            audioIO: audioIO,
            realtimeClient: realtimeClient
        )

        let eventTask = Task {
            try await waitForRuntimeEvents(runtime.events) { events in
                events.contains(.statusChanged(.error))
                    && events.contains(.fatalError("Connect a headset or choose Phone mic before starting translation."))
            }
        }

        try await runtime.start(settings: TranslationSettings())
        audioIO.finishCapture()
        let events = try await eventTask.value
        let disconnectCount = await realtimeClient.disconnectCount

        XCTAssertTrue(events.contains(.statusChanged(.error)))
        XCTAssertTrue(events.contains(.fatalError("Connect a headset or choose Phone mic before starting translation.")))
        XCTAssertEqual(audioIO.stopCount, 1)
        XCTAssertEqual(disconnectCount, 1)
    }

    func testUnexpectedRealtimeEndTransitionsToErrorAndCleansUp() async throws {
        let audioIO = FakeTranslationAudioIO()
        let realtimeClient = FakeRealtimeTranslationClient()
        let runtime = TranslationRuntime(
            credentialStore: FakeOpenAICredentialStore(apiKey: "sk-test-12345678901234567890"),
            audioIO: audioIO,
            realtimeClient: realtimeClient
        )

        let eventTask = Task {
            try await waitForRuntimeEvents(runtime.events) { events in
                events.contains(.statusChanged(.error))
                    && events.contains(.fatalError("Realtime connection closed unexpectedly. Check your network and try again."))
            }
        }

        try await runtime.start(settings: TranslationSettings())
        await realtimeClient.finishEvents()
        let events = try await eventTask.value
        let disconnectCount = await realtimeClient.disconnectCount

        XCTAssertTrue(events.contains(.statusChanged(.error)))
        XCTAssertTrue(events.contains(.fatalError("Realtime connection closed unexpectedly. Check your network and try again.")))
        XCTAssertEqual(audioIO.stopCount, 1)
        XCTAssertEqual(disconnectCount, 1)
    }
}

private func waitForRuntimeEvents(
    _ stream: AsyncStream<TranslationRuntimeEvent>,
    until predicate: @escaping @Sendable ([TranslationRuntimeEvent]) -> Bool
) async throws -> [TranslationRuntimeEvent] {
    try await withThrowingTaskGroup(of: [TranslationRuntimeEvent].self) { group in
        defer { group.cancelAll() }

        group.addTask {
            var events: [TranslationRuntimeEvent] = []
            for await event in stream {
                events.append(event)
                if predicate(events) {
                    return events
                }
            }
            return events
        }
        group.addTask {
            try await Task.sleep(nanoseconds: 1_500_000_000)
            throw FakeRuntimeError.timedOutWaitingForEvents
        }

        guard let events = try await group.next() else {
            throw FakeRuntimeError.timedOutWaitingForEvents
        }
        return events
    }
}

private enum FakeRuntimeError: LocalizedError, Sendable {
    case audioStartFailed
    case sendFailed
    case timedOutWaitingForEvents

    var errorDescription: String? {
        switch self {
        case .audioStartFailed:
            return "audio start failed"
        case .sendFailed:
            return "send failed"
        case .timedOutWaitingForEvents:
            return "timed out waiting for runtime events"
        }
    }
}

private struct FakeOpenAICredentialStore: OpenAICredentialStoring {
    let credential: OpenAICredential?

    init(apiKey: String) {
        self.credential = OpenAICredential(kind: .apiKey, value: apiKey)
    }

    func loadCredential() async throws -> OpenAICredential? {
        credential
    }

    func saveCredential(_ credential: OpenAICredential) async throws {}
    func clearCredential() async throws {}
}

private final class FakeTranslationAudioIO: TranslationAudioIO, @unchecked Sendable {
    private let lock = NSLock()
    private let startError: Error?
    private let unexpectedStopMessage: String?
    private let updateSettingsFailureMessage: String?
    private var continuation: AsyncStream<PcmAudioChunk>.Continuation?
    private var hasConsumedUnexpectedStopMessage = false
    private var _startCount = 0
    private var _stopCount = 0
    private var _playedAudio: [Data] = []
    private var _updatedSettings: [TranslationSettings] = []

    init(
        startError: Error? = nil,
        unexpectedStopMessage: String? = nil,
        updateSettingsFailureMessage: String? = nil
    ) {
        self.startError = startError
        self.unexpectedStopMessage = unexpectedStopMessage
        self.updateSettingsFailureMessage = updateSettingsFailureMessage
    }

    var startCount: Int {
        lock.withLock { _startCount }
    }

    var stopCount: Int {
        lock.withLock { _stopCount }
    }

    var playedAudio: [Data] {
        lock.withLock { _playedAudio }
    }

    var updatedSettings: [TranslationSettings] {
        lock.withLock { _updatedSettings }
    }

    func start(settings: TranslationSettings) async throws -> AsyncStream<PcmAudioChunk> {
        if let startError {
            throw startError
        }

        let streamPair = AsyncStream.makeStream(of: PcmAudioChunk.self)
        lock.withLock {
            _startCount += 1
            hasConsumedUnexpectedStopMessage = false
            continuation = streamPair.continuation
        }
        return streamPair.stream
    }

    func playTranslatedAudio(_ pcm16: Data) async {
        lock.withLock {
            _playedAudio.append(pcm16)
        }
    }

    func updateSettings(_ settings: TranslationSettings) async {
        let capturedContinuation = lock.withLock {
            _updatedSettings.append(settings)
            return continuation
        }

        guard updateSettingsFailureMessage != nil else { return }

        capturedContinuation?.finish()
    }

    func stop() async {
        let capturedContinuation = lock.withLock {
            _stopCount += 1
            let capturedContinuation = continuation
            continuation = nil
            return capturedContinuation
        }
        capturedContinuation?.finish()
    }

    func consumeUnexpectedStopErrorMessage() async -> String? {
        lock.withLock {
            if hasConsumedUnexpectedStopMessage {
                return nil
            }
            if let updateSettingsFailureMessage {
                hasConsumedUnexpectedStopMessage = true
                return updateSettingsFailureMessage
            }
            if let unexpectedStopMessage {
                hasConsumedUnexpectedStopMessage = true
                return unexpectedStopMessage
            }
            return nil
        }
    }

    func emit(_ chunk: PcmAudioChunk) {
        lock.withLock { continuation }?.yield(chunk)
    }

    func finishCapture() {
        lock.withLock { continuation }?.finish()
    }
}

private actor FakeRealtimeTranslationClient: RealtimeTranslationClienting {
    private let stream: AsyncStream<RealtimeTranslationEvent>
    private let continuation: AsyncStream<RealtimeTranslationEvent>.Continuation
    private let connectError: Error?
    private let sendError: Error?
    private(set) var connectCount = 0
    private(set) var disconnectCount = 0
    private(set) var lastBearerToken: RealtimeTranslationSessionToken?
    private(set) var sentAudio: [Data] = []

    init(connectError: Error? = nil, sendError: Error? = nil) {
        let streamPair = AsyncStream.makeStream(of: RealtimeTranslationEvent.self)
        self.stream = streamPair.stream
        self.continuation = streamPair.continuation
        self.connectError = connectError
        self.sendError = sendError
    }

    func connect(
        bearerToken: RealtimeTranslationSessionToken,
        targetLanguageCode: String
    ) async throws -> AsyncStream<RealtimeTranslationEvent> {
        connectCount += 1
        lastBearerToken = bearerToken

        if let connectError {
            throw connectError
        }

        return stream
    }

    func sendInputAudio(_ pcm16: Data) async throws {
        if let sendError {
            throw sendError
        }

        sentAudio.append(pcm16)
    }

    func disconnect() async {
        disconnectCount += 1
    }

    func emit(_ event: RealtimeTranslationEvent) {
        continuation.yield(event)
    }

    func finishEvents() {
        continuation.finish()
    }
}

private actor SuspendedConnectRealtimeTranslationClient: RealtimeTranslationClienting {
    private let stream: AsyncStream<RealtimeTranslationEvent>
    private let continuation: AsyncStream<RealtimeTranslationEvent>.Continuation
    private var connectContinuation: CheckedContinuation<AsyncStream<RealtimeTranslationEvent>, Never>?
    private var connectWaiters: [CheckedContinuation<Void, Never>] = []
    private(set) var connectCount = 0
    private(set) var disconnectCount = 0

    init() {
        let streamPair = AsyncStream.makeStream(of: RealtimeTranslationEvent.self)
        self.stream = streamPair.stream
        self.continuation = streamPair.continuation
    }

    func connect(
        bearerToken: RealtimeTranslationSessionToken,
        targetLanguageCode: String
    ) async throws -> AsyncStream<RealtimeTranslationEvent> {
        connectCount += 1
        resumeConnectWaiters()

        return await withCheckedContinuation { continuation in
            connectContinuation = continuation
        }
    }

    func sendInputAudio(_ pcm16: Data) async throws {}

    func disconnect() async {
        disconnectCount += 1
    }

    func waitUntilConnectStarted() async {
        if connectCount > 0 {
            return
        }

        await withCheckedContinuation { continuation in
            connectWaiters.append(continuation)
        }
    }

    func finishConnect() {
        connectContinuation?.resume(returning: stream)
        connectContinuation = nil
    }

    private func resumeConnectWaiters() {
        let waiters = connectWaiters
        connectWaiters = []
        waiters.forEach { $0.resume() }
    }
}
