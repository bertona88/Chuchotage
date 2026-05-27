import Foundation

enum AppleAppDependencies {
    @MainActor
    static func makeTranslationViewModel() -> TranslationViewModel {
        let credentialStore = KeychainOpenAICredentialStore()
        let chatGPTOAuthClient = ChatGPTOAuthClient()
        let runtimeCredentialStore = ChatGPTRefreshingOpenAICredentialStore(
            baseStore: credentialStore,
            oauthClient: chatGPTOAuthClient
        )
        let settingsStore = UserDefaultsTranslationSettingsStore()
        #if os(iOS)
        let audioIO: any TranslationAudioIO = IOSTranslationAudioIO()
        #elseif os(macOS)
        let audioIO: any TranslationAudioIO = MacOSTranslationAudioIO()
        #else
        let audioIO: any TranslationAudioIO = UnavailableTranslationAudioIO()
        #endif
        let runtime = TranslationRuntime(
            credentialStore: runtimeCredentialStore,
            audioIO: audioIO,
            refreshCredentialAfterUnauthorized: {
                try await runtimeCredentialStore.forceRefreshSavedCredential()
            }
        )

        return TranslationViewModel(
            settingsStore: settingsStore,
            credentialStore: credentialStore,
            chatGPTOAuthClient: chatGPTOAuthClient,
            runtime: runtime
        )
    }
}
