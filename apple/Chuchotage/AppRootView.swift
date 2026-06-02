import SwiftUI

struct AppRootView: View {
    @ObservedObject var viewModel: TranslationViewModel
    @State private var isShowingSettings = false
    #if os(iOS)
    @State private var selectedIOSSurfaceTab: IOSSurfaceTab = .translate
    #endif

    var body: some View {
        GeometryReader { geometry in
            let usesCompactIOSLayout = usesCompactIOSLayout(for: geometry.size)
            let horizontalPadding = rootHorizontalPadding(isCompactIOS: usesCompactIOSLayout)
            let topPadding = rootTopPadding(for: geometry.safeAreaInsets, isCompactIOS: usesCompactIOSLayout)
            let bottomPadding = rootBottomPadding(for: geometry.safeAreaInsets, isCompactIOS: usesCompactIOSLayout)
            let contentWidth = max(0, geometry.size.width - horizontalPadding * 2)
            let contentHeight = max(0, geometry.size.height - topPadding - bottomPadding)

            ZStack {
                ChuchotageColor.inkDeep
                    .ignoresSafeArea()

                rootContent(
                    contentWidth: contentWidth,
                    contentHeight: contentHeight,
                    isCompactIOS: usesCompactIOSLayout
                )
                .padding(.horizontal, horizontalPadding)
                .padding(.top, topPadding)
                .padding(.bottom, bottomPadding)
            }
            .frame(width: geometry.size.width, height: geometry.size.height)
        }
        .sheet(isPresented: $isShowingSettings) {
            TranslationSettingsSheet(viewModel: viewModel)
        }
    }

    @ViewBuilder
    private func rootContent(
        contentWidth: CGFloat,
        contentHeight: CGFloat,
        isCompactIOS: Bool
    ) -> some View {
        let content = VStack(spacing: rootSpacing(isCompactIOS: isCompactIOS)) {
            topBar

            Spacer(minLength: rootSpacerLength(isCompactIOS: isCompactIOS))

            if viewModel.hasCredential {
                translationSurface(isCompactIOS: isCompactIOS)
            } else {
                CredentialSetupPanel(viewModel: viewModel, isCompact: isCompactIOS)
            }

            Spacer(minLength: rootSpacerLength(isCompactIOS: isCompactIOS))

            footer
        }
        .frame(width: contentWidth)
        .frame(minHeight: contentHeight)

        #if os(iOS)
        if usesScrollableIOSRoot(isCompactIOS: isCompactIOS) {
            ScrollView(.vertical) {
                content
            }
            .scrollIndicators(.hidden)
            .scrollBounceBehavior(.basedOnSize)
            .frame(width: contentWidth, height: contentHeight)
        } else {
            content
                .frame(width: contentWidth, height: contentHeight)
        }
        #else
        content
            .frame(width: contentWidth, height: contentHeight)
        #endif
    }

    private func usesScrollableIOSRoot(isCompactIOS: Bool) -> Bool {
        #if os(iOS)
        if selectedIOSSurfaceTab == .conversation {
            return isCompactIOS
        }
        return isCompactIOS || viewModel.shouldShowTranscriptPanes
        #else
        return false
        #endif
    }

    private func usesCompactIOSLayout(for size: CGSize) -> Bool {
        #if os(iOS)
        return size.height < 560
        #else
        return false
        #endif
    }

    private func rootSpacing(isCompactIOS: Bool) -> CGFloat {
        #if os(macOS)
        return viewModel.isTranslating ? 8 : 18
        #else
        return isCompactIOS ? 8 : 28
        #endif
    }

    private func rootSpacerLength(isCompactIOS: Bool) -> CGFloat {
        #if os(macOS)
        return viewModel.isTranslating ? 0 : 8
        #else
        return isCompactIOS ? 0 : 18
        #endif
    }

    private func rootHorizontalPadding(isCompactIOS: Bool) -> CGFloat {
        #if os(macOS)
        return 20
        #else
        return isCompactIOS ? 16 : 24
        #endif
    }

    private func rootTopPadding(isCompactIOS: Bool) -> CGFloat {
        #if os(macOS)
        return viewModel.isTranslating ? 16 : 22
        #else
        return isCompactIOS ? 8 : 20
        #endif
    }

    private func rootBottomPadding(isCompactIOS: Bool) -> CGFloat {
        #if os(macOS)
        return viewModel.isTranslating ? 16 : 22
        #else
        return isCompactIOS ? 10 : 28
        #endif
    }

    private func rootTopPadding(for safeAreaInsets: EdgeInsets, isCompactIOS: Bool) -> CGFloat {
        #if os(iOS)
        return safeAreaInsets.top + rootTopPadding(isCompactIOS: isCompactIOS)
        #else
        return rootTopPadding(isCompactIOS: isCompactIOS)
        #endif
    }

    private func rootBottomPadding(for safeAreaInsets: EdgeInsets, isCompactIOS: Bool) -> CGFloat {
        #if os(iOS)
        return safeAreaInsets.bottom + rootBottomPadding(isCompactIOS: isCompactIOS)
        #else
        return rootBottomPadding(isCompactIOS: isCompactIOS)
        #endif
    }

    @ViewBuilder
    private func translationSurface(isCompactIOS: Bool) -> some View {
        #if os(iOS)
        switch selectedIOSSurfaceTab {
        case .translate:
            if isCompactIOS {
                compactIOSTranslationSurface(isCompactIOS: isCompactIOS)
            } else {
                stackedTranslationSurface(isCompactIOS: isCompactIOS)
            }
        case .conversation:
            IOSConversationSurface(viewModel: viewModel, isCompact: isCompactIOS)
        }
        #else
        stackedTranslationSurface(isCompactIOS: isCompactIOS)
        #endif
    }

    private func stackedTranslationSurface(isCompactIOS: Bool) -> some View {
        VStack(spacing: translationSurfaceSpacing(isCompactIOS: isCompactIOS)) {
            translationControl(isCompactIOS: isCompactIOS)

            AudioSignalMeter(
                level: viewModel.inputVolume,
                status: viewModel.status,
                isCompact: isCompactIOS
            )

            translationStatusMessages

            #if os(iOS)
            iosSessionPanels(isCompactIOS: isCompactIOS)
            #endif

            #if os(macOS)
            MacSessionStatusPanel(
                hasCredential: viewModel.hasCredential,
                credentialModeTitle: viewModel.credentialModeTitle,
                isCredentialBusy: viewModel.isCredentialBusy,
                status: viewModel.status,
                hasCapturedAudio: viewModel.hasCapturedAudio,
                hasReceivedTranslation: viewModel.hasReceivedTranslation,
                latestInputTranscript: viewModel.latestInputTranscript,
                latestOutputTranscript: viewModel.latestOutputTranscript,
                macCaptureSource: viewModel.macCaptureSource,
                macOriginalAudioMode: viewModel.macOriginalAudioMode,
                macOutputDeviceSelection: viewModel.macOutputDeviceSelection
            )
            #endif
        }
    }

    #if os(iOS)
    private func compactIOSTranslationSurface(isCompactIOS: Bool) -> some View {
        HStack(alignment: .center, spacing: 16) {
            translationControl(isCompactIOS: isCompactIOS)
                .layoutPriority(1)

            VStack(spacing: translationSurfaceSpacing(isCompactIOS: isCompactIOS)) {
                AudioSignalMeter(
                    level: viewModel.inputVolume,
                    status: viewModel.status,
                    isCompact: isCompactIOS
                )

                translationStatusMessages
                iosSessionPanels(isCompactIOS: isCompactIOS)
            }
            .frame(maxWidth: .infinity)
        }
        .frame(maxWidth: 760)
    }
    #endif

    private func translationControl(isCompactIOS: Bool) -> some View {
        TranslationControl(
            isTranslating: viewModel.isTranslating,
            signalLevel: viewModel.inputVolume,
            action: viewModel.toggleTranslation,
            isCompact: isCompactIOS
        )
    }

    private var translationStatusMessages: some View {
        VStack(spacing: 8) {
            Text(viewModel.statusTitle)
                .font(.system(.subheadline, design: .rounded, weight: .medium))
                .foregroundStyle(ChuchotageColor.muted)

            Text(viewModel.sessionGuidanceMessage)
                .font(.system(.caption, design: .rounded, weight: .medium))
                .foregroundStyle(ChuchotageColor.signalBlueSoft)
                .multilineTextAlignment(.center)
                .frame(maxWidth: 420)

            if let message = viewModel.lastErrorMessage {
                Text(message)
                    .font(.system(.caption, design: .rounded, weight: .medium))
                    .foregroundStyle(ChuchotageColor.cream)
                    .multilineTextAlignment(.center)
                    .frame(maxWidth: 420)
            }
        }
    }

    #if os(iOS)
    @ViewBuilder
    private func iosSessionPanels(isCompactIOS: Bool) -> some View {
        if let warningMessage = viewModel.feedbackRiskWarningMessage {
            IOSInlineWarning(text: warningMessage, isCompact: isCompactIOS)
        }

        if viewModel.shouldShowTranscriptPanes {
            IOSLiveTranscriptPanel(
                status: viewModel.status,
                originalTranscript: viewModel.latestInputTranscript,
                translatedTranscript: viewModel.latestOutputTranscript,
                isCompact: isCompactIOS
            )
        }
    }
    #endif

    private func translationSurfaceSpacing(isCompactIOS: Bool) -> CGFloat {
        #if os(macOS)
        return viewModel.isTranslating ? 8 : 14
        #else
        return isCompactIOS ? 10 : 22
        #endif
    }

    private var topBar: some View {
        #if os(macOS)
        HStack(alignment: .center, spacing: 8) {
            header

            Spacer(minLength: 8)

            CredentialStatusBadge(
                hasCredential: viewModel.hasCredential,
                isCredentialBusy: viewModel.isCredentialBusy
            )

            settingsButton
        }
        #else
        HStack(alignment: .center) {
            Color.clear
                .frame(width: 44, height: 44)

            Spacer(minLength: 0)

            header

            Spacer(minLength: 0)

            settingsButton
        }
        #endif
    }

    private var settingsButton: some View {
        Button {
            isShowingSettings = true
        } label: {
            Image(systemName: "gearshape.fill")
                .font(.system(size: 18, weight: .semibold))
                .foregroundStyle(ChuchotageColor.signalBlueSoft)
                .frame(width: settingsButtonSize, height: settingsButtonSize)
                .contentShape(Circle())
        }
        .buttonStyle(.plain)
        .accessibilityLabel(L10n.string("accessibility.openSettings", defaultValue: "Open settings"))
    }

    private var settingsButtonSize: CGFloat {
        #if os(macOS)
        return 36
        #else
        return 44
        #endif
    }

    private var header: some View {
        VStack(alignment: headerAlignment, spacing: 4) {
            Text("Chuchotage")
                .font(headerTitleFont)
                .foregroundStyle(ChuchotageColor.text)

            targetLanguageHeaderSubtitle
        }
    }

    @ViewBuilder
    private var targetLanguageHeaderSubtitle: some View {
        #if os(iOS)
        if selectedIOSSurfaceTab == .conversation {
            conversationHeaderSubtitleText
        } else {
            Menu {
                if viewModel.isTranslating {
                    Button(
                        L10n.string(
                            "settings.stopToChangeTargetLanguage",
                            defaultValue: "Stop translation to change the target language."
                        )
                    ) {}
                        .disabled(true)
                } else {
                    ForEach(TranslationLanguages.supportedOutputLanguages) { language in
                        Button {
                            viewModel.targetLanguageCode = language.code
                        } label: {
                            if language.code == viewModel.targetLanguageCode {
                                Label(language.name, systemImage: "checkmark")
                            } else {
                                Text(language.name)
                            }
                        }
                    }
                }
            } label: {
                targetLanguageHeaderSubtitleText
            }
            .buttonStyle(.plain)
            .accessibilityLabel(L10n.string("settings.targetLanguage", defaultValue: "Target language"))
            .accessibilityValue(viewModel.targetLanguage.name)
        }
        #else
        targetLanguageHeaderSubtitleText
        #endif
    }

    private var targetLanguageHeaderSubtitleText: some View {
        Text(
            L10n.format(
                "header.translateTo",
                defaultValue: "Translate to %@",
                viewModel.targetLanguage.name
            )
        )
        .font(headerSubtitleFont)
        .foregroundStyle(ChuchotageColor.signalBlueSoft)
    }

    private var conversationHeaderSubtitleText: some View {
        Text(
            L10n.format(
                "header.conversationLanguages",
                defaultValue: "%@ <-> %@",
                viewModel.conversationLocalLanguage.name,
                viewModel.conversationPartnerLanguage.name
            )
        )
        .font(headerSubtitleFont)
        .foregroundStyle(ChuchotageColor.signalBlueSoft)
        .lineLimit(1)
        .minimumScaleFactor(0.78)
    }

    private var headerAlignment: HorizontalAlignment {
        #if os(macOS)
        return .leading
        #else
        return .center
        #endif
    }

    private var headerTitleFont: Font {
        #if os(macOS)
        return .system(.headline, design: .rounded, weight: .semibold)
        #else
        return .system(.title2, design: .rounded, weight: .semibold)
        #endif
    }

    private var headerSubtitleFont: Font {
        #if os(macOS)
        return .system(.caption, design: .rounded, weight: .medium)
        #else
        return .system(.footnote, design: .rounded, weight: .medium)
        #endif
    }

    @ViewBuilder
    private var footer: some View {
        #if os(iOS)
        if viewModel.hasCredential {
            IOSBottomTabBar(selectedTab: $selectedIOSSurfaceTab)
        } else {
            statusFooter
        }
        #else
        statusFooter
        #endif
    }

    private var statusFooter: some View {
        HStack(spacing: 10) {
            Circle()
                .fill(footerTint)
                .frame(width: 8, height: 8)

            Text(viewModel.statusTitle)
                .font(.system(.caption, design: .rounded, weight: .medium))
                .foregroundStyle(ChuchotageColor.muted)
        }
    }

    private var footerTint: Color {
        switch viewModel.status {
        case .ready:
            return ChuchotageColor.ring
        case .connecting:
            return ChuchotageColor.cream
        case .listening:
            return ChuchotageColor.signalBlue
        case .error:
            return ChuchotageColor.cream
        }
    }
}

#if os(iOS)
private enum IOSSurfaceTab: String, CaseIterable, Identifiable {
    case translate
    case conversation

    var id: String { rawValue }

    var title: String {
        switch self {
        case .translate:
            return L10n.string("bottom.translate", defaultValue: "Translate")
        case .conversation:
            return L10n.string("bottom.conversation", defaultValue: "Conversation")
        }
    }

    var iconName: String {
        switch self {
        case .translate:
            return "waveform"
        case .conversation:
            return "person.2.fill"
        }
    }
}

private struct IOSBottomTabBar: View {
    @Binding var selectedTab: IOSSurfaceTab

    var body: some View {
        HStack(spacing: 0) {
            ForEach(IOSSurfaceTab.allCases) { tab in
                Button {
                    selectedTab = tab
                } label: {
                    VStack(spacing: 4) {
                        Image(systemName: tab.iconName)
                            .font(.system(size: 19, weight: .semibold))

                        Text(tab.title)
                            .font(.system(.caption2, design: .rounded, weight: .semibold))
                            .lineLimit(1)
                            .minimumScaleFactor(0.78)
                    }
                    .foregroundStyle(selectedTab == tab ? ChuchotageColor.signalBlueSoft : ChuchotageColor.muted)
                    .frame(maxWidth: .infinity, minHeight: 58)
                    .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
                .accessibilityLabel(tab.title)
                .accessibilityAddTraits(selectedTab == tab ? .isSelected : [])
            }
        }
        .background(ChuchotageColor.surface.opacity(0.92))
        .overlay(
            RoundedRectangle(cornerRadius: 8, style: .continuous)
                .stroke(ChuchotageColor.ring.opacity(0.62), lineWidth: 1)
        )
        .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
        .frame(maxWidth: 460)
    }
}

private enum IOSConversationSpeaker: Equatable {
    case local
    case partner

    func targetLanguageCode(localLanguageCode: String, partnerLanguageCode: String) -> String {
        switch self {
        case .local:
            return partnerLanguageCode
        case .partner:
            return localLanguageCode
        }
    }
}

private struct IOSConversationSurface: View {
    @ObservedObject var viewModel: TranslationViewModel
    let isCompact: Bool

    @State private var activeSpeaker: IOSConversationSpeaker?
    @State private var localTranscript = ""
    @State private var partnerTranscript = ""
    @State private var lastObservedOutputText = ""

    private var localLanguage: TranslationLanguage {
        viewModel.conversationLocalLanguage
    }

    private var partnerLanguage: TranslationLanguage {
        viewModel.conversationPartnerLanguage
    }

    private var languagesConflict: Bool {
        localLanguage.code == partnerLanguage.code
    }

    var body: some View {
        VStack(spacing: isCompact ? 8 : 10) {
            IOSConversationTranscriptPanel(
                label: L10n.string("conversation.partner.label", defaultValue: "Other side"),
                language: partnerLanguage,
                text: partnerTranscript,
                active: activeSpeaker == .partner && viewModel.isTranslating,
                receiving: activeSpeaker == .local && viewModel.isTranslating,
                languageConflict: languagesConflict,
                placeholder: conversationPlaceholder,
                accent: ChuchotageColor.cream,
                inputVolume: viewModel.inputVolume,
                status: viewModel.status,
                isCompact: isCompact,
                onLanguageSelected: { updateConversationLanguages(nextPartnerLanguage: $0) },
                onTap: {
                    selectSpeaker(.partner, targetLanguageCode: localLanguage.code)
                }
            )
            .frame(height: panelHeight)
            .rotationEffect(.degrees(180))

            IOSConversationCenterLine(
                status: viewModel.status,
                activeSpeaker: activeSpeaker,
                localLanguageName: localLanguage.name,
                partnerLanguageName: partnerLanguage.name,
                languagesConflict: languagesConflict,
                onStopTranslation: viewModel.stopTranslationSession,
                isCompact: isCompact
            )

            IOSConversationTranscriptPanel(
                label: L10n.string("conversation.local.label", defaultValue: "This side"),
                language: localLanguage,
                text: localTranscript,
                active: activeSpeaker == .local && viewModel.isTranslating,
                receiving: activeSpeaker == .partner && viewModel.isTranslating,
                languageConflict: languagesConflict,
                placeholder: conversationPlaceholder,
                accent: ChuchotageColor.signalBlueSoft,
                inputVolume: viewModel.inputVolume,
                status: viewModel.status,
                isCompact: isCompact,
                onLanguageSelected: { updateConversationLanguages(nextLocalLanguage: $0) },
                onTap: {
                    selectSpeaker(.local, targetLanguageCode: partnerLanguage.code)
                }
            )
            .frame(height: panelHeight)
        }
        .frame(maxWidth: 460)
        .onChange(of: viewModel.isTranslating) {
            if !viewModel.isTranslating {
                activeSpeaker = nil
                lastObservedOutputText = ""
            }
        }
        .onChange(of: activeSpeaker) {
            lastObservedOutputText = viewModel.latestOutputTranscript
        }
        .onChange(of: viewModel.latestOutputTranscript) {
            routeOutputTranscriptDelta()
        }
    }

    private var panelHeight: CGFloat {
        isCompact ? 132 : 222
    }

    private var conversationPlaceholder: String {
        languagesConflict
            ? L10n.string("conversation.chooseLanguages", defaultValue: "Choose two different languages.")
            : L10n.string("conversation.waiting", defaultValue: "Translated text appears here.")
    }

    private func selectSpeaker(_ speaker: IOSConversationSpeaker, targetLanguageCode: String) {
        guard !languagesConflict else { return }
        activeSpeaker = speaker
        lastObservedOutputText = viewModel.latestOutputTranscript
        viewModel.startConversationTurn(targetLanguageCode: targetLanguageCode)
    }

    private func updateConversationLanguages(
        nextLocalLanguage: TranslationLanguage? = nil,
        nextPartnerLanguage: TranslationLanguage? = nil
    ) {
        let local = nextLocalLanguage ?? localLanguage
        let partner = nextPartnerLanguage ?? partnerLanguage
        viewModel.conversationLocalLanguageCode = local.code
        viewModel.conversationPartnerLanguageCode = partner.code

        if local.code == partner.code {
            if viewModel.isTranslating {
                viewModel.stopTranslationSession()
            }
            return
        }

        guard let activeSpeaker, viewModel.isTranslating else { return }
        lastObservedOutputText = viewModel.latestOutputTranscript
        viewModel.startConversationTurn(
            targetLanguageCode: activeSpeaker.targetLanguageCode(
                localLanguageCode: local.code,
                partnerLanguageCode: partner.code
            )
        )
    }

    private func routeOutputTranscriptDelta() {
        guard let activeSpeaker else { return }
        let outputText = viewModel.latestOutputTranscript
        let delta = outputText.conversationDelta(since: lastObservedOutputText)
        lastObservedOutputText = outputText
        guard !delta.isConversationBlank else { return }

        switch activeSpeaker {
        case .local:
            partnerTranscript = partnerTranscript.appendingConversationText(delta)
        case .partner:
            localTranscript = localTranscript.appendingConversationText(delta)
        }
    }
}

private struct IOSConversationTranscriptPanel: View {
    private static let bottomID = "ios-conversation-transcript-bottom"

    let label: String
    let language: TranslationLanguage
    let text: String
    let active: Bool
    let receiving: Bool
    let languageConflict: Bool
    let placeholder: String
    let accent: Color
    let inputVolume: Double
    let status: TranslationStatus
    let isCompact: Bool
    let onLanguageSelected: (TranslationLanguage) -> Void
    let onTap: () -> Void

    private var borderColor: Color {
        if active {
            return accent
        }
        if receiving {
            return ChuchotageColor.signalBlue
        }
        if languageConflict {
            return ChuchotageColor.cream.opacity(0.78)
        }
        return ChuchotageColor.ring.opacity(0.78)
    }

    private var statusText: String {
        if active {
            return L10n.string("conversation.speaking", defaultValue: "Speaking into the mic")
        }
        if receiving {
            return L10n.string("conversation.reading", defaultValue: "Translation arrives here")
        }
        return L10n.string("conversation.tapToSpeak", defaultValue: "Tap your side when you speak")
    }

    var body: some View {
        VStack(alignment: .leading, spacing: isCompact ? 6 : 8) {
            HStack(alignment: .center, spacing: 10) {
                VStack(alignment: .leading, spacing: 2) {
                    Text(label)
                        .font(.system(.caption2, design: .rounded, weight: .bold))
                        .foregroundStyle(accent)
                        .lineLimit(1)

                    Text(statusText)
                        .font(.system(.caption, design: .rounded, weight: .medium))
                        .foregroundStyle(active || receiving ? ChuchotageColor.text : ChuchotageColor.muted)
                        .lineLimit(1)
                        .minimumScaleFactor(0.78)
                }

                Spacer(minLength: 8)

                IOSConversationLanguageMenu(
                    selectedLanguage: language,
                    accent: accent,
                    onSelected: onLanguageSelected
                )
            }

            if active {
                IOSConversationWaveform(
                    level: inputVolume,
                    status: status,
                    accent: accent
                )
                .frame(height: isCompact ? 18 : 24)
            }

            ScrollViewReader { proxy in
                ScrollView {
                    VStack(alignment: .leading, spacing: 0) {
                        Text(text.isEmpty ? placeholder : text)
                            .foregroundStyle(text.isEmpty ? placeholderColor : ChuchotageColor.text)
                            .font(.system(isCompact ? .subheadline : .body, design: .rounded, weight: .semibold))
                            .textSelection(.enabled)
                            .padding(.horizontal, 10)
                            .padding(.vertical, 9)
                            .frame(maxWidth: .infinity, alignment: text.isEmpty ? .center : .leading)

                        Color.clear
                            .frame(height: 1)
                            .id(Self.bottomID)
                    }
                    .frame(maxWidth: .infinity, minHeight: scrollMinHeight, alignment: text.isEmpty ? .center : .topLeading)
                }
                .background(ChuchotageColor.ink.opacity(0.38))
                .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
                .onAppear {
                    scrollToBottom(with: proxy, animated: false)
                }
                .onChange(of: text) {
                    scrollToBottom(with: proxy, animated: true)
                }
            }
        }
        .padding(.horizontal, 14)
        .padding(.vertical, isCompact ? 10 : 12)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .background(active ? ChuchotageColor.surfaceRaised.opacity(0.82) : ChuchotageColor.inkDeep.opacity(0.74))
        .overlay(
            RoundedRectangle(cornerRadius: 8, style: .continuous)
                .stroke(borderColor, lineWidth: 1)
        )
        .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
        .contentShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
        .onTapGesture {
            guard !languageConflict else { return }
            onTap()
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel(label)
        .accessibilityValue(text.isEmpty ? placeholder : text)
    }

    private var placeholderColor: Color {
        languageConflict ? ChuchotageColor.cream : ChuchotageColor.muted
    }

    private var scrollMinHeight: CGFloat {
        isCompact ? 44 : 88
    }

    private func scrollToBottom(with proxy: ScrollViewProxy, animated: Bool) {
        guard !text.isEmpty else { return }

        if animated {
            withAnimation(.easeOut(duration: 0.16)) {
                proxy.scrollTo(Self.bottomID, anchor: .bottom)
            }
        } else {
            proxy.scrollTo(Self.bottomID, anchor: .bottom)
        }
    }
}

private struct IOSConversationLanguageMenu: View {
    let selectedLanguage: TranslationLanguage
    let accent: Color
    let onSelected: (TranslationLanguage) -> Void

    var body: some View {
        Menu {
            ForEach(TranslationLanguages.supportedOutputLanguages) { language in
                Button {
                    onSelected(language)
                } label: {
                    if language.code == selectedLanguage.code {
                        Label(language.name, systemImage: "checkmark")
                    } else {
                        Text(language.name)
                    }
                }
            }
        } label: {
            Text(selectedLanguage.name)
                .font(.system(.caption, design: .rounded, weight: .bold))
                .foregroundStyle(ChuchotageColor.text)
                .lineLimit(1)
                .minimumScaleFactor(0.72)
                .padding(.horizontal, 11)
                .frame(height: 34)
                .background(ChuchotageColor.surface.opacity(0.62))
                .overlay(
                    Capsule()
                        .stroke(accent.opacity(0.58), lineWidth: 1)
                )
                .clipShape(Capsule())
        }
        .buttonStyle(.plain)
        .accessibilityLabel(L10n.string("settings.targetLanguage", defaultValue: "Target language"))
        .accessibilityValue(selectedLanguage.name)
    }
}

private struct IOSConversationCenterLine: View {
    let status: TranslationStatus
    let activeSpeaker: IOSConversationSpeaker?
    let localLanguageName: String
    let partnerLanguageName: String
    let languagesConflict: Bool
    let onStopTranslation: () -> Void
    let isCompact: Bool

    private var isRunning: Bool {
        status == .connecting || status == .listening
    }

    private var routeText: String {
        if languagesConflict {
            return L10n.string("conversation.chooseLanguages", defaultValue: "Choose two different languages.")
        }
        if activeSpeaker == .local && isRunning {
            return L10n.format("conversation.route", defaultValue: "%@ -> %@", localLanguageName, partnerLanguageName)
        }
        if activeSpeaker == .partner && isRunning {
            return L10n.format("conversation.route", defaultValue: "%@ -> %@", partnerLanguageName, localLanguageName)
        }
        return L10n.string("conversation.tapToSpeak", defaultValue: "Tap your side when you speak")
    }

    var body: some View {
        ZStack {
            Rectangle()
                .fill(ChuchotageColor.ring.opacity(0.8))
                .frame(height: 1)

            HStack(spacing: 10) {
                Image(systemName: "person.2.fill")
                    .font(.system(size: 18, weight: .semibold))
                    .foregroundStyle(isRunning ? ChuchotageColor.signalBlueSoft : ChuchotageColor.muted)
                    .frame(width: 28, height: 28)

                Text(routeText)
                    .font(.system(.caption, design: .rounded, weight: .semibold))
                    .foregroundStyle(languagesConflict ? ChuchotageColor.cream : ChuchotageColor.text)
                    .lineLimit(2)
                    .minimumScaleFactor(0.78)
                    .multilineTextAlignment(.center)
                    .frame(maxWidth: .infinity)

                if isRunning {
                    Button(role: .destructive, action: onStopTranslation) {
                        Text(L10n.string("translation.stopShort", defaultValue: "Stop"))
                            .font(.system(.caption, design: .rounded, weight: .bold))
                    }
                    .buttonStyle(.plain)
                    .foregroundStyle(ChuchotageColor.cream)
                }
            }
            .padding(.horizontal, 10)
            .padding(.vertical, 8)
            .frame(maxWidth: .infinity)
            .background(ChuchotageColor.inkDeep)
            .overlay(
                RoundedRectangle(cornerRadius: 8, style: .continuous)
                    .stroke(ChuchotageColor.ring.opacity(0.82), lineWidth: 1)
            )
            .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
        }
        .frame(height: isCompact ? 54 : 64)
        .accessibilityElement(children: .combine)
    }
}

private struct IOSConversationWaveform: View {
    let level: Double
    let status: TranslationStatus
    let accent: Color

    private var visibleLevel: Double {
        status == .listening ? min(max(level, 0), 1) : 0
    }

    var body: some View {
        GeometryReader { geometry in
            HStack(alignment: .center, spacing: 3) {
                ForEach(0..<19, id: \.self) { index in
                    Capsule()
                        .fill(barFill)
                        .frame(
                            width: 3,
                            height: max(5, geometry.size.height * barHeightFraction(at: index))
                        )
                        .opacity(barOpacity)
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .center)
        }
        .animation(.easeOut(duration: 0.09), value: visibleLevel)
        .accessibilityHidden(true)
    }

    private var barFill: AnyShapeStyle {
        if visibleLevel >= 0.08 {
            return AnyShapeStyle(
                LinearGradient(
                    colors: [accent, ChuchotageColor.signalBlueSoft],
                    startPoint: .top,
                    endPoint: .bottom
                )
            )
        }
        return AnyShapeStyle(ChuchotageColor.ring)
    }

    private var barOpacity: Double {
        visibleLevel >= 0.08 ? 0.86 : 0.26
    }

    private func barHeightFraction(at index: Int) -> Double {
        let midpoint = 9.0
        let distanceFromCenter = abs(Double(index) - midpoint) / midpoint
        let baseline = 0.18 + (1 - distanceFromCenter) * 0.42
        return min(0.96, baseline + visibleLevel * 0.34)
    }
}

private let iosConversationTranscriptMaxCharacters = 6_000

private extension String {
    var isConversationBlank: Bool {
        trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    }

    func conversationDelta(since previous: String) -> String {
        guard !isConversationBlank else { return "" }
        if hasPrefix(previous) {
            return String(dropFirst(previous.count))
        }
        let sharedPrefix = commonPrefix(with: previous)
        return String(dropFirst(sharedPrefix.count))
    }

    func appendingConversationText(_ delta: String) -> String {
        let next = (self + delta).trimmingLeadingConversationWhitespace()
        guard next.count > iosConversationTranscriptMaxCharacters else {
            return next
        }
        return String(next.suffix(iosConversationTranscriptMaxCharacters))
            .trimmingLeadingConversationWhitespace()
    }

    func trimmingLeadingConversationWhitespace() -> String {
        String(drop(while: { $0.isWhitespace }))
    }
}
#endif

private struct CredentialSetupPanel: View {
    @ObservedObject var viewModel: TranslationViewModel
    let isCompact: Bool
    @State private var apiKey = ""
    @State private var isShowingFallbackOptions = false
    @State private var isShowingApiKeyInput = false

    var body: some View {
        VStack(alignment: .leading, spacing: panelSpacing) {
            Text(l10n: "credential.setup.title", defaultValue: "Sign in to start translating")
                .font(.system(.headline, design: .rounded, weight: .semibold))
                .foregroundStyle(ChuchotageColor.text)

            Button {
                viewModel.signInWithChatGPT()
            } label: {
                Label(
                    viewModel.isCredentialBusy
                        ? L10n.string("credential.signingIn", defaultValue: "Signing in")
                        : L10n.string("credential.signInChatGPT", defaultValue: "Sign in with ChatGPT"),
                    systemImage: "person.crop.circle.badge.checkmark"
                )
                    .frame(maxWidth: .infinity)
            }
            .buttonStyle(.borderedProminent)
            .tint(ChuchotageColor.signalBlue)
            .disabled(viewModel.isCredentialBusy)

            #if os(iOS)
            VStack(spacing: 2) {
                Text(l10n: "credential.chatGPTFreeAccountHint", defaultValue: "Free ChatGPT accounts work too.")
                Text(l10n: "credential.chatGPTChatsPrivateHint", defaultValue: "Nope, we can't see your ChatGPT chats.")
            }
            .font(.system(.caption, design: .rounded, weight: .medium))
            .foregroundStyle(ChuchotageColor.muted)
            .multilineTextAlignment(.center)
            .frame(maxWidth: .infinity)
            .fixedSize(horizontal: false, vertical: true)
            #endif

            Button {
                withAnimation(.easeInOut(duration: 0.16)) {
                    isShowingFallbackOptions.toggle()
                }
            } label: {
                Label(
                    L10n.string("credential.noChatGPT", defaultValue: "I don't have ChatGPT"),
                    systemImage: "sparkles.rectangle.stack.fill"
                )
                    .frame(maxWidth: .infinity)
            }
            .buttonStyle(.bordered)
            .tint(ChuchotageColor.signalBlueSoft)
            .disabled(viewModel.isCredentialBusy)

            if isShowingFallbackOptions {
                VStack(alignment: .leading, spacing: 10) {
                    Text(l10n: "credential.fallback.description", defaultValue: "Try the sponsored trial or add an API key.")
                        .font(.system(.caption, design: .rounded, weight: .medium))
                        .foregroundStyle(ChuchotageColor.muted)
                        .fixedSize(horizontal: false, vertical: true)

                    Button {
                        viewModel.useSponsoredTrialCredential()
                    } label: {
                        Label(
                            L10n.string(
                                "credential.continueSponsoredTrial",
                                defaultValue: "Continue with sponsored free trial"
                            ),
                            systemImage: "gift.fill"
                        )
                            .frame(maxWidth: .infinity)
                    }
                    .buttonStyle(.bordered)
                    .tint(ChuchotageColor.signalBlueSoft)
                    .disabled(viewModel.isCredentialBusy)

                    Button {
                        withAnimation(.easeInOut(duration: 0.16)) {
                            isShowingApiKeyInput.toggle()
                        }
                    } label: {
                        Label(
                            L10n.string("credential.useAPIKey", defaultValue: "Use an OpenAI API key"),
                            systemImage: "key.fill"
                        )
                            .frame(maxWidth: .infinity)
                    }
                    .buttonStyle(.bordered)
                    .tint(ChuchotageColor.signalBlueSoft)
                    .disabled(viewModel.isCredentialBusy)

                    if isShowingApiKeyInput {
                        VStack(alignment: .leading, spacing: 8) {
                            SecureField(
                                L10n.string("credential.apiKeyPlaceholder", defaultValue: "OpenAI API key"),
                                text: $apiKey
                            )
                                .textFieldStyle(.roundedBorder)
                                #if os(iOS)
                                .textInputAutocapitalization(.never)
                                .autocorrectionDisabled()
                                #endif

                            Button {
                                viewModel.saveApiKeyCredential(apiKey)
                            } label: {
                                Label(
                                    viewModel.isCredentialBusy
                                        ? L10n.string("credential.saving", defaultValue: "Saving")
                                        : L10n.string("credential.saveAPIKey", defaultValue: "Save API key"),
                                    systemImage: "key.fill"
                                )
                                    .frame(maxWidth: .infinity)
                            }
                            .buttonStyle(.bordered)
                            .tint(ChuchotageColor.signalBlueSoft)
                            .disabled(viewModel.isCredentialBusy)
                        }
                    }

                    if viewModel.canImportCodexCredential {
                        Button {
                            viewModel.importCodexCredential()
                        } label: {
                            Label(
                                L10n.string("credential.useCodexLogin", defaultValue: "Use Codex login"),
                                systemImage: "person.crop.circle.badge.checkmark"
                            )
                                .frame(maxWidth: .infinity)
                        }
                        .buttonStyle(.bordered)
                        .tint(ChuchotageColor.signalBlueSoft)
                        .disabled(viewModel.isCredentialBusy)
                    }
                }
                .padding(12)
                .background(ChuchotageColor.surface.opacity(0.65))
                .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
            }

            if viewModel.hasCredential {
                HStack(spacing: 8) {
                    Image(systemName: "checkmark.seal.fill")
                        .foregroundStyle(ChuchotageColor.signalBlueSoft)

                    Text(
                        L10n.format(
                            "credential.modeReady",
                            defaultValue: "%@ ready.",
                            viewModel.credentialModeTitle
                        )
                    )
                        .foregroundStyle(ChuchotageColor.signalBlueSoft)

                    Spacer(minLength: 0)
                }
                .font(.system(.caption, design: .rounded, weight: .semibold))
            }

            if let message = viewModel.chatGPTSignInStatusMessage {
                Text(message)
                    .font(.system(.caption, design: .rounded, weight: .medium))
                    .foregroundStyle(ChuchotageColor.signalBlueSoft)
            }

            if let message = viewModel.credentialErrorMessage {
                Text(message)
                    .font(.system(.caption, design: .rounded, weight: .medium))
                    .foregroundStyle(ChuchotageColor.cream)
            }

            HStack(spacing: 8) {
                Image(systemName: "lock.fill")
                    .foregroundStyle(ChuchotageColor.signalBlueSoft)
                Text(l10n: "credential.keychainHeadphones", defaultValue: "Keychain. Headphones help.")
                Spacer(minLength: 8)
                Link(
                    L10n.string("privacy.link", defaultValue: "Privacy"),
                    destination: URL(string: "https://www.chuchotage.ai/privacy/")!
                )
            }
            .font(.system(.caption, design: .rounded, weight: .medium))
            .foregroundStyle(ChuchotageColor.muted)
        }
        .padding(credentialPanelPadding)
        .frame(maxWidth: credentialPanelWidth)
        .background(ChuchotageColor.surfaceRaised)
        .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
    }

    private var credentialPanelPadding: CGFloat {
        #if os(macOS)
        return 14
        #else
        return isCompact ? 12 : 18
        #endif
    }

    private var credentialPanelWidth: CGFloat {
        #if os(macOS)
        return 320
        #else
        return 460
        #endif
    }

    private var panelSpacing: CGFloat {
        #if os(macOS)
        return 14
        #else
        return isCompact ? 10 : 14
        #endif
    }
}

private struct CredentialStatusBadge: View {
    let hasCredential: Bool
    let isCredentialBusy: Bool

    private var iconName: String {
        if isCredentialBusy {
            return "arrow.triangle.2.circlepath"
        }
        return hasCredential ? "checkmark.seal.fill" : "exclamationmark.circle.fill"
    }

    private var title: String {
        if isCredentialBusy {
            return L10n.string("credential.signingIn", defaultValue: "Signing in")
        }
        return hasCredential
            ? L10n.string("credential.signedIn", defaultValue: "Signed in")
            : L10n.string("credential.notSignedIn", defaultValue: "Not signed in")
    }

    private var tint: Color {
        if isCredentialBusy {
            return ChuchotageColor.cream
        }
        return hasCredential ? ChuchotageColor.signalBlueSoft : ChuchotageColor.muted
    }

    var body: some View {
        HStack(spacing: 7) {
            Image(systemName: iconName)
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(tint)

            Text(title)
                .font(.system(.caption, design: .rounded, weight: .semibold))
                .foregroundStyle(ChuchotageColor.text)
                .lineLimit(1)
        }
        .padding(.horizontal, 10)
        .padding(.vertical, 7)
        .background(ChuchotageColor.surface.opacity(0.82))
        .overlay(
            RoundedRectangle(cornerRadius: 8, style: .continuous)
                .stroke(tint.opacity(0.34), lineWidth: 1)
        )
        .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
        .accessibilityLabel(title)
    }
}

private struct MacSessionStatusPanel: View {
    let hasCredential: Bool
    let credentialModeTitle: String
    let isCredentialBusy: Bool
    let status: TranslationStatus
    let hasCapturedAudio: Bool
    let hasReceivedTranslation: Bool
    let latestInputTranscript: String
    let latestOutputTranscript: String
    let macCaptureSource: MacCaptureSource
    let macOriginalAudioMode: MacOriginalAudioMode
    let macOutputDeviceSelection: MacOutputDeviceSelection

    private var columns: [GridItem] {
        [
            GridItem(.flexible(minimum: 0), spacing: 8),
            GridItem(.flexible(minimum: 0), spacing: 8),
        ]
    }

    var body: some View {
        VStack(spacing: panelSpacing) {
            if shouldShowTranscriptPanel {
                    MacCompactStatusStrip(
                        sourceValue: captureValue,
                        sessionValue: translationValue,
                        mixValue: macOriginalAudioMode.title,
                        sourceTint: captureTint,
                        sessionTint: translationTint
                    )

                MacLiveTranscriptPanel(
                    isTranslating: isTranslating,
                    originalTranscript: latestInputTranscript,
                    translatedTranscript: latestOutputTranscript
                )
            } else {
                LazyVGrid(columns: columns, spacing: 8) {
                    MacStatusChip(
                        iconName: hasCredential ? "checkmark.seal.fill" : "key.fill",
                        title: L10n.string("statusChip.openAI", defaultValue: "OpenAI"),
                        value: credentialValue,
                        tint: hasCredential ? ChuchotageColor.signalBlueSoft : ChuchotageColor.muted
                    )

                    MacStatusChip(
                        iconName: "speaker.wave.2.fill",
                        title: L10n.string("statusChip.source", defaultValue: "Source"),
                        value: captureValue,
                        tint: captureTint
                    )

                    MacStatusChip(
                        iconName: "slider.horizontal.3",
                        title: L10n.string("statusChip.original", defaultValue: "Original"),
                        value: macOriginalAudioMode.title,
                        tint: ChuchotageColor.signalBlueSoft
                    )

                    MacStatusChip(
                        iconName: translationIconName,
                        title: L10n.string("statusChip.session", defaultValue: "Session"),
                        value: translationValue,
                        tint: translationTint
                    )
                }
            }
        }
        .padding(10)
        .frame(maxWidth: 320)
        .background(ChuchotageColor.surface.opacity(0.74))
        .overlay(
            RoundedRectangle(cornerRadius: 8, style: .continuous)
                .stroke(ChuchotageColor.ring.opacity(0.82), lineWidth: 1)
        )
        .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
        .accessibilityElement(children: .combine)
    }

    private var isTranslating: Bool {
        status == .connecting || status == .listening
    }

    private var shouldShowTranscriptPanel: Bool {
        isTranslating || !latestInputTranscript.isEmpty || !latestOutputTranscript.isEmpty
    }

    private var panelSpacing: CGFloat {
        shouldShowTranscriptPanel ? 8 : 10
    }

    private var credentialValue: String {
        if isCredentialBusy {
            return L10n.string("credential.signingIn", defaultValue: "Signing in")
        }
        return hasCredential
            ? credentialModeTitle
            : L10n.string("credential.needed", defaultValue: "Needed")
    }

    private var captureValue: String {
        switch status {
        case .connecting:
            return L10n.string("status.preparing", defaultValue: "Preparing")
        case .listening:
            return hasCapturedAudio
                ? macCaptureSource.title
                : L10n.string("status.waiting", defaultValue: "Waiting")
        case .ready, .error:
            return macCaptureSource.title
        }
    }

    private var translationValue: String {
        switch status {
        case .ready:
            return L10n.string("status.ready", defaultValue: "Ready")
        case .connecting:
            return L10n.string("status.connecting", defaultValue: "Connecting")
        case .listening:
            if hasReceivedTranslation {
                return L10n.string("status.live", defaultValue: "Live")
            }
            if hasCapturedAudio {
                return L10n.string("status.audioIn", defaultValue: "Audio in")
            }
            return L10n.string("status.waiting", defaultValue: "Waiting")
        case .error:
            return L10n.string("status.error", defaultValue: "Error")
        }
    }

    private var translationIconName: String {
        if hasReceivedTranslation {
            return "checkmark.circle.fill"
        }
        return status == .error ? "exclamationmark.triangle.fill" : "waveform"
    }

    private var captureTint: Color {
        switch status {
        case .connecting:
            return ChuchotageColor.cream
        case .listening:
            return hasCapturedAudio ? ChuchotageColor.signalBlueSoft : ChuchotageColor.muted
        case .ready:
            return ChuchotageColor.signalBlueSoft
        case .error:
            return ChuchotageColor.cream
        }
    }

    private var translationTint: Color {
        switch status {
        case .connecting:
            return ChuchotageColor.cream
        case .listening:
            return hasReceivedTranslation ? ChuchotageColor.signalBlueSoft : ChuchotageColor.muted
        case .ready:
            return ChuchotageColor.muted
        case .error:
            return ChuchotageColor.cream
        }
    }
}

private struct MacStatusChip: View {
    let iconName: String
    let title: String
    let value: String
    let tint: Color

    var body: some View {
        VStack(alignment: .leading, spacing: 7) {
            HStack(spacing: 6) {
                Image(systemName: iconName)
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(tint)

                Text(title)
                    .font(.system(.caption2, design: .rounded, weight: .semibold))
                    .foregroundStyle(ChuchotageColor.muted)
                    .textCase(.uppercase)
                    .lineLimit(1)

                Spacer(minLength: 0)
            }

            Text(value)
                .font(.system(.caption, design: .rounded, weight: .semibold))
                .foregroundStyle(ChuchotageColor.text)
                .lineLimit(1)
                .minimumScaleFactor(0.82)
        }
        .padding(.horizontal, 10)
        .padding(.vertical, 9)
        .frame(maxWidth: .infinity, minHeight: 64, alignment: .leading)
        .background(ChuchotageColor.ink.opacity(0.36))
        .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
        .accessibilityElement(children: .combine)
    }
}

private struct MacCompactStatusStrip: View {
    let sourceValue: String
    let sessionValue: String
    let mixValue: String
    let sourceTint: Color
    let sessionTint: Color

    var body: some View {
        HStack(spacing: 6) {
            MacCompactStatusItem(
                iconName: "speaker.wave.2.fill",
                value: sourceValue,
                tint: sourceTint
            )

            MacCompactStatusItem(
                iconName: "waveform",
                value: sessionValue,
                tint: sessionTint
            )

            MacCompactStatusItem(
                iconName: "slider.horizontal.3",
                value: mixValue,
                tint: ChuchotageColor.signalBlueSoft
            )
        }
        .accessibilityElement(children: .combine)
    }
}

private struct MacCompactStatusItem: View {
    let iconName: String
    let value: String
    let tint: Color

    var body: some View {
        HStack(spacing: 5) {
            Image(systemName: iconName)
                .font(.system(size: 11, weight: .semibold))
                .foregroundStyle(tint)

            Text(value)
                .font(.system(.caption2, design: .rounded, weight: .semibold))
                .foregroundStyle(ChuchotageColor.text)
                .lineLimit(1)
                .minimumScaleFactor(0.72)
        }
        .padding(.horizontal, 8)
        .padding(.vertical, 7)
        .frame(maxWidth: .infinity)
        .background(ChuchotageColor.ink.opacity(0.36))
        .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
    }
}

private struct MacLiveTranscriptPanel: View {
    let isTranslating: Bool
    let originalTranscript: String
    let translatedTranscript: String

    var body: some View {
        VStack(alignment: .leading, spacing: 9) {
            HStack(alignment: .firstTextBaseline, spacing: 8) {
                Text(l10n: "transcript.title", defaultValue: "Transcript")
                    .font(.system(.subheadline, design: .rounded, weight: .semibold))
                    .foregroundStyle(ChuchotageColor.text)

                Spacer(minLength: 8)

                Text(
                    isTranslating
                        ? L10n.string("transcript.autoScrolling", defaultValue: "Auto-scrolling")
                        : L10n.string("transcript.sessionText", defaultValue: "Session text")
                )
                    .font(.system(.caption2, design: .rounded, weight: .semibold))
                    .foregroundStyle(isTranslating ? ChuchotageColor.signalBlueSoft : ChuchotageColor.muted)
            }

            MacTranscriptWindow(
                title: L10n.string("transcript.translated", defaultValue: "Translated"),
                transcript: translatedTranscript,
                placeholder: isTranslating
                    ? L10n.string(
                        "transcript.waitingTranslated",
                        defaultValue: "Waiting for translated speech."
                    )
                    : L10n.string(
                        "transcript.translatedAppearsHere",
                        defaultValue: "Translated speech appears here."
                    ),
                height: isTranslating ? 188 : 154,
                isPrimary: true
            )

            MacTranscriptWindow(
                title: L10n.string("transcript.original", defaultValue: "Original"),
                transcript: originalTranscript,
                placeholder: isTranslating
                    ? L10n.string(
                        "transcript.waitingSource",
                        defaultValue: "Waiting for source speech."
                    )
                    : L10n.string(
                        "transcript.originalAppearsHere",
                        defaultValue: "Original speech appears here."
                    ),
                height: isTranslating ? 76 : 64,
                isPrimary: false
            )
        }
    }
}

private struct MacTranscriptWindow: View {
    private static let bottomID = "mac-transcript-bottom"

    let title: String
    let transcript: String
    let placeholder: String
    let height: CGFloat
    let isPrimary: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(title)
                .font(.system(.caption2, design: .rounded, weight: .semibold))
                .foregroundStyle(ChuchotageColor.muted)
                .textCase(.uppercase)

            ScrollViewReader { proxy in
                ScrollView {
                    VStack(alignment: .leading, spacing: 0) {
                        Text(transcript.isEmpty ? placeholder : transcript)
                            .foregroundStyle(transcript.isEmpty ? ChuchotageColor.muted : transcriptColor)
                            .textSelection(.enabled)
                            .padding(.horizontal, 10)
                            .padding(.vertical, 9)
                            .frame(maxWidth: .infinity, alignment: .leading)

                        Color.clear
                            .frame(height: 1)
                            .id(Self.bottomID)
                    }
                    .font(transcriptFont)
                }
                .frame(height: height)
                .background(ChuchotageColor.ink.opacity(isPrimary ? 0.52 : 0.36))
                .overlay(
                    RoundedRectangle(cornerRadius: 8, style: .continuous)
                        .stroke(borderColor, lineWidth: 1)
                )
                .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
                .onAppear {
                    scrollToBottom(with: proxy, animated: false)
                }
                .onChange(of: transcript) {
                    scrollToBottom(with: proxy, animated: true)
                }
            }
        }
        .accessibilityLabel(title)
        .accessibilityValue(transcript.isEmpty ? placeholder : transcript)
    }

    private var transcriptFont: Font {
        isPrimary
            ? .system(.subheadline, design: .rounded, weight: .medium)
            : .system(.caption, design: .rounded, weight: .medium)
    }

    private var transcriptColor: Color {
        isPrimary ? ChuchotageColor.text : ChuchotageColor.muted
    }

    private var borderColor: Color {
        isPrimary ? ChuchotageColor.signalBlueSoft.opacity(0.34) : ChuchotageColor.ring.opacity(0.7)
    }

    private func scrollToBottom(with proxy: ScrollViewProxy, animated: Bool) {
        guard !transcript.isEmpty else { return }

        if animated {
            withAnimation(.easeOut(duration: 0.16)) {
                proxy.scrollTo(Self.bottomID, anchor: .bottom)
            }
        } else {
            proxy.scrollTo(Self.bottomID, anchor: .bottom)
        }
    }
}

#if os(iOS)
private struct IOSLiveTranscriptPanel: View {
    let status: TranslationStatus
    let originalTranscript: String
    let translatedTranscript: String
    let isCompact: Bool

    private var isTranslating: Bool {
        status == .connecting || status == .listening
    }

    var body: some View {
        VStack(alignment: .leading, spacing: isCompact ? 8 : 12) {
            HStack(alignment: .firstTextBaseline, spacing: 8) {
                Text(l10n: "transcript.liveTitle", defaultValue: "Live transcripts")
                    .font(.system(.subheadline, design: .rounded, weight: .semibold))
                    .foregroundStyle(ChuchotageColor.text)

                Spacer(minLength: 8)

                Text(statusLabel)
                    .font(.system(.caption, design: .rounded, weight: .semibold))
                    .foregroundStyle(statusTint)
            }

            if isCompact {
                HStack(alignment: .top, spacing: 8) {
                    translatedTranscriptCard
                    originalTranscriptCard
                }
            } else {
                translatedTranscriptCard
                originalTranscriptCard
            }
        }
        .padding(isCompact ? 10 : 12)
        .frame(maxWidth: isCompact ? .infinity : 460)
        .background(ChuchotageColor.surface.opacity(0.78))
        .overlay(
            RoundedRectangle(cornerRadius: 8, style: .continuous)
                .stroke(ChuchotageColor.ring.opacity(0.82), lineWidth: 1)
        )
        .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
    }

    private var translatedTranscriptCard: some View {
        IOSTranscriptCard(
            title: L10n.string("transcript.translated", defaultValue: "Translated"),
            transcript: translatedTranscript,
            placeholder: status == .connecting
                ? connectingPlaceholder
                : isTranslating
                ? L10n.string(
                    "transcript.waitingTranslated",
                    defaultValue: "Waiting for translated speech."
                )
                : L10n.string(
                    "transcript.translatedAppearsDuringSession",
                    defaultValue: "Translated speech appears during an active session."
                ),
            isCompact: isCompact
        )
    }

    private var originalTranscriptCard: some View {
        IOSTranscriptCard(
            title: L10n.string("transcript.original", defaultValue: "Original"),
            transcript: originalTranscript,
            placeholder: status == .connecting
                ? connectingPlaceholder
                : isTranslating
                ? L10n.string(
                    "transcript.waitingSource",
                    defaultValue: "Waiting for source speech."
                )
                : L10n.string(
                    "transcript.originalAppearsDuringSession",
                    defaultValue: "Original speech appears during an active session."
                ),
            isCompact: isCompact
        )
    }

    private var statusLabel: String {
        switch status {
        case .connecting:
            return L10n.string("status.connecting", defaultValue: "Connecting")
        case .listening:
            return L10n.string("status.listening", defaultValue: "Listening")
        case .ready, .error:
            return L10n.string("status.sessionStopped", defaultValue: "Session stopped")
        }
    }

    private var statusTint: Color {
        switch status {
        case .connecting:
            return ChuchotageColor.cream
        case .listening:
            return ChuchotageColor.signalBlueSoft
        case .ready, .error:
            return ChuchotageColor.muted
        }
    }

    private var connectingPlaceholder: String {
        L10n.string(
            "status.guidance.connecting",
            defaultValue: "Connecting. Wait before speaking."
        )
    }
}

private struct IOSTranscriptCard: View {
    private static let bottomID = "ios-transcript-bottom"

    let title: String
    let transcript: String
    let placeholder: String
    let isCompact: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(title)
                .font(.system(.caption, design: .rounded, weight: .semibold))
                .foregroundStyle(ChuchotageColor.muted)

            ScrollViewReader { proxy in
                ScrollView {
                    VStack(alignment: .leading, spacing: 0) {
                        if transcript.isEmpty {
                            Text(placeholder)
                                .foregroundStyle(ChuchotageColor.muted)
                        } else {
                            Text(transcript)
                                .foregroundStyle(ChuchotageColor.text)
                        }

                        Color.clear
                            .frame(height: 1)
                            .id(Self.bottomID)
                    }
                    .font(.system(.caption, design: .rounded, weight: .medium))
                    .textSelection(.enabled)
                    .padding(.horizontal, 10)
                    .padding(.vertical, 8)
                    .frame(maxWidth: .infinity, alignment: .leading)
                }
                .frame(height: isCompact ? 54 : 88)
                .background(ChuchotageColor.ink.opacity(0.45))
                .overlay(
                    RoundedRectangle(cornerRadius: 8, style: .continuous)
                        .stroke(ChuchotageColor.ring.opacity(0.72), lineWidth: 1)
                )
                .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
                .onAppear {
                    scrollToBottom(with: proxy, animated: false)
                }
                .onChange(of: transcript) {
                    scrollToBottom(with: proxy, animated: true)
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private func scrollToBottom(with proxy: ScrollViewProxy, animated: Bool) {
        guard !transcript.isEmpty else { return }

        if animated {
            withAnimation(.easeOut(duration: 0.16)) {
                proxy.scrollTo(Self.bottomID, anchor: .bottom)
            }
        } else {
            proxy.scrollTo(Self.bottomID, anchor: .bottom)
        }
    }
}

private struct IOSInlineWarning: View {
    let text: String
    let isCompact: Bool

    var body: some View {
        HStack(alignment: .top, spacing: 8) {
            Image(systemName: "exclamationmark.triangle.fill")
                .foregroundStyle(ChuchotageColor.cream)
                .font(.system(size: 14, weight: .semibold))

            Text(text)
                .font(.system(.caption, design: .rounded, weight: .medium))
                .foregroundStyle(ChuchotageColor.cream)
                .fixedSize(horizontal: false, vertical: true)

            Spacer(minLength: 0)
        }
        .padding(.horizontal, 10)
        .padding(.vertical, isCompact ? 7 : 8)
        .frame(maxWidth: 460)
        .background(ChuchotageColor.surface.opacity(0.78))
        .overlay(
            RoundedRectangle(cornerRadius: 8, style: .continuous)
                .stroke(ChuchotageColor.cream.opacity(0.28), lineWidth: 1)
        )
        .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
    }
}
#endif

private struct TranslationControl: View {
    let isTranslating: Bool
    let signalLevel: Double
    let action: () -> Void
    let isCompact: Bool

    private var visibleSignalLevel: Double {
        isTranslating ? min(max(signalLevel, 0), 1) : 0
    }

    var body: some View {
        Button(action: action) {
            ZStack {
                #if os(macOS)
                VolumeGlow(level: controlGlowLevel)
                #endif

                Circle()
                    .fill(ChuchotageColor.surface.opacity(controlSurfaceOpacity))
                    .overlay(
                        Circle()
                            .stroke(ChuchotageColor.ring.opacity(controlBorderOpacity), lineWidth: 1)
                    )
                    .shadow(color: ChuchotageColor.signalBlue.opacity(controlShadowOpacity), radius: controlShadowRadius)

                Circle()
                    .trim(from: 0, to: ringProgress)
                    .stroke(
                        ChuchotageColor.signalBlueSoft,
                        style: StrokeStyle(lineWidth: ringLineWidth, lineCap: .round)
                    )
                    .rotationEffect(.degrees(-90))
                    .padding(ringPadding)
                    .opacity(ringOpacity)

                VStack(spacing: controlContentSpacing) {
                    Image(systemName: isTranslating ? "stop.fill" : "waveform")
                        .font(.system(size: controlIconSize, weight: .semibold))
                        .foregroundStyle(isTranslating ? ChuchotageColor.cream : ChuchotageColor.signalBlueSoft)

                    Text(controlTitle)
                        .font(controlTitleFont)
                        .foregroundStyle(ChuchotageColor.text)
                        .multilineTextAlignment(.center)
                        .lineLimit(2)
                        .minimumScaleFactor(0.78)
                        .padding(.horizontal, controlTextPadding)
                }
            }
            .frame(width: controlSize, height: controlSize)
            .animation(.easeOut(duration: 0.12), value: visibleSignalLevel)
        }
        .buttonStyle(.plain)
        .accessibilityLabel(
            isTranslating
                ? L10n.string("translation.stop", defaultValue: "Stop translation")
                : L10n.string("translation.start", defaultValue: "Start translation")
        )
        .accessibilityValue(accessibilitySignalValue)
    }

    private var ringProgress: Double {
        guard isTranslating else { return 0.12 }
        return max(0.08, min(visibleSignalLevel, 0.92))
    }

    private var accessibilitySignalValue: String {
        guard isTranslating else { return L10n.string("status.idle", defaultValue: "Idle") }
        #if os(macOS)
        return visibleSignalLevel >= 0.08
            ? L10n.string("accessibility.detectedMacAudio", defaultValue: "Detected Mac audio")
            : L10n.string("accessibility.waitingForMacAudio", defaultValue: "Waiting for Mac audio")
        #else
        return visibleSignalLevel >= 0.08
            ? L10n.string(
                "accessibility.detectedMicrophoneAudio",
                defaultValue: "Detected microphone audio"
            )
            : L10n.string(
                "accessibility.waitingForMicrophoneAudio",
                defaultValue: "Waiting for microphone audio"
            )
        #endif
    }

    private var controlTitle: String {
        #if os(macOS)
        if isTranslating {
            return L10n.string("translation.stopShort", defaultValue: "Stop")
        }
        #endif
        return isTranslating
            ? L10n.string("translation.stop", defaultValue: "Stop translation")
            : L10n.string("translation.start", defaultValue: "Start translation")
    }

    private var controlSize: CGFloat {
        #if os(macOS)
        return isTranslating ? 78 : 172
        #else
        return isCompact ? 136 : 214
        #endif
    }

    private var controlIconSize: CGFloat {
        #if os(macOS)
        return isTranslating ? 17 : 24
        #else
        return isCompact ? 22 : 28
        #endif
    }

    private var controlTextPadding: CGFloat {
        #if os(macOS)
        return isTranslating ? 10 : 18
        #else
        return isCompact ? 14 : 22
        #endif
    }

    private var controlTitleFont: Font {
        #if os(macOS)
        return isTranslating
            ? .system(.caption2, design: .rounded, weight: .semibold)
            : .system(.subheadline, design: .rounded, weight: .semibold)
        #else
        return isCompact
            ? .system(.subheadline, design: .rounded, weight: .semibold)
            : .system(.headline, design: .rounded, weight: .semibold)
        #endif
    }

    private var ringLineWidth: CGFloat {
        #if os(macOS)
        return isTranslating ? 2.5 : 4
        #else
        return isCompact ? 4 : 5
        #endif
    }

    private var ringPadding: CGFloat {
        #if os(macOS)
        return isTranslating ? 6 : 10
        #else
        return isCompact ? 9 : 12
        #endif
    }

    private var controlContentSpacing: CGFloat {
        #if os(macOS)
        return isTranslating ? 4 : 10
        #else
        return isCompact ? 7 : 10
        #endif
    }

    private var controlGlowLevel: Double {
        #if os(macOS)
        return isTranslating ? 0 : visibleSignalLevel
        #else
        return visibleSignalLevel
        #endif
    }

    private var controlSurfaceOpacity: Double {
        #if os(macOS)
        return isTranslating ? 0.48 : 1
        #else
        return 1
        #endif
    }

    private var controlBorderOpacity: Double {
        #if os(macOS)
        return isTranslating ? 0.58 : 1
        #else
        return 1
        #endif
    }

    private var controlShadowOpacity: Double {
        #if os(macOS)
        return isTranslating ? 0.08 : 0.12
        #else
        return isTranslating ? 0.34 : 0.12
        #endif
    }

    private var controlShadowRadius: CGFloat {
        #if os(macOS)
        return isTranslating ? 8 : 24
        #else
        return 24
        #endif
    }

    private var ringOpacity: Double {
        #if os(macOS)
        return isTranslating ? 0.42 : 0.42
        #else
        return isTranslating ? 0.95 : 0.42
        #endif
    }
}

private struct VolumeGlow: View {
    let level: Double

    var body: some View {
        Circle()
            .fill(
                RadialGradient(
                    colors: [
                        ChuchotageColor.signalBlue.opacity(0.12 + level * 0.32),
                        ChuchotageColor.signalBlueSoft.opacity(0.08 + level * 0.20),
                        .clear,
                    ],
                    center: .center,
                    startRadius: 16,
                    endRadius: 116 + level * 54
                )
            )
            .scaleEffect(0.78 + level * 0.48)
            .opacity(level > 0.005 ? 1 : 0)
    }
}

private struct AudioSignalMeter: View {
    let level: Double
    let status: TranslationStatus
    let isCompact: Bool

    private var barCount: Int {
        #if os(macOS)
        return isCondensedOnMac ? 21 : 25
        #else
        return isCompact ? 25 : 33
        #endif
    }

    private var visibleLevel: Double {
        isActive ? min(max(level, 0), 1) : 0
    }

    private var isActive: Bool {
        status == .connecting || status == .listening
    }

    private var hasVisibleSignal: Bool {
        status == .listening && visibleLevel >= 0.08
    }

    private var signalText: String {
        switch status {
        case .ready:
            return L10n.string("status.idle", defaultValue: "Idle")
        case .connecting:
            return L10n.string("status.connecting", defaultValue: "Connecting")
        case .listening:
            return hasVisibleSignal
                ? L10n.string("signal.live", defaultValue: "Live signal")
                : L10n.string("signal.noneYet", defaultValue: "No signal yet")
        case .error:
            return L10n.string("status.error", defaultValue: "Error")
        }
    }

    var body: some View {
        VStack(spacing: meterSpacing) {
            if !isCondensed {
                HStack(alignment: .firstTextBaseline) {
                    Text(l10n: "signal.input", defaultValue: "Input signal")
                        .font(.system(.caption, design: .rounded, weight: .semibold))
                        .foregroundStyle(ChuchotageColor.muted)

                    Spacer(minLength: 12)

                    Text(signalText)
                        .font(.system(.caption, design: .rounded, weight: .semibold))
                        .foregroundStyle(hasVisibleSignal ? ChuchotageColor.signalBlueSoft : ChuchotageColor.muted)
                }
            }

            GeometryReader { geometry in
                HStack(alignment: .center, spacing: barSpacing) {
                    ForEach(0..<barCount, id: \.self) { index in
                        Capsule()
                            .fill(barFill)
                            .frame(
                                width: barWidth,
                                height: max(minBarHeight, geometry.size.height * barHeightFraction(at: index))
                            )
                            .opacity(barOpacity(at: index))
                    }
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .center)
            }
            .frame(height: meterBarHeight)

            GeometryReader { geometry in
                ZStack(alignment: .leading) {
                    Rectangle()
                        .fill(ChuchotageColor.surface.opacity(0.74))
                        .overlay(
                            Rectangle()
                                .stroke(ChuchotageColor.ring.opacity(0.8), lineWidth: 1)
                        )

                    Rectangle()
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
                        .frame(width: geometry.size.width * visibleLevel)
                }
            }
            .frame(height: meterLevelHeight)
        }
        .frame(maxWidth: meterWidth)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(L10n.string("accessibility.audioInputSignal", defaultValue: "Audio input signal"))
        .accessibilityValue(signalText)
        .animation(.easeOut(duration: 0.09), value: visibleLevel)
    }

    private func barHeightFraction(at index: Int) -> Double {
        let midpoint = Double(barCount - 1) / 2
        let distanceFromCenter = abs(Double(index) - midpoint) / midpoint
        guard hasVisibleSignal else {
            return 0.08 + (1 - distanceFromCenter) * 0.10
        }
        let accent = index.isMultiple(of: 7) || index.isMultiple(of: 11) ? 0.16 : 0
        let activeLift = visibleLevel * (0.28 + (1 - distanceFromCenter) * 0.28)
        return min(0.96, max(0.14, 0.18 + (1 - distanceFromCenter) * 0.50 + accent + activeLift))
    }

    private func barOpacity(at index: Int) -> Double {
        guard hasVisibleSignal else {
            return 0.18
        }
        let midpoint = Double(barCount - 1) / 2
        let distanceFromCenter = abs(Double(index) - midpoint) / midpoint
        return min(1, max(0.38, 0.44 + (1 - distanceFromCenter) * 0.38 + visibleLevel * 0.24))
    }

    private var meterBarHeight: CGFloat {
        #if os(macOS)
        return isCondensedOnMac ? 24 : 44
        #else
        return isCompact ? 36 : 76
        #endif
    }

    private var meterWidth: CGFloat {
        #if os(macOS)
        return isCondensedOnMac ? 240 : 300
        #else
        return isCompact ? 300 : 380
        #endif
    }

    private var barSpacing: CGFloat {
        #if os(macOS)
        return isCondensedOnMac ? 3.5 : 4
        #else
        return isCompact ? 3.5 : 5
        #endif
    }

    private var barWidth: CGFloat {
        #if os(macOS)
        return isCondensedOnMac ? 2 : 2.5
        #else
        return isCompact ? 2.5 : 3
        #endif
    }

    private var minBarHeight: CGFloat {
        #if os(macOS)
        return isCondensedOnMac ? 5 : 8
        #else
        return isCompact ? 6 : 12
        #endif
    }

    private var meterSpacing: CGFloat {
        #if os(macOS)
        return isCondensedOnMac ? 5 : 10
        #else
        return isCompact ? 6 : 10
        #endif
    }

    private var meterLevelHeight: CGFloat {
        #if os(macOS)
        return isCondensedOnMac ? 5 : 10
        #else
        return isCompact ? 6 : 10
        #endif
    }

    private var isCondensed: Bool {
        #if os(macOS)
        return isCondensedOnMac
        #else
        return isCompact
        #endif
    }

    private var isCondensedOnMac: Bool {
        #if os(macOS)
        return isActive
        #else
        return false
        #endif
    }

    private var barFill: AnyShapeStyle {
        if hasVisibleSignal {
            return AnyShapeStyle(
                LinearGradient(
                    colors: [
                        ChuchotageColor.cream,
                        ChuchotageColor.signalBlueSoft,
                        ChuchotageColor.signalBlue,
                    ],
                    startPoint: .top,
                    endPoint: .bottom
                )
            )
        }
        return AnyShapeStyle(ChuchotageColor.ring)
    }
}

#Preview {
    AppRootView(viewModel: TranslationViewModel())
}
