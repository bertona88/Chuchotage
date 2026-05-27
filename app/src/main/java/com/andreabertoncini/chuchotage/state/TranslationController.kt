package com.andreabertoncini.chuchotage.state

import android.Manifest
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.content.ContextCompat
import com.andreabertoncini.chuchotage.TranslationActions
import com.andreabertoncini.chuchotage.network.SecureApiKeyStore
import com.andreabertoncini.chuchotage.service.TranslationForegroundService
import com.andreabertoncini.chuchotage.settings.AudioInputSource
import com.andreabertoncini.chuchotage.settings.TranslationLanguages
import com.andreabertoncini.chuchotage.settings.TranslationSettingsStore
import com.andreabertoncini.chuchotage.settings.audioFeedbackWarningMessage
import com.andreabertoncini.chuchotage.widget.TranslationWidgetProvider
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update

object TranslationController {
    private const val PREFS_NAME = "translation_state"
    private const val KEY_STATE = "state"
    private const val KEY_ERROR = "error"

    private val mutableState = MutableStateFlow<TranslationState>(TranslationState.Idle)
    val state: StateFlow<TranslationState> = mutableState.asStateFlow()

    private val mutableInputVolume = MutableStateFlow(0f)
    val inputVolume: StateFlow<Float> = mutableInputVolume.asStateFlow()

    private val mutableTranscript = MutableStateFlow(TranslationTranscript())
    val transcript: StateFlow<TranslationTranscript> = mutableTranscript.asStateFlow()

    fun restore(context: Context) {
        val appContext = context.applicationContext
        val hasLiveRunningState = mutableState.value.isRunning
        if (hasLiveRunningState) return
        val restored = readStoredState(appContext, hasLiveRunningState)
        mutableState.value = restored
        clearStaleRunningState(appContext, hasLiveRunningState)
    }

    fun start(
        context: Context,
        mediaProjectionResultCode: Int? = null,
        mediaProjectionResultData: Intent? = null,
        allowAudioFeedbackRisk: Boolean = false,
        useActiveDemoMediaProjection: Boolean = false,
        targetLanguageCode: String? = null,
        sourceTranscriptEnabled: Boolean? = null,
    ) {
        val appContext = context.applicationContext
        if (!SecureApiKeyStore(appContext).hasCredential()) {
            update(appContext, TranslationState.Error("OpenAI login missing."))
            return
        }

        if (!hasStartPermissions(appContext)) {
            update(appContext, TranslationState.Error(startPermissionErrorMessage(appContext)))
            return
        }

        val settings = TranslationSettingsStore(appContext).read()
        val audioFeedbackWarning = settings.audioFeedbackWarningMessage()
        if (!allowAudioFeedbackRisk && audioFeedbackWarning != null) {
            update(appContext, TranslationState.Error(audioFeedbackWarning))
            return
        }

        clearTranscript()
        update(appContext, TranslationState.Connecting)
        ContextCompat.startForegroundService(
            appContext,
            translationServiceIntent(
                context = appContext,
                action = TranslationActions.ACTION_START,
                mediaProjectionResultCode = mediaProjectionResultCode,
                mediaProjectionResultData = mediaProjectionResultData,
                allowAudioFeedbackRisk = allowAudioFeedbackRisk,
                useActiveDemoMediaProjection = useActiveDemoMediaProjection,
                targetLanguageCode = targetLanguageCode,
                sourceTranscriptEnabled = sourceTranscriptEnabled,
            ),
        )
    }

    fun stop(context: Context) {
        val appContext = context.applicationContext
        appContext.startService(
            Intent(appContext, TranslationForegroundService::class.java).setAction(TranslationActions.ACTION_STOP),
        )
    }

    fun armHeadsetAutoStart(context: Context) {
        val appContext = context.applicationContext
        if (!SecureApiKeyStore(appContext).hasCredential()) {
            update(appContext, TranslationState.Error("OpenAI login missing."))
            return
        }

        val settings = TranslationSettingsStore(appContext).read()
        if (settings.audioInputSource != AudioInputSource.Headset) {
            update(appContext, TranslationState.Error("Select Headset mic for auto-start."))
            return
        }

        if (!hasStartPermissions(appContext)) {
            update(appContext, TranslationState.Error(startPermissionErrorMessage(appContext)))
            return
        }

        val audioFeedbackWarning = settings.audioFeedbackWarningMessage()
        if (audioFeedbackWarning != null) {
            update(appContext, TranslationState.Error(audioFeedbackWarning))
            return
        }

        clearTranscript()
        update(appContext, TranslationState.WaitingForHeadset)
        ContextCompat.startForegroundService(
            appContext,
            Intent(appContext, TranslationForegroundService::class.java)
                .setAction(TranslationActions.ACTION_ARM_HEADSET_AUTO_START),
        )
    }

    fun disarmHeadsetAutoStart(context: Context) {
        val appContext = context.applicationContext
        appContext.startService(
            Intent(appContext, TranslationForegroundService::class.java)
                .setAction(TranslationActions.ACTION_DISARM_HEADSET_AUTO_START),
        )
    }

    fun restart(
        context: Context,
        mediaProjectionResultCode: Int? = null,
        mediaProjectionResultData: Intent? = null,
        allowAudioFeedbackRisk: Boolean = false,
        useActiveDemoMediaProjection: Boolean = false,
        targetLanguageCode: String? = null,
        sourceTranscriptEnabled: Boolean? = null,
    ) {
        val appContext = context.applicationContext
        if (!SecureApiKeyStore(appContext).hasCredential()) {
            update(appContext, TranslationState.Error("OpenAI login missing."))
            return
        }

        if (!hasStartPermissions(appContext)) {
            update(appContext, TranslationState.Error(startPermissionErrorMessage(appContext)))
            return
        }

        val settings = TranslationSettingsStore(appContext).read()
        val audioFeedbackWarning = settings.audioFeedbackWarningMessage()
        if (!allowAudioFeedbackRisk && audioFeedbackWarning != null) {
            update(appContext, TranslationState.Error(audioFeedbackWarning))
            return
        }

        clearTranscript()
        update(appContext, TranslationState.Connecting)
        ContextCompat.startForegroundService(
            appContext,
            translationServiceIntent(
                context = appContext,
                action = TranslationActions.ACTION_RESTART,
                mediaProjectionResultCode = mediaProjectionResultCode,
                mediaProjectionResultData = mediaProjectionResultData,
                allowAudioFeedbackRisk = allowAudioFeedbackRisk,
                useActiveDemoMediaProjection = useActiveDemoMediaProjection,
                targetLanguageCode = targetLanguageCode,
                sourceTranscriptEnabled = sourceTranscriptEnabled,
            ),
        )
    }

    fun toggle(context: Context) {
        val current = mutableState.value
        if (current.isRunning) stop(context) else start(context)
    }

    fun update(context: Context, state: TranslationState) {
        val appContext = context.applicationContext
        mutableState.value = state
        if (state !is TranslationState.Active) {
            mutableInputVolume.value = 0f
        }
        if (!state.isRunning) {
            clearTranscript()
        }
        writeStoredState(appContext, state)
        TranslationWidgetProvider.updateAll(appContext)
    }

    fun updateErrorIfNotRunning(context: Context, message: String) {
        if (mutableState.value.isRunning) return
        update(context, TranslationState.Error(message))
    }

    fun updateInputVolume(level: Float) {
        val clamped = level.coerceIn(0f, 1f)
        val current = mutableInputVolume.value
        mutableInputVolume.value = if (clamped > current) {
            current + ((clamped - current) * 0.45f)
        } else {
            current + ((clamped - current) * 0.18f)
        }
    }

    fun clearTranscript() {
        mutableTranscript.value = TranslationTranscript()
    }

    fun appendInputTranscript(delta: String) {
        mutableTranscript.update { transcript ->
            transcript.appendInput(delta)
        }
    }

    fun appendOutputTranscript(delta: String) {
        mutableTranscript.update { transcript ->
            transcript.appendOutput(delta)
        }
    }

    fun hasMicrophonePermission(context: Context): Boolean {
        return ContextCompat.checkSelfPermission(context, Manifest.permission.RECORD_AUDIO) ==
            PackageManager.PERMISSION_GRANTED
    }

    fun hasStartPermissions(context: Context): Boolean {
        val settings = TranslationSettingsStore(context).read()
        return hasMicrophonePermission(context) && hasBluetoothConnectPermission(context, settings.audioInputSource)
    }

    fun startPermissionErrorMessage(context: Context): String {
        val settings = TranslationSettingsStore(context).read()
        return if (!hasMicrophonePermission(context)) {
            if (settings.audioInputSource == AudioInputSource.DeviceAudio) {
                "Audio capture permission missing."
            } else {
                "Microphone permission missing."
            }
        } else if (!hasBluetoothConnectPermission(context, settings.audioInputSource)) {
            "Nearby devices permission is required for the Bluetooth headset microphone."
        } else {
            "Required permission missing."
        }
    }

    fun snapshot(context: Context): TranslationSnapshot {
        val appContext = context.applicationContext
        val current = mutableState.value
        val hasLiveRunningState = current.isRunning
        if (hasLiveRunningState) {
            return TranslationSnapshot(
                stateName = current.storageName,
                errorMessage = null,
            )
        }
        val prefs = appContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val snapshot = translationSnapshotFromStorage(
            name = prefs.getString(KEY_STATE, "idle"),
            message = prefs.getString(KEY_ERROR, null),
            hasLiveRunningState = hasLiveRunningState,
        )
        clearStaleRunningState(appContext, hasLiveRunningState)
        return snapshot
    }

    private fun readStoredState(context: Context, hasLiveRunningState: Boolean): TranslationState {
        val prefs = context.applicationContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        return restorableTranslationStateFromStorage(
            name = prefs.getString(KEY_STATE, "idle"),
            message = prefs.getString(KEY_ERROR, null),
            hasLiveRunningState = hasLiveRunningState,
        )
    }

    private fun clearStaleRunningState(context: Context, hasLiveRunningState: Boolean) {
        if (hasLiveRunningState) return
        val prefs = context.applicationContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        if (
            translationStorageStateShouldRestoreAsIdle(
                name = prefs.getString(KEY_STATE, "idle"),
                message = prefs.getString(KEY_ERROR, null),
                hasLiveRunningState = hasLiveRunningState,
            )
        ) {
            writeStoredState(context, TranslationState.Idle)
        }
    }

    private fun writeStoredState(context: Context, state: TranslationState) {
        context.applicationContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .edit()
            .putString(KEY_STATE, state.storageName)
            .putString(KEY_ERROR, (state as? TranslationState.Error)?.message)
            .apply()
    }

    private fun translationServiceIntent(
        context: Context,
        action: String,
        mediaProjectionResultCode: Int?,
        mediaProjectionResultData: Intent?,
        allowAudioFeedbackRisk: Boolean,
        useActiveDemoMediaProjection: Boolean,
        targetLanguageCode: String?,
        sourceTranscriptEnabled: Boolean?,
    ): Intent {
        val intent = Intent(context, TranslationForegroundService::class.java).setAction(action)
        intent.putExtra(TranslationForegroundService.EXTRA_ALLOW_AUDIO_FEEDBACK_RISK, allowAudioFeedbackRisk)
        intent.putExtra(
            TranslationForegroundService.EXTRA_USE_ACTIVE_DEMO_MEDIA_PROJECTION,
            useActiveDemoMediaProjection,
        )
        if (targetLanguageCode != null) {
            intent.putExtra(
                TranslationForegroundService.EXTRA_TARGET_LANGUAGE_CODE,
                TranslationLanguages.sanitizeOutputLanguageCode(targetLanguageCode),
            )
        }
        if (sourceTranscriptEnabled != null) {
            intent.putExtra(TranslationForegroundService.EXTRA_SOURCE_TRANSCRIPT_ENABLED, sourceTranscriptEnabled)
        }
        if (mediaProjectionResultCode != null && mediaProjectionResultData != null) {
            intent
                .putExtra(TranslationForegroundService.EXTRA_MEDIA_PROJECTION_RESULT_CODE, mediaProjectionResultCode)
                .putExtra(TranslationForegroundService.EXTRA_MEDIA_PROJECTION_RESULT_DATA, mediaProjectionResultData)
        }
        return intent
    }

    private fun hasBluetoothConnectPermission(context: Context, audioInputSource: AudioInputSource): Boolean {
        if (!needsBluetoothConnectPermission(audioInputSource)) {
            return true
        }
        return ContextCompat.checkSelfPermission(context, Manifest.permission.BLUETOOTH_CONNECT) ==
            PackageManager.PERMISSION_GRANTED
    }

    private fun needsBluetoothConnectPermission(audioInputSource: AudioInputSource): Boolean {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) {
            return false
        }
        return audioInputSource == AudioInputSource.Headset
    }
}
