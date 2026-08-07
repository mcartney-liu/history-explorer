# M83 Architecture Acceptance Review

> **模式**：严格只读 | **日期**：2026-08-05 | **基线**：M82 committed（0c5bb4f / 29cbaf9 / a727752）

---

## 1. 问题复现（Committed Baseline 证据）

| 位置 | 代码 | 状态 |
| --- | --- | --- |
| `PathCandidate` L140 | `causal_statements: list[dict]` | ✅ M82 P1.5 |
| `PathCandidate.to_dict()` L150-151 | `if self.causal_statements: result["causal_statements"] = ...` | ✅ |
| `ExploredNode` L155-175 | **无 `causal_statements` 字段** | ❌ |
| `explore()` L514 | `explanation=self._explain_path(steps)` → 返回 `tuple[str, list[dict]]`，只取了 `str[0]`，丢弃了 `list[dict][1]` | ❌ |
| `_explain_path` L764-766 | `return structural, cs_dicts` / `return structural + "...", cs_dicts` | ✅ 正确返回 tuple |
| `find_connections` | `PathCandidate(..., explanation=text, causal_statements=list[dict])` | ✅ P1.5 已正确解包 |

**根因**：M82 P1.4/P1.5 scope = `find_connections → PathCandidate` 路径。`explore() → ExploredNode` 路径不在 scope 中，P1.4/P1.5 两个 Report 均未提及 ExploredNode。

---

## 2. 问题分类判定

| 选项 | 判定 | 理由 |
| --- | --- | --- |
| A — M82 未完成项 | ❌ | P1.4/P1.5 scope 明确限定 `find_connections` 路径，ExploredNode 不在 scope 内 |
| **B — M83 DEBT-001 修复项** | ✅ | DEBT-001 目标是"前端从 API 获取 CS 数据"，`explore()` 是前端主要数据入口。修复 ExploredNode 是 DEBT-001 的必要前提 |
| C — 新 Feature | ❌ | `causal_statements` 数据结构、序列化格式均在 M82 实现，仅需同步 ExploredNode 与 PathCandidate |

**判定：B — M83 DEBT-001 修复项。**

### DEBT-001 重新定义

```
原名：M82-P2-DEBT-001 — Frontend hardcoded CausalStatement data → API 迁移
更名：M83-P0.1 Causal Delivery Pipeline Completion

范围扩大为两部分：
  Part A — ExploredNode 增加 causal_statements 字段（后端 bug fix）
  Part B — 删除 CHINA_CAUSAL_STATEMENTS 硬编码（前端数据源替换）
```

---

## 3. 是否需要修订

### 3.1 ADR 更新？

**不需要。** ADR-M82 的架构决策未改变：
- CausalStatement 仍是独立 Semantic Layer，不属于 Graph Edge
- confidence 仍是 curator assessment enum string
- 不引入 AI causal generation
- 不把 provenance 塞入 CausalStatement Schema

ExploredNode 修复是**实现补全**，不是架构变更。

### 3.2 M82 Baseline 修订？

**不需要修订 M82 commit。** 理由：
1. `PathCandidate` 路径完整且正确 — `find_connections` API 返回 `causal_statements`
2. `explore()` API 在 M82 中的使用场景不涉及前端 CausalStatement 消费（DEBT-001 时期前端用硬编码）
3. 修订 M82 commit 违反 Git 不可变性原则，且 M82 已通过 8/8 Gate
4. 修复应在 M83.0 中以新 commit 形式完成

### 3.3 M83 Scope 调整？

**不需要调整 M83 Scope 优先级。** 已在 M83 Implementation Plan Review 中列为 M83.0 Baseline Repair（P0），仅需明确 Part A + Part B 的两部分结构。

---

## 4. M83.0 Causal Delivery Pipeline Completion — 冻结边界

### 4.1 修复范围

```
M83.0 Causal Delivery Pipeline Completion

Part A (Backend):
  ExploredNode + causal_statements: list[dict]       ← 新增字段
  ExploredNode.to_dict() + causal_statements          ← 新增序列化
  explore() 解包 _explain_path tuple                  ← 修复 L514

Part B (Frontend):
  ExplorationPackagePage: 删除 CHINA_CAUSAL_STATEMENTS ← 净删除 ~40 行
  ConnectionExplained type: + causal_statements?      ← 类型扩展
  API response 提取: paths[].causal_statements        ← 数据提取

不变：
  5 个消费组件接口不变（CausalStatementCard / GuidePanel / RelationshipChain / PackageJourney / resolveCausalForEdge）
```

### 4.2 冻结边界

| 边界 | 内容 | 状态 |
| --- | --- | --- |
| **CausalStatement Schema（7 字段）** | 不动 | 🔒 FROZEN |
| **`_explain_path` 返回签名** | `tuple[str, list[dict]]` — 不变 | 🔒 FROZEN |
| **`PathCandidate`** | 不变（已正确） | 🔒 FROZEN |
| **API 响应格式** | `causal_statements` 字段格式与 PathCandidate.to_dict() 一致 | 🔒 FROZEN |
| **新增 API Endpoint** | 不新增 — 仅修复现有 `explore()` 的返回值 | 🔒 FROZEN |
| **Graph Core** | 不动 | 🔒 FROZEN |

### 4.3 交付定义

M83.0 完成 = 以下全部满足：

1. `GET /explore/{gid}` API 响应中每个 explored node 包含 `causal_statements` 字段
2. `causal_statements` 格式与 `PathCandidate.to_dict()` 的 `causal_statements` 一致
3. `CHINA_CAUSAL_STATEMENTS` 常量已从 `ExplorationPackagePage.tsx` 删除
4. CausalStatementCard / GuidePanel / RelationshipChain 渲染正确（5 个组件不变）
5. M82 全量 48 backend tests + 56 frontend tests 仍 PASS

---

## 5. 风险评估

| 风险 | 概率 | 缓解 |
| --- | --- | --- |
| `explore()` API 消费者已依赖当前响应格式 | 低 | `causal_statements` 是新增字段，不改变已有字段 |
| 前端数据提取路径不明确 | 中 | `ExplorationPackagePage` 的数据来源需要审计 — 当前可能不直接调用 `explore()` API |
| `to_dict()` 中 `causal_statements=[]` 的空数组语义不一致 | 低 | PathCandidate 的 `to_dict()` 在空数组时**不输出**字段；ExploredNode 应保持相同行为 |

---

## 6. Acceptance Verdict

```
ACCEPTED — M83-P0.1 Causal Delivery Pipeline Completion
```

| 维度 | 判定 |
| --- | --- |
| **问题分类** | B — M83 DEBT-001 修复项（非 M82 未完成项、非新 Feature） |
| **ADR 修订** | 不需要 |
| **M82 Baseline 修订** | 不需要（以新 commit 修复，不修订已提交的 M82） |
| **M83 Scope 调整** | 不需要（已列入 M83.0 Baseline Repair，仅明确 Part A/B 结构） |
| **M83.0 冻结边界** | 已冻结 — 仅修复 ExploredNode + 删除硬编码，不扩展任何能力 |

---

> 审查模式：只读 | 等待 PO Review
