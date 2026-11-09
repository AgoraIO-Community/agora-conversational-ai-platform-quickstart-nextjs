# Interfaces

## `GET /api/session/me`

Returns authentication state, auth mode, and the current user. It has no quota or storage side effects.

## `/api/v3/[...resource]`

Authenticated, route-table-backed access to the v3 preview API through the `agora-agents@3.0.0-alpha.4` SDK (`client.v3.*`). Resources: `agents`, `secrets` (id = set name), `numbers`, `campaigns`, `sessions`. `GET`/`POST` on the collection list/create; `GET`/`PATCH`/`DELETE` on `{id}`; `POST campaigns/{id}/{pause|resume|cancel}` and `POST sessions/{id}/stop`. Sessions are read-only except stop (start goes through `/api/call`). The server fetches ETags itself for agent/number/campaign PATCH and secret-set DELETE. Bodies and responses use v3 wire JSON; Errors map by the SDK's error category: API errors return the upstream status with `{error, reason, requestId, details}` (a 2xx response that violates the API contract becomes 502); validation errors and malformed input are 400; connection failures 502 and timeouts 504; configuration errors 500 with their message; unexpected failures a generic 500 logged server-side. The selected project comes from a signed HTTP-only cookie, with `AGORA_APP_ID` as fallback.

## `/api/projects`

- `GET`: returns safe project objects and the selected App ID.
- `POST`: accepts `{ "name": "Example customer" }`, creates a project with its certificate enabled, strips the certificate from the response, and selects the project.
- `PUT`: accepts `{ "appId": "..." }`, verifies that it belongs to the authenticated Agora customer, and stores it in a signed HTTP-only cookie.

Project responses intentionally omit `sign_key`, recording-server data, and every other server-only Console field.

## `POST /api/call`

Input:

```json
{ "to": "+15551234567", "agentId": "<v3 agent uuid>", "phoneNumberId": "<v3 number uuid>" }
```

This is the demo's only outbound-call interface. It starts a v3 session with a telephony transport (`from` = number UUID, `to` = E.164), a 120 s idle timeout and 300 s max duration, and returns `{ok, agentSessionId, status}`. The v3 API remains authoritative for call eligibility and request validation.

There are no app webhook, RTM token, call-event, quota, heartbeat, stop, or prospect-admin interfaces.
