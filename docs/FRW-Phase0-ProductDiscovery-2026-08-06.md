# FRW Phase 0 — Product Discovery Report（产品理解报告）

> **STATUS: SUPERSEDED（2026-08-07）**
> 本文件已被 `docs/FRW-Phase0-ProductDiscovery-v2-2026-08-07.md` 取代。
> 取代原因：PO 于 2026-08-07 给出终极定位三句话，产品定位由「历史理解的探索引擎」升级为三层定位（对象层/主体层/真值层），历史降为载体。依据 ADR-0013。
> 本文件仍为有效引用源：v2 明确声明第三节 3.1、第四节全文、第五节主体继续有效，未复制而以引用方式保留。阅读 v2 时如遇「参见 v1」，回到本文件。
> 已失效章节：第一节（产品定位）、第八节 Q1、第九节 Exit Criteria、第十节 R9。

> 生成日期：2026-08-06
> 流程依据：docs/FRONTEND_RECONSTRUCTION_WORKFLOW.md（Frozen v1.1，ADR-0012）
> 团队：许清楚（PM）/ 高见远（架构师）/ 颜好看（设计师），由项目总监（大湾区靓仔）合成
> 状态：Phase 0 完成，待 PO 确认认知对齐 + 裁决 R1/R6 后进入 Phase 1
> 纪律声明：Phase 0 全程仅阅读理解，零代码修改、零文档写入（本报告为 Phase 0 退出时的正式产出物，不违反阅读阶段纪律）

---

## 一、产品定位（Task 0.1）

**一句话定位**：History Explorer 是一台"历史理解的探索引擎"（历史认知 OS）。产品隐喻是"历史版 Google Maps"——用户不是来"查一条历史知识"，而是来"在历史的关系空间里持续走下去，并在走的过程中长出理解结构"。

**最小价值单位**：Understanding Transition（理解结构的一次可测量变化），不是页面、不是条目、不是答案。

**它不是什么（逐条排除，附证据）**：

| 不是 | 差异根因 | 证据 |
|------|---------|------|
| 百科/词条库 | 百科最小单位是条目，读完即结束；本产品最小单位是 Understanding Transition | M90 最小体验单位；M89.1 禁止历史详情页 |
| 知识图谱查看器 | KG 是事实底层不是产品；图本身对用户无价值，"关系带语义"才有 | M85.1 Relationship≠Edge 防火墙；P08 |
| AI 聊天机器人 | AI 是 Exploration Layer 非 Knowledge Layer，解释但不产事实、不定方向 | M80.5 AI 四角色；M88.0 LLM 只解释不决定方向；Product_Constitution "AI as Guide, Not Authority" |
| 时间轴工具 | Timeline 只是四等维之一，做成时间轴=四维塌缩成一维 | PRD 四元素协同（Graph/Timeline/Map/AI 等维） |
| 搜索引擎 | 搜索心智="我知道要找什么"；本产品服务"我不知道要什么但想弄明白" | Product_DNA 心智模型 "Let me explore history" vs "Let me search for a fact"；M89.1 禁止搜索框主导入口 |
| 推荐系统 | 推荐基于点击率/时长/相似度；本产品基于认知缺口（missingDimensions） | M88.0 Exploration≠Recommendation；M88 战略第九节把"猜你喜欢"列为最大风险 |
| 内容 App | Product_Constitution 四禁区之一 Content Dump | Product_Constitution |

**正面定义**：它是认知伴随系统，由三件事构成，缺一不可：
1. 一张冻结的事实底座（KG：8 实体/18 关系）→ 负责"这是真的"
2. 一套确定性解释与导航规则（exploration_engine 固定权重 + understandingRules 18 模板）→ 负责"为什么重要、下一步去哪"
3. 一个持续累积的理解状态（ExplorationState/MemoryProjection/Trail）→ 负责"你懂了什么、还缺什么"

只有 1 = 数据库；1+2 = 一次性阅读器；1+2+3 才是探索引擎。

**可证伪判据**（M89.1 验收问题）："你觉得它是在回答问题，还是带你理解一个主题？"答"回答问题"=定位失败（滑成搜索/百科/AI 问答）；答"带我理解主题"=定位成立。

---

## 二、产品目标（Task 0.2）

**最终要解决的问题**：一个人对历史"知道很多事实，但理解不了它为什么这样发生"。现有工具（搜索/百科/AI 问答）都在解决"获取信息"，没有一个在解决"建立因果结构"。

**北极星指标**（唯一，来源 M88.5.1）：

```
understandingGrowthScore = depthDelta + dimensionDelta + connectionDelta + continuityScore
```

- depthDelta：理解深度增量（事实层→机制层）
- dimensionDelta：维度覆盖增量（政治/经济/军事/文化等）
- connectionDelta：连接数增量
- continuityScore：跨会话连续性（Session2 首探维度是否落在 Session1 的 missingDimensions）

M88.5.1 定性锚句："衡量认知结构变化，非用户行为。"这直接排除了 DAU/时长/PV/点击率作为北极星。

**为什么不是一次搜索**：体验模型是环不是线（Curiosity→Orientation→Discovery→Connection→Understanding→New Question↻）。关键在最后一段箭头：Understanding 的产出是 New Question，不是 Closure。搜索的产出是 Closure（问题消失），本产品产出是 New Question（问题升级）。

**为什么不是一次阅读**：一次阅读的信息是作者组织好的，用户被动接受。本产品要用户自己搭建因果结构——只有自己搭的结构才会被记住、才会产生新问题。

**continuityScore 的存在本身就是"为什么必须持续探索"的产品级答案**——如果一次就够，这个指标不需要存在。

---

## 三、核心能力地图（Task 0.3）

### 3.1 五层能力总图

```
L5 体验层 Experience / Explorer Shell（来源 M90）
   · 单一 Shell + 5 Mode（Exploration/Explanation/Relationship/Understanding/Civilization）
   · Navigation Contract: From / Why / Value
   · 最小体验单位 = Understanding Transition
        ▲ 消费（只读投影，不反写）
L4 运行时层 Cognitive / Explorer Runtime（来源 M86.1 / M88 / M89）
   · ExplorerRuntimeContext(10 字段)
   · UnderstandingProjection / MemoryProjection
   · ExplorationState(currentTopic/coveredDimensions/missingDimensions/coverageRatio)
   · ExplorationPolicy → Decision<ExplorationAction> + RuleTrace
   · ExplorationMetrics(4 Delta + GrowthScore)
        ▲ Knowledge Projection（隔离层，禁止直连 KG）
L3 理解层 Understanding / Semantic Relationship（来源 M85.1）
   · 回答"这个连接为什么重要"
   · CausalObject(11 字段，含 related_causal_objects)
   · RelatedCausalObjectRef = 策展人撰写的理解入口，非图边
   · relation_type ×4 冻结: institutional_evolution / technological_chain / civilization_contrast / ideological_influence
        ▲
L2 解释层 Explanation（来源 CHANGELOG vM78 / ADR-M82）
   · CausalStatement 冻结 6 字段(cause_id/effect_id/mechanism/consequence/confidence/evidence_refs)
   · causal_type 已于 vM78 移除 → 关系种类语义归 Graph Layer
   · AI Gateway(ADR-0003/M11/M74)：仅解释，不产事实
        ▲
L1 事实层 Fact / Knowledge Graph（已冻结）CURRENT_ARCHITECTURE_BASELINE
   · ENTITY_TYPES=8, RELATIONSHIP_TYPES=18
   · 内存 JSON 存储；无 Neo4j/PostgreSQL/Elasticsearch
   · Evidence / Source 三级分级 / 43 SourceRecords
```

### 3.2 横切能力
- Exploration Engine：确定性打分 W_RELATIONSHIP .35 / TEMPORAL .25 / IMPORTANCE .20 / SIMPLICITY .20；时间半衰期 500 年；recommend_next 四权重 .40/.25/.20/.15。全程无 AI/ML
- Exploration Package(M69)：冻结 KG 之上的策展视图，owns no facts
- Exploration Guide(M70)：确定性导航，禁 LLM/评分/个性化
- Personal Exploration Trail(M63-B/M83)：认知轨迹，非收藏夹
- i18n zh/en/ja + Terminology Layer(M62.5)
- Freeze Guard / freeze-check / emoji-scan（CI 强制门）

### 3.3 能力间的关系约束（"禁止关系"比"允许关系"更能定义产品）
1. L1→L2 单向：Fact 可被解释，解释不可反写 Fact。AI 永不是事实来源（M74 Trust Boundary）
2. L2 ≠ L3：解释层说"A 导致 B 的机制"；理解层说"这连接对你为什么重要"。RelatedCausalObjectRef 不是图边、不进图遍历
3. L3→L4 必经 Projection：M89.0 强制 KG→Projection→ExplorationState→Policy，运行时不得直连 KG
4. L4→L5 只读：前端不持有、不组装事实。M74 已落实"Evidence Card 五字段全部后端产出，零前端事实组装"
5. Package 不拥有事实：validatePackage() 强制跨 9 dataset 零悬空指针
6. Guide 不做个性化：禁 LLM/评分/个性化，保持 Package 策展声明顺序
7. Exploration ≠ Recommendation：输入是 coverageRatio/missingDimensions，非点击率/时长/相似度

### 3.4 已实现 vs 仅为契约（对 FRW 后续阶段致命）
**已实现且有测试覆盖**：Knowledge Core(8/18)、Global Graph、Deterministic Exploration Engine、5-Zone UI、Next-Node Recommendation、Grounded AI Interpretation Layer(M74，默认 OFF)、Exploration Package(M69/70/72，四文明)、Exploration Guide、i18n(zh/en/ja)、Evidence/Source 三级、explorationMetrics.ts、Playwright E2E。后端 pytest 331 passed，runtime v0.13.0。

**目前主要是契约/冻结文档而非运行代码**（架构师补遗关键发现）：`frontend/src/next/` 是一套已编码、且已接入 `App.tsx`（第 79/88/99/103 行 import）的认知 Runtime（ExplorerRuntimeContext / ExplorationState / ExplorationPolicy→Decision<T> / UnderstandingProjection / MemoryProjection / HistoricalKnowledgeProjection / ExplorationMetrics 等），但**不在 `scripts/freeze-check.mjs` 白名单**（grep 零命中）→ 落入 ADR-M78-FR 记录的 diff-based scope 盲区；且 **PROJECT_CONTEXT.md(v1.1) 完全未提及** → "当前现实"文档相对代码树过时。

---

## 四、架构理解（Task 0.4，来自架构师）

**当前架构为什么是这样**：分层（Fact→Explanation→Understanding→Runtime→Experience）、无外部 DB（In-memory JSON）、无 LLM 运行时、无登录/权限，全是冻结基线的刻意选择。

**为什么不能随便改**：两道锁 ——
1. 架构冻结基线（ENTITY_TYPES=8 / RELATIONSHIP_TYPES=18，backend/app/validation.py 唯一权威；Ontology 与 Global Schema Constraint Boundary 8/18 保持解耦）
2. Freeze Revision Gate（ADR + 架构评审 + PO 批准，缺一不可）

**哪些属于冻结**：8/18 枚举、内存 JSON、无新依赖；排除清单 Neo4j/PostgreSQL/Elasticsearch/GIS/用户认证/运行时 LLM；唯一 AI 例外 = backend/app/ai_gateway/（M74 Grounding Runtime 默认 OFF）。

**哪些属于未来**：Neo4j/PG/ES/GIS（PRD 长期技术栈）、运行时 LLM、用户账户与云端持久化、多领域本体（M76-M77 已验证框架可插拔）。全部在排除清单内，进入需走 Freeze Revision Gate。

**当前状态灰区**（架构师补遗）：`frontend/src/next/` 已接入但游离于冻结白名单 + 文档之外。冻结边界（8/18、无新依赖、AI 仅 ai_gateway）不受影响，但"当前架构到底是什么"比 M90.1 单一描述更复杂。

---

## 五、用户心智模型（Task 0.5）

**用户是谁**：非专业历史爱好者。唯一一手证据 = M81a 四场真人观察（N=4，S001-S004），其余均为推演。样本极小但方向性信号高度一致。

**用户真实心智（原话提炼）**：

| 心智信号 | 原话 | 产品含义 |
|---------|------|---------|
| 想比较不想罗列 | "同时间世界上其他地方发生了什么"(S002)、"这个就是我探索的兴趣"(S004) | 跨文明对比是 3/4 场自发提出的最强需求 |
| 要因果不要标签 | "知道有关系但什么关系不知道，不信任系统"(S002) | 只标"存在关系"不给因果叙事=直接摧毁信任（P08 现场证据） |
| 要理由不要打分 | "评分依据哪些维度？规则是什么？"(S002) | 不可解释的分数制造不信任，解释为何引擎必须是固定可解释公式 |
| 会自己归纳方法论 | S002 自行归纳"了解–研究–扩展"三段法 | 用户心智天然是"阶段推进"而非"页面浏览" |
| 要知道自己在哪 | "上面应该有个路径可回溯"(S002) | P01 不是理念洁癖，是四场共踩的坑 |
| 误把它当百科 | "不像历史，像查资料失败"(S001) | 定位传达当前是失败的 |
| 搜索框是陷阱 | 四场全部第一动作找搜索框，全部失望 | 最大心智落差点：用户旧习惯是搜索，产品价值是探索 |

**为什么用户会"一直探索"**：用户不是因为喜欢探索而探索，是因为每一步都被给了一个"值得的下一步"才继续。M81a：S004 只 12 分钟就停，因"点进去什么东西也没有"→ 探索链断人就走；S002 42 分钟因内容密度撑住链条。**持续探索不是用户属性，是系统责任。**

**为什么是 Explore/Discover/Understand/Connection 而非 Search/Find/Answer**：
- Search/Find/Answer 预设"问题已成形、答案即终点、拿到即离开"——线性、封闭、一次性消费
- Explore/Discover/Understand/Connection 预设"问题在探索中生成、理解是过程、关联是价值、离开时带新疑问回来"——螺旋、开放、反复回访
- 关键：Answer 在历史领域是危险动词。历史无唯一答案，承诺 Answer 就必须选边站，变成 Product_Constitution 明令禁止的 Biased Interpretation Engine。改用 Understand，产品责任从"给出正确答案"变成"给出可追溯的解释路径"——既是产品哲学，也是风险规避的架构决策。

**用户旅程五阶段**（M89.1 冻结）：Curiosity→Orientation→Exploration→Understanding→Growth。失败信号即前端重构的反面验收用例（P1"我该选哪个"/P3"我怎么到这了"/P4 只能说"我看了很多资料"）。

---

## 六、产品宪法 / 原则 / 冻结（Task 0.6，汇编自既有文档）

**第一编 产品信念**：B1 History Is Connected / B2 Exploration Is Core / B3 Understanding > Information / B4 AI as Guide Not Authority / B5 Four-Element Synergy（Graph/Timeline/Map/AI 四等维无主次）

**第二编 产品禁区**：四禁区（Content Dump / Generic AI Chatbot / Short-Term Engagement / Biased Interpretation Engine）+ 补充禁区（M89.1：历史详情页 / 推荐列表 / 知识卡片堆叠 / 搜索框主导入口）

**第三编 体验宪法 P01–P08**（永不可变）：P01 永远知道为何在此 / P02 认知推进优先于信息展示 / P03 一切翻译为人话 / P04 核心价值主动可见 / P05 每次跳转有认知目的地 / P06 必须有理解闭环信号 / P07 疑问驱动非推荐驱动 / P08 关系必须带语义

**第四编 前端不可妥协（M90）**：FP-01 单一容器（唯一 Explorer Shell）/ FP-02 Mode 而非 Page / FP-03 跳转必须携带语义（From/Why/Value）

**第五编 架构冻结边界**：ENTITY_TYPES=8 / RELATIONSHIP_TYPES=18 / 内存 JSON / 不得新增运行时依赖 / 排除 Neo4j/PG/ES/GIS/auth/运行时 LLM / 唯一 AI 例外 backend/app/ai_gateway/（默认 OFF）/ CausalStatement 6 字段 / CausalObject 11 字段 / Semantic relation_type×4

**第六编 治理机制**：PO（方向+Freeze Revision 最终批准）/ Product Architect（架构一致性+冻结守护）/ AI Agent（边界内执行）；Freeze Revision Gate 三重门（ADR→架构评审→PO 批准）；FRW 六阶段 + 六铁律（ADR-0012）；落盘命名 FRW-{Phase}-{Artifact}-{YYYY-MM-DD}.md；动工 Gate（Phase 0–4 全通过前禁止写前端实现代码）

**第七编 决策四问**（新功能进入前必答）：是否服务"理解"而非"信息量"？是否强化"关系"而非"节点"？是否让用户更想继续探索而非更快离开？是否可解释、可追溯、无立场？

**第八编 团队级 P0 执行规则**：禁 emoji 作功能图标（frontend/src/components/ui/Icon.tsx 22 图标 + scripts/emoji-scan.mjs CI 门）/ 禁紫→粉渐变 / 禁 AI 模板味文案（M81a 已证明生硬文案直接导致用户流失）

---

## 七、产品全景图（Task 0.7，Product Knowledge Graph）

```
History Explorer（探索引擎 / 历史认知 OS）
│
├─【WHY 目标】建立"因果结构"而非"积累事实"
│   ├─ 更深 → depthDelta
│   ├─ 更连续 → continuityScore（留存的根）
│   ├─ 更有方向感 → missingDimensions 驱动
│   └─ 北极星 = understandingGrowthScore（认知增量，非行为指标）
│
├─【WHO 用户】
│   ├─ 非专业历史爱好者（M81a N=4 实证）
│   ├─ 心智动词 Explore/Discover/Understand/Connection
│   ├─ 最强自发需求：跨文明对比（3/4 场）
│   ├─ 最强失败点：只标关系不给因果 → 不信任
│   └─ 旅程五阶段 Curiosity→Orientation→Exploration→Understanding→Growth
│
├─【WHAT 能力五层】
│   ├─ L1 Fact：Entity×8 / Relationship×18 / Evidence / Source 三级 / 内存 JSON
│   ├─ L2 Explanation：CausalStatement 6 字段 / AI Gateway（唯一 AI 区，默认 OFF）
│   ├─ L3 Understanding：CausalObject 11 字段 / RelatedCausalObjectRef（≠图边）/ relation_type×4
│   ├─ L4 Runtime：ExplorerRuntimeContext 10 字段 / Understanding+Memory Projection /
│   │              ExplorationState / Policy→Decision<Action>+RuleTrace / Metrics
│   └─ L5 Experience：单一 Shell(FP-01) / Mode×5(FP-02) / Navigation Contract(FP-03) /
│                     最小单位 = Understanding Transition
│
├─【HOW 横切】Exploration Engine（确定性四权重+500y 半衰期）/ Package（owns no facts）/
│              Guide（禁 LLM 评分个性化）/ Trail（≠收藏夹）/ i18n zh-en-ja /
│              Freeze Guard + freeze-check + emoji-scan
│
├─【关系约束｜负空间，同等重要】
│   ├─ Fact ⇄ AI 单向，AI 永不为事实来源
│   ├─ Relationship ≠ Edge（M85.1 防火墙）
│   ├─ Exploration ≠ Recommendation（M88.0 防火墙）
│   ├─ Runtime 禁直连 KG，必经 Knowledge Projection（M89.0）
│   ├─ 前端零事实组装（M74）
│   └─ Package 不拥有事实（M69）
│
└─【未来扩展｜愿景非当前范围】
    Neo4j / PostgreSQL / Elasticsearch / GIS / 运行时 LLM / 用户账户与云端持久化 /
    多领域本体（M76-M77 已验证框架可插拔）
    ※ 全部在排除清单内，进入需走 Freeze Revision Gate
```

---

## 八、三个核心问题的正式回答

**Q1 到底是什么？** 一台把"历史事实"转换成"用户脑内因果结构"的确定性探索引擎。输入=冻结 KG（8 实体/18 关系+证据+来源）；处理=可解释规则（引擎权重公式+理解模板+ExplorationPolicy）；输出不是页面，是 Understanding Transition——理解结构的一次可测量变化。它是三样东西的合体：可信事实底座 + 可解释导航规则 + 持续累积理解记忆。

**Q2 为什么这样设计？**（因果链）
1. 历史价值在关系里 → 底座必须是图（Graph-first）
2. 图本身对人无意义 → 必须有 Semantic Layer 答"这连接为什么重要"（M85.1）
3. 历史没有唯一答案 → 不能承诺 Answer，只能承诺可追溯解释路径（避开 Biased Interpretation Engine 禁区）
4. 不能承诺答案就必须承诺方向感 → ExplorationPolicy 基于认知缺口生成下一步（M88.0）
5. 方向感必须可信 → 引擎必须确定性可解释可复现，不能黑箱 ML（M81a 实证："评分依据哪些维度？规则是什么？"——不可解释的分数制造不信任）
6. 一次理解不够 → 必须有 Memory/Trail/continuityScore，把单次会话升级成跨会话成长
7. 体验必须承载以上全部 → 前端必须单一 Shell + Mode + 语义化导航（FP-01/02/03），而非多入口多容器
8. 规则若无强制力就会漂移 → Freeze Boundary + Freeze Revision Gate + freeze-check CI + ADR-0012

**Q3 为什么不能设计成别的样子？**

| 替代设计 | 撞墙点 | 后果 |
|---------|--------|------|
| 百科/词条站 | 违反 B3 + 四禁区 + M89.1 禁项 | 读完即走，continuityScore 恒为 0，无留存根基。M81a 三场误读成百科→"像查资料失败" |
| AI 问答 | 违反 B4 + 四禁区；历史无唯一答案 | 必然幻觉与立场。M74 Trust Gate 就是为堵这条路 |
| 推荐系统 | 违反四禁区 + M88.0；M88 战略第九节列为最大风险 | 优化目标从"认知增长"退化为"停留时长"，产品目标反转 |
| 搜索引擎 | 违反 M89.1 禁项 | 用户必须已知要找什么，而本产品用户恰恰不知道。M81a 四场全找搜索框全失望 |
| 时间轴工具 | 违反 B5 四等维 | 四维塌缩成一维，跨文明对比（用户最强需求）在单一时间轴无法表达 |

更根本一层：以上五种都是"交付信息"型产品，价值在交付瞬间完成。History Explorer 的价值定义是跨会话的认知结构增长（continuityScore 的存在即证明）。价值定义不同，架构必然不同——这不是风格选择，是目标函数决定的结构约束。

---

## 九、Exit Criteria 对照（Phase 0 退出条件）

| # | 退出条件 | 状态 |
|---|---------|------|
| 1 | 能准确描述定位而非罗列功能 | 满足（探索引擎 + 三合体 + 可证伪判据） |
| 2 | 完整梳理核心能力及关系 | 满足（五层 + 六禁止关系 + 已实现/仅契约区分） |
| 3 | 解释三层架构（Fact→Explanation→Understanding）及设计原因 | 满足（含 M81a 实证） |
| 4 | 明确不可违反的原则/约束/冻结 | 满足（八编宪法 + 架构冻结边界） |
| 5 | 说明用户探索路径与价值 | 满足（五阶段旅程 + continuityScore 留存根） |
| 6 | 输出统一认知模型供后续基线 | 满足（三方共识基线 + 全景图，本报告即产出物） |

六项全部满足。进入 Phase 1 前需 PO 裁决下列疑问中的阻塞项。

---

## 十、待 PO 裁决疑问（R1–R9）

**R1【阻塞 Phase 1，最高优先】契约文档 vs 可运行代码巨大落差**
60+ 份 Contract/Boundary 文档标"只读不写"，但 runtime 仍 v0.13.0、331 测试。M89.1 要求前端消费的 ExplorationState/Policy/MemoryProjection/Metrics 等**是否有可调用实现**？架构师发现 `frontend/src/next/` 已编码且接入 App.tsx 但游离冻结白名单 + 文档未述。
风险：Phase 2 基于契约定义体验，Phase 5 发现前端在消费不存在的接口。
建议：Phase 1 首个交付物 = 「契约 vs 实现」逐字段对照表（架构师主导，三栏：被 App.tsx 实际消费 / 白名单缺口 / 文档过时）。

**R6【阻塞 Phase 2，最尖锐】首屏入口范式与用户习惯正面冲突**
M89.1 硬禁搜索框主导入口，但 M81a 四场用户全部第一动作找搜索框且全部失望。
- 选项 A（推荐）：坚持原则，Phase 2 设计强引导把用户从"搜索心智"扭转为"问题心智"
- 选项 B：修订 M89.1 允许搜索框作辅助入口（须走 Freeze Revision Gate）
需 PO 定调，决定 Phase 2 入口设计根本方向。

**R2/R3/R4【需定权威版本】文档自身版本打架**
- 体验阶段模型：M85.11.3 六段 vs M89.1 五段
- Mode×5 vs 旅程×5 对不上（Civilization 无阶段、Orientation/Growth 无容器）
- ExplorationAction 枚举：M88_STRATEGIC 4 种 vs M88.0 5 种仅 2 重合
需指定哪套是 Phase 2 权威，否则状态机会建错。

**R5【产品方向，非阻塞】跨文明对比是否提升为一级能力**
M81a 三场自发提出，是百科/AI 问答都做不好的差异化点，但契约里权重偏低（排最后）。是否提为一级甚至首屏？仅提不主张。

**R7** M89 路线图（M89.0~M89.4）文档全标未完成，但 CHANGELOG 显示 M89.0 已有实现动作 → 路线图状态未同步。

**R8** PRD.md 技术栈描述与架构基线不符，疑为 Vision-only，建议 PRD 显式标注"Vision-only，非当前实现"。

**R9【建议】"信任"是否升为显式体验原则**
M81a 最强负面信号（信号 3/4/12）全指向信任，L2 三强制字段本质是信任设计，但 P01–P08 无一条显式命名 Trust/Explainability。新增宪法原则须走 PO 决策。

---

## 十一、Phase 0 纪律自检

- 未修改任何代码文件：通过（零修改）
- 未创建/修改任何文档文件（阅读阶段）：通过（本报告为 Phase 0 退出产出物，落盘在确认环节，不违反阅读阶段纪律）
- 未提出方案/UI/交互/重构计划：通过（R1-R9 仅提疑问并标注需 PO 裁决）
- Task 0.1–0.7 全部完成：见第一至七节
- 三个核心问题：见第八节
- 跨角色协调结论：PM 与架构师/设计师已对齐（M90 为体验架构唯一真相源、契约远超代码为共同最大不确定性）
- 遗留疑问：见第十节（R1–R9）

**Phase 0 交付物**：本报告（Product Discovery Report + Product Knowledge Graph）+ 团队三视角原始报告（PM/架构师/设计师）保留于对话记录。
**下一步**：PO 确认认知对齐 + 裁决 R1/R6 → 进入 Phase 1 Capability Validation（能力验证）。
