# M4-003 Architecture

> Milestone:   M4-003
> Doc Type:    Architecture
> Date:        2026-07-18
> Author Role: Project Architect (Lead)
> Status:      Approved
> Dependencies: M4-002 (CLOSED), M3.5-000 Schema Freeze Review, TEAM_OPERATING_SPEC_v1.2 (Frozen), Documentation_Standard_v1.0, M4-002_Architecture, M4-002_Completion_Report

> Lead Review: **APPROVED WITH MINOR REFINEMENTS** (2026-07-18). Minor refinements incorporated in this finalization: (1) restructured to Documentation Standard v1.0 §10 Architecture Template with the required Header; (2) added the mandatory `New Responsibilities` and explicit `API Contract` sections; (3) added a `Design Decision` comparison table with adopt / reject rationale; (4) corrected the Current Architecture Review gap analysis against verified source (`App.tsx` `ExplorationResult` / `EntityPage.tsx` `EntityDetail` types) — neither page currently consumes the M4-002 fields; (5) froze the component inventory and forbidden-modification list. No scope change; additive-only UI.

---

## Objective

Make the M4-002 cross-topic API fields (`related_topics`, `exploration.cross_topic_related`) first-class, visible UI on both the Explore page and the Entity page — without touching the frozen backend, the deterministic ExplorationEngine, or any existing panel's logic.

## Background

- M4-002 (CLOSED) added three additive projection fields to the existing endpoints:
  - `GET /explore/{topic}` → top-level `related_topics` + `exploration.cross_topic_related`.
  - `GET /entity/{id}` → top-level `related_topics`.
- These fields are pure GlobalGraph projections (no ExplorationEngine call, no new storage, no new endpoint; `v1 == legacy` same handler). M4-002 shipped and was validated (pytest 105 passed, data healthy).
- The frontend (React 18 + TypeScript + Vite) currently does **not** consume any of these three fields. M4-003 is the frontend consumer that turns the data into UI. This is the next Checkpoint in the M4 plan after M4-002, before M4-004 (Search v2, parallel-capable) and M4-005 (cleanup) / M4-006 (QA) / M4-007 (Release).

## Current Architecture Review

### Frontend structure (verified)
- State lives in `frontend/src/App.tsx`: a local `useState` history stack (`NavNode[]` + cursor) drives two render branches — `topic` (Explore) and `entity` (Entity page). `fetchNode` issues `GET /explore/{topic}` or `GET /entity/{id}`.
- `frontend/src/components/navigation.ts` is a pure, Node-testable navigation model (`NavNode`, `pushHistory`, `buildBreadcrumb`, …). No React, no DOM.
- `EntityPage.tsx` renders the entity view and owns the `EntityDetail` type.
- Existing panels (siblings, single-responsibility): `SummaryPanel`, `MainEntityCard`, `RelationshipView`, `RelatedEntityList`, `TimelinePanel`, `ConnectionsPanel`, `ConnectionsExplainedPanel`, `ExplorationPathsPanel`, `ThemesPanel`, `AIGuidePanel`.

### Gap analysis (verified against source)
| Page | Backend returns | Frontend type today | Consumed? |
|------|-----------------|---------------------|-----------|
| Explore (`/explore`) | `related_topics[]` + `exploration.cross_topic_related[]` (plus all legacy fields) | `App.tsx` `ExplorationResult` has **neither** field | ❌ Not consumed |
| Entity (`/entity`) | `related_topics[]` (plus all legacy fields; **no** `cross_topic_related`) | `EntityPage.tsx` `EntityDetail` has **no** `related_topics` | ❌ Not consumed |

Consequences:
- The Explore page shows no "connected topics" summary and no direct cross-topic neighbor chips.
- The Entity page shows no cross-topic topic summary.
- `cross_topic_related` exists **only** on `/explore` (centered on the Explore main entity). `/entity` intentionally does **not** return it — surfacing per-entity direct cross-topic neighbors on the Entity page would require a backend additive (out of M4-003 scope; tracked as backlog).

### Cross-topic navigation already works
`App.tsx` builds `entityGlobalIdById` from `relationships[].other.global_id` and `openEntity(id)` accepts a full `global_id` (`topic:localid`). Clicking an existing cross-topic chip already opens an entity from another topic. New panels reuse this exact mechanism — **no new navigation logic** is introduced.

## Design Decision

Problem: how to surface the two new field families without regressing the five-zone UI or the frozen backend.

| Option | Description | Verdict | Rationale |
|--------|-------------|---------|-----------|
| A — Extend existing panels | Add `related_topics`/`cross_topic_related` rendering inside `RelatedEntityList` / `ThemesPanel` | **Rejected** | Mixes in-topic related-exploration with cross-topic connections; bloats single-purpose components; violates single-responsibility; raises regression risk to proven panels. |
| B — Two new dedicated components + one pure helper (Adopted) | `CrossTopicTopicList` (renders `related_topics`), `CrossTopicConnectionsPanel` (renders `exploration.cross_topic_related`), `crossTopic.ts` (types + pure helpers) | **Adopted** | Additive siblings; single-responsibility; testable; zero change to existing panels; click-through reuses `openEntity(global_id)`. Mirrors the established `navigation.ts` / `searchNav.ts` pure-module pattern. |

Adopted shape:
- `CrossTopicConnectionsPanel` — Explore page only; renders `exploration.cross_topic_related` as clickable neighbor chips; click → `openEntity(item.global_id)`.
- `CrossTopicTopicList` — Explore **and** Entity pages; renders `related_topics` as a "Connected Topics" list; click → `navigateTo({ type: 'topic', topic })`.
- `crossTopic.ts` — pure TypeScript module: `CrossTopicRelated` / `RelatedTopic` types + sort/group helpers. No React, no DOM; Node-testable like `navigation.ts`.

## New Responsibilities

| Role | New responsibility in M4-003 |
|------|------------------------------|
| Frontend | Implement `crossTopic.ts` + 2 new components; minimally extend `App.tsx` (`ExplorationResult` type + render the 2 panels on the Explore branch) and `EntityPage.tsx` (`EntityDetail` type + render `CrossTopicTopicList`). No modification to existing panel internals. |
| QA Frontend | Independent verification (read-only sign-off) that new components render and click-through navigates correctly; new vitest added in Implementation; confirm no regression to existing panels. |
| Lead | Owns this Architecture, the Integration Report, and the freeze/flow gate. |
| Backend / Data | **None.** M4-002 already shipped the fields; M4-003 is frontend-only consumption. Out of scope. |

## API Contract

All fields below are **additive** on endpoints shipped in M3.5-003 / M4-002. No new endpoint, no renamed/removed field, no semantic change. `v1 == legacy` (same handler mounted under `/api/v1` and legacy paths — `main.py` composition root).

| Endpoint | Additive field | Shape | Notes |
|----------|----------------|-------|-------|
| `GET /explore/{topic}` | `related_topics` (top-level) | `[{ topic: string, cross_topic_edge_count: number }]` | Topic-level cross-topic connection stats for the explored topic. |
| `GET /explore/{topic}` | `exploration.cross_topic_related` | `[{ id, name, type, global_id, topic, relationship, direction }]` | Direct cross-topic neighbors of the Explore centered entity. |
| `GET /entity/{id}` | `related_topics` (top-level) | `[{ topic: string, cross_topic_edge_count: number }]` | Topic-level cross-topic stats for this entity. **No** `cross_topic_related` (explore-only by design). |

Shapes are sourced from M4-002 (`knowledge_service.cross_topic_related` / `related_topics_for_entity` / `related_topics_for_topic`) and confirmed against `backend/app/main.py`. Frontend type extensions in M4-003-002 Implementation must match these shapes exactly.

## Data Flow

**Explore page**
1. `fetchNode` → `GET /explore/{topic}` → JSON now includes `related_topics` + `exploration.cross_topic_related`.
2. `App.tsx` extends `ExplorationResult` to carry both fields.
3. `related_topics` → `<CrossTopicTopicList>`; `exploration.cross_topic_related` → `<CrossTopicConnectionsPanel>`.
4. Topic chip click → `navigateTo({ type: 'topic', topic })`; neighbor chip click → `openEntity(item.global_id)` (global_id already fully-qualified, reuses `entityGlobalIdById` path).

**Entity page**
1. `fetchNode` → `GET /entity/{id}` → JSON now includes `related_topics`.
2. `EntityPage.tsx` extends `EntityDetail` to carry `related_topics`.
3. `related_topics` → `<CrossTopicTopicList>` (rendered inside `EntityPage`).
4. Topic chip click → `navigateTo({ type: 'topic', topic })`.

### User Flow
- On a topic page the user sees a **Connected Topics** list (how many cross-topic edges link to each other topic) and a **Cross-Topic Connections** chip row (the specific entities in other topics directly connected to the centered entity).
- Clicking a cross-topic neighbor chip jumps to that entity in its own topic (proven navigation path).
- Clicking a topic in Connected Topics switches the exploration to that topic.
- On an entity page the user sees the same **Connected Topics** list, enabling topic-level discovery; per-entity direct cross-topic neighbor chips are intentionally deferred (backend does not return them here).

## Freeze Compliance

| Dimension         | Status    | Note |
|-------------------|-----------|------|
| Entity Types      | unchanged | 8（冻结，见 Glossary / M3.5-000） |
| Relationship Types| unchanged | 18（冻结，见 Glossary / M3.5-000） |
| Schema            | unchanged | M4-002 投影字段已在冻结 Schema 上；M4-003 仅消费 |
| Schema Version    | unchanged | |
| API Contract      | unchanged | additive only；无新端点、无语义变更；v1==legacy |
| ExplorationEngine | unchanged | 未被 M4-003 触及（仅 UI 消费投影） |
| Version           | unchanged | 仍 0.1.0，M4-003 不 bump（bump 属 M4-007 Release，User 拍板） |

## Risk Assessment

| ID | Risk | Severity | Mitigation |
|----|------|----------|------------|
| R1 | Frontend type extensions (`ExplorationResult`, `EntityDetail`) must match backend JSON exactly; mismatch → empty render / TS error. | Low | Shapes verified against `main.py` + M4-002; stable (frozen). M4-003 QA re-validates shape at runtime. |
| R2 | Cross-topic click navigation breaks. | Low | Reuses existing `openEntity(global_id)` + `entityGlobalIdById`; proven in M3.5-004. No new navigation logic. |
| R3 | Regression to existing five-zone UI. | Low | New components are additive siblings; existing panels untouched. Existing vitest retained; new tests added in Implementation. |
| R4 | `AIGuidePanel` dead weight confusion. | Non-blocking | Out of M4-003 scope (M4-005 cleanup). Explicitly forbidden to modify or depend upon (see inventory below). |
| R5 | Entity page lacks per-entity `cross_topic_related`. | Non-blocking | By design — `/entity` returns `related_topics` only. Direct neighbor chips on entity page deferred; backlog for possible backend additive. |

## Next Phase Entry

Conditions to enter M4-003-002 (Implementation):
1. This Architecture is **Approved** (Lead Review: APPROVED WITH MINOR REFINEMENTS, finalized 2026-07-18).
2. Freeze compliance confirmed — 7 dimensions unchanged; no backend / Data change required (M4-002 already shipped the fields).
3. Frontend Role may implement: add `crossTopic.ts` + `CrossTopicTopicList.tsx` + `CrossTopicConnectionsPanel.tsx`; minimally extend `App.tsx` and `EntityPage.tsx` (type + render only).
4. Hard gates (Lead): additive-only; must not modify existing panel internals; must not touch `AIGuidePanel`; must not alter API contract or ExplorationEngine.
5. On completion → Lead Integration Report → QA Frontend sign-off → (later) M4-007 Release (User approval).

### Component inventory (frozen for M4-003)
- **New**: `frontend/src/components/crossTopic.ts`, `frontend/src/components/CrossTopicTopicList.tsx`, `frontend/src/components/CrossTopicConnectionsPanel.tsx`.
- **Minimally extended (type + render only)**: `frontend/src/App.tsx`, `frontend/src/components/EntityPage.tsx`.
- **Forbidden to modify**: `SummaryPanel`, `MainEntityCard`, `RelationshipView`, `RelatedEntityList`, `TimelinePanel`, `ConnectionsPanel`, `ConnectionsExplainedPanel`, `ExplorationPathsPanel`, `ThemesPanel`, `AIGuidePanel`, `navigation.ts`, `backend/**`, `docs/**` (except this file).

---

> 文档依据：真实仓库读取（2026-07-18）— `git` 状态、`backend/app/main.py`、`frontend/src/App.tsx`、`frontend/src/components/EntityPage.tsx`、`navigation.ts`、4 个现有 panel、`M4-002_Completion_Report.md`、`Documentation_Standard_v1.0.md`、`TEAM_OPERATING_SPEC_v1.2.md`。本 Architecture 不含实现代码、测试代码或 Validation 实测结果（仅设计意图，符合 Doc Standard §10）。
