# M84 Scope Freeze Review

> **文档类型**：Governance Contract（遵循 MILESTONE_GOVERNANCE_TEMPLATE.md）
> **状态**：READY (Frozen)
> **阶段**：M84 Scope Freeze — Implementation 前的边界冻结
> **模式**：严格只读 | **日期**：2026-08-05
> **基线**：M83 CLOSED + M84.0 Architecture Gate READY
> **Milestone 类型**：Expansion（最小治理集：Scope Freeze + Architecture Gate + Implementation Acceptance）

---

## 1. M84 Goal Definition

```
M84 = Semantic Object Expansion

核心目标：
  将 M83 验证有效的 CausalStatement 解释能力，
  从一个局部 UI 组件升级为平台级 CausalObject 能力。

M84 ≠ Semantic Framework（不建立通用语义框架）
M84 ≠ Knowledge Graph Expansion（不扩展 KG）
M84 ≠ Multi-hop Reasoning（不引入多跳推理）
```

### 成功定义

```
M84 成功 = Explorer 是否愿意从 "看解释" 进入到 "围绕解释继续探索"

不是 "新增了多少 CausalObject"，而是 "解释是否成为探索入口"。
```

---

## 2. CausalObject Boundary Freeze

### 2.1 CausalObject = M84 唯一 Semantic Object 实现

```
✅ CausalObject（M84 唯一实现）

❌ SemanticObjectBase（不建立通用基类）
❌ ThemeObject（M85+）
❌ InfluenceObject（M85+）
❌ NarrativeObject（M85+）
```

**禁止**：在 M84 中定义 "通用 Semantic Object 抽象类"。只有一个实例时不抽象。

### 2.2 CausalStatement → CausalObject 关系

```
CausalStatement（7 字段，不变）
        ↓ 扩展
CausalObject（CausalStatement 超集）
        + related_entities
        + exploration_paths
        + object_type = "causal"

不是：
  CausalObject → many CausalStatements（这会逼近 Ontology）
```

### 2.3 CausalObject Model

```typescript
interface CausalObject {
  // 继承自 CausalStatement
  id: string
  cause_id: string
  effect_id: string
  mechanism: string
  consequence: string
  confidence: "high" | "medium" | "low" | null
  evidence_refs: string[]

  // M84 新增
  object_type: "causal"
  related_entities: string[]        // 关联的其他 KG Entity GID
  exploration_paths: ExplorationPathRef[]  // 推荐的探索路径
}

interface ExplorationPathRef {
  from: string        // 起点 Entity GID
  to: string          // 终点 Entity GID
  relationship: string // 关系类型
  label: string       // Explorer 可读的路径描述
}
```

### 2.4 数据量

```
M84 目标：
  - 创建 3-5 个 CausalObject（基于高价值 CS：cs-001/005/008 + 2 个罗马包）
  - CS 总数扩展到 20+ 条（覆盖中国 + 罗马 + 丝路）
```

---

## 3. KG / Semantic Layer Boundary Freeze

### 3.1 数据流

```
KG（事实层）
  ├── Entity
  ├── Relationship
  └── Properties
       │
       │ gid reference（单向）
       ▼
Semantic Object Layer（解释层）
  ├── CausalObject
  ├── mechanism / consequence
  └── related_entities / exploration_paths
       │
       ▼
API
       │
       ▼
Explorer UI
```

### 3.2 交互规则

| 方向 | 允许 | 禁止 |
| --- | --- | --- |
| KG → SO | SO 引用 KG GID | — |
| SO → KG | — | SO 写入 KG / SO 修改 Entity / SO 修改 Relationship |
| API | 新增 CausalObject 端点 | 修改现有 KG API |

### 3.3 Trust Boundary 保护

```
Fact Layer（KG）       → 回答 "What exists?"
Semantic Layer（SO）   → 回答 "How to understand it?"
Inference Layer        → 回答 "What might be true?"（M85+）
Exploration Layer（UI）→ 回答 "Where to go next?"

M84 不突破 M74/M79/M82 建立的 Trust Boundary。
```

---

## 4. Allowed / Forbidden / Future Scope

### 4.1 Allowed

| # | 操作 | 文件范围 | 说明 |
| --- | --- | --- | --- |
| A1 | CausalObject Model 定义 | `backend/app/core/causal/`（新增 causal_object.py） | CausalStatement 超集，3 个新字段 |
| A2 | CausalObjectDetailPage | `frontend/src/components/causal/`（新增） | 从 CausalStatementCard 点击进入 |
| A3 | 3-5 个 CausalObject 实例 | `data/causal_objects.json`（新增） | cs-001/005/008 + 罗马包 2 个 |
| A4 | CS 数据扩展到 20+ 条 | `data/causal_statements.json` | 覆盖中国 + 罗马 + 丝路 |
| A5 | CausalObject API | `backend/`（新增端点） | `GET /causal-object/{id}` + `GET /causal-object/entity/{gid}` |
| A6 | CausalStatementCard 样式优化 | `CausalStatementCard.tsx` + CSS | 基于 M83 Session 反馈 |
| A7 | CausalObject Instrumentation | `UserBehaviorEvent.ts` | 新增 `co_detail_open` / `co_entity_follow` |

### 4.2 Forbidden

| # | 操作 | 理由 |
| --- | --- | --- |
| F1 | AI 自动生成 CausalStatement | M83 Decision D6（REJECT）+ C-6 |
| F2 | 修改 Graph Core（Entity/Relationship/Edge） | M82 Frozen（C-1/C-2/C-4） |
| F3 | CausalObject 写入 KG | Semantic Object 是解释层，不是事实层 |
| F4 | Multi-hop Runtime | M83 Decision D5（DEFER TO M85） |
| F5 | Runtime/Package 数据流合并 | M83 Decision D7（REJECT 永久） |
| F6 | 扩展 CausalStatement Schema（7 字段） | M82 Frozen（C-7） |
| F7 | 定义 SemanticObjectBase 抽象类 | 只有一个实例时不抽象（§2.1） |
| F8 | CausalObject → many CausalStatements | 会逼近 Ontology（§2.2） |
| F9 | AI Recommendation / Dynamic Narrative | M85+ |

### 4.3 Future（M85+）

| # | 方向 | 建议 Milestone |
| --- | --- | --- |
| FU1 | Multi-hop Causal Exploration | M85 |
| FU2 | ThemeObject / InfluenceObject | M85 |
| FU3 | SemanticObjectBase 抽象（当有 2+ 实例时） | M85 |
| FU4 | AI Causal Generation（如果 PO 决策引入） | M85+ |

---

## 5. Out of Scope（M84 绝对不做）

| # | 工作 | 归属 | 理由 |
| --- | --- | --- | --- |
| O1 | Multi-hop Causal Exploration | M85 | M83 Decision D5 |
| O2 | 通用 Semantic Object 框架 | M85 | 只有一个实例时不抽象 |
| O3 | CausalObject 写入 KG | 永久不做 | 违反 Trust Boundary |
| O4 | AI 生成 CausalStatement | M85+ | M83 Decision D6 |
| O5 | Runtime/Package 数据流合并 | 永久不做 | M83 Decision D7 |
| O6 | CausalStatement Schema 扩展 | 永久不做 | C-7 |
| O7 | Graph Core 修改 | 永久不做 | C-1/C-2/C-4 |
| O8 | ThemeObject / InfluenceObject / NarrativeObject | M85 | 未验证 |
| O9 | AI Recommendation Engine | M85+ | 未验证 |
| O10 | Evidence Layer Expansion | M85 | M83 Evidence Open 1/4 |

---

## 6. Scope Change Protocol

### 6.1 允许修改 Scope 的条件

| # | 条件 | 说明 |
| --- | --- | --- |
| 1 | Implementation Defect | 发现已提交代码与 Scope Freeze 不一致 |
| 2 | Architecture Defect | 发现架构约束与 M83 Decision 冲突 |
| 3 | Baseline Conflict | 发现 Freeze Boundary 与 M82 Frozen Baseline 不一致 |

### 6.2 不接受的 Scope Change

| 理由 | 处理 |
| --- | --- |
| "顺便把 Multi-hop 做了" | → M85 |
| "加一个通用 SemanticObject 基类" | → M85（当有 2+ 实例时） |
| "CausalObject 可以多包含几个 CS" | → 拒绝（逼近 Ontology） |

---

## 7. Acceptance Criteria

### 7.1 产品指标

| # | 指标 | 定义 | 采集 |
| --- | --- | --- | --- |
| AC1 | CausalObject Open Rate | 从 CausalStatementCard 进入 Detail Page 的比例 | `co_detail_open` 事件 |
| AC2 | Related Entity Follow Rate | Detail Page 中 related_entities 被点击的比例 | `co_entity_follow` 事件 |
| AC3 | Exploration Depth | 有 CausalObject 的 session 深度 vs 无 CausalObject 的 session 深度 | 沿用 M83 的深度对比方法 |
| AC4 | User Mental Model | Explorer 是否将 CausalObject 视为 "探索入口"（非 "解释卡片"） | Session Review 访谈 |

### 7.2 工程指标

| # | 指标 | 定义 |
| --- | --- | --- |
| AC5 | Schema Stability | CausalStatement 7 字段在 M84 全程不变 |
| AC6 | KG Independence | CausalObject 不修改 KG Entity/Relationship |
| AC7 | API Compatibility | 现有 `explore()` / `find_connections()` API 不受影响 |

### 7.3 成功判定

```
Strong Signal（≥3/4 产品指标达标）：
  → M85 引入 ThemeObject + SemanticObjectBase 抽象

Weak Signal（1-2/4 产品指标达标）：
  → M85 优化 CausalObject 呈现方式

No Signal（0/4 产品指标达标）：
  → M85 重新审视 Semantic Object 方向
```

---

## 8. M84 Governance Contract 声明

| 属性 | 值 |
| --- | --- |
| **文档类型** | Governance Contract（非 Planning） |
| **作用域** | M84 全阶段 |
| **约束力** | M84 代码评审 / 实现评审 / 验收的唯一范围依据 |
| **修订条件** | 仅限 §6 Scope Change Protocol 定义的 3 种情况 |
| **有效期** | M84 Start → M84 Close（M85 启动后自动失效） |
| **优先级** | 若与 M83 Decision Gate 冲突 → 以 M83 Decision 为准 |
| **治理模板** | 基于 MILESTONE_GOVERNANCE_TEMPLATE.md — M84 = Expansion 最小集 |

---

> 审查模式：只读 | M84 Scope Freeze 完成 | 状态：READY (Frozen) | 等待 PO Review
