# M84 Milestone Retrospective

> **阶段**：M84 Milestone Retrospective
> **日期**：2026-08-05
> **状态**：Milestone Complete — Pending M85 Architecture Gate

---

## 1. Objectives vs Outcomes

### 原目标

```
M84 = Semantic Object Expansion

将 M83 验证有效的 CausalStatement 解释能力，
从一个局部 UI 组件升级为平台级 CausalObject 能力。
```

### 实际产出

**技术能力**：

| 产出 | 内容 |
| --- | --- |
| CausalObject Model | 10 字段（7 继承 CausalStatement + 3 新增），frozen dataclass |
| CausalObject Data | 3 个实例（co-001/005/008），curated content |
| CausalObjectDetailPage | 展示层组件，展示 mechanism/consequence/related_entities/exploration_paths |
| Instrumentation | 2 个 co_* 事件（co_detail_open / co_entity_follow） |

**治理验证**：

| 产出 | 内容 |
| --- | --- |
| M83 Governance 首次复用 | M84 使用 MILESTONE_GOVERNANCE_TEMPLATE.md + Expansion 最小集（3 文档） |
| Governance Efficiency | M84 治理文档 ~8 份（vs M83 的 31 份），Efficiency 显著提升 |
| Model Freeze 首次执行 | 10 字段冻结，10 种禁止字段明确列举 |
| Boundary 未突破 | KG / AI / Graph Core / CausalStatement Schema 全部未触 |

### 差距

| 原始目标 | 实际完成 | 差距 |
| --- | --- | --- |
| CausalObject 原型 | ✅ 3 个实例 | — |
| Detail Page | ✅ 组件已创建 | 待父组件集成（CausalStatementCard → Detail Page 入口） |
| 20+ CS 数据 | 🟡 未完成 | 现有 CS 5 条 + 新增 5 条（cs-006~010）未写入 JSON |
| M84 用户验证 | ⬜ 未执行 | M84 的 Explorer Session 待后续安排 |

---

## 2. Architectural Impact

### M84 永久改变了什么？

| # | 改变 | 说明 |
| --- | --- | --- |
| 1 | **CausalStatement → Semantic Capability** | 从局部 Feature 升级为平台能力。不是 UI 优化，是产品定位变化 |
| 2 | **Semantic Object ≠ KG** | 建立了清晰的边界：KG 回答 "What exists?"，SO 回答 "How to understand it?" |
| 3 | **CausalStatement Schema 不可变** | 7 字段在 M82/M83/M84 全程不变。M84 通过超集方式扩展，不修改基础 Schema |
| 4 | **治理模板被验证可用** | M83 建立的 Governance Contract → M84 首次复用，文档量从 31 降至 ~8 |
| 5 | **Semantic Object 不是通用框架** | M84 只实现 CausalObject 一种实例，不为未验证的类型（ThemeObject/InfluenceObject）预留抽象 |

### 对 M85+ 的约束

| 约束 | 来源 |
| --- | --- |
| Semantic Object 不写入 KG | M84 Architecture Gate §3 |
| CausalStatement 7 字段不变 | M84 Model Freeze §4 |
| AI 不生成 CausalStatement | M83 Decision D6 |
| Multi-hop 不引入 | M83 Decision D5 |

---

## 3. Decisions Frozen（以后不用再讨论）

| # | 决策 | 为什么不再讨论 |
| --- | --- | --- |
| 1 | **Semantic Object 不等于 Knowledge Graph** | KG 和 SO 是两层独立架构。SO 引用 KG GID，不写入。M82/M83/M84 连续三个 Milestone 未触 |
| 2 | **Semantic Object 不自动生成** | SO 是 curator 策展内容，不是 AI 产物。M83 D6（REJECT）已冻结 |
| 3 | **CausalObject 是第一个实例，不是通用框架** | 只有一个实例时不抽象。ThemeObject / InfluenceObject → M85+ |
| 4 | **AI Causal Generation 延后** | M83 D6 + M84 全程未触 |
| 5 | **Multi-hop 延后** | M83 D5（DEFER TO M85） |
| 6 | **Runtime/Package 不合并** | M83 D7（REJECT 永久） |
| 7 | **CausalStatement Schema 不可变** | 7 字段，M82/M83/M84 全程不变 |

---

## 4. Reusable Assets

### 可直接复制的文档

| 资产 | 可复用范围 |
| --- | --- |
| M84 Scope Freeze（Governance Contract） | 任何 Expansion 类型 Milestone |
| M84 Implementation Boundary | 任何涉及 Model + API + Frontend 的实施 |
| M84 Model Freeze | 任何新数据模型的字段冻结 |

### 可复用的流程

| 流程 | 说明 |
| --- | --- |
| Architecture Gate → Scope Freeze → Implementation Boundary → Model Freeze → Implementation → Acceptance | 6 步链，比 M83 的 15 步链精简 60% |
| Expansion 最小治理集（3 文档） | Scope Freeze + Architecture Gate + Implementation Acceptance |

### 可复用的原则

| 原则 | 来源 |
| --- | --- |
| "只有一个实例时不抽象" | M84 Architecture Gate §2 — 禁止 SemanticObjectBase |
| "超集扩展，不修改基础 Schema" | M84 Model Freeze — CausalObject extends CausalStatement |
| "解释层引用事实层，不写入" | M84 Architecture Gate §3 — KG Boundary |

---

## 5. M84 Limitations

### 当前没有解决

| # | 能力 | 归属 | 说明 |
| --- | --- | --- | --- |
| 1 | Multi-hop Causal Exploration | M85 | CausalObject 是单跳解释（A→B），多跳需要链式数据和 traversal engine |
| 2 | AI Reasoning / Generation | M85+ | 策展内容的价值已被验证，AI 的角色是增强而非替代 |
| 3 | Evidence Intelligence | M85 | M83 Evidence Open 1/4 — 用户需要 "Why" 强于 "Prove" |
| 4 | ThemeObject / InfluenceObject | M85 | 需要 M84 先验证 CausalObject 的产品形态成立 |
| 5 | SemanticObjectBase 抽象 | M85 | 当有 2+ 种实例时才抽象 |
| 6 | M84 Explorer Validation | M84 后续 | 3 个 CausalObject 实例的用户验证尚未执行 |

---

## 6. Milestone Classification

### M84 在项目中的位置

```
M62  Foundation
M74  Trust Boundary
M77  Platform Foundation
M79  Architecture Governance
M82  Runtime Capability         ← "系统会解释"
M83  Validation + Governance    ← "解释有价值"
M84  Semantic Object Capability ← "解释成为平台能力"
M85  Reasoning / Multi-hop      ← 待进入
```

### M84 类型

```
M84 = Expansion + Architecture

Expansion     — CausalStatement → CausalObject 升级
Architecture  — 建立 Semantic Object 架构边界（KG/SO 分离，不抽象基类）
```

### M84 一句话

```
M84 将 M83 验证有效的解释能力，从一个局部 UI 组件升级为平台级 Semantic Object，
并首次验证了 Governance Contract 可以保护 Semantic Layer 的架构边界不膨胀。
```

---

> M84 Milestone Retrospective 完成 | 不进入 M85 设计 | 等待 PO Review
