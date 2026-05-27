import { readFile, writeFile } from "node:fs/promises";

const PCM_FORMAT = 1;
const MONO_CHANNELS = 1;
const BITS_PER_SAMPLE = 16;
const BYTES_PER_SAMPLE = 2;

export async function readWavPcm16(filePath) {
  const bytes = await readFile(filePath);
  return parseWavPcm16(bytes);
}

export function parseWavPcm16(bytes) {
  if (bytes.toString("ascii", 0, 4) !== "RIFF" || bytes.toString("ascii", 8, 12) !== "WAVE") {
    throw new Error("Expected a RIFF/WAVE file.");
  }

  let offset = 12;
  let format = null;
  let data = null;

  while (offset + 8 <= bytes.length) {
    const id = bytes.toString("ascii", offset, offset + 4);
    const size = bytes.readUInt32LE(offset + 4);
    const start = offset + 8;
    const end = start + size;

    if (end > bytes.length) {
      throw new Error(`Invalid WAV chunk ${id}.`);
    }

    if (id === "fmt ") {
      format = {
        audioFormat: bytes.readUInt16LE(start),
        channels: bytes.readUInt16LE(start + 2),
        sampleRate: bytes.readUInt32LE(start + 4),
        bitsPerSample: bytes.readUInt16LE(start + 14),
      };
    } else if (id === "data") {
      data = bytes.subarray(start, end);
    }

    offset = end + (size % 2);
  }

  if (!format) {
    throw new Error("WAV file is missing a fmt chunk.");
  }
  if (!data) {
    throw new Error("WAV file is missing a data chunk.");
  }
  if (
    format.audioFormat !== PCM_FORMAT ||
    format.channels !== MONO_CHANNELS ||
    format.bitsPerSample !== BITS_PER_SAMPLE
  ) {
    throw new Error("Expected mono PCM16 WAV audio.");
  }

  return {
    sampleRate: format.sampleRate,
    pcm: bufferToInt16(data),
  };
}

export async function writeWavPcm16(filePath, pcm, sampleRate = 24000) {
  await writeFile(filePath, createWavPcm16(pcm, sampleRate));
}

export function createWavPcm16(pcm, sampleRate = 24000) {
  const data = int16ToBuffer(pcm);
  const byteRate = sampleRate * MONO_CHANNELS * BYTES_PER_SAMPLE;
  const blockAlign = MONO_CHANNELS * BYTES_PER_SAMPLE;
  const header = Buffer.alloc(44);

  header.write("RIFF", 0, "ascii");
  header.writeUInt32LE(36 + data.length, 4);
  header.write("WAVE", 8, "ascii");
  header.write("fmt ", 12, "ascii");
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(PCM_FORMAT, 20);
  header.writeUInt16LE(MONO_CHANNELS, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(BITS_PER_SAMPLE, 34);
  header.write("data", 36, "ascii");
  header.writeUInt32LE(data.length, 40);

  return Buffer.concat([header, data]);
}

export function bufferToInt16(buffer) {
  const evenLength = buffer.length - (buffer.length % BYTES_PER_SAMPLE);
  const samples = new Int16Array(evenLength / BYTES_PER_SAMPLE);
  for (let index = 0; index < samples.length; index += 1) {
    samples[index] = buffer.readInt16LE(index * BYTES_PER_SAMPLE);
  }
  return samples;
}

export function int16ToBuffer(samples) {
  const buffer = Buffer.alloc(samples.length * BYTES_PER_SAMPLE);
  for (let index = 0; index < samples.length; index += 1) {
    buffer.writeInt16LE(clampInt16(samples[index]), index * BYTES_PER_SAMPLE);
  }
  return buffer;
}

export function concatPcm(chunks) {
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const pcm = new Int16Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    pcm.set(chunk, offset);
    offset += chunk.length;
  }
  return pcm;
}

export function clampInt16(value) {
  return Math.max(-32768, Math.min(32767, Math.round(value)));
}
