import Foundation

struct CodexAuthCredentialImporter: Sendable {
    let authFileURL: URL

    init(
        authFileURL: URL = CodexAuthCredentialImporter.defaultAuthFileURL
    ) {
        self.authFileURL = authFileURL
    }

    static var isAvailableOnCurrentPlatform: Bool {
        #if os(macOS)
        return true
        #else
        return false
        #endif
    }

    private static var defaultAuthFileURL: URL {
        #if os(macOS)
        return FileManager.default.homeDirectoryForCurrentUser
            .appendingPathComponent(".codex")
            .appendingPathComponent("auth.json")
        #else
        return FileManager.default.temporaryDirectory
            .appendingPathComponent("codex-auth-unavailable.json")
        #endif
    }

    func loadCredential() async throws -> OpenAICredential {
        #if os(macOS)
        let data: Data
        do {
            data = try Data(contentsOf: authFileURL)
        } catch {
            throw CodexAuthCredentialImporterError.missingAuthFile
        }

        let authFile: CodexAuthFile
        do {
            authFile = try JSONDecoder().decode(CodexAuthFile.self, from: data)
        } catch {
            throw CodexAuthCredentialImporterError.unreadableAuthFile
        }

        let accessToken = OpenAICredentialValidator.normalize(authFile.tokens.accessToken)
        guard OpenAICredentialValidator.isPlausibleChatGPTAccessToken(accessToken) else {
            throw CodexAuthCredentialImporterError.missingAccessToken
        }

        return OpenAICredential(
            kind: .chatGPTAccessToken,
            value: accessToken,
            idToken: normalizedNonEmpty(authFile.tokens.idToken),
            refreshToken: normalizedNonEmpty(authFile.tokens.refreshToken),
            lastRefreshEpochSeconds: epochSeconds(from: authFile.lastRefresh)
        )
        #else
        throw CodexAuthCredentialImporterError.unavailableOnPlatform
        #endif
    }

    private func normalizedNonEmpty(_ value: String?) -> String? {
        guard let value else { return nil }
        let normalized = OpenAICredentialValidator.normalize(value)
        return normalized.isEmpty ? nil : normalized
    }

    private func epochSeconds(from value: String?) -> Int64? {
        guard let value else { return nil }

        let fractionalFormatter = ISO8601DateFormatter()
        fractionalFormatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let date = fractionalFormatter.date(from: value) {
            return Int64(date.timeIntervalSince1970)
        }

        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime]
        return formatter.date(from: value).map { Int64($0.timeIntervalSince1970) }
    }
}

private struct CodexAuthFile: Decodable {
    let tokens: Tokens
    let lastRefresh: String?

    enum CodingKeys: String, CodingKey {
        case tokens
        case lastRefresh = "last_refresh"
    }

    struct Tokens: Decodable {
        let accessToken: String
        let idToken: String?
        let refreshToken: String?

        enum CodingKeys: String, CodingKey {
            case accessToken = "access_token"
            case idToken = "id_token"
            case refreshToken = "refresh_token"
        }
    }
}

enum CodexAuthCredentialImporterError: LocalizedError, Equatable, Sendable {
    case unavailableOnPlatform
    case missingAuthFile
    case unreadableAuthFile
    case missingAccessToken

    var errorDescription: String? {
        switch self {
        case .unavailableOnPlatform:
            return L10n.string(
                "error.codexImportMacOnly",
                defaultValue: "Codex login import is only available on macOS."
            )
        case .missingAuthFile:
            return L10n.string(
                "error.codexAuthMissing",
                defaultValue: "Could not find ~/.codex/auth.json."
            )
        case .unreadableAuthFile:
            return L10n.string(
                "error.codexAuthUnreadable",
                defaultValue: "Could not read Codex login credentials."
            )
        case .missingAccessToken:
            return L10n.string(
                "error.codexAuthMissingAccessToken",
                defaultValue: "Codex login credentials do not include a usable access token."
            )
        }
    }
}
