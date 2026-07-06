import com.github.triplet.gradle.androidpublisher.ReleaseStatus
import java.io.File
import java.util.Properties

plugins {
    id("com.android.application")
    id("com.github.triplet.play")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.compose")
}

val playServiceAccountCredentialsPath = providers
    .gradleProperty("playServiceAccountCredentials")
    .orElse(providers.environmentVariable("PLAY_SERVICE_ACCOUNT_JSON"))
    .getOrElse(File(System.getProperty("user.home"), ".config/chuchotage/play-service-account.json").path)

val chuchotageSigningPropertiesPath = providers
    .gradleProperty("chuchotageSigningProperties")
    .orElse(providers.environmentVariable("CHUCHOTAGE_SIGNING_PROPERTIES"))
    .getOrElse(File(System.getProperty("user.home"), ".config/chuchotage/signing.properties").path)
val chuchotageSigningPropertiesFile = file(chuchotageSigningPropertiesPath)
val chuchotageSigningProperties = Properties().apply {
    if (chuchotageSigningPropertiesFile.isFile) {
        chuchotageSigningPropertiesFile.inputStream().use(::load)
    }
}
fun requiredSigningProperty(name: String): String =
    chuchotageSigningProperties.getProperty(name)?.takeIf { it.isNotBlank() }
        ?: error("Missing $name in $chuchotageSigningPropertiesPath")

android {
    namespace = "com.andreabertoncini.chuchotage"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.andreabertoncini.chuchotage"
        minSdk = 26
        targetSdk = 35
        versionCode = 11
        versionName = "0.2.3"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"

    }

    signingConfigs {
        create("release") {
            if (chuchotageSigningPropertiesFile.isFile) {
                storeFile = file(requiredSigningProperty("storeFile"))
                storePassword = requiredSigningProperty("storePassword")
                keyAlias = requiredSigningProperty("keyAlias")
                keyPassword = requiredSigningProperty("keyPassword")
            }
        }
    }

    buildTypes {
        getByName("release") {
            if (chuchotageSigningPropertiesFile.isFile) {
                signingConfig = signingConfigs.getByName("release")
            }
        }
    }

    buildFeatures {
        buildConfig = true
        compose = true
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}

play {
    serviceAccountCredentials.set(file(playServiceAccountCredentialsPath))
    track.set("internal")
    releaseStatus.set(ReleaseStatus.DRAFT)
    defaultToAppBundles.set(true)
}

kotlin {
    jvmToolchain(17)
}

dependencies {
    implementation(platform("androidx.compose:compose-bom:2024.12.01"))
    androidTestImplementation(platform("androidx.compose:compose-bom:2024.12.01"))

    implementation("androidx.activity:activity-compose:1.9.3")
    implementation("androidx.browser:browser:1.8.0")
    implementation("androidx.camera:camera-camera2:1.4.1")
    implementation("androidx.camera:camera-lifecycle:1.4.1")
    implementation("androidx.camera:camera-view:1.4.1")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-tooling-preview")
    implementation("androidx.core:core-ktx:1.15.0")
    implementation("androidx.lifecycle:lifecycle-runtime-compose:2.8.7")
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.8.7")
    implementation("com.squareup.okhttp3:okhttp:4.12.0")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.9.0")
    implementation("org.json:json:20240303")

    debugImplementation("androidx.compose.ui:ui-test-manifest")
    debugImplementation("androidx.compose.ui:ui-tooling")

    testImplementation("junit:junit:4.13.2")
    testImplementation("com.squareup.okhttp3:mockwebserver:4.12.0")
    testImplementation("org.jetbrains.kotlinx:kotlinx-coroutines-test:1.9.0")
    testImplementation("org.json:json:20240303")

    androidTestImplementation("androidx.compose.ui:ui-test-junit4")
    androidTestImplementation("androidx.test.espresso:espresso-core:3.6.1")
    androidTestImplementation("androidx.test.ext:junit:1.2.1")
}
