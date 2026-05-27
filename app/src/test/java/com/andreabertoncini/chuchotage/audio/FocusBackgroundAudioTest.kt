package com.andreabertoncini.chuchotage.audio

import org.junit.Assert.assertArrayEquals
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import kotlin.math.abs

class FocusBackgroundAudioTest {
    @Test
    fun generatedNoiseIsDeterministicPcm16AndNonSilent() {
        val first = FocusBackgroundNoiseGenerator(seed = 7)
            .nextPcm16(sampleCount = 128, level = FocusBackgroundNoiseGenerator.DEFAULT_LEVEL)
        val second = FocusBackgroundNoiseGenerator(seed = 7)
            .nextPcm16(sampleCount = 128, level = FocusBackgroundNoiseGenerator.DEFAULT_LEVEL)

        assertEquals(256, first.size)
        assertArrayEquals(first, second)
        assertTrue(first.any { it != 0.toByte() })
    }

    @Test
    fun generatedNoiseIsCappedToConservativeLevel() {
        val pcm = FocusBackgroundNoiseGenerator(seed = 11)
            .nextPcm16(sampleCount = 2_000, level = 1f)
        val maxSample = (Short.MAX_VALUE * FocusBackgroundNoiseGenerator.MAX_LEVEL).toInt()

        for (sampleIndex in 0 until pcm.size / 2) {
            assertTrue(abs(readPcm16(pcm, sampleIndex)) <= maxSample)
        }
    }

    @Test
    fun duckEnvelopeMutesQuicklyAndReleasesAfterHold() {
        val envelope = FocusBackgroundDuckEnvelope(
            targetLevel = 0.05f,
            attackMillis = 50L,
            holdMillis = 450L,
            releaseMillis = 500L,
        )

        assertEquals(0.05f, envelope.levelAt(0L), 0.001f)

        envelope.duck(100L)

        assertTrue(envelope.levelAt(125L) < 0.05f)
        assertEquals(0f, envelope.levelAt(150L), 0.001f)
        assertEquals(0f, envelope.levelAt(549L), 0.001f)
        assertTrue(envelope.levelAt(800L) > 0f)
        assertEquals(0.05f, envelope.levelAt(1_050L), 0.001f)
    }

    @Test
    fun repeatedDuckDoesNotJumpBackUp() {
        val envelope = FocusBackgroundDuckEnvelope(
            targetLevel = 0.05f,
            attackMillis = 50L,
            holdMillis = 450L,
            releaseMillis = 500L,
        )

        envelope.duck(100L)
        assertEquals(0f, envelope.levelAt(150L), 0.001f)

        envelope.duck(200L)

        assertTrue(envelope.levelAt(201L) < 0.005f)
    }

    private fun readPcm16(bytes: ByteArray, sampleIndex: Int): Int {
        val byteIndex = sampleIndex * 2
        val low = bytes[byteIndex].toInt() and 0xFF
        val high = bytes[byteIndex + 1].toInt()
        return (high shl 8) or low
    }
}
