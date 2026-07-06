package com.andreabertoncini.chuchotage.service

import com.andreabertoncini.chuchotage.network.OpenAiCredentialKind
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Test
import java.io.IOException
import java.net.UnknownHostException

class TranslationSessionTest {
    @Test
    fun sessionUpdateUsesSelectedOutputLanguage() {
        val event = JSONObject(buildSessionUpdateEvent("it"))

        val outputLanguage = event
            .getJSONObject("session")
            .getJSONObject("audio")
            .getJSONObject("output")
            .getString("language")

        assertEquals("session.update", event.getString("type"))
        assertEquals("it", outputLanguage)
    }

    @Test
    fun sessionUpdateOmitsInputTranscriptionByDefault() {
        val event = JSONObject(buildSessionUpdateEvent("it"))

        val input = event
            .getJSONObject("session")
            .getJSONObject("audio")
            .getJSONObject("input")

        assertEquals(false, input.has("transcription"))
    }

    @Test
    fun sessionUpdateRequestsInputTranscriptDeltasWhenEnabled() {
        val event = JSONObject(buildSessionUpdateEvent("it", sourceTranscriptEnabled = true))

        val inputTranscription = event
            .getJSONObject("session")
            .getJSONObject("audio")
            .getJSONObject("input")
            .getJSONObject("transcription")

        assertEquals("gpt-realtime-whisper", inputTranscription.getString("model"))
    }

    @Test
    fun sessionUpdateFallsBackToEnglishForInvalidLanguage() {
        val event = JSONObject(buildSessionUpdateEvent("xx"))

        val outputLanguage = event
            .getJSONObject("session")
            .getJSONObject("audio")
            .getJSONObject("output")
            .getString("language")

        assertEquals("en", outputLanguage)
    }

    @Test
    fun socketHandshakeServerErrorUsesFriendlyMessage() {
        val message = realtimeSocketFailureMessage(
            IOException("Expected HTTP 101 response but was '500 Internal Server Error'"),
            responseCode = 500,
        )

        assertEquals("OpenAI Realtime is unavailable right now. Try again in a moment.", message)
    }

    @Test
    fun socketHandshakeChatGptServerErrorNamesRestartWorkaround() {
        val message = realtimeSocketFailureMessage(
            IOException("Expected HTTP 101 response but was '500 Internal Server Error'"),
            responseCode = 500,
            credentialKind = OpenAiCredentialKind.CHATGPT_ACCESS_TOKEN,
        )

        assertEquals(
            "OpenAI is rejecting ChatGPT sign-in translation sessions right now. Restart Chuchotage and try again.",
            message,
        )
    }

    @Test
    fun socketHandshakeAuthErrorUsesFriendlyMessage() {
        val message = realtimeSocketFailureMessage(
            IOException("Expected HTTP 101 response but was '401 Unauthorized'"),
            responseCode = 401,
        )

        assertEquals("OpenAI rejected the saved login. Check your API key or sign in again.", message)
    }

    @Test
    fun socketHandshakeDnsErrorUsesFriendlyMessage() {
        val message = realtimeSocketFailureMessage(UnknownHostException("api.openai.com"))

        assertEquals(
            "Could not resolve api.openai.com. Check the phone's VPN, private DNS, or network and try again.",
            message,
        )
    }
}
