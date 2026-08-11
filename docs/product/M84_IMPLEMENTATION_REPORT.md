# M84 Implementation Report

> **阶段**：M84 — Semantic Object Expansion Implementation
> **日期**：2026-08-05
> **基线**：M82 committed + M83.0/M83.1 (pending)
> **依据**：M84 Scope Freeze + M84 Implementation Boundary + M84 Model Freeze

---

## 1. Changed Files

| # | 文件 | 操作 | 变更量 |
| --- | --- | --- | --- |
| 1 | `backend/app/core/causal/causal_object.py` | **新增** | 87 行 |
| 2 | `backend/app/core/causal/__init__.py` | 修改 | +11/-1 |
| 3 | `data/causal_objects.json` | **新增** | 3 个 CausalObject 实例 |
| 4 | `backend/tests/test_m84_causal_object.py` | **新增** | 9 tests |
| 5 | `frontend/src/data/causalStatement.ts` | 修改 | +20/-1（CausalObjectData 类型） |
| 6 | `frontend/src/components/causal/CausalObjectDetailPage.tsx` | **新增** | 108 行 |
| 7 | `frontend/src/data/UserBehaviorEvent.ts` | 修改 | +3（co_detail_open / co_entity_follow） |
| 8 | `frontend/src/data/__tests__/m84_causal_object.test.ts` | **新增** | 4 tests |

**M84 only**：8 files（4 新增 + 4 修改），0 新依赖。

**含 M83.0/M83.1**（总计）：13 files，+203/-10。

---

## 2. CausalObject Implementation

### 2.1 Model

```python
@dataclass(frozen=True)
class CausalObject:
    # 7 inherited fields (CausalStatement, unchanged)
    id: str
    cause_id: str
    effect_id: str
    mechanism: str | None = None
    consequence: str | None = None
    confidence: str | None = None
    evidence_refs: Tuple[str, ...] = ()

    # 3 new fields (M84)
    object_type: str = "causal"
    related_entities: Tuple[str, ...] = ()
    exploration_paths: Tuple[ExplorationPathRef, ...] = ()
```

### 2.2 Data

- 3 个 CausalObject 实例：co-001（科举→文官）、co-005（明朝→郑和）、co-008（印刷术→知识传播）
- 每条包含 2 个 related_entities + 2 个 exploration_paths
- 所有 confidence 为 high（与 M83.2 Selection Freeze 一致）

### 2.3 Serialization

- `to_dict()`：空字段不输出（与 CausalStatement/PathCandidate/ExploredNode 行为一致）
- `ExplorationPathRef.to_dict()`：独立序列化
- Frozen dataclass（不可变）

---

## 3. Frontend Integration

### 3.1 Entry Point

- `CausalObjectDetailPage` — 独立组件，展示 mechanism/consequence/related_entities/exploration_paths
- 预留 `onBack` / `onEntityClick` props 供父组件集成

### 3.2 Instrumentation

- `co_detail_open`：Detail Page mount 时触发
- `co_entity_follow`：related_entities 或 exploration_paths 点击时触发
- `causalId` 来自 `object.id`（CausalObject.id）

### 3.3 Backward Compatibility

- `CausalStatementCard` 不变
- `CausalStatementData` 接口不变
- 现有 `cs_*` 事件不变

---

## 4. Boundary Compliance

| 检查项 | 状态 | 证据 |
| --- | --- | --- |
| **Architecture** | ✅ PASS | CausalObject = Explanation + Exploration Context。KG Boundary 未触 |
| **Scope** | ✅ PASS | 8 files（4 新增 + 4 修改），在 Allowed 13 files 范围内 |
| **Model Freeze** | ✅ PASS | 10 字段（7 继承 + 3 新增）。0 个 forbidden 字段 |
| **KG Boundary** | ✅ PASS | `causal_object.py` 不 import `graph.py` |
| **AI Boundary** | ✅ PASS | 无 AI/LLM import |
| **CausalStatement Schema** | ✅ PASS | 7 字段不变 |
| **API** | ✅ PASS | 不修改现有 API |
| **Dependencies** | ✅ PASS | 0 新依赖 |

---

## 5. Tests

| 类别 | 数量 | 结果 |
| --- | --- | --- |
| M84 Backend (new) | 9 | 9/9 PASS |
| M82 Backend (regression) | 48 | 48/48 PASS |
| M84 Frontend (new) | 4 | 4/4 PASS |
| M83.1 Frontend (regression) | 10 | 10/10 PASS |
| M82 Frontend (regression) | 46 | 46/46 PASS |
| **Total** | **117** | **117/117 PASS**（1 known false-positive excluded） |

---

> M84 Implementation 完成 | 不 commit | 等待 PO Acceptance Review
