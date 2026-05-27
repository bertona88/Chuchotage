import test from "node:test";
import assert from "node:assert/strict";
import { alignTranslatedAudio, detectSpeechSegments, mixDucked, msToSamples } from "../lib/audio.mjs";
import { createWavPcm16, parseWavPcm16 } from "../lib/wav.mjs";
import { sanitizeOutputLanguageCode } from "../lib/languages.mjs";

const SAMPLE_RATE = 24000;

test("language sanitizer mirrors app fallbacks", () => {
  assert.equal(sanitizeOutputLanguageCode("it"), "it");
  assert.equal(sanitizeOutputLanguageCode("pt-BR"), "pt");
  assert.equal(sanitizeOutputLanguageCode("in"), "id");
  assert.equal(sanitizeOutputLanguageCode("not-real"), "en");
});

test("WAV PCM16 writer and parser round-trip audio", () => {
  const pcm = new Int16Array([0, 1200, -1200, 32767, -32768]);
  const wav = createWavPcm16(pcm, SAMPLE_RATE);
  const parsed = parseWavPcm16(wav);

  assert.equal(parsed.sampleRate, SAMPLE_RATE);
  assert.deepEqual([...parsed.pcm], [...pcm]);
});

test("speech detector finds separated phrases", () => {
  const pcm = silence(1800);
  tone(pcm, 200, 350, 9000);
  tone(pcm, 1000, 250, 9000);

  const segments = detectSpeechSegments(pcm, SAMPLE_RATE, {
    thresholdDb: -35,
    minSpeechMs: 100,
    minSilenceMs: 250,
    paddingMs: 0,
  });

  assert.equal(segments.length, 2);
  assert.ok(Math.abs(segments[0].start - msToSamples(180, SAMPLE_RATE)) < msToSamples(40, SAMPLE_RATE));
  assert.ok(Math.abs(segments[1].start - msToSamples(990, SAMPLE_RATE)) < msToSamples(40, SAMPLE_RATE));
});

test("adaptive alignment places translated phrase after source phrase delay", () => {
  const source = silence(2500);
  const translated = silence(1400);
  tone(source, 500, 320, 9000);
  tone(translated, 80, 300, 9000);

  const aligned = alignTranslatedAudio({
    sourcePcm: source,
    translatedPcm: translated,
    sampleRate: SAMPLE_RATE,
    mode: "adaptive",
    baseDelayMs: 650,
    sourceSegmentOptions: { thresholdDb: -35, paddingMs: 0 },
    translatedSegmentOptions: { thresholdDb: -35, paddingMs: 0 },
  });

  assert.equal(aligned.mode, "adaptive");
  assert.ok(Math.abs(aligned.placements[0].placedStartMs - 1150) < 60);
  assert.ok(maxAbs(aligned.pcm.subarray(msToSamples(1120, SAMPLE_RATE), msToSamples(1220, SAMPLE_RATE))) > 0);
});

test("ducked mix lowers original audio while translated speech is present", () => {
  const source = silence(1200);
  const translated = silence(1200);
  tone(source, 0, 1200, 6000);
  tone(translated, 400, 300, 9000);

  const mix = mixDucked({
    sourcePcm: source,
    translatedPcm: translated,
    sampleRate: SAMPLE_RATE,
    duckLevel: 0.25,
    attackMs: 10,
    releaseMs: 80,
    lookAheadMs: 20,
    duckThresholdDb: -45,
  });

  const before = averageAbs(mix.pcm, 100, 220);
  const during = averageAbs(mix.pcm, 520, 620);

  assert.ok(mix.duckedSeconds > 0.2);
  assert.ok(during < before * 1.7, "translated speech should not simply stack over full-volume source");
});

function silence(durationMs) {
  return new Int16Array(msToSamples(durationMs, SAMPLE_RATE));
}

function tone(pcm, startMs, durationMs, amplitude) {
  const start = msToSamples(startMs, SAMPLE_RATE);
  const length = msToSamples(durationMs, SAMPLE_RATE);
  for (let index = 0; index < length && start + index < pcm.length; index += 1) {
    pcm[start + index] = Math.round(Math.sin(index / 5) * amplitude);
  }
}

function maxAbs(pcm) {
  return pcm.reduce((max, sample) => Math.max(max, Math.abs(sample)), 0);
}

function averageAbs(pcm, startMs, endMs) {
  const start = msToSamples(startMs, SAMPLE_RATE);
  const end = msToSamples(endMs, SAMPLE_RATE);
  let total = 0;
  for (let index = start; index < end; index += 1) {
    total += Math.abs(pcm[index]);
  }
  return total / (end - start);
}
