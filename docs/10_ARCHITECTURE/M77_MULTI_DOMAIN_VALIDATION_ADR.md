# M77 Multi Domain Validation — ADR

## Goal

验证 **Ontology Framework + Adapter Framework** 是否真正支持「第二 Domain 插件化注册」，证明 M76 抽离的架构具备可扩展性。

目标不是新增业务数据，而是验证框架能力。

## Scope

**包含（仅框架验证）**:
- **Military Ontology** — 使用 Military History 作为第二 Domain 示例，用于验证独立 Ontology 定义和 Adapter 注册能力。
- **Military Adapter** — 第二 `BaseDomainAdapter` 子类，引用独立的 Military Ontology。
- **Registry isolation** — 两 Adapter 进出 `AdapterRegistry._ADAPTERS` 互不污染。
- **Pipeline routing** — 按 `domain_id` 正确路由到对应 Adapter / Ontology。

**不包含**:
- ❌ AI Layer（LLM / Agent / OCR — Runtime Freeze 红线）
- ❌ Knowledge Graph expansion
- ❌ 大规模历史数据导入
- ❌ 不扩展 History Domain Ontology（History Ontology 保持原状，仅作为对照基线）
- ❌ 不建立真实 Military Dataset（仅以占位 / 最小样本验证框架，不做真实数据接入）

## Gate

- **M77-A — Ontology Design**: 设计独立的 Military Ontology 强类型定义，确认与 `HISTORY_ONTOLOGY` 解耦且不复制 schema。
- **M77-B — Adapter Registration**: 第二 Adapter 注册 / 注销，Registry isolation 契约测试。
- **M77-C — Pipeline Isolation**: 按 `domain_id` 路由测试，两 Domain 互不干扰。
- **M77-D — Framework Validation**: 端到端验证「Ontology + Adapter」扩展能力，输出多 Domain 收口报告。

## Success Criteria

M77 完成后，应证明：

1. **第二 Domain 可以拥有独立 Ontology** — Military History Domain 的 Knowledge Model 由独立的 `MilitaryOntology`（区别于 `HISTORY_ONTOLOGY`）承载，不复制、不共享 History schema。
2. **多 Domain Adapter 可以同时注册** — 第二 `BaseDomainAdapter` 子类与既有 `HistoryAdapter` 并存于 `AdapterRegistry._ADAPTERS`，互不排斥。
3. **Registry 不产生 Domain 污染** — 任一 Domain 的注册 / 注销不影响其他 Domain 的元数据与 Ontology 引用（`_ADAPTERS` 按 `domain_id` 隔离）。
4. **Pipeline 可以根据 `domain_id` 正确路由** — 输入 `domain_id` 能精确分派到对应 Adapter / Ontology，跨 Domain 调用互不干扰。
5. **新增 Domain 不需要修改已有 History Domain** — 引入第二 Domain 的变更范围不涉及 `HistoryAdapter`、`HISTORY_ONTOLOGY` 或既有 Pipeline 流程（增量扩展，非侵入修改）。
