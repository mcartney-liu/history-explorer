# M62.x Strategic Evidence Audit Report

> 审核对象：《History Explorer Product North Star Validation Report》
> 审核时间：2026-07-30 08:55 GMT+8
> 基线：`7bca32a` (vM62.5, master HEAD)
> 审核范围：PRD v1.0 / Product DNA v1.1 / Product Constitution v1.0 / Design System V1.0 FINAL / 当前 HEAD 代码
> 目的：验证 North Star Validation Report 是否真正来自产品文档，而非 AI 推断

---

## 1. Source Attribution Audit

每条战略声明逐条验证其是否明确写在文档中。

### A. 文档中明确写出的声明

| 声明 | PRD | DNA | Constitution | DS | 原文证据 |
|------|-----|-----|-------------|-----|---------|
| **History Explorer = 历史版 Google Maps** | YES | NO | NO | NO | PRD 行 11: `History Explorer = 历史版 Google Maps` |
| **History cognition OS** | YES | NO | NO | NO | PRD 行 12: `A history cognition OS, not a content app` |
| **Explore→Connect→Understand→Discover** | YES | YES | YES (隐式) | NO | PRD 行 39 / DNA 行 20 / Constitution §2.2 |
| **Graph-first (presentation principle)** | YES | YES | NO | NO | PRD 行 27 / DNA 行 46 |
| **Infinite Exploration (soul)** | YES (隐式) | YES | NO | NO | DNA 行 57-59: `Infinite exploration is the product's soul` / PRD 行 28-29 |
| **Four-Element Synergy** | YES | YES | NO | NO | PRD 行 18 / DNA 行 81 |
| **AI as Guide** | YES | YES | YES | NO (体验层) | PRD 行 29 / DNA 行 70-79 / Constitution 行 46-58 |
| **Grounding over Generation** | NO | NO | NO | YES | DS 行 47: `Grounding over Generation` (Pillar 1) |
| **Content is the hero** | NO | NO | NO | YES | DS 行 48: `Content is the hero` (Pillar 2) |
| **Bilingual by default** | NO | NO | NO | YES | DS 行 49: `Bilingual by default` (Pillar 3) |
| **AI lives beside content** | NO | NO | NO | YES | DS 行 394: `AI lives beside content, not in a mode` (Principle 2) |
| **Everything is Connected** | YES | NO | YES | NO | PRD 行 31 / Constitution 行 18-24 |
| **AI 5 roles (Guide/NextNode/GraphBuilder/ExplanationEngine/PathNavigator)** | YES | NO | NO | NO | PRD 行 45-46, 标记为 "(vision target)" |
| **地图是四元之一** | YES | YES | NO | NO | PRD 行 21 / DNA 行 87 |
| **Understanding > Information Volume** | NO | NO | YES | NO | Constitution 行 34-43 |
| **10 Design Principles** | NO | NO | NO | YES | DS 行 391-402 |
| **Non-Negotiable Values (5 条)** | NO | YES | NO | NO | DNA 行 119-124 |

### B. 声明分类

| 声明 | 分类 | 依据 |
|------|------|------|
| History Explorer = 历史版 Google Maps | **Vision** | PRD 行 11 — 定义为产品愿景比喻 |
| History cognition OS | **Vision** | PRD 行 12 — 一次提及，未定义 |
| Explore→Connect→Understand→Discover | **Principle** | 三份文档均列为核心理念或循环 |
| Graph-first | **Principle** | PRD 行 27 / DNA 行 46 — 均定义为"表现层原则" |
| Infinite Exploration | **Principle** | DNA §4.2 标题，标记为 "soul" |
| Four-Element Synergy | **Mission + Constraint** | "co-equal" / "no hierarchy" 暗示不可偏废 |
| AI as Guide | **Principle** | 多份文档指定 AI 的定位 |
| Grounding over Generation | **Principle** | DS Pillar 1 — "the product's moat" |
| Content is the hero | **Principle** | DS Pillar 2 — 定义 Chrome 与内容的关系 |
| Bilingual by default | **Constraint** | DS Pillar 3 — 语言约束 |
| AI lives beside content | **Principle** | DS Principle 2 — 定义 AI 的 UX 位置 |
| 5 AI roles | **Vision** | PRD 明确标记为 "(vision target)" |
| 地图为四元之一 | **Constraint** | PRD/DNA 均列为不可分割的维度 |
| 10 Design Principles | **Principle** | DS 明确的 10 条，有编号 |

### C. 身份影响分类

| 声明 | 身份影响 | 原因 |
|------|---------|------|
| Explore→Connect→Understand→Discover | **Identity-breaking** | 删除即丧失产品定义——PRD/DNA/Constitution 都将此列为核心 |
| Infinite Exploration | **Identity-breaking** | DNA 标注 "soul" — 如果删除，产品不再是探索引擎 |
| Graph-first | **Identity-breaking** | PRD/DNA 均定义为主要透镜——删除后退化为百科 |
| Grounding | **Identity-breaking** | DS Pillar 1 — "product's moat" |
| Four-Element Synergy (含 Map) | **Identity-breaking** | "co-equal" / "no hierarchy" — 删除任何一维破坏架构完整性 |
| AI as Guide | **Important** | 改变角色但可演化——Guide 可改为 Companion 而不破坏产品 |
| History OS | **Important** | 单次提及。定位可演化而不破坏产品核心 |
| Content is the hero | **Important** | 删除后产品可继续运作但体验下降 |
| Bilingual by default | **Implementation** | 删除后仍然是一个历史探索产品 |
| AI lives beside content | **Important** | 改变 AI 的 UX 位置，但不破坏核心循环 |
| Museum Experience | **Implementation** | 视觉风格，删除后核心功能不受影响 |

---

## 2. Strategic Conflict Reality Audit

对 North Star Validation Report 中的每个"冲突"逐条重新验证。

### Conflict 1：AI 傍内容 vs AI 在代码末尾

**文档原文 [FACT]**：DS 行 394:
> "AI lives beside content, not in a mode. Grounded answers, explanations, and suggestions appear inline next to the history they reference."

**代码原文 [FACT]**：`App.tsx:800` — AIExplanationPanel 在 topic 视图第 19/22 位。`EntityPage.tsx:260` — HistorianChat 在 entity info 标签第 9/10 位。

**���定：A — 真正违反产品战略。**

DS 明确要求 AI "appear inline next to the history they reference"（行内展示，紧邻所引用的历史内容）。代码中将 AI 放置在内容列表末端——这是**位置矛盾**，不是功能缺失。AI 的功能存在，但位置不符合 DS 的战略要求。

### Conflict 2：四元协同含 Map vs 代码中无 Map

**文档原文 [FACT]**：PRD 行 21: `Map = Spatial Dimension`；行 24: `There is no value hierarchy among them`。DNA 行 87-90 重复相同声明。

**代码原文 [FACT]**：`ConnectionExplorer.tsx:90-93` — Map 模式渲染 `<div class="ce-empty">空间视图即将上线</div>`。

**判定：C — 未来版本未完成。**

PRD 和 DNA 均列出 Map 为四元之一，"there is no value hierarchy"。但文档并未为 Map 定义时间表。代码中 Map 有一个 UI 入口（切换器中"空间"按钮）和明确的 "coming soon" 占位——这证明 Map 是**已计划的**，不是被遗忘的。不是战略冲突，是战略延迟。

> 修正：North Star Validation Report 将其标记为"战略冲突"过于严重。属于"战略已定，实现未达"。

### Conflict 3："always sees 2-3 Next Node" vs 面板后段

**文档原文 [FACT]**：DNA 行 61-63:
> "At any Entity page the user always sees: 2-3 Next Node recommendations, a clickable relationship list, related timeline events, marked map locations."

**代码原文 [FACT]**：Topic 视图中 ContinueExploringPanel 排第 17/22 位。Entity 视图中 ResearchDiscoveryPanel 排第 7/10 位。

**判定：B — 实现方式不同（部分不足）。**

DNA 承诺的"always sees"并未规定 Next Node 必须在页面顶部——只规定"总是可见"（always visible）。当前实现放在页面中后段。如果折叠前段面板或重新编排顺序，可以使 Next Node 在首屏可见。功能已存在，只是排列策略未达到 DNA 的"always"承诺。

> 修正：这不是战略冲突，而是**实现细节未达到文档设置的体验标准**。

### Conflict 4：Graph-first vs 默认 list view

**文档原文 [FACT]**：DNA 行 48: "Relationships are the primary lens." PRD 行 27: "relationship lists before prose."

**代码原文 [FACT]**：`App.tsx:155`: `const [relView, setRelView] = useState<'list' | 'spatial'>('list')`

**判定：B — 实现方式不同，但存在张力。**

DNA 说的是 "relationship lists before prose"（关系列表优先于正文）——"lists" 在这里是形式，不是首选格式。"Graph-first" 是标题，内容具体化为"关系表现优先于文字内容"。默认 list view 并不违反"列表优先于正文"的承诺——它确实把关系列表放在正文之前。

> 修正：North Star Validation Report 标记为"战略冲突"不够精确。更准确的说法是：**"Graph-first" 是标题修辞，"relationships presented before prose" 是具体承诺——当前代码做到了这个承诺。默认 list 而非 graph 是一个 UX 选择，不是战略违反。**

### Conflict 5：History OS vs 两态 SPA

**文档原文 [FACT]**：PRD 行 12: "A history cognition OS, not a content app."

**代码原文 [FACT]**：`App.tsx` 是一个 React 单页应用。WorkspacePanel 含 3 个占位区（置顶/笔记/对比队列）但无实际实现。

**判定：D — 不是冲突。术语"OS"在文档中未定义。**

"History cognition OS" 在 PRD 中出现一次（行 12），作为产品定位描述。PRD/DNA/Constitution/DS 中没有任何地方定义了"OS"的含义、验收标准、架构要求或行为规范。没有定义，"OS vs SPA"的对比就缺乏基准。两态 SPA 完全可以是通向 OS 的第一步。

> 修正：如果 PRD 的"OS"是一个战略声明，它缺少定义。在没有定义的情况下，声称代码"未达到 OS"缺乏判断标准。**这属于战略声明不明确，不是战略冲突。**

---

## 3. 文档间一致性审核

### 3.1 是否存在概念漂移

| 概念 | PRD | DNA | DS | 一致性 |
|------|-----|-----|-----|--------|
| **Explore→Connect→Understand→Discover** | "Core Experience Loop" (行 39) | "fundamental user experience" (行 20) | 解释为页面内层级（Part 4） | ✅ 一致 |
| **Graph-first** | "presentation principle" (行 27) | "Relationships are the primary lens" (行 48) | 关系图谱组件规范 (§5.7) | ✅ 一致 |
| **AI 角色** | "five roles" (行 45, "vision target") | "explain / connect / suggest paths" (行 73-77) | "AI lives beside content" (行 394) | ⚠️ 讲的是不同层面，需要澄清 |
| **四元** | "co-equal" (行 24) | "co-equal" (行 83) | 未显式提及四元框架 | ✅ PRD/DNA 一致 |
| **Grounding** | 未用此术语但强调"evidence not replaced" | 未用此术语 | Pillar 1 (行 47) | ✅ 概念一致，术语不同 |
| **Museum** | 未提及 | 未提及 | 6 处出现，作为定性描述 | ⚠️ 仅 DS 使用，其他文档无 |

### 3.2 "DS AI beside content" vs "PRD five AI roles" 是否冲突

**PRD** 的 "five roles" (行 45)：
- 标记为 "(vision target)" — 明确是愿景，不是当前要求
- 5 个角色是**能力分类**（History Guide / Next Node / Graph Builder / Explanation Engine / Path Navigator）
- 描述的是 "AI 应该做什么"

**DS** 的 "AI lives beside content" (行 394)：
- 标记为 Design Principle #2
- 描述的是**UX 位置**（"appear inline next to the history they reference"）
- 描述的是 "AI 应该放在哪里"

**判断：这两条声明不冲突。**
- PRD 回答 "AI 能做什么"（能力层，vision target）
- DS 回答 "AI 放在哪里"（体验层，当前原则）
- 一条产品可以有 5 种 AI 能力，同时要求它们都"傍内容"呈现

### 3.3 是否存在措辞冲突

四份文档中未发现直接措辞矛盾。产品定位在 PRD 和 DNA 之间一致。DS 增加了 UX 层面的原则，但 PRD/DNA/Constitution 较少涉及这部分。

### 3.4 "Museum Experience" 在战略文档中的实际地位

DS 使用 "museum-grade" / "feels like standing in a museum wing" / "museum calm" 作为**定性语气描述**，不是作为可测试的原则。DS Quality Checklist (Chapter 12) 有一项 "是否符合 Museum Feeling"，但未给出定义。其他三份文档未提及 Museum。

**判定：Museum Experience 不是产品战略层面的要求——它是 DS 定义的 UX 基调。**

---

## 4. North Star 可执行性审核

### North Star 原文

**PRD 行 11-12：**
> "History Explorer = 历史版 Google Maps — 让历史脉络可探索、可点击、可沉浸。A history cognition OS, not a content app: users build their own understanding by navigating relationships."

### 评估

| 标准 | 满足？ | 依据 |
|------|--------|------|
| **是否明确** | PARTIAL | "历史版 Google Maps" 是比喻——明确方向但不明确边界。"history cognition OS" 进一步聚焦但仍是比喻 |
| **是否可执行** | NO | 两个比喻均未转化为可被工程验证的体验标准。如何测量"像 Google Maps"？如何验证"是 OS 不是 content app"？ |
| **是否可验证** | NO | 无验收标准、无可观察行为、无指标 |
| **是否可用于决策** | PARTIAL | 可以用于方向判断——"这个功能是让用户探索还是只提供信息？"但不能用于精确决策 |

### 缺失项

- **North Star 未定义"像个 Google Maps"具体意味着什么用户体验承诺**（导航完整性？图层？缩放？POI？实时更新？）
- **"OS" 未定义架构标准**（持久会话？多窗口？IPC？shell？）
- **无可度量的质量标准**（探索深度、时间花费、回访率）

---

## 5. Principles 可测试性审核

对每条 Core Principle 判断是否可以形成验收标准：

| Principle | 可测试？ | 缺失什么 |
|-----------|---------|---------|
| **Explore→Connect→Understand→Discover** | NO | 缺失：**Observable Behaviour**。如何知道用户完成了这个循环？是 4 步骤都触发，还是每步骤的时间阈值？ |
| **Infinite Exploration (soul)** | NO | 缺失：**Definition + Metric**。"没有读完"如何验证？是永远有推荐内容，还是用户永不自行离开？ |
| **Graph-first** | NO | 缺失：**Definition**。"first" 是什么意思——时间上优先、视觉上优先、还是质量上优先？ |
| **Grounding over Generation** | PARTIAL | 缺失：**Metric**。每个 AI 回答显��徽标是可验证的（存在/不存在）。但 "over" (优先于) 如何测试？ |
| **Content is the hero** | NO | 缺失：**Definition + Metric**。"hero" 如何测量？视觉面积比？对比度比？用户注视时间？ |
| **AI lives beside content** | PARTIAL | 缺失：**Definition**。"beside" 的定义——物理相邻？同一视口？语义关联？ |
| **Four-Element Synergy** | NO | 缺失：**Definition**。"co-equal" 如何验证——面板数量相等？权重相同？信息密度相同？ |
| **Museum Experience** | NO | 缺失：**Definition + Acceptance Criteria + Metric + Observable Behaviour**。完全无操作性定义 |
| **Everything is Connected** | NO | 缺失：**Definition**。"connected" 的定义——只需路径？需有解释？需有强度？ |
| **History OS** | NO | 缺失：**Definition + Acceptance Criteria**。完全未定义 |
| **Bilingual by default** | YES | ✅ 可通过 i18n 覆盖率、中文默认、英文一等公民、无 reflow 破损来测试 |

唯一可测试的原则：**Bilingual by default**。其余均缺少操作性定义。

---

## 6. Vision vs Current Reality 边界划分

| 项目 | 分类 | 依据 |
|------|------|------|
| **Graph (关系图谱)** | **Current Product** | GraphViewPanel + ConnectionExplorer 已实现 |
| **Timeline (时间轴)** | **Current Product** | TimelinePanel + MultiEntityTimeline 已实现 |
| **AI (多种形态)** | **Current Product** | 5 个 AI 入口组件均已实现 |
| **Grounding (溯源)** | **Current Product** | GroundedAnswer + ProvenancePanel 已实现 |
| **Bilingual (双语)** | **Current Product** | i18n 框架已完整部署 |
| **Map (空间维度)** | **Future Roadmap** | UI 有占位入口并标注"即将上线"。PRD/DNA 要求但未完成 |
| **History OS** | **Vision** | PRD 单次提及，无定义，无架构，无验收标准 |
| **Workspace (工作台)** | **Current Strategy** | WorkspacePanel 侧边栏已部署但功能占位不完整。是战略方向，但实现不完整 |
| **Infinite Exploration (无限探索)** | **Current Strategy** | DNA 定义为 soul。代码有机制但未完全实现。方向明确 |
| **AI 5 roles** | **Vision** | PRD 明确标记 "(vision target)" |
| **AI Companion (AI 伴侣)** | **Vision** | DS "beside content" 暗示伴侣模式，但未定义。当前代码是工具模式 |
| **Museum Experience** | **Vision** | DS 中作为定性描绘。无操作性定义——是感知目标，不是当前实现 |

---

## 7. Analysis of the ITSELF — ALL "Must" / "Always" Statements

扫描 North Star Validation Report 中的绝对化表达：

| 语句 | 出处(VaR) | 实际分类 |
|------|----------|---------|
| "以上原则绝对不能删除" (§5.1) | 报告作者 | **Author Opinion** — 文档未使用"绝对不能" |
| "GroundedAnswer 在所有 AI 回答中使用" (§4) | 报告作者 | **Author Opinion** — 使用了"所有"但未穷举验证 |
| "删除后产品退化为百科" (§5.1 关于关系) | 报告作者 | **Author Opinion** — 删除关系后产品可能是叙事网站，不一定退化为百科 |
| "Chrome 占用不得超过内容的视觉比重" (§9) | 报告作者 | **Author Opinion** — 文档未量化"视觉比重" |
| "任何 Blueprint 不得引入第 9 种实体类型" (§9) | 源自代码约束 | **Engineering Constraint** — 源于 freeze 基线 ENTITY_TYPES=8 |
| "no value hierarchy" (PRD 行 24) | PRD | **Document Requirement** — 文档原文 |
| "always sees" (DNA 行 61-63) | DNA | **Document Requirement** — 文档原文 |
| "never behind a separate AI tab" (DS 行 394) | DS | **Document Requirement** — 文档原文 |

---

## 8. Final Output

### Confirmed Strategic Facts（真实来自产品战略文档）

| # | 事实 | 证据 |
|---|------|------|
| 1 | PRD 定位产品为"历史版 Google Maps" | PRD 行 11 |
| 2 | PRD 定位产品为"history cognition OS" | PRD 行 12 |
| 3 | 核心循环是 Explore→Connect→Understand→Discover | PRD 行 39 / DNA 行 20 |
| 4 | Graph-first 是表现层的原则（关系优先于正文） | PRD 行 27 / DNA 行 46-48 |
| 5 | Infinite Exploration 被 DNA 标记为产品"灵魂" | DNA 行 57-59 |
| 6 | PRD/DNA 定义 Graph / Timeline / Map / AI 为四元协同架构 | PRD 行 18-24 / DNA 行 81-90 |
| 7 | AI 被定位为 Guide（解释当前+建议下一跳）| DNA 行 70-79 / Constitution 行 46-58 |
| 8 | Grounding 被 DS 标记为第一支柱（"the product's moat"）| DS 行 47 |
| 9 | AI 应 "傍内容" 出现（不对应单独的 AI 标签）| DS 行 394 |
| 10 | AI 5 个角色在 PRD 中被标记为 "vision target" | PRD 行 45-46 |
| 11 | Bilingual (zh default, en first-class) 是 DS 支柱 | DS 行 49 |
| 12 | Content is the hero / Chrome recedes | DS 行 48 / DS 行 397 |

### Supported Strategic Interpretations（战略推导，非原文）

| # | 推导 | 证据链 |
|---|------|--------|
| S1 | "History OS" 意味着需要一个持久化壳/工作空间 | PRD 行 12 ("OS") + WorkspacePanel 存在 |
| S2 | "Graph-first" 意味着关系入口应在页面上方 | DNA 行 48 ("primary lens") + DNA 行 50 ("relationship lists before prose") |
| S3 | 四元协同意味着至少 3/4 维度应可感 | PRD 行 24 ("no value hierarchy") |

### Implementation Choices（工程实现选择）

| # | 选择 | 说明 |
|---|------|------|
| I1 | Topic/Entity 两页切换 vs 单空间 | PRD/DNA 均未规定导航架构。代码选择了两页模式 |
| I2 | 22 个组件线性排列 vs 折叠/渐进展开 | 文档未规定面板策略。这是工程选择 |
| I3 | 默认关系 list view vs graph view | "Graph-first" 规定优先级（list before prose），不规定默认可视化 |
| I4 | AI 分散在 5 个组件中 vs 单一入口 | PRD "5 roles" 允许多入口。DS "beside" 只规定了位置 |
| I5 | WorkspacePanel 侧边栏 vs 全页 Workspace | 文档未规定 Workspace 的呈现方式 |

### Vision Items（未来愿景）

| # | 项目 | 证据 |
|---|------|------|
| V1 | AI 5 个角色完全实现 | PRD 行 45，标记 "(vision target)" |
| V2 | Map 空间维度 | PRD 行 21 / DNA 行 87，代码无实现 |
| V3 | History OS | PRD 行 12，无定义，无实现标准 |
| V4 | Museum Experience 落地 | DS 中 6 处出现，无操作性定义 |
| V5 | AI Companion 模式 | DS 行 394 "beside content" 暗示，但未定义 |

### Author Opinions（报告作者的观点）

| # | 观点 | 出处（North Star Validation Report） |
|---|------|--------------------------------------|
| O1 | "可信任的代码事实占比：65%" / "Experience Readiness Score: 42/100" | 数字评分，无标准 |
| O2 | 所有 P0/P1 优先级标记 | 无阻塞性定义 |
| O3 | "Non-negotiable Core 绝对不能删除" 的表述 | 文档使用固定原则但未使用"绝对不能"语言 |
| O4 | "Graph-first 与默认 list 是战略冲突" | 本文档已修正——不是冲突，是 UX 选择 |
| O5 | "AI 5 面孔 vs AI 伴侣模式是文档间冲突" | 本文档已修正——PRD 的能力分类与 DS 的 UX 位置是正交的 |

### Insufficient Evidence（证据不足）

| # | 声明 | 原因 |
|---|------|------|
| E1 | "用户感知不到" AI 功能 | 没有用户行为数据——代码可以推断位置但不推断感知 |
| E2 | "用户会感到困惑" | 没有可用性测试数据 |
| E3 | "探索循环未成立" | "成立"如何定义？用户完成过循环但未意识到？还是从未完成？ |
| E4 | "面板墙造成信息过载" | 过载是主观感受——某些用户可能期望高密度 |

### 需要 Product Owner 明确补充定义的战略项

| # | 项目 | 缺失 |
|---|------|------|
| D1 | **History OS** | 无定义。PRD 提到但四个战略文档均未定义其验收标准。OS 意味着持久会话？多窗口？进程间通信？全局 shell？**
| D2 | **Museum Experience** | DS 中 6 处描述均为定性语气。Quality Checklist 有"是否符合 Museum Feeling"一项，但无答案指南或基准视觉 |
| D3 | **Graph-first** | "first" 在 DNA 中定义为 "relationship lists before prose"。但这是否意味着视觉图优先于文字列表？**
| D4 | **Infinite Exploration** | DNA 说 "there is no reading finished"。这意味着从不结束，还是永远有下一步？循环终止条件是什么？**
| D5 | **Content is the hero** | 无量化标准。hero 如何测量？视觉面积比例？层级顺序？对比度比例？**
| D6 | **AI 的角色模型** | PRD 定义 5 个能力（vision target），DS 定义傍内容的 UX 位置。统一模型未定义——是工具集还是伴侣？**
| D7 | **四元 "co-equal"** | "no value hierarchy" 明确定义。但 "equal" 是否意味着每个维度应有相同的 UI 权重？还是只要都存在即可？**

---

> 审计结束。所有结论均附带原文行号或代码行号。未使用任何历史报告、历史聊天、或此前推断作为依据。未提出新的设计方案、产品路线或实现建议。
