package com.andreabertoncini.chuchotage.network

import org.junit.Assert.assertEquals
import org.junit.Test

class RealtimeTranslationEventParserTest {
    @Test
    fun parsesOutputAudioDelta() {
        val event = RealtimeTranslationEventParser.parse(
            """{"type":"session.output_audio.delta","delta":"AAAB"}""",
        )

        assertEquals(RealtimeTranslationEvent.OutputAudio("AAAB"), event)
    }

    @Test
    fun parsesInputTranscriptDelta() {
        val event = RealtimeTranslationEventParser.parse(
            """{"type":"session.input_transcript.delta","delta":"guten "}""",
        )

        assertEquals(RealtimeTranslationEvent.InputTranscriptDelta("guten "), event)
    }

    @Test
    fun parsesOutputTranscriptDelta() {
        val event = RealtimeTranslationEventParser.parse(
            """{"type":"session.output_transcript.delta","delta":"good "}""",
        )

        assertEquals(RealtimeTranslationEvent.OutputTranscriptDelta("good "), event)
    }

    @Test
    fun parsesSessionUpdated() {
        val event = RealtimeTranslationEventParser.parse(
            """{"type":"session.updated","session":{"type":"translation"}}""",
        )

        assertEquals(RealtimeTranslationEvent.SessionUpdated, event)
    }

    @Test
    fun parsesErrorEvent() {
        val event = RealtimeTranslationEventParser.parse(
            """{"type":"error","error":{"message":"bad socket"}}""",
        )

        assertEquals(RealtimeTranslationEvent.Error("bad socket"), event)
    }
}
