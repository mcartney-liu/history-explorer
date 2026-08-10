# P1-05 能力冲突分析（Capability Conflict）

> FRW Phase 1 · Capability Validation · Task 5
> 判定基准：真实产品能力。所有结论以 `backend/app/**.py`、`backend/tests/**.py`、契约文档原文为证据，不以前端页面/组件/按钮为依据。
> 模式：只读核查。本文件不修改任何代码。

---

## 0. 结论摘要

本次核查在真实代码与契约文档之间发现 **12 项冲突**，其中：

| 等级 | 数量 | 含义 |
|------|------|------|
| 红线级（Red） | 2 | 直接违反已冻结的边界契约，必须由 PO 裁决后才能进入 Phase 2 |
| 结构级（Structural） | 6 | 同一能力存在多套互相矛盾的实现或定义，会在重构中放大 |
| 命名级（Naming） | 3 | 能力身份不清导致的重复命名，不涉及行为冲突 |
| 契约空转级（Dead Contract） | 1 | 接口声明了能力，实现层完全忽略 |

**最重要的一条结论**：

> Recommendation 不是"文档禁止但代码没做"，也不是"代码偷偷做了"。
> 真实情况是：**Recommendation 在后端被实现了三次，其中一次以公开 REST 端点对外提供，并且被 15 个测试用例锁定为冻结行为**。
> 而更深层的问题是——**PRD / Product_DNA / Product_Constitution 三份上位文档都明文要求 Next Node 推荐**，M88.0 却明文禁止 Recommendation。
> 因此这不是实现漂移（drift），而是**契约层自相矛盾**。修代码解决不了，必须先修契约。

---

## 1. 判定方法与证据等级

| 证据等级 | 定义 | 本文使用方式 |
|----------|------|--------------|
| E1 实证 | 读到具体 `文件:行号` 的可执行代码 | 所有红线级/结构级结论必须有 E1 |
| E2 契约 | 冻结文档（M88.0 / ADR / Constitution）原文 | 用于判定"是否违反" |
| E3 缺席证明 | 全仓 grep 零命中 | 用于判定"能力不存在" |
| E4 推断 | 由 E1+E2 推导 | 仅用于根因分析，不用于事实断言 |

**冲突的定义**（本文严格采用）：满足以下任一条即计为冲突。

1. 同一产品能力存在 ≥2 套实现，且行为语义不一致；
2. 实现存在，但违反已冻结契约的显式禁止项；
3. 契约之间互相矛盾，导致实现无论怎么做都违约；
4. 接口声明了某能力入参/出参，实现层完全不消费。

**不计为冲突**的情况：能力尚未实现（属 P1-06 缺口）、能力实现不完整但方向一致（属 P1-08 成熟度）。

---

## 2. 冲突清单总表

| ID | 冲突 | 等级 | 涉及能力 | 证据 |
|----|------|------|----------|------|
| C-01 | Recommendation 被实现三次，含 1 个公开端点 | 红线 | Recommendation / Explore | E1+E2 |
| C-02 | 上位文档要求 Next Node，M88.0 禁止 Recommendation | 红线 | Recommendation / Guide | E2 |
| C-03 | 三套"下一步"实现的 visited 语义互相矛盾 | 结构 | Explore / Recommendation | E1 |
| C-04 | Explanation 有三个互不相通的来源 | 结构 | Explanation | E1 |
| C-05 | `/ai/explain` 与 `/ai/chat` 是同一实现的两个名字 | 结构 | Explanation / QA | E1 |
| C-06 | Relationship 与 Explanation 边界被 `connections_explained` 击穿 | 结构 | Relationship / Explanation | E1+E2 |
| C-07 | Cognitive Mirror 契约定位与零实现冲突 | 结构 | Cognitive Mirror | E2+E3 |
| C-08 | Discover 与 Explore 命名重复（仅文档/前端层） | 命名 | Explore | E3 |
| C-09 | Guide 与 Recommendation 职责重叠且都无 Policy 依据 | 命名 | Guide | E2+E3 |
| C-10 | CausalObject 的 `exploration_paths` 自称"推荐路径" | 命名 | Causal / Recommendation | E1 |
| C-11 | `package_context` 是死参数，Package 能力接口空转 | 契约空转 | Package | E1 |
| C-12 | 存在两份互相矛盾的"本体唯一真相源" | 结构 | Fact / 跨领域 | E1 |

---

## 3. 逐条冲突详解

### C-01（红线）Recommendation 被实现三次，其中一次公开对外

#### 3.1 实地核查结论

任务书要求"实地核查 backend/app 是否真的实现了任何推荐逻辑"。核查结果：**实现了，而且是三套独立实现**。

| # | 实现位置 | 入口 | 是否对外可访问 | 排序依据 |
|---|----------|------|----------------|----------|
| 1 | `backend/app/core/exploration_engine.py:559` `recommend_next()` | `knowledge_service.py:434` → `main.py:255` | **是。公开 REST 端点** `GET /entity/{id}/recommendations`（`main.py:410` v1 + `main.py:448` legacy，双路由挂载） | 图相似度四权重 |
| 2 | `backend/app/ai_gateway/exploration_planner.py:94` `plan_exploration()` | `answer_service.py:196` → `/ai/explain`、`/ai/chat` 响应的 `next_exploration` 字段（`answer_service.py:212`） | 是。随 AI 回答一起返回 | 证据强度 + 来源 tier |
| 3 | `backend/app/ai_gateway/grounding_builder.py:498` `derive_next_exploration()` | 被 #2 调用（`exploration_planner.py:69`），同时可独立调用 | 间接 | 证据绑定 |

补充事实：

- 实现 #1 有独立的算法版本号 `ALGORITHM_VERSION = "m9-001.v1"`（`exploration_engine.py:244`），有独立权重常量 `REC_W_RELATIONSHIP=0.40 / REC_W_TIMELINE=0.25 / REC_W_THEME=0.20 / REC_W_DIVERSITY=0.15`（`exploration_engine.py:239-242`），有独立数据结构 `RecommendationItem` / `RecommendationResult`（`exploration_engine.py:248/269`）。这是一个**完整建制的推荐子系统**，不是顺手写的辅助函数。
- `backend/tests/test_recommend.py` 含 15 个测试函数，锁定了确定性、排序公式、多样性、双路由一致性、枚举冻结。**测试的存在使这套实现成为"被冻结的既成事实"**——删除它会红 15 个用例。

#### 3.2 逐条对照 M88.0 冻结契约

M88.0 §8.2「探索方向约束」与 §8.3「认知推进约束」是本项目对"什么可以决定下一步"的唯一冻结定义。逐条核对实现 #1：

| M88.0 条款 | 要求 | `recommend_next()` 实际 | 判定 |
|------------|------|------------------------|------|
| §8.2 不基于点击率/时长/流行度 | 禁止 | 未使用任何行为指标 | 符合 |
| §8.2 不基于协同过滤 | 禁止 | 纯图计算，无用户间信号 | 符合 |
| §8.2 不基于"其他用户也看了" | 禁止 | 后端无用户概念 | 符合 |
| §8.2 不由 LLM 决定方向 | 禁止 | 纯确定性计算，无 LLM | 符合 |
| §8.2 **不推荐用户已探索过的 entity** | 禁止 | **只降权不排除**：`exploration_engine.py:619-620` 命中 `seen` 时 `diversity = 0.2`，仍进入候选并可入选；`:686` 还会附加理由「（已访问，权重降低）」 | **违反** |
| §8.3 基于 coverageRatio / missingDimensions / missingConnections | 必须 | 三者在全仓 grep 零命中（E3）。函数签名只有 `gid / seen / max_results` | **未实现** |
| §8.3 基于 UnderstandingStage 判定推进深度 | 必须 | `UnderstandingStage` 全仓零命中 | **未实现** |
| §8.3 基于 MemoryProjection 避免重复 | 必须 | 后端无 Memory 概念 | **未实现** |
| §8.3 reason 必须来自 RuleTrace | 必须 | `RuleTrace` 全仓零命中；`reasons` 是模板拼接字符串（`:661-689`） | **违反** |
| §5 输出必须走 `Decision<ExplorationAction>` | 必须 | 输出 `RecommendationResult`（`:269`） | **违反** |

**核查方法说明**：`ExplorationAction / RuleTrace / coverageRatio / coverage_ratio / missingDimensions / missing_dimensions / UnderstandingStage / Decision[` 八个关键词在整个 `backend/` 目录 grep，**零命中**。这是 E3 级缺席证明。

#### 3.3 判定：它在结构上就是 Recommendation

M88.0 §3 给出了区分表。用它来给实现 #1 定性：

| M88.0 §3 维度 | Recommendation（禁止） | Exploration Intelligence（目标） | `recommend_next()` 落在哪边 |
|---------------|------------------------|----------------------------------|------------------------------|
| 核心对象 | Item recommendation | Knowledge progression | **Item**（输出是 entity 列表 + 分数） |
| 驱动信号 | 点击率/时长/流行度 | 认知缺口/理解状态 | 都不是——**图结构相似度**。不属禁止信号，但也不是要求信号 |
| 输出形式 | "猜你喜欢：罗马帝国" | "你已理解军事扩张，但缺少经济基础……" | **接近前者**：`{target_entity, score, reasons}`，reasons 是"通过强关系 X 相连（关系含义 0.85）" |
| 判定方式 | 协同过滤/排序算法 | Policy 规则（RuleTrace 可审计） | **排序算法**（四权重加权求和 + 贪心） |
| 用户感知 | 被动接收 | 主动认知推动 | **被动接收**（无认知状态输入，对谁都一样） |

**五个维度里有四个落在"禁止"一侧。**

结论：`recommend_next()` 规避了 M88.0 明令禁止的**信号源**（点击率/协同过滤），但**完全没有实现 M88.0 要求的信号源**（认知缺口），也没有采用要求的**输出契约**（Decision + RuleTrace）。它是一个"去掉了行为数据的图相似度推荐器"。

这正是 M88.0 §12 自己预警的最大风险：

> | Exploration 退化成推荐系统 | 严格约束 Policy 规则来源（coverage/missing/relations，非点击指标） |

**该风险已经发生。** 缓解措施（Policy 规则来源）从未落地。

#### 3.4 对 Phase 1 的意义

按任务书要求，Recommendation **不登记为能力**，登记为冲突/风险。同时必须记录：

- 它不是"死代码"——有公开端点、有前端可调用路径、有 15 个测试冻结；
- 它不是"违规偷跑"——它有正式的 M9-001 编号和 ADDITIVE 声明（`exploration_engine.py:229`、`knowledge_service.py:429`），是**被正式立项批准的**；
- 因此它是**两个官方决策互撞**的产物，见 C-02。

---

### C-02（红线）上位文档明文要求 Next Node，M88.0 明文禁止 Recommendation

这是 C-01 的根因，也是本次 Phase 1 发现的**最严重的契约级冲突**。

| 文档 | 原文 | 立场 |
|------|------|------|
| `PRD.md:28` | "Every Entity page always shows **2–3 Next Node recommendations**" | 强制要求 |
| `PRD.md:46` | "History Guide · **Next Node** · Graph Builder · Explanation Engine · Path Navigator" | 列为五大 AI 能力之一 |
| `Product_DNA.md:63` | "**2-3 Next Node recommendations.**" | 强制要求 |
| `Product_DNA.md:76` | "Suggest exploration paths (**Next Node**)." | AI 职责 |
| `Product_Constitution.md:120` | "Suggest exploration paths (**Next Node**)." | **宪法层**授权 AI 建议探索路径 |
| `M88.0_EXPLORATION_INTELLIGENCE_BOUNDARY.md:33` | "**Exploration ≠ Recommendation** —— 这是 M88.0 最重要的边界" | 明令禁止 |
| `M88.0:182` | "**不由 LLM 决定方向**" | 与 Constitution:120 的"AI 建议探索路径"直接对撞 |
| `M89.0_EXPERIENCE_IMPLEMENTATION_MAP.md:226` | "新推荐算法 → M88 已证明 Exploration ≠ Recommendation" | 追认禁止 |

**冲突的精确表述**（这一点必须说清楚，否则会被误读）：

四份文档在"**要不要给用户下一步**"上是**一致的——都要**。
冲突发生在"**由什么来决定下一步**"：

```
Product_Constitution.md:120  →  由 AI 决定（Suggest exploration paths）
PRD.md:28                    →  由推荐决定（Next Node recommendations）
M88.0 §6                     →  禁止 AI 决定；由 ExplorationPolicy 规则决定
M88.0 §8.3                   →  决定依据必须是 coverage / missing / stage
实际实现 exploration_engine  →  由图相似度四权重决定
实际实现 exploration_planner →  由证据强度 + source tier 决定
```

**六个来源，六种"决定者"，没有任何两个一致。**

这是一个无法靠写代码解决的冲突：无论实现哪一种，都会违反另外几份已发布文档。

#### 需要 PO 裁决的问题（Q-01）

> Next Node 的**决定权**归属：
> (甲) 宪法优先——保留 AI/推荐决定方向，则必须修订 M88.0 §6/§8，撤销"Exploration ≠ Recommendation"；
> (乙) M88.0 优先——保留认知缺口驱动，则必须修订 PRD:28、DNA:63/76、Constitution:120，并对 `/entity/{id}/recommendations` 端点做废弃计划；
> (丙) 分层共存——`recommend_next` 降级为**内部候选生成器**（不对外、不叫 recommendation），上层加 ExplorationPolicy 做认知缺口筛选，对外只暴露 `ExplorationAction`。

**架构层建议：(丙)**。理由见 §4。

---

### C-03（结构）三套"下一步"实现的 visited 语义互相矛盾

同一个产品概念"用户已经看过的节点"，三套实现给出三种处理：

| 实现 | 参数名 | 已访问节点的处理 | 代码位置 | 是否符合 M88.0 §8.2 |
|------|--------|------------------|----------|---------------------|
| `recommend_next` | `seen_global_ids` | **降权保留**（diversity 0.2），仍可出现在结果里 | `exploration_engine.py:619-620` | 违反 |
| `ExplorationPlanner.plan` | `visited` | **硬性剔除** `continue` | `exploration_planner.py:74-75` | 符合 |
| `derive_next_exploration` | 无此参数 | **完全不感知** | `grounding_builder.py:498` | 不适用 |

**后果**：同一个用户在同一个实体页上，`/entity/{id}/recommendations` 可能把他刚看过的节点再推一次并标注"（已访问，权重降低）"，而 `/ai/explain` 的 `next_exploration` 绝不会。**同一产品对"已读"给出两种相反的行为**。

这不是配置差异，是两个团队/两个里程碑（M9-001 与 M74-004-002）各自定义了同一概念。

排序依据同样矛盾：

- `recommend_next`：`0.40·关系权重 + 0.25·时间连贯 + 0.20·主题连接 + 0.15·多样性`（`exploration_engine.py:594-624`）
- `ExplorationPlanner`：`证据条数 desc → source tier asc → gid asc`（`exploration_planner.py:84-90`）

前者认为"图上更近 = 更该看"，后者认为"证据更硬 = 更该看"。**这是两种不同的真理观**，且都没有产品文档背书。

---

### C-04（结构）Explanation 有三个互不相通的来源

"解释"这一能力在后端有三处产出，三者数据不互通、口径不统一：

| 来源 | 产出形态 | 位置 | 是否走证据 | 是否走 AI |
|------|----------|------|------------|-----------|
| 路径措辞模板 | `connections_explained` 字符串，来自 `_RELATION_PHRASES`（18 条固定短语） | `exploration_engine.py`（explore 路径） | 否 | 否 |
| AI Gateway | `grounded_answer()` 生成的解释文本 + citations | `ai_gateway/answer_service.py` | 是（ClaimGraph） | 是（默认关闭） |
| Causal 层 | `CausalStatement`（L2）文本 | `core/causal/model.py` | 部分 | 否（只读，"never generates"） |

问题：

1. 第一种把**关系类型翻译成中文短语**当作"解释"（`connections_explained`）。这在 M85.1「Relationship ≠ Edge」的语义下是可接受的语言化，但它被放进了名为 `explained` 的字段，会让前端把它当 Explanation 层消费——见 C-06。
2. 第三种 `CausalStatementAdapter` **从未在 `main.py` / `knowledge_service.py` 中被实例化**（仅在测试中出现），`data/causal_statements.json` 只覆盖 211 条关系中的 5 条。L2 因果解释**事实上未接入**。
3. AI Gateway 默认关闭（`ai_gateway/config.py`，未设 `AI_GATEWAY_ENABLED` 时为 False）。

**净结果**：产品对外的"解释"，绝大多数时候是第一种——18 条固定短语的模板拼接。这与 Constitution 第 0 条"帮助用户无限逼近真相"之间存在巨大落差（属 P1-06 缺口，此处只记冲突：三源并存且无仲裁规则）。

---

### C-05（结构）`/ai/explain` 与 `/ai/chat` 是同一实现的两个名字

`backend/app/main.py` 中两个 handler 调用完全相同的 `grounded_answer(...)`，参数一致，返回结构一致。区别仅在路由路径与 `operation_id`。

**判定**：这不是两个能力，是一个能力的两个别名。在能力盘点中必须合并为一项（Grounded QA），否则会虚增能力数量、并在前端重构时被误做成两套 UI。

对 Phase 2 的约束：前端不得基于"explain 和 chat 是不同能力"的假设做信息架构。

---

### C-06（结构）Relationship 与 Explanation 的边界被击穿

契约侧边界（P1-03 已定义）：

- Relationship（L1 Fact）拥有：关系类型、方向、端点。**不拥有**任何自然语言叙述。
- Explanation（L2）拥有：为什么、意味着什么。**不拥有**事实断言权。

实际代码：`exploration_engine.py` 的 `explore()` 产出 `connections_explained`，内容形如"X 通过『引发』导致了 Y"。这段文本：

- 由 L1 的关系类型直接生成，**位于 L1 组件内**；
- 字段名含 `explained`，**声明自己是解释**；
- 不携带任何 evidence/source 引用，但读起来像因果断言。

**冲突点**：L1 组件生产了 L2 形态的产物，且不受 Evidence/Provenance 约束。这违反了五层模型「L1 只陈述事实、L2 才做解释」的分层前提，也与 `provenance_index.py` 头部声明的"不添加 confidence / score / trust / ranking"精神相悖（那里守住了，这里没守住）。

严重性说明：这条不是红线，因为短语库是 18 条固定模板、无生成、可审计。但它在**能力身份**上制造了模糊——前端无法判断 `connections_explained` 该当事实渲染还是当解释渲染。

---

### C-07（结构）Cognitive Mirror 的契约定位与零实现冲突

| 侧面 | 内容 | 证据 |
|------|------|------|
| Phase 0 定义 | Cognitive Mirror = 把用户自己的探索轨迹反射回用户 | `FRW-Phase0` 文档 |
| ADR-0013 D3 防火墙 | "Mirror 是终点，不是中间层"——禁止任何能力把 Mirror 当作上游依赖 | ADR-0013 |
| 五层模型 | Mirror 未被分配到 L1–L5 任何一层（OD-02 待落层） | `FRW-Phase0` |
| 后端实现 | `mirror` 在 `backend/app` 全目录 grep 零命中 | E3 |
| 前端实现 | CognitiveMirror 相关文件 0 个 | E3（仅存在性核查，不作为能力依据） |

**冲突表述**：契约同时主张三件互斥的事——
(a) Mirror 是一个**已命名的产品能力**；
(b) Mirror **不属于任何层**；
(c) Mirror **不能被依赖**（是终点）。

若 (b) 成立，Mirror 在依赖图中无位置，则 P1-04 无法为它定义上游；若 (c) 成立，则它无法被 L5 Experience 复用，只能是一个叶子出口。当前 (a) 又要求它是能力。

这在**零实现**的前提下尚不产生代码问题，但会在 Phase 2 立刻爆发：前端要做 Mirror 时，无法确定它读谁的数据（Memory？Trail？Understanding？）——而这三者后端全部为零。

**需要 PO 裁决的问题（Q-02）**：Mirror 的层归属。P1-04 已给出倾向性建议（置于 L4.5，即 Runtime 之上、Experience 之下的只读投影出口），此处不重复论证。

---

### C-08（命名）Discover 与 Explore

核查结果：`discover / discovery` 在 `backend/app` 仅 4 处命中，且**全部是否定式声明**：

- `exploration_engine.py:319` "path discovery over the GlobalGraph"（描述 explore 自身）
- `acquisition/__init__.py:5`、`acquisition/pipeline.py:10`、`acquisition/mapping.py:10` —— 均为 "NOT an Entity-discovery / Relationship-discovery engine"，即**明确声明不做 discovery**。

**判定**：后端不存在名为 Discover 的能力。Discover 与 Explore 的重复只存在于**文档与前端命名**层面，属命名冲突，**不构成能力冲突**。

处理建议：能力清单中删除 Discover，统一为 Explore。前端若有 Discover 入口，视为 Explore 的一种呈现，不得登记为独立能力。

---

### C-09（命名）Guide 与 Recommendation 职责重叠

| 事实 | 证据 |
|------|------|
| `guide` 在 `backend/app` 零命中 | E3 |
| PRD 把 "History Guide" 与 "Next Node" 并列为两项 AI 能力 | `PRD.md:46` |
| M88.0 §9.3 规定：Exploration 决定方向，Companion 决定如何呈现，两者不互相替代 | E2 |

**冲突表述**：PRD 的 "History Guide" 与 "Next Node" 在职责上无法区分——两者都是"告诉用户接下来看什么"。M88.0 §9.3 给出了唯一合法的切分方式（方向 vs 呈现），但 PRD 的命名没有采用这个切分，后端也两者皆无。

**判定**：Guide 当前**不是能力**，是一个未定义的产品词。要么按 M88.0 §9.3 重定义为"呈现策略（Companion）"，要么从能力清单删除。不能与 Recommendation 并列存在。

---

### C-10（命名）CausalObject 的 `exploration_paths` 自称"推荐路径"

`backend/app/core/causal/causal_object.py` 内部自相矛盾：

- `:5` 字段注释：`exploration_paths: **recommended** exploration paths from this object`
- `:13` 约束声明：`Must never perform graph traversal / ranking / **recommendation**`
- `:23` 类文档：`A **recommended** exploration path from a CausalObject.`
- `:49` 约束声明：`NOT an AI-generated **recommendation**`

同一文件里，字段说自己是推荐，约束说不许推荐。

严重性低（`causal_objects.json` 的 12 条数据**零读者**，该类从未被消费），但必须记录：**这是 Recommendation 语义在第四处渗透**。在 Phase 2 若激活 L3 Causal，会立刻把 Recommendation 带进 L3。

处理建议：字段重命名为 `related_paths` 或 `derived_paths`，去掉 recommended 措辞。

---

### C-11（契约空转）`package_context` 是死参数

| 层 | 情况 | 证据 |
|----|------|------|
| API 层 | `/ai/explain`、`/ai/chat` 请求体接受 `package_context: Optional[str]` | `main.py:363/379/397` |
| 服务层 | 透传给 `plan_exploration(..., package_context=package_context)` | `answer_service.py:199/223/242/254` |
| 实现层 | `ExplorationPlanner.plan()` 签名有 `package_context`（`:53`），**函数体 66–91 行从未引用它** | `exploration_planner.py:49-91` |

**判定**：Exploration Package 作为"探索上下文"的能力，在后端是**声明存在、实现为空**。前端传了，后端收了，然后丢弃。

配套事实（在 P1-03/P1-04 已记录，此处只作交叉引用）：`data/exploration_packages.json` 的 4 个 package 被**直接打进前端 bundle**，不经任何 API。这意味着 Package 能力目前**完全在前端**，后端那条参数链是一条通向空处的管道。

严重性：中。它会让 Phase 2 误以为"后端已支持 Package 上下文"，从而在此假设上设计体验。

---

### C-12（结构）存在两份互相矛盾的"本体唯一真相源"

| 位置 | 声明 | 实体类型 | 关系类型 |
|------|------|----------|----------|
| `backend/app/validation.py:27/42` | M3.5-000 Schema Freeze 冻结基线 | **8 个**，TitleCase：Event / Person / Civilization / Location / Time Period / Technology / Religion / Idea | **18 个**：caused / influenced / participated_in / located_at / related_to / before / after / contemporary_with / part_of / …（含 inherited / conquered / spread） |
| `backend/app/core/domain/ontology.py:32-35` | 文件头自称 "**the single source of truth** for the History Explorer ontology, referenced by future domains instead of copying schema" | **6 个**，lowercase：person / place / event / organization / period / civilization | **5 个**：born_in / ruled_in / influenced_by / part_of / preceded_by |

两份定义在**数量、大小写、命名法**上全部不同，交集极小（仅 `part_of` 与 person/event/civilization 的大小写变体）。而 `ontology.py` 明确自称唯一真相源，并声明"未来领域应引用它而非复制 schema"。

**冲突后果**：

- 运行时校验（`validation.py:174/213`）走 8/18 冻结基线；
- 采集管线（`acquisition/pipeline.py:49` → `AdapterRegistry`）走 `ontology.py` 的 6/5；
- 因此**通过 Domain Adapter 采集进来的数据，其类型体系与运行时校验体系不是同一套**。

严重性：中。当前 `AcquisitionPipeline` 未接入生产数据流（`data/` 下 9 个 topic 是静态 JSON，直接由 `JsonTopicRepository` 读取），所以矛盾尚未在运行时爆发。但它直接影响 OD-05 跨学科愿景的可行性判断——详见 P1-06 G-08。

---

## 4. 根因分析

四条根因，按影响面排序。

### R-1：里程碑各自立法，没有全局仲裁

`M9-001`（推荐层）与 `M74-004-002`（Exploration Planner）与 `M88.0`（Exploration Intelligence Boundary）是三个独立里程碑，各自都有正式编号、正式声明、正式测试。**没有任何一份文档说明后来者是否废止前者**。

`exploration_engine.py:229` 与 `knowledge_service.py:429` 都标注 `(M9-001, ADDITIVE)`——"additive"意味着"只加不改"。这个策略在能力层面是危险的：**能力不能 additive**，两个"决定下一步"的能力叠加，结果是产品有两个大脑。

### R-2：契约写了"禁止什么"，没写"废止什么"

M88.0 §3 写了 Exploration ≠ Recommendation，但没有一句话说"因此 `/entity/{id}/recommendations` 端点应当下线"或"PRD:28 相应作废"。**禁止性条款没有配套的迁移条款**，于是旧实现合法存活。

### R-3：Policy 层从未落地，导致要求项全部落空

M88.0 §7 定义了完整的 ExplorationPolicy 规则表（coverageRatio / missingDimensions / missingConnections → action type），§11 定义了 M88.1–M88.5 实施计划。核查结果：**M88.1 之后的任何产物在 backend 中零命中**。

这直接导致：M88.0 的禁止项（§8.2）大部分被满足（因为不做就不违反），而要求项（§8.3）**一条都没实现**。系统停在"什么都不基于"的状态，于是旧的图相似度实现成了唯一可用的东西。

### R-4：Contract 与 Implementation 从未做过逐字段比对

这正是 R1 决议要求 Phase 1 交付的东西（见 P1-08）。在本次比对之前，没有任何文档记录过"`/entity/{id}/recommendations` 存在且违反 M88.0"。**冲突不是新产生的，是第一次被看见。**

---

## 5. 必须由 PO 裁决的问题

| ID | 问题 | 阻塞对象 | 不裁决的后果 |
|----|------|----------|--------------|
| Q-01 | Next Node 的决定权：AI / 推荐算法 / ExplorationPolicy 三选一（详见 C-02） | Phase 2 全部探索类体验 | 前端重构会把矛盾固化进 UI |
| Q-02 | Cognitive Mirror 的层归属（OD-02） | Mirror 相关体验、P1-04 依赖图闭合 | Mirror 无法被实现 |
| Q-03 | `/entity/{id}/recommendations` 端点的处置：保留 / 改名内部化 / 废弃 | 15 个测试用例、前端调用点 | 端点继续对外提供违约能力 |
| Q-04 | Explanation 的权威来源：模板短语 / AI Gateway / Causal 三选一或定义仲裁顺序（C-04） | 所有解释类体验 | 用户在不同入口看到口径不同的"解释" |
| Q-05 | Package 能力的归属：后端实现 / 承认其为纯前端能力 / 废弃（C-11） | Package 体验、`package_context` 参数链 | 继续在空参数上设计功能 |

---

## 6. 对 Phase 2 的硬性约束

基于本次冲突核查，以下几条在 Phase 2 前端重构中**不可协商**：

1. **不得为 `/entity/{id}/recommendations` 设计新的前端呈现。** 该端点处于待裁决状态（Q-03）。现有调用点可保留，不得扩大。
2. **不得把 Recommendation 登记为能力。** 能力清单中它只以"冲突项/待裁决项"存在。
3. **不得假设 `package_context` 生效。** 在 Q-05 裁决前，Package 视为纯前端能力。
4. **不得把 `connections_explained` 当 Explanation 渲染。** 在 Q-04 裁决前，按 L1 事实的语言化呈现处理，不得配"解释"标签、不得配置信度。
5. **不得把 `/ai/explain` 与 `/ai/chat` 做成两个能力入口。** 它们是同一实现。
6. **不得为 Cognitive Mirror 设计依赖上游。** 在 Q-02 裁决前，Mirror 只能是叶子出口（ADR-0013 D3）。
7. **任何"下一步"呈现必须标注其数据来源实现**（`recommend_next` 还是 `plan_exploration`），因为两者对"已访问"的行为相反（C-03）。

---

## 附录 A：核查覆盖范围

| 范围 | 方式 | 结果 |
|------|------|------|
| `backend/app/core/*.py` | 逐文件读取头部边界声明 + 关键实现 | 已覆盖 |
| `backend/app/ai_gateway/*.py` | 逐文件读取 | 已覆盖 |
| `backend/app/core/causal/*.py` | 全部 4 个文件读取 | 已覆盖 |
| 路由定义 | `main.py` 全文读取（497 行），确认 10 个 handler / 双路由挂载 | 已覆盖 |
| `backend/tests/*.py` | 静态统计函数名，共 400 个测试用例；`test_recommend.py` 15 个 | 已覆盖 |
| 关键词缺席证明 | `ExplorationAction / RuleTrace / coverageRatio / missingDimensions / UnderstandingStage / mirror / guide / trail / bookmark` grep | 已覆盖 |
| 契约文档 | M88.0 全文、Constitution、PRD、Product_DNA、FRW-Phase0 | 已覆盖 |

**未能执行的核查**：本地环境缺少 pytest（系统 Python 与 `.venv` 均无该模块，`.pip_target` 中亦不含），因此无法运行测试观测实际输出。所有行为结论均基于源码静态阅读，已在正文标注具体行号以便复核。

## 附录 B：冲突与能力清单的对应关系

| 能力（种子清单） | 本文结论 |
|------------------|----------|
| Recommendation | 不登记为能力。登记为红线冲突 C-01/C-02，待 Q-01/Q-03 裁决 |
| Explore | 真实能力，但被 C-01/C-03 污染（内含推荐层） |
| Explanation | 真实能力，但三源并存（C-04），且边界被 C-06 击穿 |
| Guide | 不登记为能力（C-09），后端零实现 |
| Discover | 不登记为能力（C-08），并入 Explore |
| Package | 前端能力；后端接口空转（C-11） |
| Cognitive Mirror | 定位冲突（C-07），零实现，待 Q-02 |
| QA / Chat | 与 Explanation 合并为 Grounded QA（C-05） |
| Causal | 已编码未接线；命名含推荐语义（C-10） |
