# M82 Phase 3 Implementation Plan

> **阶段**：M82 Phase 3 Implementation Planning
> **模式**：只读分析
> **日期**：2026-08-05
> **状态**：Implementation Plan Ready

---

## 1. LayerBadge Domain Model

### 定位：UI Component → Future Unified Trust Presentation Model

**当前（M82 Phase 3）**：LayerBadge 是纯 UI 组件——接受 `layer` prop，渲染对应标签。

**未来（M85+）**：LayerBadge 是 **Information Trust Presentation Model** 的入口。当 M85 引入完整溯源能力时，LayerBadge 不仅是标签，还附带可点击的溯源链（Fact 溯源 → KG 数据；Semantic 溯源 → Evidence Claim + Source；Inference 溯源 → 算法逻辑）。

**这个定位意味着**：
- Phase 3 的 LayerBadge 实现应该为 M85 预留扩展接口（`onClick` 回调），但不实现
- LayerBadge 的视觉语言（颜色+文字）一旦确定，应在全平台统一使用
- 未来新增信息类型（如 AI-generated explanation in M83.5）时，只需新增 `layer` 值，不需要重新设计组件

### LayerBadge Domain

```
LayerBadge
  ├── layer: 'causal' | 'inference' | 'evidence'
  ├── onClick?: () => void         // M85: traceability action
  └── size?: 'sm' | 'md'           // future: responsive sizing

Rendering:
  causal    → 绿色 "因果解释"
  inference → 蓝色 "系统推断"
  evidence  → 灰色 "证据来源"
```

---

## 2. Implementation Scope

### Tasks

| # | 任务 | 文件 | 类型 | 说明 |
| --- | --- | --- | --- | --- |
| P3.1 | LayerBadge 组件 | `frontend/src/components/causal/LayerBadge.tsx` | 新增 | 纯展示组件 |
| P3.2 | CausalStatementCard + LayerBadge | `CausalStatementCard.tsx` | 修改 | 卡片头部增加 "因果解释" |
| P3.3 | Signal 区域 + "系统推断" | 评分/推荐展示组件 | 修改 | P05 实现 |
| P3.4 | i18n | `locales/zh\|en\|ja/common.ts` | 修改 | 3 keys |
| P3.5 | 测试 | 3 测试文件 | 新增/修改 | LayerBadge + CausalStatementCard 集成 + Signal 集成 |
| P3.6 | Validation Report | 报告 | 新增 | — |

### 依赖

```
P3.1 (LayerBadge) → P3.2 (CausalStatementCard) ──┐
                  → P3.3 (Signal) ────────────────┤
                                                   → P3.4 (i18n) → P3.5 (测试) → P3.6 (报告)
```

### 不修改

| 组件 | 原因 |
| --- | --- |
| `RelationshipChain` | Entity/Relationship 无标签（默认信息层） |
| `EntityPage` | 同上 |
| `GuidePanel` | CS reason 已有 CausalStatementCard（含 LayerBadge） |
| `SourceChain` | Evidence 标签由 P3.3 覆盖 |

---

## 3. Component Design

### LayerBadge

```tsx
interface LayerBadgeProps {
  layer: 'causal' | 'inference' | 'evidence'
}
```

- **尺寸**：12px 字体 + 圆角 pill（与现有 confidence 标签风格一致）
- **颜色**：使用项目 CSS 变量——`--verified`（绿）/ `--info`（蓝）/ `--text-low`（灰）
- **M85 预留**：`onClick?: () => void` 不实现

### CausalStatementCard 修改

当前渲染顺序：
```
[mechanism 文本]
[consequence 文本]
[confidence 标签] [evidence refs]
```

Phase 3 修改后：
```
["因果解释" LayerBadge]
[mechanism 文本]
[consequence 文本]
[confidence 标签] [evidence refs]
```

### Signal 区域修改

当前：评分/权重/推荐无任何标识。

Phase 3 修改后：每个 Signal/推荐项旁增加 `["系统推断" LayerBadge]`。

---

## 4. i18n

| Key | zh | en | ja |
| --- | --- | --- | --- |
| `layer.causal` | 因果解释 | Causal explanation | 因果解釈 |
| `layer.inference` | 系统推断 | System inference | システム推論 |
| `layer.evidence` | 证据来源 | Evidence source | 証拠ソース |

---

## 5. Constraint Compliance

| # | 约束 | Phase 3 是否违反？ |
| --- | --- | --- |
| IC-1 | 不新增 Schema | ✅ 纯 UI |
| IC-2 | 不新增 API | ✅ |
| IC-3 | 不引入 AI | ✅ |
| IC-4 | 不修改 Graph Core | ✅ |
| IC-5 | fallback 保持 | ✅ |
| IC-6 | CausalStatementCard 独立 | ✅ 仅增加 LayerBadge |
| IC-7 | 直接 GID 匹配 | ✅ 不涉及 |
| IC-8 | 0 新依赖 | ✅ |

---

## 6. Phase 3 Gate Criteria

| # | 标准 | 验证方式 |
| --- | --- | --- |
| G1 | LayerBadge 组件渲染 "因果解释" / "系统推断" / "证据来源" | 单元测试 |
| G2 | CausalStatementCard 头部显示 "因果解释" | 集成测试 |
| G3 | Signal 区域显示 "系统推断" | 集成测试 |
| G4 | i18n 三语覆盖 | 单元测试 |
| G5 | Entity/Relationship 无 LayerBadge | 集成测试 |
| G6 | Schema 7 字段未新增 | freeze-check |

---

> 审查模式：只读
> 日期：2026-08-05
> 状态：**Implementation Plan Ready — 6 tasks, 6 Gate criteria**
