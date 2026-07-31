# M65 STAGING PLAN REPORT

**Mode:** Staging prep — NO `git add` / NO commit / NO push / NO merge / NO code modification
(except the authorized `.gitignore` edit in Step 1)
**Generated:** 2026-07-30 (GMT+8)
**Verified HEAD:** `a690645cb3b3ff04242042f1ab35ad8fc96a5df3`
**Working tree (post `.gitignore` edit):** 9 modified (incl. `.gitignore`) + 19 untracked;
`artifacts/` now **IGNORED**

---

## Step 1 — `.gitignore` update (EXECUTED)

- **Edit applied:** added `artifacts/` under the existing
  "Generated task report artifacts" section (now line 6). No other content changed.
- **Verification:** `git status --ignored` → `artifacts/` listed under **Ignored files**.
  Confirmed.
- The `.gitignore` modification itself is a tracked change and will be included in
  Commit 1 (it is a prerequisite for keeping `artifacts/` out of the tree).

---

## Step 2 — Commit 1 staging list

**Message:** `feat(m65): companion AI foundation and graph governance`

| File | Function / Scope |
|------|------------------|
| `frontend/package.json` | +`jsdom` devDep (A04 test harness) |
| `frontend/src/components/GraphViewPanel.tsx` | A03: hardcoded hex → DS tokens |
| `frontend/src/components/RelationshipInsightPanel.tsx` | A03: hardcoded hex → DS tokens |
| `frontend/src/components/RelationshipPathGraph.tsx` | A03: hardcoded hex → DS tokens |
| `frontend/src/components/ai/CompanionContext.tsx` | A04: `SET_ERROR` reducer state-machine fix |
| `frontend/src/styles/layout-grid.css` | **hunk `@94` ONLY** — `.companion-shell` block (+61 lines, A02) |
| `scripts/freeze-check.mjs` | A03 `entityColors` + A04 `aiClient.test` allowlist |
| `frontend/src/components/ai/useCompanionAI.test.tsx` | A04 (untracked, add) |
| `frontend/src/data/aiClient.test.ts` | A04 (untracked, add) |
| `frontend/src/lib/entityColors.ts` | A03 SSOT (untracked, add) |
| `docs/15_DECISIONS/ADR-0007-ai-companion-model.md` | A01 direction ratification (untracked, add) |

**`layout-grid.css` hunk for Commit 1:** the hunk anchored at
`/* ---- M65-A02: Companion shell visual baseline (DS-aligned, tokens only) ---- */`
(git diff `@@ -94,6 +101,61 @@`). Stage **ONLY** this hunk; leave the three rail hunks unstaged.

---

## Step 3 — Commit 2 staging list

**Message:** `fix(workspace): rail overflow and accessibility fix`

| File | Hunk(s) |
|------|---------|
| `frontend/src/styles/layout-grid.css` | hunk `@54` (`.ws-rail { overflow: visible }` + comment), hunk `@70` (`.ws` overlay `max-height`/`overflow`), hunk `@106` (`.ws-rail-collapsed`/`.ws-rail-expand`/`.ws-rail-collapse` restyle) |
| `frontend/src/components/workspace/WorkspacePanel.tsx` | whole-file diff (2 lines: `aria-expanded` on expand/collapse buttons) |

**`layout-grid.css` hunks for Commit 2:** the three rail hunks (all under
"Left workspace rail" / "Workspace rail states"). Stage **all three**; the
companion-shell hunk is already committed in Commit 1.

---

## Step 4 — Excluded files (NOT staged in either commit)

- `artifacts/` — now gitignored (Step 1)
- 8× `docs/15_DECISIONS/HEALTHCHECK_2026-07-30_*.md` — separate healthcheck, out of M65 scope
- `docs/M63_DECISION_WORKSHOP.md` — M63 planning, out of M65 scope
- 6× M65 report / audit md (audit artifacts, not product source):
  - `M65-A04_CLOSURE_AUDIT_PACKET.md`
  - `M65-A04_COMPANION_CONTEXT_FIX_DECISION_NOTE.md`
  - `M65-A04_FINAL_VERIFICATION_REPORT.md`
  - `M65_WORKSPACE_RAIL_FIX_REPORT.md`
  - `WORKSPACE_RAIL_BUG_VERIFICATION.md`
  - `M65_COMMIT_PREPARATION_REPORT.md`
- `M65_STAGING_PLAN_REPORT.md` (this file) — audit artifact

**NEVER use `git add -A`.** Stage only the files/hunks listed above.

---

## Planned commands (NOT executed — awaiting PO confirmation)

```bash
# Commit 1
git add frontend/package.json \
        frontend/src/components/GraphViewPanel.tsx \
        frontend/src/components/RelationshipInsightPanel.tsx \
        frontend/src/components/RelationshipPathGraph.tsx \
        frontend/src/components/ai/CompanionContext.tsx \
        frontend/src/styles/layout-grid.css   # git add -p: select ONLY @94 companion-shell hunk
        scripts/freeze-check.mjs \
        frontend/src/components/ai/useCompanionAI.test.tsx \
        frontend/src/data/aiClient.test.ts \
        frontend/src/lib/entityColors.ts \
        docs/15_DECISIONS/ADR-0007-ai-companion-model.md \
        .gitignore
git commit -m "feat(m65): companion AI foundation and graph governance"

# Commit 2 (after Commit 1)
git add frontend/src/styles/layout-grid.css   # git add -p: select @54, @70, @106 rail hunks
        frontend/src/components/workspace/WorkspacePanel.tsx
git commit -m "fix(workspace): rail overflow and accessibility fix"
```

**Status: NOT staged, NOT committed.** Awaiting PO final confirmation before executing staging.
