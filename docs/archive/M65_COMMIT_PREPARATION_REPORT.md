# M65 COMMIT PREPARATION REPORT

**Mode:** Read-only audit — no commit / push / merge / code change
**Generated:** 2026-07-30 (GMT+8)
**Verified HEAD:** `a690645cb3b3ff04242042f1ab35ad8fc96a5df3`
**Verified describe:** `vM62.5-39-ga690645`
**Working tree:** 8 modified + 19 untracked (27 `git status --porcelain` lines)
**Branch:** `master`, ahead of `origin/master` by 58 commits

---

## 1. Runtime Version Strategy

**Decision: KEEP `frontend/package.json` version = `0.13.0` — NO bump.**

**Evidence (real-time):** `git diff frontend/package.json` adds only
`"jsdom": "^29.1.1"` under `devDependencies`. The `"version"` field is
unchanged at `0.13.0`.

**Reason (recorded):**
1. Dual-track rule: runtime semver bumps ONLY on runtime/feature changes.
   M65 introduces no shipped runtime-behavior change requiring a version increment.
2. M65 scope = frontend test coverage (A04) + visual-token consolidation (A03)
   + AI companion model decision (A01) + bug fixes (rail overflow,
   CompanionContext reducer). No API/contract change, **backend diff = 0**,
   `ENTITY_TYPES`=8 / `RELATIONSHIP_TYPES`=18 unchanged.
3. `jsdom` is a devDependency (test harness), not a production/runtime dependency —
   does not affect the shipped artifact version.
4. A premature bump would desync the project-tag convention (current `vM62.5`)
   and imply a release-worthy runtime change that M65 is not yet (pending PO sign-off).

**Conclusion:** `0.13.0` retained. If PO later decides M65 warrants a release,
the version bump happens at release time per dual-track rule — not now.

---

## 2. `artifacts/` Gitignore Check

**Finding:** `artifacts/` is **NOT** ignored. `.gitignore` has a
"Generated task report artifacts" section (line 4) listing only
`REPOSITORY_INIT_REPORT.html`. `artifacts/` (contains `HEP-UX-Eval-2026-07-30.md`,
8.0K — a generated UX-eval output) is currently untracked and would be swept in
by any `git add -A`.

**Recommendation: YES — add `artifacts/` to `.gitignore`.** It is a generated
eval artifact, not product source, and fits the existing section pattern.

**Proposed `.gitignore` addition (NOT applied in this read-only audit):**
```gitignore
# Generated task report artifacts
REPOSITORY_INIT_REPORT.html
artifacts/          # ← add this line
```

**Action:** Only proposed. No modification made.

---

## 3. Commit Boundary Separation

### Evaluation
The 8 modified files split cleanly by concern **except**
`frontend/src/styles/layout-grid.css`, which contains both the Workspace Rail
Fix and the A02 Companion-shell CSS in **distinct hunks** (verified via
`git diff`):

| Hunk | Region | Belongs to |
|------|--------|-----------|
| `@54` | `.ws-rail { overflow: visible }` + comment | Rail Fix |
| `@70` | `.ws` overlay `max-height/overflow` (scroll delegation) | Rail Fix |
| `@94` | `.companion-shell` block (+61 lines) | M65-A02 |
| `@106` | `.ws-rail-collapsed`/`.ws-rail-expand`/`.ws-rail-collapse` restyle | Rail Fix |

So the rail fix and companion-shell are **cleanly separable at hunk level**.

**Recommendation (Option A — recommended): TWO commits**, split via
`git add -p` on `layout-grid.css`.
- Rationale: bug fix (rail overlay clipping) vs feature/styling work deserve
  separate, bisectable history; cleanly separable; user requested an independent
  Rail Fix commit.
- **Alternative (Option B):** single M65 commit (fold rail fix in). Simpler,
  avoids `git add -p` fragility, but loses rail-fix isolation.

### Final `git add` file list — Option A (recommended)

**Commit 1 — `feat(m65): AI companion model, entity token SSOT & real-AI test coverage`**
- `frontend/package.json` (jsdom devDep)
- `frontend/src/components/GraphViewPanel.tsx`
- `frontend/src/components/RelationshipInsightPanel.tsx`
- `frontend/src/components/RelationshipPathGraph.tsx`
- `frontend/src/components/ai/CompanionContext.tsx`
- `frontend/src/styles/layout-grid.css`  ← **hunk `@94` ONLY** (companion-shell)
- `scripts/freeze-check.mjs`
- `frontend/src/components/ai/useCompanionAI.test.tsx`  (untracked, add)
- `frontend/src/data/aiClient.test.ts`  (untracked, add)
- `frontend/src/lib/entityColors.ts`  (untracked, add)
- `docs/15_DECISIONS/ADR-0007-ai-companion-model.md`  (untracked, add)

**Commit 2 — `fix(m65): workspace rail overlay clipping & a11y`**
- `frontend/src/styles/layout-grid.css`  ← **hunks `@54`, `@70`, `@106` ONLY**
- `frontend/src/components/workspace/WorkspacePanel.tsx` (aria-expanded)

### Excluded files (NOT in either commit)
- `artifacts/` — generated eval output; propose gitignore (see §2)
- `docs/15_DECISIONS/HEALTHCHECK_2026-07-30_{ARCHITECT,BACKEND,DESIGNER,DEVOPS,DIRECTOR,FRONTEND,PM,QA}.md` (8 files) — separate healthcheck work, out of M65 scope
- `docs/M63_DECISION_WORKSHOP.md` — M63 planning, out of M65 scope
- `M65-A04_CLOSURE_AUDIT_PACKET.md`, `M65-A04_COMPANION_CONTEXT_FIX_DECISION_NOTE.md`, `M65-A04_FINAL_VERIFICATION_REPORT.md`, `M65_WORKSPACE_RAIL_FIX_REPORT.md`, `WORKSPACE_RAIL_BUG_VERIFICATION.md` (5 files) — M65 verification/audit artifacts, not product source; recommend archiving separately or gitignoring

### Whether `.gitignore` needs modification
- **YES** (for `artifacts/`), but **only proposed** — not applied in this
  read-only audit. If PO accepts, apply before Commit 1 so `artifacts/` is
  excluded automatically.

### Can commit be executed?
- **Readiness: YES (pending PO sign-off).** Per M65 Final Closure Audit:
  Blockers = 0; `freeze-check` PASS, `visual-check` PASS, `tsc` 0 errors,
  `vitest` 962 passed. Working tree is coherent.
- **Gates before executing commit:**
  1. PO decides single (B) vs two (A) commits.
  2. If two commits: `git add -p frontend/src/styles/layout-grid.css` selecting
     the documented hunks; stage `WorkspacePanel.tsx` into Commit 2, rest into Commit 1.
  3. (Recommended) Apply `artifacts/` to `.gitignore` first so it is excluded.
  4. Use explicit file lists — **NEVER `git add -A`** (would pull in
     HEALTHCHECK / M63 / report md / artifacts).
- **This audit did NOT commit.** Status remains: 8 modified + 19 untracked,
  HEAD = `a690645`.

---

## Appendix — Real-time verification (source: `git`, 2026-07-30)
- `git rev-parse HEAD` → `a690645cb3b3ff04242042f1ab35ad8fc96a5df3`
- `git diff --stat` → 8 files, +128 / -51
- `package.json` → `version` 0.13.0, +`jsdom` devDep only
- `artifacts/` → 1 file `HEP-UX-Eval-2026-07-30.md` (8.0K)
- LF/CRLF normalization warning on `layout-grid.css` & `CompanionContext.tsx`
  (line-ending only, non-blocking)
