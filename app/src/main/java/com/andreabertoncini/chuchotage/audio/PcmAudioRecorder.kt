package com.andreabertoncini.chuchotage.audio

import android.annotation.SuppressLint
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.media.AudioAttributes
import android.media.AudioDeviceInfo
import android.media.AudioFormat
import android.media.AudioPlaybackCaptureConfiguration
import android.media.AudioManager
import android.media.AudioRecord
import android.media.MediaRecorder
import android.media.projection.MediaProjection
import android.os.Build
import android.os.Process
import com.andreabertoncini.chuchotage.settings.AudioInputSource
import kotlinx.coroutines.currentCoroutineContext
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.withTimeoutOrNull
import java.io.IOException
import java.util.concurrent.Executor
import kotlin.coroutines.resume

class PcmAudioRecorder(
    private val targetSampleRate: Int = TARGET_SAMPLE_RATE,
    private val audioInputSource: AudioInputSource = AudioInputSource.Phone,
    private val audioManager: AudioManager? = null,
    private val context: Context? = null,
    private val mediaProjection: MediaProjection? = null,
) {
    @SuppressLint("MissingPermission")
    suspend fun capture(onPcm24Khz: suspend (ByteArray) -> Unit) {
        if (audioInputSource == AudioInputSource.DeviceAudio) {
            captureDeviceAudio(onPcm24Khz)
            return
        }

        val config = selectRecordingConfig()
        val preferredDevice = preferredInputDevice()
        if (audioInputSource == AudioInputSource.Headset && preferredDevice == null) {
            throw IOException("Headset microphone unavailable.")
        }

        val preparedRoute = prepareHeadsetRoute(preferredDevice)
        val builder = AudioRecord.Builder()
            .setAudioSource(MediaRecorder.AudioSource.VOICE_RECOGNITION)
            .setAudioFormat(
                AudioFormat.Builder()
                    .setEncoding(AudioFormat.ENCODING_PCM_16BIT)
                    .setSampleRate(config.sampleRate)
                    .setChannelMask(AudioFormat.CHANNEL_IN_MONO)
                    .build(),
            )
            .setBufferSizeInBytes(config.recordBufferBytes)

        val audioRecord = builder.build()
        if (preferredDevice != null && !audioRecord.setPreferredDevice(preferredDevice)) {
            if (audioInputSource == AudioInputSource.Headset) {
                audioRecord.release()
                throw IOException("Selected microphone could not be used.")
            }
        }

        val readBuffer = ByteArray(config.chunkBytes)
        try {
            audioRecord.startRecording()
            verifySelectedHeadsetRoute(audioRecord, preferredDevice)
            while (currentCoroutineContext().isActive) {
                val read = audioRecord.read(readBuffer, 0, readBuffer.size)
                if (read > 0) {
                    val pcm24Khz = PcmResampler.resamplePcm16Mono(
                        input = readBuffer,
                        bytesRead = read,
                        fromSampleRate = config.sampleRate,
                        toSampleRate = targetSampleRate,
                    )
                    if (pcm24Khz.isNotEmpty()) {
                        onPcm24Khz(pcm24Khz)
                    }
                } else if (read == AudioRecord.ERROR_INVALID_OPERATION || read == AudioRecord.ERROR_BAD_VALUE) {
                    throw IOException("Microphone capture failed with AudioRecord error $read.")
                }
            }
        } finally {
            runCatching { audioRecord.stop() }
            audioRecord.release()
            preparedRoute.close()
        }
    }

    @SuppressLint("MissingPermission")
    private suspend fun captureDeviceAudio(onPcm24Khz: suspend (ByteArray) -> Unit) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
            throw IOException("Device audio capture requires Android 10 or newer.")
        }

        val projection = mediaProjection ?: throw IOException("Allow device audio capture to start.")
        val config = selectRecordingConfig()
        val playbackCaptureConfig = AudioPlaybackCaptureConfiguration.Builder(projection)
            .addMatchingUsage(AudioAttributes.USAGE_MEDIA)
            .addMatchingUsage(AudioAttributes.USAGE_GAME)
            .addMatchingUsage(AudioAttributes.USAGE_UNKNOWN)
            .excludeUid(Process.myUid())
            .build()
        val audioRecord = AudioRecord.Builder()
            .setAudioPlaybackCaptureConfig(playbackCaptureConfig)
            .setAudioFormat(
                AudioFormat.Builder()
                    .setEncoding(AudioFormat.ENCODING_PCM_16BIT)
                    .setSampleRate(config.sampleRate)
                    .setChannelMask(AudioFormat.CHANNEL_IN_MONO)
                    .build(),
            )
            .setBufferSizeInBytes(config.recordBufferBytes)
            .build()

        val readBuffer = ByteArray(config.chunkBytes)
        try {
            audioRecord.startRecording()
            while (currentCoroutineContext().isActive) {
                val read = audioRecord.read(readBuffer, 0, readBuffer.size)
                if (read > 0) {
                    val pcm24Khz = PcmResampler.resamplePcm16Mono(
                        input = readBuffer,
                        bytesRead = read,
                        fromSampleRate = config.sampleRate,
                        toSampleRate = targetSampleRate,
                    )
                    if (pcm24Khz.isNotEmpty()) {
                        onPcm24Khz(pcm24Khz)
                    }
                } else if (read == AudioRecord.ERROR_INVALID_OPERATION || read == AudioRecord.ERROR_BAD_VALUE) {
                    throw IOException("Device audio capture failed with AudioRecord error $read.")
                }
            }
        } finally {
            runCatching { audioRecord.stop() }
            audioRecord.release()
        }
    }

    private fun selectRecordingConfig(): RecordingConfig {
        for (sampleRate in CANDIDATE_SAMPLE_RATES) {
            val minBuffer = AudioRecord.getMinBufferSize(
                sampleRate,
                AudioFormat.CHANNEL_IN_MONO,
                AudioFormat.ENCODING_PCM_16BIT,
            )
            if (minBuffer > 0) {
                val chunkBytes = ((sampleRate / CHUNKS_PER_SECOND) * BYTES_PER_SAMPLE)
                    .coerceAtLeast(MIN_CHUNK_BYTES)
                return RecordingConfig(
                    sampleRate = sampleRate,
                    chunkBytes = chunkBytes,
                    recordBufferBytes = minBuffer.coerceAtLeast(chunkBytes * 4),
                )
            }
        }

        throw IOException("No supported mono PCM16 audio sample rate found.")
    }

    private suspend fun prepareHeadsetRoute(preferredDevice: AudioDeviceInfo?): PreparedAudioRoute {
        val manager = audioManager ?: return PreparedAudioRoute.Noop
        if (audioInputSource != AudioInputSource.Headset || preferredDevice == null) {
            return PreparedAudioRoute.Noop
        }

        val previousMode = manager.mode
        val previousBluetoothScoOn = runCatching {
            @Suppress("DEPRECATION")
            manager.isBluetoothScoOn
        }.getOrDefault(false)

        manager.mode = AudioManager.MODE_IN_COMMUNICATION
        val usesBluetoothSco = AudioDevices.isBluetoothHeadsetType(preferredDevice.type)
        val communicationRoute = setCommunicationRoute(manager, preferredDevice)

        if (usesBluetoothSco && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && !communicationRoute.ready) {
            restoreHeadsetRoute(manager, previousMode, previousBluetoothScoOn, communicationRoute.requested, false)
            throw IOException("Bluetooth headset microphone is not ready. Reconnect the headset and try again.")
        }

        if (usesBluetoothSco && Build.VERSION.SDK_INT < Build.VERSION_CODES.S) {
            val isReady = try {
                startBluetoothScoAndWait(manager)
            } catch (securityException: SecurityException) {
                restoreHeadsetRoute(manager, previousMode, previousBluetoothScoOn, communicationRoute.requested, true)
                throw IOException(
                    "Nearby devices permission is required for the Bluetooth headset microphone.",
                    securityException,
                )
            }

            if (!isReady) {
                restoreHeadsetRoute(manager, previousMode, previousBluetoothScoOn, communicationRoute.requested, true)
                throw IOException("Bluetooth headset microphone is not ready. Reconnect the headset and try again.")
            }
        }

        return PreparedAudioRoute {
            restoreHeadsetRoute(
                audioManager = manager,
                previousMode = previousMode,
                previousBluetoothScoOn = previousBluetoothScoOn,
                communicationDeviceWasSet = communicationRoute.requested,
                bluetoothScoWasStarted = usesBluetoothSco && Build.VERSION.SDK_INT < Build.VERSION_CODES.S,
            )
        }
    }

    private suspend fun setCommunicationRoute(
        audioManager: AudioManager,
        preferredDevice: AudioDeviceInfo,
    ): CommunicationRouteResult {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return CommunicationRouteResult.NotRequested

        val communicationDevice = runCatching {
            audioManager.availableCommunicationDevices.firstOrNull { device ->
                AudioDevices.isMatchingHeadsetRoute(preferredDevice.type, device.type)
            }
        }.getOrNull() ?: return CommunicationRouteResult.NotRequested

        val requested = runCatching {
            audioManager.setCommunicationDevice(communicationDevice)
        }.getOrDefault(false)
        if (!requested) return CommunicationRouteResult.NotRequested

        return CommunicationRouteResult(
            requested = true,
            ready = waitForCommunicationDevice(audioManager, preferredDevice),
        )
    }

    private suspend fun waitForCommunicationDevice(
        audioManager: AudioManager,
        preferredDevice: AudioDeviceInfo,
    ): Boolean {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return false
        if (audioManager.currentCommunicationDeviceMatches(preferredDevice)) return true

        return withTimeoutOrNull(COMMUNICATION_DEVICE_TIMEOUT_MS) {
            suspendCancellableCoroutine { continuation ->
                val directExecutor = Executor { command -> command.run() }
                var listener: AudioManager.OnCommunicationDeviceChangedListener? = null

                fun removeListener() {
                    listener?.let { runCatching { audioManager.removeOnCommunicationDeviceChangedListener(it) } }
                    listener = null
                }

                fun finish(isReady: Boolean) {
                    if (!continuation.isActive) return
                    removeListener()
                    continuation.resume(isReady)
                }

                listener = AudioManager.OnCommunicationDeviceChangedListener { device ->
                    if (device != null && AudioDevices.isMatchingHeadsetRoute(preferredDevice.type, device.type)) {
                        finish(true)
                    }
                }

                val registered = runCatching {
                    audioManager.addOnCommunicationDeviceChangedListener(directExecutor, listener!!)
                }.isSuccess
                continuation.invokeOnCancellation { removeListener() }

                if (!registered) {
                    finish(false)
                } else if (audioManager.currentCommunicationDeviceMatches(preferredDevice)) {
                    finish(true)
                }
            }
        } ?: false
    }

    private fun AudioManager.currentCommunicationDeviceMatches(preferredDevice: AudioDeviceInfo): Boolean {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return false
        val currentDevice = runCatching { communicationDevice }.getOrNull() ?: return false
        return AudioDevices.isMatchingHeadsetRoute(preferredDevice.type, currentDevice.type)
    }

    @Suppress("DEPRECATION")
    private suspend fun startBluetoothScoAndWait(audioManager: AudioManager): Boolean {
        if (!audioManager.isBluetoothScoAvailableOffCall) return false
        audioManager.startBluetoothSco()
        audioManager.isBluetoothScoOn = true

        val appContext = context?.applicationContext
        if (appContext == null) {
            delay(BLUETOOTH_SCO_FALLBACK_DELAY_MS)
            return true
        }

        return withTimeoutOrNull(BLUETOOTH_SCO_TIMEOUT_MS) {
            suspendCancellableCoroutine { continuation ->
                var receiver: BroadcastReceiver? = null

                fun finish(isConnected: Boolean) {
                    if (!continuation.isActive) return
                    receiver?.let { runCatching { appContext.unregisterReceiver(it) } }
                    continuation.resume(isConnected)
                }

                receiver = object : BroadcastReceiver() {
                    override fun onReceive(context: Context, intent: Intent) {
                        val state = intent.getIntExtra(
                            AudioManager.EXTRA_SCO_AUDIO_STATE,
                            AudioManager.SCO_AUDIO_STATE_ERROR,
                        )
                        if (state == AudioManager.SCO_AUDIO_STATE_CONNECTED) {
                            finish(true)
                        }
                    }
                }

                val filter = IntentFilter(AudioManager.ACTION_SCO_AUDIO_STATE_UPDATED)
                val stickyIntent = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                    appContext.registerReceiver(receiver, filter, Context.RECEIVER_NOT_EXPORTED)
                } else {
                    appContext.registerReceiver(receiver, filter)
                }
                continuation.invokeOnCancellation {
                    receiver?.let { runCatching { appContext.unregisterReceiver(it) } }
                }

                val stickyState = stickyIntent?.getIntExtra(
                    AudioManager.EXTRA_SCO_AUDIO_STATE,
                    AudioManager.SCO_AUDIO_STATE_ERROR,
                )
                if (stickyState == AudioManager.SCO_AUDIO_STATE_CONNECTED) {
                    finish(true)
                }
            }
        } ?: false
    }

    private suspend fun verifySelectedHeadsetRoute(
        audioRecord: AudioRecord,
        preferredDevice: AudioDeviceInfo?,
    ) {
        if (audioInputSource != AudioInputSource.Headset || preferredDevice == null) return

        val routedDevice = waitForRoutedInputDevice(audioRecord, preferredDevice)
        if (routedDevice == null ||
            !AudioDevices.isMatchingHeadsetRoute(preferredDevice.type, routedDevice.type)
        ) {
            throw IOException("Selected microphone could not be used.")
        }
    }

    private suspend fun waitForRoutedInputDevice(
        audioRecord: AudioRecord,
        preferredDevice: AudioDeviceInfo,
    ): AudioDeviceInfo? {
        val deadline = System.nanoTime() + (ROUTED_DEVICE_TIMEOUT_MS * 1_000_000L)
        var latestDevice: AudioDeviceInfo? = null

        while (System.nanoTime() <= deadline) {
            val routedDevice = runCatching { audioRecord.routedDevice }.getOrNull()
            if (routedDevice != null) {
                latestDevice = routedDevice
                if (AudioDevices.isMatchingHeadsetRoute(preferredDevice.type, routedDevice.type)) {
                    return routedDevice
                }
            }
            delay(ROUTED_DEVICE_POLL_INTERVAL_MS)
        }

        return latestDevice
    }

    private fun restoreHeadsetRoute(
        audioManager: AudioManager,
        previousMode: Int,
        previousBluetoothScoOn: Boolean,
        communicationDeviceWasSet: Boolean,
        bluetoothScoWasStarted: Boolean,
    ) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && communicationDeviceWasSet) {
            runCatching { audioManager.clearCommunicationDevice() }
        }
        if (bluetoothScoWasStarted) {
            runCatching {
                @Suppress("DEPRECATION")
                audioManager.stopBluetoothSco()
            }
            runCatching {
                @Suppress("DEPRECATION")
                audioManager.isBluetoothScoOn = previousBluetoothScoOn
            }
        }
        audioManager.mode = previousMode
    }

    private fun preferredInputDevice(): AudioDeviceInfo? {
        val devices = runCatching {
            audioManager?.getDevices(AudioManager.GET_DEVICES_INPUTS)?.toList().orEmpty()
        }.getOrDefault(emptyList())

        return when (audioInputSource) {
            AudioInputSource.Phone -> devices.firstOrNull { it.type == AudioDeviceInfo.TYPE_BUILTIN_MIC }
            AudioInputSource.Headset -> {
                devices.firstOrNull { AudioDevices.isHeadsetInputType(it.type) }
            }
            AudioInputSource.DeviceAudio -> null
        }
    }

    private fun interface PreparedAudioRoute {
        fun close()

        companion object {
            val Noop = PreparedAudioRoute {}
        }
    }

    private data class RecordingConfig(
        val sampleRate: Int,
        val chunkBytes: Int,
        val recordBufferBytes: Int,
    )

    private data class CommunicationRouteResult(
        val requested: Boolean,
        val ready: Boolean,
    ) {
        companion object {
            val NotRequested = CommunicationRouteResult(requested = false, ready = false)
        }
    }

    companion object {
        const val TARGET_SAMPLE_RATE = 24_000
        private const val BYTES_PER_SAMPLE = 2
        private const val CHUNKS_PER_SECOND = 50
        private const val MIN_CHUNK_BYTES = 960
        private const val BLUETOOTH_SCO_TIMEOUT_MS = 5_000L
        private const val BLUETOOTH_SCO_FALLBACK_DELAY_MS = 1_500L
        private const val COMMUNICATION_DEVICE_TIMEOUT_MS = 30_000L
        private const val ROUTED_DEVICE_TIMEOUT_MS = 1_000L
        private const val ROUTED_DEVICE_POLL_INTERVAL_MS = 50L
        private val CANDIDATE_SAMPLE_RATES = intArrayOf(24_000, 48_000, 44_100, 32_000, 16_000)
    }
}
