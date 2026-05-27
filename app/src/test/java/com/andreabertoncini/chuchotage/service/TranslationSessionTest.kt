package com.andreabertoncini.chuchotage.service

import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Test

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
}
