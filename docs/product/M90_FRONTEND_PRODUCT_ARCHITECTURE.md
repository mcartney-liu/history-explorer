# M90 — Frontend Product Architecture
### History Explorer Frontend Experience Architecture / Governance Contract

> 状态：Architecture Contract（冻结候选）
> 模式：架构设计，**不改代码**
> 前置：M90.1 Frontend Reality Audit ✅ / M90.2 Frontend Experience Contract ✅
> 本文档取代 M90.2，成为前端体验架构的唯一真相源（Single Source of Truth）

---

## 0. 本文档的性质

这不是 UI 优化方案。不是页面修复清单。不是 M89 融合计划。

这是 **History Explorer 前端体验架构的定义**。

它回答一个问题：

> 当后端已经形成 Fact / Explanation / Understanding 三层能力时，
> 前端应该以什么结构，让用户通过**一个统一产品体验**访问全部能力，
> 并且在未来能力持续扩展时**不会再次碎裂**。

治理定位：本文档的 Forbidden / Deprecated 条目不是"不许做"，而是"已经决定过了，不用再讨论"。目的是降低重复决策成本，让后续工作集中在实现上。

---

# 1. Current Frontend Problems

## 1.1 一句话诊断

**后端已经是三层认知架构，前端仍然是功能页面集合。**

后端的抽象层级（Fact → Explanation → Understanding）在前端**没有任何对应结构**。前端的组织单位是 Page 和 Panel，这两个单位与用户的认知过程无关。

## 1.2 结构性事实（来自代码审计）

| 维度 | 现状 | 证据 |
|------|------|------|
| 路由逻辑分散处 | **3 处** | App.tsx 内联 hash early-return（3 个分支）+ `usePackageContext` hook（唯一订阅 hashchange）+ `current` NavNode 状态机 |
| 用户入口 | **7 个** | QuickStart / M89 Entry / 精选主题 / 探索包 / 实体卡 / 最近探索 / 主题网格 |
| 容器类型 | **4 种** | ExplorationShell / AppShell（疑似死代码）/ 裸独立页（CausalObjectDetailPage）/ 简易 Header 页（#/m89） |
| Shell 组件 | **4 个** | AppShell / ExplorationShell / CompanionShell / EntityPageShell，slot 模型互不兼容 |
| Panel 组件 | **26 个** | 无统一基组件；规模两极（RelationshipInsightPanel 35KB vs SummaryPanel 301B） |
| UI 原语 | **7 个** | Badge/Button/Card/EmptyState/GroundingBadge/Icon/Tabs；大量组件绕过它们直接写原生 HTML |
| App.tsx | **1424 行** | topic 分支单独约 150 行内联 JSX，聚合 20+ Panel |
| 页面组件归属 | **不统一** | 5 个页面级组件，3 个在 `components/`、2 个在 `pages/` |
| 断链路由 | **1 处** | `#/entity/:gid` 只被写入，从不被解析 |

## 1.3 五个根因

### 根因 1 — 没有 Frontend Experience Object

前端最大的单位是 Page。Page 是**技术单位**，不是体验单位。
用户不是在"访问页面"，用户是在"进行一次探索"。
因为没有 Experience Session 这个对象，所以每个页面都必须自己回答"我是谁、我从哪来"，结果是每个页面各自发明一套答案。

### 根因 2 — 有 Shell，但 Shell 不是唯一容器

ExplorationShell 存在，但 `#/m89` / `#/causal/` / `#/dev/catalog` 三条路由在它**之前** early-return。
只要存在"绕过 Shell 的通道"，就一定会被使用，碎裂就会持续发生。

### 根因 3 — 没有 Mode 概念，所以 Mode 被伪装成 Page

用户想"看时间线"，产品给了他一个 TimelinePanel；想"看理解过程"，产品给了他一个 `#/m89` 页面。
**同一个探索对象的不同观察角度，被实现成了不同的目的地。** 这是碎裂的直接来源。

### 根因 4 — 语义层已建成，但没有接到 UI

`frontend/src/next/` 是完成度很高的语义层：ExplorerRuntimeContext（10 字段）、ExplorationPolicy、UnderstandingProjection、MemoryProjection，测试密度远高于主代码库。
但它只接到了 App.tsx 的一行 `value={contextApi}`。
**结果：系统内部知道"用户正在理解什么"，但界面上不显示。** 这就是 M85 审计"能力存在，体验不可达"在 M90 的重演。

### 根因 5 — 没有增量治理规则，所以每个新能力都新增一个页面

M89 增加了理解能力 → 增加了一个页面。
未来 M86 Civilization Pattern 增加 → 会再增加一个页面。
**如果不定义"新能力如何进入产品"，碎裂是架构的必然产物，不是执行的失误。**

## 1.4 关键判断

> 前端不需要重写。前端需要**一个架构**。
>
> 现有的 26 个 Panel、4 个 Shell、7 个入口不是要删掉，
> 而是要被**重新归位**到一个有结构的体系里。

---

# 2. New Experience Philosophy

## 2.1 用户心智模型（唯一）

用户不应感知：

- ❌ "我打开了一个 Entity 页面"
- ❌ "我打开了一个探索包"
- ❌ "我打开了一个 AI 页面"
- ❌ "我打开了一个 Understanding 页面"

用户应感知：

- ✅ "我正在探索一个历史问题"
- ✅ "系统正在帮助我逐步形成理解"

## 2.2 唯一用户主流程

```
Question       我想理解什么
    ↓
Exploration    我在看什么
    ↓
Evidence       我获得了什么事实
    ↓
Connection     它们之间有什么关系
    ↓
Understanding  我形成了什么理解
    ↓
New Question   我现在还想知道什么
```

**这是产品唯一的主流程。** 任何 UI 如果不能说明自己处在这条流程的哪个位置，它不应该存在。

## 2.3 最小体验单位

不是 Page、不是 Panel、不是 Card、不是 Entity。

是 **Understanding Transition（理解跃迁）**：

```
Before Belief  →  Evidence  →  After Belief
（我原以为）      （我看到）     （我现在明白）
```

产品的价值总量 = 用户完成的 Understanding Transition 数量 × 质量。
不是页面数、不是数据量、不是功能数。

## 2.4 三条不可妥协原则

| # | 原则 | 含义 |
|---|------|------|
| **FP-01** | 单一容器 | 所有能力运行在同一个 Explorer Shell 内，无例外 |
| **FP-02** | Mode 不是 Page | 不同能力是同一探索对象的不同观察角度，不是不同目的地 |
| **FP-03** | 跳转必须携带语义 | 每次导航携带 From / Why / Value，否则不允许发生 |

## 2.5 与后端三层的对应关系

前端不重新发明抽象层，前端**映射**后端已有的三层：

```
后端                          前端 Mode                用户问题
─────────────────────────────────────────────────────────────
Fact Layer          →   Exploration Mode      →   这是什么？
Explanation Layer   →   Explanation Mode      →   为什么发生？
Understanding Layer →   Relationship Mode     →   为什么值得一起理解？
Experience Runtime  →   Understanding Mode    →   我形成了什么理解？
（M86+ 未来）        →   Civilization Mode     →   有什么文明模式？
```

这个映射是本架构的核心：**前端结构 = 后端认知层级的用户侧投影。**

---

# 3. Experience Object Model

## 3.1 禁止

| 禁止项 | 理由 |
|--------|------|
| ❌ Page 作为产品单位 | Page 是技术单位，与认知过程无关 |
| ❌ Component 驱动体验 | 组件应服务体验对象，不是反过来 |
| ❌ Entity Detail 作为核心入口 | Entity 是事实，不是问题。用户从问题进入，不从对象进入 |

## 3.2 唯一体验对象：Experience Session

```
ExperienceSession
├── question              用户正在理解的问题
├── context               当前上下文（主题 / 时代 / 地域 / 探索包）
├── evidence[]            已获得的证据序列
├── understandingState    当前理解状态
├── explorationPath       走过的认知轨迹（含 From/Why/Value）
└── availablePerspectives 当前可用的观察角度（Mode 集合）
```

### 3.2.1 字段语义定义

| 字段 | 定义 | 数据来源 | 禁止 |
|------|------|----------|------|
| `question` | 用户当前想理解的问题（人话，非技术标识） | Curator 预写 | ❌ AI 生成 ❌ 从 entity name 拼接 |
| `context` | 当前探索的语义范围 | Curator / Knowledge Layer | ❌ 存放路由状态 |
| `evidence[]` | 有序证据序列，每条含 before/after 认知变化 | Knowledge + Causal Layer | ❌ 存放完整实体属性副本 |
| `understandingState` | 用户认知阶段与已形成的理解 | Experience Runtime（Understanding Layer 判定） | ❌ 由 Navigation 写入 |
| `explorationPath` | Anchor 链 + Relation 链 | Navigation Layer 记录 | ❌ 存放点击数/停留时长 |
| `availablePerspectives` | 当前对象支持哪些 Mode | 由数据可用性推导 | ❌ 硬编码 |

### 3.2.2 与已有 ExplorerRuntimeContext 的关系

`frontend/src/next/ExplorerRuntimeContext.tsx` 已实现的 10 字段模型，是 ExperienceSession 的**运行时内核**：

```
ExperienceSession（体验对象 / UI 侧）
    └── 由 ExplorerRuntimeContext（语义内核 / 已存在）驱动
        ├── explorationId       →  session 标识
        ├── userQuestion        →  question
        ├── understandingGoal   →  question 的目标侧
        ├── currentAnchor       →  当前 evidence 焦点
        ├── previousAnchor      →  Navigation From
        ├── activeRelation      →  Navigation Why
        ├── anchorChain         →  explorationPath
        ├── relationChain       →  explorationPath
        ├── cognitiveStage      →  understandingState
        └── unresolvedGap       →  New Question 来源
```

**不新建状态模型。** M90 的工作是让这个已存在的内核**在界面上可见**，而不是再造一个。

这条边界很重要：ExplorerRuntimeContext 是唯一语义真相源（EP-006/008 已冻结），ExperienceSession 只是它的 UI 侧读取视图，**不允许持有独立副本、不允许自己推断状态**。

## 3.3 所有 UI 必须服务 ExperienceSession

规则：任何 UI 组件必须能回答——

> 我读取 ExperienceSession 的哪个字段？我如何推进它？

读不到、推不动的组件 = 装饰品 = 应废弃。

---

# 4. Explorer Shell Architecture

## 4.1 唯一容器原则（FP-01）

**存在且仅存在一个 Explorer Shell。** 所有能力运行于其中。

必须运行在 Shell 内的能力（无例外）：

```
Landing / Discover
Exploration Package
Entity
CausalObject
Semantic Relationship
Timeline
Map
Understanding Workspace
AI Companion
Dev Catalog（dev-only，但仍在 Shell 内）
```

## 4.2 Shell 结构

```
┌──────────────────────────────────────────────────────────┐
│ ▸ GLOBAL BAR                                             │
│   History Explorer · 当前探索主题 · 语言 · 全局检索        │
│   回答：我在哪个系统里？                                   │
├──────────────────────────────────────────────────────────┤
│ ▸ QUESTION HEADER                            [常驻]       │
│   "法国大革命为什么会发生？"                                │
│   目标：理解一次革命如何从财政问题演变为政治崩溃            │
│   回答：我为什么开始这次探索？                              │
├──────────────────────────────────────────────────────────┤
│ ▸ MODE BAR                                   [常驻]       │
│   [ 探索 ] [ 解释 ] [ 关系 ] [ 理解 ]   ← 不可用 Mode 置灰  │
│   回答：我现在从哪个角度在看？                              │
├──────────────┬───────────────────────────────────────────┤
│              │                                           │
│  CONTEXT     │        UNDERSTANDING CANVAS               │
│  RAIL        │                                           │
│              │        当前 Mode 的主内容区                 │
│  探索轨迹     │        （唯一变化的区域）                    │
│  已获证据     │                                           │
│  理解状态     │        max-width: 720px                   │
│              │                                           │
│  [可折叠]     │                                           │
├──────────────┴───────────────────────────────────────────┤
│ ▸ NAVIGATION CONTRACT BAR                    [常驻]       │
│   From:  你刚理解了「三级会议的僵局」                       │
│   Why:   因为它直接导致了第三等级的自立                     │
│   Value: 理解这一步，你会明白革命如何从程序走向断裂          │
│   → [ 继续探索 ]                                          │
├──────────────────────────────────────────────────────────┤
│ ▸ COMPANION DOCK                             [常驻可见]   │
│   AI 历史学家 · 基于当前理解状态解释                        │
└──────────────────────────────────────────────────────────┘
```

## 4.3 Shell 区域契约

| 区域 | 职责 | 读取 Session 字段 | 常驻 | 可折叠 |
|------|------|------------------|------|--------|
| Global Bar | 系统身份 + 全局检索 | context | ✅ | ❌ |
| Question Header | 探索问题 + 理解目标 | question | ✅ | ❌ |
| Mode Bar | 观察角度切换 | availablePerspectives | ✅ | ❌ |
| Context Rail | 轨迹 / 证据 / 理解状态 | explorationPath, evidence[], understandingState | ✅ | ✅ |
| Understanding Canvas | 当前 Mode 主内容 | 视 Mode 而定 | ✅ | ❌ |
| Navigation Contract Bar | From / Why / Value | explorationPath, activeRelation | ✅ | ❌ |
| Companion Dock | AI 解释层 | 全 Session（只读） | ✅ | ✅ |

### 关键修正（相对现状）

| 现状 | 问题 | 修正 |
|------|------|------|
| WorkspacePanel 默认收起 | 用户不知道探索过程被保存（EC-007 失败） | Context Rail **默认展开** |
| Companion 默认收起 | 用户不知道有 AI（EC-005 失败） | Companion Dock **默认可见** |
| 无 Navigation 语义 | 用户不知道为什么从 A 到 B（EC-003 失败） | Navigation Contract Bar **常驻且不可关闭** |
| Mode 概念不存在 | 用户不知道现在在什么模式 | Mode Bar **常驻** |

## 4.4 Shell 唯一性的强制手段

```
禁止（Forbidden）：
  ❌ 在 Shell 之前 early-return 任何路由
  ❌ 任何组件渲染自己的 <header> / 顶部导航
  ❌ 任何组件定义自己的页面级背景色 / 页面级 CSS 文件
  ❌ 任何 lazy 页面绕过 Shell 直接挂载
```

**架构强制**：路由解析必须集中在单一 Router 模块，Router 的输出是「Mode + Session 参数」，不是「渲染哪个页面」。这在结构上使 early-return 不可能发生。

## 4.5 路由模型

现状三处分散的路由逻辑，收敛为单一语义路由：

```
#/                                   → Shell + Discover（无 Session）
#/explore/:topicSlug                 → Shell + Session + 默认 Mode
#/explore/:topicSlug/:mode           → Shell + Session + 指定 Mode
#/explore/:topicSlug/:mode/:focusId  → Shell + Session + Mode + 焦点对象
```

**URL 表达的是「用户在理解什么、从什么角度」，不是「打开了哪个页面」。**

废弃路由（见第 9 章迁移表）：
- `#/m89`（里程碑编号不应成为产品概念）
- `#/causal/:id`（独立页面）
- `#/package/:slug`（并入 `#/explore/:topicSlug`）
- `#/entity/:gid`（当前为断链，直接删除写入点）

---

# 5. Mode Architecture

## 5.1 核心定义

> **History Explorer 不是页面系统。**
> **是一个 Explorer + 多种理解模式。**

Mode 是同一个 ExperienceSession 的**不同观察角度**。
切换 Mode 时：Session 不变、Question 不变、Path 不变、Shell 不变。**只有 Canvas 变。**

## 5.2 五个 Mode

### Mode 1 — Exploration Mode（探索模式）

| 项 | 内容 |
|----|------|
| **回答** | 这个历史对象是什么？ |
| **对应后端层** | Fact Layer |
| **能力** | Entity / Fact / Timeline / Map / 属性 / 来源 |
| **Canvas 主内容** | 对象概览 + 事实卡片 + 时间定位 + 空间定位 |
| **Session 推进** | 产生 evidence（事实型） |
| **可用条件** | 始终可用（默认 Mode） |

---

### Mode 2 — Explanation Mode（解释模式）

| 项 | 内容 |
|----|------|
| **回答** | 为什么会发生？ |
| **对应后端层** | Explanation Layer |
| **能力** | CausalObject / Mechanism / Consequence / Evidence 溯源 |
| **Canvas 主内容** | 因果链 + 机制说明 + 后果 + 置信度与来源 |
| **Session 推进** | 产生 evidence（解释型），cognitiveStage → EXPLANATION |
| **可用条件** | 当前对象存在 CausalObject 数据 |

---

### Mode 3 — Relationship Mode（关系模式）

| 项 | 内容 |
|----|------|
| **回答** | 为什么这些东西值得一起理解？ |
| **对应后端层** | Understanding Layer |
| **能力** | Semantic Relationship / 理解种子 |
| **Canvas 主内容** | 语义关系网 + 每条关系的「为什么值得一起看」说明 |
| **Session 推进** | 产生 connection，cognitiveStage → CONNECTION |
| **可用条件** | 当前对象存在 Semantic Relationship 数据 |
| **强制约束** | 每条关系必须显示 Curator 撰写的语义说明。**无语义说明的关系不渲染。** |

---

### Mode 4 — Understanding Mode（理解模式）

| 项 | 内容 |
|----|------|
| **回答** | 我现在形成了什么理解？ |
| **对应后端层** | Experience Runtime（UnderstandingProjection） |
| **能力** | Evidence / Understanding Transition / Understanding Path / Closure |
| **Canvas 主内容** | Before→After 理解跃迁序列 + 理解链 + 未解缺口 |
| **Session 推进** | cognitiveStage → UNDERSTANDING → NEW_QUESTION |
| **可用条件** | 当前 Session 已积累 ≥1 条 evidence |
| **说明** | 这是现 `#/m89` 的能力，迁入 Shell 后成为**每个探索都具备的模式**，不再是法国大革命专属页面 |

---

### Mode 5 — Civilization Pattern Mode（文明模式 / 未来）

| 项 | 内容 |
|----|------|
| **回答** | 多个历史现象之间有什么文明模式？ |
| **对应后端层** | M86+（未建） |
| **能力** | 跨主题模式识别 / 文明比较 |
| **状态** | **架构预留，M90 不实现** |
| **可用条件** | 用户已完成 ≥2 个不同主题的 Understanding Loop |
| **预留意义** | 证明本架构可扩展——新增该 Mode 不需要新页面、不需要新 Shell、不需要改 Session 模型 |

## 5.3 Mode 规则（冻结）

| # | 规则 |
|---|------|
| MR-01 | Mode 不是页面。Mode 切换不改变 URL 的 Session 部分 |
| MR-02 | 所有 Mode 共享同一 Shell / Session / Navigation / Design Language |
| MR-03 | Mode 可用性由**数据可用性**决定，不由硬编码决定 |
| MR-04 | 不可用 Mode **置灰显示且说明原因**，不隐藏（隐藏 = 用户永远不知道产品有这个能力） |
| MR-05 | Mode 切换必须保留 Session 状态，不重置探索轨迹 |
| MR-06 | 新增能力优先归入现有 Mode。新增 Mode 需通过第 10 章五问审查 |

## 5.4 Mode 与认知阶段的关系

Mode 不是线性关卡。用户可以在任意 Mode 之间往返：

```
        ┌──────────────────────────────────────┐
        ↓                                      │
  Exploration ──→ Explanation ──→ Relationship ┤
        │              │                │      │
        └──────────────┴────────────────┘      │
                       ↓                       │
                 Understanding ────────────────┘
                       ↓
                  New Question ──→ 新 Session
```

**系统建议下一个 Mode，但不强制。** 建议来源于 unresolvedGap（理解缺口），不是算法推荐（EP-003）。

---

# 6. Navigation Contract

## 6.1 契约定义

**任何跳转都必须携带三元组，否则不允许发生。**

```
From:   你刚才理解了什么
Why:    为什么现在看到这个
Value:  它会增加你什么理解
```

## 6.2 三元组的数据来源（不可 AI 生成）

| 字段 | 来源 | 依据 |
|------|------|------|
| From | `previousAnchor.displayName` + 该 Anchor 已产生的理解 | Session 内部 |
| Why | `activeRelation.descriptionRef` → Causal / Understanding Layer 查询 | EP-009 语义溯源 |
| Value | Curator 撰写的 understandingGoal 片段 | Curator 预写 |

**Why 字段没有 Relation 数据时，该跳转不应被渲染为可点击链接。**
这是硬约束——它直接决定了产品与 Wikipedia 的区别（Understanding Graph vs Information Graph）。

## 6.3 Breadcrumb 语义化

```
现在（无语义，纯节点序列）：
  罗马 > 凯撒 > 高卢战争

未来（有语义，认知轨迹）：
  罗马共和国为什么会崩溃？
    └→ 凯撒的军事改革（因为它改变了军队的忠诚对象）
       └→ 高卢战争（因为它给了凯撒独立的军事资本）
```

Breadcrumb 不是"我去过哪里"，是"我的理解怎么走到这一步"。

## 6.4 禁止

```
❌ 无 Why 的链接跳转
❌ "相关内容""你可能感兴趣"（算法推荐语言）
❌ 跳转后不说明为什么跳转
❌ 面包屑只显示名称序列
❌ 跳转丢失 Session（跳转必须在同一 Session 内，除非用户主动开启新探索）
```

## 6.5 New Question ≠ Recommendation

```
Understanding Completed
    ↓
Identify Missing Dimension（理解缺口）
    ↓
Generate Next Question（由缺口推导，非算法偏好）
    ↓
用户主动选择是否继续（不自动跳转）
```

---

# 7. Design System

## 7.1 唯一来源

**`docs/design-system/History-Explorer-Design-System-V1.md` 是唯一视觉真相源。**

任何组件不使用其中的 token = 违规。

## 7.2 Layout System

| 项 | 规则 |
|----|------|
| 基础网格 | 4px |
| 操作网格 | 8px |
| Understanding Canvas 最大宽度 | 720px（阅读理解的最优行长） |
| Context Rail 宽度 | 280px（可折叠至 56px） |
| Companion Dock 宽度 | 360px（可折叠至 56px） |
| 信息密度 | 单视口 ≤ 3 个主要信息块 |
| 断点 | 1440 / 1024 / 768 / 375 |

## 7.3 Typography System

| 用途 | 字体 | 语义 |
|------|------|------|
| 问题（Question） | Serif H2 | "法国大革命为什么发生？" |
| 理解（Understanding） | Serif Body LG | 因果说明、理解跃迁 |
| 证据（Evidence） | Sans Body | 事实描述 |
| 来源（Provenance） | Sans Caption | 引用标注 |
| 元数据 | Sans Caption | 时间、类型、置信度 |

**规则**：Serif = 需要思考的内容（问题与理解）；Sans = 需要查阅的内容（事实与元数据）。
这不是审美选择，是**认知分层的视觉编码**。

## 7.4 Color System

| 语义层 | Token | 值 | 用途 |
|--------|-------|-----|------|
| 背景 | `--bg-base` | #16130E | Shell 底色 |
| 事实层 | `--verified` | #4FA784 | Fact / 已验证证据 |
| 解释层 | `--gold-500` | #CBA135 | Explanation / 因果 / 主强调 |
| 理解层 | `--text-high` | #F2EBDD | Understanding / 主文本 |
| 关系层 | （Design System V1 指定） | — | Semantic Relationship |

**颜色承载语义层级，不承载装饰。** 禁止为了"好看"引入非 token 颜色。

## 7.5 Spacing System

```
4  — 内联元素间距
8  — 组件内部间距
16 — 组件之间
24 — 信息块之间
48 — Shell 区域之间
```

## 7.6 Motion System

| 场景 | 时长 | 缓动 | 目的 |
|------|------|------|------|
| Mode 切换 | 200ms | ease-out | 表达"角度变了，不是页面变了" |
| Evidence 进入 | 300ms | ease-out | 表达"新证据到达" |
| 理解跃迁 | 400ms | ease-in-out | 表达"认知发生变化" |
| Rail 折叠 | 150ms | ease | 无语义，纯反馈 |

**规则**：Motion 表达认知变化，不表达页面切换。
Mode 切换**禁止使用页面转场动画**（滑动、翻页）——那会强化"我到了另一个页面"的错误心智。

## 7.7 统一组件清单（Explorer Primitives）

```
容器层
  ExplorerShell        唯一容器
  UnderstandingCanvas  主内容区

语义层
  QuestionHeader       探索问题 + 理解目标
  ContextBar           Mode Bar + 当前上下文
  EvidenceBlock        证据展示（替代 26 个 Panel 的通用形态）
  UnderstandingCard    理解跃迁 Before→After
  RelationshipView     语义关系（必带 Curator 说明）
  TimelineView         时间视图
  MapView              空间视图
  EntityReference      实体引用（内联，非跳转目的地）
  NavigationAction     From/Why/Value 跳转卡

基础层（复用现有 components/ui/）
  Badge / Button / Card / EmptyState / GroundingBadge / Icon / Tabs
  + 需补充：Skeleton / Tooltip / Input
```

## 7.8 组件禁止清单

```
❌ 新增 Panel        —— 用 EvidenceBlock
❌ 新增 Card 变体     —— 用 UnderstandingCard / ui/Card
❌ 新增 Page         —— 用 Mode
❌ 新增 Shell        —— 只有一个
❌ 新增 Guide 组件    —— 合并为一个
❌ 页面级 CSS 文件    —— 用 Design System token
❌ 绕过 ui/ 原语写原生 HTML
```

---

# 8. Component Governance

## 8.1 组件准入四问

任何新组件必须回答：

```
1. 它读取 ExperienceSession 的哪个字段？
2. 它运行在哪个 Mode 的 Canvas 中？
3. 它服务用户理解流程的哪一步？
   （Question / Exploration / Evidence / Connection / Understanding / New Question）
4. 它如何推进 Session 状态？
```

**任何一问答不出 = 不允许创建。**

## 8.2 组件分层（严格）

```
Layer 4  Mode Views          — 每个 Mode 的 Canvas 实现（5 个）
Layer 3  Explorer Primitives — 语义组件（10 个，第 7.7 节）
Layer 2  UI Primitives       — 无语义基础件（components/ui/）
Layer 1  Design Tokens       — CSS 变量
```

**依赖只能向下。** Layer 2 不允许知道 ExperienceSession 存在。Layer 3 不允许知道当前是哪个 Mode。

## 8.3 违规检测信号

出现以下任一情况，说明架构正在退化：

| 信号 | 含义 |
|------|------|
| 出现新的 `*Panel.tsx` | Primitive 层不够用，或有人绕过治理 |
| 出现新的页面级 `.css` | Design System 不够用，或有人绕过治理 |
| 出现 Shell 之外的 `<header>` | 单一容器被破坏 |
| 组件内直接读 `window.location.hash` | 路由未集中 |
| 跳转链接没有 Why | Navigation Contract 被破坏 |
| Mode 切换重置了探索轨迹 | Session 模型被误解为页面状态 |
| 某能力只在一个主题可用 | 为当前案例写死（违反第 10 章） |

## 8.4 治理的目的

> 这些禁止不是为了限制开发，是为了**降低重复决策成本**。
>
> 定义清楚"新能力如何进入产品"之后，
> 团队不需要每次都重新争论边界，可以把精力集中在实现上。

---

# 9. Existing Feature Migration Plan

## 9.1 逐项归属

| 现有实现 | 路径 | 归属 Mode | 处置 | 如何进入 Shell |
|----------|------|-----------|------|----------------|
| **LandingPage** | `components/LandingPage.tsx` (113行) | 无 Mode（Session 前） | **合并** | 与 DiscoverPage 合并为 Shell 的 Discover 状态（无 Session 时的 Canvas） |
| **DiscoverPage** | `pages/DiscoverPage.tsx` (446行) | 无 Mode（Session 前） | **合并** | 同上。硬编码 `ENTITY_TYPE_CARDS` 需数据化 |
| **ExplorationShell** | `components/shell/ExplorationShell.tsx` | — | **升级为唯一 Shell** | 作为新 ExplorerShell 的基础；Rail/Companion 改为默认展开 |
| **AppShell** | `components/AppShell.tsx` (55行) | — | **废弃** | 疑似死代码，确认无引用后删除 |
| **CompanionShell** | `components/ai/CompanionShell.tsx` | — | **降级为 Companion Dock** | 不再是 Shell，成为 Shell 的一个区域 |
| **EntityPageShell** | `components/EntityPageShell.tsx` | — | **废弃 Shell 语义** | tab 逻辑迁入 Exploration Mode 的 Canvas 内部分区 |
| **ExplorationPackagePage** | `pages/ExplorationPackagePage.tsx` (175行) | Exploration Mode | **迁移** | 成为 Session 的入口态；`china-civilization-v1` 硬编码分支必须数据化 |
| **EntityPage** | `components/EntityPage.tsx` (351行) | Exploration Mode | **重构** | 拆为 EvidenceBlock 组合，不再是 Page |
| **CausalObjectDetailPage** | `components/causal/CausalObjectDetailPage.tsx` (200行) | Explanation Mode | **迁移** | 成为 Explanation Mode 的 Canvas 内容，不再是独立页 |
| **M89 UnderstandingWorkspace** | `pages/m89/UnderstandingWorkspace.tsx` | Understanding Mode | **迁移** | 成为 Understanding Mode 的 Canvas；能力泛化到所有主题 |
| **m89.css** | `pages/m89/m89.css` | — | **废弃** | 样式迁入 Design System token |
| **26 个 Panel** | `components/**/*Panel.tsx` | 分散到 4 个 Mode | **归位** | 见 9.2 |
| **3 个 Guide** | `EntityExplorationGuide` / `ExplorationFlowGuide` / `FirstExplorationGuide` | 跨 Mode | **合并为 1 个** | 成为 Shell 级引导层 |
| **next/ 语义层** | `frontend/src/next/**` | 全部 Mode | **保留并接通 UI** | 这是资产不是负债；M90 的核心工作之一是让它可见 |
| **DevCatalog** | `pages/DevCatalog.tsx` | dev-only | **保留但入 Shell** | dev 环境下作为特殊 Mode |

## 9.2 Panel 归位表

| Mode | 归入的现有 Panel |
|------|------------------|
| **Exploration** | SummaryPanel / TimelinePanel / GraphViewPanel / ThemesPanel / EntityPickerPanel / MultiEntityContextPanel / ProvenancePanel / TemporalComparisonPanel |
| **Explanation** | AIExplanationPanel / InterpretationPanel / EventImpactPanel / WhyImportantPanel / ConnectionsExplainedPanel |
| **Relationship** | RelationshipInsightPanel / ConnectionsPanel / CrossTopicConnectionsPanel / TopicComparisonPanel |
| **Understanding** | JourneyPanel / WorkspacePanel / ExplorationInsightPanel / ExplorationPathsPanel |
| **Companion Dock** | ResearchPanel / ResearchDiscoveryPanel / RecommendationPanel / ContinueExploringPanel |
| **待评估** | GuidePanel（合并入统一 Guide） |

**归位 ≠ 保留原实现。** 归位后每个 Panel 需按 8.1 四问审查；答不出的直接删除。
特别关注：`SummaryPanel`(301B) / `ConnectionsPanel`(955B) / `WhyImportantPanel`(1008B) 近乎空壳，优先评估删除。

## 9.3 废弃清单（Deprecated）

| 废弃项 | 理由 |
|--------|------|
| `#/m89` 路由 | 里程碑编号不是产品概念 |
| `#/causal/:id` 独立路由 | 改为 Explanation Mode |
| `#/entity/:gid` 写入点 | 当前为断链，无对应解析 |
| `#/package/:slug` 独立路由 | 并入 `#/explore/:topicSlug` |
| App.tsx 内 3 处 hash early-return | 破坏单一容器 |
| AppShell | 死代码 |
| `pages/m89/m89.css` | 页面级 CSS |
| 3 个 Guide 组件中的 2 个 | 重复实现 |
| `china-civilization-v1` 硬编码分支 | 为当前案例写死 |
| `ENTITY_TYPE_CARDS` 硬编码数组 | 同上 |

## 9.4 迁移顺序（不含时间承诺）

```
Stage A  路由收敛
         3 处路由逻辑 → 单一 Router；消除 early-return
         产出：所有内容都在 Shell 内（哪怕样式还乱）

Stage B  Shell 定型
         ExplorationShell → ExplorerShell（6 区域）
         Rail / Companion 默认展开；Navigation Contract Bar 上线

Stage C  Mode 化
         Panel 按 9.2 归位；Canvas 按 Mode 分发
         M89 能力泛化为 Understanding Mode

Stage D  Primitive 化
         26 Panel → 10 Primitive；页面级 CSS → token

Stage E  语义接通
         next/ 语义层输出接入 UI（Navigation 三元组 / cognitiveStage / unresolvedGap 可见）
```

**Stage A 是唯一强制先行项。** 路由不收敛，后面所有工作都会被绕过。

---

# 10. Future Extension Rules

## 10.1 扩展性要求

新架构必须支持以下能力接入而**不需要新建页面**：

```
M86 Civilization Pattern
更多 Semantic Relationship 类型
AI Guide 增强
Knowledge Graph 扩展
Multi-language
更多探索主题
更多 Evidence 类型
```

## 10.2 禁止为当前案例写死

| 禁止 | 现存违例 |
|------|----------|
| ❌ 单主题硬编码数据 | `next/exploration/frenchRevolution/` / `CHINA_CAUSAL_STATEMENTS` |
| ❌ 硬编码卡片列表 | `ENTITY_TYPE_CARDS` |
| ❌ 硬编码 Mode 可用性 | Mode 可用性必须由数据推导 |
| ❌ 主题专属组件 | 组件接收数据，不认识主题 |

**规则**：任何组件不得知道"法国大革命"或"中国文明"的存在。
主题差异只体现在**数据**，不体现在**代码分支**。

## 10.3 新能力准入五问（验收标准）

任何未来新增能力，必须回答：

```
1. 它属于哪个 Experience Object？
   → 它读写 ExperienceSession 的哪些字段？

2. 它运行在哪个 Mode？
   → 归入现有 5 个 Mode 之一；若需新 Mode，必须证明现有 Mode 无法容纳

3. 它如何进入 Explorer Shell？
   → 它占据 Shell 的哪个区域？Canvas / Rail / Dock / Navigation？

4. 它如何帮助用户形成理解？
   → 它推进 Question→Evidence→Connection→Understanding→New Question 的哪一步？

5. 它是否破坏已有体验？
   → 是否新增入口？是否新增容器？是否新增视觉体系？是否绕过 Navigation Contract？
```

**五问全部通过，方可进入实现。任何一问答不出，能力设计需返工。**

## 10.4 示例：M86 Civilization Pattern 如何接入

用五问验证架构可扩展性：

```
1. Experience Object？
   → 读取多个已完成 Session 的 understandingState；
     新增字段 crossSessionPatterns（ExperienceSession 之上的聚合层）

2. 哪个 Mode？
   → Civilization Pattern Mode（第 5 节已预留）

3. 如何进入 Shell？
   → Mode Bar 新增第 5 个入口；
     可用条件：用户已完成 ≥2 个不同主题的 Understanding Loop；
     未满足时置灰并说明"完成两次理解后解锁"

4. 如何帮助理解？
   → 推进 New Question → 更高层 Question（从单主题理解走向文明模式理解）

5. 破坏已有体验？
   → 不新增入口（复用 Mode Bar）
   → 不新增容器（复用 Shell）
   → 不新增视觉体系（复用 Design System）
   → 遵守 Navigation Contract（跨主题跳转同样携带 From/Why/Value）
   ✅ 通过
```

**这个演练证明：新增一个完整的认知层能力，不需要新建任何页面。** 这是本架构成立的证据。

---

# 11. 架构成立判定

## 11.1 结构判定（可客观检查）

| 指标 | 目标 |
|------|------|
| Shell 数量 | 1 |
| 路由解析处 | 1 |
| Shell 之外的容器 | 0 |
| 页面级 CSS 文件 | 0 |
| `*Panel.tsx` 数量 | 0（全部转为 Primitive） |
| 无 Why 的跳转链接 | 0 |
| 主题硬编码分支 | 0 |

## 11.2 体验判定（Ultimate Test）

一个普通用户使用 15 分钟后，是否会说：

> "我原本只是想知道 X，
> 但现在我理解了为什么会这样，
> 而且我还想知道 Y。"

以及，他**不会**说：

> "这里有很多历史功能。"
> "我怎么到这里来了？"
> "这个页面是干什么的？"

## 11.3 最终目标

> 让用户感觉：**"这是一个完整的文明探索系统"**
>
> 而不是：~~"这里有很多历史功能"~~

---

## 附：文档关系

```
M90.1  Frontend Reality Audit          — 诊断（只读，保留）
M90.2  Frontend Experience Contract    — 初版契约（被本文档取代）
M90    Frontend Product Architecture   — 架构契约（本文档，Single Source of Truth）
M90.3  Frontend Implementation Rules   — 实现规则（未开始）
```

本文档不含实现方案、不含代码、不含时间承诺。
进入实现前需先冻结本文档。
