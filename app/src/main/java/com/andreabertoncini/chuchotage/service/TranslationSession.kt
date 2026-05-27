package com.andreabertoncini.chuchotage.service

import com.andreabertoncini.chuchotage.audio.PcmAudioCodec
import com.andreabertoncini.chuchotage.audio.PcmInputGain
import com.andreabertoncini.chuchotage.audio.PcmAudioPlayer
import com.andreabertoncini.chuchotage.audio.PcmAudioRecorder
import com.andreabertoncini.chuchotage.audio.PcmVolumeMeter
import com.andreabertoncini.chuchotage.network.OpenAiRequestHeaders
import com.andreabertoncini.chuchotage.network.RealtimeTranslationEvent
import com.andreabertoncini.chuchotage.network.RealtimeTranslationEventParser
import com.andreabertoncini.chuchotage.network.RealtimeTranslationSessionToken
import com.andreabertoncini.chuchotage.settings.TranslationLanguages
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import kotlinx.coroutines.withTimeout
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.Response
import okhttp3.WebSocket
import okhttp3.WebSocketListener
import org.json.JSONObject
import java.io.IOException
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicBoolean

class TranslationSession(
    private val bearerTokenProvider: suspend () -> RealtimeTranslationSessionToken,
    private val okHttpClient: OkHttpClient = OkHttpClient.Builder()
        .readTimeout(0, TimeUnit.MILLISECONDS)
        .build(),
    private val recorder: PcmAudioRecorder = PcmAudioRecorder(),
    private val player: PcmAudioPlayer = PcmAudioPlayer(),
    private val targetLanguageCode: String = TranslationLanguages.DEFAULT_TARGET_LANGUAGE_CODE,
    private val sourceTranscriptEnabled: Boolean = false,
    private val onInputVolume: (Float) -> Unit = {},
    private val onInputPcm: (ByteArray) -> Unit = {},
    private val onOutputPcm: (ByteArray) -> Unit = {},
    private val onInputTranscriptDelta: (String) -> Unit = {},
    private val onOutputTranscriptDelta: (String) -> Unit = {},
    private val onFatalError: (String) -> Unit,
) {
    private val running = AtomicBoolean(false)
    private var webSocket: WebSocket? = null
    private var captureJob: Job? = null
    private val latestInputTranscript = StringBuilder()
    private val latestOutputTranscript = StringBuilder()

    suspend fun start(scope: CoroutineScope) = withContext(Dispatchers.IO) {
        if (!running.compareAndSet(false, true)) return@withContext

        try {
            val bearerToken = bearerTokenProvider()
            val opened = CompletableDeferred<Unit>()
            val listener = createWebSocketListener(
                opened = opened,
                shouldSendSessionUpdate = bearerToken.shouldSendSessionUpdate,
            )
            val request = Request.Builder()
                .url(TRANSLATION_WEBSOCKET_URL)
                .addHeader("Authorization", "Bearer ${bearerToken.value}")
                .addHeader("User-Agent", OpenAiRequestHeaders.userAgent)
                .build()

            webSocket = okHttpClient.newWebSocket(request, listener)
            withTimeout(OPEN_TIMEOUT_MS) { opened.await() }

            player.start()
            captureJob = scope.launch(Dispatchers.IO) {
                try {
                    recorder.capture { pcm24Khz ->
                        val socket = webSocket
                        if (running.get() && socket != null) {
                            val uplinkPcm = PcmInputGain.liftQuietSpeech(pcm24Khz)
                            onInputVolume(PcmVolumeMeter.level(uplinkPcm))
                            onInputPcm(pcm24Khz)
                            socket.send(inputAudioAppendEvent(uplinkPcm))
                        }
                    }
                } catch (error: CancellationException) {
                    throw error
                } catch (error: Throwable) {
                    fail(error.message ?: "Microphone capture failed.")
                }
            }
        } catch (error: Throwable) {
            stop()
            throw error
        }
    }

    fun stop() {
        if (!running.getAndSet(false)) {
            player.stop()
            return
        }

        captureJob?.cancel()
        captureJob = null
        webSocket?.close(NORMAL_CLOSE_STATUS, "Stopped")
        webSocket = null
        player.stop()
    }

    private fun createWebSocketListener(
        opened: CompletableDeferred<Unit>,
        shouldSendSessionUpdate: Boolean,
    ): WebSocketListener {
        return object : WebSocketListener() {
            override fun onOpen(webSocket: WebSocket, response: Response) {
                if (shouldSendSessionUpdate) {
                    val sent = webSocket.send(
                        buildSessionUpdateEvent(
                            targetLanguageCode = targetLanguageCode,
                            sourceTranscriptEnabled = sourceTranscriptEnabled,
                        ),
                    )
                    if (!sent) {
                        opened.completeExceptionally(IOException("Could not configure translation session."))
                    }
                } else {
                    opened.complete(Unit)
                }
            }

            override fun onMessage(webSocket: WebSocket, text: String) {
                when (val event = RealtimeTranslationEventParser.parse(text)) {
                    is RealtimeTranslationEvent.OutputAudio -> playOutputAudio(event.base64Audio)
                    is RealtimeTranslationEvent.InputTranscriptDelta -> {
                        appendLatest(latestInputTranscript, event.text)
                        onInputTranscriptDelta(event.text)
                    }
                    is RealtimeTranslationEvent.OutputTranscriptDelta -> {
                        appendLatest(latestOutputTranscript, event.text)
                        onOutputTranscriptDelta(event.text)
                    }
                    is RealtimeTranslationEvent.Error -> {
                        if (!opened.isCompleted) {
                            opened.completeExceptionally(IllegalStateException(event.message))
                        }
                        fail(event.message)
                    }
                    RealtimeTranslationEvent.SessionUpdated -> opened.complete(Unit)
                    RealtimeTranslationEvent.Ignored -> Unit
                }
            }

            override fun onClosed(webSocket: WebSocket, code: Int, reason: String) {
                if (running.get()) {
                    fail(reason.ifBlank { "Realtime translation socket closed." })
                }
            }

            override fun onFailure(webSocket: WebSocket, t: Throwable, response: Response?) {
                if (!opened.isCompleted) {
                    opened.completeExceptionally(t)
                }
                if (running.get()) {
                    fail(t.message ?: "Realtime translation socket failed.")
                }
            }
        }
    }

    private fun fail(message: String) {
        if (running.getAndSet(false)) {
            captureJob?.cancel()
            captureJob = null
            webSocket?.cancel()
            webSocket = null
            player.stop()
            onFatalError(message)
        }
    }

    private fun appendLatest(builder: StringBuilder, delta: String) {
        builder.append(delta)
        if (builder.length > MAX_TRANSCRIPT_CHARS) {
            builder.delete(0, builder.length - MAX_TRANSCRIPT_CHARS)
        }
    }

    private fun playOutputAudio(base64Audio: String) {
        val pcm = runCatching { PcmAudioCodec.decodeBase64Pcm16(base64Audio) }.getOrNull() ?: return
        onOutputPcm(pcm)
        player.playPcm(pcm)
    }

    private fun inputAudioAppendEvent(pcm24Khz: ByteArray): String {
        return JSONObject()
            .put("type", "session.input_audio_buffer.append")
            .put("audio", PcmAudioCodec.encodeBase64Pcm16(pcm24Khz))
            .toString()
    }

    companion object {
        const val TRANSLATION_WEBSOCKET_URL =
            "wss://api.openai.com/v1/realtime/translations?model=gpt-realtime-translate"
        private const val OPEN_TIMEOUT_MS = 15_000L
        private const val NORMAL_CLOSE_STATUS = 1000
        private const val MAX_TRANSCRIPT_CHARS = 8_192
    }
}

internal fun buildSessionUpdateEvent(
    targetLanguageCode: String,
    sourceTranscriptEnabled: Boolean = false,
): String {
    return JSONObject()
        .put("type", "session.update")
        .put(
            "session",
            JSONObject()
                .put(
                    "audio",
                    JSONObject()
                        .put(
                            "input",
                            inputAudioConfig(sourceTranscriptEnabled),
                        )
                        .put(
                            "output",
                            JSONObject().put(
                                "language",
                                TranslationLanguages.sanitizeOutputLanguageCode(targetLanguageCode),
                            ),
                        ),
                ),
        )
        .toString()
}

private fun inputAudioConfig(sourceTranscriptEnabled: Boolean): JSONObject {
    return JSONObject()
        .apply {
            if (sourceTranscriptEnabled) {
                put(
                    "transcription",
                    JSONObject().put("model", "gpt-realtime-whisper"),
                )
            }
        }
        .put("noise_reduction", JSONObject.NULL)
}
