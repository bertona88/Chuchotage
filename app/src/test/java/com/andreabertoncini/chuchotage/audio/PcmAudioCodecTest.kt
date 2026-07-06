package com.andreabertoncini.chuchotage.audio

import org.junit.Assert.assertArrayEquals
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class PcmAudioCodecTest {
    @Test
    fun encodesPcm16ChunkAsBase64() {
        val pcm = byteArrayOf(0x00, 0x00, 0x01, 0x02, 0x7F, 0x7F)

        val encoded = PcmAudioCodec.encodeBase64Pcm16(pcm)

        assertEquals("AAABAn9/", encoded)
    }

    @Test
    fun encodesOnlyRequestedBytes() {
        val pcm = byteArrayOf(0x00, 0x00, 0x01, 0x02, 0x7F, 0x7F)

        val encoded = PcmAudioCodec.encodeBase64Pcm16(pcm, length = 4)

        assertEquals("AAABAg==", encoded)
    }

    @Test
    fun decodesBase64Pcm16Chunk() {
        val decoded = PcmAudioCodec.decodeBase64Pcm16("AAABAn9/")

        assertArrayEquals(byteArrayOf(0x00, 0x00, 0x01, 0x02, 0x7F, 0x7F), decoded)
    }

    @Test
    fun measuresSilenceAsZeroVolume() {
        val level = PcmVolumeMeter.level(byteArrayOf(0x00, 0x00, 0x00, 0x00))

        assertEquals(0f, level, 0.001f)
    }

    @Test
    fun measuresLouderPcmAsHigherVolume() {
        val quiet = PcmVolumeMeter.level(byteArrayOf(0x00, 0x04, 0x00, 0x04))
        val loud = PcmVolumeMeter.level(byteArrayOf(0x00, 0x40, 0x00, 0x40))

        assertTrue(loud > quiet)
    }

    @Test
    fun clampsPeakVolumeToOne() {
        val peak = PcmVolumeMeter.level(byteArrayOf(0xFF.toByte(), 0x7F, 0xFF.toByte(), 0x7F))

        assertEquals(1f, peak, 0.001f)
    }

    @Test
    fun inputGainLeavesSilenceUnchanged() {
        val silence = pcm16(0, 0, 0)

        val lifted = PcmInputGain.liftQuietSpeech(silence)

        assertArrayEquals(silence, lifted)
    }

    @Test
    fun inputGainBoostsQuietSpeech() {
        val quiet = pcm16(512, -512, 512, -512)

        val lifted = PcmInputGain.liftQuietSpeech(quiet)

        assertTrue(readPcm16(lifted, 0) > readPcm16(quiet, 0))
        assertTrue(readPcm16(lifted, 0) <= Short.MAX_VALUE)
    }

    @Test
    fun inputGainDoesNotAttenuateLoudSpeech() {
        val loud = pcm16(12_000, -12_000)

        val lifted = PcmInputGain.liftQuietSpeech(loud)

        assertArrayEquals(loud, lifted)
    }

    private fun pcm16(vararg samples: Int): ByteArray {
        val bytes = ByteArray(samples.size * 2)
        samples.forEachIndexed { index, sample ->
            val byteIndex = index * 2
            bytes[byteIndex] = (sample and 0xFF).toByte()
            bytes[byteIndex + 1] = ((sample shr 8) and 0xFF).toByte()
        }
        return bytes
    }

    private fun readPcm16(bytes: ByteArray, sampleIndex: Int): Int {
        val byteIndex = sampleIndex * 2
        val low = bytes[byteIndex].toInt() and 0xFF
        val high = bytes[byteIndex + 1].toInt()
        return (high shl 8) or low
    }
}
