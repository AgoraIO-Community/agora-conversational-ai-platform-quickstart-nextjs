# v3 test-call lifecycle

1. Browser posts `to`, `agentId` (v3 agent UUID), and `phoneNumberId` (v3 number UUID) to `/api/call`.
2. Server validates authentication, the E.164 destination, and non-empty IDs.
3. Server calls `client.v3.sessions.start` with `agent_id`, `transport: {type: "telephony", from: phoneNumberId, to}`, a 120 s idle timeout, a 300 s max duration, and labels `{source: "quickstart", agent_id}`.
4. Server returns `{ok, agentSessionId, status}`; status defaults to `STARTING`.
5. Browser polls `GET /api/v3/sessions/{agentSessionId}`.
6. The live panel renders session status, timestamps, and `analysis` (extracted agent variables) when present.
7. Session history uses `GET /api/v3/sessions` with explicit statuses; the API has no agent filter.

No PSTN webhook starts the agent. No RTM browser subscription carries the transcript. No app database stores the call record. v3 exposes no transcript or recording.
