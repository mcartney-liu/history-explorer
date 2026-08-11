# M82 Phase 2 Implementation Plan

> **阶段**：M82 Phase 2 Implementation Planning
> **模式**：只读分析（不实现）
> **日期**：2026-08-05
> **状态**：Implementation Plan — Ready for PO Review

---

## 任务总览

| # | 任务 | 目标 | 依赖 |
| --- | --- | --- | --- |
| P2.1 | GuideStep 数据结构增强 | `GuideStep` 增加 `causal` 字段 | 无 |
| P2.2 | getNextSteps 集成 CausalStatement | `getNextSteps` 接受 CS 数据，匹配 edge 与 CS | P2.1 |
| P2.3 | GuidePanel 叙事理由渲染 | `guide-next-reason` 优先展示 CS.mechanism | P2.2 |
| P2.4 | RelationshipChain 嵌入 CausalStatementCard | `journey-arrow` 下方条件渲染 CausalStatementCard | P2.1 |
| P2.5 | ExplorationPackagePage 数据传递 | 从 API response 提取 causal_statements → GuidePanel + RelationshipChain | P2.3, P2.4 |
| P2.6 | 单元测试 + Explorer 验证 | CS reason vs template fallback + CausalStatementCard 嵌入 | P2.5 |

---

## P2.1 — GuideStep 数据结构增强

| 项 | 内容 |
| --- | --- |
| **目标** | `GuideStep` 增加 `causal?: CausalStatementData` 字段 |
| **输入** | `explorationGuide.ts` — `GuideStep` interface |
| **输出** | `GuideStep` 含可选 `causal` 字段；`getNextSteps` 签名增加 `causalStatements?: CausalStatementData[]` |
| **测试策略** | 类型检查：有 CS 时 `step.causal` 不为空；无 CS 时 `step.causal` 为 undefined |
| **依赖** | 无 |

---

## P2.2 — getNextSteps 集成 CausalStatement

| 项 | 内容 |
| --- | --- |
| **目标** | `getNextSteps` 接受 `causalStatements` 参数，为每个 `edge` 查找匹配的 CS |
| **输入** | `getNextSteps(pkg, visited, locale, causalStatements?)` |
| **输出** | 每个 `GuideStep` 的 `causal` 字段填充（有匹配 CS 时）或保持 undefined（无匹配时） |
| **匹配逻辑** | `cs.cause_id === edge.from && cs.effect_id === edge.to` |
| **测试策略** | 有 CS 的 edge → `step.causal` 不为空且 mechanism 为中文；无 CS 的 edge → `step.causal` 为 undefined；`step.reason` 保持模板 fallback |
| **依赖** | P2.1 |

---

## P2.3 — GuidePanel 叙事理由渲染

| 项 | 内容 |
| --- | --- |
| **目标** | `guide-next-reason` 优先展示 `step.causal?.mechanism`；有 CS 时在 reason 下方渲染 CausalStatementCard |
| **输入** | `GuidePanel.tsx` — `guide-next-reason` 渲染行（L81） |
| **输出** | reason 文本从模板 → CS.mechanism（有 CS 时）；CS 存在时渲染 CausalStatementCard |
| **测试策略** | 有 CS 时 reason 包含因果叙事文本（非模板）；无 CS 时 reason 保持模板 fallback；CS 存在时 CausalStatementCard 渲染；CS 不存在时 CausalStatementCard 不渲染 |
| **依赖** | P2.2 |

---

## P2.4 — RelationshipChain 嵌入 CausalStatementCard

| 项 | 内容 |
| --- | --- |
| **目标** | `journey-arrow` 下方条件渲染 CausalStatementCard |
| **输入** | `RelationshipChain.tsx` — `journey-arrow` 渲染块（L76-80）；新增 prop `causalStatements?: CausalStatementData[]` |
| **输出** | 每条 edge 有匹配 CS 时，在 arrow 下方渲染 CausalStatementCard |
| **测试策略** | 有 CS 的 edge → CausalStatementCard 渲染；无 CS 的 edge → 不渲染；CausalStatementCard 展示 mechanism/consequence/confidence |
| **依赖** | P2.1 |

---

## P2.5 — ExplorationPackagePage 数据传递

| 项 | 内容 |
| --- | --- |
| **目标** | 从 API response 提取 `causal_statements` → 传递给 GuidePanel 和 RelationshipChain |
| **输入** | `ExplorationPackagePage.tsx` — API 调用后 `causal_statements` 的传递 |
| **输出** | GuidePanel 和 RelationshipChain 接收到 `causalStatements` prop |
| **测试策略** | 集成测试：GuidePanel 渲染 CS reason；RelationshipChain 嵌入 CausalStatementCard |
| **依赖** | P2.3, P2.4 |

---

## P2.6 — 单元测试 + Explorer 验证

| 项 | 内容 |
| --- | --- |
| **目标** | 覆盖 CS reason vs template fallback + CausalStatementCard 嵌入 + Explorer 理解度验证 |
| **测试策略** | |
| | **单元测试**：`getNextSteps` 返回的 step 有/无 `causal` 字段；GuidePanel 渲染 CS reason 和 CausalStatementCard；RelationshipChain 嵌入 CausalStatementCard |
| | **Explorer 验证**：≥3/4 Explorer 能说出 "为什么系统推荐我看这个"（基于 CS mechanism，非猜测） |
| **依赖** | P2.5 |

---

## 依赖链

```
P2.1 (GuideStep 数据结构)
  ├── P2.2 (getNextSteps 集成) → P2.3 (GuidePanel 渲染)
  └── P2.4 (RelationshipChain 嵌入)
                                  └── P2.5 (Page 数据传递)
                                        └── P2.6 (测试 + 验证)
```

---

## Phase 2 Gate Checklist

| # | 条件 | 判定方式 |
| --- | --- | --- |
| G1 | Guide reason 从模板升级为 CS.mechanism（有 CS 时） | 单元测试 |
| G2 | Guide reason 保持模板 fallback（无 CS 时） | 单元测试 |
| G3 | RelationshipChain 嵌入 CausalStatementCard（有 CS 时） | 单元测试 |
| G4 | CausalStatementCard 不渲染（无 CS 时） | 单元测试 |
| G5 | Schema 7 字段未新增 | freeze-check |
| G6 | Explorer 验证：≥3/4 能复述 CS 因果 | Explorer Validation |

---

> 审查模式：只读
> 日期：2026-08-05
> 状态：**Implementation Plan Ready — 6 tasks, 6 Gate conditions**
