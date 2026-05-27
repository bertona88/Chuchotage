package com.andreabertoncini.chuchotage.state

import org.junit.Assert.assertEquals
import org.junit.Test

class TranslationStateReducerTest {
    @Test
    fun startWithPermissionMovesToConnecting() {
        val state = TranslationStateReducer.reduce(
            TranslationState.Idle,
            TranslationEvent.StartRequested(hasMicrophonePermission = true),
        )

        assertEquals(TranslationState.Connecting, state)
    }

    @Test
    fun startWithoutPermissionMovesToError() {
        val state = TranslationStateReducer.reduce(
            TranslationState.Idle,
            TranslationEvent.StartRequested(hasMicrophonePermission = false),
        )

        assertEquals(TranslationState.Error("Microphone permission missing."), state)
    }

    @Test
    fun socketOpenMovesToActive() {
        val state = TranslationStateReducer.reduce(
            TranslationState.Connecting,
            TranslationEvent.SocketOpened,
        )

        assertEquals(TranslationState.Active, state)
    }

    @Test
    fun stopActiveMovesToStoppingAndStoppedMovesToIdle() {
        val stopping = TranslationStateReducer.reduce(
            TranslationState.Active,
            TranslationEvent.StopRequested,
        )
        val idle = TranslationStateReducer.reduce(stopping, TranslationEvent.Stopped)

        assertEquals(TranslationState.Stopping, stopping)
        assertEquals(TranslationState.Idle, idle)
    }

    @Test
    fun tokenFailureMovesToError() {
        val state = TranslationStateReducer.reduce(
            TranslationState.Connecting,
            TranslationEvent.TokenFailed("token failed"),
        )

        assertEquals(TranslationState.Error("token failed"), state)
    }

    @Test
    fun socketFailureMovesToError() {
        val state = TranslationStateReducer.reduce(
            TranslationState.Active,
            TranslationEvent.SocketFailed("socket failed"),
        )

        assertEquals(TranslationState.Error("socket failed"), state)
    }
}
