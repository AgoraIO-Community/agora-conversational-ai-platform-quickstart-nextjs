# Agora Studio API demo: repo card

> Standalone Next.js demo for managing and exercising Agora Conversational AI v3 (preview) resources via the `agora-agents@3.0.0-alpha.4` SDK.

## Identity

| Field | Value |
| --- | --- |
| Repo | `jules-winnfield` |
| Runtime | Next.js route handlers and React |
| Persistent state | Agora v3 API only (through the SDK) |
| Local transient state | In-memory React state for unsaved form edits |
| Authentication | Agora SSO in production; bypass mode in local development |
| Last reviewed | 2026-11-03 |

## Main flow

1. Select an Agora project, or create one.
2. Create, select, or duplicate an agent.
3. Configure provider defaults and create or select Studio credential resources using the live vendor/type schema; ARES is credential-free.
4. Save complete agent properties with POST when creating or PATCH when updating.
5. Register or select a Studio phone number.
6. Place a one-off outbound call (v3 telephony session) and poll the session for status and analysis.
7. Create and monitor outbound campaigns.
8. Delete an unused agent and its version history after checking campaign usage and typing an explicit confirmation.

## Documentation

- [Setup](L1/01_setup.md)
- [Architecture](L1/02_architecture.md)
- [Code map](L1/03_code_map.md)
- [Conventions](L1/04_conventions.md)
- [Workflows](L1/05_workflows.md)
- [Interfaces](L1/06_interfaces.md)
- [Gotchas](L1/07_gotchas.md)
- [Security](L1/08_security.md)
- [Call lifecycle](L1/L2/call_lifecycle.md)
