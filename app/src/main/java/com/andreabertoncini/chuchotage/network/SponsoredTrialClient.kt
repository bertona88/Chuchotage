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

class SponsoredTrialClient(
    private val okHttpClient: OkHttpClient = OkHttpClient(),
    private val clientSecretUrl: String = CLIENT_SECRET_URL,
    private val retryDelaysMs: LongArray = CLIENT_SECRET_RETRY_DELAYS_MS,
) {
    suspend fun sessionBearerTokenFor(
        installId: String,
        targetLanguageCode: String = TranslationLanguages.DEFAULT_TARGET_LANGUAGE_CODE,
        sourceTranscriptEnabled: Boolean = false,
    ): RealtimeTranslationSessionToken {
        val clientSecret = createClientSecret(
            installId = installId,
            targetLanguageCode = TranslationLanguages.sanitizeOutputLanguageCode(targetLanguageCode),
            sourceTranscriptEnabled = sourceTranscriptEnabled,
        )
        return RealtimeTranslationSessionToken(
            value = clientSecret,
            shouldSendSessionUpdate = false,
            credentialKind = OpenAiCredentialKind.SPONSORED_TRIAL,
        )
    }

    private suspend fun createClientSecret(
        installId: String,
        targetLanguageCode: String,
        sourceTranscriptEnabled: Boolean,
    ): String = withContext(Dispatchers.IO) {
        val body = JSONObject()
            .put("installation_id", installId)
            .put("target_language", targetLanguageCode)
            .put("source_transcript_enabled", sourceTranscriptEnabled)
            .toString()
            .toRequestBody(JSON_MEDIA_TYPE)
        val request = Request.Builder()
            .url(clientSecretUrl)
            .post(body)
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
                                ?: error("Chuchotage did not return a trial translation token.")
                        }
                        response.code == 429 -> throw SponsoredTrialException(
                            messageFrom(payload)
                                ?: "Chuchotage translation access is busy right now. Try again shortly.",
                        )
                        response.code == 403 -> throw SponsoredTrialException(
                            messageFrom(payload)
                                ?: "Chuchotage translation access is not available right now.",
                        )
                        response.code == 503 -> throw SponsoredTrialException(
                            "Chuchotage translation access is not available right now. Try again shortly.",
                        )
                        response.code in 500..599 -> {
                            if (attempt < retryDelaysMs.lastIndex) {
                                delay(delayMs)
                            } else {
                                throw SponsoredTrialException(
                                    "Could not start Chuchotage translation access. Check the phone's network and try again.",
                                )
                            }
                        }
                        else -> throw SponsoredTrialException(errorMessageFrom(payload, text))
                    }
                }
            } catch (exception: IOException) {
                lastNetworkError = exception
                if (!exception.isRetryableNetworkError() || attempt == retryDelaysMs.lastIndex) {
                    throw SponsoredTrialException(exception.toNetworkMessage(), exception)
                }
                delay(delayMs)
            }
        }

        val exception = lastNetworkError ?: IOException("Network request failed.")
        throw SponsoredTrialException(exception.toNetworkMessage(), exception)
    }

    private fun parseJsonObject(text: String): JSONObject? {
        return runCatching { JSONObject(text) }.getOrNull()
    }

    private fun errorMessageFrom(payload: JSONObject?, text: String): String {
        return messageFrom(payload)
            ?: payload?.optString("error")?.takeIf { it.isNotBlank() }
            ?: text.takeIf { it.isNotBlank() }
            ?: "Sponsored trial request failed."
    }

    private fun messageFrom(payload: JSONObject?): String? {
        return payload?.optString("message")?.takeIf { it.isNotBlank() }
    }

    private fun IOException.isRetryableNetworkError(): Boolean {
        return this is UnknownHostException || this is SocketTimeoutException
    }

    private fun IOException.toNetworkMessage(): String {
        return if (this is UnknownHostException) {
            "Could not resolve chuchotage.ai. Check the phone's VPN, private DNS, or network and try again."
        } else {
            "Could not reach chuchotage.ai. Check the phone's network and try again."
        }
    }

    class SponsoredTrialException(
        message: String,
        cause: Throwable? = null,
    ) : IllegalStateException(message, cause)

    companion object {
        private const val CLIENT_SECRET_URL =
            "https://www.chuchotage.ai/api/trial/realtime-translation-client-secret"
        private val CLIENT_SECRET_RETRY_DELAYS_MS = longArrayOf(250, 500, 1_000, 2_000)
        private val JSON_MEDIA_TYPE = "application/json".toMediaType()
    }
}
