package com.andreabertoncini.chuchotage.network

import com.andreabertoncini.chuchotage.settings.TranslationLanguages
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.io.IOException
import java.net.SocketTimeoutException
import java.net.UnknownHostException

data class RealtimeTranslationSessionToken(
    val value: String,
    val shouldSendSessionUpdate: Boolean,
)

class RealtimeTranslationClientSecretProvider(
    private val okHttpClient: OkHttpClient = OkHttpClient(),
    private val clientSecretUrl: String = CLIENT_SECRET_URL,
    private val retryDelaysMs: LongArray = CLIENT_SECRET_RETRY_DELAYS_MS,
) {
    suspend fun sessionBearerTokenFor(
        credential: OpenAiCredential,
        targetLanguageCode: String = TranslationLanguages.DEFAULT_TARGET_LANGUAGE_CODE,
        sourceTranscriptEnabled: Boolean = false,
        refreshCredentialAfterUnauthorized: suspend () -> OpenAiCredential? = { null },
    ): RealtimeTranslationSessionToken {
        val sanitizedTargetLanguageCode = TranslationLanguages.sanitizeOutputLanguageCode(targetLanguageCode)
        return when (credential.kind) {
            OpenAiCredentialKind.API_KEY -> RealtimeTranslationSessionToken(
                value = credential.value,
                shouldSendSessionUpdate = true,
            )
            OpenAiCredentialKind.CHATGPT_ACCESS_TOKEN -> {
                val clientSecret = createClientSecretWithRefreshRetry(
                    credential = credential,
                    targetLanguageCode = sanitizedTargetLanguageCode,
                    sourceTranscriptEnabled = sourceTranscriptEnabled,
                    refreshCredentialAfterUnauthorized = refreshCredentialAfterUnauthorized,
                )
                RealtimeTranslationSessionToken(
                    value = clientSecret,
                    shouldSendSessionUpdate = false,
                )
            }
            OpenAiCredentialKind.SPONSORED_TRIAL -> error(
                "Sponsored trial client secrets are requested from the Chuchotage backend.",
            )
        }
    }

    private suspend fun createClientSecretWithRefreshRetry(
        credential: OpenAiCredential,
        targetLanguageCode: String,
        sourceTranscriptEnabled: Boolean,
        refreshCredentialAfterUnauthorized: suspend () -> OpenAiCredential?,
    ): String {
        return try {
            createClientSecret(credential.value, targetLanguageCode, sourceTranscriptEnabled)
        } catch (exception: ClientSecretUnauthorizedException) {
            val refreshed = try {
                refreshCredentialAfterUnauthorized()
            } catch (refreshFailure: ChatGptSignInFailure.ReauthenticationRequired) {
                throw ClientSecretUnauthorizedException(refreshFailure.message ?: REAUTHENTICATE_MESSAGE, refreshFailure)
            }

            if (
                refreshed?.kind == OpenAiCredentialKind.CHATGPT_ACCESS_TOKEN &&
                refreshed.value.isNotBlank() &&
                refreshed.value != credential.value
            ) {
                createClientSecret(refreshed.value, targetLanguageCode, sourceTranscriptEnabled)
            } else {
                throw ClientSecretUnauthorizedException(REAUTHENTICATE_MESSAGE, exception)
            }
        }
    }

    private suspend fun createClientSecret(
        accessToken: String,
        targetLanguageCode: String,
        sourceTranscriptEnabled: Boolean,
    ): String = withContext(Dispatchers.IO) {
        val request = Request.Builder()
            .url(clientSecretUrl)
            .addHeader("Authorization", "Bearer $accessToken")
            .addHeader("User-Agent", OpenAiRequestHeaders.userAgent)
            .post(
                clientSecretRequestBody(
                    targetLanguageCode = targetLanguageCode,
                    sourceTranscriptEnabled = sourceTranscriptEnabled,
                ).toString().toRequestBody(JSON_MEDIA_TYPE),
            )
            .build()

        executeClientSecretRequestWithRetry(request)
    }

    private suspend fun executeClientSecretRequestWithRetry(request: Request): String {
        var lastNetworkError: IOException? = null

        retryDelaysMs.forEachIndexed { attempt, delayMs ->
            try {
                okHttpClient.newCall(request).execute().use { response ->
                    val text = response.body?.string().orEmpty()
                    val payload = parseJsonObject(text)

                    when {
                        response.isSuccessful -> {
                            return payload
                                ?.optString("value")
                                ?.takeIf { it.isNotBlank() }
                                ?: error("OpenAI did not return a translation client secret.")
                        }
                        response.code == 401 -> throw ClientSecretUnauthorizedException(REAUTHENTICATE_MESSAGE)
                        response.code == 429 || response.code in 500..599 -> {
                            if (attempt < retryDelaysMs.lastIndex) {
                                delay(delayMs)
                            } else {
                                throw ClientSecretRequestException(
                                    "Could not create a translation client secret. Check the phone's network and try again.",
                                )
                            }
                        }
                        else -> throw ClientSecretRequestException(errorMessageFrom(payload, text))
                    }
                }
            } catch (exception: IOException) {
                lastNetworkError = exception
                if (!exception.isRetryableClientSecretNetworkError() || attempt == retryDelaysMs.lastIndex) {
                    throw ClientSecretRequestException(exception.toClientSecretNetworkMessage(), exception)
                }
                delay(delayMs)
            }
        }

        val exception = lastNetworkError ?: IOException("Network request failed.")
        throw ClientSecretRequestException(exception.toClientSecretNetworkMessage(), exception)
    }

    internal fun clientSecretRequestBody(
        targetLanguageCode: String,
        sourceTranscriptEnabled: Boolean = false,
    ): JSONObject {
        return JSONObject()
            .put(
                "expires_after",
                JSONObject()
                    .put("anchor", "created_at")
                    .put("seconds", CLIENT_SECRET_TTL_SECONDS),
            )
            .put(
                "session",
                JSONObject()
                    .put("model", "gpt-realtime-translate")
                    .put(
                        "audio",
                        JSONObject()
                            .put(
                                "input",
                                inputAudioConfig(sourceTranscriptEnabled),
                            )
                            .put(
                                "output",
                                JSONObject().put(
                                    "language",
                                    TranslationLanguages.sanitizeOutputLanguageCode(targetLanguageCode),
                                ),
                            ),
                    ),
            )
    }

    private fun inputAudioConfig(sourceTranscriptEnabled: Boolean): JSONObject {
        return JSONObject()
            .apply {
                if (sourceTranscriptEnabled) {
                    put(
                        "transcription",
                        JSONObject().put("model", "gpt-realtime-whisper"),
                    )
                }
            }
            .put("noise_reduction", JSONObject.NULL)
    }

    private fun parseJsonObject(text: String): JSONObject? {
        return runCatching { JSONObject(text) }.getOrNull()
    }

    private fun errorMessageFrom(payload: JSONObject?, text: String): String {
        return payload
            ?.optJSONObject("error")
            ?.optString("message")
            ?.takeIf { it.isNotBlank() }
            ?: payload?.optString("error")?.takeIf { it.isNotBlank() }
            ?: text.takeIf { it.isNotBlank() }
            ?: "Failed to create translation client secret."
    }

    private fun IOException.isRetryableClientSecretNetworkError(): Boolean {
        return this is UnknownHostException || this is SocketTimeoutException
    }

    private fun IOException.toClientSecretNetworkMessage(): String {
        return if (this is UnknownHostException) {
            "Could not resolve api.openai.com. Check the phone's VPN, private DNS, or network and try again."
        } else {
            "Could not reach api.openai.com. Check the phone's network and try again."
        }
    }

    private class ClientSecretUnauthorizedException(
        message: String,
        cause: Throwable? = null,
    ) : IllegalStateException(message, cause)

    private class ClientSecretRequestException(
        message: String,
        cause: Throwable? = null,
    ) : IllegalStateException(message, cause)

    companion object {
        private const val CLIENT_SECRET_URL = "https://api.openai.com/v1/realtime/translations/client_secrets"
        private const val CLIENT_SECRET_TTL_SECONDS = 600
        private const val REAUTHENTICATE_MESSAGE = "ChatGPT sign-in expired. Sign in again."
        private val CLIENT_SECRET_RETRY_DELAYS_MS = longArrayOf(250, 500, 1_000, 2_000)
        private val JSON_MEDIA_TYPE = "application/json".toMediaType()
    }
}
