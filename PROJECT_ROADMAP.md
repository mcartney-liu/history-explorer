# History Explorer - Project Roadmap

Version: 1.1
Status: Active


# 1. Overview

History Explorer evolves from a deterministic exploration foundation toward the long-term vision (历史版 Google Maps): Graph + Timeline + Map + AI guiding infinite exploration.

Development philosophy:

1. Product clarity before implementation.
2. Small iterations before large expansion.
3. User exploration value before feature quantity.
4. Knowledge quality before data scale.
5. Long-term architecture before short-term optimization.


# 2. Completed Milestones

- **M1** Foundation Validation (PRD / DNA / Constitution / prototype).
- **M2** Exploration MVP (Knowledge Model v2, search, entity pages, navigation shell, exploration loop, data quality).
- **M3** Knowledge Core Foundation (repository / registry / graph / search / timeline / exploration_service; composition root).
- **M3.5** Schema Freeze + Global Graph + Deterministic Exploration Engine + Five-Zone UI. *Established the Current Architecture Freeze Baseline.*
- **M4** Data Scale & Quality + Architecture.
- **M5** AI-Readiness Gating (concluded: AI layer deferred pending data / retrieval / flow / readiness).
- **M6** Temporal Understanding Layer (v0.7.0).
- **M7** (v0.8.0).
- **M8** Multi-Entity Temporal Visualization (v0.9.0).
- **M8.6** Release & Engineering Foundation - CI, Playbook, version single-source, freeze-check (v0.10.0).


# 3. Near-Term (within Current Architecture Freeze Baseline)

Constraints: deterministic, in-memory, no Neo4j / LLM / GIS / new dependencies.

Examples (scoped per milestone):

- Richer deterministic exploration flow and Next-Node-style recommendations (within the explainable engine).
- Enhanced relationship / timeline / theme presentation in the Five-Zone UI.
- Data depth & quality; documentation-system maturity (this M8.8 Documentation Architecture work).
- Expanded cross-topic connections.


# 4. Future (post Freeze Revision Gate)

Requires ADR + freeze-baseline revision (Product Owner approval). Examples from PRD v1.0:

- **AI Guidance Layer:** History Guide / Next Node / Graph Builder / Explanation Engine / Path Navigator.
- **Knowledge Graph upgrade:** Neo4j (graph) + PostgreSQL (relational) + Elasticsearch (search).
- **Spatial dimension:** GIS historical map (territory / war routes / city markers).
- **User persistence & accounts; community / creator features.**
- **Clients:** Flutter mobile + Web.


# 5. Long-Term Vision

History Explorer should become:

A global exploration engine for understanding human civilization.

The platform helps people discover:

- What happened.
- Why it happened.
- How civilizations interacted.
- How history connects across time and space.


# 6. Related Documents

- `PROJECT_CONTEXT.md` (current state) - `PRD.md` (vision mirror) - `docs/INDEX.md`
- Freeze Baseline: `docs/M3.5-000_Schema_Freeze_Review.md`
