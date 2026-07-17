# M4-002 Completion Report

## 1. Summary

M4-002 在冻结 Schema（Entity Types = 8 / Relationship Types = 18）之上，为 KnowledgeService 新增三层纯投影方法，并在 `/explore`、`/entity` 接口以 additive 方式暴露跨主题关联数据；全程未改动确定性 ExplorationEngine 与公开 API 契约，未引入新依赖。

## 2. Deliverables

### KnowledgeService（`backend/app/core/knowledge_service.py`，新增 3 个纯投影方法）

- `cross_topic_related(global_id)` — 返回 `global_id` 的直接跨主题邻居（过滤掉同主题端点）。稳定形状：`{id, name, type, global_id, topic, relationship, direction}`。
- `related_topics_for_entity(global_id)` — 返回该实体通过直接跨主题边关联到的主题聚合 `[{topic, cross_topic_edge_count}]`，每条边精确计一次。
- `related_topics_for_topic(topic)` — 返回主题级跨主题连接统计 `[{topic, cross_topic_edge_count}]`，直接读取启动一次的 GlobalGraph，不建立新索引。

以上均为对既有 GlobalGraph 的纯投影：不排序、不调用 ExplorationEngine、不新增存储 / 索引 / 依赖。

### API（`backend/app/main.py`，additive 字段，无新 endpoint）

- `/explore`
  - 新增顶层 `related_topics`（主题级跨主题统计）
  - 新增 `exploration.cross_topic_related`（centered 实体的直接跨主题邻居）
- `/entity`
  - 新增顶层 `related_topics`（该实体的跨主题主题聚合）

既有字段（`related_entities` / `connections_explained` / `relationships[].other` 等）全部保留；`v1 == legacy` 同一 handler 不变。

### Tests

- 新增 `backend/tests/test_cross_topic.py`（11 个测试）：覆盖 3 个方法行为 + API 字段存在性 + `v1 == legacy` + 跨链接实体正向校验。
- 动态 Drift 修复（仅测试断言，0 行业务代码）：`test_core.py` / `test_global_graph.py` / `test_interconnected.py` / `test_validation.py` 中 6 处因 M4-001 数据扩张（4 → 8 topics）产生的硬编码计数漂移，改为从 `KnowledgeService.get_topic_datasets()` / `build_global_validation_report()` 实时推导，对未来数据规模变化可proof。

## 3. Validation

```
pytest
  105 passed
  0 failed
  0 skipped

Validation
  healthy
  Warnings 0
  Errors 0
```

Data（`build_global_validation_report`）：8 topics / 69 entities / 104 relationships / 15 timeline。

## 4. Freeze Compliance

- Entity Types：8（unchanged）
- Relationship Types：18（unchanged）
- Schema：unchanged
- Schema Version：unchanged
- ExplorationEngine：unchanged（`git diff` 为空，确定性引擎零改动）
- Version：unchanged（仍 0.1.0，未 bump）

## 5. Repository Baseline

```
HEAD:         e0c0497
Parent:       3b4046b
Origin:       50b7162
Working Tree: clean
Tag:          v0.1.0 (existing)
Version:      unchanged
```

## 6. Remaining Risks

None blocking.

（注：跨里程碑清理项 —— AIGuidePanel 死重、§4.5 weight 文档偏差、R1 global_id 进 URL 措辞张力 —— 已在 `docs/SUGGESTIONS.md` backlog 跟踪，均不在 M4-002 范围，不阻塞本里程碑收口。）
