package com.andreabertoncini.chuchotage.network

import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import org.json.JSONObject
import java.nio.charset.StandardCharsets
import java.security.KeyStore
import java.util.UUID
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

class SecureApiKeyStore(context: Context) {
    private val appContext = context.applicationContext
    private val prefs = appContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    fun hasCredential(): Boolean = loadCredential() != null

    fun loadCredential(): OpenAiCredential? {
        val value = loadEncryptedValue() ?: return null
        val credential = parseStoredCredential(value) ?: OpenAiCredential(
            kind = OpenAiCredentialKind.fromStorage(prefs.getString(KEY_KIND, null)),
            value = value,
        )
        return credential.takeIf { OpenAiCredentialValidator.isPlausible(it) }
    }

    fun loadCredentialReplacingLegacyClientCredential(): OpenAiCredential? {
        val credential = loadCredential() ?: return null
        return if (credential.kind == OpenAiCredentialKind.CHATGPT_ACCESS_TOKEN) {
            saveSponsoredTrialInstallId()
            loadCredential()
        } else {
            credential
        }
    }

    fun saveApiKey(value: String) {
        val apiKey = OpenAiCredentialValidator.normalize(value)
        require(OpenAiCredentialValidator.isPlausibleApiKey(apiKey)) {
            "Enter a valid OpenAI API key."
        }

        saveCredential(OpenAiCredential(OpenAiCredentialKind.API_KEY, apiKey))
    }

    fun saveChatGptAccessToken(value: String) {
        val accessToken = OpenAiCredentialValidator.normalize(value)
        require(OpenAiCredentialValidator.isPlausibleChatGptAccessToken(accessToken)) {
            "Enter a valid ChatGPT access token."
        }

        saveCredential(OpenAiCredential(OpenAiCredentialKind.CHATGPT_ACCESS_TOKEN, accessToken))
    }

    fun saveChatGptTokens(tokens: ChatGptOAuthTokens) {
        saveOpenAiCredential(
            OpenAiCredential(
                kind = OpenAiCredentialKind.CHATGPT_ACCESS_TOKEN,
                value = tokens.accessToken,
                idToken = tokens.idToken,
                refreshToken = tokens.refreshToken,
                lastRefreshEpochSeconds = System.currentTimeMillis() / 1_000,
            ),
        )
    }

    fun saveSponsoredTrialInstallId(value: String = UUID.randomUUID().toString()) {
        val installId = OpenAiCredentialValidator.normalize(value)
        require(OpenAiCredentialValidator.isPlausibleSponsoredTrialInstallId(installId)) {
            "Could not create a sponsored trial identity."
        }

        saveCredential(OpenAiCredential(OpenAiCredentialKind.SPONSORED_TRIAL, installId))
    }

    fun ensureSponsoredTrialInstallId(): OpenAiCredential {
        loadCredential()
            ?.takeIf { it.kind == OpenAiCredentialKind.SPONSORED_TRIAL }
            ?.let { return it }

        saveSponsoredTrialInstallId()
        return loadCredential()
            ?: error("Could not create Chuchotage translation access.")
    }

    fun saveOpenAiCredential(credential: OpenAiCredential) {
        require(OpenAiCredentialValidator.isPlausible(credential)) {
            "Enter a valid OpenAI credential."
        }

        saveCredential(credential)
    }

    fun clearCredential() {
        prefs.edit()
            .remove(KEY_KIND)
            .remove(KEY_IV)
            .remove(KEY_CIPHER_TEXT)
            .apply()
    }

    private fun loadEncryptedValue(): String? {
        val ivText = prefs.getString(KEY_IV, null) ?: return null
        val cipherText = prefs.getString(KEY_CIPHER_TEXT, null) ?: return null

        return runCatching {
            val iv = Base64.decode(ivText, Base64.NO_WRAP)
            val encrypted = Base64.decode(cipherText, Base64.NO_WRAP)
            val cipher = Cipher.getInstance(TRANSFORMATION)
            cipher.init(Cipher.DECRYPT_MODE, getOrCreateSecretKey(), GCMParameterSpec(GCM_TAG_BITS, iv))
            String(cipher.doFinal(encrypted), StandardCharsets.UTF_8)
        }.getOrNull()
    }

    private fun saveCredential(credential: OpenAiCredential) {
        val cipher = Cipher.getInstance(TRANSFORMATION)
        cipher.init(Cipher.ENCRYPT_MODE, getOrCreateSecretKey())
        val encrypted = cipher.doFinal(serializeCredential(credential).toByteArray(StandardCharsets.UTF_8))

        prefs.edit()
            .putString(KEY_KIND, credential.kind.storageValue)
            .putString(KEY_IV, Base64.encodeToString(cipher.iv, Base64.NO_WRAP))
            .putString(KEY_CIPHER_TEXT, Base64.encodeToString(encrypted, Base64.NO_WRAP))
            .apply()
    }

    private fun parseStoredCredential(value: String): OpenAiCredential? {
        return runCatching {
            val json = JSONObject(value)
            val rawKind = json.optionalString("kind")
            val rawValue = json.optionalString("value")
            if (rawValue.isNullOrBlank()) return@runCatching null

            OpenAiCredential(
                kind = OpenAiCredentialKind.fromStorage(rawKind),
                value = rawValue,
                idToken = json.optionalString("id_token"),
                refreshToken = json.optionalString("refresh_token"),
                lastRefreshEpochSeconds = if (json.has("last_refresh_epoch_seconds")) {
                    json.optLong("last_refresh_epoch_seconds")
                } else {
                    null
                },
            )
        }.getOrNull()
    }

    private fun serializeCredential(credential: OpenAiCredential): String {
        return JSONObject()
            .put("kind", credential.kind.storageValue)
            .put("value", credential.value)
            .put("id_token", credential.idToken)
            .put("refresh_token", credential.refreshToken)
            .put("last_refresh_epoch_seconds", credential.lastRefreshEpochSeconds)
            .toString()
    }

    private fun JSONObject.optionalString(name: String): String? {
        if (!has(name) || isNull(name)) return null
        return optString(name).takeIf { it.isNotBlank() }
    }

    private fun getOrCreateSecretKey(): SecretKey {
        val keyStore = KeyStore.getInstance(ANDROID_KEY_STORE).apply { load(null) }
        val existing = keyStore.getEntry(KEY_ALIAS, null) as? KeyStore.SecretKeyEntry
        if (existing != null) return existing.secretKey

        val keyGenerator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, ANDROID_KEY_STORE)
        val spec = KeyGenParameterSpec.Builder(
            KEY_ALIAS,
            KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT,
        )
            .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
            .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
            .setRandomizedEncryptionRequired(true)
            .build()

        keyGenerator.init(spec)
        return keyGenerator.generateKey()
    }

    companion object {
        private const val PREFS_NAME = "openai_api_key"
        private const val KEY_KIND = "credential_kind"
        private const val KEY_IV = "iv"
        private const val KEY_CIPHER_TEXT = "cipher_text"
        private const val KEY_ALIAS = "openai_api_key_v1"
        private const val ANDROID_KEY_STORE = "AndroidKeyStore"
        private const val TRANSFORMATION = "AES/GCM/NoPadding"
        private const val GCM_TAG_BITS = 128
    }
}
