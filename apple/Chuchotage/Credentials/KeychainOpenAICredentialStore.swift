import Foundation
import Security

final class KeychainOpenAICredentialStore: OpenAICredentialStoring, @unchecked Sendable {
    private let service: String
    private let account: String
    private let keychain: any KeychainItemClient
    private let encoder = JSONEncoder()
    private let decoder = JSONDecoder()

    init(
        service: String = "com.andreabertoncini.chuchotage.openai-credential",
        account: String = "default",
        keychain: any KeychainItemClient = SystemKeychainItemClient()
    ) {
        self.service = service
        self.account = account
        self.keychain = keychain
    }

    func loadCredentialStatus() async throws -> OpenAICredentialStatus {
        try keychain.credentialStatus(service: service, account: account)
    }

    func loadCredential() async throws -> OpenAICredential? {
        guard let data = try keychain.read(service: service, account: account) else {
            return nil
        }

        do {
            let credential = try decoder.decode(OpenAICredential.self, from: data)
            guard OpenAICredentialValidator.isPlausible(credential) else {
                throw KeychainOpenAICredentialStoreError.invalidStoredCredential
            }
            return credential
        } catch let error as KeychainOpenAICredentialStoreError {
            throw error
        } catch {
            throw KeychainOpenAICredentialStoreError.couldNotDecodeCredential
        }
    }

    func saveCredential(_ credential: OpenAICredential) async throws {
        let normalized = normalizedCredential(credential)
        guard OpenAICredentialValidator.isPlausible(normalized) else {
            throw KeychainOpenAICredentialStoreError.invalidCredential
        }

        let data = try encoder.encode(normalized)
        try keychain.save(data, service: service, account: account)
    }

    func clearCredential() async throws {
        try keychain.delete(service: service, account: account)
    }

    private func normalizedCredential(_ credential: OpenAICredential) -> OpenAICredential {
        OpenAICredential(
            kind: credential.kind,
            value: OpenAICredentialValidator.normalize(credential.value),
            idToken: credential.idToken.map(OpenAICredentialValidator.normalize),
            refreshToken: credential.refreshToken.map(OpenAICredentialValidator.normalize),
            lastRefreshEpochSeconds: credential.lastRefreshEpochSeconds
        )
    }
}

protocol KeychainItemClient: Sendable {
    func credentialStatus(service: String, account: String) throws -> OpenAICredentialStatus
    func read(service: String, account: String) throws -> Data?
    func save(_ data: Data, service: String, account: String) throws
    func delete(service: String, account: String) throws
}

struct SystemKeychainItemClient: KeychainItemClient {
    func credentialStatus(service: String, account: String) throws -> OpenAICredentialStatus {
        var query = baseQuery(service: service, account: account)
        query[kSecReturnAttributes as String] = true
        query[kSecMatchLimit as String] = kSecMatchLimitOne

        var item: CFTypeRef?
        let status = SecItemCopyMatching(query as CFDictionary, &item)
        if status == errSecItemNotFound {
            return .missing
        }
        guard status == errSecSuccess else {
            throw KeychainOpenAICredentialStoreError.keychainStatus(status)
        }

        guard let attributes = item as? [String: Any] else {
            return .available(kind: nil)
        }
        let storedKind = attributes[kSecAttrComment as String] as? String
        return .available(kind: OpenAICredentialKind(rawValue: storedKind ?? ""))
    }

    func read(service: String, account: String) throws -> Data? {
        var query = baseQuery(service: service, account: account)
        query[kSecReturnData as String] = true
        query[kSecMatchLimit as String] = kSecMatchLimitOne

        var item: CFTypeRef?
        let status = SecItemCopyMatching(query as CFDictionary, &item)
        if status == errSecItemNotFound {
            return nil
        }
        guard status == errSecSuccess else {
            throw KeychainOpenAICredentialStoreError.keychainStatus(status)
        }
        guard let data = item as? Data else {
            throw KeychainOpenAICredentialStoreError.couldNotDecodeCredential
        }
        return data
    }

    func save(_ data: Data, service: String, account: String) throws {
        var addQuery = baseQuery(service: service, account: account)
        addQuery[kSecValueData as String] = data
        addQuery[kSecAttrComment as String] = credentialKindRawValue(from: data)
        #if os(iOS)
        addQuery[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
        #endif

        let addStatus = SecItemAdd(addQuery as CFDictionary, nil)
        if addStatus == errSecSuccess {
            return
        }

        if addStatus == errSecDuplicateItem {
            let updateStatus = SecItemUpdate(
                baseQuery(service: service, account: account) as CFDictionary,
                [
                    kSecValueData as String: data,
                    kSecAttrComment as String: credentialKindRawValue(from: data),
                ] as CFDictionary
            )
            guard updateStatus == errSecSuccess else {
                throw KeychainOpenAICredentialStoreError.keychainStatus(updateStatus)
            }
            return
        }

        throw KeychainOpenAICredentialStoreError.keychainStatus(addStatus)
    }

    func delete(service: String, account: String) throws {
        let status = SecItemDelete(baseQuery(service: service, account: account) as CFDictionary)
        guard status == errSecSuccess || status == errSecItemNotFound else {
            throw KeychainOpenAICredentialStoreError.keychainStatus(status)
        }
    }

    private func baseQuery(service: String, account: String) -> [String: Any] {
        [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
        ]
    }

    private func credentialKindRawValue(from data: Data) -> String {
        (try? JSONDecoder().decode(OpenAICredential.self, from: data).kind.rawValue)
            ?? "unknown"
    }
}

enum KeychainOpenAICredentialStoreError: LocalizedError, Equatable, Sendable {
    case invalidCredential
    case invalidStoredCredential
    case couldNotDecodeCredential
    case keychainStatus(OSStatus)

    var errorDescription: String? {
        switch self {
        case .invalidCredential:
            return L10n.string("error.validOpenAICredential", defaultValue: "Enter a valid OpenAI credential.")
        case .invalidStoredCredential:
            return L10n.string(
                "error.savedCredentialInvalid",
                defaultValue: "The saved OpenAI credential is no longer valid. Replace it in settings."
            )
        case .couldNotDecodeCredential:
            return L10n.string(
                "error.savedCredentialUnreadable",
                defaultValue: "The saved OpenAI credential could not be read. Replace it in settings."
            )
        case .keychainStatus:
            return L10n.string(
                "error.savedCredentialAccess",
                defaultValue: "Could not access the saved OpenAI credential."
            )
        }
    }
}
