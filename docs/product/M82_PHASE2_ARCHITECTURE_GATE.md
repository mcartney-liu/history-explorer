# M82 Phase 2 Architecture Gate

> **阶段**：M82 Phase 2 Architecture Gate Review
> **模式**：只读审查
> **日期**：2026-08-05
> **结论**：**GATE PASS — Phase 2 实现边界已冻结**

---

## 1. Approved Scope

| 项 | 范围 | 说明 |
| --- | --- | --- |
| **数据消费** | 只消费 Phase 1 已有的 `causal_statements` | API 响应中已存在，Phase 2 不新增任何数据字段 |
| **Guide reason 增强** | `GuideStep.reason` 优先使用 `CausalStatement.mechanism` | 有 CS → CS 叙事文本；无 CS → 模板 fallback |
| **CausalStatementCard 嵌入** | RelationshipChain `journey-arrow` 下方条件渲染 | 有 CS → 渲染卡片；无 CS → 不渲染 |
| **数据匹配** | 前端 `cs.cause_id === edge.from && cs.effect_id === edge.to` | 精确匹配，不涉及多跳因果链 |
| **组件修改** | `explorationGuide.ts` + `GuidePanel.tsx` + `RelationshipChain.tsx` + `ExplorationPackagePage.tsx` | 共 4 个文件 |
| **CausalStatementCard** | 不修改 | Phase 1 已实现，Phase 2 只增加挂载点 |

---

## 2. Forbidden Scope

| 禁止项 | 原因 |
| --- | --- |
| ❌ 新 CausalStatement 字段 | Phase 1 Schema Freeze — 7 字段不变 |
| ❌ 新 API endpoint | `causal_statements` 已在 PathCandidate API 中 |
| ❌ 新 AI explanation | C-6：AI 不生成 CausalStatement。Phase 2 只消费已有 CS 文本 |
| ❌ 新 Inference Layer | Inference Layer 的 UI 标识属于 Phase 3（LayerBadge） |
| ❌ 修改 CausalStatement Schema | Frozen Baseline §C.1 |
| ❌ 修改 Graph Core / Edge | C-3 约束 |
| ❌ 修改 Loader / Adapter / Engine | Phase 1 已冻结 |
| ❌ 自动生成 fallback 文本 | C-8：CS 缺失 → 保持模板 reason，不生成替代文本 |
| ❌ 新增状态管理 | 不需要——CS 数据随 API 响应到达，无额外 fetch |

---

## 3. 职责确认

### CausalStatement（Semantic Layer）

**提供**：历史解释数据（mechanism / consequence / confidence / evidence_refs）。

**不负责**：叙事包装（那是 GuidePanel 的职责）、路径展示（那是 RelationshipChain 的职责）。

### GuidePanel（Exploration Layer）

**负责**：叙事包装——将 `CausalStatement.mechanism` 作为 `guide-next-reason` 展示，附带 CausalStatementCard 供 Explorer 深入了解。

**不负责**：生成解释文本、修改 CausalStatement 内容。

### RelationshipChain（Exploration Layer）

**负责**：路径展示——Entity→Relationship→Entity 结构链 + 条件嵌入 CausalStatementCard。

**不负责**：因果关系推理、Evidence 数据管理。

---

## 4. 匹配策略

### MVP（Phase 2）

**Direct cause_id / effect_id matching**：

```
edge.from === cs.cause_id  &&  edge.to === cs.effect_id
```

O(n×m) 遍历。当前 n<10（Guide steps）, m=5（CS count）— 性能无问题。

### Future Extension（记录，不实现）

| 扩展 | 时机 | 说明 |
| --- | --- | --- |
| Causal graph traversal | M84+ | 当 CS 数据量增大时，通过 Adapter 的 `get_for_path()` 进行后端多跳因果链匹配 |
| Multi-hop causal matching | M84+ | A→B 有 CS，B→C 有 CS → 推断 A→C 的因果链 |
| Hash index for frontend matching | M84+ | CS 数量 >100 时，前端改为 Map<`${cause_id}:${effect_id}`, CS> 索引 |

---

## 5. Fallback 行为

| 场景 | 行为 |
| --- | --- |
| `causal_statements` 为空（无 Adapter） | `GuideStep.causal` = undefined；reason 保持模板文本 |
| `causal_statements` 存在但 edge 无匹配 CS | 同上——`cs.cause_id === edge.from && cs.effect_id === edge.to` 找不到匹配 |
| API 未返回 `causal_statements` 字段 | 向后兼容——`causalStatements ?? []` 默认为空数组 |

**Explorer 行为保持不变**：无 CS 时，体验与 Phase 1 之前完全一致。

---

## 6. Implementation Constraints

| # | 约束 | 来源 |
| --- | --- | --- |
| IC-1 | 不新增 CausalStatement 字段 | Schema Freeze |
| IC-2 | 不新增 API | P1.5 已提供 |
| IC-3 | 不调用 AI/LLM | C-6 |
| IC-4 | 不修改 Graph Core | C-3 |
| IC-5 | 不生成 fallback 文本 | C-8 |
| IC-6 | CausalStatementCard 不修改 | Phase 1 组件 |
| IC-7 | 匹配策略为直接 GID 匹配 | MVP scope |
| IC-8 | 0 个新依赖 | 保持纯前端 |

---

> 审查模式：只读
> 审查对象：Phase 2 Design Review + Implementation Plan
> 日期：2026-08-05
> 结论：**GATE PASS — Phase 2 可进入 Implementation**
