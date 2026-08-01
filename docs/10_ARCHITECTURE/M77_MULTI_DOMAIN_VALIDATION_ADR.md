# M77 Multi Domain Validation — ADR

## Goal

验证 **Ontology Framework + Adapter Framework** 是否真正支持「第二 Domain 插件化注册」，证明 M76 抽离的架构具备可扩展性。

目标不是新增业务数据，而是验证框架能力。

## Scope

**包含（仅框架验证）**:
- **Military History Ontology 示例** — 创建最小化 Military History Ontology 作为第二 Domain 示例，用于验证 Domain Ontology 独立性（禁止扩展军事知识模型）。
- **Military Adapter** — 第二 `BaseDomainAdapter` 子类，引用独立的 Military History Ontology。
- **Registry isolation** — 两 Adapter 进出 `AdapterRegistry._ADAPTERS` 互不污染。
- **Pipeline routing** — 按 `domain_id` 正确路由到对应 Adapter / Ontology。
- **Ontology Boundary Strategy 定义** — 明确 Global Schema Constraint Baseline（系统级枚举守卫所在层）与 Domain Ontology（各 Domain 自有知识模型）的分层与 Single Source of Truth 边界。

**不包含**:
- ❌ AI Layer（LLM / Agent / OCR — Runtime Freeze 红线）
- ❌ Knowledge Graph expansion
- ❌ 大规模历史数据导入
- ❌ 不扩展 History Domain Ontology（History Ontology 保持原状，仅作为对照基线）
- ❌ 不建立真实 Military Dataset（仅以占位 / 最小样本验证框架，不做真实数据接入）
- ❌ Registry unregister API 开发（→ Architecture Debt-3，挂账，不纳入 M77）
- ❌ Ontology v2 / Entity hierarchy / Relationship hierarchy / 全量 schema evolution（→ M78）

## Gate

- **M77-A — Ontology Design & Boundary Strategy**: 创建最小化 Military History Ontology 示例，用于验证 Domain Ontology 独立性（禁止扩展军事知识模型）；界定 Ontology Boundary Strategy —— 明确 Global Schema Constraint Baseline（系统级 8/18 守卫所在层）与 Domain Ontology（各 Domain 自有知识模型）的分层与 Single Source of Truth 边界。
- **M77-B — Adapter Registration (register + isolation)**: 第二 Adapter 注册进 `AdapterRegistry._ADAPTERS["military"]`，与 `history` 共存互不覆盖；隔离契约测试。不含 unregister。
- **M77-C — Pipeline Isolation**: 按 `domain_id` 路由测试，两 Domain 互不干扰。
- **M77-D — Framework Validation**: 端到端验证「Ontology + Adapter」扩展能力，输出多 Domain 收口报告。

## Success Criteria

M77 完成后，应证明：

1. **第二 Domain 可以拥有独立 Ontology** — Military History Domain 的 Knowledge Model 由独立的 `MilitaryHistoryOntology`（区别于 `HISTORY_ONTOLOGY`）承载，不复制、不共享 History schema。
2. **多 Domain Adapter 可以同时注册** — 第二 `BaseDomainAdapter` 子类与既有 `HistoryAdapter` 并存于 `AdapterRegistry._ADAPTERS`，互不排斥。
3. **Registry 不产生 Domain 污染** — 任一 Domain 的注册不影响其他 Domain 的元数据与 Ontology 引用（`_ADAPTERS` 按 `domain_id` 隔离；注销 API 不在 M77 范围，挂账 Debt-3）。
4. **Pipeline 可以根据 `domain_id` 正确路由** — 输入 `domain_id` 能精确分派到对应 Adapter / Ontology，跨 Domain 调用互不干扰。
5. **新增 Domain 不需要修改已有 History Domain** — 引入第二 Domain 的变更范围不涉及 `HistoryAdapter`、`HISTORY_ONTOLOGY` 或既有 Pipeline 流程（增量扩展，非侵入修改）。
6. **明确 Global Schema Constraint Baseline 与 Domain Ontology 的职责边界** — 说明：(a) Domain Ontology 可以拥有领域特定 schema；(b) 8/18 baseline 与 History 6/5 ontology 差异得到解释；(c) Ontology hierarchy / schema evolution / relationship redesign 属于 M78。

## Architecture Debt Register

**Debt-1（重述，范围收窄）**
- *Description*：freeze 守卫 `ENTITY_TYPES=8` / `RELATIONSHIP_TYPES=18` 与 `HISTORY_ONTOLOGY` 6/5 不一致。
- *M77 处理*：仅界定 Boundary Strategy（Global Schema Constraint Baseline vs Domain Ontology、SSOT 边界），不做内容补齐。
- *Assigned*：M78（Ontology v2 + Entity/Relationship hierarchy + 全量 schema evolution）。

**Debt-3（源自 Scope Freeze Audit）**
- *Description*：`AdapterRegistry` 仅有 `register`，无 `unregister`/`deregister` API；"注册/注销生命周期"中"注销"一半缺支撑。
- *M77 处理*：不纳入，挂账。
- *Assigned*：Architecture Debt（建议 M78 或独立框架里程碑补 `unregister`，additive 非架构重设计）。
