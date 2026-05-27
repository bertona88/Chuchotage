package com.andreabertoncini.chuchotage.audio

import android.media.AudioAttributes
import android.media.AudioFocusRequest
import android.media.AudioManager
import android.os.Handler
import android.os.Looper

class OriginalAudioDucker(
    private val audioManager: AudioManager?,
    private val enabled: Boolean,
    private val holdMillis: Long = DEFAULT_HOLD_MILLIS,
) {
    private val lock = Any()
    private val handler = Handler(Looper.getMainLooper())
    private val abandonFocusRunnable = Runnable { abandonFocus() }
    private var focusRequest: AudioFocusRequest? = null
    private var hasFocus = false

    fun duckAroundTranslatedAudio() {
        if (!enabled || audioManager == null) return

        synchronized(lock) {
            val request = focusRequest ?: AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK)
                .setAudioAttributes(audioFocusAttributes())
                .setAcceptsDelayedFocusGain(false)
                .build()
                .also { focusRequest = it }

            if (!hasFocus) {
                val result = audioManager.requestAudioFocus(request)
                hasFocus = result == AudioManager.AUDIOFOCUS_REQUEST_GRANTED
            }
            handler.removeCallbacks(abandonFocusRunnable)
            handler.postDelayed(abandonFocusRunnable, holdMillis)
        }
    }

    fun stop() {
        abandonFocus()
    }

    private fun abandonFocus() {
        synchronized(lock) {
            handler.removeCallbacks(abandonFocusRunnable)
            val request = focusRequest
            if (hasFocus && request != null) {
                runCatching { audioManager?.abandonAudioFocusRequest(request) }
            }
            hasFocus = false
        }
    }

    private fun audioFocusAttributes(): AudioAttributes {
        return AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_MEDIA)
            .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
            .build()
    }

    companion object {
        private const val DEFAULT_HOLD_MILLIS = 450L
    }
}
