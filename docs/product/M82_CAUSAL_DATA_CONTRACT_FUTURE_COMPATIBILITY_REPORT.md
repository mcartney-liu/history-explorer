# M82 Causal Data Contract Future Compatibility Report

> **阶段**：M82 Causal Data Contract Future Compatibility Review
> **模式**：只读审查
> **日期**：2026-08-05
> **状态**：Compatibility Review（不影响 M82 Phase 1 Implementation）

---

## A. Current Contract Assessment

逐项评估当前 CausalStatement Schema 对大规模历史数据输入的支撑能力：

| 能力需求 | 判定 | 说明 |
| --- | --- | --- |
| **百万级 CausalStatement** | ✅ PASS | 7 字段的扁平结构（无嵌套对象），适合 JSON 文件 → 内存索引加载。当前 Loader 设计为单文件加载，百万级需要分片策略，但 Schema 本身不构成瓶颈 |
| **多来源输入** | ✅ PASS | `cause_id`/`effect_id` 引用 KG GID（跨主题全局唯一），支持多个 `evidence_refs` 引用不同 source。ADR-M79 明确 CausalStatement 是 reference model，指向已有 KG ID |
| **多版本历史解释** | ⚠️ GAP | 当前 Schema 无 `version`、`replaces`、`superseded_by` 字段。同一因果对（cause→effect）可能存在多个学术解释版本，但 Schema 无法区分"这是旧版本"和"这是最新版本"。详见 §D |
| **人工审核流程** | ⚠️ GAP | 当前 Schema 无 `status` 字段（Candidate/Review/Published/Deprecated）。CausalStatement 创建后即等同于 Published，无审核状态机。详见 §B |
| **AI 辅助抽取流程** | ⚠️ GAP | 当前 Schema 无 `proposed_by`（提议者）或 `reviewed_by`（审核者）字段。AI 抽取的候选 CausalStatement 与人工策展的已发布 CausalStatement 在 Schema 层面不可区分。详见 §F |

**结论**：当前 Schema 对 M82 Phase 1（5 条策展 CausalStatement）完全足够。但对百万级/多来源/多版本的未来场景，存在 3 个结构化缺口——生命周期管理、版本管理、来源区分。

---

## B. Lifecycle Compatibility Review

### 当前状态

CausalStatement Schema 无生命周期字段。创建即发布，无审核状态机。

### 未来需求

```
Candidate → Review → Published → Deprecated
```

| 状态 | 含义 | 当前支持？ |
| --- | --- | --- |
| Candidate | AI 辅助抽取或社区提交的待审核因果陈述 | ❌ |
| Review | 策展者正在审核中 | ❌ |
| Published | 审核通过，面向用户展示 | ✅（默认，无显式状态） |
| Deprecated | 旧版本被新研究取代 | ❌ |

### 建议（Contract 级，不进入 M82 Implementation）

**最小兼容方案**：新增 1 个字段 `status: str`，值域为 `"published" | "deprecated"`。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `status` | `"published"` \| `"deprecated"` \| `null` | 默认 `null`（等同于 `"published"`）。`"deprecated"` 表示此 CS 被新研究取代，不再向用户展示 |

> 为什么不是四态（Candidate/Review/Published/Deprecated）？因为 Candidate 和 Review 是 **工作流状态**，不属于 Semantic Layer 的数据语义。它们属于未来的 Curation Pipeline（策展流水线）——一个独立于 M82 的系统。Semantic Layer 只需要知道"这条数据对用户可见吗？"（published）和"这条数据已经过时了吗？"（deprecated）。

**不进入 M82 Implementation**。`status` 字段在 5 条 MVP 数据中默认为 `null`（published），不影响 Phase 1。

---

## C. Provenance Compatibility Review

### 当前链路

```
CausalStatement
  ↓ evidence_refs[]
Evidence Claim（evidence_claims.json）
  ↓ source_id
Source（sources.json）
```

### 当前 Source 字段

`sources.json` 已有：`id` / `type` / `title` / `creator` / `year` / `reference` / `license` / `publisher_or_archive` / `tier`。

### 兼容性评估

| 未来需求 | 当前支持？ | 说明 |
| --- | --- | --- |
| 书籍章节 | ⚠️ PARTIAL | `reference` 可承载章节信息，但无结构化 `chapter` / `page` 字段 |
| 页码 | ❌ GAP | 无 `page` 字段 |
| 作者 | ✅ PASS | `creator` 已存在 |
| 出版信息 | ✅ PASS | `publisher_or_archive` + `year` 已存在 |
| 论文引用 | ⚠️ PARTIAL | `type: "academic"` 可区分，但无 `journal` / `volume` / `doi` 字段 |
| 版本 | ❌ GAP | 无 `edition` / `version` 字段 |

### 建议（Source 层，不进入 M82 Implementation）

**当前不修改 `sources.json` Schema。** 理由：
1. M82 Phase 1 仅 5 条 CS，每条引用 1–3 个已有 evidence claim——不需要新增 source
2. Source Schema 的扩展属于数据基础设施层，不属于 Semantic Layer
3. 当 M84（包库扩展）引入更多内容时，Source Schema 扩展可作为 M84 的子任务

**未来建议**：在 `sources.json` Schema 中增加 `chapter` / `page` / `journal` / `doi` / `edition` 字段（建议字段，非必填），保持向后兼容。

---

## D. Versioning Review

### 当前状态

CausalStatement Schema 无版本字段。同一因果对只能有一条记录。

### 问题场景

```
T=1: 策展者创建 CS-001：科举制度 → 文官体系（基于 1980 年代研究）
T=2: 新研究发表，发现科举制度的影响被夸大
T=3: 策展者创建 CS-006：修正版因果陈述
```

当前 Schema 下，CS-001 和 CS-006 是两条独立记录，没有"CS-006 取代了 CS-001"的关系。

### 评估

| 需求 | 当前支持？ | 影响 |
| --- | --- | --- |
| 内容版本 | ❌ | 同一因果对的多版本解释无法关联 |
| 审核版本 | ❌ | 无审核记录（参见 §B） |
| 来源版本 | ❌ | 无法标记"此 CS 基于 2024 年的 source X" |

### 建议（Contract 级，不进入 M82 Implementation）

**最小兼容方案**：新增 2 个字段。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `replaces` | `str \| null` | 此 CS 取代的旧版本 CS ID。如 CS-006 的 `replaces: "cs-001"` |
| `replaced_by` | `str \| null` | 取代此 CS 的新版本 CS ID。如 CS-001 的 `replaced_by: "cs-006"`。可与 `status: "deprecated"` 配合使用 |

> 这两个字段构成单向链表（`cs-001 → replaced_by → cs-006`），不需要引入复杂的版本树。策展者只需在创建新版本时设置 `replaces`，Loader 在加载时自动设置旧版本的 `replaced_by`。

**不进入 M82 Implementation**。5 条 MVP 数据不需要版本管理。

---

## E. Writing Rule Review

逐项审查当前 6 条 Writing Rules 对未来大规模知识生产的适用性：

| # | 规则 | 判定 | 说明 |
| --- | --- | --- | --- |
| R1 | 完整中文句子，不用项目符号 | ✅ 保持 | 自然语言叙事是 Semantic Layer 的核心价值——CausalStatement 不是结构化字段，是"可读的故事"。即使百万级，也应保持 |
| R2 | mechanism 提及 cause/effect 名称 | ✅ 保持 | 独立可读性——用户看不到 GID，文本必须自包含 |
| **R3** | **consequence 包含跨文明/跨时代比较** | ⚠️ **调整为推荐** | 见下方详细分析 |
| R4 | 至少 1 个 evidence_refs | ✅ 保持 | M80.5 P06 的硬性要求 |
| R5 | low confidence 时文本含不确定性表述 | ✅ 保持 | Risk #1 缓解的核心机制 |
| R6 | 不引用不存在的 GID | ✅ 保持 | 数据一致性基线 |

### R3 特别审查

**当前**：R3 要求 consequence **应包含**跨文明/跨时代的对比视角。

**评估**：

| 维度 | 分析 |
| --- | --- |
| M81a Evidence | 3/4 Explorer 表达跨文明对比需求（E2/E3/E5）——需求真实 |
| 大规模可行性 | 并非所有因果陈述都有跨文明对比视角。例如"秦朝统一文字→汉字标准化"的 consequence 可能是"影响中国两千年文字统一"，不一定需要对比 |
| 策展负担 | 如果 R3 是强制规则，每条 CS 的策展者都必须寻找跨文明对比角度——这在大规模生产时会成为瓶颈 |

**建议**：R3 从强制规则（"应包含"）调整为推荐规则（"建议包含"）。

| 调整前 | 调整后 |
| --- | --- |
| R3: consequence 应包含跨文明/跨时代的对比视角 | R3: consequence **建议**包含跨文明/跨时代的对比视角（非强制）。当因果链天然具有跨文明对比价值时（如"中国文官体系 vs 欧洲封建制度"），应优先呈现 |

**理由**：M81a 验证发现跨文明对比是强需求，但这不意味着每条 CausalStatement 都必须有对比——有些因果链的内在价值就是"理解一个文明内部的演化"。R3 降为推荐规则后，策展者可以自行判断是否适合加入对比视角，不会被规则约束而强行对比。

---

## F. AI Assisted Ingestion Compatibility

### 未来流程

```
AI 从书籍中抽取 → Candidate CausalStatement
  ↓
人工审核
  ↓
Published CausalStatement（进入 Semantic Layer）
```

### 当前 Schema 兼容性

| 需求 | 当前支持？ | 缺口 |
| --- | --- | --- |
| AI 抽取结果存储 | ✅ PASS | 7 字段结构足够承载 AI 抽取的候选内容 |
| 区分 AI 候选 vs 人工策展 | ❌ GAP | 无 `proposed_by` 字段。AI 候选和人工策展在 Schema 层面不可区分 |
| 审核状态管理 | ❌ GAP | 同 §B——无 `status` 字段 |
| AI 不直接发布 | ✅ PASS | ADR-M79 + C-6 约束：AI 不生成 CausalStatement。此约束在 Schema 层面不需要特殊字段——通过流程控制（AI 候选进入独立 staging 区域，策展者审核后手动迁移至 `causal_statements.json`） |

### 建议（Contract 级，不进入 M82 Implementation）

**最小兼容方案**：新增 1 个字段 `proposed_by: str | null`。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `proposed_by` | `"human"` \| `"ai"` \| `null` | 默认 `null`（等同于 `"human"`）。`"ai"` 表示此 CS 由 AI 辅助抽取，经人工审核后发布 |

> `proposed_by` 不记录"哪个 AI 模型"——那是 Pipeline 的元数据，不属于 Semantic Layer。它只记录"这个内容是人工直接写的，还是 AI 抽出来人审过的"——这是用户信任的基础信息（M80.5 P07："信任来自透明"）。

**不进入 M82 Implementation**。M82 不涉及 AI。

---

## G. Required Contract Amendments

### 必须补充（进入 M82 后、大规模数据进入前）

| # | 字段 | 类型 | 用途 | 优先级 |
| --- | --- | --- | --- | --- |
| A1 | `status` | `"published"` \| `"deprecated"` \| `null` | 生命周期状态（§B） | 🔴 高（大规模数据进入前必须有） |
| A2 | `replaces` | `str \| null` | 此 CS 取代的旧版本 ID（§D） | 🟡 中（首次内容更新时引入） |
| A3 | `replaced_by` | `str \| null` | 取代此 CS 的新版本 ID（§D） | 🟡 中（Loader 自动设置） |

### 建议补充

| # | 字段 | 类型 | 用途 | 优先级 |
| --- | --- | --- | --- | --- |
| A4 | `proposed_by` | `"human"` \| `"ai"` \| `null` | 内容来源区分（§F） | 🟢 低（AI 辅助抽取 Pipeline 建立时引入） |

### 暂不需要（M82 范围内）

| # | 项 | 原因 |
| --- | --- | --- |
| — | Source Schema 扩展（chapter/page/doi 等） | 属于数据基础设施层，非 Semantic Layer。M84 时评估 |
| — | AI Pipeline staging 区域 | M83.5+ 范围 |
| — | CausalStatement 审核工作流 | 属于 Curation Pipeline，独立系统 |

### 对 M82 Phase 1 的影响

**零影响。** 以上 4 个建议字段（A1–A4）均不进入 M82 Implementation。M82 Phase 1 的 5 条 CausalStatement 使用当前 7 字段 Schema 完全足够。

---

## H. Final PO Decision

### M82 Causal Data Contract

**READY WITH NOTES**

| 判定 | 说明 |
| --- | --- |
| **READY** | 当前 7 字段 Schema 对 M82 Phase 1（5 条 MVP CausalStatement）完全足够，无任何阻塞因素 |
| **WITH NOTES** | 4 条未来兼容性建议（A1–A4）已记录，但不进入 M82 Implementation。这些建议在大规模数据进入前（M84 内容扩展阶段）作为 Schema 演进输入 |
| **不影响 M82 Phase 1** | Phase 1 可立即启动，使用当前 Schema 和 Data Contract Review 的 5 条 CS 设计 + 6 条 Writing Rules（R3 调整为推荐） |

### M82 原则确认

| # | 原则 | 状态 |
| --- | --- | --- |
| 1 | Semantic Layer 独立 | ✅ 确认——所有未来扩展字段均为 Semantic Layer 内部字段，不写入 Graph Core |
| 2 | CausalStatement 不进入 Graph Core | ✅ 确认——Adapter 旁挂模式不受影响 |
| 3 | AI 不生成事实 | ✅ 确认——`proposed_by` 仅记录来源，不授权 AI 直接发布 |
| 4 | Evidence 可追溯 | ✅ 确认——`evidence_refs` → `evidence_claims.json` → `sources.json` 链路完整 |
| 5 | Fact / Semantic / Inference 边界不可混淆 | ✅ 确认——所有建议字段均属于 Semantic Layer |

---

## 总结

| 维度 | 判定 |
| --- | --- |
| 百万级兼容 | ✅ PASS |
| 多来源兼容 | ✅ PASS |
| 多版本兼容 | ⚠️ 未来需 A2/A3 |
| 审核流程兼容 | ⚠️ 未来需 A1 |
| AI 辅助兼容 | ⚠️ 未来需 A4 |
| Provenance 兼容 | ⚠️ 未来需 Source Schema 扩展（非 Semantic Layer） |
| Writing Rules 兼容 | ✅ R3 调整为推荐 |
| M82 Phase 1 影响 | ✅ 零影响 |

**最终判断**：当前 Data Contract 对 M82 Phase 1 **READY**。4 条未来建议（A1–A4）作为 Schema 演进路线图记录，不阻塞 Phase 1。

---

> 审查模式：只读
> 审查对象：`M82_CAUSAL_DATA_CONTRACT_REVIEW.md` + ADR-M79 + `CausalStatement model` + `sources.json` + `evidence_claims.json`
> 日期：2026-08-05
> 结论：**READY WITH NOTES — 不影响 M82 Phase 1 Implementation**
