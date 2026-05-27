package com.andreabertoncini.chuchotage.network

import android.content.ActivityNotFoundException
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.util.Base64
import androidx.browser.customtabs.CustomTabsIntent
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.currentCoroutineContext
import kotlinx.coroutines.delay
import kotlinx.coroutines.ensureActive
import kotlinx.coroutines.withContext
import okhttp3.FormBody
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONException
import org.json.JSONObject
import java.io.BufferedReader
import java.io.Closeable
import java.io.IOException
import java.io.InputStreamReader
import java.net.InetAddress
import java.net.InetSocketAddress
import java.net.URI
import java.net.ServerSocket
import java.net.Socket
import java.net.SocketException
import java.net.SocketTimeoutException
import java.net.URLDecoder
import java.net.UnknownHostException
import java.security.MessageDigest
import java.security.SecureRandom

data class ChatGptOAuthTokens(
    val idToken: String?,
    val accessToken: String,
    val refreshToken: String,
)

sealed class ChatGptSignInStatus {
    data object OpeningBrowser : ChatGptSignInStatus()
    data object WaitingForCallback : ChatGptSignInStatus()
    data object ExchangingToken : ChatGptSignInStatus()
}

internal sealed class OAuthHttpFailure {
    data class Network(val message: String, val cause: IOException) : OAuthHttpFailure()
    data class ReauthenticationRequired(val message: String) : OAuthHttpFailure()
    data class ServiceUnavailable(val message: String) : OAuthHttpFailure()
    data class Rejected(val message: String) : OAuthHttpFailure()
}

internal sealed class ChatGptSignInFailure(
    message: String,
    cause: Throwable? = null,
) : IllegalStateException(message, cause) {
    class BrowserUnavailable(cause: Throwable? = null) : ChatGptSignInFailure(
        "Could not open a browser for ChatGPT sign-in. Install or enable Chrome and try again.",
        cause,
    )

    class CallbackServerUnavailable(cause: Throwable? = null) : ChatGptSignInFailure(
        "Could not start the local sign-in callback server. Try again, or paste a ChatGPT access token instead.",
        cause,
    )

    class Cancelled : ChatGptSignInFailure("Sign-in cancelled.")

    class Timeout : ChatGptSignInFailure(
        "Sign-in timed out. Try again, or paste the localhost callback URL from Chrome.",
    )

    class ReauthenticationRequired(message: String) : ChatGptSignInFailure(message)

    class TokenRequestFailed(message: String, cause: Throwable? = null) : ChatGptSignInFailure(message, cause)

    class UnexpectedResponse(message: String) : ChatGptSignInFailure(message)
}

internal class ChatGptOAuthCallbackReceiver(
    val expectedState: String,
    val manualCallback: CompletableDeferred<String> = CompletableDeferred(),
) {
    fun submit(callbackUrl: String) {
        val code = ChatGptOAuthClient.authorizationCodeFromCallbackInput(callbackUrl, expectedState)
        if (!manualCallback.complete(code)) {
            error("This sign-in attempt already received a callback.")
        }
    }

    fun cancel() {
        manualCallback.completeExceptionally(ChatGptSignInFailure.Cancelled())
    }
}

class ChatGptOAuthClient(
    private val okHttpClient: OkHttpClient = OkHttpClient(),
    private val authIssuer: String = AUTH_ISSUER,
    private val oauthRetryDelaysMs: LongArray = OAUTH_RETRY_DELAYS_MS,
) {
    private val activeLoginLock = Any()
    private var activeLogin: ChatGptOAuthCallbackReceiver? = null

    suspend fun login(
        context: Context,
        onStatus: suspend (ChatGptSignInStatus) -> Unit = {},
    ): ChatGptOAuthTokens = withContext(Dispatchers.IO) {
        val pkce = generatePkce()
        val state = randomBase64Url(32)
        val callbackReceiver = ChatGptOAuthCallbackReceiver(state)
        registerActiveLogin(callbackReceiver)

        val server = try {
            bindCallbackServer()
        } catch (exception: Throwable) {
            clearActiveLogin(callbackReceiver)
            throw ChatGptSignInFailure.CallbackServerUnavailable(exception)
        }

        try {
            val redirectUri = "http://localhost:${server.localPort}/auth/callback"
            val authUrl = buildAuthorizeUrl(
                redirectUri = redirectUri,
                codeChallenge = pkce.codeChallenge,
                state = state,
            )

            emitStatus(ChatGptSignInStatus.OpeningBrowser, onStatus)
            withContext(Dispatchers.Main) {
                openBrowser(context, authUrl)
            }

            emitStatus(ChatGptSignInStatus.WaitingForCallback, onStatus)
            val code = waitForAuthorizationCode(server, callbackReceiver)

            emitStatus(ChatGptSignInStatus.ExchangingToken, onStatus)
            exchangeCodeForTokens(
                code = code,
                redirectUri = redirectUri,
                codeVerifier = pkce.codeVerifier,
            )
        } finally {
            clearActiveLogin(callbackReceiver)
            runCatching { server.close() }
        }
    }

    fun submitCallbackUrl(callbackUrl: String) {
        val login = synchronized(activeLoginLock) { activeLogin }
            ?: error("Start ChatGPT sign-in before pasting a callback URL.")
        login.submit(callbackUrl)
    }

    fun cancelLogin(): Boolean {
        val login = synchronized(activeLoginLock) { activeLogin } ?: return false
        login.cancel()
        return true
    }

    suspend fun refreshIfNeeded(
        credential: OpenAiCredential,
        forceRefresh: Boolean = false,
    ): OpenAiCredential {
        if (credential.kind != OpenAiCredentialKind.CHATGPT_ACCESS_TOKEN) return credential
        val refreshToken = credential.refreshToken?.takeIf { it.isNotBlank() } ?: return credential
        if (!forceRefresh && !shouldRefresh(credential)) return credential

        val accessTokenWasExpiring = accessTokenIsExpiring(credential.value)
        val refreshed = refreshTokens(refreshToken)
        if (refreshed.accessToken == null && (forceRefresh || accessTokenWasExpiring)) {
            throw ChatGptSignInFailure.UnexpectedResponse("Token refresh did not return an access_token.")
        }

        return credential.copy(
            idToken = refreshed.idToken ?: credential.idToken,
            value = refreshed.accessToken ?: credential.value,
            refreshToken = refreshed.refreshToken ?: credential.refreshToken,
            lastRefreshEpochSeconds = System.currentTimeMillis() / 1_000,
        )
    }

    private suspend fun emitStatus(
        status: ChatGptSignInStatus,
        onStatus: suspend (ChatGptSignInStatus) -> Unit,
    ) {
        withContext(Dispatchers.Main) {
            onStatus(status)
        }
    }

    private fun openBrowser(context: Context, authUrl: String) {
        val uri = Uri.parse(authUrl)
        val customTabsIntent = CustomTabsIntent.Builder().build()
        customTabsIntent.intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)

        val customTabsError = runCatching {
            customTabsIntent.launchUrl(context, uri)
        }.exceptionOrNull()
        if (customTabsError == null) return

        val intent = Intent(Intent.ACTION_VIEW, uri)
            .addCategory(Intent.CATEGORY_BROWSABLE)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        try {
            context.startActivity(intent)
        } catch (exception: ActivityNotFoundException) {
            throw ChatGptSignInFailure.BrowserUnavailable(exception)
        } catch (exception: RuntimeException) {
            throw ChatGptSignInFailure.BrowserUnavailable(exception)
        }
    }

    private fun buildAuthorizeUrl(
        redirectUri: String,
        codeChallenge: String,
        state: String,
    ): String {
        return Uri.parse("$authIssuer/oauth/authorize")
            .buildUpon()
            .appendQueryParameter("response_type", "code")
            .appendQueryParameter("client_id", CLIENT_ID)
            .appendQueryParameter("redirect_uri", redirectUri)
            .appendQueryParameter("scope", AUTH_SCOPE)
            .appendQueryParameter("code_challenge", codeChallenge)
            .appendQueryParameter("code_challenge_method", "S256")
            .appendQueryParameter("id_token_add_organizations", "true")
            .appendQueryParameter("codex_cli_simplified_flow", "true")
            .appendQueryParameter("state", state)
            .appendQueryParameter("originator", ORIGINATOR)
            .build()
            .toString()
    }

    private suspend fun waitForAuthorizationCode(
        server: CallbackServer,
        callbackReceiver: ChatGptOAuthCallbackReceiver,
    ): String {
        val deadline = System.currentTimeMillis() + LOGIN_TIMEOUT_MS

        while (System.currentTimeMillis() < deadline) {
            currentCoroutineContext().ensureActive()
            if (callbackReceiver.manualCallback.isCompleted) {
                return callbackReceiver.manualCallback.await()
            }

            val socket = try {
                server.accept(ACCEPT_TIMEOUT_MS)
            } catch (_: SocketTimeoutException) {
                continue
            } ?: continue

            socket.use { callbackSocket ->
                callbackSocket.soTimeout = SOCKET_READ_TIMEOUT_MS
                val requestTarget = try {
                    readRequestTarget(callbackSocket)
                } catch (_: SocketTimeoutException) {
                    return@use
                } catch (_: IOException) {
                    return@use
                }
                if (requestTarget == null) {
                    writeHttpResponse(callbackSocket, 400, "Bad request")
                    return@use
                }
                val callbackInput = callbackInputFromBrowserInput(requestTarget)
                when (callbackPath(callbackInput)) {
                    "/auth/callback" -> {
                        val code = runCatching {
                            authorizationCodeFromCallbackInput(callbackInput, callbackReceiver.expectedState)
                        }.getOrElse { exception ->
                            writeHttpResponse(callbackSocket, 400, "Sign-in failed")
                            throw exception
                        }

                        writeHttpResponse(callbackSocket, 200, "Sign-in complete. Return to Chuchotage.")
                        return code
                    }
                    "/cancel" -> {
                        writeHttpResponse(callbackSocket, 200, "Sign-in cancelled")
                        throw ChatGptSignInFailure.Cancelled()
                    }
                    else -> writeHttpResponse(callbackSocket, 404, "Not found")
                }
            }
        }

        throw ChatGptSignInFailure.Timeout()
    }

    private fun callbackPath(callbackInput: String): String? {
        return runCatching { URI(callbackInput).path }.getOrNull()
    }

    private fun readRequestTarget(socket: Socket): String? {
        val reader = BufferedReader(InputStreamReader(socket.getInputStream(), Charsets.UTF_8))
        val requestLine = reader.readLine() ?: return null
        while (true) {
            val line = reader.readLine() ?: break
            if (line.isEmpty()) break
        }
        return requestLine.split(" ").getOrNull(1)
    }

    private fun writeHttpResponse(socket: Socket, status: Int, message: String) {
        val reason = if (status in 200..299) "OK" else "Error"
        val body = buildCallbackResponseHtml(status, message).toByteArray(Charsets.UTF_8)
        val header = buildString {
            append("HTTP/1.1 $status $reason\r\n")
            append("Content-Type: text/html; charset=utf-8\r\n")
            append("Content-Length: ${body.size}\r\n")
            append("Connection: close\r\n")
            append("\r\n")
        }.toByteArray(Charsets.UTF_8)

        try {
            socket.getOutputStream().use { output ->
                output.write(header)
                output.write(body)
                output.flush()
            }
        } catch (_: SocketException) {
            // The browser may close the localhost redirect tab before reading this page.
        } catch (_: IOException) {
            // The OAuth code is already in the request; failing to render the page is non-fatal.
        }
    }

    private fun buildCallbackResponseHtml(status: Int, message: String): String {
        val isCancelled = message.lowercase().contains("cancelled")
        val isSuccess = status in 200..299 && !isCancelled
        val safeMessage = htmlEscape(message)
        val heading = when {
            isSuccess -> "Signed in"
            isCancelled -> "Cancelled"
            else -> "Sign-in issue"
        }
        val title = when {
            isSuccess -> "Sign-in complete"
            isCancelled -> "Sign-in cancelled"
            else -> "Sign-in needs attention"
        }
        val detail = when {
            isSuccess -> "Chuchotage should reopen automatically. If it doesn't, tap the button below."
            isCancelled -> "Return to Chuchotage whenever you want to try again."
            else -> "Return to Chuchotage and try signing in again."
        }
        val titleColor = if (isSuccess || isCancelled) "var(--text)" else "var(--error)"
        val returnToAppUrl = APP_RETURN_DEEP_LINK_URI
        val autoOpenScript = if (isSuccess) {
            """
                <script>
                    window.setTimeout(function () {
                        window.location.href = "$returnToAppUrl";
                    }, 700);
                </script>
            """.trimIndent()
        } else {
            ""
        }
        return """
            <!doctype html>
            <html lang="en">
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1">
                <title>Chuchotage</title>
                <style>
                    :root {
                        color-scheme: dark;
                        --ink: #07131D;
                        --ink-deep: #02070C;
                        --surface: #0C1B26;
                        --surface-raised: #122838;
                        --ring: #2A3B47;
                        --signal-blue: #1D9BDA;
                        --signal-blue-soft: #68C8F4;
                        --cream: #F2E9DD;
                        --text: #E8EDF1;
                        --muted: #A1ADB7;
                        --error: #F08D7E;
                    }

                    * {
                        box-sizing: border-box;
                    }

                    html,
                    body {
                        min-height: 100%;
                    }

                    body {
                        margin: 0;
                        display: grid;
                        place-items: center;
                        padding: 28px;
                        background:
                            linear-gradient(135deg, rgba(29, 155, 218, 0.1), transparent 36%),
                            linear-gradient(180deg, var(--ink), var(--ink-deep));
                        color: var(--text);
                        font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
                    }

                    main {
                        width: min(100%, 420px);
                        padding: 34px 28px 30px;
                        border: 1px solid rgba(104, 200, 244, 0.22);
                        border-radius: 8px;
                        background: linear-gradient(180deg, rgba(18, 40, 56, 0.88), rgba(12, 27, 38, 0.9));
                        box-shadow: 0 24px 80px rgba(0, 0, 0, 0.42);
                        text-align: center;
                    }

                    .mark {
                        position: relative;
                        width: 112px;
                        height: 112px;
                        margin: 0 auto 24px;
                        border: 1px solid var(--ring);
                        border-radius: 50%;
                        background:
                            radial-gradient(circle, rgba(104, 200, 244, 0.26), transparent 43%),
                            linear-gradient(145deg, rgba(7, 19, 29, 0.95), rgba(2, 7, 12, 0.95));
                        box-shadow:
                            inset 0 0 28px rgba(104, 200, 244, 0.14),
                            0 0 34px rgba(29, 155, 218, 0.18);
                    }

                    .mark::before,
                    .mark::after {
                        content: "";
                        position: absolute;
                        inset: 23px;
                        border: 2px solid transparent;
                        border-left-color: var(--cream);
                        border-right-color: var(--signal-blue-soft);
                        border-radius: 50%;
                    }

                    .mark::after {
                        inset: 38px;
                        border-left-color: var(--signal-blue);
                        border-right-color: var(--cream);
                        opacity: 0.9;
                    }

                    .eyebrow {
                        margin: 0 0 10px;
                        color: var(--signal-blue-soft);
                        font-size: 0.78rem;
                        font-weight: 700;
                        letter-spacing: 0;
                        text-transform: uppercase;
                    }

                    h1 {
                        margin: 0;
                        color: var(--cream);
                        font-size: 3rem;
                        font-weight: 650;
                        line-height: 0.95;
                        letter-spacing: 0;
                    }

                    h2 {
                        margin: 22px 0 10px;
                        color: $titleColor;
                        font-size: 1.12rem;
                        font-weight: 650;
                        letter-spacing: 0;
                    }

                    p {
                        margin: 0;
                        color: var(--muted);
                        font-size: 1rem;
                        line-height: 1.55;
                    }

                    .message {
                        margin-top: 14px;
                        color: var(--text);
                    }

                    .primary-action {
                        display: inline-flex;
                        align-items: center;
                        justify-content: center;
                        min-height: 48px;
                        width: 100%;
                        margin-top: 24px;
                        padding: 0 18px;
                        border-radius: 8px;
                        background: var(--signal-blue-soft);
                        color: var(--ink-deep);
                        font-size: 1rem;
                        font-weight: 750;
                        text-decoration: none;
                    }

                    .primary-action:active {
                        transform: translateY(1px);
                    }

                    @media (max-width: 380px) {
                        body {
                            padding: 18px;
                        }

                        main {
                            padding: 28px 22px 26px;
                        }

                        h1 {
                            font-size: 2.35rem;
                        }
                    }
                </style>
            </head>
            <body>
                <main>
                    <div class="mark" aria-hidden="true"></div>
                    <p class="eyebrow">Chuchotage</p>
                    <h1>$heading</h1>
                    <h2>$title</h2>
                    <p>$detail</p>
                    <p class="message">$safeMessage</p>
                    <a class="primary-action" href="$returnToAppUrl">Open Chuchotage</a>
                </main>
                $autoOpenScript
            </body>
            </html>
        """.trimIndent()
    }

    internal suspend fun exchangeCodeForTokens(
        code: String,
        redirectUri: String,
        codeVerifier: String,
    ): ChatGptOAuthTokens = withContext(Dispatchers.IO) {
        val body = FormBody.Builder()
            .add("grant_type", "authorization_code")
            .add("code", code)
            .add("redirect_uri", redirectUri)
            .add("client_id", CLIENT_ID)
            .add("code_verifier", codeVerifier)
            .build()

        val request = Request.Builder()
            .url("$authIssuer/oauth/token")
            .post(body)
            .build()

        executeOAuthRequestWithRetry(request, "Token exchange").let { result ->
            if (!result.isSuccessful) {
                throw oauthFailureFor(result, "Token exchange").toException()
            }

            tokensFromExchangeResponse(result.text)
        }
    }

    internal suspend fun refreshTokens(refreshToken: String): ChatGptOAuthTokenRefresh = withContext(Dispatchers.IO) {
        val body = JSONObject()
            .put("client_id", CLIENT_ID)
            .put("grant_type", "refresh_token")
            .put("refresh_token", refreshToken)

        val request = Request.Builder()
            .url("$authIssuer/oauth/token")
            .addHeader("Content-Type", "application/json")
            .post(body.toString().toRequestBody(JSON_MEDIA_TYPE))
            .build()

        executeOAuthRequestWithRetry(request, "Token refresh").let { result ->
            if (!result.isSuccessful) {
                throw oauthFailureFor(result, "Token refresh").toException()
            }

            refreshFromResponse(result.text)
        }
    }

    private suspend fun executeOAuthRequestWithRetry(
        request: Request,
        operationName: String,
    ): OAuthHttpResult {
        var lastNetworkError: IOException? = null

        oauthRetryDelaysMs.forEachIndexed { attempt, delayMs ->
            try {
                okHttpClient.newCall(request).execute().use { response ->
                    val text = response.body?.string().orEmpty()
                    val result = OAuthHttpResult(
                        code = response.code,
                        text = text,
                        isSuccessful = response.isSuccessful,
                    )
                    if (result.isRetryableHttpFailure && attempt < oauthRetryDelaysMs.lastIndex) {
                        delay(delayMs)
                    } else {
                        return result
                    }
                }
            } catch (exception: IOException) {
                lastNetworkError = exception
                if (!exception.isRetryableOAuthNetworkError() || attempt == oauthRetryDelaysMs.lastIndex) {
                    throw OAuthHttpFailure.Network(
                        exception.toUserVisibleOAuthErrorMessage(operationName),
                        exception,
                    ).toException()
                }
                delay(delayMs)
            }
        }

        val exception = lastNetworkError ?: IOException("Network request failed.")
        throw OAuthHttpFailure.Network(
            exception.toUserVisibleOAuthErrorMessage(operationName),
            exception,
        ).toException()
    }

    private fun oauthFailureFor(result: OAuthHttpResult, operationName: String): OAuthHttpFailure {
        val details = parseOAuthErrorDetails(result.text)
        val description = details?.userVisibleMessage
        return when {
            result.code == 401 || details?.requiresReauthentication == true -> {
                OAuthHttpFailure.ReauthenticationRequired(
                    if (operationName == "Token refresh") {
                        "Your ChatGPT sign-in expired. Sign in again."
                    } else {
                        "This ChatGPT sign-in link expired. Try signing in again."
                    },
                )
            }
            result.isRetryableHttpFailure -> OAuthHttpFailure.ServiceUnavailable(
                "$operationName could not reach auth.openai.com reliably. Check the phone's network and try again.",
            )
            !description.isNullOrBlank() -> OAuthHttpFailure.Rejected(description)
            else -> OAuthHttpFailure.Rejected("$operationName failed with status ${result.code}.")
        }
    }

    private fun OAuthHttpFailure.toException(): ChatGptSignInFailure {
        return when (this) {
            is OAuthHttpFailure.Network -> ChatGptSignInFailure.TokenRequestFailed(message, cause)
            is OAuthHttpFailure.ReauthenticationRequired -> ChatGptSignInFailure.ReauthenticationRequired(message)
            is OAuthHttpFailure.ServiceUnavailable -> ChatGptSignInFailure.TokenRequestFailed(message)
            is OAuthHttpFailure.Rejected -> ChatGptSignInFailure.TokenRequestFailed(message)
        }
    }

    private fun shouldRefresh(credential: OpenAiCredential): Boolean {
        if (accessTokenIsExpiring(credential.value)) {
            return true
        }

        val now = System.currentTimeMillis() / 1_000
        val lastRefresh = credential.lastRefreshEpochSeconds ?: return false
        return lastRefresh <= now - PROACTIVE_REFRESH_INTERVAL_SECONDS
    }

    private fun accessTokenIsExpiring(accessToken: String): Boolean {
        val now = System.currentTimeMillis() / 1_000
        val expiresAt = parseJwtExpirationEpochSeconds(accessToken)
        return expiresAt != null && expiresAt <= now + TOKEN_REFRESH_SKEW_SECONDS
    }

    private fun parseJwtExpirationEpochSeconds(token: String): Long? {
        val payload = token.split(".").getOrNull(1)?.takeIf { it.isNotBlank() } ?: return null
        return runCatching {
            val bytes = Base64.decode(payload, Base64.URL_SAFE or Base64.NO_PADDING or Base64.NO_WRAP)
            JSONObject(String(bytes, Charsets.UTF_8)).optLong("exp").takeIf { it > 0L }
        }.getOrNull()
    }

    private fun bindCallbackServer(): CallbackServer {
        CALLBACK_PORTS.forEach { port ->
            val sockets = CALLBACK_BIND_HOSTS.mapNotNull { host ->
                bindCallbackSocket(host, port)
            }
            if (sockets.isNotEmpty()) {
                return CallbackServer(port, sockets)
            }
        }
        throw ChatGptSignInFailure.CallbackServerUnavailable()
    }

    private fun bindCallbackSocket(host: String, port: Int): ServerSocket? {
        val server = ServerSocket()
        return try {
            server.reuseAddress = true
            server.bind(InetSocketAddress(InetAddress.getByName(host), port))
            server
        } catch (_: Throwable) {
            runCatching { server.close() }
            null
        }
    }

    private fun registerActiveLogin(callbackReceiver: ChatGptOAuthCallbackReceiver) {
        synchronized(activeLoginLock) {
            check(activeLogin == null) {
                "A ChatGPT sign-in is already in progress."
            }
            activeLogin = callbackReceiver
        }
    }

    private fun clearActiveLogin(callbackReceiver: ChatGptOAuthCallbackReceiver) {
        synchronized(activeLoginLock) {
            if (activeLogin === callbackReceiver) {
                activeLogin = null
            }
        }
    }

    internal fun tokensFromExchangeResponse(text: String): ChatGptOAuthTokens {
        val json = parseJsonObject(text, "Token exchange")
        val accessToken = json.requiredString("access_token", "Token exchange did not return an access_token.")
        val refreshToken = json.requiredString("refresh_token", "Token exchange did not return a refresh_token.")
        return ChatGptOAuthTokens(
            idToken = json.optionalString("id_token"),
            accessToken = accessToken,
            refreshToken = refreshToken,
        )
    }

    internal fun refreshFromResponse(text: String): ChatGptOAuthTokenRefresh {
        val json = parseJsonObject(text, "Token refresh")
        return ChatGptOAuthTokenRefresh(
            idToken = json.optionalString("id_token"),
            accessToken = json.optionalString("access_token"),
            refreshToken = json.optionalString("refresh_token"),
        )
    }

    private fun parseJsonObject(text: String, operationName: String): JSONObject {
        return try {
            JSONObject(text)
        } catch (_: JSONException) {
            throw ChatGptSignInFailure.UnexpectedResponse("$operationName returned an invalid response.")
        }
    }

    private fun JSONObject.requiredString(name: String, message: String): String {
        return optionalString(name) ?: throw ChatGptSignInFailure.UnexpectedResponse(message)
    }

    private fun JSONObject.optionalString(name: String): String? {
        if (!has(name) || isNull(name)) return null
        return optString(name).takeIf { it.isNotBlank() }
    }

    private fun parseOAuthErrorDetails(text: String): OAuthErrorDetails? {
        return runCatching {
            val json = JSONObject(text)
            val errorObject = json.optJSONObject("error")
            val code = json.optString("error").takeIf { it.isNotBlank() }
                ?: errorObject?.optString("code")?.takeIf { it.isNotBlank() }
                ?: errorObject?.optString("type")?.takeIf { it.isNotBlank() }
            val description = json.optString("error_description").takeIf { it.isNotBlank() }
                ?: errorObject?.optString("message")?.takeIf { it.isNotBlank() }
                ?: code
            OAuthErrorDetails(code, description)
        }.getOrNull()
    }

    private fun htmlEscape(value: String): String {
        return value
            .replace("&", "&amp;")
            .replace("<", "&lt;")
            .replace(">", "&gt;")
            .replace("\"", "&quot;")
            .replace("'", "&#39;")
    }

    private fun IOException.isRetryableOAuthNetworkError(): Boolean {
        return this is UnknownHostException || this is SocketTimeoutException
    }

    private fun IOException.toUserVisibleOAuthErrorMessage(operationName: String): String {
        return if (this is UnknownHostException) {
            "$operationName could not resolve auth.openai.com. Check the phone's VPN, private DNS, or network and try again."
        } else {
            "$operationName could not reach auth.openai.com. Check the phone's network and try again."
        }
    }

    private fun generatePkce(): PkceCodes {
        val verifier = randomBase64Url(64)
        val digest = MessageDigest.getInstance("SHA-256").digest(verifier.toByteArray(Charsets.UTF_8))
        return PkceCodes(
            codeVerifier = verifier,
            codeChallenge = base64UrlNoPadding(digest),
        )
    }

    private fun randomBase64Url(size: Int): String {
        val bytes = ByteArray(size)
        secureRandom.nextBytes(bytes)
        return base64UrlNoPadding(bytes)
    }

    private fun base64UrlNoPadding(bytes: ByteArray): String {
        return Base64.encodeToString(bytes, Base64.URL_SAFE or Base64.NO_PADDING or Base64.NO_WRAP)
    }

    private data class PkceCodes(
        val codeVerifier: String,
        val codeChallenge: String,
    )

    internal data class ChatGptOAuthTokenRefresh(
        val idToken: String?,
        val accessToken: String?,
        val refreshToken: String?,
    )

    private data class OAuthHttpResult(
        val code: Int,
        val text: String,
        val isSuccessful: Boolean,
    ) {
        val isRetryableHttpFailure: Boolean = code == 429 || code in 500..599
    }

    private data class OAuthErrorDetails(
        val code: String?,
        val description: String?,
    ) {
        val requiresReauthentication: Boolean =
            code == "invalid_grant" || code == "invalid_token" || code == "unauthorized"

        val userVisibleMessage: String?
            get() = description?.takeIf { it.isNotBlank() }
    }

    private class CallbackServer(
        val localPort: Int,
        private val sockets: List<ServerSocket>,
    ) : Closeable {
        fun accept(timeoutMs: Int): Socket? {
            sockets.forEach { socket ->
                socket.soTimeout = timeoutMs
                try {
                    return socket.accept()
                } catch (_: SocketTimeoutException) {
                    // Keep polling the other loopback family.
                }
            }
            return null
        }

        override fun close() {
            sockets.forEach { socket ->
                runCatching { socket.close() }
            }
        }
    }

    companion object {
        private const val AUTH_ISSUER = "https://auth.openai.com"
        private const val CLIENT_ID = "app_EMoamEEZ73f0CkXaXp7hrann"
        private const val AUTH_SCOPE = "openid profile email offline_access api.connectors.read api.connectors.invoke"
        private const val ORIGINATOR = "codex_cli_rs"
        private const val ACCEPT_TIMEOUT_MS = 250
        private const val SOCKET_READ_TIMEOUT_MS = 5_000
        private const val LOGIN_TIMEOUT_MS = 15 * 60 * 1_000L
        private const val TOKEN_REFRESH_SKEW_SECONDS = 60L
        private const val PROACTIVE_REFRESH_INTERVAL_SECONDS = 8 * 24 * 60 * 60L
        private const val APP_RETURN_DEEP_LINK_URI = "com.andreabertoncini.chuchotage://auth/complete"
        private val OAUTH_RETRY_DELAYS_MS = longArrayOf(250, 500, 1_000, 2_000, 4_000, 8_000)
        private val CALLBACK_PORTS = intArrayOf(1455, 1457)
        private val CALLBACK_BIND_HOSTS = arrayOf("::", "0.0.0.0", "::1", "127.0.0.1")
        private val JSON_MEDIA_TYPE = "application/json".toMediaType()
        private val secureRandom = SecureRandom()

        internal fun authorizationCodeFromCallbackInput(input: String, expectedState: String): String {
            val callbackUri = runCatching { URI(callbackInputFromBrowserInput(input)) }.getOrElse {
                throw IllegalArgumentException("Paste the full localhost callback URL from Chrome.")
            }
            require(callbackUri.path == "/auth/callback") {
                "Paste the full localhost callback URL from Chrome."
            }

            val parameters = queryParameters(callbackUri.rawQuery)
            val state = parameters["state"]
            require(state == expectedState) {
                "That callback link belongs to a different sign-in attempt. Tap Sign in with ChatGPT and paste the newest localhost link."
            }

            val oauthError = parameters["error"]
            if (!oauthError.isNullOrBlank()) {
                val description = parameters["error_description"]?.takeIf { it.isNotBlank() }
                throw IllegalArgumentException(description ?: "Sign-in failed: $oauthError")
            }

            return parameters["code"]?.takeIf { it.isNotBlank() }
                ?: throw IllegalArgumentException("Sign-in did not return an authorization code.")
        }

        internal fun callbackInputFromBrowserInput(input: String): String {
            val trimmed = input.trim()
            return when {
                trimmed.startsWith("http://") || trimmed.startsWith("https://") -> trimmed
                trimmed.startsWith("localhost:") ||
                    trimmed.startsWith("127.0.0.1:") ||
                    trimmed.startsWith("[::1]:") -> "http://$trimmed"
                trimmed.startsWith("/") -> "http://localhost$trimmed"
                else -> trimmed
            }
        }

        private fun queryParameters(rawQuery: String?): Map<String, String> {
            if (rawQuery.isNullOrBlank()) return emptyMap()
            return rawQuery.split("&")
                .mapNotNull { part ->
                    val separator = part.indexOf("=")
                    if (separator <= 0) return@mapNotNull null
                    val name = decodeQueryComponent(part.substring(0, separator))
                    val value = decodeQueryComponent(part.substring(separator + 1))
                    name to value
                }
                .toMap()
        }

        private fun decodeQueryComponent(value: String): String {
            return URLDecoder.decode(value, Charsets.UTF_8.name())
        }
    }
}
