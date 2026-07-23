# M9-003 Exploration Journey — Design Specification

> 文档状态：DESIGN（设计规范）。范围：**frontend-only**。
> 依赖基线：v0.12.0（M9-002 RecommendationPanel，已发布）+ v0.11.0（M9-001.2 Deterministic Next-Node Recommendation Engine，已发布）。
> 上游授权：M9-000 Planning Baseline（PO 批准）+ M9-001 §15 / M9-002 §13 预留的 "Exploration Journey" 方向（PO 授权）。
> 本文件为 M9-003 设计规范入口。所有代码路径仅用于描述现状与设计边界，本文禁止修改任何代码。
> **Provenance 说明（诚实标注）：** 本文档为 **Documentation Recovery（M9-DOC-001）** 阶段依据已发布的 v0.13.0 实现（`merge 30a907e` / `tag v0.13.0` / feature `08e9431`）**反向整理（reconstructed）** 的设计规范，用于把"已发布但未文档化"的能力钉死为可审计的设计事实。其内容与真实代码逐字对齐，不杜撰、不向前预测。
> 本设计完全落在 `docs/10_ARCHITECTURE/CURRENT_ARCHITECTURE_BASELINE.md` 冻结边界内。

---

## 1. Executive Summary

M9-001（v0.11.0）在后端交付了确定性、可解释的"下一站"推荐 API；M9-002（v0.12.0）在前端用 `RecommendationPanel` 把它呈现出来。但到此为止，产品的探索流仍然**只向前、不回头**——用户跟随推荐跳转之后，看不到"我是怎么走到这里的""为什么当时推荐了那一步"。

M9-003 的唯一目标：在**纯前端、零冻结触碰**的前提下，新增一个 `ExplorationJourney.tsx` 组件，把 App 既有的导航历史（`history` / `cursor`）渲染成一条带"**为什么**"注解的探索路径（Exploration Journey）；并在用户**跟随推荐**点击时，捕获该推荐的 `reasons` / `relation_path` / `score`，作为路径上每一站的"为何抵达"注解。

**本里程碑不是新算法、不引入导航状态机、不修改 `navigation.ts`。** 它做的三件事：
1. 新增纯消费者组件 `ExplorationJourney`，只读渲染 App 导航历史（不拥有任何导航状态）。
2. 在 App 新增一个 **session 级注解 Map** `journeyReasons`（gid → 为何抵达），仅当用户从推荐卡片点击时填充；它**永远不进入 `navigation.ts` / `pushHistory`**，只是渲染层的富化数据。
3. 扩展 `RecommendationPanel` 的 `onNodeClick` 为 2 参数（向后兼容），把推荐上下文透传给 App 以填充上述注解。

关键设计决策一览：

| 决策项 | 结论 |
|---|---|
| 组件定位 | 纯消费者（consumer）——只读 App 导航历史，不持有 history/cursor/goTo |
| 挂载位置 | entity 分支内 sibling：置于 `ExplorationTrail` 之后、`RecommendationPanel` 之前 |
| "为什么"数据 | `journeyReasons: Map<gid, JourneyWhyPayload>`，session-scoped，App 状态；**非导航栈** |
| 捕获时机 | 仅当用户通过推荐卡片（带 `ctx`）点击时；直接导航不注解 |
| 渲染空态 | `history.length < 2` → 返回 `null`（与 `ExplorationTrail` 单节点不渲染约定一致） |
| 交互 | 节点点击 → `onStepClick(index)` → App `goTo`；组件自身绝不导航 |
| 硬约束 | 组件**绝不**创建第二个导航树 / 不调用 `pushHistory` / 不修改 `navigation.ts` |

---

## 2. User Problem

**现状用户体验（v0.12.0 之后）：** 用户在实体页看到 `RecommendationPanel` 给出"下一站 + 为什么"（推荐理由），点击后跳过去。但：
- 跳转之后，那句"为什么"**消失了**——新页面不再显示"你是因为 Augustus 影响了 Octavian 才来的"。
- 用户无法回看整条探索路径上的"每一跳为何发生"，只能靠记忆或 `ExplorationTrail` 的纯足迹（不带理由）。
- 推荐的"可解释性"价值在跳转瞬间断裂，没有贯穿整段探索旅程。

**缺口：**
- 探索路径**有足迹、无注解**（`ExplorationTrail` 只给节点序列，不给"为何"）。
- 推荐的 `reasons` / `relation_path` 是**一次性**的——点了就丢，没有沉淀到旅程视图。

**M9-003 要解决的问题：** 把每一次"跟随推荐"的上下文沉淀为路径上的"为何抵达"注解，形成一条**可解释、可回溯**的探索旅程（Exploration Journey），让产品 DNA 定义的 "Infinite Exploration" 在"往前推"之外，也具备"向后理解"的闭环。

---

## 3. Current UX Analysis

### 3.1 entity 分支的渲染结构（真实代码 `frontend/src/App.tsx` entity 分支）

依据 v0.13.0 真实渲染顺序（feature `08e9431`）：

```tsx
<EntityPage ... />              // 当前实体自身事实
<ExplorationTrail ... />        // 既有足迹（history 派生，无理由注解）
<ExplorationJourney ... />      // ← M9-003 新增：带"为何抵达"注解的路径视图
<RecommendationPanel ... />     // M9-002：下一步推荐（带 reasons）
<ContinueExploringPanel ... />  // 中性引擎原序兜底
```

`ExplorationJourney` 是插在 `ExplorationTrail` 与 `RecommendationPanel` 之间的新 sibling。

### 3.2 既有组件的导航所有权（红线依据）

| 组件 | 是否拥有导航状态 | M9-003 的关系 |
|---|---|---|
| `navigation.ts` / `App.goTo` | **唯一**导航真相源（history / cursor / pushHistory） | M9-003 **只读**它的输出（history / cursor），绝不写 |
| `ExplorationTrail` | 纯消费者（渲染 history） | M9-003 同属纯消费者，平行 sibling |
| `RecommendationPanel` | 纯消费者（消费 API，点击上提 `onNodeClick`） | M9-003 复用其 `onNodeClick` 2 参上下文 |

### 3.3 结论 — 采用"纯消费者 + 注解 Map"模式

不引入任何导航状态机，不修改 `navigation.ts`。M9-003 的所有"新能力"都落在**渲染层 + 一个 session 级注解 Map** 上，符合 M9 系列"确定性增强、零冻结触碰"的一贯策略。

---

## 4. Proposed Solution

新增单一前端组件 `frontend/src/components/ExplorationJourney.tsx`，结构为三层（与 `RecommendationPanel` 同构）：

1. **`buildJourney(history, cursor, journeyReasons)`** — 纯函数，把 App 导航历史 + 注解 Map 派生为 `JourneyEntry[]`。无副作用、不修改输入。
2. **`ExplorationJourneyView`** — 纯展示组件（`renderToStaticMarkup` 可测），渲染 `<ol>` 路径，节点带 "Return to <label>" / "Current: <label>" aria 契约。
3. **`ExplorationJourney`** — 容器，只做"读 App 传入的 history/cursor/journeyReasons → 调 `buildJourney` → 交给 View"，**无任何本地导航状态**。

同时：
- App 新增 `journeyReasons` state（`Map<gid, JourneyWhyPayload>`），session-scoped，`goHome` 时重置。
- `RecommendationPanel.onNodeClick` 扩展为 `(gid, ctx?)`，App 在 `ctx` 存在时填充 `journeyReasons[gid]`。

**为什么是 additive 且零冻结风险：** 只新增 1 个组件文件 + 在 App entity 分支加 1 个 sibling 渲染 + App 加 1 个 state（注解 Map）+ `RecommendationPanel` 向后兼容扩展 + 少量 CSS。不碰后端、不碰 schema、不碰枚举、不碰冻结基线、不新增依赖、不碰 `navigation.ts`。

---

## 5. Component Architecture

### 5.1 类型（逐字对齐真实代码 `ExplorationJourney.tsx`）

```ts
// 为何抵达某节点的注解（富化层，非导航真相）
export type JourneyWhyPayload = {
  fromGlobalId: string
  fromName: string
  relationPath: RelationPathStep[]   // 复用 RecommendationPanel 的 RelationPathStep
  reasons: string[]
  score: number
  candidateSource: string
  capturedAt: string
}

export type JourneyEntry = {
  key: string
  type: 'topic' | 'entity'
  id: string
  label: string
  index: number
  isCurrent: boolean
  incomingWhy: JourneyWhyPayload | null   // 直接导航抵达的为 null
}
```

> `RelationPathStep` 来自 `RecommendationPanel.tsx`（M9-002），M9-003 复用其类型，不重复定义。

### 5.2 三层职责

| 层 | 文件内位置 | 职责 | 可测性 |
|---|---|---|---|
| `buildJourney` | 纯函数（L62） | history+cursor+reasons → JourneyEntry[]；1:1 映射、标记 current、注入 why | node env 纯单测 |
| `ExplorationJourneyView` | 纯展示（L92） | 渲染 `<ol>` 路径；`<2` 节点返回 `null` | `renderToStaticMarkup` |
| `ExplorationJourney` | 容器（L169） | 读 props → `buildJourney` → View；无本地 nav state | 结构性契约 |

### 5.3 与导航真相的边界（关键不变量）

- **ExplorationJourney does not own navigation state.** 它接收 `history` / `cursor` 作为只读 props，从不直接 / 间接调用 `pushHistory` / `goTo`。
- **`journeyReasons` is an annotation map, not a navigation stack.** 它**永远不进入 `navigation.ts`**；只在 App 渲染 Journey 时作为富化数据传入。刷新即丢（session-scoped）。
- **Existing `ExplorationTrail` remains unchanged.** 两者平行 sibling，各自独立；Journey 不修改 Trail 的任何行为或样式。

---

## 6. Data Flow

```
App.tsx (owns navigation truth: history / cursor / goTo)
  │  journeyReasons: Map<gid, JourneyWhyPayload>  (session state)
  ▼
<ExplorationJourney history={history} cursor={cursor} journeyReasons={journeyReasons} onStepClick={goTo}/>
  │  buildJourney(history, cursor, journeyReasons)  →  JourneyEntry[]
  ▼
ExplorationJourneyView  →  渲染 <ol> 路径（带 why 注解块）
  │  用户点击某节点
  ▼
onStepClick(index)  →  App.goTo(history[index])  →  现有唯一导航路径（闭环）

// 注解捕获（仅在推荐点击时）：
RecommendationPanel 卡片点击
  → onNodeClick(gid, ctx=buildRecommendationContext(rec))   // 2 参，向后兼容
  → App: if (ctx) setJourneyReasons(prev => prev.set(gid, {fromName, relationPath, reasons, score, ...}))
  → openEntity(gid)  →  navigateTo  →  fetchNode  →  GET /entity/{id}
```

数据流严格单向：App → Journey（只读渲染）；导航事件单向上提 App。`journeyReasons` 是 App 的渲染辅助状态，不参与导航决策。

---

## 7. Annotation Capture Contract

**触发条件（仅推荐点击）：** `RecommendationPanel` 卡片点击时，若 `onNodeClick` 收到第 2 参数 `ctx`（`RecommendationContext`），App 才填充 `journeyReasons[gid]`；直接导航（无 ctx）不注解。

**`RecommendationContext`（M9-002 `RecommendationPanel.tsx` 新增，v0.13.0）：**

```ts
export type RecommendationContext = {
  source: 'recommendation'
  reasons: string[]
  relation_path: RelationPathStep[]
  score: number
  candidateSource: string
}
// buildRecommendationContext(rec: RecommendationItem): RecommendationContext  — 纯函数
```

**App 填充逻辑（真实 `App.tsx`）：**

```ts
onNodeClick={(gid, ctx) => {
  if (ctx) {
    setJourneyReasons((prev) => {
      const next = new Map(prev)
      next.set(gid, {
        fromGlobalId: current.id,
        fromName: entityData?.name ?? current.id,
        relationPath: ctx.relation_path,
        reasons: ctx.reasons,
        score: ctx.score,
        candidateSource: ctx.candidateSource,
        capturedAt: new Date().toISOString(),
      })
      return next
    })
  }
  openEntity(gid, /* name */)
}}
```

**契约不变量：**
- `journeyReasons` 永不作为 `pushHistory` 输入；它是**渲染注解**，不是导航栈。
- `goHome` 重置 `journeyReasons = new Map()`（session 边界清晰）。
- `buildRecommendationContext` 是纯函数（同 rec → 同 ctx），可被单测验证 producer contract。

---

## 8. UI Interaction Design

每条旅程节点渲染为 `<button>`（`<ol><li>` 内）：

| 展示要素 | 数据来源 | 说明 |
|---|---|---|
| 类型徽标 | `entry.type` | `Topic` / `Entity` |
| 节点名 | `entry.label` | 可点击按钮；`aria-label` = `Return to <label>` 或 `Current: <label>` |
| 当前标记 | `entry.isCurrent` | `is-current` 样式 + `aria-current="step"` |
| 为何抵达 | `entry.incomingWhy` | 仅当推荐点击抵达时存在；渲染 `via <fromName>` + `reasons[]` + `relation_path[]` |
| 箭头 | 节点间 | `→` 分隔（纯展示） |

**交互：**
- 节点点击 → `onStepClick(index)` → App `goTo(history[index])` → 现有唯一导航闭环。
- `incomingWhy` 缺失（直接导航抵达）→ 不渲染 why 块，仅显示节点名（优雅降级）。
- 可访问性：节点为 `<button>`，带 `aria-label` / `aria-current`，与 `ExplorationTrail` 的 goTo 风格 aria 契约一致。

**视觉：** 新增 `he-journey` CSS 命名空间（复用 `--he-*` 设计令牌），与 `.he-trail` / `.he-recommend` 平行、不覆盖、不引入 UI 库。

---

## 9. Error & Empty State

| 状态 | 触发 | UI 表现 |
|---|---|---|
| **empty / no-journey** | `entries.length < 2` | 返回 `null`，不渲染面板外壳（与 `ExplorationTrail` 单节点不渲染约定一致） |
| **无注解节点** | `incomingWhy === null` | 仅渲染节点名，不渲染 why 块 |
| **点击** | 用户点节点 | 委托 `onStepClick(index)` → App `goTo`；组件自身不导航、不抛异常 |

**关键原则：** Journey 是**只读渲染层**，没有任何取数 / 网络 / loading 态。它从 App 已有状态派生，失败面为零；任何异常都不该发生（纯函数 + 纯展示）。

---

## 10. Scope Matrix

| In Scope（M9-003） | Out of Scope（明确排除） |
|---|---|
| 新增 `frontend/src/components/ExplorationJourney.tsx`（三层纯结构） | 任何 `backend/**` 改动 |
| App.tsx entity 分支新增 `ExplorationJourney` sibling（additive，位于 Trail 后 / RecPanel 前） | 修改推荐算法 / 评分公式 / 权重 |
| App 新增 `journeyReasons` state（注解 Map，session-scoped） | 修改 `navigation.ts` / `pushHistory` / 任何导航真相 |
| `RecommendationPanel.onNodeClick` 扩展为 2 参（向后兼容）+ `RecommendationContext` + `buildRecommendationContext` | 修改 `/entity/{id}/recommendations` API 契约 |
| 新增 `.he-journey*` CSS | 修改 `ENTITY_TYPES` / `RELATIONSHIP_TYPES` 枚举 |
| 组件单测（Vitest，13 例）+ 复用现有 `history` / `cursor` / `goTo` | 数据库 / Neo4j / PG / ES / ORM |
| 局部 empty / no-annotation 处理 | AI / LLM / RAG / embedding / GIS / Map |
| — | 新增运行时依赖 / 状态库 / 缓存系统 |
| — | 前端重排 / 重算 score / 篡改推荐结果 |
| — | 全局 history 状态机、跨组件导航缓存 |

---

## 11. Freeze Compliance

M9-003 满足 `CURRENT_ARCHITECTURE_BASELINE.md` 全部冻结约束：

- **Baseline unchanged**：不修改冻结基线文件；不引入 AI/LLM/DB/Neo4j/PG/ES/GIS/登录/权限。
- **Schema unchanged**：`ENTITY_TYPES=8` / `RELATIONSHIP_TYPES=18` 不动；Entity/Relation JSON 不动。
- **API contract unchanged**：只读消费 M9-001 已发布端点；`RecommendationPanel` 仅向后兼容扩展 `onNodeClick`，不改 API 响应。
- **Navigation unchanged**：`navigation.ts` / `pushHistory` / `goTo` 未被修改；Journey 是纯消费者。
- **Dependency unchanged**：纯 React + 现有 `react-dom/server`；无新增前端依赖。
- **"Recommendation" 红线说明**：M9-003 沿用 M9-001/M9-002 判定——本项是**确定性图排序的前端消费 + 渲染注解**，非 AI/ML 推荐 runtime；已由 M9-000 / M9-001 §15 / M9-002 §13 预留并 PO 授权。
- **freeze-check**：M9-003 为 frontend-only，运行 `scripts/freeze-check.mjs`（`FROZEN_SCOPE=frontend`）应通过；实质守卫（token/dep/enum）任意 scope 生效。

---

## 12. Testing Strategy

| 类别 | 测试点（对应 `ExplorationJourney.test.tsx`，13 例） |
|---|---|
| **buildJourney 纯函数** | 空 history → `[]`；逐 1:1 映射（不造第二棵导航树）；cursor 标记 current；仅 gid 在 reasons 时注入 why；纯函数不修改输入 |
| **ExplorationJourneyView** | 单节点 → 返回 `null`（空态）；多节点渲染路径 + current 标记 + 无 why；注入 why（reasons + relation_path + via fromName）；无注解节点优雅降级 |
| **容器** | 每 history 节点恰好一个 button（绝不造第二棵导航树）；`onStepClick(index)` 结构性契约（aria "Return to"/"Current:" 与 `goTo` 一致） |
| **Producer contract** | `buildRecommendationContext` 从推荐项提取 why 字段；`RecommendationPanelView` 1 参 `onNodeClick` 仍向后兼容（markup 不变） |
| **回归** | 现有 229 Vitest 全绿 → 总计 **242 passed**；`tsc --noEmit` 0 errors；`vite build` 0 errors；`freeze-check` 通过 |

所有测试基于 `renderToStaticMarkup`（node env，无 jsdom，无新依赖），不依赖真实后端，保证确定性与 CI 稳定。

---

## 13. Future Extension Boundary

- **M9-004（建议方向）**：把 `journeyReasons` 与 `seenGlobalIds` 统一为"探索上下文"层；或把 Journey 的 why 注解持久化（需 Gate，涉及用户存储红线）。
- **不预留、需 Gate 的方向**：AI/LLM 解释增强、GIS/Map 呈现、向量检索、图数据库——任一引入须先走 **ADR + Freeze Revision Gate + PO 批准**。M9-003 不为这些预留任何前端运行时依赖或接口。
- **明确不做**：前端个性化排序、用户偏好建模、客户端缓存/离线推荐——这些会把确定性推荐变成客户端重算，属红线，永不在本组件内实现。

---

## 14. Relationship to M9-001 / M9-002

- **M9-001.2（v0.11.0）**：后端确定性 Next-Node 推荐 API（`GET /entity/{id}/recommendations`）—— M9-003 的 why 注解数据来源。
- **M9-002（v0.12.0）**：前端 `RecommendationPanel` 呈现推荐 + reasons；M9-003 复用其 `RelationPathStep` 类型与 `onNodeClick` 扩展点，把推荐上下文沉淀为 Journey 注解。
- **M9-003（v0.13.0）**：把"跟随推荐"的上下文贯穿整段探索旅程，形成可解释、可回溯的 Exploration Journey。**三者共同闭环了 M9 系列"确定性探索流增强"主题（全零冻结触碰）。**

---

*Design documented (recovered): 2026-07-22. Status: DESIGN. Scope: frontend-only. Recovered from released v0.13.0 (`merge 30a907e` / `tag v0.13.0` / feature `08e9431`) under M9-DOC-001 Documentation Recovery. Content aligns verbatim with shipped code; no fabrication. 本文档为 intent-to-add，未提交（遵循"统筹考虑"约定）。*
