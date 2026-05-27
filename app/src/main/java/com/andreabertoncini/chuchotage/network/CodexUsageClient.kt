package com.andreabertoncini.chuchotage.network

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import org.json.JSONObject
import java.util.Base64

data class CodexUsageSnapshot(
    val remainingPercent: Int?,
    val remainingFraction: Float?,
    val creditsBalance: String?,
    val hasCredits: Boolean?,
    val unlimitedCredits: Boolean,
    val resetsAtEpochSeconds: Long?,
)

class CodexUsageClient(
    private val okHttpClient: OkHttpClient = OkHttpClient(),
) {
    suspend fun fetchUsage(credential: OpenAiCredential): CodexUsageSnapshot = withContext(Dispatchers.IO) {
        require(credential.kind == OpenAiCredentialKind.CHATGPT_ACCESS_TOKEN) {
            "Codex usage is only available for ChatGPT sign-in."
        }

        val account = chatGptAccountFromIdToken(credential.idToken)
        val requestBuilder = Request.Builder()
            .url(CODEX_USAGE_URL)
            .addHeader("Authorization", "Bearer ${credential.value}")
            .addHeader("User-Agent", "codex-cli")

        account?.id?.let { requestBuilder.addHeader("ChatGPT-Account-ID", it) }
        if (account?.isFedramp == true) {
            requestBuilder.addHeader("X-OpenAI-Fedramp", "true")
        }

        okHttpClient.newCall(requestBuilder.build()).execute().use { response ->
            val text = response.body?.string().orEmpty()
            if (!response.isSuccessful) {
                error("Codex usage request failed with status ${response.code}.")
            }
            usageSnapshotFromPayload(text)
        }
    }

    companion object {
        private const val CODEX_USAGE_URL = "https://chatgpt.com/backend-api/wham/usage"

        internal fun usageSnapshotFromPayload(text: String): CodexUsageSnapshot {
            val payload = JSONObject(text)
            val primaryWindow = payload
                .optionalObject("rate_limit")
                ?.optionalObject("primary_window")
            val credits = payload.optionalObject("credits")
            val usedPercent = primaryWindow?.optionalDouble("used_percent")
            val remainingPercent = usedPercent
                ?.let { (100.0 - it).coerceIn(0.0, 100.0).toInt() }
            val remainingFraction = remainingPercent?.let { it / 100f }

            return CodexUsageSnapshot(
                remainingPercent = remainingPercent,
                remainingFraction = remainingFraction,
                creditsBalance = credits?.optionalString("balance"),
                hasCredits = credits?.optionalBoolean("has_credits"),
                unlimitedCredits = credits?.optionalBoolean("unlimited") ?: false,
                resetsAtEpochSeconds = primaryWindow?.optionalLong("reset_at"),
            )
        }

        internal fun chatGptAccountFromIdToken(idToken: String?): ChatGptAccount? {
            val payload = idToken
                ?.split(".")
                ?.getOrNull(1)
                ?.takeIf { it.isNotBlank() }
                ?: return null
            return runCatching {
                val json = JSONObject(String(Base64.getUrlDecoder().decode(payload), Charsets.UTF_8))
                val auth = json.optionalObject("https://api.openai.com/auth") ?: return@runCatching null
                ChatGptAccount(
                    id = auth.optionalString("chatgpt_account_id"),
                    isFedramp = auth.optionalBoolean("chatgpt_account_is_fedramp") ?: false,
                )
            }.getOrNull()
        }

        private fun JSONObject.optionalObject(name: String): JSONObject? {
            if (!has(name) || isNull(name)) return null
            return optJSONObject(name)
        }

        private fun JSONObject.optionalString(name: String): String? {
            if (!has(name) || isNull(name)) return null
            return optString(name).takeIf { it.isNotBlank() }
        }

        private fun JSONObject.optionalBoolean(name: String): Boolean? {
            if (!has(name) || isNull(name)) return null
            return optBoolean(name)
        }

        private fun JSONObject.optionalDouble(name: String): Double? {
            if (!has(name) || isNull(name)) return null
            return optDouble(name)
        }

        private fun JSONObject.optionalLong(name: String): Long? {
            if (!has(name) || isNull(name)) return null
            return optLong(name).takeIf { it > 0L }
        }
    }
}

data class ChatGptAccount(
    val id: String?,
    val isFedramp: Boolean,
)
