package com.andreabertoncini.chuchotage.state

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class TranslationTranscriptTest {
    @Test
    fun appendOutputKeepsTranslatedDeltasInOrder() {
        val transcript = TranslationTranscript()
            .appendOutput("hello ")
            .appendOutput("world")

        assertEquals("hello world", transcript.outputText)
        assertTrue(transcript.hasText)
    }

    @Test
    fun appendInputIgnoresBlankDeltas() {
        val transcript = TranslationTranscript().appendInput("   ")

        assertEquals("", transcript.inputText)
        assertFalse(transcript.hasText)
    }

    @Test
    fun appendedTextIsCappedToMostRecentCharacters() {
        val transcript = TranslationTranscript(outputText = "12345")
            .appendOutput("67890", maxChars = 6)

        assertEquals("567890", transcript.outputText)
    }
}
