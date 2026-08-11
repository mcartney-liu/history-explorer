# Milestone Governance Template

> **状态**：Draft（未版本化）
> **来源**：Derived from M83 Governance Contract（`docs/product/M83_SCOPE_FREEZE_REVIEW.md`）
> **首次实例**：M83（History Explorer）
> **创建日期**：2026-08-05
> **适用范围**：History Explorer 所有 Milestone（M83+）
>
> **版本化条件**：经 M83 / M84 / M85 连续三个 Milestone 验证，无重大结构变化后，正式发布为 v1.0。
>
> **使用说明**：每个 Milestone 在进入 Implementation 前，复制本模板，填充 `{MILESTONE}` 占位符和具体内容，作为该 Milestone 的 Governance Contract。

---

## 1. Document Identity

```markdown
# {MILESTONE} Scope Freeze Review

> **文档类型**：Governance Contract（非 Planning Document）
> **状态**：READY (Frozen)
> **阶段**：{MILESTONE}.0 Scope Freeze — Implementation 前的最终边界冻结
> **模式**：严格只读 | **日期**：{YYYY-MM-DD} | **基线**：{PREV_MILESTONE} committed
> **前置审查**：{前置审查文档列表}
>
> **命名说明**：文件名保持 `{MILESTONE}_SCOPE_FREEZE_REVIEW.md`（遵循项目 `*_REVIEW` / `*_GATE` / `*_FREEZE` 命名体系）。文档类型为 Governance Contract。
```

---

## 2. Goal

### 2.1 Milestone 定义

```
{MILESTONE} = {一句话定义}

{MILESTONE} ≠ {一句反定义}
```

### 2.2 Success Definition

| 验证维度 | 指标 | 采集方式 | 成功阈值 |
| --- | --- | --- | --- |
| {维度 1} | {指标} | {采集方式} | {阈值} |
| ... | ... | ... | ... |

### 2.3 本 Milestone 不是

| 不是 | 为什么 | 正确时机 |
| --- | --- | --- |
| {不是 1} | {理由} | {正确 Milestone} |
| ... | ... | ... |

---

## 3. Scope — Allowed / Forbidden / Future

### 3.1 Allowed（允许）

| # | 文件 | 操作 | 归类 |
| --- | --- | --- | --- |
| A1 | {文件路径} | {具体操作} | {任务归类} |
| ... | ... | ... | ... |

### 3.2 Forbidden（禁止）

| # | 模块/文件 | 禁止原因 |
| --- | --- | --- |
| F1 | {模块} | {禁止原因（引用约束编号）} |
| ... | ... | ... |

### 3.3 Future（未来 Milestone）

| # | 工作 | 归属 | 理由 |
| --- | --- | --- | --- |
| FU1 | {工作} | {Milestone} | {理由} |
| ... | ... | ... | ... |

---

## 4. Out of Scope（绝对不做）

| # | 工作 | 归属 | 理由 |
| --- | --- | --- | --- |
| O1 | {工作} | {Milestone 或 永久不做} | {理由} |
| ... | ... | ... | ... |

---

## 5. Dependency Graph

```
{PREV_MILESTONE} Baseline (Committed)
       │
       ▼
{MILESTONE}.0 {任务}
       │
       ▼
{MILESTONE}.1 {任务}
       │
       ▼
{MILESTONE}.2 {任务}
       │
       ▼
{MILESTONE} Close
```

---

## 6. Scope Change Protocol

### 6.1 允许修改 Scope 的唯一条件

| # | 条件 | 说明 |
| --- | --- | --- |
| 1 | **Implementation Defect** | 发现已提交代码与 Scope Freeze 不一致 |
| 2 | **Architecture Defect** | 发现架构约束与已提交 Baseline 冲突（非产品需求变化） |
| 3 | **Baseline Conflict** | 发现 Freeze Boundary 与已提交 Baseline 不一致 |

### 6.2 不接受的 Scope Change 理由

以下理由一律拒绝，相关工作进入 Future Milestone：

| 拒绝理由 | 处理方式 |
| --- | --- |
| "这里顺便改一下"（体验优化） | → 进入 Closure 的 Future Milestone 建议列表 |
| "用户可能想要..."（功能建议） | → 进入 Future Milestone Backlog |
| "这样设计更优雅"（架构重构） | → 进入下一 Milestone Architecture Gate |
| "先加个字段备用"（产品创意） | → 进入 Future Milestone Backlog |
| "上一个 Milestone 就应该..."（事后聪明） | → 如果确实遗漏且属于 Implementation Defect，走条件 1；否则拒绝 |

### 6.3 Scope Change 流程

```
提出 Scope Change
    ↓
判断是否符合 3 个允许条件
    ↓
    ├── 不符合 → 拒绝，归入 Future Milestone
    │
    └── 符合 → 修订 Governance Contract + PO 签核
                  ↓
              更新 Scope Baseline
                  ↓
              通知所有 Reviewer
```

---

## 7. Baseline References

### 7.1 Architecture Baseline

| 文档 | 用途 | 状态 |
| --- | --- | --- |
| {ADR 文档列表} | 架构决策 | 🔒 Frozen |
| {PREV_MILESTONE Final Gate} | 上一 Milestone 约束 | 🔒 Frozen |

### 7.2 {MILESTONE} Scope（唯一有效）

| 文档 | 用途 | 状态 |
| --- | --- | --- |
| **`{MILESTONE}_SCOPE_FREEZE_REVIEW.md`** | **{MILESTONE} 全阶段唯一 Scope Baseline** | ✅ Active |

### 7.3 前置审查（仅参考，不作为 Scope 依据）

| 文档 | 用途 | 状态 |
| --- | --- | --- |
| {前置审查文档列表} | {审查类型} | 📄 已归档 — 决策已纳入 Governance Contract |

### 7.4 引用规则

```
代码评审     → 引用 §3（Freeze Boundary）
实现评审     → 引用 §4（Out of Scope）
验收         → 引用 §3 + §4 + §9（Scope Baseline）
Scope 争议   → 引用 §6（Scope Change Protocol）

不要回到前置审查文档中重新讨论范围。
```

---

## 8. Freeze Lifetime

```
本 Governance Contract 有效期：

  {MILESTONE} Start ────→ {MILESTONE} Close

  {NEXT_MILESTONE} 开始后：本文档自动失效。
  {NEXT_MILESTONE} 将重新建立 Governance Contract。
```

---

## 9. Authority（文档优先级与仲裁规则）

### 9.1 优先级规则

| 优先级 | 文档 | 说明 |
| --- | --- | --- |
| **1（最高）** | {PREV_MILESTONE} Frozen Baseline（ADR + Final Gate） | 架构约束不可被 {MILESTONE} 文档覆盖 |
| **2** | **本文档（{MILESTONE} Governance Contract）** | {MILESTONE} Scope 的唯一有效依据 |
| **3** | {MILESTONE} 前置审查文档 | 仅参考，不作为 Scope 依据 |

### 9.2 仲裁规则

| 场景 | 规则 |
| --- | --- |
| **内部文档冲突** | 若前置审查文档与本文档冲突 → **以本文档为准** |
| **跨 Milestone 冲突** | 若本文档与 {PREV_MILESTONE} Frozen Baseline 冲突 → **必须先修订 Baseline，不得直接修改实现** |
| **Implementation 与 Scope 冲突** | 若已提交代码与本文档的 Allowed / Forbidden 不一致 → 走 §6 Scope Change Protocol |
| **Review 意见冲突** | 若不同 Reviewer 引用不同文档得出不同结论 → **以本文档的 §7 Baseline References 为准** |

### 9.3 简洁版本

```
发生冲突时：

  前置审查 ≠ Governance Contract → 以 Governance Contract 为准
  Governance Contract ≠ Frozen Baseline → 先修订 Baseline，再修订 Contract
```

---

## 10. Acceptance Criteria

{MILESTONE} 完成的 Gate Criteria：

| # | 条件 | 验证方式 |
| --- | --- | --- |
| {GC-1} | {条件描述} | {验证方式} |
| ... | ... | ... |

---

## 11. Milestone Governance 全链路

本模板是 Milestone Governance 全链路中的 Scope Freeze 环节。

完整的 Governance 链路：

```
Architecture Gate Review     → 判定是否进入 Milestone
    ↓
Implementation Plan Review   → 制定实施计划
    ↓
Architecture Acceptance       → 确认架构前提
    ↓
Scope Freeze Review           → 冻结范围边界（本模板）
    ↓
Implementation                → 按 Scope 编码
    ↓
Release Readiness Review      → 提交前审计
    ↓
Commit Preparation Review     → 拆分提交方案
    ↓
Commit Execution              → 提交代码
    ↓
Closure Review                → 验收与归档
    ↓
{NEXT_MILESTONE} Entry Gate   → 进入下一 Milestone
```

---

> **模板版本**：v1.0 | **首次用于**：M83 | **维护规则**：本模板自身也遵循 Governance 原则 — 修订须通过正式的 Template Change Proposal + PO 签核。
