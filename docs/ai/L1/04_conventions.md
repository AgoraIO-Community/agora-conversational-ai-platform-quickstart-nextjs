# Conventions

- Keep Agora credentials server-side; browser code calls local API routes.
- Never return Console API `sign_key` values to the browser. Return only the safe project view and keep project selection in a signed HTTP-only cookie.
- Reach Conversational AI only through the `agora-agents` v3 client (`client.v3.*`); add new operations to `src/lib/v3-contract.mjs`. The hand-rolled HTTP helper is only for console `/dev/v1/projects`.
- Treat `reason/detail` and `code/message` response families through shared response helpers.
- Send complete nested agent properties when publishing because nested blocks replace rather than deep merge.
- Duplicate agents by hydrating the existing create form from agent detail; do not add a second create payload path.
- Use Studio credential IDs instead of provider secrets in agent properties.
- Write explicit cascaded `pipeline` provider blocks; reference provider keys only through `$secrets.<set>.<key>` (saved agents reject inline keys), and use managed credentials for ARES.
- Keep user-facing third-party provider lists alphabetized by their displayed labels.
- Use caller-generated UUIDs for Outbound Dial and subsequent call-detail polling.
- Treat agents returned by the Studio agents API as live resources. Do not infer serving state from the undocumented versions-list response.
- Keep logs structural and redact secrets and large agent payloads.
