# Phase C 动态探索方向 —— Implementation Design v3（对齐 ADR-0024 v6 Accepted + PO v7 施工前 Contract Freeze）

> 状态：**Ready after Design Clarification**（PO v7 评审：4 项补齐——B1 confidence 两维映射 / B2 多 provenance→Action.type / C3 Rule 0 vs C.L1 职责 / C4 机器契约冻结表）
> 承接：ADR-0023（Phase B 已施工 550ad11）+ ADR-0024 v6（**Accepted**，D1–D23 全 Accept）+ Phase C Reality Audit（事实基线）
> 一句话：把"下一步去哪"从 `stations[idx+1]` 换成 **候选生成 → B 证据 → Context 特征 → 分层词典序 Ranking → Action Builder → ExplorationAction**。
> 红线总纲（PC1–PC8）：**B=Evidence Producer；C=Decision Consumer；JCS 永远只在诊断层；Ranking 永远 deterministic；Ranking ≠ Action Construction；不引 AI/LLM。**

---

## 0. 前置事实（Reality Audit 实证，不臆测）

- **候选四源全现成、零新后端**：`relationship_neighbor`（entityCache）/ `cross_topic_bridge`（/explore 响应）/ `dimension_target`（dimensionMapping）/ `package_next`（buildStations）。
- **上下文全现成**：currentTopic / openGaps（GapLedger）/ exploredAnchors / history / dimensionState。
- **限制**：时间仅中心实体级、空间不可得 → TC/SC 保持 null，C 不假装时间/空间语义。
- **复用**：B 引擎 `collectRelationEvidence` / `composeFeatures` / B 解释层 `buildExplanationCandidates` / `selectBestExplanation` / `expressHonestNone`。

---

## 1. 文件面与模块（C-S1..C-S8）

| 文件 | 动作 | 内容 |
|---|---|---|
| `frontend/src/next/exploration/candidateGeneration.ts` | 新增 | 候选生成器（四源 + 去重 + sources[] provenance，PC1） |
| `frontend/src/next/exploration/candidateContext.ts` | 新增 | Context 特征派生（CandidateContextFeatures + GapPriority，PC4/D20） |
| `frontend/src/next/exploration/candidateRanking.ts` | 新增 | 分层词典序 Ranking（L1–L5，PC7/PC8）+ confidence 离散映射 |
| `frontend/src/next/exploration/ExplorationPolicy.ts` | 修改 | Rule 0 后插入 C 候选决策 + 回退链（D8，只增不改） |
| `frontend/src/components/NextStepPanel.tsx` / `RecommendedNext.tsx` | 修改 | "下一站"来源改 C 产出（stations 保留回退，D11） |
| 测试 3 个新文件 | 新增 | candidateGeneration.test / candidateContext.test / candidateRanking.test（PC1–PC8 断言） |
| `scripts/freeze-check.mjs` | 修改 | allowlist + 新文件 |

全部在 freeze 白名单内（`frontend/src`），不碰 backend、不引依赖、不碰 AI。

---

## 2. 模块设计

### 2.1 候选生成器 `candidateGeneration.ts`（PC1）

```ts
/** 冻结枚举（D14，防 schema 漂移）。 */
export type CandidateSource =
  | 'relationship_neighbor'
  | 'cross_topic_bridge'
  | 'dimension_target'
  | 'package_next'

export interface ExplorationCandidate {
  /** 目标实体 gid（去重键）。 */
  targetRef: string
  /** 展示名。 */
  name: string
  /** 该候选的全部来源（去重后保留，provenance 不丢，D14）。 */
  sources: CandidateSource[]
  /** 来源说明（trace 用）。 */
  hint?: string
}

/** PC1：只产候选集合，绝不构造/返回 ExplorationAction。 */
export function generateCandidates(
  current: { gid: string; name: string },
  ctx: {
    packageNext?: { gid: string; name: string } | null
    neighbors?: { gid: string; name: string }[]
    bridges?: { gid: string; name: string }[]
    dimensionTargets?: { gid: string; name: string }[]
    explored?: string[]      // 已访问 gid（去重）
  },
): ExplorationCandidate[]
```

- **去重**：以 `targetRef` 为键合并多来源（`sources[]` 保留全部）；`explored` 直接排除。
- **空候选** → `[]` → 调用方回退 `stations[idx+1]`（D11，不崩溃）。
- **PC1 断言**：本模块无 `ExplorationAction` 构造/返回。
- **`sources[]` 顺序本身不是 ranking evidence（PO v7 钉死）**：多来源候选的 `sources[]` 数组顺序由生成器的稳定遍历顺序决定（固定：dimension_target → relationship_neighbor → cross_topic_bridge → package_next），**不得**把 `sources[0]` 当作主要来源参与任何排序。

#### 2.1.1 多 provenance → `Action.type` 确定性规则（PO v7 Blocking #2 定案）

`ExplorationAction` 没有 `sources` 字段，多来源候选的 `type` 必须确定性选择：

```
Action.type 构造规则（source precedence，仅用于构造，绝不进入 L1–L4，PC5 延续）：
  if sources contains 'dimension_target'    → 'open_dimension'
  else if sources contains 'relationship_neighbor' → 'follow_cause'
  else if sources contains 'cross_topic_bridge'   → 'compare_context'
  else                                         → 'deep_continue'   // package_next
```

- 该 precedence 与 L5 tie-breaker 的 precedence **一致**（dimension_target → relationship_neighbor → cross_topic_bridge → package_next），但用途不同：**L5 用于排序 tie-break；此处用于 Action.type 构造**。
- **两条红线（PO v7 钉死）**：
  1. `source precedence` 用于 Action 构造**不得**重新进入 L1–L4 Ranking（PC5 延续）。
  2. **Ranking ≠ Action Construction**：`rankCandidates` 只产出 `RankedCandidate`（排序结果），`Action Builder` 单独负责把第一名映射成 `ExplorationAction`——两个职责分离，便于审计。

### 2.2 Context 特征派生 `candidateContext.ts`（PC4 + D20）

```ts
/** 缺口优先级离散等级（D17，PO v4 离散化）。 */
export type GapPriority = 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

/** 离散等级（L2/L3 通用）。 */
export type DiscreteLevel = 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH'

export interface CandidateContextFeatures {
  /** 候选命中用户缺口（GapPriority；D17 五档）。 */
  gapPriority: GapPriority
  /** 候选覆盖缺失维度程度（离散等级）。 */
  dimensionRelevance: DiscreteLevel
  /** 候选与当前主题相关度（离散等级）。 */
  topicRelevance: DiscreteLevel
  /** 候选与当前探索路径延续度（离散等级）。 */
  pathRelevance: DiscreteLevel
  /** 新颖度（与已探索方向重叠的反向，离散等级）。 */
  novelty: DiscreteLevel
  /** 是否已在 exploredAnchors（0/1 惩罚项）。 */
  alreadyExploredPenalty: number
}

/** D20（Blocking #1）：GapPriority 必须由候选与 openGaps 的【显式关联】确定性推导。
 *  - 候选 targetRef 必须是某 openGap 的显式目标实体 → 才算命中；
 *  - 候选 → 0..N gaps → 取 max；
 *  - 禁止语义相似度推断 / 自由启发式；
 *  - L1 无 gap 数据按 NONE（产品语义例外：无缺口记录即不优先；不得扩展 L2–L4）。 */
export function deriveGapPriority(
  candidate: ExplorationCandidate,
  openGaps: { entityGid: string; priority: GapPriority }[],
): GapPriority

/** PC4：特征缺失 → null（不是 0、不编默认值）。 */
export function deriveCandidateContext(
  candidate: ExplorationCandidate,
  ctx: {
    openGaps: { entityGid: string; priority: GapPriority }[]
    dimensionState?: { missing: string[]; covered: string[] } | null
    currentTopic?: string | null
    history?: string[] | null
    explored?: string[] | null
  },
): CandidateContextFeatures
```

**Context 特征完整机器契约（PO v7 Clarification #4 定稿：来源 + 映射全部冻结，Agent 零自由发挥）**：

| 特征 | 数据来源 | 离散映射（冻结） | null 语义 |
|---|---|---|---|
| `gapPriority` | openGaps（显式关联，D20） | NONE/LOW/MEDIUM/HIGH/CRITICAL 五档 | 无 gap 记录 → NONE（唯一例外） |
| `dimensionRelevance` | dimensionState.missing（候选所属维度是否缺失） | 命中 missing → HIGH；命中 covered → LOW；无维度信息 → null | null → L2 子层 tie |
| `topicRelevance` | currentTopic（候选主题 == 当前主题？） | 同主题 → HIGH；跨主题但桥接 → MEDIUM；无关 → NONE；无主题 → null | null → tie |
| `pathRelevance` | history（候选是否在最近 N 步路径上） | 在最近 3 步 → HIGH；在更早路径 → MEDIUM；不在 → NONE；无 history → null | null → tie |
| `novelty` | explored（候选与已探索方向重叠度反向） | 0 重叠 → HIGH；部分 → MEDIUM；高重叠 → LOW；全重叠 → NONE；无 explored → null | null → tie |
| `alreadyExploredPenalty` | exploredAnchors | 在 → 1；不在 → 0 | — |

> **dimension/topic/path/novelty 的"缺失 = null = tie"规则与 D16 全局 null 语义一致**；无数据就是无数据，不编默认值、不按 0 处理。
```

### 2.3 分层词典序 Ranking `candidateRanking.ts`（PC7 + PC8 + D21/D22/D23）

```ts
export interface RankedCandidate {
  candidate: ExplorationCandidate
  /** B 产出：该候选与当前实体的关系证据（可审计）。 */
  evidence: RelationEvidence[]
  /** B 产出：连续性特征（TC/SC=null 不参与）。 */
  features: ContinuityFeatures
  /** C 产出：上下文特征。 */
  context: CandidateContextFeatures
  /** 胜出层（trace 用：1..5）。 */
  winningLayer: 1 | 2 | 3 | 4 | 5
  /** 决策置信度（离散三档，D13）。 */
  confidence: 'HIGH' | 'MEDIUM' | 'LOW'
  /** 为什么它最值得（供 reason/narrativeHook）。 */
  topReason: string
}

/** PC7 分层契约：L1 GapPriority → L2 Context → L3 Continuity → L4 Novelty → L5 tie。
 *  PC8：纯函数——只读 declared inputs，禁 Date.now/random/global/LLM/网络顺序。
 *  D21：离散化由本模块【机械查表】完成（B 出连续事实，C 出决策等级，禁重判关系）。
 *  D22：source precedence 只在 L5，非业务理由。
 *  D23：同输入必须同输出。 */
export function rankCandidates(
  current: { gid: string; name: string },
  candidates: ExplorationCandidate[],
  ctx: {
    openGaps: { entityGid: string; priority: GapPriority }[]
    dimensionState?: { missing: string[]; covered: string[] } | null
    currentTopic?: string | null
    history?: string[] | null
    explored?: string[] | null
    /** 候选 → 关系证据的查询函数（注入 B 引擎，保证单引擎复用 + 可测）。 */
    collectEvidence: (c: ExplorationCandidate) => { evidence: RelationEvidence[]; features: ContinuityFeatures }
  },
): RankedCandidate[]
```

**L1–L5 分层比较契约（机器无法误解，对应 ADR §3.3.1）**：

| 层 | 比较 | 值域 | null 处理 |
|---|---|---|---|
| L1 | GapPriority | NONE<LOW<MEDIUM<HIGH<CRITICAL | 无 gap 数据 → NONE（唯一例外） |
| L2 | dimension → topic → path 子层 | NONE<LOW<MEDIUM<HIGH | null → 子层 tie，进下一子层 |
| L3 | RS → EQ 子层（机械查表，D21） | NONE<LOW<MEDIUM<HIGH | null → 子层 tie |
| L4 | Novelty | NONE<LOW<MEDIUM<HIGH | null → tie |
| L5 | source precedence（dimension_target→relationship_neighbor→cross_topic_bridge→package_next）→ stable targetRef | 恒可判定 | — |

**D7 跨层规则（机器可执行）**：
- `NONE-evidence + CRITICAL-gap` > `evidence + LOW-gap`（L1 分出）。
- `NONE-evidence + LOW-gap` < `evidence + MEDIUM-gap`（L1 分出）。
- 无证据候选 L3 天然垫底（RS=NONE）；L4 永不参与（L1–L3 全 tie 才比较，此时 L3 已输）。

**confidence 离散映射（D13，PO v7 Blocking #1 定案：两维离散决策，非单维层映射）**：

`Action.confidence` 由两个离散维度决定：**winning layer（哪一层定胜负）+ decisive/marginal（该层是否严格分档）**。

**separation 的机器可判定定义（Lexicographic 天然无连续距离，不引入 0.83 类伪精确）**：
- `decisive`：胜者在胜出层的主比较项上**严格高于**次名（离散档差 ≥ 1，如 CRITICAL vs HIGH、HIGH vs MEDIUM）。
- `marginal`：胜出层主比较项与次名**同档**，靠该层的后续子层（如 L2 的 topic/path）或 L5 tie-breaker 才分出。

**完整映射表（机器可执行，PO v7 定稿）**：

| winning layer | separation | Action.confidence |
|---|---|---|
| L1（GapPriority） | decisive（gap 严格分档；gap 同档即进 L2，故 L1 胜出恒为 decisive） | **HIGH** |
| L2（dimension 主比较项） | decisive（dimension 严格分档） | **HIGH** |
| L2 | marginal（dimension 同档、靠 topic/path 分出） | **MEDIUM** |
| L3（RS 主比较项） | decisive（RS 严格分档） | **MEDIUM** |
| L3 | marginal（RS 同档、靠 EQ 分出） | **LOW** |
| L4（Novelty） | decisive 或 marginal | **LOW** |
| L5（tie-breaker） | 纯 tie-break | **LOW** |

> **此表同时满足测试要求**：`same RelationEvidence.confidence, different ranking separation → different Action.confidence`——
> 例：A 与 B 的 RelationEvidence.confidence 相同（都 strong），但 A 在 L3 以 RS 严格分档胜出（decisive → MEDIUM）、B 在 L3 靠 EQ 分出（marginal → LOW）→ 两者 Action.confidence 不同。**两维映射消除原单维映射（L1/L2→HIGH）与测试要求的矛盾。**
> **禁止** `Action.confidence = RelationEvidence.confidence`。

**L2/L3 机械查表（D21，PO v7 Clarification #4：精确枚举，非阈值判断）**：

B 引擎 `composeFeatures` 实际只产出有限离散值，**直接枚举冻结**（Agent 零自由发挥空间）：

```ts
// 精确枚举冻结表（D21 定稿；非 if(strength>0.7) 式阈值判断）
const RS_TO_LEVEL: Record<number, DiscreteLevel> = {
  1: 'HIGH',      // 冻结边（relationship_edge）
  0.9: 'MEDIUM',  // claim high
  0.7: 'MEDIUM',  // claim medium
  0.5: 'LOW',     // claim low / weak bridge
  0.45: 'LOW',    // NONE 诚实表达
  0: 'NONE',      // 无证据
}
const EQ_TO_LEVEL: Record<number, DiscreteLevel> = {
  0.85: 'HIGH',   // 有 claim 素材
  0.6: 'MEDIUM',  // 有边标签
  0.45: 'LOW',    // NONE 诚实陈述
  0: 'NONE',      // 无素材
}
// 映射表外的任何值 → 拒绝（防 Agent 自造阈值）
```

> **D20（GapPriority）与 D21（RS/EQ）的完整机器契约在本设计冻结**；Agent 不得自行定义 `if (strength > 0.7)` 类阈值。

### 2.4 `ExplorationPolicy` 接入（D8：只增不改 + PO v7 Clarification #3 职责边界）

**Rule 0 与 C.L1 GapPriority 的职责边界（PO v7 钉死，防重叠）**：

```
Explicit user intent（用户显式指定必须处理的缺口）
        ↓
      Rule 0   ← 硬业务规则：用户明确说了去哪 → 直接执行，系统不自作聪明
        ↓
No explicit override（无显式指定）
        ↓
     Phase C
        ↓
  L1 GapPriority  ← 隐式上下文缺口：没有显式目标时，从当前 openGaps 判断哪个候选最值得
```

- **Rule 0 = 显式用户意图**：用户明确标记了一个必须处理的缺口 → 优先执行（现有 M88.2 Rule 0 逻辑，C 不接管）。
- **C.L1 = 隐式上下文缺口**：没有显式指定时，C 才用 GapPriority 对候选排序（隐式推断"哪个候选最值得继续"）。
- **产品哲学**：用户明确告诉系统去哪 → 系统不要自作聪明；用户没指定 → 系统才开始 Context-aware decision。

**接入流程**：
- Rule 0（用户缺口，显式意图）之后、Rule 1 之前插入 C 候选决策：
  `generateCandidates` → `deriveCandidateContext` → `rankCandidates` → 取第一 → **Action Builder**（多 provenance → type 确定性规则）→ 产出 `ExplorationAction`。
- `reason`/`narrativeHook`：`topReason` + B 层 `buildExplanationCandidates` 素材（"为什么去这里"可解释）。
- **回退链**：候选空 → 现有 Rule 1–5 原样兜底（旧逻辑一行不动）。
- **Ranking ≠ Action Construction**：`rankCandidates` 只产 `RankedCandidate`；Action Builder 单独把第一名映射成 `ExplorationAction`（职责分离，便于审计）。

---

## 3. 测试计划（PC1–PC8 审计断言 + 功能）

| 项 | 断言 |
|---|---|
| **PC1** | `candidateGeneration.ts` 无 `ExplorationAction` 构造/返回（读源码断言） |
| **PC2** | `candidateRanking.ts` 无 `RELATION_KIND_MAP` 导入/复制、无自写关系判定（读源码断言）；证据查询走注入的 `collectEvidence`（B 引擎） |
| **PC3** | `candidateRanking.ts` / `candidateContext.ts` 无 `deriveJourneyContinuityScore` / `JCS` 引用（读源码断言 = 0） |
| **PC4** | 无 dimensionState → dimensionRelevance=null 非 0；无 history → pathRelevance=null（断言） |
| **PC5** | package_next 与其它候选同公式：构造 L1–L4 全 tie 场景，L5 才区分；无 L1–L4 保底（断言） |
| **PC6** | C 模块无 understanding 判定、无认知闭环逻辑（读源码断言） |
| **PC7** | ①同输入两次运行同第一名（M7）；②null 层不按 0 比较（null vs HIGH → 进下一层）；③无证据候选 L4 永不超有证据候选；④same evidence confidence + different separation → different Action.confidence（两维映射验证）；⑤JCS=0 |
| **PC8** | 注入不同全局状态/时间/mock random → 同输入同输出；源码无 `Date.now`/`Math.random`/global refs |
| D20 | 候选非 gap 显式目标 → GapPriority=NONE（即使语义"像"相关）；多 gap 取 max |
| D21 | RS/EQ 精确枚举表映射正确（1→HIGH / 0.9,0.7→MEDIUM / 0.5,0.45→LOW / 0→NONE）；映射表外值拒绝；C 模块无 `if (strength > 0.7)` 式关系判断 |
| D22 | L5 结果不进入 topReason/UI reason（断言 topReason 不含来源描述） |
| **B1（Blocking #1）** | confidence 两维映射：①L1 decisive→HIGH；②L2 decisive→HIGH、L2 marginal→MEDIUM；③L3 decisive→MEDIUM、L3 marginal→LOW；④L4/L5→LOW；⑤同证据置信度 + 不同 separation → 不同 confidence（构造 L3 decisive vs L3 marginal 用例） |
| **B2（Blocking #2）** | 多 provenance → Action.type 确定性：sources=[relationship_neighbor, cross_topic_bridge] → follow_cause；sources=[dimension_target, package_next] → open_dimension；sources 顺序不参与排序（同集不同序 → 同排名） |
| **C3（Clarification #3）** | Rule 0（显式意图）命中时 C 不介入（Policy 测试：有 openGaps 显式目标 → 走 Rule 0 产出，不调 rankCandidates） |
| **C4（Clarification #4）** | dimension/topic/path/novelty 缺失 → null 非 0（断言）；RS/EQ 映射表外值抛错 |
| 功能 | 四源生成 + 去重合并 sources[] + explored 排除 + 空候选回退 |

---

## 4. 施工步骤（TDD，测试先行）

| 步骤 | 动作 | 验证 |
|---|---|---|
| C-S1 | `candidateGeneration.ts` 类型 + 测试（红）→ 实现（绿） | vitest 绿 + PC1 断言 |
| C-S2 | `candidateContext.ts` 类型 + 测试（红）→ 实现（绿） | PC4 + D20 断言 |
| C-S3 | `candidateRanking.ts` 类型 + 测试（红）→ 实现（绿） | PC7/PC8/D21/D22/D13 断言 |
| C-S4 | `ExplorationPolicy` 接入（Rule 0 后）+ 回退链 | 旧 Rule 1–5 测试全绿（只增不改） |
| C-S5 | `NextStepPanel` / `RecommendedNext` 切 C 产出 | 组件渲染检查 |
| C-S6 | 全量回归：tsc + vitest + freeze-check（allowlist + 新文件） | 全绿 |
| C-S7 | build_tunnel 重建 + 隧道验证（找"下一站"看 reason 可解释） | 公网可见 |
| C-S8 | commit + push 共享分支 | git show --stat 复核 |

---

## 5. 与 ADR 的关系（Contract Compliance = release gate）

- **PC1–PC8 = release gate**（架构正确性门禁）：C-S6 全绿才算过门禁。
- **M1a/M1b/M2/M3/M3b/M4 = 产品观察指标**（M1a 候选覆盖 / M1b 证据覆盖 / M2 可解释率 / M3 NONE 率观察 / M3b 探索价值命中 / M4 回退率 provisional）——**不与 PC 混为一谈**。
- M1a 金标集 = 独立于生成器的人工构造 fixture（防"自己证明自己"）。

---

> 状态：**Ready for Implementation**。ADR-0024 v6 Accepted + 本设计对齐完成，C-S1 TDD 可开工。
