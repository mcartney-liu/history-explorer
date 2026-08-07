# P1-03 Capability Boundary — 能力边界

> FRW Phase 1 Capability Validation · Task 3
> 作者：架构师
> 日期：2026-08-07
> 依据：Product_Constitution v2.0 Article 0 / ADR-0013 / ADR-0014 / FRW-Phase0-ProductDiscovery-v2
> 核查方式：实地阅读 `backend/app/**/*.py`、`backend/tests/*.py`、`data/*.json`。不从 `frontend/src` 推导能力身份。

---

## 0. 本文档要解决的问题

能力污染是重构项目最常见的死法：一个能力开始"顺便"做另一个能力的事，两年后没人说得清谁负责什么，改一处炸三处。

本文档为每个真实产品能力写死两件事：

- **负责什么**（Owns）：这个能力必须做，别人不能替它做。
- **不负责什么**（Does NOT own）：这个能力绝对不做，做了就是污染。

判定原则：**能力由"回答哪个用户问题"定义，不由"哪个接口/页面/组件实现"定义。** 一个能力可以没有任何接口（如 Cognitive Mirror），一个接口也可以同时污染三个能力（本文档记录了三例）。

### 0.1 边界written的三条硬规则

1. **一个用户问题只能有一个能力负责。** 出现两个能力都声称回答同一问题，即为冲突，转 P1-05。
2. **能力不得越层。** L(n) 只能消费 L(n-1) 的输出，不得跳层直取。跳层即污染。
3. **能力不得反写上游。** 解释不得改写事实，理解不得改写解释，运行时不得改写理解。

---

## 1. 能力清单总览

按五层模型 + Cognitive Mirror + 横切归位。"运行时状态"一列基于实地核查，不采信文档声明。

| 能力 | 层 | 回答的用户问题 | 运行时状态（实地） |
|------|----|--------------|------------------|
| Fact | L1 | 这是真的吗 | 已上线 |
| Relationship | L1 结构 / L3 语义 | 它和什么有关 | 结构已上线；语义未接线 |
| Timeline | L1 投影 | 它在什么时候 | 已上线（只读全量） |
| Map | L1 投影 | 它在哪里 | 后端零实现 |
| Search | L1 检索 | 我要找的那个东西在哪 | 已上线 |
| Evidence | L1 佐证 | 凭什么这么说 | 已加载，仅内部消费 |
| Source | L1 佐证 | 这话谁说的 | 已加载，仅内部消费 |
| Provenance | L1 投影 | 这条结论能追到哪 | 已上线（独立端点） |
| Explanation | L2 | 为什么会这样 | 模板句已上线；因果层未接线 |
| Question / QA | L2 入口 | 我想问一句 | 已上线（AI 默认关闭，走确定性兜底） |
| Understanding | L3 | 这个连接对我为什么重要 | 数据 12 条，零读取者 |
| Comparison | L3 | 两个文明这件事上有什么不同 | 仅有跨主题连通度，无对比能力 |
| Memory / Context | L4 | 我上次走到哪了 | 后端明文无状态；前端持有 |
| Trail | L4 | 我走过哪些地方 | 后端零实现 |
| Explore | L4 横切 | 接下来还能往哪走 | 已上线 |
| Navigation | L5 | 我现在在哪、怎么回去 | 后端零实现 |
| Package | 横切 | 给我一条成型的探索线 | 后端零实现，数据直入前端 |
| Guide | 横切 | 带我走一遍 | 后端零实现 |
| Bookmark | 横切 | 我想留住这个 | 全栈零实现 |
| Cognitive Mirror | 待定层 | 我到底对什么感兴趣、我是怎么学的 | 全栈零实现（仅契约） |
| **Recommendation** | **禁止项** | （系统替我决定下一步） | **三处已上线，见 P1-05** |

---

## 2. L1 事实层能力边界

### 2.1 Fact 事实

**回答**：这是真的吗。世界上存在过什么人、什么事、什么文明、什么地点、什么技术、什么宗教、什么观念、什么时段。

| | 内容 |
|---|---|
| **负责** | 持有唯一事实真相；实体身份与全局唯一标识；类型归属（8 类冻结）；事实级校验与拒绝；跨主题实体同一性判定 |
| **不负责** | 不解释因果；不排序；不判断重要性；不判断可信度；不知道用户是谁；不知道用户看过什么 |

**污染红线**：任何写入 Fact 的路径都必须是人工策展的静态数据。AI 永远不是事实来源（M74 Trust Boundary）。Fact 层出现 score / confidence / rank 字段即为污染。

**实地锚点**：`backend/app/core/repository.py`、`registry.py`、`validation.py`（`ENTITY_TYPES` 8 项、`RELATIONSHIP_TYPES` 18 项冻结）。9 个主题 / 145 实体 / 211 关系。

**边界争议**：`/entity/{id}` 响应把整个原始实体 dict 塞进 `summary` 字段（`main.py:240`）。这使得 Fact 层的内部形状直接外泄到 L5，任何数据结构调整都会震荡前端。这是 Fact 能力的边界渗漏，不是 Fact 的职责扩张，记入 P1-05。

---

### 2.2 Relationship 关系

**回答**：它和什么有关，以及是哪一种"有关"。

这个能力必须**一分为二**，否则必然污染：

**Relationship-结构（L1）**

| | 内容 |
|---|---|
| **负责** | 邻接结构；方向性；关系类型归属（18 类冻结）；跨主题边的统一寻址；最短路径与可达性 |
| **不负责** | 不说这条关系重不重要；不说这条关系为什么成立；不排序；不做导航决策 |

**Relationship-语义（L3）**

| | 内容 |
|---|---|
| **负责** | 承载策展人判断"理解 A 有助于理解 B"；四类语义关系（institutional_evolution / technological_chain / civilization_contrast / ideological_influence） |
| **不负责** | 不是图边，不进图遍历，不参与任何打分（M85.1 Relationship ≠ Edge） |

**污染红线**：语义关系一旦被塞进图遍历，M85.1 防火墙即崩塌，"策展判断"退化为"另一种边"，L3 层消失。

**实地锚点**：结构在 `core/graph.py` + `core/global_graph.py`（后者文件头自述 "Pure graph structure ONLY: NO ranking, NO recommendation"，边界写得很干净）。语义在 `core/causal/causal_object.py` 的 `RelatedCausalObjectRef`，其 docstring 明确写 "NOT a KG edge wrapper / NOT an AI-generated recommendation / NOT a navigation hint"。

**当前实况**：语义侧数据 `data/causal_objects.json` 共 12 条，**全代码库零读取者**。边界定义清晰，能力未通电。

---

### 2.3 Timeline 时间

| | 内容 |
|---|---|
| **负责** | 把事实投影到时间轴；时间值归一化（v1 字符串 / v2 结构化并存）；按年份分桶与区间检索 |
| **不负责** | 不排序重要性；不做因果推断（"先发生"不等于"导致"）；不解释；不决定用户下一步看哪段时间 |

**污染红线**：`before` / `after` 是关系类型，不是因果。Timeline 若开始输出"因此"，即侵占 Explanation。

**实地锚点**：`core/timeline.py`。`get_by_year()` / `get_range()` 已实现但**未被任何端点消费**——`/entity/{id}` 只吐 `get_all()`（`main.py:241`）。能力比暴露面大。

---

### 2.4 Map 空间

| | 内容 |
|---|---|
| **负责** | 把事实投影到空间；地点归属；空间关系（若未来实现） |
| **不负责** | 不做路径规划；不做地理计算；不做疆域推演 |

**实地锚点**：后端 `grep coordinates|latitude|longitude|geo` **零命中**。但 `data/examples/*.json` 中 **43 个实体带坐标字段**。

**结论**：Map 是"有料无能力"。坐标目前只能通过 `/entity/{id}` 的 `summary` 原始 dict 渗漏到前端，由前端自行解析——这直接违反"前端零事实组装"（M74）。边界上 Map 属于 L1 投影，与 Timeline 对等；实现上它连投影函数都没有。

---

### 2.5 Search 检索

| | 内容 |
|---|---|
| **负责** | 已知目标的定位。用户心里已经有个名字，把它找出来 |
| **不负责** | **不负责探索**。不回答"我不知道我要什么"；不排序推荐；不生成路径；不做语义理解；不做模糊猜测 |

**污染红线**：这是全项目最容易被污染的边界。Search 与 Explore 的分界不是"技术上像不像"，而是**用户心智**：Search 服务"我知道要找什么"，Explore 服务"我不知道要什么但想弄明白"（Product_DNA §3）。一旦 Search 开始"猜你想找的"，它就变成了推荐系统的入口。

**实地锚点**：`core/search.py`。排序为 exact(0) / alias(1) / contains(2) 三档确定性排名，文件头明写 "No AI / fuzzy logic"。边界守得住。

**边界确认**：Search 在 R6 裁决后是**次级辅助能力**，不得主导首屏（M89.1 + ADR-0014 D2）。这是产品级边界，不是 UI 决定。

---

### 2.6 Evidence 证据 / Source 来源 / Provenance 溯源

这三个是**不同能力**，常被混为一谈，必须分清：

| 能力 | 回答 | 负责 | 不负责 |
|------|------|------|--------|
| **Evidence** | 凭什么这么说 | 把一条断言绑定到一个来源；断言文本本身 | 不评估来源质量；不聚合；不打分 |
| **Source** | 这话谁说的 | 来源记录本身；来源分级（primary/secondary/archival/…） | 不知道自己被谁引用；**永不进图**（不新增关系类型） |
| **Provenance** | 这条结论能追到哪 | 由 Evidence + Source 派生的只读投影，按 subject_id 索引 | 不是真相来源；不写回；不加 confidence / score / trust / ranking 字段 |

**污染红线（三条，都写在代码里）**：
- `source_registry.py` 文件头："`Source` is an independent entity referenced by id; never a graph node." Source 一旦成为图节点，18 类关系冻结即被突破。
- `provenance_index.py` 文件头："It adds NO confidence / score / trust / ranking / ai_generated / hallucination_probability fields." Provenance 一旦带分数，就从"可追溯"退化为"可信度评分器"，而可信度是用户的判断，不是系统的判断。
- `evidence_claim.py` 文件头："NO automatic evidence generation; NO AI-assigned confidence."

**这三条红线的产品意义**：它们共同构成 P09 真相可逼近性的底座。系统的职责是把证据链摆出来让用户自己判断，不是替用户给出可信度分数。**"逼近真相"是用户的动作，不是系统的输出。**

**实地锚点**：`data/evidence_claims.json` 76 条，`data/sources.json` 43 条，均在 `KnowledgeService.__init__` 一次性加载。`/provenance/{entity_id}` 是唯一直接暴露端点（`main.py:297`），且受 `PROVENANCE_PROJECTION` 环境开关控制（默认开）。

**边界缺口**：Evidence 与 Source 目前**没有面向用户的直接出口**——只能通过 AI grounding 内部消费，或通过 Provenance 端点间接看到 `reference` 字符串。P09 承诺用户"在任一结论处都能看见证据强度、来源分级与异议叙述"，其中**来源分级与异议叙述当前无任何出口**。转 P1-06。

---

## 3. L2 解释层能力边界

### 3.1 Explanation 解释

| | 内容 |
|---|---|
| **负责** | 回答"为什么会这样"。因果机制（mechanism）、后果（consequence）、该判断的置信档位（confidence）、支撑证据引用（evidence_refs） |
| **不负责** | **不负责推荐**。不决定用户下一步去哪；不排序目标；不生成事实；不改写事实；不判断"对这个用户重不重要"（那是 L3） |

**污染红线**：Explanation 回答的是关于**世界**的问题（A 为什么导致 B），Understanding 回答的是关于**用户**的问题（这个连接对你为什么重要）。两者的主语不同。Explanation 一旦出现"你"，就越界了。

**实地锚点与严重落差**：
- 契约实现：`core/causal/model.py` 的 `CausalStatement`（6 字段冻结）+ `core/causal/loader.py` + `core/causal/adapter.py`（只读查询层，文件头明写 "never generates, synthesises, or infers"）。
- **接线状态：未接线。** `CausalStatementAdapter` 在 `main.py` 与 `knowledge_service.py` 中**从未被实例化**。`ExplorationEngine.__init__` 的 `causal_adapter` 参数默认 `None`，且 `KnowledgeService` 构造引擎时不传（`knowledge_service.py:54`）。只有测试文件里 new 过。
- 数据：`data/causal_statements.json` **仅 5 条**，对应 211 条关系，覆盖率 2.4%。

**运行时用户实际拿到的"解释"是什么**：是 `ExplorationEngine._explain_path()` / `_overall_explanation()` 生成的**路径措辞模板**（`_RELATION_PHRASES` 18 条短语表，如 "caused" → "caused"/"was caused by"），拼成 "A caused B, B influenced C" 这类句子，挂在 `connections_explained[].explanation`。

**边界判定**：路径措辞属于 **Relationship-结构的可读化呈现**，不是 Explanation。它说的是"存在一条这样的连接"，不是"为什么"。当前产品把它摆在解释位上，构成能力冒名——Relationship 污染了 Explanation。这是本文档最重要的一条边界发现，转 P1-05。

---

### 3.2 Question / QA 提问

| | 内容 |
|---|---|
| **负责** | 接住用户一句自然语言追问，在**已有探索上下文**范围内作答 |
| **不负责** | 不产生事实；不引入上下文外的知识；不持有对话状态；不定方向；不做通用问答 |

**污染红线**：`prompt_service.py` 的 SYSTEM_PROMPT 六条规则把边界锁得很死："Use ONLY the facts provided in [ALLOWED FACTS]" / "Never invent" / "Do not modify, extend, or rewrite the knowledge graph" / "When the facts do not cover the question, say you cannot answer"。这是全项目边界写得最严的地方。

**实地锚点**：`/ai/explain` 与 `/ai/chat`（`main.py:366` / `main.py:383`）。AI 默认 **OFF**（`AI_GATEWAY_ENABLED` 未设即 False），未开启时走 `fallback_handler` 确定性兜底。

**边界问题（重复能力）**：两个端点是**字面同一实现**——同样调 `grounded_answer(knowledge_service, body.question, body.context_global_ids, mode, visited, package_context)`，参数一字不差。声称的区别是"chat 不存对话状态"，但 explain 也不存（两者都无状态）。这是同一能力挂了两个名字。转 P1-05。

---

## 4. L3 理解层能力边界

### 4.1 Understanding 理解

| | 内容 |
|---|---|
| **负责** | 回答"这个连接对我为什么重要"。承载策展人撰写的理解入口；组织"值得一起读"的语义簇 |
| **不负责** | 不做图遍历；不做排序；不做推荐；不生成内容；不度量用户（度量是 L4） |

**污染红线**：L2 ≠ L3。L2 说机制，L3 说意义。二者一旦合并，产品就退化成"带解释的知识图谱查看器"——Phase 0 已明确排除的形态。

**实地锚点**：`core/causal/causal_object.py`。`CausalObject` 是 `CausalStatement` 的超集，加了 `related_entities` / `exploration_paths` / `related_causal_objects`。边界声明写在 docstring 里，四条禁令：never import graph.py / never write to KG / never contain AI-generated content / never perform graph traversal, ranking, recommendation。

**当前实况**：`data/causal_objects.json` 12 条，**全代码库零读取者**（grep 确认）。L3 是纯契约层，零运行时存在。

**边界隐患**：`CausalObject.exploration_paths` 字段名为 "recommended exploration paths from this object"（`causal_object.py:5`）。这与同文件下方 "must never perform … recommendation" 自相矛盾。字段本身是策展人手写的静态路径（不是算法产物），因此不违规，但**命名会诱导后续实现者把它接进推荐管线**。建议改名，转 P1-05。

---

### 4.2 Comparison 跨文明对比

| | 内容 |
|---|---|
| **负责** | 回答"两个文明在同一件事上有什么不同"。维度对齐；同维度差异呈现 |
| **不负责** | 不给优劣结论；不做价值排序；不合并成单一叙事 |

**实地锚点与实况**：这个能力**当前不存在**。存在的是三样容易被误认为它的东西：

1. `cross_topic_related()` / `related_topics_for_entity()` / `related_topics_for_topic()`（`knowledge_service.py:316-388`）——这是**跨主题连通度统计**，输出 `{topic, cross_topic_edge_count}`。它回答"这两个主题之间有几条边"，不回答"这两个文明有什么不同"。
2. prompt mode `multi_civilization_view`——这是**提问角度**，不是能力。
3. `CausalObject.relation_type` 中的 `civilization_contrast`——这是**策展人标签**，且所在层零读取者。

**边界判定**：Comparison ≠ Cross-topic connectivity。前者需要"维度对齐"这一核心机制（拿什么维度比），后者只需要图上有边。**对比是 M81a 用户研究中 4 场里 3 场自发提出的最强需求（R5），而产品当前对它的支撑为零。** 转 P1-06。

---

## 5. L4 运行时层能力边界

> 实地核查结论：**L4 在后端完全不存在。** `grep ExplorationState|coveredDimensions|missingDimensions|coverageRatio|understandingGrowthScore|MemoryProjection|UnderstandingProjection` 在 `backend/app` 零命中。`main.py:348` 自述端点 "STRICTLY STATELESS … the server holds no conversation / session / user-memory state"。
> 因此以下边界是**契约边界**，用于约束未来实现，不描述现状。

### 5.1 Explore 探索

| | 内容 |
|---|---|
| **负责** | 回答"接下来还能往哪走"。基于**认知缺口**（用户还没覆盖的维度）打开可能性空间；提供可解释的候选与理由 |
| **不负责** | **不负责解释历史**（那是 Explanation）；**不负责替用户选**（那是 Recommendation，禁止）；不负责保证用户理解（Explore 可以无 Understanding）；不负责搜索已知目标 |

**这条边界是整个产品的生死线**，必须拆到最细：

| 维度 | Explore（采纳） | Recommendation（禁止） |
|------|----------------|----------------------|
| 输入 | coverageRatio / missingDimensions（认知缺口） | 点击率 / 停留时长 / 相似度 |
| 输出语义 | "你还没看过这个维度" | "你可能喜欢这个" |
| 决策主体 | 用户选 | 系统选 |
| 目标函数 | 认知结构增长 | 参与度 |
| 可解释性要求 | 必须能说出"为什么它填补了你的缺口" | 只需说"因为相似" |

**判定测试**：给定一个候选项，问"系统凭什么给出它"。答案里若出现任何**用户行为偏好**（喜欢、常看、相似用户），即为 Recommendation。答案里只出现**用户认知状态**（没覆盖、缺这个维度），才是 Explore。

**实地实况**：`ExplorationEngine.explore()` 已上线，但其输入是**图结构 + 时间 + 类型显著性**，**不是认知缺口**——因为认知缺口（ExplorationState）在后端不存在。所以当前的 Explore 严格说是"图上的可达性排序"，还没到契约定义的 Explore。转 P1-08。

---

### 5.2 Memory / Context 记忆与上下文

| | 内容 |
|---|---|
| **负责** | 跨会话持有"用户走到哪了、覆盖了什么、还缺什么" |
| **不负责** | 不做画像；不预测偏好；不作为排序输入去投喂内容 |

**边界红线**：Memory 的输出只允许流向两个地方——(1) Explore 的缺口计算，(2) Cognitive Mirror 的照见。**不允许流向任何"内容选择"逻辑**，否则即为个性化推荐。

**实地实况**：后端**明文无状态**。上下文由前端逐次上传（`AIRequest.context_global_ids` / `visited`）。这意味着：
- 服务端不可能实现跨会话记忆；
- `continuityScore`（跨会话自我认识累积）在当前架构下**无后端落点**；
- 所有"记忆"都是浏览器本地的，清缓存即失忆。

这是架构级约束，不是待办事项。转 P1-06。

---

### 5.3 Trail 轨迹

| | 内容 |
|---|---|
| **负责** | 忠实记录用户走过的路径与顺序，作为原始素材 |
| **不负责** | **不是收藏夹**（收藏是主动挑选，轨迹是被动记录）；不评价；不筛选；不排序；不解释 |

**边界红线**：Trail 只写不判断。Trail 一旦开始"高亮重要的那几步"，就侵占了 Cognitive Mirror 的解读权——而 Mirror 的定义是"由用户自己解读"。

**实地实况**：后端零实现。

---

### 5.4 Navigation 导航

| | 内容 |
|---|---|
| **负责** | 回答"我现在在哪、从哪来、怎么回去"。位置感与可回溯性（Navigation Contract: From / Why / Value） |
| **不负责** | **不负责关系**（关系是内容，导航是位置）；不负责决定去哪；不负责解释 |

**边界红线**：Relationship 回答"它和什么有关"，Navigation 回答"我怎么到的这里"。前者是知识结构，后者是用户在结构中的位置。两者在图产品里极易糊在一起——点一条关系既是"了解关系"也是"移动位置"，但**它们是两个能力**：关系可以只看不走，位置可以不经关系（如从 Package 直接跳入）。

**实地实况**：后端零实现。

---

## 6. Cognitive Mirror 认知镜像（待落层）

| | 内容 |
|---|---|
| **负责** | 把用户自己的探索轨迹结构化后**反射**给用户。回答"我到底对什么感兴趣、我是怎么学的" |
| **不负责** | **不负责投喂**；不负责替用户解读（解读权归用户）；不负责优化任何指标；**其输出不得作为 ExplorationPolicy 的输入** |

**最强边界红线（ADR-0013 D3，与 M88.0 同级）**：

> **Mirror 是终点，不是中间层。**

这条的工程含义：Mirror 的输出必须是**数据流的叶子节点**。任何形如 `mirror_output → policy_weight` 的调用都是违规。这是唯一一条"必须在 CI 层面加检查"的边界——纸面约束挡不住实现层滑坡（v2 报告风险 R-3 已明确指出）。

**建议的可执行判据**（供 Phase 2 CI 使用）：Mirror 模块允许被 L5 import，不允许被 L4 决策模块 import。单向依赖可静态检查。

**实地实况**：`grep CognitiveMirror` 全栈 **0 文件**。纯契约。

**边界上的一个真实优势**：Mirror 所需数据（覆盖维度、缺失维度、轨迹、四项 Delta）**全部是已定义制品**，无需新增采集。且 M81a 用户研究显示用户已在自发做这两件事（S004 自述"这个就是我探索的兴趣"、S002 自行归纳三段法）。因此 Mirror 的验证风险在于"能否照见"，不在"用户是否需要"。

---

## 7. 横切能力边界

### 7.1 Package 探索包

| | 内容 |
|---|---|
| **负责** | 在冻结事实之上提供**策展视图**——一条成型的探索线 |
| **不负责** | **不拥有事实**（M69）。Package 只引用 id，不复制内容；不生成；不排序 |

**污染红线**：`validatePackage()` 强制跨数据集零悬空指针。Package 一旦持有自己的事实副本，事实就有了第二个真相源。

**实地实况**：后端零实现。`data/exploration_packages.json`（4 个包）被 `frontend/src/data/explorationPackages.ts` **直接 import 进前端 bundle**，不经过任何 API。这意味着 Package 当前是**前端静态资源**，不是产品能力——它没有服务端校验、没有版本、改数据要重新构建前端。转 P1-08。

---

### 7.2 Guide 导览

| | 内容 |
|---|---|
| **负责** | 按 Package 的策展声明顺序带用户走一遍 |
| **不负责** | **不做个性化**；禁 LLM；禁评分；不改变顺序；**不负责推荐** |

**边界红线**：Guide 与 Recommendation 的区别是**顺序的作者是谁**。Guide 的顺序由策展人写死，对所有用户相同；Recommendation 的顺序由系统按用户算。Guide 一旦"根据你的进度调整顺序"，就变成了推荐。

**实地实况**：后端零实现。

---

### 7.3 Bookmark 收藏

| | 内容 |
|---|---|
| **负责** | 用户主动标记"我要留住这个" |
| **不负责** | 不是 Trail（Trail 被动记录，Bookmark 主动挑选）；不作为推荐输入 |

**实地实况**：全栈零实现。**并且它是否应该存在本身存疑**——收藏是"内容 App"的典型能力，与"认知结构增长"的价值定义未必吻合。转 P1-06 讨论，不预设结论。

---

## 8. Recommendation 推荐（禁止能力）

**这一节不定义边界，定义禁令。**

| | 内容 |
|---|---|
| **本应负责** | —— |
| **产品判定** | **禁止存在**（M88.0 Exploration ≠ Recommendation；Phase 0 v1 §1.4 七条排除之一；M88 战略第九节列为最大风险） |

**为什么禁**：推荐系统的目标函数是参与度，本产品的目标函数是认知增长。两者在极端情况下**方向相反**——最能提升停留时长的做法是持续投喂舒适内容，而认知增长恰恰要求用户走向不适的缺口。允许推荐存在，产品目标会被静默反转。

**实地核查结论（本任务重点交付）**：**Recommendation 不仅存在，而且有三处独立实现，其中一处有专属公开 REST 端点。** 详见 P1-05 第 2 节。

---

## 9. 边界污染清单（本次核查发现）

按严重度排序。全部转 P1-05 处理。

| # | 污染 | 表现 | 严重度 |
|---|------|------|--------|
| 1 | Recommendation 侵占 Explore | `recommend_next()` + 公开端点 `/entity/{id}/recommendations`，四权重打分选下一站 | 阻断级 |
| 2 | Relationship 冒名 Explanation | 路径措辞模板被摆在 `explanation` 字段上，用户以为拿到了"为什么" | 高 |
| 3 | 三套"下一步"并存 | `recommend_next` / `plan_exploration` / `connections_explained` 互不知晓 | 高 |
| 4 | Fact 形状外泄至 L5 | `/entity/{id}.summary` 直吐原始实体 dict | 中 |
| 5 | 同能力双名 | `/ai/explain` 与 `/ai/chat` 字面同一实现 | 中 |
| 6 | Map 数据绕过能力层 | 43 个坐标只能靠前端从 `summary` 里自行解析，违反前端零事实组装 | 中 |
| 7 | 命名诱导 | `CausalObject.exploration_paths` 注释为 "recommended exploration paths"，与同文件禁令矛盾 | 低（但会传染） |
| 8 | Package 绕过服务端 | 数据直接 import 进前端 bundle，无服务端校验 | 低 |

---

## 10. 边界结论

1. **边界写得好的地方**：L1 的 Fact / Source / Provenance / Evidence 四个能力，边界不仅清晰而且**写在代码文件头里**并被测试守住。`global_graph.py` 与 `causal_object.py` 的自我约束是全项目范本。
2. **边界写得好但没通电的地方**：L2 Explanation、L3 Understanding。契约完备、禁令明确、代码已写，**但从未接入服务路径**。这是"契约 vs 实现"落差最大的区域。
3. **边界没写、能力也没有的地方**：L4 全层 + Cognitive Mirror。后端零存在。
4. **边界被实际违反的地方**：Explore / Recommendation。**这是唯一一处"违反已发生且已上线"**，不是风险，是事实。

**给 Phase 2 的一句话**：本产品当前真正在服务用户的能力只有 L1（事实/关系结构/时间/检索/溯源）加一层路径措辞模板。宣称的 L2/L3/L4 要么未接线、要么不存在。任何以"我们已有五层能力"为前提的体验设计都会落空。
