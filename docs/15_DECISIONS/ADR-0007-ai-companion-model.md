# ADR-0007 — AI Companion Interaction Model

## ADR Number

ADR-0007

## Title

AI Companion Interaction Model — M65 Product-Direction Decision Record (retroactive)

## Status

Accepted (2026-07-30, PO-approved via M65-A01 ADR-0007 Implementation task; retroactive
decision record for the M65 Companion-centric interaction model already shipped in code).

## Context

History Explorer is positioned not as a traditional history encyclopedia, but as an
**AI-driven exploration platform**. The product thesis is that users do not come to read
static articles — they come to *explore* the historical graph, understand what they see,
and follow threads of connection.

In this framing, the role of AI is **not a set of independent tools** bolted onto the side
of the app. AI is the user's *intelligent companion* throughout the exploration process —
present at the moment of confusion, ready to explain, to converse, to surface related
threads, and to open deeper study.

### Evolution before and across M65

- **Before M65:** AI capability existed largely at the *design layer* — the interaction
  model was specified and sketched, but the Companion was not yet a live, first-class
  surface in the running product.
- **M65:** the Companion became a real interaction layer, organized around three live
  modes:
  - **Explain** — grounded interpretation of the currently viewed entity.
  - **Chat** — an ongoing conversational partner for open-ended exploration.
  - **Discover** — AI-assisted discovery of related entities and threads.
  - (plus **Timeline** entity navigation supporting the exploration flow).

These moved from design intent to real, user-facing interaction capability. Because M65
shipped the implementation without a corresponding decision record, the question
*"is the AI Companion the product's primary model?"* had no formal answer. This ADR closes
that governance gap.

## Decision

**History Explorer adopts the Companion-centric AI interaction model.**

AI capability is organized *around the exploration flow*, not as a side panel of
disconnected utilities. The flow the Companion serves is:

```
Explore  →  Understand  →  Discover  →  Research
```

Mapping of Companion modes to the flow:

- **Explain** — helps the user *understand* the current entity (grounded,
  source-backed interpretation of what they are looking at).
- **Chat** — sustains *continuous conversational exploration*; the user can probe,
  compare, and wander with the Companion as a partner.
- **Discover** — *discovers related entities* and threads the user has not yet reached.
- **Research** — provides the *entry point to deep research* (the M66 Research Workspace).

The Companion is therefore the long-term, persistent surface through which AI meets the
user — not a one-off tool, not a hidden background process.

## Alternatives Considered

### Alternative A — AI Toolbox Model

Multiple independent AI tool entrances (e.g. a "Summarize" button, a "Translate" button,
a "Find relations" button scattered across the UI).

**Rejected because:**
- It does not fit the *continuous exploration experience* the product is built around.
- It forces the user to *actively choose which tool to use* at every step, breaking flow.
- It *fragments the exploration loop* into disconnected utilities instead of a coherent
  companion relationship.

### Alternative B — AI Fully Hidden (background capability only)

AI exists only as an invisible backend capability; the UI never presents an AI surface.

**Rejected because:**
- It *diminishes the value of AI* — the differentiator of History Explorer is precisely
  the visible, conversational, exploratory AI partner.
- It *does not match the product vision* of an AI-driven exploration platform.

## Consequences

### Positive
- **AI interaction is unified** under a single Companion model rather than scattered
  utilities.
- The **Exploration Loop** (Explore → Understand → Discover → Research) is strengthened
  because AI is present at each stage.
- The **Companion becomes a long-term product entry point** — a stable, persistent
  surface users return to.

### Trade-offs
- The Companion **requires continuous design governance** — its visual and interaction
  quality must be maintained milestone over milestone (it must not regress to unstyled or
  off-brand UI).
- We must **avoid AI intruding into core exploration logic** — the Companion advises and
  explains, it does not silently rewrite the user's navigation or workspace.
- We must **keep the Navigation Boundary** — the Companion is a guide, not an
  autorouter.

## Architecture Constraints

The AI Companion operates within strict boundaries:

**The Companion MAY:**
- provide explanation (Explain mode),
- provide recommendations (Discover mode),
- provide a research entry point (Research mode).

**The Companion MUST NOT:**
- directly control navigation,
- modify Workspace state,
- bypass the product boundary.

**Authority is retained by the core app:**
- **App = Navigation Authority** — routing and entity navigation remain the app's
  responsibility.
- **Workspace = State Authority** — workspace/exploration state is owned by the
  Workspace, not by the Companion.

This keeps the Companion as an *advisor and companion*, consistent with the freeze
baseline's "Relationship Layer = Visualization Only" and the no-AI-control-of-navigation
discipline.

## Relationship with M65 / M66

- **M65** establishes the **Companion base capability** (Explain, Chat, Discover, Timeline
  navigation) — the foundation this ADR formally adopts.
- **M66** extends with the **Research Workspace** as a *deep-research capability*. Research
  is **not a replacement for the Companion**; it is a *deep research space* the Companion
  opens into. The two are complementary: the Companion is the conversational guide, the
  Research Workspace is the focused study environment it can lead the user to.

## Related Freeze Revision

- Freeze Revision Gate: **No** — this ADR is a *retroactive decision record* for the
  already-shipped M65 Companion model. It introduces **no code, schema, API, dependency,
  or baseline change**; its sole purpose is to close the product-direction governance gap
  identified in the 2026-07-30 health review (missing M63/M64/M65 ADR).
- PO approval record: M65-A01 ADR-0007 Implementation task (M65 direction追认).
- Linked docs: `PROJECT_CHARTER.md` §7 (AI Agents must not change product direction
  without approval — this ADR supplies the required approval), `PROJECT_ROADMAP.md`
  (M65 Companion; M66 Research Workspace), and the 2026-07-30 health-check reports under
  `docs/15_DECISIONS/HEALTHCHECK_2026-07-30_*.md`.
