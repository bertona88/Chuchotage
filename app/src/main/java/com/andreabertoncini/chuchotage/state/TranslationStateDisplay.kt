package com.andreabertoncini.chuchotage.state

import android.content.Context
import com.andreabertoncini.chuchotage.R
import com.andreabertoncini.chuchotage.settings.AUDIO_FEEDBACK_WARNING_MESSAGE

fun TranslationState.localizedStatusText(context: Context): String {
    return when (this) {
        TranslationState.Idle -> context.getString(R.string.status_ready)
        TranslationState.WaitingForHeadset -> context.getString(R.string.status_waiting_for_headset)
        TranslationState.Connecting -> context.getString(R.string.status_connecting)
        TranslationState.Active -> context.getString(R.string.status_listening)
        TranslationState.Stopping -> context.getString(R.string.status_ready)
        is TranslationState.Error -> localizedErrorStatusText(context, message)
    }
}

private fun localizedErrorStatusText(context: Context, message: String): String {
    val cleaned = message.trim().replace(Regex("\\s+"), " ").trimEnd('.')
    val resId = when {
        cleaned.isBlank() -> R.string.status_translation_needs_attention
        cleaned.equals("OpenAI login missing", ignoreCase = true) -> R.string.status_add_openai_login
        cleaned.equals("Microphone permission missing", ignoreCase = true) -> R.string.status_allow_microphone_access
        cleaned.equals("Audio capture permission missing", ignoreCase = true) -> R.string.status_allow_audio_capture
        cleaned.equals("Allow device audio capture to start", ignoreCase = true) -> R.string.status_allow_device_audio_capture
        cleaned.equals("Device audio capture requires Android 10 or newer", ignoreCase = true) ->
            R.string.status_device_audio_needs_android_10
        cleaned.equals("Device audio capture ended", ignoreCase = true) -> R.string.status_device_audio_capture_ended
        cleaned.startsWith("Device audio capture failed", ignoreCase = true) -> R.string.status_device_audio_capture_failed
        cleaned.equals("Required permission missing", ignoreCase = true) -> R.string.status_permission_needed
        cleaned.startsWith("Nearby devices permission is required for Bluetooth audio output", ignoreCase = true) ->
            R.string.status_allow_nearby_devices_for_audio_output
        cleaned.startsWith("Nearby devices permission is required", ignoreCase = true) ->
            R.string.status_allow_nearby_devices_for_headset_mic
        cleaned.equals("Headset microphone unavailable", ignoreCase = true) -> R.string.status_headset_mic_unavailable
        cleaned.equals("Selected microphone could not be used", ignoreCase = true) ->
            R.string.status_selected_mic_could_not_be_used
        cleaned.startsWith("Bluetooth headset microphone is not ready", ignoreCase = true) ->
            R.string.status_reconnect_headset_mic
        cleaned.equals("Phone speaker unavailable", ignoreCase = true) -> R.string.status_phone_speaker_unavailable
        cleaned.equals("Headphones unavailable", ignoreCase = true) -> R.string.status_headphones_unavailable
        cleaned.equals("Selected audio output could not be used", ignoreCase = true) ->
            R.string.status_selected_audio_output_could_not_be_used
        cleaned.equals(AUDIO_FEEDBACK_WARNING_MESSAGE.trimEnd('.'), ignoreCase = true) ->
            R.string.audio_feedback_warning
        cleaned.equals("Realtime translation socket closed", ignoreCase = true) -> R.string.status_connection_closed
        cleaned.equals("Realtime translation socket failed", ignoreCase = true) -> R.string.status_connection_failed
        cleaned.equals("Translation failed", ignoreCase = true) -> R.string.status_translation_needs_attention
        else -> null
    }
    return if (resId != null) context.getString(resId) else cleaned
}
