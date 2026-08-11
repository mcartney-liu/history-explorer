# A1 — ExplorationPolicy 规则契约

> 工作包 A（红线解耦前置）· FRW Phase 2（Experience Architecture）
> 裁决锚点：**ADR-0015 D1**（recommend_next 降级为内部候选生成器；新增 ExplorationPolicy 层；对外只暴露 ExplorationAction）
> 关联文档：A2_exploration_action_contract.md · A3_recommend_downgrade_route.md

---

## 0. 文档定位与铁律

本文定义 **ExplorationPolicy** 的算法契约：以「认知缺口」为唯一驱动信号，
输出有序候选认知动作（`ExplorationAction`）。

铁律（来自 Phase 2 执行计划与 ADR-0015 D1）：

- 本文是**契约补全**，**不修改任何 backend / frontend 代码**（只读验证见 §8 来源标注）。
- 任何地方**严禁使用 recommendation 命名**；本 Policy 不是 RecommendationPolicy。
- Policy 输出必须走 `Decision<ExplorationAction>`（M88.0 §8.3）。
- 规则必须产生结构化 `RuleTrace`（规则 id + 触发维度），非展示文本。
- 输入只来自「认知状态投影」，不访问 MemoryStore / KG / LLM（M88.2）。

---

## 1. 认知缺口驱动 vs 图相似度推荐（明确拒绝口径）

**M88.0 §8.3 要求**的下一步推进，必须基于认知缺口，而非内容/图相似度推荐。
本契约**明确拒绝**以下口径（对照 P1-05 C-01 实地核查）：

| 拒绝项 | 当前实现（违规点） | 拒绝依据 |
| --- | --- | --- |
| 图相似度四权重打分 | `recommend_next()` `REC_W_RELATIONSHIP=0.40 / TIMELINE=0.25 / THEME=0.20 / DIVERSITY=0.15`（`exploration_engine.py:594-624`） | M88.0 §8.2 / §8.3：不基于关系/时间线/主题相似度 |
| 流行度 / 点击率 / 停留时长 | 无显式字段但属「推荐」范式 | M88.0 §8.2：不基于流行度/交互信号 |
| 协同过滤 | 候选扩展逻辑隐含量化相似邻居 | M88.0 §8.2：Exploration ≠ Recommendation |
| 不剔除已探索实体 | `seen` 节点 `diversity=0.2` 仍入候选（`exploration_engine.py:619-620`） | M88.0 §8.2：不推荐已探索 entity |
| LLM 决定方向 | 引擎为确定性算法（可接受内核），但**对外命名为 recommendation** | M88.0 §8.2：不由 LLM 决定方向；命名亦违规 |
| 文本理由（非 RuleTrace） | `_build_reasons()` 模板拼接字符串（`exploration_engine.py:661-689`） | M88.0 §8.3：reason 必须来自 RuleTrace |

**结论**：`recommend_next()` 的算法内核（确定性候选生成）可保留为内部工具（见 A3），
但其「图相似度 + recommendation 命名 + 非 RuleTrace 理由」三处必须被本契约取代。

---

## 2. 输入契约（字段来源标注）

输入类型：`ExplorationState`（认知状态快照）。驱动字段为本契约关注的三个：

- `coverageRatio: number` —— 覆盖比例（0–1）
- `missingDimensions: string[]` —— 缺失维度
- `missingConnections: MissingConnection[]` —— 缺失因果连接

### 2.1 字段来源总表（既有 runtime / 需新建）

| 字段 | 类型 | 来源 | 现状 |
| --- | --- | --- | --- |
| `coverageRatio` | number | **既有 runtime** | `frontend/src/next/exploration/ExplorationState.ts:56`（由 UnderstandingProjection 注入） |
| `missingDimensions` | string[] | **既有 runtime** | `ExplorationState.ts:60`（buildExplorationState 由 required - covered 计算，:146-148） |
| `missingConnections` | MissingConnection[] | **既有 runtime** | `ExplorationState.ts:64`（由 missingLinks 映射，:151-157） |
| `coveredDimensions` | string[] | **既有 runtime** | `ExplorationState.ts:58` |
| `understandingStage` | UnderstandingStage | **既有 runtime** | `ExplorationState.ts:54` |
| `exploredAnchors` | string[] | **既有 runtime** | `ExplorationState.ts:68`（去重用） |
| `currentAnchorRef` | string | **既有 runtime** | `ExplorationState.ts:50` |
| `currentTopic` | string | **既有 runtime** | `ExplorationState.ts:48` |
| `coverageBefore/After` 差额 | — | **需新建（在 A2 计算）** | backend 为零命中；由 Policy 计算前后 coverageRatio 差值产出 |

> **关键事实**：上述认知缺口字段在 **backend 全仓 grep 零命中**（P1-05 E3 缺席证明），
> 真实唯一来源是**前端 runtime**（`frontend/src/next/exploration/`）。
> 因此本契约的「复用既有 runtime 字段」指复用前端 `ExplorationState`，
> backend 侧不新建这些字段（保持 ADR-0015 D1「不修订上位文档、不扩展 backend 契约」）。

---

## 3. 输出契约（候选集排序 → Decision<ExplorationAction>）

### 3.1 算法内部输出：有序候选集

Policy 对每条规则生成一个候选动作，按**规则优先级**产出有序候选集：

```
RankedCandidate = {
  rank: number,                         // 1 = 最高优先
  action: ExplorationAction,            // 见 A2 契约
  trace: RuleTrace[],                   // 规则 id + 触发维度
  priorityScore: number                 // 规则优先级 + 置信度
}
```

### 3.2 契约对外表面：单个 Decision<ExplorationAction>

按 M88.0 §8.3，对外只暴露**最优候选**（有序集的 rank=1）封装为 `Decision<ExplorationAction>`：

```
Decision<ExplorationAction> = {
  decisionId: string,
  evaluatorId: string,                  // 'exploration-policy-default-v1'
  evaluatorVersion: string,
  inputRef: string,
  output: ExplorationAction,            // A2 载体
  trace: RuleTrace[],                   // 命中规则 id + 触发维度
  createdAt: number
}
```

> 有序候选集为内部中间态；契约表面仅取 top-1。这样既满足「候选集排序」（算法层），
> 又满足「输出走 Decision<ExplorationAction>」（M88.0 §8.3）。

---

## 4. 规则算法（伪代码级，每条带 ruleId + 触发维度 + RuleTrace）

规则按优先级**短路**（命中即返回，跳过后续），满足 M88.2「补缺口最优先」。

```
evaluateExploration(state: ExplorationState, ctx: PolicyContext)
  -> Decision<ExplorationAction>:

  # ── Rule R1: 打开缺失维度（最高优先） ──
  IF state.missingDimensions.length > 0:
      dim = state.missingDimensions[0]
      target = resolveDimensionTarget(dim, state)         # 维度 → entity
      IF NOT isExplored(target, state.exploredAnchors):
          RETURN makeDecision({
              type: 'open_dimension',
              targetRef: target,
              triggeredDimension: dim,                      # RuleTrace 触发维度
              trace: [{ ruleId: 'exploration-open-dimension',
                        inputs: { missingDimension: dim,
                                  missingCount: len(missingDimensions),
                                  coverageRatio },
                        decision: true }]
          })

  # ── Rule R2: 追踪缺失因果连接 ──
  IF state.missingConnections.length > 0:
      conn = state.missingConnections[0]
      target = conn.toRef
      IF NOT isExplored(target, state.exploredAnchors):
          RETURN makeDecision({
              type: 'follow_cause',
              targetRef: target,
              triggeredDimension: 'causality',
              trace: [{ ruleId: 'exploration-follow-cause',
                        inputs: { fromRef, toRef, expectedRelationType },
                        decision: true }]
          })

  # ── Rule R3: 理解收束 ──
  IF state.understandingStage == 'UNDERSTANDING':
      RETURN makeDecision({
          type: 'reflect',
          targetRef: state.currentAnchorRef,
          triggeredDimension: 'synthesis',
          trace: [{ ruleId: 'exploration-reflect',
                    inputs: { stage: 'UNDERSTANDING',
                              coveredCount: len(coveredDimensions) },
                    decision: true }]
      })

  # ── Rule R4: 深化当前维度 ──
  IF state.coverageRatio < 1.0:
      target = state.currentAnchorRef
      IF NOT isExplored(target, state.exploredAnchors):
          RETURN makeDecision({
              type: 'deep_continue',
              targetRef: target,
              triggeredDimension: state.coveredDimensions[0] ?? 'depth',
              trace: [{ ruleId: 'exploration-deep-continue',
                        inputs: { coverageRatio },
                        decision: true }]
          })

  # ── Rule R5: 默认兜底 ──
  RETURN makeDecision({
      type: 'deep_continue',
      targetRef: state.currentAnchorRef,
      triggeredDimension: 'continuation',
      trace: [{ ruleId: 'exploration-default',
                inputs: { coverageRatio },
                decision: true }]
  })
```

### 4.1 规则清单（ruleId ↔ 触发维度）

| ruleId | 触发维度（输入谓词） | 动作类型 |
| --- | --- | --- |
| `exploration-open-dimension` | `missingDimensions.length > 0` | `open_dimension` |
| `exploration-follow-cause` | `missingConnections.length > 0` | `follow_cause` |
| `exploration-reflect` | `understandingStage == 'UNDERSTANDING'` | `reflect` |
| `exploration-deep-continue` | `coverageRatio < 1.0` | `deep_continue` |
| `exploration-default` | 其他（兜底） | `deep_continue` |

> 现有前端 `ExplorationPolicy.ts:70-183` 已逐条实现上述规则，ruleId 一致，
> 仅 `targetRef` / `reason` 字段命名需对齐 A2（见 A2 §3 映射）。

---

## 5. 输入 / 输出 Schema 草案

### 5.1 TypeScript（复用前端 runtime，标注契约层）

```typescript
// 来源：frontend/src/next/exploration/ExplorationState.ts（既有 runtime）
export interface ExplorationState {
  explorationId: string
  currentTopic: string
  currentAnchorRef: string
  understandingStage: 'FACT' | 'CONTEXT' | 'UNDERSTANDING' | 'SYNTHESIS'
  coverageRatio: number                       // [0,1]
  coveredDimensions: string[]
  missingDimensions: string[]                 // 驱动字段
  missingConnections: {                       // 驱动字段
    fromRef: string
    toRef: string
    expectedRelationType: string
    templateRef: string
  }[]
  exploredAnchors: string[]                   // 去重
  exploredRelations: string[]
  activeQuestions: string[]
  memorySnapshot: { totalNodes: number; daysSinceStart: number; activeBranches: { branchId: string; latestStage: string }[] }
  computedAt: number
  basedOn: { understandingProjectionVersion: string; memoryProjectionVersion: string }
}

// 来源：frontend/src/runtime/evaluation/Decision.ts（既有 runtime）
export interface RuleTrace { ruleId: string; inputs: Record<string, unknown>; decision: boolean }
export interface Decision<T> {
  decisionId: string; evaluatorId: string; evaluatorVersion: string
  inputRef: string; output: T; trace: RuleTrace[]; createdAt: number
}

// Policy 契约函数签名
export function evaluateExploration(
  state: ExplorationState,
  ctx: { timestamp: number; policyVersion: string; engineProtocolVersion: string },
): Decision<ExplorationAction>   // ExplorationAction 见 A2
```

### 5.2 Python（backend 内部候选生成器对齐用，仅类型草案，不改代码）

```python
from dataclasses import dataclass, field
from typing import List, Dict, Any

@dataclass
class ExplorationStateInput:
    exploration_id: str
    current_topic: str
    current_anchor_ref: str
    understanding_stage: str
    coverage_ratio: float                       # [0,1]
    covered_dimensions: List[str]
    missing_dimensions: List[str]               # 驱动字段
    missing_connections: List[Dict[str, str]]   # 驱动字段
    explored_anchors: List[str]
    covered_count: int = 0

@dataclass
class RuleTrace:
    rule_id: str
    inputs: Dict[str, Any]
    decision: bool

@dataclass
class RankedCandidate:
    rank: int
    action: Dict[str, Any]      # ExplorationAction，见 A2
    trace: List[RuleTrace]
    priority_score: float

def evaluate_exploration(state: ExplorationStateInput) -> List[RankedCandidate]:
    """认知缺口驱动；返回有序候选集；top-1 由上层封装为 Decision<ExplorationAction>。"""
    ...
```

---

## 6. 与 M88.0 §8.3 逐条对照表

| M88.0 §8.3 条款 | 要求 | 本契约满足证明 |
| --- | --- | --- |
| §8.3(a) 认知推进约束 | 基于 `coverageRatio` / `missingDimensions` / `missingConnections` / `UnderstandingStage` / `MemoryProjection` | §2 / §4：输入直接消费三者 + `understandingStage` + `memorySnapshot`（见 §2.1），全为既有 runtime 字段 |
| §8.3(b) 理由来自 RuleTrace | reason 必须来自结构化 RuleTrace（规则 id + 触发维度） | §4：每条规则产出 `RuleTrace{ruleId, inputs, decision}`，`triggeredDimension` 显式记录触发维度；拒绝 `_build_reasons()` 文本拼接 |
| §8.3(c) 输出走 Decision | 输出必须封装为 `Decision<ExplorationAction>` | §3.2：对外表面为 `Decision<ExplorationAction>`，`trace` 字段承载 RuleTrace |
| §8.3(d) 不基于相似度 | 不使用图相似度 / 流行度 / 协同过滤 | §1：明确拒绝四权重打分与推荐范式 |
| §8.3(e) 不推荐已探索 | 不向已探索 entity 输出动作 | §4：每条规则经 `isExplored(target, exploredAnchors)` 去重（拒绝 `exploration_engine.py:619-620` 行为） |
| §8.3(f) 不由 LLM 决定方向 | 方向由规则决定，非 LLM | §4：纯规则短路，无 LLM 调用 |

---

## 7. 与 A2 / A3 的衔接

- **→ A2**：本契约 `ExplorationAction` 载体字段名需对齐 A2 契约（`actionType` / `targetEntity` / `rationale` / `coverageBeforeAfter`）。现有前端 `type`/`targetRef`/`reason` 为别名，映射表见 A2 §3。
- **→ A3**：本 Policy 是 `recommend_next()` 降级后的**上层筛选器**。A3 保留的算法内核只产候选，`ExplorationPolicy` 按 §4 规则筛选并映射为 `ExplorationAction`。
- **闭环**：A1（Policy 规则）→ A2（Action 输出）→ A3（降级路线）构成「红线解耦」完整契约链。
