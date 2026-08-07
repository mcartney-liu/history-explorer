# Governance Evolution

> **文档类型**：治理演进记录（类比 ADR，记录工程治理能力的演进）
> **状态**：Active（持续更新）
> **创建日期**：2026-08-05

---

## 概述

本文档记录 History Explorer 项目工程治理体系的演进过程。与 ADR（Architecture Decision Record）记录架构决策不同，本文档记录的是**治理能力本身的成长**——每个 Milestone 在管理方法上引入了什么新实践。

---

## 治理演进时间线

### M62 — Freeze 机制引入

| 属性 | 内容 |
| --- | --- |
| **引入能力** | **Scope Freeze** — 首次在 Milestone 中正式冻结开发边界 |
| **解决的问题** | M62 之前的 Milestone 频繁出现范围漂移（scope creep），实现过程中不断追加需求 |
| **核心实践** | 明确 Allowed / Forbidden 边界，冻结后在 Milestone 内不再讨论 Scope |
| **遗留问题** | Freeze 机制存在但没有标准化——每个 Milestone 的 Freeze 格式不一致 |

### M74 — Trust Boundary

| 属性 | 内容 |
| --- | --- |
| **引入能力** | **Trust Boundary** — 区分 Fact Layer / Inference Layer / Exploration Layer |
| **解决的问题** | Explorer 无法区分哪些信息是确定的（KG 事实）、哪些是推断的（AI 推理） |
| **核心实践** | 三层信任模型，每一层有独立的冻结边界 |
| **对治理的影响** | 首次将 "信任" 作为架构约束，而非功能需求 |

### M79 — Semantic Freeze

| 属性 | 内容 |
| --- | --- |
| **引入能力** | **Semantic Layer Architecture** — CausalStatement 作为独立语义层 |
| **解决的问题** | 因果解释与关系图谱耦合，导致两者无法独立演化 |
| **核心实践** | ADR-M79：CausalStatement 不属于 Graph Edge，而是独立的 Interpretive Semantic Layer |
| **对治理的影响** | 首次将 "架构决策" 与 "实现" 分离——先冻结架构（ADR），再冻结实现（Scope Freeze） |

### M82 — Release Readiness + Commit Manifest

| 属性 | 内容 |
| --- | --- |
| **引入能力** | **Release Readiness Review** + **Commit Preparation Review** + **Commit Manifest** — 提交前的完整审计链路 |
| **解决的问题** | M82 之前，commit 缺乏系统化的审计——文件分类、Freeze 合规检查、测试基线确认都是临时进行的 |
| **核心实践** | 四步审计链：Release Readiness → Commit Preparation → Final Commit Manifest → Commit Execution。每步都是只读审查 |
| **对治理的影响** | 首次将 "提交" 本身变成一个治理环节，而非开发结束后的附带动作 |

### M83 — Governance Contract + Milestone Template

| 属性 | 内容 |
| --- | --- |
| **引入能力** | **Governance Contract** + **Milestone Governance Template** + **Governance Evolution** |
| **解决的问题** | 每个 Milestone 的治理文档格式不一致，M83 之前的 Scope Freeze / Gate Review 各有各的结构 |
| **核心实践** | 将 M83 的 Scope Freeze Review 从 "一次性文档" 升级为 "Governance Contract"，并从中抽象出可复用的 Milestone Governance Template。建立 Governance Evolution 记录治理能力本身的成长 |
| **对治理的影响** | 首次将 "治理方法" 从 "Milestone 内容" 中分离——治理模板是可复用资产，不是每个 Milestone 重新发明 |
| **待验证** | Template 经 M83 / M84 / M85 连续验证后正式版本化 |

---

## 治理能力成熟度总结

| Milestone | 治理能力 | 成熟度 |
| --- | --- | --- |
| M62 | Scope Freeze | ✅ 已稳定 |
| M74 | Trust Boundary | ✅ 已稳定 |
| M79 | Semantic Freeze / ADR | ✅ 已稳定 |
| M82 | Release Readiness / Commit Manifest | ✅ 已稳定 |
| M83 | Governance Contract / Milestone Template | 🟡 Draft（待 M84/M85 验证） |

---

## 治理链路全景

当前 History Explorer 的完整 Milestone Governance 链路：

```
Architecture Gate Review     ← M79 引入
    ↓
Implementation Plan Review
    ↓
Architecture Acceptance
    ↓
Scope Freeze Review          ← M62 引入，M83 升级为 Governance Contract
    ↓
Implementation
    ↓
Release Readiness Review     ← M82 引入
    ↓
Commit Preparation Review    ← M82 引入
    ↓
Commit Manifest              ← M82 引入
    ↓
Commit Execution
    ↓
Closure Review
    ↓
Next Milestone Entry Gate
```

---

> 本文档与 ADR 类似：不记录业务演进，记录工程治理能力的演进。每次 Milestone 引入新的治理实践时更新。
