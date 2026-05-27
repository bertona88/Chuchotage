package com.andreabertoncini.chuchotage.demo

import android.annotation.SuppressLint
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Intent
import android.content.pm.ServiceInfo
import android.media.AudioManager
import android.media.projection.MediaProjectionManager
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat
import androidx.core.app.ServiceCompat
import com.andreabertoncini.chuchotage.MainActivity
import com.andreabertoncini.chuchotage.R
import com.andreabertoncini.chuchotage.TranslationActions
import com.andreabertoncini.chuchotage.settings.TranslationSettingsStore

class DemoRecordingService : Service() {
    private var recorder: DemoMp4Recorder? = null

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            TranslationActions.ACTION_DEMO_RECORDING_STOP -> stopRecording()
            else -> startRecording(intent)
        }
        return START_NOT_STICKY
    }

    override fun onDestroy() {
        recorder?.stop()
        recorder = null
        super.onDestroy()
    }

    @SuppressLint("InlinedApi")
    private fun startRecording(intent: Intent?) {
        if (recorder != null) return

        val resultCode = intent?.getIntExtra(EXTRA_RESULT_CODE, 0) ?: 0
        val resultData = intent?.projectionResultData()
        if (resultCode == 0 || resultData == null) {
            DemoRecordingController.markError(getString(R.string.demo_record_error))
            stopSelf()
            return
        }

        ServiceCompat.startForeground(
            this,
            TranslationActions.DEMO_RECORDING_NOTIFICATION_ID,
            buildNotification(),
            foregroundServiceType(),
        )

        try {
            val projectionManager = getSystemService(MediaProjectionManager::class.java)
            val projection = projectionManager.getMediaProjection(resultCode, resultData)
            val settings = TranslationSettingsStore(this).read()
            val nextRecorder = DemoMp4Recorder(
                context = applicationContext,
                mediaProjection = projection,
                audioInputSource = settings.audioInputSource,
                audioManager = getSystemService(AudioManager::class.java),
                onSaved = { uri ->
                    DemoRecordingController.markSaved(uri)
                    finishService()
                },
                onError = { message ->
                    DemoRecordingController.markError(message)
                    finishService()
                },
            )
            recorder = nextRecorder
            DemoRecordingController.attachRecorder(nextRecorder)
            nextRecorder.start()
            DemoRecordingController.markRecording()
        } catch (error: Throwable) {
            recorder = null
            DemoRecordingController.markError(error.message ?: getString(R.string.demo_record_error))
            finishService()
        }
    }

    private fun stopRecording() {
        val activeRecorder = recorder
        if (activeRecorder == null) {
            stopSelf()
            return
        }
        activeRecorder.stop()
    }

    private fun finishService() {
        recorder = null
        ServiceCompat.stopForeground(this, ServiceCompat.STOP_FOREGROUND_REMOVE)
        stopSelf()
    }

    private fun buildNotification(): Notification {
        val openIntent = PendingIntent.getActivity(
            this,
            300,
            Intent(this, MainActivity::class.java),
            PendingIntent.FLAG_UPDATE_CURRENT or pendingIntentMutabilityFlag(),
        )
        val stopIntent = PendingIntent.getService(
            this,
            301,
            Intent(this, DemoRecordingService::class.java)
                .setAction(TranslationActions.ACTION_DEMO_RECORDING_STOP),
            PendingIntent.FLAG_UPDATE_CURRENT or pendingIntentMutabilityFlag(),
        )

        return NotificationCompat.Builder(this, TranslationActions.DEMO_RECORDING_NOTIFICATION_CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_translate)
            .setContentTitle(getString(R.string.demo_notification_title))
            .setContentIntent(openIntent)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .addAction(R.drawable.ic_translate, getString(R.string.notification_stop), stopIntent)
            .build()
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val channel = NotificationChannel(
            TranslationActions.DEMO_RECORDING_NOTIFICATION_CHANNEL_ID,
            getString(R.string.demo_notification_channel_name),
            NotificationManager.IMPORTANCE_LOW,
        )
        channel.description = getString(R.string.demo_notification_channel_description)
        getSystemService(NotificationManager::class.java).createNotificationChannel(channel)
    }

    private fun foregroundServiceType(): Int {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PROJECTION or
                ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE
        } else {
            0
        }
    }

    private fun pendingIntentMutabilityFlag(): Int {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0
    }

    @Suppress("DEPRECATION")
    private fun Intent.projectionResultData(): Intent? {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            getParcelableExtra(EXTRA_RESULT_DATA, Intent::class.java)
        } else {
            getParcelableExtra(EXTRA_RESULT_DATA)
        }
    }

    companion object {
        const val EXTRA_RESULT_CODE = "com.andreabertoncini.chuchotage.extra.RESULT_CODE"
        const val EXTRA_RESULT_DATA = "com.andreabertoncini.chuchotage.extra.RESULT_DATA"
    }
}
