import AuthenticationServices
import CryptoKit
import Foundation
import Network
import Security

#if os(iOS)
import UIKit
#elseif os(macOS)
import AppKit
#endif

struct ChatGPTOAuthTokens: Equatable, Sendable {
    let idToken: String?
    let accessToken: String
    let refreshToken: String
}

enum ChatGPTSignInStatus: Equatable, Sendable {
    case openingBrowser
    case waitingForCallback
    case exchangingToken

    var message: String {
        switch self {
        case .openingBrowser:
            return L10n.string("chatGPTSignIn.openingBrowser", defaultValue: "Opening ChatGPT sign-in...")
        case .waitingForCallback:
            return L10n.string("chatGPTSignIn.waitingForCallback", defaultValue: "Waiting for browser sign-in...")
        case .exchangingToken:
            return L10n.string("chatGPTSignIn.exchangingToken", defaultValue: "Finishing sign-in...")
        }
    }
}

final class ChatGPTOAuthClient: @unchecked Sendable {
    private let urlSession: URLSession
    private let authIssuer: URL
    private let retryDelaysNanoseconds: [UInt64]
    private let sessionLock = NSLock()
    private var activeSession: ASWebAuthenticationSession?
    private var activePresentationProvider: ChatGPTAuthenticationPresentationProvider?

    init(
        urlSession: URLSession = .shared,
        authIssuer: URL = URL(string: "https://auth.openai.com")!,
        retryDelaysNanoseconds: [UInt64] = [
            250_000_000,
            500_000_000,
            1_000_000_000,
            2_000_000_000,
            4_000_000_000,
            8_000_000_000,
        ]
    ) {
        self.urlSession = urlSession
        self.authIssuer = authIssuer
        self.retryDelaysNanoseconds = retryDelaysNanoseconds
    }

    func login(
        onStatus: @MainActor @Sendable (ChatGPTSignInStatus) -> Void = { _ in }
    ) async throws -> OpenAICredential {
        let pkce = try Self.generatePKCE()
        let state = try Self.randomBase64URL(byteCount: 32)
        let server = try ChatGPTOAuthLoopbackServer.bind(expectedState: state)
        let redirectURI = "http://localhost:\(server.port)/auth/callback"
        let authorizationURL = try buildAuthorizationURL(
            redirectURI: redirectURI,
            codeChallenge: pkce.codeChallenge,
            state: state
        )

        do {
            let credential = try await completeLogin(
                authorizationURL: authorizationURL,
                server: server,
                expectedState: state,
                redirectURI: redirectURI,
                codeVerifier: pkce.codeVerifier,
                onStatus: onStatus
            )
            server.cancel()
            await MainActor.run {
                self.clearAuthenticationSession()
            }
            return credential
        } catch {
            server.cancel()
            await MainActor.run {
                self.clearAuthenticationSession()
            }
            throw error
        }
    }

    private func completeLogin(
        authorizationURL: URL,
        server: ChatGPTOAuthLoopbackServer,
        expectedState: String,
        redirectURI: String,
        codeVerifier: String,
        onStatus: @MainActor @Sendable (ChatGPTSignInStatus) -> Void
    ) async throws -> OpenAICredential {
        await MainActor.run {
            onStatus(.openingBrowser)
        }
        try await startAuthenticationSession(
            url: authorizationURL,
            loopbackServer: server,
            expectedState: expectedState
        )

        await MainActor.run {
            onStatus(.waitingForCallback)
        }
        let code = try await server.waitForAuthorizationCode()

        await MainActor.run {
            onStatus(.exchangingToken)
        }
        let tokens = try await exchangeCodeForTokens(
            code: code,
            redirectURI: redirectURI,
            codeVerifier: codeVerifier
        )

        return OpenAICredential(
            kind: .chatGPTAccessToken,
            value: tokens.accessToken,
            idToken: tokens.idToken,
            refreshToken: tokens.refreshToken,
            lastRefreshEpochSeconds: Self.currentEpochSeconds()
        )
    }

    func refreshIfNeeded(
        credential: OpenAICredential,
        forceRefresh: Bool = false
    ) async throws -> OpenAICredential {
        guard credential.kind == .chatGPTAccessToken else { return credential }
        guard let refreshToken = normalizedNonEmpty(credential.refreshToken) else {
            if forceRefresh {
                throw ChatGPTOAuthError.reauthenticationRequired(
                    L10n.string(
                        "error.chatGPTExpired",
                        defaultValue: "ChatGPT sign-in expired. Sign in again."
                    )
                )
            }
            return credential
        }

        guard forceRefresh || shouldRefresh(credential) else {
            return credential
        }

        let accessTokenWasExpiring = accessTokenIsExpiring(credential.value)
        let refreshed = try await refreshTokens(refreshToken: refreshToken)
        if refreshed.accessToken == nil && (forceRefresh || accessTokenWasExpiring) {
            throw ChatGPTOAuthError.unexpectedResponse(
                L10n.string(
                    "error.tokenRefreshMissingAccessToken",
                    defaultValue: "Token refresh did not return an access token."
                )
            )
        }

        return OpenAICredential(
            kind: .chatGPTAccessToken,
            value: refreshed.accessToken ?? credential.value,
            idToken: refreshed.idToken ?? credential.idToken,
            refreshToken: refreshed.refreshToken ?? credential.refreshToken,
            lastRefreshEpochSeconds: Self.currentEpochSeconds()
        )
    }

    private func startAuthenticationSession(
        url: URL,
        loopbackServer: ChatGPTOAuthLoopbackServer,
        expectedState: String
    ) async throws {
        let completionHandler = Self.authenticationSessionCompletionHandler(
            loopbackServer: loopbackServer,
            expectedState: expectedState
        )

        try await MainActor.run {
            sessionLock.lock()
            defer { sessionLock.unlock() }

            guard activeSession == nil else {
                throw ChatGPTOAuthError.loginAlreadyInProgress
            }

            let session = ASWebAuthenticationSession(
                url: url,
                callbackURLScheme: nil,
                completionHandler: completionHandler
            )

            let provider = ChatGPTAuthenticationPresentationProvider()
            session.presentationContextProvider = provider
            session.prefersEphemeralWebBrowserSession = false

            guard session.start() else {
                throw ChatGPTOAuthError.browserUnavailable
            }

            activeSession = session
            activePresentationProvider = provider
        }
    }

    private static func authenticationSessionCompletionHandler(
        loopbackServer: ChatGPTOAuthLoopbackServer,
        expectedState: String
    ) -> (URL?, Error?) -> Void {
        { callbackURL, error in
            if let callbackURL {
                loopbackServer.submitCallbackURL(callbackURL.absoluteString, expectedState: expectedState)
                return
            }

            if let error = error as? ASWebAuthenticationSessionError,
               error.code == .canceledLogin {
                loopbackServer.cancel()
            }
        }
    }

    @MainActor
    private func clearAuthenticationSession() {
        sessionLock.lock()
        let session = activeSession
        activeSession = nil
        activePresentationProvider = nil
        sessionLock.unlock()
        session?.cancel()
    }

    private func buildAuthorizationURL(
        redirectURI: String,
        codeChallenge: String,
        state: String
    ) throws -> URL {
        var components = URLComponents(
            url: authIssuer.appendingPathComponent("oauth").appendingPathComponent("authorize"),
            resolvingAgainstBaseURL: false
        )
        components?.queryItems = [
            URLQueryItem(name: "response_type", value: "code"),
            URLQueryItem(name: "client_id", value: Self.clientID),
            URLQueryItem(name: "redirect_uri", value: redirectURI),
            URLQueryItem(name: "scope", value: Self.authScope),
            URLQueryItem(name: "code_challenge", value: codeChallenge),
            URLQueryItem(name: "code_challenge_method", value: "S256"),
            URLQueryItem(name: "id_token_add_organizations", value: "true"),
            URLQueryItem(name: "codex_cli_simplified_flow", value: "true"),
            URLQueryItem(name: "state", value: state),
            URLQueryItem(name: "originator", value: Self.originator),
        ]

        guard let url = components?.url else {
            throw ChatGPTOAuthError.unexpectedResponse(
                L10n.string(
                    "error.chatGPTSignInURL",
                    defaultValue: "Could not create the ChatGPT sign-in URL."
                )
            )
        }
        return url
    }

    private func exchangeCodeForTokens(
        code: String,
        redirectURI: String,
        codeVerifier: String
    ) async throws -> ChatGPTOAuthTokens {
        var request = URLRequest(url: authIssuer.appendingPathComponent("oauth").appendingPathComponent("token"))
        request.httpMethod = "POST"
        request.setValue("application/x-www-form-urlencoded", forHTTPHeaderField: "Content-Type")
        request.httpBody = formURLEncodedBody([
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": redirectURI,
            "client_id": Self.clientID,
            "code_verifier": codeVerifier,
        ])

        let payload = try await executeOAuthRequestWithRetry(request, operationName: "Token exchange")
        let accessToken = try requiredString(
            in: payload,
            key: "access_token",
            message: L10n.string(
                "error.tokenExchangeMissingAccessToken",
                defaultValue: "Token exchange did not return an access token."
            )
        )
        let refreshToken = try requiredString(
            in: payload,
            key: "refresh_token",
            message: L10n.string(
                "error.tokenExchangeMissingRefreshToken",
                defaultValue: "Token exchange did not return a refresh token."
            )
        )

        return ChatGPTOAuthTokens(
            idToken: optionalString(in: payload, key: "id_token"),
            accessToken: accessToken,
            refreshToken: refreshToken
        )
    }

    private func refreshTokens(refreshToken: String) async throws -> ChatGPTOAuthTokenRefresh {
        var request = URLRequest(url: authIssuer.appendingPathComponent("oauth").appendingPathComponent("token"))
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONSerialization.data(withJSONObject: [
            "client_id": Self.clientID,
            "grant_type": "refresh_token",
            "refresh_token": refreshToken,
        ])

        let payload = try await executeOAuthRequestWithRetry(request, operationName: "Token refresh")
        return ChatGPTOAuthTokenRefresh(
            idToken: optionalString(in: payload, key: "id_token"),
            accessToken: optionalString(in: payload, key: "access_token"),
            refreshToken: optionalString(in: payload, key: "refresh_token")
        )
    }

    private func executeOAuthRequestWithRetry(
        _ request: URLRequest,
        operationName: String
    ) async throws -> [String: Any] {
        var lastNetworkError: URLError?

        for attempt in retryDelaysNanoseconds.indices {
            do {
                let (data, response) = try await urlSession.data(for: request)
                guard let httpResponse = response as? HTTPURLResponse else {
                    throw ChatGPTOAuthError.unexpectedResponse("\(operationName) returned an invalid response.")
                }

                if (200..<300).contains(httpResponse.statusCode) {
                    return try parseJSONObject(data, operationName: operationName)
                }

                if isRetryableHTTPStatus(httpResponse.statusCode),
                   attempt < retryDelaysNanoseconds.index(before: retryDelaysNanoseconds.endIndex) {
                    try await Task.sleep(nanoseconds: retryDelaysNanoseconds[attempt])
                    continue
                }

                throw oauthError(
                    statusCode: httpResponse.statusCode,
                    data: data,
                    operationName: operationName
                )
            } catch let error as ChatGPTOAuthError {
                throw error
            } catch let error as URLError {
                lastNetworkError = error
                if isRetryableNetworkError(error),
                   attempt < retryDelaysNanoseconds.index(before: retryDelaysNanoseconds.endIndex) {
                    try await Task.sleep(nanoseconds: retryDelaysNanoseconds[attempt])
                    continue
                }
                throw ChatGPTOAuthError.tokenRequestFailed(networkMessage(for: error, operationName: operationName))
            }
        }

        throw ChatGPTOAuthError.tokenRequestFailed(
            networkMessage(for: lastNetworkError, operationName: operationName)
        )
    }

    private func oauthError(
        statusCode: Int,
        data: Data,
        operationName: String
    ) -> ChatGPTOAuthError {
        let details = parseOAuthErrorDetails(data)
        if statusCode == 401 || details.requiresReauthentication {
            if operationName == "Token refresh" {
                return .reauthenticationRequired("Your ChatGPT sign-in expired. Sign in again.")
            }
            return .reauthenticationRequired("This ChatGPT sign-in link expired. Try signing in again.")
        }

        if isRetryableHTTPStatus(statusCode) {
            return .tokenRequestFailed(
                "\(operationName) could not reach auth.openai.com reliably. Check the network and try again."
            )
        }

        if let description = details.description {
            return .tokenRequestFailed(description)
        }

        return .tokenRequestFailed("\(operationName) failed with status \(statusCode).")
    }

    private func parseJSONObject(_ data: Data, operationName: String) throws -> [String: Any] {
        guard let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else {
            throw ChatGPTOAuthError.unexpectedResponse("\(operationName) returned an invalid response.")
        }
        return json
    }

    private func requiredString(in payload: [String: Any], key: String, message: String) throws -> String {
        guard let value = optionalString(in: payload, key: key) else {
            throw ChatGPTOAuthError.unexpectedResponse(message)
        }
        return value
    }

    private func optionalString(in payload: [String: Any], key: String) -> String? {
        guard let value = payload[key] as? String else { return nil }
        let normalized = OpenAICredentialValidator.normalize(value)
        return normalized.isEmpty ? nil : normalized
    }

    private func parseOAuthErrorDetails(_ data: Data) -> OAuthErrorDetails {
        guard let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else {
            return OAuthErrorDetails(code: nil, description: nil)
        }

        let errorObject = json["error"] as? [String: Any]
        let code = optionalOAuthString(json["error"])
            ?? optionalOAuthString(errorObject?["code"])
            ?? optionalOAuthString(errorObject?["type"])
        let description = optionalOAuthString(json["error_description"])
            ?? optionalOAuthString(errorObject?["message"])
            ?? code
        return OAuthErrorDetails(code: code, description: description)
    }

    private func optionalOAuthString(_ value: Any?) -> String? {
        guard let string = value as? String else { return nil }
        let normalized = OpenAICredentialValidator.normalize(string)
        return normalized.isEmpty ? nil : normalized
    }

    private func shouldRefresh(_ credential: OpenAICredential) -> Bool {
        if accessTokenIsExpiring(credential.value) {
            return true
        }

        guard let lastRefresh = credential.lastRefreshEpochSeconds else {
            return false
        }
        return lastRefresh <= Self.currentEpochSeconds() - Self.proactiveRefreshIntervalSeconds
    }

    private func accessTokenIsExpiring(_ accessToken: String) -> Bool {
        guard let expiresAt = Self.jwtExpirationEpochSeconds(accessToken) else {
            return false
        }
        return expiresAt <= Self.currentEpochSeconds() + Self.tokenRefreshSkewSeconds
    }

    private func normalizedNonEmpty(_ value: String?) -> String? {
        guard let value else { return nil }
        let normalized = OpenAICredentialValidator.normalize(value)
        return normalized.isEmpty ? nil : normalized
    }

    private func isRetryableHTTPStatus(_ statusCode: Int) -> Bool {
        statusCode == 429 || (500...599).contains(statusCode)
    }

    private func isRetryableNetworkError(_ error: URLError) -> Bool {
        switch error.code {
        case .cannotFindHost, .dnsLookupFailed, .timedOut, .cannotConnectToHost, .networkConnectionLost, .notConnectedToInternet:
            return true
        default:
            return false
        }
    }

    private func networkMessage(for error: URLError?, operationName: String) -> String {
        if error?.code == .cannotFindHost || error?.code == .dnsLookupFailed {
            return "\(operationName) could not resolve auth.openai.com. Check VPN, DNS, or network settings and try again."
        }
        return "\(operationName) could not reach auth.openai.com. Check the network and try again."
    }

    private func formURLEncodedBody(_ values: [String: String]) -> Data {
        let text = values
            .map { key, value in
                "\(Self.formEncode(key))=\(Self.formEncode(value))"
            }
            .joined(separator: "&")
        return Data(text.utf8)
    }

    static func authorizationCodeFromCallbackInput(
        _ input: String,
        expectedState: String
    ) throws -> String {
        guard
            let components = URLComponents(string: callbackInputFromBrowserInput(input)),
            components.path == "/auth/callback"
        else {
            throw ChatGPTOAuthError.unexpectedResponse("Sign-in returned an unexpected callback.")
        }

        let queryItems = components.queryItems ?? []
        let state = queryItems.first { $0.name == "state" }?.value
        guard state == expectedState else {
            throw ChatGPTOAuthError.unexpectedResponse("That callback belongs to a different sign-in attempt. Try signing in again.")
        }

        if let oauthError = queryItems.first(where: { $0.name == "error" })?.value,
           !oauthError.isEmpty {
            let description = queryItems.first(where: { $0.name == "error_description" })?.value
            throw ChatGPTOAuthError.tokenRequestFailed(description ?? "Sign-in failed: \(oauthError)")
        }

        guard
            let code = queryItems.first(where: { $0.name == "code" })?.value,
            !code.isEmpty
        else {
            throw ChatGPTOAuthError.unexpectedResponse("Sign-in did not return an authorization code.")
        }
        return code
    }

    private static func formEncode(_ value: String) -> String {
        var allowed = CharacterSet.urlQueryAllowed
        allowed.remove(charactersIn: "&+=?")
        return value.addingPercentEncoding(withAllowedCharacters: allowed) ?? value
    }

    private static func callbackInputFromBrowserInput(_ input: String) -> String {
        if input.hasPrefix("http://") || input.hasPrefix("https://") {
            return input
        }
        if input.hasPrefix("/") {
            return "http://localhost\(input)"
        }
        return "http://\(input)"
    }

    private static func generatePKCE() throws -> PKCECodes {
        let verifier = try randomBase64URL(byteCount: 64)
        let digest = SHA256.hash(data: Data(verifier.utf8))
        return PKCECodes(
            codeVerifier: verifier,
            codeChallenge: base64URLNoPadding(Data(digest))
        )
    }

    private static func randomBase64URL(byteCount: Int) throws -> String {
        var bytes = [UInt8](repeating: 0, count: byteCount)
        let status = SecRandomCopyBytes(kSecRandomDefault, bytes.count, &bytes)
        guard status == errSecSuccess else {
            throw ChatGPTOAuthError.unexpectedResponse("Could not prepare a secure sign-in request.")
        }
        return base64URLNoPadding(Data(bytes))
    }

    private static func base64URLNoPadding(_ data: Data) -> String {
        data.base64EncodedString()
            .replacingOccurrences(of: "+", with: "-")
            .replacingOccurrences(of: "/", with: "_")
            .replacingOccurrences(of: "=", with: "")
    }

    private static func jwtExpirationEpochSeconds(_ token: String) -> Int64? {
        let parts = token.split(separator: ".")
        guard parts.count >= 2 else { return nil }

        var payload = String(parts[1])
            .replacingOccurrences(of: "-", with: "+")
            .replacingOccurrences(of: "_", with: "/")
        let remainder = payload.count % 4
        if remainder > 0 {
            payload += String(repeating: "=", count: 4 - remainder)
        }

        guard
            let data = Data(base64Encoded: payload),
            let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any]
        else {
            return nil
        }

        if let expiresAt = json["exp"] as? Int64 {
            return expiresAt > 0 ? expiresAt : nil
        }
        if let expiresAt = json["exp"] as? Int {
            return expiresAt > 0 ? Int64(expiresAt) : nil
        }
        if let expiresAt = json["exp"] as? Double {
            return expiresAt > 0 ? Int64(expiresAt) : nil
        }
        return nil
    }

    private static func currentEpochSeconds() -> Int64 {
        Int64(Date().timeIntervalSince1970)
    }

    private struct PKCECodes: Sendable {
        let codeVerifier: String
        let codeChallenge: String
    }

    private struct ChatGPTOAuthTokenRefresh: Sendable {
        let idToken: String?
        let accessToken: String?
        let refreshToken: String?
    }

    private struct OAuthErrorDetails: Sendable {
        let code: String?
        let description: String?

        var requiresReauthentication: Bool {
            code == "invalid_grant" || code == "invalid_token" || code == "unauthorized"
        }
    }

    private static let clientID = "app_EMoamEEZ73f0CkXaXp7hrann"
    private static let authScope = "openid profile email offline_access api.connectors.read api.connectors.invoke"
    private static let originator = "codex_cli_rs"
    private static let tokenRefreshSkewSeconds: Int64 = 60
    private static let proactiveRefreshIntervalSeconds: Int64 = 8 * 24 * 60 * 60
}

final class ChatGPTRefreshingOpenAICredentialStore: OpenAICredentialStoring, @unchecked Sendable {
    private let baseStore: any OpenAICredentialStoring
    private let oauthClient: ChatGPTOAuthClient

    init(
        baseStore: any OpenAICredentialStoring,
        oauthClient: ChatGPTOAuthClient
    ) {
        self.baseStore = baseStore
        self.oauthClient = oauthClient
    }

    func loadCredential() async throws -> OpenAICredential? {
        guard let credential = try await baseStore.loadCredential() else {
            return nil
        }

        let refreshed = try await oauthClient.refreshIfNeeded(credential: credential)
        if refreshed != credential {
            try await baseStore.saveCredential(refreshed)
        }
        return refreshed
    }

    func loadCredentialStatus() async throws -> OpenAICredentialStatus {
        try await baseStore.loadCredentialStatus()
    }

    func saveCredential(_ credential: OpenAICredential) async throws {
        try await baseStore.saveCredential(credential)
    }

    func clearCredential() async throws {
        try await baseStore.clearCredential()
    }

    func forceRefreshSavedCredential() async throws -> OpenAICredential? {
        guard let credential = try await baseStore.loadCredential() else {
            return nil
        }
        let refreshed = try await oauthClient.refreshIfNeeded(
            credential: credential,
            forceRefresh: true
        )
        if refreshed != credential {
            try await baseStore.saveCredential(refreshed)
        }
        return refreshed
    }
}

private final class ChatGPTOAuthLoopbackServer: @unchecked Sendable {
    let port: UInt16

    private let listener: NWListener
    private let expectedState: String
    private let queue = DispatchQueue(label: "com.andreabertoncini.chuchotage.oauth-loopback")
    private let lock = NSLock()
    private var continuation: CheckedContinuation<String, Error>?
    private var isCompleted = false
    private var completedResult: Result<String, Error>?

    private init(listener: NWListener, port: UInt16, expectedState: String) {
        self.listener = listener
        self.port = port
        self.expectedState = expectedState
    }

    static func bind(expectedState: String) throws -> ChatGPTOAuthLoopbackServer {
        for port in [UInt16(1455), UInt16(1457)] {
            do {
                let listener = try NWListener(using: .tcp, on: NWEndpoint.Port(rawValue: port)!)
                let server = ChatGPTOAuthLoopbackServer(
                    listener: listener,
                    port: port,
                    expectedState: expectedState
                )
                server.start()
                return server
            } catch {
                continue
            }
        }

        throw ChatGPTOAuthError.callbackServerUnavailable
    }

    func waitForAuthorizationCode() async throws -> String {
        try await withTaskCancellationHandler {
            try await withThrowingTaskGroup(of: String.self) { group in
                group.addTask {
                    try await withCheckedThrowingContinuation { continuation in
                        self.lock.lock()
                        if let completedResult = self.completedResult {
                            self.lock.unlock()
                            switch completedResult {
                            case .success(let code):
                                continuation.resume(returning: code)
                            case .failure(let error):
                                continuation.resume(throwing: error)
                            }
                            return
                        }
                        self.continuation = continuation
                        self.lock.unlock()
                    }
                }

                group.addTask {
                    try await Task.sleep(nanoseconds: 15 * 60 * 1_000_000_000)
                    throw ChatGPTOAuthError.timeout
                }

                guard let code = try await group.next() else {
                    throw ChatGPTOAuthError.timeout
                }
                group.cancelAll()
                return code
            }
        } onCancel: {
            self.cancel()
        }
    }

    func submitCallbackURL(_ urlString: String, expectedState: String) {
        do {
            let code = try Self.authorizationCode(from: urlString, expectedState: expectedState)
            complete(.success(code))
        } catch {
            complete(.failure(error))
        }
    }

    func cancel() {
        listener.cancel()
        complete(.failure(ChatGPTOAuthError.cancelled))
    }

    private func start() {
        listener.newConnectionHandler = { [weak self] connection in
            self?.handle(connection)
        }
        listener.start(queue: queue)
    }

    private func handle(_ connection: NWConnection) {
        connection.start(queue: queue)
        connection.receive(minimumIncompleteLength: 1, maximumLength: 8_192) { [weak self] data, _, _, _ in
            guard let self else {
                connection.cancel()
                return
            }

            guard
                let data,
                let text = String(data: data, encoding: .utf8),
                let requestTarget = Self.requestTarget(from: text)
            else {
                Self.writeHTTPResponse(connection, status: 400, message: "Bad request")
                return
            }

            let callbackInput = Self.callbackInput(from: requestTarget)
            let path = URLComponents(string: callbackInput)?.path
            if path == "/auth/callback" {
                self.submitCallbackURL(callbackInput, expectedState: self.expectedState)
                Self.writeHTTPResponse(connection, status: 200, message: "Sign-in complete. Return to Chuchotage.")
            } else if path == "/cancel" {
                self.complete(.failure(ChatGPTOAuthError.cancelled))
                Self.writeHTTPResponse(connection, status: 200, message: "Sign-in cancelled.")
            } else {
                Self.writeHTTPResponse(connection, status: 404, message: "Not found")
            }
        }
    }

    private func complete(_ result: Result<String, Error>) {
        lock.lock()
        guard !isCompleted else {
            lock.unlock()
            return
        }
        isCompleted = true
        completedResult = result
        let continuation = continuation
        self.continuation = nil
        lock.unlock()

        listener.cancel()
        switch result {
        case .success(let code):
            continuation?.resume(returning: code)
        case .failure(let error):
            continuation?.resume(throwing: error)
        }
    }

    private static func requestTarget(from requestText: String) -> String? {
        requestText
            .components(separatedBy: "\r\n")
            .first?
            .split(separator: " ")
            .dropFirst()
            .first
            .map(String.init)
    }

    private static func callbackInput(from requestTarget: String) -> String {
        if requestTarget.hasPrefix("http://") || requestTarget.hasPrefix("https://") {
            return requestTarget
        }
        if requestTarget.hasPrefix("/") {
            return "http://localhost\(requestTarget)"
        }
        return "http://\(requestTarget)"
    }

    private static func authorizationCode(from input: String, expectedState: String) throws -> String {
        try ChatGPTOAuthClient.authorizationCodeFromCallbackInput(
            input,
            expectedState: expectedState
        )
    }

    private static func writeHTTPResponse(_ connection: NWConnection, status: Int, message: String) {
        let reason = (200..<300).contains(status) ? "OK" : "Error"
        let body = callbackResponseHTML(status: status, message: message)
        let response = "HTTP/1.1 \(status) \(reason)\r\n"
            + "Content-Type: text/html; charset=utf-8\r\n"
            + "Content-Length: \(Data(body.utf8).count)\r\n"
            + "Connection: close\r\n"
            + "\r\n"
            + body

        connection.send(content: Data(response.utf8), completion: .contentProcessed { _ in
            connection.cancel()
        })
    }

    private static func callbackResponseHTML(status: Int, message: String) -> String {
        let safeMessage = htmlEscape(message)
        let heading = (200..<300).contains(status) ? "Signed in" : "Sign-in issue"
        return """
        <!doctype html>
        <html lang="en">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>Chuchotage</title>
          <style>
            :root { color-scheme: dark; }
            body {
              margin: 0; min-height: 100vh; display: grid; place-items: center;
              padding: 28px; background: #02070C; color: #E8EDF1;
              font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            }
            main { max-width: 420px; text-align: center; }
            h1 { color: #F2E9DD; font-size: 2.6rem; letter-spacing: 0; }
            p { color: #A1ADB7; line-height: 1.5; }
          </style>
        </head>
        <body>
          <main>
            <p>Chuchotage</p>
            <h1>\(heading)</h1>
            <p>\(safeMessage)</p>
          </main>
        </body>
        </html>
        """
    }

    private static func htmlEscape(_ value: String) -> String {
        value
            .replacingOccurrences(of: "&", with: "&amp;")
            .replacingOccurrences(of: "<", with: "&lt;")
            .replacingOccurrences(of: ">", with: "&gt;")
            .replacingOccurrences(of: "\"", with: "&quot;")
            .replacingOccurrences(of: "'", with: "&#39;")
    }
}

private final class ChatGPTAuthenticationPresentationProvider: NSObject, ASWebAuthenticationPresentationContextProviding {
    func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
        #if os(iOS)
        let scene = UIApplication.shared.connectedScenes
            .compactMap { $0 as? UIWindowScene }
            .first { $0.activationState == .foregroundActive }
        return scene?.windows.first { $0.isKeyWindow } ?? ASPresentationAnchor()
        #elseif os(macOS)
        return NSApplication.shared.keyWindow
            ?? NSApplication.shared.mainWindow
            ?? ASPresentationAnchor()
        #else
        return ASPresentationAnchor()
        #endif
    }
}

enum ChatGPTOAuthError: LocalizedError, Equatable, Sendable {
    case browserUnavailable
    case callbackServerUnavailable
    case cancelled
    case loginAlreadyInProgress
    case reauthenticationRequired(String)
    case timeout
    case tokenRequestFailed(String)
    case unexpectedResponse(String)

    var errorDescription: String? {
        switch self {
        case .browserUnavailable:
            return L10n.string(
                "chatGPTSignIn.browserUnavailable",
                defaultValue: "Could not open a browser for ChatGPT sign-in."
            )
        case .callbackServerUnavailable:
            return L10n.string(
                "chatGPTSignIn.callbackServerUnavailable",
                defaultValue: "Could not start the local sign-in callback server. Try again."
            )
        case .cancelled:
            return L10n.string("chatGPTSignIn.cancelled", defaultValue: "Sign-in cancelled.")
        case .loginAlreadyInProgress:
            return L10n.string(
                "chatGPTSignIn.alreadyInProgress",
                defaultValue: "A ChatGPT sign-in is already in progress."
            )
        case .reauthenticationRequired(let message),
             .tokenRequestFailed(let message),
             .unexpectedResponse(let message):
            return message
        case .timeout:
            return L10n.string("chatGPTSignIn.timeout", defaultValue: "Sign-in timed out. Try signing in again.")
        }
    }
}
