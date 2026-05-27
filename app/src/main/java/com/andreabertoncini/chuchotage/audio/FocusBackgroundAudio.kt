package com.andreabertoncini.chuchotage.audio

import kotlin.math.roundToInt

class FocusBackgroundNoiseGenerator(seed: Int = DEFAULT_SEED) {
    private var state = if (seed == 0) DEFAULT_SEED else seed
    private var filteredSample = 0.0

    fun nextPcm16(sampleCount: Int, level: Float): ByteArray {
        if (sampleCount <= 0) return ByteArray(0)

        val effectiveLevel = level.coerceIn(0f, MAX_LEVEL).toDouble()
        val output = ByteArray(sampleCount * BYTES_PER_SAMPLE)
        if (effectiveLevel <= 0.0) return output

        for (sampleIndex in 0 until sampleCount) {
            val white = nextSignedDouble()
            filteredSample = (FILTER_MEMORY * filteredSample) + ((1.0 - FILTER_MEMORY) * white)
            val sample = (filteredSample * effectiveLevel * Short.MAX_VALUE)
                .roundToInt()
                .coerceIn(-MAX_SAMPLE_MAGNITUDE, MAX_SAMPLE_MAGNITUDE)
            writeLittleEndianPcm16(output, sampleIndex, sample)
        }

        return output
    }

    private fun nextSignedDouble(): Double {
        state = state xor (state shl 13)
        state = state xor (state ushr 17)
        state = state xor (state shl 5)
        val normalized = (state ushr 1).toDouble() / Int.MAX_VALUE.toDouble()
        return (normalized * 2.0) - 1.0
    }

    private fun writeLittleEndianPcm16(bytes: ByteArray, sampleIndex: Int, sample: Int) {
        val byteIndex = sampleIndex * BYTES_PER_SAMPLE
        bytes[byteIndex] = (sample and 0xFF).toByte()
        bytes[byteIndex + 1] = ((sample shr 8) and 0xFF).toByte()
    }

    companion object {
        const val DEFAULT_LEVEL = 0.035f
        const val MAX_LEVEL = 0.055f
        private const val DEFAULT_SEED = 0x13572468
        private const val FILTER_MEMORY = 0.94
        private const val BYTES_PER_SAMPLE = 2
        private val MAX_SAMPLE_MAGNITUDE = (Short.MAX_VALUE * MAX_LEVEL).roundToInt()
    }
}

class FocusBackgroundDuckEnvelope(
    private val targetLevel: Float = FocusBackgroundNoiseGenerator.DEFAULT_LEVEL,
    private val attackMillis: Long = DEFAULT_ATTACK_MILLIS,
    private val holdMillis: Long = DEFAULT_HOLD_MILLIS,
    private val releaseMillis: Long = DEFAULT_RELEASE_MILLIS,
) {
    private var segmentStartMillis = 0L
    private var segmentStartLevel = targetLevel
    private var segmentTargetLevel = targetLevel
    private var segmentDurationMillis = 0L
    private var holdUntilMillis = Long.MIN_VALUE

    @Synchronized
    fun duck(nowMillis: Long) {
        val currentLevel = currentLevelAt(nowMillis)
        segmentStartMillis = nowMillis
        segmentStartLevel = currentLevel
        segmentTargetLevel = 0f
        segmentDurationMillis = attackMillis
        holdUntilMillis = nowMillis + holdMillis
    }

    @Synchronized
    fun levelAt(nowMillis: Long): Float {
        if (segmentTargetLevel == 0f && nowMillis >= holdUntilMillis) {
            val holdLevel = currentLevelAt(holdUntilMillis)
            segmentStartMillis = holdUntilMillis
            segmentStartLevel = holdLevel
            segmentTargetLevel = targetLevel
            segmentDurationMillis = releaseMillis
            holdUntilMillis = Long.MAX_VALUE
        }
        return currentLevelAt(nowMillis)
    }

    private fun currentLevelAt(nowMillis: Long): Float {
        if (segmentDurationMillis <= 0L) return segmentTargetLevel

        val progress = ((nowMillis - segmentStartMillis).toFloat() / segmentDurationMillis)
            .coerceIn(0f, 1f)
        return segmentStartLevel + ((segmentTargetLevel - segmentStartLevel) * progress)
    }

    companion object {
        private const val DEFAULT_ATTACK_MILLIS = 45L
        private const val DEFAULT_HOLD_MILLIS = 450L
        private const val DEFAULT_RELEASE_MILLIS = 650L
    }
}
