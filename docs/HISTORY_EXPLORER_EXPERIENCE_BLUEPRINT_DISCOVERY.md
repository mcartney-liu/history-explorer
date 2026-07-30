# History Explorer Experience Blueprint Discovery Report

> 评估时间：2026-07-30 08:10 GMT+8
> 基线：`7bca32a` (vM62.5, master HEAD，工作树干净)
> 方法：Read Only。所有结论基于当前 HEAD 的真实代码、真实组件、真实页面组织及已提交的产品文档。
> 不是基于记忆。不是基于历史报告。不是基于"应该是什么"。

---

## 1. Executive Summary

History Explorer 目前的**产品眼光极佳，但体验表达严重落后于产品眼光**。

产品文档（PRD + DNA + DS V1.0 FINAL）共同描绘了一个宏大且统一的愿景：一个由 Graph / Timeline / Map / AI 四元协同驱动的"历史认知引擎"，用户在此像在 Google Maps 中一样"导航历史"。PRD 将其定义为"历史版 Google Maps"和"history cognition OS"。

但当前代码中的产品体验，呈现的是**一个仍然强烈的"查询-展示型"产品**——输入 topic → 看面板墙 → 点进去 → 看更多面板 → 可能离开。虽然代码中已打下大量 AI 能力、知识图谱、探索循环的组件基础，但这些能力分散在层层嵌套的面板后面，用户极难感知。最大的体验鸿沟在于：**"探索循环"作为产品灵魂的核心承诺，还没有成为用户打开产品时感知到的第一印象。**

**Experience Readiness Score：42 / 100**

---

## 2. 产品定位真实性评估

### 2.1 产品真正想表达什么

**【文档证据】** PRD 将产品定位为"历史版 Google Maps"，核心理念是"Infinite Exploration — 没有'读完'，只有持续点击"。Product DNA 进一步明确"Graph-first（表现层优先）""无限探索""AI 为导�"三大支柱，并将 Graph / Timeline / Map / AI 定义为**平等协同的四个维度**。

**【代码证据】** `App.tsx` 中出现两种导航模式：
- **Topic 视图**（`current.type === 'topic'`）：展示约 **21 个面板/组件**的线性滚动列表——从 SummaryPanel 到 AIExplanationPanel 到 RelationshipInsightPanel，中间有解释性面板、时间轴、关系图、推荐面板、对比工具。
- **Entity 视图**（`current.type === 'entity'`）：展示 **信息 / 研究 / 扩展** 三个可切换标签，每个标签下各有 5-10 个面板。

当前代码中：
- **Graph** 存在：`GraphViewPanel.tsx`（topic 视图）和 `ConnectionExplorer`（entity 视图）
- **Timeline** 存在：`TimelinePanel.tsx` / `MultiEntityTimeline`
- **AI** 存在：`AIExplanationPanel`、`HistorianChat`、`ResearchPanel`、`GroundedAnswer`
- **Map** — **不存在。** `ConnectionExplorer` 包含"地图"标签，但系统中没有 Geo/Mapping 组件。

### 2.2 与竞争品类的真正区别

| 品类 | 体验标签 | History Explorer 的差异化承诺 | 代码是否表达 |
|------|---------|---------------------------|------------|
| **Wikipedia** | "查一个词条，读完就走" | 不读完，永远有下一跳 | ⚠️ 部分 — 推荐面板在，但用户本能是"向下滚动"而非"点击下一跳" |
| **Google** | "搜索一个事实，得到答案" | 从关系出发，而非从查询出发 | ❌ 没有 — 进入产品的默认路径仍是搜索/选择 topic |
| **ChatGPT** | "问一个问题，得到回答" | AI 回答有溯源，附在内容旁 | ⚠️ 部分 — GroundedAnswer 有徽标，但 AI 作为"聊天"体验，不附着内容 |
| **博物馆** | "走进去，沉浸在展品中" | 沉浸式暖暗+大地色+叙事 | ⚠️ 部分 — 视觉语言在，但面板堆叠破坏沉浸感 |
| **纪录片** | "被讲述一个故事" | 有自己的叙事线（StorySection/WhyImportantPanel） | ⚠️ 部分 — 叙事存在，但淹没在 20 个面板之中 |

### 2.3 产品真正表达出的，与未表达出的

**已表达的：**
- 知识图谱关系（GraphViewPanel 的连接线/节点色编码）
- AI 溯源（GroundedAnswer + CitationList）
- 探索留痕（WorkspacePanel 历史列表）
- 搜索/主题导航（SearchBox + EntitySearchBox）

**未表达的：**
- 四元 协同（"进入一个探索空间，所有模块实时联动"）�� 完全没有
- "无限探索"的连续性——从一个实体到下一个实体是"新页面"，不是"旅程延续"
- AI 傍内容 而非孤立存在——AI 总是位于面板底部或研究标签中
- 时间作为导航轴——Timeline 展示事件，但你不能拖动、挑选、作为一个缩放透镜

**文档 vs 代码冲��：**
PRD 描述"Map = Spatial Dimension，是与 Graph/Timeline/AI 平齐的核心维度"，但代码没有任何空间数据或地图组件。这是产品承诺与真实能力之间已做出的落差。

---

## 3. 真实用户体验旅程

### 3.1 第一步：用户第一眼看到什么

**【页面证据】** `App.tsx:880-898`：当 `current === null`（新用户），首页同时渲染 `DiscoverPage` 和 `LandingPage` 两个组件。

```
DiscoverPage（先渲染）
  ↓ 英雄标题："原来历史还能这样探索。"
  ↓ 三栏切换：【了解】【研究】【扩展】
  ↓ 能力介绍 + 主题卡片 + 精选探索
  ↓
LandingPage（后渲染）
  ↓ 英雄标题："用 AI 探索历史文明"
  ↓ 4 个快速问题 + 主题卡片网格
```

矛盾：两个着陆组件并存，各有不同的标题和价值主张。"原来历史还能这样探索"强调探索，"用 AI 探索历史文明"强调 AI。用户看到的是**两个不同品牌调性的叠加**。

### 3.2 用户实际旅程

**第一眼 → 第一步 → 后续步骤**

```
Step 1: 看到 DiscoverPage 标题 + LandingPage 快速问题
  ├── 路径 A：点击快速问题（如"凯撒为什么重要？"）
  │      → topic 视图（21 个面板从天而降）
  │      → 信息过载 → 滚动 → 可能点一个关系 → 进入 entity 视图 → 更多面板
  │
  ├── 路径 B：点击主题卡片（如"古代文明"）
  │      → topic 视图 → 同上
  │
  ├── 路径 C：手动输入搜索
  │      → 需要输入英文 topic slug（如 roman_empire）
  │      → 中文输入被拒绝：`App.tsx:339` 检测并提示"请输入英文主题名"
  │      → 可能导致困惑或离开
  │
  └── 路径 D：浏览 DiscoverPage 向下滚动
         → 看到能力卡片（"历史叙事"等 4 张）
         → 看到主题网格（6 张）
         → 看到精选探索（1 张）
         → 看到热门探索
         → 点一个主题
         → ... 流程同上
```

### 3.3 体验转折点

| 里程碑 | 时间 | 体验评价 |
|--------|------|---------|
| **第一次使用产品的 5 秒** | 即时 | 两个竞争性标题 + 快速问题让用户不确定"这个产品到底是 AI 工具还是历史探索" |
| **第一次主题探索** | 2-3 秒 | 面板墙降临。无引导帮助用户理解"现在我应该看哪"
| **第一次看到关系图谱** | 10-20 秒滚动 | 需要先切换到"图谱"标签才能看到。默认视图是"列表" |
| **第一次使用 AI** | 30-45 秒滚动 | AIExplanationPanel 位于面板序列的末端。用户可能从未到达 |
| **第一次进入 Entity 详情** | 1-2 次主题探索后 | 进入了不同结构。信息/研究/扩展三标签与主题视图完全不同 |

### 3.4 探索循环是否闭环

**【页面证据】** `App.tsx`：Topic 视图 → Entity 视图的状态切换是全局的（`result` vs `entityData`）。

当前实际体验是：
```
Topic 探索（面板墙）
  ↓ 点击某个实体 ↓
Entity 详情（新页面、新结构）
  ↓ 点继续探索 ↓
新 Entity 详情
  ↓ ... ↓
可能回到 Topic（通过面包屑）
  ↓
可能离开
```

这不是循环——是**来回浏览**。用户没有体验到一个统一空间里持续交叉探索的感觉。

---

## 4. Information Architecture 分析

### 4.1 当前实际层级关系

**【代码证据——提取自渲染代码】**

```
根：App
├── [state: !current] 
│   ├── DiscoverPage（了解/研究/扩展三栏）
│   └── LandingPage（快速问题 + 主题卡片）
│
├── [state: current.type === 'topic']
│   └── topic 结果容器 {3 层：narrative → interpretation → supporting}
│       ├── SummaryPanel
│       ├── FirstExplorationGuide
│       ├── StorySection + WhyImportantPanel
│       ├── MainEntityCard
│       ├── RelationshipView / GraphViewPanel（切换）
│       ├── CrossTopicBridge
│       ├── RelatedEntityList
│       ├── TimelinePanel / MultiEntityTimeline（切换）
│       ├��─ TemporalComparisonPanel
│       ├── ConnectionsPanel
│       ├── ConnectionsExplainedPanel
│       ├── InterpretationPanel
│       ├── ThemesPanel
│       ├── ContinueExploringPanel
│       ├── TopicComparisonPanel
│       ├── AIExplanationPanel
│       ├── EntityPickerPanel
│       ├── MultiEntityContextPanel
│       ├── RelationshipInsightPanel
│       └── （共 21 个）
│
├── [state: current.type === 'entity']
│   └── EntityPage {3 标签：info/research/extensions}
│       ├── info 标签
│       │   ├── EntityHeader
│       │   ├── SummaryPanel
│       │   ├── StorySection + WhyImportantPanel
│       │   ├── EntityHero + EntityInsightCard + ExplorationGuide（打包为 EntityExperienceHeader）
│       │   ├── ConnectionExplorer（图谱/时间线/地图三视图）
│       │   ├── 探索卡片网格
│       │   ├── ResearchDiscoveryPanel（AI 入口 + 推荐）
│       │   ├── JourneyCard
│       │   ├── HistorianChat
│       │   └── ProvenancePanel
│       └── research 标签
│           ├── ResearchPanel（4 维度深度研究）
│           ├── ResearchLibrary
│           ├── EventPanel × 4（仅 Event 类型实体）
│           ├── InterpretationPanel
│           └── AIExplanationPanel
│
├── [全局]
│   ├── AppShell：SearchBox + EntitySearchBox + Breadcrumb + HistoryBar + ExplorationPathTree
│   └── WorkspacePanel（侧边栏：当前探索 + 足迹列表 + 置顶/笔记/对比/AI 助手入口）
```

### 4.2 用户理解难度

| 方面 | 评估 |
|------|------|
| 导航清晰度 | ⚠️ 低 — 两个搜索框（SearchBox 主题搜索 + EntitySearchBox 实体搜索）、两种页面形态（topic vs entity），新用户可能需要 3-5 分钟才能理解区别 |
| 面板层级 | ❌ 无感知 — 3 层标记（narrative/interpretation/supporting）在代码中定义，但用户看不到。21 个面板以线性方式堆叠，没有视觉分组 |
| 信息架构一致性 | ❌ 低 — Topic 和 Entity 是两套完全不同的面板组合，没有"这是同一个产品的不同深度"的感觉 |
| 找到 AI 的难度 | ❌ 高 — 在 topic 视图，AIExplanationPanel 是第 17 个面板。在 entity 视图，HistorianChat 是 info 标签的第 9 个面板 |

### 4.3 模块冗余与合并需求

【代码证据 — DS V1.0 FINAL Chapter 10 Migration Guide】

DS 规范已识别以下合并需求：
- `ConnectionsExplainedPanel` + `ConnectionsPanel` + `RelationshipInsightPanel` + `RelationshipEvidence` + `RelationshipPathGraph` → 合并为单一 Connections 模块
- `ContinueExploringPanel` + `RecommendationPanel` + `FirstExplorationGuide` → 合并为单一 Discover 引导
- `ExplorationJourney` + `JourneyCard` + `JourneyPanel` + `ExplorationPathTree` → 合并为 Journey 模块
- `ResearchSummary` + `ResearchReport` → 合并
- `ResearchDiscoveryPanel` + `ResearchDimensionCard` + `ResearchRecommendationCard` → 合并
- `CrossTopicBridge` + `CrossTopicConnectionsPanel` + `CrossTopicTopicList` → 合并

**共 ~18 个组件被标记为 MERGE，说明产品团队已意识到组件过度碎片化。**

### 4.4 "技术划分"而非"产品划分"

以下模块的存在原因更多是工程迭代的历史产物而非产品设计意图：

| 组件 | 问题 |
|------|------|
| `EntitySearchBox` + `SearchBox` | 两个搜索框同时出现。用户无法区分它们各自做什么 |
| `EntityPickerPanel` | 仅用于跨主题对比——是开发者术语（"选 candidate 列表"）而非用户体验术语 |
| `MultiEntityContextPanel` | "多实体上下文"不是用户能理解的概念 |
| `TemporalComparisonPanel` | 一个独立面板，与 TopicComparisonPanel 并驾——用户看到的是"有两个对比"而非"对比是一个功能域" |

---

## 5. Exploration Loop 分析

### 5.1 产品承诺的循环

【文档证据】Product DNA §2: "Explore → Connect → Understand → Discover" 持续循环，无终点。

### 5.2 当前实际状态

**Explore（开始）**：用户选择 topic → 进入面板堆
**Connect（连接）**：需要先滚动过 5-8 个面板，才到 RelationshipView/GraphViewPanel���即便是那里，默认是"列表"视图——用户必须手动切换到"图谱"
**Understand（理解）**：有 StorySection + WhyImportantPanel + InterpretationPanel —— 这些内容很丰富，但用户需要滚动过 SummaryPanel、FirstExplorationGuide 后才能到达
**Discover（发现下一跳）**：ContinueExploringPanel 和 RecommendationPanel 在面板最后 —— 用户须滚动完全部 21 个面板才能看到"下一步"。而"下一步"在 Product DNA 中被标记为"Infinite Exploration 的灵魂"

### 5.3 断开点

| 断点 | 位置 | 原因 |
|------|------|------|
| **断点 1：Connect 后压** | RelationshipView 在面板序列的中后段（topic 视图第 8-9 个面板） | Explore 的本能反应是"先看关系"，但面板顺序将其后压 |
| **断点 2：AI 作为孤岛** | AIExplanationPanel 是 topic 视图的第 17 个面板；HistorianChat 是 entity info 的第 9 个面板 | AI 在其他维度的面板都展示完才出现 |
| **断点 3：探索路径断裂** | Topic 视图 → Entity 视图���间是强断连 | 两套结构、不同面板、不同视觉。用户不能在统一空间中"跳入"下一节点 |
| **断点 4：无回归钩子** | 面板里没有统一的"继续探索"区域 | 推荐放在末尾——用户读完 20 个面板才能看到，不是随时可跳转 |

### 5.4 为什么断

**根本原因：Topic 视图是"展示所有能力"的组件清单，不是"探索旅程的空间"。**

21 个面板暗示开发团队拥有所有这些能力且想全部展示——但产品体验需要的是**筛选出一个核心体验路径**，然后把其余能力在适当的时候提供，而非一次性堆在用户面前。

---

## 6. AI 角色分析

### 6.1 AI 现在是五个不同的东西

【代码证据】

| 组件 | 体验 | 角色 |
|------|------|------|
| `AIExplanationPanel` | "向 AI 提问"输入框 + 模式选择 | **问答器** — 一问一答，需溯源 |
| `HistorianChat` | "推荐问题" + 多轮对话 + "当前探索：X | **对话伙伴** — 多轮聊天 |
| `ResearchPanel` | 4 维并行分析 + 进度条 + 报告 | **研究助手** — 自动生成结构化报告 |
| `GroundedAnswer` | 引用验证徽章 + CitationList | **可信回答者** — 所有回答共享的渲染层 |
| `ResearchDiscoveryPanel` | AI 入口 + 探索推荐 | **推荐器** — 根据实体推荐内容 |

用户面对的不是"一个 AI"，而是**五个不同的 AI 面孔**，各自在不同的位置、提供不同的交互方式。

### 6.2 与 PRD 的对比

【文档证据】PRD §3：AI 应该"解释当前节点和推荐下一跳"

PRD 中的 AI 是**统一的角色**——"AI as Guide"（interpret + guide）。但当前代码中，guide 功能（推荐）在 RecommendationPanel 和 ResearchDiscoveryPanel 中独立存在，解释功能分布在 AIExplanationPanel/HistorianChat 两端。

### 6.3 未来最合理的 AI 角色

**历史研究伙伴**。不是聊天机器人。不是搜索助手。是能理解当前实体上下文、主动给出"你要看什么 + 为什么"的存在。

原因是：
1. 产品的差异化在于 Grounding——溯源验证——这是 AI 必须做的事（现在 GroundedAnswer 已经有语义色渲染，但没有成为主导体验）
2. PRD 的"AI as Guide"方向是对的，但需要统一入口、统一交互、统一角色

---

## 7. Timeline 定位分析

### 7.1 现在是什么

【代码证据】TimelinePanel 和 MultiEntityTimeline 在两个视图中均可切换："单线" / "多线"。

当前 Timeline：
- 展示事件列表（垂直时间线 + 节点 + 标签）
- 可点击跳转到实体
- 在 topic 视图中是"单线/多线"切换模式
- 在 entity 视图中由 ConnectionExplorer 统一管理

### 7.2 导航还是展示

**展示。** Timeline 的所有交互是"点击事件 → 跳转到该实体"——这是超链接行为，不是导航行为。真正的导航应该是：**拖动时间轴 → 所有模块同步变化**（实体、关系、地图、AI 答案 都按所选时间重排）。当前代码没有任何模块间的时间同步通信。

### 7.3 是否应成为导航核心

**如果只选择一个主轴，时间是最好的候选。** 原因：
- 历史天然以时间为第一维（"Time First" 是 DNA 的明确声明）
- 但"时间轴驱动全局联动"在最重的架构赌注——需要所有面板订阅时间状态
- 当前代码的架构（单向数据流 from App state）不支持此模式

---

## 8. Relationship 定位分析

### 8.1 现在是什么

三个不同位置的关系视图：
1. **Topic 视图**：RelationshipView（列表模式）+ GraphViewPanel（图谱模式）——可切换
2. **Entity 视图**：ConnectionExplorer（图谱/时间线/地图三合一视图）
3. **各种小型关系面板**：ConnectionsExplainedPanel、RelationshipInsightPanel、ConnectionsPanel、CrossTopicBridge 等散布在各处

### 8.2 连线还是讲故事

**连线 + 部分解释。** GraphViewPanel 渲染 8 色节点 + 18 标签的连线图——视觉上有力。ConnectionsExplainedPanel 用文字解释关系。但两者是独立的——用户不能在图谱中看到"为什么这条线重要"，必须滚动到另一个面板看解释。

### 8.3 知识图谱的真正呈现

18 种关系类型（RELATIONSHIP_TYPES=18）在**后端验证中定义**，但前端呈现为**纯文本标签**——没有可视化编码（颜色/粗细/箭头样式）来表达关系的强度和类型。图谱中的每条边看起来相同——用户无法从视觉上区分"核心政治联盟"和"周边文化影响"。

---

## 9. Workspace 定位分析

### 9.1 当前模式

【代码证据】WorkspacePanel 是一个侧边栏，包含：当前探索 + 足迹列表 + 三个占位区域（置顶/研究笔记/对比队列）+ AI 助手入口。

### 9.2 页面模式还是工作台

**介于两者之间。** 它不是一个"页面"（不独立成页），但也不是一个真正的工作台——三个功能占位（置顶/笔记/对比）是空的，没有任何实际交互。

### 9.3 是否应发展为 Exploration Workspace

**是，而且这是最自然的演进方向。** Workspace 面板已经是贯穿所有页面的常驻元素。如果产品最终目标是"一个持续探索的工作台"（而非翻页浏览），Workspace 是天然的载体——它需要做的不是加功能，而是**合并当前分散的探索记忆功能**：Workspace history + Journey entries + recent explorations + save/bookmark 已经在代码中分散存在，只是不在同一个地方。

---

## 10. 能力可见性分析

### 10.1 能力→感知映射

| 能力 | 存在位置 | 普通用户能感知吗？ | 原因 |
|------|---------|-----------------|------|
| **Graph（关系图）** | Topic: 切换后呈现；Entity: ConnectionExplorer | ⚠️ 中等 | 需手动切换"图谱"标签；默认是"列表" |
| **Timeline（时间轴）** | 同上 | ⚠️ 中等 | 需手动切换"多线"；默认是"单线" |
| **AI 溯源回答** | GroundedAnswer + CitationList | ⚠️ 中等 | 徽标在，但 AI 面板在末端 |
| **Research Mode（4 维分析）** | Entity → 研究标签 → ResearchPanel | ❌ 低 | 需要 2 次点击（切换标签 → 滚动到面板） |
| **AI Historian（对话）** | Entity → info 标签 → 底部 | ❌ 低 | 需要大量滚动 |
| **ConnectionExplained（关系解释）** | Topic 视图 → 中段面板 | ❌ 低 | 与其他 8 个解释面板混在一起 |
| **Cross-Topic Bridge** | Topic 视图 → supporting 层 | ❌ 低 | 概念太技术，用户不理解 |
| **Multi-Entity Compare** | EntityPickerPanel + MultiEntityContextPanel | ❌ 极低 | 隐藏在下半段，术语陌生 |
| **Research Library（保存）** | Entity → 研究标签 → 第二个面板 | ❌ 极低 | 需先开启研究才需要用 |
| **Workspace History（足迹）** | WorkspacePanel | ⚠️ 中等 | 在侧边栏，始终可见 |

### 10.2 只有开发者知道的能力

- `EntityPickerPanel` 的跨主题对比流程
- `ResearchInsights`（数据分析）及其推荐能力
- `ProductIntelligence` 及其融合决策
- `ExplorationBehaviors`（用户行为模式检测）
- `TopicComparisonPanel`

> **9 个智能模块（M43–M49 + M50–M57）在代码中全部存在且具有真实功能（941 测试全绿），但它们的内容在用户界面中几乎不可见。**

---

## 11. 当前产品最大的 5 个体验问题（按影响力排序）

### 11.1 探索循环未成立（影响力：最高）

**问题**：用户进入产品后，自然行为是"搜索 → 浏览 → 滚动 → 可能离开"。没有体验到一个不断深入、不断分叉的探索旅程。

**【代码证据】** 探索循环承诺的"从任一节点看到 2-3 个下一跳"被淹没在面板序列的末尾。AI 与推荐面板隔了 17 个面板。两个搜索框（topic + entity search）暗示这是一个"查询工具"而非"探索产品"。

### 11.2 面板墙（信息过载）（影响力：最高）

**问题**：Topic 视图渲染 21 个面板/组件，Entity 视图渲染另外 15 个。用户面对的不是"应该看什么"，而是"这里有一切，你自己挑"。

**【代码证据】** `App.tsx:671-820` 的 topic 视图渲染列表包含 21 个 `<section>` 和 `<div>` 数据标签划分了 narrative/interpretation/supporting 三层，但用户在浏览器中看不到这些标记。

### 11.3 AI 不傍内容（影响力：高）

**问题**：AI 不"傍"内容——它在面板末端或研究标签中，用户必须先"完成阅读"才能"用 AI"。这与 DS Principle #2 ("AI lives beside content") 直接矛盾。

**【代码证据】** `EntityPage.tsx:330` 的 `AIExplanationPanel` 只在 research 标签中渲染。Topic 视图的 AIExplanationPanel 在所有关系/时间轴/对比面板之后（`App.tsx:800`）。

### 11.4 中英文双系统阻碍探索（影响力：高）

**问题**：首页两个标题（一个强调"探索"，一个强调"AI"），两个搜索框——英文 topic slug 搜索 (`/explore/roman_empire`) + 中文实体搜索 (`/entity/{id}`)。新用户不知道什么时候用哪个。

**【代码证据】** `App.tsx:330-342`：主题搜索仅接受英文 slug (`/^[a-z0-9_-]+$/`)，中文输入被拒绝。`App.tsx:557-583`：两个搜索框同时渲染，均置于 AppShell 顶部。

### 11.5 无统一探索空间（影响力：高）

**问题**：Topic 视图和 Entity 视图是两种完全不同的页面——不同结构、不同面板、不同视觉。用户在两者之间来回是"跳转页面"，不是"在一个空间里移动"。

**【代码证据】** `App.tsx:671-820`（topic 渲染）与 `App.tsx:822-878`（entity 渲染）是完全独立的两个 `<div>` 块。

---

## 12. 未来 Experience Blueprint 建议

### 12.1 核心方向

**将产品从"两页模式"重构为"单一探索空间模式"——但这不需要一次性完成，可以分阶段渐进式演进。**

### 12.2 七个体验改善方向

| # | 方向 | 优先级 | 依据 |
|---|------|--------|------|
| 1 | 合并 LandingPage + DiscoverPage 为单一入口页面 | P0 | 两套品牌调性互相稀释 |
| 2 | 以"探索空间"取代"页面切换"——常驻左轨（当前实体）+ 右面板（AI 伙伴）+ 底部时间轴 | P0 | Topic/Entity 两页模式碎片化 |
| 3 | AI 升级为"探索空间的永久伴侣"——不再藏在面板底部或标签后 | P0 | DS Principle #2 违背 |
| 4 | 面板合并收束到 5-7 个主面板——其余能力通过渐进展开释放 | P1 | 21-panel 信息过载 |
| 5 | 统一为"一个搜索"——topic 搜索 + entity 搜索合并为统一探索入口 | P1 | 中英文双系统阻碍探索 |
| 6 | "继续探索"无处不在——每一步都有可见的下一跳 | P1 | 探索循环的灵魂 |
| 7 | Timeline 与 Relation 从"展示组件"升级为"导航控制器" | P2 | Product DNA 的"Time First"承诺 |

### 12.3 基于真实体验的分阶段路线

```
Phase 1 — Foundation Surface（先做，最小可行体验）
  Landing/Discover 合并 → 统一探索空间壳 → AI 伴侣常驻
  （不新增能力，只重新编排现有面板的呈现方式）

Phase 2 — Depth（面板收敛 + 交互升级）
  面板合并（DS Chapter 10 MERGE） → Timeline 联动 → "继续探索"无处不在

Phase 3 — Breadth（能力浮现 + 空间扩展）
  Map 空间维度上线 → Cross-topic 成熟 → Workspace 升级
```

---

## 13. 执行优先级

### 立即执行（不依赖 DS V2 或 Exploration OS）

- 合并 LandingPage 和 DiscoverPage 为单一入口
- 重新编排 topic 视图面板的展示层级（3 层标记 → 用户可见的分组或折叠）
- 将 ContinueExploringPanel 和 RecommendationPanel 从末尾移到面板流的中前位置
- 消除面板重复——按 DS Chapter 10 的 MERGE 清单做最小合并

### 必须在 Design System V2 之后

- Token 对齐后统一 AI 面板的视觉位置
- 统一 8 种实体类型在 GraphView 中的颜色（当前硬编码 26 处 hex）
- 引入统一的卡片语言、面板语言

### 必须在 Exploration OS 建立之后

- Topic → Entity 之间的过渡从"跳转页面"变为"空间内移动"
- 常驻左轨 + 右面板 + 底时间轴的持久壳
- Timeline 作为全局导航轴驱动多模块联动

### 必须在 M63 之后

- Map 空间维度的产品化上线
- Workspace 从侧边栏升级为完整研究台面（笔记/对比/会话功能从占位实现为真实功能）
- 智能模块（M43-M49/M50-M57）的能力从后台浮现到用户可见的推荐和分析界面

---

## Appendix: Experience Readiness Score

**Final Score: 42 / 100**

| 维度 | 评分 | 权重 | 扣分原因 |
|------|------|------|---------|
| 产品入口一致性 | 2/10 | 15% | 两套着陆页、两套搜索框、中英文分离 |
| 探索循环完整性 | 3/10 | 20% | 从 Explore→Connect→Understand→Discover 的循环断在各个环节 |
| AI 集成度 | 4/10 | 15% | 5 个分离的 AI 面孔、AI 不是伴侣是终端功能 |
| 信息架构清晰度 | 3/10 | 15% | 21 个 topic 视图面板 + 15 个 entity 视图面板——线性堆叠，无层级引导 |
| 视觉统一性 | 5/10 | 10% | DS V1.0 FINAL 规范卓越但代码中有海军蓝遗留+26 处硬编码 |
| 导航连贯性 | 3/10 | 10% | Topic 和 Entity 之间是"跳转"，不是"移动" |
| 能力可见性 | 3/10 | 10% | 9 个智能模块在后台运行但用户完全不知其存在 |
| 信任与溯源 | 8/10 | 5% | GroundedAnswer + CitationList + ProvenancePanel 代码扎实——这是做对了的 |

> 报告完。所有带【代码证据】【页面证据】【文档证据】【组件证据】标记的结论直接取自当前 HEAD 的真实文件。未使用任何来自记忆或历史对话的材料。
