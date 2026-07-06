package com.andreabertoncini.chuchotage.service

import com.andreabertoncini.chuchotage.audio.PcmAudioCodec
import com.andreabertoncini.chuchotage.audio.PcmInputGain
import com.andreabertoncini.chuchotage.audio.PcmAudioPlayer
import com.andreabertoncini.chuchotage.audio.PcmAudioRecorder
import com.andreabertoncini.chuchotage.audio.PcmVolumeMeter
import com.andreabertoncini.chuchotage.network.OpenAiRequestHeaders
import com.andreabertoncini.chuchotage.network.OpenAiCredentialKind
import com.andreabertoncini.chuchotage.network.RealtimeTranslationEvent
import com.andreabertoncini.chuchotage.network.RealtimeTranslationEventParser
import com.andreabertoncini.chuchotage.network.RealtimeTranslationSessionToken
import com.andreabertoncini.chuchotage.settings.TranslationLanguages
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.TimeoutCancellationException
import kotlinx.coroutines.delay
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
import java.net.SocketTimeoutException
import java.net.UnknownHostException
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
            openWebSocketWithRetry(bearerToken)

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

    private suspend fun openWebSocketWithRetry(bearerToken: RealtimeTranslationSessionToken) {
        repeat(OPEN_RETRY_DELAYS_MS.size + 1) { attempt ->
            val opened = CompletableDeferred<Unit>()
            val listener = createWebSocketListener(
                opened = opened,
                shouldSendSessionUpdate = bearerToken.shouldSendSessionUpdate,
                credentialKind = bearerToken.credentialKind,
            )
            val request = Request.Builder()
                .url(TRANSLATION_WEBSOCKET_URL)
                .addHeader("Authorization", "Bearer ${bearerToken.value}")
                .addHeader("User-Agent", OpenAiRequestHeaders.userAgent)
                .build()
            val socket = okHttpClient.newWebSocket(request, listener)
            webSocket = socket

            try {
                withTimeout(OPEN_TIMEOUT_MS) { opened.await() }
                return
            } catch (error: Throwable) {
                if (error is CancellationException && error !is TimeoutCancellationException) {
                    throw error
                }

                socket.cancel()
                if (webSocket == socket) {
                    webSocket = null
                }

                val openFailure = when (error) {
                    is RealtimeSocketOpenException -> error
                    is TimeoutCancellationException -> RealtimeSocketOpenException(
                        message = "Could not connect to OpenAI Realtime. Check the phone's network and try again.",
                        retryable = false,
                        cause = error,
                    )
                    else -> RealtimeSocketOpenException(
                        message = realtimeSocketFailureMessage(
                            throwable = error,
                            credentialKind = bearerToken.credentialKind,
                        ),
                        retryable = isRetryableRealtimeSocketOpenFailure(error),
                        cause = error,
                    )
                }
                if (!openFailure.retryable || attempt == OPEN_RETRY_DELAYS_MS.size || !running.get()) {
                    throw openFailure
                }
                delay(OPEN_RETRY_DELAYS_MS[attempt])
            }
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
        credentialKind: OpenAiCredentialKind,
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
                            opened.completeExceptionally(
                                RealtimeSocketOpenException(
                                    message = event.message,
                                    retryable = false,
                                ),
                            )
                            return
                        }
                        fail(event.message)
                    }
                    RealtimeTranslationEvent.SessionUpdated -> opened.complete(Unit)
                    RealtimeTranslationEvent.Ignored -> Unit
                }
            }

            override fun onClosed(webSocket: WebSocket, code: Int, reason: String) {
                val message = reason.ifBlank { "Realtime translation socket closed." }
                if (!opened.isCompleted) {
                    opened.completeExceptionally(
                        RealtimeSocketOpenException(
                            message = message,
                            retryable = false,
                        ),
                    )
                    return
                }
                if (running.get()) {
                    fail(message)
                }
            }

            override fun onFailure(webSocket: WebSocket, t: Throwable, response: Response?) {
                val failure = RealtimeSocketOpenException(
                    message = realtimeSocketFailureMessage(t, response?.code, credentialKind),
                    retryable = isRetryableRealtimeSocketOpenFailure(t, response?.code),
                    cause = t,
                )
                if (!opened.isCompleted) {
                    opened.completeExceptionally(failure)
                    return
                }
                if (running.get()) {
                    fail(failure.message ?: "Realtime translation socket failed.")
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
        private val OPEN_RETRY_DELAYS_MS = longArrayOf(300, 900)
        private const val NORMAL_CLOSE_STATUS = 1000
        private const val MAX_TRANSCRIPT_CHARS = 8_192
    }
}

private class RealtimeSocketOpenException(
    override val message: String,
    val retryable: Boolean,
    cause: Throwable? = null,
) : IOException(message, cause)

internal fun realtimeSocketFailureMessage(
    throwable: Throwable,
    responseCode: Int? = null,
    credentialKind: OpenAiCredentialKind? = null,
): String {
    return when {
        responseCode == 401 || responseCode == 403 ->
            "OpenAI rejected the saved login. Check your API key or sign in again."
        responseCode == 429 ->
            "OpenAI Realtime is rate-limited right now. Try again in a minute."
        responseCode != null && responseCode in 500..599 -> when (credentialKind) {
            OpenAiCredentialKind.CHATGPT_ACCESS_TOKEN ->
                "OpenAI is rejecting ChatGPT sign-in translation sessions right now. Restart Chuchotage and try again."
            OpenAiCredentialKind.SPONSORED_TRIAL ->
                "Chuchotage translation access is unavailable right now. Try again in a moment."
            OpenAiCredentialKind.API_KEY, null ->
                "OpenAI Realtime is unavailable right now. Try again in a moment."
        }
        responseCode != null ->
            "Could not connect to OpenAI Realtime (HTTP $responseCode)."
        throwable is UnknownHostException ->
            "Could not resolve api.openai.com. Check the phone's VPN, private DNS, or network and try again."
        throwable is SocketTimeoutException ->
            "Could not reach api.openai.com. Check the phone's network and try again."
        throwable.message?.startsWith("Expected HTTP 101 response", ignoreCase = true) == true ->
            "Could not connect to OpenAI Realtime. Try again in a moment."
        else ->
            throwable.message?.takeIf { it.isNotBlank() } ?: "Realtime translation socket failed."
    }
}

private fun isRetryableRealtimeSocketOpenFailure(
    throwable: Throwable,
    responseCode: Int? = null,
): Boolean {
    return responseCode == 429 ||
        (responseCode != null && responseCode in 500..599) ||
        throwable is SocketTimeoutException
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
