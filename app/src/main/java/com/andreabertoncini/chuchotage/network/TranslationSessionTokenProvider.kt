package com.andreabertoncini.chuchotage.network

import android.content.Context
import com.andreabertoncini.chuchotage.settings.TranslationLanguages

interface TranslationSessionTokenProvider {
    suspend fun sessionToken(
        targetLanguageCode: String = TranslationLanguages.DEFAULT_TARGET_LANGUAGE_CODE,
        sourceTranscriptEnabled: Boolean = false,
    ): RealtimeTranslationSessionToken
}

class UserApiKeyProvider(
    private val credentialStore: SecureApiKeyStore,
) : TranslationSessionTokenProvider {
    override suspend fun sessionToken(
        targetLanguageCode: String,
        sourceTranscriptEnabled: Boolean,
    ): RealtimeTranslationSessionToken {
        val credential = credentialStore.loadCredential()
        require(credential?.kind == OpenAiCredentialKind.API_KEY) {
            "OpenAI API key missing."
        }
        return RealtimeTranslationSessionToken(
            value = credential.value,
            shouldSendSessionUpdate = true,
            credentialKind = OpenAiCredentialKind.API_KEY,
        )
    }
}

class ChatGptAuthProvider(
    private val credentialStore: SecureApiKeyStore,
    private val chatGptOAuthClient: ChatGptOAuthClient = ChatGptOAuthClient(),
    private val clientSecretProvider: RealtimeTranslationClientSecretProvider = RealtimeTranslationClientSecretProvider(),
) : TranslationSessionTokenProvider {
    override suspend fun sessionToken(
        targetLanguageCode: String,
        sourceTranscriptEnabled: Boolean,
    ): RealtimeTranslationSessionToken {
        val credential = credentialStore.loadCredential()
        require(credential?.kind == OpenAiCredentialKind.CHATGPT_ACCESS_TOKEN) {
            "ChatGPT sign-in missing."
        }

        val freshCredential = chatGptOAuthClient.refreshIfNeeded(credential)
        if (freshCredential != credential) {
            credentialStore.saveOpenAiCredential(freshCredential)
        }

        return clientSecretProvider.sessionBearerTokenFor(
            credential = freshCredential,
            targetLanguageCode = targetLanguageCode,
            sourceTranscriptEnabled = sourceTranscriptEnabled,
            refreshCredentialAfterUnauthorized = {
                val latestCredential = credentialStore.loadCredential() ?: freshCredential
                val refreshedCredential = chatGptOAuthClient.refreshIfNeeded(
                    credential = latestCredential,
                    forceRefresh = true,
                )
                if (refreshedCredential != latestCredential) {
                    credentialStore.saveOpenAiCredential(refreshedCredential)
                }
                refreshedCredential
            },
        )
    }
}

class SponsoredTrialProvider(
    private val credentialStore: SecureApiKeyStore,
    private val sponsoredTrialClient: SponsoredTrialClient = SponsoredTrialClient(),
) : TranslationSessionTokenProvider {
    override suspend fun sessionToken(
        targetLanguageCode: String,
        sourceTranscriptEnabled: Boolean,
    ): RealtimeTranslationSessionToken {
        val credential = credentialStore.loadCredential()
        require(credential?.kind == OpenAiCredentialKind.SPONSORED_TRIAL) {
            "Sponsored trial is not set up."
        }
        return sponsoredTrialClient.sessionBearerTokenFor(
            installId = credential.value,
            targetLanguageCode = targetLanguageCode,
            sourceTranscriptEnabled = sourceTranscriptEnabled,
        )
    }
}

class TranslationAuthRepository(context: Context) {
    private val credentialStore = SecureApiKeyStore(context.applicationContext)

    fun hasProvider(): Boolean = credentialStore.hasCredential()

    fun activeProvider(): TranslationSessionTokenProvider? {
        return when (credentialStore.loadCredential()?.kind) {
            OpenAiCredentialKind.API_KEY -> UserApiKeyProvider(credentialStore)
            OpenAiCredentialKind.CHATGPT_ACCESS_TOKEN -> {
                credentialStore.ensureSponsoredTrialInstallId()
                SponsoredTrialProvider(credentialStore)
            }
            OpenAiCredentialKind.SPONSORED_TRIAL -> SponsoredTrialProvider(credentialStore)
            null -> null
        }
    }
}
