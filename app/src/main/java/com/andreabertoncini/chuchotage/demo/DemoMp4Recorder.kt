package com.andreabertoncini.chuchotage.demo

import android.content.ContentValues
import android.content.Context
import android.hardware.display.DisplayManager
import android.hardware.display.VirtualDisplay
import android.media.AudioManager
import android.media.MediaCodec
import android.media.MediaCodecInfo
import android.media.MediaFormat
import android.media.MediaMuxer
import android.media.projection.MediaProjection
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.os.Handler
import android.os.Looper
import android.os.ParcelFileDescriptor
import android.provider.MediaStore
import android.view.Surface
import android.view.WindowManager
import androidx.core.content.FileProvider
import com.andreabertoncini.chuchotage.audio.PcmAudioRecorder
import com.andreabertoncini.chuchotage.settings.AudioInputSource
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.cancelAndJoin
import kotlinx.coroutines.launch
import kotlinx.coroutines.runBlocking
import java.io.File
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.concurrent.atomic.AtomicBoolean

class DemoMp4Recorder(
    private val context: Context,
    private val mediaProjection: MediaProjection,
    audioInputSource: AudioInputSource = AudioInputSource.Phone,
    audioManager: AudioManager? = null,
    private val onSaved: (Uri?) -> Unit,
    private val onError: (String) -> Unit,
) {
    private val running = AtomicBoolean(false)
    private val stopping = AtomicBoolean(false)
    private val audioMixer = DemoAudioMixer()
    private val originalAudioRecorder = PcmAudioRecorder(
        audioInputSource = audioInputSource,
        audioManager = audioManager,
        context = context,
        mediaProjection = mediaProjection,
    )
    private val originalAudioScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private val originalAudioLock = Any()
    private val muxerGate = MuxerGate()
    private val projectionCallback = object : MediaProjection.Callback() {
        override fun onStop() {
            stop()
        }
    }

    private var outputTarget: OutputTarget? = null
    private var muxer: MediaMuxer? = null
    private var videoCodec: MediaCodec? = null
    private var audioCodec: MediaCodec? = null
    private var inputSurface: Surface? = null
    private var virtualDisplay: VirtualDisplay? = null
    private var videoDrainThread: Thread? = null
    private var audioThread: Thread? = null
    private var originalAudioJob: Job? = null

    fun start() {
        if (!running.compareAndSet(false, true)) return

        try {
            val target = OutputTarget.create(context)
            outputTarget = target
            muxer = target.createMuxer()

            val captureSize = captureSize(context)
            val videoEncoder = createVideoEncoder(captureSize)
            videoCodec = videoEncoder.codec
            inputSurface = videoEncoder.surface

            val audioEncoder = createAudioEncoder()
            audioCodec = audioEncoder

            mediaProjection.registerCallback(projectionCallback, Handler(Looper.getMainLooper()))
            virtualDisplay = mediaProjection.createVirtualDisplay(
                "ChuchotageDemoRecording",
                captureSize.width,
                captureSize.height,
                captureSize.densityDpi,
                DisplayManager.VIRTUAL_DISPLAY_FLAG_AUTO_MIRROR,
                videoEncoder.surface,
                null,
                null,
            )

            videoDrainThread = Thread({ drainVideo(videoEncoder.codec) }, "chuchotage-demo-video").also { it.start() }
            audioThread = Thread({ runAudioEncoder(audioEncoder) }, "chuchotage-demo-audio").also { it.start() }
            resumeOriginalAudioCapture()
        } catch (error: Throwable) {
            release(discardOutput = true)
            throw error
        }
    }

    fun activeMediaProjection(): MediaProjection? {
        return if (running.get() && !stopping.get()) mediaProjection else null
    }

    fun stop() {
        if (!stopping.compareAndSet(false, true)) return
        running.set(false)

        Thread({
            var savedUri: Uri? = null
            try {
                runBlocking { pauseOriginalAudioCapture() }
                runCatching { videoCodec?.signalEndOfInputStream() }
                videoDrainThread?.join(STOP_JOIN_TIMEOUT_MS)
                audioThread?.join(STOP_JOIN_TIMEOUT_MS)
                savedUri = release(discardOutput = false)
                onSaved(savedUri)
            } catch (error: Throwable) {
                release(discardOutput = true)
                onError(error.message ?: "Demo recording failed.")
            } finally {
                DemoRecordingController.clearRecorder(this)
            }
        }, "chuchotage-demo-stop").start()
    }

    suspend fun pauseOriginalAudioCapture() {
        val job = synchronized(originalAudioLock) {
            originalAudioJob.also {
                originalAudioJob = null
            }
        }
        job?.cancelAndJoin()
    }

    fun resumeOriginalAudioCapture() {
        synchronized(originalAudioLock) {
            if (!running.get() || stopping.get() || originalAudioJob != null) return

            val job = originalAudioScope.launch {
                val activeJob = coroutineContext[Job]
                try {
                    originalAudioRecorder.capture { pcm24Khz ->
                        recordInputPcm(pcm24Khz)
                    }
                } catch (cancellation: CancellationException) {
                    throw cancellation
                } catch (error: Throwable) {
                    if (running.get() && !stopping.get()) {
                        fail("Demo original audio capture failed: ${error.message ?: "unknown error"}")
                    }
                } finally {
                    synchronized(originalAudioLock) {
                        if (originalAudioJob === activeJob) {
                            originalAudioJob = null
                        }
                    }
                }
            }
            originalAudioJob = job
        }
    }

    fun recordInputPcm(pcm24Khz: ByteArray) {
        if (running.get()) {
            audioMixer.enqueueInput(pcm24Khz)
        }
    }

    private fun fail(message: String) {
        if (!stopping.compareAndSet(false, true)) return
        running.set(false)

        Thread({
            try {
                runBlocking { pauseOriginalAudioCapture() }
                runCatching { videoCodec?.signalEndOfInputStream() }
                videoDrainThread?.join(STOP_JOIN_TIMEOUT_MS)
                audioThread?.join(STOP_JOIN_TIMEOUT_MS)
                release(discardOutput = true)
                onError(message)
            } catch (error: Throwable) {
                release(discardOutput = true)
                onError(error.message ?: message)
            } finally {
                DemoRecordingController.clearRecorder(this)
            }
        }, "chuchotage-demo-fail").start()
    }

    fun recordOutputPcm(pcm24Khz: ByteArray) {
        if (running.get()) {
            audioMixer.enqueueOutput(pcm24Khz)
        }
    }

    private fun drainVideo(codec: MediaCodec) {
        drainCodec(
            codec = codec,
            onOutputFormat = { format ->
                muxerGate.setVideoTrack(muxer ?: return@drainCodec, format)
            },
            trackProvider = { muxerGate.videoTrack },
        )
    }

    private fun runAudioEncoder(codec: MediaCodec) {
        var presentationTimeUs = 0L
        val frameBytes = AUDIO_FRAME_BYTES
        val frameDurationUs = (AUDIO_FRAME_SAMPLES * 1_000_000L) / DemoAudioMixer.SAMPLE_RATE
        var nextFrameAtNs = System.nanoTime()
        fun drainAudioOnce(): Boolean {
            return drainCodecOnce(
                codec = codec,
                onOutputFormat = { format ->
                    muxerGate.setAudioTrack(muxer ?: return@drainCodecOnce, format)
                },
                trackProvider = { muxerGate.audioTrack },
            )
        }

        while (running.get()) {
            val inputIndex = codec.dequeueInputBuffer(CODEC_TIMEOUT_US)
            if (inputIndex >= 0) {
                val inputBuffer = codec.getInputBuffer(inputIndex)
                val pcm = audioMixer.mixFrame(frameBytes)
                inputBuffer?.clear()
                inputBuffer?.put(pcm)
                codec.queueInputBuffer(inputIndex, 0, pcm.size, presentationTimeUs, 0)
                presentationTimeUs += frameDurationUs
            }

            drainAudioOnce()

            nextFrameAtNs += frameDurationUs * 1_000L
            val sleepMs = ((nextFrameAtNs - System.nanoTime()) / 1_000_000L).coerceAtLeast(0L)
            if (sleepMs > 0) {
                Thread.sleep(sleepMs.coerceAtMost(25L))
            }
        }

        val queueDeadlineNs = System.nanoTime() + AUDIO_STOP_DRAIN_TIMEOUT_MS * 1_000_000L
        var queuedEndOfStream = false
        while (!queuedEndOfStream && System.nanoTime() < queueDeadlineNs) {
            val inputIndex = codec.dequeueInputBuffer(CODEC_TIMEOUT_US)
            if (inputIndex >= 0) {
                codec.queueInputBuffer(
                    inputIndex,
                    0,
                    0,
                    presentationTimeUs,
                    MediaCodec.BUFFER_FLAG_END_OF_STREAM,
                )
                queuedEndOfStream = true
            } else {
                drainAudioOnce()
            }
        }
        if (!queuedEndOfStream) return

        val drainDeadlineNs = System.nanoTime() + AUDIO_STOP_DRAIN_TIMEOUT_MS * 1_000_000L
        var sawEndOfStream = false
        while (!sawEndOfStream && System.nanoTime() < drainDeadlineNs) {
            sawEndOfStream = drainAudioOnce()
        }
    }

    private fun drainCodec(
        codec: MediaCodec,
        onOutputFormat: (MediaFormat) -> Unit,
        trackProvider: () -> Int,
    ) {
        var sawEndOfStream = false
        while (!sawEndOfStream) {
            sawEndOfStream = drainCodecOnce(codec, onOutputFormat, trackProvider)
        }
    }

    private fun drainCodecOnce(
        codec: MediaCodec,
        onOutputFormat: (MediaFormat) -> Unit,
        trackProvider: () -> Int,
    ): Boolean {
        val bufferInfo = MediaCodec.BufferInfo()
        return when (val outputIndex = codec.dequeueOutputBuffer(bufferInfo, CODEC_TIMEOUT_US)) {
            MediaCodec.INFO_TRY_AGAIN_LATER -> false
            MediaCodec.INFO_OUTPUT_FORMAT_CHANGED -> {
                onOutputFormat(codec.outputFormat)
                false
            }
            else -> {
                if (outputIndex >= 0) {
                    val encodedData = codec.getOutputBuffer(outputIndex)
                    if (bufferInfo.flags and MediaCodec.BUFFER_FLAG_CODEC_CONFIG != 0) {
                        bufferInfo.size = 0
                    }
                    if (encodedData != null && bufferInfo.size > 0) {
                        encodedData.position(bufferInfo.offset)
                        encodedData.limit(bufferInfo.offset + bufferInfo.size)
                        muxerGate.writeSampleData(
                            trackIndex = trackProvider(),
                            encodedData = encodedData,
                            bufferInfo = bufferInfo,
                        )
                    }
                    val sawEndOfStream = bufferInfo.flags and MediaCodec.BUFFER_FLAG_END_OF_STREAM != 0
                    codec.releaseOutputBuffer(outputIndex, false)
                    sawEndOfStream
                } else {
                    false
                }
            }
        }
    }

    private fun release(discardOutput: Boolean): Uri? {
        running.set(false)
        originalAudioScope.cancel()
        runCatching { virtualDisplay?.release() }
        virtualDisplay = null
        runCatching { mediaProjection.unregisterCallback(projectionCallback) }
        runCatching { mediaProjection.stop() }
        runCatching { inputSurface?.release() }
        inputSurface = null
        runCatching { videoCodec?.stop() }
        runCatching { videoCodec?.release() }
        videoCodec = null
        runCatching { audioCodec?.stop() }
        runCatching { audioCodec?.release() }
        audioCodec = null
        val muxerStopFailure = runCatching {
            if (muxerGate.started) {
                muxer?.stop()
            }
        }.exceptionOrNull()
        runCatching { muxer?.release() }
        muxer = null
        audioMixer.clear()
        val shouldDiscardOutput = discardOutput || muxerStopFailure != null || !muxerGate.started
        val savedUri = outputTarget?.finish(context, shouldDiscardOutput).also {
            outputTarget = null
        }
        if (!discardOutput) {
            muxerStopFailure?.let { throw it }
            check(muxerGate.started) { "Demo recording did not produce media samples." }
        }
        return savedUri
    }

    private class MuxerGate {
        var videoTrack: Int = NO_TRACK
            private set
        var audioTrack: Int = NO_TRACK
            private set
        var started: Boolean = false
            private set

        @Synchronized
        fun setVideoTrack(muxer: MediaMuxer, format: MediaFormat) {
            if (videoTrack != NO_TRACK) return
            videoTrack = muxer.addTrack(format)
            startIfReady(muxer)
        }

        @Synchronized
        fun setAudioTrack(muxer: MediaMuxer, format: MediaFormat) {
            if (audioTrack != NO_TRACK) return
            audioTrack = muxer.addTrack(format)
            startIfReady(muxer)
        }

        @Synchronized
        fun writeSampleData(
            trackIndex: Int,
            encodedData: java.nio.ByteBuffer,
            bufferInfo: MediaCodec.BufferInfo,
        ) {
            if (!started || trackIndex == NO_TRACK) return
            val normalizedBufferInfo = normalizedBufferInfo(trackIndex, bufferInfo) ?: return
            muxer?.writeSampleData(trackIndex, encodedData, normalizedBufferInfo)
        }

        private var muxer: MediaMuxer? = null
        private val videoTimestampNormalizer = DemoTrackTimestampNormalizer()
        private val audioTimestampNormalizer = DemoTrackTimestampNormalizer()

        private fun startIfReady(muxer: MediaMuxer) {
            if (!started && videoTrack != NO_TRACK && audioTrack != NO_TRACK) {
                muxer.start()
                this.muxer = muxer
                started = true
            }
        }

        private fun normalizedBufferInfo(
            trackIndex: Int,
            bufferInfo: MediaCodec.BufferInfo,
        ): MediaCodec.BufferInfo? {
            val timestampNormalizer = when (trackIndex) {
                videoTrack -> videoTimestampNormalizer
                audioTrack -> audioTimestampNormalizer
                else -> return null
            }
            return MediaCodec.BufferInfo().apply {
                set(
                    bufferInfo.offset,
                    bufferInfo.size,
                    timestampNormalizer.normalize(bufferInfo.presentationTimeUs),
                    bufferInfo.flags,
                )
            }
        }
    }

    data class VideoEncoder(
        val codec: MediaCodec,
        val surface: Surface,
    )

    data class CaptureSize(
        val width: Int,
        val height: Int,
        val densityDpi: Int,
    )

    private class OutputTarget private constructor(
        private val uri: Uri?,
        private val file: File?,
        private val descriptor: ParcelFileDescriptor?,
    ) {
        fun createMuxer(): MediaMuxer {
            return if (descriptor != null) {
                MediaMuxer(descriptor.fileDescriptor, MediaMuxer.OutputFormat.MUXER_OUTPUT_MPEG_4)
            } else {
                MediaMuxer(requireNotNull(file).absolutePath, MediaMuxer.OutputFormat.MUXER_OUTPUT_MPEG_4)
            }
        }

        fun finish(context: Context, discardOutput: Boolean): Uri? {
            runCatching { descriptor?.close() }
            val outputUri = uri
            return if (outputUri != null) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    val values = ContentValues().apply {
                        put(MediaStore.Video.Media.IS_PENDING, 0)
                    }
                    runCatching { context.contentResolver.update(outputUri, values, null, null) }
                }
                if (discardOutput) {
                    runCatching { context.contentResolver.delete(outputUri, null, null) }
                    null
                } else {
                    outputUri
                }
            } else {
                if (discardOutput) {
                    runCatching { file?.delete() }
                    null
                } else {
                    file?.let {
                        android.media.MediaScannerConnection.scanFile(
                            context,
                            arrayOf(it.absolutePath),
                            arrayOf("video/mp4"),
                            null,
                        )
                        FileProvider.getUriForFile(context, "${context.packageName}.fileprovider", it)
                    }
                }
            }
        }

        companion object {
            fun create(context: Context): OutputTarget {
                val displayName = "Chuchotage demo ${timestamp()}.mp4"
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    val values = ContentValues().apply {
                        put(MediaStore.Video.Media.DISPLAY_NAME, displayName)
                        put(MediaStore.Video.Media.MIME_TYPE, "video/mp4")
                        put(MediaStore.Video.Media.RELATIVE_PATH, "${Environment.DIRECTORY_MOVIES}/Chuchotage")
                        put(MediaStore.Video.Media.IS_PENDING, 1)
                    }
                    val uri = requireNotNull(
                        context.contentResolver.insert(MediaStore.Video.Media.EXTERNAL_CONTENT_URI, values),
                    ) {
                        "Could not create demo video."
                    }
                    val descriptor = requireNotNull(context.contentResolver.openFileDescriptor(uri, "w")) {
                        "Could not open demo video."
                    }
                    return OutputTarget(uri = uri, file = null, descriptor = descriptor)
                }

                val directory = File(
                    context.getExternalFilesDir(Environment.DIRECTORY_MOVIES),
                    "Chuchotage",
                )
                directory.mkdirs()
                return OutputTarget(
                    uri = null,
                    file = File(directory, displayName),
                    descriptor = null,
                )
            }

            private fun timestamp(): String {
                return SimpleDateFormat("yyyyMMdd-HHmmss", Locale.US).format(Date())
            }
        }
    }

    companion object {
        private const val NO_TRACK = -1
        private const val CODEC_TIMEOUT_US = 10_000L
        private const val STOP_JOIN_TIMEOUT_MS = 2_500L
        private const val AUDIO_STOP_DRAIN_TIMEOUT_MS = 2_000L
        private const val VIDEO_FRAME_RATE = 30
        private const val VIDEO_I_FRAME_INTERVAL_SECONDS = 2
        private const val VIDEO_BIT_RATE = 4_000_000
        private const val AUDIO_BIT_RATE = 64_000
        private const val AUDIO_FRAME_SAMPLES = 480
        private const val AUDIO_FRAME_BYTES = AUDIO_FRAME_SAMPLES * DemoAudioMixer.BYTES_PER_SAMPLE
    }
}

internal class DemoTrackTimestampNormalizer {
    private var firstPresentationTimeUs: Long? = null
    private var lastPresentationTimeUs: Long? = null

    fun normalize(presentationTimeUs: Long): Long {
        val firstTimeUs = firstPresentationTimeUs ?: presentationTimeUs.also {
            firstPresentationTimeUs = it
        }
        val zeroBasedTimeUs = (presentationTimeUs - firstTimeUs).coerceAtLeast(0L)
        val normalizedTimeUs = lastPresentationTimeUs?.let { previousTimeUs ->
            zeroBasedTimeUs.coerceAtLeast(previousTimeUs + 1L)
        } ?: zeroBasedTimeUs
        lastPresentationTimeUs = normalizedTimeUs
        return normalizedTimeUs
    }
}

private fun createVideoEncoder(captureSize: DemoMp4Recorder.CaptureSize): DemoMp4Recorder.VideoEncoder {
    val format = MediaFormat.createVideoFormat(
        MediaFormat.MIMETYPE_VIDEO_AVC,
        captureSize.width,
        captureSize.height,
    ).apply {
        setInteger(MediaFormat.KEY_COLOR_FORMAT, MediaCodecInfo.CodecCapabilities.COLOR_FormatSurface)
        setInteger(MediaFormat.KEY_BIT_RATE, 4_000_000)
        setInteger(MediaFormat.KEY_FRAME_RATE, 30)
        setInteger(MediaFormat.KEY_I_FRAME_INTERVAL, 2)
    }
    val codec = MediaCodec.createEncoderByType(MediaFormat.MIMETYPE_VIDEO_AVC)
    codec.configure(format, null, null, MediaCodec.CONFIGURE_FLAG_ENCODE)
    val surface = codec.createInputSurface()
    codec.start()
    return DemoMp4Recorder.VideoEncoder(codec = codec, surface = surface)
}

private fun createAudioEncoder(): MediaCodec {
    val format = MediaFormat.createAudioFormat(
        MediaFormat.MIMETYPE_AUDIO_AAC,
        DemoAudioMixer.SAMPLE_RATE,
        1,
    ).apply {
        setInteger(MediaFormat.KEY_AAC_PROFILE, MediaCodecInfo.CodecProfileLevel.AACObjectLC)
        setInteger(MediaFormat.KEY_BIT_RATE, 64_000)
    }
    return MediaCodec.createEncoderByType(MediaFormat.MIMETYPE_AUDIO_AAC).apply {
        configure(format, null, null, MediaCodec.CONFIGURE_FLAG_ENCODE)
        start()
    }
}

private fun captureSize(context: Context): DemoMp4Recorder.CaptureSize {
    val densityDpi = context.resources.configuration.densityDpi
    val windowManager = context.getSystemService(WindowManager::class.java)
    val bounds = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
        windowManager.maximumWindowMetrics.bounds
    } else {
        @Suppress("DEPRECATION")
        android.util.DisplayMetrics().also { metrics ->
            @Suppress("DEPRECATION")
            windowManager.defaultDisplay.getRealMetrics(metrics)
        }.let { android.graphics.Rect(0, 0, it.widthPixels, it.heightPixels) }
    }
    val sourceWidth = bounds.width().coerceAtLeast(2)
    val sourceHeight = bounds.height().coerceAtLeast(2)
    val longSide = maxOf(sourceWidth, sourceHeight)
    val scale = (1280f / longSide).coerceAtMost(1f)
    val width = (sourceWidth * scale).toInt().coerceAtLeast(2).makeEven()
    val height = (sourceHeight * scale).toInt().coerceAtLeast(2).makeEven()
    return DemoMp4Recorder.CaptureSize(width, height, densityDpi)
}

private fun Int.makeEven(): Int = if (this % 2 == 0) this else this - 1
