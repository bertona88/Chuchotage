package com.andreabertoncini.chuchotage.network

import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class RealtimeTranslationClientSecretProviderTest {
    @Test
    fun clientSecretRequestBodyUsesSelectedOutputLanguage() {
        val body = RealtimeTranslationClientSecretProvider().clientSecretRequestBody("ja")

        val outputLanguage = body
            .getJSONObject("session")
            .getJSONObject("audio")
            .getJSONObject("output")
            .getString("language")

        assertEquals("ja", outputLanguage)
    }

    @Test
    fun clientSecretRequestBodyFallsBackToEnglishForInvalidLanguage() {
        val body = RealtimeTranslationClientSecretProvider().clientSecretRequestBody("xx")

        val outputLanguage = body
            .getJSONObject("session")
            .getJSONObject("audio")
            .getJSONObject("output")
            .getString("language")

        assertEquals("en", outputLanguage)
    }

    @Test
    fun clientSecretRequestBodyOmitsInputTranscriptionByDefault() {
        val body = RealtimeTranslationClientSecretProvider().clientSecretRequestBody("ja")

        val input = body
            .getJSONObject("session")
            .getJSONObject("audio")
            .getJSONObject("input")

        assertEquals(false, input.has("transcription"))
    }

    @Test
    fun clientSecretRequestBodyIncludesInputTranscriptionWhenEnabled() {
        val body = RealtimeTranslationClientSecretProvider().clientSecretRequestBody(
            targetLanguageCode = "ja",
            sourceTranscriptEnabled = true,
        )

        val transcription = body
            .getJSONObject("session")
            .getJSONObject("audio")
            .getJSONObject("input")
            .getJSONObject("transcription")

        assertEquals("gpt-realtime-whisper", transcription.getString("model"))
    }

    @Test
    fun apiKeyUsesDirectRealtimeBearerToken() = runTest {
        val token = RealtimeTranslationClientSecretProvider().sessionBearerTokenFor(
            credential = OpenAiCredential(OpenAiCredentialKind.API_KEY, "sk-proj-abcdefghijklmnopqrstuvwxyz"),
            targetLanguageCode = "ja",
        )

        assertEquals("sk-proj-abcdefghijklmnopqrstuvwxyz", token.value)
        assertEquals(true, token.shouldSendSessionUpdate)
        assertEquals(OpenAiCredentialKind.API_KEY, token.credentialKind)
    }

    @Test
    fun chatGptAccessTokenIsRejectedBeforeClientSecretRequest() = runTest {
        val exception = runCatching {
            RealtimeTranslationClientSecretProvider().sessionBearerTokenFor(
                credential = OpenAiCredential(OpenAiCredentialKind.CHATGPT_ACCESS_TOKEN, "access-token"),
                targetLanguageCode = "ja",
            )
        }.exceptionOrNull()

        assertTrue(exception is IllegalStateException)
        assertTrue(exception?.message.orEmpty().contains("ChatGPT sign-in is not available"))
    }
}
