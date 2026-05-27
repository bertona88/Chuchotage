import Foundation

final class SponsoredTrialClient: @unchecked Sendable {
    private let urlSession: URLSession
    private let clientSecretURL: URL
    private let retryDelaysNanoseconds: [UInt64]

    init(
        urlSession: URLSession = .shared,
        clientSecretURL: URL = URL(string: "https://www.chuchotage.ai/api/trial/realtime-translation-client-secret")!,
        retryDelaysNanoseconds: [UInt64] = [
            250_000_000,
            500_000_000,
            1_000_000_000,
            2_000_000_000,
        ]
    ) {
        self.urlSession = urlSession
        self.clientSecretURL = clientSecretURL
        self.retryDelaysNanoseconds = retryDelaysNanoseconds
    }

    func sessionBearerTokenFor(
        installID: String,
        targetLanguageCode: String = TranslationLanguages.defaultTargetLanguageCode,
        sourceTranscriptEnabled: Bool = false
    ) async throws -> RealtimeTranslationSessionToken {
        let clientSecret = try await createClientSecret(
            installID: installID,
            targetLanguageCode: TranslationLanguages.sanitizeOutputLanguageCode(targetLanguageCode),
            sourceTranscriptEnabled: sourceTranscriptEnabled
        )

        return RealtimeTranslationSessionToken(
            value: clientSecret,
            shouldSendSessionUpdate: false
        )
    }

    private func createClientSecret(
        installID: String,
        targetLanguageCode: String,
        sourceTranscriptEnabled: Bool
    ) async throws -> String {
        var request = URLRequest(url: clientSecretURL)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONSerialization.data(withJSONObject: [
            "installation_id": installID,
            "target_language": targetLanguageCode,
            "source_transcript_enabled": sourceTranscriptEnabled,
        ])

        return try await executeClientSecretRequestWithRetry(request)
    }

    private func executeClientSecretRequestWithRetry(_ request: URLRequest) async throws -> String {
        for attempt in retryDelaysNanoseconds.indices {
            do {
                let (data, response) = try await urlSession.data(for: request)
                guard let httpResponse = response as? HTTPURLResponse else {
                    throw SponsoredTrialClientError.requestFailed(
                        "Chuchotage returned an invalid response."
                    )
                }

                let text = String(data: data, encoding: .utf8) ?? ""
                let payload = parseJsonObject(data)

                switch httpResponse.statusCode {
                case 200..<300:
                    if let value = payload?["value"] as? String, !value.isEmpty {
                        return value
                    }
                    throw SponsoredTrialClientError.requestFailed(
                        "Chuchotage did not return a trial translation token."
                    )

                case 429:
                    throw SponsoredTrialClientError.requestFailed(
                        message(from: payload)
                            ?? "Sponsored trial limit reached. Sign in with ChatGPT or use an API key to continue."
                    )

                case 403:
                    throw SponsoredTrialClientError.requestFailed(
                        message(from: payload)
                            ?? "Sponsored trial is not available right now."
                    )

                case 503:
                    throw SponsoredTrialClientError.requestFailed(
                        "Sponsored trial is not available right now. Sign in with ChatGPT or use an API key to continue."
                    )

                case 500...599:
                    if attempt < retryDelaysNanoseconds.index(before: retryDelaysNanoseconds.endIndex) {
                        try await Task.sleep(nanoseconds: retryDelaysNanoseconds[attempt])
                        continue
                    }
                    throw SponsoredTrialClientError.requestFailed(
                        "Could not start sponsored trial. Check the phone's network and try again."
                    )

                default:
                    throw SponsoredTrialClientError.requestFailed(
                        errorMessage(from: payload, fallbackText: text)
                    )
                }
            } catch let error as SponsoredTrialClientError {
                throw error
            } catch let error as URLError {
                if isRetryableNetworkError(error),
                   attempt < retryDelaysNanoseconds.index(before: retryDelaysNanoseconds.endIndex) {
                    try await Task.sleep(nanoseconds: retryDelaysNanoseconds[attempt])
                    continue
                }
                throw SponsoredTrialClientError.network(networkMessage(for: error))
            }
        }

        throw SponsoredTrialClientError.requestFailed("Sponsored trial request failed.")
    }

    private func parseJsonObject(_ data: Data) -> [String: Any]? {
        try? JSONSerialization.jsonObject(with: data) as? [String: Any]
    }

    private func message(from payload: [String: Any]?) -> String? {
        if let message = payload?["message"] as? String, !message.isEmpty {
            return message
        }
        return nil
    }

    private func errorMessage(from payload: [String: Any]?, fallbackText: String) -> String {
        message(from: payload)
            ?? (payload?["error"] as? String)
            ?? (fallbackText.isEmpty ? "Sponsored trial request failed." : fallbackText)
    }

    private func isRetryableNetworkError(_ error: URLError) -> Bool {
        switch error.code {
        case .cannotFindHost,
             .dnsLookupFailed,
             .timedOut,
             .cannotConnectToHost,
             .networkConnectionLost,
             .notConnectedToInternet:
            return true
        default:
            return false
        }
    }

    private func networkMessage(for error: URLError) -> String {
        switch error.code {
        case .cannotFindHost, .dnsLookupFailed:
            return L10n.string(
                "network.resolveChuchotage",
                defaultValue: "Could not resolve chuchotage.ai. Check the phone's VPN, private DNS, or network and try again."
            )
        default:
            return L10n.string(
                "network.reachChuchotage",
                defaultValue: "Could not reach chuchotage.ai. Check the phone's network and try again."
            )
        }
    }
}

enum SponsoredTrialClientError: LocalizedError, Sendable {
    case requestFailed(String)
    case network(String)

    var errorDescription: String? {
        switch self {
        case .requestFailed(let message), .network(let message):
            return message
        }
    }
}
