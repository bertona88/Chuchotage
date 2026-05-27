package com.andreabertoncini.chuchotage.state

sealed interface TranslationEvent {
    data class StartRequested(val hasMicrophonePermission: Boolean) : TranslationEvent
    data object TokenCreated : TranslationEvent
    data class TokenFailed(val message: String) : TranslationEvent
    data object SocketOpened : TranslationEvent
    data class SocketFailed(val message: String) : TranslationEvent
    data object StopRequested : TranslationEvent
    data object Stopped : TranslationEvent
}

object TranslationStateReducer {
    fun reduce(state: TranslationState, event: TranslationEvent): TranslationState {
        return when (event) {
            is TranslationEvent.StartRequested -> {
                if (event.hasMicrophonePermission) TranslationState.Connecting
                else TranslationState.Error("Microphone permission missing.")
            }
            TranslationEvent.TokenCreated -> TranslationState.Connecting
            is TranslationEvent.TokenFailed -> TranslationState.Error(event.message)
            TranslationEvent.SocketOpened -> TranslationState.Active
            is TranslationEvent.SocketFailed -> TranslationState.Error(event.message)
            TranslationEvent.StopRequested -> {
                if (state is TranslationState.Idle) TranslationState.Idle else TranslationState.Stopping
            }
            TranslationEvent.Stopped -> TranslationState.Idle
        }
    }
}
