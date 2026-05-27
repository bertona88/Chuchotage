package com.andreabertoncini.chuchotage.demo

import android.net.Uri

data class DemoRecordingState(
    val status: DemoRecordingStatus = DemoRecordingStatus.Idle,
    val inputCaption: String = "",
    val outputCaption: String = "",
    val savedUri: Uri? = null,
    val errorMessage: String? = null,
) {
    val isStarting: Boolean = status == DemoRecordingStatus.Starting
    val isRecording: Boolean = status == DemoRecordingStatus.Recording
    val shouldShowRecordingChrome: Boolean = isStarting || isRecording
}

enum class DemoRecordingStatus {
    Idle,
    Starting,
    Recording,
    Saved,
    Error,
}
