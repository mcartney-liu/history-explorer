# History Explorer - Project Context

Version: 1.0

Status: Active

Project Type:
AI-powered Global History Exploration Platform


---

> **Team Operating Specification:** `Team Operating Specification v1.2 (Frozen)` 是本项目的**唯一团队规范**。所有后续开发（组织、角色、Checkpoint、决策权、知识库）均遵循 [`docs/TEAM_OPERATING_SPEC_v1.2.md`](docs/TEAM_OPERATING_SPEC_v1.2.md)。规范变更走其 §14 Specification Versioning。

# 1. Project Identity

## Project Name

History Explorer（历史探索）


## Product Position

History Explorer is an AI-powered global history exploration platform.

It combines Artificial Intelligence, Knowledge Graph, Timeline, and Spatial Exploration to help users explore, connect, and understand human history.


---

# 2. Project Mission

The mission of History Explorer is:

To transform history learning from passive information searching into active exploration and discovery.

The product helps users understand:

- What happened?
- Why did it happen?
- What happened elsewhere at the same time?
- How are historical events connected?


---

# 3. Product Position

History Explorer is NOT:

- A traditional encyclopedia.
- A digital history book.
- A simple search engine.
- A general AI chatbot.


History Explorer IS:

An exploration engine for historical knowledge.

The core experience is:

Explore → Connect → Understand → Discover


---

# 4. Core Principles

## Explore First

Users should discover history through exploration rather than only searching for answers.


## Everything Is Connected

Historical events, people, civilizations, locations, and time periods should be connected through meaningful relationships.


## AI As Interpretation Layer

AI helps users understand and explore history.

AI does not replace historical sources or independent verification.


## Long-term Scalability

The product architecture and documentation should support continuous growth.


---

# 5. Current Project Stage

Current Phase:

M1 Foundation Validation Completed (Closure Revision)

Status:

M1 Closure Revision Completed / Preparing for M2


Completed (M1 Foundation Validation):

- Product Foundation (PRD, Product DNA, Product Constitution)
- Architecture Foundation (Technical Architecture, frozen)
- Knowledge Model Prototype (generic entity / relationship / timeline)
- Exploration UI Prototype (React 18 + TypeScript + Vite, 9 components)
- API Prototype (FastAPI, GET /explore/{topic})
- Test Baseline (pytest API contract tests + vitest frontend smoke test)


M1 Closure Revision (Completed):

- M-H1 Exploration Loop Closure — related entities are clickable
- M-H2 Minimum Test Gate — backend + frontend test baseline
- M-H3 Topic Input Validation — safe topic input (no path traversal)
- M-H4 Document Closure — documentation aligned with code (M-H4 task)


Current Focus:

Preparing for M2: navigation shell, CI/Docker/observability, API versioning, knowledge model v2.


---

# 6. Development Rules

All development follows these principles:

1. Documentation before implementation.
2. Clear task definition before development.
3. Small incremental changes.
4. Every change must be traceable through Git.
5. Avoid unnecessary complexity.
6. Preserve long-term maintainability.


---

# 7. AI Agent Collaboration Rules

AI Agents working on this project must follow:

1. Read PROJECT_CONTEXT.md before starting work.
2. Follow assigned Task instructions only.
3. Do not change product direction.
4. Do not invent requirements.
5. Do not modify unrelated files.
6. Commit changes with meaningful messages.
7. Push completed work to GitHub.
8. Report completed changes clearly.


---

# 8. Related Documents

Future related documents:

- PROJECT_CHARTER.md
- README.md
- Product_DNA.md
- Product_Constitution.md
- PRD.md
- Architecture Documents
- Decision Logs
- Team Operating Specification v1.2 (Frozen): docs/TEAM_OPERATING_SPEC_v1.2.md
