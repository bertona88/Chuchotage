package com.andreabertoncini.chuchotage.network

data class OpenAiCredential(
    val kind: OpenAiCredentialKind,
    val value: String,
    val idToken: String? = null,
    val refreshToken: String? = null,
    val lastRefreshEpochSeconds: Long? = null,
)

enum class OpenAiCredentialKind(val storageValue: String) {
    API_KEY("api_key"),
    CHATGPT_ACCESS_TOKEN("chatgpt_access_token"),
    SPONSORED_TRIAL("sponsored_trial");

    companion object {
        fun fromStorage(value: String?): OpenAiCredentialKind {
            return values().firstOrNull { it.storageValue == value } ?: API_KEY
        }
    }
}
