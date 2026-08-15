> ## ⚠️ Derived Product Vision Mirror — NOT the Source of Truth
>
> **Sole Source of Truth:** *History Explorer PRD v1.0* (original document `History_Explorer_PRD_完整版_v1.0.docx`, 2026-07-01).
> This file is a version-controlled **markdown mirror**, kept in sync for git / Agent readability.
> **No dual source:** if this mirror and the `.docx` diverge, the `.docx` wins.
> Synced: 2026-07-21 (PRD v1.0) · **定位章节已按 Article 0（ADR-0013）同步：2026-08-15（原 .docx 定位章节仍为旧版，待人工同步）**

# History Explorer — Product Vision (Derived Mirror)

## Vision
**History Explorer = 帮助人类形成认知结构的探索系统**（Article 0，产品终极定位）。
> 第一句：它是一个帮助人类逐渐形成文明、理解、认知结构的探索系统。
> 第二句：它能够帮助用户找到自己的兴趣和自己的学习方法。
> 第三句：它帮助用户无限逼近真相。
> 通俗版：用户进来的时候好奇，离开的时候有了一个更聪明的自己。

历史是当前的首个载体与验证场景（领域无关，见 ADR-0013 D2/D5.1）；**跨学科学原子化贯通**是未来愿景，本期不扩张领域。

## Positioning — 认知结构探索系统（历史载体）
- 三层结构缺一不可（ADR-0013 权威解读）：
  - **对象层 Object** — 用户脑中长出了什么：认知结构。
  - **主体层 Subject** — 用户认识了怎样的自己：元认知（兴趣与学习方法自我发现）。
  - **真值层 Truth** — 长出来的东西可不可靠：可信度（证据分级 / 来源分级 / 异议叙述）。
- 可证伪判据（最高判据）：用户离场时能否回答「你觉得自己变聪明了吗」。
- 载体能力：从任意历史节点，找到通向其他节点的路径与连接（延续 Google Maps 式可探索隐喻，但服务于「认知结构」而非「内容导航」）。

## Four-Element Synergy (equal dimensions, all serve Exploration Experience)
- **Graph = Relationship Structure** — clickable network of people / events / wars / places / institutions.
- **Timeline = Time Dimension** — personal / world-synchronous / dynastic timelines.
- **Map = Spatial Dimension** — territory change, war routes, city markers.
- **AI = Interpretation & Guidance Layer** — explains the current node and suggests the next.
> 四元素为工程维度，平等无层级；它们共同服务于 Article 0 三层（认知结构 / 元认知 / 真相），而非自身为目的。

## Core Philosophy (from Article 0 + PRD v1.0)
1. **认知结构优先**：一切功能最终服务于「用户脑中长出可迁移的认知结构」，而非「看完内容」。
2. **元认知优先（Cognitive Mirror）**：系统把用户自身的探索轨迹结构化反射给用户，由用户自己解读；**镜子是终点不是中间层**——不得作为 ExplorationPolicy 输入做内容投喂（防火墙，ADR-0013 D3）。
3. **真相可逼近（P09）**：用户在任一结论处都能看见证据强度、来源分级与异议叙述，并能感知「我离真相更近了」。姿态是进取性的（带你逼近真相），非防御性的（不承诺答案）。
4. **Graph-first（呈现原则）**：relationships are shown with priority — relationship lists before prose, related nodes clickable, timeline events jump between connections.
5. **Infinite Exploration（探索之魂）**：no "reading finished" — only continuous clicking. Every Entity page always shows 2–3 Next Node recommendations, a clickable relationship list, related timeline events, and marked map locations.
6. **AI as Guide, not Map / not Decider**：AI explains *why* a node matters and *what* to explore next; it does **not** replace the graph structure, evidence, or critical thinking, and **不得决定探索方向**（AI 决策红线，见 ADR-0003 / M88.0）。
7. **Everything Is Connected**：knowledge is meaningful relationships, not isolated articles.

## Target Users
无论身份（好奇者 / 学习者 / 创作者 / 研究者），产品关注的是**用户脑内的变化**而非用户画像：
- 离开时是否比进来时更聪明（认知结构是否生长）；
- 是否更清楚自己关心什么、习惯怎么学（元认知是否形成）；
- 形成的理解是否可靠、能否溯源（真值层是否可审计）。
> 原四类画像（Explorer / Learner / Creator / Expert）保留为**使用方式参考**，不再作为定位依据。

## Core Experience Loop
Explore → Connect → Understand → Discover
> 升级语义：不仅「理解历史」，而是通过探索形成**可迁移的认知结构**、**对自我的认识**与**对真相的把握**。

## Long-Term Technical Direction (FUTURE target, not current)
PRD v1.0 specifies a long-term stack: Neo4j (graph) + PostgreSQL (relational) + Elasticsearch (search) + LLM+RAG (AI) + Flutter/Web (clients).
> This is the **vision target**. The *current* architecture is a deterministic, in-memory Knowledge Core (see `PROJECT_CONTEXT.md`). Transition happens only via the Freeze Revision Gate.

## AI System (vision target — five roles)
History Guide · Next Node · Graph Builder · Explanation Engine · Path Navigator. AI usage is cost-bounded (≤300 chars explanation, 2–3 nodes, no book-generation).
> 红线：AI 角色的输出是「解释素材与引导」，最终探索方向决策权不在 AI（ADR-0003 默认关 / M88.0 Exploration ≠ Recommendation / Cognitive Mirror 防火墙）。

## Related Documents
- Product DNA (`Product_DNA.md`, L2) · Product Constitution (`Product_Constitution.md`, L3)
- Current Reality (`PROJECT_CONTEXT.md`, L4) · Roadmap (`PROJECT_ROADMAP.md`, L5)
- Documentation Map (`docs/INDEX.md`) · Team Spec (`docs/TEAM_OPERATING_SPEC_v1.2.md`)
- Ultimate Positioning: `docs/15_DECISIONS/ADR-0013_product_ultimate_positioning.md`（Article 0，最高位）
