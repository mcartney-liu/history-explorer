# Phase B 探索连续性引擎 —— Implementation Design（施工设计）

> 状态：**Ready for Implementation**（ADR-0023 v3.1 Accepted 后的施工蓝图）
> 前置条件：P1 收口（PO 决策门通过）后启动
> 依据：`docs/15_DECISIONS/ADR-0023_phase_b_continuity_engine_review.md`（v3.1，§9 C1–C6 为审计硬约束）
> 现有种子：`frontend/src/data/transition.ts`（`describeTransition`，4 层过渡逻辑）
> 第一调用方：`frontend/src/components/package/ConnectionCard.tsx`、`frontend/src/components/EntityPage.tsx`

---

## 0. 一句话目标

把现有 `describeTransition`（输出单条解释文本）**正式化为可复用的 `ContinuityEngine`**（输出可审计的 `RelationEvidence[]` 证据集合 + `ContinuityFeatures` 特征向量），并补齐两块短板：**无关系诚实表达（HonestNone）** 与 **连续性特征（ComposeFeatures）**。B（固定路线解释）与未来的 C（动态探索候选排序）共用这一个引擎，**引擎不决策**。

---

## 1. 代码核对结论（2026-08-15 实测，方向不偏移的依据）

| 事实 | 现状 | 与 ADR 的差距 |
|---|---|---|
| 种子引擎 | `transition.ts#describeTransition(fromName, toName, edge, commonNeighbor?)` | 输出 `{claim, short, text, confidence}` **单条已选定文本**，非证据集合；且隐含"引擎替你选了哪层解释"（v1 4 层优先级） |
| 调用点 | 仅 2 处：`ConnectionCard.tsx:96`（站间衔接）、`EntityPage.tsx:175`（入口桥） | 改动面小、可控；两者都只在 `text` 非空时渲染 |
| 无关系处理 | `text: null` → 组件**静默不渲染** | ⚠️ 违反 C6"绝不静默"——23.6% BROKEN 段的体验缺口 |
| 证据来源 | `getEvidenceWithSources(ids)`（claim+置信）、`relLabel(type)`（18 类中文标签）、`getEntityNeighbors(gid)`（共同邻居缓存） | 数据齐备，引擎可基于它们构造 `provenance/source` |
| 关系类型 | 冻结 18 类关系边（`relationshipLabels.ts`） | 需映射到 ADR 的 `RelationKind` 8 类枚举 |
| C 种子 | `next/exploration/ExplorationPolicy.ts#evaluateExploration` → `ExplorationAction{reason,narrativeHook,confidence}` | 尚未消费引擎证据；Phase B 不动它（C 施工时再接入） |
| 测试 | `transition.ts` 无独立测试；无 `ConnectionCard` 测试 | 新增引擎测试即基线，C1–C6 审计断言落进测试 |

---

## 2. 施工范围（做什么 / 不做什么）

### 做
1. 新建 `frontend/src/data/continuityEngine.ts` —— 引擎本体（类型 + 6 个函数）。
2. `ConnectionCard.tsx` 改调引擎：站间衔接输出改为「证据 → B 解释选择层 → 渲染」，**NONE 时渲染诚实陈述**。
3. `EntityPage.tsx` 入口桥同步改调（复用同一引擎，行为一致）。
4. 新增 `frontend/src/data/__tests__/continuityEngine.test.ts` —— 功能测试 + **C1–C6 审计断言**。
5. `styles/components.css` 补诚实陈述样式（沿用 token，无硬编码色）。

### 不做（红线/边界，锁死）
- ❌ 不新增 `rankCandidates` / `nextStep` / 候选排序 / 导航决策（C1）。
- ❌ 引擎内不"选定唯一解释"——`explain()` 只产素材集合，选择逻辑在 **B 解释选择层（组件内）**（C2）。
- ❌ 不动 `ExplorationPolicy`（C 施工时再接）；JCS 不进入任何 `ExplorationAction`/排序/阈值（C3）。
- ❌ 不引 Neo4j/PG/ES/RAG/GIS/新依赖；不碰 AI/LLM（红线）。
- ❌ 不动 `Relationship Layer`（不建边/推演/因果）。
- ✅ 保持 `describeTransition` 为薄兼容封装（内部委托引擎），避免破坏现有引用与任何隐藏调用。

---

## 3. 引擎接口设计（对照 ADR Q5 + C1–C6）

```ts
// ── 类型层 ──
export type RelationKind =
  | 'DIRECT_HISTORICAL'   // 直接历史关系边（关系短句，有 provenance）
  | 'CAUSAL'              // 因果（由边类型/claim 判定）
  | 'TEMPORAL_INHERIT'    // 时间继承（时间相邻/跨度可接受）
  | 'GEOGRAPHIC'          // 地理共属（同地域/数据集）
  | 'SHARED_ENTITY'       // 共同实体（同一实体出现在两段）
  | 'THEMATIC'            // 主题相关（同包/同主题）
  | 'WEAK_BRIDGE'         // 弱桥（仅共同邻居，无直接边）
  | 'NONE'                // 无可靠关系（合法状态，非 Bug）

export interface RelationEvidence {
  kind: RelationKind
  /** 描述性度量 0..1：边权重/时间跨度/共现强度等，单条证据自身强度，非裁决。 */
  strength: number
  /** C4 可审计：数据源标识。 */
  provenance: 'relationship_paths' | 'entity_relationships' | 'entityCache_common_neighbor' | 'claims' | 'none'
  /** C4 可审计：具体实体/声明 id。 */
  source: string
  /** 可选：中文 claim 或关系短句（explain 的素材来源）。 */
  claim?: string
  /** 可选：claim 学术共识分级（strong/moderate/weak）。 */
  confidence?: TransitionConfidence
}

export interface TemporalEvidence { /* 时间连续性：跨度、是否相邻 */ }
export interface SpatialEvidence { /* 空间连续性：同数据集/跨数据集 */ }

/** 核心输出：特征向量，非决策分数（D4）。 */
export interface ContinuityFeatures {
  relationshipStrength: number   // 0..1 是否有被证明的关系、强度
  explanationQuality: number     // 0..1 是否有可理解的人话解释（NONE 的诚实陈述也计质量）
  temporalContinuity: number     // 0..1 时间连贯度
  spatialContinuity: number      // 0..1 空间/数据集连贯度
  contextRelevance: number | null // Phase B 退化保留维，恒 null（C 施工时填）
}

// ── 函数层（引擎本体）──

/** Q1：收集全部关系证据（不预选、不裁决）。C5：B/C 共用入口。 */
export function collectRelationEvidence(
  from: { gid: string; name: string },
  to: { gid: string; name: string },
  context: {
    edge?: TransitionEdge | null           // 调用方查得的直接关系边
    commonNeighbor?: { gid: string; name: string } | null  // 共同邻居桥
    claims?: string[]                       // 可选：claim id 列表
  },
): RelationEvidence[]

/** Q4：时间连续性证据。 */
export function collectTemporalEvidence(
  from: { gid: string; name: string },
  to: { gid: string; name: string },
): TemporalEvidence

/** Q4：空间连续性证据。 */
export function collectSpatialEvidence(
  from: { gid: string; name: string },
  to: { gid: string; name: string },
): SpatialEvidence

/** Q4 核心：证据 → 特征向量。CR 维返回 null（Phase B 退化）。 */
export function composeFeatures(evidence: RelationEvidence[]): ContinuityFeatures

/** Q2：证据 → 解释素材集合。C2：返回数组，不选定唯一解释。 */
export function explain(evidence: RelationEvidence[]): TransitionExplanation[]

/** Q3：NONE → 诚实陈述（知识事实层，不暴露内部实现）。C6 核心。 */
export function expressHonestNone(fromName: string, toName: string): HonestStatement

/** D4/D8：可选派生诊断值（默认导出 null，不参与任何决策）。C3 禁消费。 */
export function deriveJourneyContinuityScore(features: ContinuityFeatures): number | null
```

### 关键实现要点

1. **`collectRelationEvidence` 产出多条并列证据**（如 `CAUSAL` + `TEMPORAL_INHERIT` 并存），
   顺序不代表优先级；默认展示次序仅作 tie-breaker，不进评分。
2. **`RelationKind` 由边类型 + 数据源推导**：边存在 → 由 `relationshipLabels` 的 18 类
   映射到 8 类（如 `早于/晚于` → `TEMPORAL_INHERIT`，`导致/引发` → `CAUSAL`，其余 → `DIRECT_HISTORICAL`）；
   无直接边但有共同邻居 → `WEAK_BRIDGE`；皆无 → `NONE`。
3. **`strength` 计算**：`DIRECT_HISTORICAL`=1（冻结边=图事实）、`WEAK_BRIDGE`=0.5、
   有 claim=claim 置信映射（high→0.9/medium→0.7/low→0.5）、`NONE`=0。**这是对单条证据的描述，不是跨证据裁决。**
4. **`expressHonestNone` 只给知识事实**：
   > "当前知识中，没有找到「A」与「B」之间足够可靠的直接联系。"
   可附方向说明："这是一次探索方向的切换。"（不暴露作者编排/探索包内部结构）
5. **B 解释选择层（组件内，不进引擎）**：`ConnectionCard` 里加一个小选择器——
   有 `explain()` 素材时按 confidence 排序取最高；无素材（NONE）时调 `expressHonestNone` 渲染诚实陈述。

---

## 4. 调用方改造（B 层）

### 4.1 `ConnectionCard.tsx`（第一调用方）

现状（`:95-99`）：`describeTransition(prev.name, entityName, prevEdge?, prevCommon)` →
`prevTransition.text` 非空才渲染。

改后：
```ts
const evidence = collectRelationEvidence(
  { gid: prev.gid, name: prev.name },
  { gid: entityGlobalId, name: entityName },
  {
    edge: prevEdge ? { type: prevEdge.type, evidence: prevEdge.evidence } : null,
    commonNeighbor: prevCommon,
  },
)
// B 解释选择层（组件内小函数）：素材优先，NONE 走诚实表达
const explanation = selectBestExplanation(explain(evidence))   // 组件内选择器
const honest = evidence.some((e) => e.kind === 'NONE')
  ? expressHonestNone(prev.name, entityName)
  : null
```
渲染：`explanation` 非空 → 现有过渡文本区（含 confidence 徽标）；
`honest` 非空 → 新增诚实陈述样式区（`.connection-card-transition--honest`）。

### 4.2 `EntityPage.tsx`（入口桥）

现状（`:165-177`）：`originBridge.bridge` 非空才渲染，否则 fallback 文案。
改后：同样走引擎 + `selectBestExplanation` + `expressHonestNone`，语义一致。

> 复用原则：两个调用方共享引擎 + 共享 B 选择器（`selectBestExplanation` 提为
> `continuityEngine.ts` 内导出的纯函数，属于"B 层公共工具"而非引擎决策——它不产生
> 导航/排序，只做"从素材里选一条展示"，符合 C2"选择在 B 层"）。

---

## 5. 测试计划（C1–C6 审计断言落进单测）

新增 `frontend/src/data/__tests__/continuityEngine.test.ts`：

| 审计项 | 测试断言（硬判定） |
|---|---|
| **C1** Engine 不决定去哪 | 静态断言：引擎文件源码不包含 `nextStep` / `rankCandidates` / `selectDestination` / `stations` 引用（读文件断言） |
| **C2** Engine 不选定唯一解释 | `explain()` 返回**数组**；`ConnectionCard` 的选择逻辑在组件/工具层而非引擎内（读源码断言） |
| **C3** JCS 不进入导航决策 | `deriveJourneyContinuityScore` 默认返回 `null`；`ExplorationPolicy.ts` 内无 JCS 引用（读源码断言） |
| **C4** Evidence 可审计 | 每条 `RelationEvidence` 均含非空 `provenance` + `source`（遍历断言） |
| **C5** B/C 共用同一引擎 | `ConnectionCard` / `EntityPage` import 的是 `continuityEngine` 的同一导出（读源码断言） |
| **C6** NONE 绝不静默 | 构造 NONE 用例 → `expressHonestNone` 返回非空诚实陈述，且文本含"没有找到"、不含"探索包/作者/编排"字样 |
| 功能 | `collectRelationEvidence` 对 直接边/共同邻居/皆无 三种输入输出正确 kind；`composeFeatures` 各维在 [0,1] 且 CR=null |

---

## 6. 施工步骤（Implementation Steps）

| 步骤 | 动作 | 验证 |
|---|---|---|
| S1 | 新建 `continuityEngine.ts`（类型 + 6 函数 + `selectBestExplanation`） | `tsc --noEmit` 通过 |
| S2 | `ConnectionCard.tsx` 改调引擎 + NONE 诚实表达渲染 | 单测 + 组件渲染检查 |
| S3 | `EntityPage.tsx` 入口桥同步 | 同上 |
| S4 | 新增 `continuityEngine.test.ts`（含 C1–C6 断言） | `vitest` 全绿 |
| S5 | 样式：`.connection-card-transition--honest` 等（token） | 视觉检查 |
| S6 | 回归：`tsc` + `vitest`（全量）+ `freeze-check` PASSED | 全绿 |
| S7 | `bash build_tunnel.sh` 重建 + 隧道验证（找一个 NONE 跳转看诚实陈述） | 公开页可见 |
| S8 | commit + push 共享分支（`phase5-journey-continuity`） | 提交后 `git show --stat` 复核 |

---

## 7. 文件面预估

| 文件 | 动作 | 说明 |
|---|---|---|
| `frontend/src/data/continuityEngine.ts` | **新增** | 引擎本体（约 250–350 行） |
| `frontend/src/data/__tests__/continuityEngine.test.ts` | **新增** | 测试 + C1–C6 审计断言 |
| `frontend/src/components/package/ConnectionCard.tsx` | 修改 | 第一调用方接入（约 ±30 行） |
| `frontend/src/components/EntityPage.tsx` | 修改 | 入口桥接入（约 ±20 行） |
| `frontend/src/data/transition.ts` | 修改 | 保留为薄兼容封装（委托引擎） |
| `frontend/src/styles/components.css` | 修改 | 诚实陈述样式（约 +20 行） |

全部在 freeze 白名单内（`frontend/src`、`styles/`）。**不碰 backend、不引新依赖。**

---

## 8. 待 PO 确认（无阻塞，开工前过目即可）

| # | 决策 | 推荐 |
|---|---|---|
| P-1 | `selectBestExplanation`（B 选择器）放引擎文件内导出 vs 组件内定义 | 引擎文件内导出为**纯工具函数**（非引擎决策），两个调用方复用——推荐 |
| P-2 | 诚实陈述文案定稿 | "当前知识中，没有找到「A」与「B」之间足够可靠的直接联系。"（可附"这是一次探索方向的切换。"）——推荐 |

> 开工时若无异议，按推荐项执行即可；有异议随时叫停。
