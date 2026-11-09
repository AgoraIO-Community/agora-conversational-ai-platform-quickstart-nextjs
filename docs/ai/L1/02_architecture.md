# Architecture

## Data flow

1. The browser loads identity from `/api/session/me`.
2. The project switcher lists and creates Agora projects through `/api/projects`; the server strips App Certificates and stores the selection in a signed HTTP-only cookie.
3. `AgentStudioPanel` and the call-history components access agents, secrets, numbers, campaigns, and sessions through `/api/v3/*`.
4. The route handler calls the `agora-agents` v3 SDK signed with a ConvoAI token from the App ID and App Certificate (`src/lib/app-credentials.mjs`). `AGORA_APP_ID` uses `AGORA_APP_CERTIFICATE`; a different project chosen in the picker (only with Console credentials) uses its own certificate, read server-side from Console.
5. `/api/call` starts a v3 telephony session and returns its `agentSessionId`.
6. `StudioCallPanel` polls `/api/v3/sessions/{agentSessionId}` and renders status and analysis.

## State

Studio is the only persistent application-data store. In-memory React state holds unsaved editor changes, which are discarded on reload. Authentication and the selected project use separate HTTP-only signed cookies.

There is no webhook bootstrap, RTM transcript subscriber, direct PSTN gateway, quota store, prospect database, or Redis fallback.

## Provider configuration

Provider defaults such as models, URLs, voices, and languages are written into explicit `pipeline.asr`, `pipeline.llm`, and `pipeline.tts` blocks of a cascaded v3 pipeline. TTS voice IDs remain open text inputs with links to each provider's official voice list. Each provider's `credential` is either `{mode: "managed"}` (always used for ARES) or `{mode: "byok", fields: {api_key: "$secrets.<set>.<key>"}}` referencing a project secret set. Secret values are write-only: GET returns only the credential mode, so the editor offers "keep the saved credential" when updating.
