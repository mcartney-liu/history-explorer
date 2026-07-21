# ADR Template

Use this template for any Architecture / Feature / Technology Decision Record.
ADRs are required when a change touches the **Current Architecture Baseline**
(see `docs/10_ARCHITECTURE/CURRENT_ARCHITECTURE_BASELINE.md`).

Copy this file to `docs/15_DECISIONS/ADR-XXXX_<topic>.md` and fill in.

---

## ADR Number

ADR-0001

## Title

<Short descriptive title>

## Status

Proposed | Accepted | Deprecated | Superseded

## Context

What is the problem / situation that motivates a decision? Include the freeze-boundary
impact (does this touch Neo4j / LLM runtime / GIS / new dependency / …)?

## Decision

What is the change we are making? State it clearly and concisely.

## Alternatives

What other options were considered, and why were they rejected?

## Consequences

What becomes easier / harder? What are the positive and negative effects?
Does this require a revision of `docs/10_ARCHITECTURE/CURRENT_ARCHITECTURE_BASELINE.md`?

## Related Freeze Revision

- Freeze Revision Gate: Yes / No
- If Yes: links to the revised `CURRENT_ARCHITECTURE_BASELINE.md` section and Product Owner approval record.
- Linked docs: <e.g. PROJECT_ROADMAP.md §4>
