package com.andreabertoncini.chuchotage.state

data class TranslationTranscript(
    val inputText: String = "",
    val outputText: String = "",
) {
    val hasText: Boolean
        get() = inputText.isNotBlank() || outputText.isNotBlank()

    fun appendInput(delta: String, maxChars: Int = MAX_TEXT_CHARS): TranslationTranscript {
        return if (delta.isBlank()) this else copy(inputText = appendCapped(inputText, delta, maxChars))
    }

    fun appendOutput(delta: String, maxChars: Int = MAX_TEXT_CHARS): TranslationTranscript {
        return if (delta.isBlank()) this else copy(outputText = appendCapped(outputText, delta, maxChars))
    }

    companion object {
        const val MAX_TEXT_CHARS = 6000
    }
}

private fun appendCapped(
    current: String,
    delta: String,
    maxChars: Int,
): String {
    val next = (current + delta).trimStart()
    return if (next.length <= maxChars) {
        next
    } else {
        next.takeLast(maxChars).trimStart()
    }
}
