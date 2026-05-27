import Foundation
import XCTest
@testable import Chuchotage

final class ChatGPTOAuthClientTests: XCTestCase {
    override func tearDown() {
        super.tearDown()
        OAuthURLProtocolStub.reset()
    }

    func testCallbackInputParsesAuthorizationCode() throws {
        let code = try ChatGPTOAuthClient.authorizationCodeFromCallbackInput(
            "http://localhost:1455/auth/callback?code=ac_example.abc&state=expected",
            expectedState: "expected"
        )

        XCTAssertEqual(code, "ac_example.abc")
    }

    func testCallbackInputParsesRequestTarget() throws {
        let code = try ChatGPTOAuthClient.authorizationCodeFromCallbackInput(
            "/auth/callback?code=ac_example.abc&state=expected",
            expectedState: "expected"
        )

        XCTAssertEqual(code, "ac_example.abc")
    }

    func testCallbackInputParsesBareLocalhostURL() throws {
        let code = try ChatGPTOAuthClient.authorizationCodeFromCallbackInput(
            "localhost:1455/auth/callback?code=ac_example.abc&state=expected",
            expectedState: "expected"
        )

        XCTAssertEqual(code, "ac_example.abc")
    }

    func testCallbackInputRejectsWrongState() throws {
        XCTAssertThrowsError(
            try ChatGPTOAuthClient.authorizationCodeFromCallbackInput(
                "http://localhost:1455/auth/callback?code=ac_example.abc&state=other",
                expectedState: "expected"
            )
        )
    }

    func testCallbackInputRejectsOAuthError() throws {
        XCTAssertThrowsError(
            try ChatGPTOAuthClient.authorizationCodeFromCallbackInput(
                "http://localhost:1455/auth/callback?error=access_denied&error_description=Nope&state=expected",
                expectedState: "expected"
            )
        ) { error in
            XCTAssertEqual(error.localizedDescription, "Nope")
        }
    }

    func testRefreshIfNeededBuildsRefreshTokenRequest() async throws {
        let (session, cleanupSession) = makeStubSession()
        defer { cleanupSession() }

        OAuthURLProtocolStub.setHandler { request in
            let response = HTTPURLResponse(
                url: try XCTUnwrap(request.url),
                statusCode: 200,
                httpVersion: nil,
                headerFields: nil
            )!
            return (
                response,
                Data(
                    #"{"access_token":"new-access-token","refresh_token":"new-refresh-token","id_token":"new-id-token"}"#.utf8
                )
            )
        }

        let client = ChatGPTOAuthClient(
            urlSession: session,
            authIssuer: URL(string: "https://auth.openai.com")!,
            retryDelaysNanoseconds: [0]
        )

        let credential = OpenAICredential(
            kind: .chatGPTAccessToken,
            value: "old-access-token",
            idToken: "old-id-token",
            refreshToken: "old-refresh-token",
            lastRefreshEpochSeconds: nowEpochSeconds() - (9 * 24 * 60 * 60)
        )

        let refreshed = try await client.refreshIfNeeded(credential: credential)
        let request = try XCTUnwrap(OAuthURLProtocolStub.lastRequest())
        let body = try parseJsonObject(try XCTUnwrap(httpBodyData(from: request)))

        XCTAssertEqual(request.url?.absoluteString, "https://auth.openai.com/oauth/token")
        XCTAssertEqual(request.httpMethod, "POST")
        XCTAssertEqual(request.value(forHTTPHeaderField: "Content-Type"), "application/json")
        XCTAssertEqual(body["client_id"] as? String, "app_EMoamEEZ73f0CkXaXp7hrann")
        XCTAssertEqual(body["grant_type"] as? String, "refresh_token")
        XCTAssertEqual(body["refresh_token"] as? String, "old-refresh-token")
        XCTAssertEqual(refreshed.value, "new-access-token")
        XCTAssertEqual(refreshed.refreshToken, "new-refresh-token")
        XCTAssertEqual(refreshed.idToken, "new-id-token")
    }

    func testRefreshIfNeededSkipsNetworkWhenCredentialIsFresh() async throws {
        let (session, cleanupSession) = makeStubSession()
        defer { cleanupSession() }

        OAuthURLProtocolStub.setHandler { _ in
            XCTFail("Refresh should not hit network for fresh credential.")
            throw URLError(.badServerResponse)
        }

        let client = ChatGPTOAuthClient(
            urlSession: session,
            retryDelaysNanoseconds: [0]
        )

        let credential = OpenAICredential(
            kind: .chatGPTAccessToken,
            value: "not-a-jwt-access-token",
            idToken: nil,
            refreshToken: "refresh-token",
            lastRefreshEpochSeconds: nowEpochSeconds()
        )

        let refreshed = try await client.refreshIfNeeded(credential: credential)

        XCTAssertEqual(refreshed, credential)
        XCTAssertEqual(OAuthURLProtocolStub.requestCount(), 0)
    }

    func testRefreshIfNeededUsesJwtExpirySignal() async throws {
        let (session, cleanupSession) = makeStubSession()
        defer { cleanupSession() }

        OAuthURLProtocolStub.setHandler { request in
            let response = HTTPURLResponse(
                url: try XCTUnwrap(request.url),
                statusCode: 200,
                httpVersion: nil,
                headerFields: nil
            )!
            return (
                response,
                Data(#"{"access_token":"refreshed-jwt"}"#.utf8)
            )
        }

        let client = ChatGPTOAuthClient(
            urlSession: session,
            retryDelaysNanoseconds: [0]
        )

        let expiringToken = makeUnsignedJWT(
            exp: nowEpochSeconds() + 30
        )
        let credential = OpenAICredential(
            kind: .chatGPTAccessToken,
            value: expiringToken,
            idToken: nil,
            refreshToken: "refresh-token",
            lastRefreshEpochSeconds: nowEpochSeconds()
        )

        let refreshed = try await client.refreshIfNeeded(credential: credential)

        XCTAssertEqual(OAuthURLProtocolStub.requestCount(), 1)
        XCTAssertEqual(refreshed.value, "refreshed-jwt")
    }

    func testRefreshInvalidGrantAsksUserToSignInAgain() async throws {
        let (session, cleanupSession) = makeStubSession()
        defer { cleanupSession() }

        OAuthURLProtocolStub.setHandler { request in
            let response = HTTPURLResponse(
                url: try XCTUnwrap(request.url),
                statusCode: 400,
                httpVersion: nil,
                headerFields: nil
            )!
            return (response, Data(#"{"error":"invalid_grant"}"#.utf8))
        }

        let client = ChatGPTOAuthClient(
            urlSession: session,
            retryDelaysNanoseconds: [0]
        )

        let credential = OpenAICredential(
            kind: .chatGPTAccessToken,
            value: "old-access-token",
            refreshToken: "refresh-token",
            lastRefreshEpochSeconds: nowEpochSeconds() - (9 * 24 * 60 * 60)
        )

        do {
            _ = try await client.refreshIfNeeded(credential: credential)
            XCTFail("Expected invalid grant to require reauthentication.")
        } catch let error as ChatGPTOAuthError {
            switch error {
            case .reauthenticationRequired(let message):
                XCTAssertEqual(message, "Your ChatGPT sign-in expired. Sign in again.")
            default:
                XCTFail("Expected reauthenticationRequired, got \(error).")
            }
        }
    }

    func testClientSecretProviderApiKeyAndChatGPTSessionUpdateModes() async throws {
        let (session, cleanupSession) = makeStubSession()
        defer { cleanupSession() }

        OAuthURLProtocolStub.setHandler { request in
            let response = HTTPURLResponse(
                url: try XCTUnwrap(request.url),
                statusCode: 200,
                httpVersion: nil,
                headerFields: nil
            )!
            return (response, Data(#"{"value":"chatgpt-client-secret"}"#.utf8))
        }

        let provider = RealtimeTranslationClientSecretProvider(
            urlSession: session,
            retryDelaysNanoseconds: [0]
        )

        let apiKeyToken = try await provider.sessionBearerToken(
            for: OpenAICredential(kind: .apiKey, value: "sk-test-12345678901234567890")
        )
        XCTAssertEqual(apiKeyToken.value, "sk-test-12345678901234567890")
        XCTAssertTrue(apiKeyToken.shouldSendSessionUpdate)

        let chatGPTToken = try await provider.sessionBearerToken(
            for: OpenAICredential(
                kind: .chatGPTAccessToken,
                value: "chatgpt-access-token"
            ),
            targetLanguageCode: "xx"
        )
        let request = try XCTUnwrap(OAuthURLProtocolStub.lastRequest())
        let body = try parseJsonObject(try XCTUnwrap(httpBodyData(from: request)))
        let sessionObject = try XCTUnwrap(body["session"] as? [String: Any])
        let audio = try XCTUnwrap(sessionObject["audio"] as? [String: Any])
        let output = try XCTUnwrap(audio["output"] as? [String: Any])

        XCTAssertEqual(chatGPTToken.value, "chatgpt-client-secret")
        XCTAssertFalse(chatGPTToken.shouldSendSessionUpdate)
        XCTAssertEqual(request.value(forHTTPHeaderField: "User-Agent"), OpenAIRequestHeaders.userAgent)
        XCTAssertEqual(output["language"] as? String, "en")
    }

    func testClientSecretProviderRetriesAfterUnauthorizedWithRefreshedCredential() async throws {
        let (session, cleanupSession) = makeStubSession()
        defer { cleanupSession() }

        OAuthURLProtocolStub.setSequentialHandlers([
            { request in
                let response = HTTPURLResponse(
                    url: try XCTUnwrap(request.url),
                    statusCode: 401,
                    httpVersion: nil,
                    headerFields: nil
                )!
                return (response, Data(#"{"error":{"message":"expired"}}"#.utf8))
            },
            { request in
                let response = HTTPURLResponse(
                    url: try XCTUnwrap(request.url),
                    statusCode: 200,
                    httpVersion: nil,
                    headerFields: nil
                )!
                return (response, Data(#"{"value":"fresh-client-secret"}"#.utf8))
            },
        ])

        let provider = RealtimeTranslationClientSecretProvider(
            urlSession: session,
            retryDelaysNanoseconds: [0]
        )

        let refreshCallCounter = RefreshCallCounter()
        let token = try await provider.sessionBearerToken(
            for: OpenAICredential(
                kind: .chatGPTAccessToken,
                value: "old-access-token",
                refreshToken: "refresh-token"
            ),
            targetLanguageCode: "it",
            refreshCredentialAfterUnauthorized: {
                await refreshCallCounter.increment()
                return OpenAICredential(
                    kind: .chatGPTAccessToken,
                    value: "refreshed-access-token",
                    refreshToken: "refresh-token"
                )
            }
        )

        let authorizationHeaders = OAuthURLProtocolStub.allAuthorizationHeaders()

        let refreshCallCount = await refreshCallCounter.current()
        XCTAssertEqual(refreshCallCount, 1)
        XCTAssertEqual(token.value, "fresh-client-secret")
        XCTAssertFalse(token.shouldSendSessionUpdate)
        XCTAssertEqual(authorizationHeaders, [
            "Bearer old-access-token",
            "Bearer refreshed-access-token",
        ])
    }

    private func makeStubSession() -> (URLSession, () -> Void) {
        let configuration = URLSessionConfiguration.ephemeral
        configuration.protocolClasses = [OAuthURLProtocolStub.self]
        let session = URLSession(configuration: configuration)
        return (session, { session.invalidateAndCancel() })
    }

    private func parseJsonObject(_ data: Data) throws -> [String: Any] {
        try XCTUnwrap(JSONSerialization.jsonObject(with: data) as? [String: Any])
    }

    private func httpBodyData(from request: URLRequest) -> Data? {
        if let body = request.httpBody {
            return body
        }

        guard let stream = request.httpBodyStream else {
            return nil
        }

        stream.open()
        defer { stream.close() }

        var data = Data()
        let bufferSize = 1_024
        let buffer = UnsafeMutablePointer<UInt8>.allocate(capacity: bufferSize)
        defer { buffer.deallocate() }

        while stream.hasBytesAvailable {
            let bytesRead = stream.read(buffer, maxLength: bufferSize)
            if bytesRead > 0 {
                data.append(buffer, count: bytesRead)
            } else {
                break
            }
        }

        return data.isEmpty ? nil : data
    }

    private func nowEpochSeconds() -> Int64 {
        Int64(Date().timeIntervalSince1970)
    }

    private func makeUnsignedJWT(exp: Int64) -> String {
        let header = #"{"alg":"none","typ":"JWT"}"#
        let payload = #"{"exp":\#(exp)}"#
        let headerPart = Data(header.utf8).base64EncodedString()
            .replacingOccurrences(of: "+", with: "-")
            .replacingOccurrences(of: "/", with: "_")
            .replacingOccurrences(of: "=", with: "")
        let payloadPart = Data(payload.utf8).base64EncodedString()
            .replacingOccurrences(of: "+", with: "-")
            .replacingOccurrences(of: "/", with: "_")
            .replacingOccurrences(of: "=", with: "")
        return "\(headerPart).\(payloadPart).signature"
    }
}

private actor RefreshCallCounter {
    private var count = 0

    func increment() {
        count += 1
    }

    func current() -> Int {
        count
    }
}

private final class OAuthURLProtocolStub: URLProtocol, @unchecked Sendable {
    typealias Handler = @Sendable (URLRequest) throws -> (HTTPURLResponse, Data)

    private static let lock = NSLock()
    nonisolated(unsafe) private static var handler: Handler?
    nonisolated(unsafe) private static var handlerQueue: [Handler] = []
    nonisolated(unsafe) private static var capturedRequests: [URLRequest] = []

    static func setHandler(_ handler: @escaping Handler) {
        lock.withLock {
            self.handler = handler
            self.handlerQueue = []
            self.capturedRequests = []
        }
    }

    static func setSequentialHandlers(_ handlers: [Handler]) {
        lock.withLock {
            self.handler = nil
            self.handlerQueue = handlers
            self.capturedRequests = []
        }
    }

    static func lastRequest() -> URLRequest? {
        lock.withLock { capturedRequests.last }
    }

    static func requestCount() -> Int {
        lock.withLock { capturedRequests.count }
    }

    static func allAuthorizationHeaders() -> [String] {
        lock.withLock {
            capturedRequests.compactMap { $0.value(forHTTPHeaderField: "Authorization") }
        }
    }

    static func reset() {
        lock.withLock {
            handler = nil
            handlerQueue = []
            capturedRequests = []
        }
    }

    override class func canInit(with request: URLRequest) -> Bool {
        true
    }

    override class func canonicalRequest(for request: URLRequest) -> URLRequest {
        request
    }

    override func startLoading() {
        let selectedHandler: Handler? = Self.lock.withLock {
            Self.capturedRequests.append(request)
            if !Self.handlerQueue.isEmpty {
                return Self.handlerQueue.removeFirst()
            }
            return Self.handler
        }

        guard let selectedHandler else {
            client?.urlProtocol(self, didFailWithError: URLError(.unsupportedURL))
            return
        }

        do {
            let (response, data) = try selectedHandler(request)
            client?.urlProtocol(self, didReceive: response, cacheStoragePolicy: .notAllowed)
            client?.urlProtocol(self, didLoad: data)
            client?.urlProtocolDidFinishLoading(self)
        } catch {
            client?.urlProtocol(self, didFailWithError: error)
        }
    }

    override func stopLoading() {}
}
