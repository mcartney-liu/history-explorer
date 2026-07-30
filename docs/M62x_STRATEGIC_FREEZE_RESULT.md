# M62.x Strategic Freeze Result

> 基线：`7bca32a` (vM62.5, master HEAD)
> 基于：PRD v1.0 / Product DNA v1.1 / Product Constitution v1.0 / Design System V1.0 FINAL
> 前置验证：North Star Validation Report + M62.x Strategic Evidence Audit — 所有声明均已溯源至文档行号
> 状态：提交 Product Owner 决策，不作代码修改

---

# Phase 1 — History Explorer Strategic Foundation v1.0

---

## Level A — Immutable Product Identity

这些原则定义了 History Explorer 的产品身份。删除任何一条，产品不再是产品文档所描述的同一个产品。

---

### A1. Relationship-First Experience

**Definition**：关系是用户理解历史的主要透镜。任何页面或功能必须以关系呈现为优先——关系的展示在内容层级上先于独立的文字信息。

**Evidence**：
- PRD 行 27: `"Graph-first (presentation principle): relationships are shown with priority — relationship lists before prose, related nodes clickable"`
- DNA 行 46-48: `"Graph-first (presentation principle). Relationships are the primary lens"`
- DS Part 1.1: "We are Exploratory"

**Blueprint Constraint**：
- 任何页面设计必须首先回答"用户在这一屏看到的关系是什么"——先回答，再设计其他元素
- 关系的视觉层级 ≥ 面板上任何独立的文字信息
- 关系节点必须可点击、可导航

---

### A2. Grounding as Trust Foundation

**Definition**：产品必须通过可追溯的证据源来担保历史准确性。任何 AI 生成的内容必须携带溯源验证状态；"已验证"和"未验证"必须是用户始终可以看到的第一类状态。

**Evidence**：
- DS 行 47: `"Grounding over Generation. The product's signature is verified history"` (Pillar 1)
- DS 行 109: `"--verified and --unverified are product-defining. Every AI-generated surface must show one"`
- Constitution 行 46-58: `"AI is a guide, not the authority"`
- PRD 行 29-30: `"AI does not replace the graph structure, evidence, or critical thinking"`

**Blueprint Constraint**：
- 所有 AI 输出必须含 Grounding 标识（verified/unverified）
- 不能有任何 AI 回答在没有 Grounding 标识的情况下呈现给用户
- 溯源信息必须可访问，不能隐藏在深层面板后

---

### A3. Explore → Connect → Understand → Discover Loop

**Definition**：产品的核心体验不是线性阅读，而是循环：用户从任意节点出发→发现连接→形成理解→发现新节点→循环继续。每一步必须有可见的"下一跳"。没有终点页。

**Evidence**：
- PRD 行 39: `"Core Experience Loop: Explore → Connect → Understand → Discover"`
- DNA 行 20: `"The fundamental user experience is: Explore -> Connect -> Understand -> Discover"`
- DNA 行 57-67: `"Infinite Exploration (soul). There is no 'reading finished' — only continuous clicking"`
- DNA 行 62-63: `"At any Entity page the user always sees: 2-3 Next Node recommendations, a clickable relationship list"`
- Constitution 行 27-32: `"Exploration Is The Core Experience"`

**Blueprint Constraint**：
- 每个实体/主题视图必须提供可见的"继续探索"入口
- 不能在用户"完成阅读"后让用户自行寻找下一页
- 探索轨迹必须有记忆——用户应该能够返回

---

### A4. Four-Dimension Framework

**Definition**：产品由四个共等的维度构成——Graph(关系结构)、Timeline(时间维度)、Map(空间维度)、AI(解读与导航层)。四个维度共同服务于探索体验，没有层级优先级。任何设计方案必须同时考虑四个维度的存在。

**Evidence**：
- PRD 行 18-24: `"Four-Element Synergy (equal dimensions). These four are co-equal building blocks... There is no value hierarchy among them"`
- DNA 行 81-90: `"Four-Element Synergy (equal dimensions). Graph, Timeline, Map, and AI are co-equal dimensions... no value hierarchy"`

**Blueprint Constraint**：
- 任何页面设计必须在概念上包含所有四个维度的考虑
- 不能出现"这一页只需要 Graph 和 AI，不需要 Timeline 和 Map"的设计决策——单独页面可以高亮某个维度，但不能忽略某个维度
- Map 当前为实现中的维度（见 Level C），但设计时不能因"未实现"而忽略其空间

---

## Level B — Strategic Experience Principles

这些原则定义了产品应该如何感知。它们指导设计决策，但在实现方式上允许灵活性。

---

### B1. AI as Guide

**Meaning**：AI 的角色是帮助用户探索和理解历史。AI 解释当前节点为什么重要、它如何连接、以及用户下一步应该探索什么。AI 不是替代品——不替代知识图谱结构、历史证据或批判性思维。

**Evidence**：DNA §4.3 / Constitution §2.4 / PRD 行 29-30

**Acceptance Direction**：
- AI 必须是探索流中主动提供上下文和方向的角色
- "用户需要先知道要问什么"是反设计——AI Guide 意味着 AI 主动建议
- 当前代码中 AI 是多工具模式。Blueprint 可以保留多个 AI 能力但需要统一的 Guide 角色包装

---

### B2. AI Beside Content

**Meaning**：AI 互动不是独立模式。AI 的回答和解释应当内联在历史内容旁边——不在弹出窗口、不在独立标签、不在阅读完成后。AI 是内容身边的同伴。

**Evidence**：DS 行 394 (Principle 2): `"AI lives beside content, not in a mode"`

**Acceptance Direction**：
- AI 不应放置于面板流的末尾，应为内容流的并行元素
- "AI 在旁边"不意味着永远固定在一个角落——意味着用户看内容时，AI 在可见范围内

---

### B3. Content is the Hero

**Meaning**：界面 Chrome（导航、按钮、面板框架）保持低对比度和结构性。历史叙事、关系和溯源保持高对比度并居中显示。内容的视觉权重大于 Chrome。

**Evidence**：DS 行 48 (Pillar 2) / DS 行 397 (Principle 5)

**Acceptance Direction**：
- 面板边框、标题、切换控件等 Chrome 元素的视觉重量应低于其内容
- 任何页面设计中 Chrome 元素的总视觉面积应小于内容区域
- 当前代码中面板的 Chrome 与内容近似平等——Blueprint 应倾斜至内容

---

### B4. Infinite Exploration

**Meaning**：产品没有终点。用户在任何页面始终能看到"下一步"。探索不是为了一个答案，而是为了不断分叉和深入。

**Evidence**：DNA §4.2: `"Infinite exploration is the product's soul"`

**Acceptance Direction**：
- 每个视图必须包含"继续探索"的入口
- 不能有"探索完成"的终止信号（如"学习完毕""满分"）
- 用户主动离开是正常行为——不需要用进度条或徽章诱导停留

---

### B5. Four-Dimension Visual Expression

**Meaning**：Graph/Timeline/Map/AI 不仅在概念上共等，在可视体验中也必须共存。用户不需要在四个维度之间"切换"——它们应在探索空间中同时存在或自然关联。

**Evidence**：PRD 行 18-24 / DNA 行 81-90

**Acceptance Direction**：
- 四个维度的视觉表达应在同一探索空间中可触达
- 切换维度不应感觉像"换页面"

---

### B6. Workspace Direction

**Meaning**：Workspace 承载探索的记忆和连续性。它不是内容页——它是跨页面存在的元层，确保产品有"上次在哪、这次去哪"的连续性。

**Evidence**：PRD 行 12 "OS" 暗示 / DS Part 4.4 定义 Workspace 为"探索的记忆层" / DS Part 5.8 定义 Workspace 布局

**Acceptance Direction**：
- Workspace 应是常驻的——随探索内容切换而保持不变
- 当前 WorkspacePanel 侧边栏 + 占位区是方向，但需要从"侧边栏"升级为"空间中的持久工作区"

---

## Level C — Vision Roadmap

这些是产品战略中已声明但当前未执行或执行不完整的方向。它们是未来蓝图中的目标，不是当前 Sprint 的要求。

---

### C1. History OS

**来源**：PRD 行 12: `"A history cognition OS, not a content app"`

**当前状态**：无操作性定义。无架构标准。无验收条件。代码是两态 SPA。

**定位**：长期产品方向。实现需要先定义"OS"的含义（见 Phase 3 中的 D1）。

---

### C2. Map Dimension

**来源**：PRD 行 21 / DNA 行 87 / 四元框架

**当前状态**：代码中 ViewSwitcher 有"空间"按钮，渲染"空间视图即将上线"占位。无功能实现。

**定位**：下一里程碑的高优先级项——PRD/DNA 均明确要求。是四元的第四元，不容长期缺位。

---

### C3. AI Five Roles

**来源**：PRD 行 45-46: `"(vision target) — five roles: History Guide · Next Node · Graph Builder · Explanation Engine · Path Navigator"`

**当前状态**：标记 "(vision target)"。代码中有 5 个 AI 功能入口，但与 5 个角色不是一一对应。

**定位**：长期 AI 能力路线。不需要在短时间内完整实现所有 5 个角色。

---

### C4. Museum Experience

**来源**：DS 中 6 处提及，作为定性描绘而非操作性原则。Quality Checklist 有"是否符合 Museum Feeling"一项但无判断指南。

**当前状态**：无操作性定义。

**定位**：长期体验目标。对设计方向有约束力（"像博物馆，不像仪表盘"），但在量化前不能作为验收标准。

---

# Phase 2 — Blueprint Validation Framework

任何未来的设计蓝图（Experience Blueprint、Exploration OS 设计、页面重构等）在提交 Product Owner 批准前，必须通过以下三重验证。

每个验证项包含一个判定式问题和一个反设计信号（表明蓝图走偏了）。

---

## Gate 1 — Identity Check

**基本问题：这个设计是否维护了产品身份？**

| 验证项 | 问题 | 如果违反了，你会看到 |
|--------|------|-------------------|
| **Relationship First** | 关系是页面上优先级最高的信息吗？ | 关系被埋在正文之后，或者被折叠、"展开查看更多"模式 |
| **Grounding** | 每个 AI 输出都有溯源标识吗？ | AI 回答看起来像 ChatGPT 自由文本，看不到 verified/unverified |
| **Exploration Loop** | 用户到达任何页面后，立即能看到"下一跳"吗？ | 用户需要滚动到底部才能看到 Continue Exploring |

**通过条件**：三项全 PASS。

---

## Gate 2 — Experience Check

**基本问题：这个设计是否维护了产品的定位？**

| 验证项 | 问题 | 如果违反了，你会看到 |
|--------|------|-------------------|
| **Content Hero** | 内容的视觉重量 ≥ Chrome 吗？ | 面板标题+framing+切换器更显眼，内容显得次要 |
| **AI Beside Content** | AI 在内容旁边吗？不是在后段或独立标签？ | "AI 助手"是一个独立标签，或者需要在读完内容后才能打开 |
| **Four Elements** | 四个维度都被考虑了吗？ | 设计方案只提到 2-3 个维度，"Map 以后再考虑" |

**通过条件**：三项全 PASS。

---

## Gate 3 — Constraint Check

**基本问题：这个设计是否在工程约束之内？**

| 验证项 | 问题 | 如果违反了，你会看到 |
|--------|------|-------------------|
| **Entity Types = 8** | 设计方案引入了第 9 种实体类型？ | 新的实体分类标签（如"dynasty""battle""movement"）不在 8 类中 |
| **Relationship Types = 18** | 设计方案引入了第 19 种关系？ | 新的关系标签（如 "influenced_art""military_alliance"）不在 18 种中 |

**通过条件**：两项全 PASS。任何违反需要 Freeze Revision Gate(ADR + 架构评审 + PO 批准)。

---

# Phase 3 — Resolving D1–D7

## D1: History OS 的定义

| 维度 | 内容 |
|------|------|
| **Current ambiguity** | PRD 行 12 提到 "history cognition OS" 但从未定义。DS 暗示了 Workspace 和持久层，但没有"OS"的定义。 |
| **Why documents cannot decide** | 术语 "OS" 在产品语境中不常见——通常是架构术语。"OS" 在 PRD 中可能是比喻性使用 |
| **Possible interpretations** | A) OS 意味着持久化 shell（常驻导航 + Workspace + session）— 类似 IDE。B) OS 意味着可扩展平台（允许第三方贡献模块）。C) OS 是一种修辞——意思是"这不是一个简单的页面工具，而是一个系统" |
| **Product impact** | A 对 Blueprint 影响最大——意味着需要重新定义页面架构。C 影响最小——只需确保产品不碎片化 |
| **Recommended PO decision question** | "History OS 作为产品术语，是指在技术上建立一个可扩展平台（如插件系统），还是在体验上建立一个持久化的探索工作空间（如常驻 shell）？" |

---

## D2: Museum Experience 的定义

| 维度 | 内容 |
|------|------|
| **Current ambiguity** | DS 使用 "museum" 作为定性语气——"museum-grade""feels like standing in a museum wing""museum calm"。Quality Checklist 有 "Museum Feeling" 一项，但没有判断指南。 |
| **Why documents cannot decide** | "博物馆"是一个主观比喻。不同的博物馆有不同的品牌感觉（卢浮宫 vs 科技馆 vs 自然历史博物馆） |
| **Possible interpretations** | A) 博物馆意味着安静、沉浸、以展品(内容)为中心——界面退后。B) 博物馆意味着黑暗环境+聚焦灯光+策展叙事。C) 博物馆意味着"教育空间"——有导览、说明、策展视角 |
| **Product impact** | 对设计令牌和视觉风格有直接影响。A 和 B 指向不同的 UI 密度和配色策略 |
| **Recommended PO decision question** | "History Explorer 的 '博物馆' 类比是指沉浸式暗黑展品空间（像近代美术馆），还是教育性策展空间（像历史博物馆+解释墙+导览）？两者的视觉语言不同。" |

---

## D3: Graph-first 的定义

| 维度 | 内容 |
|------|------|
| **Current ambiguity** | DNA "Graph-first" 的具体承诺是 "relationship lists before prose"——关系列表在正文之前。但 "first" 是否意味着关系图必须在视觉上先于列表？ |
| **Why documents cannot decide** | "Graph-first" 是标题修辞，"relationship lists before prose" 是具体定义。标题和正文给出了两个不同的标准 |
| **Possible interpretations** | A) "first" 意味着信息架构优先级——关系在内容层级中高于独立文字，但不强制可视化。B) "first" 意味着视觉优先级——默认视图中 graph(视觉图) 优先于 list(文字列表) |
| **Product impact** | A 支持当前实现（默认 list view 但列表在上方）。B 要求修改默认可视化方式（默认渲染 graph 而非 list） |
| **Recommended PO decision question** | "'Graph-first' 是信息架构原则（关系在页面层级上高于正文），还是视觉体验原则（默认必须以图的形式呈现关系）？" |

---

## D4: Infinite Exploration 的量化

| 维度 | 内容 |
|------|------|
| **Current ambiguity** | DNA 说 "there is no reading finished"，这意味着永不终止？在每个节点都提供下一步？还是循环用尽资源后可以停止？ |
| **Why documents cannot decide** | "无限"是一个绝对化表述——在有限数据集上无法字面实现。"没有终点"可能是一个精神目标，不是技术指标 |
| **Possible interpretations** | A) Infinite 意味着，只要数据集中有可连接的节点，产品就应该显示下一步。B) Infinite 意味着，用户从任何视图都能看到 Continue Exploring 的入口——不需要费力寻找。C) Infinite 是一个体验承诺，当数据集耗尽时可以有自然的终止点 |
| **Product impact** | B 最易实现，A 需要数据集覆盖所有节点的所有可能连接 |
| **Recommended PO decision question** | "'Infinite Exploration' 是一个体验承诺（任何时候都不绊住用户）还是一个数据完整性承诺（所有可能路径都必须存在）？" |

---

## D5: Content is the Hero 的量化

| 维度 | 内容 |
|------|------|
| **Current ambiguity** | DS "Content is the hero. Chrome is quiet, low-contrast, structural." 没有量化标准。什么时候内容"不够"英雄？什么时候 Chrome 太抢眼？ |
| **Why documents cannot decide** | "Hero" 和 "quiet" 是定性语言——DS 无法设定数字阈值 |
| **Possible interpretations** | A) Chrome 的对比度和视觉重量应测量——例如内容区对比度 ≥ Chrome 对比度的 1.5 倍。B) 任何 Chrome 元素的视觉面积 ≤ 页面总面积的 20%。C) "Hero" 意味着不做量化——通过设计评审的感官判断 |
| **Product impact** | C 最灵活但最主观。A 和 B 可自动化但可能过于僵化 |
| **Recommended PO decision question** | "'Content is Hero' 应该量化为可测量的视觉标准，还是作为每次设计评审时的感官判断指南？" |

---

## D6: AI 的角色模型

| 维度 | 内容 |
|------|------|
| **Current ambiguity** | PRD 定义了 5 种 AI 角色(能力分类，"vision target")。DS 定义了 AI 的 UX 位置("beside content")。但产品的 AI 应该以一个统一角色的身份存在（"一个 AI 历史学家"），还是以多个工具的身份存在？ |
| **Why documents cannot decide** | PRD 的 5 个角色是能力分类（AI 能做什么）。DS 的 "beside" 是 UX 位置（AI 放在哪里）。文档没有定义 AI 的人格/角色数量——是一个 AI 还是多个 AI |
| **Possible interpretations** | A) 单一 AI 伴侣——用户面对的是一个"AI 历史学家"，它可以解释、推荐、做研究，但角色一致。B) 多工具体系——用户面对 5 个不同的 AI 功能入口，每个有不同的提示和交互模式 |
| **Product impact** | A 需要对 5 个代码中的 AI 入口进行角色统一。B 维持当前代码的分离入口结构 |
| **Recommended PO decision question** | "用户面对 AI 时，应该感觉是在和一个历史学家对话（单一角色模式），还是感觉在用一个 AI 工具箱（多工具模式）？" |

---

## D7: 四元 "co-equal" 的定义

| 维度 | 内容 |
|------|------|
| **Current ambiguity** | PRD/DNA 都声明四元是 "co-equal" 且 "there is no value hierarchy"。但 "equal" 在视觉层面意味着什么？每个维度需要同等的 UI 权重、屏幕空间、还是只是都必须存在？ |
| **Why documents cannot decide** | "Co-equal" 是一种价值声明（四个维度同等重要），不是一个 UI 规范（四个维度同等大小） |
| **Possible interpretations** | A) "Equal" 意味着每个维度必须在每个视图中存在——不能有页面缺少任何维度。B) "Equal" 意味着不能偏爱某个维度作为"主维度"——但单个页面可以聚焦一个维度。C) "Equal" 意味着不能让某个维度成为"付属品"（如 Timeline 永远缩在底部角落） |
| **Product impact** | A 最严格——每个页面都要四个维度。B 最灵活——聚焦是允许的 |
| **Recommended PO decision question** | "'Four-Element co-equal' 意味着每个页面都必须有四个维度的元素（A），还是意味着不能整体偏爱某个维度（B）？" |

---

# Phase 4 — M62.x Strategic Freeze Result

---

## 1. Frozen Principles

以下原则定义了产品身份。后续任何 Blueprint 必须无条件遵守。

| # | 原则 | 来源 | 可测试 | 定义缺失 |
|---|------|------|--------|---------|
| F1 | **Relationship First** — 关系在信��层级中优先于独立文字 | PRD 27 / DNA 46-48 | PARTIAL | "First" 是信息架构优先还是视觉优先？(D3) |
| F2 | **Grounding** — 每个 AI 回答必须携带溯源状态 | DS 47 / DS 109 | ✅ YES | |
| F3 | **Exploration Loop** — 每页有下一跳；Explore→Connect→Understand→Discover 循环 | PRD 39 / DNA 20 / DNA 57-67 | PARTIAL | "无限"如何量化？(D4) |
| F4 | **Four-Dimension Framework** — Graph/Timeline/Map/AI 四维共存 | PRD 18-24 / DNA 81-90 | PARTIAL | "co-equal"在视觉层面意味着什么？(D7) |
| F5 | **Entity Types = 8** | 冻结红线 | ✅ YES | |
| F6 | **Relationship Types = 18** | 冻结红线 | ✅ YES | |

---

## 2. Flexible Principles

这些原则是强指导性的，但在实现细节上允许 Blueprint 进行解释。每个原则有一个"自由范围"。

| # | 原则 | 来源 | 自由范围 |
|---|------|------|---------|
| FL1 | **AI as Guide** — 主动解释+建议方向 | DNA §4.3 / Constitution §2.4 | 是否用统一的单一角色包装 5 个 AI 能力 |
| FL2 | **AI Beside Content** — AI 不单独成模式/标签 | DS 394 | 物理位置的实现（侧边栏 vs 内联面板 vs 悬浮按钮） |
| FL3 | **Content is Hero** — Chrome 退后，内容领先 | DS 48 / DS 397 | 视觉比重比例（可通过感官设计评审或数字化标准） |
| FL4 | **Infinite Exploration** — 无终点，持续分叉 | DNA §4.2 | 当前数据集耗尽时的行为 |
| FL5 | **Four-Dimension Visual** — 四维在空间中可触达 | PRD 18-24 / DNA 81-90 | 各维度的 UI 权重分配 |
| FL6 | **Workspace Direction** — 持久工作区承载探索记忆 | DS Part 4.4 / DS Part 5.8 | 侧边栏 vs 全页 vs 底栏的实现形态 |

---

## 3. Future Vision

这些是已声明的战略方向，但当前不是 Blueprint 的必须交付项。

| # | 方向 | 状态 | 依赖 |
|---|------|------|------|
| V1 | **Map Dimension** | 未实现 | 需要技术方案 + Freeze Gate（如涉及 GIS） |
| V2 | **AI Five Roles** | PRD vision target | 优先确认 AI 角色模���(D6) |
| V3 | **History OS** | 无定义 | 优先确认 OS 定义(D1) |
| V4 | **Museum Experience** | 无操作性定义 | 优先确认 Museum 定义(D2) |

---

## 4. Engineering Freedom

在设计 Blueprint 时，工程团队在以下方面有自主权（不违反 Frozen Principles 的前提下）：

| 领域 | 自由范围 |
|------|---------|
| **导航架构** | Topic/Entity 两页 vs 统一空间 vs 虚拟滚动——文档未规定 |
| **面板策略** | 数量、布局、默认折叠状态、渐进展开——文档未规定 |
| **AI 入口** | 侧边栏 vs 内联 vs 角落按钮——只要 AI "beside content" |
| **关系视觉** | List vs Graph 作为默认——只要关系在正文之前 |
| **搜索实现** | 合并搜索 vs 独立搜索——文档未规定 |
| **Workspace 形态** | 侧边栏 vs 全页 vs 底部 rail——文档未规定形态 |

---

## 5. PO Decisions Required

以下问题在 Blueprint 进入设计阶段前必须由 Product Owner 明确回答：

| # | 问题 | 紧急度 |
|---|------|--------|
| Q1 | AI 角色模型：单一伴侣 vs 多工具 [D6] | **CRITICAL** — 这决定所有 AI Blueprint 的基础架构 |
| Q2 | Museum Experience：沉浸式暗黑展品空间 vs 教育性策展空间 [D2] | **CRITICAL** — 这决定整个视觉方向 |
| Q3 | Graph-first：信息架构优先 vs 视觉体验优先 [D3] | **HIGH** — 这决定关系视图的默认呈现 |
| Q4 | History OS：可扩展平台 vs 持久化工作空间 [D1] | **HIGH** — 这决定 Workspace 和 Shell 的架构 |
| Q5 | Infinite Exploration：体验承诺 vs 数据完整性承诺 [D4] | **MEDIUM** |
| Q6 | Four-Element co-equal：每页必备 vs 整体不偏爱 [D7] | **MEDIUM** |
| Q7 | Content Hero：量化标准 vs 感官判断 [D5] | **MEDIUM** |

---

> **状态**：提交 Product Owner。所有原则声明均已溯源至文档行号。Interpretation 和 Proposal 已明确标注。零代码改动。等待 PO 决策。
