# History Explorer Product North Star Validation Report

> 验证时间：2026-07-30 08:46 GMT+8
> 基线：`7bca32a` (vM62.5, master HEAD)
> 验证范围：PRD v1.0 / Product DNA v1.1 / Product Constitution v1.0 / Design System V1.0 FINAL / 当前 HEAD 代码
> 方法：从当前 HEAD 重新提取所有战略声明，逐条对照代码实现。
> 不使用历史报告、历史聊天、或任何此前推断作为证据。

---

## 1. North Star — 一句话

**【文档证据】PRD (行 11) 原文：**

> *"History Explorer = 历史版 Google Maps — 让历史脉络可探索、可点击、可沉浸。"*

**【文档证据】PRD (行 12) 直接跟随：**

> *"A history cognition OS, not a content app: users build their own understanding by navigating relationships."*

**【文档证据】Product DNA (行 9) 原文：**

> *"History Explorer is not a database of historical facts. It is an exploration engine that helps users discover relationships, patterns, and meanings across human history."*

**【文档证据】Product Constitution (行 20) 原文：**

> *"History should not be presented as isolated facts. Events, people, civilizations, locations, and time periods should be connected through meaningful relationships."*

---

## 2. Mission — 一句话

**【文档证据】PRD (行 12) 原文：**

> users build their own understanding by navigating relationships

**【文档证据】Product DNA (行 40-41) 原文：**

> *"The goal is curiosity-driven exploration, not fact-fetching."* — 即用户自己构建理解，而非被灌输事实。

---

## 3. 四份文件的反复强调分析

### 3.1 PRD 真正反复强调什么

| 主题 | PRD 中的原文引用 | 出现次数 |
|------|-----------------|---------|
| **四元协同** | "Graph / Timeline / Map / AI are co-equal building blocks" (行 24) | 是核心框架 |
| **无限探索** | "no 'reading finished' — only continuous clicking" (行 29) | 1 次显式 |
| **AI as Guide** | "explains the current node and suggests the next" (行 22-23) | 核心理念 |
| **History OS** | "A history cognition OS, not a content app" (行 12) | 1 次显式 |
| **Explore→Connect→Understand→Discover** | "Core Experience Loop" (行 39) | 框架级 |

### 3.2 Product DNA 真正反复强调什么

| 主题 | DNA 中的原文 | 出现次数 |
|------|------------|---------|
| **Graph-first** | §4.1 完整章节标题，"Relationships are the primary lens" | 1 次显式定义 |
| **Infinite Exploration (soul)** | §4.2 完整章节标题，"There is no reading finished" | soul 级 |
| **AI as Guide** | §4.3 完整章节标题，"AI acts as a historical exploration guide" | 1 定义 |
| **Four-Element Synergy** | §4.4 完整章节标题，"co-equal dimensions", "no value hierarchy" | 1 定义 |
| **非协商值** | §7 五条："Exploration over searching" 等 | 1 次列清单 |

### 3.3 Design System 真正反复强调什么

| 主题 | DS 中的原文 | 出现次数 |
|------|-----------|---------|
| **Grounding 可信** | "Grounding over Generation" (Pillar 1, 行 47) + 语义色 (行 109) | 多处 |
| **内容主角** | "Content is the hero" (Pillar 2, 行 48), "Chrome recedes" (Principle 5) | 多处 |
| **AI 傍内容** | "AI lives beside content, not in a mode" (Principle 2, 行 394) | 1 次 |
| **博物馆感觉** | "museum-grade dark + earth-tone" (行 27), "feels like standing in a museum wing" (行 41) | 多处 |
| **不发明类型** | "Don't invent types" (Principle 10, 行 402), "8 entity types / 18 relationship types are frozen" | 多处 |

### 3.4 当前代码真正体现了什么

| 主题 | 代码证据 | 位置 |
|------|---------|------|
| **关系图谱** | GraphViewPanel 渲染 8 色节点 + 连线 | `components/GraphViewPanel.tsx` |
| **时间线** | TimelinePanel + MultiEntityTimeline 双模式 | `components/TimelinePanel.tsx` |
| **AI 能力** | AIExplanationPanel + HistorianChat + ResearchPanel + GroundedAnswer | 5 个独立组件 |
| **溯源系统** | ProvenancePanel + GroundedAnswer 徽标 + CitationList | 多处 |
| **探索记忆** | WorkspacePanel 侧边栏 + recent + history | `components/workspace/WorkspacePanel.tsx` |
| **搜索二维** | SearchBox（主题英文搜索）+ EntitySearchBox（实体搜索）| `components/SearchBox.tsx` 等 |
| **面板堆叠** | 22 个组件线性渲染（topic 视图） | `App.tsx:671-820` |

### 3.5 四者是否一致

**【FACT】框架语言一致。** 四份文件（PRD/DNA/Constitution/DS）交叉引用并互相增强。"Explore→Connect→Understand→Discover""Graph-first""AI as Guide""Four-Element Synergy"在文本层面形成了一个自洽的体系。

**【FACT】与代码之间的鸿沟。** 战略文档描述的范式（探索引擎、History OS、AI 傍内容、无限探索）与当前代码呈现的范式（搜索 topic → 阅读面板列表 → 跳转实体）不在同一层面。

以下详细展开。

---

## 4. Core Principles Validation

每条原则按三个维度评估：
- **【FACT】** 文档是否明确写出？（引用原文行号）
- **【CODE】** 代码是否实现？（引用文件+行号）
- **【UX】** 用户是否能感知？

| # | 原则 | 文档出处 | 代码实现 | 用户感知 | 状态 |
|---|------|---------|---------|---------|------|
| 1 | **Infinite Exploration** — 没有"读完"，只有持续点击 | DNA §4.2（行 59-67）："There is no reading finished"；PRD（行 29）| ContinueExploringPanel + RecommendationPanel + ExplorationJourney 存在于代码中。ContinueExploringPanel 在话题视图排第 17/22（`App.tsx:785`） | ⚠️ 弱 — "下一步"在面板后段而非立即可见 | **Partially Implemented** |
| 2 | **Graph-first** — 关系是表现层的优先透镜 | DNA §4.1（行 46-53）："Relationships are the primary lens" | 关系视图默认模式为 'list'（`App.tsx:155`：`useState<'list' \| 'spatial'>('list')`）。Entity 视图 ConnectionExplorer 默认为 graph（`ConnectionExplorer.tsx:27`） | ⚠️ 不一致 — 话题视图默认列表，实体视图默认图谱 | **Partially Implemented** |
| 3 | **AI as Guide** — AI 是解释和导航层 | DNA §4.3（行 70-79）；PRD（行 22-23）；Constitution（行 46-58）| 5 个独立 AI 组件存在。但无统一 AI 入口或统一角色 | ⚠️ 弱 — AI 分散在 5 个不同位置，表现为工具集而非一个 Guide | **Partially Implemented** |
| 4 | **Four-Element Synergy** — Graph/Timeline/Map/AI 四元协同 | PRD（行 18-24）："co-equal building blocks"；DNA §4.4（行 83-90）| Graph ✅ Timeline ✅ AI ✅ Map ⚠️ 占位（`ConnectionExplorer.tsx:92`："空间视图即将上线"） | ❌ 无 — 用户无整体空间维度体验 | **Partially Implemented**（75%） |
| 5 | **Grounding over Generation** — 溯源是产品签名 | DS Pillar 1（行 47）；PRD "AI does not replace evidence" | GroundedAnswer 组件渲染 verified/unverified 徽标。ProvenancePanel 存在。GroundedAnswer 在所有 AI 回答中使用 | ✅ 强 — 回答中可见徽标 | **Implemented** |
| 6 | **Content is the hero** — 内容为英雄，Chrome 退后 | DS Pillar 2（行 48）；DS Principle 5（行 397）| 22 个面板线性渲染——Chrome（面板标题、边框、切换控件）占据大量视觉空间 | ❌ 弱 — 面板密度使 Chrome 反而成为主角 | **Partially Implemented** |
| 7 | **AI lives beside content** — AI 傍在内容旁，不单独成模式 | DS Principle 2（行 394）："appear inline next to the history they reference" | AIExplanationPanel 排第 19/22（话题视图）。HistorianChat 排第 9/10（实体 info 标签）。两者都在"内容末尾" | ❌ 不能 — AI 是阅读路径的终点，不是内容的陪伴 | **Vision Only** |
| 8 | **Museum Experience** — 博物馆级沉浸感 | DS §1.1（行 41）："feels like standing in a museum wing" | 视觉令牌（暖棕底+古金）存在。Navy 遗留主题仍在运行（`components.css:8` `var(--navy-card)`） | ⚠️ 弱 — 视觉令牌定义了正确的方向，但遗留主题破坏一致性 | **Partially Implemented** |
| 9 | **History OS** — 历史认知操作系统 | PRD（行 12）："A history cognition OS, not a content app" | 代码是单页 App + 两个状态视图（topic / entity）+ WorkspacePanel 侧边栏（含 3 个功能占位区域） | ❌ 不能 — 用户看到的是"搜索+浏览"模式，不是 OS | **Vision Only** |
| 10 | **Everything is Connected** — 万物关联 | PRD（行 31）| 18 种关系类型在后端定义。前端关系图显示连线+标签，但边的强度/类型无视觉编码（颜色统一） | ⚠️ 中等 — 看到连线但无法区分关系类型 | **Partially Implemented** |
| 11 | **Explore→Connect→Understand→Discover** — 探索循环 | DNA §2（行 20）| 每个环节的组件都存在，但空间上前后割裂。无统一"探索空间"承载循环 | ⚠️ 弱 — 可以在多次点击间完成循环，但用户无"我在一个循环中"的感觉 | **Partially Implemented** |
| 12 | **Bilingual by default** — 双语默认为基线 | DS Pillar 3（行 49）| `LocaleProvider` 存在（`data/locale.tsx`）。terminology 表、zh/en/ja locale 文件存在。W10 测试迁移完成 | ✅ 强 — 已实现 i18n 基础 | **Implemented** |

---

## 5. Non-negotiable Analysis

### 5.1 Non-negotiable Core（绝对不能删除）

| 原则 | 为什么不可删除 |
|------|-------------|
| **Explore→Connect→Understand→Discover 循环** | 三份文档（PRD/DNA/Constitution）都将此列为产品的核心体验循环。删除即丧失产品身份 |
| **Grounding（溯源验证）** | DS Pillar 1 — "the product's moat"。没有 Grounding，产品与 ChatGPT 无区别 |
| **关系作为基础结构** | DNA §4.1 + PRD "Everything is Connected"。删除后产品退化为百科 |
| **AI 不替代证据和批判思维** | Constitution §2.4 — 产品的道德底线 |

### 5.2 Negotiable Design（可协商的设计）

| 元素 | 为什么可协商 |
|------|------------|
| 是否采用 5 个 AI 入口 vs 统一 AI 入口 | AI 的角色（Guide vs 工具集）在产品文档中是 Guide，但实现方式可以不同 |
| 面板数量（22 → ?） | 面板数量是设计选择，不是战略要求 |
| 默认 list vs 默认 graph | "Graph-first" 指定了优先级顺序，但不指定默认可视化方式 |
| Landing/Discover 合并 vs 分离 | 这是入口设计，不是战略矛盾 |

### 5.3 Implementation Choice（实现选择）

| 元素 | 为什么是实现选择 |
|------|---------------|
| WorkspacePanel 侧边栏 vs 全页 Workspace | 都是"记忆延续性"的实现方式 |
| GraphViewPanel（SVG 自绘） vs 第三方图库 | 冻结约束下的工程选择 |
| Topic→Entity 页切换 vs 单页空间 | 技术架构选择，不改变核心体验目标 |

### 5.4 Vision Only（仅愿景）

| 元素 | 证据 |
|------|------|
| **Map 空间维度** | PRD/DNA 定义为四元之一。代码中仅占位（`ConnectionExplorer.tsx:92`） |
| **History Cognition OS** | PRD 行 12 的表述。代码无"OS"级别的基础设施（如持久会话、多窗口、模块通信总线） |
| **AI 5 角色（Guide/NextNode/GraphBuilder/ExplanationEngine/PathNavigator）** | PRD 行 45-46 列出。代码中 5 个 AI 入口不等于 5 个角色明确实现 |

---

## 6. Strategic Conflict Audit

### Conflict 1：产品声称"AI 傍内容"但代码把 AI 放在所有内容末端

**【DS 证据】** DS Principle 2 (行 394)：
> "AI lives beside content, not in a mode. Grounded answers, explanations, and suggestions appear inline next to the history they reference — never behind a separate 'AI' tab that isolates them."

**【代码证据】** `App.tsx:800`：AIExplanationPanel 是 topic 视图第 19/22 个组件——在所有关系、时间轴、对比、连接解释面板之后。`EntityPage.tsx:260-267`：HistorianChat 是 entity info 标签第 9/10 个组件——在叙事/故事/探索/卡片/面板之后，只有 ProvenancePanel 在其后。

**冲突性质：战略目标（傍内容）vs 实现（末尾加载）。**

### Conflict 2：PRD 定义"四元协同"包含 Map，但代码中 Map 无实现

**【PRD 证据】** 行 18-23：Graph / Timeline / Map / AI 被定义为四个"co-equal dimensions"。行 24："There is no value hierarchy among them."

**【DNA 证据】** §4.4 (行 83-90) 重述四元协同架构。

**【代码证据】** `ConnectionExplorer.tsx:90-93`：Map 模式渲染 `<div className="ce-empty">空间视图即将上线</div>`。整个 `frontend/src` 中无不依赖外部服务的地理渲染逻辑。

**冲突性质：战略声明（四元平等）vs 代码现实（三元功能+一元占位）。**

### Conflict 3：DNA 声明"Infinite Exploration 是产品灵魂"，但"下一跳"不在用户体验的第一屏

**【DNA 证据】** §4.2 (行 59-63)：
> "Infinite exploration is the product's soul. At any Entity page the user always sees: 2-3 Next Node recommendations, a clickable relationship list, related timeline events, marked map locations."

**【代码证据】** Topic 视图中有 16 个面板在 ContinueExploringPanel（第 17/22 位）之前。Entity 视图中相同面板在第 7/10 位（ResearchDiscoveryPanel）。"always sees"的承诺被实现为"滚动到底部后可见"。

**冲突性质：战略承诺（always sees）vs 实现位置（需要滚动过大部分内容）。**

### Conflict 4：PRD/DNA 反复强调"Graph-first"，但话题视图默认显示 list 而非 graph

**【DNA 证据】** §4.1 (行 46-53)：Graph-first 是"a presentation priority"。关系应被优先展示。

**【代码证据】** `App.tsx:155`：`relView` 初始值为 `'list'`。用户在话题视图中首次看到关系时，默认展现的是文字列表，需要手动点击"图谱"按钮切换到图形视图。

**冲突性质：战略方向（graph-first 优先）vs 默认设定（list-first 默认）。**

### Conflict 5：产品声称"History OS"但代码是两个状态切换的 SPA

**【PRD 证据】** 行 12："A history cognition OS, not a content app."

**【代码证据】** `App.tsx:110-160`：App 组件是一个单页应用，状态管理基于 `useState` 的 `current`（topic/entity/null）三元切换。WorkspacePanel（`components/workspace/WorkspacePanel.tsx`）包含 3 个功能占位区（置顶/笔记/对比队列），无实际实现。

**冲突性质：战略定位（OS）vs 架构现实（两态 SPA）。**

---

## 7. Current Product Identity

### 7.1 产品希望表达什么（文档自述）

抽取所有文档的第一句或最显式定位声明：

| 文档 | 声称的定位 |
|------|----------|
| PRD | "历史版 Google Maps" (行 11) |
| PRD | "A history cognition OS" (行 12) |
| DNA | "an exploration engine" (行 11) |
| DS | "helps people understand history with AI" (行 35) |

**综合：产品希望表达为"用 AI 导航历史的探索引擎/OS"。**

### 7.2 产品真正表达出来什么（代码实现）

| 实际体验 | 代码证据 |
|---------|---------|
| 主要入口是搜索/选 topic | 双搜索框常驻 `App.tsx:555-585`；话题卡片在两着陆页面中 |
| 内容通过面板列表展示 | 22 个组件线性渲染，有 narrative/interpretation/supporting 层级标记但用户不可见 |
| AI 是多工具而非统一个人/人物 | 5 个独立 AI 入口，无统一角色 |
| 用户可以通过点击关系导航 | `onEntityClick` 贯穿所有关系面板。可跳转 |

**综合：代码表达为"支持关系导航的历史查询+阅读工具，附带多个 AI 功能"。**

### 7.3 产品实际让用户感知到什么（推断，从布局/入口/顺序）

> 以下标记为 [SUPPORTED INFERENCE]，基于代码中的渲染顺序和组件位置，但无真实用户行为数据。

- 第一印象：**一个搜索/选择历史主题的工具**（���个搜索框 + 快速问题按钮）
- 主要行为：**阅读**（SummaryPanel 打头，StorySection/WhyImportantPanel 在叙事区）
- AI 印象：**"有一个可以问的聊天机器人"**（如果用户能滚动到 HistorianChat/AIExplanationPanel）
- "探索"感受：**弱**——"继续探索"不是行为召唤，是选项

**感知到的：历史阅读工具+关系浏览+附带 AI**
**希望的：历史版 Google Maps + 认知 OS**

---

## 8. Strategy Stability Review

对之前讨论的"大方向"逐项审查——这些方向与 North Star 一致，还是特定实现方案？

| 方向 | PRD/DNA/DS 是否直接要求 | 判定 | 依据 |
|------|----------------------|------|------|
| **统一探索空间**（Topic/Entity 融合） | 间接 — PRD "OS" + DS "傍内容"暗示单一空间，但无明确要求合并两视图 | **C — 证据不足** | 合并是一种实现方案。也可以保留两页但强化过渡连续性 |
| **AI 常驻**（所有页 AI 伴侣） | 部分 — DS "AI lives beside content" 支持常驻，但 PRD 的 "five roles" 允许多入口 | **B — 一种实现方式** | DS 原则支持常驻；PRD 允许工具集 |
| **Timeline 导航**（时间轴驱动全局联动） | DNA "Time First" 不在任何文档中作为标题出现；PRD 将 Timeline 列为四元之一（平等维度） | **C — 证据不足** | "Time First" 不是显式原则。Timeline 作为导航轴是一种设计主张，非战略要求 |
| **Landing 合并** | 未提及 | **B — 实现方案** | 两着陆页并存是历史演进结果，非战略矛盾 |
| **Workspace 中心化** | 间接 — "History OS" 暗示 Workspace 应是中心 | **A — 由产品战略直接要求** | PRD "OS" 意味着需要持久工作台。当前 WorkspacePanel 有框架但功能空 |
| **Map 空间维度** | **明确要求** — PRD/DNA 都将 Map 列为四元之一 | **A — 由产品战略直接要求** | PRD 行 21、DNA §4.4。Map 不是"nice to have"，是产品基石之一 |
| **Relationship First** | DNA §4.1 标题即为 "Graph-first (presentation principle)" | **A — 由产品战略直接要求** | DNA 行 46。但默认 view 是 list 而非 graph（与"优先"精神矛盾） |
| **One Gold Action** | DS Principle 1 (行 392) | **A — DS 战略要求** | 每视口最多一个金色主行动 |

---

## 9. 最终输出

### North Star（一句话）
> History Explorer 的历史版 Google Maps——一个让用户通过导航关系来自己构建历史理解的认知引擎。

（源：PRD 行 11："历史版 Google Maps"，行 12："users build their own understanding by navigating relationships"）

### Mission（一句话）
> 让人通过发现历史人物、事件、文明之间的连接来探索和构建理解，而非孤立地检索事实。

（源：DNA 行 11："exploration engine that helps users discover relationships"；Constitution 行 34-43："Understanding is more important than information volume"）

### 不可妥协的核心原则

1. **Explore→Connect→Understand→Discover 循环** — 三份文档的基础
2. **Grounding（溯源）** — 产品的 moat（DS Pillar 1）
3. **关系是基础结构** — "Everything is Connected" (PRD)
4. **AI 不替代证据** — Constitution 道德底线
5. **四元协同** — Graph/Timeline/Map/AI (PRD/DNA)
6. **内容为英雄** — Chrome 退后 (DS Pillar 2)

### 当前真正实现的战略

| 战略项 | 实现程度 |
|--------|---------|
| Grounding（溯源） | ✅ **已实现** — GroundedAnswer + ProvenancePanel |
| 双语 | ✅ **已实现** — i18n 框架完整 |
| Graph（关系图谱） | ✅ **已实现** — 8 实体色编码 + 18 标签 |
| Timeline（时间轴） | ✅ **已实现** — 单线/多线模式 |
| AI 多种形态 | ✅ **已实现** — 5 个功能入口 |
| 探索记忆 | ⚠️ 部分 — WorkspacePanel 有框架 |
| Map（空间） | ❌ **未实现** — 占位 |
| History OS | ❌ **未实现** — 仍是两态 SPA |

### 尚未实现但已经确定的战略（PRD/DNA/DS 明确要求）

- **Map 空间维度** — PRD 行 21 要求；DNA §4.4 要求；当前代码中无实现
- **"AI 傍内容"** — DS Principle 2 要求；当前代码中 AI 在内容末端
- **"Infinite Exploration 的 always sees 2-3 Next Node"** — DNA §4.2 承诺；当前实现在面板后段
- **"Graph-first" 的默认表现** — DNA §4.1 要求；当前默认 list

### 战略冲突列表

1. AI 傍内容（DS）← 冲突 → AI 在面板末尾（代码）
2. 四元协同含 Map（PRD/DNA）← 冲突 → Map 无实现（代码）
3. "always sees 2-3 Next Node"（DNA）← 冲突 → ContinueExploring 在面板后段（代码）
4. Graph-first（DNA）← 冲突 → 默认 list view（代码）
5. History OS（PRD）← 冲突 → 两态 SPA（代码）

### 需要 Product Owner 决策的问题

| # | 问题 | 为什么不能由文档或代码回答 |
|---|------|-------------------------|
| Q1 | **Map 空间维度的时间表** — PRD/DNA 将其列为四元之一，但代码未实现。Map 是 P0（必做）、P1（下阶段）、还是 P2（长期）？ | 代码未实现，文档无时间表 |
| Q2 | **AI 的角色模型** — DS 说"AI 傍内容"（single companion），但 PRD 说 AI 有 5 个角色（toolkit）。代码当前走 toolkit 路线。PO 选择哪一个？ | 文档间存在模糊——DS 与 PRD 对 AI 角色的描述不完全一致 |
| Q3 | **"History OS" 的定义** — PRD 提出这个定位，但三个产品文档都未定义 OS 的体验标准。当前代码是 SPA。如果目标是 OS，需要确认标准是什么 | 文档定位高但无度量 |
| Q4 | **默认视图优先级** — DNA "Graph-first" 承诺关系优先，但当前默认 list。如果图形体验更重，需要放弃 list 或将其作为备选 | 技术可行但需要 UX 决策 |
| Q5 | **Landing/Discover 合并** — 两个着陆组件并存。这不是战略冲突但会产生品牌不一致 | 需要品牌调性决策 |

### 哪些问题以后所有 Blueprint 都不能违反

1. **Explore→Connect→Understand→Discover 循环** — 任何设计必须保证每个环节都可到达
2. **Grounding 始终可见** — 任何 AI 回答必须带溯源徽标
3. **四元协同** — 任何页面设计必须考虑 Graph/Timeline/Map/AI 四个维度的存在，不能丢弃任何一维（即使 Map 当前未实现）
4. **内容为英雄** — Chrome 占用不得超过内容的视觉比重
5. **不发明类型** — 任何 Blueprint 不得引入第 9 种实体类型或第 19 种关系类型

> 验证结束。所有声明均引用当前 HEAD 的真实文档行号或代码行号。未引用任何历史报告、历史聊天或此前推断。
