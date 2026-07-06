package com.andreabertoncini.chuchotage.audio

import java.util.Base64
import kotlin.math.abs
import kotlin.math.floor
import kotlin.math.roundToInt
import kotlin.math.sqrt

object PcmAudioCodec {
    fun encodeBase64Pcm16(bytes: ByteArray, length: Int = bytes.size): String {
        val payload = if (length == bytes.size) bytes else bytes.copyOf(length)
        return Base64.getEncoder().encodeToString(payload)
    }

    fun decodeBase64Pcm16(base64Audio: String): ByteArray {
        return Base64.getDecoder().decode(base64Audio)
    }
}

object PcmResampler {
    fun resamplePcm16Mono(
        input: ByteArray,
        bytesRead: Int,
        fromSampleRate: Int,
        toSampleRate: Int,
    ): ByteArray {
        if (bytesRead <= 0) return ByteArray(0)
        if (fromSampleRate == toSampleRate) return input.copyOf(bytesRead)

        val inputSamples = bytesRead / BYTES_PER_SAMPLE
        if (inputSamples == 0) return ByteArray(0)

        val outputSamples = ((inputSamples.toLong() * toSampleRate) / fromSampleRate).toInt()
            .coerceAtLeast(1)
        val output = ByteArray(outputSamples * BYTES_PER_SAMPLE)
        val ratio = fromSampleRate.toDouble() / toSampleRate.toDouble()

        for (i in 0 until outputSamples) {
            val sourcePosition = i * ratio
            val leftIndex = floor(sourcePosition).toInt().coerceIn(0, inputSamples - 1)
            val rightIndex = (leftIndex + 1).coerceAtMost(inputSamples - 1)
            val fraction = sourcePosition - leftIndex
            val left = readLittleEndianPcm16(input, leftIndex)
            val right = readLittleEndianPcm16(input, rightIndex)
            val sample = (left + ((right - left) * fraction)).roundToInt()
                .coerceIn(Short.MIN_VALUE.toInt(), Short.MAX_VALUE.toInt())
            writeLittleEndianPcm16(output, i, sample)
        }

        return output
    }

    private fun readLittleEndianPcm16(bytes: ByteArray, sampleIndex: Int): Int {
        val byteIndex = sampleIndex * BYTES_PER_SAMPLE
        val low = bytes[byteIndex].toInt() and 0xFF
        val high = bytes[byteIndex + 1].toInt()
        return (high shl 8) or low
    }

    private fun writeLittleEndianPcm16(bytes: ByteArray, sampleIndex: Int, sample: Int) {
        val byteIndex = sampleIndex * BYTES_PER_SAMPLE
        bytes[byteIndex] = (sample and 0xFF).toByte()
        bytes[byteIndex + 1] = ((sample shr 8) and 0xFF).toByte()
    }

    private const val BYTES_PER_SAMPLE = 2
}

object PcmVolumeMeter {
    fun level(bytes: ByteArray, length: Int = bytes.size): Float {
        val sampleCount = length / BYTES_PER_SAMPLE
        if (sampleCount <= 0) return 0f

        var sumSquares = 0.0
        for (sampleIndex in 0 until sampleCount) {
            val byteIndex = sampleIndex * BYTES_PER_SAMPLE
            val low = bytes[byteIndex].toInt() and 0xFF
            val high = bytes[byteIndex + 1].toInt()
            val sample = (high shl 8) or low
            val normalized = sample / Short.MAX_VALUE.toDouble()
            sumSquares += normalized * normalized
        }

        val rms = sqrt(sumSquares / sampleCount)
        return sqrt(rms * RESPONSE_GAIN).toFloat().coerceIn(0f, 1f)
    }

    private const val BYTES_PER_SAMPLE = 2
    private const val RESPONSE_GAIN = 9.0
}

object PcmInputGain {
    fun liftQuietSpeech(bytes: ByteArray): ByteArray {
        val metrics = metrics(bytes)
        if (metrics.sampleCount <= 0 || metrics.rms < ACTIVE_RMS_THRESHOLD) return bytes

        val desiredGain = (TARGET_RMS / metrics.rms).coerceIn(1.0, MAX_GAIN)
        val peakLimitedGain = if (metrics.peak > 0.0) {
            desiredGain.coerceAtMost(PEAK_HEADROOM / metrics.peak)
        } else {
            desiredGain
        }
        if (peakLimitedGain <= MIN_EFFECTIVE_GAIN) return bytes

        val output = bytes.copyOf()
        for (sampleIndex in 0 until metrics.sampleCount) {
            val sample = readLittleEndianPcm16(output, sampleIndex)
            val lifted = (sample * peakLimitedGain).roundToInt()
                .coerceIn(Short.MIN_VALUE.toInt(), Short.MAX_VALUE.toInt())
            writeLittleEndianPcm16(output, sampleIndex, lifted)
        }
        return output
    }

    private fun metrics(bytes: ByteArray): PcmMetrics {
        val sampleCount = bytes.size / BYTES_PER_SAMPLE
        if (sampleCount <= 0) return PcmMetrics(sampleCount = 0, rms = 0.0, peak = 0.0)

        var sumSquares = 0.0
        var peak = 0.0
        for (sampleIndex in 0 until sampleCount) {
            val sample = readLittleEndianPcm16(bytes, sampleIndex)
            val normalized = sample / Short.MAX_VALUE.toDouble()
            val magnitude = abs(normalized).coerceAtMost(1.0)
            sumSquares += normalized * normalized
            if (magnitude > peak) peak = magnitude
        }

        return PcmMetrics(
            sampleCount = sampleCount,
            rms = sqrt(sumSquares / sampleCount),
            peak = peak,
        )
    }

    private fun readLittleEndianPcm16(bytes: ByteArray, sampleIndex: Int): Int {
        val byteIndex = sampleIndex * BYTES_PER_SAMPLE
        val low = bytes[byteIndex].toInt() and 0xFF
        val high = bytes[byteIndex + 1].toInt()
        return (high shl 8) or low
    }

    private fun writeLittleEndianPcm16(bytes: ByteArray, sampleIndex: Int, sample: Int) {
        val byteIndex = sampleIndex * BYTES_PER_SAMPLE
        bytes[byteIndex] = (sample and 0xFF).toByte()
        bytes[byteIndex + 1] = ((sample shr 8) and 0xFF).toByte()
    }

    private data class PcmMetrics(
        val sampleCount: Int,
        val rms: Double,
        val peak: Double,
    )

    private const val BYTES_PER_SAMPLE = 2
    private const val ACTIVE_RMS_THRESHOLD = 0.001
    private const val TARGET_RMS = 0.07
    private const val MAX_GAIN = 8.0
    private const val PEAK_HEADROOM = 0.92
    private const val MIN_EFFECTIVE_GAIN = 1.05
}
