package com.andreabertoncini.chuchotage.network

import org.json.JSONObject

sealed interface RealtimeTranslationEvent {
    data class OutputAudio(val base64Audio: String) : RealtimeTranslationEvent
    data class InputTranscriptDelta(val text: String) : RealtimeTranslationEvent
    data class OutputTranscriptDelta(val text: String) : RealtimeTranslationEvent
    data class Error(val message: String) : RealtimeTranslationEvent
    data object SessionUpdated : RealtimeTranslationEvent
    data object Ignored : RealtimeTranslationEvent
}

object RealtimeTranslationEventParser {
    fun parse(message: String): RealtimeTranslationEvent {
        val json = runCatching { JSONObject(message) }.getOrNull() ?: return RealtimeTranslationEvent.Ignored
        return when (json.optString("type")) {
            "session.output_audio.delta" -> {
                RealtimeTranslationEvent.OutputAudio(json.optString("delta"))
            }
            "session.input_transcript.delta" -> {
                RealtimeTranslationEvent.InputTranscriptDelta(json.optString("delta"))
            }
            "session.output_transcript.delta" -> {
                RealtimeTranslationEvent.OutputTranscriptDelta(json.optString("delta"))
            }
            "session.updated" -> RealtimeTranslationEvent.SessionUpdated
            "error" -> {
                val nested = json.optJSONObject("error")
                val messageText = nested?.optString("message")
                    ?: json.optString("message")
                    ?: "Realtime translation failed."
                RealtimeTranslationEvent.Error(messageText.ifBlank { "Realtime translation failed." })
            }
            else -> RealtimeTranslationEvent.Ignored
        }
    }
}
