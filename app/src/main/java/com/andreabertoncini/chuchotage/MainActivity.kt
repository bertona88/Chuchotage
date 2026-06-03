package com.andreabertoncini.chuchotage

import android.Manifest
import android.app.Activity
import android.content.Context
import android.content.ContextWrapper
import android.content.Intent
import android.content.pm.PackageManager
import android.media.projection.MediaProjectionConfig
import android.media.projection.MediaProjectionManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import androidx.activity.ComponentActivity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Surface
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.camera.core.CameraSelector
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.core.content.ContextCompat
import androidx.lifecycle.compose.LocalLifecycleOwner
import com.andreabertoncini.chuchotage.audio.AudioDevices
import com.andreabertoncini.chuchotage.demo.DemoRecordingController
import com.andreabertoncini.chuchotage.demo.DemoRecordingState
import com.andreabertoncini.chuchotage.demo.DemoRecordingStatus
import com.andreabertoncini.chuchotage.network.ChatGptOAuthClient
import com.andreabertoncini.chuchotage.network.ChatGptSignInStatus
import com.andreabertoncini.chuchotage.network.CodexUsageClient
import com.andreabertoncini.chuchotage.network.CodexUsageSnapshot
import com.andreabertoncini.chuchotage.network.OpenAiCredentialKind
import com.andreabertoncini.chuchotage.network.SecureApiKeyStore
import com.andreabertoncini.chuchotage.settings.AudioInputSource
import com.andreabertoncini.chuchotage.settings.AudioOutputRoute
import com.andreabertoncini.chuchotage.settings.TranslationLanguage
import com.andreabertoncini.chuchotage.settings.TranslationLanguages
import com.andreabertoncini.chuchotage.settings.TranslationSettings
import com.andreabertoncini.chuchotage.settings.TranslationSettingsStore
import com.andreabertoncini.chuchotage.settings.hasAudioFeedbackRisk
import com.andreabertoncini.chuchotage.settings.needsActiveSessionRestart
import com.andreabertoncini.chuchotage.state.TranslationController
import com.andreabertoncini.chuchotage.state.TranslationState
import com.andreabertoncini.chuchotage.state.TranslationTranscript
import com.andreabertoncini.chuchotage.state.localizedStatusText
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.launch

private object ChuchotageBrand {
    val Ink = Color(0xFF07131D)
    val InkDeep = Color(0xFF02070C)
    val Surface = Color(0xFF0C1B26)
    val SurfaceRaised = Color(0xFF122838)
    val Ring = Color(0xFF2A3B47)
    val SignalBlue = Color(0xFF1D9BDA)
    val SignalBlueSoft = Color(0xFF68C8F4)
    val Cream = Color(0xFFF2E9DD)
    val Text = Color(0xFFE8EDF1)
    val Muted = Color(0xFFA1ADB7)
    val Warning = Color(0xFFE8B75D)
    val Error = Color(0xFFFF7A72)
}

private enum class DemoCameraFacing {
    Front,
    Back,
}

private fun DemoCameraFacing.flipped(): DemoCameraFacing = when (this) {
    DemoCameraFacing.Front -> DemoCameraFacing.Back
    DemoCameraFacing.Back -> DemoCameraFacing.Front
}

private data class StartPermissionNudge(
    val request: TranslationStartRequest,
    val titleResId: Int,
    val bodyResId: Int,
    val primaryActionResId: Int,
    val openAppSettings: Boolean,
)

private val DemoCameraFacing.cameraSelector: CameraSelector
    get() = when (this) {
        DemoCameraFacing.Front -> CameraSelector.DEFAULT_FRONT_CAMERA
        DemoCameraFacing.Back -> CameraSelector.DEFAULT_BACK_CAMERA
    }

private const val WebsiteUrl = "https://www.chuchotage.ai/"
private const val HowItWorksUrl = "https://www.chuchotage.ai/#how-it-works"
private const val SupportedInputLanguagesUrl = "https://www.chuchotage.ai/#supported-input-languages"
private const val PrivacyPolicyUrl = "https://www.chuchotage.ai/privacy/"
private const val PermissionPromptPrefsName = "permission_prompts"
private const val RequestedPermissionsKey = "requested_permissions"

private fun MediaProjectionManager.createTranslationAudioCaptureIntent(): Intent {
    return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
        createScreenCaptureIntent(MediaProjectionConfig.createConfigForDefaultDisplay())
    } else {
        createScreenCaptureIntent()
    }
}

class MainActivity : ComponentActivity() {
    private val permissionRequests = MutableSharedFlow<Unit>(extraBufferCapacity = 1)

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val requestPermissionOnLaunch = intent?.action == TranslationActions.ACTION_OPEN_PERMISSIONS

        setContent {
            ChuchotageScreen(
                permissionRequests = permissionRequests,
                requestPermissionOnLaunch = requestPermissionOnLaunch,
            )
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        if (intent.action == TranslationActions.ACTION_OPEN_PERMISSIONS) {
            permissionRequests.tryEmit(Unit)
        }
    }
}

@Composable
private fun ChuchotageScreen(
    permissionRequests: MutableSharedFlow<Unit>,
    requestPermissionOnLaunch: Boolean,
) {
    val context = LocalContext.current
    val credentialStore = remember(context) { SecureApiKeyStore(context) }
    val settingsStore = remember(context) { TranslationSettingsStore(context) }
    val chatGptOAuthClient = remember { ChatGptOAuthClient() }
    val codexUsageClient = remember { CodexUsageClient() }
    val scope = rememberCoroutineScope()
    var credential by remember { mutableStateOf(credentialStore.loadCredential()) }
    var hasCredential by remember { mutableStateOf(credential != null) }
    var settings by remember { mutableStateOf(settingsStore.read()) }
    var codexUsageState by remember { mutableStateOf<CodexUsageUiState>(CodexUsageUiState.Unavailable) }
    val state by TranslationController.state.collectAsState()
    val inputVolume by TranslationController.inputVolume.collectAsState()
    val transcript by TranslationController.transcript.collectAsState()
    val demoRecordingState by DemoRecordingController.state.collectAsState()
    val demoRecordingEnabled = BuildConfig.DEBUG
    val codexUsageLoadFailureMessage = stringResource(R.string.error_could_not_load_codex_usage)
    val demoCameraPermissionMessage = stringResource(R.string.demo_camera_permission_missing)
    val demoStartBeforeTranslationMessage = stringResource(R.string.demo_record_start_before_translation)
    val mediaProjectionManager = remember(context) {
        context.getSystemService(MediaProjectionManager::class.java)
    }
    var pendingPermissionStartRequest by remember { mutableStateOf<TranslationStartRequest?>(null) }
    var pendingProjectionStartRequest by remember { mutableStateOf<TranslationStartRequest?>(null) }
    var pendingFeedbackGuardStartRequest by remember { mutableStateOf<TranslationStartRequest?>(null) }
    var startPermissionNudge by remember { mutableStateOf<StartPermissionNudge?>(null) }
    var translationProjectionRequestActive by remember { mutableStateOf(false) }

    fun executeTranslationStartRequest(
        request: TranslationStartRequest,
        mediaProjectionResultCode: Int? = null,
        mediaProjectionResultData: Intent? = null,
        allowAudioFeedbackRisk: Boolean = false,
        useActiveDemoMediaProjection: Boolean = false,
    ) {
        when (request.kind) {
            TranslationStartRequestKind.Start -> TranslationController.start(
                context = context,
                mediaProjectionResultCode = mediaProjectionResultCode,
                mediaProjectionResultData = mediaProjectionResultData,
                allowAudioFeedbackRisk = allowAudioFeedbackRisk,
                useActiveDemoMediaProjection = useActiveDemoMediaProjection,
                targetLanguageCode = request.targetLanguageCode,
                sourceTranscriptEnabled = request.sourceTranscriptEnabled,
            )
            TranslationStartRequestKind.Restart -> TranslationController.restart(
                context = context,
                mediaProjectionResultCode = mediaProjectionResultCode,
                mediaProjectionResultData = mediaProjectionResultData,
                allowAudioFeedbackRisk = allowAudioFeedbackRisk,
                useActiveDemoMediaProjection = useActiveDemoMediaProjection,
                targetLanguageCode = request.targetLanguageCode,
                sourceTranscriptEnabled = request.sourceTranscriptEnabled,
            )
            TranslationStartRequestKind.ArmHeadsetAutoStart -> TranslationController.armHeadsetAutoStart(context)
        }
    }

    val translationProjectionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.StartActivityForResult(),
    ) { result ->
        val request = pendingProjectionStartRequest ?: TranslationStartRequest.Start
        val data = result.data
        pendingProjectionStartRequest = null
        translationProjectionRequestActive = false
        if (result.resultCode == Activity.RESULT_OK && data != null) {
            executeTranslationStartRequest(request, result.resultCode, data)
        } else {
            TranslationController.updateErrorIfNotRunning(context, "Allow device audio capture to start.")
        }
    }

    fun requestDeviceAudioCaptureConsent(request: TranslationStartRequest) {
        if (translationProjectionRequestActive) return
        translationProjectionRequestActive = true
        pendingProjectionStartRequest = request
        translationProjectionLauncher.launch(mediaProjectionManager.createTranslationAudioCaptureIntent())
    }

    fun startWithDeviceAudioCapture(
        request: TranslationStartRequest,
        allowAudioFeedbackRisk: Boolean,
    ) {
        if (DemoRecordingController.hasActiveMediaProjectionForTranslation()) {
            executeTranslationStartRequest(
                request = request,
                allowAudioFeedbackRisk = allowAudioFeedbackRisk,
                useActiveDemoMediaProjection = true,
            )
        } else {
            requestDeviceAudioCaptureConsent(request)
        }
    }

    val permissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestMultiplePermissions(),
    ) {
        val request = pendingPermissionStartRequest ?: if (state.isRunning) {
            TranslationStartRequest.Restart
        } else {
            TranslationStartRequest.Start
        }
        pendingPermissionStartRequest = null
        if (hasStartPermissions(context, settings.audioInputSource)) {
            if (request == TranslationStartRequest.ArmHeadsetAutoStart) {
                executeTranslationStartRequest(request)
            } else if (settings.hasAudioFeedbackRisk(AudioDevices.isHeadsetPlaybackAvailable(context))) {
                pendingFeedbackGuardStartRequest = request
            } else if (settings.audioInputSource == AudioInputSource.DeviceAudio) {
                requestDeviceAudioCaptureConsent(request)
            } else {
                executeTranslationStartRequest(request)
            }
        } else {
            TranslationController.update(
                context,
                TranslationState.Error(missingStartPermissionMessage(context, settings.audioInputSource)),
            )
            startPermissionNudge = buildStartPermissionNudge(context, settings.audioInputSource, request)
        }
    }

    fun launchStartPermissionRequest(request: TranslationStartRequest) {
        val permissions = requiredPermissions(settings.audioInputSource)
        pendingPermissionStartRequest = request
        rememberRequestedPermissions(context, permissions)
        permissionLauncher.launch(permissions)
    }

    fun promptForStartPermissions(request: TranslationStartRequest) {
        val nudge = buildStartPermissionNudge(context, settings.audioInputSource, request)
        if (nudge?.openAppSettings == true) {
            pendingPermissionStartRequest = request
            startPermissionNudge = nudge
        } else {
            launchStartPermissionRequest(request)
        }
    }

    val demoProjectionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.StartActivityForResult(),
    ) { result ->
        val data = result.data
        if (result.resultCode == Activity.RESULT_OK && data != null) {
            DemoRecordingController.start(context, result.resultCode, data)
        } else {
            DemoRecordingController.cancelBeforeStart()
        }
    }

    fun launchDemoScreenCapture() {
        DemoRecordingController.prepareForScreenCapture()
        demoProjectionLauncher.launch(mediaProjectionManager.createScreenCaptureIntent())
    }

    val demoPermissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestMultiplePermissions(),
    ) { results ->
        if (results.values.all { it }) {
            launchDemoScreenCapture()
        } else {
            DemoRecordingController.cancelBeforeStart(demoCameraPermissionMessage)
        }
    }

    fun startOrAskPermission(
        request: TranslationStartRequest = TranslationStartRequest.Start,
        allowAudioFeedbackRisk: Boolean = false,
    ) {
        if (!hasCredential) {
            TranslationController.update(context, TranslationState.Error("OpenAI login missing."))
            return
        }

        if (settings.audioInputSource == AudioInputSource.DeviceAudio &&
            Build.VERSION.SDK_INT < Build.VERSION_CODES.Q
        ) {
            TranslationController.update(context, TranslationState.Error("Device audio capture requires Android 10 or newer."))
            return
        }

        if (!hasStartPermissions(context, settings.audioInputSource)) {
            promptForStartPermissions(request)
        } else if (
            !allowAudioFeedbackRisk &&
            settings.hasAudioFeedbackRisk(AudioDevices.isHeadsetPlaybackAvailable(context))
        ) {
            pendingFeedbackGuardStartRequest = request
        } else if (settings.audioInputSource == AudioInputSource.DeviceAudio) {
            startWithDeviceAudioCapture(request, allowAudioFeedbackRisk)
        } else {
            executeTranslationStartRequest(
                request = request,
                allowAudioFeedbackRisk = allowAudioFeedbackRisk,
            )
        }
    }

    fun toggleDemoRecording() {
        if (!demoRecordingEnabled) return

        if (demoRecordingState.shouldShowRecordingChrome) {
            DemoRecordingController.stop(context)
            return
        }

        demoRecordingState.savedUri?.let { uri ->
            shareDemoVideo(context, uri)
            DemoRecordingController.resetFinishedState()
            return
        }

        if (state.isRunning) {
            DemoRecordingController.cancelBeforeStart(demoStartBeforeTranslationMessage)
            return
        }

        if (hasDemoRecordingPermissions(context, settings.audioInputSource)) {
            launchDemoScreenCapture()
        } else {
            demoPermissionLauncher.launch(demoRecordingPermissions(settings.audioInputSource))
        }
    }

    fun saveSettings(nextSettings: TranslationSettings) {
        val previousSettings = settings
        val normalizedSettings = if (nextSettings.audioInputSource == AudioInputSource.Headset) {
            nextSettings
        } else {
            nextSettings.copy(headsetAutoStartEnabled = false)
        }
        val needsSessionRestart = previousSettings.needsActiveSessionRestart(normalizedSettings)
        settingsStore.save(normalizedSettings)
        settings = settingsStore.read()
        if (previousSettings.headsetAutoStartEnabled && !settings.headsetAutoStartEnabled) {
            TranslationController.disarmHeadsetAutoStart(context)
        }
        if (state is TranslationState.WaitingForHeadset && !settings.headsetAutoStartEnabled) {
            return
        }
        if (state.isRunning && needsSessionRestart) {
            startOrAskPermission(TranslationStartRequest.Restart)
        }
    }

    fun setHeadsetAutoStart(enabled: Boolean) {
        saveSettings(
            settings.copy(
                audioInputSource = AudioInputSource.Headset,
                headsetAutoStartEnabled = enabled,
            ),
        )
        if (enabled) {
            if (!hasCredential) {
                TranslationController.update(context, TranslationState.Error("OpenAI login missing."))
            } else if (!hasStartPermissions(context, AudioInputSource.Headset)) {
                promptForStartPermissions(TranslationStartRequest.ArmHeadsetAutoStart)
            } else {
                TranslationController.armHeadsetAutoStart(context)
            }
        } else {
            TranslationController.disarmHeadsetAutoStart(context)
        }
    }

    fun reloadCredentialState() {
        credential = credentialStore.loadCredential()
        hasCredential = credential != null
    }

    suspend fun refreshCodexUsage() {
        val currentCredential = credentialStore.loadCredential()
        if (currentCredential?.kind != OpenAiCredentialKind.CHATGPT_ACCESS_TOKEN) {
            codexUsageState = CodexUsageUiState.Unavailable
            return
        }

        codexUsageState = CodexUsageUiState.Loading
        try {
            val freshCredential = chatGptOAuthClient.refreshIfNeeded(currentCredential)
            if (freshCredential != currentCredential) {
                credentialStore.saveOpenAiCredential(freshCredential)
                credential = freshCredential
            }
            codexUsageState = CodexUsageUiState.Loaded(codexUsageClient.fetchUsage(freshCredential))
        } catch (exception: CancellationException) {
            throw exception
        } catch (exception: Exception) {
            codexUsageState = CodexUsageUiState.Error(exception.message ?: codexUsageLoadFailureMessage)
        }
    }

    LaunchedEffect(Unit) {
        TranslationController.restore(context)
        if (
            hasCredential &&
            requestPermissionOnLaunch &&
            !hasStartPermissions(context, settings.audioInputSource)
        ) {
            promptForStartPermissions(TranslationStartRequest.Start)
        } else if (
            hasCredential &&
            requestPermissionOnLaunch &&
            settings.audioInputSource == AudioInputSource.DeviceAudio &&
            !state.isRunning
        ) {
            startOrAskPermission(TranslationStartRequest.Start)
        }
    }

    LaunchedEffect(hasCredential, credential?.kind) {
        if (hasCredential) {
            refreshCodexUsage()
        } else {
            codexUsageState = CodexUsageUiState.Unavailable
        }
    }

    LaunchedEffect(state) {
        settings = settingsStore.read()
    }

    LaunchedEffect(permissionRequests) {
        permissionRequests.collect {
            if (hasCredential && !hasStartPermissions(context, settings.audioInputSource)) {
                promptForStartPermissions(TranslationStartRequest.Start)
            } else if (
                hasCredential &&
                settings.audioInputSource == AudioInputSource.DeviceAudio &&
                !state.isRunning
            ) {
                startOrAskPermission(TranslationStartRequest.Start)
            }
        }
    }

    MaterialTheme(
        colorScheme = darkColorScheme(
            primary = ChuchotageBrand.SignalBlue,
            onPrimary = ChuchotageBrand.InkDeep,
            background = ChuchotageBrand.InkDeep,
            onBackground = ChuchotageBrand.Text,
            surface = ChuchotageBrand.Surface,
            onSurface = ChuchotageBrand.Text,
            error = ChuchotageBrand.Error,
        ),
    ) {
        startPermissionNudge?.let { nudge ->
            StartPermissionNudgeDialog(
                nudge = nudge,
                onPrimaryAction = {
                    startPermissionNudge = null
                    if (nudge.openAppSettings) {
                        openAppPermissionSettings(context)
                    } else {
                        launchStartPermissionRequest(nudge.request)
                    }
                },
                onDismiss = {
                    startPermissionNudge = null
                },
            )
        }
        pendingFeedbackGuardStartRequest?.let { request ->
            AudioFeedbackGuardDialog(
                onStartAnyway = {
                    pendingFeedbackGuardStartRequest = null
                    executeTranslationStartRequest(
                        request = request,
                        allowAudioFeedbackRisk = true,
                    )
                },
                onUseHeadphones = {
                    pendingFeedbackGuardStartRequest = null
                    if (!AudioDevices.isHeadsetPlaybackAvailable(context)) {
                        TranslationController.update(context, TranslationState.Error("Headphones unavailable."))
                    } else {
                        saveSettings(settings.copy(audioOutputRoute = AudioOutputRoute.Headphones))
                        if (!state.isRunning) {
                            startOrAskPermission(request)
                        }
                    }
                },
                onDismiss = {
                    pendingFeedbackGuardStartRequest = null
                },
            )
        }
        Surface(color = ChuchotageBrand.InkDeep, modifier = Modifier.fillMaxSize()) {
            if (hasCredential) {
                TranslatorTabsScreen(
                    state = state,
                    inputVolume = inputVolume,
                    transcript = transcript,
                    demoRecordingState = demoRecordingState,
                    demoRecordingEnabled = demoRecordingEnabled,
                    settings = settings,
                    onToggle = {
                        if (state is TranslationState.WaitingForHeadset) {
                            setHeadsetAutoStart(false)
                        } else if (state.isRunning) {
                            TranslationController.stop(context)
                        } else {
                            startOrAskPermission()
                        }
                    },
                    onDemoRecordingToggle = ::toggleDemoRecording,
                    onAudioInputSourceChange = { source ->
                        saveSettings(settings.copy(audioInputSource = source))
                    },
                    onAudioOutputRouteChange = { route ->
                        saveSettings(settings.copy(audioOutputRoute = route))
                    },
                    onDeviceAudioDuckingChange = { enabled ->
                        saveSettings(settings.copy(deviceAudioDuckingEnabled = enabled))
                    },
                    onFocusBackgroundChange = { enabled ->
                        saveSettings(settings.copy(focusBackgroundEnabled = enabled))
                    },
                    onHeadsetAutoStartChange = ::setHeadsetAutoStart,
                    onSourceTranscriptEnabledChange = { enabled ->
                        saveSettings(settings.copy(sourceTranscriptEnabled = enabled))
                    },
                    onOutputLanguageChange = { language ->
                        saveSettings(settings.copy(targetLanguageCode = language.code))
                    },
                    onConversationLanguageChange = { localLanguage, partnerLanguage ->
                        saveSettings(
                            settings.copy(
                                conversationLocalLanguageCode = localLanguage.code,
                                conversationPartnerLanguageCode = partnerLanguage.code,
                            ),
                        )
                    },
                    onConversationTurnSelected = { _, targetLanguageCode ->
                        val requestKind = if (state.isRunning) {
                            TranslationStartRequestKind.Restart
                        } else {
                            TranslationStartRequestKind.Start
                        }
                        startOrAskPermission(
                            TranslationStartRequest(
                                kind = requestKind,
                                targetLanguageCode = targetLanguageCode,
                            ),
                        )
                    },
                    onOpenWebsite = {
                        openExternalUrl(context, WebsiteUrl)
                    },
                    onOpenSupportedInputLanguages = {
                        openExternalUrl(context, SupportedInputLanguagesUrl)
                    },
                    onOpenPrivacyPolicy = {
                        openExternalUrl(context, PrivacyPolicyUrl)
                    },
                    credentialKind = credential?.kind,
                    codexUsageState = codexUsageState,
                    onRefreshCodexUsage = {
                        scope.launch {
                            refreshCodexUsage()
                        }
                    },
                    onSignOut = {
                        TranslationController.stop(context)
                        credentialStore.clearCredential()
                        reloadCredentialState()
                        codexUsageState = CodexUsageUiState.Unavailable
                        TranslationController.update(context, TranslationState.Idle)
                    },
                )
            } else {
                AuthSetupScreen(
                    onSaveApiKey = { apiKey ->
                        credentialStore.saveApiKey(apiKey)
                        reloadCredentialState()
                        TranslationController.update(context, TranslationState.Idle)
                    },
                    onUseSponsoredTrial = {
                        credentialStore.saveSponsoredTrialInstallId()
                        reloadCredentialState()
                        TranslationController.update(context, TranslationState.Idle)
                    },
                    onStartChatGptLogin = { onStatus ->
                        val tokens = chatGptOAuthClient.login(context, onStatus)
                        credentialStore.saveChatGptTokens(tokens)
                        reloadCredentialState()
                        TranslationController.update(context, TranslationState.Idle)
                    },
                    onCancelChatGptLogin = {
                        chatGptOAuthClient.cancelLogin()
                    },
                    onOpenHowItWorks = {
                        openExternalUrl(context, HowItWorksUrl)
                    },
                    onOpenWebsite = {
                        openExternalUrl(context, WebsiteUrl)
                    },
                    onOpenPrivacyPolicy = {
                        openExternalUrl(context, PrivacyPolicyUrl)
                    },
                )
            }
        }
    }
}

@Composable
private fun TranslatorTabsScreen(
    state: TranslationState,
    inputVolume: Float,
    transcript: TranslationTranscript,
    demoRecordingState: DemoRecordingState,
    demoRecordingEnabled: Boolean,
    settings: TranslationSettings,
    onToggle: () -> Unit,
    onDemoRecordingToggle: () -> Unit,
    onAudioInputSourceChange: (AudioInputSource) -> Unit,
    onAudioOutputRouteChange: (AudioOutputRoute) -> Unit,
    onDeviceAudioDuckingChange: (Boolean) -> Unit,
    onFocusBackgroundChange: (Boolean) -> Unit,
    onHeadsetAutoStartChange: (Boolean) -> Unit,
    onSourceTranscriptEnabledChange: (Boolean) -> Unit,
    onOutputLanguageChange: (TranslationLanguage) -> Unit,
    onConversationLanguageChange: (TranslationLanguage, TranslationLanguage) -> Unit,
    onConversationTurnSelected: (ConversationSpeaker, String) -> Unit,
    onOpenWebsite: () -> Unit,
    onOpenSupportedInputLanguages: () -> Unit,
    onOpenPrivacyPolicy: () -> Unit,
    credentialKind: OpenAiCredentialKind?,
    codexUsageState: CodexUsageUiState,
    onRefreshCodexUsage: () -> Unit,
    onSignOut: () -> Unit,
) {
    var selectedTab by rememberSaveable { mutableStateOf(0) }
    var demoCameraFacing by rememberSaveable { mutableStateOf(DemoCameraFacing.Front) }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(
                Brush.verticalGradient(
                    colors = listOf(
                        ChuchotageBrand.Ink,
                        ChuchotageBrand.InkDeep,
                    ),
                ),
            ),
    ) {
        Column(modifier = Modifier.fillMaxSize()) {
            Box(
                modifier = Modifier
                    .weight(1f)
                    .statusBarsPadding(),
            ) {
                if (selectedTab == 0) {
                    TranslationControlScreen(
                        state = state,
                        inputVolume = inputVolume,
                        transcript = transcript,
                        demoRecordingState = demoRecordingState,
                        demoRecordingEnabled = demoRecordingEnabled,
                        targetLanguage = settings.targetLanguage,
                        sourceTranscriptEnabled = settings.sourceTranscriptEnabled,
                        onToggle = onToggle,
                        onDemoRecordingToggle = onDemoRecordingToggle,
                        onSourceTranscriptEnabledChange = onSourceTranscriptEnabledChange,
                        onOutputLanguageChange = onOutputLanguageChange,
                    )
                } else if (selectedTab == 1) {
                    ConversationTranslationScreen(
                        state = state,
                        inputVolume = inputVolume,
                        transcript = transcript,
                        settings = settings,
                        onConversationLanguageChange = onConversationLanguageChange,
                        onConversationTurnSelected = onConversationTurnSelected,
                        onStopTranslation = onToggle,
                    )
                } else {
                    TranslationSettingsScreen(
                        settings = settings,
                        onAudioInputSourceChange = onAudioInputSourceChange,
                        onAudioOutputRouteChange = onAudioOutputRouteChange,
                        onDeviceAudioDuckingChange = onDeviceAudioDuckingChange,
                        onFocusBackgroundChange = onFocusBackgroundChange,
                        onHeadsetAutoStartChange = onHeadsetAutoStartChange,
                        onOutputLanguageChange = onOutputLanguageChange,
                        onOpenWebsite = onOpenWebsite,
                        onOpenSupportedInputLanguages = onOpenSupportedInputLanguages,
                        onOpenPrivacyPolicy = onOpenPrivacyPolicy,
                        credentialKind = credentialKind,
                        codexUsageState = codexUsageState,
                        onRefreshCodexUsage = onRefreshCodexUsage,
                        onSignOut = onSignOut,
                    )
                }
            }
            ChuchotageBottomBar(
                selectedTab = selectedTab,
                onTabSelected = { selectedTab = it },
            )
        }

        if (demoRecordingEnabled && demoRecordingState.shouldShowRecordingChrome) {
            Column(
                modifier = Modifier
                    .align(Alignment.TopEnd)
                    .statusBarsPadding()
                    .padding(top = 18.dp, end = 18.dp),
                horizontalAlignment = Alignment.End,
                verticalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                DemoCameraPreview(cameraFacing = demoCameraFacing)
                DemoCameraSwitchButton(
                    cameraFacing = demoCameraFacing,
                    onClick = { demoCameraFacing = demoCameraFacing.flipped() },
                )
            }
            DemoWatermark(
                modifier = Modifier
                    .align(Alignment.TopStart)
                    .statusBarsPadding()
                    .padding(top = 20.dp, start = 20.dp),
            )
        }
    }
}

@Composable
private fun TranslationControlScreen(
    state: TranslationState,
    inputVolume: Float,
    transcript: TranslationTranscript,
    demoRecordingState: DemoRecordingState,
    demoRecordingEnabled: Boolean,
    targetLanguage: TranslationLanguage,
    sourceTranscriptEnabled: Boolean,
    onToggle: () -> Unit,
    onDemoRecordingToggle: () -> Unit,
    onSourceTranscriptEnabledChange: (Boolean) -> Unit,
    onOutputLanguageChange: (TranslationLanguage) -> Unit,
) {
    val targetLanguageName = stringResource(targetLanguage.nameResId)
    val transcriptMode = state is TranslationState.Connecting ||
        state is TranslationState.Active ||
        state is TranslationState.Stopping
    var isLanguagePickerOpen by rememberSaveable { mutableStateOf(false) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(horizontal = 28.dp, vertical = 24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        BrandTitle()
        Spacer(modifier = Modifier.height(if (transcriptMode) 8.dp else 40.dp))
        OutputLanguageRouteButton(
            targetLanguageName = targetLanguageName,
            compact = transcriptMode,
            onClick = { isLanguagePickerOpen = true },
        )
        if (isLanguagePickerOpen) {
            LanguagePickerDialog(
                selected = targetLanguage,
                options = TranslationLanguages.supportedOutputLanguages,
                onSelected = { language ->
                    onOutputLanguageChange(language)
                    isLanguagePickerOpen = false
                },
                onDismiss = { isLanguagePickerOpen = false },
            )
        }
        if (transcriptMode) {
            Spacer(modifier = Modifier.height(8.dp))
            TranslationTranscriptPanes(
                transcript = transcript,
                sourceTranscriptEnabled = sourceTranscriptEnabled,
                onSourceTranscriptToggle = {
                    onSourceTranscriptEnabledChange(!sourceTranscriptEnabled)
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .widthIn(max = 520.dp)
                    .weight(1f),
            )
            Spacer(modifier = Modifier.height(8.dp))
            ActiveTranslationControls(
                state = state,
                inputVolume = inputVolume,
                demoRecordingState = demoRecordingState,
                demoRecordingEnabled = demoRecordingEnabled,
                onToggle = onToggle,
                onDemoRecordingToggle = onDemoRecordingToggle,
                modifier = Modifier
                    .fillMaxWidth()
                    .widthIn(max = 520.dp),
            )
        } else {
            Spacer(modifier = Modifier.height(18.dp))
            SignalWaveform(
                volume = inputVolume,
                active = state is TranslationState.Active,
                modifier = Modifier
                    .fillMaxWidth()
                    .widthIn(max = 300.dp)
                    .height(46.dp),
            )
            Spacer(modifier = Modifier.height(22.dp))
            TranslationButton(
                state = state,
                inputVolume = inputVolume,
                onClick = onToggle,
            )
            Spacer(modifier = Modifier.weight(1f))
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                if (demoRecordingEnabled) {
                    DemoRecordingButton(
                        demoRecordingState = demoRecordingState,
                        onClick = onDemoRecordingToggle,
                    )
                    Spacer(modifier = Modifier.height(10.dp))
                }
                StatusLine(state = state)
            }
        }
    }
}

@Composable
private fun ConversationTranslationScreen(
    state: TranslationState,
    inputVolume: Float,
    transcript: TranslationTranscript,
    settings: TranslationSettings,
    onConversationLanguageChange: (TranslationLanguage, TranslationLanguage) -> Unit,
    onConversationTurnSelected: (ConversationSpeaker, String) -> Unit,
    onStopTranslation: () -> Unit,
) {
    val localLanguage = settings.conversationLocalLanguage
    val partnerLanguage = settings.conversationPartnerLanguage
    val languagesConflict = localLanguage.code == partnerLanguage.code
    var activeSpeaker by rememberSaveable { mutableStateOf<ConversationSpeaker?>(null) }
    var localTranscript by rememberSaveable { mutableStateOf("") }
    var partnerTranscript by rememberSaveable { mutableStateOf("") }
    var lastObservedOutputText by rememberSaveable { mutableStateOf("") }
    val localLanguageName = stringResource(localLanguage.nameResId)
    val partnerLanguageName = stringResource(partnerLanguage.nameResId)

    fun selectSpeaker(speaker: ConversationSpeaker, targetLanguageCode: String) {
        if (languagesConflict || state is TranslationState.Stopping) return
        activeSpeaker = speaker
        lastObservedOutputText = ""
        onConversationTurnSelected(speaker, targetLanguageCode)
    }

    fun updateConversationLanguages(
        nextLocalLanguage: TranslationLanguage = localLanguage,
        nextPartnerLanguage: TranslationLanguage = partnerLanguage,
    ) {
        onConversationLanguageChange(nextLocalLanguage, nextPartnerLanguage)
        val active = activeSpeaker ?: return
        if (nextLocalLanguage.code == nextPartnerLanguage.code) {
            if (state.isRunning) onStopTranslation()
            return
        }
        if (!state.isRunning) return
        lastObservedOutputText = ""
        onConversationTurnSelected(
            active,
            active.targetLanguageCode(
                localLanguageCode = nextLocalLanguage.code,
                partnerLanguageCode = nextPartnerLanguage.code,
            ),
        )
    }

    LaunchedEffect(state.isRunning) {
        if (!state.isRunning) {
            activeSpeaker = null
            lastObservedOutputText = ""
        }
    }

    LaunchedEffect(activeSpeaker) {
        lastObservedOutputText = transcript.outputText
    }

    LaunchedEffect(transcript.outputText) {
        val speaker = activeSpeaker ?: return@LaunchedEffect
        val delta = transcript.outputText.deltaSince(lastObservedOutputText)
        lastObservedOutputText = transcript.outputText
        if (delta.isBlank()) return@LaunchedEffect
        if (speaker == ConversationSpeaker.Local) {
            partnerTranscript = partnerTranscript.appendConversationText(delta)
        } else {
            localTranscript = localTranscript.appendConversationText(delta)
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(horizontal = 18.dp, vertical = 14.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        ConversationTranscriptPanel(
            label = stringResource(R.string.conversation_partner_label),
            language = partnerLanguage,
            languageName = partnerLanguageName,
            text = partnerTranscript,
            active = activeSpeaker == ConversationSpeaker.Partner && state.isRunning,
            receiving = activeSpeaker == ConversationSpeaker.Local && state.isRunning,
            languageConflict = languagesConflict,
            placeholder = if (languagesConflict) {
                stringResource(R.string.conversation_choose_languages)
            } else {
                stringResource(R.string.conversation_waiting)
            },
            accent = ChuchotageBrand.Cream,
            inputVolume = inputVolume,
            state = state,
            onLanguageSelected = { updateConversationLanguages(nextPartnerLanguage = it) },
            onClick = {
                selectSpeaker(
                    speaker = ConversationSpeaker.Partner,
                    targetLanguageCode = localLanguage.code,
                )
            },
            modifier = Modifier
                .fillMaxWidth()
                .weight(1f)
                .rotate(180f),
        )
        ConversationCenterLine(
            state = state,
            activeSpeaker = activeSpeaker,
            localLanguageName = localLanguageName,
            partnerLanguageName = partnerLanguageName,
            languagesConflict = languagesConflict,
            onStopTranslation = onStopTranslation,
            modifier = Modifier.fillMaxWidth(),
        )
        ConversationTranscriptPanel(
            label = stringResource(R.string.conversation_local_label),
            language = localLanguage,
            languageName = localLanguageName,
            text = localTranscript,
            active = activeSpeaker == ConversationSpeaker.Local && state.isRunning,
            receiving = activeSpeaker == ConversationSpeaker.Partner && state.isRunning,
            languageConflict = languagesConflict,
            placeholder = if (languagesConflict) {
                stringResource(R.string.conversation_choose_languages)
            } else {
                stringResource(R.string.conversation_waiting)
            },
            accent = ChuchotageBrand.SignalBlueSoft,
            inputVolume = inputVolume,
            state = state,
            onLanguageSelected = { updateConversationLanguages(nextLocalLanguage = it) },
            onClick = {
                selectSpeaker(
                    speaker = ConversationSpeaker.Local,
                    targetLanguageCode = partnerLanguage.code,
                )
            },
            modifier = Modifier
                .fillMaxWidth()
                .weight(1f),
        )
    }
}

@Composable
private fun ConversationTranscriptPanel(
    label: String,
    language: TranslationLanguage,
    languageName: String,
    text: String,
    active: Boolean,
    receiving: Boolean,
    languageConflict: Boolean,
    placeholder: String,
    accent: Color,
    inputVolume: Float,
    state: TranslationState,
    onLanguageSelected: (TranslationLanguage) -> Unit,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val scrollState = rememberScrollState()
    val borderColor = when {
        active -> accent
        receiving -> ChuchotageBrand.SignalBlue
        languageConflict -> ChuchotageBrand.Error.copy(alpha = 0.7f)
        else -> ChuchotageBrand.Ring.copy(alpha = 0.78f)
    }
    val statusText = when {
        active -> stringResource(R.string.conversation_speaking)
        receiving -> stringResource(R.string.conversation_reading)
        else -> stringResource(R.string.conversation_tap_to_speak)
    }

    LaunchedEffect(text, scrollState.maxValue) {
        scrollState.animateScrollTo(scrollState.maxValue)
    }

    Column(
        modifier = modifier
            .clip(RoundedCornerShape(8.dp))
            .background(
                if (active) {
                    ChuchotageBrand.SurfaceRaised.copy(alpha = 0.82f)
                } else {
                    ChuchotageBrand.InkDeep.copy(alpha = 0.74f)
                },
            )
            .border(1.dp, borderColor, RoundedCornerShape(8.dp))
            .clickable(enabled = !languageConflict && state !is TranslationState.Stopping, onClick = onClick)
            .padding(horizontal = 14.dp, vertical = 12.dp),
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(10.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = label,
                    color = accent,
                    fontSize = 11.sp,
                    lineHeight = 14.sp,
                    fontWeight = FontWeight.Bold,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
                Text(
                    text = statusText,
                    color = if (active || receiving) ChuchotageBrand.Text else ChuchotageBrand.Muted,
                    fontSize = 12.sp,
                    lineHeight = 16.sp,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
            }
            ConversationLanguageButton(
                selected = language,
                selectedName = languageName,
                accent = accent,
                onSelected = onLanguageSelected,
            )
        }
        Spacer(modifier = Modifier.height(8.dp))
        if (active) {
            SignalWaveform(
                volume = inputVolume,
                active = state is TranslationState.Active,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(24.dp),
            )
            Spacer(modifier = Modifier.height(6.dp))
        }
        Box(modifier = Modifier.fillMaxSize()) {
            if (text.isBlank()) {
                Text(
                    text = placeholder,
                    color = if (languageConflict) ChuchotageBrand.Error else ChuchotageBrand.Muted,
                    fontSize = 15.sp,
                    lineHeight = 20.sp,
                    modifier = Modifier
                        .align(Alignment.Center)
                        .padding(horizontal = 18.dp),
                    textAlign = TextAlign.Center,
                )
            } else {
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .verticalScroll(scrollState),
                ) {
                    Text(
                        text = text,
                        color = ChuchotageBrand.Text,
                        fontSize = 20.sp,
                        lineHeight = 26.sp,
                        fontWeight = FontWeight.SemiBold,
                    )
                }
            }
        }
    }
}

@Composable
private fun ConversationLanguageButton(
    selected: TranslationLanguage,
    selectedName: String,
    accent: Color,
    onSelected: (TranslationLanguage) -> Unit,
) {
    var isOpen by rememberSaveable { mutableStateOf(false) }

    OutlinedButton(
        onClick = { isOpen = true },
        modifier = Modifier.height(38.dp),
        shape = RoundedCornerShape(19.dp),
        border = BorderStroke(1.dp, accent.copy(alpha = 0.58f)),
        colors = ButtonDefaults.outlinedButtonColors(
            containerColor = ChuchotageBrand.Surface.copy(alpha = 0.62f),
            contentColor = ChuchotageBrand.Text,
        ),
        contentPadding = PaddingValues(horizontal = 12.dp),
    ) {
        Text(
            text = selectedName,
            fontSize = 13.sp,
            lineHeight = 16.sp,
            fontWeight = FontWeight.Bold,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
        )
    }

    if (isOpen) {
        LanguagePickerDialog(
            selected = selected,
            options = TranslationLanguages.supportedOutputLanguages,
            onSelected = { language ->
                onSelected(language)
                isOpen = false
            },
            onDismiss = { isOpen = false },
        )
    }
}

@Composable
private fun ConversationCenterLine(
    state: TranslationState,
    activeSpeaker: ConversationSpeaker?,
    localLanguageName: String,
    partnerLanguageName: String,
    languagesConflict: Boolean,
    onStopTranslation: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val routeText = when {
        languagesConflict -> stringResource(R.string.conversation_choose_languages)
        activeSpeaker == ConversationSpeaker.Local && state.isRunning ->
            stringResource(R.string.conversation_route_label, localLanguageName, partnerLanguageName)
        activeSpeaker == ConversationSpeaker.Partner && state.isRunning ->
            stringResource(R.string.conversation_route_label, partnerLanguageName, localLanguageName)
        else -> stringResource(R.string.conversation_tap_to_speak)
    }

    Box(
        modifier = modifier.height(66.dp),
        contentAlignment = Alignment.Center,
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(1.dp)
                .background(ChuchotageBrand.Ring.copy(alpha = 0.8f)),
        )
        Row(
            modifier = Modifier
                .fillMaxWidth(0.94f)
                .clip(RoundedCornerShape(8.dp))
                .background(ChuchotageBrand.InkDeep)
                .border(1.dp, ChuchotageBrand.Ring.copy(alpha = 0.82f), RoundedCornerShape(8.dp))
                .padding(horizontal = 10.dp, vertical = 8.dp),
            horizontalArrangement = Arrangement.spacedBy(10.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            ConversationFacesGlyph(
                color = if (state.isRunning) ChuchotageBrand.SignalBlueSoft else ChuchotageBrand.Muted,
                active = state.isRunning,
                modifier = Modifier.size(28.dp),
            )
            Text(
                modifier = Modifier.weight(1f),
                text = routeText,
                color = if (languagesConflict) ChuchotageBrand.Error else ChuchotageBrand.Text,
                fontSize = 12.sp,
                lineHeight = 16.sp,
                fontWeight = FontWeight.SemiBold,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
                textAlign = TextAlign.Center,
            )
            if (state.isRunning) {
                TextButton(
                    onClick = onStopTranslation,
                    contentPadding = PaddingValues(horizontal = 8.dp, vertical = 0.dp),
                    colors = ButtonDefaults.textButtonColors(contentColor = ChuchotageBrand.Error),
                ) {
                    Text(
                        text = stringResource(R.string.button_stop_translation),
                        fontSize = 12.sp,
                        lineHeight = 16.sp,
                        fontWeight = FontWeight.Bold,
                    )
                }
            }
        }
    }
}

@Composable
private fun OutputLanguageRouteButton(
    targetLanguageName: String,
    compact: Boolean,
    onClick: () -> Unit,
) {
    TextButton(
        onClick = onClick,
        modifier = Modifier
            .fillMaxWidth()
            .widthIn(max = 520.dp),
        contentPadding = PaddingValues(horizontal = 12.dp, vertical = if (compact) 2.dp else 4.dp),
        colors = ButtonDefaults.textButtonColors(
            contentColor = ChuchotageBrand.SignalBlueSoft,
        ),
    ) {
        Text(
            text = stringResource(R.string.translation_route_label, targetLanguageName),
            fontSize = if (compact) 14.sp else 18.sp,
            lineHeight = if (compact) 18.sp else 24.sp,
            fontWeight = FontWeight.SemiBold,
            textAlign = TextAlign.Center,
            maxLines = 2,
            overflow = TextOverflow.Ellipsis,
        )
    }
}

@Composable
private fun ActiveTranslationControls(
    state: TranslationState,
    inputVolume: Float,
    demoRecordingState: DemoRecordingState,
    demoRecordingEnabled: Boolean,
    onToggle: () -> Unit,
    onDemoRecordingToggle: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Row(
        modifier = modifier,
        horizontalArrangement = Arrangement.spacedBy(12.dp),
        verticalAlignment = Alignment.Bottom,
    ) {
        Column(
            modifier = Modifier.weight(1f),
            horizontalAlignment = Alignment.Start,
        ) {
            StatusLine(
                state = state,
                modifier = Modifier.fillMaxWidth(),
            )
            if (demoRecordingEnabled) {
                Spacer(modifier = Modifier.height(8.dp))
                DemoRecordingButton(
                    demoRecordingState = demoRecordingState,
                    onClick = onDemoRecordingToggle,
                )
            }
        }
        MiniTranslationButton(
            state = state,
            inputVolume = inputVolume,
            onClick = onToggle,
        )
    }
}

@Composable
private fun TranslationSettingsScreen(
    settings: TranslationSettings,
    onAudioInputSourceChange: (AudioInputSource) -> Unit,
    onAudioOutputRouteChange: (AudioOutputRoute) -> Unit,
    onDeviceAudioDuckingChange: (Boolean) -> Unit,
    onFocusBackgroundChange: (Boolean) -> Unit,
    onHeadsetAutoStartChange: (Boolean) -> Unit,
    onOutputLanguageChange: (TranslationLanguage) -> Unit,
    onOpenWebsite: () -> Unit,
    onOpenSupportedInputLanguages: () -> Unit,
    onOpenPrivacyPolicy: () -> Unit,
    credentialKind: OpenAiCredentialKind?,
    codexUsageState: CodexUsageUiState,
    onRefreshCodexUsage: () -> Unit,
    onSignOut: () -> Unit,
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 28.dp, vertical = 24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Top,
    ) {
        BrandTitle(label = stringResource(R.string.settings_title))
        Spacer(modifier = Modifier.height(42.dp))
        Text(
            text = stringResource(R.string.output_language_title),
            color = ChuchotageBrand.Text,
            fontSize = 18.sp,
            fontWeight = FontWeight.Bold,
            modifier = Modifier
                .fillMaxWidth()
                .widthIn(max = 520.dp),
        )
        Spacer(modifier = Modifier.height(6.dp))
        Text(
            text = stringResource(R.string.output_language_body),
            color = ChuchotageBrand.Muted,
            fontSize = 14.sp,
            lineHeight = 20.sp,
            modifier = Modifier
                .fillMaxWidth()
                .widthIn(max = 520.dp),
        )
        ExternalLinkButton(
            text = stringResource(R.string.supported_input_languages_link),
            onClick = onOpenSupportedInputLanguages,
        )
        Spacer(modifier = Modifier.height(12.dp))
        LanguageSelector(
            selected = settings.targetLanguage,
            options = TranslationLanguages.supportedOutputLanguages,
            onSelected = onOutputLanguageChange,
        )
        Spacer(modifier = Modifier.height(30.dp))
        AudioInputSettingsSection(
            settings = settings,
            onSelected = onAudioInputSourceChange,
            onHeadsetAutoStartChange = onHeadsetAutoStartChange,
        )
        if (settings.audioInputSource == AudioInputSource.DeviceAudio) {
            Spacer(modifier = Modifier.height(30.dp))
            DeviceAudioOptionsSection(
                settings = settings,
                onDuckingEnabledChange = onDeviceAudioDuckingChange,
            )
        }
        Spacer(modifier = Modifier.height(30.dp))
        AudioOutputSettingsSection(
            audioInputSource = settings.audioInputSource,
            selected = settings.audioOutputRoute,
            focusBackgroundEnabled = settings.focusBackgroundEnabled,
            onSelected = onAudioOutputRouteChange,
            onFocusBackgroundChange = onFocusBackgroundChange,
        )
        Spacer(modifier = Modifier.height(30.dp))
        AccountSection(
            credentialKind = credentialKind,
            codexUsageState = codexUsageState,
            onRefreshCodexUsage = onRefreshCodexUsage,
            onSignOut = onSignOut,
        )
        Spacer(modifier = Modifier.height(18.dp))
        ExternalLinksRow(
            onOpenWebsite = onOpenWebsite,
            onOpenPrivacyPolicy = onOpenPrivacyPolicy,
        )
    }
}

private sealed interface CodexUsageUiState {
    data object Unavailable : CodexUsageUiState
    data object Loading : CodexUsageUiState
    data class Loaded(val snapshot: CodexUsageSnapshot) : CodexUsageUiState
    data class Error(val message: String) : CodexUsageUiState
}

@Composable
private fun AudioInputSettingsSection(
    settings: TranslationSettings,
    onSelected: (AudioInputSource) -> Unit,
    onHeadsetAutoStartChange: (Boolean) -> Unit,
) {
    Text(
        text = stringResource(R.string.audio_source_title),
        color = ChuchotageBrand.Text,
        fontSize = 18.sp,
        fontWeight = FontWeight.Bold,
        modifier = Modifier
            .fillMaxWidth()
            .widthIn(max = 520.dp),
    )
    Spacer(modifier = Modifier.height(10.dp))
    AudioInputSourceSelector(
        selected = settings.audioInputSource,
        onSelected = onSelected,
    )
    Spacer(modifier = Modifier.height(12.dp))
    Text(
        text = stringResource(R.string.audio_source_body),
        color = ChuchotageBrand.Muted,
        fontSize = 14.sp,
        lineHeight = 20.sp,
        modifier = Modifier
            .fillMaxWidth()
            .widthIn(max = 520.dp),
    )
    Spacer(modifier = Modifier.height(14.dp))
    AudioInputSourceGuidance(
        title = stringResource(R.string.phone_mic),
        body = stringResource(R.string.phone_mic_guidance),
    )
    Spacer(modifier = Modifier.height(10.dp))
    AudioInputSourceGuidance(
        title = stringResource(R.string.headset_mic),
        body = stringResource(R.string.headset_mic_guidance),
    )
    Spacer(modifier = Modifier.height(10.dp))
    AudioInputSourceGuidance(
        title = stringResource(R.string.device_audio),
        body = stringResource(R.string.device_audio_guidance),
    )
    if (settings.audioInputSource == AudioInputSource.Headset) {
        Spacer(modifier = Modifier.height(18.dp))
        HeadsetAutoStartOption(
            enabled = settings.headsetAutoStartEnabled,
            onEnabledChange = onHeadsetAutoStartChange,
        )
    }
}

@Composable
private fun DeviceAudioOptionsSection(
    settings: TranslationSettings,
    onDuckingEnabledChange: (Boolean) -> Unit,
) {
    Text(
        text = stringResource(R.string.device_audio_options_title),
        color = ChuchotageBrand.Text,
        fontSize = 18.sp,
        fontWeight = FontWeight.Bold,
        modifier = Modifier
            .fillMaxWidth()
            .widthIn(max = 520.dp),
    )
    Spacer(modifier = Modifier.height(10.dp))
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .widthIn(max = 520.dp),
        horizontalArrangement = Arrangement.spacedBy(16.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = stringResource(R.string.device_audio_ducking_title),
                color = ChuchotageBrand.Text,
                fontSize = 15.sp,
                fontWeight = FontWeight.Bold,
                lineHeight = 20.sp,
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = stringResource(R.string.device_audio_ducking_body),
                color = ChuchotageBrand.Muted,
                fontSize = 13.sp,
                lineHeight = 18.sp,
            )
        }
        Switch(
            checked = settings.deviceAudioDuckingEnabled,
            onCheckedChange = onDuckingEnabledChange,
        )
    }
}

@Composable
private fun HeadsetAutoStartOption(
    enabled: Boolean,
    onEnabledChange: (Boolean) -> Unit,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .widthIn(max = 520.dp),
        horizontalArrangement = Arrangement.spacedBy(16.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = stringResource(R.string.headset_auto_start_title),
                color = ChuchotageBrand.Text,
                fontSize = 15.sp,
                fontWeight = FontWeight.Bold,
                lineHeight = 20.sp,
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = stringResource(R.string.headset_auto_start_body),
                color = ChuchotageBrand.Muted,
                fontSize = 13.sp,
                lineHeight = 18.sp,
            )
        }
        Switch(
            checked = enabled,
            onCheckedChange = onEnabledChange,
        )
    }
}

@Composable
private fun AudioOutputSettingsSection(
    audioInputSource: AudioInputSource,
    selected: AudioOutputRoute,
    focusBackgroundEnabled: Boolean,
    onSelected: (AudioOutputRoute) -> Unit,
    onFocusBackgroundChange: (Boolean) -> Unit,
) {
    val context = LocalContext.current
    val headsetPlaybackAvailable = AudioDevices.isHeadsetPlaybackAvailable(context)
    val focusBackgroundAvailable = selected != AudioOutputRoute.PhoneSpeaker && headsetPlaybackAvailable

    Text(
        text = stringResource(R.string.audio_output_title),
        color = ChuchotageBrand.Text,
        fontSize = 18.sp,
        fontWeight = FontWeight.Bold,
        modifier = Modifier
            .fillMaxWidth()
            .widthIn(max = 520.dp),
    )
    Spacer(modifier = Modifier.height(6.dp))
    Text(
        text = stringResource(R.string.audio_output_body),
        color = ChuchotageBrand.Muted,
        fontSize = 14.sp,
        lineHeight = 20.sp,
        modifier = Modifier
            .fillMaxWidth()
            .widthIn(max = 520.dp),
    )
    Spacer(modifier = Modifier.height(12.dp))
    AudioOutputRouteSelector(
        selected = selected,
        onSelected = onSelected,
    )
    Spacer(modifier = Modifier.height(18.dp))
    FocusBackgroundOption(
        enabled = focusBackgroundEnabled,
        available = focusBackgroundAvailable,
        onEnabledChange = onFocusBackgroundChange,
    )
    if (
        TranslationSettings(
            audioInputSource = audioInputSource,
            audioOutputRoute = selected,
        ).hasAudioFeedbackRisk(headsetPlaybackAvailable)
    ) {
        Spacer(modifier = Modifier.height(10.dp))
        Text(
            text = stringResource(R.string.audio_feedback_warning),
            color = ChuchotageBrand.Error,
            fontSize = 13.sp,
            lineHeight = 18.sp,
            modifier = Modifier
                .fillMaxWidth()
                .widthIn(max = 520.dp),
        )
    }
}

@Composable
private fun FocusBackgroundOption(
    enabled: Boolean,
    available: Boolean,
    onEnabledChange: (Boolean) -> Unit,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .widthIn(max = 520.dp),
        horizontalArrangement = Arrangement.spacedBy(16.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = stringResource(R.string.focus_background_title),
                color = if (available) ChuchotageBrand.Text else ChuchotageBrand.Muted,
                fontSize = 15.sp,
                fontWeight = FontWeight.Bold,
                lineHeight = 20.sp,
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = stringResource(R.string.focus_background_body),
                color = ChuchotageBrand.Muted,
                fontSize = 13.sp,
                lineHeight = 18.sp,
            )
        }
        Switch(
            checked = enabled,
            enabled = available,
            onCheckedChange = onEnabledChange,
        )
    }
}

@Composable
private fun AudioFeedbackGuardDialog(
    onStartAnyway: () -> Unit,
    onUseHeadphones: () -> Unit,
    onDismiss: () -> Unit,
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        containerColor = ChuchotageBrand.Surface,
        titleContentColor = ChuchotageBrand.Text,
        textContentColor = ChuchotageBrand.Text,
        title = { Text(stringResource(R.string.audio_feedback_title)) },
        text = {
            Text(
                text = stringResource(R.string.audio_feedback_warning),
                color = ChuchotageBrand.Text,
                fontSize = 14.sp,
                lineHeight = 20.sp,
            )
        },
        confirmButton = {
            TextButton(
                onClick = onStartAnyway,
                colors = ButtonDefaults.textButtonColors(contentColor = ChuchotageBrand.SignalBlueSoft),
            ) {
                Text(stringResource(R.string.audio_feedback_start_anyway))
            }
        },
        dismissButton = {
            TextButton(
                onClick = onUseHeadphones,
                colors = ButtonDefaults.textButtonColors(contentColor = ChuchotageBrand.Text),
            ) {
                Text(stringResource(R.string.audio_feedback_use_headphones))
            }
        },
    )
}

@Composable
private fun StartPermissionNudgeDialog(
    nudge: StartPermissionNudge,
    onPrimaryAction: () -> Unit,
    onDismiss: () -> Unit,
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        containerColor = ChuchotageBrand.Surface,
        titleContentColor = ChuchotageBrand.Text,
        textContentColor = ChuchotageBrand.Text,
        title = { Text(stringResource(nudge.titleResId)) },
        text = {
            Text(
                text = stringResource(nudge.bodyResId),
                color = ChuchotageBrand.Text,
                fontSize = 14.sp,
                lineHeight = 20.sp,
            )
        },
        confirmButton = {
            TextButton(
                onClick = onPrimaryAction,
                colors = ButtonDefaults.textButtonColors(contentColor = ChuchotageBrand.SignalBlueSoft),
            ) {
                Text(stringResource(nudge.primaryActionResId))
            }
        },
        dismissButton = {
            TextButton(
                onClick = onDismiss,
                colors = ButtonDefaults.textButtonColors(contentColor = ChuchotageBrand.Text),
            ) {
                Text(stringResource(R.string.permission_action_not_now))
            }
        },
    )
}

@Composable
private fun AudioInputSourceGuidance(
    title: String,
    body: String,
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .widthIn(max = 520.dp),
    ) {
        Text(
            text = title,
            color = ChuchotageBrand.Text,
            fontSize = 14.sp,
            lineHeight = 20.sp,
            fontWeight = FontWeight.Bold,
        )
        Text(
            text = body,
            color = ChuchotageBrand.Muted,
            fontSize = 13.sp,
            lineHeight = 18.sp,
        )
    }
}

@Composable
private fun AccountSection(
    credentialKind: OpenAiCredentialKind?,
    codexUsageState: CodexUsageUiState,
    onRefreshCodexUsage: () -> Unit,
    onSignOut: () -> Unit,
) {
    Text(
        text = stringResource(R.string.account_title),
        color = ChuchotageBrand.Text,
        fontSize = 18.sp,
        fontWeight = FontWeight.Bold,
        modifier = Modifier
            .fillMaxWidth()
            .widthIn(max = 520.dp),
    )
    Spacer(modifier = Modifier.height(10.dp))
    if (credentialKind == OpenAiCredentialKind.CHATGPT_ACCESS_TOKEN) {
        CodexUsageLeftBar(
            state = codexUsageState,
            onRefresh = onRefreshCodexUsage,
        )
    } else {
        val accountText = when (credentialKind) {
            OpenAiCredentialKind.SPONSORED_TRIAL -> stringResource(R.string.account_sponsored_trial_signed_in)
            else -> stringResource(R.string.account_api_key_signed_in)
        }
        Text(
            text = accountText,
            color = ChuchotageBrand.Muted,
            fontSize = 14.sp,
            lineHeight = 20.sp,
            modifier = Modifier
                .fillMaxWidth()
                .widthIn(max = 520.dp),
        )
    }
    Spacer(modifier = Modifier.height(16.dp))
    OutlinedButton(
        onClick = onSignOut,
        modifier = Modifier
            .fillMaxWidth()
            .widthIn(max = 520.dp)
            .height(50.dp),
        shape = RoundedCornerShape(25.dp),
        border = BorderStroke(1.dp, ChuchotageBrand.Error.copy(alpha = 0.72f)),
        colors = ButtonDefaults.outlinedButtonColors(
            containerColor = ChuchotageBrand.Surface.copy(alpha = 0.36f),
            contentColor = ChuchotageBrand.Error,
        ),
    ) {
        Text(
            text = stringResource(R.string.sign_out),
            fontSize = 15.sp,
            fontWeight = FontWeight.Bold,
        )
    }
}

@Composable
private fun CodexUsageLeftBar(
    state: CodexUsageUiState,
    onRefresh: () -> Unit,
) {
    val fraction = when (state) {
        is CodexUsageUiState.Loaded -> state.snapshot.remainingFraction
            ?: if (state.snapshot.unlimitedCredits || state.snapshot.hasCredits == true) 1f else 0f
        CodexUsageUiState.Loading -> 0.18f
        is CodexUsageUiState.Error,
        CodexUsageUiState.Unavailable -> 0f
    }.coerceIn(0f, 1f)
    val percentage = when (state) {
        is CodexUsageUiState.Loaded -> state.snapshot.usagePercentLabel()
        else -> null
    }
    val status = when (state) {
        CodexUsageUiState.Loading -> stringResource(R.string.codex_usage_checking)
        is CodexUsageUiState.Error -> state.message
        CodexUsageUiState.Unavailable -> stringResource(R.string.codex_usage_unavailable)
        is CodexUsageUiState.Loaded -> null
    }

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .widthIn(max = 520.dp)
            .clip(RoundedCornerShape(8.dp))
            .background(ChuchotageBrand.Surface.copy(alpha = 0.78f))
            .border(1.dp, ChuchotageBrand.Ring.copy(alpha = 0.74f), RoundedCornerShape(8.dp))
            .padding(16.dp),
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(
                text = stringResource(R.string.codex_usage_left),
                color = ChuchotageBrand.Muted,
                fontSize = 12.sp,
                lineHeight = 16.sp,
                fontWeight = FontWeight.Bold,
            )
            TextButton(
                onClick = onRefresh,
                enabled = state !is CodexUsageUiState.Loading,
                colors = ButtonDefaults.textButtonColors(
                    contentColor = ChuchotageBrand.SignalBlueSoft,
                    disabledContentColor = ChuchotageBrand.Muted,
                ),
                contentPadding = PaddingValues(horizontal = 8.dp, vertical = 0.dp),
            ) {
                Text(
                    text = stringResource(R.string.refresh),
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Bold,
                )
            }
        }
        Spacer(modifier = Modifier.height(8.dp))
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            UsageBar(
                fraction = fraction,
                error = state is CodexUsageUiState.Error,
                modifier = Modifier
                    .weight(1f)
                    .height(10.dp),
            )
            percentage?.let {
                Text(
                    text = it,
                    color = ChuchotageBrand.Text,
                    fontSize = 14.sp,
                    lineHeight = 18.sp,
                    fontWeight = FontWeight.Bold,
                )
            }
        }
        status?.let {
            Spacer(modifier = Modifier.height(10.dp))
            Text(
                text = it,
                color = if (state is CodexUsageUiState.Error) ChuchotageBrand.Error else ChuchotageBrand.Muted,
                fontSize = 13.sp,
                lineHeight = 18.sp,
            )
        }
    }
}

@Composable
private fun UsageBar(
    fraction: Float,
    error: Boolean,
    modifier: Modifier = Modifier,
) {
    Canvas(modifier = modifier) {
        val radius = size.height / 2f
        drawRoundRect(
            color = ChuchotageBrand.Ring.copy(alpha = 0.7f),
            size = size,
            cornerRadius = CornerRadius(radius, radius),
        )
        drawRoundRect(
            color = if (error) ChuchotageBrand.Error else ChuchotageBrand.SignalBlue,
            size = Size(size.width * fraction, size.height),
            cornerRadius = CornerRadius(radius, radius),
        )
    }
}

private fun CodexUsageSnapshot.usagePercentLabel(): String {
    remainingPercent?.let { return "$it%" }
    return when {
        unlimitedCredits || hasCredits == true -> "100%"
        hasCredits == false -> "0%"
        else -> "--%"
    }
}

@Composable
private fun LanguageSelector(
    selected: TranslationLanguage,
    options: List<TranslationLanguage>,
    onSelected: (TranslationLanguage) -> Unit,
) {
    var isOpen by rememberSaveable { mutableStateOf(false) }
    val selectedName = stringResource(selected.nameResId)

    OutlinedButton(
        onClick = { isOpen = true },
        modifier = Modifier
            .fillMaxWidth()
            .widthIn(max = 520.dp)
            .height(52.dp),
        colors = ButtonDefaults.outlinedButtonColors(
            containerColor = ChuchotageBrand.Surface.copy(alpha = 0.82f),
            contentColor = ChuchotageBrand.Text,
        ),
    ) {
        Text(
            text = stringResource(R.string.language_with_code, selectedName, selected.code),
            fontSize = 16.sp,
            fontWeight = FontWeight.Bold,
        )
    }

    if (isOpen) {
        LanguagePickerDialog(
            selected = selected,
            options = options,
            onSelected = { language ->
                onSelected(language)
                isOpen = false
            },
            onDismiss = { isOpen = false },
        )
    }
}

@Composable
private fun LanguagePickerDialog(
    selected: TranslationLanguage,
    options: List<TranslationLanguage>,
    onSelected: (TranslationLanguage) -> Unit,
    onDismiss: () -> Unit,
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        containerColor = ChuchotageBrand.Surface,
        titleContentColor = ChuchotageBrand.Text,
        textContentColor = ChuchotageBrand.Text,
        title = { Text(stringResource(R.string.output_language_title)) },
        text = {
            LazyColumn(modifier = Modifier.heightIn(max = 420.dp)) {
                items(options) { language ->
                    val languageName = stringResource(language.nameResId)
                    TextButton(
                        onClick = {
                            onSelected(language)
                        },
                        modifier = Modifier.fillMaxWidth(),
                        colors = ButtonDefaults.textButtonColors(
                            contentColor = if (language == selected) {
                                ChuchotageBrand.SignalBlueSoft
                            } else {
                                ChuchotageBrand.Text
                            },
                        ),
                    ) {
                        Text(
                            text = stringResource(R.string.language_with_code, languageName, language.code),
                            modifier = Modifier.fillMaxWidth(),
                            textAlign = TextAlign.Start,
                        )
                    }
                }
            }
        },
        confirmButton = {},
    )
}

@Composable
private fun AudioInputSourceSelector(
    selected: AudioInputSource,
    onSelected: (AudioInputSource) -> Unit,
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .widthIn(max = 520.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        SettingsChoiceButton(
            text = stringResource(R.string.phone_mic),
            selected = selected == AudioInputSource.Phone,
            enabled = true,
            onClick = { onSelected(AudioInputSource.Phone) },
            modifier = Modifier.fillMaxWidth(),
        )
        SettingsChoiceButton(
            text = stringResource(R.string.headset_mic),
            selected = selected == AudioInputSource.Headset,
            enabled = true,
            onClick = { onSelected(AudioInputSource.Headset) },
            modifier = Modifier.fillMaxWidth(),
        )
        SettingsChoiceButton(
            text = stringResource(R.string.device_audio),
            selected = selected == AudioInputSource.DeviceAudio,
            enabled = Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q,
            onClick = { onSelected(AudioInputSource.DeviceAudio) },
            modifier = Modifier.fillMaxWidth(),
        )
    }
}

@Composable
private fun DemoRecordingButton(
    demoRecordingState: DemoRecordingState,
    onClick: () -> Unit,
) {
    val isActive = demoRecordingState.shouldShowRecordingChrome
    val label = when (demoRecordingState.status) {
        DemoRecordingStatus.Starting -> stringResource(R.string.demo_record_starting)
        DemoRecordingStatus.Recording -> stringResource(R.string.demo_record_stop)
        DemoRecordingStatus.Saved -> stringResource(R.string.demo_record_share)
        DemoRecordingStatus.Error -> stringResource(R.string.demo_record_error)
        DemoRecordingStatus.Idle -> stringResource(R.string.demo_record_start)
    }

    OutlinedButton(
        onClick = onClick,
        modifier = Modifier
            .fillMaxWidth()
            .widthIn(max = 280.dp)
            .height(42.dp),
        shape = RoundedCornerShape(21.dp),
        border = BorderStroke(
            1.dp,
            if (isActive) ChuchotageBrand.Error.copy(alpha = 0.78f) else ChuchotageBrand.Ring,
        ),
        colors = ButtonDefaults.outlinedButtonColors(
            containerColor = if (isActive) {
                ChuchotageBrand.Error.copy(alpha = 0.12f)
            } else {
                ChuchotageBrand.Surface.copy(alpha = 0.46f)
            },
            contentColor = if (isActive) ChuchotageBrand.Error else ChuchotageBrand.SignalBlueSoft,
        ),
        contentPadding = PaddingValues(horizontal = 14.dp),
    ) {
        Canvas(modifier = Modifier.size(9.dp)) {
            drawCircle(color = if (isActive) ChuchotageBrand.Error else ChuchotageBrand.SignalBlueSoft)
        }
        Spacer(modifier = Modifier.size(9.dp))
        Text(
            text = label,
            fontSize = 13.sp,
            lineHeight = 16.sp,
            fontWeight = FontWeight.Bold,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
        )
    }
}

@Composable
private fun TranslationTranscriptPanes(
    transcript: TranslationTranscript,
    sourceTranscriptEnabled: Boolean,
    onSourceTranscriptToggle: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val translatedText = transcript.outputText.trim()
    val originalText = transcript.inputText.trim()
    val originalLabel = stringResource(R.string.transcript_original_label)

    Column(
        modifier = modifier,
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        TranscriptWindow(
            label = stringResource(R.string.transcript_translated_label),
            text = translatedText,
            placeholder = stringResource(R.string.transcript_translated_waiting),
            primary = true,
            modifier = Modifier
                .fillMaxWidth()
                .weight(if (sourceTranscriptEnabled) 1.1f else 1f),
        )
        if (sourceTranscriptEnabled) {
            TranscriptWindow(
                label = originalLabel,
                text = originalText,
                placeholder = stringResource(R.string.transcript_original_waiting),
                primary = false,
                snapToLatest = true,
                modifier = Modifier
                    .fillMaxWidth()
                    .weight(1f)
                    .clickable(onClick = onSourceTranscriptToggle),
            )
        } else {
            CollapsedTranscriptWindow(
                label = originalLabel,
                onClick = onSourceTranscriptToggle,
                modifier = Modifier.fillMaxWidth(),
            )
        }
    }
}

@Composable
private fun CollapsedTranscriptWindow(
    label: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Row(
        modifier = modifier
            .height(44.dp)
            .clip(RoundedCornerShape(8.dp))
            .background(ChuchotageBrand.InkDeep.copy(alpha = 0.62f))
            .border(1.dp, ChuchotageBrand.Ring.copy(alpha = 0.74f), RoundedCornerShape(8.dp))
            .clickable(onClick = onClick)
            .padding(horizontal = 14.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(
            text = label,
            color = ChuchotageBrand.Cream,
            fontSize = 11.sp,
            lineHeight = 14.sp,
            fontWeight = FontWeight.Bold,
        )
    }
}

@Composable
private fun TranscriptWindow(
    label: String,
    text: String,
    placeholder: String,
    primary: Boolean,
    snapToLatest: Boolean = false,
    modifier: Modifier = Modifier,
) {
    val scrollState = rememberScrollState()

    LaunchedEffect(text, scrollState.maxValue) {
        if (snapToLatest) {
            scrollState.scrollTo(scrollState.maxValue)
        } else {
            scrollState.animateScrollTo(scrollState.maxValue)
        }
    }

    Column(
        modifier = modifier
            .clip(RoundedCornerShape(8.dp))
            .background(ChuchotageBrand.InkDeep.copy(alpha = if (primary) 0.82f else 0.68f))
            .border(
                width = 1.dp,
                color = if (primary) {
                    ChuchotageBrand.SignalBlue.copy(alpha = 0.52f)
                } else {
                    ChuchotageBrand.Ring.copy(alpha = 0.74f)
                },
                shape = RoundedCornerShape(8.dp),
            )
            .padding(horizontal = 14.dp, vertical = 12.dp),
    ) {
        Text(
            text = label,
            color = if (primary) ChuchotageBrand.SignalBlueSoft else ChuchotageBrand.Cream,
            fontSize = 11.sp,
            lineHeight = 14.sp,
            fontWeight = FontWeight.Bold,
        )
        Spacer(modifier = Modifier.height(8.dp))
        Box(modifier = Modifier.fillMaxSize()) {
            if (text.isBlank()) {
                Text(
                    text = placeholder,
                    color = ChuchotageBrand.Muted,
                    fontSize = 14.sp,
                    lineHeight = 19.sp,
                    modifier = Modifier.align(Alignment.Center),
                    textAlign = TextAlign.Center,
                )
            } else {
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .verticalScroll(scrollState),
                ) {
                    Text(
                        text = text,
                        color = if (primary) ChuchotageBrand.Text else ChuchotageBrand.Muted,
                        fontSize = if (primary) 16.sp else 14.sp,
                        lineHeight = if (primary) 21.sp else 19.sp,
                        fontWeight = if (primary) FontWeight.SemiBold else FontWeight.Normal,
                    )
                }
            }
        }
    }
}

@Composable
private fun DemoWatermark(modifier: Modifier = Modifier) {
    Text(
        text = "chuchotage.ai",
        modifier = modifier
            .clip(RoundedCornerShape(8.dp))
            .background(ChuchotageBrand.InkDeep.copy(alpha = 0.62f))
            .border(1.dp, ChuchotageBrand.Ring.copy(alpha = 0.42f), RoundedCornerShape(8.dp))
            .padding(horizontal = 10.dp, vertical = 6.dp),
        color = ChuchotageBrand.Cream,
        fontSize = 12.sp,
        lineHeight = 14.sp,
        fontWeight = FontWeight.Bold,
    )
}

@Composable
private fun DemoCameraPreview(
    cameraFacing: DemoCameraFacing,
    modifier: Modifier = Modifier,
) {
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current
    val cameraProviderFuture = remember(context) { ProcessCameraProvider.getInstance(context) }
    val mainExecutor = remember(context) { ContextCompat.getMainExecutor(context) }
    val previewView = remember(context) {
        PreviewView(context).apply {
            scaleType = PreviewView.ScaleType.FILL_CENTER
            implementationMode = PreviewView.ImplementationMode.COMPATIBLE
        }
    }

    DisposableEffect(cameraProviderFuture, lifecycleOwner, previewView, cameraFacing) {
        var disposed = false
        cameraProviderFuture.addListener(
            {
                if (!disposed) {
                    runCatching {
                        val cameraProvider = cameraProviderFuture.get()
                        val requestedSelector = cameraFacing.cameraSelector
                        val fallbackSelector = cameraFacing.flipped().cameraSelector
                        val cameraSelector = when {
                            cameraProvider.hasCamera(requestedSelector) -> requestedSelector
                            cameraProvider.hasCamera(fallbackSelector) -> fallbackSelector
                            else -> return@runCatching
                        }
                        val preview = Preview.Builder().build().also {
                            it.setSurfaceProvider(previewView.surfaceProvider)
                        }
                        cameraProvider.unbindAll()
                        cameraProvider.bindToLifecycle(
                            lifecycleOwner,
                            cameraSelector,
                            preview,
                        )
                    }
                }
            },
            mainExecutor,
        )
        onDispose {
            disposed = true
            cameraProviderFuture.addListener(
                {
                    runCatching { cameraProviderFuture.get().unbindAll() }
                },
                mainExecutor,
            )
        }
    }

    AndroidView(
        modifier = modifier
            .size(width = 108.dp, height = 144.dp)
            .clip(RoundedCornerShape(8.dp))
            .border(1.dp, ChuchotageBrand.Cream.copy(alpha = 0.52f), RoundedCornerShape(8.dp)),
        factory = { previewView },
    )
}

@Composable
private fun DemoCameraSwitchButton(
    cameraFacing: DemoCameraFacing,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val label = when (cameraFacing) {
        DemoCameraFacing.Front -> stringResource(R.string.demo_camera_switch_back)
        DemoCameraFacing.Back -> stringResource(R.string.demo_camera_switch_front)
    }

    OutlinedButton(
        onClick = onClick,
        modifier = modifier
            .widthIn(min = 108.dp)
            .height(32.dp),
        shape = RoundedCornerShape(16.dp),
        border = BorderStroke(1.dp, ChuchotageBrand.Cream.copy(alpha = 0.42f)),
        colors = ButtonDefaults.outlinedButtonColors(
            containerColor = ChuchotageBrand.InkDeep.copy(alpha = 0.62f),
            contentColor = ChuchotageBrand.Cream,
        ),
        contentPadding = PaddingValues(horizontal = 10.dp),
    ) {
        Text(
            text = label,
            fontSize = 11.sp,
            lineHeight = 14.sp,
            fontWeight = FontWeight.Bold,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
        )
    }
}

@Composable
private fun AudioOutputRouteSelector(
    selected: AudioOutputRoute,
    onSelected: (AudioOutputRoute) -> Unit,
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .widthIn(max = 520.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        SettingsChoiceButton(
            text = stringResource(R.string.audio_output_system_default),
            selected = selected == AudioOutputRoute.SystemDefault,
            enabled = true,
            onClick = { onSelected(AudioOutputRoute.SystemDefault) },
            modifier = Modifier.fillMaxWidth(),
        )
        SettingsChoiceButton(
            text = stringResource(R.string.audio_output_phone_speaker),
            selected = selected == AudioOutputRoute.PhoneSpeaker,
            enabled = true,
            onClick = { onSelected(AudioOutputRoute.PhoneSpeaker) },
            modifier = Modifier.fillMaxWidth(),
        )
        SettingsChoiceButton(
            text = stringResource(R.string.audio_output_headphones),
            selected = selected == AudioOutputRoute.Headphones,
            enabled = true,
            onClick = { onSelected(AudioOutputRoute.Headphones) },
            modifier = Modifier.fillMaxWidth(),
        )
    }
}

@Composable
private fun SettingsChoiceButton(
    text: String,
    selected: Boolean,
    enabled: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Button(
        onClick = onClick,
        enabled = enabled,
        modifier = modifier.height(44.dp),
        shape = RoundedCornerShape(22.dp),
        contentPadding = PaddingValues(horizontal = 8.dp),
        colors = ButtonDefaults.buttonColors(
            containerColor = if (selected) ChuchotageBrand.SignalBlue else ChuchotageBrand.SurfaceRaised.copy(alpha = 0.78f),
            contentColor = if (selected) ChuchotageBrand.InkDeep else ChuchotageBrand.Text,
            disabledContainerColor = if (selected) {
                ChuchotageBrand.SignalBlue.copy(alpha = 0.54f)
            } else {
                ChuchotageBrand.SurfaceRaised.copy(alpha = 0.54f)
            },
            disabledContentColor = if (selected) {
                ChuchotageBrand.InkDeep.copy(alpha = 0.8f)
            } else {
                ChuchotageBrand.Muted
            },
        ),
    ) {
        Text(
            text = text,
            modifier = Modifier.fillMaxWidth(),
            fontSize = 14.sp,
            lineHeight = 18.sp,
            fontWeight = FontWeight.Bold,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
            softWrap = false,
            textAlign = TextAlign.Center,
        )
    }
}

private enum class AuthSetupMode {
    ApiKey,
    ChatGpt,
    SponsoredTrial,
}

private enum class TranslationStartRequestKind {
    Start,
    Restart,
    ArmHeadsetAutoStart,
}

private enum class ConversationSpeaker {
    Local,
    Partner,
}

private fun ConversationSpeaker.targetLanguageCode(
    localLanguageCode: String,
    partnerLanguageCode: String,
): String {
    return when (this) {
        ConversationSpeaker.Local -> partnerLanguageCode
        ConversationSpeaker.Partner -> localLanguageCode
    }
}

private fun String.deltaSince(previous: String): String {
    if (isBlank()) return ""
    if (startsWith(previous)) return drop(previous.length)
    val sharedPrefixLength = commonPrefixWith(previous).length
    return drop(sharedPrefixLength)
}

private fun String.appendConversationText(delta: String): String {
    val next = (this + delta).trimStart()
    return if (next.length <= CONVERSATION_TRANSCRIPT_MAX_CHARS) {
        next
    } else {
        next.takeLast(CONVERSATION_TRANSCRIPT_MAX_CHARS).trimStart()
    }
}

private const val CONVERSATION_TRANSCRIPT_MAX_CHARS = 6000

private data class TranslationStartRequest(
    val kind: TranslationStartRequestKind,
    val targetLanguageCode: String? = null,
    val sourceTranscriptEnabled: Boolean? = null,
) {
    companion object {
        val Start = TranslationStartRequest(TranslationStartRequestKind.Start)
        val Restart = TranslationStartRequest(TranslationStartRequestKind.Restart)
        val ArmHeadsetAutoStart = TranslationStartRequest(TranslationStartRequestKind.ArmHeadsetAutoStart)
    }
}

private enum class ChatGptSignInUiState {
    Idle,
    OpeningBrowser,
    WaitingForCallback,
    ExchangingToken,
    Failed,
}

@Composable
private fun AuthSetupScreen(
    onSaveApiKey: (String) -> Unit,
    onUseSponsoredTrial: () -> Unit,
    onStartChatGptLogin: suspend (suspend (ChatGptSignInStatus) -> Unit) -> Unit,
    onCancelChatGptLogin: () -> Unit,
    onOpenHowItWorks: () -> Unit,
    onOpenWebsite: () -> Unit,
    onOpenPrivacyPolicy: () -> Unit,
) {
    val scope = rememberCoroutineScope()
    var mode by rememberSaveable { mutableStateOf(AuthSetupMode.ChatGpt) }
    var apiKey by rememberSaveable { mutableStateOf("") }
    var error by rememberSaveable { mutableStateOf<String?>(null) }
    var signInState by rememberSaveable { mutableStateOf(ChatGptSignInUiState.Idle) }
    var signInJob by remember { mutableStateOf<Job?>(null) }
    val isChatGptMode = mode == AuthSetupMode.ChatGpt
    val isApiKeyMode = mode == AuthSetupMode.ApiKey
    val isSponsoredTrialMode = mode == AuthSetupMode.SponsoredTrial
    val isSignInActive = signInState.isActive
    val chatGptSignInFailedMessage = stringResource(R.string.auth_error_chatgpt_sign_in_failed)
    val invalidApiKeyMessage = stringResource(R.string.auth_error_invalid_api_key)
    val invalidOpenAiCredentialMessage = stringResource(R.string.auth_error_invalid_openai_credential)
    val supportingMessage = error ?: chatGptSignInStatusMessage(signInState)

    fun cancelActiveSignIn() {
        if (isSignInActive) {
            onCancelChatGptLogin()
            signInJob?.cancel()
            signInJob = null
            signInState = ChatGptSignInUiState.Idle
        }
    }

    fun localizedAuthErrorMessage(exception: Exception, fallback: String): String {
        return when (exception.message) {
            "Enter a valid OpenAI API key." -> invalidApiKeyMessage
            "Enter a valid OpenAI credential." -> invalidOpenAiCredentialMessage
            null -> fallback
            else -> exception.message ?: fallback
        }
    }

    fun startChatGptSignIn() {
        signInJob?.cancel()
        signInJob = scope.launch {
            signInState = ChatGptSignInUiState.OpeningBrowser
            error = null
            try {
                onStartChatGptLogin { status ->
                    signInState = status.toUiState()
                }
            } catch (exception: CancellationException) {
                throw exception
            } catch (exception: Exception) {
                error = localizedAuthErrorMessage(exception, chatGptSignInFailedMessage)
                signInState = ChatGptSignInUiState.Failed
            } finally {
                if (signInState != ChatGptSignInUiState.Failed) {
                    signInState = ChatGptSignInUiState.Idle
                }
                signInJob = null
            }
        }
    }

    fun saveManualCredential() {
        try {
            cancelActiveSignIn()
            onSaveApiKey(apiKey)
            error = null
        } catch (exception: IllegalArgumentException) {
            error = localizedAuthErrorMessage(exception, invalidOpenAiCredentialMessage)
        } catch (exception: IllegalStateException) {
            error = localizedAuthErrorMessage(exception, chatGptSignInFailedMessage)
        }
    }

    fun returnToChatGpt() {
        cancelActiveSignIn()
        mode = AuthSetupMode.ChatGpt
        error = null
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(
                Brush.verticalGradient(
                    colors = listOf(
                        ChuchotageBrand.Ink,
                        ChuchotageBrand.InkDeep,
                    ),
                ),
            )
            .statusBarsPadding()
            .navigationBarsPadding()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 28.dp, vertical = 28.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        BrandTitle()
        Spacer(modifier = Modifier.height(34.dp))
        Text(
            text = when {
                isSponsoredTrialMode -> stringResource(R.string.auth_sponsored_trial_title)
                isApiKeyMode -> stringResource(R.string.auth_api_key_title)
                else -> stringResource(R.string.auth_onboarding_title)
            },
            modifier = Modifier
                .fillMaxWidth()
                .widthIn(max = 520.dp),
            color = ChuchotageBrand.Text,
            fontSize = 22.sp,
            lineHeight = 28.sp,
            fontWeight = FontWeight.Bold,
            textAlign = TextAlign.Center,
        )
        Spacer(modifier = Modifier.height(8.dp))
        Text(
            text = when {
                isSponsoredTrialMode -> stringResource(R.string.auth_sponsored_trial_body)
                isApiKeyMode -> stringResource(R.string.auth_api_key_body)
                else -> stringResource(R.string.auth_onboarding_body)
            },
            modifier = Modifier
                .fillMaxWidth()
                .widthIn(max = 520.dp),
            color = ChuchotageBrand.Muted,
            fontSize = 15.sp,
            lineHeight = 21.sp,
            textAlign = TextAlign.Center,
        )
        if (supportingMessage != null && !isApiKeyMode) {
            Spacer(modifier = Modifier.height(12.dp))
            Text(
                text = supportingMessage,
                modifier = Modifier
                    .fillMaxWidth()
                    .widthIn(max = 520.dp),
                color = if (error != null) ChuchotageBrand.Error else ChuchotageBrand.Muted,
                fontSize = 14.sp,
                lineHeight = 20.sp,
                textAlign = TextAlign.Center,
            )
        }
        Spacer(modifier = Modifier.height(26.dp))
        if (isChatGptMode) {
            Button(
                onClick = ::startChatGptSignIn,
                enabled = !isSignInActive,
                modifier = Modifier
                    .fillMaxWidth()
                    .widthIn(max = 520.dp)
                    .height(52.dp),
                shape = RoundedCornerShape(26.dp),
                colors = ButtonDefaults.buttonColors(
                    containerColor = ChuchotageBrand.SignalBlue,
                    contentColor = ChuchotageBrand.InkDeep,
                    disabledContainerColor = ChuchotageBrand.SurfaceRaised,
                    disabledContentColor = ChuchotageBrand.Muted,
                ),
            ) {
                Text(
                    text = when {
                        signInState == ChatGptSignInUiState.Failed -> stringResource(R.string.auth_button_retry_chatgpt_sign_in)
                        isSignInActive -> stringResource(R.string.auth_button_signing_in)
                        else -> stringResource(R.string.auth_button_chatgpt_sign_in)
                    },
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Bold,
                )
            }
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = stringResource(R.string.auth_chatgpt_free_account_hint),
                modifier = Modifier
                    .fillMaxWidth()
                    .widthIn(max = 520.dp),
                color = ChuchotageBrand.Muted,
                fontSize = 13.sp,
                lineHeight = 18.sp,
                textAlign = TextAlign.Center,
            )
            Spacer(modifier = Modifier.height(2.dp))
            Text(
                text = stringResource(R.string.auth_chatgpt_chats_private_hint),
                modifier = Modifier
                    .fillMaxWidth()
                    .widthIn(max = 520.dp),
                color = ChuchotageBrand.Muted,
                fontSize = 13.sp,
                lineHeight = 18.sp,
                textAlign = TextAlign.Center,
            )
            TextButton(
                onClick = onOpenHowItWorks,
                modifier = Modifier.heightIn(min = 32.dp),
                colors = ButtonDefaults.textButtonColors(contentColor = ChuchotageBrand.SignalBlueSoft),
                contentPadding = PaddingValues(horizontal = 8.dp, vertical = 0.dp),
            ) {
                Text(
                    text = stringResource(R.string.auth_button_learn_how_it_works),
                    fontSize = 13.sp,
                    fontWeight = FontWeight.SemiBold,
                )
            }
            if (isSignInActive) {
                Spacer(modifier = Modifier.height(10.dp))
                OutlinedButton(
                    onClick = {
                        onCancelChatGptLogin()
                        signInJob?.cancel()
                        signInJob = null
                        signInState = ChatGptSignInUiState.Idle
                        error = null
                    },
                    modifier = Modifier
                        .fillMaxWidth()
                        .widthIn(max = 520.dp)
                        .height(48.dp),
                    shape = RoundedCornerShape(24.dp),
                    colors = ButtonDefaults.outlinedButtonColors(
                        contentColor = ChuchotageBrand.SignalBlueSoft,
                        disabledContentColor = ChuchotageBrand.Muted,
                    ),
                    border = BorderStroke(1.dp, ChuchotageBrand.Ring),
                ) {
                    Text(
                        text = stringResource(R.string.auth_cancel_sign_in),
                        fontSize = 15.sp,
                        fontWeight = FontWeight.Bold,
                    )
                }
            }
        }
        if (isApiKeyMode) {
            OutlinedTextField(
                value = apiKey,
                onValueChange = {
                    apiKey = it
                    error = null
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .widthIn(max = 520.dp),
                label = {
                    Text(stringResource(R.string.auth_input_api_key))
                },
                singleLine = true,
                visualTransformation = PasswordVisualTransformation(),
                isError = error != null,
                colors = OutlinedTextFieldDefaults.colors(
                    focusedTextColor = ChuchotageBrand.Text,
                    unfocusedTextColor = ChuchotageBrand.Text,
                    focusedContainerColor = ChuchotageBrand.Surface.copy(alpha = 0.68f),
                    unfocusedContainerColor = ChuchotageBrand.Surface.copy(alpha = 0.68f),
                    errorContainerColor = ChuchotageBrand.Surface.copy(alpha = 0.68f),
                    focusedBorderColor = ChuchotageBrand.SignalBlue,
                    unfocusedBorderColor = ChuchotageBrand.Ring,
                    errorBorderColor = ChuchotageBrand.Error,
                    focusedLabelColor = ChuchotageBrand.SignalBlueSoft,
                    unfocusedLabelColor = ChuchotageBrand.Muted,
                    errorLabelColor = ChuchotageBrand.Error,
                    cursorColor = ChuchotageBrand.SignalBlueSoft,
                    errorCursorColor = ChuchotageBrand.Error,
                    focusedSupportingTextColor = ChuchotageBrand.Muted,
                    unfocusedSupportingTextColor = ChuchotageBrand.Muted,
                    errorSupportingTextColor = ChuchotageBrand.Error,
                ),
                supportingText = if (supportingMessage != null) {
                    { Text(supportingMessage) }
                } else {
                    null
                },
            )
            Spacer(modifier = Modifier.height(16.dp))
            Button(
                onClick = ::saveManualCredential,
                enabled = apiKey.isNotBlank(),
                modifier = Modifier
                    .fillMaxWidth()
                    .widthIn(max = 520.dp)
                    .height(52.dp),
                shape = RoundedCornerShape(26.dp),
                colors = ButtonDefaults.buttonColors(
                    containerColor = ChuchotageBrand.SignalBlue,
                    contentColor = ChuchotageBrand.InkDeep,
                    disabledContainerColor = ChuchotageBrand.SurfaceRaised,
                    disabledContentColor = ChuchotageBrand.Muted,
                ),
            ) {
                Text(
                    text = stringResource(R.string.auth_button_save_api_key),
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Bold,
                )
            }
        }
        if (isSponsoredTrialMode) {
            Button(
                onClick = {
                    try {
                        cancelActiveSignIn()
                        onUseSponsoredTrial()
                        error = null
                    } catch (exception: IllegalArgumentException) {
                        error = localizedAuthErrorMessage(exception, invalidOpenAiCredentialMessage)
                    }
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .widthIn(max = 520.dp)
                    .height(52.dp),
                shape = RoundedCornerShape(26.dp),
                colors = ButtonDefaults.buttonColors(
                    containerColor = ChuchotageBrand.SignalBlue,
                    contentColor = ChuchotageBrand.InkDeep,
                    disabledContainerColor = ChuchotageBrand.SurfaceRaised,
                    disabledContentColor = ChuchotageBrand.Muted,
                ),
            ) {
                Text(
                    text = stringResource(R.string.auth_button_try_free),
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Bold,
                )
            }
        }
        if (isChatGptMode) {
            Spacer(modifier = Modifier.height(12.dp))
            OutlinedButton(
                onClick = {
                    cancelActiveSignIn()
                    mode = AuthSetupMode.SponsoredTrial
                    error = null
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .widthIn(max = 520.dp)
                    .height(50.dp),
                shape = RoundedCornerShape(25.dp),
                colors = ButtonDefaults.outlinedButtonColors(
                    contentColor = ChuchotageBrand.Text,
                    disabledContentColor = ChuchotageBrand.Muted,
                ),
                border = BorderStroke(1.dp, ChuchotageBrand.Ring),
            ) {
                Text(
                    text = stringResource(R.string.auth_button_no_chatgpt),
                    fontSize = 15.sp,
                    fontWeight = FontWeight.Bold,
                )
            }
        } else {
            Spacer(modifier = Modifier.height(10.dp))
            TextButton(
                onClick = ::returnToChatGpt,
                colors = ButtonDefaults.textButtonColors(contentColor = ChuchotageBrand.SignalBlueSoft),
            ) {
                Text(
                    text = stringResource(R.string.auth_button_back_to_chatgpt),
                    fontSize = 14.sp,
                    fontWeight = FontWeight.SemiBold,
                )
            }
            if (!isApiKeyMode) {
                TextButton(
                    onClick = {
                        cancelActiveSignIn()
                        mode = AuthSetupMode.ApiKey
                        error = null
                    },
                    colors = ButtonDefaults.textButtonColors(contentColor = ChuchotageBrand.SignalBlueSoft),
                ) {
                    Text(
                        text = stringResource(R.string.auth_button_use_api_key),
                        fontSize = 14.sp,
                        fontWeight = FontWeight.SemiBold,
                    )
                }
            }
        }
        Spacer(modifier = Modifier.height(8.dp))
        ExternalLinksRow(
            onOpenWebsite = onOpenWebsite,
            onOpenPrivacyPolicy = onOpenPrivacyPolicy,
        )
    }
}

private val ChatGptSignInUiState.isActive: Boolean
    get() = this == ChatGptSignInUiState.OpeningBrowser ||
        this == ChatGptSignInUiState.WaitingForCallback ||
        this == ChatGptSignInUiState.ExchangingToken

@Composable
private fun chatGptSignInStatusMessage(state: ChatGptSignInUiState): String? {
    return when (state) {
        ChatGptSignInUiState.OpeningBrowser -> stringResource(R.string.auth_status_opening_browser)
        ChatGptSignInUiState.WaitingForCallback -> stringResource(R.string.auth_status_waiting_for_callback)
        ChatGptSignInUiState.ExchangingToken -> stringResource(R.string.auth_status_exchanging_token)
        ChatGptSignInUiState.Idle,
        ChatGptSignInUiState.Failed,
        -> null
    }
}

private fun ChatGptSignInStatus.toUiState(): ChatGptSignInUiState {
    return when (this) {
        ChatGptSignInStatus.OpeningBrowser -> ChatGptSignInUiState.OpeningBrowser
        ChatGptSignInStatus.WaitingForCallback -> ChatGptSignInUiState.WaitingForCallback
        ChatGptSignInStatus.ExchangingToken -> ChatGptSignInUiState.ExchangingToken
    }
}

@Composable
private fun ExternalLinksRow(
    onOpenWebsite: () -> Unit,
    onOpenPrivacyPolicy: () -> Unit,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .widthIn(max = 520.dp),
        horizontalArrangement = Arrangement.Center,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        ExternalLinkButton(text = stringResource(R.string.external_website), onClick = onOpenWebsite)
        ExternalLinkButton(text = stringResource(R.string.external_privacy_policy), onClick = onOpenPrivacyPolicy)
    }
}

@Composable
private fun ExternalLinkButton(
    text: String,
    onClick: () -> Unit,
) {
    TextButton(
        onClick = onClick,
        colors = ButtonDefaults.textButtonColors(contentColor = ChuchotageBrand.SignalBlueSoft),
    ) {
        Text(
            text = text,
            fontSize = 14.sp,
            fontWeight = FontWeight.SemiBold,
        )
    }
}

@Composable
private fun BrandTitle(label: String = "CHUCHOTAGE") {
    Text(
        text = label,
        color = ChuchotageBrand.Text,
        fontSize = 21.sp,
        letterSpacing = 6.sp,
        lineHeight = 28.sp,
        fontWeight = FontWeight.Medium,
        textAlign = TextAlign.Center,
    )
}

@Composable
private fun StatusLine(
    state: TranslationState,
    modifier: Modifier = Modifier,
) {
    val context = LocalContext.current
    val statusColor = when (state) {
        is TranslationState.Active -> ChuchotageBrand.SignalBlueSoft
        is TranslationState.WaitingForHeadset -> ChuchotageBrand.SignalBlueSoft
        is TranslationState.Connecting -> ChuchotageBrand.Warning
        is TranslationState.Error -> ChuchotageBrand.Error
        is TranslationState.Stopping -> ChuchotageBrand.Muted
        TranslationState.Idle -> ChuchotageBrand.Muted
    }

    Row(
        modifier = modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(8.dp, Alignment.CenterHorizontally),
    ) {
        Canvas(modifier = Modifier.size(8.dp)) {
            drawCircle(color = statusColor)
        }
        Text(
            modifier = Modifier.weight(1f, fill = false),
            text = state.localizedStatusText(context),
            color = statusColor,
            fontSize = 14.sp,
            fontWeight = FontWeight.SemiBold,
            maxLines = 2,
            overflow = TextOverflow.Ellipsis,
            textAlign = TextAlign.Center,
        )
    }
}

@Composable
private fun SignalWaveform(
    volume: Float,
    active: Boolean,
    modifier: Modifier = Modifier,
) {
    val animatedVolume by animateFloatAsState(
        targetValue = if (active) volume else 0.16f,
        label = "signalWaveform",
    )

    Canvas(modifier = modifier) {
        val barCount = 33
        val centerY = size.height * 0.5f
        val step = size.width / (barCount - 1)
        val strokeWidth = 3.dp.toPx()

        repeat(barCount) { index ->
            val distanceFromCenter = kotlin.math.abs(index - (barCount / 2f)) / (barCount / 2f)
            val accent = if (index % 7 == 0 || index % 11 == 0) 0.18f else 0f
            val heightFraction = (
                0.18f +
                    ((1f - distanceFromCenter) * 0.58f) +
                    accent +
                    (animatedVolume * 0.32f)
                ).coerceIn(0.14f, 0.95f)
            val halfHeight = (size.height * heightFraction) * 0.5f
            val x = step * index
            val alpha = (0.44f + ((1f - distanceFromCenter) * 0.4f)).coerceIn(0.36f, 1f)

            drawLine(
                color = ChuchotageBrand.SignalBlue.copy(alpha = alpha),
                start = Offset(x, centerY - halfHeight),
                end = Offset(x, centerY + halfHeight),
                strokeWidth = strokeWidth,
                cap = StrokeCap.Round,
            )
        }
    }
}

@Composable
private fun TranslationSignalMark(
    active: Boolean,
    modifier: Modifier = Modifier,
    waveColor: Color = ChuchotageBrand.SignalBlue,
    markColor: Color = ChuchotageBrand.Cream,
) {
    Canvas(modifier = modifier) {
        val w = size.width
        val h = size.height
        val waveAlpha = if (active) 0.88f else 0.46f
        val wave = Path().apply {
            moveTo(w * 0.06f, h * 0.57f)
            cubicTo(w * 0.24f, h * 0.4f, w * 0.39f, h * 0.42f, w * 0.51f, h * 0.52f)
            cubicTo(w * 0.64f, h * 0.64f, w * 0.78f, h * 0.62f, w * 0.94f, h * 0.46f)
        }
        drawPath(
            path = wave,
            color = waveColor.copy(alpha = waveAlpha),
            style = Stroke(width = 3.dp.toPx(), cap = StrokeCap.Round),
        )

        drawLine(
            color = markColor,
            start = Offset(w * 0.46f, h * 0.38f),
            end = Offset(w * 0.46f, h * 0.78f),
            strokeWidth = w * 0.085f,
            cap = StrokeCap.Round,
        )
        drawOval(
            color = markColor,
            topLeft = Offset(w * 0.39f, h * 0.23f),
            size = Size(w * 0.29f, h * 0.2f),
        )
    }
}

@Composable
private fun ConversationFacesGlyph(
    color: Color,
    active: Boolean,
    modifier: Modifier = Modifier,
) {
    Canvas(modifier = modifier) {
        val stroke = Stroke(width = 2.dp.toPx(), cap = StrokeCap.Round)
        val alpha = if (active) 0.95f else 0.68f
        val leftCenter = Offset(size.width * 0.32f, size.height * 0.5f)
        val rightCenter = Offset(size.width * 0.68f, size.height * 0.5f)
        val radius = size.minDimension * 0.22f

        drawCircle(
            color = color.copy(alpha = alpha),
            radius = radius,
            center = leftCenter,
            style = stroke,
        )
        drawCircle(
            color = color.copy(alpha = alpha),
            radius = radius,
            center = rightCenter,
            style = stroke,
        )
        drawLine(
            color = color.copy(alpha = alpha),
            start = Offset(leftCenter.x + radius * 0.68f, leftCenter.y - radius * 0.1f),
            end = Offset(leftCenter.x + radius * 1.02f, leftCenter.y + radius * 0.12f),
            strokeWidth = 2.dp.toPx(),
            cap = StrokeCap.Round,
        )
        drawLine(
            color = color.copy(alpha = alpha),
            start = Offset(rightCenter.x - radius * 0.68f, rightCenter.y - radius * 0.1f),
            end = Offset(rightCenter.x - radius * 1.02f, rightCenter.y + radius * 0.12f),
            strokeWidth = 2.dp.toPx(),
            cap = StrokeCap.Round,
        )
        drawLine(
            color = color.copy(alpha = if (active) 0.7f else 0.34f),
            start = Offset(size.width * 0.46f, size.height * 0.68f),
            end = Offset(size.width * 0.54f, size.height * 0.68f),
            strokeWidth = 2.dp.toPx(),
            cap = StrokeCap.Round,
        )
    }
}

@Composable
private fun ChuchotageBottomBar(
    selectedTab: Int,
    onTabSelected: (Int) -> Unit,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(ChuchotageBrand.Surface.copy(alpha = 0.92f))
            .border(1.dp, ChuchotageBrand.Ring.copy(alpha = 0.5f))
            .navigationBarsPadding()
            .height(72.dp),
        horizontalArrangement = Arrangement.SpaceEvenly,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        BottomBarItem(
            label = stringResource(R.string.bottom_translate),
            selected = selectedTab == 0,
            glyph = 0,
            onClick = { onTabSelected(0) },
            modifier = Modifier.weight(1f),
        )
        BottomBarItem(
            label = stringResource(R.string.bottom_conversation),
            selected = selectedTab == 1,
            glyph = 1,
            onClick = { onTabSelected(1) },
            modifier = Modifier.weight(1f),
        )
        BottomBarItem(
            label = stringResource(R.string.bottom_settings),
            selected = selectedTab == 2,
            glyph = 2,
            onClick = { onTabSelected(2) },
            modifier = Modifier.weight(1f),
        )
    }
}

@Composable
private fun BottomBarItem(
    label: String,
    selected: Boolean,
    glyph: Int,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val contentColor = if (selected) ChuchotageBrand.SignalBlueSoft else ChuchotageBrand.Muted

    TextButton(
        onClick = onClick,
        modifier = modifier.fillMaxSize(),
        colors = ButtonDefaults.textButtonColors(contentColor = contentColor),
        shape = RoundedCornerShape(0.dp),
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center,
        ) {
            when (glyph) {
                0 -> TranslationSignalMark(
                    active = selected,
                    waveColor = contentColor,
                    markColor = contentColor,
                    modifier = Modifier.size(26.dp),
                )
                1 -> ConversationFacesGlyph(
                    color = contentColor,
                    active = selected,
                    modifier = Modifier.size(26.dp),
                )
                else -> SettingsNavigationGlyph(
                    color = contentColor,
                    modifier = Modifier.size(26.dp),
                )
            }
            Spacer(modifier = Modifier.height(3.dp))
            Text(
                text = label,
                fontSize = 11.sp,
                fontWeight = FontWeight.SemiBold,
            )
        }
    }
}

@Composable
private fun SettingsNavigationGlyph(
    color: Color,
    modifier: Modifier = Modifier,
) {
    Canvas(modifier = modifier) {
        val stroke = Stroke(width = 2.dp.toPx(), cap = StrokeCap.Round)
        drawCircle(
            color = color,
            radius = size.minDimension * 0.28f,
            center = Offset(size.width * 0.5f, size.height * 0.5f),
            style = stroke,
        )
        repeat(8) { index ->
            val angle = (Math.PI * 2.0 * index / 8.0).toFloat()
            val inner = size.minDimension * 0.39f
            val outer = size.minDimension * 0.48f
            val center = Offset(size.width * 0.5f, size.height * 0.5f)
            drawLine(
                color = color,
                start = Offset(
                    center.x + kotlin.math.cos(angle) * inner,
                    center.y + kotlin.math.sin(angle) * inner,
                ),
                end = Offset(
                    center.x + kotlin.math.cos(angle) * outer,
                    center.y + kotlin.math.sin(angle) * outer,
                ),
                strokeWidth = 2.dp.toPx(),
                cap = StrokeCap.Round,
            )
        }
        drawCircle(
            color = color,
            radius = size.minDimension * 0.09f,
            center = Offset(size.width * 0.5f, size.height * 0.5f),
        )
    }
}

private fun openExternalUrl(context: Context, url: String) {
    val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
    runCatching { context.startActivity(intent) }
}

private fun shareDemoVideo(context: Context, uri: Uri) {
    val shareIntent = Intent(Intent.ACTION_SEND)
        .setType("video/mp4")
        .putExtra(Intent.EXTRA_STREAM, uri)
        .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
    runCatching {
        context.startActivity(Intent.createChooser(shareIntent, context.getString(R.string.demo_share_chooser_title)))
    }
}

@Composable
private fun MiniTranslationButton(
    state: TranslationState,
    inputVolume: Float,
    onClick: () -> Unit,
) {
    val animatedVolume by animateFloatAsState(
        targetValue = if (state is TranslationState.Active) inputVolume else 0f,
        label = "miniInputVolume",
    )

    TextButton(
        onClick = onClick,
        modifier = Modifier
            .size(82.dp)
            .clip(CircleShape)
            .background(
                Brush.radialGradient(
                    colors = listOf(
                        ChuchotageBrand.SurfaceRaised,
                        ChuchotageBrand.Surface,
                        ChuchotageBrand.Ink,
                    ),
                ),
            )
            .border(1.dp, ChuchotageBrand.SignalBlue.copy(alpha = 0.68f), CircleShape),
        enabled = state !is TranslationState.Stopping,
        colors = ButtonDefaults.textButtonColors(
            contentColor = ChuchotageBrand.Text,
            disabledContentColor = ChuchotageBrand.Muted,
        ),
        shape = CircleShape,
        contentPadding = PaddingValues(0.dp),
    ) {
        Box(contentAlignment = Alignment.Center, modifier = Modifier.fillMaxSize()) {
            VolumeShadow(volume = animatedVolume)
            TranslationSignalMark(
                active = state.isRunning,
                modifier = Modifier
                    .size(48.dp)
                    .padding(bottom = 12.dp),
            )
            Text(
                text = stringResource(R.string.button_stop_translation),
                modifier = Modifier
                    .align(Alignment.BottomCenter)
                    .padding(horizontal = 8.dp, vertical = 10.dp),
                textAlign = TextAlign.Center,
                fontSize = 11.sp,
                lineHeight = 13.sp,
                fontWeight = FontWeight.Bold,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
        }
    }
}

@Composable
private fun TranslationButton(
    state: TranslationState,
    inputVolume: Float,
    onClick: () -> Unit,
) {
    val buttonLabel = if (state.isRunning) {
        stringResource(R.string.button_stop_translation)
    } else {
        stringResource(R.string.button_start_translation)
    }
    val animatedVolume by animateFloatAsState(
        targetValue = if (state is TranslationState.Active) inputVolume else 0f,
        label = "inputVolume",
    )

    TextButton(
        onClick = onClick,
        modifier = Modifier
            .size(252.dp)
            .clip(CircleShape)
            .background(
                Brush.radialGradient(
                    colors = listOf(
                        ChuchotageBrand.SurfaceRaised,
                        ChuchotageBrand.Surface,
                        ChuchotageBrand.Ink,
                    ),
                ),
            )
            .border(1.dp, ChuchotageBrand.Ring, CircleShape),
        enabled = state !is TranslationState.Stopping,
        colors = ButtonDefaults.textButtonColors(
            contentColor = ChuchotageBrand.Text,
            disabledContentColor = ChuchotageBrand.Muted,
        ),
        shape = CircleShape,
        contentPadding = PaddingValues(0.dp),
    ) {
        Box(contentAlignment = Alignment.Center, modifier = Modifier.fillMaxSize()) {
            VolumeShadow(volume = animatedVolume)
            TranslationSignalMark(
                active = state.isRunning,
                modifier = Modifier
                    .size(172.dp)
                    .padding(bottom = 12.dp),
            )
            Text(
                text = buttonLabel,
                modifier = Modifier
                    .align(Alignment.BottomCenter)
                    .padding(horizontal = 28.dp, vertical = 30.dp),
                textAlign = TextAlign.Center,
                fontSize = 16.sp,
                lineHeight = 20.sp,
                fontWeight = FontWeight.SemiBold,
            )
        }
    }
}

@Composable
private fun VolumeShadow(volume: Float) {
    if (volume <= 0.005f) return

    Canvas(modifier = Modifier.fillMaxSize()) {
        val diameter = size.minDimension
        val center = Offset(size.width * 0.5f, size.height * (0.52f + volume * 0.04f))
        val radius = diameter * (0.28f + volume * 0.46f)
        val coreColor = ChuchotageBrand.SignalBlue.copy(alpha = 0.12f + volume * 0.32f)
        val midColor = ChuchotageBrand.SignalBlueSoft.copy(alpha = 0.08f + volume * 0.2f)

        drawCircle(
            brush = Brush.radialGradient(
                colors = listOf(coreColor, midColor, Color.Transparent),
                center = center,
                radius = radius,
            ),
            radius = radius,
            center = center,
        )

        drawCircle(
            color = ChuchotageBrand.SignalBlueSoft.copy(alpha = 0.1f + volume * 0.26f),
            radius = diameter * (0.35f + volume * 0.13f),
            center = Offset(size.width * 0.5f, size.height * 0.48f),
            style = Stroke(width = (3.dp + (volume * 6).dp).toPx()),
        )
    }
}

private fun requiredPermissions(audioInputSource: AudioInputSource): Array<String> {
    val permissions = mutableListOf(Manifest.permission.RECORD_AUDIO)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
        permissions += Manifest.permission.POST_NOTIFICATIONS
    }
    if (needsBluetoothConnectPermission(audioInputSource)) {
        permissions += Manifest.permission.BLUETOOTH_CONNECT
    }
    return permissions.toTypedArray()
}

private fun demoRecordingPermissions(audioInputSource: AudioInputSource): Array<String> {
    val permissions = mutableListOf(
        Manifest.permission.CAMERA,
        Manifest.permission.RECORD_AUDIO,
    )
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
        permissions += Manifest.permission.POST_NOTIFICATIONS
    }
    if (needsBluetoothConnectPermission(audioInputSource)) {
        permissions += Manifest.permission.BLUETOOTH_CONNECT
    }
    return permissions.toTypedArray()
}

private fun hasDemoRecordingPermissions(context: Context, audioInputSource: AudioInputSource): Boolean {
    return demoRecordingPermissions(audioInputSource).all { permission ->
        ContextCompat.checkSelfPermission(context, permission) == PackageManager.PERMISSION_GRANTED
    }
}

private fun hasStartPermissions(
    context: Context,
    audioInputSource: AudioInputSource,
): Boolean {
    return hasAudioPermission(context) && hasBluetoothConnectPermission(context, audioInputSource)
}

private fun buildStartPermissionNudge(
    context: Context,
    audioInputSource: AudioInputSource,
    request: TranslationStartRequest,
): StartPermissionNudge? {
    val missingPermission = missingStartPermissions(context, audioInputSource).firstOrNull() ?: return null
    val openAppSettings = permissionPromptNeedsAppSettings(context, missingPermission)
    return when (missingPermission) {
        Manifest.permission.RECORD_AUDIO -> {
            val titleResId = if (audioInputSource == AudioInputSource.DeviceAudio) {
                R.string.permission_audio_capture_title
            } else {
                R.string.permission_microphone_title
            }
            val bodyResId = if (openAppSettings) {
                if (audioInputSource == AudioInputSource.DeviceAudio) {
                    R.string.permission_audio_capture_settings_body
                } else {
                    R.string.permission_microphone_settings_body
                }
            } else if (audioInputSource == AudioInputSource.DeviceAudio) {
                R.string.permission_audio_capture_body
            } else {
                R.string.permission_microphone_body
            }
            StartPermissionNudge(
                request = request,
                titleResId = titleResId,
                bodyResId = bodyResId,
                primaryActionResId = if (openAppSettings) {
                    R.string.permission_action_open_settings
                } else {
                    R.string.permission_action_allow
                },
                openAppSettings = openAppSettings,
            )
        }
        Manifest.permission.BLUETOOTH_CONNECT -> StartPermissionNudge(
            request = request,
            titleResId = R.string.permission_nearby_devices_title,
            bodyResId = if (openAppSettings) {
                R.string.permission_nearby_devices_settings_body
            } else {
                R.string.permission_nearby_devices_body
            },
            primaryActionResId = if (openAppSettings) {
                R.string.permission_action_open_settings
            } else {
                R.string.permission_action_allow
            },
            openAppSettings = openAppSettings,
        )
        else -> null
    }
}

private fun missingStartPermissions(
    context: Context,
    audioInputSource: AudioInputSource,
): List<String> {
    return buildList {
        if (!hasAudioPermission(context)) {
            add(Manifest.permission.RECORD_AUDIO)
        }
        if (!hasBluetoothConnectPermission(context, audioInputSource)) {
            add(Manifest.permission.BLUETOOTH_CONNECT)
        }
    }
}

private fun missingStartPermissionMessage(context: Context, audioInputSource: AudioInputSource): String {
    return if (!hasAudioPermission(context)) {
        if (audioInputSource == AudioInputSource.DeviceAudio) {
            "Audio capture permission missing."
        } else {
            "Microphone permission missing."
        }
    } else if (!hasBluetoothConnectPermission(context, audioInputSource)) {
        "Nearby devices permission is required for the Bluetooth headset microphone."
    } else {
        "Required permission missing."
    }
}

private fun hasAudioPermission(context: Context): Boolean {
    return ContextCompat.checkSelfPermission(context, Manifest.permission.RECORD_AUDIO) ==
        PackageManager.PERMISSION_GRANTED
}

private fun hasBluetoothConnectPermission(
    context: Context,
    audioInputSource: AudioInputSource,
): Boolean {
    if (!needsBluetoothConnectPermission(audioInputSource)) {
        return true
    }
    return ContextCompat.checkSelfPermission(context, Manifest.permission.BLUETOOTH_CONNECT) ==
        PackageManager.PERMISSION_GRANTED
}

private fun needsBluetoothConnectPermission(audioInputSource: AudioInputSource): Boolean {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) {
        return false
    }
    return audioInputSource == AudioInputSource.Headset
}

private fun rememberRequestedPermissions(context: Context, permissions: Array<String>) {
    val prefs = context.applicationContext.getSharedPreferences(PermissionPromptPrefsName, Context.MODE_PRIVATE)
    val requested = prefs.getStringSet(RequestedPermissionsKey, emptySet<String>()).orEmpty().toMutableSet()
    requested.addAll(permissions.toList())
    prefs.edit().putStringSet(RequestedPermissionsKey, requested).apply()
}

private fun permissionPromptNeedsAppSettings(context: Context, permission: String): Boolean {
    if (ContextCompat.checkSelfPermission(context, permission) == PackageManager.PERMISSION_GRANTED) {
        return false
    }
    if (!permissionWasRequestedBefore(context, permission)) {
        return false
    }
    val activity = context.findActivity() ?: return false
    return !activity.shouldShowRequestPermissionRationale(permission)
}

private fun permissionWasRequestedBefore(context: Context, permission: String): Boolean {
    val prefs = context.applicationContext.getSharedPreferences(PermissionPromptPrefsName, Context.MODE_PRIVATE)
    return prefs.getStringSet(RequestedPermissionsKey, emptySet<String>()).orEmpty().contains(permission)
}

private tailrec fun Context.findActivity(): Activity? {
    return when (this) {
        is Activity -> this
        is ContextWrapper -> baseContext.findActivity()
        else -> null
    }
}

private fun openAppPermissionSettings(context: Context) {
    val intent = Intent(
        Settings.ACTION_APPLICATION_DETAILS_SETTINGS,
        Uri.fromParts("package", context.packageName, null),
    ).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    runCatching { context.startActivity(intent) }
}
