# M82 Implementation Plan v2

> **版本**：v2（Architecture Review 修订版）
> **v1 → v2 变更**：Layer Architecture 重构（新增 Semantic Layer）+ Edge 修改方案改为 Adapter 旁挂 + 数据范围缩减 + MVP Scope 三阶段重划分
> **阶段**：M82 Implementation Planning（不实现）
> **来源**：M82 Entry Gate APPROVED → M82 Causal Semantics Visible
> **日期**：2026-08-05
> **状态**：Plan v2（待 PO 审核后进入 Implementation）

---

## A. Causal Semantics 产品目标

**Mission**：将 CausalStatement 从"后台字段"变成"可读、可追溯、可验证的探索路径"。

**用户价值**：Explorer 在看到 Entity/Relationship 时，不再只是"知道 A 和 B 有关联"，而是能读懂"因为什么原因，A 导致了 B，产生了什么后果，证据是什么"。

---

## B. Layer Architecture（修订）

### B.1 评估：CausalStatement 属于哪一层？

| 候选层 | 支持理由 | 反对理由 |
| --- | --- | --- |
| **Fact Layer** | CausalStatement 基于 Evidence（事实支撑） | ADR-M79 明确将其定义为 "interpretive semantic layer"，非 domain vocabulary |
| **Inference Layer** | 带有 confidence 字段（置信度） | CausalStatement 不是系统推断——它是人工策展的因果解释，有证据支撑 |
| **Semantic Layer（新增）** | 介于 Fact 和 Inference 之间：基于 Fact（Evidence 引用），表达语义（mechanism/consequence 自由文本），不同于 Fact 的结构化字段，也不同于 Inference 的算法推断 | — |

**结论：CausalStatement 属于 Semantic Layer。**

理由：
1. ADR-M79 原文：`CausalStatement` 是 "interpretive semantic layer"——它**已经**是一个独立的层，不是 Fact 也不是 Inference。
2. CausalStatement 的核心特征：基于 Fact（Evidence 引用），但表达的是**语义**（mechanism/consequence 是自然语言文本，不是结构化字段）。这与 Fact-Layer 的 Entity/Relationship（结构化标识符）有本质区别。
3. CausalStatement 的 confidence 字段是策展者标注的置信度，不是算法推断——所以不属于 Inference-Layer。

### B.2 修订后的四层架构

```
┌─────────────────────────────────────────────┐
│          Exploration Layer（探索层）           │
│   Guide / Navigator / Interpreter / Analyst  │
│   消费下层输出，提供叙事理由 / 推荐 / 因果故事  │
│   不在本层存储数据                              │
├─────────────────────────────────────────────┤
│          Inference Layer（推断层）              │
│   Signal（系统推断）/ 推荐评分 / 关联权重       │
│   带"系统推断"视觉标识                          │
│   来源：系统算法                                │
│   可被用户质疑 / 不被信任为事实                 │
├─────────────────────────────────────────────┤
│          Semantic Layer（语义层）← 新增         │
│   CausalStatement（因果陈述）                   │
│   基于 Fact-Layer 的 Entity/Relationship/      │
│   Evidence，表达因果语义（mechanism/           │
│   consequence 自然语言文本）                    │
│   带"基于证据"视觉标识                          │
│   来源：人工策展 + Evidence 引用               │
│   不可被 AI 生成（M82 范围内）                  │
├─────────────────────────────────────────────┤
│          Fact Layer（事实层）                   │
│   Entity / Relationship / Evidence Claim      │
│   结构化标识符 / 关系类型 / 来源引用            │
│   来源：KG 数据 + 策展                         │
│   不可被修改                                   │
└─────────────────────────────────────────────┘
```

### B.3 四层职责对比

| 层 | 数据特征 | 标识 | 可修改？ | 来源 |
| --- | --- | --- | --- | --- |
| **Fact** | 结构化（id/type/name） | 无特殊标识（默认可信） | 仅策展 | KG JSON |
| **Semantic** | 自然语言文本（mechanism/consequence） | "基于证据" + 可溯源引用 | 仅策展（M82） | 策展 + Evidence 引用 |
| **Inference** | 数值/枚举（评分/权重/语义匹配类型） | "系统推断" | 系统算法自动更新 | 算法 |
| **Exploration** | 渲染后文本（叙事理由/推荐/因果故事） | 引用下层标识 | 无持久化 | 消费下层输出 |

### B.4 CausalStatement 的 Semantic Layer 定位对 M82 的影响

| 影响 | 说明 |
| --- | --- |
| CausalStatement **不存储在 Edge 上** | Semantic Layer 与 Fact Layer 物理分离——CausalStatement 存储在独立文件，通过 Adapter 关联，不修改 `graph.py` Edge |
| CausalStatement 的 UI 标识为 "基于证据" | 与 Fact-Layer 共用绿色系标识（因基于 Evidence），与 Inference-Layer 的蓝色 "系统推断" 区分 |
| M83.5 的 AI 可在 Semantic Layer 上叠加 | AI 解释是在 CausalStatement 骨架上的个性化表达，不修改 Semantic Layer 原文 |

---

## C. Edge 修改方案修订

### C.1 原方案（v1）：Edge 增加 `causal_statement_ids`

**被否决。** 理由：

| 原则 | 违反原因 |
| --- | --- |
| **Relationship Layer 稳定原则** | `Edge` 是 `DirectedGraph` 的核心数据结构，修改 Edge = 修改所有图算法的签名。Graph Core 的稳定是 Freeze Boundary 的核心 |
| **Fact/Inference Boundary** | CausalStatement 属于 Semantic Layer，不是 Fact Layer。将 Semantic Layer 的标识写入 Fact Layer 的 Edge = 跨层污染 |
| **Side Index 不污染核心模型** | 项目已有 precedent：Signal/评分通过 `SideIndex` 旁挂，不写入 `Entity`/`Relationship` 本体。CausalStatement 应遵循同一模式 |

### C.2 修订方案：CausalStatement Adapter（旁挂关联）

```
causal_statements.json（独立数据文件）
  ↓
CausalStatementAdapter（新增，旁挂模块）
  ↓ 提供方法：
  │  get_causal_statements_for_relationship(source_id, target_id, type) → List[CausalStatement]
  │  get_causal_statements_for_entity(entity_id) → List[CausalStatement]
  │  get_causal_statements_for_path(path: List[Edge]) → List[CausalStatement]
  ↓
ExplorationEngine._explain_path 通过 Adapter 查询 CausalStatement
```

**不修改**：
- `graph.py` — Edge 结构不变
- `DirectedGraph` — 图算法不变
- `KnowledgeGraph` — 图构建逻辑不变
- `Relationship` 枚举 — 不新增类型

**新增**：
- `backend/app/core/causal/adapter.py` — `CausalStatementAdapter`
- `backend/app/core/causal/loader.py` — 从 `causal_statements.json` 加载
- `data/causal_statements.json` — CausalStatement 实例数据

**与现有 Side Index 模式一致**：Signal/评分通过 `relationshipUtils.ts` 的 `SideIndex` 旁挂，不修改 Entity/Relationship 本体。CausalStatement 遵循同一原则。

---

## D. 数据范围修订

### D.1 原方案（v1）：4 个探索包 × 3-5 条 = 12-20 条 CausalStatement

**缩减为验证规模。**

| 调整 | 原方案 | 修订方案 | 理由 |
| --- | --- | --- | --- |
| 覆盖主题 | 4 个探索包（中国/丝路/罗马/印度） | **1 个探索包（中国文明）** | M82 目标是验证机制，不是扩充知识库。中国包是 M81a 验证中最成熟的场景（E1/E2/E5 三场走通） |
| 条数 | 12-20 条 | **5 条** | 足以覆盖：1 条简单因果 + 1 条多跳因果 + 1 条带多个 Evidence + 1 条低 confidence + 1 条复杂 consequence。5 条覆盖所有字段组合 |
| 扩展策略 | — | M82 完成后，按需扩展到其他 3 个包（可纳入 M84 包库扩展） | 机制验证通过后再扩充内容 |

### D.2 5 条 CausalStatement 覆盖矩阵

| # | 场景 | 覆盖字段 |
| --- | --- | --- |
| CS-01 | 科举制度 → 文官体系建立（简单因果） | mechanism + consequence + confidence(high) + 1 evidence |
| CS-02 | 三省六部 → 内阁体系（多跳因果） | mechanism + consequence + confidence(high) + 2 evidence |
| CS-03 | 汉朝 → 丝绸之路开通（跨域因果） | mechanism + consequence + confidence(medium) + 3 evidence |
| CS-04 | 宋朝 → 理学兴起（低置信度因果） | mechanism + consequence + confidence(low) + 1 evidence |
| CS-05 | 明朝 → 郑和下西洋（复杂后果） | mechanism + consequence(长文本) + confidence(high) + 2 evidence |

---

## E. MVP Scope 三阶段重划分

### Phase 1：最小可信因果链（Minimum Viable Causal Chain）

**目标**：让一条因果关系从数据到 UI 端到端走通。

| # | 任务 | 所属层 | 触 Freeze？ |
| --- | --- | --- | --- |
| P1.1 | 创建 5 条 CausalStatement 实例数据 | Semantic Layer | ⚠️ 新增数据文件 |
| P1.2 | 实现 CausalStatement Loader（从 JSON 加载） | Semantic Layer | ✅ 不触 |
| P1.3 | 实现 CausalStatementAdapter（旁挂查询） | Semantic Layer | ✅ 不触 |
| P1.4 | `_explain_path` 注入 CausalStatement 文本 | Backend | ✅ 不触 |
| P1.5 | API 返回 CausalStatement（entity/explore） | Backend | ✅ 不触 |
| P1.6 | CausalStatementCard 渲染组件（mechanism/consequence/confidence） | Frontend | ✅ 不触 |
| P1.7 | Evidence 可点击溯源（`evidence_refs` → `evidence_claims.json`） | Frontend | ✅ 不触 |
| P1.8 | 单元测试（Loader + Adapter + `_explain_path`） | Test | ✅ 不触 |

**Phase 1 验收**：Explorer 能在关系链中看到一条因果陈述，点击 Evidence 能跳转到证据详情。

### Phase 2：Guide 叙事理由

**目标**：Guide 推荐附带基于 CausalStatement 的叙事理由。

| # | 任务 | 所属层 | 触 Freeze？ |
| --- | --- | --- | --- |
| P2.1 | Guide `getNextSteps` 增强：推荐原因从模板字符串 → CausalStatement 叙事理由 | Backend | ✅ 不触 |
| P2.2 | Guide 叙事理由 i18n 模板（zh/en/ja） | Frontend | ✅ 不触 |
| P2.3 | GuidePanel 渲染叙事理由 | Frontend | ✅ 不触 |
| P2.4 | 单元测试 + Explorer Validation | Test | ✅ 不触 |

**Phase 2 验收**：Explorer 能说出"为什么系统推荐我看这个"。

### Phase 3：Fact/Inference 展示体系

**目标**：在 UI 上系统化区分 Fact-Layer、Semantic-Layer、Inference-Layer。

| # | 任务 | 所属层 | 触 Freeze？ |
| --- | --- | --- | --- |
| P3.1 | LayerBadge 组件（Fact 绿色 / Semantic 绿色+"基于证据" / Inference 蓝色+"系统推断"） | Frontend | ✅ 不触 |
| P3.2 | RelationshipChain 嵌入 CausalStatementCard + LayerBadge | Frontend | ✅ 不触 |
| P3.3 | Signal 区域增加 "系统推断" 标识（P05） | Frontend | ✅ 不触 |
| P3.4 | Explorer Validation（SC-3：Fact vs Inference 可区分） | Test | ✅ 不触 |

**Phase 3 验收**：Explorer 能识别界面上哪些信息属于哪一层。

### 阶段依赖

```
Phase 1 ──→ Phase 2
         └─→ Phase 3（可与 Phase 2 并行）
```

Phase 1 是最小可交付链路。Phase 2 和 Phase 3 依赖 Phase 1 的数据基础，但彼此独立。

---

## F. M82 Gate Criteria

| # | 标准 | 验证方式 | Phase 覆盖 |
| --- | --- | --- | --- |
| SC-1 | CausalStatement 可读：Explorer 能用自己的话复述因果 | Explorer Validation（≥3/4） | Phase 1 |
| SC-2 | Evidence 可溯源：Explorer 能从 CausalStatement 点击跳转到 Evidence | 功能验收 + Explorer Validation | Phase 1 |
| SC-3 | Fact vs Inference 可区分：Explorer 能识别界面上的信息归属层 | Explorer Validation（≥3/4） | Phase 3 |
| SC-4 | Guide 叙事理由可理解：Explorer 能说出"为什么推荐这个" | Explorer Validation（≥3/4） | Phase 2 |
| SC-5 | AI 不可用时仍可用：关闭 AI 后 CausalStatement 正常呈现 | 自动化测试 | Phase 1 |
| SC-6 | Freeze Gate 未触：ENTITY=8 / RELATIONSHIP=18 不变 | freeze-check 脚本 | Phase 1–3 |

---

## G. Non-Scope（不变）

| # | 禁止项 |
| --- | --- |
| 1 | AI Runtime / LLM 生成事实 |
| 2 | Ontology 扩展（ENTITY=8 / RELATIONSHIP=18 不变） |
| 3 | 新数据库 |
| 4 | 用户画像 |
| 5 | Trail 持久化（M83） |
| 6 | 新探索包（M84） |
| 7 | AI 介入探索（M83.5） |
| 8 | 修改 Graph Core（Edge/Relationship 枚举不变） |

---

## H. v1 → v2 变更摘要

| 审查意见 | 原方案 (v1) | 修订方案 (v2) | 理由 |
| --- | --- | --- | --- |
| 1. Layer Architecture | Fact/Inference/Exploration 三层 | **Fact/Semantic/Inference/Exploration 四层** | ADR-M79 已将 CausalStatement 定义为 interpretive semantic layer；它与 Fact（结构化）和 Inference（算法推断）有本质区别 |
| 2. Edge 修改 | Edge 增加 `causal_statement_ids` | **CausalStatementAdapter 旁挂** | 不修改 Graph Core；遵循 Side Index 不污染核心模型原则；Semantic Layer 不应写入 Fact Layer |
| 3. 数据范围 | 4 个探索包 × 3-5 条（12-20 条） | **1 个探索包（中国文明）× 5 条** | 验证机制，不扩充知识库；5 条覆盖所有字段组合 |
| 4. MVP Scope | 4 Phase（Data→Backend→Frontend→Test） | **3 Phase（最小因果链→Guide叙事→Fact/Inference体系）** | Phase 1 最小可交付，Phase 2/3 可并行；更符合 MVP 迭代节奏 |

---

> 版本：v2（Architecture Review 修订版）
> 来源：M82 Entry Brief + M80.5 Revision Acceptance + Architecture Review
> 日期：2026-08-05
> 状态：Plan v2（待 PO 审核后进入 Implementation）
