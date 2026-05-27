import Foundation

enum RealtimePcmFormat {
    static let sampleRate = 24_000
    static let channelCount = 1
    static let bitsPerSample = 16
    static let bytesPerSample = 2
}

struct PcmAudioChunk: Equatable, Sendable {
    let pcm16: Data
    let level: Double

    init(pcm16: Data, level: Double? = nil) {
        self.pcm16 = pcm16
        self.level = level ?? PcmVolumeMeter.level(pcm16)
    }
}

enum PcmAudioCodec {
    static func encodeBase64Pcm16(_ bytes: Data) -> String {
        bytes.base64EncodedString()
    }

    static func decodeBase64Pcm16(_ base64Audio: String) -> Data? {
        Data(base64Encoded: base64Audio)
    }
}

enum PcmVolumeMeter {
    static func level(_ bytes: Data) -> Double {
        let sampleCount = bytes.count / RealtimePcmFormat.bytesPerSample
        guard sampleCount > 0 else { return 0 }

        var sumSquares = 0.0
        bytes.withUnsafeBytes { rawBuffer in
            let rawBytes = rawBuffer.bindMemory(to: UInt8.self)
            for sampleIndex in 0..<sampleCount {
                let byteIndex = sampleIndex * RealtimePcmFormat.bytesPerSample
                let low = UInt16(rawBytes[byteIndex])
                let high = UInt16(rawBytes[byteIndex + 1]) << 8
                let sample = Int16(bitPattern: high | low)
                let normalized = Double(sample) / Double(Int16.max)
                sumSquares += normalized * normalized
            }
        }

        let rms = sqrt(sumSquares / Double(sampleCount))
        return min(1, max(0, sqrt(rms * responseGain) + floorResponse))
    }

    private static let responseGain = 9.0
    private static let floorResponse = 0.04
}

enum PcmInputGain {
    static func liftQuietSpeech(_ bytes: Data) -> Data {
        let metrics = metrics(bytes)
        guard metrics.sampleCount > 0, metrics.rms >= activeRmsThreshold else {
            return bytes
        }

        let desiredGain = min(maxGain, max(1.0, targetRms / metrics.rms))
        let peakLimitedGain: Double
        if metrics.peak > 0 {
            peakLimitedGain = min(desiredGain, peakHeadroom / metrics.peak)
        } else {
            peakLimitedGain = desiredGain
        }

        guard peakLimitedGain > minEffectiveGain else {
            return bytes
        }

        var output = [UInt8](bytes)
        for sampleIndex in 0..<metrics.sampleCount {
            let sample = readLittleEndianPcm16(output, sampleIndex: sampleIndex)
            let lifted = Int((Double(sample) * peakLimitedGain).rounded())
            writeLittleEndianPcm16(lifted, to: &output, sampleIndex: sampleIndex)
        }
        return Data(output)
    }

    private static func metrics(_ bytes: Data) -> PcmMetrics {
        let rawBytes = [UInt8](bytes)
        let sampleCount = rawBytes.count / RealtimePcmFormat.bytesPerSample
        guard sampleCount > 0 else {
            return PcmMetrics(sampleCount: 0, rms: 0, peak: 0)
        }

        var sumSquares = 0.0
        var peak = 0.0
        for sampleIndex in 0..<sampleCount {
            let sample = readLittleEndianPcm16(rawBytes, sampleIndex: sampleIndex)
            let normalized = Double(sample) / Double(Int16.max)
            let magnitude = min(1.0, abs(normalized))
            sumSquares += normalized * normalized
            if magnitude > peak {
                peak = magnitude
            }
        }

        return PcmMetrics(
            sampleCount: sampleCount,
            rms: sqrt(sumSquares / Double(sampleCount)),
            peak: peak
        )
    }

    private static func readLittleEndianPcm16(_ bytes: [UInt8], sampleIndex: Int) -> Int {
        let byteIndex = sampleIndex * RealtimePcmFormat.bytesPerSample
        let low = UInt16(bytes[byteIndex])
        let high = UInt16(bytes[byteIndex + 1]) << 8
        return Int(Int16(bitPattern: high | low))
    }

    private static func writeLittleEndianPcm16(_ sample: Int, to output: inout [UInt8], sampleIndex: Int) {
        let byteIndex = sampleIndex * RealtimePcmFormat.bytesPerSample
        let clamped = max(Int(Int16.min), min(Int(Int16.max), sample))
        let bitPattern = UInt16(bitPattern: Int16(clamped))
        output[byteIndex] = UInt8(bitPattern & 0x00ff)
        output[byteIndex + 1] = UInt8((bitPattern >> 8) & 0x00ff)
    }

    private struct PcmMetrics {
        let sampleCount: Int
        let rms: Double
        let peak: Double
    }

    private static let activeRmsThreshold = 0.001
    private static let targetRms = 0.07
    private static let maxGain = 8.0
    private static let peakHeadroom = 0.92
    private static let minEffectiveGain = 1.05
}

enum PcmResampler {
    static func resamplePcm16Mono(
        _ input: Data,
        fromSampleRate: Int,
        toSampleRate: Int = RealtimePcmFormat.sampleRate
    ) -> Data {
        guard !input.isEmpty else { return Data() }
        guard fromSampleRate != toSampleRate else { return input }

        let inputSamples = input.count / RealtimePcmFormat.bytesPerSample
        guard inputSamples > 0 else { return Data() }

        let outputSamples = max(1, inputSamples * toSampleRate / fromSampleRate)
        let source = [UInt8](input)
        let ratio = Double(fromSampleRate) / Double(toSampleRate)
        var output = Data()
        output.reserveCapacity(outputSamples * RealtimePcmFormat.bytesPerSample)

        for outputIndex in 0..<outputSamples {
            let sourcePosition = Double(outputIndex) * ratio
            let leftIndex = min(max(Int(floor(sourcePosition)), 0), inputSamples - 1)
            let rightIndex = min(leftIndex + 1, inputSamples - 1)
            let fraction = sourcePosition - Double(leftIndex)
            let left = Double(readLittleEndianPcm16(source, sampleIndex: leftIndex))
            let right = Double(readLittleEndianPcm16(source, sampleIndex: rightIndex))
            let interpolated = Int((left + ((right - left) * fraction)).rounded())
            writeLittleEndianPcm16(
                max(Int(Int16.min), min(Int(Int16.max), interpolated)),
                to: &output
            )
        }

        return output
    }

    private static func readLittleEndianPcm16(_ bytes: [UInt8], sampleIndex: Int) -> Int {
        let byteIndex = sampleIndex * RealtimePcmFormat.bytesPerSample
        let low = UInt16(bytes[byteIndex])
        let high = UInt16(bytes[byteIndex + 1]) << 8
        return Int(Int16(bitPattern: high | low))
    }

    private static func writeLittleEndianPcm16(_ sample: Int, to output: inout Data) {
        let bitPattern = UInt16(bitPattern: Int16(sample))
        output.append(UInt8(bitPattern & 0x00ff))
        output.append(UInt8((bitPattern >> 8) & 0x00ff))
    }
}
