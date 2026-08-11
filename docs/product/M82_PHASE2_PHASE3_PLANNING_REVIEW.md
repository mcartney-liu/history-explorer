# M82 Phase 2 & Phase 3 Planning Review

> **阶段**：M82 Phase 2/3 Planning Review
> **模式**：只读审查
> **日期**：2026-08-05
> **结论**：**M82 PHASE 2 CAN START — Phase 1 Boundary Confirmed**

---

## A. Phase 1 遗留边界确认

### A.1 Schema 冻结状态

| 项 | 状态 |
| --- | --- |
| CausalStatement 7 字段 | 🔒 FROZEN（Final Gate §C.1） |
| confidence enum（high/medium/low/null） | 🔒 FROZEN（Final Gate §C.2） |
| evidence_refs 类型（string[]） | 🔒 FROZEN |
| 未来字段（status/replaces/replaced_by/proposed_by） | 🔒 DEFERRED（Final Gate §D） |

**Phase 2/3 期间不得新增任何 CausalStatement 字段。**

### A.2 四层职责确认

| 层 | 模块 | Phase 2/3 是否可以修改？ |
| --- | --- | --- |
| Semantic Layer | Loader / Adapter / CausalStatement Schema | ❌ 不可以——Phase 1 已冻结 |
| Fact Layer | Graph Core / Edge / Entity | ❌ 不可以——C-3 约束 |
| Inference Layer | Signal / 推荐评分 / 关联权重 | ✅ Phase 3 将增加 "系统推断" 视觉标识（P05）——不修改 Inference Layer 数据，仅增加 UI 层标识 |
| Exploration Layer | Frontend / GuidePanel / RelationshipChain | ✅ Phase 2 将在此层集成 CausalStatementCard |

### A.3 Phase 2/3 的禁止边界

| 禁止项 | 原因 |
| --- | --- |
| Phase 2 修改 Semantic Layer | Schema 冻结——CausalStatement 数据不变，仅改变呈现方式 |
| Phase 3 污染 Evidence Layer | P07 的 "区分事实与推断" 是 UI 呈现层规则——不改 Evidence Claim 结构，不改 Source 结构 |
| Phase 2/3 修改 Graph Core | C-3 约束——Edge 始终三字段 |

**判定**：Phase 1 边界清晰，Phase 2/3 不越界。✅

---

## B. M82 Phase 2 目标定义

### B.1 目标

**让 Explorer 在探索路径上看到 "为什么 A 和 B 有关联"。**

当前状态：RelationshipChain 展示 `Entity → [关系类型] → Entity`（如 "科举制度 →(继承为)→ 文官体系"）。Explorer 知道 "有继承关系"，但不知道 "为什么继承、继承产生了什么影响"。

目标状态：RelationshipChain 的每条边下方，展示该边的 CausalStatement 卡片——mechanism（"科举如何导致文官体系建立"）和 consequence（"文官体系产生了什么影响"）。

### B.2 挂载点分析

**RelationshipChain 的挂载点**：

```
journey-step (L66)
  ├── journey-node (button: Entity name)
  └── journey-arrow (L76-80, only when not last)
        ├── journey-arrow-label ("继承为")
        └── journey-arrow-glyph ("→")
        ↓
        【插入点】← CausalStatementCard 放在这里
```

当前每条 edge 在 `journey-arrow` 后没有额外内容。CausalStatementCard 可以插入在 `journey-arrow` 和下一个 `journey-node` 之间。

**GuidePanel 的挂载点**：

```
guide-next-item (L66)
  ├── Button: "科举制度 继承为 文官体系 | 查看 文官体系 →"
  └── guide-next-reason (L81): step.reason（当前为模板文本）
        ↓
        【插入点】← 叙事理由替代模板文本
```

### B.3 是否需要新 UI Container？

**不需要。** RelationshipChain 和 GuidePanel 已提供自然挂载点。CausalStatementCard 是自包含卡片，只需条件渲染。

### B.4 是否需要新 API？

**不需要。** Phase 1 的 `PathCandidate.causal_statements` 已返回结构化 CS 数据。前端只需从 API 响应中提取 `causal_statements`，按 `(cause_id, effect_id)` 匹配到对应的 edge。

### B.5 是否需要新状态管理？

**不需要。** CausalStatement 数据随 `PathCandidate` 一起返回——它已经在 API 响应中，不需要额外的 fetch/缓存/状态。

### B.6 是否影响现有 Explorer Flow？

**不影响。** 当前 Explorer 路径不变：Entity → RelationshipChain → 推荐下一步。CausalStatementCard 是路径上的**信息密度增强**——Explorer 仍然看到同样的 Entity 和 Relationship，但多了 "为什么" 的解释。

---

## C. M82 Phase 3 Fact / Inference 展示体系

### C.1 当前状态

当前平台**没有** Fact / Inference 视觉区分。Explorer 看到的 Entity、Relationship、评分、推荐——全部使用相同的视觉语言。这是 M81a 验证中 E5 "像看到后台代码" 和 E3 "关联度 20%" 的根因。

### C.2 方案评估

#### 方案 A：继续使用 Evidence + confidence

**做法**：在现有 UI 上增加 confidence 标签 + evidence 引用，不新增 Layer 概念。

| 评价 | 说明 |
| --- | --- |
| ✅ 优点 | 最小改动，CausalStatementCard 已实现 confidence + evidence |
| ❌ 缺点 | 只区分了 CausalStatement 内部的置信度，没有区分 "Fact（Entity/Relationship）" 和 "Inference（Signal/推荐）"——P07 的核心需求未满足 |

#### 方案 B：新增 Semantic Annotation Layer

**做法**：在 Fact / Semantic / Inference 三层之上，再增加一层 Annotation 来标注每条信息的归属。

| 评价 | 说明 |
| --- | --- |
| ❌ 缺点 | 过度设计——四层架构已足够。Annotation 层会增加维护负担（每条信息都需要额外标注），且与现有的 LayerBadge 组件功能重叠 |

#### 方案 C：扩展 CausalStatement

**做法**：在 CausalStatement 上增加 `layer: "fact" | "semantic" | "inference"` 字段。

| 评价 | 说明 |
| --- | --- |
| ❌ 缺点 | 违反 Schema Freeze——Phase 1 已冻结 7 字段。且 "layer" 是 UI 呈现概念，不应进入数据模型 |

### C.3 推荐方案：LayerBadge 组件（方案 A 增强版）

**做法**：不修改任何数据模型。创建 `LayerBadge` 组件，在 UI 渲染时为不同类型的信息附加视觉标识。

| 信息类型 | LayerBadge | 颜色 | 来源 |
| --- | --- | --- | --- |
| Entity / Relationship | （无标识——默认可信） | — | Fact Layer |
| CausalStatement | "基于证据" | 绿色 | Semantic Layer |
| Signal / 推荐 / 评分 | "系统推断" | 蓝色 | Inference Layer |

**LayerBadge 的挂载位置**：
- CausalStatementCard 内：已通过 confidence 标签部分覆盖——Phase 3 增加 "基于证据" 绿色标识（CausalStatement 整体标识，不同于 confidence 的每条标识）
- Signal 区域：在评分/权重/推荐列表旁增加 "系统推断" 蓝色标识
- RelationshipChain：无额外标识（Entity/Relationship 默认可信）

### C.4 Rejected 方案

| 方案 | Reject 原因 |
| --- | --- |
| 方案 A（纯 confidence） | 不满足 P07——只区分了 CS 内部的置信度，不区分 Fact/Inference |
| 方案 B（Annotation Layer） | 过度设计——四层架构已足够 |
| 方案 C（扩展 CausalStatement） | 违反 Schema Freeze |

---

## D. M82 Phase 2 Gate Conditions

Phase 2 可以启动，条件如下：

| # | 条件 | 状态 |
| --- | --- | --- |
| G1 | Phase 1 Schema 冻结不松动 | ✅ 已确认 |
| G2 | Phase 1 8 条 Constraint 不松动 | ✅ 已确认 |
| G3 | 挂载点已确认（RelationshipChain + GuidePanel） | ✅ 已确认 |
| G4 | 不需要新 API / 新状态管理 / 新 UI Container | ✅ 已确认 |
| G5 | 不影响现有 Explorer Flow | ✅ 已确认 |

### 最终判定：YES — M82 PHASE 2 CAN START

---

> 审查模式：只读
> 审查对象：M82 Final Gate + ADR + Closure Review + RelationshipChain + GuidePanel
> 日期：2026-08-05
> 结论：**M82 PHASE 2 CAN START — Phase 3 推荐 LayerBadge 方案**
