# M82 Implementation Constraint Record

> **阶段**：M82 Implementation Constraint Lock
> **来源**：M82 Architecture Gate Report → READY WITH CONDITIONS
> **状态**：Locked（M82 Implementation 启动前必须逐项签核的硬约束）
> **日期**：2026-08-05

---

## 约束总览

| # | 约束 | 类型 | 来源 |
| --- | --- | --- | --- |
| C-1 | Semantic Layer 定位 | 架构 | ADR-M79 + Architecture Gate §1 |
| C-2 | CausalStatement 不属于 Fact/Inference Layer | 架构 | Architecture Gate §1 |
| C-3 | Edge 不允许修改 | 冻结 | Architecture Gate §2 |
| C-4 | CausalStatement 通过 Adapter 访问 | 架构 | Architecture Gate §2 |
| C-5 | Adapter 只查询，不生成 | 行为 | Architecture Gate §5 |
| C-6 | AI 不生成 CausalStatement | 红线 | M82 Entry Brief §3.4 |
| C-7 | confidence 语义固化 | 数据 | Architecture Gate §3 (RA-1) |
| C-8 | CausalStatement 缺失时 fallback 行为 | 行为 | Architecture Gate §5 (Risk #2) |

---

## C-1：Semantic Layer 定位

| 项 | 内容 |
| --- | --- |
| **约束** | CausalStatement 属于 Semantic Layer，与 Fact Layer、Inference Layer、Exploration Layer 并列 |
| **依据** | ADR-M79 L34-35："independent Causal Semantic Layer"；`causal/model.py` L8："interpretive semantic layer, NOT a domain vocabulary extension" |
| **违规判定** | CausalStatement 的数据或代码写入 `domain/`、`graph.py`、Ontology 任一即违规 |
| **签核** | ________ |

---

## C-2：CausalStatement 不属于 Fact Layer / Inference Layer

| 项 | 内容 |
| --- | --- |
| **约束** | CausalStatement 不得被归类为 Fact Layer 内容（Entity/Relationship/Evidence Claim）或 Inference Layer 内容（Signal/推荐/评分） |
| **理由** | Fact Layer = 结构化标识符；Inference Layer = 算法推断。CausalStatement = 人工策展的因果语义，基于 Fact 但表达语义，区别于两者 |
| **违规判定** | CausalStatement 的 UI 标识与 Fact 或 Inference 混淆即违规 |
| **签核** | ________ |

---

## C-3：Edge 不允许修改

| 项 | 内容 |
| --- | --- |
| **约束** | `graph.py` 的 `Edge` 数据结构（`source`/`target`/`type` 三字段）不得增加任何字段 |
| **理由** | Edge 是 `DirectedGraph` 的核心数据结构，修改 Edge = 修改所有图算法签名。Graph Core 稳定是 Freeze Boundary 的核心 |
| **违规判定** | Edge 增加 `causal_statement_ids` 或任何其他字段即违规 |
| **签核** | ________ |

---

## C-4：CausalStatement 通过 Adapter 访问

| 项 | 内容 |
| --- | --- |
| **约束** | CausalStatement 的加载和查询必须通过 `CausalStatementAdapter`，不得直接在 `ExplorationEngine`、`KnowledgeGraph`、`GlobalGraph` 或其他核心模块中内联访问 |
| **理由** | Adapter 是 Semantic Layer 与 Fact Layer 之间的唯一桥接点。旁挂模式确保 CausalStatement 可以独立演化（增删改），不影响 Graph Core |
| **允许的 Adapter API** | `get_for_relationship(source_id, target_id, type)` / `get_for_entity(entity_id)` / `get_for_path(path)` |
| **违规判定** | `exploration_engine.py` 或 `knowledge_service.py` 直接 import `causal_statements.json` 或 `CausalLoader`（绕过 Adapter）即违规 |
| **签核** | ________ |

---

## C-5：Adapter 只查询，不生成

| 项 | 内容 |
| --- | --- |
| **约束** | `CausalStatementAdapter` 的所有方法必须是只读查询——从已加载的 CausalStatement 实例中检索匹配项，返回空列表或匹配结果。不得包含任何生成逻辑 |
| **允许** | 基于 `(source_id, target_id, type)` 三元组的精确/模糊匹配 |
| **禁止** | 自动生成 CausalStatement；调用 LLM/ML 模型；基于模板合成 CausalStatement 文本；从关系类型推断 CausalStatement |
| **违规判定** | Adapter 中包含 `generate_`/`synthesize_`/`infer_`/`predict_` 等非查询方法即违规 |
| **签核** | ________ |

---

## C-6：AI 不生成 CausalStatement

| 项 | 内容 |
| --- | --- |
| **约束** | M82 范围内，CausalStatement 内容 100% 来自 `causal_statements.json`（人工策展）。AI/LLM 不得参与 CausalStatement 的创建、修改、补充 |
| **理由** | M82 Entry Brief §3.4："AI 不作为事实来源"；P03："CausalStatement 自然语言句式是 Interpreter 的底线" |
| **违规判定** | 任何调用 AI/LLM API 生成 CausalStatement 的代码即违规 |
| **签核** | ________ |

---

## C-7：confidence 语义固化

| 项 | 内容 |
| --- | --- |
| **约束** | `CausalStatement.confidence` 的语义必须固化 |
| **用途** | Curator assessed confidence（策展者评估的置信度） |
| **允许值** | `"high"` \| `"medium"` \| `"low"` \| `null` |
| **high** | 策展者确认：这一因果关系在学术界有广泛共识 |
| **medium** | 策展者认为：有证据支撑但存在学术争议 |
| **low** | 策展者标注：此为初步假设或有争议的解释 |
| **null** | 未标注置信度 |
| **明确禁止** | algorithm confidence（算法置信度）/ AI confidence（AI 置信度）/ prediction probability（预测概率）/ 浮点数 0.0–1.0 |
| **原字段调整** | `CausalStatement.confidence` 类型从 `float \| None` 调整为 `str \| None`（Architecture Gate RA-1 的完整方案——不仅补 docstring，同时将类型从 float 改为枚举字符串，避免浮点数被误读为算法概率） |
| **违规判定** | confidence 值为浮点数或使用算法计算即违规 |
| **签核** | ________ |

---

## C-8：CausalStatement 缺失时 fallback 行为

| 项 | 内容 |
| --- | --- |
| **约束** | 当 `CausalStatementAdapter` 对某个查询返回空列表时，调用方必须降级到 Relationship Template fallback |
| **允许** | 使用 `understandingRules.ts` 的 `RELATIONSHIP_TEMPLATES`（已本地化）作为 fallback 文本 |
| **禁止** | 自动生成 CausalStatement 文本；调用 AI/LLM 生成替代文本；显示"因果陈述缺失"类错误信息（应静默降级） |
| **实现位置** | `_explain_path`（backend）和 `GuidePanel`（frontend）的 CausalStatement 查询处 |
| **违规判定** | CausalStatement 缺失时出现 500 错误、空白卡片、或自动生成文本即违规 |
| **签核** | ________ |

---

## Implementation 前置条件签核

| 约束 | 签核 | 日期 |
| --- | --- | --- |
| C-1 Semantic Layer 定位 | ✅ ACCEPTED | 2026-08-05 |
| C-2 不属于 Fact/Inference Layer | ✅ ACCEPTED | 2026-08-05 |
| C-3 Edge 不修改 | ✅ ACCEPTED | 2026-08-05 |
| C-4 Adapter 访问 | ✅ ACCEPTED | 2026-08-05 |
| C-5 Adapter 只查询不生成 | ✅ ACCEPTED | 2026-08-05 |
| C-6 AI 不生成 CausalStatement | ✅ ACCEPTED | 2026-08-05 |
| C-7 confidence 语义固化 | ✅ ACCEPTED | 2026-08-05 |
| C-8 fallback 行为 | ✅ ACCEPTED | 2026-08-05 |
| **全部签核 → 进入 M82 Implementation** | ✅ **APPROVED** | **2026-08-05** |

---

> 来源：M82 Architecture Gate Report（READY WITH CONDITIONS）
> 状态：Locked — 签核前不得进入 Implementation
> 日期：2026-08-05
