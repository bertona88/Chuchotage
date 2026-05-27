import Foundation

final class RealtimeTranslationClientSecretProvider: @unchecked Sendable {
    private let urlSession: URLSession
    private let clientSecretURL: URL
    private let retryDelaysNanoseconds: [UInt64]
    private let sponsoredTrialClient: SponsoredTrialClient

    init(
        urlSession: URLSession = .shared,
        clientSecretURL: URL = URL(string: "https://api.openai.com/v1/realtime/translations/client_secrets")!,
        sponsoredTrialClient: SponsoredTrialClient = SponsoredTrialClient(),
        retryDelaysNanoseconds: [UInt64] = [
            250_000_000,
            500_000_000,
            1_000_000_000,
            2_000_000_000,
        ]
    ) {
        self.urlSession = urlSession
        self.clientSecretURL = clientSecretURL
        self.sponsoredTrialClient = sponsoredTrialClient
        self.retryDelaysNanoseconds = retryDelaysNanoseconds
    }

    func sessionBearerToken(
        for credential: OpenAICredential,
        targetLanguageCode: String = TranslationLanguages.defaultTargetLanguageCode,
        refreshCredentialAfterUnauthorized: @Sendable () async throws -> OpenAICredential? = { nil }
    ) async throws -> RealtimeTranslationSessionToken {
        let sanitizedLanguage = TranslationLanguages.sanitizeOutputLanguageCode(targetLanguageCode)

        switch credential.kind {
        case .apiKey:
            return RealtimeTranslationSessionToken(
                value: credential.value,
                shouldSendSessionUpdate: true
            )

        case .chatGPTAccessToken:
            let clientSecret = try await createClientSecretWithRefreshRetry(
                credential: credential,
                targetLanguageCode: sanitizedLanguage,
                refreshCredentialAfterUnauthorized: refreshCredentialAfterUnauthorized
            )
            return RealtimeTranslationSessionToken(
                value: clientSecret,
                shouldSendSessionUpdate: false
            )

        case .sponsoredTrial:
            do {
                return try await sponsoredTrialClient.sessionBearerTokenFor(
                    installID: credential.value,
                    targetLanguageCode: sanitizedLanguage,
                    // Keep original-speech transcript parity with iOS transcript panes.
                    sourceTranscriptEnabled: true
                )
            } catch let error as SponsoredTrialClientError {
                switch error {
                case .requestFailed(let message):
                    throw RealtimeTranslationClientSecretError.requestFailed(message)
                case .network(let message):
                    throw RealtimeTranslationClientSecretError.network(message)
                }
            } catch {
                throw RealtimeTranslationClientSecretError.requestFailed(
                    "Sponsored trial request failed."
                )
            }
        }
    }

    private func createClientSecretWithRefreshRetry(
        credential: OpenAICredential,
        targetLanguageCode: String,
        refreshCredentialAfterUnauthorized: @Sendable () async throws -> OpenAICredential?
    ) async throws -> String {
        do {
            return try await createClientSecret(
                accessToken: credential.value,
                targetLanguageCode: targetLanguageCode
            )
        } catch RealtimeTranslationClientSecretError.unauthorized {
            let refreshed = try await refreshCredentialAfterUnauthorized()
            guard
                let refreshed,
                refreshed.kind == .chatGPTAccessToken,
                !OpenAICredentialValidator.normalize(refreshed.value).isEmpty
            else {
                throw RealtimeTranslationClientSecretError.unauthorized
            }

            return try await createClientSecret(
                accessToken: OpenAICredentialValidator.normalize(refreshed.value),
                targetLanguageCode: targetLanguageCode
            )
        }
    }

    private func createClientSecret(
        accessToken: String,
        targetLanguageCode: String
    ) async throws -> String {
        var request = URLRequest(url: clientSecretURL)
        request.httpMethod = "POST"
        request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")
        request.setValue(OpenAIRequestHeaders.userAgent, forHTTPHeaderField: "User-Agent")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try RealtimeTranslationRequestBuilder.clientSecretRequestBody(
            targetLanguageCode: targetLanguageCode
        )

        return try await executeClientSecretRequestWithRetry(request)
    }

    private func executeClientSecretRequestWithRetry(_ request: URLRequest) async throws -> String {
        for attempt in retryDelaysNanoseconds.indices {
            do {
                let (data, response) = try await urlSession.data(for: request)
                guard let httpResponse = response as? HTTPURLResponse else {
                    throw RealtimeTranslationClientSecretError.requestFailed(
                        "OpenAI returned an invalid response."
                    )
                }

                let text = String(data: data, encoding: .utf8) ?? ""
                let payload = parseJsonObject(data)

                switch httpResponse.statusCode {
                case 200..<300:
                    if let value = payload?["value"] as? String, !value.isEmpty {
                        return value
                    }
                    throw RealtimeTranslationClientSecretError.requestFailed(
                        "OpenAI did not return a translation client secret."
                    )

                case 401:
                    throw RealtimeTranslationClientSecretError.unauthorized

                case 429, 500...599:
                    if attempt < retryDelaysNanoseconds.index(before: retryDelaysNanoseconds.endIndex) {
                        try await Task.sleep(nanoseconds: retryDelaysNanoseconds[attempt])
                        continue
                    }
                    throw RealtimeTranslationClientSecretError.requestFailed(
                        "Could not create a translation client secret. Check the network and try again."
                    )

                default:
                    throw RealtimeTranslationClientSecretError.requestFailed(
                        errorMessage(from: payload, fallbackText: text)
                    )
                }
            } catch let error as RealtimeTranslationClientSecretError {
                throw error
            } catch let error as URLError {
                if isRetryableNetworkError(error),
                   attempt < retryDelaysNanoseconds.index(before: retryDelaysNanoseconds.endIndex) {
                    try await Task.sleep(nanoseconds: retryDelaysNanoseconds[attempt])
                    continue
                }
                throw RealtimeTranslationClientSecretError.network(networkMessage(for: error))
            }
        }

        throw RealtimeTranslationClientSecretError.requestFailed(
            "Failed to create translation client secret."
        )
    }

    private func parseJsonObject(_ data: Data) -> [String: Any]? {
        try? JSONSerialization.jsonObject(with: data) as? [String: Any]
    }

    private func errorMessage(from payload: [String: Any]?, fallbackText: String) -> String {
        if
            let error = payload?["error"] as? [String: Any],
            let message = error["message"] as? String,
            !message.isEmpty
        {
            return message
        }

        if let message = payload?["error"] as? String, !message.isEmpty {
            return message
        }

        return fallbackText.isEmpty ? "Failed to create translation client secret." : fallbackText
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
                "network.resolveOpenAI",
                defaultValue: "Could not resolve api.openai.com. Check VPN, DNS, or network settings and try again."
            )
        default:
            return L10n.string(
                "network.reachOpenAI",
                defaultValue: "Could not reach api.openai.com. Check the network and try again."
            )
        }
    }
}

enum RealtimeTranslationClientSecretError: LocalizedError, Sendable {
    case unauthorized
    case requestFailed(String)
    case network(String)

    var errorDescription: String? {
        switch self {
        case .unauthorized:
            return L10n.string("chatGPTSignIn.expired", defaultValue: "ChatGPT sign-in expired. Sign in again.")
        case .requestFailed(let message), .network(let message):
            return message
        }
    }
}
