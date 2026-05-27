package com.andreabertoncini.chuchotage.state

import com.andreabertoncini.chuchotage.settings.AUDIO_FEEDBACK_WARNING_MESSAGE
import org.junit.Assert.assertEquals
import org.junit.Test

class TranslationStateTest {
    @Test
    fun errorStatusTextUsesActionablePermissionCopy() {
        assertEquals(
            "Allow microphone access",
            TranslationState.Error("Microphone permission missing.").statusText,
        )
    }

    @Test
    fun errorStatusTextUsesActionableCredentialCopy() {
        assertEquals(
            "Add OpenAI login",
            TranslationState.Error("OpenAI login missing.").statusText,
        )
    }

    @Test
    fun errorStatusTextUsesActionableAudioOutputCopy() {
        assertEquals(
            "Headphones unavailable",
            TranslationState.Error("Headphones unavailable.").statusText,
        )
    }

    @Test
    fun errorStatusTextUsesActionableAudioOutputPermissionCopy() {
        assertEquals(
            "Allow Nearby devices for audio output",
            TranslationState.Error("Nearby devices permission is required for Bluetooth audio output.").statusText,
        )
    }

    @Test
    fun errorStatusTextShowsAudioFeedbackWarning() {
        assertEquals(
            AUDIO_FEEDBACK_WARNING_MESSAGE,
            TranslationState.Error(AUDIO_FEEDBACK_WARNING_MESSAGE).statusText,
        )
    }

    @Test
    fun errorStatusTextUsesActionableDeviceAudioCaptureCopy() {
        assertEquals(
            "Allow device audio capture",
            TranslationState.Error("Allow device audio capture to start.").statusText,
        )
    }

    @Test
    fun waitingForHeadsetStatusTextIsDirect() {
        assertEquals("Waiting for headset", TranslationState.WaitingForHeadset.statusText)
    }

    @Test
    fun errorStatusTextUsesActionableDeviceAudioPlatformCopy() {
        assertEquals(
            "Device audio needs Android 10+",
            TranslationState.Error("Device audio capture requires Android 10 or newer.").statusText,
        )
    }

    @Test
    fun errorStatusTextKeepsUnknownMessagesVisible() {
        assertEquals(
            "Server said no",
            TranslationState.Error("  Server said no.  ").statusText,
        )
    }

    @Test
    fun errorStatusTextFallsBackForBlankMessages() {
        assertEquals(
            "Translation needs attention",
            TranslationState.Error("   ").statusText,
        )
    }

    @Test
    fun restorableStateTreatsPersistedRunningStateAsIdleWithoutLiveSession() {
        listOf("waiting_for_headset", "connecting", "active", "stopping").forEach { storedName ->
            assertEquals(
                TranslationState.Idle,
                restorableTranslationStateFromStorage(
                    name = storedName,
                    message = null,
                    hasLiveRunningState = false,
                ),
            )
        }
    }

    @Test
    fun restorableStateKeepsPersistedWaitingStateWhenSessionIsLive() {
        assertEquals(
            TranslationState.WaitingForHeadset,
            restorableTranslationStateFromStorage(
                name = "waiting_for_headset",
                message = null,
                hasLiveRunningState = true,
            ),
        )
    }

    @Test
    fun restorableStateKeepsPersistedRunningStateWhenSessionIsLive() {
        assertEquals(
            TranslationState.Connecting,
            restorableTranslationStateFromStorage(
                name = "connecting",
                message = null,
                hasLiveRunningState = true,
            ),
        )
        assertEquals(
            TranslationState.Active,
            restorableTranslationStateFromStorage(
                name = "active",
                message = null,
                hasLiveRunningState = true,
            ),
        )
        assertEquals(
            TranslationState.Stopping,
            restorableTranslationStateFromStorage(
                name = "stopping",
                message = null,
                hasLiveRunningState = true,
            ),
        )
    }

    @Test
    fun restorableStateTreatsPersistedDeviceAudioConsentErrorAsIdle() {
        assertEquals(
            TranslationState.Idle,
            restorableTranslationStateFromStorage(
                name = "error",
                message = "Allow device audio capture to start.",
                hasLiveRunningState = false,
            ),
        )
    }

    @Test
    fun snapshotTreatsPersistedRunningStateAsIdleWithoutLiveSession() {
        val snapshot = translationSnapshotFromStorage(
            name = "active",
            message = null,
            hasLiveRunningState = false,
        )

        assertEquals("idle", snapshot.stateName)
        assertEquals(false, snapshot.isRunning)
    }

    @Test
    fun snapshotTreatsPersistedDeviceAudioConsentErrorAsIdle() {
        val snapshot = translationSnapshotFromStorage(
            name = "error",
            message = "Allow device audio capture to start.",
            hasLiveRunningState = false,
        )

        assertEquals("idle", snapshot.stateName)
        assertEquals(false, snapshot.isRunning)
    }
}
