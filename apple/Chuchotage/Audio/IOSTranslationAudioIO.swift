#if os(iOS)
@preconcurrency import AVFoundation
import Foundation

final class IOSTranslationAudioIO: TranslationAudioIO, @unchecked Sendable {
    private let stateQueue = DispatchQueue(label: "ai.chuchotage.ios-audio-io.state")
    private var engine: AVAudioEngine?
    private var playerNode: AVAudioPlayerNode?
    private var continuation: AsyncStream<PcmAudioChunk>.Continuation?
    private var observers: [NSObjectProtocol] = []
    private var activeSettings: TranslationSettings?
    private var unexpectedStopErrorMessage: String?

    func start(settings: TranslationSettings) async throws -> AsyncStream<PcmAudioChunk> {
        await stop()
        stateQueue.sync {
            unexpectedStopErrorMessage = nil
        }
        guard settings.audioInputSource != .deviceAudio else {
            throw TranslationAudioIOError.iOSDeviceAudioUnavailable
        }
        try await requestMicrophonePermission()

        let session = AVAudioSession.sharedInstance()

        do {
            try configureSession(session, settings: settings)
            let stream = try startEngine(settings: settings)
            installSessionObservers(session: session)
            return stream
        } catch let error as TranslationAudioIOError {
            await cleanupAfterStartFailure(session: session)
            throw error
        } catch {
            await cleanupAfterStartFailure(session: session)
            throw TranslationAudioIOError.audioEngineStartUnavailable
        }
    }

    func playTranslatedAudio(_ pcm16: Data) async {
        guard !pcm16.isEmpty, let buffer = Self.makePlaybackBuffer(from: pcm16) else { return }

        let player = stateQueue.sync { playerNode }

        guard let player else { return }
        player.scheduleBuffer(buffer, completionCallbackType: .dataConsumed, completionHandler: nil)
        if !player.isPlaying {
            player.play()
        }
    }

    func stop() async {
        await stop(preserveUnexpectedStopReason: false)
    }

    func updateSettings(_ settings: TranslationSettings) async {
        stateQueue.sync {
            activeSettings = settings
        }

        guard stateQueue.sync(execute: { engine != nil }) else { return }

        let session = AVAudioSession.sharedInstance()
        do {
            try applySessionRoute(settings: settings, session: session)
        } catch let error as TranslationAudioIOError {
            stateQueue.sync {
                unexpectedStopErrorMessage = error.localizedDescription
            }
            await stop(preserveUnexpectedStopReason: true)
        } catch {
            stateQueue.sync {
                unexpectedStopErrorMessage = TranslationAudioIOError.audioSessionConfigurationFailed.localizedDescription
            }
            await stop(preserveUnexpectedStopReason: true)
        }
    }

    func consumeUnexpectedStopErrorMessage() async -> String? {
        stateQueue.sync {
            let message = unexpectedStopErrorMessage
            unexpectedStopErrorMessage = nil
            return message
        }
    }

    private func stop(preserveUnexpectedStopReason: Bool) async {
        let snapshot = takeSnapshotForStop()

        snapshot.continuation?.finish()
        snapshot.engine?.inputNode.removeTap(onBus: 0)
        snapshot.playerNode?.stop()
        snapshot.engine?.stop()
        snapshot.engine?.reset()

        let center = NotificationCenter.default
        for observer in snapshot.observers {
            center.removeObserver(observer)
        }

        let session = AVAudioSession.sharedInstance()
        try? session.overrideOutputAudioPort(.none)
        try? session.setPreferredInput(nil)
        try? session.setActive(false, options: [.notifyOthersOnDeactivation])

        if !preserveUnexpectedStopReason {
            stateQueue.sync {
                unexpectedStopErrorMessage = nil
            }
        }
    }

    private func requestMicrophonePermission() async throws {
        switch AVAudioApplication.shared.recordPermission {
        case .granted:
            return
        case .denied:
            throw TranslationAudioIOError.microphonePermissionDenied
        case .undetermined:
            let granted = await withCheckedContinuation { continuation in
                AVAudioApplication.requestRecordPermission { granted in
                    continuation.resume(returning: granted)
                }
            }
            guard granted else {
                throw TranslationAudioIOError.microphonePermissionDenied
            }
        @unknown default:
            throw TranslationAudioIOError.microphonePermissionDenied
        }
    }

    private func configureSession(
        _ session: AVAudioSession,
        settings: TranslationSettings
    ) throws {
        do {
            try session.setCategory(
                .playAndRecord,
                mode: .voiceChat,
                options: sessionCategoryOptions(for: settings.audioOutputRoute)
            )
            try session.setPreferredSampleRate(Double(RealtimePcmFormat.sampleRate))
            try session.setPreferredIOBufferDuration(0.02)
            try session.setActive(true, options: [])
            try applySessionRoute(settings: settings, session: session)
        } catch let error as TranslationAudioIOError {
            throw error
        } catch {
            throw TranslationAudioIOError.audioSessionConfigurationFailed
        }
    }

    private func applySessionRoute(
        settings: TranslationSettings,
        session: AVAudioSession
    ) throws {
        try configureInput(settings.audioInputSource, session: session)
        try configureOutput(settings.audioOutputRoute, session: session)
        try validateActiveRoute(settings: settings, session: session)
    }

    private func sessionCategoryOptions(
        for outputRoute: AudioOutputRoute
    ) -> AVAudioSession.CategoryOptions {
        var options: AVAudioSession.CategoryOptions = [
            .allowBluetoothHFP,
            .allowBluetoothA2DP
        ]

        if outputRoute == .deviceSpeaker {
            options.insert(.defaultToSpeaker)
        }

        return options
    }

    private func configureInput(
        _ inputSource: AudioInputSource,
        session: AVAudioSession
    ) throws {
        guard let inputs = session.availableInputs, !inputs.isEmpty else {
            throw TranslationAudioIOError.microphoneUnavailable
        }

        switch inputSource {
        case .builtIn:
            // iOS can keep Bluetooth input/output paired, so Phone mic is a preference here.
            guard let builtInInput = inputs.first(where: { $0.portType == .builtInMic }) else {
                try? session.setPreferredInput(nil)
                return
            }

            do {
                try session.setPreferredInput(builtInInput)
            } catch {
                try? session.setPreferredInput(nil)
            }

        case .headset:
            guard let headsetInput = inputs.first(where: { Self.isHeadsetInput($0.portType) }) else {
                throw TranslationAudioIOError.headsetMicrophoneUnavailable
            }
            try session.setPreferredInput(headsetInput)
        case .deviceAudio:
            throw TranslationAudioIOError.iOSDeviceAudioUnavailable
        }
    }

    private func configureOutput(
        _ outputRoute: AudioOutputRoute,
        session: AVAudioSession
    ) throws {
        switch outputRoute {
        case .systemDefault, .headphones:
            try session.overrideOutputAudioPort(.none)
        case .deviceSpeaker:
            try session.overrideOutputAudioPort(.speaker)
        }
    }

    private func validateActiveRoute(
        settings: TranslationSettings,
        session: AVAudioSession
    ) throws {
        switch settings.audioInputSource {
        case .builtIn:
            guard !session.currentRoute.inputs.isEmpty else {
                throw TranslationAudioIOError.microphoneUnavailable
            }
        case .headset:
            guard session.currentRoute.inputs.contains(where: { Self.isHeadsetInput($0.portType) }) else {
                throw TranslationAudioIOError.headsetMicrophoneUnavailable
            }
        case .deviceAudio:
            throw TranslationAudioIOError.iOSDeviceAudioUnavailable
        }

        switch settings.audioOutputRoute {
        case .systemDefault:
            break
        case .deviceSpeaker:
            guard session.currentRoute.outputs.contains(where: { $0.portType == .builtInSpeaker }) else {
                throw TranslationAudioIOError.audioSessionConfigurationFailed
            }
        case .headphones:
            guard session.currentRoute.outputs.contains(where: { Self.isHeadphoneOutput($0.portType) }) else {
                throw TranslationAudioIOError.headphoneOutputUnavailable
            }
        }
    }

    private func startEngine(settings: TranslationSettings) throws -> AsyncStream<PcmAudioChunk> {
        let audioEngine = AVAudioEngine()
        let player = AVAudioPlayerNode()
        let inputNode = audioEngine.inputNode
        let inputFormat = inputNode.outputFormat(forBus: 0)

        guard inputFormat.channelCount > 0, inputFormat.sampleRate > 0 else {
            throw TranslationAudioIOError.microphoneUnavailable
        }

        guard let captureFormat = AVAudioFormat(
            commonFormat: .pcmFormatInt16,
            sampleRate: Double(RealtimePcmFormat.sampleRate),
            channels: AVAudioChannelCount(RealtimePcmFormat.channelCount),
            interleaved: false
        ), let converter = AVAudioConverter(from: inputFormat, to: captureFormat),
           let playbackFormat = AVAudioFormat(
            standardFormatWithSampleRate: Double(RealtimePcmFormat.sampleRate),
            channels: AVAudioChannelCount(RealtimePcmFormat.channelCount)
           ) else {
            throw TranslationAudioIOError.audioEngineStartUnavailable
        }

        let streamPair = AsyncStream.makeStream(
            of: PcmAudioChunk.self,
            bufferingPolicy: .bufferingNewest(64)
        )

        audioEngine.attach(player)
        audioEngine.connect(player, to: audioEngine.mainMixerNode, format: playbackFormat)

        inputNode.installTap(
            onBus: 0,
            bufferSize: 1_024,
            format: inputFormat
        ) { buffer, _ in
            guard let pcm16 = Self.convertInputBuffer(
                buffer,
                converter: converter,
                outputFormat: captureFormat
            ), !pcm16.isEmpty else {
                return
            }
            streamPair.continuation.yield(PcmAudioChunk(pcm16: pcm16))
        }

        do {
            audioEngine.prepare()
            try audioEngine.start()
            player.play()
        } catch {
            inputNode.removeTap(onBus: 0)
            streamPair.continuation.finish()
            throw TranslationAudioIOError.audioEngineStartUnavailable
        }

        streamPair.continuation.onTermination = { [weak self] _ in
            Task {
                await self?.stop(preserveUnexpectedStopReason: true)
            }
        }

        stateQueue.sync {
            engine = audioEngine
            playerNode = player
            continuation = streamPair.continuation
            activeSettings = settings
        }

        return streamPair.stream
    }

    private func installSessionObservers(session: AVAudioSession) {
        let center = NotificationCenter.default

        let interruptionObserver = center.addObserver(
            forName: AVAudioSession.interruptionNotification,
            object: session,
            queue: nil
        ) { [weak self] notification in
            guard let typeValue = notification.userInfo?[AVAudioSessionInterruptionTypeKey] as? UInt else {
                return
            }
            guard let interruptionType = AVAudioSession.InterruptionType(rawValue: typeValue) else { return }

            switch interruptionType {
            case .began:
                Task {
                    await self?.handleInterruptionBegan()
                }
            case .ended:
                break
            @unknown default:
                break
            }
        }

        let routeObserver = center.addObserver(
            forName: AVAudioSession.routeChangeNotification,
            object: session,
            queue: nil
        ) { [weak self] _ in
            Task {
                await self?.handleRouteChange()
            }
        }

        stateQueue.sync {
            observers.append(interruptionObserver)
            observers.append(routeObserver)
        }
    }

    private func handleRouteChange() async {
        let settings = stateQueue.sync { activeSettings }

        guard let settings else { return }

        let session = AVAudioSession.sharedInstance()
        do {
            try configureInput(settings.audioInputSource, session: session)
            try configureOutput(settings.audioOutputRoute, session: session)
            try validateActiveRoute(settings: settings, session: session)
        } catch {
            if let audioError = error as? TranslationAudioIOError {
                stateQueue.sync {
                    unexpectedStopErrorMessage = audioError.localizedDescription
                }
            } else {
                stateQueue.sync {
                    unexpectedStopErrorMessage = TranslationAudioIOError.audioSessionConfigurationFailed.localizedDescription
                }
            }
            await stop(preserveUnexpectedStopReason: true)
        }
    }

    private func handleInterruptionBegan() async {
        stateQueue.sync {
            unexpectedStopErrorMessage = L10n.string(
                "error.audioInterrupted",
                defaultValue: "Audio was interrupted by another app or call. Start translation again when your audio route is available."
            )
        }
        await stop(preserveUnexpectedStopReason: true)
    }

    private func cleanupAfterStartFailure(session: AVAudioSession) async {
        await stop()
        try? session.overrideOutputAudioPort(.none)
        try? session.setPreferredInput(nil)
        try? session.setActive(false, options: [.notifyOthersOnDeactivation])
    }

    private func takeSnapshotForStop() -> StopSnapshot {
        stateQueue.sync {
            let snapshot = StopSnapshot(
                engine: engine,
                playerNode: playerNode,
                continuation: continuation,
                observers: observers
            )
            engine = nil
            playerNode = nil
            continuation = nil
            observers = []
            activeSettings = nil
            return snapshot
        }
    }

    private static func convertInputBuffer(
        _ inputBuffer: AVAudioPCMBuffer,
        converter: AVAudioConverter,
        outputFormat: AVAudioFormat
    ) -> Data? {
        let ratio = outputFormat.sampleRate / inputBuffer.format.sampleRate
        let outputFrameCapacity = AVAudioFrameCount(
            max(1, ceil(Double(inputBuffer.frameLength) * ratio) + 8)
        )

        guard let outputBuffer = AVAudioPCMBuffer(
            pcmFormat: outputFormat,
            frameCapacity: outputFrameCapacity
        ) else {
            return nil
        }

        var conversionError: NSError?
        let inputProvider = ConverterInputProvider(buffer: inputBuffer)
        let status = converter.convert(to: outputBuffer, error: &conversionError) { _, outStatus in
            inputProvider.nextBuffer(outStatus: outStatus)
        }

        guard conversionError == nil,
              status != .error,
              outputBuffer.frameLength > 0,
              let channelData = outputBuffer.int16ChannelData else {
            return nil
        }

        return Data(
            bytes: channelData[0],
            count: Int(outputBuffer.frameLength) * RealtimePcmFormat.bytesPerSample
        )
    }

    private static func makePlaybackBuffer(from pcm16: Data) -> AVAudioPCMBuffer? {
        let sampleCount = pcm16.count / RealtimePcmFormat.bytesPerSample
        guard sampleCount > 0,
              let format = AVAudioFormat(
                standardFormatWithSampleRate: Double(RealtimePcmFormat.sampleRate),
                channels: AVAudioChannelCount(RealtimePcmFormat.channelCount)
              ),
              let buffer = AVAudioPCMBuffer(
                pcmFormat: format,
                frameCapacity: AVAudioFrameCount(sampleCount)
              ),
              let output = buffer.floatChannelData?[0] else {
            return nil
        }

        buffer.frameLength = AVAudioFrameCount(sampleCount)
        pcm16.withUnsafeBytes { rawBuffer in
            let bytes = rawBuffer.bindMemory(to: UInt8.self)
            for sampleIndex in 0..<sampleCount {
                let byteIndex = sampleIndex * RealtimePcmFormat.bytesPerSample
                let low = UInt16(bytes[byteIndex])
                let high = UInt16(bytes[byteIndex + 1]) << 8
                let sample = Int16(bitPattern: high | low)
                output[sampleIndex] = max(-1, min(1, Float(sample) / 32_768.0))
            }
        }

        return buffer
    }

    private static func isHeadsetInput(_ portType: AVAudioSession.Port) -> Bool {
        switch portType {
        case .headsetMic, .bluetoothHFP, .bluetoothLE:
            return true
        default:
            return false
        }
    }

    private static func isHeadphoneOutput(_ portType: AVAudioSession.Port) -> Bool {
        switch portType {
        case .headphones, .bluetoothA2DP, .bluetoothHFP, .bluetoothLE:
            return true
        default:
            return false
        }
    }

    private struct StopSnapshot {
        let engine: AVAudioEngine?
        let playerNode: AVAudioPlayerNode?
        let continuation: AsyncStream<PcmAudioChunk>.Continuation?
        let observers: [NSObjectProtocol]
    }

    private final class ConverterInputProvider: @unchecked Sendable {
        private let lock = NSLock()
        private let buffer: AVAudioPCMBuffer
        private var didProvideBuffer = false

        init(buffer: AVAudioPCMBuffer) {
            self.buffer = buffer
        }

        func nextBuffer(outStatus: UnsafeMutablePointer<AVAudioConverterInputStatus>) -> AVAudioBuffer? {
            lock.lock()
            defer { lock.unlock() }

            if didProvideBuffer {
                outStatus.pointee = .noDataNow
                return nil
            }

            didProvideBuffer = true
            outStatus.pointee = .haveData
            return buffer
        }
    }
}
#endif
