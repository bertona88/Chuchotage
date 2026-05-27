import Foundation
import OSLog

actor TranslationRuntime {
    nonisolated let events: AsyncStream<TranslationRuntimeEvent>

    private let logger = Logger(subsystem: "ai.chuchotage.apple", category: "runtime")
    private let eventContinuation: AsyncStream<TranslationRuntimeEvent>.Continuation
    private let credentialStore: any OpenAICredentialStoring
    private let clientSecretProvider: RealtimeTranslationClientSecretProvider
    private let realtimeClient: any RealtimeTranslationClienting
    private let audioIO: any TranslationAudioIO
    private let refreshCredentialAfterUnauthorized: @Sendable () async throws -> OpenAICredential?

    private var isRunning = false
    private var audioCaptureTask: Task<Void, Never>?
    private var audioSendTask: Task<Void, Never>?
    private var realtimeTask: Task<Void, Never>?
    private var audioSendContinuation: AsyncStream<Data>.Continuation?
    private var activeSessionID: UUID?
    private var latestInputTranscript = ""
    private var latestOutputTranscript = ""

    init(
        credentialStore: any OpenAICredentialStoring,
        audioIO: any TranslationAudioIO,
        clientSecretProvider: RealtimeTranslationClientSecretProvider = RealtimeTranslationClientSecretProvider(),
        realtimeClient: any RealtimeTranslationClienting = RealtimeTranslationClient(),
        refreshCredentialAfterUnauthorized: @Sendable @escaping () async throws -> OpenAICredential? = { nil }
    ) {
        let streamPair = AsyncStream.makeStream(of: TranslationRuntimeEvent.self)
        self.events = streamPair.stream
        self.eventContinuation = streamPair.continuation
        self.credentialStore = credentialStore
        self.clientSecretProvider = clientSecretProvider
        self.realtimeClient = realtimeClient
        self.audioIO = audioIO
        self.refreshCredentialAfterUnauthorized = refreshCredentialAfterUnauthorized
    }

    func start(settings: TranslationSettings) async throws {
        guard !isRunning else { return }

        let sessionID = UUID()
        logger.info("Starting translation session to \(settings.targetLanguageCode, privacy: .public)")
        isRunning = true
        activeSessionID = sessionID
        latestInputTranscript = ""
        latestOutputTranscript = ""
        eventContinuation.yield(.statusChanged(.connecting))

        do {
            guard let credential = try await credentialStore.loadCredential() else {
                logger.error("Translation start failed: missing credential")
                throw TranslationRuntimeError.missingCredential
            }
            guard isCurrentSession(sessionID) else { return }
            logger.info("Loaded credential of kind \(credential.kind.rawValue, privacy: .public)")

            let bearerToken = try await clientSecretProvider.sessionBearerToken(
                for: credential,
                targetLanguageCode: settings.targetLanguageCode,
                refreshCredentialAfterUnauthorized: refreshCredentialAfterUnauthorized
            )
            guard isCurrentSession(sessionID) else { return }
            logger.info("Prepared Realtime bearer token; sends session update: \(bearerToken.shouldSendSessionUpdate, privacy: .public)")

            let realtimeEvents = try await realtimeClient.connect(
                bearerToken: bearerToken,
                targetLanguageCode: settings.targetLanguageCode
            )
            guard isCurrentSession(sessionID) else {
                await realtimeClient.disconnect()
                return
            }
            logger.info("Realtime translation socket connected")

            let audioChunks = try await audioIO.start(settings: settings)
            guard isCurrentSession(sessionID) else {
                await realtimeClient.disconnect()
                await audioIO.stop()
                return
            }
            logger.info("Audio capture and playback started")
            let audioSendStream = makeBoundedAudioSendStream()
            audioSendContinuation = audioSendStream.continuation

            audioSendTask = Task {
                for await pcm16 in audioSendStream.stream {
                    await sendQueuedAudio(pcm16, sessionID: sessionID)
                }
            }

            audioCaptureTask = Task {
                for await chunk in audioChunks {
                    await handleCapturedAudio(chunk, sessionID: sessionID)
                }
                await handleAudioCaptureEnded(sessionID: sessionID)
            }

            realtimeTask = Task {
                for await event in realtimeEvents {
                    await handleRealtimeEvent(event, sessionID: sessionID)
                }
                await handleRealtimeEventsEnded(sessionID: sessionID)
            }

            guard isCurrentSession(sessionID) else { return }
            eventContinuation.yield(.statusChanged(.listening))
            logger.info("Translation session is listening")
        } catch {
            let cleanedCurrentSession = await cleanupSession(emitReady: false, sessionID: sessionID)
            guard cleanedCurrentSession else {
                logger.info("Ignoring start failure after translation session was stopped")
                return
            }
            guard !isRunning, activeSessionID == nil else {
                logger.info("Ignoring start failure after a newer translation session began")
                return
            }
            let message = error.localizedDescription.isEmpty
                ? "Translation stopped unexpectedly."
                : error.localizedDescription
            logger.error("Translation start failed: \(message, privacy: .public)")
            eventContinuation.yield(.fatalError(message))
            throw error
        }
    }

    func stop() async {
        guard isRunning else {
            await audioIO.stop()
            await realtimeClient.disconnect()
            audioSendContinuation?.finish()
            audioSendContinuation = nil
            activeSessionID = nil
            eventContinuation.yield(.statusChanged(.ready))
            return
        }

        await cleanupSession(emitReady: true)
    }

    func updateSettings(_ settings: TranslationSettings) async {
        guard isRunning else { return }

        await audioIO.updateSettings(settings)
        logger.info("Updated live translation audio settings")
    }

    @discardableResult
    private func cleanupSession(emitReady: Bool, sessionID: UUID? = nil) async -> Bool {
        if let sessionID, activeSessionID != sessionID {
            return false
        }

        logger.info("Cleaning up translation session")
        isRunning = false
        activeSessionID = nil
        audioCaptureTask?.cancel()
        audioSendTask?.cancel()
        realtimeTask?.cancel()
        audioCaptureTask = nil
        audioSendTask = nil
        realtimeTask = nil
        audioSendContinuation?.finish()
        audioSendContinuation = nil
        await realtimeClient.disconnect()
        await audioIO.stop()
        if emitReady, !isRunning, activeSessionID == nil {
            eventContinuation.yield(.statusChanged(.ready))
            logger.info("Translation session stopped")
        }

        return true
    }

    private func handleCapturedAudio(_ chunk: PcmAudioChunk, sessionID: UUID) async {
        guard isCurrentSession(sessionID) else { return }

        let uplinkPcm = PcmInputGain.liftQuietSpeech(chunk.pcm16)
        eventContinuation.yield(.inputVolumeChanged(PcmVolumeMeter.level(uplinkPcm)))
        audioSendContinuation?.yield(uplinkPcm)
    }

    private func sendQueuedAudio(_ pcm16: Data, sessionID: UUID) async {
        guard isCurrentSession(sessionID) else { return }

        do {
            try await realtimeClient.sendInputAudio(pcm16)
        } catch {
            await fail(error.localizedDescription, sessionID: sessionID)
        }
    }

    private func handleRealtimeEvent(_ event: RealtimeTranslationEvent, sessionID: UUID) async {
        guard isCurrentSession(sessionID) else { return }

        switch event {
        case .outputAudio(let pcm):
            eventContinuation.yield(.outputAudioReceived(pcm.count))
            await audioIO.playTranslatedAudio(pcm)

        case .inputTranscriptDelta(let delta):
            appendLatestInput(delta)
            eventContinuation.yield(.inputTranscriptDelta(delta))

        case .outputTranscriptDelta(let delta):
            appendLatestOutput(delta)
            eventContinuation.yield(.outputTranscriptDelta(delta))

        case .error(let message):
            await fail(message, sessionID: sessionID)

        case .ignored:
            break
        }
    }

    private func fail(_ message: String, sessionID: UUID) async {
        guard isCurrentSession(sessionID) else { return }

        logger.error("Translation session failed: \(message, privacy: .public)")
        await cleanupSession(emitReady: false, sessionID: sessionID)
        guard !isRunning, activeSessionID == nil else { return }
        eventContinuation.yield(.statusChanged(.error))
        eventContinuation.yield(
            .fatalError(message.isEmpty ? "Translation stopped unexpectedly." : message)
        )
    }

    private func appendLatestInput(_ delta: String) {
        latestInputTranscript = trimmedTranscript(latestInputTranscript + delta)
    }

    private func handleAudioCaptureEnded(sessionID: UUID) async {
        guard isCurrentSession(sessionID), !Task.isCancelled else { return }

        let fallbackMessage = "Microphone capture stopped unexpectedly. Check your audio route and start translation again."
        let audioMessage = await audioIO.consumeUnexpectedStopErrorMessage()
        let message: String
        if let audioMessage, !audioMessage.isEmpty {
            message = audioMessage
        } else {
            message = fallbackMessage
        }
        await fail(message, sessionID: sessionID)
    }

    private func handleRealtimeEventsEnded(sessionID: UUID) async {
        guard isCurrentSession(sessionID), !Task.isCancelled else { return }
        await fail("Realtime connection closed unexpectedly. Check your network and try again.", sessionID: sessionID)
    }

    private func appendLatestOutput(_ delta: String) {
        latestOutputTranscript = trimmedTranscript(latestOutputTranscript + delta)
    }

    private func isCurrentSession(_ sessionID: UUID) -> Bool {
        isRunning && activeSessionID == sessionID
    }

    private func trimmedTranscript(_ text: String) -> String {
        guard text.count > maxTranscriptCharacters else { return text }
        return String(text.suffix(maxTranscriptCharacters))
    }

    private let maxTranscriptCharacters = 8_192
    private let maxQueuedAudioChunks = 64

    private func makeBoundedAudioSendStream() -> (
        stream: AsyncStream<Data>,
        continuation: AsyncStream<Data>.Continuation
    ) {
        AsyncStream.makeStream(
            of: Data.self,
            bufferingPolicy: .bufferingNewest(maxQueuedAudioChunks)
        )
    }
}
