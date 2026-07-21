# History Explorer — Documentation Map (INDEX)

> Single navigation + freshness index for all project documentation. Read this first to avoid cognitive drift.

## Layer Model (6 product layers + meta)

| Layer | Name | Answers | Source of Truth | Mutability | Owner |
|---|---|---|---|---|---|
| **L1** | Product Vision Source | Why we exist / what we become | `History_Explorer_PRD_完整版_v1.0.docx` (original). `PRD.md` = derived mirror | Only via version bump (Product Owner) | Product Owner |
| **L2** | Product DNA | What can never be violated (identity contract) | Distilled from L1 | Extremely rare | Product Owner |
| **L3** | Product Constitution | How we decide / what we refuse to become | Governance rules | Major (Product Owner) | Product Owner + Lead |
| **L4** | Current Reality / Project Context | What is true right now | Code + git tags + CHANGELOG | **Every release (living doc)** | Lead |
| **L5** | Roadmap | How we evolve | Milestone planning | Per milestone | Lead + Product Owner |
| **L6** | Architecture / Engineering | How it is built | Code (fact) | Per milestone | Lead / Backend |
| *Meta* | Documentation Map / Team Spec / Repository Memory | Navigation + team governance + project KB | This file / `TEAM_OPERATING_SPEC_v1.2.md` / `.workbuddy/memory` | As needed | Lead |
| **15_DECISIONS** | Decisions (ADR) | Why a specific architecture/feature/tech decision was made | `docs/15_DECISIONS/` | Per decision | Lead + Product Owner |

## Document Registry

| File | Layer | Owner | Mutability | Updated | Notes |
|---|---|---|---|---|---|
| `PRD.md` | L1 (mirror) | Product Owner | Version bump only | 2026-07-21 | Derived from docx; docx wins on conflict |
| `Product_DNA.md` | L2 | Product Owner | Rare | 2026-07-21 | Identity contract; Graph-first + infinite exploration + AI guide |
| `Product_Constitution.md` | L3 | Product Owner | Major | 2026-07-21 | Boundaries + decision tests + AI Agent rules |
| `PROJECT_CONTEXT.md` | L4 | Lead | Every release | 2026-07-21 | v0.10.0 / M8.6; Freeze Baseline stated |
| `PROJECT_ROADMAP.md` | L5 | Lead + Product Owner | Per milestone | 2026-07-21 | M-system; Near-term vs Future (Gate) |
| `README.md` | Landing/Index | Lead | Per release | 2026-07-21 | GitHub entry; points here |
| `docs/INDEX.md` | Meta | Lead | As needed | 2026-07-21 | This file |
| `docs/00_VISION/README.md` | L1 support | Product Owner | Rare | 2026-07-21 | Source-of-truth declaration |
| `docs/10_ARCHITECTURE/README.md` | L6a support | Lead | As needed | 2026-07-21 | Freeze Baseline location |
| `docs/20_MILESTONES/README.md` | Archive | Lead | As needed | 2026-07-21 | Migration pending |
| `docs/30_TEAM/README.md` | Meta | Lead | As needed | 2026-07-21 | Team governance pointer |
| `docs/TEAM_OPERATING_SPEC_v1.2.md` | Meta | Lead | Frozen (v1.2) | 2026-07-17 | Team norm; changes via §14 |
| `docs/ENGINEERING_PLAYBOOK.md` | L6b | Lead | Per milestone | M8.6 | Milestone lifecycle |
| `docs/Documentation_Standard_v1.0.md` | L6b | Lead | Rare | M4 | Doc standard |
| `docs/M3.5-000_Schema_Freeze_Review.md` | L6a | Lead | Via Gate | M3.5 | Freeze Baseline origin (elevated to `CURRENT_ARCHITECTURE_BASELINE.md`) |
| `docs/M3-001..M5-*` | L6a / history | Lead | Historical | various | Milestone reports (pre-migration) |
| `scripts/freeze-check.mjs` | L6b guard | Lead | Rare | M8.6 | CI freeze guard |
| `docs/10_ARCHITECTURE/CURRENT_ARCHITECTURE_BASELINE.md` | L6a | Lead | Via Gate | 2026-07-21 | **Current Architecture Freeze Baseline — single entry** (broader than schema: runtime / dependency / API contract / exclusion boundaries) |
| `docs/15_DECISIONS/README.md` | 15_DECISIONS | Lead | As needed | 2026-07-21 | Decisions layer index |
| `docs/15_DECISIONS/ADR_TEMPLATE.md` | 15_DECISIONS | Lead | As needed | 2026-07-21 | ADR template (architecture/feature/technology decisions; required for freeze revisions) |
| `docs/90_ARCHIVE/` | Archive | Lead | Historical | — | Superseded docs; NOT authoritative |
| `PROJECT_CHARTER.md` | L3 support | Product Owner | Rare | (M1) | Foundational charter; referenced by Constitution §7 |
| `docs/SUGGESTIONS.md` | Working | Lead | As needed | ongoing | Running suggestions backlog |

## Freeze Model (important)

The current architecture is **frozen as a baseline — NOT permanent**.
- **Current Architecture Freeze Baseline** prohibits, in code: Neo4j / PostgreSQL / Elasticsearch / LLM+RAG runtime / GIS / login / permissions / new dependencies. The deterministic in-memory Knowledge Core + Exploration Engine are the agreed foundation.
- **Freeze Revision Gate:** any change touching the freeze boundary (AI runtime, Neo4j, GIS, …) MUST pass an ADR (template: `docs/15_DECISIONS/ADR_TEMPLATE.md`) + a revision of the baseline (`docs/10_ARCHITECTURE/CURRENT_ARCHITECTURE_BASELINE.md`, origin `docs/M3.5-000_Schema_Freeze_Review.md`), approved by Product Owner. Never bypassed silently.
- **Code guard:** `scripts/freeze-check.mjs` runs in CI.

## Update Cadence (anti-drift)

- **L4 `PROJECT_CONTEXT.md`** is updated by Lead after every release and must match git tag + CHANGELOG.
- **L1 / L2** change only with a Product Owner vision version bump (docx re-sign + mirror re-sync).
- **L5 / L6** change per milestone.
- This INDEX is updated whenever a document is added, moved, or its owner/mutability changes.

## Authoritative Reading Order

Read in this order to understand the product without drift:

1. `README.md` — GitHub entry, project status, documentation map link.
2. `docs/INDEX.md` — this map (layers, owners, freshness, freeze model).
3. `PRD.md` — Product Vision (mirror of the docx source of truth).
4. `Product_DNA.md` — identity contract (what can never be violated).
5. `Product_Constitution.md` — governance (how we decide / what we refuse).
6. `PROJECT_CONTEXT.md` — current reality (version, freeze baseline, state).
7. `PROJECT_ROADMAP.md` — evolution (Near-term vs Future via Gate).
8. Architecture docs — `docs/10_ARCHITECTURE/CURRENT_ARCHITECTURE_BASELINE.md` (freeze baseline) and milestone reports under `docs/`; decision records (ADRs) in `docs/15_DECISIONS/`.

> The original vision source is `History_Explorer_PRD_完整版_v1.0.docx`; `PRD.md` is a derived mirror and the docx wins on conflict.

## Archive Policy

- `docs/90_ARCHIVE/` holds **historical only** documents superseded by this system.
- It is NOT an authoritative source. Do not base engineering or product decisions on it.
- Active documents live in the layers `00_VISION` / `10_ARCHITECTURE` / `20_MILESTONES` / `30_TEAM` + the root governance docs (`PRD.md`, `Product_DNA.md`, `Product_Constitution.md`, `PROJECT_CONTEXT.md`, `PROJECT_ROADMAP.md`).
- Milestone reports (M3–M8.6) are not yet in `90_ARCHIVE`; they remain at `docs/` root pending a dedicated migration task (their current location is not authoritative layering).
