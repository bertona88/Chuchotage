package com.andreabertoncini.chuchotage.audio

import android.media.AudioAttributes
import android.media.AudioFormat
import android.media.AudioManager
import android.media.AudioTrack
import com.andreabertoncini.chuchotage.settings.AudioOutputRoute

class PcmAudioPlayer(
    private val sampleRate: Int = PcmAudioRecorder.TARGET_SAMPLE_RATE,
    private val audioOutputRoute: AudioOutputRoute = AudioOutputRoute.SystemDefault,
    private val audioManager: AudioManager? = null,
    originalAudioDuckingEnabled: Boolean = false,
    focusBackgroundEnabled: Boolean = false,
) {
    private val lock = Any()
    private val originalAudioDucker = OriginalAudioDucker(
        audioManager = audioManager,
        enabled = originalAudioDuckingEnabled,
    )
    private val focusBackgroundPlayer = FocusBackgroundPlayer(
        sampleRate = sampleRate,
        audioOutputRoute = audioOutputRoute,
        audioManager = audioManager,
        enabled = focusBackgroundEnabled,
    )
    private var audioTrack: AudioTrack? = null

    fun start() {
        synchronized(lock) {
            if (audioTrack != null) return

            val minBuffer = AudioTrack.getMinBufferSize(
                sampleRate,
                AudioFormat.CHANNEL_OUT_MONO,
                AudioFormat.ENCODING_PCM_16BIT,
            )
            val track = AudioTrack.Builder()
                .setAudioAttributes(
                    AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_MEDIA)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                        .build(),
                )
                .setAudioFormat(
                    AudioFormat.Builder()
                        .setEncoding(AudioFormat.ENCODING_PCM_16BIT)
                        .setSampleRate(sampleRate)
                        .setChannelMask(AudioFormat.CHANNEL_OUT_MONO)
                        .build(),
                )
                .setTransferMode(AudioTrack.MODE_STREAM)
                .setBufferSizeInBytes(minBuffer.coerceAtLeast(sampleRate / 2))
                .build()

            val preferredDevice = AudioDevices.preferredOutputDevice(audioManager, audioOutputRoute)
            if (preferredDevice != null) {
                runCatching { track.setPreferredDevice(preferredDevice) }
            }

            track.play()
            audioTrack = track
            focusBackgroundPlayer.start()
        }
    }

    fun play(base64Pcm16: String) {
        val pcm = runCatching { PcmAudioCodec.decodeBase64Pcm16(base64Pcm16) }.getOrNull() ?: return
        playPcm(pcm)
    }

    fun playPcm(pcm: ByteArray) {
        synchronized(lock) {
            val track = audioTrack ?: return
            focusBackgroundPlayer.duckAroundTranslatedAudio()
            originalAudioDucker.duckAroundTranslatedAudio()
            track.write(pcm, 0, pcm.size)
        }
    }

    fun stop() {
        synchronized(lock) {
            val track = audioTrack
            if (track == null) {
                focusBackgroundPlayer.stop()
                originalAudioDucker.stop()
                return
            }
            audioTrack = null
            focusBackgroundPlayer.stop()
            runCatching { track.pause() }
            runCatching { track.flush() }
            track.release()
            originalAudioDucker.stop()
        }
    }
}
