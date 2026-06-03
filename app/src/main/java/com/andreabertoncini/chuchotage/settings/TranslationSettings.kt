package com.andreabertoncini.chuchotage.settings

import android.content.Context
import androidx.annotation.StringRes
import com.andreabertoncini.chuchotage.R
import java.util.Locale

data class TranslationLanguage(
    val code: String,
    val name: String,
    @StringRes val nameResId: Int,
)

enum class AudioInputSource(
    val storageValue: String,
    val displayName: String,
) {
    Phone("phone", "Phone"),
    Headset("headset", "Headset"),
    DeviceAudio("device_audio", "Device audio");

    companion object {
        fun fromStorage(value: String?): AudioInputSource {
            return entries.firstOrNull { it.storageValue == value } ?: Phone
        }
    }
}

enum class AudioOutputRoute(
    val storageValue: String,
    val displayName: String,
) {
    SystemDefault("system_default", "System default"),
    PhoneSpeaker("phone_speaker", "Phone speaker"),
    Headphones("headphones", "Headphones");

    companion object {
        fun fromStorage(value: String?): AudioOutputRoute {
            return entries.firstOrNull { it.storageValue == value } ?: SystemDefault
        }
    }
}

const val AUDIO_FEEDBACK_WARNING_MESSAGE =
    "Use headphones. The phone speaker can feed translated speech back into the mic " +
        "and make Chuchotage repeat itself."

data class TranslationSettings(
    val targetLanguageCode: String = TranslationLanguages.DEFAULT_TARGET_LANGUAGE_CODE,
    val conversationLocalLanguageCode: String = TranslationLanguages.DEFAULT_TARGET_LANGUAGE_CODE,
    val conversationPartnerLanguageCode: String = TranslationLanguages.DEFAULT_CONVERSATION_PARTNER_LANGUAGE_CODE,
    val audioInputSource: AudioInputSource = AudioInputSource.Phone,
    val audioOutputRoute: AudioOutputRoute = AudioOutputRoute.SystemDefault,
    val headsetAutoStartEnabled: Boolean = false,
    val deviceAudioDuckingEnabled: Boolean = false,
    val focusBackgroundEnabled: Boolean = false,
    val sourceTranscriptEnabled: Boolean = false,
) {
    val targetLanguage: TranslationLanguage = TranslationLanguages.outputLanguageFor(targetLanguageCode)
    val conversationLocalLanguage: TranslationLanguage =
        TranslationLanguages.outputLanguageFor(conversationLocalLanguageCode)
    val conversationPartnerLanguage: TranslationLanguage =
        TranslationLanguages.outputLanguageFor(conversationPartnerLanguageCode)

    val notificationTitle: String
        get() = "Translating to ${targetLanguage.name}"

    fun notificationTitle(context: Context): String {
        return context.getString(R.string.notification_title_translating_to, targetLanguage.displayName(context))
    }
}

fun TranslationLanguage.displayName(context: Context): String = context.getString(nameResId)

fun TranslationSettings.needsAudioRouteReset(next: TranslationSettings): Boolean {
    return audioInputSource != next.audioInputSource || audioOutputRoute != next.audioOutputRoute
}

fun TranslationSettings.needsActiveSessionRestart(next: TranslationSettings): Boolean {
    return needsAudioRouteReset(next) ||
        deviceAudioDuckingEnabled != next.deviceAudioDuckingEnabled ||
        focusBackgroundEnabled != next.focusBackgroundEnabled ||
        sourceTranscriptEnabled != next.sourceTranscriptEnabled ||
        TranslationLanguages.sanitizeOutputLanguageCode(targetLanguageCode) !=
        TranslationLanguages.sanitizeOutputLanguageCode(next.targetLanguageCode)
}

fun TranslationSettings.hasAudioFeedbackRisk(): Boolean {
    return usesMicrophoneInput() && audioOutputRoute == AudioOutputRoute.PhoneSpeaker
}

fun TranslationSettings.hasAudioFeedbackRisk(headphonesOrEarbudsConnected: Boolean): Boolean {
    if (!usesMicrophoneInput()) return false
    return audioOutputRoute == AudioOutputRoute.PhoneSpeaker ||
        (audioOutputRoute == AudioOutputRoute.SystemDefault && !headphonesOrEarbudsConnected)
}

private fun TranslationSettings.usesMicrophoneInput(): Boolean {
    return audioInputSource == AudioInputSource.Phone || audioInputSource == AudioInputSource.Headset
}

fun TranslationSettings.audioFeedbackWarningMessage(): String? {
    return if (hasAudioFeedbackRisk()) AUDIO_FEEDBACK_WARNING_MESSAGE else null
}

fun TranslationSettings.shouldRequestOriginalAudioDucking(): Boolean {
    return audioInputSource == AudioInputSource.DeviceAudio && deviceAudioDuckingEnabled
}

fun TranslationSettings.shouldRequestFocusBackground(): Boolean {
    return audioOutputRoute != AudioOutputRoute.PhoneSpeaker && focusBackgroundEnabled
}

class TranslationSettingsStore(context: Context) {
    private val appContext = context.applicationContext
    private val prefs = appContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    fun read(): TranslationSettings {
        return TranslationSettingsPreferences.read(
            contains = prefs::contains,
            getString = { key -> prefs.getString(key, null) },
            getBoolean = prefs::getBoolean,
            systemLanguage = Locale.getDefault().language,
        )
    }

    fun save(settings: TranslationSettings) {
        val editor = prefs.edit()
        TranslationSettingsPreferences.write(
            settings = settings,
            putString = { key, value -> editor.putString(key, value) },
            putBoolean = { key, value -> editor.putBoolean(key, value) },
        )
        editor.apply()
    }

    companion object {
        private const val PREFS_NAME = "translation_settings"
    }
}

internal object TranslationSettingsPreferences {
    private const val KEY_TARGET_LANGUAGE = "target_language"
    private const val KEY_CONVERSATION_LOCAL_LANGUAGE = "conversation_local_language"
    private const val KEY_CONVERSATION_PARTNER_LANGUAGE = "conversation_partner_language"
    private const val KEY_AUDIO_INPUT_SOURCE = "audio_input_source"
    private const val KEY_AUDIO_OUTPUT_ROUTE = "audio_output_route"
    private const val KEY_HEADSET_AUTO_START_ENABLED = "headset_auto_start_enabled"
    private const val KEY_DEVICE_AUDIO_DUCKING_ENABLED = "device_audio_ducking_enabled"
    private const val KEY_FOCUS_BACKGROUND_ENABLED = "focus_background_enabled"
    private const val KEY_SOURCE_TRANSCRIPT_ENABLED = "source_transcript_enabled"

    fun read(
        contains: (String) -> Boolean,
        getString: (String) -> String?,
        getBoolean: (String, Boolean) -> Boolean,
        systemLanguage: String,
    ): TranslationSettings {
        val defaultConversationLocalLanguage =
            TranslationLanguages.defaultOutputLanguageCodeForSystemLanguage(systemLanguage)
        val conversationLocalLanguage = if (contains(KEY_CONVERSATION_LOCAL_LANGUAGE)) {
            TranslationLanguages.sanitizeOutputLanguageCode(getString(KEY_CONVERSATION_LOCAL_LANGUAGE))
        } else {
            defaultConversationLocalLanguage
        }
        val conversationPartnerLanguage = if (contains(KEY_CONVERSATION_PARTNER_LANGUAGE)) {
            TranslationLanguages.sanitizeOutputLanguageCode(getString(KEY_CONVERSATION_PARTNER_LANGUAGE))
        } else {
            TranslationLanguages.defaultConversationPartnerLanguageCode(conversationLocalLanguage)
        }

        return TranslationSettings(
            targetLanguageCode = if (contains(KEY_TARGET_LANGUAGE)) {
                TranslationLanguages.sanitizeOutputLanguageCode(getString(KEY_TARGET_LANGUAGE))
            } else {
                TranslationLanguages.defaultOutputLanguageCodeForSystemLanguage(systemLanguage)
            },
            conversationLocalLanguageCode = conversationLocalLanguage,
            conversationPartnerLanguageCode = conversationPartnerLanguage,
            audioInputSource = AudioInputSource.fromStorage(getString(KEY_AUDIO_INPUT_SOURCE)),
            audioOutputRoute = AudioOutputRoute.fromStorage(getString(KEY_AUDIO_OUTPUT_ROUTE)),
            headsetAutoStartEnabled = getBoolean(KEY_HEADSET_AUTO_START_ENABLED, false),
            deviceAudioDuckingEnabled = getBoolean(KEY_DEVICE_AUDIO_DUCKING_ENABLED, false),
            focusBackgroundEnabled = getBoolean(KEY_FOCUS_BACKGROUND_ENABLED, false),
            sourceTranscriptEnabled = getBoolean(KEY_SOURCE_TRANSCRIPT_ENABLED, false),
        )
    }

    fun write(
        settings: TranslationSettings,
        putString: (String, String) -> Unit,
        putBoolean: (String, Boolean) -> Unit,
    ) {
        putString(KEY_TARGET_LANGUAGE, TranslationLanguages.sanitizeOutputLanguageCode(settings.targetLanguageCode))
        putString(
            KEY_CONVERSATION_LOCAL_LANGUAGE,
            TranslationLanguages.sanitizeOutputLanguageCode(settings.conversationLocalLanguageCode),
        )
        putString(
            KEY_CONVERSATION_PARTNER_LANGUAGE,
            TranslationLanguages.sanitizeOutputLanguageCode(settings.conversationPartnerLanguageCode),
        )
        putString(KEY_AUDIO_INPUT_SOURCE, settings.audioInputSource.storageValue)
        putString(KEY_AUDIO_OUTPUT_ROUTE, settings.audioOutputRoute.storageValue)
        putBoolean(KEY_HEADSET_AUTO_START_ENABLED, settings.headsetAutoStartEnabled)
        putBoolean(KEY_DEVICE_AUDIO_DUCKING_ENABLED, settings.deviceAudioDuckingEnabled)
        putBoolean(KEY_FOCUS_BACKGROUND_ENABLED, settings.focusBackgroundEnabled)
        putBoolean(KEY_SOURCE_TRANSCRIPT_ENABLED, settings.sourceTranscriptEnabled)
    }
}

object TranslationLanguages {
    const val DEFAULT_TARGET_LANGUAGE_CODE = "en"
    const val DEFAULT_CONVERSATION_PARTNER_LANGUAGE_CODE = "it"

    val supportedOutputLanguages: List<TranslationLanguage> = listOf(
        TranslationLanguage("es", "Spanish", R.string.language_spanish),
        TranslationLanguage("pt", "Portuguese", R.string.language_portuguese),
        TranslationLanguage("fr", "French", R.string.language_french),
        TranslationLanguage("ja", "Japanese", R.string.language_japanese),
        TranslationLanguage("ru", "Russian", R.string.language_russian),
        TranslationLanguage("zh", "Chinese", R.string.language_chinese),
        TranslationLanguage("de", "German", R.string.language_german),
        TranslationLanguage("ko", "Korean", R.string.language_korean),
        TranslationLanguage("hi", "Hindi", R.string.language_hindi),
        TranslationLanguage("id", "Indonesian", R.string.language_indonesian),
        TranslationLanguage("vi", "Vietnamese", R.string.language_vietnamese),
        TranslationLanguage("it", "Italian", R.string.language_italian),
        TranslationLanguage("en", "English", R.string.language_english),
    )

    fun outputLanguageFor(code: String?): TranslationLanguage {
        return supportedOutputLanguages.firstOrNull { it.code == code } ?: outputLanguageFor(DEFAULT_TARGET_LANGUAGE_CODE)
    }

    fun sanitizeOutputLanguageCode(code: String?): String = outputLanguageFor(code).code

    fun defaultOutputLanguageCodeForSystemLanguage(systemLanguageCode: String?): String {
        val normalizedCode = normalizeSystemLanguageCode(systemLanguageCode)
        return sanitizeOutputLanguageCode(normalizedCode)
    }

    fun defaultConversationPartnerLanguageCode(localLanguageCode: String?): String {
        val sanitizedLocalLanguageCode = sanitizeOutputLanguageCode(localLanguageCode)
        return if (sanitizedLocalLanguageCode == DEFAULT_TARGET_LANGUAGE_CODE) {
            DEFAULT_CONVERSATION_PARTNER_LANGUAGE_CODE
        } else {
            DEFAULT_TARGET_LANGUAGE_CODE
        }
    }

    private fun normalizeSystemLanguageCode(systemLanguageCode: String?): String? {
        val primaryCode = systemLanguageCode
            ?.trim()
            ?.takeIf { it.isNotEmpty() }
            ?.lowercase(Locale.ROOT)
            ?.substringBefore('-')
            ?.substringBefore('_')

        return when (primaryCode) {
            "in" -> "id"
            else -> primaryCode
        }
    }
}
