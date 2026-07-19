# M5-D Milestone Report — Historical Meaning Layer

**Milestone:** M5-D (Historical Meaning Layer / Deterministic Deep Understanding)
**Branch:** `feature/m5-d-historical-meaning-layer`
**Implementation HEAD:** `c92416b`
**Type:** Feature milestone — rule-based "why these connections matter" layer
**Date:** 2026-07-19

---

## 1. Goal

Upgrade the user journey from *"discovering connections"* (M5-A Interpretation + M5-C Comparison) to *"understanding why a connection exists and what it meant historically"* — using only existing structured data (`relationship.type` + `direction`) and a deterministic rule engine. No AI / LLM / generative natural language.

This closes **User Journey Stage 4 (Deep Understanding)** within the freeze envelope: the product target is "understand why", but the implementation is a template-driven, fully-explainable layer — not a model.

## 2. Direction Decision

Approved in **M5-D Design Freeze**: **Direction A — Rule-based Deep Understanding**.
Rejected alternatives that crossed the freeze red line (AI/LLM-driven NL generation, embedding/similarity, recommender). Four candidate directions (A rule-based understanding / B search UX / C temporal dimension / D cross-topic synthesis) were assessed; A was chosen as the highest-value freeze-safe deepening of Stage 4.

## 3. Scope (A–E, additive only)

| ID | File | Change | Purpose |
|----|------|--------|---------|
| A | `frontend/src/data/understandingRules.ts` | NEW | Deterministic rule engine. Pure `filter`/`map`/`transform` + fixed templates with `{actor}`/`{target}`/`{type}` substitution. Covers all 18 `RELATIONSHIP_TYPES` + guaranteed fallback. Exposes `buildUnderstanding`, `buildUnderstandingsFromRelationships` (EntityPage source), `buildUnderstandingsFromConnectionsExplained` (Topic source). |
| B | `frontend/src/components/InterpretationPanel.tsx` | MOD | Optional prop `understandings?`. When present & non-empty, appends a "Historical Meaning" block after the existing M5-A interpretation list. Absent/empty → 100% unchanged. No `navigation.ts` import. |
| C | `frontend/src/components/EntityPage.tsx` | MOD | Wires `understandings={buildUnderstandingsFromRelationships(entity.relationships, entity.name)}`. Uses existing `entity.relationships`/`entity.name`. |
| D | `frontend/src/App.tsx` | MOD | Topic view derives `understandings` purely frontend from `result.connections_explained` + `result.entities` (local `global_id→name` map). No new API endpoint. |
| E | tests | NEW/MOD | `understandingRules.test.ts` (NEW, 8 cases) + `InterpretationPanel.test.tsx` (MOD, +3 cases). |

## 4. Understanding Flow

```
Entity ──▶ InterpretationPanel
            ├─ interpretations      (M5-A, verbatim backend explanation)
            └─ understandings       (M5-D, derived from entity.relationships)
                  └─ buildUnderstanding(rel)
                        └─ template[relType][direction] → { meaning, perspective }

Topic  ──▶ ConnectionsExplainedPanel ──▶ InterpretationPanel
            └─ understandings         (M5-D, derived from connections_explained.steps[0])
                  └─ buildUnderstandingsFromConnectionsExplained
                        └─ template → { meaning, perspective }
```

- **Direction → perspective flip**: `forward`/`outgoing` → actor-as-subject ("Rome conquered Greece", perspective `as conqueror`); `reverse`/`incoming` → actor-as-object ("Greece was conquered by Rome", perspective `as conquered`).
- **Fallback**: unknown `relationType` → `${actor} is connected to ${target} through a ${relationType} relationship.` (perspective `as connected`).
- **Empty input** → `[]` (no render).

## 5. Freeze Boundary Respected

`backend` / `API` / `exploration_engine.py` / `validation.py` / `navigation.ts` / Knowledge Model unchanged. No AI / LLM / GIS / Provider / Recommendation / Ranking / Score / Similarity. Additive only. No new dependency.

## 6. Test & Build

- Frontend: **`127 passed`** (22 files), `vite build` **0 errors**, `tsc --noEmit` **0 errors**.
- Backend: **`115 passed`** (pytest, zero backend change).

## 7. Status

Implementation complete and verified (M5-D Phase 2 Verification = PASS, Risk LOW). Ready for Release Execution as **v0.6.0**.
