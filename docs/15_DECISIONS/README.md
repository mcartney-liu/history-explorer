# L15 — Decisions

Architecture / Feature / Technology decision records (ADRs).

This layer captures discrete, reviewable decisions that shape the project. It is
distinct from `10_ARCHITECTURE` (the standing baseline + current architecture) and
from `20_MILESTONES` (release history).

## Contents

- `ADR_TEMPLATE.md` — copy this to `ADR-XXXX_<topic>.md` for each new decision.
- `ADR-*.md` — individual accepted / proposed decisions. None exist yet: the repository
  has *required* ADRs via the Freeze Revision Gate, but held no instance before this
  layer was established (M8.8-D.1).

## Relationship to the Freeze Baseline

Any ADR that touches the Current Architecture Baseline MUST pass the Freeze Revision Gate
(ADR + Architecture Review + Product Owner Approval). See
`docs/10_ARCHITECTURE/CURRENT_ARCHITECTURE_BASELINE.md` §4.

> This directory is the authoritative home for decision records. Historical design notes
> that are NOT decision records live in `docs/90_ARCHIVE/` (not authoritative).
