# Agent Workflow Protocol

> Contract layer that pins the frozen `TEAM_OPERATING_SPEC_v1.2.md` §11 checkpoint
> flow into machine-checkable Entry / Transition / Output contracts. This document
> does **not** introduce a new workflow; it makes the existing prose flow auditable.
> Rule text is **referenced, not copied** (anti-drift principle —
> `AGENT_OPERATION_PROTOCOL.md` §6).
>
> **Classification:** Process Governance artifact. Freeze Revision Gate = **No**
> (see ADR-0002). It does not touch `CURRENT_ARCHITECTURE_BASELINE.md`, the runtime,
> dependencies, the API, the database, the frontend, or the backend.

---

## 1. Purpose

The repository already defines a complete operating flow in prose:

- `TEAM_OPERATING_SPEC_v1.2.md` §11 — the five-node Checkpoint Workflow.
- `TEAM_OPERATING_SPEC_v1.2.md` §12 — Escalation Policy.
- `AGENT_OPERATION_PROTOCOL.md` — Agent Levels (L0–L3), Universal Rules 1–5, Iron Laws.

What was **missing** is not process, prompt, or agent capability. It is the
**Contract layer** that turns those prose rules into per-checkpoint Entry /
Transition / Output conditions an agent can verify *before* acting and a reviewer
can verify *after* acting.

This document is that contract layer. It:

- Anchors every contract to an existing source section — **no new nodes added**.
- Defines the mandatory output shape every checkpoint produces (§5).
- Declares how handoffs carry evidence between Roles (§4).
- Explicitly does **not** define a Closure step — closure is sourced from the
  Integration Report / Retrospective / Repository Memory (see §6).

It converts flow into contract; it does not redefine flow.

---

## 2. Governance Relationship (4 real layers)

```
Repository Governance  (docs/, prompts/, .github/)                       [physical artifacts]
  └── Agent Governance        (AGENT_OPERATION_PROTOCOL.md: L0–L3, Rule 1–5, Iron Laws)
        └── Workflow Contract Framework   (THIS document: Entry / Transition / Output contracts)
              └── Prompts       (prompts/*.md: mode templates bound to the contracts)
                    └── Agents  (L0–L3 instances executing per prompt + contract)
```

- **Layer 1 — Repository Governance:** the physical artifacts (docs, prompts, config).
- **Layer 2 — Agent Governance:** the behavior rules every agent obeys
  (`AGENT_OPERATION_PROTOCOL.md`).
- **Layer 3 — Workflow Contract Framework:** **this document** — the glue that
  converts the prose flow into verifiable contracts. It is a *document*, not a
  runtime and not a new architecture layer.
- **Layer 4 — Prompts:** mode templates; each prompt binds an agent to the
  contracts above.
- **Layer 5 — Agents:** the executing instances.

The three contract groups below — **Workflow / Handoff / Output** — are
**sections within this single document**, not separate architecture layers. They
are contract *segments* of one framework, not a stack.

---

## 3. Workflow Rules (anchored to §11)

The canonical workflow is `TEAM_OPERATING_SPEC_v1.2.md` §11 — five nodes,
unchanged in count and order:

```
Architecture → Implementation → QA → Integration Report → Approval → Next
```

For each node, this document adds a **contract annotation**
(Role / Entry / Exit / Allowed Operations). **No node is added or removed.**
Roles per node follow §4 (6 fixed Roles). Entry/Exit/Allowed Operations are
derived from §11, §9 (QA iron laws), and `AGENT_OPERATION_PROTOCOL.md` Rule 2
(Scope First).

### 3.1 Architecture (Owner: Lead)
- **Entry:** milestone scope approved by PO (Design Freeze, `ENGINEERING_PLAYBOOK.md` §2 step 2).
- **Exit:** Architecture Spec / design-freeze proposal produced, read-only, approved.
- **Allowed Operations:** read; produce design proposal; reference (not copy) governance docs.
- **Forbidden:** implementation; runtime/version change; modifying forbidden files.

### 3.2 Implementation (Owner: Role — Backend / Frontend / Data)
- **Entry:** Architecture approved; feature branch created (`ENGINEERING_PLAYBOOK.md` §3); scope declared (Rule 2).
- **Exit:** additive code + tests; self-review green.
- **Allowed Operations:** modify whitelisted (allowed) files on a feature branch; additive changes only.
- **Forbidden:** forbidden files; runtime/version; direct `master` commit; `amend` / `rebase` / `squash` / `force-push`.

### 3.3 QA (Owner: QA Backend / QA Frontend — read-only sign-off, §9)
- **Entry:** Implementation complete; tests green.
- **Exit:** independent sign-off with evidence (§9 iron laws ①–④).
- **Allowed Operations:** read; run tests; cross-check; issue FAIL.
- **Forbidden:** any write; re-judging PASS; self-authorizing flow.
- **Invariant:** the QA FAIL right is unoverridable (`TEAM_OPERATING_SPEC_v1.2.md` §9). A Lead may decide block-or-flow but **never** re-judge FAIL → PASS.

### 3.4 Integration Report (Owner: Lead)
- **Entry:** QA sign-off obtained.
- **Exit:** Integration Report written (changes / test baseline / Retired-Deleted instances / risk).
- **Allowed Operations:** compile the report; reference Repository Memory (§8.3).
- **Forbidden:** altering the QA verdict; hiding Freeze conflicts.

### 3.5 Approval (Owner: Lead; User if Release, §7-D8)
- **Entry:** Integration Report complete.
- **Exit:** Approval as a flow gate.
- **Allowed Operations:** approve flow; escalate to User for D8 (Release).
- **Forbidden:** treating Approval as auto-start of the next Implementation; self-granting Release (D8 belongs to the User).
- **Invariant:** Approval ≠ automatic start (`TEAM_OPERATING_SPEC_v1.2.md` §11 rule).

---

## 4. Handoff Rules (anchored to §12)

Every transition between nodes is a handoff. Each handoff carries the following
fields:

| Field | Definition | Source |
|---|---|---|
| **From** | Role owning the completed node | §4 |
| **To** | Role owning the next node | §4 |
| **Preconditions** | Entry conditions of the next node (§3) | §11 |
| **Required Evidence** | command + raw output, no hand-written stats (see §5) | Rule 5 / §9 |
| **Escalation Path** | Role → Lead → User on conflict | §12 |

**Handoff contract:**

- A node may not begin until the prior node's **Exit** and **Required Evidence**
  are satisfied.
- On conflict / unknown / Freeze hit → **STOP** and escalate per §12 — never skip
  a level.
- The escalation chain is fixed: `Role → Lead → User` (`TEAM_OPERATING_SPEC_v1.2.md` §12).

---

## 5. Output Rules (operationalizes Rule 5 + §9)

Every checkpoint output (report, sign-off, audit) **MUST** contain these
mandatory sections:

1. **Context** — what was done and why; scope declared (Rule 2).
2. **Actions** — exact operations performed (files, commands).
3. **Evidence** — command + **raw output** (e.g. `git diff --stat`, test logs).
   Hand-written statistics are **forbidden**; cite `git show --stat HEAD` /
   checker output instead.
4. **Verification** — how claims were re-derived from live state (Rule 5).
5. **Verdict** — exactly one of:
   - `PASS`
   - `PASS WITH OBSERVATIONS`
   - `FAIL`
   - `STOP`

A `STOP` verdict always escalates per §12 and never auto-proceeds.

---

## 6. Closure Reference (NOT a Closure step)

This document does **not** define a Closure Stage. Closure information is
sourced from the existing governance, not re-invented:

- **Integration Report** — the §11 node "Integration Report" captures closure of
  a checkpoint (changes, test baseline, Retired/Deleted instances, risk).
- **Retrospective** — `ENGINEERING_PLAYBOOK.md` §2 step 10; the milestone-level
  closure + next-milestone recommendation (STOP, await decision).
- **Repository Memory** — `TEAM_OPERATING_SPEC_v1.2.md` §8.3 defines the Project
  Knowledge Base (append-only daily log + curated MEMORY) that persists closure
  knowledge across sessions.

No separate "Closing" node is added to §11. Adding one would violate the
freeze-invariant that §11's five nodes are the canonical, unextended workflow.

---

## 7. Prompt Relationship

This framework is bound to agents through `prompts/*.md`
(see `AGENT_OPERATION_PROTOCOL.md` §4). It introduces two new mode prompts and
reuses one existing:

| Prompt | Binds to | Purpose |
|---|---|---|
| `prompts/task-planning-mode.md` (NEW) | Planner / Lead | Plan a checkpoint; declare Entry / Allowed Operations / Scope before Implementation. |
| `prompts/security-audit-mode.md` (NEW) | L0 Read-Only Audit | Governance-consistency / freeze-compliance / reference-integrity / dependency-drift audit; read-only. |
| `prompts/readonly-audit-mode.md` (REUSED) | L0 | Review / closure audit — reused for checkpoint review and closure verification. |
| `prompts/implementation-mode.md` (existing) | L1 | Bound to §3.2 Implementation contract. |
| `prompts/release-mode.md` (existing) | L2 | Bound to Release gates (`ENGINEERING_PLAYBOOK.md` §6). |
| `prompts/emergency-fix-mode.md` (existing) | L3 | Bound to minimal-scope fix contract. |

New prompts reference this framework; they do **not** duplicate Rule 1–5 or the
Iron Laws (Reference-not-Copy, `AGENT_OPERATION_PROTOCOL.md` §6).
