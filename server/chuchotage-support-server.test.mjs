import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createChuchotageServer,
  languageForCountryCode,
  parseGeoIpLookupCountryCode,
  sanitizeOutputLanguageCode,
} from "./chuchotage-support-server.mjs";

function testConfig(overrides = {}) {
  return {
    host: "127.0.0.1",
    port: 0,
    openAiApiKey: "sk-test",
    openAiClientSecretUrl: "https://api.openai.test/v1/realtime/translations/client_secrets",
    allowedOrigins: ["https://www.chuchotage.ai", "https://chuchotage.ai"],
    maxBodyBytes: 8192,
    trialRateLimitWindowMs: 3600000,
    trialIpRateLimitCount: 8,
    trialInstallRateLimitCount: 6,
    geoIpLookupCommand: "",
    geoIpLookupTimeoutMs: 900,
    geoCountryCodeResolver: null,
    fetchImpl: async () =>
      new Response(JSON.stringify({ value: "trial-client-secret" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    ...overrides,
  };
}

async function listen(server) {
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  return `http://127.0.0.1:${server.address().port}`;
}

async function close(server) {
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}

test("sanitizeOutputLanguageCode allows supported languages only", () => {
  assert.equal(sanitizeOutputLanguageCode("ja"), "ja");
  assert.equal(sanitizeOutputLanguageCode("xx"), "en");
});

test("languageForCountryCode maps country codes to supported website languages", () => {
  assert.equal(languageForCountryCode("IT"), "it");
  assert.equal(languageForCountryCode("mx"), "es");
  assert.equal(languageForCountryCode("JP"), "ja");
  assert.equal(languageForCountryCode("RU"), "ru");
  assert.equal(languageForCountryCode("CN"), "zh");
  assert.equal(languageForCountryCode("KR"), "ko");
  assert.equal(languageForCountryCode("IN"), "hi");
  assert.equal(languageForCountryCode("ID"), "id");
  assert.equal(languageForCountryCode("VN"), "vi");
  assert.equal(languageForCountryCode("ZZ"), "");
});

test("parseGeoIpLookupCountryCode extracts geoiplookup country output", () => {
  assert.equal(parseGeoIpLookupCountryCode("GeoIP Country Edition: IT, Italy"), "IT");
  assert.equal(parseGeoIpLookupCountryCode("GeoIP Country Edition: IP Address not found"), "");
});

test("geo language endpoint uses trusted country headers", async () => {
  const server = createChuchotageServer(testConfig());
  const baseUrl = await listen(server);

  try {
    const response = await fetch(`${baseUrl}/api/geo-language`, {
      headers: {
        "CF-IPCountry": "IT",
      },
    });
    const payload = await response.json();

    assert.equal(response.status, 200);
    assert.equal(payload.country_code, "IT");
    assert.equal(payload.language, "it");
  } finally {
    await close(server);
  }
});

test("geo language endpoint can resolve the forwarded client IP", async () => {
  const seenIps = [];
  const server = createChuchotageServer(
    testConfig({
      geoCountryCodeResolver: async (ip) => {
        seenIps.push(ip);
        return "MX";
      },
    }),
  );
  const baseUrl = await listen(server);

  try {
    const response = await fetch(`${baseUrl}/api/geo-language`, {
      headers: {
        "X-Forwarded-For": "203.0.113.10, 127.0.0.1",
      },
    });
    const payload = await response.json();

    assert.equal(response.status, 200);
    assert.deepEqual(seenIps, ["203.0.113.10"]);
    assert.equal(payload.country_code, "MX");
    assert.equal(payload.language, "es");
  } finally {
    await close(server);
  }
});

test("removed /api/beta endpoint stays unavailable", async () => {
  const server = createChuchotageServer(testConfig());
  const baseUrl = await listen(server);

  try {
    const response = await fetch(`${baseUrl}/api/beta`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "person@example.com",
      }),
    });
    const payload = await response.json();

    assert.equal(response.status, 404);
    assert.equal(payload.error, "not_found");
  } finally {
    await close(server);
  }
});

test("trial endpoint creates a Realtime Translation client secret", async () => {
  const calls = [];
  const server = createChuchotageServer(
    testConfig({
      fetchImpl: async (url, options) => {
        calls.push({ url, options });
        return new Response(JSON.stringify({ value: "trial-client-secret" }), { status: 200 });
      },
    }),
  );
  const baseUrl = await listen(server);

  try {
    const response = await fetch(`${baseUrl}/api/trial/realtime-translation-client-secret`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        installation_id: "123e4567-e89b-12d3-a456-426614174000",
        target_language: "ja",
      }),
    });
    const payload = await response.json();
    const openAiBody = JSON.parse(calls[0].options.body);

    assert.equal(response.status, 200);
    assert.equal(payload.value, "trial-client-secret");
    assert.equal(calls[0].url, "https://api.openai.test/v1/realtime/translations/client_secrets");
    assert.equal(calls[0].options.headers.Authorization, "Bearer sk-test");
    assert.equal(
      calls[0].options.headers["User-Agent"],
      "Chuchotage/0.1.0 (Server; chuchotage.ai; +https://www.chuchotage.ai)",
    );
    assert.equal(openAiBody.session.audio.output.language, "ja");
    assert.equal(openAiBody.session.audio.input.transcription, undefined);
  } finally {
    await close(server);
  }
});

test("trial endpoint can include source-language transcription", async () => {
  const calls = [];
  const server = createChuchotageServer(
    testConfig({
      fetchImpl: async (url, options) => {
        calls.push({ url, options });
        return new Response(JSON.stringify({ value: "trial-client-secret" }), { status: 200 });
      },
    }),
  );
  const baseUrl = await listen(server);

  try {
    const response = await fetch(`${baseUrl}/api/trial/realtime-translation-client-secret`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        installation_id: "123e4567-e89b-12d3-a456-426614174000",
        target_language: "ja",
        source_transcript_enabled: true,
      }),
    });
    const openAiBody = JSON.parse(calls[0].options.body);

    assert.equal(response.status, 200);
    assert.equal(openAiBody.session.audio.input.transcription.model, "gpt-realtime-whisper");
  } finally {
    await close(server);
  }
});

test("trial endpoint rate-limits installation ids", async () => {
  const server = createChuchotageServer(
    testConfig({
      trialInstallRateLimitCount: 1,
    }),
  );
  const baseUrl = await listen(server);
  const body = JSON.stringify({
    installation_id: "123e4567-e89b-12d3-a456-426614174000",
    target_language: "ja",
  });

  try {
    const first = await fetch(`${baseUrl}/api/trial/realtime-translation-client-secret`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });
    const second = await fetch(`${baseUrl}/api/trial/realtime-translation-client-secret`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });
    const payload = await second.json();

    assert.equal(first.status, 200);
    assert.equal(second.status, 429);
    assert.equal(payload.error, "rate_limited");
  } finally {
    await close(server);
  }
});

test("trial endpoint stays unavailable without a server OpenAI key", async () => {
  const server = createChuchotageServer(
    testConfig({
      openAiApiKey: "",
    }),
  );
  const baseUrl = await listen(server);
  const originalConsoleError = console.error;
  const consoleErrors = [];
  console.error = (...args) => {
    consoleErrors.push(args.join(" "));
  };

  try {
    const response = await fetch(`${baseUrl}/api/trial/realtime-translation-client-secret`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        installation_id: "123e4567-e89b-12d3-a456-426614174000",
        target_language: "ja",
      }),
    });
    const payload = await response.json();

    assert.equal(response.status, 503);
    assert.equal(payload.error, "service_unavailable");
    assert.deepEqual(consoleErrors, ["Missing OPENAI_API_KEY"]);
  } finally {
    console.error = originalConsoleError;
    await close(server);
  }
});
