#if os(macOS)
@preconcurrency import AVFoundation
@preconcurrency import AudioToolbox
@preconcurrency import CoreAudio
import Darwin
import Foundation

final class MacOSTranslationAudioIO: TranslationAudioIO, @unchecked Sendable {
    private let stateQueue = DispatchQueue(label: "ai.chuchotage.macos-audio-io.state")
    private var state = State()

    func start(settings: TranslationSettings) async throws -> AsyncStream<PcmAudioChunk> {
        await stop()

        if settings.macCaptureSource == .microphone {
            return try await startMicrophoneCapture(settings: settings)
        }

        guard #available(macOS 14.2, *) else {
            throw TranslationAudioIOError.systemAudioRequiresMacOS14_2
        }

        return try startProcessTapCapture(settings: settings)
    }

    func playTranslatedAudio(_ pcm16: Data) async {
        let snapshot = stateQueue.sync {
            (player: state.translatedPlayerNode, gain: state.translatedGain, active: state.isActive)
        }

        Self.playPcm16(pcm16, on: snapshot.player, gain: snapshot.gain, isActive: snapshot.active)
    }

    func updateSettings(_ settings: TranslationSettings) async {
        let gains = Self.playbackGains(for: settings)
        stateQueue.sync {
            state.translatedGain = gains.translated
            state.translatedPlayerNode?.volume = Float(gains.translated)
            state.originalPlayerNode?.volume = Float(gains.original)
            state.captureProcessor?.updateOriginalMonitorGain(gains.original)
        }
    }

    func consumeUnexpectedStopErrorMessage() async -> String? {
        stateQueue.sync {
            guard let message = state.unexpectedStopErrorMessage else { return nil }
            state.unexpectedStopErrorMessage = nil
            return message
        }
    }

    func stop() async {
        let snapshot = stateQueue.sync {
            let snapshot = state
            state = State()
            return snapshot
        }

        snapshot.captureProcessor?.stop()
        snapshot.outputDeviceWatcher?.stop()
        snapshot.captureContinuation?.finish()
        snapshot.microphoneCaptureEngine?.inputNode.removeTap(onBus: 0)
        snapshot.microphoneCaptureEngine?.stop()
        snapshot.microphoneCaptureEngine?.reset()

        if #available(macOS 14.2, *) {
            if let ioProcID = snapshot.ioProcID,
               snapshot.aggregateDeviceID != kAudioObjectUnknown {
                AudioDeviceStop(snapshot.aggregateDeviceID, ioProcID)
                AudioDeviceDestroyIOProcID(snapshot.aggregateDeviceID, ioProcID)
            }

            if snapshot.aggregateDeviceID != kAudioObjectUnknown {
                AudioHardwareDestroyAggregateDevice(snapshot.aggregateDeviceID)
            }

            if snapshot.tapID != kAudioObjectUnknown {
                AudioHardwareDestroyProcessTap(snapshot.tapID)
            }
        }

        snapshot.originalPlayerNode?.stop()
        snapshot.translatedPlayerNode?.stop()
        snapshot.playbackEngine?.stop()
        snapshot.playbackEngine?.reset()
    }

    @available(macOS 14.2, *)
    private func startProcessTapCapture(settings: TranslationSettings) throws -> AsyncStream<PcmAudioChunk> {
        let streamPair = AsyncStream.makeStream(
            of: PcmAudioChunk.self,
            bufferingPolicy: .bufferingNewest(maxQueuedCaptureChunks)
        )
        var tapID = AudioObjectID(kAudioObjectUnknown)
        var aggregateDeviceID = AudioObjectID(kAudioObjectUnknown)
        var ioProcID: AudioDeviceIOProcID?
        var playbackEngine: AVAudioEngine?
        var translatedPlayerNode: AVAudioPlayerNode?
        var originalPlayerNode: AVAudioPlayerNode?
        var outputDeviceWatcher: MacSelectedOutputDeviceWatcher?
        let gains = Self.playbackGains(for: settings)

        do {
            let playback = try Self.startPlaybackEngine(
                gains: gains,
                outputSelection: settings.macOutputDeviceSelection
            )
            playbackEngine = playback.engine
            translatedPlayerNode = playback.translatedPlayer
            originalPlayerNode = playback.originalPlayer

            tapID = try Self.createTap(
                for: settings.macCaptureSource,
                muteBehavior: Self.tapMuteBehavior(for: settings.macOriginalAudioMode)
            )
            let tapUID = try Self.tapUID(for: tapID)
            let tapFormat = try Self.tapFormat(for: tapID)
            aggregateDeviceID = try Self.createAggregateDevice(forTapUID: tapUID)

            let captureProcessor = MacOSSystemAudioCaptureProcessor(
                format: tapFormat,
                continuation: streamPair.continuation,
                originalMonitor: MacOSPcmPlaybackChannel(
                    player: originalPlayerNode,
                    gain: gains.original
                )
            )
            let ioBlock: AudioDeviceIOBlock = { _, inputData, _, _, _ in
                captureProcessor.capture(inputData)
            }

            try Self.check(
                AudioDeviceCreateIOProcIDWithBlock(&ioProcID, aggregateDeviceID, nil, ioBlock),
                operation: "Create Core Audio capture callback"
            )

            guard let ioProcID else {
                throw TranslationAudioIOError.systemAudioCaptureStartFailed(
                    "Core Audio did not return a capture callback."
                )
            }

            try Self.check(
                AudioDeviceStart(aggregateDeviceID, ioProcID),
                operation: "Start Core Audio capture"
            )

            stateQueue.sync {
                state = State(
                    tapID: tapID,
                    aggregateDeviceID: aggregateDeviceID,
                    ioProcID: ioProcID,
                    playbackEngine: playbackEngine,
                    translatedPlayerNode: translatedPlayerNode,
                    originalPlayerNode: originalPlayerNode,
                    translatedGain: gains.translated,
                    captureProcessor: captureProcessor,
                    captureContinuation: streamPair.continuation,
                    outputDeviceWatcher: outputDeviceWatcher,
                    isActive: true
                )
            }

            outputDeviceWatcher = startOutputDeviceWatcherIfNeeded(
                selection: settings.macOutputDeviceSelection,
                continuation: streamPair.continuation
            )
            stateQueue.sync {
                state.outputDeviceWatcher = outputDeviceWatcher
            }

            streamPair.continuation.onTermination = { [weak self] _ in
                Task {
                    await self?.stop()
                }
            }

            return streamPair.stream
        } catch {
            streamPair.continuation.finish()
            if let ioProcID, aggregateDeviceID != kAudioObjectUnknown {
                AudioDeviceStop(aggregateDeviceID, ioProcID)
                AudioDeviceDestroyIOProcID(aggregateDeviceID, ioProcID)
            }
            if aggregateDeviceID != kAudioObjectUnknown {
                AudioHardwareDestroyAggregateDevice(aggregateDeviceID)
            }
            if tapID != kAudioObjectUnknown {
                AudioHardwareDestroyProcessTap(tapID)
            }
            originalPlayerNode?.stop()
            translatedPlayerNode?.stop()
            playbackEngine?.stop()
            playbackEngine?.reset()
            outputDeviceWatcher?.stop()
            throw error
        }
    }

    private func startMicrophoneCapture(settings: TranslationSettings) async throws -> AsyncStream<PcmAudioChunk> {
        guard await Self.requestMicrophonePermission() else {
            throw TranslationAudioIOError.microphonePermissionDenied
        }

        let streamPair = AsyncStream.makeStream(
            of: PcmAudioChunk.self,
            bufferingPolicy: .bufferingNewest(maxQueuedCaptureChunks)
        )
        var playbackEngine: AVAudioEngine?
        var translatedPlayerNode: AVAudioPlayerNode?
        var originalPlayerNode: AVAudioPlayerNode?
        var microphoneCaptureEngine: AVAudioEngine?
        var outputDeviceWatcher: MacSelectedOutputDeviceWatcher?
        let gains = Self.playbackGains(for: settings)

        do {
            let playback = try Self.startPlaybackEngine(
                gains: gains,
                outputSelection: settings.macOutputDeviceSelection
            )
            playbackEngine = playback.engine
            translatedPlayerNode = playback.translatedPlayer
            originalPlayerNode = playback.originalPlayer

            let captureEngine = AVAudioEngine()
            microphoneCaptureEngine = captureEngine
            let inputNode = captureEngine.inputNode
            let inputFormat = inputNode.outputFormat(forBus: 0)
            guard inputFormat.channelCount > 0, inputFormat.sampleRate > 0 else {
                throw TranslationAudioIOError.microphoneUnavailable
            }

            inputNode.installTap(onBus: 0, bufferSize: 1_024, format: inputFormat) { buffer, _ in
                guard let pcm16 = MacOSAVAudioPcmConverter.convert(buffer), !pcm16.isEmpty else {
                    return
                }
                streamPair.continuation.yield(PcmAudioChunk(pcm16: pcm16))
            }

            do {
                captureEngine.prepare()
                try captureEngine.start()
            } catch {
                inputNode.removeTap(onBus: 0)
                throw TranslationAudioIOError.audioEngineStartFailed(error.localizedDescription)
            }

            outputDeviceWatcher = startOutputDeviceWatcherIfNeeded(
                selection: settings.macOutputDeviceSelection,
                continuation: streamPair.continuation
            )

            stateQueue.sync {
                state = State(
                    playbackEngine: playbackEngine,
                    translatedPlayerNode: translatedPlayerNode,
                    originalPlayerNode: originalPlayerNode,
                    translatedGain: gains.translated,
                    captureContinuation: streamPair.continuation,
                    microphoneCaptureEngine: microphoneCaptureEngine,
                    outputDeviceWatcher: outputDeviceWatcher,
                    isActive: true
                )
            }

            streamPair.continuation.onTermination = { [weak self] _ in
                Task {
                    await self?.stop()
                }
            }

            return streamPair.stream
        } catch {
            streamPair.continuation.finish()
            outputDeviceWatcher?.stop()
            microphoneCaptureEngine?.inputNode.removeTap(onBus: 0)
            microphoneCaptureEngine?.stop()
            microphoneCaptureEngine?.reset()
            originalPlayerNode?.stop()
            translatedPlayerNode?.stop()
            playbackEngine?.stop()
            playbackEngine?.reset()
            throw error
        }
    }

    private static func startPlaybackEngine(
        gains: (original: Double, translated: Double),
        outputSelection: MacOutputDeviceSelection
    ) throws -> PlaybackSession {
        let audioEngine = AVAudioEngine()
        let translatedPlayer = AVAudioPlayerNode()
        let originalPlayer = AVAudioPlayerNode()
        let selectedOutputDeviceID = try MacAudioOutputDeviceManager.deviceID(for: outputSelection)

        guard let playbackFormat = AVAudioFormat(
            standardFormatWithSampleRate: Double(RealtimePcmFormat.sampleRate),
            channels: AVAudioChannelCount(RealtimePcmFormat.channelCount)
        ) else {
            throw TranslationAudioIOError.audioEngineStartUnavailable
        }

        translatedPlayer.volume = Float(gains.translated)
        originalPlayer.volume = Float(gains.original)

        audioEngine.attach(translatedPlayer)
        audioEngine.attach(originalPlayer)
        audioEngine.connect(translatedPlayer, to: audioEngine.mainMixerNode, format: playbackFormat)
        audioEngine.connect(originalPlayer, to: audioEngine.mainMixerNode, format: playbackFormat)

        do {
            audioEngine.prepare()
            if var selectedOutputDeviceID, let outputUnit = audioEngine.outputNode.audioUnit {
                try MacAudioCore.check(
                    AudioUnitSetProperty(
                        outputUnit,
                        kAudioOutputUnitProperty_CurrentDevice,
                        kAudioUnitScope_Global,
                        0,
                        &selectedOutputDeviceID,
                        UInt32(MemoryLayout<AudioObjectID>.size)
                    ),
                    operation: "Select translated audio output device"
                )
            }
            try audioEngine.start()
            translatedPlayer.play()
            originalPlayer.play()
        } catch {
            throw TranslationAudioIOError.audioEngineStartFailed(error.localizedDescription)
        }

        return PlaybackSession(
            engine: audioEngine,
            translatedPlayer: translatedPlayer,
            originalPlayer: originalPlayer
        )
    }

    @available(macOS 14.2, *)
    private static func createTap(
        for source: MacCaptureSource,
        muteBehavior: CATapMuteBehavior
    ) throws -> AudioObjectID {
        let description: CATapDescription
        switch source {
        case .systemAudio:
            let processObjectID = try MacAudioCore.currentProcessAudioObjectID()
            description = CATapDescription(
                stereoGlobalTapButExcludeProcesses: [processObjectID]
            )
        case .selectedApp:
            let processObjectIDs = try MacAudioProcessCatalog.processObjectIDs(for: source)
            description = CATapDescription(stereoMixdownOfProcesses: processObjectIDs)
            if #available(macOS 26.0, *) {
                if case .selectedApp(let bundleID, _) = source {
                    description.bundleIDs = [bundleID]
                    description.isProcessRestoreEnabled = true
                }
            }
        case .microphone:
            throw TranslationAudioIOError.systemAudioCaptureStartFailed(
                "Microphone capture does not use Core Audio process taps."
            )
        }
        description.name = "Chuchotage \(source.title)"
        description.isPrivate = true
        description.muteBehavior = muteBehavior

        var tapID = AudioObjectID(kAudioObjectUnknown)
        try MacAudioCore.check(
            AudioHardwareCreateProcessTap(description, &tapID),
            operation: "Create Mac audio tap"
        )

        guard tapID != kAudioObjectUnknown else {
            throw TranslationAudioIOError.systemAudioCaptureStartFailed(
                "Core Audio did not return a system audio tap."
            )
        }

        return tapID
    }

    @available(macOS 14.2, *)
    private static func tapMuteBehavior(for mode: MacOriginalAudioMode) -> CATapMuteBehavior {
        switch mode {
        case .leaveAlone:
            return .unmuted
        case .lower, .mute:
            return .mutedWhenTapped
        }
    }

    @available(macOS 14.2, *)
    static var systemAudioTapMuteBehavior: CATapMuteBehavior {
        .mutedWhenTapped
    }

    private static func tapUID(for tapID: AudioObjectID) throws -> CFString {
        var address = propertyAddress(kAudioTapPropertyUID)
        var dataSize = UInt32(MemoryLayout<Unmanaged<CFString>?>.size)
        var unmanagedUID: Unmanaged<CFString>?

        try MacAudioCore.check(
            AudioObjectGetPropertyData(tapID, &address, 0, nil, &dataSize, &unmanagedUID),
            operation: "Read system audio tap identifier"
        )

        guard let unmanagedUID else {
            throw TranslationAudioIOError.systemAudioCaptureStartFailed(
                "Core Audio did not return a system audio tap identifier."
            )
        }

        return unmanagedUID.takeRetainedValue()
    }

    private static func tapFormat(for tapID: AudioObjectID) throws -> AudioStreamBasicDescription {
        var address = propertyAddress(kAudioTapPropertyFormat)
        var dataSize = UInt32(MemoryLayout<AudioStreamBasicDescription>.size)
        var format = AudioStreamBasicDescription()

        try MacAudioCore.check(
            AudioObjectGetPropertyData(tapID, &address, 0, nil, &dataSize, &format),
            operation: "Read system audio tap format"
        )

        guard format.mSampleRate > 0, format.mChannelsPerFrame > 0 else {
            throw TranslationAudioIOError.unsupportedCaptureFormat
        }

        return format
    }

    @available(macOS 14.2, *)
    private static func createAggregateDevice(forTapUID tapUID: CFString) throws -> AudioObjectID {
        let aggregateUID = "ai.chuchotage.system-audio.\(UUID().uuidString)"
        let tapDescription: [String: Any] = [
            kAudioSubTapUIDKey: tapUID,
            kAudioSubTapDriftCompensationKey: true,
            kAudioSubTapDriftCompensationQualityKey: kAudioAggregateDriftCompensationHighQuality,
        ]
        let aggregateDescription: [String: Any] = [
            kAudioAggregateDeviceNameKey: "Chuchotage System Audio Capture",
            kAudioAggregateDeviceUIDKey: aggregateUID,
            kAudioAggregateDeviceIsPrivateKey: true,
            kAudioAggregateDeviceTapListKey: [tapDescription],
        ]
        var aggregateDeviceID = AudioObjectID(kAudioObjectUnknown)

        try MacAudioCore.check(
            AudioHardwareCreateAggregateDevice(aggregateDescription as CFDictionary, &aggregateDeviceID),
            operation: "Create system audio capture device"
        )

        guard aggregateDeviceID != kAudioObjectUnknown else {
            throw TranslationAudioIOError.systemAudioCaptureStartFailed(
                "Core Audio did not return a capture device."
            )
        }

        return aggregateDeviceID
    }

    private static func playbackGains(for settings: TranslationSettings) -> (original: Double, translated: Double) {
        MacAudioBlend.gains(for: settings.macOriginalAudioMode)
    }

    private static func requestMicrophonePermission() async -> Bool {
        await withCheckedContinuation { continuation in
            AVCaptureDevice.requestAccess(for: .audio) { granted in
                continuation.resume(returning: granted)
            }
        }
    }

    private func failFromOutputDeviceChange(_ message: String) {
        let continuation = stateQueue.sync {
            guard state.isActive else { return nil as AsyncStream<PcmAudioChunk>.Continuation? }
            state.unexpectedStopErrorMessage = message
            return state.captureContinuation
        }
        continuation?.finish()
    }

    private func startOutputDeviceWatcherIfNeeded(
        selection: MacOutputDeviceSelection,
        continuation: AsyncStream<PcmAudioChunk>.Continuation
    ) -> MacSelectedOutputDeviceWatcher? {
        switch selection {
        case .systemDefault:
            return nil
        case .device(_, let name):
            let watcher = MacSelectedOutputDeviceWatcher(selection: selection) { [weak self] in
                let message = TranslationAudioIOError.outputDeviceUnavailable(name).localizedDescription
                self?.failFromOutputDeviceChange(message)
            }
            watcher.start()
            return watcher
        }
    }

    fileprivate static func playPcm16(
        _ pcm16: Data,
        on player: AVAudioPlayerNode?,
        gain: Double,
        isActive: Bool
    ) {
        guard isActive,
              gain > minimumAudibleGain,
              !pcm16.isEmpty,
              let player,
              let buffer = makePlaybackBuffer(from: pcm16) else {
            return
        }

        player.scheduleBuffer(buffer, completionCallbackType: .dataConsumed, completionHandler: nil)
        if !player.isPlaying {
            player.play()
        }
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

    private static func propertyAddress(
        _ selector: AudioObjectPropertySelector
    ) -> AudioObjectPropertyAddress {
        AudioObjectPropertyAddress(
            mSelector: selector,
            mScope: kAudioObjectPropertyScopeGlobal,
            mElement: kAudioObjectPropertyElementMain
        )
    }

    private static func check(_ status: OSStatus, operation: String) throws {
        guard status == noErr else {
            if status == kAudioDevicePermissionsError {
                throw TranslationAudioIOError.systemAudioCapturePermissionDenied
            }
            throw TranslationAudioIOError.systemAudioCaptureStartFailed(
                "\(operation) failed (\(statusDescription(status)))."
            )
        }
    }

    private static func statusDescription(_ status: OSStatus) -> String {
        let code = UInt32(bitPattern: status)
        let bytes = [
            UInt8((code >> 24) & 0xff),
            UInt8((code >> 16) & 0xff),
            UInt8((code >> 8) & 0xff),
            UInt8(code & 0xff),
        ]
        let printable = bytes.allSatisfy { byte in
            byte >= 0x20 && byte <= 0x7e
        }

        if printable {
            return "'\(String(bytes: bytes, encoding: .ascii) ?? "????")'"
        }

        return "\(status)"
    }

    private let maxQueuedCaptureChunks = 64
    private static let minimumAudibleGain = 0.001

    private struct PlaybackSession {
        let engine: AVAudioEngine
        let translatedPlayer: AVAudioPlayerNode
        let originalPlayer: AVAudioPlayerNode
    }

    private struct State {
        var tapID = AudioObjectID(kAudioObjectUnknown)
        var aggregateDeviceID = AudioObjectID(kAudioObjectUnknown)
        var ioProcID: AudioDeviceIOProcID?
        var playbackEngine: AVAudioEngine?
        var translatedPlayerNode: AVAudioPlayerNode?
        var originalPlayerNode: AVAudioPlayerNode?
        var translatedGain = MacAudioBlend.gains(for: MacAudioBlend.defaultPercent).translated
        var captureProcessor: MacOSSystemAudioCaptureProcessor?
        var captureContinuation: AsyncStream<PcmAudioChunk>.Continuation?
        var microphoneCaptureEngine: AVAudioEngine?
        var outputDeviceWatcher: MacSelectedOutputDeviceWatcher?
        var unexpectedStopErrorMessage: String?
        var isActive = false
    }
}

struct MacOSCapturedAudioBuffer: Equatable, Sendable {
    let data: Data
    let channelCount: Int
}

private final class MacSelectedOutputDeviceWatcher: @unchecked Sendable {
    private let selection: MacOutputDeviceSelection
    private let onUnavailable: @Sendable () -> Void
    private let queue = DispatchQueue(label: "ai.chuchotage.macos-output-device.watch")
    private var timer: DispatchSourceTimer?
    private var hasReportedUnavailable = false

    init(
        selection: MacOutputDeviceSelection,
        onUnavailable: @escaping @Sendable () -> Void
    ) {
        self.selection = selection
        self.onUnavailable = onUnavailable
    }

    func start() {
        let timer = DispatchSource.makeTimerSource(queue: queue)
        timer.schedule(deadline: .now() + .seconds(1), repeating: .seconds(2))
        timer.setEventHandler { [weak self] in
            self?.checkAvailability()
        }
        timer.resume()
        self.timer = timer
    }

    func stop() {
        timer?.cancel()
        timer = nil
    }

    private func checkAvailability() {
        guard !hasReportedUnavailable,
              !MacAudioOutputDeviceManager.contains(selection: selection) else {
            return
        }

        hasReportedUnavailable = true
        onUnavailable()
    }
}

private final class MacOSPcmPlaybackChannel: @unchecked Sendable {
    private let lock = NSLock()
    private let player: AVAudioPlayerNode?
    private var gain: Double

    init(player: AVAudioPlayerNode?, gain: Double) {
        self.player = player
        self.gain = gain
    }

    func play(_ pcm16: Data) {
        MacOSTranslationAudioIO.playPcm16(pcm16, on: player, gain: currentGain, isActive: true)
    }

    func setGain(_ gain: Double) {
        lock.withLock {
            self.gain = gain
        }
    }

    private var currentGain: Double {
        lock.withLock { gain }
    }
}

enum MacOSAVAudioPcmConverter {
    static func convert(_ buffer: AVAudioPCMBuffer) -> Data? {
        guard buffer.frameLength > 0,
              let outputFormat = AVAudioFormat(
                commonFormat: .pcmFormatInt16,
                sampleRate: Double(RealtimePcmFormat.sampleRate),
                channels: AVAudioChannelCount(RealtimePcmFormat.channelCount),
                interleaved: false
              ),
              let converter = AVAudioConverter(from: buffer.format, to: outputFormat) else {
            return nil
        }

        let ratio = outputFormat.sampleRate / buffer.format.sampleRate
        let outputFrameCapacity = AVAudioFrameCount(
            max(1, ceil(Double(buffer.frameLength) * ratio) + 8)
        )
        guard let outputBuffer = AVAudioPCMBuffer(
            pcmFormat: outputFormat,
            frameCapacity: outputFrameCapacity
        ) else {
            return nil
        }

        let inputProvider = MacOSAVAudioPcmInputProvider(buffer: buffer)
        var conversionError: NSError?
        let status = converter.convert(to: outputBuffer, error: &conversionError) { _, outStatus in
            inputProvider.read(outStatus: outStatus)
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
}

private final class MacOSAVAudioPcmInputProvider: @unchecked Sendable {
    private let lock = NSLock()
    private var buffer: AVAudioPCMBuffer?

    init(buffer: AVAudioPCMBuffer) {
        self.buffer = buffer
    }

    func read(outStatus: UnsafeMutablePointer<AVAudioConverterInputStatus>) -> AVAudioBuffer? {
        lock.lock()
        defer { lock.unlock() }

        guard let buffer else {
            outStatus.pointee = .noDataNow
            return nil
        }

        self.buffer = nil
        outStatus.pointee = .haveData
        return buffer
    }
}

final class MacOSSystemAudioCaptureProcessor: @unchecked Sendable {
    private let format: AudioStreamBasicDescription
    private let continuation: AsyncStream<PcmAudioChunk>.Continuation
    private let originalMonitor: MacOSPcmPlaybackChannel?
    private let processingQueue = DispatchQueue(label: "ai.chuchotage.macos-system-audio.process")
    private let lock = NSLock()
    private var isStopped = false
    private var pendingBufferCount = 0

    fileprivate init(
        format: AudioStreamBasicDescription,
        continuation: AsyncStream<PcmAudioChunk>.Continuation,
        originalMonitor: MacOSPcmPlaybackChannel? = nil
    ) {
        self.format = format
        self.continuation = continuation
        self.originalMonitor = originalMonitor
    }

    func capture(_ audioBufferList: UnsafePointer<AudioBufferList>) {
        guard let buffers = Self.copyBuffers(from: audioBufferList),
              reservePendingBufferSlot() else {
            return
        }

        processingQueue.async { [weak self] in
            guard let self else { return }
            defer {
                self.releasePendingBufferSlot()
            }

            guard self.isActive else { return }
            guard let pcm16 = MacOSSystemAudioPcmConverter.convert(
                buffers: buffers,
                format: self.format
            ), !pcm16.isEmpty else {
                return
            }

            self.originalMonitor?.play(pcm16)
            self.continuation.yield(PcmAudioChunk(pcm16: pcm16))
        }
    }

    func stop() {
        lock.lock()
        isStopped = true
        lock.unlock()
    }

    func updateOriginalMonitorGain(_ gain: Double) {
        originalMonitor?.setGain(gain)
    }

    private var isActive: Bool {
        lock.lock()
        defer { lock.unlock() }
        return !isStopped
    }

    private func reservePendingBufferSlot() -> Bool {
        lock.lock()
        defer { lock.unlock() }

        guard !isStopped, pendingBufferCount < maxPendingBuffers else {
            return false
        }

        pendingBufferCount += 1
        return true
    }

    private func releasePendingBufferSlot() {
        lock.lock()
        pendingBufferCount = max(0, pendingBufferCount - 1)
        lock.unlock()
    }

    private static func copyBuffers(
        from audioBufferList: UnsafePointer<AudioBufferList>
    ) -> [MacOSCapturedAudioBuffer]? {
        let buffers = UnsafeMutableAudioBufferListPointer(
            UnsafeMutablePointer(mutating: audioBufferList)
        )
        var copiedBuffers: [MacOSCapturedAudioBuffer] = []
        copiedBuffers.reserveCapacity(buffers.count)

        for buffer in buffers {
            guard let dataPointer = buffer.mData, buffer.mDataByteSize > 0 else {
                continue
            }

            copiedBuffers.append(
                MacOSCapturedAudioBuffer(
                    data: Data(bytes: dataPointer, count: Int(buffer.mDataByteSize)),
                    channelCount: max(1, Int(buffer.mNumberChannels))
                )
            )
        }

        return copiedBuffers.isEmpty ? nil : copiedBuffers
    }

    private let maxPendingBuffers = 32
}

enum MacOSSystemAudioPcmConverter {
    static func convert(
        buffers: [MacOSCapturedAudioBuffer],
        format: AudioStreamBasicDescription
    ) -> Data? {
        guard !buffers.isEmpty,
              format.mFormatID == kAudioFormatLinearPCM,
              format.mSampleRate > 0 else {
            return nil
        }

        let flags = format.mFormatFlags
        let isFloat = flags & kAudioFormatFlagIsFloat != 0
        let isSignedInteger = flags & kAudioFormatFlagIsSignedInteger != 0
        let isBigEndian = flags & kAudioFormatFlagIsBigEndian != 0
        let isNonInterleaved = flags & kAudioFormatFlagIsNonInterleaved != 0
        let sourceSampleRate = Int(format.mSampleRate.rounded())
        let sourcePcm: Data?

        if isBigEndian {
            return nil
        } else if isFloat, format.mBitsPerChannel == 32 {
            sourcePcm = convertFloat32(
                buffers: buffers,
                channelCount: Int(format.mChannelsPerFrame),
                nonInterleaved: isNonInterleaved
            )
        } else if isSignedInteger, format.mBitsPerChannel == 16 {
            sourcePcm = convertInt16(
                buffers: buffers,
                channelCount: Int(format.mChannelsPerFrame),
                nonInterleaved: isNonInterleaved
            )
        } else {
            return nil
        }

        guard let sourcePcm else { return nil }
        return PcmResampler.resamplePcm16Mono(
            sourcePcm,
            fromSampleRate: sourceSampleRate
        )
    }

    static func convertInterleavedFloat32(
        _ samples: [Float],
        channelCount: Int,
        sampleRate: Int
    ) -> Data {
        let data = samples.withUnsafeBufferPointer { pointer in
            Data(buffer: pointer)
        }
        let format = pcmFormat(
            sampleRate: sampleRate,
            channelCount: channelCount,
            bitsPerChannel: 32,
            flags: kAudioFormatFlagIsFloat | kAudioFormatFlagIsPacked
        )

        return convert(
            buffers: [MacOSCapturedAudioBuffer(data: data, channelCount: channelCount)],
            format: format
        ) ?? Data()
    }

    static func convertInterleavedInt16(
        _ samples: [Int16],
        channelCount: Int,
        sampleRate: Int
    ) -> Data {
        let data = samples.withUnsafeBufferPointer { pointer in
            Data(buffer: pointer)
        }
        let format = pcmFormat(
            sampleRate: sampleRate,
            channelCount: channelCount,
            bitsPerChannel: 16,
            flags: kAudioFormatFlagIsSignedInteger | kAudioFormatFlagIsPacked
        )

        return convert(
            buffers: [MacOSCapturedAudioBuffer(data: data, channelCount: channelCount)],
            format: format
        ) ?? Data()
    }

    private static func convertFloat32(
        buffers: [MacOSCapturedAudioBuffer],
        channelCount: Int,
        nonInterleaved: Bool
    ) -> Data? {
        if nonInterleaved {
            return convertNonInterleavedFloat32(buffers)
        }

        guard let buffer = buffers.first else { return nil }
        let channelCount = max(1, channelCount)
        let sampleCount = buffer.data.count / MemoryLayout<Float>.size
        let frameCount = sampleCount / channelCount
        guard frameCount > 0 else { return Data() }

        var output = Data()
        output.reserveCapacity(frameCount * RealtimePcmFormat.bytesPerSample)

        buffer.data.withUnsafeBytes { rawBuffer in
            for frameIndex in 0..<frameCount {
                var mixed = Float(0)
                for channelIndex in 0..<channelCount {
                    let sampleIndex = (frameIndex * channelCount) + channelIndex
                    let byteOffset = sampleIndex * MemoryLayout<Float>.size
                    mixed += rawBuffer.loadUnaligned(fromByteOffset: byteOffset, as: Float.self)
                }
                appendPcm16Sample(clampedPcm16Sample(from: mixed / Float(channelCount)), to: &output)
            }
        }

        return output
    }

    private static func convertNonInterleavedFloat32(
        _ buffers: [MacOSCapturedAudioBuffer]
    ) -> Data? {
        let frameCount = buffers
            .map { $0.data.count / MemoryLayout<Float>.size }
            .min() ?? 0
        guard frameCount > 0 else { return Data() }

        var output = Data()
        output.reserveCapacity(frameCount * RealtimePcmFormat.bytesPerSample)

        for frameIndex in 0..<frameCount {
            var mixed = Float(0)
            for buffer in buffers {
                mixed += buffer.data.withUnsafeBytes { rawBuffer in
                    let byteOffset = frameIndex * MemoryLayout<Float>.size
                    return rawBuffer.loadUnaligned(fromByteOffset: byteOffset, as: Float.self)
                }
            }
            appendPcm16Sample(clampedPcm16Sample(from: mixed / Float(buffers.count)), to: &output)
        }

        return output
    }

    private static func convertInt16(
        buffers: [MacOSCapturedAudioBuffer],
        channelCount: Int,
        nonInterleaved: Bool
    ) -> Data? {
        if nonInterleaved {
            return convertNonInterleavedInt16(buffers)
        }

        guard let buffer = buffers.first else { return nil }
        let channelCount = max(1, channelCount)
        let sampleCount = buffer.data.count / MemoryLayout<Int16>.size
        let frameCount = sampleCount / channelCount
        guard frameCount > 0 else { return Data() }

        var output = Data()
        output.reserveCapacity(frameCount * RealtimePcmFormat.bytesPerSample)

        buffer.data.withUnsafeBytes { rawBuffer in
            for frameIndex in 0..<frameCount {
                var mixed = 0
                for channelIndex in 0..<channelCount {
                    let sampleIndex = (frameIndex * channelCount) + channelIndex
                    let byteOffset = sampleIndex * MemoryLayout<Int16>.size
                    mixed += Int(readLittleEndianPcm16(rawBuffer, byteOffset: byteOffset))
                }
                appendPcm16Sample(mixed / channelCount, to: &output)
            }
        }

        return output
    }

    private static func convertNonInterleavedInt16(
        _ buffers: [MacOSCapturedAudioBuffer]
    ) -> Data? {
        let frameCount = buffers
            .map { $0.data.count / MemoryLayout<Int16>.size }
            .min() ?? 0
        guard frameCount > 0 else { return Data() }

        var output = Data()
        output.reserveCapacity(frameCount * RealtimePcmFormat.bytesPerSample)

        for frameIndex in 0..<frameCount {
            var mixed = 0
            for buffer in buffers {
                mixed += buffer.data.withUnsafeBytes { rawBuffer in
                    readLittleEndianPcm16(
                        rawBuffer,
                        byteOffset: frameIndex * MemoryLayout<Int16>.size
                    )
                }
            }
            appendPcm16Sample(mixed / buffers.count, to: &output)
        }

        return output
    }

    private static func pcmFormat(
        sampleRate: Int,
        channelCount: Int,
        bitsPerChannel: UInt32,
        flags: AudioFormatFlags
    ) -> AudioStreamBasicDescription {
        let bytesPerSample = bitsPerChannel / 8
        return AudioStreamBasicDescription(
            mSampleRate: Double(sampleRate),
            mFormatID: kAudioFormatLinearPCM,
            mFormatFlags: flags,
            mBytesPerPacket: bytesPerSample * UInt32(channelCount),
            mFramesPerPacket: 1,
            mBytesPerFrame: bytesPerSample * UInt32(channelCount),
            mChannelsPerFrame: UInt32(channelCount),
            mBitsPerChannel: bitsPerChannel,
            mReserved: 0
        )
    }

    private static func readLittleEndianPcm16(
        _ rawBuffer: UnsafeRawBufferPointer,
        byteOffset: Int
    ) -> Int {
        let low = UInt16(rawBuffer.loadUnaligned(fromByteOffset: byteOffset, as: UInt8.self))
        let high = UInt16(rawBuffer.loadUnaligned(fromByteOffset: byteOffset + 1, as: UInt8.self)) << 8
        return Int(Int16(bitPattern: high | low))
    }

    private static func clampedPcm16Sample(from sample: Float) -> Int {
        let clipped = max(-1, min(1, sample))
        return Int((clipped * Float(Int16.max)).rounded())
    }

    private static func appendPcm16Sample(_ sample: Int, to output: inout Data) {
        let clipped = max(Int(Int16.min), min(Int(Int16.max), sample))
        let bitPattern = UInt16(bitPattern: Int16(clipped))
        output.append(UInt8(bitPattern & 0x00ff))
        output.append(UInt8((bitPattern >> 8) & 0x00ff))
    }
}
#endif
