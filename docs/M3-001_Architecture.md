# M3-001 Knowledge Core Foundation — Architecture Change Log

> 日期：2026-07-16
> 角色：Principal Software Architect + Staff Backend Engineer
> 性质：**Architecture First（架构升级，非功能新增）**
> 目标：完成后端架构升级，建立 `core/` 知识核心，解耦数据访问，为 M3 后续 Checkpoint 铺路。

---

## 1. 架构变更说明（Architecture Change Log）

| # | 变更 | 说明 | 契约影响 |
|---|------|------|----------|
| 1 | 新增 `backend/app/core/` 知识核心包 | Repository / Registry / Graph / Search / Timeline / Exploration / KnowledgeService 七模块 | 无（内部） |
| 2 | 引入 `TopicRepository` 抽象 + `JsonTopicRepository` 实现 | 数据访问从 `main.py` 下沉到 Repository 层；未来换 Neo4j/Remote 不改 API | 无 |
| 3 | 全局 Registry（Entity / Alias / Global / Topic） | 启动一次性构建多索引，取代散落的 `_ENTITY_INDEX` / 全局 id 查找 | 无 |
| 4 | Graph + Traversal 能力 | `DirectedGraph` + 每主题 `KnowledgeGraph`（BFS / 最短路径 / orphan / cycle） | 无 |
| 5 | `KnowledgeService` Facade | 聚合上述模块，API handler 只做薄投影，避免 God Service | 无 |
| 6 | Validation 改为消费 `KnowledgeService` | `build_global_validation_report(ks)` 复用单主题校验 + 新增跨主题校验；不再自建图 | 无（`/health` 输出完全一致） |
| 7 | Search 抽象为可替换 `SearchProvider` | 依赖 Registry 派生的 index，不与 Knowledge 核心强耦合 | 无（`/search` 输出完全一致） |
| 8 | `main.py` 收敛为组合根（composition root） | 仅做装配 + 请求路由，不含数据结构逻辑 | 无（路由/响应不变） |

**红线守约**：未改公共 API（`/explore` `/entity` `/search` `/health` 响应形状兼容）；未改前端；未引入 Neo4j / LLM / GIS / 第三方图库 / 新依赖；全部 60 个后端测试通过。

---

## 2. 新目录结构

```
backend/
├── app/
│   ├── main.py                 # 组合根：装配 Repository + KnowledgeService，路由 + 薄投影
│   ├── validation.py           # 纯校验库（单主题 + 跨主题 global 校验）
│   ├── core/                   # ★ M3-001 新增：Knowledge Core
│   │   ├── __init__.py         # 统一导出
│   │   ├── repository.py       # Repository 层：TopicRepository(ABC) + JsonTopicRepository + TOPIC_PATTERN
│   │   ├── registry.py         # 全局 Registry：Entity/Alias/Global/Topic + EntityRef
│   │   ├── graph.py            # DirectedGraph + KnowledgeGraph（每主题图 + 遍历/环/孤儿）
│   │   ├── search.py           # build_search_index + SearchProvider（可替换 Provider）
│   │   ├── timeline.py         # TimelineIndex（正规化 + 按年查询）
│   │   ├── exploration.py      # normalize_timeline / build_exploration_view / build_exploration_response
│   │   └── knowledge_service.py# KnowledgeService Facade（聚合上述，零自有算法）
│   └── __init__.py
└── tests/
    ├── test_explore.py         # /explore 契约（未改）
    ├── test_search_entity.py   # /search + /entity（未改）
    ├── test_search_index.py    # 索引一次性构建（未改，兼容 shim）
    ├── test_validation.py      # 单主题校验（未改）
    └── test_core.py            # ★ 新增：core 层单元测试（10 例）
```

前端 `frontend/` **零改动**（本次仅后端架构）。

---

## 3. 模块职责说明

- **`repository.TopicRepository` / `JsonTopicRepository`**：存储无关的数据访问契约。`list_topics` / `load_topic`（带进程内缓存）/ `load_all`。当前实现读 `data/examples/*_example.json`。换存储只需新增一个实现，不碰 Knowledge Layer。
- **`registry.KnowledgeRegistry`**：启动时从 `load_all()` 构建四张索引——`topic → {id→entity}`（Entity 注册表）、`global_id → (topic,id)`（Global 注册表）、`alias(lower) → [(topic,id)]`（Alias 注册表）、`topic → meta`（Topic 注册表）。纯读模型，无 IO。提供 `resolve()`（local id 或 global_id → `EntityRef`）。
- **`graph.DirectedGraph` / `KnowledgeGraph`**：无依赖邻接结构。`KnowledgeGraph` 为每主题构建一张图，端点解析为 local id（支持 `topic:id` 形式 global_id），悬空端点不入图（由 validation 报告）。提供邻居（方向过滤）、BFS、最短路径、孤儿、环检测。
- **`search.build_search_index` / `SearchProvider`**：`build_search_index(registry)` 从 Registry 派生扁平搜索记录；`SearchProvider` 仅依赖该 index 做排名（exact/alias/contains）。Provider 可整体替换为别的排名策略，不耦合存储或 Knowledge Core 其他部分。
- **`timeline.TimelineIndex`**：正规化主题 timeline 并建年索引（`get_by_year` / `get_range`）。输出的正规化条目与现有 API 形状一致（`period` 字符串 + 加法 `date` 对象）。
- **`exploration`**：纯投影函数，把原始 entity/relationship 映射成 `exploration` 视图与 `/explore` 响应。无数据访问、无缓存。
- **`knowledge_service.KnowledgeService`**：Facade。**只聚合、不实现算法**——委托 registry 做查找、graph 做遍历、search 做检索、timeline 做时间、exploration 做投影。公共 API：`list_topics / get_topic_data / get_topic_meta / get_topic_datasets / resolve_entity / find_by_id / find_by_global_id / find_by_alias / find_by_name / get_graph / find_related / get_entity_relationships / get_exploration_view / get_timeline_index / search / get_search_index`。
- **`validation.build_global_validation_report(ks)`**：消费 `KnowledgeService`（不再自建图）。先用既有纯 `build_validation_report(ks.get_topic_datasets())` 跑单主题校验（计数/代码完全兼容 M2-005），再叠加 `_validate_cross_topic`：① 跨主题 `global_id` 唯一性；② 跨主题悬空引用（`topic:id` 形式但全局不可解析）。两者与单主题校验不重叠，不产生重复报告。
- **`main.py`**：组合根。`_repository = JsonTopicRepository(DATA_DIR)`，`knowledge_service = KnowledgeService(_repository)`，启动一次性构建；三个路由委托 `knowledge_service`；保留 `_ENTITY_INDEX` / `_get_entity_index` / `_load_topic_data` / `_exploration_from_data` 兼容 shim 供既有测试导入。

---

## 4. 数据流说明

**启动（一次）**：
`JsonTopicRepository.load_all()` → `KnowledgeRegistry`（四索引）+ `KnowledgeGraph`（每主题图）+ `build_search_index`（搜索记录）+ `TimelineIndex`（每主题）→ `KnowledgeService` 持有；`build_global_validation_report(ks)` → `_VALIDATION_REPORT`（打印 dev 报告）。

**`GET /explore/{topic}`**：
`TOPIC_PATTERN` 校验 → `ks.get_topic_data(topic)`（Repository 缓存命中）→ `build_exploration_response(topic, data)`（core.exploration 投影）→ 200。

**`GET /search?q=`**：
`ks.search(q)` → `SearchProvider.search`（基于已建 index，无 IO）→ `{query, results, count}`。

**`GET /entity/{id}`**：
`ks.resolve_entity(id)`（Registry：local id 或 global_id → `EntityRef`）→ `ks.find_by_id(topic, id)` → 返回 `{summary, timeline: ks.get_timeline_index, relationships: ks.get_entity_relationships, exploration: ks.get_exploration_view}`。所有数据来自内存中的 Registry/Graph，无每请求文件读取。

**`GET /health`**：
返回 `_VALIDATION_REPORT.to_dict()`（启动即构建，无重算）。

> 全部请求路径在启动后**纯内存**，无任何每请求文件系统访问（与 M2-002.5 性能模型一致，且测试 `test_repeated_searches_reuse_index_no_filesystem` 仍通过）。

---

## 5. 测试结果

- 后端 pytest：**60 passed**（原有 50 + 新增 `test_core.py` 10），1 个 Starlette/httpx deprecation warning（与本次改动无关）。
- 启动 dev 报告：`Topics: 2 | Entities: 11 | Relationships: 8 | Timeline: 3 | Warnings: 2 | Errors: 0`，`status=healthy` —— 与 M2-005 契约**逐字节兼容**（含 `DUPLICATE_ALIAS` / `ORPHAN_ENTITY` 两条已知 warning）。
- 前端：**零改动**，vitest 38 / build 51 modules 0 error 维持有效（未触碰）。
- 关键兼容断言确认通过：`/health` 计数、全局 id 查找（`roman_empire:person-augustus`）、alias 查找（`Octavian`）、搜索排名（exact 优先于 contains）、跨主题搜索、导航闭环可解析。

---

## 6. 风险与后续建议

**已实现风险缓解**：
- 兼容 shim（`_ENTITY_INDEX` 等）保留既有测试导入，避免破坏现有测试；建议下一轮（M3-002）视情况移除 shim、把测试改为直接 import `core` / `knowledge_service`。
- `KnowledgeService` 严格"只聚合不实现"，规避 God Service；各算法都在单一职责模块内，可独立单测。

**已知限制 / 后续 Checkpoint（均已记录到 `docs/SUGGESTIONS.md` §O）**：
1. **M3-002 API & Ops Hardening**：当前 `/api/v1` 前缀、统一响应信封、结构化错误（J1/J2）、CI/Docker/`/healthz`（L4）、`CHANGELOG`+tag（L6）未做。Repository/KnowledgeService 已就位，接入成本低。
2. **M3-003 Interconnected Data**：当前数据 **0 条跨主题边**。架构已原生支持 global_id 跨主题解析与 `find_related`/`find_by_alias`，下一步补"互联主题"示例数据（G4）+ 跨主题关系（他主题实体用 `topic:id` 引用）+ 前端跨主题导航。届时 `_validate_cross_topic` 的跨主题校验会真正生效。
3. **M3-004 Search v2**：`SearchProvider` 已可替换；下一步扩展 `TimelineIndex` 的 year/century/period 查询、模糊/语义检索、分页。
4. **M3-005 UI Depth**：Graph / traversal 已在 Knowledge Layer（`find_related` / `get_graph`）。**Graph 可视化（Graph UI）属于此 Checkpoint，本次未做**。
5. **M3-006 Release & CI**：建议补齐 CI/Docker、commit 当前 M2/M3 未提交改动（"统筹考虑"约定延续）。

**明确不提前实现（全 M4+，经 Repository 接口 + KnowledgeService 读模型 + additive 端点扩展）**：
- AI / LLM、Neo4j、GIS/地图、Recommendation、第三方图库。Repository 抽象即为未来切 Neo4j 的接缝——届时新增 `Neo4jTopicRepository` 并替换组合根一处即可，公共 API 与前端契约不变。

---

*附录：本次改动未提交 git（延续"统筹考虑"约定）；后端 Python 3.12 运行环境不变。*
