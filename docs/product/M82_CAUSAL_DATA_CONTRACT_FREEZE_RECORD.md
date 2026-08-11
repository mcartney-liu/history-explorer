# M82 Causal Data Contract Freeze Record

> **阶段**：M82 Causal Data Contract Freeze
> **来源**：`M82_CAUSAL_DATA_CONTRACT_REVIEW.md` + `M82_CAUSAL_DATA_CONTRACT_FUTURE_COMPATIBILITY_REPORT.md`
> **状态**：FROZEN — READY FOR P1.1 DATA CREATION
> **日期**：2026-08-05

---

## 1. Current Schema Freeze

M82 Phase 1 使用以下 7 字段 Schema。Phase 1 期间不得新增、删除或修改任何字段。

| # | 字段 | 类型 | 必填 | 语义 |
| --- | --- | --- | --- | --- |
| 1 | `id` | `str` | ✅ | 全局唯一标识符，格式 `cs-{编号}` |
| 2 | `cause_id` | `str` | ✅ | 原因端 KG Entity GID |
| 3 | `effect_id` | `str` | ✅ | 结果端 KG Entity GID |
| 4 | `mechanism` | `str \| null` | 否 | 因果机制："通过什么过程，原因导致了结果？" |
| 5 | `consequence` | `str \| null` | 否 | 因果后果："这个因果关系的长期影响是什么？" |
| 6 | `confidence` | `"high"` \| `"medium"` \| `"low"` \| `null` | 否 | 策展者置信度（Curator assessed confidence） |
| 7 | `evidence_refs` | `str[]` | 否 | Evidence Claim ID 列表（指向 `evidence_claims.json`） |

### Writing Rules（6 条，Phase 1 冻结）

| # | 规则 | 强制 |
| --- | --- | --- |
| R1 | mechanism/consequence 用完整中文句子，不用项目符号 | ✅ 强制 |
| R2 | mechanism 中提及 cause/effect 的具体名称 | ✅ 强制 |
| R3 | consequence **建议**包含跨文明/跨时代对比视角（非强制） | 🟡 推荐 |
| R4 | 每条 CS 至少 1 个 evidence_refs | ✅ 强制 |
| R5 | confidence 为 `"low"` 时，mechanism 文本含学术不确定性表述 | ✅ 强制 |
| R6 | 不引用不存在的 KG Entity GID | ✅ 强制 |

### confidence 值域（C-7 固化）

| 值 | 语义 |
| --- | --- |
| `"high"` | 学术界广泛共识，多来源支撑 |
| `"medium"` | 有证据支撑但存在学术争议 |
| `"low"` | 初步假设、有争议的解释、证据有限 |
| `null` | 未标注置信度 |

---

## 2. Future Compatibility Notes

以下为 Future Compatibility Report 识别的兼容性评估（不影响 Phase 1 Schema）：

| 能力 | 判定 | 说明 |
| --- | --- | --- |
| 百万级 CausalStatement | ✅ PASS | 扁平结构适合分片加载 |
| 多来源输入 | ✅ PASS | GID 引用 + evidence_refs 支撑 |
| 多版本历史解释 | ⚠️ 未来需版本字段 | 见 §3 A2/A3 |
| 人工审核流程 | ⚠️ 未来需 status 字段 | 见 §3 A1 |
| AI 辅助抽取 | ⚠️ 未来需 proposed_by 字段 | 见 §3 A4 |
| Provenance 深度追溯 | ⚠️ 未来需 Source Schema 扩展 | 非 Semantic Layer，M84 时评估 |

---

## 3. Deferred Fields

以下字段已确认不进入 M82 Implementation。在大规模数据进入前（M84+）作为 Schema 演进输入。

| # | 字段 | 类型 | 用途 | 优先级 | 引入时机 |
| --- | --- | --- | --- | --- | --- |
| A1 | `status` | `"published"` \| `"deprecated"` \| `null` | 生命周期状态 | 🔴 高 | 大规模数据进入前 |
| A2 | `replaces` | `str \| null` | 此 CS 取代的旧版本 ID | 🟡 中 | 首次内容更新时 |
| A3 | `replaced_by` | `str \| null` | 取代此 CS 的新版本 ID（Loader 自动设置） | 🟡 中 | 首次内容更新时 |
| A4 | `proposed_by` | `"human"` \| `"ai"` \| `null` | 内容来源区分 | 🟢 低 | AI Pipeline 建立时 |

---

## 4. Non-M82 Scope Boundary

以下明确**不进入 M82 Implementation**：

| # | 项 | 原因 |
| --- | --- | --- |
| 1 | A1–A4 Deferred Fields | 5 条 MVP 数据不需要生命周期/版本/AI 字段 |
| 2 | Source Schema 扩展（chapter/page/doi/journal/edition） | 属于数据基础设施层，非 Semantic Layer |
| 3 | AI Pipeline staging 区域 | M83.5+ 范围 |
| 4 | CausalStatement 审核工作流 | 属于 Curation Pipeline，独立系统 |
| 5 | 多语言 CausalStatement（en/ja） | Phase 1 仅中文 |
| 6 | CausalStatement 全文搜索 | 非 M82 Scope |
| 7 | CausalStatement 自动发现/推理 | ADR-M79 Non-goals |

---

## 5. PO Acceptance

| 签核项 | 签名 | 日期 |
| --- | --- | --- |
| 7 字段 Schema 冻结确认 | ________ | ________ |
| 6 条 Writing Rules 冻结确认 | ________ | ________ |
| confidence 值域确认 | ________ | ________ |
| Deferred Fields（A1–A4）确认不进入 M82 | ________ | ________ |
| Non-M82 Scope Boundary 确认 | ________ | ________ |
| **P1.1 DATA CREATION 授权** | ________ | ________ |

签核后执行：`P1.1` — 创建 `data/causal_statements.json`（5 条 CausalStatement）。

---

> 来源：`M82_CAUSAL_DATA_CONTRACT_REVIEW.md` + `M82_CAUSAL_DATA_CONTRACT_FUTURE_COMPATIBILITY_REPORT.md`
> 日期：2026-08-05
> 状态：**FROZEN — READY FOR P1.1 DATA CREATION**
