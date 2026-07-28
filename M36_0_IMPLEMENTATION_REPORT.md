# M36.0 — AI Interpretation Layer Activation: Implementation Report

**Date:** 2026-07-27
**Status:** STOP — Awaiting PO Review
**Baseline:** master @ vM35.1.1 (`a5daf00`)

---

## 1. Scope & Baseline

| Item | Value |
|---|---|
| Baseline commit | `a5daf00` (vM35.1.1) |
| Working tree | Modified: 11 files (see §8 git diff below) |
| Freeze boundary | ENTITY_TYPES=8, RELATIONSHIP_TYPES=18 — untouched |
| Runtime version | 0.13.0 — unchanged (non-runtime release) |
| Dependencies | 0 added — no new pip/npm packages |
| Backend schema | Zero changes to deterministic engine, GlobalGraph, validation |

---

## 2. Phase 1 — Freeze Revision Gate (SCOPE_ALLOWLIST)

**Action**: Registered 12 precise file entries (not directory wildcards) in `scripts/freeze-check.mjs` to gate `ai_gateway` expansions while keeping `provider.py` / `response_validator.py` / `fallback_handler.py` / `context_serializer.py` / `citation_model.py` frozen.

**Files allowed**:

| # | File | Purpose |
|---|---|---|
| 1 | `backend/app/ai_gateway/grounding_builder.py` | 2-hop context expansion |
| 2 | `backend/app/ai_gateway/prompt_service.py` | Mode directives |
| 3 | `backend/app/ai_gateway/answer_service.py` | Response contract upgrade |
| 4 | `backend/app/ai_gateway/config.py` | (already in allowlist — no change) |
| 5 | `frontend/src/data/aiClient.ts` | Mode pass-through + new types |
| 6 | `frontend/src/components/AIExplanationPanel.tsx` | Mode chips + fallback UI |
| 7 | `frontend/src/components/GroundedAnswer.tsx` | Perspectives/evidence/confidence |
| 8 | `frontend/src/components/CitationList.tsx` | (already in allowlist — no change) |
| 9 | `backend/tests/test_ai_gateway.py` | Confidence + evidence unit tests |
| 10–12 | 3 frontend `.test.tsx` files | UI regression coverage |

**Gate**: `freeze-check` EXIT=0, no D-class violations.

---

## 3. Phase 2 — AI Grounding Enhancement (2-hop Context)

**File**: `backend/app/ai_gateway/grounding_builder.py`

- New `GroundingResult.expanded_global_ids: List[str]` — additive, default `[]`.
- New `expand_context(roots)` method: BFS 2-hop from roots via `global_neighbors`. `seen` set de-duplicates, `MAX_EXPANDED_ENTITIES=25` hard cap prevents dense-hub explosion.
- Second-hop facts annotated `(2-hop via context)` in grounding output.
- **Validation trick**: `expanded_global_ids = roots + bridges` pushed into validation context. Since frozen `ResponseValidator.validate()` accepts `context ∪ 1-hop neighbors`, the bridges become resolvable — no validator change needed.

**Design**: `expand_context` is read-only, pure, exception-safe (unknown ids silently skipped).

---

## 4. Phase 3 — Prompt Mode System

**File**: `backend/app/ai_gateway/prompt_service.py`

- `_MODE_DIRECTIVES`: 6 keys → focused directive strings appended after `SYSTEM_PROMPT`.
  - `explain`, `why_important`, `why_happened`, `historical_impact`, `multi_civilization_view`, `timeline_explanation`
- `template_for(mode)` returns `SYSTEM_PROMPT + directive`. Unknown mode → falls through to `explain`.
- ADR-0003 grounding contract text **never weakened**.

**File**: `backend/app/main.py`

- `AIRequest.mode: str = "explain"` — additive field, pure pass-through (no AI logic in main.py).
- `ai_explain` / `ai_chat` both pass `mode=body.mode or "explain"` to `grounded_answer()`.

---

## 5. Phase 4 — AI Response Contract Upgrade

**File**: `backend/app/ai_gateway/answer_service.py`

### 5.1 New server-computed helpers

- `_compute_confidence(grounded, valid, total)` → `"high" | "medium" | "low"`
  - Fully grounded → high. Partial ≥50% valid → medium. Otherwise → low.
  - Never trusts LLM self-rating; deterministic, reproducible.

- `_extract_perspectives(parsed)` — LLM-supplied `perspectives[]` list, coerced to clean strings.

- `_build_evidence(valid_citations)` — maps each `Citation` to `{global_id, kind, label, status: "verified"}` for the `evidence` contract.

### 5.2 Response body additions (additive)

All three code paths now return:
| Field | Type | Source |
|---|---|---|
| `perspectives` | `string[]` (default `[]`) | LLM → `parsed.get("perspectives")` |
| `evidence` | `AIEvidence[]` (default `[]`) | Server → `_build_evidence(valid_citations)` |
| `confidence` | `"high" \| "medium" \| "low"` | Server → `_compute_confidence()` |

Old fields (`answer`, `citations`, `rejected_citations`, `grounded`, `engine`, `question`, `context_global_ids`, `mode`) **retained unchanged**.

### 5.3 LLM instruction update

`_CITATION_INSTRUCTION` now includes `perspectives` in the expected JSON schema (optional, 1–3 items).

---

## 6. Phase 5 — Frontend AI UX

### 6.1 `frontend/src/data/aiClient.ts`

- New types: `AIEvidence`, `AIConfidence`.
- `AIResponse` gains optional `perspectives`, `evidence`, `confidence` — backward-compatible.
- `AIAskOptions.mode?: string` — pass-through to backend.
- `postAI()` sends `mode: opts.mode ?? 'explain'` in request body.
- `explainAI()` / `chatAI()` accept optional 4th arg `mode?: string`.
- `PROMPT_MODES` exported (5 display chips: 为何重要 / 为何发生 / 历史影响 / 多文明视角 / 时间线解读).

### 6.2 `frontend/src/components/AIExplanationPanel.tsx`

- **5 Mode Chips**: rendered above input, highlights active chip (`ae-mode-chip--active`). Disabled during loading.
- **Permanent Disclaimer**: "AI 解读由知识图谱中的事实驱动，可溯源验证。答案可能有限或存在偏差..."
- **Deterministic fallback UI**: `engine === 'deterministic'` renders separate `ae-result--fallback` block (answer + reason), NOT routed through `GroundedAnswer`.
- Internal `promptMode` state tracks active chip; `ask()` passes it to `explainAI()`.

---

## 7. Phase 6 — GroundedAnswer Upgrade

**File**: `frontend/src/components/GroundedAnswer.tsx`

- **Confidence badge**: `ga-confidence-badge` with label 高/中/低, next to grounded badge. Only rendered when `response.confidence` is present (backward-compat safe).
- **Perspectives block**: `ga-perspectives` with title "多角度解读" and bullet list. Guarded on `items.length > 0`.
- **Evidence block**: `ga-evidence` with title "已验证的事实证据" and entries showing kind/label/status per verified citation. Guarded on non-empty.

**CitationList compatibility**: unchanged — `citations` and `rejected_citations` rendered as before.

---

## 8. Phase 7 — Tests

### 8.1 Backend (`backend/tests/test_ai_gateway.py`)

| Class | Tests | What |
|---|---|---|
| `TestComputeConfidence` | 6 | high (grounded/1:1), medium (3:5 partial), low (2:5, 0:0, 1:1 grounded) |
| `TestExtractPerspectives` | 5 | empty, missing, strings, filtering non-strings, not-a-list |
| `TestBuildEvidence` | 2 | empty, multi-citation mapping |
| **Legacy** | **8** | unchanged |

**Total**: 21 passed (+13 vs pre-M36).

### 8.2 Frontend

| File | Tests | Additions |
|---|---|---|
| `AIExplanationPanel.test.tsx` | 8 | +3 (mode chips, active chip highlight, fallback block w/ reason) |
| `GroundedAnswer.test.tsx` | 12 | +7 (confidence badge 3 cases, perspectives 2, evidence 2) |
| `CitationList.test.tsx` | 5 | unchanged |
| **Legacy (59 other files)** | **559** | unchanged |

**Total**: 62 files, 584 passed (+10 vs pre-M36 574).

---

## 9. Phase 8 — Validation Gate (ALL GREEN)

| Gate | Result |
|---|---|
| `freeze-check` | PASSED — no D-class violations |
| Backend `pytest` (full) | **232 passed** (17.36s) |
| Frontend `vitest` (full) | **62 files, 584 passed** (22.54s) |
| Frontend `vite build` | **OK** (5.64s, 0 errors) |
| TypeScript `tsc --noEmit` | **0 errors** |
| Python `py_compile` (answer_service) | **OK** |
| ENTITY_TYPES/RELATIONSHIP_TYPES | **8 / 18 — unchanged** |
| Dependencies | **0 added** |
| Runtime version | **0.13.0 — unchanged** |

### Git diff (uncommitted)

```
 backend/app/ai_gateway/answer_service.py           |  74 +++++++++++++-
 backend/app/ai_gateway/grounding_builder.py        | 111 +++++++++++++++++++++
 backend/app/ai_gateway/prompt_service.py           |  52 +++++++++-
 backend/app/main.py                                |  14 ++-
 backend/tests/test_ai_gateway.py                   |  76 ++++++++++++++
 frontend/src/components/AIExplanationPanel.test.tsx |  86 +++++++++++++++-
 frontend/src/components/AIExplanationPanel.tsx     |  75 ++++++++++++--
 frontend/src/components/GroundedAnswer.test.tsx    |  71 +++++++++++++
 frontend/src/components/GroundedAnswer.tsx         |  63 +++++++++++-
 frontend/src/data/aiClient.ts                      |  42 ++++++--
 scripts/freeze-check.mjs                           |  27 ++++-
 11 files changed, 660 insertions(+), 31 deletions(-)
```

---

## 10. STOP — PO Review Required

**No commit, push, tag, or release has been performed.** All 11 files remain as uncommitted working-tree modifications.

### Acceptance Checklist

- [x] Freeze boundary preserved (ENTITY=8, REL=18, schema untouched)
- [x] All AI logic confined to `backend/app/ai_gateway/`
- [x] All new files registered in SCOPE_ALLOWLIST (12 precise entries)
- [x] Response contract additive — old fields retained
- [x] Backward-compatible frontend (optional `perspectives`/`evidence`/`confidence`)
- [x] Backend pytest: 232/232 green
- [x] Frontend vitest: 584/584 green
- [x] Frontend build: OK
- [x] freeze-check: PASSED
- [x] Zero new dependencies

### Awaiting

PO review + approval → commit + annotated tag + push + consistency check per standard release workflow.

### Rollback

`git checkout .` restores baseline `vM35.1.1` (`a5daf00`). No merge/commit created.
