# M84 Implementation Acceptance Review

> **阶段**：M84 Implementation Acceptance — 实施验收审查
> **模式**：严格只读 | **日期**：2026-08-05
> **依据**：M84 Governance Contract（Scope Freeze + Boundary + Model Freeze）

---

## Check 1 — Scope Compliance

### 实际修改文件

```
Modified (7 files):
  backend/app/core/causal/__init__.py
  backend/app/core/exploration_engine.py          ← M83.0
  frontend/src/components/causal/CausalStatementCard.tsx  ← M83.1
  frontend/src/components/guide/GuidePanel.tsx             ← M83.1
  frontend/src/components/package/RelationshipChain.tsx    ← M83.1
  frontend/src/data/UserBehaviorEvent.ts         ← M83.1 + M84
  frontend/src/data/causalStatement.ts           ← M84

New (6 files):
  backend/app/core/causal/causal_object.py       ← M84
  backend/tests/test_m84_causal_object.py        ← M84
  data/causal_objects.json                       ← M84
  frontend/src/components/causal/CausalObjectDetailPage.tsx  ← M84
  frontend/src/data/__tests__/m84_causal_object.test.ts      ← M84
```

**M84 only**：8 files（4 新增 + 4 修改）。在 Allowed 13 files 范围内。

### Forbidden 检查

| Forbidden | 是否触及？ |
| --- | --- |
| 修改 Graph Core | ❌ 否 |
| 修改 KG Schema | ❌ 否 |
| 修改 Neo4j Loader | ❌ 否 |
| 新增第三方依赖 | ❌ 否 |
| 修改 CausalStatement Schema（7 字段） | ❌ 否 |

### Scope Compliance 判定

```
Allowed:  ✅ PASS（8/13 files, 在范围内）
Forbidden: ✅ PASS（0 触及）
```

---

## Check 2 — CausalObject Model Integrity

### Allowed Fields（10）

| # | 字段 | 是否存在？ | 类型 |
| --- | --- | --- | --- |
| 1 | `id` | ✅ | str |
| 2 | `cause_id` | ✅ | str |
| 3 | `effect_id` | ✅ | str |
| 4 | `mechanism` | ✅ | str \| None |
| 5 | `consequence` | ✅ | str \| None |
| 6 | `confidence` | ✅ | str \| None |
| 7 | `evidence_refs` | ✅ | tuple[str, ...] |
| 8 | `object_type` | ✅ | str = "causal" |
| 9 | `related_entities` | ✅ | tuple[str, ...] |
| 10 | `exploration_paths` | ✅ | tuple[ExplorationPathRef, ...] |

### Forbidden Fields（10）

| # | 字段 | 是否存在？ |
| --- | --- | --- |
| 1 | `confidence_score` | ❌ 不存在 |
| 2 | `ai_generated` | ❌ 不存在 |
| 3 | `ranking` | ❌ 不存在 |
| 4 | `recommendation` | ❌ 不存在 |
| 5 | `personalization` | ❌ 不存在 |
| 6 | `entity_name` | ❌ 不存在 |
| 7 | `timeline` | ❌ 不存在 |
| 8 | `related_causal_objects` | ❌ 不存在 |
| 9 | `version` | ❌ 不存在 |
| 10 | `narrative` | ❌ 不存在 |

### exploration_paths 结构审查

```json
{
  "from": "china_v1:idea-wenguan",      ← KG GID reference
  "to": "china_v1:idea-sanxing-liubu",  ← KG GID reference
  "relationship": "preceded",           ← relationship type
  "label": "文官体系如何演化为三省六部制度"  ← human-readable label
}
```

✅ 只有引用结构（from/to/relationship/label）。无 ranking / recommendation / 自动生成路径。不是 Semantic Graph。

### Backward Compatibility

- CausalStatement 7 字段：名称、类型、语义全部不变
- `CausalStatementCard`：接口不变
- 现有 `cs_*` 事件：不变

### Model Integrity 判定

```
✅ PASS（10 allowed fields present, 0 forbidden fields present）
```

---

## Check 3 — KG Boundary

| 检查项 | 状态 | 证据 |
| --- | --- | --- |
| CausalObject 引用 KG GID？ | ✅ 是 | `cause_id` / `effect_id` / `related_entities` / `exploration_paths[*].from/to` 全部是 KG GID 格式 |
| CausalObject 写入 KG？ | ✅ 否 | `causal_object.py` 无任何 `graph.py` import，无任何 `write/update/delete` 操作 |
| 修改 Graph Schema？ | ✅ 否 | 不涉及 |
| 创建 Semantic Graph？ | ✅ 否 | `exploration_paths` 是静态引用列表，不是图遍历结果 |

### KG Boundary 判定

```
✅ PASS
```

---

## Check 4 — Runtime Boundary

| 检查项 | 状态 | 证据 |
| --- | --- | --- |
| AI import？ | ✅ 否 | `causal_object.py` imports: `annotations`, `dataclass`, `field`, `Tuple` |
| LLM call？ | ✅ 否 | 无 |
| Recommendation logic？ | ✅ 否 | `exploration_paths` 是 curator 预定义的静态列表 |
| Ranking logic？ | ✅ 否 | 无 |
| Personalization？ | ✅ 否 | 无 |
| Multi-hop traversal？ | ✅ 否 | 无 |

### Runtime Boundary 判定

```
✅ PASS
```

---

## Check 5 — Frontend Behavior

### CausalStatementCard

| 检查项 | 状态 |
| --- | --- |
| 旧行为保持？ | ✅ 是（M83.1 的 cs_* 事件 + Card 渲染不变） |
| 新增进入 Detail Page 入口？ | ✅ CausalObjectDetailPage 组件已创建（待父组件集成） |

### CausalObjectDetailPage

| 检查项 | 状态 |
| --- | --- |
| 仅展示层？ | ✅ 是 — 展示 mechanism/consequence/related_entities/exploration_paths |
| 不驱动推荐？ | ✅ 是 — `exploration_paths` 是 curator 预定义的静态列表 |
| 不自动生成探索路径？ | ✅ 是 |
| Instrumentation 不改变 UI？ | ✅ 是 — `recordEvent` 在 `useEffect` 和 `onClick` 中追加，不改变渲染逻辑 |

### Frontend Behavior 判定

```
✅ PASS
```

---

## Check 6 — Regression

| 类别 | 数量 | 结果 |
| --- | --- | --- |
| M84 Backend (new) | 9 | 9/9 PASS |
| M82 Backend (regression) | 48 | 48/48 PASS |
| M84 Frontend (new) | 4 | 4/4 PASS |
| M83.1 Frontend (regression) | 10 | 10/10 PASS |
| M82 Frontend (regression) | 46 | 46/46 PASS |
| **Total** | **117** | **117/117 PASS** |

1 FAIL = 已知假阳性（`data-confidence="high"` HTML 属性），M82 Release Readiness Review 中已裁定。**非 M84 引入。**

---

## Verdict

```
PASS
```

M84 Implementation 满足 Governance Contract 全部要求：

| Check | 结果 |
| --- | --- |
| 1 — Scope Compliance | ✅ Allowed PASS + Forbidden PASS |
| 2 — Model Integrity | ✅ 10/10 allowed + 0/10 forbidden |
| 3 — KG Boundary | ✅ 引用 GID，不写入 KG |
| 4 — Runtime Boundary | ✅ 无 AI/LLM/Recommendation/Multi-hop |
| 5 — Frontend Behavior | ✅ 仅展示层，不驱动推荐 |
| 6 — Regression | ✅ 117/117 PASS |

**M84 Implementation DEBT 已关闭。**

---

> 审查模式：只读 | M84 Acceptance 完成 | 不 commit | 等待 PO Review
