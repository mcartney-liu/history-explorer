# M82 Phase 3 Scope Confirmation

> **阶段**：M82 Phase 3 Implementation Scope Confirmation
> **模式**：只读审查
> **日期**：2026-08-05
> **结论**：**READY FOR IMPLEMENTATION — Scope Confirmed**

---

## Check 1 — LayerBadge Responsibility

### M82 Phase 3 表达

| LayerBadge | 语义 | 实现 |
| --- | --- | --- |
| `"因果解释"` (causal) | 策展者的因果语义解释 | ✅ CausalStatementCard 头部 |
| `"系统推断"` (inference) | 系统算法产生的关联/推荐 | ✅ Signal/推荐区域 |
| `"证据来源"` (evidence) | 底层 source 引用 | ✅ Evidence 引用旁 |

### M82 Phase 3 **不**表达

| 项 | 原因 | 归属 |
| --- | --- | --- |
| confidence (high/medium/low) | 已有独立标签（Phase 1 CausalStatementCard） | CausalStatementCard 内部 |
| provenance (source/book/author) | Source Infrastructure 层 | M84 |
| source metadata | 同上 | M84 |
| version (replaces/replaced_by) | Future Extension 字段 | M84 |
| author (策展者) | Curation Pipeline 元数据 | M84 |
| AI/human attribution (proposed_by) | Future Extension 字段 | M85 |

**判定**：✅ LayerBadge 职责范围清晰——3 种信息类型，不越界。

---

## Check 2 — Data Ownership

### LayerBadge 接口

```tsx
interface LayerBadgeProps {
  layer: 'causal' | 'inference' | 'evidence'
}
```

### 禁止直接读取

| 数据源 | LayerBadge 是否读取？ | 谁负责提供？ |
| --- | --- | --- |
| `causal_statements.json` | ❌ 不读取 | 父组件（CausalStatementCard）判断后传入 `layer="causal"` |
| `evidence_claims.json` | ❌ 不读取 | 父组件（Evidence 展示组件）判断后传入 `layer="evidence"` |
| Graph data | ❌ 不读取 | 不涉及——Entity/Relationship 无 LayerBadge |
| Backend API | ❌ 不读取 | 不涉及 |

### 数据流

```
父组件（拥有数据上下文）
  │
  ├── CausalStatementCard: <LayerBadge layer="causal" />
  ├── Signal/推荐组件:    <LayerBadge layer="inference" />
  └── Evidence 组件:      <LayerBadge layer="evidence" />
```

**判定**：✅ LayerBadge 是纯展示组件——不读取任何数据源。数据由父组件提供。

---

## Check 3 — Component Boundary

### 允许的调用链

```
CausalStatementCard ──→ LayerBadge(layer="causal")
EvidenceCard         ──→ LayerBadge(layer="evidence")
SignalCard            ──→ LayerBadge(layer="inference")
```

### 禁止的调用链

```
LayerBadge ──→ Knowledge Layer (Entity/Relationship/Graph)
LayerBadge ──→ Backend API
LayerBadge ──→ data/*.json
```

**判定**：✅ 单向依赖——父组件 → LayerBadge。LayerBadge 不反向依赖任何层。

---

## Check 4 — Future Upgrade Boundary

### M82 Phase 3 冻结

| LayerBadge | 当前 |
| --- | --- |
| Props | `layer: 'causal' | 'inference' | 'evidence'` |
| 渲染 | 纯文本标签 + 颜色 |
| 交互 | 无（静态） |

### M85 Unified Trust Presentation Model（记录，不实现）

| 扩展 | 说明 |
| --- | --- |
| `onClick?: () => void` | 点击 LayerBadge → 展开溯源链 |
| Provenance 信息 | Source/book/author → 在 onClick 展开面板中展示 |
| Confidence 集成 | 与 confidence 标签联动（high→深绿, low→浅绿） |
| AI attribution | `proposed_by: "ai"` 时，LayerBadge 显示 "AI 辅助 · 人工审核" |

**当前不实现。** LayerBadge 的 `layer` prop 为 string——未来扩展为 union type 时只需增加枚举值，不需要重构。

---

## Check 5 — Implementation Tasks

| # | 任务 | 输入 | 输出 | 测试 |
| --- | --- | --- | --- | --- |
| P3.1 | LayerBadge 组件 | `layer` prop | 绿色/蓝色/灰色 标签 | 3 种 layer 正确渲染 |
| P3.2 | CausalStatementCard + LayerBadge | `CausalStatementCard` 组件 | 卡片头部增加 "因果解释" | CS Card 渲染 LayerBadge |
| P3.3 | Signal 区域 + "系统推断" | 评分/推荐展示组件 | Signal 旁增加 "系统推断" | Signal 区域渲染 LayerBadge |
| P3.4 | i18n | `locales/*/common.ts` | 3 keys (zh/en/ja) | 三语渲染正确 |
| P3.5 | 测试 | P3.1-P3.4 代码 | 3 测试文件 | 覆盖所有 layer 类型 + 集成 |
| P3.6 | Validation Report | P3.1-P3.5 结果 | `M82_PHASE3_VALIDATION_REPORT.md` | Phase 3 Gate 判定 |

### 依赖链

```
P3.1 (LayerBadge)
  → P3.2 (CausalStatementCard 集成)
  → P3.3 (Signal 集成)
    → P3.4 (i18n)
      → P3.5 (测试)
        → P3.6 (报告)
```

---

## Final Decision

### READY FOR IMPLEMENTATION

| 检查项 | 结果 |
| --- | --- |
| LayerBadge 职责范围 | ✅ 3 种信息类型，不越界 |
| 数据所有权 | ✅ 纯展示，不读取数据源 |
| 组件边界 | ✅ 单向依赖，不反向 |
| 未来升级边界 | ✅ M85 扩展已记录，不实现 |
| 实施任务 | ✅ 6 tasks，依赖链清晰 |

---

> 审查模式：只读
> 日期：2026-08-05
> 结论：**READY FOR IMPLEMENTATION — Scope Confirmed**
