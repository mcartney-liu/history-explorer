# M82 Phase 2 Implementation Review

> **阶段**：M82 Phase 2 Implementation Review
> **模式**：只读审查
> **日期**：2026-08-05
> **结论**：**PASS WITH CONDITION — 可继续 P2.6，记录 1 条架构债**

---

## 1. Overall Verdict

**PASS WITH CONDITION**

Phase 2 实现符合 Architecture Gate 的全部约束。唯一的问题是 `ExplorationPackagePage` 硬编码了 5 条 CausalStatement——这是一条临时数据路径，**当前不违反架构边界**（因为 Phase 2 的范围就是前端验证 Guide/RelationshipChain 渲染链路），但**必须记录为技术债**，在 P3.2 时替换为 API 数据源。

---

## 2. Constraint Compliance Table

| # | 约束 | 结果 | 证据 |
| --- | --- | --- | --- |
| IC-1 | 不新增 Schema | ✅ PASS | CausalStatement 7 字段不变；`causalStatement.ts` 类型定义与 Phase 1 一致 |
| IC-2 | 不新增 API | ✅ PASS | 0 个新 API 调用；CS 数据来自硬编码常量或已有 `resolveCausalForEdge()` |
| IC-3 | 不引入 AI Runtime | ✅ PASS | 0 个 AI/LLM import 或调用 |
| IC-4 | 不修改 Graph Core | ✅ PASS | `graph.py` 未修改；Edge 三字段不变 |
| IC-5 | 保持无 CS fallback | ✅ PASS | `GuidePanel.tsx:86` — `step.reason` 使用 `cs?.mechanism ?? template.meaning`；无 CS 时保持模板 reason |
| IC-6 | CausalStatementCard 独立职责 | ✅ PASS | `CausalStatementCard.tsx` 未修改——Phase 2 仅增加挂载点（`GuidePanel.tsx:88-89`、`RelationshipChain.tsx:87-90`） |
| IC-7 | 匹配策略为直接 GID | ✅ PASS | `explorationGuide.ts:114` — `cs.cause_id === edge.from && cs.effect_id === edge.to` |
| IC-8 | 0 个新依赖 | ✅ PASS | 无新增 npm 依赖 |

**8/8 IC PASS。**

---

## 3. Architecture Risk — Hardcoded CausalStatement

### Risk Assessment

| 维度 | 判定 |
| --- | --- |
| **Risk Level** | 🟡 **Medium** |
| **是否只是 Phase 2 demo fixture？** | ✅ 是——`CHINA_CAUSAL_STATEMENTS` 常量明确标注 "M82 P2 — Phase 2 verification"，P3.2 时替换 |
| **是否会形成正式生产数据入口？** | ⚠️ 风险——如果不记录为技术债，未来可能被误认为"就是这样读数据的" |
| **是否违反 Semantic Layer → Frontend 数据流设计？** | ⚠️ 部分——Phase 1 数据流是 `JSON → Loader → Adapter → Engine → API → Frontend`，当前硬编码绕过了 API 层 |
| **是否影响未来 API 接入？** | ✅ 不影响——`GuidePanel` 和 `RelationshipChain` 的接口设计为 `causalStatements?: readonly CausalStatementData[]`，与 API 返回的 `PathCandidate.causal_statements[]` 类型完全一致。替换只需改变数据来源 |

### 原因说明

硬编码是 Phase 2 的最小可行方案——Phase 2 的目标是验证 "Guide 叙事理由 + RelationshipChain 因果解释" 的**渲染链路**，不是验证**数据管道**。硬编码避免了：
1. 在前端新增 `fetch` / `useEffect` 异步逻辑（影响 Phase 2 的简单性）
2. 需要后端 API 在 Phase 2 阶段就支持前端动态查询（超出 Phase 2 范围）
3. 引入状态管理（违反 IC-8）

**但这是技术债**，必须在 P3.2 偿还。

---

## 4. Data Flow Architecture Review

### Phase 1 原设计

```
CausalStatement JSON → Loader → Adapter → ExplorationEngine → API → Frontend
```

### Phase 2 实际

```
CausalStatement JSON (data/causal_statements.json)
  ↓ (手动同步)
ExplorationPackagePage CHINA_CAUSAL_STATEMENTS (硬编码)
  ↓
GuidePanel / RelationshipChain
  ↓
CausalStatementCard
```

**是否产生第二条数据路径？** ✅ 是。当前有两条路径：
1. **后端路径**（Phase 1）：`JSON → Loader → Adapter → Engine → API.causal_statements` — 数据在 API 响应中但前端未消费
2. **前端硬编码路径**（Phase 2）：`ExplorationPackagePage.tsx` 直接内联 5 条 CS

### 是否应该在 Phase 2 修正？

**不应该。** 理由：
1. 后端 API 路径已就绪（`PathCandidate.causal_statements`）——只是前端还没消费
2. 硬编码的 5 条 CS 与 `data/causal_statements.json` 完全一致——不是"两条不同的数据"，是"同一份数据的两个副本"
3. Phase 2 的验证目标是渲染链路，不是数据管道——用硬编码验证渲染链路是正确的工程实践
4. 在 Phase 2 新增前端 API 调用会引入异步状态管理——增加不必要的复杂度

### 延期到 P3.2

P3.2（RelationshipChain 嵌入 CausalStatementCard 的完整集成）是接入真实 API 的正确时机——届时 `find_connections` 的 API 响应中的 `causal_statements` 被前端直接消费，硬编码常量被删除。

---

## 5. Frontend Responsibility Boundary

| 组件 | 职责 | 是否泄漏？ | 说明 |
| --- | --- | --- | --- |
| `CausalStatementCard` | 纯展示 | ✅ 无泄漏 | Phase 1 组件，Phase 2 未修改 |
| `GuidePanel` | 叙事包装 | ✅ 无泄漏 | 仅消费 `causalStatements` prop，不管理数据来源 |
| `RelationshipChain` | 路径展示 | ✅ 无泄漏 | 同上——消费 prop，不管理来源 |
| `PackageJourney` | 透传 | ✅ 无泄漏 | 纯 props drilling |
| **`ExplorationPackagePage`** | **Semantic Data Provider + Page** | ⚠️ **职责泄漏** | 页面层同时承担了"定义 5 条 CS 数据"的职责——这是 `CausalLoader` 的职责，不是 Page 的职责 |

### 最小修复方案

**当前不做修复**——这是 Phase 2 验证阶段的临时方案。P3.2 时：

```
ExplorationPackagePage
  ↓ 删除 CHINA_CAUSAL_STATEMENTS 常量
  ↓ 从 API response 提取 causal_statements
  ↓ 传递给 GuidePanel / PackageJourney
```

修复成本：删除常量 + 改一行赋值 = 2 行代码变更。

---

## 6. Future API Compatibility

### 迁移成本评估

**Migration Cost: Low**

| 需要修改的模块 | 改动量 | 说明 |
| --- | --- | --- |
| `ExplorationPackagePage.tsx` | 删除常量 + 1 行 | 从 `apiResponse.paths[0].causal_statements` 提取 |
| `GuidePanel` | 0 行 | 接口 `causalStatements?: CausalStatementData[]` 不变 |
| `RelationshipChain` | 0 行 | 同上 |
| `CausalStatementCard` | 0 行 | 同上 |
| `resolveCausalForEdge` | 0 行 | 同上 |
| `PackageJourney` | 0 行 | 同上 |

**只需要替换一个 data provider**——从硬编码常量改为 API response。所有消费组件的接口不变。

---

## 7. Recommended Action

### A. PASS WITH CONDITION — 可继续 P2.6 Testing

| 条件 | 内容 |
| --- | --- |
| **Condition #1** | 记录技术债：`ExplorationPackagePage` 硬编码 `CHINA_CAUSAL_STATEMENTS` — P3.2 时替换为 API 数据源 |
| **条件** | 当前不阻塞 Phase 2/3 的任何工作 |

### 债务记录

```
Debt ID: M82-P2-DEBT-001
Description: ExplorationPackagePage contains hardcoded CausalStatement data
              (CHINA_CAUSAL_STATEMENTS constant, 5 CS entries).
              This is a temporary data path for Phase 2 rendering verification.
Fix: Replace with API-sourced causal_statements from PathCandidate response.
Target: M82 P3.2 (RelationshipChain CausalStatementCard full integration)
Risk if not fixed: Data duplication between frontend constant and
                    data/causal_statements.json; frontend CS data not
                    dynamically updated when backend CS data changes.
```

---

> 审查模式：只读
> 审查对象：`explorationGuide.ts` + `GuidePanel.tsx` + `RelationshipChain.tsx` + `PackageJourney.tsx` + `ExplorationPackagePage.tsx`
> 日期：2026-08-05
> 结论：**PASS WITH CONDITION — 8/8 IC PASS, 1 条技术债 (P3.2 偿还)**
