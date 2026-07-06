import Foundation

struct OpenAICredential: Codable, Equatable, Sendable {
    let kind: OpenAICredentialKind
    let value: String
    let idToken: String?
    let refreshToken: String?
    let lastRefreshEpochSeconds: Int64?

    init(
        kind: OpenAICredentialKind,
        value: String,
        idToken: String? = nil,
        refreshToken: String? = nil,
        lastRefreshEpochSeconds: Int64? = nil
    ) {
        self.kind = kind
        self.value = value
        self.idToken = idToken
        self.refreshToken = refreshToken
        self.lastRefreshEpochSeconds = lastRefreshEpochSeconds
    }
}

enum OpenAICredentialKind: String, Codable, Sendable {
    case apiKey = "api_key"
    case chatGPTAccessToken = "chatgpt_access_token"
    case sponsoredTrial = "sponsored_trial"

    static func fromStorage(_ value: String?) -> OpenAICredentialKind {
        OpenAICredentialKind(rawValue: value ?? "") ?? .apiKey
    }
}

struct OpenAICredentialStatus: Equatable, Sendable {
    let hasCredential: Bool
    let kind: OpenAICredentialKind?

    static let missing = OpenAICredentialStatus(hasCredential: false, kind: nil)

    static func available(kind: OpenAICredentialKind?) -> OpenAICredentialStatus {
        OpenAICredentialStatus(hasCredential: true, kind: kind)
    }
}

enum OpenAICredentialValidator {
    private static let sponsoredTrialInstallIDRegex = try! NSRegularExpression(
        pattern: #"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$"#
    )

    static func normalize(_ value: String) -> String {
        value.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    static func isPlausibleApiKey(_ value: String) -> Bool {
        let key = normalize(value)
        return key.hasPrefix("sk-") && key.count >= 20 && !key.contains(where: { $0.isWhitespace })
    }

    static func isPlausibleChatGPTAccessToken(_ value: String) -> Bool {
        let token = normalize(value)
        return token.count >= 20
            && !token.contains(where: { $0.isWhitespace })
            && !isPlausibleApiKey(token)
    }

    static func isPlausibleSponsoredTrialInstallID(_ value: String) -> Bool {
        let installID = normalize(value)
        let range = NSRange(installID.startIndex..<installID.endIndex, in: installID)
        return sponsoredTrialInstallIDRegex.firstMatch(in: installID, range: range) != nil
    }

    static func isPlausible(_ credential: OpenAICredential) -> Bool {
        switch credential.kind {
        case .apiKey:
            return isPlausibleApiKey(credential.value)
        case .chatGPTAccessToken:
            return isPlausibleChatGPTAccessToken(credential.value)
        case .sponsoredTrial:
            return isPlausibleSponsoredTrialInstallID(credential.value)
        }
    }
}

protocol OpenAICredentialStoring: Sendable {
    func loadCredentialStatus() async throws -> OpenAICredentialStatus
    func loadCredential() async throws -> OpenAICredential?
    func saveCredential(_ credential: OpenAICredential) async throws
    func clearCredential() async throws
}

extension OpenAICredentialStoring {
    func loadCredentialStatus() async throws -> OpenAICredentialStatus {
        guard let credential = try await loadCredential() else {
            return .missing
        }
        return .available(kind: credential.kind)
    }

    func loadCredentialReplacingLegacyClientCredential() async throws -> OpenAICredential? {
        guard let credential = try await loadCredential() else {
            return nil
        }
        guard credential.kind == .chatGPTAccessToken else {
            return credential
        }

        let includedAccessCredential = OpenAICredential(
            kind: .sponsoredTrial,
            value: UUID().uuidString.lowercased()
        )
        try await saveCredential(includedAccessCredential)
        return includedAccessCredential
    }

    func loadCredentialStatusReplacingLegacyClientCredential() async throws -> OpenAICredentialStatus {
        let status = try await loadCredentialStatus()
        guard status.kind == .chatGPTAccessToken else {
            return status
        }

        return try await loadCredentialReplacingLegacyClientCredential()
            .map { .available(kind: $0.kind) }
            ?? .missing
    }
}

struct EmptyOpenAICredentialStore: OpenAICredentialStoring {
    func loadCredentialStatus() async throws -> OpenAICredentialStatus {
        .missing
    }

    func loadCredential() async throws -> OpenAICredential? {
        nil
    }

    func saveCredential(_ credential: OpenAICredential) async throws {
        throw TranslationRuntimeError.missingCredential
    }

    func clearCredential() async throws {}
}
