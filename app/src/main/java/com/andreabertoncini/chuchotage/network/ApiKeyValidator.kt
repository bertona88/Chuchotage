package com.andreabertoncini.chuchotage.network

object OpenAiCredentialValidator {
    private val sponsoredTrialInstallIdPattern =
        Regex("^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$")

    fun normalize(value: String): String {
        return value.trim()
    }

    fun isPlausibleApiKey(value: String): Boolean {
        val key = normalize(value)
        return key.startsWith("sk-") && key.length >= 20 && !key.any { it.isWhitespace() }
    }

    fun isPlausibleChatGptAccessToken(value: String): Boolean {
        val token = normalize(value)
        return token.length >= 20 && !token.any { it.isWhitespace() } && !isPlausibleApiKey(token)
    }

    fun isPlausibleSponsoredTrialInstallId(value: String): Boolean {
        return sponsoredTrialInstallIdPattern.matches(normalize(value))
    }

    fun isPlausible(credential: OpenAiCredential): Boolean {
        return when (credential.kind) {
            OpenAiCredentialKind.API_KEY -> isPlausibleApiKey(credential.value)
            OpenAiCredentialKind.CHATGPT_ACCESS_TOKEN -> isPlausibleChatGptAccessToken(credential.value)
            OpenAiCredentialKind.SPONSORED_TRIAL -> isPlausibleSponsoredTrialInstallId(credential.value)
        }
    }
}

object ApiKeyValidator {
    fun normalize(value: String): String {
        return OpenAiCredentialValidator.normalize(value)
    }

    fun isPlausible(value: String): Boolean {
        return OpenAiCredentialValidator.isPlausibleApiKey(value)
    }
}
