# Gotchas

- v3 lives at `https://preview.ai.agora.io/conversational-ai/v1/projects/{appid}` (the SDK builds this path). A blank `AGORA_AGENTS_V3_BASE_URL=` counts as unset (SDK default origin).
- Session list defaults to `status=RUNNING`; pass comma-separated statuses for history. Neither list nor get exposes the stored agent ID.
- Agora Console project APIs use `/dev/v1/*` on `api.agora.io`, unlike v3 resources. Their responses contain `sign_key`; sanitize every success response before returning it to the browser.
- The API currently exposes more than one response-envelope family.
- Agent detail may omit the documented `state`. The demo treats agents returned by the Studio list API as live resources.
- The demo does not request version history or use the versions-list response to determine whether an agent can serve traffic.
- The internal design describes `/draft` routes, but the deployed API returns `404` for them. This demo creates and updates complete live agent configurations through the public agent routes.
- Publishing replaces complete nested provider blocks.
- Duplicating is a create operation, not an update: fetch detail, clear the agent ID, then reuse the create form and POST path.
- Agent deletion is irreversible and removes immutable version history. Re-read campaigns immediately before deletion and block while any `scheduled` or `running` campaign references the agent.
- v3 agent PATCH is a JSON merge patch: send `null` to clear a field, and never null a `credential` object you did not change, because its secret values cannot be read back.
- BYOK credential field names are vendor-specific; this demo sends `api_key`. Check the v3 schema before adding providers that need other fields.
- Session `analysis` is filled in after the call ends and may be omitted during the preview rollout; its absence is not an error. v3 has no transcript or recording API.
- A caller-generated `call_id` is the join key between Outbound Dial and Calls API polling.

Contract gaps are tracked in `studio-docs/_workspace/STUDIO_API_PRODUCT_ISSUES.md`.
