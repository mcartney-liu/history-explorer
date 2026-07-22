# M9-002 RecommendationPanel — Design Specification

> 文档状态：DESIGN（仅规范，不含实现）。范围：**frontend-only**。
> 依赖基线：v0.11.0（M9-001.2 Deterministic Next-Node Recommendation Engine，已发布）。
> 上游授权：M9-000 Planning Baseline（PO 批准）+ M9-002 Planning Baseline（PO 批准，方向 = Candidate A — RecommendationPanel）。
> 本文件为 M9-002 唯一设计规范入口。所有代码路径仅用于描述现状与设计边界，本文禁止修改任何代码。
> 本设计完全落在 `docs/10_ARCHITECTURE/CURRENT_ARCHITECTURE_BASELINE.md` 冻结边界内。

---

## 1. Executive Summary

M9-001（v0.11.0）在后端交付了确定性、可解释的"下一站"推荐 API（`GET /entity/{id}/recommendations`），但**前端目前完全没有任何调用点**——这项能力对用户不可见，是一项"死能力"（P1 缺陷）。

M9-002 的唯一目标：在**纯前端、零冻结触碰**的前提下，新增一个 `RecommendationPanel.tsx` 组件，消费已发布的 M9-001 推荐 API，把"可解释的下一站推荐"呈现给用户，让产品 DNA 定义的 "Infinite Exploration" 在 UI 层形成闭环。

**本里程碑不是新算法。** 它不重新排序、不重算分数、不修改任何后端契约。前端只做一件事：请求 → 渲染 → 复用现有导航跳转。

关键设计决策一览：

| 决策项 | 结论 |
|---|---|
| 挂载位置 | **Candidate C — 独立 Exploration Section**，作为 App entity 分支内的 sibling，置于 `EntityPage` 之后、`ContinueExploringPanel` 之前 |
| 数据获取 | 组件内 `useEffect` 调 `GET /entity/{id}/recommendations?limit=5&seen=<recent ids>`，沿用现有 `fetch` + `API_BASE` 约定 |
| 状态 | 组件本地 `loading / error / data` 三态，不新增任何全局状态 |
| 交互 | 卡片点击复用现有 `openEntity(global_id)` 导航路径（经 `onNodeClick` prop 上提到 App） |
| 硬约束 | 前端**绝不**重算 score / 重排 / 篡改推荐结果——顺序即后端顺序 |

---

## 2. User Problem

**现状用户体验：** 用户进入某个实体页后，看到的是该实体自身的事实（摘要 / 时间线 / 关系列表）与 `ContinueExploringPanel`。后者按引擎原序展示 `connections_explained`，其组件注释明确声明"这**不是**推荐器（recommender），绝不重排"——它是"引擎自有排序上叠加已访问标记"的中性列表。

**缺口：**
- 用户拿不到"**为什么该去这里**"的探索语境理由（`reasons[]`）。
- 用户拿不到按**探索价值**（关系含义 + 时间相关 + 主题连接 + 多样性）综合排序的明确"下一站"引导。
- M9-001 已经把这些都算好了、通过 API 返回了，但前端一行都没用。

**M9-002 要解决的问题：** 让"可解释的下一站推荐"真正出现在用户面前，把后端已完成的确定性推荐能力转化为可见、可点击、可继续探索的用户体验。

---

## 3. Current UX Analysis

Phase 2 只读审计（基于真实代码）结论：

### 3.1 Entity 分支的渲染结构（`frontend/src/App.tsx` L574–598）

```tsx
{!loading && !errorKind && current?.type === 'entity' && entityData && (
  <>
    <EntityPage ... />              // 当前实体的事实：summary / timeline / relationships / exploration paths
    <ContinueExploringPanel ... />  // 引擎原序 connections_explained（明确“NOT a recommender”）
  </>
)}
```

两者是**同级 sibling**，包在同一个 Fragment 里。这就是 M9-002 组件的天然挂载区。

### 3.2 三个候选挂载点评估

| 候选 | 描述 | 评估 |
|---|---|---|
| **A — EntityPage 主内容区内** | 把推荐塞进 `EntityPage` 内部 | ❌ 违反单一职责。`EntityPage` 负责"当前实体自身事实"，注入推荐会让其职责膨胀、测试变重、与 M9-001 additive 精神相悖 |
| **B — 并入 ContinueExploring 区域** | 扩展 `ContinueExploringPanel` 承载推荐 | ❌ 直接违反该组件的文档契约（"NOT a recommender / 绝不重排"）。推荐卡片是有序打分结果，混入会破坏其中性语义，是明确的红线动作 |
| **C — 独立 Exploration Section（推荐）** | 新增独立 `RecommendationPanel`，作为 entity 分支内 sibling | ✅ 单一职责、状态自包含、可独立单测、纯 additive；与 `ExplorationTrail` / `ContinueExploringPanel` 各自独立 sibling 的既有模式一致 |

### 3.3 结论 — 采用 Candidate C，并确定层次顺序

在 entity 分支 Fragment 内，渲染顺序应为：

```
EntityPage              → 当前实体是什么（事实）
RecommendationPanel     → 推荐的下一站 + 为什么（M9-001，可解释、有序）   ← 新增
ContinueExploringPanel  → 继续探索的原始线索（引擎原序，中性兜底）
```

理由：推荐是"带理由的引导"，信息价值高于中性线索列表，故置于 `ContinueExploringPanel` 之前；但它是探索动作，不属于实体自身事实，故置于 `EntityPage` 之后。三者形成清晰的信息层次：**是什么 → 该去哪（为什么）→ 还能去哪**。

---

## 4. Proposed Solution

新增单一前端组件 `frontend/src/components/RecommendationPanel.tsx`：

- 输入：`entityId`（当前实体 global_id）、`seenGlobalIds`（已访问集合，来自 App 现有派生）、`onNodeClick`（导航回调，复用现有 `openEntity`）。
- 行为：挂载时（及 `entityId` 变化时）请求 M9-001 推荐 API，管理自身 `loading / error / data` 三态，渲染推荐卡片列表。
- 交互：卡片点击 → `onNodeClick(target_entity.global_id)` → App 的 `openEntity` → `navigateTo` → `fetchNode`（现有唯一导航路径，无重复逻辑）。
- 纯展示 + 自取数：不引入状态库、不引入缓存系统、不引入新依赖。

**为什么是 additive 且零冻结风险：** 只新增一个组件文件 + 在 App entity 分支加一个 sibling 渲染 + 少量 CSS。不碰后端、不碰 schema、不碰枚举、不碰冻结基线、不新增依赖。

---

## 5. Component Architecture

### 5.1 组件签名（设计意图，非实现）

```tsx
type RecommendationItem = {
  target_entity: { global_id: string; name: string; type: string }
  score: number
  score_breakdown: {
    relationship_weight: number
    timeline_relevance: number
    theme_connection: number
    exploration_diversity: number
  }
  reasons: string[]
  relation_path: Array<{
    from: string; to: string; relationship: string
    direction: string; weight: number
  }>
  metadata: { depth: number; candidate_source: string; entity_type: string }
}

type RecommendationResult = {
  current_entity: { global_id: string; name: string; type: string }
  recommendations: RecommendationItem[]
  algorithm_version: string
  parameters: Record<string, unknown>
  metadata: Record<string, unknown>
}

type RecommendationPanelProps = {
  entityId: string                    // 当前实体 global_id
  seenGlobalIds?: Set<string>         // 复用 App 现有派生，转成 seen 参数
  max?: number                        // 默认 5，透传为 limit
  onNodeClick?: (globalId: string) => void
}
```

> 上述 TS 类型逐字对齐后端 `RecommendationItem.to_dict()` / `RecommendationResult.to_dict()`（`backend/app/core/exploration_engine.py` L216–243）。前端不得增删字段语义，仅做只读消费。

### 5.2 职责边界

- **只读消费**：组件只反序列化并渲染 API 返回，不做任何再计算。
- **纯展示 + 自取数**：唯一副作用是 `fetch`；导航状态仍由 App 拥有（通过 `onNodeClick` 上提）。
- **渲染为空即返回 null**：无推荐（空数组）时不渲染面板外壳，与 `ContinueExploringPanel` 的"无内容不渲染"约定一致。

### 5.3 与既有组件的一致性

| 约定 | 既有来源 | M9-002 沿用方式 |
|---|---|---|
| 外层容器类名 | `ContinueExploringPanel` 用 `result-section he-continue` | 新增 `result-section he-recommend`（新 CSS 命名空间，不复用/覆盖旧类） |
| 导航回调 | `onNodeClick(globalId)` / `onTopicClick(topic)` | 沿用 `onNodeClick(globalId)` 签名 |
| localName 工具 | `ContinueExploringPanel.localName()` | 同款纯函数（`gid.split(':')` 取显示名），组件内自持，不跨文件耦合 |
| seen 标记 | App L417–419 派生 `seenGlobalIds` | 直接复用同一 Set，转成 `seen` 查询参数 |

---

## 6. Data Flow

```
App.tsx (owns navigation + recent history)
  │  entityData 已加载 (current.type === 'entity')
  │  seenGlobalIds  ← 派生自 recent (App L417–419)
  ▼
<RecommendationPanel entityId={current.id} seenGlobalIds={seenGlobalIds} onNodeClick={openEntity}/>
  │  useEffect([entityId, seenParam])
  ▼
fetch(`${API_BASE}/entity/${id}/recommendations?limit=5&seen=<csv>`)   // 沿用 App 现有 fetch + API_BASE
  ▼
Backend v0.11.0  recommendations() handler  (main.py L219–249)
  ▼
RecommendationResult.to_dict()  →  组件本地 state.data
  ▼
渲染卡片列表
  │  用户点击卡片
  ▼
onNodeClick(target_entity.global_id)  →  App.openEntity(gid)  →  navigateTo  →  fetchNode
  （现有唯一导航路径，闭环回到顶部）
```

数据流严格单向：App → RecommendationPanel → API → Backend；导航事件单向上提 App。无双向绑定、无跨组件共享可变状态。

---

## 7. API Consumption Contract

**端点（M9-001.2 已发布，本里程碑只读消费）：**

```
GET {API_BASE}/entity/{entity_id}/recommendations?limit=5&seen=<csv global_ids>
```

- `API_BASE` = `import.meta.env.VITE_API_BASE || 'http://localhost:8000'`（`App.tsx` L54，沿用）。
- `entity_id` = 当前实体 global_id，需 `encodeURIComponent`（与 `fetchNode` 对 `/entity/{id}` 的处理一致）。
- `limit` = `max`（默认 5），透传为后端 `limit` 参数。
- `seen` = `Array.from(seenGlobalIds).join(',')`（可为空串；后端对空 `seen` 安全处理，见 main.py L242–244）。
- v1 与 legacy 路径同一 handler、响应一致；前端默认走 legacy 路径与其余调用保持统一。

**响应结构（逐字对齐后端 `to_dict()`）：**

```jsonc
{
  "current_entity": { "global_id": "...", "name": "...", "type": "..." },
  "recommendations": [
    {
      "target_entity": { "global_id": "...", "name": "...", "type": "..." },
      "score": 0.82,                       // 后端已 round(4)
      "score_breakdown": {
        "relationship_weight": 0.90,
        "timeline_relevance": 0.75,
        "theme_connection": 0.60,
        "exploration_diversity": 1.0
      },
      "reasons": [ "…", "…" ],
      "relation_path": [ { "from": "...", "to": "...", "relationship": "...", "direction": "...", "weight": 0.9 } ],
      "metadata": { "depth": 1, "candidate_source": "direct_relation", "entity_type": "Person" }
    }
  ],
  "algorithm_version": "m9-001.v1",
  "parameters": { "max_results": 5, "weights": { "...": 0.4 } },
  "metadata": { "generated_at": "<iso-ts>", "candidate_count": 23 }
}
```

**契约不变量（前端必须遵守）：**
- 前端渲染 `recommendations` **按数组原序**，不排序、不打分、不过滤（除截断至 `max`，而 `limit` 已由后端处理）。
- `score` 直接展示后端值；前端不重算、不四舍五入改动。
- 404（实体缺失 / 无 global_id）→ 走 error 态（§9），不抛未捕获异常。

---

## 8. UI Interaction Design

每条推荐渲染为一张 **Recommendation Card**：

| 展示要素 | 数据来源 | 说明 |
|---|---|---|
| 目的地名称 | `target_entity.name`（回退 `localName(global_id)`） | 卡片主标题，作为可点击按钮 |
| 类型徽标 | `target_entity.type` | 8 类实体类型之一 |
| 匹配度 | `score` | 直接展示后端值（如 `0.82` 或 `82%`），不重算 |
| 推荐理由 | `reasons[0..2]` | 渲染为可读条目，取前若干条 |
| 关系 | `relation_path[0].relationship` + `direction` | "通过 'influenced'（outgoing）相连" |
| 已访问标记 | `seenGlobalIds.has(global_id)` | 仅弱化视觉 + "seen" 标记，**绝不改变顺序** |

**交互：**
- 卡片点击 → `onNodeClick(target_entity.global_id)` → App `openEntity` → 现有导航闭环。
- 无 hover 重排、无客户端筛选控件（避免引入"前端排序"红线）。
- 可访问性：卡片为 `<button>`，带 `aria-label`（对齐 `ContinueExploringPanel` 的 a11y 约定）。

**视觉：** 新增 `he-recommend` CSS 命名空间，风格与 `he-continue` 一致（`result-section` 容器 + 列表 + 节点按钮），不覆盖既有类，不引入 UI 库。

---

## 9. Error & Empty State

组件本地三态，全部在组件内处理，不污染 App：

| 状态 | 触发 | UI 表现 |
|---|---|---|
| `loading` | 请求进行中 | 轻量 loading 提示（可复用现有 `LoadingSkeleton` 风格或简单文案），不阻塞页面其余部分 |
| `error` | 网络失败 / 非 2xx / 404 | 面板内小型非阻断提示（如"暂时无法加载推荐"），**不**弹全局错误、**不**影响 EntityPage / ContinueExploring 正常渲染 |
| `empty` | 200 但 `recommendations` 为空 | 返回 `null`，不渲染面板外壳（与 ContinueExploring "无内容不渲染"一致） |

**关键原则：** RecommendationPanel 的任何失败都必须是**局部降级**——用户仍能看到实体页与继续探索区。推荐是增强，不是关键路径。

---

## 10. Scope Matrix

| In Scope（M9-002） | Out of Scope（明确排除） |
|---|---|
| 新增 `frontend/src/components/RecommendationPanel.tsx` | 任何 `backend/**` 改动 |
| App.tsx entity 分支新增一个 sibling 渲染（additive） | 修改推荐算法 / 评分公式 / 权重 |
| 组件内 `fetch` 调用 M9-001 API（沿用 `API_BASE`） | 修改 `/entity/{id}/recommendations` API 契约 |
| 新增 `he-recommend` CSS | 修改 `ENTITY_TYPES` / `RELATIONSHIP_TYPES` 枚举 |
| 组件单测（Vitest）+ 复用现有 `seenGlobalIds` | 数据库 / Neo4j / PG / ES / ORM |
| 局部 loading / error / empty 处理 | AI / LLM / RAG / embedding / GIS / Map |
| — | 新增运行时依赖 / 状态库 / 缓存系统 |
| — | 前端重排 / 重算 score / 篡改推荐结果 |
| — | 全局 history/推荐状态、跨组件缓存 |

---

## 11. Freeze Compliance

M9-002 满足 `CURRENT_ARCHITECTURE_BASELINE.md` 全部冻结约束：

- **Baseline unchanged**：不修改冻结基线文件；不引入 AI/LLM/DB/Neo4j/PG/ES/GIS/登录/权限。
- **Schema unchanged**：`ENTITY_TYPES=8` / `RELATIONSHIP_TYPES=18` 不动；Entity/Relation JSON 不动。
- **API contract unchanged**：只读消费 M9-001 已发布端点，不新增/修改后端路由或响应。
- **Dependency unchanged**：纯 React + 现有 `fetch`，无新增前端依赖。
- **"Recommendation" 红线说明**：沿用 M9-001 §13 判定——本项是**确定性图排序的前端消费**，非 AI/ML 推荐 runtime；已由 M9-000 / M9-002 Planning Baseline（PO 批准）授权。前端在此仅做展示，甚至不参与排序，语义上更远离红线。
- **freeze-check**：M9-002 为 frontend-only，运行 `scripts/freeze-check.mjs`（默认 `FROZEN_SCOPE=frontend`）应通过；实质守卫（token/dep/enum）任意 scope 生效。

---

## 12. Testing Strategy

| 类别 | 测试点 |
|---|---|
| **渲染测试** | mock API 返回 N 条推荐 → 断言渲染 N 张卡片，且顺序 == 响应数组顺序（验证"不重排"） |
| **字段映射** | 断言卡片展示 `target_entity.name` / `type` / `score` / `reasons` / `relation_path[0].relationship`，与 mock 数据逐字对应 |
| **交互测试** | 点击卡片 → 断言 `onNodeClick` 以 `target_entity.global_id` 被调用一次 |
| **seen 标记** | 传入含某 gid 的 `seenGlobalIds` → 断言该卡片带 seen 标记，且顺序不变 |
| **loading 态** | 请求 pending → 断言 loading 提示；resolve 后消失 |
| **error 态** | mock reject / 404 → 断言局部错误提示，且不抛异常、不影响其余渲染 |
| **empty 态** | 返回空 `recommendations` → 断言组件返回 null（不渲染外壳） |
| **回归** | 现有 220 Vitest 全绿；App smoke test 不回归；`freeze-check` 通过 |

所有测试基于 mock fetch，不依赖真实后端，保证确定性与 CI 稳定。

---

## 13. Future Extension Boundary

- **M9-003（已在 M9-001 §15 预留）**：结合前端访问历史（`seenGlobalIds`）做连续路径导航 / Exploration Journey；本里程碑仅把 `seen` 作为 API 参数透传，不在前端构建路径状态机。
- **不预留、需 Gate 的方向**：AI/LLM 解释增强、GIS/Map 呈现、向量检索、图数据库——任一引入须先走 **ADR + Freeze Revision Gate + PO 批准**。M9-002 不为这些预留任何前端运行时依赖或接口。
- **明确不做**：前端个性化排序、用户偏好建模、客户端缓存/离线推荐——这些会把确定性推荐变成客户端重算，属红线，永不在本组件内实现。

---

*Design established: 2026-07-22. Status: DESIGN. Scope: frontend-only. Awaiting Product Owner review before M9-002 Implementation Planning. 本文档为 intent-to-add，未提交（遵循"统筹考虑"约定）。*
