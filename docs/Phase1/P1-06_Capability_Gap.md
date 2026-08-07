# P1-06 Capability Gap — 能力缺口

> FRW Phase 1 Capability Validation · Task 6
> 作者：架构师（Chief Architect）
> 日期：2026-08-07
> 前置：P1-01（能力 ID C01–C30 / X01 以该文件为准）、P1-02、P1-03、P1-04、P1-05
> 判定基准：真实产品能力。不以页面 / 组件 / 按钮 / 接口为依据。
> 模式：只读核查。本文件不修改任何代码。

---

## 0. 本文档的判定纪律

### 0.1 什么算「产品缺口」

本文档只登记一种东西：**产品为完成 Article 0 的使命应当具备、但当前并不具备的能力覆盖**。

| 类别 | 定义 | 归属 |
|------|------|------|
| **产品缺口（本文档）** | 能力覆盖本身缺失：该能力不存在、只在纸面、只有契约、或虽有名义实现但其核心机制与内容供给为零 | P1-06 |
| **实现缺口（不在本文档）** | 能力已存在且方向正确，只是未接线 / 未暴露 / 覆盖不足 | P1-08 能力成熟度 |
| **冲突（不在本文档）** | 同一能力多套矛盾实现、违反冻结契约、契约互相矛盾、接口空转 | P1-05 |

**不重复计数原则**：同一件事只出现在一处。例如 C10 Causal Explanation：
- 「`CausalStatementAdapter` 从未被实例化」= 接线问题 → **P1-08**；
- 「`causal_statements.json` 只有 5 条，对应 211 条关系」= 内容供给为零级别 → **本文档 G-06**。

两者写在不同文档里，互相交叉引用，不合并、不重复。

### 0.2 使命尺度（判定缺口的唯一标尺）

依据 `Product_Constitution.md` Article 0（第 17–23 行，权威中文文本）与 PO 的四句愿景：

| 层 | 定位句 | 本文档使用的判据 |
|----|--------|-----------------|
| 对象层 Object | 帮助用户逐渐形成文明、理解、认知结构的探索系统 | 用户离场时是否长出了属于自己的因果与理解结构 |
| 主体层 Subject | 帮助用户找到自己的兴趣和自己的学习方法 | 用户是否照见了一点自己的兴趣与方法 |
| 真值层 Truth | 帮助用户无限逼近真相 | 用户是否能自行判断「这条有多可靠、我离真相差哪一步」 |
| 北极星 | 进来时好奇，离开时有一个更聪明的自己 | `understandingGrowthScore` 是否真实可得 |
| 未来愿景 | 跨学科原子化知识与学科间贯通（OD-05） | 架构是否不阻塞；**不预支实现** |

`Product_Constitution.md` Article 0 明文：**「None of the three layers is optional」**（第 42 行）。因此任一层的结构性空缺即为 blocking 级缺口。

### 0.3 严重度口径

| 等级 | 含义 |
|------|------|
| **blocking** | 使 Article 0 三句话中的某一句在产品上完全落空，或使北极星指标不可得。不解决则 Phase 2 无法为该层设计任何体验 |
| **major** | 该层仍有其它能力支撑，但本项缺失使已识别的最强用户需求或已发布的宪法承诺无法兑现 |
| **minor** | 当前不阻塞任何已承诺能力，但会限制已声明的未来方向 |

---

## 1. 缺口登记表

| ID | 缺口 | 失守的使命层 / 定位句 | 严重度 | 证据 |
|----|------|---------------------|--------|------|
| **G-01** | **主体层没有任何可运行的能力**。C22 Cognitive Mirror 是唯一直接承载第二句的能力，全栈零实现 | 主体层 / 第二句 | **blocking** | 全仓 grep `mirror` 在 `backend/app` 仅 5 处命中，全部为无关英文注释（`ai_gateway/citation_model.py:8`、`ai_gateway/grounding_builder.py:101`、`core/dataset_provider.py:215`、`core/domain/test_mapping.py:44`、`main.py:300`），无一处指向 Cognitive Mirror；前端零文件。P1-01 §2.5 判定「纯纸面」；P1-04 §3.2 列为 9 项不可删除能力之一 |
| **G-02** | **跨会话认知累积能力不存在**。C18 Cognitive Memory 无任何持久化，后端为架构级明文无状态，用户第二次回来时系统接不住上次的缺口 | 主体层 / 第二句；对象层 / 第一句 | **blocking** | `frontend/src/next/` 全目录 grep `localStorage\|sessionStorage\|indexedDB\|persist` **零命中**（本次复核）；`frontend/src/runtime/evaluation/Persistence.ts` 只定义 `MemoryStore` 接口，第 60 行自述「M87+ 可替换为 localStorage / IndexedDB / 后端 API 实现」——即持久化实现至今未落地；`backend/app/main.py:348` 自述端点 STRICTLY STATELESS；P1-03 §5.2 判定「这是架构级约束，不是待办事项」 |
| **G-03** | **第二句与第三句没有任何度量能力**。北极星 `understandingGrowthScore` 四项分量全部服务第一句；其中 `continuityScore` 依赖跨会话数据，因 G-02 实际恒不可得 | 主体层 + 真值层 / 北极星 | **blocking** | `docs/FRW-Phase0-ProductDiscovery-v2-2026-08-07.md:102` OD-01 原文：「四项分量全部服务第一句（对象层），**无一项度量第二句与第三句**。定位与度量当前不同步」；同文件 :104–107 缺口表（②兴趣清晰度、方法自觉度均无度量；③用户感知到的逼近程度无度量）；`backend/app` grep `understandingGrowthScore` 零命中 |
| **G-04** | **跨文明对比能力不存在**。其核心机制「维度对齐」全栈零实现；产品现有的只是跨主题连通度统计，回答的是「这两个主题之间有几条边」，不是「这两个文明在同一件事上有什么不同」 | 对象层 / 第一句；主体层 / 第二句 | **blocking** | P1-03 §4.2 判定「Comparison ≠ Cross-topic connectivity……产品当前对它的支撑为零」；`data/causal_objects.json` 实测 12 条，其中 `relation_type = civilization_contrast` **仅 1 条**，且所在 L3 层零读取者；被误认的三样东西分别是 `knowledge_service.cross_topic_related()`（连通度统计）、prompt mode `multi_civilization_view`（提问角度）、策展标签本身。需求侧：`docs/FRW-Phase0-ProductDiscovery-v2-2026-08-07.md:316` 记载「跨文明对比是 M81a 中 3/4 场自发提出的需求」 |
| **G-05** | **真值层没有面向用户的出口，且 P09 承诺的「异议叙述」全栈零存在**。C06 来源分级与 C07 证据主张只被内部消费，用户无法在任一结论处自行判断可靠性 | 真值层 / 第三句 | major | 宪法承诺：`docs/FRW-Phase0-ProductDiscovery-v2-2026-08-07.md:196` P09 原文要求用户能看见「证据强度、**来源分级**与存在的**异议叙述**」；实况：`data/sources.json` 实测 43 条、`data/evidence_claims.json` 实测 76 条，均在 `KnowledgeService.__init__` 一次性加载后仅供 grounding 与 Provenance 内部使用；`/provenance/{entity_id}`（`main.py:297`）只吐 `reference` 字符串，不吐 tier；`/ai/explain`（`main.py:366`）默认关闭（`ai_gateway/config.py:34` 读 `AI_GATEWAY_ENABLED`，未设即 False）。「异议叙述」在 `data/` 与 `backend/app` 双向零命中——**这不是没接线，是这项能力从未被定义过** |
| **G-06** | **因果解释在内容供给上实质缺失**。C10 的契约、模型与查询层齐备，但实例只有 5 条，覆盖 211 条关系的 2.4%。用户在绝大多数节点上拿不到任何「为什么」 | 对象层 / 第一句 | major | `data/causal_statements.json` 实测 **5 条**（本次 JSON 解析确认）；关系总数 211（P1-03 §2.1）；P1-04 §6 判定「L2 是整个依赖图的承重墙，而这堵墙目前是画上去的」。注：接线缺口（`ExplorationEngine.__init__(causal_adapter=None)`）属 P1-08，不在此计 |
| **G-07** | **空间维度没有能力**。C05 Spatial Anchoring 数据齐备而服务为零，四等维之一实际只有三维在运转 | 对象层 / 第一句 | major | 数据侧实测：145 实体中 Location 类型 **21 个**，其中 **16 个**带 `coordinates`（本次全量解析 `data/examples/*.json` 确认）；代码侧：`backend/app` 全目录 grep `coordinates\|latitude\|longitude\|geo` **零命中**（本次复核）。**订正**：P1-03 §2.4 记载的「43 个实体带坐标」有误，43 是 `sources.json` 的条数；以本条实测的 21/16 为准 |
| **G-08** | **跨学科愿景缺少一致的本体基座**。产品声明的终极愿景是把各学科知识原子化后贯通（OD-05），但当前存在两份互相矛盾、且其中一份自称唯一真相源的本体定义 | 未来愿景 / OD-05 | minor | `backend/app/validation.py:27/42` 冻结 8 类实体 / 18 类关系（TitleCase）；`backend/app/core/domain/ontology.py:32-35` 自称 "the single source of truth"，定义 6 类实体 / 5 类关系（lowercase），两者交集极小。P1-05 C-12 已记为冲突并明确指向本条（`P1-05:352`「详见 P1-06 G-08」）。**本条只判定其对 OD-05 可行性的影响，不主张现在实现跨学科**（Article 0 §0.3 明文「grants no authorization for multi-domain implementation」） |
| **G-09** | **认知定位的「Value」语义从未被定义**。Navigation Contract 三要素 From / Why / Value 中，前两者在语义层已有承载，Value 无任何定义、无任何实现 | 对象层 / 第一句；宪法 P01 / P05 | major | P1-01 §2.6 对 C23 的判定：「已具 currentAnchor / previousAnchor（From）/ activeRelation（Why）/ unresolvedGap。**缺一个统一的 Value 语义与全局约束**」；宪法 P05 要求「每次跳转有认知目的地」，Value 正是「这一步的认知价值」的承载位；M81a 四场共踩「要知道自己在哪」。后端 `navigation` grep 仅 2 处无关注释命中（`ai_gateway/__init__.py:5`、`core/causal/causal_object.py:50`） |
| **G-10** | **提问能力没有策展供给来源**。C25 要求用户的问题成为整次探索的语义锚，M90 同时规定 question 禁 AI 生成、禁从 entity name 拼接、须由 Curator 预写——三条禁令之下，当前没有任何策展来源 | 对象层 / 第一句；宪法 P07 | major | P1-01 §2.6 对 C25 的判定：「M90 要求 question 由 Curator 预写、**当前无策展来源**」；`data/` 下无任何 question 策展文件；后端 `/ai/chat`（`main.py:383`）严格无状态，前端 `ExplorerRuntimeContext.userQuestion` 与 `ExplorationState.activeQuestions` 两者不互通。结果：探索的第一环没有合法的启动素材 |

---

## 2. 三层覆盖的净结论

把 P1-01 §4 的三层矩阵与本文档缺口叠加后：

| 定位层 | 名义覆盖能力 | 扣除缺口后真实覆盖 | 判定 |
|--------|-------------|-------------------|------|
| 对象层 Object | C01 C02 C03 C04 C10 C11 C13 C14 C15 C16 C17 C19 C20 C23 C26 C27 | C01 C02 C03 C04 C11（L1 结构 + 路径措辞）；C10 内容为零（G-06）、C14 机制为零（G-04）、C13 零读取者、C05 无能力（G-07） | 只有事实与结构层在真实服务；「理解结构」尚未长出 |
| 主体层 Subject | C22 C18 C19 C20 | **零** | **结构性空缺**：G-01 + G-02 + G-03 三项 blocking 全部落在这一层 |
| 真值层 Truth | C06 C07 C08 C09 C10 C12 | 底座齐备但无用户出口（G-05） | 是后台质量属性，尚未成为用户能力 |

**一句话结论**：产品当前只在对象层的下半截（事实与结构）真实服务用户；主体层是完全空的；真值层建成了地基却没有开门。Article 0 明文「三层缺一不可」，当前缺两层。

---

## 3. 明确判定为「不是产品缺口」的项

本节的存在是为了防止与 P1-08 / P1-05 重复计数，以及防止把工程问题当产品缺口。

| 项 | 为何不登记为产品缺口 | 正确归属 |
|----|---------------------|---------|
| C26 Curated Exploration Package 后端零服务 | 能力存在且用户可用，问题是它以前端静态资源形态存在、无服务端校验与版本。这是形态与成熟度问题，不是覆盖缺失 | P1-08 成熟度；`package_context` 空转见 P1-05 C-11，处置待 Q-05 |
| C27 Deterministic Guide 后端零实现 | 能力以前端确定性数据形态存在，方向与「禁个性化」契约一致。是成熟度问题 | P1-08 成熟度；与 X01 的职责重叠见 P1-05 C-09 |
| Navigation 后端零实现 | 位置感能力本身以 C23 形态存在于语义层，缺的只是后端归属。**唯有 Value 语义从未被定义**，该部分已单列为 G-09 | P1-08 成熟度（后端归属）；G-09（Value 语义） |
| Bookmark 书签 | 全栈零证据（P1-01 §5.2 grep 零命中），且「收藏」是内容 App 的能力形态。Trail 已被 Phase0 v1 §3.2 明确定义为「认知轨迹，非收藏夹」。**它不是缺口，它是一个不应被填的洞** | 不登记。若 PO 坚持引入，须先回答它服务三层定位的哪一句 |
| L2 `CausalStatementAdapter` 未实例化 / L3 CausalObject 零读取者 | 代码在、线不在。P1-04 §4 已定位到断点 1 与断点 2 | P1-08 成熟度 |
| L4 全层（C15–C21）后端零实现 | 能力以前端语义层形态存在并部分接入 `App.tsx`，是实现位置与成熟度问题 | P1-08 成熟度 + R1 对照表 |
| X01 Recommendation | 禁止项。它是「多出来的东西」，不是「缺的东西」 | P1-05 C-01 / C-02，待 Q-01 / Q-03 |
| `/ai/explain` 与 `/ai/chat` 同实现双名 | 能力冗余，非能力缺失 | P1-05 C-05 |
| `connections_explained` 冒名解释 | 边界污染，非能力缺失 | P1-05 C-06，待 Q-04 |

---

## 4. 缺口 × 开放决策依赖映射

每一项缺口都必须知道「谁不点头就动不了」。下表把 10 项缺口逐一挂到未决项上。

### 4.1 依赖映射表

| 缺口 | 依赖的开放决策 | 依赖性质 | 不裁决的后果 |
|------|---------------|---------|-------------|
| G-01 认知镜像不存在 | **OD-02**（Mirror 落 L4 只读投影扩展 甲 / 新增 L4.5 独立层 乙）；`Phase0 v2:139` 标注「阻塞 Phase 1 结论」 | **硬阻塞**。落层未定则依赖图无法为它定义上游，P1-04 §5 的 CI 可检查判据也无法落地 | Article 0 第二句永远无承载者，产品塌成两层，直接违宪 |
| G-02 跨会话累积不存在 | **OD-02**（Mirror 是 Memory 的唯一合法下游之一）；并需 PO 就「是否引入用户身份与服务端持久化」定调（当前无对应编号，本文档建议登记为新开放项） | 硬阻塞 + 架构级 | `continuityScore` 恒为不可得，G-03 无法解除；Mirror 即使落层也无原料 |
| G-03 第二句/第三句无度量 | **OD-01**（增补并列指标 / 重构为合成指标 / 暂不度量，`Phase0 v2:108` 明文「Phase 0 不预设结论」，转 Phase 1） | 硬阻塞 | 北极星只能度量第一句，「变聪明了吗」这一最高可证伪判据无法被验证 |
| G-04 跨文明对比不存在 | **R5**（跨文明对比是否提为一级能力，`Phase0 v2:314/316`，状态：仍未裁决，「仅提不主张」） | **硬阻塞**。若不提为一级能力，则维度对齐机制无立项依据 | 最强自发用户需求（3/4 场）持续零供给，产品相对百科与 AI 问答的最强差异点不成立 |
| G-05 真值层无用户出口 | **OD-03**（P09 的前台表达形态，`Phase0 v2:324`，标注归属 Phase 2）；**Q-04**（Explanation 权威来源仲裁，决定「异议叙述」挂在哪一层） | 软依赖 + 定义依赖 | P09 停留为后台质量属性；第三句无用户可感的兑现方式 |
| G-06 因果内容供给缺失 | **Q-04**（Explanation 的权威来源：模板短语 / AI Gateway / Causal 三选一或定仲裁顺序） | 定义依赖 | 在权威来源未定前扩充 `causal_statements` 数据，可能补到一个最终不被采用的来源上 |
| G-07 空间维度无能力 | 无强依赖。P1-04 §3.3 判定 Map 「可降级为后置」 | 独立 | 四等维承诺（PRD v1.0）持续不兑现，但不阻塞三层定位 |
| G-08 无一致本体基座 | **OD-05**（跨学科愿景，`Phase0 v2:354` 明文「本期冻结不预支跨领域实现」）；并需先解决 P1-05 C-12 的双真相源 | 前置条件依赖 | 在 OD-05 真正启动时，采集体系与运行时校验体系不同源的问题会一次性爆发 |
| G-09 Value 语义未定义 | **Q-01**（Next Node 决定权归属）。Value 的语义取决于「这一步为什么值得走」由谁决定：AI / 推荐算法 / ExplorationPolicy | 定义依赖 | 跳转契约永远只有 From/Why 两条腿；宪法 P05「每次跳转有认知目的地」无法验收 |
| G-10 提问无策展来源 | **Q-05**（Package 能力归属）。question 的合法来源只能是策展物，而 Package 是当前唯一的策展载体 | 载体依赖 | 探索首环无合法启动素材，实现方会被迫违反 M90 的两条禁令（AI 生成 / 实体名拼接） |

### 4.2 按决策项反查

| 决策项 | 阻塞的缺口 | 归属 | 状态 |
|--------|-----------|------|------|
| **OD-01** 北极星是否增补兴趣/方法/真相三向度量 | G-03 | Phase 1 | 未裁决 |
| **OD-02** Cognitive Mirror 落层 | G-01、G-02 | Phase 1 | 未裁决，**明文阻塞 Phase 1 结论** |
| **OD-03** P09 前台表达形态 | G-05 | Phase 2 | 未裁决（不阻塞 Phase 1） |
| **OD-05** 跨学科实现 | G-08 | 未定 | 明文不预支 |
| **R5** 跨文明对比是否提为一级能力 | G-04 | 未定 | 未裁决 |
| **Q-01** Next Node 决定权 | G-09 | Phase 1（P1-05 §5） | 未裁决 |
| **Q-02** Cognitive Mirror 层归属 | G-01（与 OD-02 同一问题的 P1-05 编号） | Phase 1 | 未裁决 |
| **Q-03** `/entity/{id}/recommendations` 处置 | 无（属冲突侧） | Phase 1 | 未裁决 |
| **Q-04** Explanation 权威来源 | G-05、G-06 | Phase 1 | 未裁决 |
| **Q-05** Package 能力归属 | G-10 | Phase 1 | 未裁决 |

**关键读数**：10 项缺口中有 **9 项** 挂在未裁决项上，其中 3 项 blocking 缺口（G-01 / G-02 / G-03）全部指向同一组决策——**主体层怎么落地**。这意味着 Phase 1 的结论无法在 OD-01 与 OD-02 裁决前闭合，这与 `Phase0 v2:139` 与 `:323` 的判断一致。

---

## 5. 本文档新增的开放项建议

以下问题在核查中浮现，现有编号体系未覆盖。不自行裁决，登记供 PO 处理。

| 建议编号 | 问题 | 由哪条缺口触发 | 为什么必须单独问 |
|---------|------|---------------|-----------------|
| **OD-06（建议）** | 是否引入用户身份与服务端持久化 | G-02 | 后端明文无状态是架构级设定（`main.py:348`），不是待办。跨会话累积、`continuityScore`、Cognitive Mirror 的原料三者同时依赖这一个前提。若答案是「不引入」，则 Article 0 第二句必须换一种兑现方式，而不是等待实现 |
| **OD-07（建议）** | 「异议叙述」是否作为一级策展对象立项 | G-05 | P09 承诺了三要素（证据强度 / 来源分级 / 异议叙述），前两者有数据、第三者连数据模型都不存在。这不是接线问题，需要一次立项决定 |

---

## 6. 移交 P1-07 / P1-08 的结论

1. 共登记 **10 项产品缺口**，其中 **blocking 4 项**（G-01 / G-02 / G-03 / G-04）、**major 5 项**、**minor 1 项**。
2. **最重要的一条**：主体层（Article 0 第二句）不是「实现得不好」，而是**一项可运行能力都没有**。G-01 / G-02 / G-03 三项 blocking 全部落在这一层，且互为因果——Mirror 没有落层（G-01）、Memory 没有持久化（G-02）、于是唯一能反映主体层的度量恒不可得（G-03）。
3. **需求侧最刺眼的一条**：G-04 跨文明对比。它是 M81a 四场里三场自发提出的最强需求，产品对它的支撑是 1 条策展标签，且这条标签所在的层零读取者。
4. 本文档**未登记**任何「代码在、线不在」的项——它们全部移交 P1-08，包括 L2 接线断点、L3 零读取者、L4 全层后端缺席、Package / Guide / Navigation 的后端归属。
5. 本文档**未发明**任何能力。Bookmark 经复核后明确判定为「不应被填的洞」，并给出了判定理由。
6. **9 / 10 项缺口挂在未裁决项上**。Phase 1 若要给出可闭合的结论，OD-01（度量）与 OD-02（Mirror 落层）必须先落。

---

## 附录 A：本次实地核查记录（可复现）

| 核查项 | 方法 | 结果 |
|--------|------|------|
| Cognitive Mirror 缺席 | `grep -rin "mirror" backend/app` | 5 处命中，逐条打开确认全部为无关英文注释；无 Cognitive Mirror 实现 |
| 记忆持久化缺席 | `grep -rn "localStorage\|sessionStorage\|indexedDB\|persist" frontend/src/next` | 零命中 |
| 持久化契约状态 | 读 `frontend/src/runtime/evaluation/Persistence.ts` | `MemoryStore` 仅为 interface；第 60 行自述实现待 M87+ 替换 |
| 空间能力缺席 | `grep -rin -E "coordinates\|latitude\|longitude\|\bgeo\b" backend/app` | 零命中 |
| 坐标数据计数 | Python 全量解析 `data/examples/*.json` | 145 实体 / Location 21 / 带 coordinates 16。订正 P1-03 §2.4 的「43」 |
| 策展数据计数 | Python 解析 `data/*.json` | sources 43 / evidence_claims 76 / causal_objects 12 / causal_statements 5 / exploration_packages 4 |
| 认知缺口关键词缺席 | 在 `backend/app` grep `ExplorationState / coverage_ratio / coverageRatio / missingDimensions / missing_dimensions / UnderstandingStage / RuleTrace / ExplorationAction / MemoryProjection / UnderstandingProjection / understandingGrowthScore / bookmark / trail / exploration_packages` | 全部零命中 |
| 跨主题连通暴露面 | 读 `backend/app/main.py` | `:156-159` 与 `:249-250` 确认 `cross_topic_related` / `related_topics_*` 已随 `/explore` 与 `/entity` 对外 |
| 契约原文 | 读 `Product_Constitution.md` Article 0、`FRW-Phase0-ProductDiscovery-v2-2026-08-07.md`（OD-01 :102 / OD-02 :139 / P09 :196 / R5 :316 / OD 表 :322-325 / OD-05 :354） | 已覆盖 |
