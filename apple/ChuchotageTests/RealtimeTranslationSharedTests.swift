import Foundation
import XCTest
@testable import Chuchotage

final class RealtimeTranslationSharedTests: XCTestCase {
    func testParsesRealtimeTranslationDeltas() {
        XCTAssertEqual(
            RealtimeTranslationEventParser.parse(
                #"{"type":"session.output_audio.delta","delta":"AAAB"}"#
            ),
            .outputAudio(Data([0x00, 0x00, 0x01]))
        )
        XCTAssertEqual(
            RealtimeTranslationEventParser.parse(
                #"{"type":"session.input_transcript.delta","delta":"guten "}"#
            ),
            .inputTranscriptDelta("guten ")
        )
        XCTAssertEqual(
            RealtimeTranslationEventParser.parse(
                #"{"type":"session.output_transcript.delta","delta":"good "}"#
            ),
            .outputTranscriptDelta("good ")
        )
        XCTAssertEqual(
            RealtimeTranslationEventParser.parse(
                #"{"type":"error","error":{"message":"bad socket"}}"#
            ),
            .error("bad socket")
        )
        XCTAssertEqual(
            RealtimeTranslationEventParser.parse(#"{"type":"session.closed"}"#),
            .sessionClosed
        )
    }

    func testOneShotVoidContinuationIgnoresDuplicateResume() async throws {
        let continuationGate = OneShotVoidContinuation()

        try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Void, any Error>) in
            XCTAssertTrue(continuationGate.install(continuation))
            continuationGate.resume()
            continuationGate.resume(throwing: OneShotContinuationTestError.secondResume)
        }
    }

    func testOneShotVoidContinuationReplaysCompletionBeforeInstall() async {
        let continuationGate = OneShotVoidContinuation()
        continuationGate.resume(throwing: CancellationError())

        do {
            try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Void, any Error>) in
                XCTAssertFalse(continuationGate.install(continuation))
            }
            XCTFail("Expected the saved cancellation to be replayed.")
        } catch is CancellationError {
            XCTAssertTrue(true)
        } catch {
            XCTFail("Expected CancellationError, got \(error).")
        }
    }

    func testRealtimeSocketTimeoutMessageIsFriendlyAndRetryable() {
        let error = RealtimeTranslationClientError.openTimedOut

        XCTAssertEqual(
            error.errorDescription,
            "Could not connect to OpenAI Realtime. Check the network and try again."
        )
        XCTAssertTrue(error.isRetryableOpenFailure)
    }

    func testRealtimeSocketServerOpenFailureIsFriendlyAndRetryable() {
        let error = RealtimeTranslationClientError.openFailure(
            error: URLError(.badServerResponse),
            statusCode: 500,
            credentialKind: .apiKey
        )

        XCTAssertEqual(
            error.errorDescription,
            "OpenAI Realtime is unavailable right now. Try again in a moment."
        )
        XCTAssertTrue(error.isRetryableOpenFailure)
    }

    func testRealtimeSocketAuthOpenFailureIsActionableAndNotRetryable() {
        let error = RealtimeTranslationClientError.openFailure(
            error: URLError(.userAuthenticationRequired),
            statusCode: 401,
            credentialKind: .chatGPTAccessToken
        )

        XCTAssertEqual(
            error.errorDescription,
            "OpenAI rejected the saved login. Check your API key or sign in again."
        )
        XCTAssertFalse(error.isRetryableOpenFailure)
    }

    func testRealtimeSocketChatGPTServerOpenFailureNamesRestartWorkaround() {
        let error = RealtimeTranslationClientError.openFailure(
            error: URLError(.badServerResponse),
            statusCode: 500,
            credentialKind: .chatGPTAccessToken
        )

        XCTAssertEqual(
            error.errorDescription,
            "OpenAI is rejecting ChatGPT sign-in translation sessions right now. Restart Chuchotage and try again."
        )
        XCTAssertTrue(error.isRetryableOpenFailure)
    }

    func testBuildsInputAudioAppendEvent() throws {
        let json = try RealtimeTranslationRequestBuilder.inputAudioAppendEvent(Data([0x00, 0x01]))
        let payload = try parseJsonObject(json)

        XCTAssertEqual(payload["type"] as? String, "session.input_audio_buffer.append")
        XCTAssertEqual(payload["audio"] as? String, "AAE=")
    }

    func testBuildsTranslationSessionCloseEvent() throws {
        let json = try RealtimeTranslationRequestBuilder.sessionCloseEvent()
        let payload = try parseJsonObject(json)

        XCTAssertEqual(payload["type"] as? String, "session.close")
    }

    func testBuildsSessionUpdateForApiKeySessions() throws {
        let json = try RealtimeTranslationRequestBuilder.sessionUpdateEvent(targetLanguageCode: "ja")
        let payload = try parseJsonObject(json)
        let session = try XCTUnwrap(payload["session"] as? [String: Any])
        let audio = try XCTUnwrap(session["audio"] as? [String: Any])
        let input = try XCTUnwrap(audio["input"] as? [String: Any])
        let output = try XCTUnwrap(audio["output"] as? [String: Any])
        let transcription = try XCTUnwrap(input["transcription"] as? [String: Any])

        XCTAssertNil(session["model"])
        XCTAssertEqual(transcription["model"] as? String, "gpt-realtime-whisper")
        XCTAssertTrue(input["noise_reduction"] is NSNull)
        XCTAssertEqual(output["language"] as? String, "ja")
    }

    func testBuildsClientSecretBodyWithEmbeddedTranslationSession() throws {
        let body = try RealtimeTranslationRequestBuilder.clientSecretRequestBody(targetLanguageCode: "xx")
        let payload = try parseJsonObject(body)
        let session = try XCTUnwrap(payload["session"] as? [String: Any])
        let audio = try XCTUnwrap(session["audio"] as? [String: Any])
        let output = try XCTUnwrap(audio["output"] as? [String: Any])

        XCTAssertEqual(session["model"] as? String, "gpt-realtime-translate")
        XCTAssertEqual(output["language"] as? String, "en")
    }

    func testLanguageSanitizationMatchesAndroidAndWindowsList() {
        XCTAssertEqual(TranslationLanguages.sanitizeOutputLanguageCode("de"), "de")
        XCTAssertEqual(TranslationLanguages.sanitizeOutputLanguageCode("not-supported"), "en")
        XCTAssertEqual(TranslationLanguages.supportedOutputLanguages.map(\.code), [
            "es", "pt", "fr", "ja", "ru", "zh", "de", "ko", "hi", "id", "vi", "it", "en",
        ])
    }

    func testPreferredSupportedLanguageCodeFollowsSystemLanguageStyleIdentifiers() {
        XCTAssertEqual(
            TranslationLanguages.preferredSupportedLanguageCode(from: ["de-DE", "fr-FR"]),
            "de"
        )
        XCTAssertEqual(
            TranslationLanguages.preferredSupportedLanguageCode(from: ["ZH_Hans_CN", "fr-FR"]),
            "zh"
        )
        XCTAssertNil(
            TranslationLanguages.preferredSupportedLanguageCode(from: ["pl-PL", "sv-SE"])
        )
    }

    func testSponsoredTrialInstallIDValidationMatchesAndroidPattern() {
        XCTAssertTrue(
            OpenAICredentialValidator.isPlausibleSponsoredTrialInstallID(
                "123e4567-e89b-12d3-a456-426614174000"
            )
        )
        XCTAssertFalse(
            OpenAICredentialValidator.isPlausibleSponsoredTrialInstallID("not-a-stable-install-id")
        )
    }

    func testPcmResamplerKeepsRealtimeFormatAndDownsamples() {
        let realtimePcm = Data([0x01, 0x00, 0xff, 0x7f])
        XCTAssertEqual(
            PcmResampler.resamplePcm16Mono(realtimePcm, fromSampleRate: RealtimePcmFormat.sampleRate),
            realtimePcm
        )

        let downsampled = PcmResampler.resamplePcm16Mono(
            Data([0x01, 0x00, 0xff, 0x7f]),
            fromSampleRate: 48_000,
            toSampleRate: 24_000
        )
        XCTAssertEqual(downsampled, Data([0x01, 0x00]))
    }

    func testPcmVolumeMeterMeasuresSilenceAsZero() {
        let level = PcmVolumeMeter.level(Data([0x00, 0x00, 0x00, 0x00]))

        XCTAssertEqual(level, 0, accuracy: 0.001)
    }

    func testPcmVolumeMeterMeasuresLouderAudioHigher() {
        let quiet = PcmVolumeMeter.level(Data([0x00, 0x04, 0x00, 0x04]))
        let loud = PcmVolumeMeter.level(Data([0x00, 0x40, 0x00, 0x40]))

        XCTAssertGreaterThan(loud, quiet)
    }

    func testInputGainLeavesSilenceUnchanged() {
        let silence = pcm16(0, 0, 0)

        let lifted = PcmInputGain.liftQuietSpeech(silence)

        XCTAssertEqual(lifted, silence)
    }

    func testInputGainBoostsQuietSpeech() {
        let quiet = pcm16(512, -512, 512, -512)

        let lifted = PcmInputGain.liftQuietSpeech(quiet)

        XCTAssertGreaterThan(readPcm16(lifted, sampleIndex: 0), readPcm16(quiet, sampleIndex: 0))
        XCTAssertLessThanOrEqual(readPcm16(lifted, sampleIndex: 0), Int(Int16.max))
    }

    func testInputGainDoesNotAttenuateLoudSpeech() {
        let loud = pcm16(12_000, -12_000)

        let lifted = PcmInputGain.liftQuietSpeech(loud)

        XCTAssertEqual(lifted, loud)
    }

    func testUserDefaultsTranslationSettingsPersistsTargetLanguageAndRoutes() throws {
        let suiteName = "ChuchotageTests.\(UUID().uuidString)"
        let userDefaults = try XCTUnwrap(UserDefaults(suiteName: suiteName))
        defer {
            userDefaults.removePersistentDomain(forName: suiteName)
        }

        let store = UserDefaultsTranslationSettingsStore(userDefaults: userDefaults)
        store.save(
            TranslationSettings(
                targetLanguageCode: "it",
                conversationLocalLanguageCode: "en",
                conversationPartnerLanguageCode: "fr",
                audioInputSource: .defaultSource,
                audioOutputRoute: .headphones,
                macAudioBlendPercent: 35,
                macCaptureSource: .selectedApp(bundleID: "com.apple.Safari", displayName: "Safari"),
                macOriginalAudioMode: .lower,
                macOutputDeviceSelection: .device(uid: "BuiltInOutputDevice", name: "MacBook Speakers")
            )
        )

        XCTAssertEqual(
            store.read(),
            TranslationSettings(
                targetLanguageCode: "it",
                conversationLocalLanguageCode: "en",
                conversationPartnerLanguageCode: "fr",
                audioInputSource: .defaultSource,
                audioOutputRoute: .headphones,
                macAudioBlendPercent: 35,
                macCaptureSource: .selectedApp(bundleID: "com.apple.Safari", displayName: "Safari"),
                macOriginalAudioMode: .lower,
                macOutputDeviceSelection: .device(uid: "BuiltInOutputDevice", name: "MacBook Speakers")
            )
        )
    }

    func testConversationPartnerLanguageDefaultsToItalianWhenLocalLanguageIsEnglish() {
        XCTAssertEqual(
            TranslationLanguages.defaultConversationPartnerLanguageCode(for: "en"),
            "it"
        )
    }

    func testConversationPartnerLanguageDefaultsToEnglishWhenLocalLanguageIsNotEnglish() {
        XCTAssertEqual(
            TranslationLanguages.defaultConversationPartnerLanguageCode(for: "fr"),
            "en"
        )
    }

    func testMacAudioBlendDefaultsClampsPersistsAndBuildsGains() throws {
        XCTAssertEqual(TranslationSettings().macAudioBlendPercent, 100)
        XCTAssertEqual(TranslationSettings(macAudioBlendPercent: -20).macAudioBlendPercent, 0)
        XCTAssertEqual(TranslationSettings(macAudioBlendPercent: 120).macAudioBlendPercent, 100)

        let originalOnly = MacAudioBlend.gains(for: 0)
        XCTAssertEqual(originalOnly.original, 1.0, accuracy: 0.0001)
        XCTAssertEqual(originalOnly.translated, 0.0, accuracy: 0.0001)

        let balanced = MacAudioBlend.gains(for: 50)
        XCTAssertEqual(balanced.original, 0.5, accuracy: 0.0001)
        XCTAssertEqual(balanced.translated, 0.5, accuracy: 0.0001)

        let translatedOnly = MacAudioBlend.gains(for: 100)
        XCTAssertEqual(translatedOnly.original, 0.0, accuracy: 0.0001)
        XCTAssertEqual(translatedOnly.translated, 1.0, accuracy: 0.0001)

        let loweredOriginal = MacAudioBlend.gains(for: MacOriginalAudioMode.lower)
        XCTAssertEqual(loweredOriginal.original, 0.2, accuracy: 0.0001)
        XCTAssertEqual(loweredOriginal.translated, 1.0, accuracy: 0.0001)

        let mutedOriginal = MacAudioBlend.gains(for: MacOriginalAudioMode.mute)
        XCTAssertEqual(mutedOriginal.original, 0.0, accuracy: 0.0001)
        XCTAssertEqual(mutedOriginal.translated, 1.0, accuracy: 0.0001)

        let suiteName = "ChuchotageTests.\(UUID().uuidString)"
        let userDefaults = try XCTUnwrap(UserDefaults(suiteName: suiteName))
        defer {
            userDefaults.removePersistentDomain(forName: suiteName)
        }

        let store = UserDefaultsTranslationSettingsStore(userDefaults: userDefaults)
        XCTAssertEqual(store.read().macAudioBlendPercent, 100)

        userDefaults.set(-10, forKey: "translation_settings.mac_audio_blend_percent")
        XCTAssertEqual(store.read().macAudioBlendPercent, 0)

        userDefaults.set(140, forKey: "translation_settings.mac_audio_blend_percent")
        XCTAssertEqual(store.read().macAudioBlendPercent, 100)
    }

    func testMacOSSettingsDefaultToSystemAudioAndMigrateLegacyMicValues() throws {
        #if os(macOS)
        let suiteName = "ChuchotageTests.\(UUID().uuidString)"
        let userDefaults = try XCTUnwrap(UserDefaults(suiteName: suiteName))
        defer {
            userDefaults.removePersistentDomain(forName: suiteName)
        }

        let store = UserDefaultsTranslationSettingsStore(userDefaults: userDefaults)
        XCTAssertEqual(store.read().audioInputSource, .systemAudio)

        userDefaults.set("phone", forKey: "translation_settings.audio_input_source")
        XCTAssertEqual(store.read().audioInputSource, .systemAudio)

        userDefaults.set("headset", forKey: "translation_settings.audio_input_source")
        XCTAssertEqual(store.read().audioInputSource, .systemAudio)

        userDefaults.set("system_audio", forKey: "translation_settings.audio_input_source")
        XCTAssertEqual(store.read().audioInputSource, .systemAudio)
        XCTAssertEqual(AudioInputSource.selectableCases, [.systemAudio])
        #endif
    }

    #if os(iOS)
    func testIOSDeviceAudioStorageFallsBackToBuiltInMicrophone() throws {
        let suiteName = "ChuchotageTests.\(UUID().uuidString)"
        let userDefaults = try XCTUnwrap(UserDefaults(suiteName: suiteName))
        defer {
            userDefaults.removePersistentDomain(forName: suiteName)
        }

        let store = UserDefaultsTranslationSettingsStore(userDefaults: userDefaults)
        userDefaults.set("device_audio", forKey: "translation_settings.audio_input_source")

        XCTAssertEqual(AudioInputSource.selectableCases, [.builtIn, .headset])
        XCTAssertEqual(store.read().audioInputSource, .builtIn)
    }
    #endif

    func testMacOSSystemAudioErrorsAreUserSafe() {
        #if os(macOS)
        let descriptions = [
            TranslationAudioIOError.systemAudioRequiresMacOS14_2.localizedDescription,
            TranslationAudioIOError.systemAudioCapturePermissionDenied.localizedDescription,
            TranslationAudioIOError.systemAudioCaptureStartFailed("Tap failed.").localizedDescription,
        ]

        for description in descriptions {
            XCTAssertFalse(description.localizedCaseInsensitiveContains("token"))
            XCTAssertFalse(description.localizedCaseInsensitiveContains("credential"))
            XCTAssertFalse(description.localizedCaseInsensitiveContains("api key"))
        }

        XCTAssertTrue(
            TranslationAudioIOError.systemAudioCapturePermissionDenied.localizedDescription
                .localizedCaseInsensitiveContains("System Settings")
        )
        #endif
    }

    func testMacOSSystemAudioTapMutesWhileRead() {
        #if os(macOS)
        if #available(macOS 14.2, *) {
            XCTAssertEqual(MacOSTranslationAudioIO.systemAudioTapMuteBehavior, .mutedWhenTapped)
        }
        #endif
    }

    func testMacOSSystemAudioPcmConversionHandlesStereoFloat32() {
        #if os(macOS)
        let pcm = MacOSSystemAudioPcmConverter.convertInterleavedFloat32(
            [1.0, -1.0, 0.5, 0.5],
            channelCount: 2,
            sampleRate: RealtimePcmFormat.sampleRate
        )

        XCTAssertEqual(pcm, Data([0x00, 0x00, 0x00, 0x40]))
        #endif
    }

    func testMacOSSystemAudioPcmConversionHandlesStereoInt16AndDownsamples() {
        #if os(macOS)
        let pcm = MacOSSystemAudioPcmConverter.convertInterleavedInt16(
            [10_000, 10_000, 20_000, 20_000],
            channelCount: 2,
            sampleRate: 48_000
        )

        XCTAssertEqual(pcm, Data([0x10, 0x27]))
        #endif
    }

    func testMacOSSystemAudioPcmConversionHandlesSilence() {
        #if os(macOS)
        let pcm = MacOSSystemAudioPcmConverter.convertInterleavedFloat32(
            [0, 0, 0, 0],
            channelCount: 2,
            sampleRate: RealtimePcmFormat.sampleRate
        )

        XCTAssertEqual(pcm, Data([0x00, 0x00, 0x00, 0x00]))
        #endif
    }

    func testKeychainCredentialStoreSavesLoadsAndClearsApiKey() async throws {
        let keychain = InMemoryKeychainItemClient()
        let store = KeychainOpenAICredentialStore(
            service: "test.service",
            account: "api-key",
            keychain: keychain
        )

        try await store.saveCredential(
            OpenAICredential(kind: .apiKey, value: "  sk-test-12345678901234567890  ")
        )

        let storedStatus = try await store.loadCredentialStatus()
        let storedCredential = try await store.loadCredential()
        XCTAssertEqual(storedStatus, .available(kind: .apiKey))
        XCTAssertEqual(
            storedCredential,
            OpenAICredential(kind: .apiKey, value: "sk-test-12345678901234567890")
        )

        try await store.clearCredential()
        let statusAfterClear = try await store.loadCredentialStatus()
        let credentialAfterClear = try await store.loadCredential()
        XCTAssertEqual(statusAfterClear, .missing)
        XCTAssertNil(credentialAfterClear)
    }

    func testKeychainCredentialStoreSavesAndLoadsSponsoredTrialInstallID() async throws {
        let keychain = InMemoryKeychainItemClient()
        let store = KeychainOpenAICredentialStore(
            service: "test.service",
            account: "sponsored-trial",
            keychain: keychain
        )

        try await store.saveCredential(
            OpenAICredential(
                kind: .sponsoredTrial,
                value: " 123e4567-e89b-12d3-a456-426614174000 "
            )
        )

        let storedCredential = try await store.loadCredential()
        XCTAssertEqual(
            storedCredential,
            OpenAICredential(
                kind: .sponsoredTrial,
                value: "123e4567-e89b-12d3-a456-426614174000"
            )
        )
    }

    func testKeychainCredentialStoreRejectsInvalidApiKey() async throws {
        let keychain = InMemoryKeychainItemClient()
        let store = KeychainOpenAICredentialStore(
            service: "test.service",
            account: "invalid-api-key",
            keychain: keychain
        )

        do {
            try await store.saveCredential(OpenAICredential(kind: .apiKey, value: "not-a-key"))
            XCTFail("Expected invalid credentials to fail.")
        } catch KeychainOpenAICredentialStoreError.invalidCredential {
            let storedCredential = try await store.loadCredential()
            XCTAssertNil(storedCredential)
        }
    }

    func testKeychainCredentialStoreRejectsCorruptStoredData() async throws {
        let keychain = InMemoryKeychainItemClient()
        let store = KeychainOpenAICredentialStore(
            service: "test.service",
            account: "corrupt-api-key",
            keychain: keychain
        )
        try keychain.save(Data("not-json".utf8), service: "test.service", account: "corrupt-api-key")

        do {
            _ = try await store.loadCredential()
            XCTFail("Expected corrupt credentials to fail.")
        } catch KeychainOpenAICredentialStoreError.couldNotDecodeCredential {
            XCTAssertTrue(true)
        }
    }

    func testCodexAuthCredentialImporterLoadsChatGPTTokenCredential() async throws {
        let authFileURL = try temporaryAuthFileURL()
        try codexAuthJson(
            accessToken: "codex-access-token-12345678901234567890",
            idToken: "codex-id-token-12345678901234567890",
            refreshToken: "codex-refresh-token-12345678901234567890",
            lastRefresh: "2026-05-13T00:00:00.000Z"
        )
        .write(to: authFileURL, atomically: true, encoding: .utf8)
        defer {
            try? FileManager.default.removeItem(at: authFileURL.deletingLastPathComponent())
        }

        let credential = try await CodexAuthCredentialImporter(authFileURL: authFileURL).loadCredential()

        XCTAssertEqual(credential.kind, .chatGPTAccessToken)
        XCTAssertEqual(credential.value, "codex-access-token-12345678901234567890")
        XCTAssertEqual(credential.idToken, "codex-id-token-12345678901234567890")
        XCTAssertEqual(credential.refreshToken, "codex-refresh-token-12345678901234567890")
        XCTAssertEqual(credential.lastRefreshEpochSeconds, 1_778_630_400)
    }

    func testCodexAuthCredentialImporterRejectsMissingAccessToken() async throws {
        let authFileURL = try temporaryAuthFileURL()
        try codexAuthJson(accessToken: "", idToken: nil, refreshToken: nil, lastRefresh: nil)
            .write(to: authFileURL, atomically: true, encoding: .utf8)
        defer {
            try? FileManager.default.removeItem(at: authFileURL.deletingLastPathComponent())
        }

        do {
            _ = try await CodexAuthCredentialImporter(authFileURL: authFileURL).loadCredential()
            XCTFail("Expected missing Codex access token to fail.")
        } catch CodexAuthCredentialImporterError.missingAccessToken {
            XCTAssertTrue(true)
        }
    }

    private func parseJsonObject(_ json: String) throws -> [String: Any] {
        let data = try XCTUnwrap(json.data(using: .utf8))
        return try XCTUnwrap(JSONSerialization.jsonObject(with: data) as? [String: Any])
    }

    private func parseJsonObject(_ data: Data) throws -> [String: Any] {
        try XCTUnwrap(JSONSerialization.jsonObject(with: data) as? [String: Any])
    }

    private func pcm16(_ samples: Int...) -> Data {
        var bytes = Data()
        bytes.reserveCapacity(samples.count * RealtimePcmFormat.bytesPerSample)
        for sample in samples {
            let clamped = max(Int(Int16.min), min(Int(Int16.max), sample))
            let bitPattern = UInt16(bitPattern: Int16(clamped))
            bytes.append(UInt8(bitPattern & 0x00ff))
            bytes.append(UInt8((bitPattern >> 8) & 0x00ff))
        }
        return bytes
    }

    private func readPcm16(_ bytes: Data, sampleIndex: Int) -> Int {
        let byteIndex = sampleIndex * RealtimePcmFormat.bytesPerSample
        let rawBytes = [UInt8](bytes)
        let low = UInt16(rawBytes[byteIndex])
        let high = UInt16(rawBytes[byteIndex + 1]) << 8
        return Int(Int16(bitPattern: high | low))
    }

    private func temporaryAuthFileURL() throws -> URL {
        let directoryURL = FileManager.default.temporaryDirectory
            .appendingPathComponent("ChuchotageCodexAuthTests-\(UUID().uuidString)", isDirectory: true)
        try FileManager.default.createDirectory(at: directoryURL, withIntermediateDirectories: true)
        return directoryURL.appendingPathComponent("auth.json")
    }

    private func codexAuthJson(
        accessToken: String,
        idToken: String?,
        refreshToken: String?,
        lastRefresh: String?
    ) -> String {
        var tokens: [String: Any] = [
            "access_token": accessToken,
        ]
        if let idToken {
            tokens["id_token"] = idToken
        }
        if let refreshToken {
            tokens["refresh_token"] = refreshToken
        }

        var payload: [String: Any] = [
            "tokens": tokens,
        ]
        if let lastRefresh {
            payload["last_refresh"] = lastRefresh
        }

        let data = try! JSONSerialization.data(withJSONObject: payload, options: [.sortedKeys])
        return String(data: data, encoding: .utf8)!
    }
}

private enum OneShotContinuationTestError: Error {
    case secondResume
}

private final class InMemoryKeychainItemClient: KeychainItemClient, @unchecked Sendable {
    private struct Key: Hashable {
        let service: String
        let account: String
    }

    private let lock = NSLock()
    private var items: [Key: Data] = [:]

    func credentialStatus(service: String, account: String) throws -> OpenAICredentialStatus {
        lock.lock()
        defer { lock.unlock() }
        guard let data = items[Key(service: service, account: account)] else {
            return .missing
        }
        let kind = try? JSONDecoder().decode(OpenAICredential.self, from: data).kind
        return .available(kind: kind)
    }

    func read(service: String, account: String) throws -> Data? {
        lock.lock()
        defer { lock.unlock() }
        return items[Key(service: service, account: account)]
    }

    func save(_ data: Data, service: String, account: String) throws {
        lock.lock()
        defer { lock.unlock() }
        items[Key(service: service, account: account)] = data
    }

    func delete(service: String, account: String) throws {
        lock.lock()
        defer { lock.unlock() }
        items.removeValue(forKey: Key(service: service, account: account))
    }
}
