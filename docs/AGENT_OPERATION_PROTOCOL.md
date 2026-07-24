# Agent Operation Protocol

> **Single source of truth for AI Agent behavior** in the History Explorer
> repository. Read this file in full before any task. Mode-specific prompts
> live in `prompts/`.

## 1. Purpose

This document is the behavior governance entry point for **every AI Agent**
(Codex / Copilot / Cursor / Claude Code / etc.) operating in this repository.

Goal: any AI Agent entering the repository automatically obeys the existing
engineering rules — Release Governance, Freeze Governance, Audit Governance,
and Architecture Governance — without re-deriving them per session.

This protocol does **not** replace those documents. It references them and
binds Agents to them. Rule text is referenced, not copied, to prevent drift.

## 2. Agent Levels

### L0 — Read-Only Audit Agent
- **Allowed**: read repository; run read-only checks (`scripts/freeze-check.mjs`,
  `scripts/release-consistency-check.mjs --verbose`, `pytest`/`vitest` in
  observation mode, `git status`, `git diff`, `git log`, `git tag --list`,
  `git ls-remote`).
- **Forbidden**: any write; `commit`; `push`; `merge`; `tag`; modifying forbidden
  files.
- **Approval**: none required. On any STOP finding → report to PO.

### L1 — Implementation Agent
- **Allowed**: modify on a `feature/` branch; modify whitelisted (allowed) files.
- **Forbidden**: modify forbidden files; modify runtime/version; push directly to
  `master`; `amend`/`rebase`/`squash`/`force-push`.
- **Required checks**: `scripts/freeze-check.mjs` PASS + relevant tests green
  before commit.
- **Approval**: PO must define explicit scope before start; ambiguity → STOP.

### L2 — Release Agent
- **Allowed**: `--no-ff` merge; create annotated tag; `push` (through gates).
- **Prerequisites (ALL required)**:
  - Freeze Check PASS
  - Release Consistency Check R1–R7 PASS
  - **PO (D8) Authorization**
- **Forbidden**: modify forbidden files; bump version without policy; create
  unauthorized tag; `force push`.

### L3 — Emergency Fix Agent
- **Rules**: minimal-scope fix only; never bypass governance; any Freeze
  revision must escalate to PO.
- **Forbidden**: bypass freeze; `force push`; scope creep; self-authorize a release.
- **Required checks**: `scripts/freeze-check.mjs` FIRST; any freeze touch → escalate.

## 3. Universal Agent Rules (all Levels)

**Rule 1 — Before Modification (read first).** Read:
- `docs/ENGINEERING_PLAYBOOK.md`
- `docs/10_ARCHITECTURE/CURRENT_ARCHITECTURE_BASELINE.md`
- `docs/TEAM_OPERATING_SPEC_v1.2.md`
- relevant ADR under `docs/15_DECISIONS/`

**Rule 2 — Scope First.** Before modifying, output:
- Allowed Files:
- Forbidden Files:
- Expected Impact:

**Rule 3 — No Silent Assumption.** Do not self-add requirements, self-expand
scope, or self-interpret business rules.

**Rule 4 — Unknown = STOP.** Any unknown file, unknown workflow, insufficient
permission, or rule conflict → STOP immediately.

**Rule 5 — Evidence Based.** All conclusions must come from `git status`,
`git diff`, real file reads, test results, and checker output. A historical
report may inform but is **never** the sole basis for a conclusion.

## 4. Mode Prompts

Use the matching template from `prompts/` for each engagement:
- `prompts/readonly-audit-mode.md` → L0 (audit; **reused** for code-review and closure verification — no separate prompt is added)
- `prompts/task-planning-mode.md` → Planner / Lead (checkpoint planning before Implementation)
- `prompts/security-audit-mode.md` → L0 (governance-consistency / freeze-compliance / reference-integrity / dependency-drift audit)
- `prompts/implementation-mode.md` → L1
- `prompts/release-mode.md` → L2
- `prompts/emergency-fix-mode.md` → L3

> Code-review and closure do **not** get a dedicated prompt — they reuse
> `prompts/readonly-audit-mode.md` (L0). This keeps the `prompts/` surface at six
> files and avoids duplicating the audit contract. See
> `docs/AGENT_WORKFLOW_PROTOCOL.md` §7 for the binding matrix.

## 5. Iron Laws

- Agent holds **no decision authority** — only execution.
- **Release Approval is always the Product Owner's (D8).**
- **Unknown = STOP.**
- **Evidence before conclusion.**
- **Scope before modification.**
- **Governance before execution.**

## 6. References

- Release Workflow Hardening: `docs/ENGINEERING_PLAYBOOK.md` §6
  (Pre-Commit / Pre-Tag / Post-Tag Gates; H1–H4; Push Gate)
- Release Rules: `docs/ENGINEERING_PLAYBOOK.md` §5
- Audit Rules: `docs/ENGINEERING_PLAYBOOK.md` §7
- Freeze Red Lines: `docs/ENGINEERING_PLAYBOOK.md` §8
- Architecture Baseline: `docs/10_ARCHITECTURE/CURRENT_ARCHITECTURE_BASELINE.md`
- Team Operating Spec: `docs/TEAM_OPERATING_SPEC_v1.2.md`
- Release Version Policy: `docs/RELEASE_VERSION_POLICY.md`
- Agent Workflow Contract Framework: `docs/AGENT_WORKFLOW_PROTOCOL.md` (Process Governance; Freeze Revision Gate = No; see ADR-0002)
- ADR-0002 (Agent Workflow & Contract Framework): `docs/15_DECISIONS/ADR-0002_agent_workflow_contract_framework.md`
