# ADR-0002 — Agent Workflow & Contract Framework Establishment

- **ADR Number:** ADR-0002
- **Status:** Accepted
- **Date:** 2026-07-24
- **Authors:** AI Governance Architect / Repository Governance Engineer / Documentation Architect (M9-011-001)
- **Type:** Process Governance Decision (NOT an Architecture Decision)

---

## ADR Number

ADR-0002

## Title

Agent Workflow & Contract Framework Establishment

## Status

Accepted

## Context

Milestone **M9-011 (Agent Workflow & Contract Framework Design Freeze)** confirmed,
through a five-round read-only design review (Design Freeze → Revision → Independent
Review → Design Revision v2 → Final Design Freeze v2), that the repository's operating
flow is **already fully defined in prose**:

- `TEAM_OPERATING_SPEC_v1.2.md` §11 — the five-node Checkpoint Workflow.
- `TEAM_OPERATING_SPEC_v1.2.md` §12 — Escalation Policy.
- `AGENT_OPERATION_PROTOCOL.md` — Agent Levels L0–L3, Universal Rules 1–5, Iron Laws.
- `docs/ENGINEERING_PLAYBOOK.md` §6 — in-step gates (H1–H4).

The design review reached the conclusion that the **genuinely missing artifact is not a
new workflow, a new prompt, or a new agent capability**. It is the **Contract layer**
that turns those prose rules into per-checkpoint **Entry / Transition / Output** conditions
an agent can verify *before* acting and a reviewer can verify *after* acting.

The Independent Review (round 3) returned **REVISION REQUIRED**, explicitly flagging:
1. A proposed "Closure" 7th step conflicts with the frozen §11 five-node flow.
2. A proposed independent "Execution Contract" overlaps Rule 1–5 + `ENGINEERING_PLAYBOOK.md` §6 H1–H4.
3. An "8-layer" framing misrepresents what is a single document with three contract sections.
4. Three-source drift risk from copying rule text.

The v2 consolidation (round 4) resolved all findings: Closure is dissolved into a
*reference* (§11 / §2 / §8.3); Execution is folded into the Workflow contract; the
framework is stated as **4 real layers + 3 contract segments (not layers)**; rule text is
**referenced, not copied**.

This ADR records the decision to establish that Contract Framework.

**Freeze-boundary impact:** This decision introduces **no** Neo4j / LLM runtime / GIS /
new dependency / database / login / recommendation / GraphQL / Redis. It does not alter the
deterministic engine, the data model, the API contract, the frontend, or the backend. It
adds no node to §11. It is purely a governance-documentation layer. Therefore it does
**not** touch `docs/10_ARCHITECTURE/CURRENT_ARCHITECTURE_BASELINE.md`.

## Decision

We **formally establish the Agent Workflow & Contract Framework** as the contract layer
that pins the existing prose flow into machine-checkable Entry / Transition / Output
contracts, delivered as:

1. **`docs/AGENT_WORKFLOW_PROTOCOL.md`** — the Workflow Contract Framework document.
   It anchors every contract to an existing source section (§11 / §12 / §8.3 / §9 / Rule 1–5),
   adds **no** workflow node, defines the mandatory output shape (Context / Actions /
   Evidence / Verification / Verdict), and explicitly defines **no** Closure step (closure
   is sourced from Integration Report / Retrospective / Repository Memory).
2. **`prompts/task-planning-mode.md`** (NEW) — Planner / Lead mode; declares Entry /
   Allowed Operations / Scope before Implementation, bound to §3.1–§3.2.
3. **`prompts/security-audit-mode.md`** (NEW) — L0 Read-Only Audit mode; governance-consistency
   / freeze-compliance / reference-integrity / dependency-drift audit; read-only, no modification.
4. **`prompts/readonly-audit-mode.md`** (REUSED) — bound to checkpoint review / closure audit.
5. **`docs/15_DECISIONS/README.md`** — updated with the ADR-0002 index entry only.

The framework is classified as a **Process Governance Decision** and sits *outside* the
Freeze Revision Gate because it does not modify the Current Architecture Baseline. It
follows the **Reference-not-Copy** anti-drift principle
(`AGENT_OPERATION_PROTOCOL.md` §6): it references Rule 1–5 / Iron Laws / Team Spec / Playbook,
never duplicates their text.

## Alternatives

The following options were considered during the M9-011 design review and **rejected**:

- **A. Do not build any framework (leave prose as-is).**
  *Rejected:* the prose flow is not machine-checkable. Without Entry/Exit/Output contracts,
  agents cannot verify pre-conditions before acting and reviewers cannot verify post-conditions
  after acting; drift and self-interpretation risk persist. An ADR-0001-style gap remains.

- **B. Modify `TEAM_OPERATING_SPEC_v1.2.md` §11 to add contract nodes.**
  *Rejected:* the Team Spec is **Frozen (v1.2)**; its §11 five-node flow is a freeze-invariant
  and may only change via §14 Versioning (Major = User approval). Embedding contracts into the
  frozen spec would (a) violate the freeze, (b) duplicate the contract into the canonical spec,
  and (c) blur the boundary between process-governance docs and the frozen team baseline.

- **C. Introduce a workflow engine / runtime to enforce contracts.**
  *Rejected:* violates the Freeze (no new dependency / no runtime change; deterministic, doc-only
  governance). Out of scope and contradicts the project's zero-new-dependency invariant.

- **D. Keep "Execution" as an independent contract layer.**
  *Rejected:* Execution responsibilities are already fully covered by Universal Rules 1–5 +
  Iron Laws + `ENGINEERING_PLAYBOOK.md` §6 (H1–H4 in-step gates). A separate Execution contract
  would **duplicate, not add** governance. v2 therefore folds Execution into the Workflow contract
  (§3) rather than standing it up as its own layer.

- **E. Make "Closure" an independent 7th workflow step.**
  *Rejected:* contradicts the frozen §11 five-node flow and the Independent Review's explicit
  REVISION-REQUIRED finding. Closure is already sourced from the Integration Report node (§11),
  the Retrospective (`ENGINEERING_PLAYBOOK.md` §2 step 10), and Repository Memory
  (`TEAM_OPERATING_SPEC_v1.2.md` §8.3). Adding a step would violate the freeze-invariant.

## Consequences

**What becomes easier:**
- The existing prose flow is now auditable: every checkpoint has a declared Entry / Exit /
  Allowed Operations; every handoff carries Required Evidence; every output has a fixed shape.
- Agents can self-verify pre-conditions (STOP on unmet Entry) and reviewers can verify
  post-conditions against the Verdict field.
- The two new prompts (task-planning, security-audit) close the planning and governance-audit
  gaps without touching the frozen Team Spec or Playbook.
- Anti-drift is preserved: the framework references Rule 1–5 / Iron Laws / §11, never copies them.

**What becomes harder / neutral:**
- One additional decision record (this ADR) to keep current if the framework later evolves
  (a future ADR may Supersede it).
- No code, architecture, runtime, release, or freeze-boundary impact of any kind.

**Architecture Baseline impact:**
- This ADR does **NOT** require a revision of
  `docs/10_ARCHITECTURE/CURRENT_ARCHITECTURE_BASELINE.md`.
- No freeze-guard enumerated types, no dependencies, no API/frontend changes are involved.
- The frozen §11 five-node flow is **preserved unchanged** (only annotated by reference).

## Related Freeze Revision

- **Freeze Revision Gate:** No
- **Reason:** ADR-0002 is a Process Governance Decision. It does not touch the Current
  Architecture Baseline (no Neo4j / LLM runtime / GIS / new dependency / DB / login / etc.),
  adds no node to §11, and introduces only governance-documentation artifacts. Therefore no
  Architecture Revision and no Freeze Revision Gate approval are required.
- **Linked docs:**
  - `docs/AGENT_WORKFLOW_PROTOCOL.md` (Workflow Contract Framework — this ADR's primary deliverable)
  - `prompts/task-planning-mode.md` (NEW mode prompt)
  - `prompts/security-audit-mode.md` (NEW mode prompt)
  - `prompts/readonly-audit-mode.md` (REUSED for review / closure audit)
  - `docs/AGENT_OPERATION_PROTOCOL.md` (behavior governance entry point — referenced, not modified)
  - `docs/TEAM_OPERATING_SPEC_v1.2.md` (Frozen — referenced §11 / §12 / §8.3 / §9, **not modified**)
  - `docs/ENGINEERING_PLAYBOOK.md` (referenced §2 / §6, **not modified**)
  - `docs/15_DECISIONS/README.md` (L15 Decisions layer — index entry appended only)
  - `docs/10_ARCHITECTURE/CURRENT_ARCHITECTURE_BASELINE.md` (referenced, **not modified**)

## References

- `docs/AGENT_WORKFLOW_PROTOCOL.md` — §1 Purpose, §2 Governance Relationship, §3 Workflow Rules,
  §4 Handoff Rules, §5 Output Rules, §6 Closure Reference, §7 Prompt Relationship.
- `docs/AGENT_OPERATION_PROTOCOL.md` — §2 Agent Levels, §3 Universal Rules, §5 Iron Laws, §6 References.
- `docs/TEAM_OPERATING_SPEC_v1.2.md` — §11 Checkpoint Workflow, §12 Escalation, §8.3 Repository Memory, §9 QA iron laws.
- `docs/ENGINEERING_PLAYBOOK.md` — §2 Milestone Lifecycle, §6 Release Workflow Hardening (H1–H4).
- `docs/15_DECISIONS/ADR-0001_agent_governance_framework.md` — prior Process Governance Decision (pattern).
- `docs/15_DECISIONS/ADR_TEMPLATE.md` — template used to author this record.
- Milestone **M9-011** — Agent Workflow & Contract Framework Design Freeze (v2, PASS).
- Milestone **M9-011-001** — Implementation Authorization (this record).
