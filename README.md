# Agora Conversational AI Platform quickstart — Next.js

A standalone Next.js application for managing Agora Conversational AI v3
(preview) resources and testing outbound voice agents. The server uses the
[`agora-agents`](https://www.npmjs.com/package/agora-agents) SDK
`3.0.0-alpha.4` low-level v3 client.

> **Preview:** the Conversational AI Platform (v3) API and
> `agora-agents@3.0.0-alpha.4` are pre-release.

Documentation: [Conversational AI Platform documentation](https://docs.agora.io/en/ai/platform).

The application uses Next.js 16 App Router, React 19, TypeScript, and Tailwind
CSS. Client components provide the Studio workflow, while Node.js route
handlers own authentication, v3 API access through the SDK, and outbound
calling.

The demo supports:

- Creating, updating, and deleting stored v3 agents.
- Managing secret sets (write-only provider keys) and SIP-trunk numbers.
- Placing one-off outbound test calls as v3 telephony sessions.
- Creating, pausing, resuming, and canceling campaigns.
- Polling session state and viewing session history and post-call `analysis`.
- Local authentication bypass and production-ready Agora SSO sessions.

The Agora v3 API is the application data store. The browser holds only unsaved
UI state; it does not persist agents, secrets, sessions, or campaigns locally.
v3 replaces v2 call transcripts and OpenAI summaries with session `analysis`
(agent `variables` with `extract: true`).

## Architecture

```text
Browser
  │
  ▼
Next.js 16 App Router
  ├─ React client components
  ├─ Server route handlers
  │    ├─► agora-agents SDK (v3)   agents, secrets, numbers, sessions, campaigns
  │    ├─► Agora console API       /dev/v1/projects (project list/create)
  │    └─► Agora SSO               optional production authentication
  └─ OAuth root callback proxy
```

Agora customer credentials and SSO secrets remain on the server. Provider keys
entered in the UI pass through the authenticated server to v3 secret sets,
which are write-only; this app never persists or reads them back.

## Requirements

- Node.js 20 or newer.
- pnpm 11.
- An Agora App ID.
- The App Certificate for that project. The [Agora CLI](https://github.com/AgoraIO/cli)
  fills both into `.env` (after the copy step below):
  `agora project env write .env --template standard --project <name>`.
- Optional: an Agora Customer ID and Customer Secret, which enable the in-app
  project picker (list, create, and switch projects).

## Quick start

Install the locked dependencies:

```bash
pnpm install --frozen-lockfile
```

Create the local environment file:

```bash
cp env.example .env.local
```

Set the required values:

```dotenv
APP_ENV=development
AUTH_MODE=bypass

AGORA_APP_ID=
AGORA_APP_CERTIFICATE=

# Optional: enables the project picker.
AGORA_CUSTOMER_ID=
AGORA_CUSTOMER_SECRET=
```

Start the development server:

```bash
pnpm dev
```

The launcher prints the selected frontend URL. It prefers
`http://localhost:3000` and selects the next available port in bypass mode.
Open the URL printed in the terminal.

## Package scripts

| Command | Behavior |
| --- | --- |
| `pnpm dev` | Runs the custom port-aware launcher and starts Next.js |
| `pnpm build` | Creates an optimized production build and runs TypeScript checks |
| `pnpm start` | Serves the production build |
| `pnpm lint` | Runs ESLint across the project |
| `pnpm test` | Runs the Node contract tests |

## Development ports

Set a preferred starting port with:

```bash
FRONTEND_PORT=3001 pnpm dev
```

In SSO mode, the frontend must use the exact port registered in
`AGORA_SSO_REDIRECT_URI`. The launcher fails clearly if that port is occupied
instead of selecting an invalid OAuth callback URL.

## Verify a local run

Check the API using the selected frontend origin:

```bash
curl http://localhost:3000/api/health
```

Expected response:

```json
{"status":"ok"}
```

If the launcher selected another port, use that port in the command.

Then use the browser UI to:

1. Select an Agora project, or create one for a customer.
2. Load, create, or duplicate a v3 agent. Duplicate fetches the source
   configuration and opens it as an unsaved create form.
3. Store provider keys in a secret set.
4. Add or select a phone number.
5. Place an outbound test call.
6. Verify session status, analysis, history, and campaign workflows.

## Configuration

Copy `env.example` to `.env.local`. The template contains the normal
application settings; the table below also lists optional launcher and
production-server overrides.

| Variable | Required | Purpose |
| --- | --- | --- |
| `APP_ENV` | No | `development` or `production`; defaults according to `NODE_ENV` |
| `AUTH_MODE` | No | `bypass` or `sso`; defaults according to the environment |
| `APP_PUBLIC_URL` | No | Browser-visible origin used for authentication redirects |
| `ALLOW_BYPASS_IN_PRODUCTION` | No | Explicitly permits production bypass when set to `true` |
| `AGORA_APP_ID` | Yes | Initial/fallback Agora project before a server-signed project selection is stored |
| `AGORA_APP_CERTIFICATE` | Yes | App Certificate for `AGORA_APP_ID`; the SDK signs every v3 request with a ConvoAI token generated from it |
| `AGORA_CUSTOMER_ID` | No | Console API Basic-auth username; enables the project picker |
| `AGORA_CUSTOMER_SECRET` | No | Console API Basic-auth password; enables the project picker |
| `AGORA_AGENTS_V3_BASE_URL` | No | v3 API origin read by the SDK; defaults to `https://preview.ai.agora.io` |
| `AGORA_STUDIO_API_BASE` | No | Console projects API origin; defaults to `https://api.agora.io` |
| `AGORA_STUDIO_DEBUG` | No | Enables additional console-API request logging |
| `SESSION_JWT_SECRET` | SSO only | Signs the local session cookie; minimum 32 characters |
| `AGORA_SSO_CLIENT_ID` | SSO only | Agora OAuth client identifier |
| `AGORA_SSO_CLIENT_SECRET` | SSO only | Agora OAuth client secret |
| `AGORA_SSO_REDIRECT_URI` | SSO only | Registered OAuth callback URL |
| `AGORA_SSO_BASE_URL` | No | Agora SSO origin |
| `AGORA_SSO_OPEN_API_BASE` | No | Agora customer-profile API base |
| `FRONTEND_PORT` | No | Preferred development port |
| `PORT` | No | Port used by `pnpm start` |

Do not prefix server secrets with `NEXT_PUBLIC_`. Any variable using that prefix
can be included in the browser bundle.

## Authentication

### Local bypass

Local development defaults to:

```dotenv
APP_ENV=development
AUTH_MODE=bypass
```

Every request resolves to the synthetic `dev@local` identity. A session secret
is not required.

### Agora SSO

Configure:

```dotenv
AUTH_MODE=sso
SESSION_JWT_SECRET=use-a-random-value-at-least-32-characters
AGORA_SSO_CLIENT_ID=
AGORA_SSO_CLIENT_SECRET=
AGORA_SSO_REDIRECT_URI=http://localhost:3000/api/auth/agora/callback
```

The SSO flow:

1. `/api/auth/agora/start` creates an OAuth state cookie.
2. Agora redirects to the registered callback.
3. The callback validates state and exchanges the authorization code.
4. The server fetches the normalized Agora customer identity.
5. The server creates an HS256 session JWT in an HTTP-only, SameSite=Lax
   cookie.

Production cookies are secure. Production defaults to SSO;
`AUTH_MODE=bypass` is ignored unless
`ALLOW_BYPASS_IN_PRODUCTION=true` is explicitly configured.

`src/proxy.ts` also forwards OAuth parameters received at the site root to the
real callback route. This supports deployments where the registered redirect
lands on `/`.

## Storage model

The application has no database or Redis dependency.

- Agents, secret sets, numbers, sessions, and campaigns are stored and
  retrieved through the v3 API via the `agora-agents` SDK.
- Unsaved form edits exist only in React state and are discarded on reload.
- Secret values are write-only in v3; GET responses return key names only.

## Request flows

### v3 resource operations

1. A client component calls `/api/v3/{resource}[/{id}[/{action}]]`.
2. The route handler verifies the local session or development bypass.
3. `src/lib/v3-contract.mjs` resolves the route to one SDK operation; unknown
   resources return `404`, unsupported methods `405`.
4. `src/lib/v3-client.ts` builds an `AgoraClient` for the selected project with
   its App ID and App Certificate (the SDK signs each request with a ConvoAI
   token) and calls `client.v3.<resource>`.
5. The SDK's parsed JSON body is returned as-is. SDK HTTP errors keep the
   upstream status and return `{error, reason, requestId, details}`.
   Bodies may contain only the documented top-level fields for that write, so a
   browser can never set `appid`, ids, or conditional headers. Errors are mapped
   by the SDK's error category (`V3ValidationError`, `V3ConfigurationError`,
   `V3ConnectionError`/`V3TimeoutError`, `V3Error`): malformed input is a 400
   without calling Agora; an unreachable API is a 502, an API timeout a 504, a
   2xx response that violates the API contract a 502, missing configuration a
   500 with its message, and unexpected failures a generic 500 that is logged
   server-side.

Resources are `agents`, `secrets`, `numbers`, `campaigns`, and `sessions`.
Lists accept `limit`, `cursor`, and `order`; sessions also accept `status`,
`channel`, `started_after`, and `started_before`; campaigns accept `status`.

Agent, number, and campaign updates and secret-set deletes need an ETag. The
server reads the current ETag with a GET and sends it as `If-Match`, so the
browser never handles ETags (last write wins).

### Outbound test call

1. The browser posts `to`, `agentId`, and `phoneNumberId` (a v3 number UUID)
   to `/api/call`.
2. The server starts a v3 session with
   `transport: {type: "telephony", from: phoneNumberId, to}`, a 120 s idle
   timeout, and a 300 s maximum duration.
3. The response is `{ok, agentSessionId, status}`; status defaults to
   `STARTING`.
4. The browser polls `GET /api/v3/sessions/{agentSessionId}` for status and
   `analysis`.

## Server routes

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/api/health` | Liveness check |
| `GET` | `/api/session/me` | Current authentication state and identity |
| `GET` | `/api/auth/agora/start` | Begin SSO or redirect in bypass mode |
| `GET` | `/api/auth/agora/callback` | Complete Agora OAuth |
| `GET`, `POST` | `/api/auth/agora/logout` | Clear the local session |
| `GET`, `POST`, `PUT` | `/api/projects` | List, create, and select Agora projects |
| `GET`, `POST` | `/api/v3/{resource}` | List or create a v3 resource |
| `GET`, `PATCH`, `DELETE` | `/api/v3/{resource}/{id}` | Get, update, or delete one resource (sessions: GET only) |
| `POST` | `/api/v3/campaigns/{id}/{pause\|resume\|cancel}` | Campaign actions |
| `POST` | `/api/v3/sessions/{id}/stop` | Stop a running session |
| `POST` | `/api/call` | Place a one-off outbound test call (v3 session) |

Unknown API mutations return JSON `404` responses. Unknown API GET requests
return JSON `405` responses.

## Project map

```text
.
├── src/
│   ├── app/
│   │   ├── page.tsx                         top-level client workflow
│   │   ├── studio/                          deep-linkable workflow routes
│   │   └── api/                             server route handlers
│   ├── components/
│   │   ├── agent-studio-panel.tsx           agent, secret, number, campaign UI
│   │   ├── studio-call-panel.tsx            active session polling and analysis
│   │   ├── studio-call-history.tsx          recent sessions for the agent
│   │   └── v3-api.ts                        browser fetch + pagination helpers
│   ├── lib/
│   │   ├── auth.ts                          JWT and cookie sessions
│   │   ├── agora-sso.ts                     OAuth and customer profile lookup
│   │   ├── v3-client.ts                     agora-agents v3 client + error JSON
│   │   ├── v3-contract.mjs                  v3 route table, ETag writes, call body
│   │   ├── studio-api.ts                    console projects HTTP client
│   │   ├── env.ts                           required server configuration
│   │   └── parity-contract.mjs              shared validation helpers
│   └── proxy.ts                             root OAuth callback forwarding
├── scripts/dev.mjs                          port-aware development launcher
├── tests/*.test.mjs                         contract helper tests
├── docs/ai/                                 progressive coding-agent documentation
├── env.example
└── package.json
```

## Guidance for contributors and coding agents

- Keep the browser-to-server API contract stable. Client code uses relative
  `/api` URLs.
- Keep Agora customer credentials, SSO secrets, and the session signing secret
  in server-only modules.
- Treat submitted provider secrets as sensitive pass-through data and never
  log them.
- Add v3 operations to the route table in `src/lib/v3-contract.mjs`; do not
  create an unrestricted forward proxy.
- Preserve upstream status codes and error bodies from SDK `V3Error`s.
- Validate outbound call input before starting a session.
- Keep `agentSessionId` nullable and default missing call status to `STARTING`.
- Keep unknown API handling separate from page rendering.
- Use bounded external requests and preserve safe logging/redaction.
- Mock external HTTP boundaries in tests. Unit tests must not require live
  Agora credentials.
- Run tests, lint, and a production build after changing routes, auth, or
  shared workflow components.

Additional progressive documentation is available in
[`docs/ai/`](docs/ai/L0_repo_card.md).

## Tests and validation

Run the contract tests:

```bash
pnpm test
```

Run the full local validation:

```bash
pnpm test
pnpm lint
pnpm build
```

The tests verify the v3 route table, list-query filtering, ETag-conditional
writes against a fake SDK client, error mapping, `/api/call` validation, and
App ID + App Certificate resolution for the selected project. They do not place a live
phone call or perform a live SSO exchange.

## Production build

Create the optimized build:

```bash
pnpm build
```

Run the production server:

```bash
APP_ENV=production \
APP_PUBLIC_URL=https://your-app.example \
pnpm start
```

Set the SSO variables in the production environment. Use `PORT` to override the
default production port.

## Troubleshooting

### Port already in use

In bypass mode, the launcher selects the next available port. Inspect a port
manually with:

```bash
lsof -nP -iTCP:3000 -sTCP:LISTEN
```

### Dependencies are missing or out of sync

Run:

```bash
pnpm install --frozen-lockfile
```

### v3 API returns `401` or `403`

Verify `AGORA_APP_ID` and `AGORA_APP_CERTIFICATE` (v3 API), and
`AGORA_CUSTOMER_ID` / `AGORA_CUSTOMER_SECRET` (project picker). These
are server-side values and are different from provider keys stored in secret
sets. The selected project must have v3 preview access.

### `v3.baseUrl must be an HTTP(S) origin`

`AGORA_AGENTS_V3_BASE_URL` must be an origin such as
`https://preview.ai.agora.io`, without a path. Remove the line to use the
default.

### SSO callback fails

Verify that `APP_PUBLIC_URL` and the browser origin match the registered
`AGORA_SSO_REDIRECT_URI`. Confirm that `SESSION_JWT_SECRET` is at least 32
characters.

## Security checklist

- Keep `.env.local` uncommitted; commit only `env.example`.
- Use SSO in production.
- Use a random session secret of at least 32 characters.
- Keep customer credentials and SSO secrets server-side.
- Never log provider secrets submitted to secret sets.
- Serve production traffic over HTTPS.
- Review the v3 route table before exposing additional operations.
