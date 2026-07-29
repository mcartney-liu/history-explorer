# History Explorer Design System — V1 Specification

> **Status:** V1.0 FINAL — the single official product design specification (Specification only — no code, no CSS, no implementation)
> **Author:** Design System Architecture
> **Audience:** Product, Design, Frontend Engineering
> **Scope:** Unified visual + interaction language for the entire product.
> **Out of scope (explicit):** No new capability, no interaction-logic change, no rewrite of existing components. This document *guides* implementation; it does not perform it.

---

## Chapter 0 — Revision History

| Version | Date | Author | Summary |
|---|---|---|---|
| V1 Draft | 2026-07-29 | Design System Architecture | Initial specification. Parts 1–7: Design Philosophy, Visual Language, Layout System, Page Hierarchy, Component Language, Design Principles, Roadmap. |
| V1.0 FINAL | 2026-07-29 | Chief Design System Architect | Added Chapters 0 (Revision History), 8 (Product User Journey), 9 (Product Information Architecture), 10 (Migration Guide), 11 (Implementation Order), 12 (Product Quality Checklist), 13 (Product Readiness Definition), 14 (Design Governance). Parts 1–7 unchanged. |
| V1.0 FINAL | 2026-07-29 | Chief Design System Architect | Final review pass completed: Added user journey clarification (Understand = first-layer comprehension, not summary). Strengthened Entity atomic-unit principle. Added panel hierarchy rule (Narrative > Inline Interpretation > Supporting Panel). Refined implementation phases (Workspace moved to Phase 2). Added exploration continuity checklist. Added Design System Non-Goals (Chapter 15). |

*This document is versioned. Any change to color, typography, spacing, radius, shadow, components, or principles requires a new Version row plus PO approval (see Chapter 14).*

---

## 0. How to read this document

This is the **single source of truth** for how History Explorer looks and feels. Every future page, component, and token must trace back to a rule here. Where the current codebase already matches (Design Tokens, Layout Grid, i18n shell), this document *formalizes* it. Where it diverges, this document wins and the implementation catches up in later milestones.

V1 is intentionally **dark-first** — the product's established museum-grade dark + earth-tone direction is promoted to the official baseline. A light theme is planned for V2 (see Roadmap).

---

## Part 1 — Design Philosophy

### 1.1 The feeling we are building

History Explorer is **not** an encyclopedia, a timeline tool, or a knowledge graph. It is a product that helps people *understand history with AI*. The emotional target is precise:

| We ARE | We are NOT |
|---|---|
| **Exploratory** — every screen invites the next step | A reference shelf you browse and close |
| **Trustworthy** — provenance and verification are visible, never hidden | A chatbot that asserts facts with confidence |
| **Immersive** — reading history feels like standing in a museum wing | A dashboard of widgets |
| **Restrained** — the interface recedes so the content leads | A feature-dense control panel |
| **Quietly futuristic** — AI assistance feels present but calm | A sci-fi HUD with glow and noise |

### 1.2 Three pillars

1. **Grounding over Generation.** The product's signature is *verified* history. The design must make "grounded / verified" a first-class, always-visible state — not a footnote. (This is the product's moat; the visual system encodes it.)
2. **Content is the hero.** Chrome (nav, buttons, panels) is quiet, low-contrast, and structural. Historical narrative, relationships, and sources are high-contrast and central.
3. **Bilingual by default.** zh-CN is the default locale; en-US is first-class, not a translation fallback. Type, spacing, and layout must hold both scripts without reflow shame.

### 1.3 Voice in the interface

- Microcopy is **calm and declarative**, not salesy. "已通过事实溯源验证" not "✨ Powered by AI".
- The product never claims truth it cannot show. Verification states are honest about uncertainty.

---

## Part 2 — Visual Language

### 2.1 Color

**Principle:** Warm, ink-and-parchment darkness. Backgrounds are near-black with a *brown* undertone (museum, not corporate). The single accent is **antique gold** — precious, historical, and used sparingly. Semantic colors encode the Grounding state.

#### Base & Surfaces (warm dark)

| Token | HEX | Role |
|---|---|---|
| `--bg-base` | `#16130E` | App background, scrim base |
| `--bg-surface` | `#1F1B14` | Page-level raised regions |
| `--bg-elevated` | `#2A241A` | Cards, popovers, menus |
| `--bg-overlay` | `#0D0B08` | Modal scrim, full-bleed dark |

#### Accent — Antique Gold (used sparingly, never as a fill flood)

| Token | HEX | Role |
|---|---|---|
| `--gold-600` | `#A8862F` | Active / pressed state |
| `--gold-500` | `#CBA135` | **Primary accent** (links, focus, key CTAs) |
| `--gold-400` | `#D8B65E` | Hover, highlights |

> Rule: Gold appears on **≤ 2 focal points per viewport**. It is an accent, not a theme. Large gold fills are forbidden.

#### Neutral text (warm off-white = parchment)

| Token | HEX | Role |
|---|---|---|
| `--text-high` | `#F2EBDD` | Headings, primary content |
| `--text-mid` | `#C9BFA8` | Body copy |
| `--text-low` | `#8C8270` | Secondary, captions |
| `--text-faint` | `#5E5648` | Disabled, placeholders |

#### Borders

| Token | HEX | Role |
|---|---|---|
| `--border-subtle` | `#2E281D` | Hairline dividers |
| `--border-default` | `#3A3324` | Card / panel edges |
| `--border-strong` | `#4A412E` | Input focus ring base |

#### Semantic — Grounding & system states

| Token | HEX | Meaning |
|---|---|---|
| `--verified` | `#4FA784` | **Grounded / verified by provenance** (the product's trust color) |
| `--unverified` | `#E0883B` | Answer not fully grounded — caution, not danger |
| `--danger` | `#D9544D` | Error, destructive action |
| `--info` | `#5B8DB8` | Neutral informational |

> **Critical rule:** `--verified` and `--unverified` are *product-defining*. Every AI-generated surface must show one of them. They are never used for decoration.

#### Color density rules
- Max 1 primary gold action per section.
- Max 2 semantic colors visible at once (excluding text neutrals).
- No pure `#000` / `#FFF`; all values carry the warm undertone.

### 2.2 Typography

**Principle:** A **refined serif** for display & narrative (museum, literary, historical gravity) paired with a **precise sans** for UI & body (clarity, modern SaaS). Both must support **CJK** because zh is default.

| Role | Latin | CJK | Fallback stack |
|---|---|---|---|
| Display / Headings | **Spectral** | **Noto Serif SC** | Georgia, "Songti SC", serif |
| UI / Body | **Inter** | **Noto Sans SC** | system-ui, "PingFang SC", sans-serif |

> Reference learning: Apple HIG (optical sizing discipline), Linear (Inter usage), Wikipedia (serif headings). Not copied — adapted.

#### Type Scale (desktop; mobile scales down one step)

| Level | Size | Weight | Line-height | Letter-spacing | Font |
|---|---|---|---|---|---|
| Display Hero | 56px | 600 | 1.10 | -0.02em | Serif |
| H1 | 40px | 600 | 1.15 | -0.01em | Serif |
| H2 | 32px | 600 | 1.20 | 0 | Serif |
| H3 | 24px | 600 | 1.30 | 0 | Serif |
| H4 | 20px | 600 | 1.40 | 0 | Sans |
| Body LG | 18px | 400 | 1.60 | 0 | Sans |
| Body | 16px | 400 | 1.60 | 0 | Sans |
| Body SM | 14px | 400 | 1.50 | 0 | Sans |
| Caption | 13px | 500 | 1.40 | 0 | Sans |
| Overline | 12px | 600 | 1.20 | +0.10em (upper) | Sans, gold |

#### Typography rules
- Narrative / story text uses **Serif Body** at 18–19px, measure ≤ 680px.
- UI labels, buttons, metadata use **Sans**.
- Never mix serif and sans within one sentence except for a quoted historical term.
- CJK gets +0.02em tracking on headings for breathing room.

### 2.3 Spacing

**Base unit: 4px.** Operational grid: **8px.** Generous whitespace is a feature (museum calm).

| Step | px | Usage |
|---|---|---|
| 1 | 4 | Icon-inline gap |
| 2 | 8 | Tight grouping |
| 3 | 12 | Label↔control |
| 4 | 16 | Card padding (compact) |
| 5 | 24 | Card padding (default), section gap |
| 6 | 32 | Block gap |
| 7 | 48 | Section gap (large) |
| 8 | 64 | Page-section break |
| 9 | 96 | Hero padding |
| 10 | 128 | Full-bleed section break |

**Rule:** Vertical rhythm uses even steps (24/32/48/64). Never stack three consecutive 8px gaps — escalate to 16/24.

### 2.4 Radius

Restrained, not bubbly.

| Token | px | Usage |
|---|---|---|
| `--r-sm` | 6 | Tags, inputs, chips |
| `--r-md` | 10 | Buttons |
| `--r-lg` | 14 | Cards |
| `--r-xl` | 20 | Panels, modals, drawers |
| `--r-pill` | 999 | Status pills, avatars |

### 2.5 Shadow

Warm-tinted, never cold-blue. Depth comes from **layering + warmth**, not harsh drop-shadows.

| Token | Value | Usage |
|---|---|---|
| `--shadow-sm` | `0 1px 2px rgba(0,0,0,0.40)` | Hairline lift (tags) |
| `--shadow-md` | `0 4px 12px rgba(0,0,0,0.45)` | Cards at rest |
| `--shadow-lg` | `0 12px 32px rgba(0,0,0,0.50)` | Elevated (popover, sticky) |
| `--shadow-gold` | `0 0 0 1px rgba(203,161,53,0.30), 0 8px 24px rgba(203,161,53,0.12)` | Focus / primary emphasis |

**Rule:** At most one elevated shadow per card. Hover lifts one step (md→lg), never two.

### 2.6 Icon

- Style: **line**, 1.5px stroke, rounded caps & joins.
- Default size: 20px (UI), 24px (section headers).
- Color: inherit `--text-mid` by default; gold only for active/selected.
- Reference: Linear, Figma icon sets — geometric, quiet, no skeuomorphism.
- No emoji as icons in production chrome (emoji may appear only in historical-content context, e.g. entity type glyphs, and must be treated as content not chrome).

### 2.7 Illustration

- Editorial, artifact-inspired: thin gold line art on dark, evoking reliefs, manuscripts, maps.
- Never cartoonish, never 3D-rendered mascots.
- Used sparingly: empty states, onboarding, section dividers.
- Default palette: gold line (`--gold-500`) at 40–60% opacity on `--bg-surface`.

### 2.8 Motion

Restrained, purposeful. Motion explains *state*, not *decoration*.

| Token | Duration | Easing |
|---|---|---|
| `--motion-micro` | 150ms | `cubic-bezier(0.22,1,0.36,1)` |
| `--motion-std` | 250ms | `cubic-bezier(0.22,1,0.36,1)` |
| `--motion-emph` | 350ms | `cubic-bezier(0.22,1,0.36,1)` |

**Rules:**
- Only 3 motion types: fade, slide (≤ 8px), scale (0.98→1).
- No rotation, no bounce, no parallax.
- Honor `prefers-reduced-motion`: collapse all to fade-only 0ms.
- Page transitions: cross-fade 250ms, no slide-between-routes.

---

## Part 3 — Layout System

Unified shell for every page. One grid, one nav, one content measure.

### 3.1 Shell

| Element | Spec |
|---|---|
| Top Navigation | Height **64px**, sticky, `--bg-base` with `--border-subtle` bottom hairline. Left: wordmark. Center/right: primary nav + locale switch. |
| Max shell width | **1280px** (centered, 24px gutters) |
| Content container | **1200px** max for general pages |
| Reading measure | **680px** max for narrative/story/text columns |
| Sidebar (Workspace) | **280px** collapsed, **320px** expanded, left-docked on Research/Workspace |
| Page vertical padding | 48px top/bottom on desktop, 24px on mobile |

### 3.2 Grid

- **12-column** flex/grid, **24px** gutter, **8px** baseline.
- Cards: minimum **280px**; in a 12-col grid, 3-up = 4 cols, 2-up = 6 cols, 1-up = 12 cols.
- Asymmetry allowed: Hero may span 8 cols, supporting panel 4 cols.

### 3.3 Key regions

| Region | Definition |
|---|---|
| **Hero** | Top of Discover & Entity. Serif Display, one sentence of value, primary action. Max 720px text width. |
| **Content Width** | 680–1200px depending on page type (reading vs browse). |
| **Reading Width** | 680px hard cap for any paragraph column. |
| **Card Width** | Flexible ≥280px; never full-bleed alone. |
| **Workspace** | Persistent left panel on Research/Workspace views; collapsible. |

### 3.4 Responsive (breakpoints)

| Name | px | Behavior |
|---|---|---|
| Mobile | < 640 | Single column; nav collapses to menu; sidebar hidden behind toggle |
| Tablet | 640–1024 | 2-up cards; sidebar overlay |
| Desktop | 1024–1440 | Full 12-col; sidebar docked |
| Wide | > 1440 | Shell caps at 1280; extra space as margins |

> Touch target minimum: **44×44px**.

---

## Part 4 — Page Hierarchy

Hierarchy = information order, not pixels. Each page has **one** primary action and a clear top-down reading path.

### 4.1 Discover (home)
```
Hero (value proposition, one sentence)
  ↓
Search (primary action — the entry point)
  ↓
Quick-start questions (4 suggested, fill search)
  ↓
Topic cards (curated civilizations / themes, grid)
  ↓
Recent explorations (returning user, from Workspace)
```
*Primary action: Search. Everything else is invitation, not requirement.*

### 4.2 Entity (exploration page)
```
Hero (entity name, type, one-line summary)
  ↓
Story (narrative — the immersive core, serif, 680px)
  ↓
Relationships (graph + explained connections)
  ↓
Timeline (chronological anchor)
  ↓
Continue (next suggested entities / paths)
  ↓
Source & Provenance (grounding, verification badges)
```
*Primary action: "深入研究" (Research) or "加入对比". AI answers appear inline beside content, never as a separate mode.*

### 4.3 Research
```
Workspace sidebar (current + history)   |   Main: Research panel
  ↓                                      ↓
Query / mode selector                   AI Explanation (grounded answer + citations)
  ↓                                      ↓
Evidence & sources                      Related dimensions (cards)
```
*Primary action: ask / run research. Grounding badge always visible.*

### 4.4 Workspace
```
Collapsed rail (icons)  →  expanded: Current + History list
  ↓
Each item: name, type glyph, last-visited, jump
```
*Primary action: resume an exploration. Workspace is a surface, not a destination — never the landing page.*

### 4.5 AI Historian
```
Conversation / query input (bottom or side)
  ↓
Grounded answer (verified badge + citations + evidence)
  ↓
Related entities (jump-out to Entity page)
```
*Primary action: ask. Every answer carries a Grounding state. No answer without provenance shown.*

---

## Part 5 — Component Language

Style definitions only. Each component has a consistent "silence" — quiet chrome, content-forward.

### 5.1 Card
- Surface: `--bg-elevated`, border `--border-default`, radius `--r-lg`, shadow `--shadow-md`.
- Padding: 24px default.
- Hover: shadow → `--shadow-lg`, border → `--border-strong`, 250ms.
- Never gold-filled. Gold only as a 2px top accent on *featured* cards (≤1 per screen).
- Content order: label (overline) → title (serif H3) → body (sans) → meta (caption, low).

### 5.2 Button
- **Primary:** gold-500 bg, ink text, radius `--r-md`, padding 10×20. Hover gold-400. *Max one per viewport.*
- **Secondary:** transparent bg, `--border-default`, text-mid. Hover `--bg-surface`.
- **Ghost:** no border, text-mid, hover text-high. For low-emphasis.
- **Danger:** danger color text/border, never filled red.
- Disabled: text-faint, no shadow, not clickable.
- Icon buttons: 40×40, radius `--r-md`.

### 5.3 Section
- A titled block. Overline label (gold, uppercase) + Serif H2 title + optional description.
- Vertical gap to next section: 48–64px.
- Divider: `--border-subtle` hairline, never a heavy rule.

### 5.4 Panel
- Larger than a card; holds a sub-tool (Research, Graph, Workspace). Surface `--bg-surface`, radius `--r-xl`, padding 24–32.
- Has a header row: title (sans H4) + optional action. Body scrolls independently if needed.

### 5.5 Tag / Badge
- radius `--r-pill` or `--r-sm`, padding 4×10, caption/overline text.
- Types: **type tag** (entity kind, neutral), **status pill** (verified/unverified — semantic color), **filter chip** (toggle, gold when active).
- Status pills use semantic colors with 12% bg tint + 1px border in same hue.

### 5.6 Timeline
- Vertical or horizontal spine in `--border-default`.
- Nodes: 12px dots; verified nodes get a `--verified` ring.
- Labels: caption, text-low; event title serif H4.
- Max density: one era label per 5 nodes.

### 5.7 Graph (Relationship)
- Dark canvas, edges `--border-strong` (thin), nodes as soft discs with type color.
- 8 entity-type colors (matching frozen ENTITY_TYPES=8), 18 relationship labels (matching RELATIONSHIP_TYPES=18) — *design must not introduce new types*.
- Hover: node lifts (shadow-lg), connected edges brighten to gold-400.
- Selected: gold ring + side panel (not modal).

### 5.8 Workspace
- Left rail, 280/320px. Two zones: **Current** (1 item) + **History** (list).
- List item: type glyph + name (sans) + relative time (caption, low).
- Click → jumps to Entity. No inline editing.

### 5.9 Search
- Primary entry. Input: `--bg-surface`, `--border-default`, radius `--r-md`, 16px padding, placeholder text-low.
- Focus: `--shadow-gold` ring.
- Submit: gold primary button or enter-to-search.
- Results: ranked list, each row = name (serif) + type tag + one-line context.

---

## Part 6 — Design Principles (10)

1. **One primary action per viewport.** Gold is earned, not sprinkled. If two buttons compete, one becomes secondary.
2. **AI lives beside content, not in a mode.** Grounded answers, explanations, and suggestions appear inline next to the history they reference — never behind a separate "AI" tab that isolates them.
3. **Every AI answer shows its Grounding.** Verified or unverified is always visible. No answer without provenance.
4. **Reading measure is sacred.** Any paragraph column caps at 680px. Wide screens add margin, never wider text.
5. **Chrome recedes, content leads.** Nav, borders, and buttons stay low-contrast; narrative, relationships, and sources stay high-contrast.
6. **Warmth over corporate cold.** Every surface carries the brown undertone. No pure gray, no pure blue shadow.
7. **Restraint is the brand.** Motion explains state, not delight. Illustration is editorial, not decorative. Empty space is intentional.
8. **Bilingual is default, not fallback.** zh and en share one layout; neither reflows the other into shame.
9. **Tokens over literals.** No hard-coded color/size in implementation. Every value traces to Part 2.
10. **Don't invent types.** The 8 entity types and 18 relationship types are frozen. The visual system renders them; it never adds new ones.

---

## Part 7 — Roadmap

No code in this document. The roadmap describes *maturity*, not tickets.

### V1 — Foundation & Unification (now)
- Formalize the dark + earth + gold language as the baseline (this document).
- Token alignment: existing `tokens.css / typography.css / components.css / layout-grid.css` converge to Part 2–3 exactly.
- Apply unified hierarchy (Part 4) and component language (Part 5) across Discover, Entity, Research, Workspace, AI Historian.
- Ship the 10 principles as review checklist.
- **Exit criteria:** every page reads as one product; no page looks like a dev demo.

### V2 — Depth, Motion & Light (next)
- **Light theme** as a first-class, token-driven alternative (same tokens, inverted surfaces) — not a reskin.
- Full motion system rollout (Part 2.8) with reduced-motion support.
- Responsive hardening: tablet/wide layouts per Part 3.4.
- Illustration library (Part 2.7) for empty/onboarding states.
- Component density modes (comfortable / compact) for Research power-users.
- **Exit criteria:** theme-swappable without code change; flawless on mobile→wide.

### V3 — AI-Native & Internationalization Maturity (future)
- AI surfaces become the *connective tissue* across pages (persistent grounded context), fully embodying Principle 2.
- Localization framework beyond zh/en (token-based copy, RTL-ready layout where needed).
- Design tokens versioned & published as a consumable package; contribution guide for new components.
- Accessibility audit to WCAG AA (contrast, focus order, screen-reader narrative).
- **Exit criteria:** a designer can ship a new History Explorer page in a day, fully on-spec, no archeology.

---

## Chapter 8 — Product User Journey

The complete lifecycle, not pages.

```
Discover  →  Understand  →  Explore  →  Research  →  Save  →  Return  →  Share
```

For each step: 用户目标 / 用户心理 / 页面入口 / 页面出口 / 下一步.

| Step | 用户目标 | 用户心理 | 页面入口 | 页面出口 | 下一步 |
|---|---|---|---|---|---|
| **Discover** | 找到想探索的历史主题 / 人物 / 文明 | 好奇、开放、"带我看看" | 落地页 Hero + Search | 点击结果 / 主题卡 / quick-start | Understand |
| **Understand** | 建立第一层历史理解：它是什么 / 为什么重要 / 与谁相关（而非仅获取摘要） | "原来如此"、"这跟我有关吗" | Entity Hero + Story + Summary + WhyImportant | 关系 / 时间线 | Explore |
| **Explore** | 看实体如何连接他者、在时间长河中的位置 | 沉浸、联想、"还有什么呢" | Relationship Graph + Timeline + CrossTopic | 点击关联实体 | Research 或 另一 Understand |
| **Research** | 针对具体问题获得带溯源的回答与证据 | 求证、严谨、"证据在哪" | Research Panel / AI Historian | 证据 + 引用 + 相关维度 | Save |
| **Save** | 把当前探索留痕，便于续接 | 安心、"下次接着看" | Workspace（自动）+ 书签 | 返回列表 / 清空 | Return |
| **Return** | 重新进入未完成的探索 | 连贯、"我记得看到哪了" | Workspace 历史项 | 跳转 Entity | 续 Explore / Share |
| **Share** | 把一段历史理解交给他人 | 认同、"这值得给人看" | 分享入口（实体 / 回答 / 时间线片段） | 生成可分享视图 | 他人 Discover |

*Understand 的边界（防退化）：Understand 交付的是"第一层历史理解"——它是什么、为什么重要、与哪些人物/事件/文明相关——而不是中立、割裂的知识条目堆砌。这是 Entity 页面不退化成 Wikipedia 式知识卡片的关键：Summary 是入口，不是终点；Story + WhyImportant 一起构成"理解"，而非"定义"。*

**Why users continue:** 每一步都显式给出"下一步"入口（Design Principle #7）。探索是树状而非线性——关联实体不断分叉，永远有下一跳。
**Why users return:** Workspace 自动留痕 + 阅读进度保存，回来的成本是零；Return 是产品"连续性"的直接兑现。
**Why users share:** Grounding 让内容"可背书"——用户愿意把**已验证**的历史发给他人，这是普通 chatbot 不可信内容做不到的。

---

## Chapter 9 — Product Information Architecture

The information structure of the whole product, not page structure.

**核心原则 — Entity is the atomic unit of historical understanding.**
Entity 是历史理解的最小不可分割单元。所有历史对象——人物、事件、文明、地点、思想——都应以 Entity 作为产品的理解节点（understanding node），而非孤立的数据行。任何模块的"输入 / 输出"都围绕 Entity 组织；没有 Entity，其他模块无物可附。本 IA 表中的所有关系，皆以 Entity 为锚点展开。

| Module | 存在意义 | 输入 | 输出 | 与其他模块关系 |
|---|---|---|---|---|
| **Discover** | 产品门面与入口，把"探索历史"变成一次邀请 | 用户查询 / 主题选择 | 一个 Entity 探索会话 | 上游入口；下游接 Entity；Workspace 提供"最近探索" |
| **Entity** | 产品核心单位——一个人 / 事件 / 文明的理解容器 | 一个实体（local id） | 叙事 + 关系 + 时间线 + 溯源 | 被 Discover 进入；向 Research 提供 context；向 Workspace 写记录；Graph 由此展开 |
| **Research** | 把散点理解收敛为带证据的回答 | Entity context + 用户问题 | Grounded answer + citations + evidence | 依赖 Entity 提供 grounding context；写入 Workspace；与 AI Historian 共享回答渲染 |
| **Workspace** | 探索的记忆层，让产品"连续"而非"每次从零" | 用户行为（浏览 / 书签） | 当前 + 历史列表 | 横向服务于所有模块；不独立成页 |
| **AI Historian** | 让用户用自然语言向历史提问，且每次回答都带溯源 | 自然语言问题 + 可选 Entity context | Grounded answer（与 Research 同源渲染） | 是 Research 的对话形态；共享 GroundedAnswer 渲染与 Citation 体系；不脱离内容单独存在（Principle #2） |

---

## Chapter 10 — Migration Guide

Audit of the current component inventory against this system. Five explicit states:

- **KEEP** — correct, on-spec, actively used → no change.
- **MERGE** — overlaps / duplicates another → consolidate into one module.
- **REMOVE** — dead / detached code → delete.
- **HIDE** — dev-only / experimental → not user-facing.
- **LATER** — real but deferred / needs rework → revisit in a later phase.

| Component | Module | Current | Future | Decision | Reason |
|---|---|---|---|---|---|
| LandingPage | Discover | 落地页 | KEEP | **KEEP** | 主入口，已产品化 |
| FeaturedTopics | Discover | 主题卡 | KEEP | **KEEP** | 入口内容 |
| RecentExplorations | Discover | 最近探索 | KEEP | **KEEP** | 返回入口 |
| FirstExplorationGuide | Discover | 新手引导 | MERGE | **MERGE** | 与 ContinueExploringPanel / RecommendationPanel 合并为单一 Discover 引导 |
| ContinueExploringPanel | Discover | 续探索 | MERGE | **MERGE** | 合并入 Discover 引导 |
| RecommendationPanel | Discover | 推荐 | MERGE | **MERGE** | 合并入 Discover 引导 |
| EntitySearchBox | Discover | 搜索输入 | KEEP | **KEEP** | 搜索入口（配 SearchResults） |
| SearchResults | Discover | 搜索结果 | KEEP | **KEEP** | 结果渲染 |
| EntityPageShell | Entity | 三栏壳 | KEEP | **KEEP** | 实体页骨架 |
| EntityHeader | Entity | Hero | KEEP | **KEEP** | 实体头（原 EntityHero 更名） |
| MainEntityCard | Entity | 主卡 | KEEP | **KEEP** | — |
| SummaryPanel | Entity | 摘要 | KEEP | **KEEP** | — |
| StorySection | Entity | 叙事 | KEEP | **KEEP** | 沉浸核心 |
| WhyImportantPanel | Entity | 为何重要 | KEEP | **KEEP** | — |
| InterpretationPanel | Entity | 解读 | KEEP | **KEEP** | — |
| TimelinePanel | Entity | 时间线 | KEEP | **KEEP** | 吸收 MultiEntityTimeline 为模式 |
| MultiEntityTimeline | Entity | 多实体时间线 | MERGE | **MERGE** | 并入 TimelinePanel（mode） |
| ProvenancePanel | Entity | 溯源 | KEEP | **KEEP** | Grounding 落点 |
| EntityExplorationGuide | Entity | 探索指引 | KEEP | **KEEP** | — |
| ExplorationFlowGuide | Entity | 流程指引 | KEEP | **KEEP** | — |
| RelationshipView | Relationship | 关系视图 | KEEP | **KEEP** | — |
| RelatedEntityList | Relationship | 关联列表 | KEEP | **KEEP** | — |
| GraphViewPanel | Relationship | 关系图 | KEEP | **KEEP** | 冻结 8 色 / 18 标签 |
| ConnectionsExplainedPanel | Relationship | 关系解读 | MERGE | **MERGE** | 与 ConnectionsPanel 合并为单一 Connections 模块 |
| ConnectionsPanel | Relationship | 关系面板 | MERGE | **MERGE** | 同上 |
| RelationshipInsightPanel | Relationship | 关系洞察 | MERGE | **MERGE** | 并入 Graph / Connections 模块 |
| RelationshipEvidence | Relationship | 关系证据 | MERGE | **MERGE** | 并入 Connections / Provenance |
| RelationshipPathGraph | Relationship | 路径图 | MERGE | **MERGE** | 并入 GraphViewPanel |
| CrossTopicBridge | Relationship | 跨主题桥 | MERGE | **MERGE** | 与 CrossTopic* 合并为 CrossTopic 模块 |
| CrossTopicConnectionsPanel | Relationship | 跨主题连接 | MERGE | **MERGE** | 同上 |
| CrossTopicTopicList | Relationship | 跨主题列表 | MERGE | **MERGE** | 同上 |
| ResearchPanel | Research | 研究面板 | KEEP | **KEEP** | — |
| ResearchLibrary | Research | 研究库 | KEEP | **KEEP** | — |
| ResearchDiscoveryPanel | Research | 发现 | MERGE | **MERGE** | 与 Dimension / Recommendation 合并为 Research 子区 |
| ResearchDimensionCard | Research | 维度卡 | MERGE | **MERGE** | 同上 |
| ResearchRecommendationCard | Research | 推荐卡 | MERGE | **MERGE** | 同上 |
| ResearchSummary | Research | 摘要 | MERGE | **MERGE** | 与 ResearchReport 合并 |
| ResearchReport | Research | 报告 | MERGE | **MERGE** | 同上 |
| ResearchBookmarkButton | Research | 书签 | KEEP | **KEEP** | Save 落点 |
| AIExplanationPanel | Research/AI | AI 解释 | KEEP | **KEEP** | 提问→回答容器 |
| GroundedAnswer | Research/AI | 回答渲染 | KEEP | **KEEP** | Grounding 渲染层 |
| HistorianChat | Research/AI | 对话 | KEEP | **KEEP** | AI Historian 形态 |
| CitationList | Research/AI | 引用 | KEEP | **KEEP** | — |
| ExplorationJourney | Journey | 旅程 | MERGE | **MERGE** | 与 JourneyCard / JourneyPanel 合并为 Journey 模块 |
| JourneyCard | Journey | 旅程卡 | MERGE | **MERGE** | 同上 |
| JourneyPanel | Journey | 旅程面板 | MERGE | **MERGE** | 同上 |
| ExplorationPathTree | Journey | 路径树 | MERGE | **MERGE** | 与 ExplorationPathsPanel / ExplorationTrail 合并 |
| ExplorationPathsPanel | Journey | 路径面板 | REMOVE | **REMOVE** | M60 已从 EntityPage 解绑，死代码 |
| ExplorationTrail | Journey | 探索轨迹 | MERGE | **MERGE** | 并入路径模块 |
| ThemesPanel | Journey | 主题 | LATER | **LATER** | 主题浏览，延后推广 |
| EventCausalChain | Event | 因果链 | LATER | **LATER** | Event 类型富视图，待 Entity event 成熟 |
| EventImpactPanel | Event | 影响 | LATER | **LATER** | 同上 |
| EventNarrativeCard | Event | 叙事卡 | LATER | **LATER** | 同上 |
| EventNarrativeJourney | Event | 叙事旅程 | LATER | **LATER** | 同上 |
| WorkspacePanel | Workspace | 工作台 | KEEP | **KEEP** | — |
| ExplorationHistoryList | Workspace | 历史列表 | KEEP | **KEEP** | — |
| TopicComparisonPanel | Compare | 主题对比 | LATER | **LATER** | 对比是 Phase 3 方向，先统一再推广 |
| TemporalComparisonPanel | Compare | 时间对比 | LATER | **LATER** | 同上 |
| MultiEntitySelector | Compare | 多实体选择 | LATER | **LATER** | 同上 |
| MultiEntityContextPanel | Compare | 多实体上下文 | LATER | **LATER** | 同上 |
| EntityPickerPanel | Compare | 实体选择 | LATER | **LATER** | 同上 |
| ui/Card | UI | 卡片基元 | KEEP | **KEEP** | 基础基元 |
| Breadcrumb | UI | 面包屑 | KEEP | **KEEP** | — |
| EmptyState | UI | 空态 | KEEP | **KEEP** | — |
| ErrorCard | UI | 错误卡 | KEEP | **KEEP** | — |
| LoadingSkeleton | UI | 骨架 | KEEP | **KEEP** | — |
| HistoryBar | UI | 历史条 | LATER | **LATER** | 角色待澄清 |
| FeedbackWidget | UI | 反馈 | KEEP | **KEEP** | — |
| DevCatalog | Dev | 开发目录 | HIDE | **HIDE** | 仅开发可见 |
| visual-check.mjs | Dev | 视觉校验脚本 | HIDE | **HIDE** | QA 工具，不面向用户 |

**Entity Panel 控制原则（补充约束）**
Entity 页面禁止通过增加 Panel 数量来表达信息层级——信息层级由内容本身的优先级决定，而非容器堆叠。
优先级顺序（从高到低）：
1. **Narrative Section**（叙事，沉浸核心）— 永远第一位，是 Entity 页面的主体。
2. **Inline Interpretation**（行内解读，附在内容旁）— 次之，解读随内容流动，不另起面板。
3. **Supporting Panel**（支撑面板，图 / 表 / 溯源）— 最低，仅承载无法内联的结构化内容。
Panel 是结构容器，不是内容堆积容器。当 Entity 页面 Panel 数量增长时，应先问"能否内联 / 并入叙事"，而非新增 Panel。这是防止 Entity 页面退化成 Dashboard 的硬性约束，与 Chapter 4 / Part 5 的"内容领先、Chrome 退后"一致。

---

## Chapter 11 — Implementation Order

From a product standpoint — correct sequence if a team builds it.

**Phase 1 — Foundation surface**
`Discover (LandingPage) → Entity (EntityPage) → 最小连续性能力（基础保存 / Return）`
- *Why:* 产品必须有"入口 → 核心单位 → 记忆"三段才能被人用。顺序不可换：没有 Entity，Discover 无处落地；没有最小连续性（自动留痕 + 可返回），探索不可续。
- *Why not another order:* 先 Entity 后 Discover 会让用户进来无门；先完整 Workspace 后 Entity 则记忆无物可记。

**Phase 2 — Depth + Memory maturity**
`Workspace（丰富化：历史列表 / 跳转 / 记忆浏览） + Research (ResearchPanel) + AI Historian (HistorianChat / AIExplanationPanel)`
- *Why:* Workspace 的核心价值是 Return，而非首次 Discover——因此它在 Phase 1 只需"最小连续性"即可成立，丰富形态与 Research / AI 同阶段落地，三者共享"记忆 → 求证 → 回答"的连续性闭环。Research 依赖 Entity 提供的 grounding context；AI Historian 与 Research 共享 GroundedAnswer 渲染。
- *Why not another order:* 先 Research 后 Entity → Research 无 grounding context 可咬；先 AI 后 Entity → 回答无内容可附。

**Phase 3 — Breadth (controlled)**
`Compare (对比家族统一) → Cross-topic 成熟 → 主题浏览`
- *Why:* 对比 / 跨主题是"进阶探索"，面向已建立基础的用户；必须在 Phase 1–2 稳定后。
- *Explicitly NOT in V1:* Community、GIS 等触碰冻结红线（ENTITY=8 / REL=18、无 GIS）的能力，本规范不新增。如需，必须走 Freeze Revision Gate（见 Chapter 14）。本规范只排序，不发明。

*General rule: 基础先于深度，深度先于广度。*

---

## Chapter 12 — Product Quality Checklist

Every page must pass this before launch (20–30 items).

- [ ] 是否每屏只有一个主要行动（金色）？
- [ ] 是否存在清晰视觉层级（Hero > 内容 > meta）？
- [ ] 段落列宽是否 ≤ 680px？
- [ ] 是否所有颜色 / 尺寸都来自 Token（无硬编码）？
- [ ] 是否所有可点元素都有 hover / active 反馈？
- [ ] 每个回答 / AI 表面是否显示 Grounding 状态（已验证 / 未验证）？
- [ ] 用户是否始终知道"下一步"在哪？
- [ ] 用户完成一次 Entity 阅读后，是否存在自然下一跳（关联实体 / 时间线下一事件 / Research 入口 / Continue Exploration）？
- [ ] 是否符合 Museum Feeling（暗金 + 大地色，无纯灰 / 纯蓝阴影）？
- [ ] 是否符合 Exploration Feeling（入口邀请、关联分叉）？
- [ ] 是否符合 Calm AI（AI 在内容旁，不喧宾夺主）？
- [ ] 是否双语（zh / en）布局无 reflow 羞耻？
- [ ] 是否遵循 8px 间距栅格？
- [ ] 是否遵循圆角 / 阴影层级（无越级）？
- [ ] 图标是否统一 1.5px 线性风格？
- [ ] 动效是否仅在 fade / slide ≤ 8px / scale，且 ≤ 350ms？
- [ ] 是否尊重 `prefers-reduced-motion`？
- [ ] 触摸目标是否 ≥ 44×44px？
- [ ] 空态是否有（非错误）引导而非空白？
- [ ] 加载是否有骨架而非仅 spinner？
- [ ] 错误是否有可恢复指引而非死胡同？
- [ ] 面包屑是否反映真实层级？
- [ ] 焦点顺序是否可预测（键盘可达）？
- [ ] 对比度是否达 WCAG AA？
- [ ] 是否未引入新实体 / 关系类型（冻结 8 / 18）？
- [ ] 插画 / 图标是否编辑式而非卡通？
- [ ] 页面是否安静（无装饰性动效 / 无噪点）？
- [ ] 是否任意新增组件都经 Chapter 14 流程？

---

## Chapter 13 — Product Readiness Definition

When is History Explorer a product a user can actually use? Defined by experience, not capability.

**MVP Ready（体验基线）**
- 入口 → 实体 → 记忆 三段可用且视觉统一（Phase 1 完成）
- 统一暗金视觉落地，无页面像 dev demo
- 搜索 → 实体 → 关系 → 时间线 主路径无断裂
- Grounding 在 Entity 可见
- 双语可切换

**Beta Ready（深度可用）**
- Research + AI Historian 可用，回答带引用
- Workspace 历史可续接
- 质量清单（Chapter 12）26 条全过
- 移动端可用

**Public Ready（可对外）**
- 亮色主题可选（V2）
- 对比 / 跨主题成熟
- 无障碍 AA 审计通过
- 设计令牌发包，新页面可一日上线
- 分享视图可用

---

## Chapter 14 — Design Governance

How any new page / component / color / font / interaction must flow, so the system stays coherent.

```
Proposal  →  Review  →  Approval  →  Implementation  →  Audit
```

- **Proposal** — 任何新增先提 Design Proposal（动机 + 草图 + 对 10 原则 / Chapter 12 的影响）。禁止"先写再补规范"。
- **Review** — 设计系统负责人 + 前端 + PM 评审，对照 Chapter 12 清单与 10 条原则。
- **Approval** — PO 批准。**触及冻结红线者（ENTITY=8 / REL=18、无新依赖、无 AI 运行时变更）必须走 Freeze Revision Gate：ADR + 架构评审 + PO**，不批量豁免。
- **Implementation** — 仅使用 Token；禁止硬编码；新组件先入 `ui/` 基元；遵循 Chapter 10 的 KEEP / MERGE 决策。
- **Audit** — 每个 PR 跑质量清单；季度设计走查；偏差记入 Chapter 0 Revision History。

*Red lines are non-negotiable: this system describes experience, not capability expansion. Any proposal that adds a capability collides with the freeze and is routed to the Gate, not to Implementation.*

---

## Chapter 15 — Design System Non-Goals

本设计系统描述"体验"，不描述"能力扩张"。为防止未来设计或 AI Agent 自行扩展产品能力，明确以下非目标：

**Design System 不负责：**

- 新历史数据模型（data model）的定义
- 新 AI 能力的定义与运行时
- 商业模式设计
- Community（社区）功能
- GIS 产品（地理信息 / 地图探索）
- 游戏化（gamification）
- 社交功能（关注 / 分享网络 / 动态流）

任何能力扩展——无论由设计师还是 AI Agent 提出——**不经过本设计系统审批**，必须走：

`Product Architecture Review → Freeze Revision Gate（ADR + 架构评审 + PO 批准）`

*本系统只排序与规范体验；它不发明能力。触碰冻结红线（ENTITY=8 / REL=18、无新依赖、无 AI 运行时变更）者，一律路由至 Gate，而非 Implementation。这与 Chapter 14 的治理流程一致。*

---

*End of History Explorer Design System — V1.0 FINAL. This is the single official product design specification. Implementation follows in later milestones, gated by freeze policy and PO approval.*
