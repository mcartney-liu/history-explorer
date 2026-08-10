# A2 — ExplorationAction 输出契约

> 工作包 A（红线解耦前置）· FRW Phase 2（Experience Architecture）
> 裁决锚点：**ADR-0015 D1**（对外只暴露 ExplorationAction，不暴露 recommendation）
> 关联文档：A1_exploration_policy_contract.md · A3_recommend_downgrade_route.md

---

## 0. 命名红线（强制）

本文及所有下游契约**严禁出现 `recommendation` / `recommend` / `推荐` 字样**，
包括但不限于：类型名、字段名、端点路径、枚举值、展示文案 key。

- 对外类型名：`ExplorationAction`（认知动作，**不是** 内容推荐）。
- 对外端点（若有）：走 `/api/v1/entity/{id}/next` 之类，**绝不以 `/recommendations` 暴露**（见 A3）。
- 前端「下一步」呈现文案：使用「下一步探索 / 认知推进 / 继续深入」等，禁用「推荐」。

---

## 1. ExplorationAction 类型定义（对外载体）

`ExplorationAction` 是 `Decision<T>` 的 `output` 载体（见 A1 §3.2）。
前端「下一步」触点（B 包）**直接消费此类型，无需任何 backend 细节**。

### 1.1 字段清单（强制最小集 + 可选增强）

| 字段 | 类型 | 必填 | 说明 | 来源 |
| --- | --- | --- | --- | --- |
| `actionType` | enum | 是 | 认知动作类型 | 既有 runtime（原名 `type`） |
| `targetEntity` | string | 是 | 目标 entityId（全局 id） | 既有 runtime（原名 `targetRef`） |
| `rationale` | Rationale | 是 | 结构化理由（含 RuleTrace） | **本契约新定义**（取代文本 `reason`） |
| `coverageBeforeAfter` | CoverageDelta | 是 | 动作前后覆盖比例 | **本契约新定义（A1 §2.1 标注需新建）** |
| `narrativeHook` | string | 否 | 叙事钩子（吸引继续） | 既有 runtime |
| `expectedGrowth` | {dimension, relationType} | 否 | 预期认知成长 | 既有 runtime |
| `confidence` | number | 否 | 置信度 [0,1] | 既有 runtime |

### 1.2 `actionType` 枚举

```
open_dimension     // 打开缺失维度（扩展广度）
follow_cause       // 追踪缺失因果连接（加深深度）
deep_continue      // 深化当前维度（同主题更深层）
compare_context    // 跨语境对比（横向理解）
reflect            // 理解收束（帮助形成总结）
```

### 1.3 `rationale`（RuleTrace 载体）

```typescript
interface Rationale {
  ruleId: string          // 触发规则 id（来自 A1 §4.1）
  triggeredDimension: string   // 触发维度（A1 RuleTrace 的触发维度）
  text: string            // 人类可读理由（由 Policy 生成，非展示模板拼接）
  trace: RuleTrace[]      // 结构化规则轨迹
}
```

> `ruleId` + `triggeredDimension` 满足 M88.0 §8.3(b)：理由必须可追溯到规则 id 与触发维度。

### 1.4 `coverageBeforeAfter`（CoverageDelta）

```typescript
interface CoverageDelta {
  before: number          // 动作前 coverageRatio（来自 ExplorationState）
  after: number           // 预测动作后 coverageRatio（Policy 估算）
  delta: number           // after - before（冗余但便于前端直接展示）
}
```

---

## 2. TS 类型草案（前端 B 包可直接消费）

```typescript
// 来源：frontend/src/next/exploration/ExplorationPolicy.ts（既有 runtime，字段对齐重命名）
//       frontend/src/runtime/evaluation/Decision.ts（RuleTrace）

import type { RuleTrace } from '../../runtime/evaluation/Decision'

export type ExplorationActionType =
  | 'open_dimension'
  | 'follow_cause'
  | 'deep_continue'
  | 'compare_context'
  | 'reflect'

export interface Rationale {
  ruleId: string
  triggeredDimension: string
  text: string
  trace: RuleTrace[]
}

export interface CoverageDelta {
  before: number
  after: number
  delta: number
}

export interface ExplorationAction {
  actionType: ExplorationActionType     // 原 type
  targetEntity: string                  // 原 targetRef
  rationale: Rationale                   // 原 reason（结构化升级）
  coverageBeforeAfter: CoverageDelta    // 新增
  narrativeHook?: string
  expectedGrowth?: { dimension: string; relationType: string }
  confidence?: number
}

// 对外最终载体（= A1 §3.2 的 Decision<ExplorationAction>）
export interface ExplorationDecision {
  decisionId: string
  evaluatorId: string
  evaluatorVersion: string
  inputRef: string
  output: ExplorationAction
  trace: RuleTrace[]
  createdAt: number
}
```

### 2.1 与既有前端实现映射表

| 既有前端字段（ExplorationPolicy.ts:34-50） | A2 契约字段 | 变更 |
| --- | --- | --- |
| `type` | `actionType` | 重命名 |
| `targetRef` | `targetEntity` | 重命名 |
| `reason: string` | `rationale: Rationale` | 结构化升级（承载 RuleTrace） |
| （无） | `coverageBeforeAfter` | 新增 |
| `narrativeHook` | `narrativeHook` | 保留 |
| `expectedGrowth` | `expectedGrowth` | 保留 |
| `confidence` | `confidence` | 保留 |

> 映射为**纯重命名 + 结构化增强**，不引入 backend 依赖，因此 B 包「下一步」触点可直接消费。

---

## 3. OpenAPI 3.0 组件草案（对外端点契约，见 A3 §4）

```yaml
components:
  schemas:
    ExplorationAction:
      type: object
      required:
        - actionType
        - targetEntity
        - rationale
        - coverageBeforeAfter
      properties:
        actionType:
          type: string
          enum: [open_dimension, follow_cause, deep_continue, compare_context, reflect]
        targetEntity:
          type: string
          description: 目标 entity 全局 id
        rationale:
          $ref: '#/components/schemas/Rationale'
        coverageBeforeAfter:
          $ref: '#/components/schemas/CoverageDelta'
        narrativeHook:
          type: string
        expectedGrowth:
          type: object
          properties:
            dimension: { type: string }
            relationType: { type: string }
        confidence:
          type: number
          minimum: 0
          maximum: 1
    Rationale:
      type: object
      required: [ruleId, triggeredDimension, text, trace]
      properties:
        ruleId: { type: string }
        triggeredDimension: { type: string }
        text: { type: string }
        trace:
          type: array
          items:
            type: object
            properties:
              ruleId: { type: string }
              inputs: { type: object, additionalProperties: true }
              decision: { type: boolean }
    CoverageDelta:
      type: object
      required: [before, after, delta]
      properties:
        before: { type: number, format: float }
        after: { type: number, format: float }
        delta: { type: number, format: float }

  # 对外端点（替代旧 /recommendations，详见 A3）
  # GET /api/v1/entity/{id}/next  ->  ExplorationAction
```

---

## 4. 前端「下一步」呈现指引（B 包触点）

B 包设计「下一步」呈现时，仅依赖本契约字段，无需 backend 细节：

1. **主行动**：取 `output.actionType` + `output.targetEntity` 渲染为「下一步探索」卡片。
2. **理由**：展示 `rationale.text`，并在可访问性/调试态暴露 `rationale.ruleId` + `rationale.triggeredDimension`（审计/回放）。
3. **进度感**：用 `coverageBeforeAfter.delta` 渲染「覆盖 +X%」进度提示。
4. **叙事**：`narrativeHook` 作为引导文案（禁用「推荐」措辞）。
5. **点击**：导航交由 App 的 `onNodeClick(targetEntity)`（沿用既有 `openNode` 模式）。

> **B 包可直接消费确认**：本类型是纯前端可构造的数据结构（`ExplorationDecision`），
> 不引用任何 backend 内部类型，故 B 包「下一步」触点可在无 backend 参与下基于本契约设计。

---

## 5. 与 A1 / A3 的衔接

- **← A1**：`ExplorationAction` 字段名对齐 A1 §4 规则输出（映射见 §2.1）；`rationale.trace` 即 A1 的 `RuleTrace`。
- **→ A3**：本类型是 `recommend_next()` 降级后上层映射的产物（A3 §3）；旧 `RecommendationResult` 类型不得继续使用。
- **闭环**：A1（Policy 规则）→ A2（Action 输出）→ A3（降级路线）构成红线解耦完整契约链。
