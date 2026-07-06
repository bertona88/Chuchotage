import Foundation
import OSLog

protocol RealtimeTranslationClienting: Sendable {
    func connect(
        bearerToken: RealtimeTranslationSessionToken,
        targetLanguageCode: String
    ) async throws -> AsyncStream<RealtimeTranslationEvent>

    func sendInputAudio(_ pcm16: Data) async throws
    func disconnect() async
}

actor RealtimeTranslationClient: RealtimeTranslationClienting {
    static let translationWebSocketURL = URL(
        string: "wss://api.openai.com/v1/realtime/translations?model=gpt-realtime-translate"
    )!

    private let urlSession: URLSession
    private let webSocketURL: URL
    private let openTimeoutNanoseconds: UInt64
    private let closeTimeoutNanoseconds: UInt64
    private let openRetryDelaysNanoseconds: [UInt64]
    private let webSocketOpenObserver: RealtimeWebSocketOpenObserver?
    private let logger = Logger(subsystem: "ai.chuchotage.apple", category: "realtime")
    private var socket: URLSessionWebSocketTask?
    private var receiveTask: Task<Void, Never>?
    private var eventContinuation: AsyncStream<RealtimeTranslationEvent>.Continuation?
    private var sessionClosedWaiter: OneShotVoidContinuation?
    private var isClosingTranslationSession = false

    init(
        urlSession: URLSession? = nil,
        webSocketURL: URL = RealtimeTranslationClient.translationWebSocketURL,
        openTimeoutNanoseconds: UInt64 = 10_000_000_000,
        closeTimeoutNanoseconds: UInt64 = 2_000_000_000,
        openRetryDelaysNanoseconds: [UInt64] = [
            300_000_000,
            900_000_000,
        ]
    ) {
        if let urlSession {
            self.urlSession = urlSession
            self.webSocketOpenObserver = nil
        } else {
            let observer = RealtimeWebSocketOpenObserver()
            self.urlSession = URLSession(
                configuration: .default,
                delegate: observer,
                delegateQueue: nil
            )
            self.webSocketOpenObserver = observer
        }
        self.webSocketURL = webSocketURL
        self.openTimeoutNanoseconds = openTimeoutNanoseconds
        self.closeTimeoutNanoseconds = closeTimeoutNanoseconds
        self.openRetryDelaysNanoseconds = openRetryDelaysNanoseconds
    }

    func connect(
        bearerToken: RealtimeTranslationSessionToken,
        targetLanguageCode: String
    ) async throws -> AsyncStream<RealtimeTranslationEvent> {
        disconnectInternal()

        let streamPair = AsyncStream.makeStream(of: RealtimeTranslationEvent.self)

        do {
            try await openConfiguredSocketWithRetry(
                bearerToken: bearerToken,
                targetLanguageCode: targetLanguageCode,
                streamPair: streamPair
            )
        } catch {
            streamPair.continuation.finish()
            disconnectInternal()
            throw error
        }

        return streamPair.stream
    }

    private func openConfiguredSocketWithRetry(
        bearerToken: RealtimeTranslationSessionToken,
        targetLanguageCode: String,
        streamPair: (stream: AsyncStream<RealtimeTranslationEvent>, continuation: AsyncStream<RealtimeTranslationEvent>.Continuation)
    ) async throws {
        for attempt in 0...openRetryDelaysNanoseconds.count {
            do {
                try await openConfiguredSocket(
                    bearerToken: bearerToken,
                    targetLanguageCode: targetLanguageCode,
                    streamPair: streamPair
                )
                return
            } catch {
                guard
                    attempt < openRetryDelaysNanoseconds.count,
                    RealtimeTranslationClientError.isRetryableOpenFailure(error)
                else {
                    throw error
                }

                logger.debug("Retrying Realtime translation socket open after failure: \(error.localizedDescription, privacy: .public)")
                socket?.cancel(with: .goingAway, reason: nil)
                socket = nil
                try await Task.sleep(nanoseconds: openRetryDelaysNanoseconds[attempt])
            }
        }
    }

    private func openConfiguredSocket(
        bearerToken: RealtimeTranslationSessionToken,
        targetLanguageCode: String,
        streamPair: (stream: AsyncStream<RealtimeTranslationEvent>, continuation: AsyncStream<RealtimeTranslationEvent>.Continuation)
    ) async throws {
        eventContinuation = nil

        var request = URLRequest(url: webSocketURL)
        request.setValue("Bearer \(bearerToken.value)", forHTTPHeaderField: "Authorization")
        request.setValue(OpenAIRequestHeaders.userAgent, forHTTPHeaderField: "User-Agent")

        let newSocket = urlSession.webSocketTask(with: request)
        let openWaiter = webSocketOpenObserver?.makeOpenWaiter(
            for: newSocket,
            credentialKind: bearerToken.credentialKind
        )
        socket = newSocket
        logger.info("Opening Realtime translation socket")
        newSocket.resume()

        defer {
            webSocketOpenObserver?.removeOpenWaiter(for: newSocket)
            openWaiter?.resume(throwing: CancellationError())
        }

        do {
            try await waitForSocketReadiness(openWaiter)
        } catch {
            logger.error("Realtime translation socket failed to become ready: \(error.localizedDescription, privacy: .public)")
            disconnectInternal()
            throw error
        }

        if bearerToken.shouldSendSessionUpdate {
            guard isCurrentSocket(newSocket) else {
                streamPair.continuation.finish()
                throw TranslationRuntimeError.stopped
            }

            try await newSocket.send(
                .string(
                    RealtimeTranslationRequestBuilder.sessionUpdateEvent(
                        targetLanguageCode: targetLanguageCode
                    )
                )
            )
            logger.info("Sent Realtime translation session update")
        }

        guard isCurrentSocket(newSocket) else {
            streamPair.continuation.finish()
            throw TranslationRuntimeError.stopped
        }

        eventContinuation = streamPair.continuation
        receiveTask = Task {
            await receiveLoop(socket: newSocket, continuation: streamPair.continuation)
        }
    }

    func sendInputAudio(_ pcm16: Data) async throws {
        try await sendText(RealtimeTranslationRequestBuilder.inputAudioAppendEvent(pcm16))
    }

    func disconnect() async {
        await closeTranslationSessionIfPossible()
        disconnectInternal()
    }

    private func disconnectInternal() {
        logger.info("Disconnecting Realtime translation socket")
        sessionClosedWaiter?.resume(throwing: CancellationError())
        sessionClosedWaiter = nil
        isClosingTranslationSession = false
        receiveTask?.cancel()
        receiveTask = nil
        socket?.cancel(with: .normalClosure, reason: Data("Stopped".utf8))
        socket = nil
        eventContinuation?.finish()
        eventContinuation = nil
    }

    private func closeTranslationSessionIfPossible() async {
        guard let socket, !isClosingTranslationSession else { return }

        isClosingTranslationSession = true
        let waiter = OneShotVoidContinuation()
        sessionClosedWaiter = waiter

        do {
            try await socket.send(.string(RealtimeTranslationRequestBuilder.sessionCloseEvent()))
            logger.info("Sent Realtime translation session close")
            try await waitForSessionClosed(waiter)
            logger.info("Realtime translation session closed")
        } catch is CancellationError {
        } catch {
            logger.debug("Realtime translation session close did not complete before socket shutdown: \(error.localizedDescription, privacy: .public)")
        }
    }

    private func sendText(_ text: String) async throws {
        guard let socket else { throw TranslationRuntimeError.stopped }
        try await socket.send(.string(text))
    }

    private func isCurrentSocket(_ socket: URLSessionWebSocketTask) -> Bool {
        self.socket === socket
    }

    private func waitForSocketReadiness(_ openWaiter: OneShotVoidContinuation?) async throws {
        guard let openWaiter, openTimeoutNanoseconds > 0 else { return }

        let timeoutTask = Task {
            try? await Task.sleep(nanoseconds: openTimeoutNanoseconds)
            openWaiter.resume(throwing: RealtimeTranslationClientError.openTimedOut)
        }

        defer { timeoutTask.cancel() }

        try await openWaiter.wait()
        logger.info("Realtime translation socket opened")
    }

    private func receiveLoop(
        socket: URLSessionWebSocketTask,
        continuation: AsyncStream<RealtimeTranslationEvent>.Continuation
    ) async {
        while !Task.isCancelled {
            guard isCurrentSocket(socket) else {
                continuation.finish()
                return
            }

            do {
                let message = try await socket.receive()
                guard isCurrentSocket(socket) else {
                    continuation.finish()
                    return
                }
                switch message {
                case .string(let text):
                    let event = RealtimeTranslationEventParser.parse(text)
                    logReceivedEvent(event)
                    if case .sessionClosed = event {
                        sessionClosedWaiter?.resume()
                        sessionClosedWaiter = nil
                        continuation.yield(event)
                        continuation.finish()
                        return
                    }
                    continuation.yield(event)
                case .data(let data):
                    if let text = String(data: data, encoding: .utf8) {
                        let event = RealtimeTranslationEventParser.parse(text)
                        logReceivedEvent(event)
                        if case .sessionClosed = event {
                            sessionClosedWaiter?.resume()
                            sessionClosedWaiter = nil
                            continuation.yield(event)
                            continuation.finish()
                            return
                        }
                        continuation.yield(event)
                    }
                @unknown default:
                    break
                }
            } catch {
                if !Task.isCancelled, isCurrentSocket(socket) {
                    logger.error("Realtime translation receive loop failed: \(error.localizedDescription, privacy: .public)")
                    continuation.yield(
                        .error(error.localizedDescription.isEmpty
                            ? L10n.string(
                                "error.realtimeSocketFailed",
                                defaultValue: "Realtime translation socket failed."
                            )
                            : error.localizedDescription)
                    )
                }
                continuation.finish()
                return
            }
        }

        continuation.finish()
    }

    private func waitForSessionClosed(_ waiter: OneShotVoidContinuation) async throws {
        guard closeTimeoutNanoseconds > 0 else { return }

        let timeoutTask = Task {
            try? await Task.sleep(nanoseconds: closeTimeoutNanoseconds)
            waiter.resume(throwing: RealtimeTranslationClientError.closeTimedOut)
        }

        defer { timeoutTask.cancel() }

        try await waiter.wait()
    }

    private func logReceivedEvent(_ event: RealtimeTranslationEvent) {
        switch event {
        case .outputAudio(let pcm):
            logger.debug("Received translated audio chunk: \(pcm.count, privacy: .public) bytes")
        case .inputTranscriptDelta:
            logger.debug("Received input transcript delta")
        case .outputTranscriptDelta:
            logger.debug("Received output transcript delta")
        case .error(let message):
            logger.error("Realtime translation error event: \(message, privacy: .public)")
        case .sessionClosed:
            logger.debug("Received translation session closed")
        case .ignored:
            break
        }
    }
}

private final class RealtimeWebSocketOpenObserver: NSObject, URLSessionWebSocketDelegate, @unchecked Sendable {
    private let lock = NSLock()
    private var openWaiters: [Int: RealtimeWebSocketOpenWaiter] = [:]

    func makeOpenWaiter(
        for task: URLSessionWebSocketTask,
        credentialKind: OpenAICredentialKind
    ) -> OneShotVoidContinuation {
        let continuation = OneShotVoidContinuation()
        let waiter = RealtimeWebSocketOpenWaiter(
            continuation: continuation,
            credentialKind: credentialKind
        )
        lock.withLock {
            openWaiters[task.taskIdentifier] = waiter
        }
        return continuation
    }

    func removeOpenWaiter(for task: URLSessionWebSocketTask) {
        lock.withLock {
            openWaiters[task.taskIdentifier] = nil
        }
    }

    func urlSession(
        _ session: URLSession,
        webSocketTask: URLSessionWebSocketTask,
        didOpenWithProtocol protocol: String?
    ) {
        openWaiter(for: webSocketTask)?.continuation.resume()
    }

    func urlSession(
        _ session: URLSession,
        webSocketTask: URLSessionWebSocketTask,
        didCloseWith closeCode: URLSessionWebSocketTask.CloseCode,
        reason: Data?
    ) {
        openWaiter(for: webSocketTask)?.continuation.resume(
            throwing: RealtimeTranslationClientError.closedBeforeOpen(
                closeMessage(closeCode: closeCode, reason: reason)
            )
        )
    }

    func urlSession(
        _ session: URLSession,
        task: URLSessionTask,
        didCompleteWithError error: (any Error)?
    ) {
        guard let webSocketTask = task as? URLSessionWebSocketTask else { return }
        guard let waiter = openWaiter(for: webSocketTask) else { return }

        if let error {
            waiter.continuation.resume(
                throwing: RealtimeTranslationClientError.openFailure(
                    error: error,
                    statusCode: (task.response as? HTTPURLResponse)?.statusCode,
                    credentialKind: waiter.credentialKind
                )
            )
        }
    }

    private func openWaiter(for task: URLSessionWebSocketTask) -> RealtimeWebSocketOpenWaiter? {
        lock.withLock {
            openWaiters[task.taskIdentifier]
        }
    }

    private func closeMessage(
        closeCode: URLSessionWebSocketTask.CloseCode,
        reason: Data?
    ) -> String {
        let reasonText = reason.flatMap { String(data: $0, encoding: .utf8) } ?? ""
        if reasonText.isEmpty {
            return L10n.format(
                "error.realtimeSocketClosedBeforeOpeningWithCode",
                defaultValue: "Realtime translation socket closed before opening (%d).",
                closeCode.rawValue
            )
        }
        return reasonText
    }
}

private struct RealtimeWebSocketOpenWaiter {
    let continuation: OneShotVoidContinuation
    let credentialKind: OpenAICredentialKind
}

final class OneShotVoidContinuation: @unchecked Sendable {
    private enum Completion {
        case success
        case failure(any Error)

        func resume(_ continuation: CheckedContinuation<Void, any Error>) {
            switch self {
            case .success:
                continuation.resume()
            case .failure(let error):
                continuation.resume(throwing: error)
            }
        }
    }

    private let lock = NSLock()
    private var continuation: CheckedContinuation<Void, any Error>?
    private var completion: Completion?

    func install(_ continuation: CheckedContinuation<Void, any Error>) -> Bool {
        let completed = lock.withLock { () -> Completion? in
            if let completion {
                return completion
            }

            self.continuation = continuation
            return nil
        }

        if let completed {
            completed.resume(continuation)
            return false
        }

        return true
    }

    func wait() async throws {
        try await withTaskCancellationHandler {
            try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Void, any Error>) in
                _ = install(continuation)
            }
        } onCancel: {
            self.resume(throwing: CancellationError())
        }
    }

    func resume() {
        complete(.success)
    }

    func resume(throwing error: any Error) {
        complete(.failure(error))
    }

    private func complete(_ completion: Completion) {
        let continuation = lock.withLock { () -> CheckedContinuation<Void, any Error>? in
            guard self.completion == nil else {
                return nil
            }

            self.completion = completion
            let continuation = self.continuation
            self.continuation = nil
            return continuation
        }

        if let continuation {
            completion.resume(continuation)
        }
    }
}

enum RealtimeTranslationClientError: LocalizedError, Sendable {
    case openTimedOut
    case closeTimedOut
    case closedBeforeOpen(String)
    case openFailed(String, retryable: Bool)

    var errorDescription: String? {
        switch self {
        case .openTimedOut:
            return L10n.string(
                "error.realtimeSocketTimedOut",
                defaultValue: "Could not connect to OpenAI Realtime. Check the network and try again."
            )
        case .closeTimedOut:
            return L10n.string(
                "error.realtimeSocketCloseTimedOut",
                defaultValue: "Realtime translation session did not close before the socket timeout."
            )
        case .closedBeforeOpen(let message):
            return message.isEmpty
                ? L10n.string(
                    "error.realtimeSocketClosedBeforeOpening",
                    defaultValue: "Realtime translation socket closed before opening."
                )
                : message
        case .openFailed(let message, _):
            return message
        }
    }

    var isRetryableOpenFailure: Bool {
        switch self {
        case .openTimedOut:
            return true
        case .openFailed(_, let retryable):
            return retryable
        case .closeTimedOut, .closedBeforeOpen:
            return false
        }
    }

    static func isRetryableOpenFailure(_ error: any Error) -> Bool {
        if let error = error as? RealtimeTranslationClientError {
            return error.isRetryableOpenFailure
        }

        if let error = error as? URLError {
            switch error.code {
            case .timedOut,
                 .cannotConnectToHost,
                 .networkConnectionLost,
                 .notConnectedToInternet:
                return true
            default:
                return false
            }
        }

        return false
    }

    static func openFailure(
        error: any Error,
        statusCode: Int?,
        credentialKind: OpenAICredentialKind?
    ) -> RealtimeTranslationClientError {
        let message: String
        let retryable: Bool

        switch statusCode {
        case 401?, 403?:
            message = L10n.string(
                "error.realtimeSocketAuth",
                defaultValue: "OpenAI rejected the saved login. Check your API key or sign in again."
            )
            retryable = false
        case 429?:
            message = L10n.string(
                "error.realtimeSocketRateLimited",
                defaultValue: "OpenAI Realtime is rate-limited right now. Try again in a minute."
            )
            retryable = true
        case let statusCode? where (500...599).contains(statusCode):
            switch credentialKind {
            case .chatGPTAccessToken?:
                message = L10n.string(
                    "error.realtimeSocketChatGPTUnavailable",
                    defaultValue: "OpenAI is rejecting ChatGPT sign-in translation sessions right now. Restart Chuchotage and try again."
                )
            case .sponsoredTrial?:
                message = L10n.string(
                    "error.realtimeSocketTrialUnavailable",
                    defaultValue: "Chuchotage translation access is unavailable right now. Try again in a moment."
                )
            case .apiKey?, nil:
                message = L10n.string(
                    "error.realtimeSocketUnavailable",
                    defaultValue: "OpenAI Realtime is unavailable right now. Try again in a moment."
                )
            }
            retryable = true
        case let statusCode?:
            message = L10n.format(
                "error.realtimeSocketHTTP",
                defaultValue: "Could not connect to OpenAI Realtime (HTTP %d).",
                statusCode
            )
            retryable = false
        case nil:
            if let urlError = error as? URLError {
                switch urlError.code {
                case .cannotFindHost, .dnsLookupFailed:
                    message = L10n.string(
                        "network.resolveOpenAI",
                        defaultValue: "Could not resolve api.openai.com. Check VPN, DNS, or network settings and try again."
                    )
                default:
                    message = L10n.string(
                        "network.reachOpenAI",
                        defaultValue: "Could not reach api.openai.com. Check the network and try again."
                    )
                }
                retryable = isRetryableOpenFailure(urlError)
            } else {
                message = error.localizedDescription.isEmpty
                    ? L10n.string(
                        "error.realtimeSocketFailed",
                        defaultValue: "Realtime translation socket failed."
                    )
                    : error.localizedDescription
                retryable = false
            }
        }

        return .openFailed(message, retryable: retryable)
    }
}
