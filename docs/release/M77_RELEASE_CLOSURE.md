# M77 Multi Domain Validation — Release Closure

> M77 收官文档。基于已提交代码 `73a8cbd` 与 ADR `34fc4dc`，M77-C/D 收官验证 **PASS**（全量 318 tests passed）。
> 本文仅文档化 M77 成果与边界，不含代码变更、不含 commit/push/tag 动作。

## 1. Mission

验证 M76 抽离的 **Ontology + Adapter Framework** 是否支持第二 Domain（以 Military History 最小示例）**无侵入（non-invasive）扩展**——不修改 History Domain、不修改 Runtime、不新增业务数据，仅验证框架扩展性。

## 2. Implementation Summary

M77 仅新增 3 个文件，**零修改任何既有文件**，Military 仅在测试作用域注册：

- `backend/app/core/domain/military_ontology.py` — 仅定义 `MILITARY_HISTORY_ONTOLOGY`（最小军事领域 Ontology，5 实体 / 5 关系）。
- `backend/app/core/domain/military_adapter.py` — 仅定义 `MilitaryAdapter(BaseDomainAdapter)`，引用独立 Ontology。
- `backend/tests/test_m77_multi_domain_framework.py` — M77-A~D 共 14 个 Gate 测试（含 TG-M77-C4 Cross Binding Prevention）。

关键约束守界：

- **Ontology 与 Adapter 分离**：Ontology 定义独占 `military_ontology.py`，Adapter 文件仅引用，不内联。
- **无默认生产注册**：`MilitaryAdapter` 仅在测试 fixture 内 `AdapterRegistry.register()`，未写入 `domain/__init__.py`，不进入应用启动路径。
- **Registry 隔离用 snapshot/restore**：测试 fixture 快照 `_ADAPTERS` → 注册 → teardown 精确恢复，**未新增 `unregister` API、未引入 Debt-3**。
- **Runtime Freeze 零触碰**：`ai_gateway/`、`evidence_claim`、`exploration`、`dataset_validator`、`source_registry`、`dataset_provider`、`runtime`、`pipeline.py` 路由逻辑均未改动。
- **未补 8/18、未进 M78/M79、未建真实 Military Dataset**。

## 3. File Change Summary

来源：`git show --stat HEAD`（commit `73a8cbd`）

```
backend/app/core/domain/military_adapter.py      |  39 +++++
backend/app/core/domain/military_ontology.py     |  23 ++++
backend/tests/test_m77_multi_domain_framework.py | 214 +++++++++++++++++++++++
 3 files changed, 276 insertions(+)
```

- 全部为新增文件，**0 个既有文件修改**。
- 净改动：+276 行，无删除。
- 既有冻结文件（含 `domain/__init__.py` / `ontology.py` / `adapter.py` / `registry.py` / `history_adapter.py` / `pipeline.py`）均未进入提交。

## 4. Validation Evidence

- **全量测试**：`318 passed / 0 failed`（基线 304 + M77 新增 14）。
- **Gate 覆盖**：

| Gate | 测试函数 | 结果 |
|---|---|---|
| TG-A1 | `test_tg_a1_military_ontology_is_frozen_ontology` | PASS |
| TG-A2 | `test_tg_a2_military_ontology_distinct_from_history` | PASS |
| TG-A3 | `test_tg_a3_metadata_carrier_does_not_mutate_history_ontology` | PASS |
| TG-B1 | `test_tg_b1_register_military_succeeds` | PASS |
| TG-B2 | `test_tg_b2_history_and_military_coexist` | PASS |
| TG-B3 | `test_tg_b3_ontologies_not_polluted` | PASS |
| TG-B4 | `test_tg_b4_history_domain_untouched_by_military_registration` | PASS |
| TG-C1 | `test_tg_c1_military_pipeline_routes_to_military_ontology` | PASS |
| TG-C2 | `test_tg_c2_history_pipeline_routes_to_history_ontology` | PASS |
| TG-C3 | `test_tg_c3_empty_data_dir_still_routes` | PASS |
| TG-M77-C4 | `test_tg_m77_c4_cross_binding_prevention` | PASS |
| TG-D1 | `test_tg_d1_history_baseline_intact_without_military` | PASS |
| TG-D2 | `test_tg_d2_no_default_production_registration` | PASS |
| TG-D3 | `test_tg_d3_history_ontology_unchanged_by_m77` | PASS |

## 5. Success Criteria Matrix

逐条核对 ADR Success Criteria（详见 `docs/10_ARCHITECTURE/M77_MULTI_DOMAIN_VALIDATION_ADR.md`）：

| SC | 条目 | 证据 | 状态 |
|---|---|---|---|
| #1 | 第二 Domain 可以拥有独立 Ontology | TG-A1/A2：`MILITARY_HISTORY_ONTOLOGY` 是 `Ontology` 实例、frozen、与 `HISTORY_ONTOLOGY` 非同一对象且内容不同 | ✅ PASS |
| #2 | 多 Domain Adapter 可以同时注册 | TG-B2：`registered_ids()` 同时含 `history` + `military` | ✅ PASS |
| #3 | Registry 不产生 Domain 污染 | TG-B3/B4：两 adapter 各自 `.ontology` 指向正确对象、互不污染 | ✅ PASS |
| #4 | Pipeline 根据 `domain_id` 正确路由 | TG-C1/C2：两 domain schema 前缀互不包含 | ✅ PASS |
| #5 | 新增 Domain 不需要修改已有 History Domain | TG-D2/D3：无默认生产注册；`HISTORY_ONTOLOGY` 6/5 字节级不变 | ✅ PASS |
| #6 | 明确 Global Schema Constraint Baseline 与 Domain Ontology 职责边界 | (a) domain-specific schema 成立（TG-A2）；(b) 8/18 vs 6/5 差异在 Boundary Strategy 框架内解释；(c) hierarchy/schema evolution 归属 M78 | ✅ PASS |

## 6. Boundary Strategy

M77 界定并验证了 **Global Schema Constraint Baseline** 与 **Domain Ontology** 的分层边界（不暗示代码中存在 `CoreOntology` 对象——"Global Schema Constraint Baseline"仅指代 freeze 守卫层 `ENTITY_TYPES=8` / `RELATIONSHIP_TYPES=18`）：

- **Global Schema Constraint Baseline（系统级守卫层）**：freeze baseline 定义 `ENTITY_TYPES=8` / `RELATIONSHIP_TYPES=18`，是全系统枚举一致性约束的权威来源。
- **Domain Ontology（各 Domain 自有知识模型）**：每个 Domain 可持有**领域特定 schema**。M77 以 `MILITARY_HISTORY_ONTOLOGY`（5 实体 / 5 关系）证明 Domain Ontology 不必须与 Global Schema Constraint Baseline 完全重合——它只需在框架内可定义、可注册、可路由。
- **Single Source of Truth 边界**：`HISTORY_ONTOLOGY`（6/5）是 History Domain 的真相源；`MILITARY_HISTORY_ONTOLOGY`（5/5）是 Military 示例 Domain 的真相源。各 Domain 对自己的 Ontology 负责，Global Schema Constraint Baseline 负责系统级枚举守卫一致性——两者职责分明，互不替代。
- **8/18 vs 6/5 差异解释**：`HISTORY_ONTOLOGY` 是 Domain Ontology 的一个子集实例，不要求与 Global Schema Constraint Baseline 的 8/18 完全对齐；全量 8/18 内容建设属 M78 在 Boundary Strategy 框架内的演进工作，M77 不做补齐。

## 7. Architecture Debt Handoff

| Debt | 描述 | M77 处理 | 归属 |
|---|---|---|---|
| **Debt-1** | freeze 守卫 8/18 与 `HISTORY_ONTOLOGY` 6/5 不一致 | 仅界定 Boundary Strategy，不补内容 | **M78**（Ontology v2 + Entity/Relationship hierarchy + 全量 schema evolution） |
| **Debt-2** | Causal Logic Representation Gap：当前 `Ontology` 仅能表达 Entity + Relationship，缺少 Cause / Mechanism / Consequence / Confidence / Evidence 等因果表达维度 | 不处理（M77 仅验证框架扩展性） | **后续 M78 / M79 Planning**（Causal Logic 属 M79 候选，或并入 M78 一并评估） |
| **Debt-3** | `AdapterRegistry` 仅有 `register`，无 `unregister`/`deregister` API | 不纳入，挂账；TG 用 snapshot/restore | **Architecture Debt**（建议 M78 或独立框架里程碑 additive 补齐 `unregister`） |

## 8. M78 Handoff

M77 已证明 M76 框架支持第二 Domain 无侵入扩展。建议 M78 承接以下工作：

- **Debt-1 收口**：定义 Ontology v2，引入 Entity/Relationship hierarchy，将 Global Schema Constraint Baseline 的 8/18 全量语义内容建设落地；明确 Domain Ontology 与 Baseline 的映射关系。
- **Debt-2 评估**：将 Causal Logic（Cause / Mechanism / Consequence / Confidence / Evidence）纳入 Ontology Evolution 规划，或独立为 M79 Causal Logic 里程碑。
- **Debt-3 补齐**：在 `AdapterRegistry` 增加 `unregister`（additive，非架构重设计），使"注册/注销生命周期"完整，并补注销契约测试。
- **边界保持**：M78 演进时继续遵守 Runtime Freeze 红线，且不破坏 M77 已验证的"第二 Domain 无侵入扩展"不变式（`HistoryAdapter` / `HISTORY_ONTOLOGY` 不应因 M78 内容建设而被迫修改——新增内容走 Domain Ontology 或 Baseline 映射，而非侵入 History Domain）。
