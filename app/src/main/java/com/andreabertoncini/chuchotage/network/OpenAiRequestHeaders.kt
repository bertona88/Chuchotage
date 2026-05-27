package com.andreabertoncini.chuchotage.network

import com.andreabertoncini.chuchotage.BuildConfig

internal object OpenAiRequestHeaders {
    val userAgent: String =
        "Chuchotage/${BuildConfig.VERSION_NAME} (Android; ${BuildConfig.APPLICATION_ID}; +https://www.chuchotage.ai)"
}
