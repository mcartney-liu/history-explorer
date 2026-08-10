# M84 CausalObject Model Freeze

> **阶段**：M84 CausalObject Model Freeze — 核心模型字段冻结
> **模式**：严格只读 | **日期**：2026-08-05
> **基线**：M84 Architecture Gate + Scope Freeze + Implementation Boundary

---

## 1. Allowed Fields

CausalObject 的字段分为两层：继承层（来自 CausalStatement）和扩展层（M84 新增）。

### 1.1 继承层（CausalStatement — 不变）

| # | 字段 | 类型 | 来源 | 说明 |
| --- | --- | --- | --- | --- |
| 1 | `id` | `str` | CausalStatement | 唯一标识 |
| 2 | `cause_id` | `str` | CausalStatement | KG Entity GID |
| 3 | `effect_id` | `str` | CausalStatement | KG Entity GID |
| 4 | `mechanism` | `str` | CausalStatement | 因果机制文本 |
| 5 | `consequence` | `str` | CausalStatement | 历史影响文本 |
| 6 | `confidence` | `"high"` \| `"medium"` \| `"low"` \| `null` | CausalStatement | curator assessment |
| 7 | `evidence_refs` | `tuple[str, ...]` | CausalStatement | Evidence Claim ID 列表 |

### 1.2 扩展层（M84 新增）

| # | 字段 | 类型 | 说明 |
| --- | --- | --- | --- |
| 8 | `object_type` | `str` = `"causal"` | 固定值 — 标识这是 CausalObject |
| 9 | `related_entities` | `tuple[str, ...]` | 关联的 KG Entity GID 列表（不含 cause_id/effect_id） |
| 10 | `exploration_paths` | `tuple[dict, ...]` | 推荐的探索路径（每条路径包含 from / to / relationship / label） |

### 1.3 完整 Model

```python
@dataclass(frozen=True)
class CausalObject:
    # === 继承 CausalStatement（7 字段，不变）===
    id: str
    cause_id: str
    effect_id: str
    mechanism: str | None = None
    consequence: str | None = None
    confidence: str | None = None
    evidence_refs: tuple[str, ...] = ()

    # === M84 新增（3 字段）===
    object_type: str = "causal"
    related_entities: tuple[str, ...] = ()
    exploration_paths: tuple[dict, ...] = ()
```

**总计：10 个字段。7 个继承 + 3 个新增。**

---

## 2. Forbidden Fields

以下字段在 M84 中**绝对不允许**出现在 CausalObject 中：

| # | 字段 | 为什么禁止 | 如果加入会怎样 |
| --- | --- | --- | --- |
| F1 | `confidence_score`（数值） | C-7：confidence 是 enum string | 破坏 curator assessment 模型 |
| F2 | `ai_generated` / `generated_by` | C-6：AI 不生成事实 | Semantic Object 变成 AI 产物，破坏信任 |
| F3 | `ranking` / `score` | SO 是解释载体，不是推荐对象 | SO 变成 Recommendation Object |
| F4 | `recommendation` / `suggested_next` | 推荐逻辑属于 Inference Layer（M85+） | 解释层和推理层耦合 |
| F5 | `personalization` / `user_interest` | 个性化属于 M85+ | 解释内容变成动态生成 |
| F6 | `entity_name` / `entity_type` / `entity_description` | 不重复 KG Entity 属性 | SO 变成 KG 的替代品 |
| F7 | `timeline` / `map_location` | 不重复 KG View | SO 变成 Entity Page 的替代品 |
| F8 | `related_causal_objects` | CausalObject → many CausalStatements → 逼近 Ontology | SO 变成知识图谱 |
| F9 | `version` / `updated_at` / `created_by` | 内容管理元数据 → M85+ 的 Content Pipeline | 提前引入 CMS 复杂度 |
| F10 | `narrative` / `story` | 叙事生成 → M85+ | SO 变成叙事引擎 |

---

## 3. Extension Rule

### 3.1 M84 期间

```
CausalObject 字段数：10（固定）

不允许新增任何字段。
不允许修改任何现有字段的类型或语义。
```

### 3.2 M85+ 扩展条件

以下条件**同时满足**时，才可以在 M85 中扩展 CausalObject：

| 条件 | 说明 |
| --- | --- |
| M84 验证 Semantic Object 产品形态成立 | ≥3/4 产品指标达标 |
| 新增字段有 M84 实验证据支撑 | 不是 "可能有用"，而是 "M84 发现用户需要" |
| 新增字段不违反 M82 Frozen Constraints | C-1 到 C-8 |
| 新增字段通过 M85 Architecture Gate | 与 KG/Trust/AI Boundary 不冲突 |

### 3.3 永不加入的字段

| 字段 | 理由 |
| --- | --- |
| AI 生成内容相关 | C-6（永久） |
| 写入 KG 的字段 | Trust Boundary（永久） |

---

## 4. Backward Compatibility

### 4.1 与 CausalStatement 的关系

```
CausalStatement（M82，7 字段）
        ↓ 是超集
CausalObject（M84，10 字段）

CausalStatement 的 7 个字段：
  - 名称不变
  - 类型不变
  - 语义不变
  - 序列化格式不变

CausalObject 的 3 个新增字段：
  - 全部有默认值（object_type="causal", related_entities=(), exploration_paths=()）
  - 不影响 CausalStatement 的现有消费方
```

### 4.2 现有 API 兼容

| API | M84 影响 |
| --- | --- |
| `PathCandidate.causal_statements` | 不变（继续返回 CausalStatement 格式） |
| `ExploredNode.causal_statements` | 不变 |
| `CausalStatementCard` | 不变（保留所有现有功能） |

### 4.3 前端兼容

```
CausalStatementCard（现有）
  → 接收 CausalStatementData（不变）
  → 新增 "了解更多" 入口（可选，有 CausalObject ID 时才显示）
  → 点击 → CausalObjectDetailPage

CausalObjectDetailPage（新增）
  → 接收 CausalObject
  → 展示 mechanism / consequence / related_entities / exploration_paths
```

---

## 5. Field Audit Checklist

| # | 检查项 | 状态 |
| --- | --- | --- |
| 1 | 字段总数 = 10（7 继承 + 3 新增） | ⬜ |
| 2 | 无 confidence_score（数值） | ⬜ |
| 3 | 无 ai_generated / generated_by | ⬜ |
| 4 | 无 ranking / score / recommendation | ⬜ |
| 5 | 无 personalization / user_interest | ⬜ |
| 6 | 无 entity_name / entity_type / entity_description | ⬜ |
| 7 | 无 timeline / map_location | ⬜ |
| 8 | 无 related_causal_objects | ⬜ |
| 9 | 无 version / updated_at / created_by | ⬜ |
| 10 | 无 narrative / story | ⬜ |
| 11 | CausalStatement 7 字段不变 | ⬜ |
| 12 | 现有 API 兼容 | ⬜ |

---

> 审查模式：只读 | M84 CausalObject Model Freeze 完成 | 状态：FROZEN | 等待 PO Review
