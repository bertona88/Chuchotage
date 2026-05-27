package com.andreabertoncini.chuchotage.network

import kotlinx.coroutines.test.runTest
import okhttp3.OkHttpClient
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertThrows
import org.junit.Assert.assertTrue
import org.junit.Test
import java.net.UnknownHostException

class ChatGptOAuthClientTest {
    @Test
    fun callbackInputParsesAuthorizationCode() {
        val code = ChatGptOAuthClient.authorizationCodeFromCallbackInput(
            input = "http://localhost:1455/auth/callback?code=ac_example.abc&state=expected",
            expectedState = "expected",
        )

        assertEquals("ac_example.abc", code)
    }

    @Test
    fun callbackInputParsesRequestTarget() {
        val code = ChatGptOAuthClient.authorizationCodeFromCallbackInput(
            input = "/auth/callback?code=ac_example.abc&state=expected",
            expectedState = "expected",
        )

        assertEquals("ac_example.abc", code)
    }

    @Test
    fun callbackInputParsesBareLocalhostUrl() {
        val code = ChatGptOAuthClient.authorizationCodeFromCallbackInput(
            input = "localhost:1455/auth/callback?code=ac_example.abc&state=expected",
            expectedState = "expected",
        )

        assertEquals("ac_example.abc", code)
    }

    @Test
    fun callbackInputRejectsWrongState() {
        assertThrows(IllegalArgumentException::class.java) {
            ChatGptOAuthClient.authorizationCodeFromCallbackInput(
                input = "http://localhost:1455/auth/callback?code=ac_example.abc&state=other",
                expectedState = "expected",
            )
        }
    }

    @Test
    fun callbackInputRejectsMissingCode() {
        assertThrows(IllegalArgumentException::class.java) {
            ChatGptOAuthClient.authorizationCodeFromCallbackInput(
                input = "http://localhost:1455/auth/callback?state=expected",
                expectedState = "expected",
            )
        }
    }

    @Test
    fun callbackInputRejectsOAuthError() {
        val exception = assertThrows(IllegalArgumentException::class.java) {
            ChatGptOAuthClient.authorizationCodeFromCallbackInput(
                input = "http://localhost:1455/auth/callback?error=access_denied&error_description=Nope&state=expected",
                expectedState = "expected",
            )
        }

        assertEquals("Nope", exception.message)
    }

    @Test
    fun callbackInputRejectsMalformedInput() {
        assertThrows(IllegalArgumentException::class.java) {
            ChatGptOAuthClient.authorizationCodeFromCallbackInput(
                input = "not a callback",
                expectedState = "expected",
            )
        }
    }

    @Test
    fun manualCallbackRejectsDuplicateSubmission() = runTest {
        val receiver = ChatGptOAuthCallbackReceiver("expected")
        val callbackUrl = "http://localhost:1455/auth/callback?code=ac_example.abc&state=expected"

        receiver.submit(callbackUrl)

        assertEquals("ac_example.abc", receiver.manualCallback.await())
        assertThrows(IllegalStateException::class.java) {
            receiver.submit(callbackUrl)
        }
    }

    @Test
    fun tokenExchangeResponseAllowsMissingIdToken() {
        val tokens = ChatGptOAuthClient().tokensFromExchangeResponse(
            """{"access_token":"access-token-value","refresh_token":"refresh-token-value"}""",
        )

        assertNull(tokens.idToken)
        assertEquals("access-token-value", tokens.accessToken)
        assertEquals("refresh-token-value", tokens.refreshToken)
    }

    @Test
    fun tokenExchangeResponseRejectsMissingAccessToken() {
        val exception = assertThrows(ChatGptSignInFailure.UnexpectedResponse::class.java) {
            ChatGptOAuthClient().tokensFromExchangeResponse(
                """{"refresh_token":"refresh-token-value"}""",
            )
        }

        assertEquals("Token exchange did not return an access_token.", exception.message)
    }

    @Test
    fun tokenExchangeResponseRejectsMissingRefreshToken() {
        val exception = assertThrows(ChatGptSignInFailure.UnexpectedResponse::class.java) {
            ChatGptOAuthClient().tokensFromExchangeResponse(
                """{"access_token":"access-token-value"}""",
            )
        }

        assertEquals("Token exchange did not return a refresh_token.", exception.message)
    }

    @Test
    fun refreshInvalidGrantAsksUserToSignInAgain() = runTest {
        MockWebServer().use { server ->
            server.enqueue(
                MockResponse()
                    .setResponseCode(400)
                    .setBody("""{"error":"invalid_grant"}"""),
            )
            server.start()
            val client = ChatGptOAuthClient(
                authIssuer = server.url("").toString().trimEnd('/'),
                oauthRetryDelaysMs = longArrayOf(0),
            )

            val exception = runCatching { client.refreshTokens("refresh-token-value") }.exceptionOrNull()

            assertTrue(exception is ChatGptSignInFailure.ReauthenticationRequired)
            assertEquals("Your ChatGPT sign-in expired. Sign in again.", exception?.message)
        }
    }

    @Test
    fun tokenNetworkDnsFailureUsesFriendlyMessage() = runTest {
        val client = ChatGptOAuthClient(
            okHttpClient = OkHttpClient.Builder()
                .addInterceptor { throw UnknownHostException("auth.openai.com") }
                .build(),
            oauthRetryDelaysMs = longArrayOf(0),
        )

        val exception = runCatching {
            client.exchangeCodeForTokens(
                code = "code",
                redirectUri = "http://localhost:1455/auth/callback",
                codeVerifier = "verifier",
            )
        }.exceptionOrNull()

        assertTrue(exception is ChatGptSignInFailure.TokenRequestFailed)
        assertTrue(exception?.message.orEmpty().contains("could not resolve auth.openai.com"))
    }

    @Test
    fun tokenNonRetryableOAuthErrorUsesServerDescription() = runTest {
        MockWebServer().use { server ->
            server.enqueue(
                MockResponse()
                    .setResponseCode(400)
                    .setBody("""{"error":"invalid_scope","error_description":"Scope was rejected."}"""),
            )
            server.start()
            val client = ChatGptOAuthClient(
                authIssuer = server.url("").toString().trimEnd('/'),
                oauthRetryDelaysMs = longArrayOf(0),
            )

            val exception = runCatching {
                client.exchangeCodeForTokens(
                    code = "code",
                    redirectUri = "http://localhost:1455/auth/callback",
                    codeVerifier = "verifier",
                )
            }.exceptionOrNull()

            assertTrue(exception is ChatGptSignInFailure.TokenRequestFailed)
            assertEquals("Scope was rejected.", exception?.message)
        }
    }
}
