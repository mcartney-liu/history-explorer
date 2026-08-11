# M83 Governance Cost Audit

> **阶段**：M83 Governance Cost Audit — 送给 M84+ 的治理效率优化建议
> **日期**：2026-08-05
> **范围**：M83 全量治理文档（31 份）
> **目的**：让 M84 的治理更轻，而不是更重

---

## 1. 文档清单与价值分级

### 分级标准

| 级别 | 含义 |
| --- | --- |
| **Permanent** | 不可替代 — 后续 Milestone 直接引用 |
| **Essential** | M83 必需 — 但可被上级文档吸收，不需要独立存在 |
| **Derived** | 有衍生价值 — 可合并到上级文档 |
| **Transient** | 仅 M83 执行期间有价值 — 不进入 M84+ 的治理流程 |

### 逐份审计

#### Permanent（永久保留，不可替代）

| # | 文档 | 为什么不可替代 |
| --- | --- | --- |
| 1 | `M83_SCOPE_FREEZE_REVIEW.md` | M83 Governance Contract — Allowed/Forbidden/Out of Scope/Change Protocol/Authority/Lifetime。M84 直接引用 |
| 2 | `M83_RETROSPECTIVE.md` | M83 项目级影响 + Lessons Learned + Reusable Assets。M84 规划的输入 |
| 3 | `M83.3_EXPLORER_VALIDATION_PROTOCOL_FREEZE_FINAL.md` | 可执行实验协议（H0/H1/H2 + 对照设计 + Observer Protocol + 三级信号）。可直接模板化 |
| 4 | `M83.4_EXPLORER_SESSION_RECORD_TEMPLATE.md` | Session 执行模板。M84 任何用户实验直接复用 |
| 5 | `M83.4_DATASET_LOAD_FREEZE.md` | 10 条 CS 的完整记录。实验复现必需 |

**Permanent 数：5**

#### Essential（M83 必需，但可被吸收）

| # | 文档 | 被谁吸收 |
| --- | --- | --- |
| 6 | `M83_ARCHITECTURE_GATE_REVIEW.md` | 决策已纳入 `M83_SCOPE_FREEZE_REVIEW.md` §3（Allowed/Forbidden/Future）。Gate 本身可归档 |
| 7 | `M83_IMPLEMENTATION_PLAN_REVIEW.md` | 计划已纳入 `M83_RETROSPECTIVE.md` §1（Objectives vs Outcomes）。Plan 本身可归档 |
| 8 | `M83_ARCHITECTURE_ACCEPTANCE_REVIEW.md` | 结论已纳入 DEBT-001A/001B 拆分。Acceptance 本身可归档 |
| 9 | `M83_EXPLORER_DATAFLOW_REVIEW.md` | 结论已纳入 `M83_SCOPE_FREEZE_REVIEW.md` §2（Runtime/Package 长期共存） |
| 10 | `M83.0_IMPLEMENTATION_REPORT.md` | 实施结果已纳入 `M83.0_IMPLEMENTATION_ACCEPTANCE_REVIEW.md` |
| 11 | `M83.1_IMPLEMENTATION_REPORT.md` | 实施结果已纳入 `M83.1_IMPLEMENTATION_ACCEPTANCE_REVIEW.md` |
| 12 | `M83.2_CONTENT_STRATEGY_GATE_REVIEW.md` | 决策已纳入 `M83.2_CONTENT_SELECTION_FREEZE.md` |
| 13 | `M83.1_INSTRUMENTATION_DESIGN_REVIEW.md` | 设计已纳入 `M83.1_INSTRUMENTATION_GATE_REVIEW.md` |

**Essential 数：8** — 可在 M83 Closure 时归档，M84 不引用。

#### Derived（可合并）

| # | 文档 | 合并到 |
| --- | --- | --- |
| 14 | `M83.0_IMPLEMENTATION_GATE_REVIEW.md` | 与 `M83.0_IMPLEMENTATION_ACCEPTANCE_REVIEW.md` 合并。Gate 和 Acceptance 的边界在实际执行中已模糊 |
| 15 | `M83.1_IMPLEMENTATION_BOUNDARY_REVIEW.md` | 与 `M83.1_INSTRUMENTATION_GATE_REVIEW.md` 合并。Boundary 和 Gate 讨论的内容高度重叠 |
| 16 | `M83.3_EXPLORER_VALIDATION_PROTOCOL_FREEZE.md` | 已被 `FINAL.md` 完全取代 |
| 17 | `M83.4_EXPLORER_VALIDATION_EXECUTION_GATE.md` | 与 `M83.4_EXPERIMENT_INTEGRITY_CHECK.md` 合并为一个 "Pre-Session Checklist" |

**Derived 数：4** — M84 可减少为单一文档。

#### Transient（仅 M83 执行期间有价值）

| # | 文档 | 为什么不需要保留 |
| --- | --- | --- |
| 18-20 | `SESSION_001~003_SUMMARY.md`（3 份） | Session 摘要。Record 已包含完整数据，Summary 是 Session 执行时的快捷视图。M83.5 决策后自动过期 |
| 21 | `M83.4_EXPERIMENT_AUDIT_CLOSURE_REVIEW.md` | Governance Audit。结论已纳入本 Cost Audit。不需要独立保留 |
| 22 | `M83.4_EXPERIMENT_INTEGRITY_CHECK.md` | 实验质量审计。审计结果已记录，后续 Session 不需要重新审计 |
| 23 | `M83.1_INSTRUMENTATION_GATE_REVIEW.md` | Gate 已通过。Instrumentation 设计已冻结，后续不讨论 |
| 24 | `M83.2_CONTENT_SELECTION_FREEZE.md` | 内容已冻结。10 条 CS 已写入 `DATASET_LOAD_FREEZE.md` |
| 25 | `M83.0_IMPLEMENTATION_ACCEPTANCE_REVIEW.md` | M83.0 已关闭。Acceptance 结论已记录 |
| 26 | `M83.1_IMPLEMENTATION_ACCEPTANCE_REVIEW.md` | M83.1 已关闭。Acceptance 结论已记录 |
| 27-28 | `M83_ENTRY_GAP_ANALYSIS.md` + `M83_ENTRY_GATE_REVIEW.md` | M83 入口文档。M83 已执行，入口状态不再有意义 |
| 29 | `M83.0_IMPLEMENTATION_GATE_REVIEW.md` | 见 Derived #14 |
| 30 | `M83.1_IMPLEMENTATION_BOUNDARY_REVIEW.md` | 见 Derived #15 |
| 31 | `M83.4_EXPLORER_VALIDATION_EXECUTION_GATE.md` | 见 Derived #17 |

**Transient 数：14**（含 3 份 Summary）— M83.5 后可直接归档。

---

## 2. 治理效率分析

### 2.1 文档分级统计

| 级别 | 数量 | 占比 |
| --- | --- | --- |
| **Permanent** | 5 | 16% |
| **Essential** | 8 | 26% |
| **Derived** | 4 | 13% |
| **Transient** | 14 | 45% |

**45% 的文档在 M83 执行期间有价值，但不需要进入 M84 的治理流程。**

### 2.2 真正参与决策的文档

M83 的关键决策点以及其依赖的文档：

| 决策 | 依赖文档 | 数量 |
| --- | --- | --- |
| "M83 做什么不做什么" | `M83_SCOPE_FREEZE_REVIEW.md` | 1 |
| "如何验证 CS" | `M83.3_EXPLORER_VALIDATION_PROTOCOL_FREEZE_FINAL.md` | 1 |
| "实验数据是什么" | `M83.4_DATASET_LOAD_FREEZE.md` | 1 |
| "Session 怎么执行" | `M83.4_EXPLORER_SESSION_RECORD_TEMPLATE.md` | 1 |
| "M83 改变了什么" | `M83_RETROSPECTIVE.md` | 1 |

**5 份 Permanent 文档支撑了 M83 的全部关键决策。**

### 2.3 阅读成本

```
31 份文档 → 如果每份平均 3000 字 = ~93,000 字

实际需要读的：
  5 份 Permanent = ~15,000 字（理解 M83 的全貌）
  3 份 Session Record = ~9,000 字（理解实验数据）
  = ~24,000 字

节省：~69,000 字（74%）
```

---

## 3. M84 治理优化建议

### 3.1 建议合并的文档对

| M83 当前（2-3 份） | M84 建议（1 份） | 节省 |
| --- | --- | --- |
| Implementation Gate + Implementation Acceptance | `IMPLEMENTATION_ACCEPTANCE.md`（Gate 作为 Acceptance 的前置检查，不独立成文） | 1 份 |
| Boundary Review + Instrumentation Gate | `INSTRUMENTATION_GATE.md`（Boundary 作为 Gate 的一个 Check） | 1 份 |
| Protocol Freeze + Protocol Freeze Final | `PROTOCOL_FREEZE.md`（直接出 Final 版本） | 1 份 |
| Execution Gate + Integrity Check | `PRE_SESSION_CHECKLIST.md`（合并为执行前检查清单） | 1 份 |
| Content Strategy Gate + Content Selection Freeze | `CONTENT_FREEZE.md`（Strategy 作为 Selection 的前置章节） | 1 份 |

### 3.2 建议不再产生的文档类型

| M83 产生了 | M84 不再产生 | 理由 |
| --- | --- | --- |
| Entry Gap Analysis + Entry Gate Review | 直接引用 M83 Retrospective + M83.5 Decision | M83 已验证入口机制，不需要每个 Milestone 重复 |
| Experiment Audit Closure | 合并到 M84 Retrospective §Governance | Audit 是 Governance 的一部分，不是独立产物 |
| Session Summary（每场） | Session Record 已包含完整数据 | Summary 是执行快捷视图，Session 完成后自动过期 |

### 3.3 建议永久化的结构

```
M84 治理文档最小集（预测）：

  M84_SCOPE_FREEZE_REVIEW.md       ← Governance Contract（从 Template 复制）
  M84_IMPLEMENTATION_ACCEPTANCE.md  ← Implementation 合并
  M84_INSTRUMENTATION_GATE.md       ← Instrumentation 合并
  M84_PROTOCOL_FREEZE.md            ← 直接出 Final
  M84_CONTENT_FREEZE.md             ← Content 合并
  M84_PRE_SESSION_CHECKLIST.md      ← 执行前检查
  M84_SESSION_RECORD_TEMPLATE.md    ← 复用 M83 Template
  M84_SESSION_001~004_RECORD.md     ← 实验数据
  M84_RETROSPECTIVE.md              ← 里程碑总结
  M84_GOVERNANCE_COST_AUDIT.md      ← 治理效率审计

  预估：~12 份（vs M83 的 31 份）
  节省：61%
```

---

## 4. Governance Efficiency 指标

### 4.1 M83 实际指标

| 指标 | 值 |
| --- | --- |
| 总文档数 | 31 |
| Permanent 数 | 5（16%） |
| 关键决策依赖文档数 | 5 |
| 阅读成本（全部） | ~93,000 字 |
| 阅读成本（Permanent + Session） | ~24,000 字 |
| **Governance Efficiency** | **16%（5/31 的文档支撑了全部关键决策）** |

### 4.2 M84 目标

| 指标 | 目标 |
| --- | --- |
| 总文档数 | ≤15 |
| Permanent 数 | ≥5 |
| Governance Efficiency | ≥33%（至少 1/3 的文档支撑关键决策） |
| **Decision Density** | **≥2（每份 Permanent 文档支撑 ≥2 个关键决策）** |

---

## 5. Document Lifecycle Policy

### 5.1 生命周期规则

| 级别 | 生命周期 | 处理方式 |
| --- | --- | --- |
| **Permanent** | 永久保留 | 进入 `docs/governance/` 作为 Governance Reference。M84+ 直接引用 |
| **Essential** | Milestone 关闭后归档 | 移动到 `docs/product/archive/M83/`。不再作为 M84+ 的决策依据 |
| **Derived** | 合并后替代 | 被合并目标文档取代后，标记为 "Superseded by {新文档}" |
| **Transient** | Session 结束后自动归档 | Session 数据在 M83.5 决策后归档。Session Summary 不保留 |

### 5.2 归档规则

```
M83 Closure 后：

  docs/product/
    M83_SCOPE_FREEZE_REVIEW.md        → 保留（Permanent）
    M83_RETROSPECTIVE.md              → 保留（Permanent）
    M83_GOVERNANCE_COST_AUDIT.md      → 保留（Permanent）
    M83_*.md（Essential/Derived）      → docs/product/archive/M83/
    validation_sessions/SESSION_*.md  → docs/product/archive/M83/sessions/

  docs/governance/
    MILESTONE_GOVERNANCE_TEMPLATE.md  → 保留（Draft → 待版本化）
    GOVERNANCE_EVOLUTION.md           → 保留（持续更新）
```

### 5.3 "这个文档能不能删？" 的决策树

```
这个文档是 Permanent 级别？
  ├── 是 → 不能删。它是 Governance Reference
  └── 否 → 它的决策已被上级文档吸收？
            ├── 是 → 可以归档
            └── 否 → 应该合并到上级文档后再归档
```

---

## 6. Decision Density

### 6.1 定义

```
Decision Density = 文档承担的关键决策数 / Permanent 文档数
```

衡量的是 "每份核心文档承载了多少决策价值"，而非 "有多少份文档"。

### 6.2 M83 Permanent 文档的 Decision Density

| 文档 | 关键决策 | Decision Density |
| --- | --- | --- |
| `M83_SCOPE_FREEZE_REVIEW.md` | Scope / Boundary / Out of Scope / Change Protocol / Authority / Lifetime / Baseline References / 文档定位 | **8** |
| `M83.3_EXPLORER_VALIDATION_PROTOCOL_FREEZE_FINAL.md` | H0/H1/H2 假设 / 对照设计 / Session 结构 / Observer Protocol / 三级信号 / 样本量 / Output Contract | **7** |
| `M83.4_DATASET_LOAD_FREEZE.md` | 10 条 CS 内容 / 数据加载路径 / 实验变量冻结 / 可复现性 | **4** |
| `M83.4_EXPLORER_SESSION_RECORD_TEMPLATE.md` | Session 结构 / Observer 规则 / 定量指标 / 定性评分 / 输出格式 | **5** |
| `M83_RETROSPECTIVE.md` | Lessons Learned / Reusable Assets / Project Impact / Milestone Classification | **4** |
| **合计** | **28 个关键决策** | **平均 5.6** |

### 6.3 优化方向

```
M83: Decision Density = 28 / 5 = 5.6

M84 目标：
  不是减少 Permanent 文档数（5 份已经足够精简），
  而是确保每份 Permanent 文档的 Decision Density ≥ 5。

做法：
  - 不产生 Decision Density < 2 的 Permanent 文档
  - 如果一份文档只承载 1 个决策 → 合并到上级文档
```

---

## 7. M84 Governance Rule

### 7.1 核心原则

```
任何 Milestone 不再默认复制 M83 全套流程。

根据 Milestone 类型选择治理模板。
```

### 7.2 按类型的最小治理集

| Milestone 类型 | 必需文档 | 数量 |
| --- | --- | --- |
| **Foundation** | Architecture Gate + Implementation Acceptance | 2 |
| **Architecture** | ADR + Scope Freeze + Implementation Acceptance | 3 |
| **Runtime** | Scope Freeze + Implementation Acceptance + Instrumentation Gate | 3 |
| **Governance** | Policy Document + Impact Assessment + Retrospective | 3 |
| **Validation** | Protocol Freeze + Instrumentation Gate + Session Record + Decision Gate | 4 |
| **Expansion** | Scope Freeze + Architecture Gate + Implementation Acceptance | 3 |
| **Reasoning** | ADR + Protocol Freeze + Session Record + Decision Gate | 4 |

### 7.3 M84 适用规则

```
M84 = Expansion

最小治理集：
  M84_SCOPE_FREEZE_REVIEW.md       ← 从 Template 复制
  M84_ARCHITECTURE_GATE.md          ← 如果 M83.5 Decision = PASS
  M84_IMPLEMENTATION_ACCEPTANCE.md  ← Implementation 合并

可选（如果 M84 包含验证）：
  M84_PROTOCOL_FREEZE.md
  M84_SESSION_RECORD_TEMPLATE.md
```

---

## 8. 总结

```
M83 治理体系的三个产出：

1. CausalStatement Validation        ← 产品验证能力
2. Product Experiment Pipeline       ← 可复用的实验治理流水线
3. Self-Optimizing Governance Framework ← 会自我优化的治理体系

M83 = Validation Capability + Governance System + Governance Optimization
```

| 维度 | M83 实际 | M84 目标 |
| --- | --- | --- |
| 总文档数 | 31 | ≤12 |
| Permanent 数 | 5 | 5 |
| Governance Efficiency | 16% | ≥33% |
| Decision Density | 5.6 | ≥5 |
| 按类型选择模板 | ❌ 第一次无模板 | ✅ 按 Expansion 类型最小集 |

```
治理体系成熟 ≠ 文档数量增加。
治理体系成熟 = Governance Efficiency 提升 + Decision Density 提高 + 按类型选择模板。
```

---

> Governance Cost Audit 完成 | 送给 M84+ 的礼物 | 不替代 M83.5 Decision
