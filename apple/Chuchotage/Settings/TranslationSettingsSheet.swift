import SwiftUI

struct TranslationSettingsSheet: View {
    @ObservedObject var viewModel: TranslationViewModel
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        #if os(macOS)
        MacOSSettingsView(
            viewModel: viewModel,
            targetLanguageSelection: targetLanguageSelection,
            macAudioBlendSelection: macAudioBlendSelection,
            doneAction: { dismiss() }
        )
        #else
        NavigationStack {
            Form {
                Section(L10n.string("settings.language", defaultValue: "Language")) {
                    Picker(
                        L10n.string("settings.targetLanguage", defaultValue: "Target language"),
                        selection: targetLanguageSelection
                    ) {
                        ForEach(TranslationLanguages.supportedOutputLanguages) { language in
                            Text(language.name).tag(language.code)
                        }
                    }
                    .disabled(viewModel.isTranslating)

                    Link(
                        L10n.string("settings.supportedInputLanguages", defaultValue: "Supported input languages"),
                        destination: URL(string: "https://www.chuchotage.ai/#supported-input-languages")!
                    )
                    .font(.footnote)

                    if viewModel.isTranslating {
                        Text(
                            l10n: "settings.stopToChangeLanguage",
                            defaultValue: "Stop translation to change language."
                        )
                            .font(.footnote)
                            .foregroundStyle(.secondary)
                    }
                }

                Section(L10n.string("settings.audio", defaultValue: "Audio")) {
                    Picker(L10n.string("settings.microphone", defaultValue: "Microphone"), selection: microphoneSelection) {
                        ForEach(AudioInputSource.selectableCases) { source in
                            Text(source.title).tag(source)
                        }
                    }

                    Picker(L10n.string("settings.output", defaultValue: "Output"), selection: outputRouteSelection) {
                        ForEach(AudioOutputRoute.allCases) { route in
                            Text(route.title).tag(route)
                        }
                    }
                    .disabled(viewModel.isTranslating)

                    if let warning = viewModel.feedbackRiskWarningMessage {
                        Label(warning, systemImage: "exclamationmark.triangle.fill")
                            .font(.footnote)
                            .foregroundStyle(.secondary)
                    }
                }

                Section(L10n.string("settings.credential", defaultValue: "Credential")) {
                    if viewModel.hasCredential {
                        Label(
                            L10n.format(
                                "credential.savedInKeychain",
                                defaultValue: "%@. Credential saved in Keychain.",
                                viewModel.credentialModeTitle
                            ),
                            systemImage: "checkmark.seal.fill"
                        )

                        Button(L10n.string("credential.clear", defaultValue: "Clear credential"), role: .destructive) {
                            viewModel.clearCredential()
                        }
                        .disabled(viewModel.isCredentialBusy)
                    } else {
                        Text(
                            l10n: "credential.notSignedIn.detail",
                            defaultValue: "Not signed in. Sign in with ChatGPT, continue with sponsored trial, or use an API key."
                        )
                            .foregroundStyle(.secondary)
                    }

                    if viewModel.canImportCodexCredential {
                        Button(L10n.string("credential.useCodexLogin", defaultValue: "Use Codex login")) {
                            viewModel.importCodexCredential()
                        }
                        .disabled(viewModel.isCredentialBusy)
                    }

                    Button(L10n.string("credential.signInChatGPT", defaultValue: "Sign in with ChatGPT")) {
                        viewModel.signInWithChatGPT()
                    }
                    .disabled(viewModel.isCredentialBusy)

                    Button(
                        L10n.string(
                            "credential.noChatGPTSponsoredTrial",
                            defaultValue: "I don't have ChatGPT (sponsored trial)"
                        )
                    ) {
                        viewModel.useSponsoredTrialCredential()
                    }
                    .disabled(viewModel.isCredentialBusy)

                    if let message = viewModel.chatGPTSignInStatusMessage {
                        Text(message)
                            .font(.footnote)
                            .foregroundStyle(.secondary)
                    }

                    if let message = viewModel.credentialErrorMessage {
                        Text(message)
                            .font(.footnote)
                            .foregroundStyle(.secondary)
                    }
                }

                Section {
                    Text(
                        l10n: "settings.headphonesRecommended",
                        defaultValue: "Headphones recommended to avoid feedback."
                    )
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }

                Section(L10n.string("settings.privacy", defaultValue: "Privacy")) {
                    Link(
                        L10n.string("privacy.openPolicy", defaultValue: "Open privacy policy"),
                        destination: URL(string: "https://www.chuchotage.ai/privacy/")!
                    )
                }
            }
            .navigationTitle(L10n.string("settings.title", defaultValue: "Settings"))
            #if os(iOS)
            .navigationBarTitleDisplayMode(.inline)
            #endif
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button(L10n.string("settings.done", defaultValue: "Done")) {
                        dismiss()
                    }
                }
            }
        }
        #endif
    }

    private var targetLanguageSelection: Binding<String> {
        Binding(
            get: { viewModel.targetLanguageCode },
            set: { viewModel.targetLanguageCode = $0 }
        )
    }

    private var microphoneSelection: Binding<AudioInputSource> {
        Binding(
            get: { viewModel.microphoneSource },
            set: { viewModel.microphoneSource = $0 }
        )
    }

    private var outputRouteSelection: Binding<AudioOutputRoute> {
        Binding(
            get: { viewModel.audioOutputRoute },
            set: { viewModel.audioOutputRoute = $0 }
        )
    }

    private var macAudioBlendSelection: Binding<Double> {
        Binding(
            get: { Double(viewModel.macAudioBlendPercent) },
            set: { viewModel.macAudioBlendPercent = Int($0.rounded()) }
        )
    }
}

#Preview {
    TranslationSettingsSheet(viewModel: TranslationViewModel())
}

#if os(macOS)
private struct MacOSSettingsView: View {
    @ObservedObject var viewModel: TranslationViewModel
    let targetLanguageSelection: Binding<String>
    let macAudioBlendSelection: Binding<Double>
    let doneAction: () -> Void

    private var originalPercent: Int {
        100 - viewModel.macAudioBlendPercent
    }

    var body: some View {
        ZStack {
            ChuchotageColor.inkDeep
                .ignoresSafeArea()

            LinearGradient(
                colors: [
                    ChuchotageColor.ink.opacity(0.82),
                    ChuchotageColor.inkDeep,
                ],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()

            VStack(spacing: 0) {
                header

                Rectangle()
                    .fill(ChuchotageColor.ring.opacity(0.58))
                    .frame(height: 1)

                ScrollView {
                    VStack(spacing: 16) {
                        languagePanel
                        blendPanel
                        routingPanel
                        credentialPanel
                        settingsFootnote
                    }
                    .padding(24)
                }
                .scrollIndicators(.hidden)
            }
        }
        .frame(minWidth: 640, idealWidth: 700, maxWidth: 760, minHeight: 650)
    }

    private var header: some View {
        HStack(spacing: 14) {
            Image(systemName: "gearshape.fill")
                .font(.system(size: 19, weight: .semibold))
                .foregroundStyle(ChuchotageColor.signalBlueSoft)
                .frame(width: 38, height: 38)
                .background(ChuchotageColor.surface.opacity(0.88))
                .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))

            VStack(alignment: .leading, spacing: 3) {
                Text(l10n: "settings.title", defaultValue: "Settings")
                    .font(.system(.title3, design: .rounded, weight: .semibold))
                    .foregroundStyle(ChuchotageColor.text)

                Text(l10n: "settings.macPlaybackTranslation", defaultValue: "Mac playback translation")
                    .font(.system(.caption, design: .rounded, weight: .medium))
                    .foregroundStyle(ChuchotageColor.muted)
            }

            Spacer(minLength: 16)

            MacStatusPill(isTranslating: viewModel.isTranslating)

            if viewModel.isTranslating {
                Button(role: .destructive) {
                    viewModel.stopTranslationFromSettings()
                } label: {
                    Label(L10n.string("translation.stopShort", defaultValue: "Stop"), systemImage: "stop.fill")
                }
                .buttonStyle(.bordered)
            }

            Button(L10n.string("settings.done", defaultValue: "Done"), action: doneAction)
                .keyboardShortcut(.defaultAction)
                .buttonStyle(.borderedProminent)
                .tint(ChuchotageColor.signalBlue)
        }
        .padding(.horizontal, 22)
        .padding(.vertical, 18)
    }

    private var languagePanel: some View {
        MacSettingsPanel(
            iconName: "globe",
            title: L10n.string("settings.language", defaultValue: "Language"),
            subtitle: L10n.string(
                "settings.sourceLanguageAuto",
                defaultValue: "Source language is detected automatically."
            ),
            tint: ChuchotageColor.signalBlueSoft
        ) {
            HStack(alignment: .center, spacing: 16) {
                VStack(alignment: .leading, spacing: 4) {
                    Text(l10n: "settings.translateTo", defaultValue: "Translate to")
                        .font(.system(.subheadline, design: .rounded, weight: .semibold))
                        .foregroundStyle(ChuchotageColor.text)

                    Text(
                        l10n: "settings.oneOutputLanguage",
                        defaultValue: "Use one output language per active session."
                    )
                        .font(.system(.caption, design: .rounded, weight: .medium))
                        .foregroundStyle(ChuchotageColor.muted)
                }

                Spacer(minLength: 16)

                Picker(L10n.string("settings.targetLanguage", defaultValue: "Target language"), selection: targetLanguageSelection) {
                    ForEach(TranslationLanguages.supportedOutputLanguages) { language in
                        Text(language.name).tag(language.code)
                    }
                }
                .labelsHidden()
                .pickerStyle(.menu)
                .frame(width: 220)
                .disabled(viewModel.isTranslating)
            }

            Link(
                L10n.string("settings.supportedInputLanguages", defaultValue: "Supported input languages"),
                destination: URL(string: "https://www.chuchotage.ai/#supported-input-languages")!
            )
                .font(.system(.caption, design: .rounded, weight: .semibold))
                .foregroundStyle(ChuchotageColor.signalBlueSoft)

            if viewModel.isTranslating {
                MacInlineMessage(
                    iconName: "lock.fill",
                    text: L10n.string(
                        "settings.stopToChangeTargetLanguage",
                        defaultValue: "Stop translation to change the target language."
                    ),
                    tint: ChuchotageColor.cream
                )
            }
        }
    }

    private var blendPanel: some View {
        MacSettingsPanel(
            iconName: "slider.horizontal.3",
            title: L10n.string("settings.audioBlend", defaultValue: "Audio blend"),
            subtitle: L10n.string(
                "settings.audioBlend.subtitle",
                defaultValue: "Balance original Mac audio against translated speech."
            ),
            tint: ChuchotageColor.signalBlueSoft
        ) {
            HStack(spacing: 14) {
                MacBlendMetric(
                    title: L10n.string("audio.original", defaultValue: "Original"),
                    value: "\(originalPercent)%",
                    iconName: "speaker.wave.1.fill",
                    tint: ChuchotageColor.muted
                )

                MacBlendMetric(
                    title: L10n.string("audio.translation", defaultValue: "Translation"),
                    value: "\(viewModel.macAudioBlendPercent)%",
                    iconName: "speaker.wave.2.fill",
                    tint: ChuchotageColor.signalBlueSoft
                )
            }

            MacBlendBar(translationPercent: viewModel.macAudioBlendPercent)

            Slider(value: macAudioBlendSelection, in: 0...100, step: 1) {
                Text(l10n: "settings.originalToTranslation", defaultValue: "Original to Translation")
            } minimumValueLabel: {
                Text(l10n: "audio.original", defaultValue: "Original")
            } maximumValueLabel: {
                Text(l10n: "audio.translation", defaultValue: "Translation")
            }
            .tint(ChuchotageColor.signalBlueSoft)

            Text(
                l10n: "settings.audioBlend.detail",
                defaultValue: "While translating, Chuchotage mutes native Mac playback and re-adds the original at this blend level. You can adjust it live."
            )
                .font(.system(.caption, design: .rounded, weight: .medium))
                .foregroundStyle(ChuchotageColor.muted)
                .fixedSize(horizontal: false, vertical: true)
        }
    }

    private var routingPanel: some View {
        MacSettingsPanel(
            iconName: "waveform",
            title: L10n.string("settings.audioRouting", defaultValue: "Audio routing"),
            subtitle: L10n.string(
                "settings.audioRouting.subtitle",
                defaultValue: "Desktop audio in, current Mac output out."
            ),
            tint: ChuchotageColor.cream
        ) {
            MacSettingsRow(
                iconName: "macbook.and.iphone",
                title: L10n.string("settings.listeningTo", defaultValue: "Listening to"),
                value: L10n.string("settings.macPlaybackAudio", defaultValue: "Mac playback audio"),
                detail: L10n.string(
                    "settings.macPlaybackAudio.detail",
                    defaultValue: "Browser, meeting, and app audio that macOS allows Chuchotage to capture."
                ),
                tint: ChuchotageColor.signalBlueSoft
            )

            MacSettingsDivider()

            MacSettingsRow(
                iconName: "headphones",
                title: L10n.string("settings.translationPlaysTo", defaultValue: "Translation plays to"),
                value: L10n.string("settings.currentMacOutput", defaultValue: "Current Mac sound output"),
                detail: L10n.string(
                    "settings.currentMacOutput.detail",
                    defaultValue: "Choose headphones or speakers in macOS Sound settings."
                ),
                tint: ChuchotageColor.cream
            )

            MacSettingsDivider()

            MacSettingsRow(
                iconName: "arrow.triangle.2.circlepath.circle.fill",
                title: L10n.string("settings.feedbackGuard", defaultValue: "Feedback guard"),
                value: L10n.string(
                    "settings.chuchotagePlaybackExcluded",
                    defaultValue: "Chuchotage playback is excluded"
                ),
                detail: L10n.string(
                    "settings.feedbackGuard.detail",
                    defaultValue: "The app avoids recapturing its translated output during an active session."
                ),
                tint: ChuchotageColor.signalBlueSoft
            )
        }
    }

    private var credentialPanel: some View {
        MacSettingsPanel(
            iconName: "key.fill",
            title: L10n.string("settings.credential", defaultValue: "Credential"),
            subtitle: L10n.string("settings.credential.subtitle", defaultValue: "Stored locally in Keychain."),
            tint: viewModel.hasCredential ? ChuchotageColor.signalBlueSoft : ChuchotageColor.cream
        ) {
            HStack(alignment: .top, spacing: 12) {
                Image(systemName: viewModel.hasCredential ? "checkmark.seal.fill" : "exclamationmark.circle.fill")
                    .font(.system(size: 20, weight: .semibold))
                    .foregroundStyle(viewModel.hasCredential ? ChuchotageColor.signalBlueSoft : ChuchotageColor.cream)
                    .frame(width: 28, height: 28)

                VStack(alignment: .leading, spacing: 4) {
                    Text(credentialTitle)
                        .font(.system(.subheadline, design: .rounded, weight: .semibold))
                        .foregroundStyle(ChuchotageColor.text)

                    Text(credentialDetail)
                        .font(.system(.caption, design: .rounded, weight: .medium))
                        .foregroundStyle(ChuchotageColor.muted)
                        .fixedSize(horizontal: false, vertical: true)
                }

                Spacer(minLength: 0)
            }

            HStack(spacing: 10) {
                if viewModel.canImportCodexCredential {
                    Button {
                        viewModel.importCodexCredential()
                    } label: {
                        Label(
                            L10n.string("credential.useCodexLogin", defaultValue: "Use Codex login"),
                            systemImage: "person.crop.circle.badge.checkmark"
                        )
                    }
                    .buttonStyle(.bordered)
                    .disabled(viewModel.isCredentialBusy)
                }

                Button {
                    viewModel.signInWithChatGPT()
                } label: {
                    Label(
                        L10n.string("credential.signInChatGPT", defaultValue: "Sign in with ChatGPT"),
                        systemImage: "person.crop.circle.badge.checkmark"
                    )
                }
                .buttonStyle(.borderedProminent)
                .tint(ChuchotageColor.signalBlue)
                .disabled(viewModel.isCredentialBusy)

                Button {
                    viewModel.useSponsoredTrialCredential()
                } label: {
                    Label(
                        L10n.string("credential.noChatGPT", defaultValue: "I don't have ChatGPT"),
                        systemImage: "gift.fill"
                    )
                }
                .buttonStyle(.bordered)
                .disabled(viewModel.isCredentialBusy)

                if viewModel.hasCredential {
                    Button(role: .destructive) {
                        viewModel.clearCredential()
                    } label: {
                        Label(L10n.string("credential.clearShort", defaultValue: "Clear"), systemImage: "trash")
                    }
                    .buttonStyle(.bordered)
                    .disabled(viewModel.isCredentialBusy)
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)

            if let message = viewModel.chatGPTSignInStatusMessage {
                MacInlineMessage(
                    iconName: "arrow.triangle.2.circlepath",
                    text: message,
                    tint: ChuchotageColor.signalBlueSoft
                )
            }

            if let message = viewModel.credentialErrorMessage {
                MacInlineMessage(
                    iconName: "exclamationmark.triangle.fill",
                    text: message,
                    tint: ChuchotageColor.cream
                )
            }
        }
    }

    private var settingsFootnote: some View {
        HStack(spacing: 8) {
            Image(systemName: "lock.fill")
                .foregroundStyle(ChuchotageColor.signalBlueSoft)

            Text(
                l10n: "settings.macCaptureActiveOnly",
                defaultValue: "Mac audio capture starts only while translation is active."
            )
                .foregroundStyle(ChuchotageColor.muted)

            Spacer(minLength: 12)

            Link(
                L10n.string("privacy.link", defaultValue: "Privacy"),
                destination: URL(string: "https://www.chuchotage.ai/privacy/")!
            )
                .foregroundStyle(ChuchotageColor.signalBlueSoft)
        }
        .font(.system(.caption, design: .rounded, weight: .medium))
        .padding(.horizontal, 2)
    }

    private var credentialTitle: String {
        if viewModel.isCredentialBusy {
            return L10n.string(
                "credential.updateInProgress",
                defaultValue: "Credential update in progress"
            )
        }
        return viewModel.hasCredential
            ? viewModel.credentialModeTitle
            : L10n.string("credential.notSignedIn", defaultValue: "Not signed in")
    }

    private var credentialDetail: String {
        if viewModel.isCredentialBusy {
            return L10n.string(
                "credential.updateInProgress.detail",
                defaultValue: "Waiting for the browser sign-in, Codex import, or Keychain update to finish."
            )
        }
        return viewModel.hasCredential
            ? L10n.string(
                "credential.available.detail",
                defaultValue: "Chuchotage can create a short-lived Realtime Translation session for this Mac."
            )
            : L10n.string(
                "credential.missing.detail",
                defaultValue: "Sign in with ChatGPT, continue with sponsored trial, use your Codex login, or add an API key from the first-run screen."
            )
    }
}

private struct MacSettingsPanel<Content: View>: View {
    let iconName: String
    let title: String
    let subtitle: String
    let tint: Color
    @ViewBuilder let content: Content

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack(alignment: .top, spacing: 12) {
                Image(systemName: iconName)
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundStyle(tint)
                    .frame(width: 30, height: 30)
                    .background(ChuchotageColor.surface.opacity(0.86))
                    .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))

                VStack(alignment: .leading, spacing: 3) {
                    Text(title)
                        .font(.system(.headline, design: .rounded, weight: .semibold))
                        .foregroundStyle(ChuchotageColor.text)

                    Text(subtitle)
                        .font(.system(.caption, design: .rounded, weight: .medium))
                        .foregroundStyle(ChuchotageColor.muted)
                }

                Spacer(minLength: 0)
            }

            content
        }
        .padding(18)
        .background(ChuchotageColor.surfaceRaised.opacity(0.72))
        .overlay(
            RoundedRectangle(cornerRadius: 8, style: .continuous)
                .stroke(ChuchotageColor.ring.opacity(0.82), lineWidth: 1)
        )
        .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
    }
}

private struct MacStatusPill: View {
    let isTranslating: Bool

    var body: some View {
        HStack(spacing: 7) {
            Circle()
                .fill(isTranslating ? ChuchotageColor.signalBlueSoft : ChuchotageColor.ring)
                .frame(width: 7, height: 7)

            Text(
                isTranslating
                    ? L10n.string("status.translating", defaultValue: "Translating")
                    : L10n.string("status.ready", defaultValue: "Ready")
            )
                .font(.system(.caption, design: .rounded, weight: .semibold))
                .foregroundStyle(ChuchotageColor.text)
                .lineLimit(1)
        }
        .padding(.horizontal, 10)
        .padding(.vertical, 7)
        .background(ChuchotageColor.surface.opacity(0.82))
        .overlay(
            RoundedRectangle(cornerRadius: 8, style: .continuous)
                .stroke(ChuchotageColor.ring.opacity(0.8), lineWidth: 1)
        )
        .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
    }
}

private struct MacBlendMetric: View {
    let title: String
    let value: String
    let iconName: String
    let tint: Color

    var body: some View {
        HStack(spacing: 10) {
            Image(systemName: iconName)
                .font(.system(size: 14, weight: .semibold))
                .foregroundStyle(tint)
                .frame(width: 22, height: 22)

            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.system(.caption, design: .rounded, weight: .semibold))
                    .foregroundStyle(ChuchotageColor.muted)

                Text(value)
                    .font(.system(.title3, design: .rounded, weight: .semibold))
                    .foregroundStyle(ChuchotageColor.text)
            }

            Spacer(minLength: 0)
        }
        .padding(12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(ChuchotageColor.surface.opacity(0.62))
        .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
    }
}

private struct MacBlendBar: View {
    let translationPercent: Int

    private var clampedTranslation: Double {
        Double(MacAudioBlend.clampPercent(translationPercent)) / 100.0
    }

    var body: some View {
        GeometryReader { geometry in
            ZStack(alignment: .trailing) {
                RoundedRectangle(cornerRadius: 5, style: .continuous)
                    .fill(ChuchotageColor.ring.opacity(0.74))

                RoundedRectangle(cornerRadius: 5, style: .continuous)
                    .fill(
                        LinearGradient(
                            colors: [
                                ChuchotageColor.signalBlue,
                                ChuchotageColor.signalBlueSoft,
                                ChuchotageColor.cream,
                            ],
                            startPoint: .leading,
                            endPoint: .trailing
                        )
                    )
                    .frame(width: geometry.size.width * clampedTranslation)
            }
        }
        .frame(height: 10)
        .animation(.easeOut(duration: 0.16), value: translationPercent)
        .accessibilityHidden(true)
    }
}

private struct MacSettingsRow: View {
    let iconName: String
    let title: String
    let value: String
    let detail: String
    let tint: Color

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            Image(systemName: iconName)
                .font(.system(size: 15, weight: .semibold))
                .foregroundStyle(tint)
                .frame(width: 24, height: 24)

            VStack(alignment: .leading, spacing: 3) {
                Text(title)
                    .font(.system(.caption, design: .rounded, weight: .semibold))
                    .foregroundStyle(ChuchotageColor.muted)

                Text(value)
                    .font(.system(.subheadline, design: .rounded, weight: .semibold))
                    .foregroundStyle(ChuchotageColor.text)

                Text(detail)
                    .font(.system(.caption, design: .rounded, weight: .medium))
                    .foregroundStyle(ChuchotageColor.muted)
                    .fixedSize(horizontal: false, vertical: true)
            }

            Spacer(minLength: 0)
        }
    }
}

private struct MacSettingsDivider: View {
    var body: some View {
        Rectangle()
            .fill(ChuchotageColor.ring.opacity(0.58))
            .frame(height: 1)
    }
}

private struct MacInlineMessage: View {
    let iconName: String
    let text: String
    let tint: Color

    var body: some View {
        HStack(alignment: .top, spacing: 8) {
            Image(systemName: iconName)
                .font(.system(size: 12, weight: .semibold))
                .foregroundStyle(tint)
                .frame(width: 16, height: 16)

            Text(text)
                .font(.system(.caption, design: .rounded, weight: .medium))
                .foregroundStyle(ChuchotageColor.muted)
                .fixedSize(horizontal: false, vertical: true)

            Spacer(minLength: 0)
        }
        .padding(10)
        .background(ChuchotageColor.surface.opacity(0.62))
        .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
    }
}
#endif
