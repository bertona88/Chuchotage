package com.andreabertoncini.chuchotage.network

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class ApiKeyValidatorTest {
    @Test
    fun acceptsPlausibleOpenAiKey() {
        assertTrue(ApiKeyValidator.isPlausible("sk-proj-abcdefghijklmnopqrstuvwxyz"))
        assertTrue(OpenAiCredentialValidator.isPlausibleApiKey("sk-proj-abcdefghijklmnopqrstuvwxyz"))
    }

    @Test
    fun acceptsPlausibleChatGptAccessToken() {
        val token = "eyJhbGciOiJSUzI1NiJ9.eyJhdWQiOiJvcGVuYWkifQ.signature"

        assertTrue(OpenAiCredentialValidator.isPlausibleChatGptAccessToken(token))
    }

    @Test
    fun acceptsSponsoredTrialInstallId() {
        val credential = OpenAiCredential(
            kind = OpenAiCredentialKind.SPONSORED_TRIAL,
            value = "123e4567-e89b-12d3-a456-426614174000",
        )

        assertTrue(OpenAiCredentialValidator.isPlausible(credential))
    }

    @Test
    fun rejectsBlankOrShortKeys() {
        assertFalse(ApiKeyValidator.isPlausible(""))
        assertFalse(ApiKeyValidator.isPlausible("sk-short"))
    }

    @Test
    fun rejectsKeysWithWhitespace() {
        assertFalse(ApiKeyValidator.isPlausible("sk-proj abcdefghijklmnopqrstuvwxyz"))
    }

    @Test
    fun rejectsApiKeysAsChatGptAccessTokens() {
        assertFalse(OpenAiCredentialValidator.isPlausibleChatGptAccessToken("sk-proj-abcdefghijklmnopqrstuvwxyz"))
    }

    @Test
    fun rejectsInvalidSponsoredTrialInstallId() {
        assertFalse(OpenAiCredentialValidator.isPlausibleSponsoredTrialInstallId("not-a-stable-install-id"))
    }
}
