# M84 Implementation Boundary Review

> **阶段**：M84 Implementation Boundary Freeze — 实施前边界确认
> **模式**：严格只读 | **日期**：2026-08-05
> **基线**：M84 Architecture Gate + M84 Scope Freeze
> **治理模板**：M84 = Expansion 最小集

---

## 1. Allowed Files

### Backend

| # | 文件 | 操作 | 说明 |
| --- | --- | --- | --- |
| B1 | `backend/app/core/causal/causal_object.py` | **新增** | CausalObject dataclass（CausalStatement 超集） |
| B2 | `backend/app/core/causal/loader.py` | 修改 | 新增 `load_causal_objects()` |
| B3 | `backend/app/core/causal/adapter.py` | 修改 | 新增 `get_causal_object()` / `get_objects_for_entity()` |
| B4 | `backend/app/core/causal/__init__.py` | 修改 | 新增 exports |
| B5 | `data/causal_objects.json` | **新增** | 3-5 个 CausalObject 实例 |
| B6 | `data/causal_statements.json` | 修改 | 扩展到 20+ 条 CS（仅追加） |
| B7 | `backend/tests/` | **新增** | CausalObject tests |

### Frontend

| # | 文件 | 操作 | 说明 |
| --- | --- | --- | --- |
| F1 | `frontend/src/components/causal/CausalObjectDetailPage.tsx` | **新增** | Detail Page 组件 |
| F2 | `frontend/src/components/causal/CausalStatementCard.tsx` | 修改 | 增加 "了解更多" 入口 → 跳转 Detail Page |
| F3 | `frontend/src/components/causal/__tests__/` | **新增** | CausalObjectDetailPage tests |
| F4 | `frontend/src/data/UserBehaviorEvent.ts` | 修改 | 新增 `co_detail_open` / `co_entity_follow` |
| F5 | `frontend/src/styles/` | 修改 | Detail Page CSS |
| F6 | `frontend/src/data/causalStatement.ts` | 修改 | 新增 CausalObject 类型 |

**总计**：13 files（7 Backend + 6 Frontend），其中 5 新增、8 修改。

---

## 2. CausalObject Model Boundary

### 允许

```python
@dataclass
class CausalObject:
    # 继承 CausalStatement 全部 7 字段
    id: str
    cause_id: str
    effect_id: str
    mechanism: str
    consequence: str
    confidence: str | None
    evidence_refs: tuple[str, ...]

    # M84 新增（3 个字段）
    object_type: str = "causal"                    # 固定值
    related_entities: tuple[str, ...] = ()          # KG GID 列表
    exploration_paths: tuple[dict, ...] = ()        # 探索路径列表
```

### 禁止

| 禁止 | 理由 |
| --- | --- |
| CausalObject 写入 KG | Trust Boundary |
| CausalObject 包含 Entity 属性（name/description/type） | 不重复 KG |
| CausalObject 包含 Timeline/Map 数据 | 不重复 KG View |
| CausalObject 包含 AI 生成字段 | C-6 |
| CausalObject → many CausalStatements | 逼近 Ontology |

---

## 3. API Boundary

### 允许

| # | Endpoint | 说明 |
| --- | --- | --- |
| API1 | `GET /causal-object/{id}` | 按 ID 获取 CausalObject |
| API2 | `GET /causal-object/entity/{gid}` | 按 Entity GID 获取相关 CausalObjects |

### 禁止

| 禁止 | 理由 |
| --- | --- |
| 修改现有 `GET /explore/{gid}` | 不修改 Runtime Explorer API |
| 修改现有 `find_connections` | 不修改 KG 查询 API |
| 新增 `POST /causal-object` | M84 只读，不创建（数据来自 JSON） |
| 新增 AI 相关端点 | C-6 |

---

## 4. Frontend Component Boundary

### 允许

| 组件 | 职责 | 与现有组件的关系 |
| --- | --- | --- |
| `CausalObjectDetailPage` | 展示 CausalObject 的 mechanism / consequence / related_entities / exploration_paths | 从 `CausalStatementCard` 点击进入 |
| `CausalStatementCard`（修改） | 新增 "了解更多" 入口 | 保留所有现有功能 |

### 禁止

| 禁止 | 理由 |
| --- | --- |
| CausalStatementCard 根据事件改变展示 | Instrumentation ≠ Runtime Logic |
| Detail Page 根据用户行为推荐路径 | AI Recommendation → M85+ |
| Detail Page 包含 Timeline/Map 组件 | 不重复 KG View |
| Detail Page 包含 AI 生成内容 | C-6 |

---

## 5. Instrumentation Boundary

### 允许

| 事件 | 触发时机 |
| --- | --- |
| `co_detail_open` | CausalObjectDetailPage mount |
| `co_entity_follow` | related_entities 被点击 |

### 禁止

| 禁止 | 理由 |
| --- | --- |
| 根据 `co_detail_open` 次数改变 UI | Instrumentation ≠ Runtime Logic |
| 根据 `co_entity_follow` 调整推荐 | AI Recommendation → M85+ |
| 新增 `causalConfidence` 字段 | M83.1 已冻结 |
| 新增 `co_*` 超过 2 个事件 | M84 最小验证闭环 |

---

## 6. Forbidden Dependencies

| # | 禁止 | 理由 |
| --- | --- | --- |
| 1 | `causal_object.py` import `graph.py` | C-4 |
| 2 | 任何 `causal/` 文件 import AI/LLM 库 | C-6 |
| 3 | Frontend 新增第三方依赖 | 不需要 |
| 4 | Backend 新增第三方依赖 | 不需要 |
| 5 | CausalObject 依赖 Runtime Explorer 数据流 | 独立路径 |

---

## 7. Implementation Boundary Checklist

| # | 检查项 | 状态 |
| --- | --- | --- |
| B-1 | CausalObject 不包含 AI 生成字段 | ⬜ |
| B-2 | CausalObject 不写入 KG | ⬜ |
| B-3 | `causal/` 包不 import `graph.py` | ⬜ |
| B-4 | CausalStatement 7 字段不变 | ⬜ |
| B-5 | 现有 API 不受影响 | ⬜ |
| B-6 | `CausalStatementCard` 向后兼容 | ⬜ |
| B-7 | Instrumentation 不改变 UI 行为 | ⬜ |
| B-8 | 无新第三方依赖 | ⬜ |
| B-9 | `causalConfidence` 字段不存在 | ⬜ |

---

> 审查模式：只读 | M84 Implementation Boundary 冻结完成 | 不进入 Implementation | 等待 PO Review
