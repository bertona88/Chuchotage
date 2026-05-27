package com.andreabertoncini.chuchotage.network

import kotlinx.coroutines.test.runTest
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class SponsoredTrialClientTest {
    @Test
    fun createsSessionTokenFromSponsoredTrialEndpoint() = runTest {
        MockWebServer().use { server ->
            server.enqueue(MockResponse().setResponseCode(200).setBody("""{"value":"trial-client-secret"}"""))
            server.start()
            val client = SponsoredTrialClient(
                clientSecretUrl = server.url("/api/trial/realtime-translation-client-secret").toString(),
                retryDelaysMs = longArrayOf(0),
            )

            val token = client.sessionBearerTokenFor(
                installId = "123e4567-e89b-12d3-a456-426614174000",
                targetLanguageCode = "ja",
            )

            val request = server.takeRequest()
            val body = JSONObject(request.body.readUtf8())
            assertEquals("trial-client-secret", token.value)
            assertFalse(token.shouldSendSessionUpdate)
            assertEquals("POST", request.method)
            assertEquals("123e4567-e89b-12d3-a456-426614174000", body.getString("installation_id"))
            assertEquals("ja", body.getString("target_language"))
            assertFalse(body.getBoolean("source_transcript_enabled"))
        }
    }

    @Test
    fun canRequestSourceTranscriptForSponsoredTrial() = runTest {
        MockWebServer().use { server ->
            server.enqueue(MockResponse().setResponseCode(200).setBody("""{"value":"trial-client-secret"}"""))
            server.start()
            val client = SponsoredTrialClient(
                clientSecretUrl = server.url("/api/trial/realtime-translation-client-secret").toString(),
                retryDelaysMs = longArrayOf(0),
            )

            client.sessionBearerTokenFor(
                installId = "123e4567-e89b-12d3-a456-426614174000",
                targetLanguageCode = "ja",
                sourceTranscriptEnabled = true,
            )

            val body = JSONObject(server.takeRequest().body.readUtf8())
            assertTrue(body.getBoolean("source_transcript_enabled"))
        }
    }

    @Test
    fun trialLimitUsesActionableErrorMessage() = runTest {
        MockWebServer().use { server ->
            server.enqueue(
                MockResponse()
                    .setResponseCode(429)
                    .setBody("""{"message":"Sponsored trial limit reached. Sign in with ChatGPT or use an API key to continue."}"""),
            )
            server.start()
            val client = SponsoredTrialClient(
                clientSecretUrl = server.url("/api/trial/realtime-translation-client-secret").toString(),
                retryDelaysMs = longArrayOf(0),
            )

            val exception = runCatching {
                client.sessionBearerTokenFor(
                    installId = "123e4567-e89b-12d3-a456-426614174000",
                    targetLanguageCode = "ja",
                )
            }.exceptionOrNull()

            assertTrue(exception is SponsoredTrialClient.SponsoredTrialException)
            assertTrue(exception?.message.orEmpty().contains("Sponsored trial limit reached"))
        }
    }
}
