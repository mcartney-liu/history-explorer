> ## ⚠️ Derived Product Vision Mirror — NOT the Source of Truth
>
> **Sole Source of Truth:** *History Explorer PRD v1.0* (original document `History_Explorer_PRD_完整版_v1.0.docx`, 2026-07-01).
> This file is a version-controlled **markdown mirror**, kept in sync for git / Agent readability.
> **No dual source:** if this mirror and the `.docx` diverge, the `.docx` wins.
> Synced: 2026-07-21 (PRD v1.0).

# History Explorer — Product Vision (Derived Mirror)

## Vision
**History Explorer = 历史版 Google Maps** — 让历史脉络可探索、可点击、可沉浸。
A *history cognition OS*, not a content app: users build their own understanding by navigating relationships.

## Positioning — History Exploration Engine
Analogy: Google Maps lets you navigate a city and discover places; History Explorer lets you navigate history and discover connections.
Core capability: from any historical node, find a path to any other node.

## Four-Element Synergy (equal dimensions, all serve Exploration Experience)
- **Graph = Relationship Structure** — clickable network of people / events / wars / places / institutions.
- **Timeline = Time Dimension** — personal / world-synchronous / dynastic timelines.
- **Map = Spatial Dimension** — territory change, war routes, city markers.
- **AI = Interpretation & Guidance Layer** — explains the current node and suggests the next.

These four are co-equal building blocks that together deliver the Exploration Experience. **There is no value hierarchy among them.**

## Core Philosophy (from PRD v1.0)
1. **Graph-first (presentation principle):** relationships are shown with priority — relationship lists before prose, related nodes clickable, timeline events jump between connections.
2. **Infinite Exploration (soul):** no "reading finished" — only continuous clicking. Every Entity page always shows 2–3 Next Node recommendations, a clickable relationship list, related timeline events, and marked map locations.
3. **AI as Guide, not Map:** AI explains *why* a node matters and *what* to explore next; it does **not** replace the graph structure, evidence, or critical thinking.
4. **Everything Is Connected:** knowledge is meaningful relationships, not isolated articles.

## Target Users
- **Explorer** — curiosity-driven, infinite roaming.
- **Learner** — builds structured historical understanding.
- **Creator** — gathers / exports historical material.
- **Expert** — verifies relationships and traces sources.

## Core Experience Loop
Explore → Connect → Understand → Discover

## Long-Term Technical Direction (FUTURE target, not current)
PRD v1.0 specifies a long-term stack: Neo4j (graph) + PostgreSQL (relational) + Elasticsearch (search) + LLM+RAG (AI) + Flutter/Web (clients).
> This is the **vision target**. The *current* architecture is a deterministic, in-memory Knowledge Core (see `PROJECT_CONTEXT.md`). Transition happens only via the Freeze Revision Gate.

## AI System (vision target — five roles)
History Guide · Next Node · Graph Builder · Explanation Engine · Path Navigator. AI usage is cost-bounded (≤300 chars explanation, 2–3 nodes, no book-generation).

## Related Documents
- Product DNA (`Product_DNA.md`, L2) · Product Constitution (`Product_Constitution.md`, L3)
- Current Reality (`PROJECT_CONTEXT.md`, L4) · Roadmap (`PROJECT_ROADMAP.md`, L5)
- Documentation Map (`docs/INDEX.md`) · Team Spec (`docs/TEAM_OPERATING_SPEC_v1.2.md`)
