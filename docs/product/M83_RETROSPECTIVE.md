# M83 Milestone Retrospective

> **阶段**：M83 Milestone Retrospective
> **日期**：2026-08-05
> **状态**：Milestone Complete — Pending M83.5 Decision

---

## 1. Objectives vs Outcomes

### 我们原来准备验证什么？

```
M83 原始目标：
  "验证 CausalStatement 是否改变 Explorer 的探索行为"

具体假设：
  H0 — CS 不改变行为
  H1 — CS 改变探索行为（cs_follow_entity / cs_guide_next 提升）
  H2 — CS 提升理解但不一定改变行为（Mechanism Recall 提升）
```

### 实际上产出了什么？

**产品产出**：

| 产出 | 内容 |
| --- | --- |
| M83.0 Runtime Delivery | `explore()` API 现在返回 `causal_statements`（修复 M82 遗漏的 ExploredNode 路径） |
| M83.1 Instrumentation | 5 个 `cs_*` 事件 + `causalId` 字段（localStorage，不采集 confidence） |
| M83.2 Content | 10 条 CausalStatement（5 保留 + 5 新增），通过 S1-S5 质量标准 |
| M83.3 Protocol | 可执行实验协议（H0/H1/H2 + Topic A-B 对照 + 三级信号判定 + Observer Protocol） |
| M83.4 Sessions | 3 场 Explorer Session，形成一致方向信号（深度差 +2→+4→+6，Recall 2.5→2.7→3.0） |

**治理产出**：

| 产出 | 内容 |
| --- | --- |
| Governance Contract | `M83_SCOPE_FREEZE_REVIEW.md` — 从 "Review" 升级为 "Governance Contract"，包含 Allowed/Forbidden/Out of Scope/Change Protocol/Authority/Lifetime |
| Governance Template | `MILESTONE_GOVERNANCE_TEMPLATE.md`（Draft）— 11 章标准化 Milestone 治理结构 |
| Experiment Pipeline | 15 阶段实验治理流水线（Planning→Scope→Impl→Instrumentation→Freeze→Protocol→Gate→Session→Audit→Decision） |
| Governance Evolution | `GOVERNANCE_EVOLUTION.md` — 记录 M62→M83 治理能力演进 |

### 差距

| 原始目标 | 实际完成 | 差距 |
| --- | --- | --- |
| 验证 CausalStatement 是否改变行为 | 3 场 Session 完成，方向一致但未达到 M83.5 决策条件 | Session #004 待执行 |
| DEBT-001 偿还 | DEBT-001A（Runtime）已完成，DEBT-001B（Package Data Governance）待执行 | Part B 待 M83.0b 完成 |
| M80.5 Revision 合并 | 未执行 | PO 签核待定 |

---

## 2. Unexpected Findings

### Finding 1：形成了一套产品实验治理流水线（最大意外收获）

M83 最初的目标只是 "验证 CausalStatement"。但在执行过程中，我们意外地建立了一套完整的 **Product Experiment Governance Pipeline**：

```
Architecture Gate → Scope Freeze → Implementation Boundary → Implementation
→ Acceptance → Dataset Freeze → Protocol Freeze → Execution Gate
→ Session Record → Integrity Audit → Governance Audit → Decision
```

这套流水线的 ~70% 与 CausalStatement 无关，可以直接复用于任何产品实验。

**这不是计划中的产出，但可能是 M83 最有长期价值的产出。**

### Finding 2：CausalStatement 正在从 UI 元素变成用户期待

Session #002 和 #003 的 Explorer 都主动提到罗马包 "缺少解释"。这不是我们引导的——Observer Protocol 禁止提示 CS。Explorer 自发形成了 "这个产品应该告诉我为什么" 的预期。

这验证了 M82 的一个隐含假设：**因果解释不是锦上添花，而是 Explorer 的核心期待。**

### Finding 3：Evidence 可能不是 Explorer 的第一入口

三场 Session 中，Evidence Open Rate 为 0%（#001/#002）和 1 次（#003）。但 Recall 和 Intent 都在持续上升。这说明 Explorer 不需要查看证据来源就能理解并接受因果解释——Evidence 可能是专家层需求，不是 Explorer 第一入口。

### Finding 4：Observer Bias 随 Session 数量自然改善

Experiment Integrity Check 发现：Session #001 有 38% 的 Interpretation（带结论倾向的描述），但到 #003 降为 0%。这不是有意纠正的——是记录纪律在多次执行后自然改善的。

### Finding 5：治理文档不是为了限制开发，而是为了降低重复决策成本

这是 M83 过程中 PO 提出的核心原则。它改变了我们对 Governance Contract 的理解——Forbidden 和 Out of Scope 不是 "不许做"，而是 "已经决定过了，不用再讨论"。

---

## 3. Reusable Assets

### 可直接复用的文档

| 资产 | 可复用范围 | 优先级 |
| --- | --- | --- |
| `MILESTONE_GOVERNANCE_TEMPLATE.md`（Draft） | 任何 Milestone 的 Scope Freeze | P0 |
| Experiment Protocol 结构（H0/H1/H2 + 对照设计 + Session 结构 + Observer Protocol） | 任何产品实验 | P1 |
| Session Record Template（6 章结构） | 任何用户 Session | P1 |
| Integrity Check 结构（5-Check：Protocol/Variable/Sample/Observer/Data） | 任何实验质量审计 | P1 |
| Execution Gate 结构（5-Check：Materials/Instrumentation/Protocol/Data/Decision） | 任何实验执行前检查 | P2 |
| Instrumentation Gate 结构（Schema Boundary / Event Minimalism / Metrics） | 任何埋点设计 | P2 |

### 可复用的流程

| 流程 | 说明 |
| --- | --- |
| Architecture Gate → Scope Freeze → Implementation Boundary | 三层 Gate 确保 Implementation 前 Scope 完全冻结 |
| Dataset Freeze → Protocol Freeze → Execution Gate | 三层 Freeze 确保实验变量和实验方法在执行前不可变 |
| Session → Integrity Audit → Governance Audit → Decision | 三层 Audit 确保实验数据可信 + 治理体系可复用 |

### 可复用的原则

| 原则 | 来源 |
| --- | --- |
| "治理文档不是为了限制开发，而是为了降低重复决策成本" | PO — M83 Governance Contract 讨论 |
| "Instrumentation ≠ Runtime Logic — 观察者不能改变被观察的事物" | M83.1 Implementation Boundary Review |
| "Semantic Data 和 Behavior Data 必须分离 — causalConfidence 不应进入事件" | M83.1 Instrumentation Gate Review |
| "H2 保护 Semantic Layer 不被错误淘汰 — 理解价值 ≠ 行为转化" | M83.3 Protocol Freeze Final |

---

## 4. Lessons Learned

### 以后不用再讨论的决策

| # | 决策 | 为什么不再讨论 |
| --- | --- | --- |
| 1 | **CausalStatement 是独立 Semantic Layer，不属于 Graph Edge** | ADR-M79 + ADR-M82 已冻结，M83 全程未触 |
| 2 | **confidence 是 curator assessment enum string，不是 AI 置信度** | C-7 约束，M83.1 的 causalConfidence 删除事件确认了这一点 |
| 3 | **Runtime Explorer 和 Static Package Experience 长期共存** | M83 Explorer Data Flow Review 确认了两条独立数据入口 |
| 4 | **Instrumentation 不应采集 Semantic Layer 的内容属性** | M83.1 Gate Review 删除了 causalConfidence，建立了 Behavior/Semantic 分离原则 |
| 5 | **产品实验需要 H2（理解假设）保护层** | H1 失败 + H2 成功 ≠ CS 没价值，只是呈现方式需要优化 |
| 6 | **Milestone Scope Freeze 应升级为 Governance Contract** | M83 从 "Review" 升级为 "Contract"，包含 Change Protocol + Authority + Lifetime |

### 如果重来一次，会改进的地方

| # | 改进 | 说明 |
| --- | --- | --- |
| 1 | **DEBT-001 应该在 M82 就拆分** | DEBT-001 原始描述 "前端硬编码 → 迁移到 API" 过度简化了问题。实际包含两个独立问题（Runtime Bug + Data Duplication），M83 过程中才发现 |
| 2 | **Experiment Protocol 应该先于 Content Selection** | 当前顺序是 Content（M83.2）→ Protocol（M83.3），但 Protocol 定义了 "需要验证什么" 之后才能确定 "需要什么 CS"。顺序应该是 Protocol → Content |
| 3 | **Governance Template 应该在 M82 就建立** | 如果 M82 有 Governance Template，M83 的 Scope Freeze 就不需要经过三轮修订才从 "Review" 升级为 "Contract" |

---

## 5. M83 在整个项目中的位置

```
M77 — AI Grounding Runtime
M79 — Semantic Layer Architecture
M82 — Causal Semantic Layer Runtime（能力建设）
M83 — Explorer Validation & Governance Pipeline（验证 + 治理方法建立）
M84 — Semantic Object Expansion（待决策）
M85 — Reasoning Exploration Engine（待决策）
```

M83 是 History Explorer 从 **"建设能力"** 到 **"验证能力"** 的转折点。它不仅验证了 CausalStatement 的产品价值，更重要的是建立了 **"如何验证产品能力"** 的工程治理方法。

---

## 6. Project Impact — What Changed the Project

### 6.1 M83 之后，项目有哪些事情将永久改变？

| # | 改变 | 说明 |
| --- | --- | --- |
| 1 | **新能力必须有 Validation Plan** | 任何新的 Explorer 能力（Timeline / Map / AI Guide / Recommendation）在扩展之前，必须先通过实验验证其产品价值。不再 "做了就上线" |
| 2 | **新产品能力优先实验验证，而不是直接扩展** | M82 建立能力 → M83 验证能力 → M84 决定是否扩展。这个三步节奏将成为后续 Milestone 的默认模式 |
| 3 | **Instrumentation 成为产品能力的一部分** | M83.1 证明：埋点不是分析团队的附属工作，而是产品实验的核心组件。以后任何产品能力都需要配套的 Instrumentation |
| 4 | **产品决策开始依赖实验，而不仅依赖设计讨论** | M83.5 的决策将基于 Session 数据（H0/H1/H2），而不是 "我觉得用户会喜欢"。这是从 "设计驱动" 到 "实验驱动" 的转变 |
| 5 | **每个 Milestone 都有 Governance Contract** | M83 将 Scope Freeze 从 "一次性 Review" 升级为 "Governance Contract"。M84/M85 将复用 MILESTONE_GOVERNANCE_TEMPLATE.md |

### 6.2 M83 之后，哪些工作方式被淘汰？

| # | 淘汰 | 替代 |
| --- | --- | --- |
| 1 | **靠主观感觉决定产品方向** | 靠 H0/H1/H2 假设验证 |
| 2 | **没有对照组的验证** | Topic A-B 对照设计（同一用户内对照 + 顺序随机化） |
| 3 | **一次 Session 就下结论** | 多场 Session + 三级信号判定（Strong/Weak/No Signal） |
| 4 | **没有 Protocol 的产品测试** | Protocol Freeze → Execution Gate → Session → Integrity Audit |
| 5 | **"看看用户感觉如何"** | 预设假设 + 冻结变量 + 设计测量 + 获取证据 + 决策下一阶段 |
| 6 | **埋点是事后补充** | Instrumentation 是实验设计的一部分，先于 Session 冻结 |

### 6.3 M83 对 M84～M90 的影响

```
以后任何新的 Explorer 能力：

  Architecture Gate      ← 架构是否合理？
      ↓
  Implementation          ← 能力是否可用？
      ↓
  Instrumentation         ← 行为是否可观测？
      ↓
  Experiment Protocol     ← 如何验证产品价值？
      ↓
  Experiment Execution    ← 获取用户证据
      ↓
  Decision Gate           ← 扩展 / 增强 / 重新设计
      ↓
  Expansion（或 Redesign）
```

这不是 CausalStatement 专属的流程。这是 **History Explorer 产品能力验证的标准流程**。

---

## 7. Milestone Classification

### 项目所有 Milestone 的类型

| 类型 | 含义 | 示例 |
| --- | --- | --- |
| **Foundation** | 建基础设施 | M62（Freeze 机制）、M77（AI Grounding） |
| **Architecture** | 建架构 | M79（Semantic Layer Architecture） |
| **Runtime** | 建运行能力 | M82（Causal Semantic Layer Runtime） |
| **Governance** | 建治理体系 | M83（Governance Contract + Experiment Pipeline） |
| **Validation** | 验证产品能力 | M83（Explorer Validation） |
| **Expansion** | 扩展已验证的能力 | M84（Semantic Object Expansion，待决策） |
| **Reasoning** | 建推理引擎 | M85（Reasoning Exploration Engine，待决策） |

### M83 的类型

```
M83 = Validation + Governance

Validation  —— 验证 CausalStatement 的产品价值
Governance  —— 建立产品实验治理流水线 + Milestone Governance Template
```

---

## 8. 一句话总结

```
M83 将 History Explorer 从 "构建产品" 推进到了 "通过实验驱动产品演进"。
```

这不是 M83 验证了 CausalStatement。这是 M83 定义了以后验证任何 Explorer 能力的方法。

---

> M83 Milestone Retrospective 完成 | 不替代 M83.5 Decision | 不判断 Signal Level
