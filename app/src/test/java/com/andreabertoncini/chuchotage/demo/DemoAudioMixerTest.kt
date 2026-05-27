package com.andreabertoncini.chuchotage.demo

import org.junit.Assert.assertTrue
import org.junit.Test
import kotlin.math.abs

class DemoAudioMixerTest {
    @Test
    fun keepsInputAudibleWhenNoOutputIsQueued() {
        val mixer = DemoAudioMixer()
        mixer.enqueueInput(pcmSamples(10_000, 10_000, 10_000, 10_000))

        val mixed = mixer.mixFrame(8)

        assertTrue(readSample(mixed, 0) > 7_000)
        assertTrue(readSample(mixed, 3) > 7_000)
    }

    @Test
    fun mixesInputAndOutputWithoutDemoDucking() {
        val mixer = DemoAudioMixer()
        mixer.enqueueInput(pcmSamples(10_000, 10_000, 10_000, 10_000))
        mixer.enqueueOutput(pcmSamples(10_000, 10_000, 10_000, 10_000))

        val mixed = mixer.mixFrame(8)

        val first = readSample(mixed, 0)
        val last = readSample(mixed, 3)
        assertTrue(first in 17_000..18_500)
        assertTrue(abs(last - first) < 500)
    }

    private fun pcmSamples(vararg samples: Int): ByteArray {
        val bytes = ByteArray(samples.size * 2)
        samples.forEachIndexed { index, sample ->
            val byteIndex = index * 2
            bytes[byteIndex] = (sample and 0xFF).toByte()
            bytes[byteIndex + 1] = ((sample shr 8) and 0xFF).toByte()
        }
        return bytes
    }

    private fun readSample(bytes: ByteArray, sampleIndex: Int): Int {
        val byteIndex = sampleIndex * 2
        val low = bytes[byteIndex].toInt() and 0xFF
        val high = bytes[byteIndex + 1].toInt()
        return (high shl 8) or low
    }
}
