# GitHub Copilot / Agent Instructions — History Explorer

This repository enforces a machine-readable **Agent Governance Layer**.

## First Action (Mandatory)

Before any modification, plan, or release action, **read and follow**:

> `docs/AGENT_OPERATION_PROTOCOL.md`

That document is the single source of truth for all AI Agent behavior in this
repository (Agent Levels L0–L3, Universal Rules, STOP conditions). Do not
proceed without reading it. Rule text is intentionally **not** duplicated here
to prevent drift — this file only points to the protocol.

## Unknown = STOP

If you encounter any of the following, **STOP immediately** and wait for the
Product Owner (PO) decision — do not guess, do not self-expand scope:

- an unknown file or workflow
- insufficient permission
- a conflict between rules

## Governance First

Agent decisions are *executed*, not *authorized*. **Release Approval always
belongs to the Product Owner (D8).** See `docs/AGENT_OPERATION_PROTOCOL.md`
for the full binding rules and the mode prompts under `prompts/`.
