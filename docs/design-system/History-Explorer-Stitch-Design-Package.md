# History Explorer — Stitch Design Package

> **Purpose:** A self-contained brief for **Google Stitch** (AI design-to-code) to generate on-brand, on-spec UI screens for History Explorer.
> **Author:** Senior Product Design Analyst
> **Mode:** Strictly read-only analysis of existing product artifacts (`PRD.md`, `Product_DNA.md`, `docs/design-system/History-Explorer-Design-System-V1.md`, `M63_EXECUTION_PLAN_V1.0.md`, `frontend/src/components/*`).
> **Baseline (read-only git verify, 2026-07-29):** HEAD=`68cd0fa`, latest tag=`vM62`. Working tree carries post-M62 frontend work (not yet released as vM63).
> **Golden rule for Stitch:** Generate *experience/layout*, never invent *capabilities*. The 8 entity types / 18 relationship types are frozen; do not add new ones. Do not generate dashboards, wikis, chatbots, maps, or social features.

---

## 1. Product Overview

**One-liner:** History Explorer is a *history cognition engine* — "the Google Maps of history" — that helps people understand the past by navigating relationships between people, events, civilizations, places, and ideas, with AI guidance that is always traceable to sources.

**North Star:** Users build their own understanding by navigating relationships. There is no "finished reading" — only continuous, curiosity-driven clicking.

**What it is / isn't:**

| It IS | It is NOT |
|---|---|
| An exploration engine for relationships | An encyclopedia / Wikipedia clone |
| A trustworthy, provenance-visible surface | A confident chatbot that asserts facts |
| Immersive, museum-grade reading | A widget dashboard |
| Restrained, content-led chrome | A feature-dense control panel |

**Core experience loop:** `Explore → Connect → Understand → Discover` (recursive — every discovery opens new exploration).

**Target users:** Explorer (curiosity roaming) · Learner (structured understanding) · Creator (gather/export) · Expert (verify relationships & trace sources).

**Four co-equal dimensions (no hierarchy among them):**
- **Graph** = relationship structure (clickable network)
- **Timeline** = time dimension
- **Map** = spatial dimension *(spatial is represented structurally, NOT a GIS map — no mapping feature)*
- **AI** = interpretation & guidance layer (explains *why* a node matters and *what* to explore next)

---

## 2. Design Philosophy

**Three pillars:**
1. **Grounding over Generation.** "Grounded / verified" is a first-class, always-visible state — never a footnote. This is the product's moat.
2. **Content is the hero.** Chrome (nav, buttons, panels) is quiet, low-contrast, structural. Narrative, relationships, sources are high-contrast and central.
3. **Bilingual by default.** zh-CN is default locale; en-US is first-class, not a fallback. Layout must hold both scripts without reflow shame.

**Ten principles (the non-negotiable checklist for any screen):**
1. One primary action per viewport (gold is earned, not sprinkled).
2. AI lives *beside* content, never in an isolated "AI mode".
3. Every AI answer shows its Grounding (verified / unverified — always visible).
4. Reading measure is sacred: paragraph columns cap at **680px**.
5. Chrome recedes, content leads.
6. Warmth over corporate cold (brown undertone on every surface; no pure gray, no cold-blue shadow).
7. Restraint is the brand (motion explains state, not delight; empty space is intentional).
8. Bilingual is default, not fallback.
9. Tokens over literals (no hard-coded color/size).
10. Don't invent types (frozen 8 entity / 18 relationship types).

**Voice:** calm, declarative microcopy. "已通过事实溯源验证" — never "✨ Powered by AI". The product never claims truth it cannot show.

---

## 3. User Journey (lifecycle, not pages)

```
Discover → Understand → Explore → Research → Save → Return → Share
```

| Step | Goal | Entry | Exit | Next |
|---|---|---|---|---|
| **Discover** | Find a theme / person / civilization to explore | Landing Hero + Search | Click result / topic card / quick-start | Understand |
| **Understand** | First-layer comprehension: what it is, why it matters, who it relates to | Entity Hero + Story + Summary + WhyImportant | Relationships / Timeline | Explore |
| **Explore** | See how an entity connects and sits in time | Relationship Graph + Timeline | Click a connected entity | Research (or another Understand) |
| **Research** | Get a sourced answer + evidence for a specific question | Research Panel / AI Historian | Evidence + citations + related dimensions | Save |
| **Save** | Leave a trace to resume later | Workspace (auto) + bookmark | Back to list | Return |
| **Return** | Re-enter an unfinished exploration | Workspace history item | Jump to Entity | Explore / Share |
| **Share** | Hand a verified understanding to someone else | Share entry (entity / answer / timeline clip) | Generated shareable view | Others' Discover |

*Understand boundary:* delivers *first-layer understanding* (what / why / related), not a neutral, fragmented fact card. Summary is an entry, not an endpoint — Story + WhyImportant together form "understanding", preventing the Entity page from degrading into a Wikipedia card.
*Why continue:* every step exposes an explicit "next" entry. Exploration is tree-like, never linear.
*Why return:* Workspace auto-traces + reading progress = zero-cost re-entry.
*Why share:* Grounding makes content endorsable — users share *verified* history, which an ordinary chatbot cannot.

---

## 4. Capability Map

| Module | Exists to | Input | Output | Key constraint |
|---|---|---|---|---|
| **Discover** | Invite exploration | user query / topic pick | an Entity exploration session | Primary action = Search; everything else is invitation |
| **Entity** | The atomic unit of understanding (person/event/civ/place/idea) | one entity (local id) | narrative + relationships + timeline + provenance | Never becomes a dashboard (see §6) |
| **Research** | Converge scattered understanding into a sourced answer | Entity context + question | grounded answer + citations + evidence | Depends on Entity for grounding context |
| **Workspace** | The memory layer — makes the product "continuous" | user behavior (browse/bookmark) | current + history list | A surface, not a destination; never the landing page |
| **AI Historian** | Natural-language questions, every answer grounded | NL question + optional Entity context | grounded answer (same renderer as Research) | Conversation form of Research; never isolated from content |

---

## 5. Component Map (current inventory → Stitch intent)

> States from Design System Chapter 10: **KEEP** (on-spec) · **MERGE** (consolidate) · **REMOVE** (dead) · **HIDE** (dev-only) · **LATER** (deferred).

**Discover**
- `LandingPage` (KEEP) · `FeaturedTopics` (KEEP) · `RecentExplorations` (KEEP) · `EntitySearchBox` (KEEP) · `SearchResults` (KEEP) · `SearchBox`
- MERGE candidates (→ one Discover guide): `FirstExplorationGuide`, `ContinueExploringPanel`, `RecommendationPanel`

**Entity (core)**
- `EntityPageShell` (KEEP) · `EntityHeader`/`EntityHero`/`EntityExperienceHeader` (KEEP, Hero) · `MainEntityCard` · `SummaryPanel` (KEEP) · `StorySection` (KEEP, immersive core) · `WhyImportantPanel` (KEEP) · `InterpretationPanel` (KEEP) · `TimelinePanel` · `EntityExplorationGuide` (KEEP) · `ExplorationFlowGuide` (KEEP) · `ProvenancePanel` (KEEP, grounding landing) · `EntityInsightCard` · `ExplorationCard` · `ExplorationGuide` · `ConnectionExplorer` · `ViewSwitcher`

**Relationship**
- `RelationshipView` (KEEP) · `RelatedEntityList` (KEEP) · `GraphViewPanel` (KEEP, frozen 8 colors / 18 labels) · `ConnectionsPanel` + `ConnectionsExplainedPanel` (MERGE → single Connections module) · `RelationshipInsightPanel` / `RelationshipEvidence` / `RelationshipPathGraph` (MERGE into Graph/Connections) · `CrossTopic*` (MERGE → CrossTopic module)

**Research / AI**
- `ResearchPanel` (KEEP) · `ResearchLibrary` (KEEP) · `ResearchBookmarkButton` (KEEP) · `AIExplanationPanel` (KEEP) · `GroundedAnswer` (KEEP, grounding renderer) · `HistorianChat` (KEEP) · `CitationList` (KEEP)
- MERGE candidates: `ResearchDiscoveryPanel` + `ResearchDimensionCard` + `ResearchRecommendationCard` + `ResearchSummary` + `ResearchReport` (→ Research sub-zones)

**Journey / Continuity**
- `ExplorationJourney` (MERGE, live path tree + why-annotation — keep, distinct surface) · `JourneyCard` / `JourneyPanel` (MERGE → Journey module) · `ExplorationPathTree` / `ExplorationPathsPanel` (REMOVE — dead) / `ExplorationTrail` (MERGE)

**Workspace**
- `WorkspacePanel` (KEEP) · `ExplorationHistoryList` (KEEP) · `ExplorationPathCard`

**Compare (LATER)**
- `TopicComparisonPanel` · `TemporalComparisonPanel` · `MultiEntitySelector` · `MultiEntityContextPanel` · `EntityPickerPanel`

**Event (LATER)**
- `EventCausalChain` · `EventImpactPanel` · `EventNarrativeCard` · `EventNarrativeJourney`

**UI primitives (KEEP)**
- `ui/Card` · `ui/Button` · `ui/GroundingBadge` · `ui/Icon` · `Breadcrumb` · `EmptyState` · `ErrorCard` · `LoadingSkeleton` · `HistoryBar` · `FeedbackWidget`

**Dev / HIDE**
- `DevCatalog` · `ai/AISidebar` (dev-only conversation tool — not in main flow)

---

## 6. UX Problems (real, from audit — feed these to Stitch as "what to fix")

1. **Entity-page panel proliferation → dashboard risk.** Many overlapping panels (Relationships, Insights, Evidence, Paths, Cross-topic…) compete. Hard rule: Entity page must express hierarchy through *content priority*, not panel stacking. Priority order: **Narrative → Inline Interpretation → Supporting Panel**.
2. **Fake grounding badge (being fixed in M63).** `GroundingBadge` previously derived status from `contextCount>0` instead of real `response.grounded` + `evidence[].status`. Stitch must always render a real verified/partial/unverified state, never a decorative one.
3. **Fragmented intelligence modules.** Journey / Recommendation / ResearchInsights are three separate surfaces doing related jobs. M63 converges them into one calm "exploration intelligence" strip (generous spacing, dividers not card-boxes, density 1–3).
4. **MERGE clutter.** ~15 components are flagged MERGE/REMOVE — Stitch should prefer consolidated modules (one Connections module, one Journey module, one Discover guide) over many small panels.
5. **Inconsistent chrome.** Some panels use card-boxes where a quiet divider would do. Museum feeling = restraint; avoid boxy widget grids.
6. **Discovery continuity gap.** Users sometimes don't see "why am I seeing this recommendation" — M63 surfaces persisted `journeyReasons` next to recommendations.

---

## 7. Future Vision

**M63 (next milestone, awaiting PO approval):** Upgrade from "information exploration tool" to "trustworthy AI history exploration partner" — specifically: (a) fix the fake grounding badge so AI becomes a *trusted explanation layer* (real provenance + trust state + explanation basis + uncertainty expression); (b) converge existing but scattered intelligence modules into one coherent exploration-intelligence layer. **No new features, no backend change, no new dependencies.**

**V2 (next):** Light theme (token-driven, not reskin) · full motion system + reduced-motion · responsive hardening · editorial illustration library · component density modes.

**V3 (future):** AI surfaces as connective tissue across pages · localization beyond zh/en (RTL-ready) · tokens published as consumable package · WCAG AA audit.

**Hard non-goals (do NOT generate):** new data model · new AI runtime · community · GIS/map exploration · gamification · social features. Any capability expansion routes to the Freeze Revision Gate, not to Stitch generation.

---

## 8. Stitch Page Requirements

> For each page: generate a clean, museum-grade, dark-first layout. One primary gold action max per viewport. Reading columns ≤ 680px. AI answers inline beside content.

### 8.1 Discover (home)
- **Hero:** serif Display value sentence (max 720px) + one primary Search action.
- **Search:** primary entry — input with gold focus ring; submit = gold button / enter.
- **Quick-start questions:** 4 suggested chips that fill search.
- **Topic cards:** curated civilization/theme grid (≥280px cards, 3-up on desktop).
- **Recent explorations:** returning-user strip from Workspace.
- *No nav menu as hero. No dashboard widgets.*

### 8.2 Entity (exploration page — the heart)
- **Hero:** entity name (serif) + type tag + one-line summary.
- **Story:** the immersive core — serif body 18–19px, measure ≤ 680px.
- **Relationships:** graph + explained connections (selected node → side panel, not modal).
- **Timeline:** chronological anchor (vertical spine, verified nodes get a verified ring).
- **Continue:** 2–3 next suggested entities / paths (explicit "next" entry).
- **Source & Provenance:** grounding badges (verified/partial/unverified) + citations.
- *Panel hierarchy: Narrative > Inline Interpretation > Supporting Panel. No panel stacking for hierarchy.*

### 8.3 Research
- **Left:** Workspace sidebar (current + history). **Right:** Research panel.
- **Main:** query/mode selector → AI Explanation (grounded answer + citations) → evidence & sources → related dimensions (cards).
- Grounding badge always visible.

### 8.4 Workspace
- Collapsed rail (icons) → expanded: Current (1) + History (list). Each item: type glyph + name + relative time. Click jumps to Entity. Never the landing page.

### 8.5 AI Historian
- Query input (bottom/side) → grounded answer (verified badge + citations + evidence) → related entities (jump to Entity page). Every answer carries a Grounding state. No answer without provenance shown.

---

## 9. Visual Direction (tokens — implement via these, never hard-code)

**Surfaces (warm dark, brown undertone):**
`--bg-base #16130E` · `--bg-surface #1F1B14` · `--bg-elevated #2A241A` · `--bg-overlay #0D0B08`

**Accent — Antique Gold (≤2 focal points/viewport, never a fill flood):**
`--gold-600 #A8862F` (active) · `--gold-500 #CBA135` (primary) · `--gold-400 #D8B65E` (hover)

**Text (warm off-white parchment):**
`--text-high #F2EBDD` · `--text-mid #C9BFA8` · `--text-low #8C8270` · `--text-faint #5E5648`

**Borders:** `--border-subtle #2E281D` · `--border-default #3A3324` · `--border-strong #4A412E`

**Semantic — Grounding & system (product-defining, every AI surface shows one):**
`--verified #4FA784` (grounded) · `--unverified #E0883B` (caution, NOT danger) · `--danger #D9544D` · `--info #5B8DB8`
*Critical: verified/unverified are never decorative. Trust state must NOT use danger red.*

**Typography:** Display/Headings = **Spectral** (Latin) + **Noto Serif SC** (CJK). UI/Body = **Inter** + **Noto Sans SC**. Narrative 18–19px serif, measure ≤ 680px. Scale: Display 56 / H1 40 / H2 32 / H3 24 / H4 20 / Body 16–18 / Caption 13 / Overline 12 (gold, uppercase).

**Spacing:** base 4px, grid 8px. Card padding 24px default. Section gaps 48–64px. Never three consecutive 8px gaps.

**Radius:** sm 6 (tags/inputs) · md 10 (buttons) · lg 14 (cards) · xl 20 (panels) · pill 999 (pills).

**Shadow (warm-tinted, never cold-blue):** sm `0 1px 2px rgba(0,0,0,.40)` · md `0 4px 12px rgba(0,0,0,.45)` · lg `0 12px 32px rgba(0,0,0,.50)` · gold `0 0 0 1px rgba(203,161,53,.30), 0 8px 24px rgba(203,161,53,.12)`.

**Icons:** line, 1.5px stroke, rounded caps; 20px UI / 24px header; inherit text-mid, gold only active. **No emoji as chrome icons.**

**Motion:** fade / slide ≤8px / scale 0.98→1, ≤350ms, `cubic-bezier(0.22,1,0.36,1)`. No rotation/bounce/parallax. Honor `prefers-reduced-motion`.

**Shell:** top nav 64px sticky; shell max 1280px (24px gutters); reading measure 680px; Workspace sidebar 280/320px; page padding 48px desktop / 24px mobile. Touch targets ≥ 44×44px.

---

## 10. Technical Constraints

- **Stack:** React 18 + TypeScript + Vite; FastAPI backend (port 8000). Stitch output should be React + TS component-oriented, token-driven CSS (no Tailwind utility soup that breaks the design tokens).
- **Freeze baseline (red lines — Stitch must respect):** no new entity types (frozen 8) · no new relationship types (frozen 18) · no new npm dependencies · no backend/schema/API change · no runtime version bump · no removal of existing capabilities.
- **Governance:** any new component/color/font/interaction flows Proposal → Review → PO Approval → Implementation → Audit. Capability expansion → Freeze Revision Gate (ADR + architecture review + PO), not Stitch generation.
- **Tokens over literals:** every color/size/spacing must map to §9 tokens.
- **Bilingual:** zh-CN default, en-US first-class; layout must not reflow shamefully between scripts.
- **Accessibility:** target WCAG AA contrast; predictable focus order; keyboard reachable.

---

## 11. Copy-Paste Stitch Prompt

> Paste the block below directly into Google Stitch. It is self-contained; Stitch does not need the rest of this document.

```
Design a dark-first, museum-grade web UI for "History Explorer" — a history
cognition engine (the "Google Maps of history") where users navigate
relationships between people, events, civilizations, places, and ideas, with
AI guidance that is always traceable to sources.

VISUAL SYSTEM (use these exact tokens, never hard-code):
- Backgrounds (warm dark, brown undertone): base #16130E, surface #1F1B14,
  elevated #2A241A, overlay #0D0B08.
- Accent: antique gold #CBA135 (primary), #D8B65E (hover), #A8862F (active).
  Use gold on at most 2 focal points per screen; never as a large fill.
- Text (warm parchment): high #F2EBDD, mid #C9BFA8, low #8C8270, faint #5E5648.
- Borders: subtle #2E281D, default #3A3324, strong #4A412E.
- Semantic (product-defining, every AI surface shows one): verified #4FA784,
  unverified #E0883B (caution, NOT red), danger #D9544D, info #5B8DB8.
- Type: headings/display = Spectral + Noto Serif SC (serif); UI/body = Inter +
  Noto Sans SC (sans). Narrative 18-19px serif, max line width 680px.
- Spacing grid 8px; radius 6/10/14/20/pill; warm shadows only (no cold blue).
- Icons: 1.5px line style, no emoji in chrome.
- Motion: fade / slide <=8px / scale, <=350ms; respect reduced-motion.

PRINCIPLES:
1. One primary gold action per screen. 2. AI lives BESIDE content, never an
isolated "AI mode". 3. Every AI answer shows a verified/unverified grounding
badge. 4. Paragraph columns <= 680px. 5. Chrome recedes, content leads.
6. Warmth over corporate cold. 7. Restraint is the brand. 8. Bilingual
(zh-CN default, en-US first-class). 9. Tokens over literals. 10. Do NOT invent
new entity or relationship types (frozen: 8 entity / 18 relationship types).

PAGES TO GENERATE:
1) Discover (home): serif hero value sentence + single Search action (gold
focus ring); 4 quick-start question chips; curated topic cards (>=280px, 3-up);
recent-explorations strip. No dashboard widgets.
2) Entity (core): hero (name + type tag + one-line summary); immersive Story
(serif, <=680px); Relationships (graph + explained connections, select -> side
panel not modal); Timeline (vertical spine, verified nodes get a ring);
"Continue exploring" with 2-3 next entities; Source & Provenance with grounding
badges + citations. Panel hierarchy: Narrative > Inline Interpretation >
Supporting Panel. Never stack panels to fake hierarchy.
3) Research: left Workspace sidebar (current + history) + right Research panel
(query -> grounded answer + citations -> evidence -> related dimension cards).
Grounding badge always visible.
4) Workspace: collapsible left rail -> Current (1) + History list (type glyph +
name + relative time); click jumps to entity. Not a landing page.
5) AI Historian: query input -> grounded answer (verified badge + citations +
evidence) -> related entities jump-out. No answer without provenance.

DO NOT GENERATE: dashboards, Wikipedia-style fact cards, standalone chatbots,
GIS/maps, social/community features, gamification, or any new entity/relationship
types. Generate experience and layout only — no new capabilities.
```

---

*End of History Explorer — Stitch Design Package. Read-only synthesis of product artifacts; no code, no config, no capability change.*
