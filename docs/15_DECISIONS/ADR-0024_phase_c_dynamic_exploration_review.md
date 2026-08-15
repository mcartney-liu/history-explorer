# ADR-0024 动态探索方向（Phase C）架构评审

> 状态：**Proposed（待 PO 逐条拍板）** · 修订：v2（吸收 PO 2026-08-16 最终意见：6 条红线 PC1–PC6 + CandidateContextFeatures 结构化 + package_next 无特权）
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

### 3.3 Candidate Ranking —— 多因素复合，JCS 彻底隔离（PO 钉死）

**硬句（PO 定稿，代码审查直接照抄）**：

> **C may consume the underlying `ContinuityFeatures`; C MUST NOT consume `JourneyContinuityScore`.**

排序输入（全部结构化）：
1. **CandidateContextFeatures**（gap/topic/dimension/path/novelty/penalty）
2. **ContinuityFeatures**（RS/EQ 可用；TC/SC=null 不假装时间/空间）
3. **RelationEvidence[]**（可审计；供 reason/narrativeHook 引用 B 解释素材）

**连续 ≠ 值得探索**（PO 核心原则）：强关系 trivial transition 可被"补当前最大缺口"的中等关系候选压过。

### 3.4 `ExplorationAction` 暂不扩张（PO 钉死）

现有 `{ type, targetRef, reason, narrativeHook, expectedGrowth, confidence }` 够 C 第一阶段。
**不为"未来可能有跨包跳转"预先加 source/candidateKind/rankingReason/continuityScore 等字段。**
先让行为证明接口不足，再通过 ADR 扩展（与 Freeze/ADR 思路一致）。

---

## 4. 测量问（如何知道 C 做成了）

| 指标 | 定义 | 目标 |
|---|---|---|
| M1 候选覆盖 | 候选集覆盖"真实可达且有证据支持"实体的比例 | ≥ 90% |
| M2 决策可解释率 | 用户/审查者能否答出"为什么推荐这个"（特征可审计） | 显式上升 |
| M3 无关系跳发生率 | 实际"下一步"中 NONE 证据占比 | 下降 |
| M3b 探索价值命中率 | 命中"补当前缺口"而非"强关系 trivial"的比例 | 上升 |
| M4 回退率 | 候选空 → 回退 Rule 1–5 / stations 的比例 | < 10%（不报错即合格） |
| M5 单引擎复用率 | C 关系逻辑调用共享 `collectRelationEvidence` 比例 | 100% |
| M6 越界防护 | C 决策层 JCS 引用 / LLM 调用 / 关系判断复制 | JCS=0、LLM=0 |

---

## 5. 红线总表（PC1–PC6，Phase C 专属；区别于 ADR-0023 的 B 层 C1–C9）

| # | 硬约束 | 审计硬判定 |
|---|--------|-----------|
| **PC1** | **Candidate Generation ≠ Navigation Decision**：候选生成器只产生候选集合，不得直接返回 `ExplorationAction` | `candidateGeneration.ts` 无 `ExplorationAction` 构造/返回；决策只在 ranking/policy 层 |
| **PC2** | **ContinuityEngine 只提供 Evidence/Features**：C 可消费 `RelationEvidence[]` + `ContinuityFeatures`，不得复制关系判断 | C 模块无 `RELATION_KIND_MAP` 导入/复制、无自写关系判定逻辑 |
| **PC3** | **JCS 不参与候选决策**：`JCS → diagnostic only; JCS ─X→ ranking` | C 排序模块无 `deriveJourneyContinuityScore` / `JCS` 引用（读源码断言 = 0） |
| **PC4** | **ContextRelevance 必须来自真实上下文**：特征缺失 → `null`（不是 0、不编默认值） | 测试断言：无 gap 数据 → gapRelevance=null 非 0；无 time/space → 不出现 |
| **PC5** | **`package_next` 没有特权**：只是四类候选源之一，同一打分公式 | 测试断言：同一输入下 package_next 与其它候选同公式计算，无保底加分 |
| **PC6** | **C 不做 D**：C 只答 "Where next?"，不做 "Did the user understand?"（无认知完成度/理解判断/反馈闭环） | C 模块无 understanding 判定、无认知闭环逻辑；D 的职责不进 C |

> 一句话总纲：**B 是 Evidence Producer，C 是 Decision Consumer，JCS 永远只在诊断层。**

---

## 6. 待 PO 拍板的决策点（Decision Points）

| # | 决策 | 我的推荐 |
|---|------|---------|
| D1 | C 正式立项（替换 `stations[idx+1]` 为候选驱动） | ✅ 是 |
| D2 | 候选四源（relationship_neighbor / cross_topic_bridge / dimension_target / package_next） | ✅ 是（Audit 实证全现成） |
| D3 | 允许跨包候选（跳出去是候选行为，由排序决定） | ✅ 是 |
| D4 | 排序多因素复合（Context + Continuity + Novelty），非单一分数 | ✅ 是 |
| D5 | ContextRelevance = C 核心增量，**结构化 CandidateContextFeatures**（非标量） | ✅ 是（PO 钉死） |
| D6 | ExplorationValue：补缺口候选可压过强关系 trivial | ✅ 是（连续 ≠ 值得探索） |
| D7 | 无证据候选：保留但最低（防死路） | ✅ 保留但最低 |
| D8 | `ExplorationPolicy` 增强不推翻（只增不改 + 回退链） | ✅ 是（可回滚） |
| **D9** | **红线 PC3：C 可消费 ContinuityFeatures；C 绝不消费 JCS** | ✅ 是（硬句入 ADR） |
| **D10** | **红线 PC2/PC6：C 不复制关系逻辑；C 不做 D** | ✅ 是 |
| D11 | `stations` 保留为回退兜底 | ✅ 是 |
| D12 | `ExplorationAction` 暂不扩张（行为证明不足再扩） | ✅ 是（PO 钉死） |

---

## 7. 与施工设计的关系

- `docs/product/PHASE_C_REALITY_AUDIT.md` = 事实基线（已完成）。
- `docs/product/PHASE_C_IMPLEMENTATION_DESIGN.md`（Draft）以本 ADR 拍板为准修订（含 CandidateContextFeatures 类型、PC1–PC6 审计断言落测试）。
- ADR Accepted → 施工设计对齐 → TDD 施工（C-S1..C-S8）。

---

> 状态：**Proposed**。PO 逐条拍板 D1–D12 后转 Accepted，再启动 C 施工。
