import { readFile, rename, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { sanitizeOutputLanguageCode } from "./languages.mjs";

const AUTH_ISSUER = "https://auth.openai.com";
const CODEX_CLIENT_ID = "app_EMoamEEZ73f0CkXaXp7hrann";
const CLIENT_SECRET_URL = "https://api.openai.com/v1/realtime/translations/client_secrets";
const CLIENT_SECRET_TTL_SECONDS = 600;
const TOKEN_REFRESH_SKEW_SECONDS = 60;

export async function resolveTranslationCredential({
  authMode = "auto",
  targetLanguageCode,
  sourceTranscriptEnabled = true,
} = {}) {
  const mode = String(authMode ?? "auto").toLowerCase();
  if (!["auto", "api-key", "codex"].includes(mode)) {
    throw new Error("Auth mode must be auto, api-key, or codex.");
  }

  if ((mode === "auto" || mode === "api-key") && process.env.OPENAI_API_KEY?.trim()) {
    return {
      value: process.env.OPENAI_API_KEY.trim(),
      shouldSendSessionUpdate: true,
      source: "OPENAI_API_KEY",
    };
  }

  if (mode === "api-key") {
    throw new Error("OPENAI_API_KEY is not set.");
  }

  const authPath = codexAuthPath();
  if (!existsSync(authPath)) {
    if (mode === "auto") {
      throw new Error("No OPENAI_API_KEY and no Codex auth file found at ~/.codex/auth.json.");
    }
    throw new Error("Codex auth file was not found at ~/.codex/auth.json.");
  }

  const auth = await readCodexAuth(authPath);
  const codexApiKey = firstNonBlank(auth.OPENAI_API_KEY, auth.openai_api_key, auth.openaiApiKey);
  if (codexApiKey) {
    return {
      value: codexApiKey,
      shouldSendSessionUpdate: true,
      source: "Codex API key",
    };
  }

  let accessToken = auth.tokens?.access_token?.trim();
  if (!accessToken) {
    throw new Error("Codex auth.json does not contain an access token or API key.");
  }

  if (jwtIsExpiring(accessToken)) {
    accessToken = await refreshCodexAccessToken(authPath, auth);
  }

  const clientSecret = await createTranslationClientSecret({
    accessToken,
    targetLanguageCode,
    sourceTranscriptEnabled,
  });

  return {
    value: clientSecret,
    shouldSendSessionUpdate: false,
    source: "Codex ChatGPT sign-in",
  };
}

export function buildSessionUpdateEvent({ targetLanguageCode, sourceTranscriptEnabled = true } = {}) {
  return JSON.stringify({
    type: "session.update",
    session: sessionObject({
      targetLanguageCode,
      sourceTranscriptEnabled,
      includeModel: false,
    }),
  });
}

export function clientSecretRequestBody({ targetLanguageCode, sourceTranscriptEnabled = true } = {}) {
  return {
    expires_after: {
      anchor: "created_at",
      seconds: CLIENT_SECRET_TTL_SECONDS,
    },
    session: sessionObject({
      targetLanguageCode,
      sourceTranscriptEnabled,
      includeModel: true,
    }),
  };
}

function sessionObject({ targetLanguageCode, sourceTranscriptEnabled, includeModel }) {
  const session = {
    audio: {
      input: {
        noise_reduction: null,
      },
      output: {
        language: sanitizeOutputLanguageCode(targetLanguageCode),
      },
    },
  };

  if (sourceTranscriptEnabled) {
    session.audio.input.transcription = {
      model: "gpt-realtime-whisper",
    };
  }

  if (includeModel) {
    session.model = "gpt-realtime-translate";
  }

  return session;
}

async function createTranslationClientSecret({ accessToken, targetLanguageCode, sourceTranscriptEnabled }) {
  const response = await fetch(CLIENT_SECRET_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(clientSecretRequestBody({ targetLanguageCode, sourceTranscriptEnabled })),
  });
  const text = await response.text();

  if (!response.ok) {
    throw new Error(errorMessageFromOpenAi(text, "Failed to create a Realtime Translation client secret."));
  }

  const payload = JSON.parse(text);
  if (typeof payload.value === "string" && payload.value.trim()) {
    return payload.value.trim();
  }

  throw new Error("OpenAI did not return a Realtime Translation client secret.");
}

async function refreshCodexAccessToken(authPath, auth) {
  const refreshToken = auth.tokens?.refresh_token?.trim();
  if (!refreshToken) {
    throw new Error("Codex auth.json access token is expiring and no refresh token is available.");
  }

  const response = await fetch(`${AUTH_ISSUER}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: CODEX_CLIENT_ID,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    throw new Error("Codex token refresh failed. Sign in with Codex again and retry.");
  }

  const payload = await response.json();
  auth.tokens ??= {};
  auth.tokens.id_token = firstNonBlank(payload.id_token, auth.tokens.id_token);
  auth.tokens.access_token = firstNonBlank(payload.access_token, auth.tokens.access_token);
  auth.tokens.refresh_token = firstNonBlank(payload.refresh_token, auth.tokens.refresh_token);
  auth.last_refresh = new Date().toISOString();

  await writeCodexAuth(authPath, auth);

  const accessToken = auth.tokens.access_token?.trim();
  if (!accessToken) {
    throw new Error("Codex token refresh did not return an access token.");
  }
  return accessToken;
}

async function readCodexAuth(authPath) {
  const text = await readFile(authPath, "utf8");
  return JSON.parse(text);
}

async function writeCodexAuth(authPath, auth) {
  const tempPath = `${authPath}.tmp`;
  await writeFile(tempPath, `${JSON.stringify(auth, null, 2)}\n`, { mode: 0o600 });
  await rename(tempPath, authPath);
}

function jwtIsExpiring(token) {
  const exp = jwtExpiration(token);
  if (!exp) {
    return false;
  }
  const now = Math.floor(Date.now() / 1000);
  return exp <= now + TOKEN_REFRESH_SKEW_SECONDS;
}

function jwtExpiration(token) {
  const [, payload] = token.split(".");
  if (!payload) {
    return null;
  }

  try {
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(payload.length / 4) * 4, "=");
    const json = JSON.parse(Buffer.from(normalized, "base64").toString("utf8"));
    return Number.isFinite(json.exp) ? json.exp : null;
  } catch {
    return null;
  }
}

function errorMessageFromOpenAi(text, fallback) {
  try {
    const payload = JSON.parse(text);
    if (typeof payload.error === "string" && payload.error.trim()) {
      return payload.error.trim();
    }
    if (typeof payload.error?.message === "string" && payload.error.message.trim()) {
      return payload.error.message.trim();
    }
  } catch {
    // Keep the fallback below.
  }

  return text.trim() || fallback;
}

function firstNonBlank(...values) {
  return values.find((value) => typeof value === "string" && value.trim())?.trim();
}

function codexAuthPath() {
  const home = process.env.HOME || dirname(dirname(dirname(fileURLToPath(import.meta.url))));
  return join(home, ".codex", "auth.json");
}
