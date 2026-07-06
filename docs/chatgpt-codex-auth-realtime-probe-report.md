# ChatGPT/Codex Auth Realtime Probe Report

Date: 2026-06-07
Last verified: 2026-06-13

## Summary

ChatGPT/Codex OAuth credentials from `~/.codex/auth.json` should not be treated as production OpenAI Realtime credentials for Chuchotage.

The token can still create short-lived Realtime client secrets through OpenAI's REST endpoints, but those secrets fail when used to open Realtime WebSocket streams. Personal OpenAI API keys and API-key-created client secrets still work for Realtime Translation. A fresh 2026-06-13 probe reproduced the same ChatGPT/Codex auth failure and the same API-key control success.

## Why This Matters

Chuchotage needs the full streaming path:

```text
saved credential -> Realtime Translation session -> translated audio/transcript events
```

The ChatGPT/Codex path currently reaches only the middle step. It can mint an `ek_...` client secret, but the Realtime WebSocket upgrade fails before any stream events arrive.

## Official API Shape

OpenAI's Realtime Translation guide says translation sessions use the dedicated `/v1/realtime/translations` endpoint with `gpt-realtime-translate`, append continuous 24 kHz PCM16 source audio, and receive translated audio plus transcript deltas. It also documents `session.close` as the correct way to flush pending translated output before closing a WebSocket session.

Source: `https://developers.openai.com/api/docs/guides/realtime-translation`

## Local Probe Results

The probes were run with redacted local scripts under ignored `tmp/` files. They did not print API keys, ChatGPT tokens, OAuth tokens, refresh tokens, or returned client secret values.

### 2026-06-13 Recheck

The `auth.json` ChatGPT/Codex path still failed end to end:

- `POST /v1/realtime/translations/client_secrets`: `200`
- returned client secret session: `type=translation`, `model=gpt-realtime-translate`
- WebSocket upgrade to `/v1/realtime/translations?model=gpt-realtime-translate` with that secret: `HTTP/1.1 500 Internal Server Error`

The API-key-created Realtime Translation client secret control still worked:

- `POST /v1/realtime/translations/client_secrets`: `200`
- WebSocket opened successfully
- received `session.output_audio.delta`, `session.input_transcript.delta`, `session.output_transcript.delta`, and `session.closed`
- produced translated audio and transcript from the synthetic probe input

### Auth Token Shape

The local `~/.codex/auth.json` access token had:

- issuer: `auth.openai.com`
- audience: `https://api.openai.com/v1`
- scopes: `openid`, `profile`, `email`, `offline_access`, `api.connectors.read`, `api.connectors.invoke`

Those scopes do not look like a general OpenAI API grant. They look connector/Codex-specific.

### Realtime Translation Streaming

`auth.json` ChatGPT/Codex token:

- `POST /v1/realtime/translations/client_secrets`: `200`
- returned client secret session: `type=translation`, `model=gpt-realtime-translate`
- WebSocket upgrade to `/v1/realtime/translations?model=gpt-realtime-translate` with that secret: `HTTP/1.1 500 Internal Server Error`
- direct WebSocket upgrade with the raw `auth.json` access token: `HTTP/1.1 500 Internal Server Error`

Personal OpenAI API key:

- direct WebSocket to `/v1/realtime/translations?model=gpt-realtime-translate`: works
- returned `session.output_audio.delta`, `session.output_transcript.delta`, `session.input_transcript.delta`, and `session.closed`
- produced translated audio and Spanish transcript from the synthetic probe input

API-key-created Realtime Translation client secret:

- `POST /v1/realtime/translations/client_secrets`: `200`
- WebSocket with returned `ek_...` secret: works
- returned translated audio and transcript events

### Regular Realtime

`auth.json` ChatGPT/Codex token:

- `POST /v1/realtime/client_secrets` with `gpt-realtime`: `200`
- `POST /v1/realtime/client_secrets` with `gpt-realtime-2`: `200`
- WebSocket upgrade to `/v1/realtime?model=gpt-realtime` with returned secret: `HTTP/1.1 500 Internal Server Error`
- WebSocket upgrade to `/v1/realtime?model=gpt-realtime-2` with returned secret: `HTTP/1.1 500 Internal Server Error`
- direct WebSocket upgrade with the raw `auth.json` access token: `HTTP/1.1 500 Internal Server Error`

### Other API Endpoints

The same `auth.json` token did not work as a normal OpenAI API key:

- `GET /v1/models`: `403`, missing `api.model.read`
- `GET /v1/models/gpt-realtime-translate`: `403`, missing `api.model.read`
- `POST /v1/responses`: `401`
- `POST /v1/responses/input_tokens`: `401`
- `GET /v1/files`: `401`
- `GET /v1/assistants`: `401`
- `GET /v1/vector_stores`: `401`
- `GET /v1/batches`: `401`
- `GET /v1/fine_tuning/jobs`: `401`
- additional ChatKit, skills, threads, conversations, containers, uploads, audio voices, and video list probes did not return usable data

## Interpretation

The most likely explanation is that Chuchotage had been relying on an undocumented auth gap:

1. The Codex/ChatGPT OAuth client and token scopes were intended for Codex or connector flows, not arbitrary third-party OpenAI API use.
2. The Realtime client-secret REST endpoints still accept the token and mint `ek_...` secrets.
3. The Realtime WebSocket gateway now refuses those auth-json-derived tokens/secrets, returning a server-side `500` instead of a clean policy error.

It may be a temporary OpenAI regression, but it is not a safe product dependency.

## Product Guidance

Treat ChatGPT/Codex auth as experimental or unavailable for production Chuchotage Realtime streaming until a fresh end-to-end health check proves otherwise.

Production-supported credential paths should be:

- personal OpenAI API key for backend-free use
- sponsored-trial/server-minted client secrets backed by a server-held OpenAI API key

Do not present ChatGPT/Codex sign-in as a dependable public auth path unless OpenAI confirms this use is supported and the full probe passes:

```text
mint translation client secret -> open translation WebSocket -> send audio -> receive output audio/transcript -> session.close -> session.closed
```

## Useful Probe Artifacts

Ignored local scripts and outputs from the investigation:

- `tmp/openai-realtime-stream-probe.mjs`
- `tmp/openai-auth-endpoint-probe.mjs`
- `tmp/openai-auth-endpoint-probe-results.json`
- `tmp/openai-realtime-probe/`

These artifacts are intentionally ignored and should not be committed because they may include local-only diagnostic outputs, generated audio, or paths tied to the operator machine.
