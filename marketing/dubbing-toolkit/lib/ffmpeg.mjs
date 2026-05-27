import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { spawn } from "node:child_process";

export async function assertFfmpegAvailable() {
  await runCommand("ffmpeg", ["-version"], { quiet: true });
  await runCommand("ffprobe", ["-version"], { quiet: true });
}

export async function extractMonoPcm24k(inputPath, outputWavPath) {
  await mkdir(dirname(outputWavPath), { recursive: true });
  await runCommand("ffmpeg", [
    "-hide_banner",
    "-y",
    "-i",
    inputPath,
    "-vn",
    "-ac",
    "1",
    "-ar",
    "24000",
    "-c:a",
    "pcm_s16le",
    outputWavPath,
  ]);
}

export async function muxVideoWithAudio(inputVideoPath, audioWavPath, outputVideoPath) {
  await mkdir(dirname(outputVideoPath), { recursive: true });
  await runCommand("ffmpeg", [
    "-hide_banner",
    "-y",
    "-i",
    inputVideoPath,
    "-i",
    audioWavPath,
    "-map",
    "0:v:0",
    "-map",
    "1:a:0",
    "-c:v",
    "copy",
    "-c:a",
    "aac",
    "-b:a",
    "128k",
    "-movflags",
    "+faststart",
    "-shortest",
    outputVideoPath,
  ]);
}

export async function probeDurationSeconds(filePath) {
  const output = await runCommand("ffprobe", [
    "-v",
    "error",
    "-show_entries",
    "format=duration",
    "-of",
    "default=noprint_wrappers=1:nokey=1",
    filePath,
  ], { capture: true, quiet: true });
  const duration = Number.parseFloat(output.trim());
  return Number.isFinite(duration) ? duration : null;
}

export function runCommand(command, args, { capture = false, quiet = false } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: capture ? ["ignore", "pipe", quiet ? "pipe" : "inherit"] : ["ignore", "pipe", quiet ? "pipe" : "inherit"],
    });
    let stdout = "";
    let stderr = "";

    child.stdout?.on("data", (chunk) => {
      if (capture) {
        stdout += chunk.toString("utf8");
      } else if (!quiet) {
        process.stdout.write(chunk);
      }
    });

    child.stderr?.on("data", (chunk) => {
      stderr += chunk.toString("utf8");
      if (!quiet) {
        process.stderr.write(chunk);
      }
    });

    child.on("error", (error) => {
      reject(new Error(`${command} could not start: ${error.message}`));
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve(stdout);
        return;
      }

      const message = stderr.trim() || `${command} exited with status ${code}.`;
      reject(new Error(message));
    });
  });
}
