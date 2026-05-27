package com.andreabertoncini.chuchotage.network

import kotlinx.coroutines.test.runTest
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
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
    fun unauthorizedChatGptClientSecretRetriesAfterRefresh() = runTest {
        MockWebServer().use { server ->
            server.enqueue(MockResponse().setResponseCode(401).setBody("""{"error":{"message":"expired"}}"""))
            server.enqueue(MockResponse().setResponseCode(200).setBody("""{"value":"refreshed-client-secret"}"""))
            server.start()
            val provider = RealtimeTranslationClientSecretProvider(
                clientSecretUrl = server.url("/client_secrets").toString(),
                retryDelaysMs = longArrayOf(0),
            )
            val oldCredential = OpenAiCredential(
                kind = OpenAiCredentialKind.CHATGPT_ACCESS_TOKEN,
                value = "old-access-token",
                refreshToken = "refresh-token",
            )
            val refreshedCredential = oldCredential.copy(value = "new-access-token")

            val token = provider.sessionBearerTokenFor(
                credential = oldCredential,
                targetLanguageCode = "ja",
                refreshCredentialAfterUnauthorized = { refreshedCredential },
            )

            assertEquals("refreshed-client-secret", token.value)
            assertEquals(false, token.shouldSendSessionUpdate)
            val firstRequest = server.takeRequest()
            val secondRequest = server.takeRequest()
            assertEquals("Bearer old-access-token", firstRequest.getHeader("Authorization"))
            assertEquals("Bearer new-access-token", secondRequest.getHeader("Authorization"))
            assertEquals(OpenAiRequestHeaders.userAgent, firstRequest.getHeader("User-Agent"))
            assertEquals(OpenAiRequestHeaders.userAgent, secondRequest.getHeader("User-Agent"))
        }
    }

    @Test
    fun clientSecretRetriesServerErrors() = runTest {
        MockWebServer().use { server ->
            server.enqueue(MockResponse().setResponseCode(500).setBody("""{"error":{"message":"try again"}}"""))
            server.enqueue(MockResponse().setResponseCode(200).setBody("""{"value":"client-secret"}"""))
            server.start()
            val provider = RealtimeTranslationClientSecretProvider(
                clientSecretUrl = server.url("/client_secrets").toString(),
                retryDelaysMs = longArrayOf(0, 0),
            )

            val token = provider.sessionBearerTokenFor(
                credential = OpenAiCredential(OpenAiCredentialKind.CHATGPT_ACCESS_TOKEN, "access-token"),
                targetLanguageCode = "ja",
            )

            assertEquals("client-secret", token.value)
            assertEquals(2, server.requestCount)
        }
    }

    @Test
    fun clientSecretServerFailureUsesFriendlyMessage() = runTest {
        MockWebServer().use { server ->
            server.enqueue(MockResponse().setResponseCode(500).setBody("""{"error":{"message":"try again"}}"""))
            server.enqueue(MockResponse().setResponseCode(500).setBody("""{"error":{"message":"still down"}}"""))
            server.start()
            val provider = RealtimeTranslationClientSecretProvider(
                clientSecretUrl = server.url("/client_secrets").toString(),
                retryDelaysMs = longArrayOf(0, 0),
            )

            val exception = runCatching {
                provider.sessionBearerTokenFor(
                    credential = OpenAiCredential(OpenAiCredentialKind.CHATGPT_ACCESS_TOKEN, "access-token"),
                    targetLanguageCode = "ja",
                )
            }.exceptionOrNull()

            assertTrue(exception is IllegalStateException)
            assertTrue(exception?.message.orEmpty().contains("Could not create a translation client secret"))
        }
    }
}
