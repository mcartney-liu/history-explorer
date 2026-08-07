# M82 Phase 3 Architecture Review

> **阶段**：M82 Phase 3 Architecture Review
> **模式**：只读分析
> **日期**：2026-08-05
> **结论**：**PHASE 3 READY — LayerBadge 方案**

---

## 1. Current State — Data Source Mapping

### 数据源 → 信息类型映射

| 数据源 | 内容 | 信息类型 | 当前 UI 标识 | 问题 |
| --- | --- | --- | --- | --- |
| **Entity** | 人物/事件/文明/制度等 | **Fact** | 无标识 | — |
| **Relationship** | 18 种关系类型 | **Fact** | 关系标签 | — |
| **CausalStatement** | mechanism/consequence/confidence | **Semantic** | confidence 标签（Phase 1） | ✅ 已有区分，但仅限 CausalStatementCard 内部 |
| **Evidence Claim** | 证据文本 + source 引用 | **Evidence** | 无标识（仅 SourceChain 中展示） | 与 CausalStatement 的关联不可见 |
| **Guide reason** | 推荐理由 | **Narrative** | 无标识 | 模板 reason vs CS reason 无区分 |
| **Signal / 评分 / 推荐** | 系统推断的关联权重 | **Inference** | 无标识 | ❌ Explorer 无法区分 Fact 和 Inference |

### 当前差距

```
Entity/Relationship    → 无标识 → Explorer 看不出"这是事实"
CausalStatement        → 有 confidence 标签 → 但仅限 CS 内部
Signal/推荐/评分       → 无标识 → Explorer 误读为"后台代码"（E5）
Guide reason           → 无标识 → Explorer 看不出是模板还是因果叙事
Evidence               → 无标识 → Explorer 不知道哪条信息有证据支撑
```

**M81a Evidence**：
- E5："participated in 这是个参数…用户不应该像看到后台代码一样"（Signal 被误读）
- E5："不知道它什么原因做了关联…不是那么信任"（信任缺失的根因）

---

## 2. User Problem

### Explorer 当前无法回答

1. **"这条信息是事实还是系统推断？"** — Signal/评分/推荐与 Entity/Relationship 使用相同视觉语言
2. **"这个因果解释有证据吗？"** — CausalStatement 与 Evidence 的关联不可见
3. **"推荐理由是基于什么？"** — Guide reason 不区分模板文本和因果叙事

### 目标状态

```
Entity "唐朝"                           → 无标识（默认可信 = Fact）
Relationship "唐朝→宋朝 (before)"        → 无标识（默认可信 = Fact）
CausalStatement "科举→文官"              → [基于证据] 绿色标签
Signal "关联度 0.83"                     → [系统推断] 蓝色标签
Guide reason "科举通过考试选拔文官..."    → [因果叙事] 绿色标签
Evidence "ec-cn-001"                     → [证据来源] 灰色标签
```

---

## 3. Design Alternatives

### 方案 A：LayerBadge（推荐）

在现有 UI 上增加**轻量视觉标签**，不引入新数据层。

```
[基于证据] CausalStatement 内容
[系统推断] Signal / 推荐 / 评分
[证据来源] Evidence Claim 引用
```

| 维度 | 评价 |
| --- | --- |
| **用户理解成本** | ✅ 低 — 三个标签覆盖全部场景，颜色+文字双重区分 |
| **数据侵入程度** | ✅ 零 — 不修改任何 Schema，纯 UI 层 |
| **Schema 影响** | ✅ 无 — 不新增字段 |
| **Future AI compatibility** | ✅ 兼容 — M83.5 AI 推导内容进入 [系统推断] 标签 |
| **实现复杂度** | ✅ 低 — 一个 `LayerBadge` 组件 + 在各展示点嵌入 |

### 方案 B：Annotation Layer

在四层架构之上新增第五层，统一管理所有信息类型标注。

| 维度 | 评价 |
| --- | --- |
| **用户理解成本** | ❌ 中 — 增加一层抽象概念 |
| **数据侵入程度** | ❌ 高 — 需要新的 Annotation 数据模型和存储 |
| **Schema 影响** | ❌ 高 — 可能需要新字段标记每条信息 |
| **Future AI compatibility** | ✅ 兼容 |
| **实现复杂度** | ❌ 高 — 新层 + 新模型 + 新存储 + 新渲染 |

**Reject reason**：过度设计。四层架构（Fact/Semantic/Inference/Exploration）已足够。Annotation 层是对同一信息的不同视角——但 Perspective 不应该成为一个独立的架构层。

### 方案 C：Confidence-only Indicator

只增强 CausalStatementCard 的 confidence 展示，不给其他信息类型加标签。

| 维度 | 评价 |
| --- | --- |
| **用户理解成本** | ✅ 低 |
| **数据侵入程度** | ✅ 零 |
| **Schema 影响** | ✅ 无 |
| **Future AI compatibility** | ⚠️ 部分 — AI 推导内容没有归属标签 |

**Reject reason**：不满足 P07 的核心需求。Confidence 只区分了 CausalStatement 内部的置信度（high/medium/low），但没有区分 "Fact（Entity/Relationship）" 和 "Inference（Signal/推荐）"。Explorer 仍然无法回答 "这条信息是事实还是系统推断"。

### 方案比较矩阵

| 维度 | A: LayerBadge | B: Annotation Layer | C: Confidence-only |
| --- | --- | --- | --- |
| 用户理解成本 | ✅ 低 | ❌ 中 | ✅ 低 |
| 数据侵入 | ✅ 零 | ❌ 高 | ✅ 零 |
| Schema 影响 | ✅ 无 | ❌ 高 | ✅ 无 |
| 满足 P07 | ✅ 是 | ✅ 是 | ❌ 否 |
| 实现复杂度 | ✅ 低 | ❌ 高 | ✅ 低 |
| AI 兼容 | ✅ 是 | ✅ 是 | ⚠️ 部分 |
| **推荐** | ✅ | ❌ | ❌ |

---

## 4. Recommended Design — LayerBadge

### 组件设计

```tsx
<LayerBadge layer="fact" />      → 无渲染（Fact 默认可信）
<LayerBadge layer="semantic" />  → 绿色 "基于证据"
<LayerBadge layer="inference" /> → 蓝色 "系统推断"
<LayerBadge layer="evidence" />  → 灰色 "证据来源"
```

### 挂载位置

| 位置 | LayerBadge | 说明 |
| --- | --- | --- |
| `CausalStatementCard` 头部 | `semantic` — 绿色 "基于证据" | 区分 CausalStatement 与纯 Fact（Entity/Relationship） |
| `CausalStatementCard` 内部 confidence | 保持现有 confidence 标签 | Phase 1 已实现——不重复 |
| `Signal` 区域（评分/权重/推荐） | `inference` — 蓝色 "系统推断" | P05 的具体实现 |
| `SourceChain` 或 Evidence 引用旁 | `evidence` — 灰色 "证据来源" | 可选——Phase 3 核心是 Fact/Inference 区分 |

### 不修改的组件

| 组件 | 原因 |
| --- | --- |
| `RelationshipChain` | Entity/Relationship 是 Fact，默认可信——不需要标签 |
| `EntityPage` | 同上 |
| `GuidePanel` | Guide reason 已有 CausalStatementCard（含 confidence 标签）——不重复 |

---

## 5. Schema Impact

**零。** LayerBadge 是纯 UI 组件——不修改 CausalStatement 7 字段、不修改 Evidence Layer、不修改 Graph Core。

| 检查项 | 状态 |
| --- | --- |
| CausalStatement Schema 不变 | ✅ |
| 不新增 AI-generated 字段 | ✅ |
| 不把 inference 塞入 Entity | ✅ |
| 不扩展 Evidence Model | ✅ |
| 不引入新的 Knowledge Layer | ✅ |

---

## 6. Implementation Scope

### Phase 3 任务

| # | 任务 | 文件 | 说明 |
| --- | --- | --- | --- |
| P3.1 | LayerBadge 组件 | `frontend/src/components/causal/LayerBadge.tsx`（新增） | 接受 `layer: 'semantic' \| 'inference' \| 'evidence'`，渲染对应标签 |
| P3.2 | CausalStatementCard 增加 LayerBadge | `CausalStatementCard.tsx`（修改） | 卡片头部增加绿色 "基于证据" 标识 |
| P3.3 | Signal 区域增加 "系统推断" 标识 | Signal/推荐/评分展示组件（修改） | P05 的具体实现 |
| P3.4 | i18n 补充 | `locales/zh|en|ja/common.ts`（修改） | `layer.semantic` / `layer.inference` / `layer.evidence` |
| P3.5 | 测试 | 3 个测试文件（新增/修改） | LayerBadge 单元测试 + CausalStatementCard 集成 + Signal 集成 |
| P3.6 | Phase 3 Validation Report | 报告 | 同 Phase 2 模式 |

### 不进入 Phase 3

| 项 | 原因 |
| --- | --- |
| RelationshipChain LayerBadge | Entity/Relationship 默认可信 |
| EntityPage LayerBadge | 同上 |
| Evidence Model 扩展 | Source 层扩展属于 M84 |

---

## 7. Gate Verdict

### PHASE 3 READY

| 检查项 | 结果 |
| --- | --- |
| 方案已选定 | ✅ LayerBadge（方案 A） |
| Rejected 方案有理由 | ✅ B（过度设计）、C（不满足 P07） |
| Schema 影响为零 | ✅ |
| 实现范围明确 | ✅ 6 tasks（P3.1-P3.6） |
| 不违反任何 Phase 1 Freeze | ✅ |
| 不违反 8 条 IC | ✅ |

---

> 审查模式：只读
> 审查对象：M82 Phase 1 + Phase 2 代码 + M80.5 P05/P07
> 日期：2026-08-05
> 结论：**PHASE 3 READY — LayerBadge 方案，0 Schema 影响**
