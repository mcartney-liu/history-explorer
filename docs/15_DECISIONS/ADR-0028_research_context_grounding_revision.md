# ADR-0028: Research Context / Evidence Grounding Architecture Revision

## ADR Number

ADR-0028

## Title

Research Context / Evidence Grounding Architecture Revision — 将冻结的 Contract vNext 1.2 落地为架构决策

## Status

Accepted（经 PO Acceptance Gate：ACCEPT WITH DOCUMENTATION NOTES；N1-N6 保持原状态）

## Date

2026-08-17

## Supersedes

ADR-0027（架构状态声明；不修改 ADR-0027 文件本身）

---

## Context

思维研究报告出现"战国 × 商鞅变法 → 丝绸之路"时代错位，Root-Cause 追溯（2026-08-17，只读仿真 + 代码事实）确认：

- M36.0 引入的固定 2-hop Context Expansion（`grounding_builder.py:150-216`）无时间/关系/证据/研究目标相干性过滤，把跨时代事实追加进 `[ALLOWED FACTS]`；
- 现行 validator `covered_entity_ids = context ∪ 1-hop neighbors`（`response_validator.py:59-71`）是 topology-based citation authorization——被 gate 拒绝的邻居仍可引用（U1 实证）；
- 综合报告存在 AI answer → question → synthesis 回流（`ResearchReport.tsx:47-52,269-280`）；
- M11-2 原始设计无 2-hop；M3.5 `exploration_engine` 已有 temporal_coherence 能力但未复用（架构隔离技术债）。

经 Contract Closure 流程（Closure Audit → Fix Audit → Final Freeze Gate），上位约束已冻结：

> **History Explorer — Research Context Contract vNext 1.2**（I-01~I-14 + Temporal Rule Matrix + Authorization Matrix + Runtime Tuning Boundary）

本 ADR 将该冻结 Contract 转换为正式架构决策。**Contract 不可修改；本 ADR 如与 Contract 冲突，以 Contract 为准。**

## Problem Statement

1. Grounding Context 边界由"固定跳数实体集合"定义，而非"受研究目标约束的证据子图"。
2. Citation 授权基于图拓扑可达（covered 公式），而非"实际进入 prompt 的证据 ID 集合"。
3. Synthesis 阶段无独立证据边界，上游错误可绕过 grounding 回流。
4. Temporal/Evidence/Authorization 规则未分层（Eligibility 与 Ranking 未分离；SOFT 层级未定义）。

## Contract Authority

本 ADR 严格服从 Contract vNext 1.2（对话内冻结草案；仓库落盘为 Documentation Gap，见 G4）。冻结语义包括：I-01~I-14、Temporal Rule Matrix（precedence ①日期可用性 ②relation 分类：HARD / before-after / propagation / SOFT-WEAK ③interval comparison）、Authorization Matrix（8 角色×7 权限）、权限链 `Candidate ⊇ Approved ⊇ Model-visible ⊇ Citation-authorized`、Synthesis-authorized ⊂ Citation-authorized、Runtime Tuning Boundary（§19 参数全部为 runtime configuration，不冻结数值）。

---

## Decision

### 1. Temporal Coherence

- **I-01**：Temporal hard judgment 必须使用 interval-overlap primitive；单点 representative year 禁止作为 hard 依据。
- **I-02**：before/after 非 temporal exemption——相邻（≤TOL）ACCEPT，跨代 REJECT。
- **I-03**：spoke ∈ HARD relation（18 型 taxonomy 闭合；集合闭合见 M4-002:14，temporal category 闭合由 Contract §3 全映射 10 HARD + 2 BEFORE_AFTER + 5 PROPAGATION + 1 SOFT-WEAK 保证）。
- **I-04**：gate 顺序固定 Temporal Hard Gate → Dimension-aware Eligibility → Relevance Ranking。
- precedence：①日期可用性（任一侧无日期 → SOFT，先于分类）→ ②relation 分类（HARD / before-after / propagation / SOFT-WEAK）→ ③interval comparison（SOFT-WEAK 跳过）。
- propagation relation（caused/influenced/inherited/spread/practiced）：区间重叠或相邻 → ACCEPT；区间不重叠跨代 → SOFT。
- no-date → SOFT 中性（不硬拒）。
- TOL / SOFT discount / approximate expansion 数值为 `[T]` runtime tuning，不冻结。

### 2. Eligibility

- 唯一权限流：`Candidate → Temporal Gate → Eligibility → Approved → Budget → Model-visible → Citation`。
- eligibility 唯一语义 = "是否具备进入 Approved 的资格"；禁止出现 candidate-eligibility / ALLOWED-eligibility / model-visibility-eligibility 多重含义。
- **I-05**：1-hop + ACCEPT 不做 relevance hard rejection。
- **I-06**：N-hop + ACCEPT 必须通过 dimension-aware eligibility。
- **I-07**：SOFT 最高权限层级 = Candidate；SOFT 永不得进入 Approved / Model-visible / Citation-authorized / Synthesis-authorized。

### 3. Evidence Authorization

- **I-10**：仅通过 EvidenceValidator 验证的 claim 具 authoritative claim 权限。
- unvalidated / no-source-binding / binding 失败 claim → Grounding Gate REJECT，无权限。
- weak-source-binding（已 validated）→ 仅 ranking 降权，不降授权。
- curated 是来源标记，非质量等级。
- Evidence Quality 分层：consensus 仅参与 ranking，不参与 eligibility 硬判（mixed 为常态，33% 数据事实）。

### 4. Citation Authorization

- **M1 / I-08**：`Citation-authorized := ID(Model-visible)`——只含实际进入 prompt facts 的 entity global_id、relation (src,rel,tgt) 引用 ID、timeline synthetic ID 的**集合本身**。
- **I-09**：禁止 KG 邻居扩张、1-hop 扩张、2-hop/N-hop reachability 扩张、neighbor inheritance、shared topology 自动产生 citation authorization。**"可达 ≠ 可引用"、"邻居 ≠ 可引用"。**
- 现行 `response_validator.py:59-71` 的 `covered_entity_ids = context ∪ neighbor_ids` 属于 **Legacy Semantic Leak**，必须在实现阶段移除并替换为 `citation.global_id ∈ ID(Model-visible)` 判定。

### 5. Synthesis Isolation

- **I-11**：Synthesis 只能使用 kg_fact / validated structured claim / Evidence Object；`Synthesis-authorized ⊂ Citation-authorized`（仅 root authoritative + validated claim）。
- **I-12**：question 构造层不得嵌入原始 AI answer；该规则为冻结级 invariant。
- 现行 `ResearchReport.tsx:47-52`（buildReportContext 截取答案片段）与 `:269-280`（question 拼接 + explainAI）属 **Implementation Conflict / Migration Requirement**（回流链），须在实现阶段改造：综合阶段 grounding 输入改为 Evidence Object（kg_fact/claim only）。
- contextual ACCEPT 即使 citation-authorized，不得获得 synthesis-authorized。
- AI analysis 永远不得成为 synthesis evidence（provenance 强制）。

### 6. Expansion Boundary

- **I-13**：Expansion 必须 bounded、depth-independent、gate-ordered（gate 后扩展）、deterministic、hard-terminated。
- **I-14**：同输入 + 同 KG snapshot + 同 Contract 规则 + 同 tuning configuration → 确定性输出。
- 以下全部为 `[T]` Runtime Tuning，**ADR 不冻结数值**：TOL、SOFT discount、approximate expansion、FACTS_BUDGET、MAX_HOPS_HARD、MIN_PATH_SCORE、layer cap、fanout cap、ranking weights、marginal stop、queue ordering、focus_terms vocabulary。

### 7. Comparison Context

- **M8 / CP-01**：Comparison 必须区分 A-specific / B-specific / Shared / Background 四层；roots 与 background 严格分离。
- **CP-02**：Shared 判据 = `common_1hop(A) ∩ common_1hop(B) ∩ (dimension_match ∨ same_topic)`；禁止以 graph reachability intersection 替代 common_1hop。
- **CP-03**：background → background 不得进入 `[ALLOWED FACTS]`。
- 现行 `contextGlobalIds`（ResearchPanel.tsx:541-544）将 roots 与背景混装，为 Migration Requirement。

### 8. Provenance / Auditability

- 每次 expansion accept/reject 记录：`{entity, path, relation, temporal_decision, eligibility_decision, relevance_score, evidence_state, final_decision, reason}`（分数为 `[T]`，记录结构为 invariant）。

---

## Authorization Model

```
Candidate ⊇ Approved ⊇ Model-visible ⊇ Citation-authorized
Candidate ∋ SOFT；Approved ∌ SOFT（eligibility 过滤）
Citation-authorized = ID(Model-visible)          （集合本身，禁拓扑扩张）
Synthesis-authorized ⊂ Citation-authorized       （仅 root + validated claim）
KG Fact ∩ AI Analysis = ∅
```

角色矩阵（8 角色 × 7 权限）冻结于 Contract vNext 1.2 §16，本 ADR 不重述不修改，仅引用为架构约束。**权限不可继承**（root 权限不传给邻域；contextual 不升级 authoritative）。

---

## Invariants

I-01 ~ I-14（冻结于 Contract vNext 1.2 §17，本 ADR 全部采纳为架构不变量，不新增、不删减）。

---

## Runtime Tuning Boundary

§6 所列 12 项参数全部由 runtime configuration 提供；ADR 不冻结任何数值；实现须以参数化接口承载（Migration Obligation）。

---

## ADR-0027 Transition

- **ADR-0027 → Superseded**（本 ADR 架构状态声明；不改动 ADR-0027 文件）。
- 废止 ADR-0027 中与新 Contract 冲突的旧语义：
  1. "可看不可引"前提（U1 实证：实际可看可引）；
  2. `expanded_global_ids` 的 topology-based authorization 语义；
  3. "过闸 2-hop 并入 expanded_global_ids"一致性修正（与 I-08/I-09 冲突）。
- 保留 ADR-0027 仍有效的历史判断：temporal coherence 是必要维度、M36.0 2-hop grounding 缺陷诊断、原问题发现与审计背景。

---

## Implementation Gaps（真实代码事实，非 Contract 缺陷）

| # | Gap | 位置 | 性质 |
|---|---|---|---|
| G1 | 现行 `covered_entity_ids = context ∪ neighbor_ids` 拓扑授权仍在 | `response_validator.py:59-71` | Legacy Semantic Leak（须按 M1 移除）|
| G2 | 现行 BFS 2-hop 扩展无相干性/门控 | `grounding_builder.py:150-216,300` | Migration Requirement |
| G3 | AI answer → question → synthesis 回流链仍在 | `ResearchReport.tsx:47-52,269-280` | Implementation Conflict（须按 M5 改造）|
| G4 | Contract vNext 1.2 无仓库落盘文件 | 全仓 | Contract Artifact / Documentation Gap（非语义缺陷）|

---

## Migration / Implementation Obligations（方向性约束，非实现方案）

1. 实现必须保留 I-01~I-14 语义，不得放宽（含 SOFT 四层禁令、Citation=ID(Model-visible)、synthesis 白名单）。
2. 实现不得把 §6 tuning 参数写死为常量；必须以 runtime configuration 注入。
3. 实现阶段须先移除 G1（covered 公式），替换为 Model-visible ID 集合判定。
4. 实现阶段须改造 G3（synthesis 输入），question 不再嵌入原始 AI answer。
5. 实现阶段须落地角色判定（M2）与 eligibility 层（M4），按唯一权限流执行。
6. 实现前建议将 Contract vNext 1.2 落盘为仓库文档（G4，流程项）。

---

## Verification Requirements（未来实现完成后验证方向，当前不实施）

1. **Citation negative tests**：1-hop 邻居不自动获 citation；2-hop 可达不自动获 citation；被 REJECT 的邻居不可 citation。
2. **SOFT isolation tests**：SOFT 不得进 Approved / Model-visible / Citation / Synthesis。
3. **Temporal tests**：长跨度区间重叠不被单点年误杀；before/after 跨代 REJECT；propagation 跨代 SOFT（经 interval comparison 检出 cross-gen 后降级，须与 SOFT-WEAK 走独立 implementation 路径）；spoke 按 HARD 处理；contemporary_with 按 HARD 处理（overlap ACCEPT / cross-gen REJECT）；related_to 按 SOFT-WEAK 处理（跳过 interval comparison，直接 SOFT）；PROPAGATION→SOFT 与 SOFT-WEAK→SOFT 禁止合并为单一判断路径；no-date → SOFT。
4. **Eligibility tests**：1-hop ACCEPT + dimension mismatch 保留；N-hop ACCEPT + mismatch REJECT；N-hop + match ACCEPT。
5. **Synthesis isolation tests**：AI answer 不得进 synthesis question；contextual 不得升级 authoritative；fallback 不越权。
6. **Determinism tests**：同 snapshot + 同 config + 同 rules → 一致结果。
7. **Comparison tests**：Shared 仅来自 common_1hop；background 不进 `[ALLOWED FACTS]`。

---

## Contract Traceability（I-01~I-14 → ADR Decision → Implementation Area → Verification）

| Invariant | ADR Decision | Implementation Area | Verification |
|---|---|---|---|
| I-01 区间重叠 hard 前提 | §1 Temporal | grounding_builder 扩展逻辑 | Temporal tests #3 |
| I-02 before/after 非豁免 | §1 | 同上 | #3 |
| I-03 spoke ∈ HARD | §1 | relation 分类表 | #3 |
| I-04 gate 顺序 | §2 Eligibility | eligibility 层 | Eligibility tests |
| I-05 1-hop 不 relevance-reject | §2 | eligibility 层 | #4 |
| I-06 N-hop dimension-aware | §2 | eligibility 层 | #4 |
| I-07 SOFT 止于 Candidate | §2 + §3 | 角色判定层 | SOFT isolation #2 |
| I-08 Citation=ID(Model-visible) | §4 M1 | response_validator 授权范围 | Citation negative #1 |
| I-09 禁 topology 授权 | §4 M1 | response_validator（移除 G1）| #1 |
| I-10 仅 validated claim authoritative | §3 | claim 判定 | Claim tests |
| I-11 Synthesis 白名单 | §5 M5 | 综合 grounding 输入 | Synthesis isolation #5 |
| I-12 question 不嵌原始答案 | §5 M5 | ResearchReport question 构造（G3 改造）| #5 |
| I-13 expansion 有界/深度独立/gate/确定/终止 | §6 | expansion 引擎 | Expansion tests |
| I-14 确定性 | §6 | expansion 引擎 | Determinism #6 |

---

## Consequences

- **正面**：时代错位从 grounding 源头 + citation 授权双端消除；synthesis 回流关闭；权限链单调可审计；tuning 与架构分离。
- **代价**：现行 validator/grounding/ResearchReport 三处需实现改造（G1-G3）；无日期 root 饥饿等效果问题在实现后经 runtime tuning 校准（V-02）；3-hop 强链/噪音比例需 ground-truth 验证（V-03）；KG 可疑边需数据治理（V-04）——以上均不阻塞本 ADR。

## Non-Goals

- 不实现代码；不修 validator / grounding_builder / ResearchReport；不改 ADR-0027 / M36.0 report。
- 不冻结任何 runtime tuning 数值。
- 不新增 Contract invariant；不修改 Contract vNext 1.2。
- 不做产品优化 / UI / 模型选型。
- 不处理 KG 数据质量（V-04 属数据治理专项）。

## Status / Acceptance Criteria

- Status: **Accepted**.
- Acceptance：PO 确认本 ADR 与 Contract vNext 1.2 一致；M1-M8 决策齐备；G1-G4 已列为 Migration Requirement；ADR-0027 Superseded 声明生效。
