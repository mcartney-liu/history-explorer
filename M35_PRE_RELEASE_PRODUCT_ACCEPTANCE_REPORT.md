# M35 Pre-Release Product Acceptance Report

- **Milestone:** M35 — User Exploration Experience MVP
- **Phase:** Pre-Release Product Acceptance (Phase 3 gate before Phase 4 Release)
- **Mode:** STRICT GOVERNANCE / READ-ONLY — no code change, no commit/push/merge/tag/release
- **Date:** 2026-07-27
- **Verifier:** 小梦 (browser-driven walk-through via agent-browser / Chromium)
- **Runtime:** frontend dev server `http://localhost:5173` (vite), backend `http://localhost:8000` (fastapi 0.6.0). Both reachable (HTTP 200).

---

## Environment Invariants (acceptance step 4)

| Check | Result | Evidence |
|---|---|---|
| freeze-check | **PASS** (exit 0, no D-class violations) | `node scripts/freeze-check.mjs` → `[M3.5 Freeze Guard] PASSED — no D-class violations.` |
| git HEAD | `35e800a` (tag `vM34.1`) | `git rev-parse HEAD` |
| git status (M35 files) | 12 source files uncommitted + 1 env artifact | `git status --porcelain` (below) |
| frontend runtime | `0.13.0` | `frontend/package.json` `"version"` |
| backend runtime | `0.6.0` | backend startup log |
| dependencies | **0 added** (package.json / package-lock.json unchanged) | `git status` shows no manifest change |

**M35 source files (uncommitted, expected for pre-release acceptance):**
- Modified (3): `frontend/src/App.tsx`, `frontend/src/components/EntityPage.tsx`, `scripts/freeze-check.mjs`
- Untracked (9): `frontend/src/components/FeedbackWidget.tsx`, `frontend/src/components/FeedbackWidget.test.tsx`, `frontend/src/data/narrative.ts`, `frontend/src/data/narrative.test.ts`, `frontend/src/lib/journey.ts`, `frontend/src/lib/journey.test.ts`, `frontend/src/components/exploration/`, `frontend/src/components/journey/`, `frontend/src/pages/`
- Untracked env artifact (1, **not M35**): `.pip_target/` — backend Python dependencies installed locally to run the API; not part of the feature, not flagged by freeze-check.

---

## 1. User Journey 验证结果

Walk-through path: Landing/Home → Discover → Silk Road → StorySection → Buddhism entity → Roman Empire entity → Journey Panel → Feedback Widget.

| # | Step | Reachable | Click / expected | Narrative | Notes |
|---|---|---|---|---|---|
| 1 | Landing / Home | ✅ | H1 "History Explorer", hero "原来历史还能这样探索。", Featured "Explore Silk Road", Popular list, JourneyPanel (探索足迹), Feedback (有用/没用 + textarea) | — | Initial `!current` view renders correctly. |
| 2 | Discover → Silk Road | ✅ | Click "Explore Silk Road" → Silk Road topic page | — | Rich content: Main Entity, Relationship Network, Knowledge Graph, Connected Topics (incl. Roman Empire), Timeline, Temporal Comparison, AI panels (disabled, no AI backend by design). |
| 3 | Silk Road → StorySection | ⚠️ | Topic page loads, but **no StorySection / curated narrative** | **Absent on topic page** | The `silk_road` narrative block in `narrative.ts` is **orphaned** — `StorySection`/`WhyImportantPanel` are only mounted on EntityPage, never on the topic page. (UX issue U1.) |
| 4 | Buddhism entity | ✅ (reachable) | Search "buddhism" → "Open Buddhism" → entity page | **Renders only via full-global-id path** | Via search (bare id `religion-buddhism`): entity page loads but **curated story missing**. Via topic link (Ancient India → "Open religion-buddhism", full gid): curated story + whyImportant render correctly. (UX issue U2.) |
| 5 | Roman Empire entity | ✅ | Roman topic → "Open civ-roman" → entity page | ✅ Renders | Story ("罗马文明是丝绸之路西端的巨型买家…") + whyImportant ("罗马代表丝绸之路的西方终点…") both present. |
| 6 | Journey Panel | ✅ | Every navigation recorded | — | 5 entries accumulated: Silk Road, Zhang Qian, Buddhism×2, Roman Civilization. "Revisit" buttons work; breadcrumb trail correct. (M35 Feature D OK.) |
| 7 | Feedback Widget | ✅ | Click "有用" → "已收到，谢谢你的反馈！" | — | localStorage write (`history_explorer_feedback`) confirmed. (M35 Feature E OK.) |

**Summary:** Core navigation works end-to-end. Entity pages, Journey trace, and Feedback all function. The curated narrative (the headline "story" of the Demo Chain) renders correctly **only when the entity is reached via a topic-page "Open" link** (full global_id); it is missing on the Silk Road topic page and missing when the entity is opened via search (bare id).

---

## 2. UX 问题列表

- **U1 — Orphaned Silk Road narrative (medium).** `narrative.ts` defines a curated `silk_road` story/whyImportant block, but `StorySection`/`WhyImportantPanel` are mounted exclusively on `EntityPage`. The Silk Road **topic** page never renders the curated story, so the Demo Chain's opening chapter has no narrative on its own page.
- **U2 — Search→entity narrative key mismatch (high, primary discovery path).** `EntityPage` builds the narrative lookup key from `current.id` (the navigation id). Search results supply a **bare id** (e.g. `religion-buddhism`), while `NARRATIVE` is keyed on the **full global_id** (`ancient_india:religion-buddhism`). Result: a user who searches "Buddhism" and opens the entity sees **no curated story**. Only topic-page "Open" links (which pass the full gid) show it. This breaks the headline Demo Chain for the most natural entry path.
- **U3 — Search overlay does not auto-close (low).** After selecting a search result, the results panel stays on top until "Clear" is clicked. Minor; the underlying page is reachable but hidden.
- **U4 — CORS origin sensitivity (deployment/test caveat, non-defect).** Backend CORS allowlist permits only `http://localhost:5173`. Opening the app at `http://127.0.0.1:5173` makes every API fetch fail with "Connection problem". The supported preview URL is `localhost:5173`; this is by-design but must be documented for testers/reviewers.
- **U5 — Below-fold controls (test-harness note, non-defect).** Entity "Open" buttons and the Feedback widget sit far down long pages; `agent-browser click @ref` missed them until `scrollintoview` was used. Real users scroll naturally — not a product defect, but relevant for automated UI testing.

---

## 3. Release Blocker 判断

- **No hard blockers.** No crashes, no broken navigation, no governance violations (freeze-check green), no new dependencies. The freeze baseline is intact.
- **Functional gaps are consistency/quality defects, not breakage:**
  - U1 (orphaned Silk Road narrative) — content gap, degrades the Demo Chain opener.
  - U2 (search→entity narrative missing) — the most impactful: the primary discovery path (search) lands users on entity pages **without** the curated story that is M35's centerpiece.
- **Severity:** U2 should be treated as a **release-class fix** (fix before or immediately with Phase 4) to honor the Demo Chain intent; U1 as fast-follow; U3/U4 non-blocking (document + optional polish).

---

## 4. 是否建议进入 Phase 4 Release

**Recommendation: 建议进入 Phase 4 Release (GO)** — with the following conditions tracked:

1. **(Recommended, pre-/with-release fix)** Resolve **U2** — align the narrative lookup key with the search-supplied bare id (e.g. derive full global_id from `topic:id`, or key `NARRATIVE` on bare ids too). This restores the curated story on the search→entity path, which is the Demo Chain's primary route.
2. **(Fast-follow)** Resolve **U1** — surface the `silk_road` curated narrative on the Silk Road topic page (or accept it as entity-only and remove the orphaned block to avoid dead content).
3. **(Non-blocking)** Document **U4** (use `localhost:5173`, not `127.0.0.1`) and consider **U3** polish.

**Rationale:** The M35 MVP's core experience is functional and governance-clean. The narrative consistency issues (U1/U2) weaken the headline Demo Chain but do not break navigation or crash the app. Entering Phase 4 is safe; shipping U2 unfixed would undercut the feature's stated value, so it is flagged as a must-fix-before-or-with-release item.

---

## Verification Evidence (reproducible)

- Browser: agent-browser 0.27.0 / Chromium, origin `http://localhost:5173`.
- Endpoints verified live: `GET /explore/silk_road` (200), `GET /entity/ancient_india:religion-buddhism` (200), `GET /entity/religion-buddhism` (200, bare id accepted), `GET /search?q=buddhism` (200; entity result `id=religion-buddhism`, `global_id=None`).
- Narrative text confirmed present in DOM via full-global-id path: Buddhism ("佛教于公元前数世纪在古印度兴起…帕米尔高原…石窟与寺院" + "作为世界主要宗教之一…") and Roman ("罗马文明是丝绸之路西端的巨型买家与生产者…" + "罗马代表丝绸之路的西方终点…").
- Feedback confirmation "已收到，谢谢你的反馈！" observed in DOM after clicking 有用.

*Generated under STRICT GOVERNANCE / READ-ONLY. No source files modified; no git write operations performed. M35 source files remain uncommitted pending PO release decision.*

---

## 5. M35 Release Quality Corrections (PO-approved, 2026-07-27)

Three release-quality fixes are shipped inside the M35 Release. They are **Release Quality Fixes, NOT feature-scope expansion**:

| # | Fix | File(s) | Nature |
|---|-----|---------|--------|
| A1-c | CI frontend job `npm ci` → `npm install` + corrected `cache-dependency-path: frontend/package.json` | `.github/workflows/ci.yml` | CI infra only (`package-lock.json` is gitignored, `npm ci` cannot run) |
| B1 | Duplicated `Byzantium` alias removed from `civ-byzantine` (kept on `loc-constantinople`) | `data/examples/roman_empire_example.json` | Data quality — eliminates `DUPLICATE_ALIAS` validation warning (4 CI test failures) |
| RI | Test assertion synced to legitimately-enriched `person-augustus.location == "Roman Italy"` | `backend/tests/test_search_index.py` + `scripts/freeze-check.mjs` (SCOPE_ALLOWLIST registration) | Test/data drift fix via PO-approved single-file Freeze Revision Gate |

**Invariants preserved (all seven):**

1. No new feature added
2. No `backend/app` change
3. No schema change
4. `ENTITY_TYPES = 8` untouched
5. `RELATIONSHIP_TYPES = 18` untouched
6. Zero new dependency
7. Runtime stays `0.13.0`

**Verification after corrections:** freeze-check PASSED (EXIT 0); backend **219 passed**; frontend **569 passed**; governance tests **9/9**.
