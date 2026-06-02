#if os(macOS)
@preconcurrency import AppKit
@preconcurrency import CoreAudio
import Darwin
import Foundation

struct MacAudioOutputDevice: Identifiable, Equatable, Hashable, Sendable {
    let uid: String
    let name: String

    var id: String { uid }

    var selection: MacOutputDeviceSelection {
        .device(uid: uid, name: name)
    }
}

enum MacAudioCore {
    static func propertyAddress(
        _ selector: AudioObjectPropertySelector,
        scope: AudioObjectPropertyScope = kAudioObjectPropertyScopeGlobal
    ) -> AudioObjectPropertyAddress {
        AudioObjectPropertyAddress(
            mSelector: selector,
            mScope: scope,
            mElement: kAudioObjectPropertyElementMain
        )
    }

    static func check(_ status: OSStatus, operation: String) throws {
        guard status == noErr else {
            if status == kAudioDevicePermissionsError {
                throw TranslationAudioIOError.systemAudioCapturePermissionDenied
            }
            throw TranslationAudioIOError.systemAudioCaptureStartFailed(
                "\(operation) failed (\(statusDescription(status)))."
            )
        }
    }

    static func statusDescription(_ status: OSStatus) -> String {
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

    static func audioObjectIDs(
        objectID: AudioObjectID,
        selector: AudioObjectPropertySelector,
        scope: AudioObjectPropertyScope = kAudioObjectPropertyScopeGlobal
    ) throws -> [AudioObjectID] {
        var address = propertyAddress(selector, scope: scope)
        var dataSize: UInt32 = 0
        try check(
            AudioObjectGetPropertyDataSize(objectID, &address, 0, nil, &dataSize),
            operation: "Read Core Audio object list size"
        )

        guard dataSize > 0 else { return [] }
        let count = Int(dataSize) / MemoryLayout<AudioObjectID>.size
        var objectIDs = Array(repeating: AudioObjectID(kAudioObjectUnknown), count: count)

        try objectIDs.withUnsafeMutableBufferPointer { pointer in
            guard let baseAddress = pointer.baseAddress else { return }
            try check(
                AudioObjectGetPropertyData(objectID, &address, 0, nil, &dataSize, baseAddress),
                operation: "Read Core Audio object list"
            )
        }

        return objectIDs.filter { $0 != kAudioObjectUnknown }
    }

    static func boolProperty(
        objectID: AudioObjectID,
        selector: AudioObjectPropertySelector,
        scope: AudioObjectPropertyScope = kAudioObjectPropertyScopeGlobal
    ) -> Bool {
        var address = propertyAddress(selector, scope: scope)
        var value: UInt32 = 0
        var dataSize = UInt32(MemoryLayout<UInt32>.size)
        let status = AudioObjectGetPropertyData(objectID, &address, 0, nil, &dataSize, &value)
        return status == noErr && value != 0
    }

    static func cfStringProperty(
        objectID: AudioObjectID,
        selector: AudioObjectPropertySelector,
        scope: AudioObjectPropertyScope = kAudioObjectPropertyScopeGlobal
    ) -> String? {
        var address = propertyAddress(selector, scope: scope)
        var dataSize = UInt32(MemoryLayout<Unmanaged<CFString>?>.size)
        var unmanagedValue: Unmanaged<CFString>?
        let status = AudioObjectGetPropertyData(
            objectID,
            &address,
            0,
            nil,
            &dataSize,
            &unmanagedValue
        )
        guard status == noErr, let unmanagedValue else { return nil }
        return unmanagedValue.takeRetainedValue() as String
    }

    static func pidProperty(objectID: AudioObjectID) -> pid_t? {
        var address = propertyAddress(kAudioProcessPropertyPID)
        var pid = pid_t(0)
        var dataSize = UInt32(MemoryLayout<pid_t>.size)
        let status = AudioObjectGetPropertyData(objectID, &address, 0, nil, &dataSize, &pid)
        return status == noErr && pid > 0 ? pid : nil
    }

    static func currentProcessAudioObjectID() throws -> AudioObjectID {
        try processObjectID(forPID: getpid(), operation: "Find Chuchotage audio process")
    }

    static func processObjectID(
        forPID pid: pid_t,
        operation: String = "Find audio process"
    ) throws -> AudioObjectID {
        var mutablePID = pid
        var processObjectID = AudioObjectID(kAudioObjectUnknown)
        var address = propertyAddress(kAudioHardwarePropertyTranslatePIDToProcessObject)
        var dataSize = UInt32(MemoryLayout<AudioObjectID>.size)
        let qualifierSize = UInt32(MemoryLayout<pid_t>.size)
        let status = withUnsafePointer(to: &mutablePID) { pidPointer in
            AudioObjectGetPropertyData(
                AudioObjectID(kAudioObjectSystemObject),
                &address,
                qualifierSize,
                pidPointer,
                &dataSize,
                &processObjectID
            )
        }

        try check(status, operation: operation)
        guard processObjectID != kAudioObjectUnknown else {
            throw TranslationAudioIOError.systemAudioCaptureStartFailed(
                "\(operation) did not return an audio process."
            )
        }
        return processObjectID
    }

    static func outputChannelCount(forDeviceID deviceID: AudioObjectID) -> Int {
        var address = propertyAddress(
            kAudioDevicePropertyStreamConfiguration,
            scope: kAudioDevicePropertyScopeOutput
        )
        var dataSize: UInt32 = 0
        guard AudioObjectGetPropertyDataSize(deviceID, &address, 0, nil, &dataSize) == noErr,
              dataSize > 0 else {
            return 0
        }

        let bufferListPointer = UnsafeMutableRawPointer.allocate(
            byteCount: Int(dataSize),
            alignment: MemoryLayout<AudioBufferList>.alignment
        )
        defer { bufferListPointer.deallocate() }

        guard AudioObjectGetPropertyData(deviceID, &address, 0, nil, &dataSize, bufferListPointer) == noErr else {
            return 0
        }

        let bufferList = bufferListPointer.assumingMemoryBound(to: AudioBufferList.self)
        return UnsafeMutableAudioBufferListPointer(bufferList)
            .reduce(0) { $0 + Int($1.mNumberChannels) }
    }
}

enum MacAudioProcessCatalog {
    static func activeOutputApps() -> [MacCaptureApp] {
        do {
            let processIDs = try MacAudioCore.audioObjectIDs(
                objectID: AudioObjectID(kAudioObjectSystemObject),
                selector: kAudioHardwarePropertyProcessObjectList
            )
            let currentPID = getpid()
            var appsByBundleID: [String: MacCaptureApp] = [:]

            for processID in processIDs {
                guard MacAudioCore.boolProperty(
                    objectID: processID,
                    selector: kAudioProcessPropertyIsRunningOutput
                ),
                let bundleID = MacAudioCore.cfStringProperty(
                    objectID: processID,
                    selector: kAudioProcessPropertyBundleID
                ),
                !bundleID.isEmpty,
                let pid = MacAudioCore.pidProperty(objectID: processID),
                pid != currentPID else {
                    continue
                }

                let displayName = NSRunningApplication(processIdentifier: pid)?.localizedName
                    ?? Bundle(identifier: bundleID)?.object(forInfoDictionaryKey: "CFBundleName") as? String
                    ?? bundleID
                appsByBundleID[bundleID] = MacCaptureApp(
                    bundleID: bundleID,
                    displayName: displayName
                )
            }

            return appsByBundleID.values.sorted { lhs, rhs in
                lhs.displayName.localizedCaseInsensitiveCompare(rhs.displayName) == .orderedAscending
            }
        } catch {
            return []
        }
    }

    static func processObjectIDs(for source: MacCaptureSource) throws -> [AudioObjectID] {
        switch source {
        case .systemAudio:
            return [try MacAudioCore.currentProcessAudioObjectID()]

        case .microphone:
            return []

        case .selectedApp(let bundleID, let displayName):
            let processIDs = try MacAudioCore.audioObjectIDs(
                objectID: AudioObjectID(kAudioObjectSystemObject),
                selector: kAudioHardwarePropertyProcessObjectList
            )
            let matchingProcessIDs = processIDs.filter { processID in
                guard MacAudioCore.boolProperty(
                    objectID: processID,
                    selector: kAudioProcessPropertyIsRunningOutput
                ) else {
                    return false
                }
                return MacAudioCore.cfStringProperty(
                    objectID: processID,
                    selector: kAudioProcessPropertyBundleID
                ) == bundleID
            }

            guard !matchingProcessIDs.isEmpty else {
                let name = displayName.isEmpty ? bundleID : displayName
                throw TranslationAudioIOError.systemAudioCaptureStartFailed(
                    "\(name) is not currently exposing capturable playback audio."
                )
            }

            return matchingProcessIDs
        }
    }
}

enum MacAudioOutputDeviceManager {
    static func outputDevices() -> [MacAudioOutputDevice] {
        do {
            return try MacAudioCore.audioObjectIDs(
                objectID: AudioObjectID(kAudioObjectSystemObject),
                selector: kAudioHardwarePropertyDevices
            )
            .compactMap { deviceID in
                guard MacAudioCore.outputChannelCount(forDeviceID: deviceID) > 0,
                      MacAudioCore.boolProperty(
                        objectID: deviceID,
                        selector: kAudioDevicePropertyDeviceIsAlive
                      ),
                      let uid = MacAudioCore.cfStringProperty(
                        objectID: deviceID,
                        selector: kAudioDevicePropertyDeviceUID
                      ),
                      let name = MacAudioCore.cfStringProperty(
                        objectID: deviceID,
                        selector: kAudioObjectPropertyName
                      ) else {
                    return nil
                }

                return MacAudioOutputDevice(uid: uid, name: name)
            }
            .sorted { lhs, rhs in
                lhs.name.localizedCaseInsensitiveCompare(rhs.name) == .orderedAscending
            }
        } catch {
            return []
        }
    }

    static func deviceID(for selection: MacOutputDeviceSelection) throws -> AudioObjectID? {
        switch selection {
        case .systemDefault:
            return nil
        case .device(let uid, let name):
            var deviceID = AudioObjectID(kAudioObjectUnknown)
            var address = MacAudioCore.propertyAddress(kAudioHardwarePropertyTranslateUIDToDevice)
            var dataSize = UInt32(MemoryLayout<AudioObjectID>.size)
            let qualifier = uid as CFString
            let qualifierSize = UInt32(MemoryLayout<CFString>.size)
            let status = withUnsafePointer(to: qualifier) { qualifierPointer in
                AudioObjectGetPropertyData(
                    AudioObjectID(kAudioObjectSystemObject),
                    &address,
                    qualifierSize,
                    qualifierPointer,
                    &dataSize,
                    &deviceID
                )
            }

            try MacAudioCore.check(status, operation: "Find selected output device")
            guard deviceID != kAudioObjectUnknown,
                  MacAudioCore.outputChannelCount(forDeviceID: deviceID) > 0 else {
                throw TranslationAudioIOError.outputDeviceUnavailable(name)
            }
            return deviceID
        }
    }

    static func contains(selection: MacOutputDeviceSelection) -> Bool {
        switch selection {
        case .systemDefault:
            return true
        case .device(let uid, _):
            return outputDevices().contains { $0.uid == uid }
        }
    }
}
#endif
