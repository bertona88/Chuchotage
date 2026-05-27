import { bufferToInt16, concatPcm, int16ToBuffer } from "./wav.mjs";
import { buildSessionUpdateEvent } from "./auth.mjs";

const TRANSLATION_WEBSOCKET_URL = "wss://api.openai.com/v1/realtime/translations?model=gpt-realtime-translate";
const SAMPLE_RATE = 24000;

export async function translatePcmWithRealtime({
  pcm,
  sampleRate = SAMPLE_RATE,
  targetLanguageCode,
  credential,
  sourceTranscriptEnabled = true,
  chunkMs = 200,
  realtimeFactor = 1,
  safetyIdentifier,
  closeTimeoutMs = 90000,
  onProgress = () => {},
} = {}) {
  if (sampleRate !== SAMPLE_RATE) {
    throw new Error("Realtime Translation input must be 24 kHz PCM16.");
  }
  if (!credential?.value) {
    throw new Error("Missing translation credential.");
  }

  const outputChunks = [];
  let inputTranscript = "";
  let outputTranscript = "";
  let senderStarted = false;
  let sessionCloseSent = false;
  let resolved = false;
  let closeTimer = null;

  const headers = {
    Authorization: `Bearer ${credential.value}`,
  };
  if (safetyIdentifier) {
    headers["OpenAI-Safety-Identifier"] = String(safetyIdentifier);
  }

  return await new Promise((resolve, reject) => {
    const ws = new WebSocket(TRANSLATION_WEBSOCKET_URL, { headers });

    const finish = () => {
      if (resolved) {
        return;
      }
      resolved = true;
      clearTimeout(closeTimer);
      try {
        ws.close();
      } catch {
        // Nothing useful to do after the session has completed.
      }
      resolve({
        pcm: concatPcm(outputChunks),
        inputTranscript,
        outputTranscript,
      });
    };

    const fail = (error) => {
      if (resolved) {
        return;
      }
      resolved = true;
      clearTimeout(closeTimer);
      try {
        ws.close();
      } catch {
        // Keep the original error.
      }
      reject(error instanceof Error ? error : new Error(String(error)));
    };

    ws.addEventListener("open", () => {
      onProgress({ type: "socket-open", credentialSource: credential.source });
      if (credential.shouldSendSessionUpdate) {
        ws.send(buildSessionUpdateEvent({ targetLanguageCode, sourceTranscriptEnabled }));
        return;
      }
      startSender();
    });

    ws.addEventListener("message", async (message) => {
      try {
        const text = await messageDataToText(message.data);
        const event = JSON.parse(text);

        switch (event.type) {
          case "session.updated":
            startSender();
            break;
          case "session.output_audio.delta":
            if (typeof event.delta === "string" && event.delta.length > 0) {
              outputChunks.push(bufferToInt16(Buffer.from(event.delta, "base64")));
            }
            break;
          case "session.input_transcript.delta":
            inputTranscript += event.delta ?? "";
            break;
          case "session.output_transcript.delta":
            outputTranscript += event.delta ?? "";
            break;
          case "session.closed":
            finish();
            break;
          case "error":
            fail(new Error(openAiEventErrorMessage(event)));
            break;
          default:
            break;
        }
      } catch (error) {
        fail(error);
      }
    });

    ws.addEventListener("error", () => {
      fail(new Error("Realtime Translation WebSocket failed."));
    });

    ws.addEventListener("close", () => {
      if (!resolved && !sessionCloseSent) {
        fail(new Error("Realtime Translation WebSocket closed before input finished."));
      }
    });

    async function startSender() {
      if (senderStarted) {
        return;
      }
      senderStarted = true;

      try {
        const chunkSamples = Math.max(1, Math.round((SAMPLE_RATE * chunkMs) / 1000));
        const chunkDelayMs = Math.max(0, chunkMs / Math.max(0.1, realtimeFactor));
        let lastProgressSecond = -1;

        for (let offset = 0; offset < pcm.length; offset += chunkSamples) {
          if (ws.readyState !== WebSocket.OPEN) {
            throw new Error("Realtime Translation WebSocket closed while sending input audio.");
          }

          const chunk = pcm.subarray(offset, Math.min(pcm.length, offset + chunkSamples));
          ws.send(JSON.stringify({
            type: "session.input_audio_buffer.append",
            audio: int16ToBuffer(chunk).toString("base64"),
          }));

          const sentSeconds = Math.floor(offset / SAMPLE_RATE);
          if (sentSeconds !== lastProgressSecond) {
            lastProgressSecond = sentSeconds;
            onProgress({
              type: "input-progress",
              sentSeconds: offset / SAMPLE_RATE,
              totalSeconds: pcm.length / SAMPLE_RATE,
            });
          }

          if (chunkDelayMs > 0) {
            await sleep(chunkDelayMs);
          }
        }

        sessionCloseSent = true;
        ws.send(JSON.stringify({ type: "session.close" }));
        onProgress({ type: "session-close-sent" });
        closeTimer = setTimeout(() => {
          fail(new Error("Timed out waiting for Realtime Translation to close and flush output."));
        }, closeTimeoutMs);
      } catch (error) {
        fail(error);
      }
    }
  });
}

async function messageDataToText(data) {
  if (typeof data === "string") {
    return data;
  }
  if (Buffer.isBuffer(data)) {
    return data.toString("utf8");
  }
  if (data instanceof ArrayBuffer) {
    return Buffer.from(data).toString("utf8");
  }
  if (ArrayBuffer.isView(data)) {
    return Buffer.from(data.buffer, data.byteOffset, data.byteLength).toString("utf8");
  }
  if (data?.text) {
    return await data.text();
  }
  return String(data);
}

function openAiEventErrorMessage(event) {
  return event.error?.message || event.message || "Realtime translation failed.";
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
