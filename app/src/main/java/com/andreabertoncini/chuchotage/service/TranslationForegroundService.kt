package com.andreabertoncini.chuchotage.service

import android.annotation.SuppressLint
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Intent
import android.content.pm.ServiceInfo
import android.media.AudioDeviceCallback
import android.media.AudioDeviceInfo
import android.media.AudioManager
import android.media.projection.MediaProjection
import android.media.projection.MediaProjectionManager
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.app.ServiceCompat
import com.andreabertoncini.chuchotage.MainActivity
import com.andreabertoncini.chuchotage.R
import com.andreabertoncini.chuchotage.TranslationActions
import com.andreabertoncini.chuchotage.audio.AudioDevices
import com.andreabertoncini.chuchotage.audio.PcmAudioPlayer
import com.andreabertoncini.chuchotage.audio.PcmAudioRecorder
import com.andreabertoncini.chuchotage.demo.DemoRecordingController
import com.andreabertoncini.chuchotage.network.TranslationAuthRepository
import com.andreabertoncini.chuchotage.settings.AudioInputSource
import com.andreabertoncini.chuchotage.settings.TranslationLanguages
import com.andreabertoncini.chuchotage.settings.TranslationSettingsStore
import com.andreabertoncini.chuchotage.settings.audioFeedbackWarningMessage
import com.andreabertoncini.chuchotage.settings.displayName
import com.andreabertoncini.chuchotage.settings.shouldRequestFocusBackground
import com.andreabertoncini.chuchotage.settings.shouldRequestOriginalAudioDucking
import com.andreabertoncini.chuchotage.state.TranslationController
import com.andreabertoncini.chuchotage.state.TranslationState
import com.andreabertoncini.chuchotage.state.localizedStatusText
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch

class TranslationForegroundService : Service() {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)
    private var session: TranslationSession? = null
    private var startJob: Job? = null
    private var activeMediaProjection: MediaProjection? = null
    private var activeMediaProjectionCallback: MediaProjection.Callback? = null
    private var activeMediaProjectionOwned = false
    private var activeTargetLanguageCode: String? = null
    private var headsetAutoStartWaiting = false
    private var headsetAutoStartDeviceCallback: AudioDeviceCallback? = null

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            TranslationActions.ACTION_ARM_HEADSET_AUTO_START -> armHeadsetAutoStart()
            TranslationActions.ACTION_DISARM_HEADSET_AUTO_START -> stopHeadsetAutoStartWaiting(disableSetting = false)
            TranslationActions.ACTION_STOP -> stopTranslation()
            TranslationActions.ACTION_RESTART -> restartTranslation(intent)
            TranslationActions.ACTION_TOGGLE -> {
                if (headsetAutoStartWaiting || TranslationController.state.value.isRunning || hasLiveTranslation()) {
                    stopTranslation()
                } else {
                    startTranslation(intent)
                }
            }
            null -> {
                if (shouldArmHeadsetAutoStartFromSettings()) {
                    armHeadsetAutoStart()
                } else {
                    startTranslation(intent)
                }
            }
            else -> startTranslation(intent)
        }
        return if (headsetAutoStartWaiting) START_STICKY else START_NOT_STICKY
    }

    override fun onDestroy() {
        val hadLiveTranslation = hasLiveTranslation()
        unregisterHeadsetAutoStartCallback()
        headsetAutoStartWaiting = false
        session?.stop()
        session = null
        activeTargetLanguageCode = null
        releaseActiveMediaProjection()
        DemoRecordingController.resumeOriginalAudioCaptureAfterTranslation()
        startJob?.cancel()
        startJob = null
        if (TranslationController.state.value.isRunning || hadLiveTranslation) {
            ServiceCompat.stopForeground(this, ServiceCompat.STOP_FOREGROUND_REMOVE)
            TranslationController.update(this, TranslationState.Idle)
        }
        scope.cancel()
        super.onDestroy()
    }

    private fun startTranslation(intent: Intent?) {
        if (hasLiveTranslation()) {
            syncControllerWithLiveTranslation()
            return
        }

        unregisterHeadsetAutoStartCallback()
        headsetAutoStartWaiting = false

        val authRepository = TranslationAuthRepository(this)
        if (!authRepository.hasProvider()) {
            TranslationController.update(this, TranslationState.Error("OpenAI login missing."))
            stopSelf()
            return
        }

        if (!TranslationController.hasStartPermissions(this)) {
            TranslationController.update(this, TranslationState.Error(TranslationController.startPermissionErrorMessage(this)))
            stopSelf()
            return
        }

        val settings = TranslationSettingsStore(this).read()
        val sessionTargetLanguageCode = intent?.getStringExtra(EXTRA_TARGET_LANGUAGE_CODE)
            ?.let(TranslationLanguages::sanitizeOutputLanguageCode)
            ?: settings.targetLanguageCode
        val sessionSourceTranscriptEnabled = if (intent?.hasExtra(EXTRA_SOURCE_TRANSCRIPT_ENABLED) == true) {
            intent.getBooleanExtra(EXTRA_SOURCE_TRANSCRIPT_ENABLED, settings.sourceTranscriptEnabled)
        } else {
            settings.sourceTranscriptEnabled
        }
        val audioFeedbackWarning = settings.audioFeedbackWarningMessage()
        if (audioFeedbackWarning != null &&
            intent?.getBooleanExtra(EXTRA_ALLOW_AUDIO_FEEDBACK_RISK, false) != true
        ) {
            TranslationController.update(this, TranslationState.Error(audioFeedbackWarning))
            stopSelf()
            return
        }

        val mediaProjectionResultCode = intent?.getIntExtra(EXTRA_MEDIA_PROJECTION_RESULT_CODE, 0) ?: 0
        val mediaProjectionResultData = intent?.projectionResultData()
        val useActiveDemoMediaProjection =
            intent?.getBooleanExtra(EXTRA_USE_ACTIVE_DEMO_MEDIA_PROJECTION, false) == true
        if (settings.audioInputSource == AudioInputSource.DeviceAudio) {
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
                TranslationController.update(this, TranslationState.Error("Device audio capture requires Android 10 or newer."))
                stopSelf()
                return
            }
            if (!useActiveDemoMediaProjection && (mediaProjectionResultCode == 0 || mediaProjectionResultData == null)) {
                TranslationController.update(this, TranslationState.Error("Allow device audio capture to start."))
                stopSelf()
                return
            }
        }

        TranslationController.clearTranscript()
        TranslationController.update(this, TranslationState.Connecting)
        activeTargetLanguageCode = sessionTargetLanguageCode
        ServiceCompat.startForeground(
            this,
            TranslationActions.NOTIFICATION_ID,
            buildNotification(TranslationState.Connecting),
            foregroundServiceType(settings.audioInputSource),
        )

        startJob = scope.launch {
            val mediaProjection = if (settings.audioInputSource == AudioInputSource.DeviceAudio) {
                if (useActiveDemoMediaProjection) {
                    val projection = DemoRecordingController.activeMediaProjectionForTranslation()
                        ?: error("Demo recording capture is unavailable.")
                    projection.also { attachActiveMediaProjection(it, owned = false) }
                } else {
                    val projectionManager = getSystemService(MediaProjectionManager::class.java)
                    val projection = projectionManager.getMediaProjection(mediaProjectionResultCode, mediaProjectionResultData!!)
                        ?: error("Allow device audio capture to start.")
                    projection.also { attachActiveMediaProjection(it, owned = true) }
                }
            } else {
                null
            }
            val audioManager = getSystemService(AudioManager::class.java)
            val tokenProvider = authRepository.activeProvider() ?: error("OpenAI login missing.")
            val newSession = TranslationSession(
                bearerTokenProvider = {
                    tokenProvider.sessionToken(
                        targetLanguageCode = sessionTargetLanguageCode,
                        sourceTranscriptEnabled = sessionSourceTranscriptEnabled,
                    )
                },
                recorder = PcmAudioRecorder(
                    audioInputSource = settings.audioInputSource,
                    audioManager = audioManager,
                    context = this@TranslationForegroundService,
                    mediaProjection = mediaProjection,
                ),
                player = PcmAudioPlayer(
                    audioOutputRoute = settings.audioOutputRoute,
                    audioManager = audioManager,
                    originalAudioDuckingEnabled = settings.shouldRequestOriginalAudioDucking(),
                    focusBackgroundEnabled = settings.shouldRequestFocusBackground(),
                ),
                targetLanguageCode = sessionTargetLanguageCode,
                sourceTranscriptEnabled = sessionSourceTranscriptEnabled,
                onInputVolume = TranslationController::updateInputVolume,
                onInputPcm = DemoRecordingController::recordInputPcm,
                onOutputPcm = DemoRecordingController::recordOutputPcm,
                onInputTranscriptDelta = { delta ->
                    DemoRecordingController.appendInputTranscript(delta)
                    TranslationController.appendInputTranscript(delta)
                },
                onOutputTranscriptDelta = { delta ->
                    DemoRecordingController.appendOutputTranscript(delta)
                    TranslationController.appendOutputTranscript(delta)
                },
                onFatalError = { message ->
                    scope.launch { handleFailure(message) }
                },
            )
            session = newSession

            try {
                DemoRecordingController.pauseOriginalAudioCaptureForTranslation()
                newSession.start(scope)
                TranslationController.update(this@TranslationForegroundService, TranslationState.Active)
                refreshNotification()
            } catch (error: CancellationException) {
                throw error
            } catch (error: Throwable) {
                handleFailure(error.message ?: "Translation failed.")
            }
        }
    }

    private fun armHeadsetAutoStart() {
        if (hasLiveTranslation()) {
            syncControllerWithLiveTranslation()
            return
        }

        val settings = TranslationSettingsStore(this).read()
        if (!settings.headsetAutoStartEnabled || settings.audioInputSource != AudioInputSource.Headset) {
            stopHeadsetAutoStartWaiting(disableSetting = false)
            return
        }

        val authRepository = TranslationAuthRepository(this)
        if (!authRepository.hasProvider()) {
            TranslationController.update(this, TranslationState.Error("OpenAI login missing."))
            stopSelf()
            return
        }

        if (!TranslationController.hasStartPermissions(this)) {
            TranslationController.update(this, TranslationState.Error(TranslationController.startPermissionErrorMessage(this)))
            stopSelf()
            return
        }

        val audioFeedbackWarning = settings.audioFeedbackWarningMessage()
        if (audioFeedbackWarning != null) {
            TranslationController.update(this, TranslationState.Error(audioFeedbackWarning))
            stopSelf()
            return
        }

        headsetAutoStartWaiting = true
        TranslationController.clearTranscript()
        TranslationController.update(this, TranslationState.WaitingForHeadset)
        ServiceCompat.startForeground(
            this,
            TranslationActions.NOTIFICATION_ID,
            buildNotification(TranslationState.WaitingForHeadset),
            foregroundServiceType(AudioInputSource.Headset),
        )

        registerHeadsetAutoStartCallback()
        startHeadsetAutoStartIfReady()
    }

    private fun restartTranslation(intent: Intent?) {
        if (TranslationController.state.value !is TranslationState.Idle || session != null || startJob?.isActive == true) {
            TranslationController.update(this, TranslationState.Stopping)
            refreshNotification()
            startJob?.cancel()
            startJob = null
            session?.stop()
            session = null
            activeTargetLanguageCode = null
            releaseActiveMediaProjection()
            unregisterHeadsetAutoStartCallback()
            headsetAutoStartWaiting = false
        }
        startTranslation(intent)
    }

    private fun stopTranslation() {
        if (headsetAutoStartWaiting && !hasLiveTranslation()) {
            stopHeadsetAutoStartWaiting(disableSetting = true)
            return
        }

        if (TranslationController.state.value is TranslationState.Idle && !hasLiveTranslation()) {
            stopSelf()
            return
        }

        TranslationController.update(this, TranslationState.Stopping)
        refreshNotification()
        startJob?.cancel()
        startJob = null
        session?.stop()
        session = null
        activeTargetLanguageCode = null
        releaseActiveMediaProjection()
        ServiceCompat.stopForeground(this, ServiceCompat.STOP_FOREGROUND_REMOVE)
        TranslationController.update(this, TranslationState.Idle)
        DemoRecordingController.resumeOriginalAudioCaptureAfterTranslation()
        if (shouldArmHeadsetAutoStartFromSettings()) {
            armHeadsetAutoStart()
        } else {
            stopSelf()
        }
    }

    private fun handleFailure(message: String) {
        startJob?.cancel()
        startJob = null
        session?.stop()
        session = null
        activeTargetLanguageCode = null
        releaseActiveMediaProjection()
        unregisterHeadsetAutoStartCallback()
        headsetAutoStartWaiting = false
        ServiceCompat.stopForeground(this, ServiceCompat.STOP_FOREGROUND_REMOVE)
        TranslationController.update(this, TranslationState.Error(message))
        DemoRecordingController.resumeOriginalAudioCaptureAfterTranslation()
        stopSelf()
    }

    private fun stopHeadsetAutoStartWaiting(disableSetting: Boolean) {
        unregisterHeadsetAutoStartCallback()
        headsetAutoStartWaiting = false
        if (disableSetting) {
            disableHeadsetAutoStartSetting()
        }
        if (!hasLiveTranslation()) {
            ServiceCompat.stopForeground(this, ServiceCompat.STOP_FOREGROUND_REMOVE)
            if (TranslationController.state.value is TranslationState.WaitingForHeadset) {
                TranslationController.update(this, TranslationState.Idle)
            }
            stopSelf()
        }
    }

    private fun registerHeadsetAutoStartCallback() {
        val audioManager = getSystemService(AudioManager::class.java) ?: return
        unregisterHeadsetAutoStartCallback()
        val callback = object : AudioDeviceCallback() {
            override fun onAudioDevicesAdded(addedDevices: Array<out AudioDeviceInfo>) {
                if (addedDevices.any { AudioDevices.isHeadsetInputType(it.type) }) {
                    startHeadsetAutoStartIfReady()
                }
            }
        }
        headsetAutoStartDeviceCallback = callback
        audioManager.registerAudioDeviceCallback(callback, Handler(Looper.getMainLooper()))
    }

    private fun unregisterHeadsetAutoStartCallback() {
        val callback = headsetAutoStartDeviceCallback ?: return
        headsetAutoStartDeviceCallback = null
        val audioManager = getSystemService(AudioManager::class.java) ?: return
        runCatching { audioManager.unregisterAudioDeviceCallback(callback) }
    }

    private fun startHeadsetAutoStartIfReady() {
        if (!headsetAutoStartWaiting || hasLiveTranslation()) return
        if (!shouldArmHeadsetAutoStartFromSettings()) {
            stopHeadsetAutoStartWaiting(disableSetting = false)
            return
        }
        val audioManager = getSystemService(AudioManager::class.java) ?: return
        if (!AudioDevices.isHeadsetInputAvailable(audioManager)) return
        startTranslation(Intent(this, TranslationForegroundService::class.java).setAction(TranslationActions.ACTION_START))
    }

    private fun shouldArmHeadsetAutoStartFromSettings(): Boolean {
        val settings = TranslationSettingsStore(this).read()
        return settings.headsetAutoStartEnabled && settings.audioInputSource == AudioInputSource.Headset
    }

    private fun disableHeadsetAutoStartSetting() {
        val store = TranslationSettingsStore(this)
        val settings = store.read()
        if (settings.headsetAutoStartEnabled) {
            store.save(settings.copy(headsetAutoStartEnabled = false))
        }
    }

    @SuppressLint("MissingPermission")
    private fun refreshNotification() {
        runCatching {
            NotificationManagerCompat.from(this).notify(
                TranslationActions.NOTIFICATION_ID,
                buildNotification(TranslationController.state.value),
            )
        }
    }

    private fun buildNotification(state: TranslationState): Notification {
        val settings = TranslationSettingsStore(this).read()
        val openIntent = PendingIntent.getActivity(
            this,
            200,
            Intent(this, MainActivity::class.java),
            PendingIntent.FLAG_UPDATE_CURRENT or pendingIntentMutabilityFlag(),
        )
        val stopIntent = PendingIntent.getService(
            this,
            201,
            Intent(this, TranslationForegroundService::class.java).setAction(TranslationActions.ACTION_STOP),
            PendingIntent.FLAG_UPDATE_CURRENT or pendingIntentMutabilityFlag(),
        )

        val title = if (state is TranslationState.WaitingForHeadset) {
            getString(R.string.notification_title_headset_auto_start)
        } else {
            val targetLanguage = TranslationLanguages.outputLanguageFor(
                activeTargetLanguageCode ?: settings.targetLanguageCode,
            )
            getString(R.string.notification_title_translating_to, targetLanguage.displayName(this))
        }

        return NotificationCompat.Builder(this, TranslationActions.NOTIFICATION_CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_translate)
            .setContentTitle(title)
            .setContentText(state.localizedStatusText(this))
            .setContentIntent(openIntent)
            .setOngoing(state.isRunning)
            .setOnlyAlertOnce(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .addAction(R.drawable.ic_translate, getString(R.string.notification_stop), stopIntent)
            .build()
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val channel = NotificationChannel(
            TranslationActions.NOTIFICATION_CHANNEL_ID,
            getString(R.string.notification_channel_name),
            NotificationManager.IMPORTANCE_LOW,
        )
        channel.description = getString(R.string.notification_channel_description)
        getSystemService(NotificationManager::class.java).createNotificationChannel(channel)
    }

    private fun foregroundServiceType(audioInputSource: AudioInputSource): Int {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) return 0
        return when (audioInputSource) {
            AudioInputSource.DeviceAudio -> ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PROJECTION
            AudioInputSource.Phone,
            AudioInputSource.Headset,
            -> ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE
        }
    }

    private fun pendingIntentMutabilityFlag(): Int {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0
    }

    private fun attachActiveMediaProjection(mediaProjection: MediaProjection, owned: Boolean) {
        activeMediaProjection = mediaProjection
        activeMediaProjectionOwned = owned
        val callback = object : MediaProjection.Callback() {
            override fun onStop() {
                activeMediaProjection = null
                activeMediaProjectionCallback = null
                activeMediaProjectionOwned = false
                if (TranslationController.state.value.isRunning || hasLiveTranslation()) {
                    scope.launch { handleFailure("Device audio capture ended.") }
                }
            }
        }
        activeMediaProjectionCallback = callback
        mediaProjection.registerCallback(callback, Handler(Looper.getMainLooper()))
    }

    private fun releaseActiveMediaProjection() {
        val mediaProjection = activeMediaProjection ?: return
        activeMediaProjection = null
        val shouldStopProjection = activeMediaProjectionOwned
        activeMediaProjectionOwned = false
        activeMediaProjectionCallback?.let { callback ->
            runCatching { mediaProjection.unregisterCallback(callback) }
        }
        activeMediaProjectionCallback = null
        if (shouldStopProjection) {
            runCatching { mediaProjection.stop() }
        }
    }

    private fun hasLiveTranslation(): Boolean {
        return session != null || startJob?.isActive == true
    }

    private fun syncControllerWithLiveTranslation() {
        val state = if (session != null) TranslationState.Active else TranslationState.Connecting
        TranslationController.update(this, state)
        refreshNotification()
    }

    @Suppress("DEPRECATION")
    private fun Intent.projectionResultData(): Intent? {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            getParcelableExtra(EXTRA_MEDIA_PROJECTION_RESULT_DATA, Intent::class.java)
        } else {
            getParcelableExtra(EXTRA_MEDIA_PROJECTION_RESULT_DATA)
        }
    }

    companion object {
        const val EXTRA_MEDIA_PROJECTION_RESULT_CODE =
            "com.andreabertoncini.chuchotage.extra.MEDIA_PROJECTION_RESULT_CODE"
        const val EXTRA_MEDIA_PROJECTION_RESULT_DATA =
            "com.andreabertoncini.chuchotage.extra.MEDIA_PROJECTION_RESULT_DATA"
        const val EXTRA_ALLOW_AUDIO_FEEDBACK_RISK =
            "com.andreabertoncini.chuchotage.extra.ALLOW_AUDIO_FEEDBACK_RISK"
        const val EXTRA_USE_ACTIVE_DEMO_MEDIA_PROJECTION =
            "com.andreabertoncini.chuchotage.extra.USE_ACTIVE_DEMO_MEDIA_PROJECTION"
        const val EXTRA_TARGET_LANGUAGE_CODE =
            "com.andreabertoncini.chuchotage.extra.TARGET_LANGUAGE_CODE"
        const val EXTRA_SOURCE_TRANSCRIPT_ENABLED =
            "com.andreabertoncini.chuchotage.extra.SOURCE_TRANSCRIPT_ENABLED"
    }
}
