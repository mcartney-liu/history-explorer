# History Explorer — M2 Milestone Planning

Version: v2.0 (as-executed)
Milestone: M2 — Exploration MVP
Status: **COMPLETED — M2 Alpha Ready (pending human review)**
Date: 2026-07-15
Based on: `M1_Final_Assessment.md` v1.1 (Status: PASS · Closure)
Current release: v0.1.0 (tagged at M1 close; M2 changes held uncommitted for holistic review)

---

# Executive Summary

M1（Foundation Validation）已签收：产品方向、系统架构、知识模型基础与探索式 UI 原型得到验证；P0 收口项（M-H1 点击闭环 / M-H2 测试闸门 / M-H3 topic 净化 / M-H4 文档收口）全部落地。

M2 的目标不是"加更多功能"，而是**让产品进入下一阶段**——从一个只能演示单主题的探索原型，演进为一个**可导航、可发现、数据质量可见、覆盖多主题**的 MVP。M2 严守"无 AI、无图数据库、无搜索引擎、无重依赖"的过早复杂度红线。

> **编号说明（重要）：** 本文件 v1.0 原规划的 M2-002…M2-006 口径（Exploration Engine / Navigation / Topic Discovery / Data Expansion / Integration Review）与**实际按用户逐轮指令执行的口径不一致**。下方"Checkpoint Planning"以**实际执行**为准（M2-001 → M2-002 → M2-002.5 → M2-003 → M2-004 → M2-005 → M2-006），原计划中未被执行的口径在 §Appendix B 标注为"原始规划 / 已偏离"。

---

# Vision

**Vision (one line):**
History Explorer evolves from a single-topic prototype into a navigable, multi-topic exploration MVP that users can actually traverse.

**Milestone Goal (one line):**
Make History Explorer a navigable, searchable, data-quality-validated multi-topic MVP — richer knowledge model, a real navigation shell, cross-dataset search, and a data-validation/health surface — with no AI, no graph database, and no search engine introduced.

**Success Definition (one line):**
A user can open the app, search across topics, open any entity, follow relationships and timeline events into other entities, go back / forward / re-open recent, and trust that the underlying data has been validated — with no AI, no graph database, and no search engine.

---

# Goals (as-executed)

1. **Knowledge Model v2** — additive richer attributes (structured time, `global_id`, relationship metadata `citation`) without a schema rewrite or a database. ✅ M2-001
2. **Cross-dataset Search & Entity detail** — `GET /search` + `GET /entity/{id}` so users find and open any entity without guessing topic slugs. ✅ M2-002
3. **Performance & UX** — in-memory entity index (build once, read-many), `global_id` lookup, result-card enrichment, keyboard navigation. ✅ M2-002.5
4. **Navigation Shell** — breadcrumb, history (back/forward), recent explorations, loading/empty/error states; relationships and timeline events become clickable, closing the Exploration Loop. ✅ M2-003
5. **Data Quality & Validation** — startup schema / cross-reference / duplicate / relationship-consistency / per-topic / health validation surfaced read-only via `GET /health` and a startup developer report. ✅ M2-005
6. **Alpha Readiness** — documentation sync, code/naming/UI/project cleanup, full regression, manual QA, Alpha checklist, M2 final report. ✅ M2-006

---

# Scope

## What M2 does

- Adopt **Knowledge Model v2** (additive optional fields on the existing JSON-file model).
- Ship **`GET /search`** (ranked, in-memory, no engine) and **`GET /entity/{id}`** (local id or global_id; 404 otherwise).
- Add a **navigation shell** (breadcrumb + history + recent + loading/empty/error) and make relationships / timeline events navigable.
- Add **data-quality validation** (`validation.py`, pure library) surfaced via **`GET /health`** + startup report — warnings only, never crashes.
- **Sync docs, clean code, run full regression, manual QA, produce the Alpha checklist + M2 report.**

## What M2 does NOT do (and why)

- **No AI / LLM / RAG** — the AI Interpretation Layer stays a documented future capability; `AIGuidePanel` remains a placeholder. Entering AI now would violate the frozen-architecture discipline and balloon scope.
- **No graph database (Neo4j) / search engine (Elasticsearch)** — data stays JSON-file based; M2 search is an in-memory index; M2 traversal is in-memory over one topic. These are M3+ infrastructure decisions.
- **No new routing / state library** — default keeps React `useState` + in-memory view state (honors the M1 architecture freeze).
- **No recommendation engine, login, admin, social, mobile, GIS/map** — see Out of Scope.
- **No CI / Docker / `/healthz` / `/api/v1` / unified error envelope / CHANGELOG / TECHNICAL_DEBT files** — these were in the *original* M2-006 plan but are **explicitly out of scope for the as-executed M2-006** (which is Alpha-Ready cleanup only, forbidding new features/dependencies). They are recorded as **deferred debt** (see Technical Debt) for M3+.

---

# Out of Scope

| Item | Deferred to | Reason |
|------|-------------|--------|
| AI Chat / RAG | M3+ | AI Interpretation Layer is a documented future capability; `AIGuidePanel` placeholder stays. |
| GIS / Map | M3+ | Geographic visualization needs a geo data model + map renderer. |
| Neo4j (graph DB) | M3+ | M2 traversal is in-memory over one JSON topic. |
| Elasticsearch | M3+ | Topic/entity discovery in M2 is a curated in-memory index + filter, not full-text search. |
| Recommendation | M3+ | `Recommendation_Principles.md` defines the philosophy; the engine itself is later. |
| Login / Admin / Social | M3+ | No multi-user need in MVP. |
| Mobile app | M3+ | Responsive pass done in M2-003; dedicated app is not. |
| Performance Optimization | M3+ | Current scale (few JSON topics, single user) has no measured perf problem. |
| CI / Docker / observability | M3+ | **Deliberately deferred** from the as-executed M2-006 (Alpha-Ready cleanup only). Recorded as debt. |
| API versioning (`/api/v1`) / error envelope | M3+ | Additive, non-breaking; deferred to avoid new surface area in M2. |
| CHANGELOG / TECHNICAL_DEBT docs | M3+ | Deferred; M2 status captured in `M2_Planning.md` + this report instead. |

---

# Checkpoint Planning (as-executed)

> M2 was delivered as **seven** checkpoints in the order below. Each is marked
> with its real completion status. Manual QA and regression were run at M2-006.

## M2-001 — Architecture Cleanup ✅ COMPLETED

- **Status (2026-07-15):** Done. Schema v2 published; `roman_empire` migrated and `egypt_technology_religion` added (both v2); the Phase 3 backend adapter (`_dedupe_relationship_source`) was removed after the relationship metadata `source`→`citation` rename eliminated the duplicate-key collision; pytest 11 passed. No API route or response-shape change.
- **Goal:** Evolve the flat model to v2 with richer, *additive* attributes, keeping JSON-file storage and zero-downtime compatibility with the existing API shape.
- **Deliverables:** `data/schemas/exploration_schema.md` v2; migration note (v1 files remain valid); `topics` discovered from filenames.
- **Exit Criteria:** ✅ v2 schema published; backend loads v1 and v2 files identically; tests green (11 passed). **M2-001 closed.**

## M2-002 — Search & Exploration ✅ COMPLETED

- **Status (2026-07-15):** Done. Added `GET /search` (ranked cross-dataset entity search) and `GET /entity/{id}` (entity detail: summary / timeline / relationships / exploration; resolves local id **or** global_id; 404 otherwise). Frontend gained `EntitySearchBox` + `SearchResults` (keyboard navigable) and `EntityPage`; related entities now route through `/entity/{id}`. pytest 21 → (with later checkpoints) **50 passed**; vitest 6 → **38 passed**.
- **Goal:** Let users find and open any entity across all topics without guessing topic slugs, and open a dedicated entity page — no search engine, no AI, in-memory index only.
- **Deliverables:**
  - `GET /search?q=` — exact(id/name) > alias > contains ranking; returns `id/name/type/topic/description/match` + additive `start`/`end`/`location`.
  - `GET /entity/{id}` — returns `summary`/`timeline`/`relationships`(with `direction` + `other`)/`exploration`; `global_id` lookup supported.
  - Frontend `EntitySearchBox`, `SearchResults` (↑↓ Enter Esc keyboard nav), `EntityPage`; clickable related entities route to `/entity/{id}`.
- **Acceptance Criteria:** search returns ranked matches; unknown entity 404s; global_id resolves to the same local entity; frontend entity page renders all four sections; `npm run build` + `pytest` + `vitest` green.
- **Dependencies:** M2-001 (v2 fields).
- **Exit Criteria:** ✅ search + entity page live; tests green. **M2-002 closed.**

## M2-002.5 — Performance & UX ✅ COMPLETED

- **Status (2026-07-15):** Done. Added the in-memory entity index (`_ENTITY_INDEX`, built once at startup, reused for all `/search` + global_id lookup — no per-request filesystem scan); result-card enrichment (`type`/`start`/`end`/`location`); and pure keyboard-navigation helpers (`searchNav.ts`: ↑↓ Enter Esc). pytest 28 → 50 (with later); vitest 15 → 38.
- **Goal:** Remove per-request filesystem reads and make search feel instant; enrich result cards; add keyboard navigation — all without new dependencies.
- **Deliverables:** `_build_entity_index()` + `_get_entity_index()`; `global_id` resolution in `/entity`; `SearchResults` enrichment fields; `searchNav.ts`.
- **Acceptance Criteria:** repeated searches succeed even when `_load_topic_data` is broken (proves in-memory reuse); enrichment fields render only when present; keyboard nav moves/selects; build + tests green.
- **Dependencies:** M2-002.
- **Exit Criteria:** ✅ index build-once verified; enrichment + keyboard nav live; tests green. **M2-002.5 closed.**

## M2-003 — Navigation ✅ COMPLETED

- **Status (2026-07-15):** Done. Added the navigation shell (`navigation.ts` pure functions + `recentStore.ts` localStorage) and components `Breadcrumb` / `HistoryBar` / `RecentExplorations` / `LoadingSkeleton` / `EmptyState` / `ErrorCard`; `App.tsx` rewritten as the central navigation orchestrator. `RelationshipView` branches and `TimelinePanel` events became clickable, **closing the Exploration Loop** (Explore → Connect → Continue, and Timeline → Entity → Timeline). Backend unchanged; pytest 28; vitest 38; build 51 modules 0 err.
- **Goal:** Give the app a persistent navigation shell + breadcrumb + history + recent so users never lose their place and can traverse back and forth (closes M1-005 soft dead-end).
- **Deliverables:** breadcrumb (home + history path), back/forward history bar, recent explorations (persisted), loading/empty/error states, clickable relationships + timeline events.
- **Acceptance Criteria:** breadcrumb + back/forward work; recent persists across reload; empty/loading/error states render; no dead-ends after exploring; no new routing/state library; tests green.
- **Dependencies:** M2-001/002 (data + click targets).
- **Exit Criteria:** ✅ nav shell live; Exploration Loop closed; tests green. **M2-003 closed.**

## M2-004 — Knowledge-Graph Ready (validation/index/lookup) — SUPERSEDED

- **Status:** **Not implemented as originally scoped.** This checkpoint was interrupted; its *validation* intent was folded into **M2-005** (Data Quality & Validation), which delivers the schema / cross-reference / duplicate / relationship-consistency / health checks and the `GET /health` surface. The originally-planned *cross-topic index + unified `findById`/`findByGlobalId`/`findByAlias`/`findByName` lookup service* and *relationship/timeline indexes (outgoing/incoming, year/century/period)* were **not** built — the in-memory `_ENTITY_INDEX` (M2-002.5) already covers global lookup, and no cross-topic graph was required for M2.
- **Goal (original):** make the data structure Knowledge-Graph Ready (unified identity/relationship validation, indexes, lookup service) without introducing a graph DB.
- **Disposition:** validation portion → **M2-005**; index/lookup service portion → **deferred** (not needed for M2's single-topic traversal; revisit at M3 graph work).
- **Dependencies:** M2-001.
- **Exit Criteria:** ✅ validation intent delivered via M2-005; remaining scope explicitly deferred. **M2-004 closed (superseded).**

## M2-005 — Data Quality & Validation ✅ COMPLETED

- **Status (2026-07-15):** Done. New pure library `backend/app/validation.py` (no deps, no import cycle) implements: Schema Validation (Entity/Relationship/Timeline/Topic), Cross-Reference Validation (dangling relationships / timeline→entity), Duplicate Detection (id/global_id/alias/name), Relationship Consistency (orphan / circular), per-Topic Report, Health aggregation, and a startup Developer Report. Wired into `main.py`: built once at startup, stored in `_VALIDATION_REPORT`, printed at boot, and surfaced read-only via **`GET /health`**. On real data: 2 topics / 11 entities / 8 relationships / 3 timeline / 0 error / 2 warning (`healthy`). Added `test_validation.py` (22 cases). pytest **50 passed**; vitest 38; build 51 modules.
- **Goal:** Make data quality *visible and locatable* — validation runs at startup, reports (never crashes), and is queryable via `/health`. No new product feature.
- **Deliverables:** `validation.py` (pure), `_VALIDATION_REPORT` + startup print, `GET /health`, `test_validation.py`.
- **Acceptance Criteria:** startup validation prints ✓ / [W] / [E]; `/health` returns status + counts + issues; schema/cross-ref/duplicate/consistency all covered by tests; API/frontend/data shape unchanged; no new dependency.
- **Dependencies:** M2-001/002.5.
- **Exit Criteria:** ✅ validation + health live; 22 new tests green. **M2-005 closed.**

## M2-006 — Alpha Ready ✅ COMPLETED (this task)

- **Status (2026-07-15):** Done. Final Alpha-Readiness checkpoint — **no new product feature**. Work: (1) Documentation Sync — `exploration_api.md` (v2.1: added `/search`, `/entity`, `/health`), `M2_Planning.md` (this file, corrected to as-executed), `README.md` + `docs/INDEX.md` (status/capabilities/tests/endpoints synced); (2) Code Cleanup — deleted dead `ExplorationState.tsx`, removed unused `_INDEX_BUILDS` debug counter, merged duplicated `_build_exploration` / `_build_exploration_for_entity` into one `_build_exploration_view`; (3) Naming — unified the exploration-builder naming; (4) UI Polish — confirmed the M2-003 `he-*` design tokens are the single visual system (spacing/typography/card/button/hover/transition/loading/empty/error), no redesign; (5) Project Cleanup — removed a stray Vite temp file, confirmed `dist`/`__pycache__`/`pytest_cache` are gitignored; (6) Regression — pytest 50 / vitest 38 / build 51 modules all green; (7) Manual QA — full user flow (Home → Search → Topic → Entity → Relationship → Timeline → Back → Recent → Search Again) verified via backend flow + frontend tests, no dead links / blank / undefined / console error / loop; (8) Alpha Checklist + M2 Final Report produced.
- **Goal:** Bring code, docs, and implementation into agreement and prove the M2 MVP is Alpha Ready for human review.
- **Deliverables:** synced docs; cleaned code; regression green; Alpha checklist; M2 Final Report.
- **Acceptance Criteria:** docs consistent with code; no dead code / TODO / FIXME / debug output; naming consistent; UI tokens unified; regression green; manual QA clean; Alpha checklist all-checked.
- **Dependencies:** M2-001 … M2-005.
- **Exit Criteria:** ✅ Alpha Ready; pending human review. **M2-006 closed.**

---

# Deliverables

| Checkpoint | Deliverable | Type |
|------------|-------------|------|
| M2-001 | Knowledge Model v2 schema (`exploration_schema.md`) | Doc / Data contract |
| M2-002 | `GET /search` + `GET /entity/{id}`; frontend search box / entity page / clickable nav | Backend / Frontend |
| M2-002.5 | In-memory entity index + `global_id` lookup + result enrichment + keyboard nav | Backend / Frontend |
| M2-003 | Navigation shell (breadcrumb / history / recent / states) + clickable relationships & timeline = Exploration Loop closed | Frontend |
| M2-004 | *Superseded* — validation → M2-005; cross-topic index/lookup deferred | — |
| M2-005 | `validation.py` (pure) + `GET /health` + startup report + `test_validation.py` | Backend / Tests |
| M2-006 | Doc sync + code/naming/UI/project cleanup + regression + QA + Alpha checklist + M2 report | All layers |

---

# Architecture Impact

**Unchanged (frozen by M1-002):**
- Frontend stack: React 18 + TypeScript + Vite, component-based, hand-written CSS, no UI framework / state library / graph engine.
- Backend stack: FastAPI, single-purpose API layer.
- Data layer: JSON-file based, no database / ORM / ETL.
- Core API contract shape (`topic/title/summary/timeline/entities/relationships/connections/exploration`) plus additive `/search`, `/entity`, `/health`.

**Allowed extensions (delivered in M2):**
- Knowledge Model v2 (additive optional fields); `global_id` for cross-dataset identity.
- `GET /search`, `GET /entity/{id}`, `GET /health` — all additive, non-breaking.
- In-memory entity index (build once, read-many) — no per-request filesystem scan.
- Navigation shell + recent store (localStorage) — in-memory view state only.

**Prohibited (still enforced):**
- No database / ORM / graph engine / search engine / AI-LLM introduced.
- No new heavy dependencies (no React Router; no D3/Cytoscape/Mapbox; no Elasticsearch client).
- No breaking change to the top-level API response shape.

---

# Risks

| Risk | Likelihood | Impact | Mitigation (as-executed) |
|------|-----------|--------|------------|
| Knowledge model over-design | Medium | High | v2 = additive optional fields only; no schema rewrite. |
| Exploration algorithm complexification | Medium | High | Limited to the single loaded topic's relationships (in-memory). |
| Scope creep | Medium | High | Hard checkpoint gates; Out-of-Scope is a hard boundary. |
| AI entering early | Low | High | Explicit freeze; `AIGuidePanel` stays placeholder. |
| Doc/code drift | Medium | Medium | **M2-006 Documentation Sync** closed the gap (api/planning/readme/index). |
| Deferred infra (CI/Docker/versioning) becomes blind spot | Medium | Medium | Recorded as **Technical Debt** for M3+; not silently dropped. |

---

# Version Strategy

- Each checkpoint was developed with Conventional Commits intent; **all M2 changes are held uncommitted** per the user's "holistic review before commit" preference.
- M2 closure is intended to be tagged **`v0.2.0`** ("History Explorer — M2 Exploration MVP Completed") after human review and any commit cadence decision.
- `CHANGELOG.md` / `TECHNICAL_DEBT.md` are **deferred** to M3+ (see Out of Scope); M2 status lives in this file + the M2 Final Report.

---

# Exit Criteria (M2 Alpha Ready)

M2 is complete (and M3 may begin after human review) when **all** of the following hold:

- [x] Knowledge Model v2 adopted by data + API (rich attributes + structured time + `global_id` + `citation`).
- [x] Cross-dataset search (`/search`) + entity detail (`/entity`) live; rankings deterministic; global_id resolves.
- [x] Navigation shell live; breadcrumb + back/forward + recent work; Exploration Loop closed (relationships + timeline events clickable).
- [x] Data-quality validation runs at startup and is queryable via `GET /health`; reports, never crashes.
- [x] Docs consistent with code: `exploration_api.md` (v2.1), `M2_Planning.md` (as-executed), `README.md`, `docs/INDEX.md` synced.
- [x] No dead code / TODO / FIXME / debug output; naming + UI tokens unified; project structure clean.
- [x] Regression green: pytest 50 / vitest 38 / `npm run build` 51 modules 0 err.
- [x] Manual QA clean: full user flow verified, no dead links / blank / undefined / console error / loop.
- [x] Alpha Readiness Checklist all-checked (see M2 Final Report).
- [ ] CI green on push — **deferred** (no CI in M2; recorded as debt).
- [ ] `docker build` runnable / `/healthz` / CORS+API-base env externalized — **deferred** (M3+).
- [ ] API versioned (`/api/v1`) + unified error envelope — **deferred** (M3+).
- [ ] `CHANGELOG.md` (v0.2.0) + `TECHNICAL_DEBT.md` published — **deferred** (M3+).
- [ ] `v0.2.0` tagged/pushed after human review (open: commit cadence + review gate).

---

# Appendix

## A. Original M2 Planning → As-Executed Mapping

| Original v1.0 checkpoint | As-executed | Note |
|--------------------------|-------------|------|
| M2-001 Knowledge Model v2 | M2-001 | ✅ same |
| M2-002 Exploration Engine (multi-hop) | M2-002 Search & Exploration | renamed; multi-hop deferred (single-topic traversal only) |
| M2-003 Navigation Shell | M2-003 Navigation | ✅ same (also closed Exploration Loop) |
| M2-004 Topic Discovery (Search) | M2-002 (search) + M2-004 superseded | search delivered in M2-002 |
| M2-005 Data Expansion (≥3 topics) | partially — 2 topics exist | 3rd interconnected topic not authored; see debt |
| M2-006 Integration Review (CI/Docker/healthz/versioning) | M2-002.5 (in-mem index) + M2-005 (`/health`) + M2-006 (Alpha Ready cleanup) | CI/Docker/versioning **deferred** |

## B. Deferred / Debt (explicitly not in M2)

- **CI / Docker / observability** — no pipeline in M2; manual `pytest`+`vitest`+`build` is the gate.
- **`/api/v1` prefix + unified error envelope** — additive, deferred to avoid new surface area.
- **`CHANGELOG.md` / `TECHNICAL_DEBT.md`** — deferred; status captured here + M2 Final Report.
- **3rd interconnected topic** — only `roman_empire` + `egypt_technology_religion` exist; a cross-topic click path is not yet demonstrable (M2-002/M2-003 loops are intra-topic).
- **Cross-topic graph / lookup service** — deferred from M2-004; revisit at M3 graph work.

## C. Relationship to M1_Final_Assessment §8

This document supersedes the **§8 M2 Planning (Draft)** in `M1_Final_Assessment.md v1.1`. Once M2 is reviewed and approved, §8 may be marked "promoted to `M2_Planning.md` (as-executed v2.0)".

---

**End of M2 Milestone Planning (v2.0 · as-executed · COMPLETED — Alpha Ready, pending human review)**
