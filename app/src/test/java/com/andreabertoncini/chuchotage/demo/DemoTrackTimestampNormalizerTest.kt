package com.andreabertoncini.chuchotage.demo

import org.junit.Assert.assertEquals
import org.junit.Test

class DemoTrackTimestampNormalizerTest {
    @Test
    fun rebasesUptimeBasedTimestampsToZero() {
        val normalizer = DemoTrackTimestampNormalizer()

        assertEquals(0L, normalizer.normalize(32_400_000_000L))
        assertEquals(33_333L, normalizer.normalize(32_400_033_333L))
        assertEquals(66_666L, normalizer.normalize(32_400_066_666L))
    }

    @Test
    fun keepsAlreadyZeroBasedTimestampsStable() {
        val normalizer = DemoTrackTimestampNormalizer()

        assertEquals(0L, normalizer.normalize(0L))
        assertEquals(20_000L, normalizer.normalize(20_000L))
        assertEquals(40_000L, normalizer.normalize(40_000L))
    }

    @Test
    fun keepsTimestampsMonotonicIfEncoderMovesBackward() {
        val normalizer = DemoTrackTimestampNormalizer()

        assertEquals(0L, normalizer.normalize(1_000L))
        assertEquals(1L, normalizer.normalize(900L))
        assertEquals(100L, normalizer.normalize(1_100L))
    }
}
