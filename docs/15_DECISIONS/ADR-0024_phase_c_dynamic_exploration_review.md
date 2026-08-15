# ADR-0024 动态探索方向（Phase C）架构评审

> 状态：**Proposed（待 PO 逐条拍板）** · 修订：v3（吸收 PO 2026-08-16 第四轮：Ranking Contract 分层决策模型 + PC7 + Candidate provenance + D7 层间规则 + confidence 语义 + 指标修正）
> **Phase C 一句话定义（PO 定稿）**：**From authored sequence to context-aware exploration choice.**
> 中文：从固定路线探索，演进为基于当前上下文、候选空间与 Continuity Evidence 的动态探索方向选择。
> 范围：替换 `stations[idx+1]` 写死路线，让"下一步去哪"由 **候选生成 + Evidence + Context + Ranking → ExplorationAction** 驱动。
> 关联：ADR-0023（Phase B，**Accepted 已施工 550ad11**，B=Evidence Producer）、
>       `docs/product/PHASE_C_REALITY_AUDIT.md`（**已完成，事实基线**）、
>       `docs/product/PHASE_C_IMPLEMENTATION_DESIGN.md`（Draft，本 ADR 拍板后对齐）。
> 触发基线变更：是（新增 C 层候选生成/排序模块）。
> **流程**：PO 2026-08-15/16 双轮意见：先架构评审再施工设计 → 先 Reality Audit 再写 ADR → 都已执行，本 ADR 事实全部来自审计实证。

---

## 0. 为什么写这份评审（Context）

PO 实机查看 Phase B 诚实表达后提出灵魂拷问：**"用户看不懂'为什么带我到这里'——做这一大堆意义在哪？"**

诊断（PO 认可）："没有找到联系"（B 层）解决**不撒谎**；"为什么用户此刻在这里"（C 层）才是让用户"看懂"的根治。
**B 是 C 的地基**：C 判断"哪个候选值得去"必须消费 B 的 `collectRelationEvidence` 产出的证据。

**能力链（PO 定稿，不是三个独立模块）**：

```
Phase B         Phase C          Phase D
Why is A→B      Given A, what    Did this exploration
meaningful?     should we        actually improve
                explore next?    understanding?
   │                │                 │
   ▼                ▼                 ▼
Continuity      ExplorationAction   Cognition
Evidence            │                 │
   └────── Evidence → Decision → Cognition ──┘
```

**B = Evidence Producer；C = Decision Consumer。** ADR-0023 的 Evidence 中间层设计在此兑现价值。

---

## 1. 现状实证（Reality Audit 已完成，非臆测）

> 完整事实基线：`docs/product/PHASE_C_REALITY_AUDIT.md`。
> **候选四源全在现有前端数据层/后端现有响应（零新后端）；路径/维度/缺口上下文全现成；
> 时间仅中心实体级、空间不可得（与 B 期一致）；`ExplorationAction` 结构可直接复用。**

| 事实 | 现状 |
|---|---|
| 写死路线 | `stations[idx±1]`（JourneyRail.buildStations），"下一站"= 数组下一个，零实时判断 |
| C 层种子 | `ExplorationPolicy.evaluateExploration`（M88.2）：读预写 ExplorationState 的规则选择器，不生成候选集 |
| 候选源（Audit） | `relationship_neighbor`（entityCache）✅ / `cross_topic_bridge`（/explore 响应）✅ / `dimension_target`（dimensionMapping）✅ / `package_next`（buildStations）✅ —— **四源全现成，零新后端** |
| 上下文（Audit） | 当前节点/已探索（exploredAnchors+history）/路径（history/cursor）/主题/缺口（GapLedger openGaps）✅；时间仅中心实体级 ⚠️；空间 ❌ |
| B 引擎（复用） | `collectRelationEvidence → RelationEvidence[]` + `composeFeatures → ContinuityFeatures`（C5 单引擎） |
| 决策产物 | `ExplorationAction { type, targetRef, reason, narrativeHook, expectedGrowth, confidence }`（M88.2 定型，C 直接复用） |
| JCS | `deriveJourneyContinuityScore` 已标诊断启发式，B 期测试锁定 C 不消费（C3） |

---

## 2. C 的最终架构（PO 定稿）

```
Current Exploration Context
        │
        ▼
Candidate Generation
 ├─ relationship_neighbor
 ├─ cross_topic_bridge
 ├─ dimension_target
 └─ package_next        ← 候选，无特权（PC5）
        │
        ▼
ContinuityEngine (B，只产 Evidence/Features，PC2)
 ├─ RelationEvidence[]
 └─ ContinuityFeatures
        │
        ▼
C Context Layer
 ├─ Gap relevance
 ├─ Explored state
 ├─ Path context
 ├─ Topic context
 └─ Novelty / diversity
        │
        ▼
Candidate Ranking (C 决策层)
        │
        ▼
ExplorationAction
        │
        ▼
Navigation
```

**关键：B 是 Evidence Producer；C 是 Decision Consumer。** C 不碰引擎内部关系判断（PC2）。

---

## 3. 核心设计决策（PO 钉死）

### 3.1 候选生成（Candidate Generation）

- 多源候选 + 单集去重（`exploredAnchors` 已访问 gid 排除）。
- 允许跨包（relationship_neighbor / cross_topic_bridge 天然跨包），跳出去是**候选行为**、由排序决定，非自动。
- **`package_next` 无特权（PC5）**：与原写死路线同一套打分公式，**没有任何保底权重**。
  禁止"旧路线 → 包装成候选 → 每次仍排第一"的假 C 现象。
- **候选去重 ≠ 候选来源丢失（Candidate provenance，PO v3 钉死）**：去重以 `targetRef`（gid）为键，但保留 `sources[]` 数组：

  ```ts
  export interface ExplorationCandidate {
    targetRef: string       // 目标实体 gid（去重键）
    name: string            // 展示名
    sources: CandidateSource[]   // 该候选的全部来源（可审计）
    hint?: string           // 来源说明（trace 用）
  }
  export type CandidateSource =
    | 'relationship_neighbor'
    | 'cross_topic_bridge'
    | 'dimension_target'
    | 'package_next'
  ```

  同一 gid 命中多个来源时合并为一条候选、`sources` 保留全部来源。
  未来解释"为什么推荐这个"可能恰恰需要"它既是邻居、又是跨主题桥、还是包内下一站"——这是候选的 provenance，不丢。

### 3.2 C Context Layer —— ContextRelevance 是 C 的核心新能力（PO 钉死）

B 期 `contextRelevance = null`（固定路线无用户上下文）；C 期**第一次真正回答**：

> "对这个用户、在这个探索位置，现在什么最值得继续？"（而非"A 和哪些东西有关系？"）

**CR 必须是结构化特征，不是神秘的 0.83（延续 Evidence 化架构）**：

```ts
export interface CandidateContextFeatures {
  /** 候选是否命中用户缺口（GapLedger openGaps）。 */
  gapRelevance: number
  /** 候选与当前主题的相关度。 */
  topicRelevance: number
  /** 候选覆盖缺失维度的程度（dimensionState）。 */
  dimensionRelevance: number
  /** 候选与用户当前探索路径的延续度（history/cursor）。 */
  pathRelevance: number
  /** 候选的新颖度（与已探索方向的重叠惩罚的反向）。 */
  novelty: number
  /** 候选是否已在 exploredAnchors（直接惩罚项）。 */
  alreadyExploredPenalty: number
}
```

- **数据来源全部真实上下文**（PC4）：currentTopic / openGaps / exploredAnchors / history / dimensionState。
- **没有数据就是没有数据**：任何特征缺失 → `null`（不是 0、不编默认值），与 B 期 null 语义铁律一致。
- 未来 D / 实验系统可回答"为什么候选 A 排第一"——因为特征可审计。

### 3.3 Candidate Ranking —— Ranking Contract（PC7，PO v3 Blocking Issue 定死）

**硬句（PO 定稿，代码审查直接照抄）**：

> **C may consume the underlying `ContinuityFeatures`; C MUST NOT consume `JourneyContinuityScore`.**

#### 3.3.1 决策模型选型：分层 / 词典序（Lexicographic），非加权评分（PO v3 定案）

**不做加权评分**（`score = context*0.35 + continuity*0.30 + ...`）——权重必被拍脑袋、不可回归、且是"神秘 0.83"的翻版。
**采用分层 / 词典序决策**：从高到低逐层比较，**先满足高层的候选胜出**；某一层打平才进入下一层。

```
L1  用户缺口命中（openGaps）：命中缺口的候选最高
L2  Context relevance（gapRelevance → topicRelevance → dimensionRelevance → pathRelevance）
L3  Continuity（RS → EQ；TC/SC=null 不参与）
L4  Novelty / diversity
L5  Deterministic tie-breaker（candidate source precedence → stable target id 排序）
```

**为什么分层而非加权（PO v3 认可）**：
- 每层有明确业务理由 → 天然回答"为什么排第一"（可解释、可审计、可回归）。
- 无权重争议 → 不依赖拍脑袋数字。
- "连续 ≠ 值得探索"自然落地：缺口层（L1/L2）最高，强关系 trivial 在 L3 才出现，天然被压后。
- 每层是 if 判定 → 测试好写、行为确定（同一输入永远同一输出）。

#### 3.3.2 D7 层间规则（PO v3 关键定案：无证据候选的跨层语义）

**无证据候选没有"通用最低"特权，但它只能在"高层"胜出，永远不能仅因 Novelty（L4）超过有证据候选。**

- `无证据 + 极高缺口` **可以**压过 `有证据 + 低缺口`（L1/L2 层胜出）——产品上合理：用户标记想搞懂 X，X 虽无直接联系但正是用户要的；推荐它并诚实说明"无直接联系，但填补你标记的缺口"（reason 走诚实表达口径）。
- `无证据` 在 L3（Continuity）天然垫底（RS=0），在 L4 永远不能超过任何有证据候选（L4 只在 L1–L3 全平后才比较）。
- **即**：无证据候选允许超过有证据候选，**当且仅当**它在 L1/L2 显著占优；仅靠"新颖"不可能上位。

#### 3.3.3 `ExplorationAction.confidence` 语义（PO v3 钉死）

**`confidence` = "系统认为这是当前最值得探索方向的置信度"（决策置信度），不是关系证据置信度。**

- **禁止** `Action.confidence = RelationEvidence.confidence`（关系成立的置信度 ≠ 推荐该候选的置信度）。
- 来源：由 C 决策层按"该候选胜出的层数 / 与次名的差距"派生（第一版简单规则即可），供 UI 展示"推荐的把握"。
- 关系证据的置信度仍在 `RelationEvidence.confidence` / `ContinuityFeatures` 里，不混用。

#### 3.3.4 确定性（Determinism，PO v3 钉死）

**Ranking 必须 deterministic**：同一输入（同一候选集 + 同一上下文）永远产出同一第一名。
- **稳定 tie-breaker（L5）**：当业务层无法区分时，按 `candidate source precedence（dimension_target → relationship_neighbor → cross_topic_bridge → package_next）→ stable target id 排序`。
- 注意：**这是确定性保证，不是业务权重**（与 ADR-0023 "default ordering 仅作 tie-breaker" 同一设计哲学）。
- 防"第一次→A / 刷新→B / 再→A"的随机跳转，维护"探索方向是有意识选择的"产品感。

**连续 ≠ 值得探索**（PO 核心原则）：强关系 trivial transition 可被"补当前最大缺口"的中等关系候选压过（L1/L2 层实现）。

### 3.4 `ExplorationAction` 暂不扩张（PO 钉死）

现有 `{ type, targetRef, reason, narrativeHook, expectedGrowth, confidence }` 够 C 第一阶段。
**不为"未来可能有跨包跳转"预先加 source/candidateKind/rankingReason/continuityScore 等字段。**
先让行为证明接口不足，再通过 ADR 扩展（与 Freeze/ADR 思路一致）。

---

## 4. 测量问（如何知道 C 做成了）

| 指标 | 定义 | 定位 / 目标 |
|---|---|---|
| M1 候选覆盖 | 候选集覆盖"真实可达且有证据支持"实体的比例 | **金标集须独立于候选生成器**（人工构造的可达候选集合，或独立审计 fixture），防"候选源定义分母、自己证明自己"（PO v3 钉死）；目标 ≥ 90% |
| M2 决策可解释率 | 用户/审查者能否答出"为什么推荐这个"（分层理由可审计） | 显式上升 |
| M3 无关系跳发生率 | 实际"下一步"中 NONE 证据占比 | **降级为观察指标（非成功 KPI）**（PO v3 钉死）：NONE rate ↓ ≠ C better（B 期 BROKEN≠Bug 原则延续；C 更诚实也可能使 NONE 出现更透明）。真正 KPI = 推荐有可靠依据 + 用户理解为什么 |
| M3b 探索价值命中率 | 命中"补当前缺口"而非"强关系 trivial"的比例 | 上升（观察指标） |
| M4 回退率 | 候选空 → 回退 Rule 1–5 / stations 的比例 | **初始观察阈值 / provisional target（非合格线）**（PO v3 钉死）：无历史基线，施工后取实测值再定 |
| M5 单引擎复用率 | C 关系逻辑调用共享 `collectRelationEvidence` 比例 | 100% |
| M6 越界防护 | C 决策层 JCS 引用 / LLM 调用 / 关系判断复制 | JCS=0、LLM=0 |
| M7 排序确定性 | 同一输入两次运行产出同一第一名 | 100%（PC7 硬要求） |

---

## 5. 红线总表（PC1–PC7，Phase C 专属；区别于 ADR-0023 的 B 层 C1–C9）

| # | 硬约束 | 审计硬判定 |
|---|--------|-----------|
| **PC1** | **Candidate Generation ≠ Navigation Decision**：候选生成器只产生候选集合，不得直接返回 `ExplorationAction` | `candidateGeneration.ts` 无 `ExplorationAction` 构造/返回；决策只在 ranking/policy 层 |
| **PC2** | **ContinuityEngine 只提供 Evidence/Features**：C 可消费 `RelationEvidence[]` + `ContinuityFeatures`，不得复制关系判断 | C 模块无 `RELATION_KIND_MAP` 导入/复制、无自写关系判定逻辑 |
| **PC3** | **JCS 不参与候选决策**：`JCS → diagnostic only; JCS ─X→ ranking` | C 排序模块无 `deriveJourneyContinuityScore` / `JCS` 引用（读源码断言 = 0） |
| **PC4** | **ContextRelevance 必须来自真实上下文**：特征缺失 → `null`（不是 0、不编默认值） | 测试断言：无 gap 数据 → gapRelevance=null 非 0；无 time/space → 不出现 |
| **PC5** | **`package_next` 没有特权**：只是四类候选源之一，同一打分公式 | 测试断言：同一输入下 package_next 与其它候选同公式计算，无保底加分 |
| **PC6** | **C 不做 D**：C 只答 "Where next?"，不做 "Did the user understand?"（无认知完成度/理解判断/反馈闭环） | C 模块无 understanding 判定、无认知闭环逻辑；D 的职责不进 C |
| **PC7** | **Deterministic Ranking Contract**：分层/词典序决策；同一输入同一输出；无证据候选只能高层胜出、禁 Novelty 上位；`Action.confidence` = 决策置信度（≠关系证据置信度）；tie-breaker 确定性 | 测试断言：①两次运行同输入同第一名（M7）；②无证据候选在 L4 永不超有证据候选；③`Action.confidence` 不直接等于 `RelationEvidence.confidence`；④JCS 引用 = 0（PC3 延续） |

> 一句话总纲：**B 是 Evidence Producer，C 是 Decision Consumer，JCS 永远只在诊断层，Ranking 永远 deterministic。**

---

## 6. 待 PO 拍板的决策点（Decision Points）

| # | 决策 | 我的推荐 |
|---|------|---------|
| D1 | C 正式立项（替换 `stations[idx+1]` 为候选驱动） | ✅ 是 |
| D2 | 候选四源（relationship_neighbor / cross_topic_bridge / dimension_target / package_next） | ✅ 是（Audit 实证全现成） |
| D3 | 允许跨包候选（跳出去是候选行为，由排序决定） | ✅ 是 |
| **D4** | **决策模型 = 分层/词典序（Lexicographic），非加权评分** | ✅ 是（PO v3 定案：可解释/可审计/可回归/无权重争议） |
| D5 | ContextRelevance = C 核心增量，**结构化 CandidateContextFeatures**（非标量） | ✅ 是（PO 钉死） |
| D6 | ExplorationValue：补缺口候选可压过强关系 trivial | ✅ 是（连续 ≠ 值得探索，L1/L2 层实现） |
| **D7** | **无证据候选跨层规则：无"通用最低"特权，仅可高层（L1/L2）胜出，禁 Novelty（L4）上位** | ✅ 是（PO v3 定案，替换原"保留但最低"） |
| D8 | `ExplorationPolicy` 增强不推翻（只增不改 + 回退链） | ✅ 是（可回滚） |
| **D9** | **红线 PC3：C 可消费 ContinuityFeatures；C 绝不消费 JCS** | ✅ 是（硬句入 ADR） |
| **D10** | **红线 PC2/PC6：C 不复制关系逻辑；C 不做 D** | ✅ 是 |
| D11 | `stations` 保留为回退兜底 | ✅ 是 |
| D12 | `ExplorationAction` 暂不扩张（行为证明不足再扩） | ✅ 是（PO 钉死） |
| **D13** | **`Action.confidence` = 决策置信度（"最值得探索"的把握），≠ 关系证据置信度；禁直接赋值** | ✅ 是（PO v3 钉死） |
| **D14** | **候选去重保留 sources[] provenance（去重键=gid，来源不丢）** | ✅ 是（PO v3 钉死） |
| **D15** | **M3（NONE 跳发生率）降级为观察指标；M4（回退率）标 provisional target；M1 金标独立于生成器** | ✅ 是（PO v3 钉死） |

---

## 7. 与施工设计的关系

- `docs/product/PHASE_C_REALITY_AUDIT.md` = 事实基线（已完成）。
- `docs/product/PHASE_C_IMPLEMENTATION_DESIGN.md`（Draft）以本 ADR 拍板为准修订（含 CandidateContextFeatures 类型、ExplorationCandidate.sources[] provenance、分层 Ranking Contract、PC1–PC7 审计断言落测试、M1 金标独立 fixture）。
- ADR Accepted → 施工设计对齐 → TDD 施工（C-S1..C-S8）。

---

> 状态：**Proposed**。PO 逐条拍板 D1–D12 后转 Accepted，再启动 C 施工。
