# ADR-0001 — Agent Governance Framework Establishment

- **ADR Number:** ADR-0001
- **Status:** Accepted
- **Date:** 2026-07-23
- **Authors:** AI Governance Architect / Repository Governance Engineer (M9-010)
- **Type:** Process Governance Decision (NOT an Architecture Decision)

---

## ADR Number

ADR-0001

## Title

Agent Governance Framework Establishment

## Status

Accepted

## Context

Milestone **M9-009 (Agent Governance Foundation)** introduced, into the repository
master branch, a set of governance artifacts that together define how every AI Agent
operating in this repository must behave:

- `docs/AGENT_OPERATION_PROTOCOL.md` — the single source of truth / entry point for
  AI Agent behavior governance.
- `.github/copilot-instructions.md` — the GitHub Copilot entry point, which references
  (and binds Copilot to) the protocol without copying rule text.
- `prompts/*.md` — four role-mode prompt templates: `readonly-audit`, `implementation`,
  `release`, `emergency-fix`.
- The agent-level model (**L0** Read-Only Audit / **L1** Implementation / **L2** Release /
  **L3** Emergency Fix), the **Universal Rules 1–5** (Read Before Modify / Scope First /
  No Silent Assumption / Unknown = STOP / Evidence Before Conclusion), and the **Iron Laws**
  (Release Approval always belongs to the Product Owner).
- The **Reference-not-Copy** anti-drift principle (protocol §6): rule text is referenced,
  never duplicated, to prevent governance drift.

These artifacts are **present on `master`** and constitute the *Agent Governance Foundation*.
However, the decision to establish them was never captured as a reviewable, auditable
**decision record**. Without an ADR, the foundation lacks:

1. A recorded rationale that can be re-examined in future audits.
2. An explicit statement of **scope** — that this is a *process* governance decision, not
   an *architecture* decision, and therefore does not touch the Current Architecture Baseline.
3. A first, validated instance of the `docs/15_DECISIONS/` ADR mechanism itself
   (the layer existed since M8.8-D.1 but held no ADR instance).

**Freeze-boundary impact:** This decision introduces **no** Neo4j / LLM runtime / GIS /
new dependency / database / login / recommendation / GraphQL / Redis. It does not alter the
deterministic engine, the data model, the API contract, or the frontend. It is purely a
governance-documentation layer. Therefore it does **not** touch
`docs/10_ARCHITECTURE/CURRENT_ARCHITECTURE_BASELINE.md`.

## Decision

We **formally establish the Agent Governance Foundation as the binding behavior-governance
layer** for all AI Agents in the History Explorer repository, and record that establishment
as this ADR.

Specifically, the following become the authoritative, referenced (not copied) governance set:

1. **`docs/AGENT_OPERATION_PROTOCOL.md`** — entry point and single source of truth for agent
   behavior; defines Agent Levels L0–L3, Universal Rules 1–5, and the Iron Laws.
2. **`.github/copilot-instructions.md`** — GitHub Copilot entry; declares `Unknown = STOP`
   and references the protocol rather than re-stating rules.
3. **`prompts/*.md`** — four mode templates (`readonly-audit`, `implementation`, `release`,
   `emergency-fix`), each structured in the agreed six sections.
4. **Reference-not-Copy principle** — every consumer (Copilot entry, prompts, future ADRs)
   references the protocol / baseline / playbook / policy, never duplicates their rule text.

The decision is classified as a **Process Governance Decision**. It deliberately sits *outside*
the Freeze Revision Gate because it does not modify the Current Architecture Baseline.

## Alternatives

The following options were considered and **rejected**:

1. **Embed governance rules directly inside each agent prompt / Copilot file.**
   *Rejected:* duplicates rule text across multiple files, creating drift risk and making the
   "single source of truth" impossible to maintain. Violates the Reference-not-Copy principle.

2. **Treat the protocol as informal, unwritten guidance (no ADR / no decision record).**
   *Rejected:* governance that is not recorded is not auditable or reviewable. Future audits
   could not confirm the foundation was an intentional, approved decision. An ADR is required
   to make the decision inspectable.

3. **Route this establishment through the Freeze Revision Gate (ADR + Architecture Review +
   PO approval of a baseline revision).**
   *Rejected:* the Gate exists solely for changes that touch the Current Architecture Baseline.
   This is a process-governance decision with zero architecture impact; forcing it through the
   Gate would mis-classify the change and add unnecessary process overhead.

## Consequences

**What becomes easier:**
- The Agent Governance Foundation is now an explicit, reviewable, auditable decision.
- Future agents/auditors can confirm *why* the foundation exists and *what its scope is*
  from a single record.
- The `docs/15_DECISIONS/` ADR mechanism is validated by its first real instance, proving the
  layer works end-to-end.

**What becomes harder / neutral:**
- One additional decision record to keep current if the foundation later evolves (future ADRs
  can Supersede this one).
- No code, architecture, runtime, release, or freeze-boundary impact of any kind.

**Architecture Baseline impact:**
- This ADR does **NOT** require a revision of
  `docs/10_ARCHITECTURE/CURRENT_ARCHITECTURE_BASELINE.md`.
- No freeze-guard enumerated types, no dependencies, no API/frontend changes are involved.

## Related Freeze Revision

- **Freeze Revision Gate:** No
- **Reason:** ADR-0001 is a Process Governance Decision. It does not touch the Current
  Architecture Baseline (no Neo4j / LLM runtime / GIS / new dependency / DB / login / etc.).
  Therefore no Architecture Revision and no Freeze Revision Gate approval are required.
- **Linked docs:**
  - `docs/AGENT_OPERATION_PROTOCOL.md` (behavior governance entry point)
  - `.github/copilot-instructions.md` (Copilot entry)
  - `prompts/readonly-audit.md`, `prompts/implementation.md`, `prompts/release.md`,
    `prompts/emergency-fix.md` (mode templates)
  - `docs/15_DECISIONS/README.md` (L15 Decisions layer)
  - `docs/10_ARCHITECTURE/CURRENT_ARCHITECTURE_BASELINE.md` (referenced, **not modified**)

## References

- `docs/AGENT_OPERATION_PROTOCOL.md` — §2 Agent Levels, §3 Universal Rules, §4 Iron Laws, §6 References.
- `docs/15_DECISIONS/README.md` — L15 Decisions layer relationship to the Freeze Baseline.
- `docs/15_DECISIONS/ADR_TEMPLATE.md` — template used to author this record.
- Milestone **M9-009** — Agent Governance Foundation (introduced the governed artifacts).
- Milestone **M9-010** — ADR-0001 Governance Decision (this record).
