package com.andreabertoncini.chuchotage.settings

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class TranslationSettingsTest {
    @Test
    fun outputLanguagesMatchRealtimeTranslateTargets() {
        val codes = TranslationLanguages.supportedOutputLanguages.map { it.code }

        assertEquals(
            listOf("es", "pt", "fr", "ja", "ru", "zh", "de", "ko", "hi", "id", "vi", "it", "en"),
            codes,
        )
    }

    @Test
    fun invalidOutputLanguageFallsBackToEnglish() {
        assertEquals("en", TranslationLanguages.sanitizeOutputLanguageCode("not-supported"))
    }

    @Test
    fun supportedSystemLanguageBecomesDefaultOutputLanguage() {
        assertEquals("de", TranslationLanguages.defaultOutputLanguageCodeForSystemLanguage("de"))
    }

    @Test
    fun regionalSystemLanguageUsesPrimaryLanguageAsDefaultOutputLanguage() {
        assertEquals("pt", TranslationLanguages.defaultOutputLanguageCodeForSystemLanguage("pt-BR"))
    }

    @Test
    fun legacyIndonesianSystemLanguageCodeUsesSupportedOutputLanguageCode() {
        assertEquals("id", TranslationLanguages.defaultOutputLanguageCodeForSystemLanguage("in"))
    }

    @Test
    fun unsupportedSystemLanguageFallsBackToEnglishDefault() {
        assertEquals("en", TranslationLanguages.defaultOutputLanguageCodeForSystemLanguage("nl"))
    }

    @Test
    fun defaultConversationPartnerUsesItalianWhenLocalLanguageIsEnglish() {
        assertEquals("it", TranslationLanguages.defaultConversationPartnerLanguageCode("en"))
    }

    @Test
    fun defaultConversationPartnerUsesEnglishWhenLocalLanguageIsNotEnglish() {
        assertEquals("en", TranslationLanguages.defaultConversationPartnerLanguageCode("it"))
    }

    @Test
    fun invalidAudioOutputRouteFallsBackToSystemDefault() {
        assertEquals(AudioOutputRoute.SystemDefault, AudioOutputRoute.fromStorage("not-supported"))
    }

    @Test
    fun deviceAudioInputSourceRoundTripsFromStorage() {
        assertEquals(AudioInputSource.DeviceAudio, AudioInputSource.fromStorage("device_audio"))
    }

    @Test
    fun translationSettingsDefaultToSystemAudioOutput() {
        assertEquals(AudioOutputRoute.SystemDefault, TranslationSettings().audioOutputRoute)
    }

    @Test
    fun translationSettingsDefaultToDeviceAudioDuckingOff() {
        assertFalse(TranslationSettings().deviceAudioDuckingEnabled)
        assertFalse(TranslationSettings().shouldRequestOriginalAudioDucking())
    }

    @Test
    fun translationSettingsDefaultToHeadsetAutoStartOff() {
        assertFalse(TranslationSettings().headsetAutoStartEnabled)
    }

    @Test
    fun translationSettingsDefaultToFocusBackgroundOff() {
        assertFalse(TranslationSettings().focusBackgroundEnabled)
        assertFalse(TranslationSettings().shouldRequestFocusBackground())
    }

    @Test
    fun translationSettingsDefaultToSourceTranscriptOff() {
        assertFalse(TranslationSettings().sourceTranscriptEnabled)
    }

    @Test
    fun settingsPreferencesDefaultConversationLanguagesUseSystemLanguageAndEnglish() {
        val read = TranslationSettingsPreferences.read(
            contains = { false },
            getString = { null },
            getBoolean = { _, default -> default },
            systemLanguage = "fr",
        )

        assertEquals("fr", read.conversationLocalLanguageCode)
        assertEquals("en", read.conversationPartnerLanguageCode)
    }

    @Test
    fun audioRouteResetNeededWhenMicrophoneSourceChanges() {
        val previous = TranslationSettings(audioInputSource = AudioInputSource.Phone)
        val next = previous.copy(audioInputSource = AudioInputSource.Headset)

        assertTrue(previous.needsAudioRouteReset(next))
    }

    @Test
    fun audioRouteResetNeededWhenOutputRouteChanges() {
        val previous = TranslationSettings(audioOutputRoute = AudioOutputRoute.SystemDefault)
        val next = previous.copy(audioOutputRoute = AudioOutputRoute.Headphones)

        assertTrue(previous.needsAudioRouteReset(next))
    }

    @Test
    fun audioRouteResetNotNeededWhenOnlyOutputLanguageChanges() {
        val previous = TranslationSettings(targetLanguageCode = "en")
        val next = previous.copy(targetLanguageCode = "it")

        assertFalse(previous.needsAudioRouteReset(next))
    }

    @Test
    fun activeSessionRestartNeededWhenOutputLanguageChanges() {
        val previous = TranslationSettings(targetLanguageCode = "en")
        val next = previous.copy(targetLanguageCode = "it")

        assertTrue(previous.needsActiveSessionRestart(next))
    }

    @Test
    fun activeSessionRestartNotNeededWhenSettingsDoNotChange() {
        val previous = TranslationSettings(targetLanguageCode = "en")
        val next = previous.copy(targetLanguageCode = "en")

        assertFalse(previous.needsActiveSessionRestart(next))
    }

    @Test
    fun activeSessionRestartNeededWhenDeviceAudioDuckingChanges() {
        val previous = TranslationSettings(
            audioInputSource = AudioInputSource.DeviceAudio,
            deviceAudioDuckingEnabled = false,
        )
        val next = previous.copy(deviceAudioDuckingEnabled = true)

        assertTrue(previous.needsActiveSessionRestart(next))
    }

    @Test
    fun activeSessionRestartNeededWhenFocusBackgroundChanges() {
        val previous = TranslationSettings(focusBackgroundEnabled = false)
        val next = previous.copy(focusBackgroundEnabled = true)

        assertTrue(previous.needsActiveSessionRestart(next))
    }

    @Test
    fun activeSessionRestartNeededWhenSourceTranscriptSettingChanges() {
        val previous = TranslationSettings(sourceTranscriptEnabled = false)
        val next = previous.copy(sourceTranscriptEnabled = true)

        assertTrue(previous.needsActiveSessionRestart(next))
    }

    @Test
    fun originalAudioDuckingRequiresDeviceAudioInput() {
        val phoneMic = TranslationSettings(
            audioInputSource = AudioInputSource.Phone,
            deviceAudioDuckingEnabled = true,
        )
        val deviceAudio = TranslationSettings(
            audioInputSource = AudioInputSource.DeviceAudio,
            deviceAudioDuckingEnabled = true,
        )

        assertFalse(phoneMic.shouldRequestOriginalAudioDucking())
        assertTrue(deviceAudio.shouldRequestOriginalAudioDucking())
    }

    @Test
    fun focusBackgroundAllowsSystemDefaultAndExplicitHeadphonesOutput() {
        val systemDefault = TranslationSettings(
            audioOutputRoute = AudioOutputRoute.SystemDefault,
            focusBackgroundEnabled = true,
        )
        val phoneSpeaker = TranslationSettings(
            audioOutputRoute = AudioOutputRoute.PhoneSpeaker,
            focusBackgroundEnabled = true,
        )
        val headphones = TranslationSettings(
            audioOutputRoute = AudioOutputRoute.Headphones,
            focusBackgroundEnabled = true,
        )

        assertTrue(systemDefault.shouldRequestFocusBackground())
        assertFalse(phoneSpeaker.shouldRequestFocusBackground())
        assertTrue(headphones.shouldRequestFocusBackground())
    }

    @Test
    fun settingsPreferencesRoundTripFocusBackground() {
        val settings = TranslationSettings(
            targetLanguageCode = "fr",
            conversationLocalLanguageCode = "en",
            conversationPartnerLanguageCode = "it",
            audioInputSource = AudioInputSource.DeviceAudio,
            audioOutputRoute = AudioOutputRoute.Headphones,
            headsetAutoStartEnabled = true,
            deviceAudioDuckingEnabled = true,
            focusBackgroundEnabled = true,
            sourceTranscriptEnabled = true,
        )
        val stringPrefs = mutableMapOf<String, String>()
        val booleanPrefs = mutableMapOf<String, Boolean>()

        TranslationSettingsPreferences.write(
            settings = settings,
            putString = { key, value -> stringPrefs[key] = value },
            putBoolean = { key, value -> booleanPrefs[key] = value },
        )
        val read = TranslationSettingsPreferences.read(
            contains = { key -> stringPrefs.containsKey(key) || booleanPrefs.containsKey(key) },
            getString = { key -> stringPrefs[key] },
            getBoolean = { key, default -> booleanPrefs[key] ?: default },
            systemLanguage = "en",
        )

        assertEquals(settings, read)
    }

    @Test
    fun phoneMicToPhoneSpeakerShowsAudioFeedbackWarning() {
        val settings = TranslationSettings(
            audioInputSource = AudioInputSource.Phone,
            audioOutputRoute = AudioOutputRoute.PhoneSpeaker,
        )

        assertTrue(settings.hasAudioFeedbackRisk())
        assertTrue(settings.hasAudioFeedbackRisk(headphonesOrEarbudsConnected = false))
        assertEquals(AUDIO_FEEDBACK_WARNING_MESSAGE, settings.audioFeedbackWarningMessage())
    }

    @Test
    fun headsetMicToPhoneSpeakerShowsAudioFeedbackWarning() {
        val settings = TranslationSettings(
            audioInputSource = AudioInputSource.Headset,
            audioOutputRoute = AudioOutputRoute.PhoneSpeaker,
        )

        assertTrue(settings.hasAudioFeedbackRisk())
        assertTrue(settings.hasAudioFeedbackRisk(headphonesOrEarbudsConnected = false))
        assertEquals(AUDIO_FEEDBACK_WARNING_MESSAGE, settings.audioFeedbackWarningMessage())
    }

    @Test
    fun phoneMicToSystemDefaultWithoutHeadphonesShowsAudioFeedbackRiskAtRuntime() {
        val settings = TranslationSettings(
            audioInputSource = AudioInputSource.Phone,
            audioOutputRoute = AudioOutputRoute.SystemDefault,
        )

        assertFalse(settings.hasAudioFeedbackRisk())
        assertTrue(settings.hasAudioFeedbackRisk(headphonesOrEarbudsConnected = false))
        assertFalse(settings.hasAudioFeedbackRisk(headphonesOrEarbudsConnected = true))
    }

    @Test
    fun deviceAudioToPhoneSpeakerDoesNotShowAudioFeedbackWarning() {
        val settings = TranslationSettings(
            audioInputSource = AudioInputSource.DeviceAudio,
            audioOutputRoute = AudioOutputRoute.PhoneSpeaker,
        )

        assertFalse(settings.hasAudioFeedbackRisk())
        assertEquals(null, settings.audioFeedbackWarningMessage())
    }

    @Test
    fun microphoneInputToHeadphonesDoesNotShowAudioFeedbackWarning() {
        val settings = TranslationSettings(
            audioInputSource = AudioInputSource.Phone,
            audioOutputRoute = AudioOutputRoute.Headphones,
        )

        assertFalse(settings.hasAudioFeedbackRisk())
        assertEquals(null, settings.audioFeedbackWarningMessage())
    }

    @Test
    fun notificationTitleUsesSelectedOutputLanguage() {
        val settings = TranslationSettings(targetLanguageCode = "fr")

        assertEquals("Translating to French", settings.notificationTitle)
    }
}
