# M4-002 Cross-topic Enrichment Architecture

> 状态：M4-002-001 Architecture（仅架构设计，无代码、无数据改动、无 Git）
> 日期：2026-07-17
> 角色：History Explorer Lead（M4-002-001 Architecture Phase）
> 前置门禁：M4-001 已 Lead Review + QA + Final Sign-off（Commit `3b4046b`，本地未 push）
> 依赖基线：M3.5-000 Schema Freeze（8 Entity / 18 Relationship）、M3.5-001 GlobalGraph、M3.5-002 Exploration Engine、M3.5-003 Exploration API、M3.5-004 Five-Zone UI
> 团队规范：`docs/TEAM_OPERATING_SPEC_v1.2.md`（Frozen）

---

## 0. 三轮不变量（硬约束，贯穿全文）

1. **Schema Freeze 不可越**：`ENTITY_TYPES = 8`（`Event, Person, Civilization, Location, Time Period, Technology, Religion, Idea`），`RELATIONSHIP_TYPES = 18`（`caused, influenced, participated_in, located_at, related_to, before, after, contemporary_with, part_of, ruled, traded_with, invented, discovered, practiced, spoke, inherited, conquered, spread`）。禁止新增/修改枚举，禁止改动 `global_id = {namespace}:{id}` 规则。
2. **ExplorationEngine 冻结**：引擎只负责确定性 ranking（`explore_from` / `find_connections`），其代码（exploration_engine.py）与评分权重（RELATIONSHIP_MEANING / W_* / TEMPORAL_HALF_LIFE）**本 checkpoint 不触碰**。
3. **Additive API Only**：只允许新增字段；禁止删除、重命名、改变已有字段含义。前端（M4-003）后续消费，本 checkpoint 为纯后端。

---

## 1. Background

### 1.1 M3.5-004 §R2 遗留缺口（本 checkpoint 的立项依据）

M3.5-004 Integration Report §7 R2 明确记录：

> 探索页 Themes 仅同主题：因后端 `exploration.related_entities` 过滤为同主题（additive 约束下可接受）；跨主题线索已由实体页 Themes（`other.global_id`）+ Exploration Paths 覆盖。**（非阻断，建议未来后端增强跨主题 related_entities）**

换言之：M4-001 把图扩展到了 **8 topics / 31 genuine cross-topic edges**，`GlobalGraph` 已将它们合并为一张统一邻接图，但**探索页（`/explore`）的用户响应里，这些跨主题边并没有被当作"直接邻居"暴露**——用户要看到跨主题关联，必须进实体页或读 `connections_explained`（引擎语义，见 §1.2）。

### 1.2 当前 `related_entities` 的语义局限（代码实测）

`backend/app/core/exploration.py:43-82` 的 `build_exploration_view` 在构造 `related_entities` 时：

```python
if source == resolved_id and target in entity_by_id:   # 仅匹配同主题 local id
    other = entity_by_id[target]
    ...
elif target == resolved_id and source in entity_by_id:
    other = entity_by_id[source]
    ...
```

`entity_by_id` 只索引**当前 topic** 的实体。任何跨主题端点（`namespace:id`）都不在 `entity_by_id` 中 → 被静默丢弃。因此：

- 探索页 Related Connections 区（`exploration.related_entities`）**只显示同主题邻居**。
- `connections_explained`（`main.py:121-133` = `knowledge_service.explore_from(global_id)`）回答的是**"经过排序、多跳可达、带 explanation"**的语义——它和"直接跨主题邻居"是**两件不同的事**（见 §3 职责分离）。

### 1.3 目标

让 **Explore API 能直接展示跨主题邻居**（direct cross-topic neighbors），作为探索页 Themes / Related 区的真实结构化数据来源——不依赖前端临时投影、不修改引擎、不改动冻结枚举。

---

## 2. Current Architecture Review

### 2.1 全链路

```
Entity (data/examples/*.json)
        ↓
JsonTopicRepository.load_all()                 # 启动时一次性载入
        ↓
KnowledgeService                                # Facade，聚合各 focused module
        ├─ KnowledgeRegistry (global_id 索引)
        ├─ KnowledgeGraph (per-topic, 丢弃跨主题边)
        ├─ GlobalGraph (M3.5-001, 统一邻接，含跨主题边)   ← 已就绪
        ├─ ExplorationEngine (M3.5-002, 确定性 ranking)   ← 冻结
        ├─ SearchIndex
        └─ TimelineIndex
        ↓
GlobalGraph.neighbors(gid, direction)           # 原始邻接，无排序
        ↓
KnowledgeService.global_neighbors(gid)         # 原始跨主题邻居投影（已存在）
        ↓
API Handler (main.py: explore / entity)         # v1 + legacy 共用同一函数
        ↓
API Response
```

### 2.2 当前 `related_entities` 的限制（关键缺口）

| 维度 | `exploration.related_entities` | `connections_explained` | `relationships[].other` |
|------|--------------------------------|--------------------------|--------------------------|
| 来源 | `build_exploration_view`（同主题过滤） | `explore_from`（引擎） | `get_entity_relationships` |
| 跨主题 | ❌ 丢弃 | ✅ 多跳可达 | ✅ 已带 `global_id`+`topic` |
| 语义 | 直接同主题邻居 | 排序、带 score/explanation 的可达集 | 单条关系的另一端 |
| 在 `/explore` | ✅ 有 | ✅ 有（added M3.5-003） | ❌ 未暴露 |
| 在 `/entity` | ✅ 有 | ✅ 有 | ✅ 有（M3.5-003） |

**缺口结论**：`/explore` 缺少一个"**直接跨主题邻居 + 关联主题**"的结构化字段。M3.5-004 的 Themes 区（跨主题）是**前端临时投影**（基于 `relationships[].other`），不是后端结构化输出；M4-002 把它变成后端事实来源，保持 additive。

---

## 3. Design Decision

### 3.1 采用：KnowledgeService Projection Layer + API Additive Enrichment

在 `KnowledgeService` 上新增**纯投影方法**（只读 `GlobalGraph`，无排序、无新增存储、无新增索引），并在 API handler 中以 additive 字段暴露。

### 3.2 拒绝：方案 B（修改 ExplorationEngine）

| 方案 | 是否采用 | 原因 |
|------|----------|------|
| A. 增强 KnowledgeService（投影） | ✅ | 缺口本质是"结构投影缺失"，不是"排序缺失"；GlobalGraph 已含跨主题边，只需投影 |
| B. 增强 ExplorationEngine | ❌ | 引擎已冻结（M3.5-000 §5）；修改它会触及确定性评分/可解释性红线，且 ranking 与 structural relation 是**不同问题** |
| C. 增加 API additive 字段 | ✅ | 仅暴露既有图结构，不改变 response 形状以外的契约 |
| **A+C（组合）** | ✅ **最终选择** | 投影在 KnowledgeService，暴露在 API；引擎零改动、冻结保持 |

**职责分离原则（明确写死）**：
- **ExplorationEngine** → 负责 *deterministic ranking*（"为什么相关、怎么连"），`connections_explained` 语义不变。
- **M4-002 新增投影** → 负责 *structural projection*（"直接跨主题邻居是谁、连到哪些主题"），无 score、无 explanation、无排序。
- 两者并存，前端（M4-003）在不同区分别消费，互不替代。

---

## 4. New Backend Responsibilities

> 全部基于**已存在的 `GlobalGraph`**（启动时构建一次），**不新增存储、不新增索引、不引入依赖**。新增方法均为 `KnowledgeService` 上的库方法（与 `global_neighbors` / `explore_from` 同级，**不新增 REST 端点**）。

### 4.1 `cross_topic_related(global_id: str) -> list[dict]`

**用途**：返回该实体的**直接跨主题邻居**（任一方向、单跳、直接相连且另一侧 topic 不同）。

**实现**：复用 `global_neighbors(global_id)`，过滤 `node.topic != owning_topic`（owning topic 由 `global_id` 前缀 `namespace:` 解析）。

**输出元素字段**：
```python
{
    "global_id": str,   # 邻居的规范 global_id
    "id": str,          # 邻居 local id
    "name": str,        # 邻居展示名
    "type": str,        # 邻居 entity type（冻结 8 类之一）
    "topic": str,       # 邻居所在 topic（≠ 当前）
    "relationship": str,# 关系类型（冻结 18 类之一）
    "direction": str,   # "outgoing" | "incoming"（相对 global_id）
}
```
**排序**：按 `topic` 再 `relationship` 稳定排序（确定性，无评分）。

### 4.2 `related_topics_for_entity(global_id: str) -> list[dict]`

**用途**：返回该实体所关联到的**其他主题**及其跨主题边计数（主题级聚合）。

**实现**：`cross_topic_related(global_id)` → 按 `topic` 分组计数。

**输出元素字段**：
```python
{"topic": str, "cross_topic_edge_count": int}   # 按 count 降序
```

### 4.3 `related_topics_for_topic(topic: str) -> list[dict]`

**用途**：返回与某 topic **通过跨主题边相连**的其他主题，含边计数与关系类型集合（探索页"关联主题"概览）。

**实现**：遍历 `GlobalGraph` 所有边，凡一端 `topic == 给定 topic` 且另一端 `topic != 给定 topic` 者，按另一端 topic 聚合；收集去重的 `relationship` 类型。

**输出元素字段**：
```python
{
    "topic": str,                  # 关联主题
    "cross_topic_edge_count": int, # 两主题间跨主题边总数
    "relationship_types": [str],   # 这些边用到的关系类型（冻结 18 类子集）
}
```
**排序**：按 `cross_topic_edge_count` 降序，再 `topic` 稳定排序。

### 4.4 复用约束

- 不调用 `ExplorationEngine` 任何方法。
- 不修改 `global_graph.py` / `exploration_engine.py` / `exploration.py`。
- 不修改 `validation.py` 枚举。
- 方法签名稳定，纳入 `KnowledgeService` 公共 API 文档（见 M4-002-005 Integration Report）。

---

## 5. API Contract

> 端点路线与 operation_id 不变（M3.5-003 已冻结：`/explore/{topic}`、`/entity/{entity_id}` 在 `/api/v1` 与 legacy 共用同一 handler，`v1==legacy` 必须保持）。
> 仅 **additive** 新增字段；所有既有字段（含 `exploration`、`connections`、`connections_explained`、`relationships[].other`、`timeline`、`entities`）**保留不变**。

### 5.1 `GET /explore/{topic}`

新增（顶层）：
```json
"related_topics": [
  { "topic": "silk_road", "cross_topic_edge_count": 4 },
  { "topic": "hellenistic_world", "cross_topic_edge_count": 3 }
]
```
新增（嵌套于 `exploration`）：
```json
"exploration": {
  "main_entity": { ... },
  "related_entities": [ ... ],            // 既有，不变
  "cross_topic_related": [                // 新增
    { "global_id": "silk_road:silk_road", "id": "silk_road",
      "name": "Silk Road", "type": "Technology",
      "topic": "silk_road", "relationship": "traded_with", "direction": "outgoing" }
  ]
}
```

挂载位置：`explore()` handler（`main.py:136-157`）在 `body` 已生成后、return 前，additive 注入 `body["related_topics"]` 与 `body["exploration"]["cross_topic_related"]`（值来自 `related_topics_for_topic(topic)` 与 `cross_topic_related(main_entity.global_id)`）。`main_entity.global_id` 在 `build_exploration_view` 输出中已携带（实体原始 dict 含 `global_id`）。

### 5.2 `GET /entity/{entity_id}`

新增（顶层）：
```json
"related_topics": [
  { "topic": "silk_road", "cross_topic_edge_count": 1 }
]
```
既有 `relationships[].other.{global_id, topic}`、`connections_explained`、`exploration` 等**不变**。

挂载位置：`entity()` handler（`main.py:175-208`）在 return dict 中 additive 注入 `related_topics`（值来自 `related_topics_for_entity(global_id)`）。

### 5.3 Backward Compatibility 保证

- 无字段删除 / 重命名 / 语义变更。
- `v1==legacy`：两路由指向同一 `explore` / `entity` 函数，新增字段天然同时出现在两个版本。
- 现有 `test_api_v1.py`（`v1==legacy` + 字段存在性）维持绿色；任何"闭集键"断言松绑为子集断言。

---

## 6. Data Flow

```
JSON Data (data/examples/*.json)
        │  (JsonTopicRepository.load_all, 启动一次)
        ▼
KnowledgeService
        │
        ▼
GlobalGraph  (M3.5-001, 统一跨主题邻接, 构建一次)
        │
        ▼
Cross-topic Resolver  ←【M4-002 新增，纯投影】
   · cross_topic_related(gid)
   · related_topics_for_entity(gid)
   · related_topics_for_topic(topic)
   （只读 GlobalGraph，无排序/无存储）
        │
        ▼
KnowledgeService (facade 聚合)
        │
        ▼
Exploration API (additive 字段: related_topics / exploration.cross_topic_related)
```

`ExplorationEngine` 不在此数据流中——它仍独立服务 `connections_explained`（多跳排序），与本项目的新增投影并行不悖。

---

## 7. Freeze Compliance Review

| 冻结维度 | 状态 | 说明 |
|----------|------|------|
| Entity Types | ✅ 不变（8） | 仅**暴露**既有实体的 `type`；不新增/修改枚举 |
| Relationship Types | ✅ 不变（18） | 仅**暴露**既有关系的 `type`；不新增/修改枚举 |
| `global_id` 规则 | ✅ 不变 | 格式 `namespace:id` 仅用于数据/响应，不进入新 URL（路由正则 `^[a-z0-9_-]+$` 不变） |
| ExplorationEngine | ✅ 不触碰 | exploration_engine.py 不在 M4-002 改动范围；新增投影零调用引擎 |
| Frontend | ✅ 不触碰 | 本 checkpoint 纯后端；M4-003 后续消费新增字段 |
| Team Spec | ✅ 不触碰 | 遵循 v1.2 Frozen；无规范变更 |
| 依赖 | ✅ 零新增 | 纯 stdlib + 既有 `GlobalGraph`；无 Neo4j/GraphQL/ORM/Redis/ML/GIS |
| 存储 / 索引 | ✅ 零新增 | 复用启动时一次性构建的 `GlobalGraph` |

---

## 8. Testing Strategy

### Backend（M4-002-003 落地）

1. **Validation tests**：运行 `build_validation_report` + `build_global_validation_report`，断言 `status=healthy` / `warnings=0` / `errors=0`（对 M4-001 基线零回归）。
2. **GlobalGraph / Projection tests**（新增 `backend/tests/test_cross_topic.py`）：
   - `cross_topic_related`：对含跨主题边的实体，断言返回项 `topic != owning_topic`、字段完整、计数与 `GlobalGraph` 实际跨主题边一致。
   - `related_topics_for_entity`：主题去重 + 计数正确、降序。
   - `related_topics_for_topic`：两主题间跨主题边数正确、`relationship_types` 为冻结 18 类子集。
   - **确定性**：同输入多次运行结果稳定（无随机）。
3. **API contract tests**（新增 `test_cross_topic_api.py`）：
   - `/explore/{topic}` 含 `related_topics`（非空，因 M4-001 有 31 跨主题边）与 `exploration.cross_topic_related`。
   - `/entity/{entity_id}` 含 `related_topics`。
   - 既有字段（`exploration`、`connections`、`connections_explained`、`relationships[].other`）**逐字段存在**。
   - `/api/v1/...` 与 legacy 响应在新增字段上完全一致（`v1==legacy`）。

### Regression（必须保持绿色）

- `backend/tests/test_exploration_engine.py` — 引擎确定性不变。
- `backend/tests/test_api_v1.py` — API 契约（additive 后子集断言）。
- `backend/tests/test_global_graph.py` — 图结构不变。
- 全量 `pytest` 基线保持 94+ passed（M4-001 后），新增测试累加。

---

## 9. Risk Assessment

| ID | 风险 | 缓解 |
|----|------|------|
| **R1** | `cross_topic_related` 与 `connections_explained` **语义混淆**（前端误把排序可达集当直接邻居，或反之） | 职责分离写死（§3.2）：前者=结构投影（无 score），后者=引擎排序（有 score/explanation）。文档明确；前端（M4-003）分区分用；M4-002-005 集成报告附字段语义对照表 |
| **R2** | **API backward compatibility** 被破坏（误删/改名/改语义） | additive-only（§0.3）；`test_api_v1.py` 字段存在性 + `v1==legacy` 双门禁；任何闭集键断言松绑为子集 |
| **R3** | **引擎被意外修改**（误在 KnowledgeService 投影里调用/改引擎） | 投影方法零 import `ExplorationEngine`；`test_exploration_engine.py` 绿为硬性门禁；Code Review 检查 import 清单 |
| **R4** | **性能影响**（每请求重复遍历大图） | 投影为 O(邻居数) 针对单实体 / O(全图边) 仅 `related_topics_for_topic` 且 ≤104 边，单次请求毫秒级；复用启动构建的 `GlobalGraph`，无每请求重建、无新索引 |
| **R5** | Schema freeze violation（误增枚举） | §0.1 + §7 冻结表；新增方法只读既有关系/实体类型，不改 `validation.py` |

---

## 10. M4-002 Sub-checkpoint 拆分（实施阶段参考）

| 子任务 | 目标 | 交付 |
|--------|------|------|
| M4-002-001 Architecture | 本文件 | `docs/M4-002_Architecture.md`（仅文档） |
| M4-002-002 Backend Implementation | 落地 §4 三方法 + §5 handler additive 注入 | `knowledge_service.py` / `main.py` |
| M4-002-003 Validation | 单测 + 全量回归 | `backend/tests/test_cross_topic.py` / `test_cross_topic_api.py` |
| M4-002-004 QA | 独立 QA（v1.2 铁律：证据优先、不采信自报） | QA Review Summary |
| M4-002-005 Commit | 本地 commit（无 push 除非授权） | `feat(backend): add cross-topic enrichment to exploration API` |

---

## 11. 下一阶段入口（M4-002-002）

满足以下条件后，由 Backend Role 进入 M4-002-002：

1. 本架构文档经 Lead 批准（用户拍板）。
2. 冻结枚举 `ENTITY_TYPES=8` / `RELATIONSHIP_TYPES=18` 在 `validation.py` 实测不变（本轮已确认）。
3. 不修改 `exploration_engine.py` 的硬约束写入实施 PR 描述。
4. additive-only 与 `v1==legacy` 门禁写入实施验收清单。

> 本文件为 M4-002-001 唯一产物：**仅新增 `docs/M4-002_Architecture.md`，无代码/数据改动，无 git add/commit/push。**
