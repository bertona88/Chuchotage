package com.andreabertoncini.chuchotage.demo

import kotlin.math.roundToInt

class DemoAudioMixer(
    private val sampleRate: Int = SAMPLE_RATE,
    private val maxQueuedSeconds: Int = 8,
) {
    private val inputQueue = PcmSampleQueue(sampleRate * maxQueuedSeconds)
    private val outputQueue = PcmSampleQueue(sampleRate * maxQueuedSeconds)

    @Synchronized
    fun enqueueInput(pcm24Khz: ByteArray) {
        enqueue(inputQueue, pcm24Khz)
    }

    @Synchronized
    fun enqueueOutput(pcm24Khz: ByteArray) {
        enqueue(outputQueue, pcm24Khz)
    }

    @Synchronized
    fun mixFrame(byteCount: Int): ByteArray {
        val evenByteCount = byteCount - (byteCount % BYTES_PER_SAMPLE)
        val mixed = ByteArray(evenByteCount)
        val sampleCount = evenByteCount / BYTES_PER_SAMPLE

        for (sampleIndex in 0 until sampleCount) {
            val inputSample = popSample(inputQueue)
            val outputSample = popSample(outputQueue)
            val sample = ((inputSample * INPUT_GAIN) + (outputSample * OUTPUT_GAIN))
                .roundToInt()
                .coerceIn(Short.MIN_VALUE.toInt(), Short.MAX_VALUE.toInt())
            writeSample(mixed, sampleIndex, sample)
        }

        return mixed
    }

    @Synchronized
    fun clear() {
        inputQueue.clear()
        outputQueue.clear()
    }

    private fun enqueue(queue: PcmSampleQueue, bytes: ByteArray) {
        queue.enqueue(bytes)
    }

    private fun popSample(queue: PcmSampleQueue): Int {
        return queue.popSample()
    }

    private fun writeSample(bytes: ByteArray, sampleIndex: Int, sample: Int) {
        val byteIndex = sampleIndex * BYTES_PER_SAMPLE
        bytes[byteIndex] = (sample and 0xFF).toByte()
        bytes[byteIndex + 1] = ((sample shr 8) and 0xFF).toByte()
    }

    private class PcmSampleQueue(capacitySamples: Int) {
        private val samples = IntArray(capacitySamples.coerceAtLeast(1))
        private var readIndex = 0
        private var size = 0

        val isNotEmpty: Boolean
            get() = size > 0

        fun enqueue(bytes: ByteArray) {
            val sampleCount = bytes.size / BYTES_PER_SAMPLE
            for (sampleIndex in 0 until sampleCount) {
                val byteIndex = sampleIndex * BYTES_PER_SAMPLE
                val low = bytes[byteIndex].toInt() and 0xFF
                val high = bytes[byteIndex + 1].toInt()
                push((high shl 8) or low)
            }
        }

        fun popSample(): Int {
            if (size == 0) return 0
            val sample = samples[readIndex]
            readIndex = (readIndex + 1) % samples.size
            size--
            return sample
        }

        fun clear() {
            readIndex = 0
            size = 0
        }

        private fun push(sample: Int) {
            if (size == samples.size) {
                samples[readIndex] = sample
                readIndex = (readIndex + 1) % samples.size
                return
            }

            val writeIndex = (readIndex + size) % samples.size
            samples[writeIndex] = sample
            size++
        }
    }

    companion object {
        const val SAMPLE_RATE = 24_000
        const val BYTES_PER_SAMPLE = 2
        private const val INPUT_GAIN = 0.82
        private const val OUTPUT_GAIN = 0.96
    }
}
