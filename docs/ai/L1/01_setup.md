# Setup

## Run locally

```bash
pnpm install
cp env.example .env.local
pnpm dev
```

Next binds to `localhost` and selects another port when 3000 is already occupied on that host.

## Required configuration

- `AGORA_APP_ID` (initial/fallback project)
- `AGORA_APP_CERTIFICATE` (signs v3 requests)
- Optional: `AGORA_CUSTOMER_ID` and `AGORA_CUSTOMER_SECRET` enable the project picker

`AGORA_AGENTS_V3_BASE_URL` is optional and read directly by the SDK (default `https://preview.ai.agora.io`); it must be a bare origin. `AGORA_STUDIO_API_BASE` (default `https://api.agora.io`) is only used for the console `/dev/v1/projects` API.

## Authentication

Development defaults to `AUTH_MODE=bypass`. Production requires `SESSION_JWT_SECRET` and the `AGORA_SSO_*` values in `env.example`.

No Redis, public webhook URL, RTC token, direct PSTN, or inline provider-secret environment variables are used. Project creation enables an App Certificate, but that value is consumed only in the server route and is never returned to the browser or stored in client state.
