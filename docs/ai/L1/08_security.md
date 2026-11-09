# Security

- Never expose the App Certificate, Agora Customer Secret, or provider credentials to browser JavaScript.
- Never expose the Console API `sign_key`/App Certificate. Project list and create responses must pass through the safe-project mapper before serialization.
- Store the selected project in a signed HTTP-only cookie, and validate switch requests against the customer's project list.
- Keep the Studio proxy allowlist narrow and require an authenticated session.
- Redact authorization, secrets, tokens, provider keys, and large agent properties from logs.
- Use HTTP-only signed session cookies in SSO mode.
- Do not persist provider secret fields after submitting them to the Credentials API.
- Keep `AUTH_MODE=bypass` limited to local development unless the explicit production override is intentionally set.
- `/api/v3/*` write bodies are allowlisted per operation (`V3_BODY_FIELDS` in `src/lib/v3-contract.mjs`); never spread an unvalidated browser body into an SDK request, because SDK request objects also accept `appid`, ids, and conditional headers.
