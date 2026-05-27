package com.andreabertoncini.chuchotage.state

import com.andreabertoncini.chuchotage.settings.AUDIO_FEEDBACK_WARNING_MESSAGE

sealed interface TranslationState {
    data object Idle : TranslationState
    data object WaitingForHeadset : TranslationState
    data object Connecting : TranslationState
    data object Active : TranslationState
    data object Stopping : TranslationState
    data class Error(val message: String) : TranslationState

    val isRunning: Boolean
        get() = this is WaitingForHeadset || this is Connecting || this is Active || this is Stopping

    val statusText: String
        get() = when (this) {
            Idle -> "Ready"
            WaitingForHeadset -> "Waiting for headset"
            Connecting -> "Connecting"
            Active -> "Listening"
            Stopping -> "Ready"
            is Error -> errorStatusText(message)
        }

    val storageName: String
        get() = when (this) {
            Idle -> "idle"
            WaitingForHeadset -> "waiting_for_headset"
            Connecting -> "connecting"
            Active -> "active"
            Stopping -> "stopping"
            is Error -> "error"
        }
}

private fun errorStatusText(message: String): String {
    val cleaned = normalizedErrorMessage(message)
    return when {
        cleaned.isBlank() -> "Translation needs attention"
        cleaned.equals("OpenAI login missing", ignoreCase = true) -> "Add OpenAI login"
        cleaned.equals("Microphone permission missing", ignoreCase = true) -> "Allow microphone access"
        cleaned.equals("Audio capture permission missing", ignoreCase = true) -> "Allow audio capture"
        cleaned.equals("Allow device audio capture to start", ignoreCase = true) -> "Allow device audio capture"
        cleaned.equals("Device audio capture requires Android 10 or newer", ignoreCase = true) -> "Device audio needs Android 10+"
        cleaned.equals("Device audio capture ended", ignoreCase = true) -> "Device audio capture ended"
        cleaned.startsWith("Device audio capture failed", ignoreCase = true) -> "Device audio capture failed"
        cleaned.equals("Required permission missing", ignoreCase = true) -> "Permission needed"
        cleaned.startsWith("Nearby devices permission is required for Bluetooth audio output", ignoreCase = true) ->
            "Allow Nearby devices for audio output"
        cleaned.startsWith("Nearby devices permission is required", ignoreCase = true) ->
            "Allow Nearby devices for headset mic"
        cleaned.equals("Headset microphone unavailable", ignoreCase = true) -> "Headset mic unavailable"
        cleaned.equals("Selected microphone could not be used", ignoreCase = true) ->
            "Selected mic could not be used"
        cleaned.startsWith("Bluetooth headset microphone is not ready", ignoreCase = true) ->
            "Reconnect headset mic"
        cleaned.equals("Phone speaker unavailable", ignoreCase = true) -> "Phone speaker unavailable"
        cleaned.equals("Headphones unavailable", ignoreCase = true) -> "Headphones unavailable"
        cleaned.equals("Selected audio output could not be used", ignoreCase = true) ->
            "Selected output could not be used"
        cleaned.equals(AUDIO_FEEDBACK_WARNING_MESSAGE.trimEnd('.'), ignoreCase = true) ->
            AUDIO_FEEDBACK_WARNING_MESSAGE
        cleaned.equals("Realtime translation socket closed", ignoreCase = true) -> "Connection closed"
        cleaned.equals("Realtime translation socket failed", ignoreCase = true) -> "Connection failed"
        cleaned.equals("Translation failed", ignoreCase = true) -> "Translation needs attention"
        else -> cleaned
    }
}

private fun normalizedErrorMessage(message: String): String {
    return message.trim().replace(Regex("\\s+"), " ").trimEnd('.')
}

private fun isTransientStoredError(name: String?, message: String?): Boolean {
    return name == "error" &&
        normalizedErrorMessage(message.orEmpty())
            .equals("Allow device audio capture to start", ignoreCase = true)
}

data class TranslationSnapshot(
    val stateName: String,
    val errorMessage: String?,
) {
    val isRunning: Boolean = translationStorageNameIsRunning(stateName)
}

fun translationStateFromStorage(name: String?, message: String?): TranslationState {
    return when (name) {
        "waiting_for_headset" -> TranslationState.WaitingForHeadset
        "connecting" -> TranslationState.Connecting
        "active" -> TranslationState.Active
        "stopping" -> TranslationState.Stopping
        "error" -> TranslationState.Error(message.orEmpty().ifBlank { "Translation failed." })
        else -> TranslationState.Idle
    }
}

fun restorableTranslationStateFromStorage(
    name: String?,
    message: String?,
    hasLiveRunningState: Boolean,
): TranslationState {
    val restored = translationStateFromStorage(name, message)
    return if (translationStorageStateShouldRestoreAsIdle(name, message, hasLiveRunningState)) {
        TranslationState.Idle
    } else {
        restored
    }
}

fun translationSnapshotFromStorage(
    name: String?,
    message: String?,
    hasLiveRunningState: Boolean,
): TranslationSnapshot {
    val restoredName = if (translationStorageStateShouldRestoreAsIdle(name, message, hasLiveRunningState)) {
        TranslationState.Idle.storageName
    } else {
        name ?: TranslationState.Idle.storageName
    }
    return TranslationSnapshot(
        stateName = restoredName,
        errorMessage = message,
    )
}

fun translationStorageNameIsRunning(name: String?): Boolean {
    return name == "waiting_for_headset" || name == "connecting" || name == "active" || name == "stopping"
}

fun translationStorageStateShouldRestoreAsIdle(
    name: String?,
    message: String?,
    hasLiveRunningState: Boolean,
): Boolean {
    return (translationStorageNameIsRunning(name) && !hasLiveRunningState) ||
        isTransientStoredError(name, message)
}
