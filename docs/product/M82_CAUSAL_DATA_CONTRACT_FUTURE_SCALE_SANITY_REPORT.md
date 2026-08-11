# M82 Causal Data Contract Future Scale Sanity Report

> **阶段**：M82 P1.2 前置检查
> **模式**：只读分析
> **日期**：2026-08-05
> **结论**：**READY FOR M82 IMPLEMENTATION — 无阻断 M82 的 Schema 问题**

---

## 1. Executive Summary

对当前 7 字段 CausalStatement Schema 进行了未来规模化场景的全方位压力测试（百万级数据、真实书本输入、多解释版本、AI Pipeline）。结论：

- **无阻断 M82 Phase 1 的 Schema 缺陷**。当前 Schema 对 M82 的 5 条 MVP 数据 + Loader + Adapter + `_explain_path` + CausalStatementCard 端到端链路完全足够
- 识别了 **5 个未来演进需求**，其中 2 个是 M82 范围内应关注的（非阻断），3 个属于 M84+ 范围
- 当前 Schema 的 **一对多因果、多对一因果** 能力已被隐性支持（多条 CS 共享 cause_id/effect_id），不需要 Schema 级修改

---

## 2. Current Schema Assessment

### 2.1 Schema 扩展能力：真实书本数据适配

| 数据来源 | 当前 Schema 能否表达？ | 缺失字段 | 优先级 |
| --- | --- | --- | --- |
| 教科书 | ✅ 可表达 | 无 | — |
| 历史专著 | ✅ 可表达 | 无 | — |
| 学术论文 | ✅ 可表达 | 论文 DOI/期刊（属于 Source 层，非 Semantic Layer） | M84+ |
| 档案资料 | ✅ 可表达 | 档案编号/馆藏地（属于 Source 层） | M84+ |
| 多语言资料 | ⚠️ 可表达但有风险 | 无 `language` 字段——当前 5 条 CS 全为中文，未来英文/日文 CS 混入同一文件时无法区分语言 | M82 范围（非阻断） |

### 2.2 字段分类：必须 / 建议 / 暂不需要

| 分类 | 字段 | 原因 |
| --- | --- | --- |
| **M82 范围应关注** | `language`（可选，`"zh"`/`"en"`/`"ja"`/`null`） | 当前 5 条 CS 均为中文，但 P1.6 的 CausalStatementCard 渲染时需要知道当前 CS 的语言以正确断句/排版。**不阻断 P1.2**——可在 P1.6 实现时按需添加 |
| M84+ 建议 | `status`（`"published"`/`"deprecated"`） | 生命周期管理（Future Compatibility §B） |
| M84+ 建议 | `replaces` / `replaced_by` | 版本管理（Future Compatibility §D） |
| M84+ 建议 | `proposed_by`（`"human"`/`"ai"`） | AI Pipeline 兼容（Future Compatibility §F） |
| 暂不需要 | `author` / `created_at` / `updated_at` | 属于 Curation Pipeline 元数据，非 Semantic Layer 数据语义 |

---

## 3. Million Scale Analysis

### 3.1 当前 JSON 数据结构的规模瓶颈

| 维度 | 当前状态 | 百万级（1M CS）评估 |
| --- | --- | --- |
| **id 唯一性** | 手动分配 `cs-001` ~ `cs-005` | ⚠️ 百万级需要自动化 ID 生成（建议 `cs-{sha256(cause_id+effect_id)[:8]}` 或数据库自增），但这不是 Schema 问题——是数据生产流程问题 |
| **索引方式** | 当前 Loader 设计为全量加载到内存 `dict` | ⚠️ 百万级（假设每条 CS 平均 500 字节 = 500MB JSON）全量内存加载可行但边界。需要分片策略或增量加载。**不阻断 M82**——M82 仅 5 条 |
| **查询方式** | Adapter 通过 `(cause_id, effect_id, type)` 三元组 O(n) 遍历 | ⚠️ 百万级需要哈希索引。**不阻断 M82**——5 条数据 O(n) 足够 |
| **evidence_refs 增长** | 每条 1-2 个引用 | ✅ evidence_refs 是 ID 数组，不随 CS 数量膨胀——膨胀的是 `evidence_claims.json`（独立文件） |
| **Entity 关联查询** | 通过 GID 字符串匹配 | ⚠️ 百万级需要全局 GID 哈希表（`backend/app/core/registry.py` 已有 GlobalRegistry） |

### 3.2 Adapter API 规模评估

| API | 5 条 | 百万级 | 是否需要提前设计？ |
| --- | --- | --- | --- |
| `get_for_relationship(source, target, type)` | O(5) | O(1M) — 需要哈希索引 | 否——M82 实现时 O(n) 即可，未来替换为哈希索引不影响 API 签名 |
| `get_for_entity(entity_id)` | O(5) | O(1M) — 同上 | 否 |
| `get_for_path(path)` | O(5 × len(path)) | O(1M × len(path)) — 同上 | 否 |

**结论**：当前 Adapter API 签名对百万级是兼容的——只需要在 Loader 内部建立索引（哈希表），API 签名不变。M82 阶段无需引入数据库/搜索引擎/缓存。

---

## 4. Book Data Ingestion Simulation

模拟真实书本数据进入的完整链路：

```
书本 PDF
  → 章节切片
    → Evidence Claim（evidence_claims.json）
      → 候选 CausalStatement（causal_statements.json）
        → 专家审核
          → Published Semantic Layer
```

### 4.1 当前 Schema 在每个环节的适配

| 环节 | 当前支持？ | 说明 |
| --- | --- | --- |
| 章节切片 → Evidence Claim | ✅ `evidence_claims.json` 的 `text` 字段可承载 | 76 条已有 claim 证明了此能力 |
| Evidence Claim → CausalStatement | ✅ `evidence_refs` 引用 claim ID | 5 条 CS 已验证 |
| 候选 → 专家审核 | ⚠️ 无 `status` 区分候选/已发布 | Future Compatibility §B — M84+ 引入 |
| 审核 → Published | ✅ 当前所有 CS 默认 published | 5 条 MVP 不需要审核流 |

### 4.2 一对多因果（One Cause → Many Effects）

**示例**：工业革命 → 城市化 + 工人阶级形成 + 全球贸易变化

**当前 Schema 如何表达**：

```json
{"id": "cs-010", "cause_id": "X:industrial-revolution", "effect_id": "X:urbanization", ...}
{"id": "cs-011", "cause_id": "X:industrial-revolution", "effect_id": "X:working-class", ...}
{"id": "cs-012", "cause_id": "X:industrial-revolution", "effect_id": "X:global-trade", ...}
```

✅ **支持**。多条 CS 共享同一个 `cause_id`，通过 `get_for_entity(cause_id)` 查询所有下游因果。

### 4.3 多对一因果（Many Causes → One Effect）

**示例**：财政危机 + 启蒙思想 + 社会矛盾 → 法国大革命

```json
{"id": "cs-020", "cause_id": "X:fiscal-crisis", "effect_id": "X:french-revolution", ...}
{"id": "cs-021", "cause_id": "X:enlightenment", "effect_id": "X:french-revolution", ...}
{"id": "cs-022", "cause_id": "X:class-conflict", "effect_id": "X:french-revolution", ...}
```

✅ **支持**。多条 CS 共享同一个 `effect_id`，通过 `get_for_entity(effect_id)` 查询所有上游因果。

### 4.4 同一因果对的多个解释

**示例**：农业发展 → 文明形成，存在三种解释（环境因素 / 人口压力 / 技术演进）

```json
{"id": "cs-030", "cause_id": "X:agriculture", "effect_id": "X:civilization",
 "mechanism": "环境因素解释：...", ...}
{"id": "cs-031", "cause_id": "X:agriculture", "effect_id": "X:civilization",
 "mechanism": "人口压力解释：...", ...}
{"id": "cs-032", "cause_id": "X:agriculture", "effect_id": "X:civilization",
 "mechanism": "技术演化解...", ...}
```

✅ **支持**。`(cause_id, effect_id)` 对不是唯一键——多条 CS 可以有相同的 cause/effect 但不同的 mechanism。这正是 `CausalStatementAdapter.get_for_relationship()` 返回 `List[CausalStatement]` 而非 `Optional[CausalStatement]` 的原因。

---

## 5. Multi-cause / Multi-effect Capability

| 能力 | Schema 级支持？ | Adapter 级支持？ | 说明 |
| --- | --- | --- | --- |
| 一对多因果 | ✅ | ✅ `get_for_entity(cause_id)` 返回所有 effect | 已设计 |
| 多对一因果 | ✅ | ✅ `get_for_entity(effect_id)` 返回所有 cause | 已设计 |
| 同一因果多解释 | ✅ | ✅ `get_for_relationship()` 返回 `List` | 已设计 |
| 因果链（A→B→C） | ✅ | ✅ `get_for_path()` 返回路径上所有 CS | 已设计 |

**无 Schema 级缺口。**

---

## 6. Version Evolution Analysis

### 6.1 旧解释保留 + 新解释新增

场景：CS-001（罗马衰亡 = 经济危机）被新研究修正为 CS-006（罗马衰亡 = 多因素）。

| 需求 | 当前支持？ | 解决方案 |
| --- | --- | --- |
| 旧解释保留（CS-001 不删除） | ✅ 是 | CS-001 和 CS-006 共存，通过 `(cause_id, effect_id)` 查到时返回两条 |
| 新解释新增（CS-006 创建） | ✅ 是 | 新 CS 的 `id` 不同，独立记录 |
| 两者共存（用户可看到两种解释） | ✅ 是 | UI 需展示多个 CausalStatement（属于 P1.6 的渲染逻辑） |
| 替代关系（CS-006 取代 CS-001） | ⚠️ 需 `replaces`/`replaced_by` | Future Compatibility §D — M84+ |

### 6.2 Future Compatibility 建议字段是否足够？

`status: "deprecated"` + `replaces` + `replaced_by` **足够**。这三个字段构成最小版本管理方案：
- `status: "deprecated"` → 旧版本对用户不可见
- `replaces: "cs-001"` → 新版本声明取代关系
- `replaced_by: "cs-006"` → 旧版本指向新版本（Loader 自动设置）

不需要复杂的版本树/分支/合并——历史因果解释的版本管理是"新取代旧"，不是"多个分支并行演化"。

---

## 7. Provenance Boundary Analysis

### 7.1 三层归属判定

| 信息 | 归属层 | 理由 |
| --- | --- | --- |
| `evidence_refs` → claim ID | **Semantic Layer** | CausalStatement 的核心字段——"这个因果基于哪些证据" |
| claim ID → claim text | **Evidence Layer** | `evidence_claims.json` — 证据本身 |
| claim → source (book/author/page) | **Source Infrastructure** | `sources.json` — 来源元数据 |
| book title / author | **Source Infrastructure** | 来源描述，不属于因果语义 |
| chapter / page | **Source Infrastructure** | 定位信息 |
| edition / publication_year | **Source Infrastructure** | 版本信息 |
| DOI / URL | **Source Infrastructure** | 外部引用 |

### 7.2 当前链路完整性

```
CausalStatement.evidence_refs[] → evidence_claims.json → sources.json
```

✅ 三层链路完整，不缺失中间层。未来需要补充的是 Source Infrastructure 层的字段（chapter/page/doi），但这不影响 Semantic Layer 和 Evidence Layer。

---

## 8. AI Pipeline Compatibility

### 8.1 未来 AI 抽取流程

```
Document → LLM Extraction → Candidate CausalStatement → Curation Pipeline → Published
```

### 8.2 当前 Schema 的 AI Pipeline 适配

| 需求 | 归属 | 当前 Schema 是否需要修改？ |
| --- | --- | --- |
| `proposed_by: "ai"` | **Semantic Layer**（建议字段） | ⚠️ M84+ — 5 条 MVP 均为人工策展 |
| `generated_by: "gpt-4"` | **Curation Pipeline**（非 Semantic Layer） | ❌ 不属于 Semantic Layer——这是 Pipeline 的元数据 |
| `review_status: "pending"` | **Curation Pipeline**（非 Semantic Layer） | ❌ 同上 |
| AI 候选 → 人工审核 → Published | **Curation Pipeline**（流程） | ❌ 当前所有 CS 直接为 Published |

**关键判断**：`proposed_by` 属于 Semantic Layer（影响用户对内容的信任判断——"这是人写的还是 AI 抽出来人审的"），但 `generated_by` 和 `review_status` 属于 Curation Pipeline（工作流元数据）。当前 Schema 不需要为 AI Pipeline 预留 Pipeline 级字段——那些属于独立的策展系统。

---

## 9. Required Future Evolution Roadmap

### 不阻断 M82（M82 范围内可选）

| # | 项 | 优先级 | 建议时机 |
| --- | --- | --- | --- |
| F1 | `language` 字段（`"zh"`/`"en"`/`"ja"`/`null`） | 🟡 中 | P1.6 CausalStatementCard 实现时按需添加——当前 5 条 CS 全中文，不阻塞 |

### M84+ 引入（大规模数据进入前）

| # | 项 | 优先级 | 引入时机 |
| --- | --- | --- | --- |
| F2 | `status`（`"published"`/`"deprecated"`） | 🔴 高 | 首次内容更新时 |
| F3 | `replaces` / `replaced_by` | 🟡 中 | 首次内容更新时 |
| F4 | `proposed_by`（`"human"`/`"ai"`） | 🟢 低 | AI Pipeline 建立时 |
| F5 | Source Schema 扩展（chapter/page/doi/journal/edition） | 🟡 中 | M84 包库扩展时 |

### 不需要引入

| # | 项 | 原因 |
| --- | --- | --- |
| — | `author` / `created_at` / `updated_at` | Curation Pipeline 元数据，非 Semantic Layer |
| — | `generated_by` / `review_status` | 同上 |
| — | 数据库 / 搜索引擎 / 缓存 | M82 5 条数据不需要；百万级时替换 Loader 内部实现，API 签名不变 |

---

## 10. Final Decision

### READY FOR M82 IMPLEMENTATION

| 判定 | 说明 |
| --- | --- |
| **无阻断 M82 的 Schema 问题** | 7 字段 Schema 对 M82 Phase 1-3 全部交付物足够 |
| **一对多/多对一/多解释因果** | 已隐性支持，通过多条 CS 共享 cause_id/effect_id 实现 |
| **百万级兼容** | Adapter API 签名兼容；仅需 Loader 内部索引优化（不改变 Schema） |
| **唯一 M82 范围关注项** | `language` 字段——可在 P1.6 时按需添加，不阻塞 P1.2-P1.5 |
| **5 个未来演进项** | 全部归属 M84+，不进入 M82 Implementation |

**M82 Phase 1 可继续执行 P1.2 Loader 实现。**

---

> 审查模式：只读
> 审查对象：`data/causal_statements.json` + `M82_CAUSAL_DATA_CONTRACT_FUTURE_COMPATIBILITY_REPORT.md`
> 日期：2026-08-05
> 结论：**READY FOR M82 IMPLEMENTATION — 无阻断**
