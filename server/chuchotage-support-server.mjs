import { execFile } from "node:child_process";
import http from "node:http";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";

const openAiUserAgent = "Chuchotage/0.1.0 (Server; chuchotage.ai; +https://www.chuchotage.ai)";
const execFileAsync = promisify(execFile);

const supportedOutputLanguages = new Set([
  "es",
  "pt",
  "fr",
  "ja",
  "ru",
  "zh",
  "de",
  "ko",
  "hi",
  "id",
  "vi",
  "it",
  "en",
]);

const countryLanguage = new Map([
  ["IT", "it"],
  ["SM", "it"],
  ["VA", "it"],
  ["ES", "es"],
  ["MX", "es"],
  ["AR", "es"],
  ["CL", "es"],
  ["CO", "es"],
  ["PE", "es"],
  ["VE", "es"],
  ["UY", "es"],
  ["PY", "es"],
  ["BO", "es"],
  ["EC", "es"],
  ["CR", "es"],
  ["CU", "es"],
  ["DO", "es"],
  ["GT", "es"],
  ["HN", "es"],
  ["NI", "es"],
  ["PA", "es"],
  ["PR", "es"],
  ["SV", "es"],
  ["PT", "pt"],
  ["BR", "pt"],
  ["AO", "pt"],
  ["MZ", "pt"],
  ["FR", "fr"],
  ["MC", "fr"],
  ["JP", "ja"],
  ["RU", "ru"],
  ["CN", "zh"],
  ["HK", "zh"],
  ["MO", "zh"],
  ["TW", "zh"],
  ["DE", "de"],
  ["AT", "de"],
  ["LI", "de"],
  ["KR", "ko"],
  ["IN", "hi"],
  ["ID", "id"],
  ["VN", "vi"],
  ["US", "en"],
  ["GB", "en"],
  ["IE", "en"],
  ["AU", "en"],
  ["NZ", "en"],
  ["CA", "en"],
]);

export function configFromEnv(env = process.env) {
  return {
    port: Number.parseInt(env.PORT || "8787", 10),
    host: env.HOST || "127.0.0.1",
    openAiApiKey: env.OPENAI_API_KEY,
    openAiClientSecretUrl:
      env.OPENAI_TRANSLATION_CLIENT_SECRET_URL ||
      "https://api.openai.com/v1/realtime/translations/client_secrets",
    allowedOrigins: (env.ALLOWED_ORIGINS || "https://www.chuchotage.ai,https://chuchotage.ai")
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
    maxBodyBytes: Number.parseInt(env.MAX_BODY_BYTES || "8192", 10),
    trialRateLimitWindowMs: Number.parseInt(env.TRIAL_RATE_LIMIT_WINDOW_MS || "3600000", 10),
    trialIpRateLimitCount: Number.parseInt(env.TRIAL_IP_RATE_LIMIT_COUNT || "8", 10),
    trialInstallRateLimitCount: Number.parseInt(env.TRIAL_INSTALL_RATE_LIMIT_COUNT || "6", 10),
    geoIpLookupCommand: env.GEOIP_LOOKUP_COMMAND || "geoiplookup",
    geoIpLookupTimeoutMs: Number.parseInt(env.GEOIP_LOOKUP_TIMEOUT_MS || "900", 10),
    geoCountryCodeResolver: null,
    fetchImpl: globalThis.fetch,
  };
}

export function sanitizeOutputLanguageCode(value) {
  const code = String(value || "").trim().toLowerCase();
  return supportedOutputLanguages.has(code) ? code : "en";
}

export function languageForCountryCode(value) {
  return countryLanguage.get(String(value || "").trim().toUpperCase()) || "";
}

export function parseGeoIpLookupCountryCode(output) {
  const match = String(output || "").match(/:\s*([A-Z]{2}),/);
  return match?.[1] || "";
}

export function createChuchotageServer(config = configFromEnv()) {
  const trialIpRateBuckets = new Map();
  const trialInstallRateBuckets = new Map();

  function jsonResponse(res, status, body) {
    res.writeHead(status, {
      "Cache-Control": "no-store",
      "Content-Type": "application/json; charset=utf-8",
    });
    res.end(JSON.stringify(body));
  }

  function getClientIp(req) {
    const forwardedFor = req.headers["x-forwarded-for"];
    const value = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;
    return value?.split(",")[0]?.trim() || req.socket.remoteAddress || "unknown";
  }

  function normalizeIp(value) {
    const ip = String(value || "").trim();
    if (ip.startsWith("::ffff:")) {
      return ip.slice(7);
    }
    return ip;
  }

  function getHeaderCountryCode(req) {
    const headerNames = ["cf-ipcountry", "x-geo-country", "x-country-code", "x-vercel-ip-country"];
    for (const name of headerNames) {
      const rawValue = req.headers[name];
      const value = Array.isArray(rawValue) ? rawValue[0] : rawValue;
      const countryCode = String(value || "").trim().toUpperCase();
      if (/^[A-Z]{2}$/.test(countryCode) && countryCode !== "XX") {
        return countryCode;
      }
    }
    return "";
  }

  async function lookupCountryCodeForIp(ip) {
    if (typeof config.geoCountryCodeResolver === "function") {
      return String(await config.geoCountryCodeResolver(ip)).trim().toUpperCase();
    }

    if (!config.geoIpLookupCommand || ip === "unknown") {
      return "";
    }

    try {
      const result = await execFileAsync(config.geoIpLookupCommand, [ip], {
        timeout: config.geoIpLookupTimeoutMs,
        windowsHide: true,
      });
      return parseGeoIpLookupCountryCode(result.stdout);
    } catch {
      return "";
    }
  }

  function isRateLimited(buckets, key, windowMs, count) {
    const now = Date.now();
    const bucket = buckets.get(key) || [];
    const recent = bucket.filter((timestamp) => now - timestamp < windowMs);
    recent.push(now);
    buckets.set(key, recent);
    return recent.length > count;
  }

  function readRequestBody(req) {
    return new Promise((resolve, reject) => {
      let size = 0;
      let data = "";

      req.setEncoding("utf8");
      req.on("data", (chunk) => {
        size += Buffer.byteLength(chunk);
        if (size > config.maxBodyBytes) {
          reject(new Error("body_too_large"));
          req.destroy();
          return;
        }
        data += chunk;
      });
      req.on("end", () => resolve(data));
      req.on("error", reject);
    });
  }

  function isValidInstallId(value) {
    return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(
      String(value || "").trim(),
    );
  }

  async function parseJsonPayload(req, res) {
    try {
      return JSON.parse(await readRequestBody(req));
    } catch (error) {
      jsonResponse(res, 400, {
        ok: false,
        error: error.message === "body_too_large" ? "body_too_large" : "invalid_json",
      });
      return null;
    }
  }

  async function createTrialClientSecret(targetLanguageCode, sourceTranscriptEnabled = false) {
    const inputAudio = {
      noise_reduction: null,
    };
    if (sourceTranscriptEnabled) {
      inputAudio.transcription = {
        model: "gpt-realtime-whisper",
      };
    }

    const response = await config.fetchImpl(config.openAiClientSecretUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.openAiApiKey}`,
        "Content-Type": "application/json",
        "User-Agent": openAiUserAgent,
      },
      body: JSON.stringify({
        expires_after: {
          anchor: "created_at",
          seconds: 600,
        },
        session: {
          model: "gpt-realtime-translate",
          audio: {
            input: inputAudio,
            output: {
              language: sanitizeOutputLanguageCode(targetLanguageCode),
            },
          },
        },
      }),
    });

    const responseText = await response.text();
    let payload = null;
    try {
      payload = JSON.parse(responseText);
    } catch {
      payload = null;
    }

    if (!response.ok) {
      const message =
        payload?.error?.message ||
        payload?.error ||
        responseText ||
        "OpenAI client secret request failed.";
      throw new Error(`openai_${response.status}:${String(message).slice(0, 300)}`);
    }

    const value = payload?.value;
    if (!value) {
      throw new Error("openai_missing_client_secret");
    }
    return value;
  }

  async function handleTrialClientSecret(req, res) {
    if (req.method !== "POST") {
      jsonResponse(res, 405, { ok: false, error: "method_not_allowed" });
      return;
    }

    if (!config.openAiApiKey) {
      console.error("Missing OPENAI_API_KEY");
      jsonResponse(res, 503, {
        ok: false,
        error: "service_unavailable",
        message: "Sponsored trial is not available right now.",
      });
      return;
    }

    const payload = await parseJsonPayload(req, res);
    if (!payload) return;

    const installId = String(payload.installation_id || "").trim();
    if (!isValidInstallId(installId)) {
      jsonResponse(res, 400, { ok: false, error: "invalid_installation_id" });
      return;
    }

    const ip = getClientIp(req);
    const ipLimited = isRateLimited(
      trialIpRateBuckets,
      ip,
      config.trialRateLimitWindowMs,
      config.trialIpRateLimitCount,
    );
    const installLimited = isRateLimited(
      trialInstallRateBuckets,
      installId,
      config.trialRateLimitWindowMs,
      config.trialInstallRateLimitCount,
    );
    if (ipLimited || installLimited) {
      jsonResponse(res, 429, {
        ok: false,
        error: "rate_limited",
        message: "Sponsored trial limit reached. Sign in with ChatGPT or use an API key to continue.",
      });
      return;
    }

    try {
      const value = await createTrialClientSecret(
        payload.target_language,
        payload.source_transcript_enabled === true,
      );
      jsonResponse(res, 200, { ok: true, value });
    } catch (error) {
      console.error("Sponsored trial client secret failed", error.message);
      jsonResponse(res, 502, {
        ok: false,
        error: "client_secret_failed",
        message: "Could not start sponsored trial. Sign in with ChatGPT or use an API key to continue.",
      });
    }
  }

  async function handleGeoLanguage(req, res) {
    if (req.method !== "GET") {
      jsonResponse(res, 405, { ok: false, error: "method_not_allowed" });
      return;
    }

    const headerCountryCode = getHeaderCountryCode(req);
    const countryCode = headerCountryCode || (await lookupCountryCodeForIp(normalizeIp(getClientIp(req))));
    const language = languageForCountryCode(countryCode);

    jsonResponse(res, 200, {
      ok: true,
      country_code: countryCode,
      language,
    });
  }

  return http.createServer(async (req, res) => {
    const url = new URL(req.url || "/", "http://localhost");

    if (req.method === "GET" && url.pathname === "/healthz") {
      jsonResponse(res, 200, { ok: true });
      return;
    }

    const origin = req.headers.origin;
    if (origin && !config.allowedOrigins.includes(origin)) {
      jsonResponse(res, 403, { ok: false, error: "origin_not_allowed" });
      return;
    }

    if (url.pathname === "/api/geo-language") {
      await handleGeoLanguage(req, res);
      return;
    }

    if (url.pathname === "/api/trial/realtime-translation-client-secret") {
      await handleTrialClientSecret(req, res);
      return;
    }

    jsonResponse(res, 404, { ok: false, error: "not_found" });
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const config = configFromEnv();
  const server = createChuchotageServer(config);
  server.listen(config.port, config.host, () => {
    console.log(`Chuchotage server listening on ${config.host}:${config.port}`);
  });
}
