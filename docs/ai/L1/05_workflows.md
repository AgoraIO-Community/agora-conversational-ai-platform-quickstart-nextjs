# Workflows

## Select or create a customer project

1. GET `/api/projects` to load the current customer's projects and safe selected App ID.
2. PUT `/api/projects` to validate and store a selection in a signed HTTP-only cookie.
3. POST `/api/projects` with only a project name. The server forces certificate creation, removes the returned certificate, and selects the new project.
4. Remount the Studio workflow when the selection changes so resources cannot leak between project editor states.

## Create and update an agent

1. POST the stable agent resource with its complete initial configuration.
2. Keep unsaved editor changes in in-memory React state; reloading discards them.
3. PATCH an existing agent with complete `properties` when saving updates.
4. Treat agents returned by the Studio list API as live resources. The demo does not fetch version history to determine or display publication state.

## Duplicate an agent

1. GET the source agent detail.
2. Hydrate the same editor state used by the edit flow.
3. Clear the source agent ID, suffix the name with `copy`, and present the result as an unsaved create form.
4. POST through the normal create-agent path after the user reviews the configuration.

## Delete an agent

1. Open the agent editor and start deletion from the bottom-left action in the agent details footer. The landing-page cards intentionally omit destructive actions.
2. Explain that deletion is irreversible and removes the agent's immutable version history.
3. Require the user to type the exact lowercase word `delete` before enabling the final action.
4. Refresh the campaign list immediately before deletion and block the request while a `scheduled` or `running` campaign references the agent.
5. DELETE `/agents/{agent_id}`, remove the deleted agent from local UI state, and return to the agent list when the deleted agent was selected.

## Configure providers

1. Select the provider and keep the demo's vendor defaults for models, URLs, voices, languages, and other parameters.
2. Enter a TTS voice ID directly, using the provider's official voice-list link beneath the field when needed.
3. For every provider except ARES, choose Agora-managed credentials or a `$secrets.<set>.<key>` reference. Create the secret set first (`POST /api/v3/secrets`, or `PATCH /api/v3/secrets/{set}` to add a key).
4. Send the reference as `credential: {mode: "byok", fields: {api_key: ...}}` in the matching pipeline block; ARES always uses `{mode: "managed"}`.
5. On update, keep a saved BYOK credential unchanged unless the user picks a new reference, because GET never returns secret values.

## Test a call

1. Select an agent and a registered v3 number (`number_id` UUID).
2. POST `/api/call` with `{to, agentId, phoneNumberId}`; the server starts a v3 telephony session.
3. Poll `GET /api/v3/sessions/{agentSessionId}` until the status is `STOPPED` or `FAILED`.
4. Render `analysis.result` (the agent's extract variables) when the service returns it.

## Review session history

1. List `GET /api/v3/sessions?status=RUNNING,STOPPED,FAILED&limit=20`.
2. Load each session's detail (list items omit `agent_name`) and keep those matching the active agent's name.

## Campaigns

Create campaigns from CSV contacts (`phone` plus extra columns as contact `values`) with an immediate or scheduled window, then refresh the v3 campaign list. Campaign activity shows `counts` and offers pause, resume, and cancel. Campaign and session history are never duplicated into app storage.
