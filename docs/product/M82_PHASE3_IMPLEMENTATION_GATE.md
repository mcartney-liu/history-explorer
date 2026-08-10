# M82 Phase 3 Implementation Gate

> **阶段**：M82 Phase 3 Implementation Gate Review
> **模式**：只读审查
> **日期**：2026-08-05
> **结论**：**GATE PASS — LayerBadge 命名已修正，可进入 Implementation**

---

## Check 1 — Fact Layer Definition

### 重新评估：Entity/Relationship 是否应该等同 "Fact"？

**不应该。**

| 理解 | 问题 |
| --- | --- |
| "Entity/Relationship = Absolute Fact" | ❌ 暗示 KG 数据是绝对真理。但历史数据有不确定性——Entity 的年份可能不精确，Relationship 可能是学术共识而非客观事实 |
| "Entity/Relationship = Structured Historical Data" | ✅ 更准确——这些是经过策展的结构化历史信息，置信度高于 CausalStatement（解释），但不等于绝对事实 |

### 影响

**Entity/Relationship 不应显示任何 LayerBadge。** 不是因为它们是 "Fact"，而是因为它们是默认信息层——Explorer 不需要额外的标签来理解 "唐朝建立于 618 年" 这条信息的性质。LayerBadge 的价值在于区分**非默认**信息类型。

### 结论

| 信息类型 | LayerBadge | 原因 |
| --- | --- | --- |
| Entity/Relationship | **无** | 默认信息层——Explorer 默认可信。不需要标签 |
| CausalStatement | 绿色 | 语义解释层——不是默认信息，需要标注 |
| Signal/推荐/评分 | 蓝色 | 系统推断层——最需要标注（M81a 核心痛点） |
| Evidence | 灰色 | 证据引用——辅助信息 |

---

## Check 2 — LayerBadge Naming Review

### 评估：CausalStatement 应该用哪个标签？

| 选项 | 含义 | 适用性 |
| --- | --- | --- |
| **A: "基于证据"** | 暗示 CausalStatement 的内容有 Evidence 支撑 | ⚠️ 部分准确——CausalStatement 确实有 `evidence_refs`，但其 mechanism/consequence 是策展者的**解释**，不是证据本身 |
| **B: "因果解释"** | 明确这是 interpretation（语义解释），不是事实 | ✅ 更准确——ADR-M79 定义 CausalStatement 为 "interpretive semantic layer"。标签应反映这一本质 |

### 判断

**使用 B: "因果解释"。** 理由：

1. ADR-M79 原文：CausalStatement 是 "interpretive semantic layer"——"解释"是它的本质
2. "基于证据" 暗示 CausalStatement 的内容等同于 Evidence——但 mechanism/consequence 是策展者写的因果叙事，不是证据原文
3. M81a E5 的痛点：Explorer 将 Signal 误读为 "后台代码"——因为 Signal 被呈现得像事实一样确定。如果 CausalStatement 也被标为 "基于证据"，可能引发类似的误解（"既然是证据，为什么是人在解释？"）
4. **"因果解释" 区分了 CausalStatement 和 Evidence Claim**——前者是策展者的解释，后者是证据本身。两者都需要标注，但标注内容不同

### 最终 LayerBadge 命名

| 信息类型 | LayerBadge 文本 | 颜色 | 语义 |
| --- | --- | --- | --- |
| Entity/Relationship | **（无标签）** | — | 结构化历史数据，默认可信 |
| CausalStatement | **"因果解释"** | 绿色 | 策展者的因果语义解释（有 Evidence 引用支撑） |
| Signal / 推荐 / 评分 | **"系统推断"** | 蓝色 | 系统算法产生的关联/推荐 |
| Evidence Claim | **"证据来源"** | 灰色 | 底层 source 引用 |

### i18n Keys

| Key | zh | en | ja |
| --- | --- | --- | --- |
| `layer.causal` | 因果解释 | Causal explanation | 因果解釈 |
| `layer.inference` | 系统推断 | System inference | システム推論 |
| `layer.evidence` | 证据来源 | Evidence source | 証拠ソース |

---

## Check 3 — Proposed Presentation Model

### Information Layer Model（最终版）

```
┌─────────────────────────────────────────────────────────┐
│                   UI Presentation                       │
│                                                         │
│  [无标签] Entity/Relationship                            │
│    "唐朝"、"科举制度"、"唐朝→宋朝 (before)"               │
│                                                         │
│  [因果解释 · 绿色] CausalStatement                        │
│    "科举制度通过标准化考试选拔文官，取代了门阀世袭"         │
│    └── [学术界广泛共识] confidence                        │
│    └── [ec-cn-001] evidence_refs                        │
│                                                         │
│  [系统推断 · 蓝色] Signal / 推荐 / 评分                   │
│    "关联度 0.83"、"推荐下一步：宋代理学"                   │
│                                                         │
│  [证据来源 · 灰色] Evidence Claim                         │
│    "科举制度创立于隋、定型于唐 (ec-cn-001)"               │
│    └── [src-cn-textbook] source                         │
└─────────────────────────────────────────────────────────┘
```

### 关键设计原则

| # | 原则 | 说明 |
| --- | --- | --- |
| 1 | **默认无标签** — Entity/Relationship 不需要标签 | 标签是例外，不是规则。如果每条信息都有标签，标签就失去区分意义 |
| 2 | **"因果解释" ≠ "基于证据"** | CausalStatement 是解释，不是证据——命名反映 ADR-M79 的 "interpretive semantic layer" |
| 3 | **"系统推断" 是最高价值标签** | M81a 核心痛点是 Explorer 无法区分 Fact 和 Inference——蓝色 "系统推断" 直接解决这个痛点 |
| 4 | **confidence 保持独立** | CausalStatementCard 的 confidence 标签（Phase 1）不与 LayerBadge 重复——confidence 回答 "这个解释有多可信"，LayerBadge 回答 "这是什么类型的信息" |

---

## Phase 3 Implementation Scope（最终确认）

| # | 任务 | 文件 | 说明 |
| --- | --- | --- | --- |
| P3.1 | LayerBadge 组件 | `frontend/src/components/causal/LayerBadge.tsx`（新增） | `layer: 'causal' \| 'inference' \| 'evidence'` |
| P3.2 | CausalStatementCard 增加 LayerBadge | `CausalStatementCard.tsx`（修改） | 卡片头部增加绿色 "因果解释" |
| P3.3 | Signal 区域增加 "系统推断" | 评分/推荐展示组件（修改） | P05 实现 |
| P3.4 | i18n 补充 | `locales/zh\|en\|ja/common.ts`（修改） | `layer.causal` / `layer.inference` / `layer.evidence` |
| P3.5 | 测试 | 测试文件 | LayerBadge + CausalStatementCard 集成 + Signal 集成 |
| P3.6 | Phase 3 Validation Report | 报告 | — |

---

## Gate Verdict

### GATE PASS — PHASE 3 CAN START IMPLEMENTATION

| 检查项 | 结果 |
| --- | --- |
| Fact Layer 定义修正 | ✅ Entity/Relationship 不显示标签 |
| LayerBadge 命名修正 | ✅ "基于证据" → "因果解释"（更准确反映 ADR-M79） |
| 最终命名确认 | ✅ 因果解释(绿) / 系统推断(蓝) / 证据来源(灰) |
| Schema 影响 | ✅ 零 |
| IC 约束 | ✅ 全部满足 |

---

> 审查模式：只读
> 审查对象：`M82_PHASE3_ARCHITECTURE_REVIEW.md`
> 日期：2026-08-05
> 结论：**GATE PASS — Phase 3 Implementation Ready**
