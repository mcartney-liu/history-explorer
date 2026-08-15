# Phase B 探索连续性引擎 —— Implementation Design v2（施工最终 Contract）

> 状态：**Ready for Implementation**（PO 两轮评审：v1 4 红项 + 6 建议项 → v2 吸收并封口 C1–C9）
> 前置条件：P1 收口（PO 决策门通过）后启动
> 依据：`docs/15_DECISIONS/ADR-0023_phase_b_continuity_engine_review.md`（v3.1，§9 C1–C6 为基线）
> 修订：v1（e68ec3d）→ v2 吸收 PO 第二轮评审（UNCLASSIFIED 定义 + C8 / JCS 诊断定位 / NONE 类型系统特判 + C4 改 provenance completeness / Legacy Adapter + C9 / evidenceId 稳定身份 / kind·provenance·source 三分离）
> 现有种子：`frontend/src/data/transition.ts`（`describeTransition`，4 层过渡逻辑）
> 第一调用方：`frontend/src/components/package/ConnectionCard.tsx`、`frontend/src/components/EntityPage.tsx`

---

## 0. 一句话目标

把现有 `describeTransition`（输出单条解释文本）**正式化为可复用的 `ContinuityEngine`**（输出可审计的 `RelationEvidence[]` 证据集合 + `ContinuityFeatures` 特征向量），并补齐两块短板：**无关系诚实表达（HonestNone）** 与 **连续性特征（ComposeFeatures）**。B（固定路线解释）与未来的 C（动态探索候选排序）共用这一个引擎，**引擎不决策**。

**本版核心变更（v1 → v2）**：引擎与 B 解释层彻底分文件；`RelationEvidence` 用类型系统区分 Positive/None；`kind` 映射显式穷举 20 类（C8）；`strength` 收紧为单证据内部描述（非跨 kind 裁决）；JCS 定位为诊断聚合启发式（非事实权重、非导航输入）；新增 C7/C8/C9 审计项。

---

## 1. 代码核对结论（2026-08-15 实测，方向不偏移的依据）

| 事实 | 现状 | 与 ADR 的差距 |
|---|---|---|
| 种子引擎 | `transition.ts#describeTransition(fromName, toName, edge, commonNeighbor?)` | 输出 `{claim, short, text, confidence}` **单条已选定文本**，非证据集合；隐含"引擎替你选了哪层解释" |
| 调用点 | 仅 2 处：`ConnectionCard.tsx:96`（站间衔接）、`EntityPage.tsx:175`（入口桥） | 改动面小、可控；两者都只在 `text` 非空时渲染 |
| 无关系处理 | `text: null` → 组件**静默不渲染** | ⚠️ 违反 C6"绝不静默"——23.6% BROKEN 段的体验缺口 |
| 关系类型 | **20 条**冻结关系（`relationshipLabels.ts`，实际 20 条非 18） | 需**全部显式映射**到 RelationKind（C8 穷举），禁止 default 兜底 |
| 因果数据 | M82 `CausalStatement`（cause/effect/mechanism/confidence/evidence_refs）为**独立结构化数据** | 不经过关系类型映射；引擎的 CAUSAL 证据既可来自 `caused/resulted_in/influenced*` 边，也可（未来）来自 CausalStatement——v2 只做边映射，CausalStatement 接入列为 Future Scope |
| C 种子 | `next/exploration/ExplorationPolicy.ts#evaluateExploration` → `ExplorationAction{reason,narrativeHook,confidence}` | 尚未消费引擎证据；Phase B 不动它（C 施工时再接入） |
| 测试 | `transition.ts` 无独立测试；无 `ConnectionCard` 测试 | 新增引擎测试即基线，C1–C9 审计断言落进测试 |

---

## 2. 施工范围（做什么 / 不做什么）

### 做
1. 新建 `frontend/src/data/continuityEngine.ts` —— **引擎本体**（`collectRelationEvidence` + `composeFeatures` + 类型）。
2. 新建 `frontend/src/data/continuityExplanation.ts` —— **B 解释层**（`buildExplanationCandidates` + `selectBestExplanation` + `expressHonestNone`）。
3. `ConnectionCard.tsx` 改调引擎 + B 解释层：站间衔接输出「证据 → B 选择 → 渲染」，**NONE 时渲染诚实陈述**。
4. `EntityPage.tsx` 入口桥同步改调（复用同一引擎 + B 层，行为一致）。
5. 新增 `frontend/src/data/__tests__/continuityEngine.test.ts` —— 功能测试 + **C1–C9 审计断言**。
6. `styles/components.css` 补诚实陈述样式（沿用 token，无硬编码色）。
7. `transition.ts` 改为 **Legacy Adapter**（C9：零业务逻辑）。

### 不做（红线/边界，锁死）
- ❌ 引擎不含 `rankCandidates` / `nextStep` / 候选排序 / 导航决策（C1）。
- ❌ 引擎不"选定唯一解释"——解释选择在 **B 解释层**（C2）。
- ❌ 不动 `ExplorationPolicy`（C 施工时再接）；JCS 不进任何 `ExplorationAction`/排序/阈值（C3）。
- ❌ 不引 Neo4j/PG/ES/RAG/GIS/新依赖；不碰 AI/LLM（红线）。
- ❌ 不动 `Relationship Layer`（不建边/推演/因果）；CausalStatement 接入引擎 = Future Scope。
- ✅ 只迁移现有 2 个调用点，不借机扩散到其他组件（PO 明确范围控制）。

---

## 3. 类型契约（最终 Contract，开工照此实现）

### 3.1 RelationKind —— 8 类 + UNCLASSIFIED

```ts
export type RelationKind =
  | 'DIRECT_HISTORICAL'   // 可解释为直接历史关系，但无更具体语义分类
  | 'CAUSAL'              // 因果（caused / resulted_in / influenced / influenced_by …）
  | 'TEMPORAL_INHERIT'    // 时间继承（before / after / inherited / succeeded …）
  | 'GEOGRAPHIC'          // 地理共属（located_in / born_in / died_in / spread_to …）
  | 'SHARED_ENTITY'       // 共同实体/共同活动（participated_in / traded_with …）
  | 'THEMATIC'            // 主题相关（practiced / wrote …）
  | 'WEAK_BRIDGE'         // 弱桥：无直接边但有共同邻居
  | 'NONE'                // 无可靠关系（合法状态，非 Bug）
  | 'UNCLASSIFIED'        // 有明确关系证据，但当前分类体系无法可靠表达其语义
```

**语义边界（PO 钉死）**：
- `UNCLASSIFIED` = 有证据 + 无法可靠分类，**≠ NONE**。未来 C 看到它应理解为"存在我目前不能准确解释的关系证据"，而非"没有关系"。
- 四态判别：有关系+可分类 → 对应 kind；有关系+无法可靠分类 → `UNCLASSIFIED`；无直接边但有共同桥接 → `WEAK_BRIDGE`；无足够可靠关系 → `NONE`。

### 3.2 RelationEvidence —— 类型系统区分 Positive / None（C4 升级版）

```ts
/** 证据来源层级（与 kind 严格分离，PO 钉死）：
 *  kind        = 它是什么关系（语义）
 *  provenance  = 这个判断来自哪里（数据源类别）
 *  source      = 具体哪条数据证明（稳定 id）
 */
export type EvidenceProvenance =
  | 'relationship_edge'        // 来自冻结关系边
  | 'claim'                    // 来自 evidence claim
  | 'shared_neighbor'          // 来自共同邻居
  | 'none'                     // 仅 NONE 使用

export interface EvidenceBase {
  /** 稳定、内容派生的证据身份（PO 钉死）：
   *  由 kind + provenance + source + from + to 稳定 hash 派生；
   *  不是数组 index、不是 random UUID、不承担任何 ranking 意义。 */
  evidenceId: string
  kind: RelationKind
  /** 单证据内部描述值 0..1，MUST NOT 用于跨 kind 全局排序
   *  （除非调用方明确定义上下文规则）。 */
  strength: number
  /** 该证据在自身 kind 内部的证据强度（可选，如 claim 学术共识分级）。 */
  confidence?: 'strong' | 'moderate' | 'weak'
}

/** 正向证据：有具体数据可审计（C4 要求 provenance/source 非空）。 */
export interface PositiveRelationEvidence extends EvidenceBase {
  kind: Exclude<RelationKind, 'NONE' | 'UNCLASSIFIED'>
  provenance: Exclude<EvidenceProvenance, 'none'>
  source: string   // relationship-id / claim-id / entity-id
}

/** 弱桥/未分类：有证据但 source 指向邻居实体或无法归类的边。 */
export interface IndirectRelationEvidence extends EvidenceBase {
  kind: 'WEAK_BRIDGE' | 'UNCLASSIFIED'
  provenance: 'shared_neighbor' | 'relationship_edge'
  source: string   // 邻居 gid 或关系边 id
}

/** NONE：合法特殊状态，provenance='none'、source=null（类型系统特判，非测试漏洞）。 */
export interface NoneRelationEvidence extends EvidenceBase {
  kind: 'NONE'
  provenance: 'none'
  source: null
}

export type RelationEvidence =
  | PositiveRelationEvidence
  | IndirectRelationEvidence
  | NoneRelationEvidence
```

**C4 最终定义（v2）**：**Evidence provenance completeness** —— 正向/间接证据的 `provenance` 与 `source` 必须非空；`NONE` 的 `provenance='none'`、`source=null` 是类型系统内的合法状态。**不再表述为"每条 evidence 都必须有非空 source"**（避免制造 `"no-source"` 假值污染审计）。

### 3.3 ContinuityFeatures —— 核心输出（Feature Contract）

```ts
export interface ContinuityFeatures {
  /** 是否有被证明的关系、强度如何（来自 RelationEvidence[] 汇总，仅作描述性聚合）。 */
  relationshipStrength: number
  /** 是否有可理解的人话解释（来自 B 解释层候选质量；NONE 的诚实陈述也计质量）。 */
  explanationQuality: number
  /** 时间连贯度（from/to 时间元数据；数据缺失 = null，不是 0）。 */
  temporalContinuity: number | null
  /** 空间/数据集连贯度（from/to 空间元数据；数据缺失 = null，不是 0）。 */
  spatialContinuity: number | null
  /** 与用户当前理解/探索缺口的相关度。Phase B 退化保留维，恒 null（C 施工时填）。 */
  contextRelevance: number | null
}
```

**Feature Contract（每维输入来源 + null 语义，PO 要求补死）**：

| Feature | Phase B 输入 | Phase B 可得性 | 无数据时 |
|---|---|---|---|
| relationshipStrength | `RelationEvidence[]` | ✅ 可得 | 0（无任何证据 = 0） |
| explanationQuality | B 解释层候选（`buildExplanationCandidates` 结果） | ✅ 可得 | 0（无候选） |
| temporalContinuity | from/to 时间元数据 | ⚠️ 部分受限（/entity 只返回中心实体日期，关系目标日期是 Future Scope） | **`null`（不是 0）** |
| spatialContinuity | from/to 空间/数据集元数据 | ⚠️ 受限 | **`null`（不是 0）** |
| contextRelevance | 用户上下文 | ❌ Phase B 无 | **`null`（恒）** |

> **null 语义铁律（PO 钉死）**：`null` = 当前阶段没有这个信息；`0` = 已知该项为零。两者语义完全不同，禁止把"没数据"写成 0。

### 3.4 JCS —— 可选派生诊断值（v2 定位收紧）

```ts
/** 诊断聚合的默认权重——engineering heuristic，不是用户自然感的数学模型，
 * 不是跨领域真值，MUST NOT 被 C/D 作为导航/排序策略消费。 */
export const DEFAULT_DIAGNOSTIC_WEIGHTS = {
  relationshipStrength: 0.30,
  explanationQuality: 0.25,
  temporalContinuity: 0.25,
  spatialContinuity: 0.20,
  // contextRelevance 在 Phase B 为 null，不参与聚合
}

export function deriveJourneyContinuityScore(
  features: ContinuityFeatures,
  weights: Partial<typeof DEFAULT_DIAGNOSTIC_WEIGHTS> = DEFAULT_DIAGNOSTIC_WEIGHTS,
): number | null
```

- **第一版真正可计算**（不是"默认返回 null"）：由 Features 加权派生，`contextRelevance=null` 时不参与、按剩余权重归一化。
- **定位**：诊断/回归/实验（route comparison、regression report、debug dashboard）。
- **红线（C3）**：JCS **不得**进入 `ExplorationAction` / 候选排序 / 导航决策链。测试锚点是"禁止消费"（`ExplorationPolicy` 对 JCS 引用 = 0），**不是**"禁止计算"。
- 注释写死：`weights are diagnostic heuristics and MUST NOT be interpreted as cross-domain truth or consumed as navigation policy.`

---

## 4. 函数契约（双文件结构，PO 钉死）

### 4.1 `continuityEngine.ts` —— 引擎本体（只此两个公开函数 + 类型）

```ts
/** 收集全部可检出的关系证据（不预选、不裁决、不折叠）。C5：B/C 共用入口。 */
export function collectRelationEvidence(
  from: { gid: string; name: string },
  to: { gid: string; name: string },
  context?: {
    edge?: { type: string; evidence?: string[] } | null   // 调用方查得的直接关系边
    commonNeighbor?: { gid: string; name: string } | null  // 共同邻居桥
  },
): RelationEvidence[]

/** 证据 → 特征向量（核心输出，非决策分数）。 */
export function composeFeatures(evidence: RelationEvidence[]): ContinuityFeatures
```

- `collectRelationEvidence` 输出**多条并列证据**（如 CAUSAL + TEMPORAL + GEOGRAPHIC 并存），
  顺序稳定但**不表达优先级**（API 注释 + 测试双保险，PO 十九节）。
- `WEAK_BRIDGE` 与 `UNCLASSIFIED` 同属 IndirectRelationEvidence，但语义不同：前者"有桥接证据"、后者"有边但不可分类"。
- **API surface 白名单（PO 十二节）**：引擎文件公开导出**只允许** `collectRelationEvidence`、`composeFeatures` + 类型；测试断言 `Object.keys(module)` ⊆ 白名单（比字符串搜索更强，防改名绕过）。

### 4.2 `continuityExplanation.ts` —— B 解释层（引擎外）

```ts
/** 证据 → 解释素材集合（不选定唯一解释）。C2。 */
export function buildExplanationCandidates(evidence: RelationEvidence[]): TransitionExplanation[]

/** 素材 → 选一条给用户（B 解释选择层，纯工具函数，不产生导航/排序）。 */
export function selectBestExplanation(candidates: TransitionExplanation[]): TransitionExplanation | null

/** NONE → 诚实陈述（知识事实层，不暴露内部实现）。C6 核心。 */
export function expressHonestNone(fromName: string, toName: string): HonestStatement

export interface TransitionExplanation {
  evidenceId: string      // 溯源到证据
  fact: string            // 人话叙述素材（claim / 关系短句 / 桥模板）
  confidence: 'strong' | 'moderate' | 'weak'
}

export interface HonestStatement {
  text: string            // "当前知识中，没有找到「A」与「B」之间足够可靠的直接联系。"（v2 删掉"这是一次探索方向的切换"——那是 C 的边界）
}
```

- **C2 硬判定**：`buildExplanationCandidates` 返回**数组**；"从素材里挑哪条讲、怎么组织"在 `selectBestExplanation`（B 层），**不在引擎内**。
- **v2 修正（PO 八节）**：诚实陈述**只保留第一句**。"这是一次探索方向的切换"隐含"系统知道这是一次导航行为"，开始碰 C 的边界，Phase B 删除。
- 诚实陈述只给知识事实，禁止暴露 author ordering / 探索包 / 编排（C6 + Article 0 真相层）。

### 4.3 `transition.ts` —— Legacy Adapter（C9）

```ts
// 唯一职责：new model → old TransitionResult，零业务判断。
export function describeTransition(fromName, toName, edge, commonNeighbor): TransitionResult {
  const evidence = collectRelationEvidence({...}, {...}, { edge, commonNeighbor })
  const candidates = buildExplanationCandidates(evidence)
  const selected = selectBestExplanation(candidates)
  const honest = evidence.some((e) => e.kind === 'NONE') ? expressHonestNone(fromName, toName) : null
  // 转换为旧 { claim, short, text, confidence } 结构
}
```

**C9 Legacy Adapter Non-Duplication 断言**（PO 九节）：
1. `transition.ts` 不读取 relationship labels；2. 不访问 neighbors；3. 不实现关系优先级；4. 不实现 claim 选择；5. 不包含旧 4 层 if-else 判断；6. 只调用新能力并转换返回结构。
> 防"三个月后有人为了修旧页面又往 transition.ts 加一个 if"。

---

## 5. RELATION_KIND_MAP —— 20 类冻结关系全量显式映射（C8 穷举）

> C8 **Relation Classification Exhaustiveness**：20 条冻结关系**必须全部**出现在映射表中；**禁止 default / 隐式 fallback / DIRECT_HISTORICAL 兜底**。TS 层面用 `Record<FrozenRelationType, RelationKind>` 穷举字面量联合，编译期强制补全。

| 冻结关系（`REL_LABELS` 键） | 中文标签 | 映射 RelationKind | 判定依据 |
|---|---|---|---|
| `caused` | 导致 | `CAUSAL` | 明确因果动词 |
| `resulted_in` | 促成 | `CAUSAL` | 明确因果动词 |
| `influenced` | 影响 | `CAUSAL` | 影响=因果传导（弱因果） |
| `influenced_by` | 受……影响 | `CAUSAL` | 同上（反向） |
| `before` | 早于 | `TEMPORAL_INHERIT` | 时间先后 |
| `after` | 晚于 | `TEMPORAL_INHERIT` | 时间先后 |
| `inherited` | 继承 | `TEMPORAL_INHERIT` | 时间传承 |
| `succeeded` | 继任 | `TEMPORAL_INHERIT` | 时间继任 |
| `located_in` | 位于 | `GEOGRAPHIC` | 地理共属 |
| `born_in` | 生于 | `GEOGRAPHIC` | 地理共属 |
| `died_in` | 卒于 | `GEOGRAPHIC` | 地理共属 |
| `spread_to` | 传播至 | `GEOGRAPHIC` | 地理扩散 |
| `participated_in` | 参与 | `SHARED_ENTITY` | 共同活动/共同实体 |
| `traded_with` | 贸易往来 | `SHARED_ENTITY` | 双边共同活动 |
| `practiced` | 信奉 | `THEMATIC` | 信仰/思想主题 |
| `wrote` | 著述 | `THEMATIC` | 作品/思想主题 |
| `related_to` | 关联于 | `DIRECT_HISTORICAL` | 通用直接历史关联，无更具体语义 |
| `ruled` | 统治 | `DIRECT_HISTORICAL` | 直接历史关系（权力关系） |
| `founded` | 创立 | `DIRECT_HISTORICAL` | 直接历史关系（创立） |
| `part_of` | 属于 | `DIRECT_HISTORICAL` | 直接历史关系（隶属） |

> 注：`DIRECT_HISTORICAL` 在此表内是**逐条显式映射的结果**（related_to/ruled/founded/part_of），
> 不是兜底桶。若未来新增冻结关系类型，必须显式加入本表（TS 类型强制），否则编译期失败——不会静默落入任何类别。

---

## 6. 测试计划（C1–C9 审计断言 + 功能测试）

新增 `frontend/src/data/__tests__/continuityEngine.test.ts`：

| 审计项 | 测试断言（硬判定） |
|---|---|
| **C1** Engine 不导航/不排序 | 引擎文件公开导出 **API surface 白名单**断言（keys ⊆ {collectRelationEvidence, composeFeatures, 类型}）+ 字符串哨兵扫描（`nextStep`/`rankCandidates`/`selectDestination` 命中 = 0） |
| **C2** Engine 不选定唯一解释 | `buildExplanationCandidates` 在 `continuityExplanation.ts`（读源码断言）；`collectRelationEvidence` 不返回"已选定解释"（类型断言） |
| **C3** JCS 不进入导航决策链 | `ExplorationPolicy.ts` / `ExplorationAction` 对 JCS 引用 = 0（读源码断言）；`deriveJourneyContinuityScore` 存在且可计算（功能测试：合法 Features → number） |
| **C4** provenance completeness | 遍历所有正向/间接 evidence：`provenance` 非空且非 'none'、`source` 非空；NONE：`provenance='none'`、`source=null`（类型 + 运行时双断言） |
| **C5** B/C 共用同一引擎 | `ConnectionCard` / `EntityPage` import 的是 `continuityEngine` 的同一导出（读源码断言） |
| **C6** NONE 绝不静默 | 构造 NONE 用例 → `expressHonestNone` 返回非空文本，含"没有找到"、不含"探索包/作者/编排"；文本**不含**"方向切换"（v2 契约） |
| **C7** Evidence 不折叠 | 构造"边(CAUSAL) + 时间(相邻) + 地理(同域)"输入 → `collectRelationEvidence` 返回 **≥3 条**独立证据，kind 各自保留 |
| **C8** 分类穷举 | `RELATION_KIND_MAP` 的键集合 == `REL_LABELS` 的 20 键集合（运行时断言，差集 = 0）；无 `default` 分支（读源码断言） |
| **C9** Adapter 不重实现 | `transition.ts` 不包含 `relLabel`/`getEntityNeighbors`/`getEvidenceWithSources` 调用、无 4 层 if-else 判断（读源码断言） |
| 功能 | 直接边/共同邻居/皆无 三输入 → kind 正确；`composeFeatures` 各维在 [0,1] 或 null（按 Feature Contract）；TC/SC 数据缺失 = null 非 0 |
| 顺序 | `collectRelationEvidence` 两次调用输出顺序一致（稳定性），且 API 注释声明"顺序不表达优先级" |

---

## 7. 施工步骤（TDD 顺序，PO 十七节：测试先行）

| 步骤 | 动作 | 验证 |
|---|---|---|
| S0 | 冻结类型契约（§3/§4/§5 落成 `continuityEngine.ts` 类型 + `RELATION_KIND_MAP`） | `tsc --noEmit` 通过 |
| S1 | 写引擎单测（C1–C9 断言 + 功能）→ 红 | `vitest` 显示预期失败 |
| S2 | 实现 `collectRelationEvidence` + `composeFeatures` → 绿 | 单测全绿 |
| S3 | 实现 `continuityExplanation.ts`（B 层）+ 其测试 | 单测全绿 |
| S4 | `ConnectionCard.tsx` 接入（证据 → B 选择 → 渲染；NONE 诚实陈述） | 组件渲染检查 |
| S5 | `EntityPage.tsx` 入口桥同步 | 同上 |
| S6 | `transition.ts` 改 Legacy Adapter + C9 断言测试 | 单测全绿 |
| S7 | 样式：诚实陈述样式（token） | 视觉检查 |
| S8 | 全量回归：`tsc` + `vitest` + `freeze-check` PASSED | 全绿 |
| S9 | `bash build_tunnel.sh` 重建 + 隧道验证（找一个 NONE 跳转看诚实陈述） | 公开页可见 |
| S10 | commit + push 共享分支 | 提交后 `git show --stat` 复核 |

---

## 8. 文件面预估

| 文件 | 动作 | 说明 |
|---|---|---|
| `frontend/src/data/continuityEngine.ts` | **新增** | 引擎本体（类型 + 2 函数 + RELATION_KIND_MAP） |
| `frontend/src/data/continuityExplanation.ts` | **新增** | B 解释层（3 函数） |
| `frontend/src/data/__tests__/continuityEngine.test.ts` | **新增** | 测试 + C1–C9 审计断言 |
| `frontend/src/components/package/ConnectionCard.tsx` | 修改 | 第一调用方接入 |
| `frontend/src/components/EntityPage.tsx` | 修改 | 入口桥接入 |
| `frontend/src/data/transition.ts` | 修改 | 改 Legacy Adapter（C9） |
| `frontend/src/styles/components.css` | 修改 | 诚实陈述样式 |

全部在 freeze 白名单内（`frontend/src`、`styles/`）。**不碰 backend、不引新依赖。**

---

## 9. 施工契约总表（C1–C9，最终封口）

| 约束 | 硬要求 |
|---|---|
| **C1** | Engine 不导航、不候选排序、不产生下一步 |
| **C2** | Engine 不选择唯一解释（解释选择在 B 层） |
| **C3** | JCS 不进入 ExplorationAction / 导航决策链（可计算，禁消费） |
| **C4** | Evidence provenance/source 可审计（provenance completeness；NONE 有类型系统合法特判） |
| **C5** | B/C 使用同一 ContinuityEngine |
| **C6** | NONE 不静默、不编造、不暴露内部实现（诚实陈述只给知识事实） |
| **C7** | 多 Evidence 不折叠、不丢失（Non-Collapse） |
| **C8** | 20 类冻结关系全部显式 mapping，禁止 default / 隐式 fallback / 兜底 |
| **C9** | `describeTransition` 只能做 Legacy Adapter，不得重新实现业务逻辑 |

**一句话总纲（与 ADR v3 一致）**：
> `ContinuityEngine` 不回答"下一步去哪"，也不回答"这一堆证据里最终该讲哪一个"；
> 它只负责把"当前知识能够证明什么"完整、可审计地交出来。B/C 分别消费证据做解释与决策。
> JCS 是诊断聚合启发式，永远不进入导航决策链。
