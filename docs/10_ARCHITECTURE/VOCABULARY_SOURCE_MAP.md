# 词汇源地图 (Vocabulary Source Map)

> M80 Gate B Decision 2（DB-B03 / DB-B04）— 采纳 A：先出"词汇源地图"文档，再决定代码化守卫。
> 日期：2026-08-14 ｜ 整理：小梦（执行引擎）｜ 依据：HEALTH_AUDIT_v1.1_GATE_B §5 B-03/B-04、§8 DB-B03/DB-B04

## 0. 目的

记录关系 / 实体语义的**三处定义点**，明确各自职责、允许的差异、以及互译规则。本文件只做"事实登记 + 互译规则"，**不固化任何代码化守卫**（守卫是否要做见 §5 待决）。

## 1. 三处定义点

| # | 定义点 | 位置 | 形态 | 当前规模 |
|---|---|---|---|---|
| V1 | Ontology（领域语义真源） | `backend/app/core/domain/ontology.py` `HISTORY_ONTOLOGY` | 小写元组 | 6 entity / 5 relationship |
| V2 | Global Schema Constraint Boundary（平台安全边界 / Freeze） | `backend/app/validation.py` `ENTITY_TYPES` / `RELATIONSHIP_TYPES` | 首字母大写集合 | 8 entity / 18 relationship |
| V3 | RELATIONSHIP_MEANING（运行时呈现权重） | `backend/app/core/exploration_engine.py` | 18 键权重字典 | 18 relationship |

## 2. 各自职责（正交，不互相隶属）

- **V1 Ontology**：领域层语义真源，描述"一个域自身的关系类型"。**不进入** GlobalGraph 校验。
- **V2 validation 8/18**：Freeze 安全边界，GlobalGraph 入库的**唯一白名单**。任何关系进入 GlobalGraph 必须过 V2。
- **V3 RELATIONSHIP_MEANING**：Runtime / Presentation 层对关系类型的**呈现权重**（如 `caused` 1.00 / `influenced` 0.95 / `before`,`after` 0.60），**不参与类型裁决**，仅叠加展示权重。

## 3. 允许的差异（均为有意设计，非 defect）

- 命名体系不同：V1 小写（`place`）vs V2 首字母大写（`Location`）。二者语义可对应但不字面相等。
- 数量不同：V1 5 个关系类型中**仅 `part_of` 落在 V2 的 18 元白名单内**；`born_in` / `ruled_in` / `influenced_by` / `preceded_by` 均不在 V2。这是 M78「Ontology 与 8/18 解耦」的有意结果。
- V3 当前与 V2 的 18 元集合**字面完全一致**，但 V3 是权重表、V2 是白名单，职责不同。

## 4. 互译规则（Mapping Contract 注入点）

- **V1 → V2** 的等价翻译由 **ADR-M80-MAP** 的 Mapping Contract 在 Governance Layer 完成（declarative equivalence + provenance），输出 `MAPPED` / `PARTIAL` / `UNMAPPED`；`UNMAPPED` 不进入 GlobalGraph。
- **V2 → V3** 是「白名单项 → 权重」的查表叠加；V3 缺失某 V2 项时，`exploration_engine` 用**默认值**而非报错（已知：漂移时无运行时信号，见 §5 R-B4）。
- **V1 与 V3 无直接映射关系**：V1 是领域语义，V3 是呈现权重，二者经由 V2 间接关联。

## 5. 待决（守卫是否代码化）

- DB-B04：V3 与 V2 当前**无测试绑定**。是否加 `RELATIONSHIP_MEANING.keys() == RELATIONSHIP_TYPES` 硬断言，待 PO 在 Gate 后续裁决（见 PO_DECISIONS_2026-08-08 §3 D2，采纳 A＝先文档后决定）。
- 风险 R-B4：任一侧增删关系类型，另一侧静默退化（新类型掉默认权重），无告警。

## 6. 引用

- ADR-M78-SB（Ontology 与 8/18 解耦）、ADR-M80-MAP（Mapping Contract）、ADR-M80-RC（Runtime Consumption Contract）
- HEALTH_AUDIT_v1.1_GATE_B §5 B-03/B-04、§8 DB-B03/DB-B04
