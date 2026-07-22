# M9-001 Deterministic Next-Node Recommendation Engine — Design Specification

> 文档状态：DESIGN（仅规范，不含实现）。依赖基线：v0.10.1 / M9-000 Planning Baseline（Status: PLANNING）。
> 本文件为 M9-001 唯一设计规范入口。所有内容符合 M8.8 后真实状态与 CURRENT_ARCHITECTURE_BASELINE。
> 本文禁止修改任何代码；涉及的代码路径仅用于描述现状与设计边界。

---

## 1. Overview

M9-001 在冻结架构边界内，于现有确定性 Exploration Engine 之上新增一层 **Deterministic Next-Node Recommendation Engine**：从"用户当前所在的实体"出发，产出一组**可解释、可测试、可复现**的"下一站"推荐，让产品 DNA 定义的 "Infinite Exploration" 真正形成闭环。

本引擎**不**是机器学习推荐系统，不建模用户偏好，不引入任何学习或生成式机制。它是对图结构 + 史学界时间 + 主题信号应用**固定公式**的确定性排序器，是现有 `explore()` 排名能力的有意延伸与产品化。

---

## 2. Background

### 2.1 Design Context Summary（Phase 0 审计结论）

| 审计项 | 现状（真实） |
|---|---|
| Exploration Engine 位置 | `backend/app/core/exploration_engine.py`，`class ExplorationEngine` |
| 核心入口 | `explore(gid, max_depth=2, limit=20)` → `list[ExploredNode]`（按分数排序）；`find_connections(src, tgt)` → 两实体间路径 |
| 结果结构 | `ExploredNode = {global_id, depth, path, steps, score, score_breakdown, explanation}`；`PathStep = {from_global_id, to_global_id, relationship, direction, weight}` |
| 四维评分（真实常量） | `relationship_meaning 0.35` + `temporal_coherence 0.25`（半衰期 500 年）+ `entity_importance 0.20` + `path_simplicity 0.20` |
| 查表（冻结） | `RELATIONSHIP_MEANING`（18 关系类型，权重 0.4–1.0）、`TYPE_IMPORTANCE`（8 实体类型，0.6–1.0） |
| API 形态 | 无 Pydantic response model，全部 `return dict`；端点 `/explore/{topic}`、`/entity/{entity_id}`、`/search`、`/topics`、`/health` |
| 现有推荐逻辑 | **不存在**。全仓库无 `recommend`/`suggest`/`next_node` 函数或端点 |
| 前端展示 | `ContinueExploringPanel.tsx` 仅按引擎原序渲染 `connections_explained` 前 5 条、打 seen 标记，**绝不重排/打分**；`RelatedEntityList.tsx` 为扁平链接列表（无分数） |
| Entity JSON 字段 | `id, type, name, description, global_id, aliases, labels, start_date, end_date, source, evidence, reliability, location, participants, causes, consequences` |
| Relation JSON 字段 | `source, target, type, confidence, citation, evidence, valid_time, weight`（示例中 `weight`/`confidence` 均为 null） |
| 冻结枚举 | `ENTITY_TYPES` = 8（Event/Person/Civilization/Location/Time Period/Technology/Religion/Idea）；`RELATIONSHIP_TYPES` = 18 |
| 数据规模 | 8 topics / 69 entities / 104 relations / 31 cross-topic edges |

### 2.2 问题空间

用户进入实体页后，现有系统提供的是"Related Entities 列表"或引擎排序的"可达节点"。两者都缺少：
- **"为什么推荐这个"** 的可解释理由（在用户探索语境下，而非纯图路径解释）
- **"下一步去哪"** 的明确引导（按探索价值而非纯图距离排序）

M9-001 填补这一缺口，复用现有图评分原语，叠加探索专属信号。

---

## 3. Goals

1. 为任意当前实体产出确定性、可复现的"下一站"推荐集合（默认 top 5）。
2. 每个推荐必须可解释：输出人类可读的 `reasons[]` 与 `relation_path`。
3. 推荐分数必须可测试、可快照回归（同输入 → 同输出）。
4. 完全复用冻结评分原语（`RELATIONSHIP_MEANING` / `TYPE_IMPORTANCE` / 时间半衰期 500），不重新定义这些值。
5. 作为 additive 层接入，不修改现有 `explore()` / `find_connections()` 行为与分数。

---

## 4. Non Goals

M9-001 **不包含**、明确禁止：

- AI runtime / LLM / RAG / embedding / 向量数据库
- 用户偏好建模、协同过滤、机器学习排序
- Neo4j / PostgreSQL / Elasticsearch 等外部存储或检索引擎
- GIS / Map 渲染
- 修改 `ENTITY_TYPES` / `RELATIONSHIP_TYPES` 枚举
- 修改 `CURRENT_ARCHITECTURE_BASELINE.md` 冻结规则
- 修改现有 `explore()` / `find_connections()` 评分公式
- 引入任何新依赖
- 修改 frontend 代码（本规范仅描述前端集成边界）

上述禁项约束来源见 `docs/10_ARCHITECTURE/CURRENT_ARCHITECTURE_BASELINE.md`。

---

## 5. Architecture Boundary

```
                 ┌─────────────────────────────────────────────┐
                 │  M9-001 Recommendation Layer (ADDITIVE)      │
                 │                                              │
   current_entity│  Candidate Generation → Ranking → Explain   │
        ─────────┼──────────────┐                               │
                 │              ▼                               │
                 │   reuse      ExplorationEngine              │
                 │  (frozen)    (explore / find_connections /  │
                 │              RELATIONSHIP_MEANING /         │
                 │              TYPE_IMPORTANCE / temporal)    │
                 └──────────────┬──────────────────────────────┘
                                │ returns
                                ▼
                   RecommendationResult (new contract)
                                │
                   API: /entity/{id}/recommendations  (new, additive)
                                │
                   Frontend: RecommendationPanel (future, design-only)
```

- **输入边界**：当前实体 `global_id` + 可选 `seen_global_ids`（已访问集合，用于多样性惩罚）+ 可选 `max_results`（默认 5）。
- **输出边界**：`RecommendationResult`（见 §10）。
- **复用边界**：只读调用 `ExplorationEngine` 现有方法与冻结常量；M9-001 新增的权重常量独立命名（前缀 `REC_W_`），**不**覆盖冻结的 `W_RELATIONSHIP` 等。
- **不变边界**：现有 `/entity/{id}` 响应、`explore()` 输出、`freeze-check` 守护均不受影响。

---

## 6. Algorithm Design

整体流程（确定性、无随机）：

```
Input: current_entity, seen_global_ids={}, max_results=5
  1. Candidate Generation      → candidate_set (dedup)
  2. Per-candidate Scoring      → (relationship_weight, timeline_relevance,
                                    theme_connection, exploration_diversity)
  3. Composite Ranking          → score = Σ wᵢ · componentᵢ
  4. Explainability Generation  → reasons[], relation_path
  5. Sort + Truncate            → top max_results
Output: RecommendationResult
```

所有步骤为纯函数，无 I/O、无时间戳参与排序（时间戳仅作 `metadata`，不影响确定性）。

---

## 7. Candidate Generation

候选节点来源（全部来自现有图，确定性）：

1. **Direct relations**（核心）：`explore(current, max_depth=1)` 的直接邻居 —— 关系含义最高、最该优先。
2. **Cross-topic relations**：`knowledge_service.cross_topic_related(current)` 返回的跨主题邻居 —— 释放跨主题发现价值。
3. **Timeline neighbors**：同 topic 内与当前实体时间相邻（按 `start_date`/`end_date` 代表性年份，时间差 ≤ 半衰期 500 年）的实体，经 `before`/`after`/`contemporary_with` 边或日期邻近获得。
4. **Thematic neighbors**：与当前实体重合 `topic` 或共享 `labels`/跨主题边的实体。
5. **Second-hop（可选、降权）**：`explore(current, max_depth=2)` 中 depth=2 的节点，作为补充候选，排名时由 `path_simplicity` 类信号自然压低。

**去重与过滤**：合并上述来源 → 去重（按 `global_id`）→ 排除 `current_entity` 自身 → 形成 `candidate_set`。

**约束**：候选仅来自现有图结构（直接关系、跨主题关系、时间相邻、主题重合），不引入任何外部生成或语义检索机制（此类能力属冻结红线，见 §4 / §13）。

---

## 8. Ranking Model

### 8.1 复合公式

```
RecommendationScore = 
    REC_W_RELATIONSHIP * RelationshipWeight
  + REC_W_TIMELINE     * TimelineRelevance
  + REC_W_THEME        * ThemeConnection
  + REC_W_DIVERSITY    * ExplorationDiversity
```

各分量值域 `[0, 1]`，权重和为 1.0，故 `RecommendationScore ∈ [0, 1]`。

### 8.2 字段与来源

| 分量 | 值域 | 来源 | 默认值/公式 |
|---|---|---|---|
| `RelationshipWeight` | [0.4, 1.0] | 当前实体→候选的**最佳直接边**的 `RELATIONSHIP_MEANING[type]`（复用冻结查表；若边带非 null `weight` 则以其覆盖） | `max(RELATIONSHIP_MEANING.get(e.type, 0.4))` |
| `TimelineRelevance` | [0.5, 1.0] | 复用引擎时间连贯性公式：`1 / (1 + gap / 500)`，gap = 两实体代表性年份差 | 半衰期 500（冻结常量，不重定义） |
| `ThemeConnection` | [0, 1.0] | 同 topic +0.5；存在跨主题边 +0.3；共享 `labels` 每共用标签 +0.1（封顶 1.0） | 见 §8.3 |
| `ExplorationDiversity` | [0.2, 1.0] | 见 §8.4（已访问惩罚 + 类型新颖性） | 见 §8.4 |

### 8.3 权重与默认值（M9-001 新增 additive 常量）

```
REC_W_RELATIONSHIP = 0.40
REC_W_TIMELINE     = 0.25
REC_W_THEME        = 0.20
REC_W_DIVERSITY    = 0.15
DEFAULT_MAX_RESULTS = 5
```

> 注：以上 `REC_W_*` 为 M9-001 **新增**常量，独立命名，不修改引擎冻结的 `W_RELATIONSHIP=0.35 / W_TEMPORAL=0.25 / W_IMPORTANCE=0.20 / W_SIMPLICITY=0.20`。`RelationshipWeight` 复用冻结的 `RELATIONSHIP_MEANING` 查表值，但被 M9-001 以不同权重组合进推荐分数。

### 8.4 分量函数

```python
# 伪代码（设计意图，非实现）
def theme_connection(current, candidate):
    s = 0.0
    if current.topic == candidate.topic:
        s += 0.5
    if cross_topic_edge_exists(current.topic, candidate.topic):
        s += 0.3
    shared = set(current.get("labels", [])) & set(candidate.get("labels", []))
    if shared:
        s += 0.2 * min(len(shared), 2) / 2   # 封顶 0.2
    return min(s, 1.0)

def exploration_diversity(candidate, recommended_so_far, seen_set):
    if candidate.global_id in seen_set:
        return 0.2                      # 已访问：强惩罚但仍保留于池
    type_counts = Counter(r.entity_type for r in recommended_so_far)
    n = type_counts.get(candidate.type, 0)
    if n >= 2:  return 0.6              # 该类型已推荐 2+，降权
    if n == 1:  return 0.85             # 该类型已推荐 1，轻微降权
    return 1.0                          # 新颖类型，满分
```

`TimelineRelevance` 与 `RelationshipWeight` 直接复用 `exploration_engine.py` 中 `_temporal_coherence` 与 `RELATIONSHIP_MEANING`（只读调用/查表）。

---

## 9. Explainability Model

每个推荐项必须输出可解释内容，由分量值**模板化生成**（纯字段映射，不调用任何生成式模型）：

```json
{
  "target_entity": { "global_id": "roman:person-augustus", "name": "Augustus", "type": "Person" },
  "score": 0.82,
  "score_breakdown": {
    "relationship_weight": 0.90,
    "timeline_relevance": 0.75,
    "theme_connection": 0.60,
    "exploration_diversity": 1.0
  },
  "reasons": [
    "通过关系 'influenced' 直接相连（关系含义 0.90）",
    "时间相近（相差约 120 年，时间连贯性 0.75）",
    "同属主题 'Roman Empire' 且存在跨主题边",
    "类型 Person 尚未推荐，丰富探索多样性"
  ],
  "relation_path": [
    { "from": "roman:event-...", "to": "roman:person-augustus",
      "relationship": "influenced", "direction": "outgoing", "weight": 0.90 }
  ],
  "metadata": { "depth": 1, "candidate_source": "direct_relation", "entity_type": "Person" }
}
```

**Reasons 生成规则（确定性）**：
- `RelationshipWeight ≥ 0.8` → "通过强关系 'X' 直接相连（关系含义 0.9x）"
- `TimelineRelevance ≥ 0.7` → "时间相近（相差约 N 年，时间连贯性 0.x）"
- `ThemeConnection > 0` → "与当前实体共享主题/跨主题连接"
- `ExplorationDiversity == 1.0` → "类型新颖，丰富探索多样性"
- 候选在 `seen_set` 中 → 追加"（已访问，权重降低）"

`relation_path` 取连接当前实体到候选的**最优路径**（`find_connections` 或 `explore` 的 `steps`），保证用户能看清"为什么相关"。

---

## 10. Data Contract

### 10.1 RecommendationResult（新增结构，additive）

```json
{
  "current_entity": { "global_id": "roman:event-x", "name": "X", "type": "Event" },
  "recommendations": [ /* RecommendationItem × top N */ ],
  "algorithm_version": "m9-001.v1",
  "parameters": {
    "max_results": 5,
    "weights": { "relationship": 0.40, "timeline": 0.25, "theme": 0.20, "diversity": 0.15 }
  },
  "metadata": { "generated_at": "<iso-ts>", "candidate_count": 23 }
}
```

`RecommendationItem` = §9 中的 `{target_entity, score, score_breakdown, reasons, relation_path, metadata}`。

### 10.2 API 兼容性

当前 `/entity/{id}` 已返回 `connections_explained` / `exploration.related_entities`，M9-001 为**纯新增**，不修改既有契约。两种接入方式（设计建议，二选一，均向后兼容）：

- **方案 A（推荐）**：新增端点 `GET /entity/{id}/recommendations?limit=5&seen=`（additive route）。优点：职责清晰、易单测、不膨胀现有响应。
- **方案 B**：在 `/entity/{id}` 响应新增键 `recommendations`（additive key）。优点：一次请求拿全；缺点：响应变大。

> 本规范**仅记录设计建议，禁止修改代码**。无论方案 A/B，均不破坏现有客户端（新增键/新端点，旧字段不变）。若采用方案 A，建议为新端点定义 `RecommendationResult` 的 Pydantic/ dataclass 模型（additive），与现有无 Pydantic 风格并存不冲突。

---

## 11. Frontend Integration（设计-only）

**消费目标**：`RecommendationPanel.tsx`（未来新增，或扩展现有 `ContinueExploringPanel.tsx`）。

展示要素（来自 `recommendations[]`）：
- **Next Destination**：`target_entity.name` + `type` 徽标
- **Why Recommended**：取 `reasons[0..2]` 渲染为可读条目
- **Relationship**：取 `relation_path[0].relationship` 及 `direction`

交互：点击 → 复用现有 `onEntityClick(global_id)` 导航（与 `RelatedEntityList` 行为一致）。
约束：前端**不做任何重排/打分**（保持确定性）；`seen_global_ids` 由前端 localStorage 的访问历史提供，作为参数传入，不在前端重算分数。

> 明确禁止修改 frontend 代码；本节仅为集成边界设计，供 M9-002 实施参考。

---

## 12. Testing Strategy

### 12.1 Deterministic Test
固定 `(current_entity, seen_global_ids, parameters)` → 输出 `recommendations` 必须逐字节一致（快照测试）。无随机、无时钟依赖参与排序。

### 12.2 Ranking Test
构造：候选 A（直接 `influenced` 边 + 时间相近 + 同 topic）vs 候选 B（depth=2、`related_to` 边 + 时间远）。断言 `A.score > B.score` 且 A 排序在前。

### 12.3 Explainability Test
对 top N 每个推荐，断言 `reasons` 非空且至少含 1 条；断言若存在直接边则 `relation_path` 非空。

### 12.4 Regression Test
- 现有 `explore()` / `find_connections()` 输出与基线快照一致（M9-001 不改动其代码/分数）。
- `scripts/freeze-check.mjs` 通过（枚举守卫 8/18 不变）。
- 新模块为 additive：`import` 现有引擎，无对 `exploration_engine.py` 的修改。
- 全套 backend pytest + frontend vitest 保持 green。

---

## 13. Freeze Compliance

M9-001 满足：
- **Freeze Baseline unchanged**：不修改 `CURRENT_ARCHITECTURE_BASELINE.md`；不引入 AI/LLM/DB/GIS/登录/权限/新依赖。
- **Schema unchanged**：`ENTITY_TYPES`/`RELATIONSHIP_TYPES` 枚举不动；Relation/Entity JSON 结构不动。
- **Dependency unchanged**：纯标准库 + 现有依赖，无新增。
- **Runtime architecture unchanged**：仍确定性、内存图，无外部服务。

**关于冻结红线中 "Recommendation" 项的说明**：M2 freeze 将 "Recommendation" 列为 out-of-scope，其本意是禁止 **AI/ML 驱动的推荐 runtime**（与 AI/LLM 同组）。M9-001 是**确定性图排序**（复用冻结评分原语、固定公式、无学习），不引入推荐 runtime/服务，因此不触发该红线的 AI/ML 语义。本范围已由 **M9-000 Planning Baseline（Product Owner 批准）** 明确授权为 M9 主题；M9-000 Decision Record 判定 "ADR 暂不需要"（因完全处于基线内）。若未来任一变更延伸到 AI/ML 推荐，须另走 **ADR + Freeze Revision Gate**。

---

## 14. Risks

| 风险 | 缓解 |
|---|---|
| 推荐算法复杂度增加 | 保持确定性纯函数；候选集受 `max_depth`/`max_results` 有界；复杂度 O(candidates) |
| 数据扩展导致质量下降 | 保持 `validation` 0 warnings；新增数据仍受冻结 schema 校验 |
| UI 复杂度增加 | 增量交付（M9-002）；前端仅渲染，不重排 |
| "Recommendation" 红线语义歧义 | 见 §13 说明；M9-000 已授权；任何延伸至学习/生成式能力须走 Gate |
| 时间/主题信号缺失时退化 | `TimelineRelevance`/`ThemeConnection` 缺数据时取保守默认值，分数仍由 `RelationshipWeight` 主导，不崩坏 |

---

## 15. Future Extension

- **M9-002**：将 `RecommendationResult` 接入 `RecommendationPanel`（frontend-only）。
- **M9-003**：结合前端访问历史（`seen_global_ids`）做连续路径导航。
- **Gated Future（需 ADR + Freeze Revision Gate）**：若引入 AI/LLM 解释层、Neo4j 图库、GIS/Map 渲染、Elasticsearch 检索，须先修订冻结红线并经 Product Owner 批准。当前 M9-001 不为这些预留运行时依赖。

---

*Design established: 2026-07-22. Status: DESIGN. Awaiting M9-001 implementation phase approval.*
