package com.andreabertoncini.chuchotage.demo

import android.content.Context
import android.content.Intent
import android.media.projection.MediaProjection
import android.net.Uri
import androidx.core.content.ContextCompat
import com.andreabertoncini.chuchotage.BuildConfig
import com.andreabertoncini.chuchotage.TranslationActions
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

object DemoRecordingController {
    private const val MAX_CAPTION_CHARS = 220

    private val mutableState = MutableStateFlow(DemoRecordingState())
    val state: StateFlow<DemoRecordingState> = mutableState.asStateFlow()

    private val lock = Any()
    private val inputCaption = StringBuilder()
    private val outputCaption = StringBuilder()
    private var recorder: DemoMp4Recorder? = null

    fun prepareForScreenCapture() {
        if (!BuildConfig.DEBUG) return

        synchronized(lock) {
            clearCaptionsLocked()
            mutableState.value = DemoRecordingState(status = DemoRecordingStatus.Starting)
        }
    }

    fun start(context: Context, resultCode: Int, data: Intent) {
        if (!BuildConfig.DEBUG) return

        val appContext = context.applicationContext
        ContextCompat.startForegroundService(
            appContext,
            Intent(appContext, DemoRecordingService::class.java)
                .setAction(TranslationActions.ACTION_DEMO_RECORDING_START)
                .putExtra(DemoRecordingService.EXTRA_RESULT_CODE, resultCode)
                .putExtra(DemoRecordingService.EXTRA_RESULT_DATA, data),
        )
    }

    fun stop(context: Context) {
        if (!BuildConfig.DEBUG) return

        val appContext = context.applicationContext
        appContext.startService(
            Intent(appContext, DemoRecordingService::class.java)
                .setAction(TranslationActions.ACTION_DEMO_RECORDING_STOP),
        )
    }

    fun cancelBeforeStart(message: String? = null) {
        synchronized(lock) {
            clearCaptionsLocked()
            mutableState.value = if (message == null) {
                DemoRecordingState()
            } else {
                DemoRecordingState(
                    status = DemoRecordingStatus.Error,
                    errorMessage = message,
                )
            }
        }
    }

    fun resetFinishedState() {
        synchronized(lock) {
            if (mutableState.value.status == DemoRecordingStatus.Saved ||
                mutableState.value.status == DemoRecordingStatus.Error
            ) {
                clearCaptionsLocked()
                mutableState.value = DemoRecordingState()
            }
        }
    }

    internal fun attachRecorder(nextRecorder: DemoMp4Recorder) {
        synchronized(lock) {
            recorder = nextRecorder
        }
    }

    internal fun markRecording() {
        synchronized(lock) {
            mutableState.value = mutableState.value.copy(
                status = DemoRecordingStatus.Recording,
                savedUri = null,
                errorMessage = null,
            )
        }
    }

    internal fun clearRecorder(recorderToClear: DemoMp4Recorder) {
        synchronized(lock) {
            if (recorder === recorderToClear) {
                recorder = null
            }
        }
    }

    fun activeMediaProjectionForTranslation(): MediaProjection? {
        return synchronized(lock) {
            recorder?.activeMediaProjection()
        }
    }

    fun hasActiveMediaProjectionForTranslation(): Boolean {
        return activeMediaProjectionForTranslation() != null
    }

    internal fun markSaved(uri: Uri?) {
        synchronized(lock) {
            recorder = null
            mutableState.value = DemoRecordingState(
                status = DemoRecordingStatus.Saved,
                savedUri = uri,
            )
            clearCaptionsLocked()
        }
    }

    internal fun markError(message: String) {
        synchronized(lock) {
            recorder = null
            clearCaptionsLocked()
            mutableState.value = DemoRecordingState(
                status = DemoRecordingStatus.Error,
                errorMessage = message.ifBlank { "Demo recording failed." },
            )
        }
    }

    fun recordInputPcm(pcm24Khz: ByteArray) {
        synchronized(lock) {
            recorder?.recordInputPcm(pcm24Khz)
        }
    }

    fun recordOutputPcm(pcm24Khz: ByteArray) {
        synchronized(lock) {
            recorder?.recordOutputPcm(pcm24Khz)
        }
    }

    suspend fun pauseOriginalAudioCaptureForTranslation() {
        val activeRecorder = synchronized(lock) { recorder }
        activeRecorder?.pauseOriginalAudioCapture()
    }

    fun resumeOriginalAudioCaptureAfterTranslation() {
        synchronized(lock) {
            recorder?.resumeOriginalAudioCapture()
        }
    }

    fun appendInputTranscript(delta: String) {
        appendCaption(delta, inputCaption) { nextCaption ->
            mutableState.value = mutableState.value.copy(inputCaption = nextCaption)
        }
    }

    fun appendOutputTranscript(delta: String) {
        appendCaption(delta, outputCaption) { nextCaption ->
            mutableState.value = mutableState.value.copy(outputCaption = nextCaption)
        }
    }

    private fun appendCaption(
        delta: String,
        builder: StringBuilder,
        commit: (String) -> Unit,
    ) {
        if (delta.isBlank()) return
        synchronized(lock) {
            if (!mutableState.value.shouldShowRecordingChrome) return
            builder.append(delta)
            if (builder.length > MAX_CAPTION_CHARS) {
                builder.delete(0, builder.length - MAX_CAPTION_CHARS)
            }
            commit(builder.toString().trimStart())
        }
    }

    private fun clearCaptionsLocked() {
        inputCaption.clear()
        outputCaption.clear()
    }
}
