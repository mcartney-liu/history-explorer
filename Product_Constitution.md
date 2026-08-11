# History Explorer - Product Constitution

Version: 2.0

Status: Active

Last Amendment: 2026-08-07 (ADR-0013, Article 0 established)


# 0. Article 0 - Ultimate Positioning（产品终极定位）

> Authority: highest. This article overrides every other section of this constitution.
> Source: PO, 2026-08-07. Ratified by ADR-0013.
> The Chinese text below is the authoritative wording. English is reference translation only.

## 0.1 The Three Sentences（三句话，权威文本）

**第一句**：它是一个帮助人类逐渐形成文明、理解、认知结构的探索系统。

**第二句**：它能够帮助用户找到自己的兴趣和自己的学习方法。

**第三句**：它帮助用户无限逼近真相。

**通俗版**：用户进来的时候好奇，离开的时候有了一个更聪明的自己。

Reference translation:
1. A system that helps humans progressively build civilizational, interpretive and cognitive structures.
2. It helps users discover their own interests and their own way of learning.
3. It helps users approach truth without limit.
   Plain form: users arrive curious, and leave with a smarter version of themselves.

## 0.2 The Three Layers（三层结构，唯一权威解读）

| Layer | Sentence | Question answered | What is measured |
|-------|----------|-------------------|------------------|
| Object 对象层 | 1 | What grew inside the user's mind | Cognitive structure |
| Subject 主体层 | 2 | What the user learned about themselves | Meta-cognition |
| Truth 真值层 | 3 | Whether what grew is trustworthy | Credibility |

None of the three layers is optional.
Sentence 1 alone means "knowing more". 1+2 means "knowing how one knows". Only 1+2+3 means "smarter".

## 0.3 Domain Boundary（领域边界）

- Product essence: a cognitive-structure exploration system. Domain-agnostic by nature.
- Current carrier: history, and history only.
- Implementation scope is locked to history for MVP and all foreseeable milestones. This article grants no authorization for multi-domain implementation.
- "History understanding exploration engine" remains valid as a **carrier-level** description, no longer as the product essence.

## 0.4 Falsifiability Test（可证伪判据，最高判据）

At exit, the user must be able to answer: **"你觉得自己变聪明了吗？"**（Do you feel you got smarter?）
Inability to answer means the positioning has failed.

The M89.1 test ("is it answering questions, or leading me to understand a topic?") remains valid as a secondary test.

## 0.5 Precedence（效力层级）

```
Article 0  Ultimate Positioning
   binds
Section 2  Core Product Beliefs (B1-B5)
Section 3  Product Boundaries
           Experience Constitution P01-P09
           Frontend Non-negotiables FP-01..03
           Architecture Freeze Boundary
           Governance / Decision Questions / Team P0 Rules
```

Where any lower provision conflicts with Article 0, Article 0 prevails, and the conflicting provision must be amended through the Freeze Revision Gate.


# 1. Purpose

This document defines the fundamental principles that govern all product decisions of History Explorer.

Any future feature, design, technology choice, or AI behavior should respect these principles.


# 2. Core Product Beliefs


## 2.1 History Is Connected

History should not be presented as isolated facts.

Events, people, civilizations, locations, and time periods should be connected through meaningful relationships.

This is expressed through the **Graph-first** presentation principle and the four co-equal dimensions - Graph (Relationship Structure), Timeline (Time Dimension), Map (Spatial Dimension), AI (Interpretation & Guidance Layer) - all serving the Exploration Experience (see `Product_DNA.md` Section 4).


## 2.2 Exploration Is The Core Experience

The product should encourage users to explore.

The goal is not only to answer questions, but to inspire further discovery.


## 2.3 Understanding Is More Important Than Information Volume

The product should prioritize:

- Context.
- Relationships.
- Causes.
- Consequences.

More information does not automatically create better understanding.


## 2.4 AI Is A Guide, Not The Authority (Interpretation & Guidance Layer)

AI should help users explore and understand history. AI is the **Interpretation & Guidance Layer** - it explains why a node matters and suggests what to explore next.

AI should:

- Explain.
- Connect.
- Provide context.
- Suggest exploration paths (Next Node).

AI should **not** replace the graph structure, evidence, sources, or critical thinking. AI is a guide, not the map.


# 3. Product Boundaries


History Explorer must NOT become:


## A Content Dump

The product should avoid simply collecting massive amounts of disconnected information.


## A Generic AI Chatbot

AI interaction must always serve historical exploration.


## A Short-Term Engagement Product

The product should not sacrifice historical understanding for meaningless engagement metrics.


## A Biased Historical Interpretation Engine

The product should encourage exploration and understanding while respecting historical complexity.


# 4. Decision Principles


When evaluating new ideas, ask:


## Question 1

Does this improve historical exploration?


## Question 2

Does this help users understand connections?


## Question 3

Does this increase meaningful discovery?


## Question 4

Does this preserve long-term product value?


If the answer is no, the idea should be reconsidered.


# 5. AI Agent Rules


AI Agents working on History Explorer must:

1. Follow this Product Constitution.
2. Respect existing product principles.
3. Avoid introducing features that conflict with product direction.
4. Ask for clarification when requirements conflict.
5. Prefer long-term product quality over quick implementation.


# 6. Product Evolution Principle


History Explorer should evolve carefully.

New capabilities should strengthen:

- Exploration.
- Connection.
- Understanding.
- Discovery.


The product should remain focused on helping humans explore and understand history.


# 7. Related Documents

- PROJECT_CONTEXT.md
- PROJECT_CHARTER.md
- Product_DNA.md
- README.md
- PRD.md
- Architecture Documents
