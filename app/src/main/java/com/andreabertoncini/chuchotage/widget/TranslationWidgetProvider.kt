package com.andreabertoncini.chuchotage.widget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.os.Build
import android.widget.RemoteViews
import com.andreabertoncini.chuchotage.MainActivity
import com.andreabertoncini.chuchotage.R
import com.andreabertoncini.chuchotage.TranslationActions
import com.andreabertoncini.chuchotage.audio.AudioDevices
import com.andreabertoncini.chuchotage.network.SecureApiKeyStore
import com.andreabertoncini.chuchotage.service.TranslationForegroundService
import com.andreabertoncini.chuchotage.settings.AudioInputSource
import com.andreabertoncini.chuchotage.settings.TranslationSettingsStore
import com.andreabertoncini.chuchotage.settings.hasAudioFeedbackRisk
import com.andreabertoncini.chuchotage.state.TranslationController
import com.andreabertoncini.chuchotage.state.TranslationState
import com.andreabertoncini.chuchotage.state.localizedStatusText
import com.andreabertoncini.chuchotage.state.translationStateFromStorage

class TranslationWidgetProvider : AppWidgetProvider() {
    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        appWidgetIds.forEach { appWidgetId ->
            appWidgetManager.updateAppWidget(appWidgetId, buildRemoteViews(context))
        }
    }

    companion object {
        fun updateAll(context: Context) {
            val appContext = context.applicationContext
            val manager = AppWidgetManager.getInstance(appContext)
            val ids = manager.getAppWidgetIds(ComponentName(appContext, TranslationWidgetProvider::class.java))
            ids.forEach { manager.updateAppWidget(it, buildRemoteViews(appContext)) }
        }

        private fun buildRemoteViews(context: Context): RemoteViews {
            val snapshot = TranslationController.snapshot(context)
            val state = translationStateFromStorage(snapshot.stateName, snapshot.errorMessage)
            val settings = TranslationSettingsStore(context).read()
            val text = if (snapshot.isRunning) {
                context.getString(R.string.widget_stop)
            } else {
                context.getString(R.string.widget_start)
            }
            val statusText = when (state) {
                TranslationState.Idle -> settings.notificationTitle(context)
                else -> state.localizedStatusText(context)
            }
            val views = RemoteViews(context.packageName, R.layout.widget_translation)
            val pendingIntent = widgetPendingIntent(context)
            views.setTextViewText(R.id.widget_status, statusText)
            views.setTextViewText(R.id.widget_button, text)
            views.setTextColor(R.id.widget_status, statusColor(state))
            views.setTextColor(R.id.widget_button, if (snapshot.isRunning) COLOR_TEXT else COLOR_INK_DEEP)
            views.setInt(
                R.id.widget_button,
                "setBackgroundResource",
                if (snapshot.isRunning) R.drawable.widget_button_active_background else R.drawable.widget_button_background,
            )
            views.setOnClickPendingIntent(R.id.widget_root, pendingIntent)
            views.setContentDescription(R.id.widget_button, context.getString(R.string.widget_description))
            views.setOnClickPendingIntent(R.id.widget_button, pendingIntent)
            return views
        }

        private fun widgetPendingIntent(context: Context): PendingIntent {
            val settings = TranslationSettingsStore(context).read()
            val snapshot = TranslationController.snapshot(context)
            val canStart = settings.audioInputSource != AudioInputSource.DeviceAudio &&
                !settings.hasAudioFeedbackRisk(AudioDevices.isHeadsetPlaybackAvailable(context)) &&
                TranslationController.hasStartPermissions(context) &&
                SecureApiKeyStore(context).hasCredential()

            return if (snapshot.isRunning || canStart) {
                val intent = Intent(context, TranslationForegroundService::class.java)
                    .setAction(TranslationActions.ACTION_TOGGLE)
                PendingIntent.getForegroundService(
                    context,
                    100,
                    intent,
                    PendingIntent.FLAG_UPDATE_CURRENT or pendingIntentMutabilityFlag(),
                )
            } else {
                val intent = Intent(context, MainActivity::class.java)
                    .setAction(TranslationActions.ACTION_OPEN_PERMISSIONS)
                    .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
                PendingIntent.getActivity(
                    context,
                    101,
                    intent,
                    PendingIntent.FLAG_UPDATE_CURRENT or pendingIntentMutabilityFlag(),
                )
            }
        }

        private fun pendingIntentMutabilityFlag(): Int {
            return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0
        }

        private fun statusColor(state: TranslationState): Int {
            return when (state) {
                TranslationState.Active -> COLOR_SIGNAL_BLUE_SOFT
                TranslationState.WaitingForHeadset -> COLOR_SIGNAL_BLUE_SOFT
                TranslationState.Connecting -> COLOR_SIGNAL_BLUE_SOFT
                is TranslationState.Error -> COLOR_ERROR
                TranslationState.Idle,
                TranslationState.Stopping -> COLOR_MUTED
            }
        }

        private val COLOR_INK_DEEP = Color.rgb(0x02, 0x07, 0x0C)
        private val COLOR_SIGNAL_BLUE_SOFT = Color.rgb(0x68, 0xC8, 0xF4)
        private val COLOR_TEXT = Color.rgb(0xE8, 0xED, 0xF1)
        private val COLOR_MUTED = Color.rgb(0xA1, 0xAD, 0xB7)
        private val COLOR_ERROR = Color.rgb(0xF0, 0x8E, 0x8E)
    }
}
