# P1-01 — Capability Inventory 能力盘点

> 阶段：FRW Phase 1 Capability Validation
> 任务：P1-01（TASK 1 / 8）
> 日期：2026-08-07
> 作者：Product Manager
> 依据：Product_Constitution.md Article 0（v2.0）、docs/FRW-Phase0-ProductDiscovery-v2-2026-08-07.md、docs/FRW-Phase0-ProductDiscovery-2026-08-06.md（v1 第三节仍有效）、backend 源码与测试实地核对

---

## 0. 盘点纪律声明

本清单遵守 PO 明令的最高总原则，请审阅者按此标准检查：

| 纪律 | 执行方式 |
|------|---------|
| 只按真实产品能力识别 | 能力身份全部来自宪法 / Phase 0 报告 / 里程碑契约 / 后端代码与数据，不来自任何页面或组件 |
| 按钮 / 页面 / 组件 / 接口不是能力 | Explorer Shell、Mode、Panel、5-Zone UI、各 API 端点一律不作为能力条目，见第 5 节排除清单 |
| 不遗漏 | 五层能力模型 L1–L5 + 横切 + 待落层 + 禁止项全部覆盖 |
| 不合并 | 相近能力（如 C10 因果解释 / C11 连接解释 / C12 受控 AI 解释）保持独立条目 |
| 不发明 | 种子清单中的 Bookmark（书签）经全仓核对零证据，不列为能力，见第 5.2 节 |
| 必须来自真实项目 | 每条能力标注文档证据与代码/数据证据；代码证据均为本次实地 grep / 读文件确认，非记忆 |

本文档不讨论 UI、不讨论视觉、不讨论交互、不讨论实现方式。

---

## 1. 盘点总览

| 分组 | 能力数 | 说明 |
|------|--------|------|
| L1 事实与真值底座 | 9 | C01–C09 |
| L2 解释层 | 3 | C10–C12 |
| L3 理解层 | 2 | C13–C14 |
| L4 运行时 / 认知层 | 7 | C15–C21 |
| 主体层（待落层） | 1 | C22 |
| 用户接触面能力 | 5 | C23–C27 |
| 横切能力 | 3 | C28–C30 |
| **真实能力合计** | **30** | C01–C30 |
| 禁止项 | 1 | X01 Recommendation |

实现状态口径定义：

| 状态 | 含义 |
|------|------|
| 已实现·后端 | 后端有可运行代码 + pytest 覆盖 |
| 已实现·前端语义层 | 仅存在于 `frontend/src/next/`，后端零实现（该目录游离于 freeze-check 白名单，R1 记录在案） |
| 数据在·能力不在 | 策展数据已存在，但无任何服务/逻辑消费它 |
| 仅为契约 | 只有冻结文档与字段定义，无可运行代码 |
| 纯纸面 | 文档中提出，全仓代码零命中 |

---

## 2. 能力清单

### 2.1 L1 事实与真值底座

| ID | 能力名称 | 实现状态 | 文档证据 | 代码 / 数据证据 |
|----|---------|---------|---------|----------------|
| C01 | Fact 事实供给 | 已实现·后端 | Phase0 v1 §3.1 L1 事实层；Product_Constitution §2.1 History Is Connected | `backend/app/validation.py` ENTITY_TYPES=8；`backend/app/core/repository.py` JsonTopicRepository；`backend/app/core/registry.py`；`data/examples/` 9 个 topic dataset；PROJECT_CONTEXT §5 计数 99 entities；`tests/test_core.py`、`tests/test_data_breadth.py` |
| C02 | Relationship 关系结构 | 已实现·后端 | Phase0 v1 §3.1 L1；Product_Constitution §2.1；宪法 P08 关系必须带语义 | `backend/app/validation.py` RELATIONSHIP_TYPES=18；`backend/app/core/graph.py` DirectedGraph / KnowledgeGraph（出入边、BFS、最短路、孤点与环检测）；PROJECT_CONTEXT §5 计数 154 relations；`tests/test_validation.py` |
| C03 | Cross-topic Connectivity 跨主题连通 | 已实现·后端 | Phase0 v1 §3.1；PROJECT_CONTEXT §5「Global Graph (cross-topic edges)」 | `backend/app/core/global_graph.py`（256 行）；`knowledge_service.cross_topic_related()` / `related_topics_for_entity()`；PROJECT_CONTEXT §5 计数 45 cross-topic edges；`tests/test_global_graph.py`(9)、`tests/test_cross_topic.py`(11)、`tests/test_interconnected.py`(8) |
| C04 | Temporal Structuring 时间结构化 | 已实现·后端 | Phase0 v1 §3.1；Product_DNA §4.4 Timeline = Time Dimension | `backend/app/core/timeline.py` TimelineIndex（按年分桶）；`backend/app/core/exploration.py` `normalize_timeline()`；数据侧 TimeValue 五字段 value/precision/certainty/label/range（实测 `data/examples/roman_empire_example.json`）；PROJECT_CONTEXT §5 计数 15 timelines |
| C05 | Spatial Anchoring 空间锚定 | **数据在·能力不在** | Product_DNA §4.4 Map = Spatial Dimension；PRD 四元素协同；PROJECT_CONTEXT §5 明列 GIS Map 为 Deferred | 数据侧：Location 实体 21 个，其中 16 个带 `coordinates{lat,lng}` + `region`（实测 `data/examples/*`）；`located_at` 属 18 类冻结关系之一。代码侧：`backend/app/` 全目录 grep `geo\|latitude\|coordinate` **零命中**，无任何空间服务、无空间查询、无 GIS |
| C06 | Source Grading 来源分级 | 已实现·后端 | Phase0 v2 §6 P09 真相可逼近性「Source 三级分级（43 SourceRecords）」 | `backend/app/core/source_registry.py`（120 行）SourceRegistry / SourceRecordV1 / FileSourceLoader；`data/sources.json` 实测 43 条，tier 分布 primary 20 / academic 15 / reference 8；`tests/test_source_registry.py`(12) |
| C07 | Evidence Claim 证据主张 | 已实现·后端 | Phase0 v2 §6 P09；Phase0 v1 §3.1 L1「Evidence」 | `backend/app/core/evidence_claim.py`（90 行）EvidenceClaim / FileEvidenceClaimLoader；`data/evidence_claims.json` 实测 76 条；实体侧 `evidence: []` + `reliability` 字段；`tests/test_evidence_claim.py`(12) |
| C08 | Provenance Tracing 溯源追溯 | 已实现·后端 | ADR-006 Read Model；PROJECT_CONTEXT §5 vM29.1 Runtime Provenance Projection Activation | `backend/app/core/provenance_index.py`（152 行）只读派生投影，零写入、无 confidence/score/trust 字段；`main.py` 由 `PROVENANCE_PROJECTION` 开关装配；`tests/test_provenance_index.py`(8)、`tests/test_provenance_api.py`(6) |
| C09 | Data Integrity Assurance 数据完整性保障 | 已实现·后端 | Phase0 v1 §3.3 第 5 条 Package 不拥有事实（跨 9 dataset 零悬空指针）；PROJECT_CONTEXT §5「0 warnings」 | `backend/app/validation.py`（638 行）唯一权威 `build_validation_report`；`backend/app/core/dataset_validator.py`（221 行）编排；`backend/app/core/dataset.py` 内容哈希（顺序无关、确定性）；`tests/test_validation.py`、`tests/test_dataset_validator.py` |

### 2.2 L2 解释层

| ID | 能力名称 | 实现状态 | 文档证据 | 代码 / 数据证据 |
|----|---------|---------|---------|----------------|
| C10 | Causal Explanation 因果解释 | 已实现·后端（数据薄） | Phase0 v1 §3.1 L2；ADR-M79 CausalStatement 冻结 6 字段，causal_type 于 vM78 移除 | `backend/app/core/causal/model.py` / `loader.py` / `adapter.py`；实测 `data/causal_statements.json` 6 字段 = cause_id/effect_id/mechanism/consequence/confidence/evidence_refs，**仅 5 条实例**；`tests/test_m79_causal_layer.py`(6) |
| C11 | Connection Explanation 连接解释（确定性） | 已实现·后端 | Phase0 v1 §3.2 横切「Exploration Engine：确定性打分」；Phase0 v1 §1 正面定义第 2 条 | `backend/app/core/exploration_engine.py`（839 行）；固定权重 W_RELATIONSHIP .35 / W_TEMPORAL .25 / W_IMPORTANCE .20 / W_SIMPLICITY .20，TEMPORAL_HALF_LIFE=500 年；`_RELATION_PHRASES` 18 类关系的人话表述；`connections_explained` 投影；全程无 AI/ML；`tests/test_exploration_engine.py`(9)、`tests/test_explore.py`(11) |
| C12 | Grounded AI Interpretation 受控 AI 解释 | 已实现·后端（默认 OFF） | ADR-0003 M11 Grounded AI Interpretation Layer；Product_Constitution §2.4 AI Is A Guide, Not The Authority；Phase0 v1 §3.3 第 1 条 Fact⇄AI 单向 | `backend/app/ai_gateway/` 共 11 模块 1723 行：provider / prompt_service / grounding_builder(559) / citation_model / context_serializer / response_validator / answer_service(338) / fallback_handler / config；每条引用对真实图事实校验，不写图；`/ai/chat` 严格无状态；`tests/test_ai_gateway.py`(36)、`tests/test_grounded_context.py`(18)、`tests/test_ai_gateway_grounding_claim.py` |

### 2.3 L3 理解层

| ID | 能力名称 | 实现状态 | 文档证据 | 代码 / 数据证据 |
|----|---------|---------|---------|----------------|
| C13 | Semantic Understanding 语义理解 | 已实现·后端（未接 API） | M85.1_SEMANTIC_RELATIONSHIP_MODEL_FREEZE；Phase0 v1 §3.1 L3「回答这个连接为什么重要」；§3.3 第 2 条 L2≠L3、RelatedCausalObjectRef 不是图边 | `backend/app/core/causal/causal_object.py` CausalObject 11 字段含 `related_causal_objects`；`data/causal_objects.json` 实测 12 条；relation_type 冻结 4 类实测分布 institutional_evolution 5 / ideological_influence 5 / technological_chain 2 / civilization_contrast 1；`tests/test_m84_causal_object.py`(17)。**注：`backend/app/main.py` grep `causal` 零命中——L3 未暴露为任何后端读模型** |
| C14 | Cross-civilization Comparison 跨文明对比 | 已实现·后端（供给严重不足） | Phase0 v1 §5 心智信号「想比较不想罗列」；Phase0 v2 §7 WHO「最强自发需求＝跨文明对比（3/4 场）」；R5 待裁决项（是否提为一级能力） | 语义侧：`relation_type = civilization_contrast`，实测**仅 1 条实例**；结构侧：`global_graph.py` 跨主题边 45 条、`cross_topic_related()`；`tests/test_cross_topic.py`(11)。需求最强 / 供给最弱，本项为本次盘点最突出的供需倒挂 |

### 2.4 L4 运行时 / 认知层

> 本组共同事实：**全部 7 项仅存在于 `frontend/src/next/`，后端零实现**。该目录已接入 `App.tsx` 但游离 `scripts/freeze-check.mjs` 白名单，PROJECT_CONTEXT v1.1 未述——即 R1（ADR-0014 D1 已裁决，须以「契约 vs 实现」对照表解除阻塞）。

| ID | 能力名称 | 实现状态 | 文档证据 | 代码 / 数据证据 |
|----|---------|---------|---------|----------------|
| C15 | Exploration State 探索状态感知 | 已实现·前端语义层 | M88.1_EXPLORATION_STATE_MODEL；M88.0 §四 ExplorationState 11 字段（currentTopic / coverageRatio / knownDimensions / missingDimensions / missingConnections / activeQuestions / explorationHistory 等） | `frontend/src/next/exploration/ExplorationState.ts`；`topicUnderstandingState.ts`；`__tests__/ExplorationState.test.ts`。后端 grep `ExplorationState` 零命中 |
| C16 | Cognitive Advancement Decision 认知推进决策 | **两套并行实现，互不连通** | M88.2_EXPLORATION_POLICY_CONTRACT；M88.3_EXPLORATION_DECISION_CONTRACT；M88.0 §五 五种 ExplorationAction（deep_continue / open_dimension / follow_cause / compare_context / reflect）；M88.0 §8.2 禁止点击率/时长/协同过滤/LLM 决定方向 | 实现 A（后端，确定性）：`exploration_engine.recommend_next()` 四权重 REC_W_RELATIONSHIP .40 / TIMELINE .25 / THEME .20 / DIVERSITY .15，含 `seen_global_ids` 去重，`tests/test_recommend.py`(15)。实现 B（前端语义层，规则化）：`frontend/src/next/exploration/ExplorationPolicy.ts` + RuleTrace，`__tests__/ExplorationPolicy.test.ts`、`ExplorationDecision.test.ts`、`ExplorationLoop.test.ts`。两者输入不同（图结构 vs 认知缺口）、输出不同、无任何调用关系 |
| C17 | Understanding Projection 理解投影 | 已实现·前端语义层 | M86.1.10_UNDERSTANDING_RUNTIME_BOUNDARY；M86.1.12_UNDERSTANDING_PROJECTION_VERSION；M86.1.14_PROJECTION_EXPLAINABILITY_CONTRACT；Phase0 v1 §3.3 第 3 条 L3→L4 必经 Projection、运行时禁直连 KG | `frontend/src/next/UnderstandingProjection.ts`；`frontend/src/next/exploration/HistoricalKnowledgeProjection.ts`（M89.1）；`__tests__/HistoricalKnowledgeProjection.test.ts` |
| C18 | Cognitive Memory 认知记忆 | 已实现·前端语义层（**无持久化**） | M86.2.0_MEMORY_ARCHITECTURE_BOUNDARY；M86.2.1_MEMORY_MODEL_CONTRACT；M86.2.2_MEMORY_POLICY_CONTRACT；M86.2.3_GROWTH_GRAPH_CONTRACT；M86.1.16_MEMORY_BOUNDARY_CONTRACT | `frontend/src/next/memory/` 四文件 MemoryProjection.ts / MemoryPolicy.ts / GrowthGraphStore.ts / WorkspaceAdapter.ts。该目录 grep `localStorage\|sessionStorage\|persist` **零命中**，纯内存态；PROJECT_CONTEXT §5 明列「User persistence / accounts」为 Not yet built。另存在一套旧实现 `frontend/src/lib/journey.ts` 以 `history_explorer_journey` 键落 localStorage，与本项并行且不互通 |
| C19 | Growth Measurement 成长度量 | 已实现·前端语义层（一项分量实际不可得） | M88.5.1_EXPLORATION_METRICS_MODEL；Phase0 v2 §2.2 北极星 `understandingGrowthScore = depthDelta + dimensionDelta + connectionDelta + continuityScore`；定性锚句「衡量认知结构变化，非用户行为」 | `frontend/src/next/exploration/ExplorationMetrics.ts` 四 Delta 全部实现，`understandingGrowthScore` 于第 105 行合成；`__tests__/ExplorationMetrics.test.ts` 覆盖 continuityScore 0.5 / 1.0 用例。但 continuityScore 依赖跨会话数据，而 C18 无持久化 → 真实运行中刷新即归零 |
| C20 | Exploration Trail 探索轨迹 | 已实现（新旧两套） | Phase0 v1 §3.2「Personal Exploration Trail(M63-B/M83)：认知轨迹，非收藏夹」；M90 §3.2.2 anchorChain / relationChain → explorationPath | 语义层：`frontend/src/next/ExplorerRuntimeContext.tsx` 10 字段含 anchorChain / relationChain。旧实现：`frontend/src/lib/journey.ts`（localStorage `history_explorer_journey`）。两套轨迹并存 |
| C21 | Explanation Companion 解释陪伴 | 已实现·前端语义层 | M87.0_COMPANION_RUNTIME_BOUNDARY（Companion = 第四个 Domain Module）；M87.4.0_AI_EXPLANATION_LAYER_BOUNDARY；M87.4.1 Explanation Projection Contract；M87.4.4 Explanation Replay Validation；ADR-0007-ai-companion-model | `frontend/src/next/companion/` 四文件 CompanionPolicy.ts / ExplanationProjection.ts / ExplanationRenderer.ts / ExplanationReplay.ts + `__tests__/`。边界：Policy 决定、LLM 只表达，LLM 不在 Policy 内部 |

### 2.5 主体层（待落层）

| ID | 能力名称 | 实现状态 | 文档证据 | 代码 / 数据证据 |
|----|---------|---------|---------|----------------|
| C22 | Cognitive Mirror 认知镜像 | **纯纸面** | Product_Constitution Article 0 第二句；ADR-0013 D3；Phase0 v2 §3.2 定义与四维对照表、§3.3 第七条禁止关系「Mirror 是终点，不是中间层」；Supplement A.3「兴趣发现＝待解决的大问题」；Supplement B ④⑤⑥ | 全仓 grep `cognitive.mirror\|cognitiveMirror`（.py/.ts/.tsx，忽略大小写）**零命中**。文档声明数据来源均为既有制品（C15 ExplorationState / C20 Trail / C19 四 Delta），无需新增采集。落层未定 = **OD-02，阻塞 Phase 1 结论** |

### 2.6 用户接触面能力

> 本组是「用户可直接发起并从中获益」的能力，按能力身份而非页面身份列出。

| ID | 能力名称 | 实现状态 | 文档证据 | 代码 / 数据证据 |
|----|---------|---------|---------|----------------|
| C23 | Cognitive Orientation 认知定位 | 部分实现（语义层已有，未成体系） | 宪法 P01 永远知道为何在此、P05 每次跳转有认知目的地；FP-03 跳转必须携带语义 From/Why/Value；Phase0 v1 §5 心智信号「要知道自己在哪——上面应该有个路径可回溯」（四场共踩） | `frontend/src/next/ExplorerRuntimeContext.tsx` 已具 currentAnchor / previousAnchor（From）/ activeRelation（Why）/ unresolvedGap；M90 §3.2.2 已定义映射。缺一个统一的 Value 语义与全局约束 |
| C24 | Search 检索 | 已实现·后端（定位为次级辅助） | Phase0 v1 §1 排除项「搜索引擎」；M89.1 硬禁搜索框主导入口；**R6 已裁决（ADR-0014 D2，选项 A）：搜索框可作次级辅助能力存在，但不得主导首屏** | `backend/app/core/search.py`（185 行）build_search_index + SearchProvider，排序 exact → alias → contains，实体与主题同时命中，可按 topic 限域；`tests/test_search_v2.py`(7)、`tests/test_search_index.py`、`tests/test_search_entity.py` |
| C25 | Question Asking 提问 | 部分实现（分散在两层） | M88.0 §四 ExplorationState.activeQuestions「用户已提出的问题」；M90 §2.2 主流程首环 Question「我想理解什么」、§3.2.1 question 字段禁 AI 生成 / 禁从 entity name 拼接 | 后端：`ai_gateway` `/ai/chat` 严格无状态问答（受 C12 grounding 约束）。前端语义层：`ExplorerRuntimeContext` `userQuestion` / `understandingGoal` 字段、`ExplorationState.activeQuestions`。两者不互通，且 M90 要求 question 由 Curator 预写、当前无策展来源 |
| C26 | Curated Exploration Package 策展探索包 | 已实现（无后端服务） | Phase0 v1 §3.2「Exploration Package(M69)：冻结 KG 之上的策展视图，owns no facts」；§3.3 第 5 条 Package 不拥有事实；M83.0 / M85.12 引用 | `data/exploration_packages.json` 实测 4 个包。**backend 全目录 grep `exploration_packages` 零命中**——无后端加载、无校验编排、无 API；唯一消费方为 `frontend/src/data/explorationPackages.ts`。§3.3 第 5 条要求的 `validatePackage()` 跨 9 dataset 零悬空指针校验，在后端不存在 |
| C27 | Deterministic Guide 确定性引导 | 已实现（前端确定性数据） | Phase0 v1 §3.2「Exploration Guide(M70)：确定性导航，禁 LLM/评分/个性化」；§3.3 第 6 条 Guide 不做个性化 | `frontend/src/data/explorationGuide.ts`（含 understandingRules 模板）；`frontend/src/__tests__/understandingRules.test.ts`。后端无对应实现 |

### 2.7 横切能力

| ID | 能力名称 | 实现状态 | 文档证据 | 代码 / 数据证据 |
|----|---------|---------|---------|----------------|
| C28 | Multilingual & Terminology 多语言与术语 | 已实现 | ADR-0006_M62.5_global_language_experience；Phase0 v1 §3.2「i18n zh/en/ja + Terminology Layer(M62.5)」 | 数据侧：实体 `labels` 多语字典，实测含 en / zh / la 等；后端 `exploration.py` 优先取 `labels.zh`。前端：`frontend/src/data/locale.tsx`、`frontend/src/locales/` |
| C29 | Domain Pluggability 领域可插拔 | 已实现·框架级（非用户可感） | Phase0 v2 §1.3「M76-M77 已验证本体框架可插拔，架构不阻塞未来扩展」；Supplement A.2 未来愿景＝原子化知识 + 跨学科贯通（OD-05 不预支实现） | `backend/app/core/domain/` 共 9 文件：adapter.py / ontology.py / registry.py / schemas.py / mapping.py / history_adapter.py / military_adapter.py / military_ontology.py（MILITARY_HISTORY_ONTOLOGY 5 实体 / 5 关系）；`tests/test_m77_multi_domain_framework.py`、`test_domain_adapter_contract.py`、`test_m78_2_registry_lifecycle.py`、`test_m78_3_domain_contract.py` |
| C30 | Freeze Governance 冻结治理 | 已实现 | Phase0 v1 §6 第五编架构冻结边界、第六编治理机制（Freeze Revision Gate 三重门）；第八编团队级 P0 执行规则；ADR-0012 FRW 冻结 | `scripts/freeze-check.mjs`（CI 门，EXIT 0 已验证）；`scripts/emoji-scan.mjs`；`backend/app/validation.py` 为 8/18 唯一权威；`docs/15_DECISIONS/` 共 14 份 ADR |

---

## 3. 禁止项（不是能力）

| ID | 名称 | 判定 | 文档依据 | 实地核对发现 |
|----|------|------|---------|-------------|
| X01 | Recommendation 推荐 | **明令禁止，不得作为能力** | M88.0 §三 Exploration ≠ Recommendation（点击率/时长/流行度/协同过滤/"其他用户也看了" 全禁）；M88_STRATEGIC_DIRECTION 第九节列为最大风险；Phase0 v1 §1 排除项「推荐系统」；Product_Constitution §3 四禁区；Phase0 v2 §3.3 第七条「Mirror 是终点不是中间层」与 M88.0 同级 | 三点须记录：<br>① `frontend/src/next/recommendation/` 为**空目录**，M86.4.0_RECOMMENDATION_RUNTIME_PROBE 只做了探针未实现 —— 防火墙在语义层被守住。<br>② 后端存在字面命名为 `/entity/{id}/recommendations` 的端点，前端有 `RecommendationPanel.tsx`。实质**不是**推荐系统：输入为图结构 + 时间 + 主题 + 多样性四项确定性权重，无任何点击率/时长/相似用户信号，且带 `seen` 去重与可解释 reasons。<br>③ 结论：**实质合规，命名违宪**。「recommendation」这一命名在代码与 UI 层长期存在，会持续侵蚀 M88.0 防火墙，属实现层滑坡风险（v2 §3.3 已警告「纸面约束不足以防止实现层滑坡」，风险 R-3）。建议 Phase 1 登记为命名整改项。 |

---

## 4. 能力 × 定位三层覆盖矩阵

依据 Product_Constitution Article 0：三层缺一不可。

| 定位层 | 定位句 | 覆盖该层的能力 | 覆盖判断 |
|--------|--------|---------------|---------|
| 对象层 Object | 形成文明 · 理解 · 认知结构 | C01 C02 C03 C04 C10 C11 C13 C14 C15 C16 C17 C19 C20 C23 C26 C27 | 覆盖厚实，是当前唯一被完整实现的一层 |
| 主体层 Subject | 找到自己的兴趣与学习方法 | C22（纯纸面）、C18（无持久化）、C19（continuityScore 分量不可得）、C20（两套并行） | **结构性缺口**。唯一直接服务本层的 C22 零实现，其三项数据来源自身也不健全 |
| 真值层 Truth | 无限逼近真相 | C06 C07 C08 C09 C10（confidence / evidence_refs）、C12（引用校验） | 底座齐备（43 来源三级 + 76 证据 + 溯源投影），但 v2 §6 P09 明确指出这是「后台质量属性」，尚未成为用户可感知的能力 |

---

## 5. 排除清单（明确不作为能力的项）

### 5.1 因「是容器 / 页面 / 组件 / 接口」而排除

| 被排除项 | 出处 | 排除理由 |
|---------|------|---------|
| Explorer Shell（唯一容器 FP-01） | M90 §4.1 | 容器不是能力，是承载能力的体验架构约束 |
| Mode ×5（Exploration / Explanation / Relationship / Understanding / Civilization） | M90 §2.5 | Mode 是「同一探索对象的不同观察角度」，是能力的呈现视角，不是能力本身；其背后能力分别为 C01/C11/C13/C17/C14 |
| Navigation Contract（From/Why/Value）作为独立条目 | FP-03 | 已归入 C23 Cognitive Orientation，避免把契约字段当能力 |
| 5-Zone UI（Related / Explained / Paths / Timeline / Themes） | PROJECT_CONTEXT §5 | 页面分区，非能力 |
| 26 个 Panel / 4 个 Shell / 7 个入口 | M90 §1.2 | 组件与入口，非能力 |
| 各 API 端点（`/explore` `/entity` `/search` `/recommendations` `/provenance` `/ai/explain` `/ai/chat` `/health` `/topics`） | `backend/app/main.py` | 接口是能力的暴露方式，已作为对应能力的代码证据引用，不单列 |
| Playwright E2E / CI / 版本单一真相源 | PROJECT_CONTEXT §5 | 工程基建，非产品能力（C30 只收录具有产品约束力的冻结治理） |

### 5.2 因「无真实证据」而排除

| 种子清单项 | 核对结果 | 处置 |
|-----------|---------|------|
| Bookmark 书签 | 全仓 grep `bookmark\|favorite`（.py/.ts/.tsx）在项目源码中**零命中**（仅命中 `.venv` / `.pip_target` 第三方库） | 不列为能力。Trail 已由 Phase0 v1 §3.2 明确定义为「认知轨迹，非收藏夹」，书签与产品定位相斥 |

---

## 6. 实地核对方法与可复现记录

| 核对项 | 方法 |
|--------|------|
| 文档 | 逐字读取 Product_Constitution.md / FRW-Phase0-v2 / FRW-Phase0-v1 / PRD.md / Product_DNA.md / PROJECT_CONTEXT.md / M88.0 / M87.0 / M90 全文或关键节 |
| 后端代码 | 逐文件读取 `backend/app/core/*.py` 头部契约声明 + `main.py` 处理器 + `exploration_engine.py` 权重常量；`wc -l` 取模块规模 |
| 后端测试 | 按文件统计 test 函数数量，作为「真实能力信号」而非「契约信号」的判据 |
| 数据 | 以 Python 直接解析 `data/sources.json` / `evidence_claims.json` / `causal_objects.json` / `causal_statements.json` / `exploration_packages.json` / `examples/*`，统计条数与字段分布 |
| 存在性否证 | 对 Cognitive Mirror / Bookmark / 空间服务 / Package 后端服务 / 记忆持久化，均以全仓 grep 零命中作为否证依据，不以记忆判断 |

---

## 7. 移交下一任务的关键结论

1. 共盘点 **30 项真实能力 + 1 项禁止项**，未合并、未发明。
2. **L4 全层（C15–C21，7 项）后端零实现**，仅存在于游离白名单的 `frontend/src/next/` —— 这是 R1 的实质内容，直接决定 Phase 1「契约 vs 实现」对照表的范围。
3. **主体层只有 C22 一项，且为纯纸面**，OD-02（落 L4 扩展 还是 新增 L4.5）不裁决则 Article 0 第二句无法进入体验架构。
4. **三处供需倒挂**：C14 跨文明对比（需求最强 / 数据仅 1 条）、C05 空间锚定（数据在 / 能力不在）、C10 因果解释（L2 核心 / 仅 5 条实例）。
5. **两处重复实现**：C16 认知推进（后端确定性引擎 vs 前端 Policy）、C18/C20 记忆与轨迹（`lib/journey.ts` vs `next/memory`）。
6. **一处命名违宪**：X01，实质合规但命名会侵蚀 M88.0 防火墙。
