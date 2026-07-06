import Foundation
import XCTest
@testable import Chuchotage

final class SponsoredTrialClientTests: XCTestCase {
    override func tearDown() {
        super.tearDown()
        URLProtocolStub.reset()
    }

    func testCreatesSessionTokenFromSponsoredTrialEndpoint() async throws {
        let (session, cleanupSession) = makeStubSession()
        defer { cleanupSession() }

        URLProtocolStub.setHandler { request in
            let response = HTTPURLResponse(
                url: try XCTUnwrap(request.url),
                statusCode: 200,
                httpVersion: nil,
                headerFields: nil
            )!
            return (response, Data(#"{"value":"trial-client-secret"}"#.utf8))
        }

        let client = SponsoredTrialClient(
            urlSession: session,
            clientSecretURL: URL(string: "https://www.chuchotage.ai/api/trial/realtime-translation-client-secret")!,
            retryDelaysNanoseconds: [0]
        )

        let token = try await client.sessionBearerTokenFor(
            installID: "123e4567-e89b-12d3-a456-426614174000",
            targetLanguageCode: "ja"
        )

        let request = try XCTUnwrap(URLProtocolStub.lastRequest())
        let bodyData = try XCTUnwrap(httpBodyData(from: request))
        let body = try parseJsonObject(bodyData)

        XCTAssertEqual(token.value, "trial-client-secret")
        XCTAssertFalse(token.shouldSendSessionUpdate)
        XCTAssertEqual(token.credentialKind, .sponsoredTrial)
        XCTAssertEqual(request.httpMethod, "POST")
        XCTAssertEqual(
            request.value(forHTTPHeaderField: "Content-Type"),
            "application/json"
        )
        XCTAssertEqual(body["installation_id"] as? String, "123e4567-e89b-12d3-a456-426614174000")
        XCTAssertEqual(body["target_language"] as? String, "ja")
        XCTAssertEqual(body["source_transcript_enabled"] as? Bool, false)
    }

    func testCanRequestSourceTranscriptForSponsoredTrial() async throws {
        let (session, cleanupSession) = makeStubSession()
        defer { cleanupSession() }

        URLProtocolStub.setHandler { request in
            let response = HTTPURLResponse(
                url: try XCTUnwrap(request.url),
                statusCode: 200,
                httpVersion: nil,
                headerFields: nil
            )!
            return (response, Data(#"{"value":"trial-client-secret"}"#.utf8))
        }

        let client = SponsoredTrialClient(
            urlSession: session,
            clientSecretURL: URL(string: "https://www.chuchotage.ai/api/trial/realtime-translation-client-secret")!,
            retryDelaysNanoseconds: [0]
        )

        _ = try await client.sessionBearerTokenFor(
            installID: "123e4567-e89b-12d3-a456-426614174000",
            targetLanguageCode: "ja",
            sourceTranscriptEnabled: true
        )

        let request = try XCTUnwrap(URLProtocolStub.lastRequest())
        let bodyData = try XCTUnwrap(httpBodyData(from: request))
        let body = try parseJsonObject(bodyData)
        XCTAssertEqual(body["source_transcript_enabled"] as? Bool, true)
    }

    func testRateLimitUsesActionableErrorMessage() async throws {
        let (session, cleanupSession) = makeStubSession()
        defer { cleanupSession() }

        URLProtocolStub.setHandler { request in
            let response = HTTPURLResponse(
                url: try XCTUnwrap(request.url),
                statusCode: 429,
                httpVersion: nil,
                headerFields: nil
            )!
            return (
                response,
                Data(#"{"message":"Chuchotage translation access is busy right now. Try again shortly."}"#.utf8)
            )
        }

        let client = SponsoredTrialClient(
            urlSession: session,
            clientSecretURL: URL(string: "https://www.chuchotage.ai/api/trial/realtime-translation-client-secret")!,
            retryDelaysNanoseconds: [0]
        )

        do {
            _ = try await client.sessionBearerTokenFor(
                installID: "123e4567-e89b-12d3-a456-426614174000",
                targetLanguageCode: "ja"
            )
            XCTFail("Expected sponsored trial limit request to throw.")
        } catch let error as SponsoredTrialClientError {
            switch error {
            case .requestFailed(let message):
                XCTAssertTrue(message.contains("Chuchotage translation access is busy"))
            case .network:
                XCTFail("Expected requestFailed error for 429 response.")
            }
        }
    }

    func testDnsNetworkFailureUsesAndroidParityMessage() async throws {
        let (session, cleanupSession) = makeStubSession()
        defer { cleanupSession() }

        URLProtocolStub.setHandler { _ in
            throw URLError(.dnsLookupFailed)
        }

        let client = SponsoredTrialClient(
            urlSession: session,
            clientSecretURL: URL(string: "https://www.chuchotage.ai/api/trial/realtime-translation-client-secret")!,
            retryDelaysNanoseconds: [0]
        )

        do {
            _ = try await client.sessionBearerTokenFor(
                installID: "123e4567-e89b-12d3-a456-426614174000",
                targetLanguageCode: "ja"
            )
            XCTFail("Expected DNS failure to throw.")
        } catch let error as SponsoredTrialClientError {
            switch error {
            case .network(let message):
                XCTAssertTrue(message.contains("Could not resolve chuchotage.ai"))
            case .requestFailed:
                XCTFail("Expected network error for DNS failure.")
            }
        }
    }

    func testRealtimeProviderUsesSponsoredTrialClientAndDisablesSessionUpdate() async throws {
        let (session, cleanupSession) = makeStubSession()
        defer { cleanupSession() }

        URLProtocolStub.setHandler { request in
            let response = HTTPURLResponse(
                url: try XCTUnwrap(request.url),
                statusCode: 200,
                httpVersion: nil,
                headerFields: nil
            )!
            return (response, Data(#"{"value":"trial-client-secret-provider"}"#.utf8))
        }

        let sponsoredClient = SponsoredTrialClient(
            urlSession: session,
            clientSecretURL: URL(string: "https://www.chuchotage.ai/api/trial/realtime-translation-client-secret")!,
            retryDelaysNanoseconds: [0]
        )
        let provider = RealtimeTranslationClientSecretProvider(
            sponsoredTrialClient: sponsoredClient
        )

        let token = try await provider.sessionBearerToken(
            for: OpenAICredential(
                kind: .sponsoredTrial,
                value: "123e4567-e89b-12d3-a456-426614174000"
            ),
            targetLanguageCode: "it"
        )
        let request = try XCTUnwrap(URLProtocolStub.lastRequest())
        let bodyData = try XCTUnwrap(httpBodyData(from: request))
        let body = try parseJsonObject(bodyData)

        XCTAssertEqual(token.value, "trial-client-secret-provider")
        XCTAssertFalse(token.shouldSendSessionUpdate)
        XCTAssertEqual(token.credentialKind, .sponsoredTrial)
        XCTAssertEqual(body["target_language"] as? String, "it")
        XCTAssertEqual(body["source_transcript_enabled"] as? Bool, true)
    }

    private func makeStubSession() -> (URLSession, () -> Void) {
        let configuration = URLSessionConfiguration.ephemeral
        configuration.protocolClasses = [URLProtocolStub.self]
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
}

private final class URLProtocolStub: URLProtocol, @unchecked Sendable {
    typealias Handler = @Sendable (URLRequest) throws -> (HTTPURLResponse, Data)

    private static let lock = NSLock()
    nonisolated(unsafe) private static var handler: Handler?
    nonisolated(unsafe) private static var capturedRequest: URLRequest?

    static func setHandler(_ handler: @escaping Handler) {
        lock.withLock {
            self.handler = handler
            capturedRequest = nil
        }
    }

    static func lastRequest() -> URLRequest? {
        lock.withLock { capturedRequest }
    }

    static func reset() {
        lock.withLock {
            handler = nil
            capturedRequest = nil
        }
    }

    override class func canInit(with request: URLRequest) -> Bool {
        true
    }

    override class func canonicalRequest(for request: URLRequest) -> URLRequest {
        request
    }

    override func startLoading() {
        let handler = Self.lock.withLock { Self.handler }
        guard let handler else {
            client?.urlProtocol(self, didFailWithError: URLError(.unsupportedURL))
            return
        }

        do {
            let (response, data) = try handler(request)
            Self.lock.withLock {
                Self.capturedRequest = request
            }
            client?.urlProtocol(self, didReceive: response, cacheStoragePolicy: .notAllowed)
            client?.urlProtocol(self, didLoad: data)
            client?.urlProtocolDidFinishLoading(self)
        } catch {
            client?.urlProtocol(self, didFailWithError: error)
        }
    }

    override func stopLoading() {}
}
