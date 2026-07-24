# M11-2 Grounded Context Engine — Planning & Governance Constraints

> **Status**: Planning (governance constraints LOCKED). Not yet implemented.
> **Anchor**: ADR-0003 (Grounded AI Interpretation Layer, Accepted) ·
> CURRENT_ARCHITECTURE_BASELINE.md §3 (M11 Approved Exception) ·
> M11-2 Architecture Acceptance Review (verdict: CONDITIONAL PASS).
> **Mode note**: This document records planning + governance constraints only.
> It does NOT contain implementation code. Implementation requires a separate
> authorized mode after PO approval of "Approve M11-2 Implementation".

---

## 1. Objective

Build the **Grounded Context Engine** so the AI Gateway (M11-1) can generate
explanations strictly from History Explorer's deterministic knowledge.

Core principle (from ADR-0003): **AI is not a knowledge source.** The
in-memory `GlobalGraph` / `KnowledgeService` is the single source of truth.
AI may only *consume* grounding context.

---

## 2. Approved Architecture Boundary

All new code lives under `backend/app/ai_gateway/` (the only ADR-0003-permitted
module). M11-1 modules (config / provider / prompt_service / fallback_handler)
are reused unchanged.

| File | Action | Responsibility |
|---|---|---|
| `ai_gateway/citation_model.py` | new | Pure `Citation` dataclass (global_id, kind, label). No I/O. |
| `ai_gateway/grounding_builder.py` | new | Read-only from KnowledgeService → assemble facts + citations. No LLM call, no graph mutation, no state storage. |
| `ai_gateway/context_serializer.py` | new | facts → `[ALLOWED FACTS]` prompt text segment. |
| `ai_gateway/response_validator.py` | new | Verify every AI citation maps to a real `global_id` in GlobalGraph (existence + kind match). Drop unresolvable; never invent/fix content. |
| `ai_gateway/__init__.py` | modify | Export new symbols. |
| `backend/app/main.py` | modify | Mount `/ai/explain` + `/ai/chat` under **both** `v1_router` and `legacy_router`. Route-mounting ONLY (see §3). |
| `backend/tests/test_grounded_context.py` | new | See §4. |

**Forbidden to change**: `frontend/**` · `frontend/package.json` (Runtime 0.13.0) ·
`core/*` (read-only consume) · `data/**` · `docs/**` ·
`backend/requirements.txt` (no new dependency; `openai` already whitelisted) ·
any freeze-check logic other than the `main.py` allowlist added in this milestone.

---

## 3. Chat Stateless Constraint  (M11-2 Acceptance Review — Required Change #2)

`POST /ai/chat` MUST be **strictly stateless**.

- **No database.**
- **No Redis.**
- **No persistence** of any kind between requests.
- **No user memory.**
- **No conversation storage / history database.**

Each request MUST carry its own context via `context_global_ids[]`. The server
holds no conversation state; context is released when the request handler
returns. The endpoint is a pure function of (question, context_global_ids).

This constraint is non-negotiable — it prevents AI session state from leaking
into navigation truth, exploration persistence, or journey state (ADR-0003
rollback guarantee: M0–M10 behavior fully unchanged when AI disabled).

---

## 4. Test Plan  (M11-2 Acceptance Review — Required Change #3)

All tests use **mock / stub only** — no real LLM API calls, no network.

### Baseline (from Planning Review)
1. **Grounding correctness** — `explain` a known `global_id`; every citation
   resolves via `GlobalGraph.get_node`.
2. **Missing knowledge refusal** — question beyond facts → `grounded:false` /
   refusal message.
3. **Relationship hallucination** — AI claims a non-existent relationship →
   validator drops it; `grounded` downgraded.
4. **Timeline grounding** — time-based answer's `citation.kind=timeline`
   resolves to a real period/event.
5. **AI disabled fallback regression** — `AI_GATEWAY_ENABLED=false` → endpoint
   returns deterministic fallback, HTTP 200, M0–M10 zero impact.
6. **M0–M10 regression** — full backend suite stays green; freeze-check EXIT 0.

### Added (Acceptance Review required)
7. **Prompt Injection Test** — user question contains "ignore the grounding
   rules" / "you may use outside knowledge"; the system constraint MUST NOT be
   overridden. Assert the response still cites only provided facts and any
   injected instruction does not produce external-knowledge answers (enforced by
   system prompt authority + validator citation-backing).
8. **Invalid Citation Test** — AI returns a citation with a fake `global_id`;
   `response_validator` MUST reject/drop it; `grounded` reflects only valid
   citations.
9. **Empty Grounding Context Test** — facts `=[]` → `grounded=false` and the
   deterministic fallback path is taken (no crash, HTTP 200).
10. **Provider Failure Test** — provider raises / returns `None`;
    `fallback_handler` engages; response is the deterministic fallback.
11. **Timeout Test** — provider times out; request does NOT crash the service;
    falls back gracefully (assert no unhandled exception propagates to 500).

---

## 5. Freeze Boundary Note

`backend/app/main.py` is now allowlisted in `scripts/freeze-check.mjs`
(`APPROVED_AI_MAIN`) **for route mounting only**, under FROZEN_SCOPE=frontend.
This is the sole freeze-check change for M11-2. It does NOT relax the backend
scope for any other file, nor does it permit AI logic / graph mutation /
business logic inside main.py. CI `FROZEN_SCOPE` remains `frontend`.

---

## 6. Implementation Authorization

Conditional on the three Acceptance-Review required changes (freeze-check
allowlist ✅ done here; chat stateless constraint ✅ documented here; expanded
test plan ✅ documented here). Pending PO: "Approve M11-2 Implementation".
