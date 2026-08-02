# History Explorer — AI Context (Project Brain for External AI)

> **This file is the single entry point for ANY AI assistant** (ChatGPT / Claude / Gemini /
> local Agent / Codex / Copilot / Cursor / etc.) entering the History Explorer repository.
> Read this file in full before any task. It is a **navigation index** — it points to the
> authoritative sources; it does NOT replace them. Rule text is referenced, not copied, to
> prevent drift.

---

## 0. Why this file exists

History Explorer already has a strict AI governance layer
(`docs/AGENT_OPERATION_PROTOCOL.md`). That protocol governs **behavior** (what an Agent may
do). This file governs **orientation** (what an AI must know to be useful on day one).

If you are an AI and were handed this repo, **start here, then read the linked files.** Do not
infer project state from prior conversation memory — verify against the real repository
(`git status`, file reads, test output, checker output). See `AGENT_OPERATION_PROTOCOL.md` Rule 5
(Evidence Based).

---

## 1. What this project is (30-second orientation)

**History Explorer** — a global history exploration platform. Core idea:
`Explore → Connect → Understand → Discover`. It turns history learning from passive search into
active exploration over a **deterministic, in-memory knowledge graph**.

- **Stack**: React 18 + TypeScript + Vite (frontend) / FastAPI + uvicorn (backend).
- **No runtime AI/LLM in the request path** by deliberate design — the deterministic engine is
  the source of truth. An AI "interpretation layer" exists but is **default OFF**
  (`AI_GATEWAY_ENABLED=false`).
- **No database, no GIS, no login/auth, no new dependencies** (frozen boundary —
  `docs/10_ARCHITECTURE/CURRENT_ARCHITECTURE_BASELINE.md` §3).
- **Dual-track versioning**: Runtime version (e.g. `v0.13.0`) + Project milestone release
  (e.g. `vM77`). See `README.md` §Project Status.
- **Repository**: `https://github.com/mcartney-liu/history-explorer` (public).
- **Product Owner (D8)**: the human "翔哥" — holds all release / tag / scope decision authority.
  An AI Agent holds **no decision authority**.

---

## 2. The authoritative source map (read these, in this order)

| # | File | What it tells an AI | When to read |
|---|---|---|---|
| 1 | `docs/AGENT_OPERATION_PROTOCOL.md` | **Mandatory behavior contract** for every AI Agent (L0–L3 levels, Iron Laws). | **Always, first.** |
| 2 | `docs/10_ARCHITECTURE/CURRENT_ARCHITECTURE_BASELINE.md` | Freeze red lines (schema 8/18, No-DB/No-GIS/No-Auth/No-new-dep, AI only in `ai_gateway/`). | Before ANY change. |
| 3 | `PROJECT_CONTEXT.md` | Current reality: modules, status, known issues. | Before planning. |
| 4 | `PROJECT_ROADMAP.md` | Direction, backlog, debt registry. | Before proposing work. |
| 5 | `docs/ENGINEERING_PLAYBOOK.md` | Release/audit/freeze gates, version policy. | Before commit/tag/release. |
| 6 | `docs/TEAM_OPERATING_SPEC_v1.2.md` | Roles, decision flow, PO authority. | Before escalations. |
| 7 | `docs/15_DECISIONS/` (ADR-*) | Architecture Decisions (e.g. ADR-0003 grounded AI, ADR-0011 AI runtime). | Before touching the relevant subsystem. |
| 8 | `README.md` | Human-facing overview + full milestone history. | For product context. |
| 9 | `.workbuddy/memory/MEMORY.md` | The standing Agent fact baseline (red lines, debt, current state). | If present, as a fast orientation cache — but verify against live files. |

> **Drift warning**: Several docs describe the project at different points in time. The
> **code + `git tag` + checker output are the truth**. If a doc and the code disagree, the code
> wins; report the discrepancy to the PO.

---

## 3. Architecture at a glance (verified against code)

```
Frontend (React/TS)                Backend (FastAPI)
  App.tsx (HashRouter)               main.py (composition root — route-mount only)
  ├ ExploreShell / PackageView       ├ core/knowledge_service.py  (Knowledge facade)
  ├ components/Exploring/*           ├ core/repository.py / global_graph.py  (KG core)
  ├ components/KnowledgeGraph/*     ├ core/exploration_engine.py  (4-dim scoring, recommend_next)
  ├ components/ai/* (9 panels)      ├ core/timeline.py / search.py
  ├ data/aiClient.ts (thin HTTP)    ├ core/domain/  (multi-domain adapter framework)
  ├ data/explorationPackages.ts     ├ core/causal/model.py  (Representation Layer only)
  └ i18n (zh/en/ja)                 ├ core/acquisition/pipeline.py  (deterministic pipeline)
                                    └ ai_gateway/  (grounded interpretation, default OFF)
```

**Engine health snapshot** (see `AGENT_OPERATION_PROTOCOL.md` + code for evidence):
- **Mature & closed-loop**: Knowledge, Exploration (+Recommendation), Search, Timeline.
- **Framework-stage / not yet wired into runtime**: Acquisition (`AcquisitionPipeline` has no
  runtime consumer), Causal (model only, no reasoning/logic layer), Domain (framework built,
  partial integration).
- **AI Gateway**: offline deterministic path mature (Grounding 100% / Hallucination 0); online
  LLM path built but **default OFF and never run in release state**.
- **Do NOT expect**: GIS Engine, Reasoning Engine, dedicated Visualization Engine — these are
  explicitly excluded by the freeze baseline (`CURRENT_ARCHITECTURE_BASELINE.md` §3). Visualization
  is a frontend rendering concern, not a backend Engine.

---

## 4. Iron rules an AI must never violate

1. **Agent = execution only.** No decision authority. Release/tag/push/scope = PO (翔哥).
2. **Unknown = STOP.** Any unknown file, workflow, or rule conflict → stop and report.
3. **Evidence before conclusion.** Verify with `git status` / file reads / test output / checkers.
   Historical conversation is context, never the sole basis.
4. **Freeze red lines are hard:**
   - Do **not** add Neo4j/PostgreSQL/Elasticsearch/Redis/GIS/login-auth.
   - Do **not** add runtime AI/LLM inference outside `backend/app/ai_gateway/`.
   - Do **not** add new dependencies.
   - Do **not** change `ENTITY_TYPES=8` / `RELATIONSHIP_TYPES=18` without the Freeze Revision Gate.
   - Keep API `/api/v1` GET surface stable; changes are additive-only.
5. **Before any write**: run `scripts/freeze-check.mjs` (must PASS) + relevant tests green.
   Before any release: `scripts/release-consistency-check.mjs` R1–R7 PASS + PO authorization.

---

## 5. How to operate safely in this repo

- **L0 (read-only / audit)**: safe by default. Run `scripts/freeze-check.mjs`,
  `scripts/release-consistency-check.mjs --verbose`, `pytest`/`vitest` in observation mode,
  `git status`/`diff`/`log`/`tag --list`/`ls-remote`. No writes, no commit, no push.
- **L1 (implement)**: on a `feature/` branch; modify only allowlisted files (see freeze-check
  SCOPE_ALLOWLIST). Run freeze-check + tests before commit. PO defines scope first.
- **L2 (release)**: merge `--no-ff`, annotated tag, push through gates — **only with PO (D8)
  authorization** and all prerequisites green.
- **L3 (emergency)**: minimal scope; never bypass governance; any freeze touch → escalate to PO.

Mode-specific prompts live in `prompts/` (readonly-audit / task-planning / security-audit /
implementation / release / emergency-fix).

---

## 6. Known debt & open threads (Gate B registry — verify before acting)

> Debt is formally registered by **Gate B** (`artifacts/HEALTH_AUDIT_v1.1_GATE_B_ARCHITECTURE_BACKEND.md`,
> 2026-08-02). Old `Debt-1/2/3` labels from `PROJECT_CONTEXT.md` are superseded by the `DB-Bxx`
> registry below. Confirm against live code before treating as current.

| Debt ID | Name | Severity | State |
|---|---|---|---|
| **DB-B01** | Domain Registry 全局单例跨文件污染 → 契约测试 RED | **High** | **已修（2026-08-02 L1）：`backend/conftest.py` autouse import-baseline 隔离已落地，pytest 331 passed，CI 恢复绿** |
| DB-B02 | M75–M79 新层（domain/causal/acquisition）零 Runtime 消费（parallel wing） | Medium-High | 未接线 |
| DB-B03 | `HISTORY_ONTOLOGY`(6/5) ↔ 全局白名单(8/18) 缺声明式映射层 | Medium | 4/5 关系类型不在白名单，接线即拒 |
| DB-B04 | `RELATIONSHIP_MEANING`（第三词汇源）无漂移守卫 | Medium | 与 DB-B03 可合并 |
| DB-B05 | ADR-M79 Rule 3 与 `validation.py` 冲突（白名单含 caused/influenced/before/after） | Medium | 旧 "Debt-003"；下次 ADR 维护修 |
| DB-B06 | ADR-M79 §Decision `causal_type` 漂移（实现无此字段） | Low | 旧 "Debt-001"；文档超前 |
| DB-B07 | backend 无 `conftest.py`，测试依赖字母序副作用 | Low-Med | 与 DB-B01 同批修 |
| DB-B08 | `registry.py` 类型注解未导入 `typing` | Low-Med | PEP 563 暂掩 |
| DB-B09 | `acquisition/` 绝对导入风格冲突 | Low-Med | 打包风险 |
| DB-B10 | `adapter.py` 死代码 | Low | 顺手清 |
| DB-B11 | PRD 空间维度（四元之一）与 Freeze 排除边界断层未登记 | Medium | **需 PO 决策** |
| DB-B12 | Timeline 架构承载深度低于 PRD（世界同步/朝代/导航滑块无后端结构） | Medium | 待 Gate E |

- **DB-B01 修正归因（2026-08-02 勘误）**：两个测试文件**均有 teardown/fixture 隔离**，但
  `_ADAPTERS` 是模块级全局单例跨文件共享；`test_domain_adapter_contract.py` 文件级结束未还原
  import baseline，残留 `test` adapter 污染后续 `test_m78_2` 的相对快照 → 全量下确定性 1 failed。
  **正确修复 = 加 `backend/conftest.py` autouse 的 import-baseline 强隔离**（Decision 1 选项 A）；
  删除"仅补 teardown"（teardown 已存在）。红灯真实、未登记均属实，Gate B 停止有效。
- **DB-B02/B03 接线风险**：一旦把 domain 数据接入 `validation`，Ontology 5 关系类型中 4 个不在
  白名单 → 全量拒绝。需在 M80 设计前定调词汇源地图。
- **DB-B11 战略断层**：PRD §1.3 把"空间"列为四大核心理念之一并设计 4 类地图，但
  `CURRENT_ARCHITECTURE_BASELINE.md` 把 GIS 列为 Freeze 排除项。两份文档均有效但结论相反，
  **无任何第三份文档记录"空间维度已被有意推迟到 Freeze Revision Gate 之后"**。这是治理空白，
  不是 bug。North Star 文字仍含 Map（第四柱），但当前被冻结且未实现。

---

## 7. First-action checklist for an AI entering this repo

1. Read `docs/AGENT_OPERATION_PROTOCOL.md` (full).
2. Skim `docs/10_ARCHITECTURE/CURRENT_ARCHITECTURE_BASELINE.md` §1–§3.
3. Run `git status` + `git log --oneline -5` + `git tag --list "vM*" | Select-Object -Last 5`
   (PowerShell) to ground yourself in reality.
4. Run `node scripts/freeze-check.mjs` — confirm PASSED before proposing changes.
5. Read `PROJECT_CONTEXT.md` + `PROJECT_ROADMAP.md` for current state & backlog.
6. **Only then** engage the task — and stay within your assigned Agent level.

---

## 8. Local setup (so you can verify, not just talk)

> An external AI cannot run commands itself unless given shell access. These steps are for the
> **human PO / a local Agent** to bring the project up; an external AI (ChatGPT/Claude) should
> *suggest* and *review*, and ask the PO to run them.

**Backend (FastAPI)** — run from `backend/`:
```bash
cd backend
pip install -r requirements.txt        # fastapi, uvicorn, openai (only approved LLM SDK)
uvicorn app.main:app --reload --port 8000
# API base: http://localhost:8000/api/v1
# Docs:     http://localhost:8000/docs
```
- Single approved LLM provider SDK is `openai` (ADR-0003). Do **not** add others.
- `AI_GATEWAY_ENABLED=false` by default → no LLM call at runtime.

**Frontend (React + Vite)** — run from `frontend/`:
```bash
cd frontend
npm install
npm run dev        # Vite dev server (see vite.config.ts for port)
npm run build      # tsc && vite build  → dist/
npm test           # vitest run
```
- Version `0.13.0` (matches Runtime v0.13.0). React 18, TS strict.

**Validation gates (run before proposing/committing):**
```bash
node scripts/freeze-check.mjs              # must EXIT 0 / "PASSED"
cd backend && python -m pytest -q         # target: 318 passed (per README M77)
cd frontend && npm test                   # vitest
node scripts/release-consistency-check.mjs --verbose   # R1–R7 before any release
```

---

## 9. Key files & directories (verified paths)

| Path | Role | Notes |
|---|---|---|
| `backend/app/main.py` | Composition root — route-mount only | No business logic; mounts `ai_gateway` routes (freeze §5). |
| `backend/app/core/knowledge_service.py` | Knowledge Engine facade | Aggregates repository + global_graph. |
| `backend/app/core/repository.py` | Entity/relationship dataclasses | 8 entity types / 18 relationship types (frozen). |
| `backend/app/core/global_graph.py` | In-memory knowledge graph | Singleton; no persistence (No-DB). |
| `backend/app/core/exploration_engine.py` | Exploration Engine | 4-dim scoring (REL .35/TEMP .25/IMP .20/SIMP .20), `recommend_next`. |
| `backend/app/core/timeline.py`, `search.py` | Timeline / Search Engines | Mature, memory-only. |
| `backend/app/core/domain/` | Domain adapter framework | `ontology.py`(6/5), `adapter.py`, `registry.py`. M76/M77/M78. |
| `backend/app/core/causal/model.py` | Causal Representation Layer | `CausalStatement` dataclass — model only, no reasoning engine. |
| `backend/app/core/acquisition/pipeline.py` | Acquisition pipeline | `AcquisitionPipeline` built (M75) but **no runtime consumer**. |
| `backend/app/ai_gateway/` | Grounded AI interpretation | `grounding_builder`, `answer_service`, `response_validator`. Default OFF. |
| `backend/app/validation.py` | Schema white-list (8/18) | `build_global_validation_report`. |
| `frontend/src/App.tsx` | HashRouter, 3 views | ExploreShell / Package / etc. |
| `frontend/src/components/Exploring/*` | Exploration UI (5 zones) | Entity → Relationship → Timeline loop. |
| `frontend/src/components/ai/*` | 9 AI panels | Render `ai_gateway` output. |
| `docs/10_ARCHITECTURE/CURRENT_ARCHITECTURE_BASELINE.md` | **Freeze red lines** | Read before ANY change. |
| `docs/15_DECISIONS/ADR-*.md` | Architecture Decisions | ADR-0003 (grounded AI), ADR-0011 (AI runtime). |
| `scripts/freeze-check.mjs`, `scripts/release-consistency-check.mjs` | Guard rails | Must pass before write/release. |

---

## 10. Current reality snapshot (verify with `git` — this is a point-in-time note)

> Last grounded: 2026-08-02. Re-confirm with `git tag --list "vM*"` + `git log -1` before relying on it.

- **Default branch**: `master`. Local == `origin/master` (`bb36a55…`, 0/0 sync, clean tree).
- **Latest release tag**: `vM77` (2026-08-01) — Multi-Domain Ontology Framework Validation.
  Runtime `v0.13.0`.
- **Test truth (2026-08-02 实跑)**:
  - Backend: **pytest 1 failed / 330 passed（修复前快照，2026-08-02 实跑）** — 唯一红灯 =
    `test_m78_2_registry_lifecycle`（DB-B01，契约污染，详见 §6/§14）。**README 的 "318 passed" 已过时**。
    **修复后（2026-08-02 L1，加 `backend/conftest.py` autouse 隔离）：`331 passed`，DB-B01 RED 已消除，CI 恢复绿。**
  - Frontend: **vitest 1123 passed**（用 `npm test` = `vitest run`，勿用裸 `vitest` 防 watch）。
  - E2E: Playwright 12 例本地 Alpha 回归（`workers=1` 串行防 flaky；后端 :8000 前置）。
- **M78 + M79**: 12 commits already **pushed** to `origin/master` but **no tag / no Release Gate**
  (PO decision: push-only, tag-suspended). GitHub front shows vM77 — expected, not a miss.
  ADR-M78/SB/RL（domain boundary + registry lifecycle）与 ADR-M79（causal boundary）均 Proposed。
- **ADR drift** (DB-B05 Rule 3 / DB-B06 `causal_type`) — **unfixed**; resolve before any M78/M79
  release gate (见 §6)。
- **Acquisition / Causal**: built but **not wired into runtime** (见 §3, §6, §15)。
- **Freeze**: PASSED — no D-class violation。
- **M80**: "Intelligence Layer 收敛"进行中 (见 §17) —— Gate B 已完成待 PO Review 四项 Decision。

---

## 11. How an external AI collaborates with the PO (decision protocol)

The PO ("翔哥") holds **all** decision authority. An AI is a **thinking partner**, not a decider.

1. **AI may**: analyze code, list options with trade-offs, draft ADRs/plans, flag risks, write
   proposed diffs for review, run read-only checks.
2. **AI must STOP and ask** before: any scope change, any tag/release/push, any freeze-boundary
   touch, any new dependency, any change to 8/18 schema.
3. **Preferred output format when advising the PO** (copy-paste friendly):
   ```
   ## Recommendation
   <one-line verdict>

   ## Options
   - Option A: <what> | Pros: … | Cons: … | Risk: …
   - Option B: …

   ## Evidence
   - <file:line> proves …
   - <checker output> shows …

   ## My pick & why
   <option> because <reason>

   ## What I need from PO
   - Approve scope? / Pick A or B? / Authorize tag?
   ```
4. **Disagreement handling**: if code/docs disagree, code wins; report to PO. If PO instruction
   conflicts with a freeze red line, AI must **refuse and escalate**, not silently comply.

---

## 12. Common task playbooks (L0–L2)

**A. Read-only health/audit review (L0, safe)**
```
git status; git log --oneline -5; git tag --list "vM*" | tail -5
node scripts/freeze-check.mjs
cd backend && python -m pytest -q
# read the relevant engine file + its ADR, then report with evidence
```

**B. Propose a change / plan (L1 prep)**
- Read `CURRENT_ARCHITECTURE_BASELINE.md` §1–§3 + the target engine file.
- Confirm the file is in `freeze-check` SCOPE_ALLOWLIST; if not, the change needs PO + Gate.
- Produce a plan with evidence; do **not** edit until PO scopes it and you are on a `feature/` branch.

**C. Implement (L1)**
- Branch `feature/<scope>`. Edit only allowlisted files. Run freeze-check + tests green before commit.
- Keep API `/api/v1` GET surface additive-only; never mutate the KG core semantics.

**D. Release (L2) — PO only**
- Prereqs: freeze-check PASS + `release-consistency-check` R1–R7 PASS + unresolved debt closed
  (e.g. M79 ADR drift) + PO authorization.
- Flow: merge `--no-ff` → annotated tag `vMxx` → push through gate. AI never triggers this alone.

---

## 13. FAQ / common traps for an AI

- **"Where is the GIS / map engine?"** — There is none. GIS is **explicitly forbidden** by the
  freeze baseline. Do not propose one without a Freeze Revision Gate + PO approval.
- **"Can I add a database / Redis / Elasticsearch?"** — No. No-DB is a hard red line.
- **"Why doesn't the AI answer anything?"** — `AI_GATEWAY_ENABLED=false` by default; the online
  LLM path is built but not run in release state. The offline deterministic path is what ships.
- **"The ontology is 6/5 but validation is 8/18 — which is right?"** — Both exist; it is now
  **DB-B03** (no mapping layer, §6). Treat 8/18 as the global frozen schema; 6/5 is the default
  history domain ontology. Do not "fix" by editing either without the mapping-layer plan + PO sign-off.
- **"Can I just commit/push?"** — No. Commits need PO scope; pushes/tags/releases need explicit PO
  authorization. Read-only is always safe.
- **"Docs disagree with code."** — Code + `git tag` + checker output are truth. Report the drift.
- **"Is there a dual AI system (AISidebar mock vs real aiClient)?"** — No product-level dual AI.
  `data/aiClient.ts` (real `ai_gateway` HTTP) is the **live** path, consumed by `useCompanionAI`,
  `RelationshipInsight`, `TrustDisplay`. `AISidebar.tsx` + `AIOrchestrator.ts` (canned mock) are
  **dead code** (only referenced by `DevCatalog.tsx`, a dev showcase; no product mount point).
  `EntityHero`'s `onAskAI` was hidden in M60 ("mock AI is a liability"). The "dual AI" framing in
  `TECH_ROUTE_EVALUATION.md` is **outdated** — the mock path is not the product main route.
- **"Why does `npm test` pass but `vitest` hangs?"** — bare `vitest` enters watch mode. Use
  `npm test` (= `vitest run`) for CI/headless. Same gotcha in PowerShell terminals.

---

## 14. Gate B audit baseline (2026-08-02, fact source)

`artifacts/HEALTH_AUDIT_v1.1_GATE_B_ARCHITECTURE_BACKEND.md` is the **authoritative health fact
baseline** (Health Score **85/100**, Decision score 85/100, Tests 78/100). 13 Findings (B-01~B-13),
12 Debts (DB-B01~DB-B12), 4 PO Decisions, 1 Risk (schedule). Key verified facts:

- **Health by engine**: Knowledge 91 / Exploration 90 / Search 88 / Timeline 86 / **AI 95 (best)**
  / Domain 76 (worst, due to contract RED + unwired + zero runtime). Science 75, Type Safety 80,
  Test 78, Doc 90, Governance 84.
- **AI is the healthiest layer** (B-11 PASS): zero graph writes, default OFF, never throws
  (degrades to deterministic), independent outbound validation. This is the project's strongest
  governance outcome — preserve it.
- **Gate B stopped at DB-B01** (contract RED). Did not advance to Gate C (data quality) or E
  (timeline depth). Push-only; no tag.
- **4 PO Decisions required before M80 advances** (see §17).
- **CI truth (verified 2026-08-02)**: `.github/workflows/ci.yml` runs 3 mandatory jobs on every
  `push`/`pull_request` to `master` — `frontend` (`npm test` + `npm run build`), `backend`
  (`python -m pytest -q`), `freeze-check`. **The backend job WILL fail on DB-B01 → CI is currently
  RED on master** (this is the R-B2 red-line risk from Gate B, now confirmed by reading the workflow).
  ⚠️ The file's header comments *say* "disable direct push to master (force feature-branch + --no-ff)",
  but our earlier `git push origin master` succeeded — implying the branch-protection rule is **not
  actually enforced**. Treat this as a real governance gap: DB-B01 must be fixed or CI stays red, and
  master protection should be verified on GitHub.

> ⚠️ `TECH_ROUTE_EVALUATION.md` (root) is **partially outdated**: its "M43–M49 zero consumption"
> claim is false (consumed by `ExplorationInsightPanel` since M66), and its "dual AI" framing is
> false (see FAQ). Treat Gate B as the newer, higher-truth source.

## 15. Real data scale & the exploration-package parallel vocabulary

**Knowledge base (what `backend` actually loads)** — `data/examples/` is the ONLY directory the API
reads (per `data/README.md`). Verified 2026-08-02:
- **9 topics / 145 entities / 211 relationships / 27 timeline nodes.**
- This matches the handover report's "145/211/9" exactly — that report's data claim is **accurate**,
  not stale. (M68 "+729" is China dataset's *internal field count*, not total entity count.)
- **Entity-type coverage (verified)**: 145 entities span all 8 declared types — Person 35 / Location
  21 / Event 21 / Idea 21 / Technology 14 / Civilization 12 / Time Period 12 / Religion 9. No
  zero-usage dead entity type.
- **Relationship-type distribution (verified, 2026-08-02)** — 211 rels use **18 distinct types**:
  `influenced` 44 / `located_at` 27 / `spread` 19 / `participated_in` 16 / `related_to` 14 /
  `ruled` 9 / `practiced` 9 / `traded_with` 9 / `inherited` 7 / `caused` 10 / `before` 12 /
  `invented` 12 / `part_of` 11 / `contemporary_with` 3 / `spoke` 3 / `conquered` 3 / `after` 2 /
  `discovered` 1.
  - **⚠️ White-list reality (corrects Gate B understatement)**: the 18-token frozen white-list
    (`validation.py`) only *contains* 10 of the 18 types actually used in data — **8 used types are
    OFF the white-list**: `located_at` (27, 2nd highest!), `practiced`, `spread`, `contemporary_with`,
    `invented`, `inherited`, `spoke`, `discovered`. Causal types `caused`/`influenced`/`before`/`after`
    are on the list (68 rels total), but **~143 / 211 (≈68%) of relationships use OFF-white-list
    types**. If `validation.py` is ever enforced strictly at ingest, the KG would reject ~2/3 of its
    own data. **DB-B03 severity is therefore HIGHER than Gate B's "4/5 types missing" wording implies
    — it is 8/18 used types undeclared, including high-frequency ones.**

**Other data files (also loaded, not the KG core)**:
- `data/evidence_claims.json` — 76 evidence claims (`knowledge_service`).
- `data/sources.json` — 43 curated sources (`dataset_provider`).
- `data/exploration_packages.json` — 4 packages (china / silk-road / roman / india), **product-layer
  exploration contracts consumed by `ExplorationPackagePage`**, NOT loaded by backend KG.

**⚠️ Parallel vocabulary risk (DB-B04)**: `exploration_packages.json` `relationship_paths[].type`
uses tokens like `inherited / participated_in / located_at / invented / spread / traded_with /
practiced / ruled / contemporary_with / related_to` — **far beyond the 18-relationship white-list**.
This is a **third relationship vocabulary** (alongside `repository.py` 18 + `RELATIONSHIP_MEANING`).
If the frontend ever feeds package paths back into the KG, it will hit the white-list wall. Today
it is a separate product-layer vocabulary; flag before any cross-layer wiring.

**Causal chain (KG reality, 4 segments — not one)**:
`data/examples/*.json` (211 rels, source) → `validation.py` (18-token white-list incl.
caused/influenced/before/after) → `graph.py` `Edge.type` (opaque storage) →
`exploration_engine.py` `RELATIONSHIP_MEANING` (weights: caused 1.00 / influenced 0.95 /
before,after 0.60). `core/causal/model.py` (`CausalStatement`, 6 fields, no `causal_type`) is
**representation-only and consumed by tests only** — not in this live chain. Causal semantics today
= edge-type + weight. The Causal Layer (ADR-M79) is a reserved position.

## 16. Frontend AI reality (verified)

- **Live**: `frontend/src/data/aiClient.ts` → `useCompanionAI.ts`, `RelationshipInsight.tsx`,
  `TrustDisplay.tsx`, tests. Calls `/api/v1/ai/explain`, `/ai/chat`, `/ai/suggestions`. This is
  the product AI path (grounded, default OFF via `AI_GATEWAY_ENABLED`).
- **Dead/Dev-only**: `AISidebar.tsx` + `AIOrchestrator.ts` (canned mock, comment "mock today →
  aiClient in production") — referenced only by `DevCatalog.tsx`; no product mount. `EntityHero`
  dropped `onAskAI` in M60.
- **Takeaway for an AI**: when asked to "wire up AI", target `aiClient` + the live consumers, never
  `AISidebar`. Do not assume two parallel AI systems ship.

## 17. M80 strategy & the 4 PO decisions (decision-protocol context)

**M80 = "Intelligence Layer 收敛"** (NOT feature-add). Per `artifacts/MILESTONE_TIMELINE_M1_TO_M80.md`:
converge the M43–M49 *implicit* intelligence (accumulated across milestones) into an *explicit,
bounded* Intelligence Layer. Layered target: `Knowledge → Interpretation → Intelligence`. Red line:
Ontology MUST NOT gain AI/Reasoning fields. Gate B done & stopped; awaiting PO Review of 4 Decisions.

**The 4 PO decisions (AI must NOT decide; present options + evidence, ask PO)**:
1. **DB-B01 fix approach** — Option A: add `backend/conftest.py` autouse import-baseline isolation
   (recommended; fixes root cause) vs other. *(Avoid the obsolete "just add teardown" — teardown
   already exists; the bug is cross-file `_ADAPTERS` global shared state.)*
2. **Vocabulary governance** — how many relationship vocabularies? Map `HISTORY_ONTOLOGY`(6/5) ↔
   white-list(8/18) ↔ `RELATIONSHIP_MEANING` ↔ `exploration_packages.json` (DB-B03/04/11).
3. **ADR-M79 drift** — resolve DB-B05 (Rule 3 vs validation) + DB-B06 (`causal_type`) before any
   M78/M79 tag.
4. **PRD spatial dimension (DB-B11)** — is Map/GIS a P0/P1/P2? Today North Star text includes Map
   (4th pillar) but Freeze excludes GIS and no Map engine exists. Needs explicit PO ruling to close
   the product-architecture collision.

**Release intent of M78/M79**: already pushed `origin/master`, intentionally **not tagged** (each
Gate forbids `--tags`). This is a deliberate "push-only, release-deferred" flow, not a miss.

## 18. Gate C/D verification + AI boundary iron laws (2026-08-02)

**Gate C (data quality) — partly self-verified**: the 211-rel distribution above (§15) IS the Gate-C
evidence Gate B deferred. Conclusion: data quality risk is **real and large** (68% of rels off
white-list), but it is a *schema-declaration* gap (DB-B03), not corrupt data. Entity coverage is clean.
Full Gate C (claim↔source↔entity traceability, zero-confidence cleanup) is still not executed.

**Gate D (frontend integration) — spot-verified**:
- `AIRegistry.ts` (M59-012) is a **frontend-side capability catalog** (`ALL_CAPABILITIES` in
  `AICapabilities.ts`), triggered by `currentView` (timeline/graph/map/entity). It is **NOT** a 1:1
  mirror of backend `ai_gateway` modules — the two are parallel capability declarations. Do not assume
  "registry entry ⇔ backend module".
- `MultiEntityTimeline.tsx` (M8-P1) is **PURE presentational**: derives bar ranges from existing entity
  date fields via deterministic `temporalAxis`; explicitly forbids AI/LLM/sorting/civilization
  inference. Confirms frontend self-aggregates (no new backend fetch) and obeys Freeze R7 (AI is an
  additive overlay, never mutates deterministic behavior).
- **AI-off degradation**: per ADR-0011 §7 + M74 Freeze, no-source / no-claim / low-confidence all fall
  back to deterministic summary or graceful empty state (the `EmptyState` pattern exists in
  `MultiEntityTimeline`). The 9 AI panels should render degraded, not error, when `AI_GATEWAY_ENABLED`
  is false.
- **QuickStart 400**: M74 §L1 already plans to fix its 400 defect (semantically rerouted to search).
  Known + planned, not a surprise bug.

**AI boundary iron laws (from M74 Freeze + ADR-0011, fully read)**:
- AI = Interpretation Layer; KG = Fact Layer. **8 permanent red lines (R1–R8)**; **Agent / Multi-Agent
  explicitly EXCLUDED by Freeze §9** (re-evaluated only at M80+).
- ADR-0011 (PROPOSED) chose **Option B** (Backend AI Gateway + grounded generation); rejected
  frontend-direct-LLM (key exposure) and agent frameworks. Activation needs a Freeze Revision Gate.
- **Write-to-KG iron law**: any write must go through governance + a Gate — **never runtime-only
  writes**. This single rule explains why `core/causal/model.py` is test-only and the M75–M79 layer
  has zero runtime consumption: it is *intentional freeze discipline*, not a debt oversight.

---

*This file is additive documentation. It introduces no code, no dependency, and no change to the
freeze baseline. It is the orientation layer that complements — never replaces —
`docs/AGENT_OPERATION_PROTOCOL.md`.*
