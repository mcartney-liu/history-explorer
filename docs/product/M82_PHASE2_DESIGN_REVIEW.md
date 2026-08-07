# M82 Phase 2 Design Review

> **阶段**：M82 Phase 2 Implementation Planning
> **模式**：只读分析
> **日期**：2026-08-05
> **状态**：Design Review — Ready for Implementation Plan

---

## A. Current State

### A.1 Guide 当前 "为什么推荐" 的信息来源

```
getNextSteps(pkg, visited, locale)                         [explorationGuide.ts:101]
  ├── 遍历 pkg.relationship_paths (Package 的策展边列表)
  ├── getRelationshipTemplate(edge.type, locale)            [understandingRules.ts]
  │     └── 返回模板文本（如 "A 在时间上先于 B"、"A 继承了 B"）
  └── 输出 GuideStep { edge, fromName, toName, reason, perspective }
```

**当前 reason 的内容**：`explained.meaning` — 来自 `RELATIONSHIP_TEMPLATES` 的模板化文本。

**示例**（GuidePanel L81 渲染）：
```
科举制度 继承为 文官体系  |  查看 文官体系 →
科举制度在时间上先于文官体系，并且在其政治发展脉络中起到了前置阶段的作用。
```

**问题**：reason 是关系类型的模板化解释，不是因果叙事。Explorer 知道 "A 和 B 有关联"，但不知道 "为什么 A 导致了 B"。

### A.2 RelationshipChain 当前展示路径关系

```
RelationshipChain.tsx
  ├── journey-node: Entity name (button)
  └── journey-arrow: 关系类型标签 + "→"
```

**当前不展示 CausalStatement**。Phase 1 的 CausalStatementCard 已实现但未嵌入。

### A.3 CausalStatement 数据流（Backend → Frontend）

```
Backend:
  ExplorationEngine.find_connections(src, tgt)
    └── _explain_path(steps) → (explanation, causal_statements[])
        └── PathCandidate { ..., causal_statements: list[dict] }
            └── to_dict() → API Response

Frontend:
  API Response.paths[i].causal_statements: CausalStatementData[]
    └── 当前：未消费（仅存在于 API 响应中）
    └── Phase 2 目标：在 GuidePanel + RelationshipChain 中消费
```

**关键发现**：`causal_statements` 数据**已经在 API 响应中**——随 `PathCandidate` 一起返回。Phase 2 不需要新增 API，只需要在前端消费已有数据。

---

## B. User Problem

### Explorer 当前缺少什么理解层

| 当前体验 | 缺失 | 期望 |
| --- | --- | --- |
| Guide 说 "科举制度在时间上先于文官体系" | 知道有先后关系，但不知道为什么 | 知道 "科举通过考试选拔取代了门阀世袭，使得儒学士人进入权力核心，形成了文官体系" |
| RelationshipChain 展示 "科举→(继承为)→文官" | 看到结构关系，看不到因果故事 | 在关系链上看到 "为什么继承、继承产生了什么影响" |
| 推荐下一步是 "宋代理学" | 不知道系统和宋代理学有什么因果关联 | 看到 "宋朝重文抑武 + 儒学复兴 → 理学成为官学" |

**M81a Evidence**：
- E3："东西有，但是每一步到下一步的，让我不是很明白"（S004 §A 08:20）
- E5："点进去看到的是古印度介绍，不是关系阐述"（S002 §A 26:38）

---

## C. Proposed Solution

### Guide Narrative Enhancement

**核心思路**：不改变 `getNextSteps` 的推荐逻辑（仍然是遍历 `relationship_paths` 的确定性输出），但增强 `GuideStep.reason` 的内容——从模板化关系解释升级为基于 CausalStatement 的叙事理由。

### 设计

#### 1. 路径推荐理由增强

**当前**：
```
GuideStep.reason = RELATIONSHIP_TEMPLATES[edge.type].meaning
```

**Phase 2 增强**：
```
如果 edge 有匹配的 CausalStatement:
  GuideStep.reason = CausalStatement.mechanism（因果叙事）
  GuideStep.causal = CausalStatement（完整 CS 对象）
否则:
  GuideStep.reason = RELATIONSHIP_TEMPLATES[edge.type].meaning（模板 fallback）
```

#### 2. 因果解释展示

| 展示位置 | 展示内容 | 展示时机 |
| --- | --- | --- |
| GuidePanel `.guide-next-reason` | CausalStatement.mechanism（因果叙事） | 有 CS 时替代模板 reason |
| RelationshipChain `journey-arrow` 下方 | CausalStatementCard（完整 CS） | 有 CS 时条件渲染 |

#### 3. 何时展示 mechanism

**始终展示**（当 CS 存在时）。mechanism 回答 "为什么 cause 导致了 effect"——这是 Guide 推荐理由的核心。

#### 4. 何时展示 consequence

**有条件展示**——在 CausalStatementCard 中展示，但不在 Guide reason 中展示（Guide reason 应简洁——一段 mechanism 即可）。Explorer 想深入了解时，展开 CausalStatementCard 查看完整 mechanism + consequence + evidence。

---

## D. Component Impact

| 组件 | 操作 | 说明 |
| --- | --- | --- |
| `explorationGuide.ts` | **修改** | `GuideStep` 增加可选 `causal?: CausalStatementData`；`getNextSteps` 接受可选 `causalIndex?: Map<string, CausalStatementData[]>` |
| `GuidePanel.tsx` | **修改** | `guide-next-reason` 渲染时优先使用 `step.causal?.mechanism`；有 CS 时在 reason 下方渲染 CausalStatementCard |
| `RelationshipChain.tsx` | **修改** | `journey-arrow` 下方条件渲染 CausalStatementCard |
| `ExplorationPackagePage.tsx` | **修改** | 传递 `causal_statements` 到 GuidePanel 和 RelationshipChain |
| `CausalStatementCard.tsx` | **不修改** | 已实现——Phase 2 只增加挂载点 |
| `GuidePanel.test.tsx` | **修改** | 测试 CS reason vs template fallback |
| `RelationshipChain` 相关测试 | **新增** | 测试 CausalStatementCard 嵌入 |

---

## E. API Impact

### 不需要新增 API

`causal_statements` 数据**已经在** `PathCandidate.to_dict()` 中返回（Phase 1 P1.5）。Phase 2 仅需在前端消费已有字段。

### 数据匹配方式

`PathCandidate.causal_statements[]` 中的每条 CS 有 `cause_id` 和 `effect_id`。在 `getNextSteps` 中，每个 `edge` 有 `edge.from`（cause GID）和 `edge.to`（effect GID）。匹配方式：

```typescript
const cs = causalStatements.find(
  cs => cs.cause_id === edge.from && cs.effect_id === edge.to
)
```

**不需要后端修改**。

---

## F. Risk Review

| 风险 | 严重度 | 缓解 |
| --- | --- | --- |
| **Backward compatibility** | 🟢 Low | `GuideStep.causal` 为可选字段——无 CS 时 fallback 到模板 reason，与当前行为完全一致 |
| **i18n** | 🟢 Low | CausalStatement.mechanism 当前为中文（5 条 CS 全中文）。未来多语言 CS 时需处理，但当前不构成问题 |
| **Performance** | 🟢 Low | `getNextSteps` 的 CS 查找是 O(n×m)（n=steps, m=CS count）。当前 n<10, m=5——无性能问题。百万级时需要哈希索引，但不属于 Phase 2 范围 |
| **Future large dataset** | 🟢 Low | 同 Performance——Phase 2 的匹配逻辑在 Phase 1 已有 Adapter 的 O(1) 哈希索引后端支持。前端匹配可以后续改为 Map 索引 |

---

> 审查模式：只读
> 审查对象：`explorationGuide.ts` + `GuidePanel.tsx` + `RelationshipChain.tsx` + `ExplorationPackagePage.tsx`
> 日期：2026-08-05
> 状态：**Design Review Complete — Ready for Implementation Plan**
