# M76 Release Closure

## 1. Milestone Overview

- **M76 Framework Validation** — 验证 Adapter Framework 的生命周期解耦（M76-A/B）与架构契约稳定性。
- **M76-C1 Ontology Extraction** — 将 Domain Adapter 中承载的 Knowledge Model 抽离为独立一级架构对象 `Ontology`，并通过 `DomainMetadata` 建立引用关系。
- **Release**: `vM76` (annotated tag) → `dcef3b08bfcdb167a0352a8bdacd2273a3057f8a`，已推送 `origin/master`，consistency R1–R7 全 PASS。

## 2. Problem Statement

**Before**: `HistoryAdapter` 内嵌 Knowledge Model

```
HistoryAdapter
 └─ DomainMetadata
     ├─ entity_types          (内联 schema 字段)
     └─ relationship_types    (内联 schema 字段)
```

**Problems**:
- **Domain 与 Ontology 耦合**：schema 字段内嵌于 `metadata`，缺少独立生命周期。
- **新 Domain 扩展成本高**：每增加一个 Domain 都需在 `DomainMetadata` 内重复定义 `entity_types` / `relationship_types`，易退化为复制粘贴，违背单一真相源原则。

## 3. Architecture Decision

**Decision**: `Ontology` 成为独立一级架构对象。

构成要素：
- **`Ontology`** — 强类型 frozen dataclass（`Tuple[str, ...]` 字段），不可变 Knowledge Model carrier。
- **`HISTORY_ONTOLOGY`** — 单例常量，History Domain 的唯一 Knowledge Model 真相源。
- **`DomainMetadata.ontology`** — `DomainMetadata` 持有 `ontology: Ontology = HISTORY_ONTOLOGY` 引用，自身不再内联 schema。

**职责边界（关键澄清）**:
- **`Ontology` 不负责 Domain Identity**。它仅定义 Knowledge Model（实体类型与关系类型的集合）。
- **`DomainMetadata`** 负责 Domain 身份与描述：
  - `domain_id` — Domain 唯一标识
  - `label` — 可读名称
  - `description` — 描述
  - `ontology` — 对 `Ontology` 实例的引用
- **`Ontology`** 职责单一：仅承载 Knowledge Model 定义。

效果：Knowledge Model 与 Domain Profile 解耦；未来 Domain 引用而非复制 Ontology。

## 4. Implementation Summary

修改 / 新增文件（M76-C1）：
- `backend/app/core/domain/ontology.py` — **新增**，`Ontology` + `HISTORY_ONTOLOGY`
- `backend/app/core/domain/adapter.py` — `DomainMetadata` 去除内联字段，改为 `ontology` 引用；`load()` 经 `metadata.ontology.*` 访问
- `backend/app/core/domain/history_adapter.py` — 构造实参改为 `ontology=HISTORY_ONTOLOGY`
- `backend/app/core/acquisition/pipeline.py` — 消费端迁移为 `metadata.ontology.entity_types` / `.relationship_types`
- `backend/tests/test_ontology_contract.py` — **新增**，TG1–TG8（frozen / 单源 / 消费者迁移 / Legacy 移除）
- `backend/tests/test_domain_adapter_contract.py` — 迁移 `_TestAdapter` 构造为 `ontology=Ontology(...)` 载体（M76-C1.1）

## 5. Validation

- **pytest backend/tests** → `304 passed, 0 failed`
- **Release** → `vM76` (annotated)，target = `dcef3b0`，已推远端
- **Runtime Freeze** → `ai_gateway/`、`evidence_claim.py`、`exploration.py`、`dataset_validator.py`、`source_registry.py`、`dataset_provider.py` 全部 unchanged
- **Consistency** → R1–R7 全 PASS

## 6. Known Limitations

- 当前 **只有 History Domain**，框架仅经单一 Domain 验证。
- **Multi Domain 尚未验证**：第二 Domain 的注册隔离、Ontology 引用、Pipeline 按 `domain_id` 路由均未经实战检验。
- **当前 Ontology Framework 尚未验证跨 Domain Ontology 共存场景。**
- `Ontology` 为 `Tuple[str, ...]` 扁平结构，尚不支持嵌套 / 继承型 Knowledge Model。

## 7. Next Milestone

**M77 Multi Domain Validation** — 验证 `Ontology Framework + Adapter Framework` 是否支持第二 Domain（详见 `docs/10_ARCHITECTURE/M77_MULTI_DOMAIN_VALIDATION_ADR.md`）。
