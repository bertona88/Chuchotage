import { clampInt16 } from "./wav.mjs";

const PCM_MAX = 32768;

export function detectSpeechSegments(
  pcm,
  sampleRate,
  {
    thresholdDb = -42,
    frameMs = 30,
    minSpeechMs = 180,
    minSilenceMs = 420,
    paddingMs = 90,
  } = {},
) {
  const frameSamples = Math.max(1, Math.round((sampleRate * frameMs) / 1000));
  const minSpeechFrames = Math.max(1, Math.ceil(minSpeechMs / frameMs));
  const minSilenceFrames = Math.max(1, Math.ceil(minSilenceMs / frameMs));
  const paddingSamples = Math.max(0, Math.round((sampleRate * paddingMs) / 1000));
  const threshold = dbToLinear(thresholdDb);
  const frameCount = Math.ceil(pcm.length / frameSamples);
  const voiced = [];

  for (let frame = 0; frame < frameCount; frame += 1) {
    const start = frame * frameSamples;
    const end = Math.min(pcm.length, start + frameSamples);
    voiced.push(rms(pcm, start, end) >= threshold);
  }

  const segments = [];
  let segmentStartFrame = null;
  let silentRun = 0;

  for (let frame = 0; frame < frameCount; frame += 1) {
    if (voiced[frame]) {
      if (segmentStartFrame === null) {
        segmentStartFrame = frame;
      }
      silentRun = 0;
      continue;
    }

    if (segmentStartFrame !== null) {
      silentRun += 1;
      if (silentRun >= minSilenceFrames) {
        const segmentEndFrame = frame - silentRun + 1;
        addSegment(segments, segmentStartFrame, segmentEndFrame, frameSamples, paddingSamples, pcm.length, minSpeechFrames);
        segmentStartFrame = null;
        silentRun = 0;
      }
    }
  }

  if (segmentStartFrame !== null) {
    addSegment(segments, segmentStartFrame, frameCount, frameSamples, paddingSamples, pcm.length, minSpeechFrames);
  }

  return segments;
}

export function alignTranslatedAudio({
  sourcePcm,
  translatedPcm,
  sampleRate,
  mode = "adaptive",
  baseDelayMs = 650,
  minGapMs = 80,
  outputLengthSamples = sourcePcm.length,
  sourceSegmentOptions = {},
  translatedSegmentOptions = {},
} = {}) {
  if (mode === "fixed") {
    return fixedDelayAlignment({
      translatedPcm,
      sampleRate,
      baseDelayMs,
      outputLengthSamples,
    });
  }

  const sourceSegments = detectSpeechSegments(sourcePcm, sampleRate, sourceSegmentOptions);
  const translatedSegments = detectSpeechSegments(translatedPcm, sampleRate, {
    thresholdDb: -48,
    minSilenceMs: 360,
    paddingMs: 90,
    ...translatedSegmentOptions,
  });

  if (sourceSegments.length === 0 || translatedSegments.length === 0) {
    return {
      ...fixedDelayAlignment({ translatedPcm, sampleRate, baseDelayMs, outputLengthSamples }),
      mode: "fixed-fallback",
      sourceSegments,
      translatedSegments,
    };
  }

  const delaySamples = msToSamples(baseDelayMs, sampleRate);
  const minGapSamples = msToSamples(minGapMs, sampleRate);
  const overlay = new Int16Array(outputLengthSamples);
  const placements = [];
  let previousEnd = 0;

  for (let index = 0; index < translatedSegments.length; index += 1) {
    const translated = translatedSegments[index];
    const source = sourceSegments[Math.min(index, sourceSegments.length - 1)];
    const segmentLength = translated.end - translated.start;
    const desiredStart = source.start + delaySamples;
    const start = Math.max(desiredStart, previousEnd + (placements.length === 0 ? 0 : minGapSamples));
    const end = Math.min(overlay.length, start + segmentLength);

    if (start < overlay.length && end > start) {
      mixInto(overlay, translatedPcm, start, translated.start, end - start);
    }

    placements.push({
      sourceStartMs: samplesToMs(source.start, sampleRate),
      translatedStartMs: samplesToMs(translated.start, sampleRate),
      placedStartMs: samplesToMs(start, sampleRate),
      placedEndMs: samplesToMs(Math.min(start + segmentLength, overlay.length), sampleRate),
      trimmed: start + segmentLength > overlay.length,
    });
    previousEnd = start + segmentLength;
  }

  return {
    mode: "adaptive",
    pcm: overlay,
    placements,
    sourceSegments,
    translatedSegments,
    trimmedTailSamples: Math.max(0, previousEnd - overlay.length),
  };
}

export function mixDucked({
  sourcePcm,
  translatedPcm,
  sampleRate,
  sourceGain = 1,
  translatedGain = 1,
  duckLevel = 0.28,
  duckThresholdDb = -48,
  attackMs = 70,
  releaseMs = 480,
  lookAheadMs = 120,
} = {}) {
  const length = sourcePcm.length;
  const output = new Int16Array(length);
  const targetEnvelope = buildDuckingTargets({
    translatedPcm,
    sampleRate,
    length,
    thresholdDb: duckThresholdDb,
    duckLevel,
    lookAheadMs,
  });
  const attackCoeff = smoothingCoefficient(attackMs, sampleRate);
  const releaseCoeff = smoothingCoefficient(releaseMs, sampleRate);
  let envelope = 1;
  let clippedSamples = 0;
  let duckedSamples = 0;

  for (let index = 0; index < length; index += 1) {
    const target = targetEnvelope[index];
    const coeff = target < envelope ? attackCoeff : releaseCoeff;
    envelope += (target - envelope) * coeff;
    if (envelope < 0.95) {
      duckedSamples += 1;
    }

    const translated = index < translatedPcm.length ? translatedPcm[index] : 0;
    const mixed = sourcePcm[index] * sourceGain * envelope + translated * translatedGain;
    const clamped = clampInt16(mixed);
    if (Math.round(mixed) !== clamped) {
      clippedSamples += 1;
    }
    output[index] = clamped;
  }

  return {
    pcm: output,
    clippedSamples,
    duckedSamples,
    duckedSeconds: duckedSamples / sampleRate,
  };
}

export function samplesToMs(samples, sampleRate) {
  return (samples / sampleRate) * 1000;
}

export function msToSamples(ms, sampleRate) {
  return Math.max(0, Math.round((ms * sampleRate) / 1000));
}

function fixedDelayAlignment({ translatedPcm, sampleRate, baseDelayMs, outputLengthSamples }) {
  const delaySamples = msToSamples(baseDelayMs, sampleRate);
  const overlay = new Int16Array(outputLengthSamples);
  const copyLength = Math.max(0, Math.min(translatedPcm.length, overlay.length - delaySamples));
  if (copyLength > 0) {
    overlay.set(translatedPcm.subarray(0, copyLength), delaySamples);
  }

  return {
    mode: "fixed",
    pcm: overlay,
    placements: [
      {
        translatedStartMs: 0,
        placedStartMs: baseDelayMs,
        placedEndMs: samplesToMs(delaySamples + copyLength, sampleRate),
        trimmed: translatedPcm.length > copyLength,
      },
    ],
    sourceSegments: [],
    translatedSegments: [],
    trimmedTailSamples: Math.max(0, translatedPcm.length - copyLength),
  };
}

function addSegment(segments, startFrame, endFrame, frameSamples, paddingSamples, pcmLength, minSpeechFrames) {
  if (endFrame - startFrame < minSpeechFrames) {
    return;
  }

  const start = Math.max(0, startFrame * frameSamples - paddingSamples);
  const end = Math.min(pcmLength, endFrame * frameSamples + paddingSamples);
  const previous = segments.at(-1);

  if (previous && start <= previous.end) {
    previous.end = Math.max(previous.end, end);
    return;
  }

  segments.push({ start, end });
}

function mixInto(target, source, targetStart, sourceStart, count) {
  for (let index = 0; index < count; index += 1) {
    const targetIndex = targetStart + index;
    target[targetIndex] = clampInt16(target[targetIndex] + source[sourceStart + index]);
  }
}

function buildDuckingTargets({ translatedPcm, sampleRate, length, thresholdDb, duckLevel, lookAheadMs }) {
  const frameMs = 10;
  const frameSamples = msToSamples(frameMs, sampleRate);
  const lookAheadFrames = Math.ceil(lookAheadMs / frameMs);
  const frameCount = Math.ceil(length / frameSamples);
  const active = new Array(frameCount).fill(false);
  const threshold = dbToLinear(thresholdDb);

  for (let frame = 0; frame < frameCount; frame += 1) {
    const start = frame * frameSamples;
    const end = Math.min(translatedPcm.length, start + frameSamples);
    active[frame] = end > start && rms(translatedPcm, start, end) >= threshold;
  }

  const targets = new Float32Array(length);
  for (let frame = 0; frame < frameCount; frame += 1) {
    let shouldDuck = false;
    for (let ahead = 0; ahead <= lookAheadFrames && frame + ahead < frameCount; ahead += 1) {
      if (active[frame + ahead]) {
        shouldDuck = true;
        break;
      }
    }

    const target = shouldDuck ? duckLevel : 1;
    const start = frame * frameSamples;
    const end = Math.min(length, start + frameSamples);
    targets.fill(target, start, end);
  }

  return targets;
}

function rms(pcm, start, end) {
  if (end <= start) {
    return 0;
  }

  let sum = 0;
  for (let index = start; index < end; index += 1) {
    const value = (pcm[index] ?? 0) / PCM_MAX;
    sum += value * value;
  }
  return Math.sqrt(sum / (end - start));
}

function dbToLinear(db) {
  return 10 ** (db / 20);
}

function smoothingCoefficient(ms, sampleRate) {
  const samples = Math.max(1, msToSamples(ms, sampleRate));
  return 1 - Math.exp(-1 / samples);
}
