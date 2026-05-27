package com.andreabertoncini.chuchotage.audio

import android.media.AudioAttributes
import android.media.AudioFormat
import android.media.AudioManager
import android.media.AudioTrack
import android.os.SystemClock
import com.andreabertoncini.chuchotage.settings.AudioOutputRoute

class FocusBackgroundPlayer(
    private val sampleRate: Int = PcmAudioRecorder.TARGET_SAMPLE_RATE,
    private val audioOutputRoute: AudioOutputRoute = AudioOutputRoute.SystemDefault,
    private val audioManager: AudioManager? = null,
    private val enabled: Boolean = false,
) {
    private val lock = Any()
    private val envelope = FocusBackgroundDuckEnvelope()
    @Volatile private var running = false
    private var audioTrack: AudioTrack? = null
    private var playbackThread: Thread? = null

    fun start() {
        synchronized(lock) {
            if (running || !enabled || audioOutputRoute == AudioOutputRoute.PhoneSpeaker) return

            val preferredDevice = when (audioOutputRoute) {
                AudioOutputRoute.SystemDefault -> {
                    if (!AudioDevices.hasHeadphonesOrEarbudsPlaybackDevice(audioManager)) return
                    null
                }
                AudioOutputRoute.Headphones -> {
                    AudioDevices.preferredOutputDevice(audioManager, AudioOutputRoute.Headphones) ?: return
                }
                AudioOutputRoute.PhoneSpeaker -> return
            }
            val minBuffer = AudioTrack.getMinBufferSize(
                sampleRate,
                AudioFormat.CHANNEL_OUT_MONO,
                AudioFormat.ENCODING_PCM_16BIT,
            )
            val bufferSize = minBuffer.takeIf { it > 0 } ?: (sampleRate / 2)
            val track = AudioTrack.Builder()
                .setAudioAttributes(
                    AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_MEDIA)
                        .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
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
                .setBufferSizeInBytes(bufferSize.coerceAtLeast(sampleRate / 2))
                .build()

            if (preferredDevice != null) {
                runCatching { track.setPreferredDevice(preferredDevice) }
            }

            runCatching { track.play() }.onFailure {
                track.release()
                return
            }

            running = true
            audioTrack = track
            playbackThread = Thread(
                { playbackLoop(track) },
                "FocusBackgroundPlayer",
            ).apply {
                isDaemon = true
                start()
            }
        }
    }

    fun duckAroundTranslatedAudio() {
        if (!running) return
        envelope.duck(SystemClock.elapsedRealtime())
    }

    fun stop() {
        val track: AudioTrack?
        val thread: Thread?
        synchronized(lock) {
            if (!running && audioTrack == null) return
            running = false
            track = audioTrack
            thread = playbackThread
            audioTrack = null
            playbackThread = null
        }

        runCatching { track?.pause() }
        runCatching { track?.flush() }
        runCatching { track?.release() }
        runCatching { thread?.join(STOP_JOIN_MILLIS) }
    }

    private fun playbackLoop(track: AudioTrack) {
        val generator = FocusBackgroundNoiseGenerator()
        val sampleCount = ((sampleRate * CHUNK_MILLIS) / MILLIS_PER_SECOND).coerceAtLeast(1)

        while (running) {
            val level = envelope.levelAt(SystemClock.elapsedRealtime())
            val pcm = generator.nextPcm16(sampleCount = sampleCount, level = level)
            val written = runCatching { track.write(pcm, 0, pcm.size) }.getOrDefault(-1)
            if (written < 0) break
        }
    }

    companion object {
        private const val CHUNK_MILLIS = 20
        private const val MILLIS_PER_SECOND = 1_000
        private const val STOP_JOIN_MILLIS = 200L
    }
}
