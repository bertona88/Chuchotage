#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { basename, dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { alignTranslatedAudio, mixDucked, samplesToMs } from "../lib/audio.mjs";
import { assertFfmpegAvailable, extractMonoPcm24k, muxVideoWithAudio, probeDurationSeconds } from "../lib/ffmpeg.mjs";
import { outputLanguageName, sanitizeOutputLanguageCode, supportedOutputLanguages } from "../lib/languages.mjs";
import { resolveTranslationCredential } from "../lib/auth.mjs";
import { translatePcmWithRealtime } from "../lib/realtime-translation.mjs";
import { readWavPcm16, writeWavPcm16 } from "../lib/wav.mjs";

const TOOL_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const DEFAULT_RUNS_DIR = join(TOOL_ROOT, "runs");

try {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    process.exit(0);
  }

  await run(options);
} catch (error) {
  console.error(`\n${error.message}`);
  process.exit(1);
}

async function run(options) {
  const inputPath = resolveRequiredInput(options.input);
  const targetLanguageCode = sanitizeOutputLanguageCode(options.language);
  const outputPath = resolveOutputPath(options.output, inputPath, targetLanguageCode);
  const runDir = resolveRunDir(options.workdir, inputPath, targetLanguageCode);
  await mkdir(runDir, { recursive: true });

  const sourceWavPath = join(runDir, "source-24k-mono.wav");
  const translatedRawWavPath = join(runDir, `translated-raw-${targetLanguageCode}.wav`);
  const translatedAlignedWavPath = join(runDir, `translated-aligned-${targetLanguageCode}.wav`);
  const dubbedAudioWavPath = join(runDir, `dubbed-audio-${targetLanguageCode}.wav`);
  const sourceTranscriptPath = join(runDir, "source-transcript.txt");
  const targetTranscriptPath = join(runDir, `target-transcript-${targetLanguageCode}.txt`);
  const manifestPath = join(runDir, "manifest.json");

  logStep(`Preparing ${basename(inputPath)} -> ${outputLanguageName(targetLanguageCode)}`);
  await assertFfmpegAvailable();

  logStep("Extracting mono 24 kHz PCM from video");
  await extractMonoPcm24k(inputPath, sourceWavPath);
  const sourceAudio = await readWavPcm16(sourceWavPath);
  if (sourceAudio.sampleRate !== 24000) {
    throw new Error("ffmpeg extraction did not produce 24 kHz audio.");
  }

  logStep("Resolving local OpenAI credential");
  const credential = await resolveTranslationCredential({
    authMode: options.auth,
    targetLanguageCode,
    sourceTranscriptEnabled: options.sourceTranscript,
  });
  console.log(`Using ${credential.source}.`);

  logStep("Streaming source audio through Realtime Translation");
  const translation = await translatePcmWithRealtime({
    pcm: sourceAudio.pcm,
    sampleRate: sourceAudio.sampleRate,
    targetLanguageCode,
    credential,
    sourceTranscriptEnabled: options.sourceTranscript,
    chunkMs: options.chunkMs,
    realtimeFactor: options.realtimeFactor,
    safetyIdentifier: options.safetyIdentifier,
    onProgress: reportRealtimeProgress,
  });
  process.stdout.write("\n");

  await writeWavPcm16(translatedRawWavPath, translation.pcm, sourceAudio.sampleRate);
  await writeFile(sourceTranscriptPath, translation.inputTranscript.trim() ? `${translation.inputTranscript.trim()}\n` : "");
  await writeFile(targetTranscriptPath, translation.outputTranscript.trim() ? `${translation.outputTranscript.trim()}\n` : "");

  logStep(`Aligning translated audio (${options.alignment})`);
  const alignment = alignTranslatedAudio({
    sourcePcm: sourceAudio.pcm,
    translatedPcm: translation.pcm,
    sampleRate: sourceAudio.sampleRate,
    mode: options.alignment,
    baseDelayMs: options.baseDelayMs,
    minGapMs: options.minGapMs,
    outputLengthSamples: sourceAudio.pcm.length,
  });
  await writeWavPcm16(translatedAlignedWavPath, alignment.pcm, sourceAudio.sampleRate);

  logStep("Mixing with dynamic ducking");
  const mix = mixDucked({
    sourcePcm: sourceAudio.pcm,
    translatedPcm: alignment.pcm,
    sampleRate: sourceAudio.sampleRate,
    sourceGain: options.sourceVolume,
    translatedGain: options.translatedVolume,
    duckLevel: options.duckVolume,
    duckThresholdDb: options.duckThresholdDb,
    attackMs: options.attackMs,
    releaseMs: options.releaseMs,
    lookAheadMs: options.lookAheadMs,
  });
  await writeWavPcm16(dubbedAudioWavPath, mix.pcm, sourceAudio.sampleRate);

  logStep("Muxing dubbed audio back into the video");
  await muxVideoWithAudio(inputPath, dubbedAudioWavPath, outputPath);

  const videoDurationSeconds = await probeDurationSeconds(inputPath);
  const manifest = {
    input: inputPath,
    output: outputPath,
    runDir,
    targetLanguageCode,
    targetLanguageName: outputLanguageName(targetLanguageCode),
    model: "gpt-realtime-translate",
    endpoint: "wss://api.openai.com/v1/realtime/translations?model=gpt-realtime-translate",
    sourceAudioSeconds: sourceAudio.pcm.length / sourceAudio.sampleRate,
    videoDurationSeconds,
    options: manifestOptions(options),
    files: {
      sourceWav: sourceWavPath,
      translatedRawWav: translatedRawWavPath,
      translatedAlignedWav: translatedAlignedWavPath,
      dubbedAudioWav: dubbedAudioWavPath,
      sourceTranscript: sourceTranscriptPath,
      targetTranscript: targetTranscriptPath,
    },
    alignment: summarizeAlignment(alignment, sourceAudio.sampleRate),
    mix: {
      clippedSamples: mix.clippedSamples,
      duckedSeconds: Number(mix.duckedSeconds.toFixed(3)),
    },
    transcripts: {
      source: translation.inputTranscript.trim(),
      target: translation.outputTranscript.trim(),
    },
  };
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

  console.log(`\nDone: ${outputPath}`);
  console.log(`Work files: ${runDir}`);
  if (alignment.trimmedTailSamples > 0) {
    console.log(`Note: trimmed ${Math.round(samplesToMs(alignment.trimmedTailSamples, sourceAudio.sampleRate))} ms of translated tail to keep the original video length.`);
  }
  if (mix.clippedSamples > 0) {
    console.log(`Note: ${mix.clippedSamples} mixed samples clipped. Try --translated-volume 0.85 if it sounds hot.`);
  }
}

function parseArgs(args) {
  const options = {
    input: null,
    output: null,
    language: "en",
    workdir: null,
    auth: "auto",
    alignment: "adaptive",
    baseDelayMs: 650,
    minGapMs: 80,
    chunkMs: 200,
    realtimeFactor: 1,
    sourceVolume: 1,
    translatedVolume: 1,
    duckVolume: 0.28,
    duckThresholdDb: -48,
    attackMs: 70,
    releaseMs: 480,
    lookAheadMs: 120,
    sourceTranscript: true,
    safetyIdentifier: "chuchotage-marketing-local",
    help: false,
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--help" || arg === "-h") {
      options.help = true;
      continue;
    }
    if (arg === "--no-source-transcript") {
      options.sourceTranscript = false;
      continue;
    }
    if (!arg.startsWith("--")) {
      if (options.input) {
        throw new Error(`Unexpected positional argument: ${arg}`);
      }
      options.input = arg;
      continue;
    }

    const key = arg.slice(2);
    const value = args[index + 1];
    if (value === undefined || value.startsWith("--")) {
      throw new Error(`Missing value for --${key}`);
    }
    index += 1;

    switch (key) {
      case "out":
      case "output":
        options.output = value;
        break;
      case "language":
      case "lang":
        options.language = value;
        break;
      case "workdir":
        options.workdir = value;
        break;
      case "auth":
        options.auth = value;
        break;
      case "alignment":
        options.alignment = parseChoice(value, ["adaptive", "fixed"], "--alignment");
        break;
      case "base-delay-ms":
        options.baseDelayMs = parseNumber(value, "--base-delay-ms");
        break;
      case "min-gap-ms":
        options.minGapMs = parseNumber(value, "--min-gap-ms");
        break;
      case "chunk-ms":
        options.chunkMs = parseNumber(value, "--chunk-ms");
        break;
      case "realtime-factor":
        options.realtimeFactor = parseNumber(value, "--realtime-factor");
        break;
      case "source-volume":
        options.sourceVolume = parseNumber(value, "--source-volume");
        break;
      case "translated-volume":
        options.translatedVolume = parseNumber(value, "--translated-volume");
        break;
      case "duck-volume":
        options.duckVolume = parseNumber(value, "--duck-volume");
        break;
      case "duck-threshold-db":
        options.duckThresholdDb = parseNumber(value, "--duck-threshold-db");
        break;
      case "attack-ms":
        options.attackMs = parseNumber(value, "--attack-ms");
        break;
      case "release-ms":
        options.releaseMs = parseNumber(value, "--release-ms");
        break;
      case "look-ahead-ms":
        options.lookAheadMs = parseNumber(value, "--look-ahead-ms");
        break;
      case "safety-identifier":
        options.safetyIdentifier = value;
        break;
      default:
        throw new Error(`Unknown option: --${key}`);
    }
  }

  if (!options.help && !options.input) {
    throw new Error("Missing input video path. Run with --help for usage.");
  }

  return options;
}

function printHelp() {
  const languages = supportedOutputLanguages.map((language) => language.code).join(", ");
  console.log(`Chuchotage local dubbing toolkit

Usage:
  npm run dub -- <video> --language it --out ./dubbed-it.mp4
  node ./bin/chuchotage-dub.mjs <video> --language en --alignment adaptive

Credentials:
  Uses OPENAI_API_KEY when set. Otherwise --auth auto can use ~/.codex/auth.json
  without printing token values.

Options:
  --language <code>          Target language. Supported: ${languages}
  --out <path>               Output MP4 path.
  --workdir <path>           Directory for WAV/transcript/manifest sidecars.
  --auth <mode>              auto, api-key, or codex. Default: auto
  --alignment <mode>         adaptive or fixed. Default: adaptive
  --base-delay-ms <ms>       Delay before translated speech starts. Default: 650
  --min-gap-ms <ms>          Minimum gap between adaptive placed phrases. Default: 80
  --realtime-factor <n>      Send audio faster than realtime when safe. Default: 1
  --chunk-ms <ms>            PCM append size. Default: 200
  --source-volume <n>        Original track gain. Default: 1
  --translated-volume <n>    Translation gain. Default: 1
  --duck-volume <n>          Original volume while translation speaks. Default: 0.28
  --duck-threshold-db <db>   Speech detection threshold for ducking. Default: -48
  --attack-ms <ms>           Ducking attack. Default: 70
  --release-ms <ms>          Ducking release. Default: 480
  --look-ahead-ms <ms>       Start ducking slightly before translated speech. Default: 120
  --no-source-transcript     Do not request source transcript deltas.
`);
}

function resolveRequiredInput(input) {
  const inputPath = resolve(input);
  if (!existsSync(inputPath)) {
    throw new Error(`Input video not found: ${inputPath}`);
  }
  return inputPath;
}

function resolveOutputPath(output, inputPath, languageCode) {
  if (output) {
    return resolve(output);
  }

  const extension = extname(inputPath) || ".mp4";
  const stem = basename(inputPath, extension);
  return join(dirname(inputPath), `${stem}-dubbed-${languageCode}.mp4`);
}

function resolveRunDir(workdir, inputPath, languageCode) {
  if (workdir) {
    return resolve(workdir);
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const stem = slug(basename(inputPath, extname(inputPath)));
  return join(DEFAULT_RUNS_DIR, `${stamp}-${stem}-${languageCode}`);
}

function manifestOptions(options) {
  const { input, output, workdir, help, ...safeOptions } = options;
  return safeOptions;
}

function summarizeAlignment(alignment, sampleRate) {
  return {
    mode: alignment.mode,
    sourceSegmentCount: alignment.sourceSegments.length,
    translatedSegmentCount: alignment.translatedSegments.length,
    trimmedTailMs: Math.round(samplesToMs(alignment.trimmedTailSamples ?? 0, sampleRate)),
    placements: alignment.placements.slice(0, 40).map((placement) => ({
      sourceStartMs: Math.round(placement.sourceStartMs ?? 0),
      translatedStartMs: Math.round(placement.translatedStartMs ?? 0),
      placedStartMs: Math.round(placement.placedStartMs ?? 0),
      placedEndMs: Math.round(placement.placedEndMs ?? 0),
      trimmed: Boolean(placement.trimmed),
    })),
  };
}

function reportRealtimeProgress(event) {
  if (event.type === "socket-open") {
    console.log(`Realtime socket opened (${event.credentialSource}).`);
    return;
  }
  if (event.type === "input-progress") {
    const sent = event.sentSeconds.toFixed(1).padStart(6);
    const total = event.totalSeconds.toFixed(1).padStart(6);
    process.stdout.write(`\rSent ${sent}s / ${total}s of source audio`);
    return;
  }
  if (event.type === "session-close-sent") {
    process.stdout.write("\nWaiting for translated audio tail...");
  }
}

function logStep(message) {
  console.log(`\n> ${message}`);
}

function parseNumber(value, label) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    throw new Error(`${label} must be a number.`);
  }
  return number;
}

function parseChoice(value, choices, label) {
  if (!choices.includes(value)) {
    throw new Error(`${label} must be one of: ${choices.join(", ")}.`);
  }
  return value;
}

function slug(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60) || "video";
}
