# History Explorer Development Playbook

> **Status:** V1.0 — the single official development execution specification
> **Scope:** Day-to-day coding discipline (commit hygiene, code health, component lifecycle, milestone gates)
> **Relationship:** This Playbook executes the rules defined in Freeze Baseline / Release Iron Rules / Design System. It does not override them.

---

## 0. Code Health Gate

Code quality decays silently — the only remedy is a hard gate that fires every time.

### 0.1 Build Gate (mandatory for milestone release)

| Check | Threshold | Action if fail |
|---|---|---|
| `npm run build` | exit 0 | **Block release.** Fix or get PO exception with documented reason + expiry date. |
| `npx tsc --noEmit` | zero new errors vs HEAD | **Block merge.** Diff with `stash` → `tsc --noEmit` baseline to confirm "new" errors were not introduced by this change. |
| `npm test` | 100% files pass, zero regressions | **Block merge.** |

> **Existing debt (as of 2026-07-29):** ~50 pre-existing TS errors from M60-003. These are **grandfathered** — they do not block current commits, but no NEW errors may be added. Clearance target: **M63** (60-day window from M60-003).

### 0.2 Dead Code

| Rule | Deadline |
|---|---|
| Component tagged `REMOVE` in Migration Guide (DS Chapter 10) | Clear within **3 milestones** |
| Component tagged `HIDE` | Review every **5 milestones** — delete or reactivate |
| Unused imports, dead variables (`tsc` unused-locals) | Zero tolerance for **new** occurrences; existing grandfathered per 0.1 |

### 0.3 Console Hygiene

Dev server must render with **zero React key warnings** and **zero unhandled promise rejections** on LandingPage, EntityPage (all 3 tabs), and Workspace.

---

## 1. Pre-push Self-Check (8 steps)

Run this before every `git push`. A failure at any step = do not push.

| Step | Command / Action | Expect |
|---|---|---|
| 1 — Status | `git status` | Clean working tree (only `.pip_target/` ok as untracked). No unexpected modified files. |
| 2 — Test | `cd frontend && npm test` | 100% files pass. |
| 3 — Freeze | `node scripts/freeze-check.mjs` | `PASSED — no D-class violations`. |
| 4 — Type-check | `cd frontend && npx tsc --noEmit` | Zero **new** errors vs `stash` baseline. |
| 5 — Dev server | `cd frontend && npm run dev` (port 5173) | LandPage loads → search "凯撒" → EntityPage renders → all 3 tabs (了解/研究/扩展) render without React errors → Workspace shows history. |
| 6 — Diff review | `git diff --stat HEAD~1` | Confirm changed files match intent. No accidental `package.json` / config / backend drift. |
| 7 — Commit | `git commit` | Meaningful message. No `-a` / `--amend` / `--no-verify`. |
| 8 — Push | `git push origin master` | No `--force`. Verify with `git ls-remote`. |

> **Environment note:** Push requires the token + ssl workaround pattern documented in project MEMORY.md.

---

## 2. Component Lifecycle Policy

All existing components have a state per Design System Chapter 10 (Migration Guide). This chapter defines the **execution rhythm** for those decisions.

| State | Action | Cadence |
|---|---|---|
| **KEEP** | No action. Must still pass Quality Checklist (DS Chapter 12). | Per milestone |
| **MERGE** | Designate 1 lead component. Add `@deprecated` comment to absorbed components. Delete absorbed components after **3 milestones**. | Merge window: 3 milestones |
| **REMOVE** | Delete the file(s). Update imports. | Within **3 milestones** of tagging |
| **HIDE** | Keep file, verify no runtime path reaches it. Re-evaluate every **5 milestones**. | Review: every 5 milestones |
| **LATER** | No implementation. Re-evaluate every **2 milestones**. | Review: every 2 milestones |

### 2.1 New Components

Any new component MUST:
- Trace back to a rule in Design System Chapter 5 (Component Language)
- Pass Quality Checklist (DS Chapter 12) before merge
- Be registered in the Migration Guide within the same milestone

---

## 3. Milestone Exit Criteria

Every milestone closes only when ALL of the following are green. No partial passes. No "fix later."

| # | Gate | How to verify |
|---|---|---|
| M1 | Tasks complete | All planned tasks `completed` |
| M2 | `npm test` 100% | `cd frontend && npm test` — every file passes, zero regressions |
| M3 | `freeze-check` PASS | `node scripts/freeze-check.mjs` exit 0 |
| M4 | `npm run build` exit 0 | Or documented PO exception with expiry |
| M5 | Dev server full-path | LandingPage → Search → EntityPage (3 tabs) → Workspace → all renders without console errors |
| M6 | Docs synced (if changed) | `git diff --stat` review of changed docs |
| M7 | Design System alignment | No new component/page/color violates Design System V1.0 FINAL |
| M8 | PO approval | 翔哥 explicitly confirms "done" |

> **Release gate (additional):** If this milestone is a project-tag release, the Release Iron Rules (annotated vM tag + consistency 7/7 + ls-remote verify) apply on top of the above.

---

*This Playbook is executable — every rule is a Boolean check. Where judgment is needed (PO exception, grandfathered debt), the process is explicit: document it, set an expiry, get approval.*

*Office: `docs/DEVELOPMENT_PLAYBOOK.md` | Version: V1.0 | Date: 2026-07-29*
