package com.andreabertoncini.chuchotage.network

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.util.Base64

class CodexUsageClientTest {
    @Test
    fun usageSnapshotReadsCreditsAndRemainingWindow() {
        val snapshot = CodexUsageClient.usageSnapshotFromPayload(
            """
            {
              "plan_type": "pro",
              "rate_limit": {
                "allowed": true,
                "limit_reached": false,
                "primary_window": {
                  "used_percent": 41,
                  "limit_window_seconds": 300,
                  "reset_after_seconds": 120,
                  "reset_at": 1800000000
                }
              },
              "credits": {
                "has_credits": true,
                "unlimited": false,
                "balance": "9.99"
              }
            }
            """.trimIndent(),
        )

        assertEquals(59, snapshot.remainingPercent)
        assertEquals(0.59f, snapshot.remainingFraction)
        assertEquals("9.99", snapshot.creditsBalance)
        assertEquals(true, snapshot.hasCredits)
        assertFalse(snapshot.unlimitedCredits)
        assertEquals(1800000000L, snapshot.resetsAtEpochSeconds)
    }

    @Test
    fun usageSnapshotHandlesUnlimitedCreditsWithoutWindow() {
        val snapshot = CodexUsageClient.usageSnapshotFromPayload(
            """
            {
              "plan_type": "enterprise",
              "credits": {
                "has_credits": true,
                "unlimited": true
              }
            }
            """.trimIndent(),
        )

        assertNull(snapshot.remainingPercent)
        assertNull(snapshot.remainingFraction)
        assertNull(snapshot.creditsBalance)
        assertEquals(true, snapshot.hasCredits)
        assertTrue(snapshot.unlimitedCredits)
        assertNull(snapshot.resetsAtEpochSeconds)
    }

    @Test
    fun accountIdIsReadFromIdTokenAuthClaims() {
        val idToken = fakeJwtPayload(
            """
            {
              "https://api.openai.com/auth": {
                "chatgpt_account_id": "acct_123",
                "chatgpt_account_is_fedramp": true
              }
            }
            """.trimIndent(),
        )

        val account = CodexUsageClient.chatGptAccountFromIdToken(idToken)

        assertEquals("acct_123", account?.id)
        assertEquals(true, account?.isFedramp)
    }

    private fun fakeJwtPayload(payload: String): String {
        val header = Base64.getUrlEncoder().withoutPadding().encodeToString("{}".toByteArray())
        val body = Base64.getUrlEncoder().withoutPadding().encodeToString(payload.toByteArray())
        return "$header.$body.signature"
    }
}
