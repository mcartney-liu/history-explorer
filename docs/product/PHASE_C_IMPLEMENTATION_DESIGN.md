# Phase C 动态探索方向 —— Implementation Design（施工设计）

> 状态：**Draft（待 PO 评审）** · 承接：ADR-0023 v3.1 + Phase B（已施工，commit 550ad11）
> 一句话：把"下一步去哪"从 `stations[idx+1]`（写死路线）换成 **候选生成 → 证据打分 → C 决策层排序 → 最值得理解的那一个**。
> 复用：Phase B 的 `collectRelationEvidence`（C5 单引擎复用，C 不另造关系逻辑）+ `ComposeFeatures`。
> 红线：**C 不消费 JCS 作决策**（C3）；**AI 不决定探索方向**（M88.0）；**Engine 不产生"下一步"**（C1）。

---

## 0. 为什么现在做 C（PO 2026-08-15 实地反馈的根因）

PO 实机查看 Phase B 诚实表达后提出灵魂拷问：**"用户看不懂'为什么带我到这里'——那我们做这一大堆意义在哪？"**

根因诊断：
- "没有找到联系"这句（B 层诚实表达）解决的是**不撒谎**，解决不了**"为什么用户此刻在这里"**。
- 后者正是 **C 层的核心命题**：用户被带到的下一站，应该是**当前理解状态下最值得去的那一个**，而不是写死路线的下一个。
- B 层的工作没有白做：**C 要判断"哪个候选值得去"，必须知道候选与当前节点的关系证据**——这正是 `collectRelationEvidence` 的产出。**B 是 C 的地基**（PO 已认可该判断）。

---

## 1. 现状实证（已读代码）

| 事实 | 现状 |
|---|---|
| 写死路线 | 包内站间衔接走 `stations[idx±1]`（`JourneyRail.buildStations`），"下一站"= 数组下一个，无任何实时判断 |
| C 层种子 | `ExplorationPolicy.evaluateExploration`（M88.2）：基于**预写 ExplorationState**（missingDimensions/missingConnections/coverageRatio）的**规则选择器**，**不访问实时图数据**、不生成候选集 |
| 关系证据 | Phase B 已建 `collectRelationEvidence(from, to, context) → RelationEvidence[]`（B/C 共用入口，C5） |
| 特征 | Phase B 已建 `composeFeatures(evidence) → ContinuityFeatures`（RS/EQ/TC/SC/CR=null） |
| 决策产物 | `ExplorationAction { type, targetRef, reason, narrativeHook, expectedGrowth, confidence }`（M88.2 已定型，C 直接复用） |
| JCS | Phase B 的 `deriveJourneyContinuityScore` 已标注**诊断启发式**，C 不消费（C3 已由测试锁定） |

**关键差距**：`evaluateExploration` 现在读的是**预写状态**（维度缺口等），不是"当前实体 + 实时候选"。C 施工 = 在它前面加一层**候选生成器 + 证据打分**，让"去哪"由证据驱动。

---

## 2. 施工范围（做什么 / 不做什么）

### 做
1. 新建 `frontend/src/next/exploration/candidateGeneration.ts` —— **候选生成器**（从当前实体出发，生成候选目标集）。
2. 新建 `frontend/src/next/exploration/candidateRanking.ts` —— **C 决策层**（证据打分 + 排序 + 选最值得理解的）。
3. `ExplorationPolicy.evaluateExploration` 接入候选层（新规则前置：有证据支持的候选 > 无证据的预写目标）。
4. 调用方：`NextStepPanel` / `RecommendedNext` 的"下一站"从 `stations[idx+1]` 切到 C 产出。
5. 测试：C 层审计断言（C1/C3/C5/C7 复用） + 功能（候选生成/排序/回退）。
6. 文档同步 ima（PO 拍板后）。

### 不做（红线/边界，锁死）
- ❌ 引擎不新增任何排序函数（排序在 C 决策层，C1）。
- ❌ C 不消费 JCS（C3）：排序输入 = `RelationEvidence[]` + `ContinuityFeatures`，**绝不出现 JCS 阈值**。
- ❌ AI/LLM 不参与候选生成或排序（M88.0：禁止 AI 决定探索方向；纯规则 + 图数据）。
- ❌ 不引新依赖、不碰 backend、不动 Phase B 引擎接口。
- ❌ 不删 `stations`（保留为**回退兜底**：候选集为空/全被探索时回退原路线）。

---

## 3. 架构（定型）

```
             当前实体 (currentEntity)
                    │
                    ▼
      ┌─────────────────────────────┐
      │  候选生成器 (C, 新)          │
      │  candidateGeneration.ts     │
      │  ─ 图数据/邻居/同包/跨包     │
      │  ─ 产出 CandidateSet[]      │
      └────────────┬────────────────┘
                   │ 每个候选
                   ▼
      ┌─────────────────────────────┐
      │  ContinuityEngine (B, 复用)  │  ← C5：不另造
      │  collectRelationEvidence     │
      │  → RelationEvidence[]        │
      └────────────┬────────────────┘
                   ▼
      ┌─────────────────────────────┐
      │  C 决策层 (C, 新)            │
      │  candidateRanking.ts         │
      │  ─ composeFeatures          │
      │  ─ 按上下文规则加权          │
      │  ─ 排序 → 最值得理解的       │
      │  → ExplorationAction         │  ← M88.2 已定型结构
      └────────────┬────────────────┘
                   ▼
        NextStepPanel / RecommendedNext
```

**边界一句话**：引擎（B）只交"当前知识能证明什么"；C 决策层消费证据，决定"现在最值得理解哪个"。**JCS 永远不进入 C**。

---

## 4. 模块设计

### 4.1 候选生成器 `candidateGeneration.ts`

```ts
export interface ExplorationCandidate {
  /** 目标实体 global_id。 */
  gid: string
  /** 展示名。 */
  name: string
  /** 候选来源（可审计）。 */
  origin: 'package_next' | 'relationship_neighbor' | 'cross_topic_bridge' | 'dimension_target'
  /** 来源说明（trace 用）。 */
  hint?: string
}

export function generateCandidates(
  current: { gid: string; name: string },
  ctx: {
    /** 同包后续站（原写死路线的候选之一，不再自动是"下一站"）。 */
    packageNext?: { gid: string; name: string } | null
    /** 实时图邻居（来自 entityCache / entity relationships）。 */
    neighbors?: { gid: string; name: string }[]
    /** 跨主题桥接实体。 */
    bridges?: { gid: string; name: string }[]
    /** 预写维度目标（ExplorationState.dimensionMapping 解析后）。 */
    dimensionTargets?: { gid: string; name: string }[]
    /** 已探索锚点（去重）。 */
    explored?: string[]
  },
): ExplorationCandidate[]
```

- **候选来源优先级（只是生成顺序，非最终排序）**：dimension_target（用户缺口最值得）→ package_next（原有下一站）→ relationship_neighbor（图邻居）→ cross_topic_bridge。
- **去重**：`explored` 中已访问的 gid 直接排除。
- 空候选（全部被探索/无数据）→ 返回 `[]` → 调用方回退原路线（不崩溃、不瞎指）。

### 4.2 C 决策层 `candidateRanking.ts`

```ts
export interface RankedCandidate {
  candidate: ExplorationCandidate
  /** 该候选与当前实体的关系证据（B 产出，可审计）。 */
  evidence: RelationEvidence[]
  /** 连续性特征（B 产出）。 */
  features: ContinuityFeatures
  /** C 决策层的"值得理解度"——按上下文规则计算，非引擎分数。 */
  worthiness: number
  /** 为什么它最值得（供 reason/narrativeHook）。 */
  topReason: string
}

export function rankCandidates(
  current: { gid: string; name: string },
  candidates: ExplorationCandidate[],
  ctx: {
    /** 用户缺口维度（GapLedger / ExplorationState）——最高优先级信号。 */
    openGaps?: string[]
    /** 当前主题覆盖情况。 */
    coverage?: { ratio: number; missing: string[] }
  },
): RankedCandidate[]
```

**排序规则（C 决策层的上下文规则，不进引擎）**：
1. **用户缺口优先**：候选命中 `openGaps` 对应维度 → `worthiness` 最高（0.9–1.0）。
2. **证据强度**：`composeFeatures(evidence).relationshipStrength`（有可靠关系 > 弱桥 > 无关系）。
3. **解释可理解**：`explanationQuality`（有 claim 可讲 > 短句 > 诚实陈述）。
4. **已覆盖惩罚**：与已探索维度重叠 → 降权。
5. **无证据候选**：`worthiness` 压到最低（但仍保留，避免死路——此时 reason 走诚实表达口径）。

> ⚠️ 注意：**排序输入是 `RelationEvidence[]` 与 `ContinuityFeatures`，绝不含 JCS**（C3）。`deriveJourneyContinuityScore` 不出现在本模块任何位置——测试锁定。

### 4.3 `ExplorationPolicy` 接入

- 在 `evaluateExploration` 的 Rule 0（用户缺口）之后、Rule 1 之前插入 **C 候选决策**：
  - 调 `generateCandidates` → `rankCandidates` → 取第一名 → 产出 `ExplorationAction`（type 按候选性质映射：dimension_target→open_dimension / 图邻居→follow_cause / 包下一站→deep_continue）。
  - `reason` / `narrativeHook` 用 `topReason` + 候选 evidence 的 B 层解释素材（复用 `buildExplanationCandidates`，让"为什么去这里"可解释——直接回应 PO 的"用户看不懂"）。
- **回退链**：候选为空 → 现有 Rule 1–5 原样兜底（不动旧逻辑，只增不改）。

---

## 5. 测试计划（C 层审计 + 功能）

| 项 | 断言 |
|---|---|
| **C1** | `candidateRanking.ts` / `candidateGeneration.ts` 不含 `nextStep`/`selectDestination`（引擎白名单语义继续）——排序函数在 C 层属**合法**（C1 禁的是引擎），但需断言它们不 import `continuityEngine` 之外的关系逻辑 |
| **C3** | `candidateRanking.ts` 无 `deriveJourneyContinuityScore` / `JCS` 引用（读源码断言，延续 B 期测试） |
| **C5** | `candidateRanking` import 的是 `continuityEngine` 的 `collectRelationEvidence`（读源码断言，单引擎复用率 100%） |
| **C7** | 多证据候选：同一候选存在 CAUSAL+TEMPORAL 等多条证据时全部保留、不折叠 |
| 功能 | 候选生成：dimension_target 命中 openGaps → 排第一；package_next 保留为候选之一；explored 去重生效 |
| 功能 | 排序：证据强 > 弱桥 > 无证据；无证据候选仍返回（不死路） |
| 功能 | 回退：候选空 → 调用方回退 `stations[idx+1]` |
| 回归 | 旧 Rule 1–5 测试全绿（只增不改） |

---

## 6. 施工步骤（TDD）

| 步骤 | 动作 |
|---|---|
| C-S1 | 新建 `candidateGeneration.ts` 类型 + 测试（红）→ 实现（绿） |
| C-S2 | 新建 `candidateRanking.ts` 类型 + 测试（红）→ 实现（绿） |
| C-S3 | `ExplorationPolicy` 接入候选层（Rule 0 后插入）+ 回退链 |
| C-S4 | 调用方切换：`NextStepPanel` / `RecommendedNext` 的"下一站"来源改 C 产出（stations 保留为回退） |
| C-S5 | 样式：候选 reason/narrativeHook 展示（复用 B 层解释素材） |
| C-S6 | 全量回归：tsc + vitest + freeze-check（新文件进 allowlist） |
| C-S7 | build_tunnel 重建 + 隧道验证：找一个"下一站"看 reason 是否可解释 |
| C-S8 | commit + push |

---

## 7. 文件面预估

| 文件 | 动作 |
|---|---|
| `frontend/src/next/exploration/candidateGeneration.ts` | 新增 |
| `frontend/src/next/exploration/candidateRanking.ts` | 新增 |
| `frontend/src/next/exploration/ExplorationPolicy.ts` | 修改（接入候选层） |
| `frontend/src/components/NextStepPanel.tsx` / `RecommendedNext.tsx` | 修改（下一站来源） |
| 测试 2–3 个文件 | 新增 |
| `scripts/freeze-check.mjs` | allowlist +新文件 |

全部在 freeze 白名单内（`frontend/src`），不碰 backend、不引依赖、不碰 AI。

---

## 8. 待 PO 确认

| # | 决策 | 推荐 |
|---|---|---|
| C-P1 | 候选排序是否引入"用户缺口优先"（openGaps 最高权重） | ✅ 是（认知闭环 Phase D 的前置，M88.2 Rule 0 已埋点） |
| C-P2 | 无证据候选是否仍展示（worthiness 最低）还是直接过滤 | ✅ 仍展示（避免死路；reason 走诚实表达） |
| C-P3 | `stations` 是否保留为回退兜底 | ✅ 保留（候选空时回退，绝不崩溃） |

> 无异议则按推荐施工；有异议随时叫停。
