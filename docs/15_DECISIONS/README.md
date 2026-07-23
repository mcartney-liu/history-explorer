# L15 — Decisions

Architecture / Feature / Technology decision records (ADRs).

This layer captures discrete, reviewable decisions that shape the project. It is
distinct from `10_ARCHITECTURE` (the standing baseline + current architecture) and
from `20_MILESTONES` (release history).

## Contents

- `ADR_TEMPLATE.md` — copy this to `ADR-XXXX_<topic>.md` for each new decision.
- `ADR-0001_agent_governance_framework.md` — **Accepted** (2026-07-23, M9-010). Process
  Governance Decision establishing the Agent Governance Foundation. Freeze Revision Gate: No.
- `ADR-*.md` — individual accepted / proposed decisions. The first instance (`ADR-0001`)
  was created in M9-010; subsequent decisions follow the same template and pattern.

## Relationship to the Freeze Baseline

Any ADR that touches the Current Architecture Baseline MUST pass the Freeze Revision Gate
(ADR + Architecture Review + Product Owner Approval). See
`docs/10_ARCHITECTURE/CURRENT_ARCHITECTURE_BASELINE.md` §4.

> This directory is the authoritative home for decision records. Historical design notes
> that are NOT decision records live in `docs/90_ARCHIVE/` (not authoritative).
