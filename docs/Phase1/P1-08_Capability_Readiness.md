# P1-08 Capability Readiness — 能力成熟度

> FRW Phase 1 · Capability Validation · Task 8
> 作者：架构师（Chief Architect）
> 日期：2026-08-07
> 前置：P1-01（能力 ID C01–C30 / X01 以该文件为准）、P1-02、P1-03、P1-04、P1-05、P1-06
> 判定基准：真实产品能力（非页面 / 组件 / 按钮 / 接口）
> 模式：只读核查。本文件不修改任何代码。
> 交付物：① 30 能力逐条成熟度评级；② 各层计数与 headline；③ **R1 交付物**——「契约 vs 实现」逐字段对照表（ADR-0014 D1 要求，解除 Phase 1 阻塞）

---

## 0. 评级纪律

### 0.1 成熟度五级（定性）

| 级别 | 定义 |
|------|------|
| **nonexistent** | 全仓代码与数据无任何可运行证据，仅文档提到（纯纸面） |
| **concept** | 有契约 / 数据模型 / 策展数据，但零运行实例或零读者 |
| **partial** | 有部分运行实例，但核心机制缺失、未接线、或仅存在于某一层 |
| **basic** | 可运行、有测试，但内容薄 / 未接 API / 默认关闭 / 未成体系 |
| **mature** | 可运行、有测试、已暴露且方向正确，可作为该层承重能力 |

### 0.2 生产就绪度 ★（1–5）

| ★ | 含义 |
|----|------|
| ★ | 不可用于生产：无实现 / 零数据 / 零读者 |
| ★★ | 有契约或原型，未接线或断点 |
| ★★★ | 功能存在但范围窄 / 数据薄 / 仅前端 / 仍冲突 |
| ★★★★ | 功能完整可运行，仅 minor 缺口或默认关闭 |
| ★★★★★ | 完整、测试覆盖、已接线、生产可用 |

### 0.3 与 P1-06 / P1-05 的边界（不重复计数）

- **成熟度（本文档）** = 能力已存在、方向正确，只是覆盖范围 / 接线 / 持久化 / 测试尚不足。
- **产品缺口（P1-06）** = 能力覆盖本身缺失（G-01…G-10）。
- **冲突（P1-05）** = 多套矛盾实现 / 违反冻结契约 / 契约自相矛盾（C-01…C-12）。
- 交叉引用，不合并。例：`causal_statements.json` 仅 5 条 → P1-06 G-06（供给缺失）；`CausalStatementAdapter` 未实例化 → 本文档 C10 成熟度（接线断点）。

### 0.4 证据口径

- 代码 / 数据证据全部引自 P1-01（已逐文件实地 grep / 读文件确认）。
- L4 全层共同事实：`frontend/src/next/`、`frontend/src/runtime/` 存在且接入 `App.tsx`，但**不在 `scripts/freeze-check.mjs` 的 `SCOPE_ALLOWLIST` 内**（见 §3 与 R1 表末项）。

---

## 1. 逐能力成熟度评级（C01–C30）

> ★ 列：生产就绪度。所有判定以「方向正确、覆盖不足 = 成熟度问题」为准，与 P1-06 缺口、P1-05 冲突交叉标注。

### 1.1 L1 事实与真值底座

| ID | 能力 | 成熟度 | ★ | 关键事实 | 关联缺口 / 冲突 |
|----|------|--------|---|---------|----------------|
| C01 | Fact 事实供给 | mature | ★★★★★ | 8 实体类型 / 99 实体 / 9 dataset / 测试齐 | — |
| C02 | Relationship 关系结构 | mature | ★★★★★ | 18 关系类型 / 154 关系 / 图算法 / 测试齐 | — |
| C03 | Cross-topic Connectivity | mature | ★★★★★ | global_graph 256 行 / 45 跨主题边 / 测试齐 | — |
| C04 | Temporal Structuring | mature | ★★★★★ | TimelineIndex / 15 timelines / 五字段 TimeValue | — |
| C05 | Spatial Anchoring | concept | ★ | 数据在（21 Location / 16 带坐标），但 `backend/app` grep `coordinates\|geo` **零命中**——四等维之一零服务 | **G-07** |
| C06 | Source Grading | mature | ★★★★★ | SourceRegistry / 43 来源（primary20/academic15/reference8）/ 测试齐 | — |
| C07 | Evidence Claim | mature | ★★★★★ | 76 证据主张 / 加载器 / 测试齐 | — |
| C08 | Provenance Tracing | mature | ★★★★★ | provenance_index 152 行只读投影 / `/provenance` 端点 | G-05（仅吐 reference 字符串，无 tier） |
| C09 | Data Integrity Assurance | mature | ★★★★★ | validation 638 行唯一权威 / 0 warnings | — |

### 1.2 L2 解释层

| ID | 能力 | 成熟度 | ★ | 关键事实 | 关联缺口 / 冲突 |
|----|------|--------|---|---------|----------------|
| C10 | Causal Explanation | basic | ★★★ | 模型 / 加载器 / 测试齐，但 `causal_statements.json` **仅 5 条**（覆盖 211 关系 2.4%），且 `CausalStatementAdapter` 从未被实例化（P1-05 C-04） | **G-06** |
| C11 | Connection Explanation（确定性） | mature | ★★★★★ | exploration_engine 839 行 / 固定权重 / 全程无 AI / 测试齐 / 经 `/explore` 暴露 | — |
| C12 | Grounded AI Interpretation | basic | ★★★★ | ai_gateway 11 模块 1723 行 / 36 测试 / 引用校验不写图，但 `AI_GATEWAY_ENABLED` 未设即默认关闭 | （默认 OFF，非违约） |

### 1.3 L3 理解层

| ID | 能力 | 成熟度 | ★ | 关键事实 | 关联缺口 / 冲突 |
|----|------|--------|---|---------|----------------|
| C13 | Semantic Understanding | partial | ★★ | `causal_object.py` 11 字段 + 12 条数据 + 17 测试，但 `main.py` grep `causal` **零命中**——L3 零读取者、零 API 暴露 | P1-04 断点 2 |
| C14 | Cross-civilization Comparison | concept | ★★ | 唯一机制 `civilization_contrast` **仅 1 条**；跨主题连通 ≠ 维度对齐；所在 L3 层零读取者 | **G-04**、R5 待裁决 |

### 1.4 L4 运行时 / 认知层

> 共同事实（P1-01 §2.4 + 本次复核）：**7 项全部仅 `frontend/src/next/` 内，后端零实现；该目录不在 freeze-check 白名单**。

| ID | 能力 | 成熟度 | ★ | 关键事实 | 关联缺口 / 冲突 |
|----|------|--------|---|---------|----------------|
| C15 | Exploration State | partial | ★★★ | `ExplorationState.ts` + 测试；后端 grep `ExplorationState` 零命中 | R1（M88.1 仅语义层） |
| C16 | Cognitive Advancement Decision | partial | ★★ | **两套并行且互不连通**：后端 `recommend_next()`（图相似度四权重，违 M88.0 §8.3）/ 前端 `ExplorationPolicy.ts`+RuleTrace。两者输入/输出/调用关系全不相交 | **C-01/C-02/C-03** |
| C17 | Understanding Projection | partial | ★★★ | `UnderstandingProjection.ts` + `HistoricalKnowledgeProjection.ts` + 测试；后端零命中 | R1（M86.1.x 仅语义层） |
| C18 | Cognitive Memory | partial | ★★ | `next/memory/` 四文件，但 `localStorage\|persist` 零命中——纯内存态，刷新即失 | **G-02** |
| C19 | Growth Measurement | partial | ★★ | `ExplorationMetrics.ts` 四 Delta + `understandingGrowthScore` 已实现，但 `continuityScore` 依赖跨会话数据，因 G-02 实质恒为 0 | **G-02/G-03** |
| C20 | Exploration Trail | partial | ★★★ | 新旧两套：`next/ExplorerRuntimeContext.tsx` 与 `lib/journey.ts`（localStorage）并存 | — |
| C21 | Explanation Companion | partial | ★★★ | `next/companion/` 四文件 + 测试；后端零命中；Policy 决定 / LLM 只表达 | R1（ADR-0007 仅语义层） |

### 1.5 主体层（待落层）

| ID | 能力 | 成熟度 | ★ | 关键事实 | 关联缺口 / 冲突 |
|----|------|--------|---|---------|----------------|
| C22 | Cognitive Mirror | nonexistent | ★ | 全栈 grep `mirror` 零实现；Article 0 第二句唯一承载者，落层未定（OD-02） | **G-01**、C-07 |

### 1.6 用户接触面能力

| ID | 能力 | 成熟度 | ★ | 关键事实 | 关联缺口 / 冲突 |
|----|------|--------|---|---------|----------------|
| C23 | Cognitive Orientation | partial | ★★★ | 语义层具 From/Why，但 Value 语义从未定义（P1-01 §2.6） | **G-09** |
| C24 | Search | mature | ★★★★★ | `search.py` 185 行 / 测试齐；R6 裁决可作次级辅助，非主导 | （受 M89.1 约束，未违） |
| C25 | Question Asking | partial | ★★ | 后端 `/ai/chat` 无状态 + 前端 `userQuestion`/`activeQuestions` 不互通；M90 禁 AI 生成、禁实体名拼接，**无策展来源** | **G-10** |
| C26 | Curated Exploration Package | partial | ★★★ | 4 包以静态数据入前端 bundle；后端 grep `exploration_packages` 零命中；`package_context` 是死参数 | **C-11** |
| C27 | Deterministic Guide | basic | ★★★★ | `explorationGuide.ts` 确定性数据 + 测试；后端无对应实现，但方向与「禁个性化」契约一致 | — |

### 1.7 横切能力

| ID | 能力 | 成熟度 | ★ | 关键事实 | 关联缺口 / 冲突 |
|----|------|--------|---|---------|----------------|
| C28 | Multilingual & Terminology | mature | ★★★★★ | 实体 `labels` 多语字典 + 后端优先 `zh` + 前端 i18n | — |
| C29 | Domain Pluggability | mature | ★★★★★ | `core/domain/` 9 文件 + 测试；框架级可插拔（非用户可感） | G-08（双真相源） |
| C30 | Freeze Governance | mature | ★★★★★ | freeze-check CI EXIT 0 / emoji-scan / validation 唯一权威 / 14 份 ADR | — |

---

## 2. X01 登记（禁止项，非能力，非成熟度评级对象）

| ID | 名称 | 判定 | 与 R1 的关系 |
|----|------|------|--------------|
| X01 | Recommendation | **明令禁止，不评级**。实质合规、命名违宪：后端 `recommend_next()` 是确定性图相似度计算（无点击率/协同过滤/LLM），但**违反 M88.0 §8.3 的全部要求项**（无 coverageRatio/missingDimensions/UnderstandingStage/MemoryProjection/RuleTrace，输出非 `Decision<ExplorationAction>`）；前端 `next/recommendation/` 为空目录（防火墙在语义层守住）。命名长期存在会侵蚀 M88.0 防火墙 | 见 R1 表项 M88.0；属 P1-05 C-01/C-02，待 Q-01/Q-03 |

---

## 3. 各层计数与 Headline

### 3.1 成熟度分布计数

| 定位层 | 能力数 | nonexistent | concept | partial | basic | mature | ★ 中位数 |
|--------|--------|-------------|---------|---------|-------|--------|-----------|
| L1 事实与真值底座 | 9 | 0 | 1 (C05) | 0 | 0 | 8 | ★★★★★ |
| L2 解释层 | 3 | 0 | 0 | 0 | 2 (C10,C12) | 1 (C11) | ★★★★ |
| L3 理解层 | 2 | 0 | 1 (C14) | 1 (C13) | 0 | 0 | ★★ |
| L4 运行时 / 认知层 | 7 | 0 | 0 | 7 (C15–C21) | 0 | 0 | ★★★ |
| 主体层（待落层） | 1 | 1 (C22) | 0 | 0 | 0 | 0 | ★ |
| 用户接触面 | 5 | 0 | 0 | 3 (C23,C25,C26) | 1 (C27) | 1 (C24) | ★★★ |
| 横切 | 3 | 0 | 0 | 0 | 0 | 3 (C28,C29,C30) | ★★★★★ |
| **合计** | **30** | **1** | **2** | **11** | **3** | **13** | — |

### 3.2 Headline（一句话结论）

> **产品今天只真正服务 L1**——事实与真值底座（C01–C04、C06–C09）以 mature ★★★★★ 承重；L2 仅解释措辞成熟、因果与 AI 解释单薄；L3 理解层停留在 concept / 零读者；L4 运行时 / 认知层 7 项全部仅存在于冻结治理之外的 `frontend/src/next/`，后端零实现；主体层（Article 0 第二句）零可运行能力。Article 0 明文「三层缺一不可」，而产品当前只把对象层的事实半截做实了。

### 3.3 与 P1-06 缺口的叠加读数

| 定位层 | 名义成熟度 | 扣除缺口（P1-06 G-01…G-10）后真实可用度 |
|--------|-----------|------------------------------------------|
| 对象层（事实 + 结构） | mature | **真实服务**：L1 全栈 + C11 确定性解释。但 C10 内容近零（G-06）、C14 机制零（G-04）、C05 无能力（G-07）、C13 零读者 |
| 主体层 | nonexistent | **完全空**：C22 零实现（G-01）+ C18 无持久化（G-02）+ C19 度量断（G-03），三项 blocking 互为因果 |
| 真值层 | mature（底座） | **建成地基未开门**：C06/C07/C08/C09 齐备，但无用户出口（G-05） |

---

## 4. R1 交付物：契约 vs 实现 逐字段对照表

> 依据 ADR-0014 D1 要求：对「有冻结契约」的能力，逐字段比对契约状态与实际实现，作为解除 Phase 1 阻塞的首份交付。
> 列：冻结契约 → 契约关键要求 → 后端实际 → 前端实际 → 差距 / 违约判定。
> 证据等级：E1 代码行号（来自 P1-01/P1-05）、E2 契约原文、E3 零命中否证。

### 4.1 探索智能契约族（M88.x）

| 契约 | 关键要求 | 后端实际 | 前端实际 | 差距 / 违约 |
|------|---------|---------|---------|------------|
| **M88.0 §3** Exploration ≠ Recommendation | 禁止推荐信号（点击率/时长/协同过滤/其他用户也看了）；方向由认知缺口驱动 | `recommend_next()`（:559）规避了禁止信号，但**完全未实现要求信号**：coverageRatio/missingDimensions/UnderstandingStage/MemoryProjection 全仓零命中（E3） | `next/exploration/ExplorationPolicy.ts` 含 RuleTrace，但**与后端无调用关系** | 要求项全落空（R-3）；后端实现实质是「去行为数据的图相似度推荐器」（P1-05 C-01） |
| **M88.0 §5** 输出契约 | 必须 `Decision<ExplorationAction>` | 输出 `RecommendationResult`（:269），非 `Decision` | `ExplorationDecision.ts` 定义了 `ExplorationAction` | 后端违约（输出类型不符） |
| **M88.0 §8.2** 不推荐已探索 | 不得再推已访问节点 | `seen` 仅降权不剔除（:619-620，附加「已访问」理由） | — | 违反（轻微） |
| **M88.0 §8.2** 不由 LLM 决定方向 | 禁止 | 满足（纯确定性） | — | 符合 |
| **M88.0 §8.3** 决策依据 | coverageRatio / missingDimensions / missingConnections / UnderstandingStage / MemoryProjection / RuleTrace reason | 全部零命中（E3） | 前端 Policy 用了 RuleTrace，但输入是认知缺口而非图结构 | 后端**未实现**；两层输入语义不一致 |
| **M88.1** ExplorationState 11 字段 | currentTopic / coverageRatio / knownDimensions / missingDimensions / missingConnections / activeQuestions / explorationHistory … | 零命中（E3） | `ExplorationState.ts` + `topicUnderstandingState.ts` + 测试 | 仅语义层有；**不在白名单**（见 §4.6） |
| **M88.2** ExplorationPolicy 契约 | 认知缺口 → 动作的规则表 | 无 Policy（仅有图相似度排序） | `ExplorationPolicy.ts` + `RuleTrace` | 两套并行、互不连通（P1-05 C-03 同根） |
| **M88.3** ExplorationDecision 契约 | `Decision<ExplorationAction>` 五种动作 | 未实现（输出 RecommendationResult） | `ExplorationDecision.ts` + `ExplorationLoop.ts` | 仅语义层 |
| **M88.4/88.5** Exploration Metrics / Understanding Growth | `understandingGrowthScore = depthDelta+dimensionDelta+connectionDelta+continuityScore` | 零命中（E3） | `ExplorationMetrics.ts` 四 Delta 合成于 :105 | `continuityScore` 因 G-02 恒为 0（部分不可得） |

### 4.2 运行时 / 记忆契约族（M86.x）

| 契约 | 关键要求 | 后端实际 | 前端实际 | 差距 / 违约 |
|------|---------|---------|---------|------------|
| **M86.1.10/12/14** Understanding Runtime Boundary + Projection Version + Explainability | L3→L4 必经 Projection；运行时禁直连 KG；投影可解释、版本化 | 零命中（E3） | `UnderstandingProjection.ts` + `HistoricalKnowledgeProjection.ts` + 测试 | 仅语义层；后端无投影服务 |
| **M86.1.16 / M86.2.0** Memory Boundary + Architecture | 记忆为独立边界，可持久化 | 后端无状态（`main.py:348` STRICTLY STATELESS） | `next/memory/` 四文件，**纯内存态**（`localStorage\|persist` 零命中 E3） | 无持久化（**G-02**）；旧实现 `lib/journey.ts` 落 localStorage 与本项并行不互通 |
| **M86.2.1/2.2/2.3** Memory Model / Policy / Growth Graph | 记忆模型 + 增长图 | 零命中（E3） | `MemoryProjection.ts` / `MemoryPolicy.ts` / `GrowthGraphStore.ts` / `WorkspaceAdapter.ts` | 仅语义层、无后端、无持久化 |

### 4.3 语义关系契约（M85.1）

| 契约 | 关键要求 | 后端实际 | 前端实际 | 差距 / 违约 |
|------|---------|---------|---------|------------|
| **M85.1** Semantic Relationship Model（L3） | 「回答这个连接为什么重要」；RelatedCausalObjectRef 不是图边；L2 ≠ L3 | `causal_object.py` 11 字段 + `data/causal_objects.json` 12 条 + 17 测试；但 `main.py` grep `causal` 零命中——**L3 零读取者、零 API 暴露** | 无独立 L3 前端消费 | 已实现未接线（P1-04 断点 2）；`civilization_contrast` 仅 1 条 |

### 4.4 体验契约（M89.1）

| 契约 | 关键要求 | 后端实际 | 前端实际 | 差距 / 违约 |
|------|---------|---------|---------|------------|
| **M89.1** Experience Map：搜索框不得主导首屏 | 搜索仅为次级辅助；体验以探索为核 | `search.py` 存在、R6 裁决为次级辅助（ADR-0014 D2 选项 A） | 大量 AI UX 组件经 Freeze Gate 放行（M36–M43）；需 PO 确认未形成搜索框主导首屏 | **未现违约**，但 M36–M43 的 AI 入口密度建议 Phase 2 前由 PO 复核是否侵蚀 M89.1 |

### 4.5 信任边界与 AI 契约（M74 / ADR-0003 / ADR-0006 / ADR-0007）

| 契约 | 关键要求 | 后端实际 | 前端实际 | 差距 / 违约 |
|------|---------|---------|---------|------------|
| **M74** Trust Boundary：前端零事实组装 | 事实只由后端拥有 / 组装；前端只读投影 | 事实层全在后端（C01–C09） | 语义层 `UnderstandingProjection` 是投影非事实组装；`App.tsx` 消费后端数据 | **符合**（前端不组装事实） |
| **ADR-0003** Grounded AI Interpretation | AI 只引用真实图事实、不写图、受 grounding 校验 | `ai_gateway/` 11 模块 1723 行 / 36 测试，每条引用校验真实图事实 | `AIExplanationPanel` 等经 Gate 放行 | 实现但**默认 OFF**（`AI_GATEWAY_ENABLED` 未设即 False）——可用但非生产默认开启 |
| **ADR-0006** Read Model / Provenance | 只读派生投影，无 confidence/score/trust | `provenance_index.py` 152 行严格只读（:60 注无 confidence/score/trust）；`/provenance/{id}` 端点 | `ProvenancePanel.tsx` 经 Gate 放行 | 仅吐 `reference` 字符串，**不吐 source tier**（G-05 部分） |
| **ADR-0007** AI Companion Model | Companion = 第四 Domain Module；Policy 决定、LLM 只表达 | 零命中（E3） | `next/companion/` 四文件 + 测试，边界遵守（Policy 内部无 LLM） | 仅语义层、后端零实现 |

### 4.6 冻结治理范围事实（R1 自身揭示的治理缺口）

| 项 | 事实 | 影响 |
|----|------|------|
| **SCOPE_ALLOWLIST 未覆盖语义层** | `scripts/freeze-check.mjs:165` `SCOPE_ALLOWLIST` 共约 120 条，覆盖 `backend/app/core/*`、`ai_gateway/*`（部分）、`frontend/src/components/*`、`frontend/src/data/*`、`frontend/src/lib/*`、`frontend/src/pages/`、`App.tsx` 等；**唯二 grep `src/next` 与 `src/runtime` 次数为 0**（本次复核）；唯一 `runtime/` 命中点为 :215 注释「WITHOUT touching schema/runtime/enum/API」 | 承载 C15–C21、C22 数据源、C21 Companion、C17 Projection 的 `frontend/src/next/` 与 `frontend/src/runtime/` **整体游离于 Freeze Revision Gate 之外**：对这些文件的修改不触发冻结治理审查 |
| **后果** | L4 契约族（M88.1–88.5、M86.x、M85.1、ADR-0007）的全部实现落在治理边界外；`App.tsx`（白名单内）import 了这些模块，但模块本身不受 Gate 约束 | 契约实现与契约治理不同步——这是 R1 的**结构事实**，不属 P1-05 的 12 项能力冲突，但解释了「为何 L4 能在无后端、无 Gate 的情况下存在」 |

---

## 5. R1 是否揭示 P1-05 之外的新违约

**结论：否。** 本对照表未揭示任何超出 P1-05（C-01…C-12）的**全新契约级违约**。

- P1-05 已覆盖的违约，R1 逐字段确认并落到具体契约条款：
  - Recommendation vs M88.0 §8.3 / §5（C-01/C-02）→ §4.1；
  - 三套「下一步」visited 语义矛盾（C-03）→ §4.1 M88.0 + §4.2；
  - Explanation 三源并存（C-04）/ `connections_explained` 击穿（C-06）→ §4.5 ADR-0003 + §4.3；
  - Cognitive Mirror 契约定位 vs 零实现（C-07）→ §1.5 C22 / §4.6；
  - `package_context` 死参数（C-11）→ §1.6 C26。
- **R1 新增的唯一事实**是 §4.6 的冻结治理范围缺口（`next/` `runtime/` 不在白名单）——这是**治理边界事实**，不是新的「能力 vs 契约」矛盾，但它是理解 L4 现状为何能脱离后端与 Gate 而存在的根因，故作为 R1 的专属发现登记。

---

## 6. 移交 P1-07 / Phase 2 的结论

1. **30 能力成熟度分布**：mature 13 / basic 3 / partial 11 / concept 2 / nonexistent 1。
2. **Headline**：产品今天只真正服务 L1（对象层事实半截）；L3 理解层 concept / 零读者；L4 七项仅语义层、后端零实现且游离冻结治理；主体层零能力。
3. **唯一 nonexistent 能力**：C22 Cognitive Mirror（Article 0 第二句唯一承载者，OD-02 未裁决 → 阻塞 Phase 1 结论）。
4. **11 项 partial 能力**集中在 L4（7）+ 用户接触面（3）+ L3（1），共同根因是「契约在前端语义层落地、后端缺席、治理不同步」。
5. **R1 对照表（ADR-0014 D1）已完成**，覆盖 M88.x / M86.x / M85.1 / M89.1 / M74 / ADR-0003/0006/0007，**未揭示 P1-05 之外的新违约**，但补出 §4.6 冻结治理范围缺口这一结构事实。
6. **仍待 PO 裁决的开放项**（决定 Phase 2 能否起步）：OD-01（北极星度量）、OD-02（Mirror 落层）、R5（跨文明对比提级）、Q-01…Q-05（P1-05 §5）、及 P1-06 建议的 OD-06（持久化）/ OD-07（异议叙述立项）。

---

## 附录 A：评级证据可复现记录

| 核查项 | 方法 | 结果 |
|--------|------|------|
| 成熟度证据源 | 复读 `docs/Phase1/P1-01_Capability_Inventory.md` §2（逐能力代码/数据证据，已含 file:line） | 已引用，不重复 grep |
| L4 后端缺席 | 复读 P1-01 §2.4 + P1-05 附录 A 关键词零命中清单 | ExplorationState / coverageRatio / RuleTrace / Decision / MemoryProjection / understandingGrowthScore 后端全零命中 |
| 持久化缺席 | `grep -rn "localStorage\|persist" frontend/src/next` | 零命中（G-02 复核） |
| 冻结白名单范围 | `grep -n "src/next\|src/runtime" scripts/freeze-check.mjs` | 0 次（`src/next` 0、`src/runtime` 仅 :215 注释）；`SCOPE_ALLOWLIST` 定义于 :165 | 
| 目录存在性 | `ls -d frontend/src/next frontend/src/runtime` | 两者均存在 |
