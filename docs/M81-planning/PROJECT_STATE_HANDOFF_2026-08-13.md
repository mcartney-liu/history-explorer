# History Explorer — 项目现状交接报告（2026-08-13）

> 本报告所有结论均基于**当前 Git 工作树 + 当前代码 + 当前数据**实时核验，不依赖历史文档推测。若代码与文档冲突，以代码为准并已标注。
> 生成依据：三个并行只读探索（前端/后端/数据）+ 关键文件直接读取 + 实时脚本统计。
> 目的：向项目总监/外部长期产品顾问完整汇报真实状态，使其能重新接管项目认知。

---

## 第一部分：Executive Summary

**一句话现状**：History Explorer 是一个**前端主导、后端能力大部分已实现但前端未全面接入、数据初具规模但语义连接刚起步**的历史认知探索系统。当前处于"**功能丰富、体验打磨中、数据是最大瓶颈**"的阶段——大量 UI/研究能力已完成并通过测试，但**后端核心知识引擎（探索/实体/搜索）前端并未真正消费**（前端走本地打包 JSON），**真实跨包语义连接仅 17.9%**。

**关键事实（一页速览）**：
- **Git**：分支 `chore/cleanup-2026-08-12`，HEAD `ae4efe3`，**无 tag**；分支 ref 被外部进程钉死，只能用游离 commit；游离链 8 个 commit 未 push；工作树 68+ 项改动未提交（混有多人/多会话批次）
- **无数据库**：仅 sqlite3 匿名研究存档（ADR-0018），无 PG/Neo4j/Redis
- **前端**：App.tsx **1484 行**巨型编排器；Landing 3 tab；主题四视角（探索/解释/关系/理解）；实体 2 主 tab（了解/研究）
- **后端**：`/api/v1` 约 20 端点；Knowledge Core 已实现；**AI Gateway 默认关闭**；因果层模型存在但**未装配到运行引擎**
- **数据**：10 包 / 184 实体 / 357 关系 / **64 跨包关系（17.9%）**；实体级 category 缺 96%；时间字段缺 38%
- **测试**：exploration 目录 + 多组件 **155/155 绿**；`freeze-check.mjs` PASSED

---

## 第二部分：Current Product（从真实代码反推）

### 首页（Landing，`LandingTabs`）
3 个一级 tab：
- **「我的」**：`MyExplorationPanel` — 探索足迹、最近研究、研究收藏、推荐探索、用户空间（部分占位）
- **「了解」**：`DiscoverPage` — 6 类主题卡片墙（文明/事件/人物/宗教/技术/地点）+ 官方探索包 + 系统精选（`silk_road`）
- **「研究」**：`LandingPage` — Hero + QuickStart 快捷提问 + 为什么问题种子（UnderstandingSeeds）+ FeaturedTopics + RecentExplorations

**注释明确**：`[扩展]` tab 已从栏上移除（"敬请期待"破坏入口承诺）。

### 主题页（`UnderstandingCanvas` 四视角）
- **探索**：标题 + SummaryPanel + MainEntityCard + StorySection + WhyImportant + TopicExploreStarters
- **解释**：时间线视图（单线/多线）+ TimelinePanel/MultiEntityTimeline + TemporalComparisonPanel + InterpretationPanel + DisputesPanel + AIExplanationPanel + TopicComparisonPanel + EntityPickerPanel
- **关系**：关系视图切换（列表/图谱）+ RelationshipView/GraphViewPanel + CrossTopicView + RelatedEntityList + ThemesPanel
- **理解**：UnderstandingOverview + UnderstandingActions + UnderstandingWorkspace + ContinueExploringPanel

### 实体页（`EntityPage`，`EntityPageShell` 3 tab）
- **了解（info）**：EntityExperienceHeader（EntityHero + ExplorationGuide）+ StorySection + RelationshipInsight（AI）+ ConnectionExplorer（图/时间线/地图三视图）+ HistorianChat（AI 对话）+ ProvenancePanel（溯源）
- **研究（research）**：研究主区（ResearchPanel）+ ResearchLibrary + EntityRelatedList；事件专属区（EventCausalChain/EventImpactPanel/EventNarrativeCard）；解读与 AI 区（InterpretationPanel + AIExplanationPanel）
- **扩展（extensions）**：占位（"敬请期待"）

### 研究功能（核心！）
**三阶段自主触发**：
1. **四维研究**（政治/军事/经济/文化）→ 2. **研究中评** → 3. **综合报告**（AI）
- 支持单点/批量、完成后折叠 + 查看报告 modal、研究中评门控四全 success
- 研究存档到后端 sqlite（`/api/v1/research`）
- 中文化完成，AI 输出简体中文约束

### 理解/解释/关系能力呈现
- 这些能力主要作为**实体页/主题页的区块**呈现（RelationshipInsight、InterpretationPanel、CrossTopicView 等），**不是独立模式**
- `next/` 语义层（ExplorerRuntimeContext、exploration/）已实现但**只部分接到 UI**

### 当前用户真实旅程
```
首页（我的/了解/研究 3 tab）
 → 点主题卡（了解 tab）→ 主题页四视角（探索/解释/关系/理解）
 → 点实体 → 实体页
    ├─ 了解 tab：身份/见解 → 关系探索(图/时间线/地图) → AI 对话 → 溯源
    ├─ 研究 tab：四维研究 → 研究中评 → 综合报告（可存档/回顾）
 → 或首页研究 tab → 提问 → 实体
 → 研究/探索足迹存入「我的」
```

**真正的终点能力**：用户能从"点开一个历史主题"走到"针对一个实体做四维研究、得到 AI 综合报告、并存入研究库回顾"。这是当前最能证明产品价值的闭环。

### 占位/规划（非可用）
- 实体页「扩展」tab（占位）
- 首页「我的」部分区域（用户探索空间）
- 大量 flag 门控的功能（`flagEnabled`，如 journey_trail、related_entities）默认未全开

---

## 第三部分：Current Frontend

| 项 | 现状 |
|---|---|
| **App.tsx** | **1484 行**，巨型"页面编排器"（state + 路由状态机 + 数据加载 + JSX 六区域渲染） |
| **Shell** | 3 个：`ExplorerShell`（主用，6 区域）+ `AppShell`（死代码，未引用）+ `EntityPageShell`（实体 tab 容器）；另 `CompanionShell`（AI dock） |
| **Router** | `routing/`（useRouter + parseRoute + routeSchema）；hash 路由 + `useNavigationHistory` 状态机混合 |
| **Mode** | `next/exploration/`（ExplorationPolicy/State）+ UnderstandingCanvas 四视角 tab（探索/解释/关系/理解） |
| **页面/视图** | `pages/`：DiscoverPage / ExplorationPackagePage / DevCatalog / admin/ / m89/ |
| **components** | **205 个文件**（198 tsx），含 `shell/`（15）、`entity/`（10）、`package/`（12）、`ai/`（16）、`ui/`（11 原语）、`primitives/` |
| **hooks** | `useNavigationHistory` / `usePackageContext` |
| **contexts** | `ExplorerRuntimeContext`（next/） |
| **next/** | 语义层：`exploration/`（17 文件）、`memory/`、`recommendation/`、`companion/`、`ExplorerRuntimeContext.tsx`、`UnderstandingProjection.ts` |
| **routing/** | 5 文件 |
| **数据加载** | 前端 `API_BASE` 仅出现在 **6 文件**；核心知识从**本地打包 JSON** 读取（explorationPackages.ts import data/*.json）；fetch 的只有 AI/见解/内容/站点/研究/溯源 |
| **i18n** | `locales/`：en/ja/zh 各 10 文件 + index + terminology（M72 中文化完成） |
| **CSS** | `styles/` 9 文件 + App.css + ui.css；大量 inline style（UnderstandingCanvas） |
| **UI 原语** | `components/ui/` 11 个 + `primitives/` |

### M90/M90.3 旧结构与新结构
- **旧（M90 遗留）**：App.tsx 巨型编排、`usePackageContext`、`pages/m89/`、`AppShell` 死代码、DevCatalog、部分 inline-style 四视角
- **新（后续建立）**：`routing/` 分层、`EntityPageShell` tab 化、ResearchPanel 三阶段、`components/shell/` 分区、flag 门控体系、`components/discover/`（LandingTabs 三 tab）、后台内容配置（content/）

### 当前最大的 5 个前端结构问题（基于代码）
1. **App.tsx 1484 行巨型编排器**——所有 state/数据/JSX 集中一处，任何改动风险大、难并行（正是之前协作事故的温床）
2. **核心数据不走后端**——前端从本地 JSON 打包读取，导致"后端已实现能力（探索/实体/搜索）前端不消费"，能力与体验割裂
3. **语义层 `next/` 未全面接 UI**——ExplorerRuntimeContext/exploration 引擎已实现，但只部分呈现，认知推进主要靠区块而非统一容器
4. **inline style 与 CSS 混用**——UnderstandingCanvas 等大量 inline style，未统一到 Design System（暗底+金）
5. **flag 门控分散 + 功能面碎片化**——大量 `flagEnabled` 开关、206 个组件无统一基组件约束，规模两极

---

## 第四部分：Current Backend

| 能力 | 状态 | 说明 |
|---|---|---|
| Knowledge Core (GlobalGraph) | ✅ 已实现 | `core/global_graph.py`，跨主题图 |
| Entity | ✅ 已实现 | `KnowledgeRegistry` + `JsonTopicRepository` |
| Relationship | ✅ 已实现 | **RELATIONSHIP_TYPES=20**（校验白名单，非记忆中的18） |
| CausalStatement | ⚠️ 模型已实现，**未装配** | 7 字段 frozen dataclass，但引擎构造未注入 causal_adapter |
| CausalObject | ⚠️ 模型已实现，**未装配** | 11 字段；前端 `causalObjectNames.ts` 是本地常量，不消费后端 |
| Exploration Engine | ✅ 已实现 | 四维加权 W=.35/.25/.20/.20；但前端未调用 `/explore` 等端点 |
| Exploration Package | ⚠️ 数据在前端 | 后端无专门端点，前端本地打包 |
| Exploration Guide | ❌ 未实现（后端） | 纯前端 `explorationGuide.ts` |
| Exploration Runtime | ❌ 未实现（后端） | 后端 AI 明确 stateless；前端本地 |
| Memory / Trail | ✅ 已实现 | sqlite3 研究存档（ADR-0018）+ 探索足迹 |
| Metrics | ❌ 未实现（后端） | 纯前端本地统计 |
| AI Gateway | ✅ 已实现（默认关闭） | `AI_GATEWAY_ENABLED=false`；prompt_service + 6 模式 |
| Evidence / Source | ✅ 已实现 | EvidenceClaim + SourceRegistry + ProvenanceIndex |
| i18n / terminology | ⚠️ 部分 | 无独立后端模块，靠数据 `labels.zh` 优先 |
| validation | ✅ 已实现 | validation.py + RELATIONSHIP_TYPES=20 |

### 前端真正消费的后端能力（仅 6 类）
1. `/api/v1/ai/explain`、`/api/v1/ai/chat`（AI 解释/问答）
2. `/api/v1/insights/{gid}`（历史见解读写）
3. `/api/v1/content*`（首页文案/图）
4. `/api/v1/site-config*`（站点开关/主题排序）
5. `/api/v1/research`（研究存档）
6. `/api/v1/provenance/{id}`（溯源）

**关键结论**：后端暴露的**知识图谱/探索引擎核心端点**（`/explore`、`/entity`、`/search`、`/topics`、`/explore-starters`、`/related-entities`）**前端没有直接调用**——前端从本地 JSON 打包读取这些数据。

---

## 第五部分：Current Data（实时统计）

| 包 | 实体 | 关系 |
|---|---|---|
| ancient_india | 14 | 26 |
| china_civilization_v1 | 41 | 74 |
| early_christianity | 11 | 23 |
| egypt_technology_religion | 13 | 26 |
| greek_philosophy | 12 | 24 |
| hellenistic_world | 14 | 29 |
| persian_empire | 12 | 25 |
| roman_empire | 16 | 34 |
| silk_road | 10 | 30 |
| textbook_cn_history_v1 | 41 | 66 |
| **合计** | **184** | **357** |

**关键统计**：
- **总实体 184 / 总关系 357 / 10 包**
- **跨包关系：64 条（17.9%）** — 注意：用 local id 直接判断是 2 条（误导），映射到 global_id 后是 **64 条**，连接覆盖 silk_road↔china_v1、hellenistic↔罗马/埃及/波斯 等
- **叶子节点（度=1）：24 个**；**枢纽节点（度≥5）：48 个**
- 枢纽 top：civ-zhonghua(15)、civ-persian(14)、civ-roman(12)、civ-huaxia(12)、silk_road(11)
- **缺 category：177/184（96%）**（实体级缺；包级有 category）
- **缺时间字段：70/184（38%）**
- **重复 global_id：0**
- **中国与世界连接**：silk_road↔china_v1(13条)、china_v1↔tb_cn_v1(2)、china↔roman(1)、china↔india(1)、china↔persian(1) 等——**中国已与世界有连接**
- 其他文件：causal_objects.json、causal_statements.json、evidence_claims.json、exploration_packages.json、sources.json

**Connectivity Repair 核实**：**已基本完成**——64 条跨包关系（17.9%）已存在，`scripts/analyze_graph.py`、`apply_b_layer.py`、`apply_cleanup.py`、`fill_sources.py` 等脚本存在；HEAD 提交 `ae4efe3` "补全 A 层跨包关系并回填证据来源"。

**最重要数据缺口**：**实体级 category 缺失 96%**（177/184 实体无 category，无法支撑"分类导航→真实主题"的产品逻辑），以及**时间字段缺失 38%**（影响时间线/比较能力）。

---

## 第六部分：Capability Reality Map

```
Experience（体验）
  [REAL] 首页三 tab 入口（我的/了解/研究）
  [REAL] 主题页四视角（探索/解释/关系/理解）——但理解视角较浅
  [REAL] 实体页了解+研究 双 tab
  [REAL] 四维研究 → 研究中评 → 综合报告 闭环
  [PARTIAL] 研究库/探索足迹（「我的」部分占位）
    ↓
Runtime（运行时）
  [REAL] ExplorerRuntimeContext（next/）
  [REAL] useNavigationHistory 状态机
  [PARTIAL] 认知推进未统一到 Runtime 驱动（区块化）
    ↓
Understanding（理解层）
  [PARTIAL] RelationshipInsight / InterpretationPanel / UnderstandingOverview
  [CONTRACT] M85 EO/EC 体验契约（未系统性验证）
  [PARTIAL] ExplorationPolicy 接 UI（P-U08 修复中文维度标签→真实实体）
    ↓
Explanation（解释层）
  [REAL] CausalStatement/CausalObject 模型（后端）
  [PARTIAL] 前端 EventCausalChain / EventNarrativeCard（本地数据）
  [NOT-ASSEMBLED] 后端因果层未注入运行引擎
    ↓
Fact / Knowledge（事实层）
  [REAL] GlobalGraph / Registry / validation（后端）
  [PARTIAL] 前端本地 JSON 打包（非消费后端端点）
  [REAL] evidence/sources/provenance
```

**产品想给用户看 vs 代码真能提供**：
- **想给**：从好奇 → 认知推进 → 形成理解（Understanding Loop）
- **能提供**：丰富的主题/实体浏览 + 四维研究闭环 + AI 问答/见解。**理解层是"区块化呈现"，未形成统一的"认知推进容器"**——用户能"浏览+研究"，但"认知结构逐步深化"的体验尚未真正闭环（EO-004 未达）。

---

## 第七部分：Recent Decisions（最近一周，2026-08-12~13）

| 项 | 原来 → 决定 → 现在 → 为什么 |
|---|---|
| **研究三阶段** | 单次研究 → 三阶段自主触发（四维→中评→综合报告）→ 分步生成 → 让研究有推进感和深度 |
| **首页结构** | 4 tab（含扩展占位）→ 删扩展、三 tab（我的/了解/研究）→ 三 tab → "点了什么就该得到什么" |
| **研究收藏库** | 收藏 → 改名「研究库」→ 研究记录库 + 网格书架化 → 与首页「我的」区分 |
| **AI 见解** | Markdown 裸显 → 去 Markdown（prompt 纯文本 + 前端剥离）→ 纯文本 → 消除 JSON 残留/格式混乱 |
| **实体导航** | localStorage 污染初始 tab → 实体默认进「了解」→ info tab → 移除污染 |
| **ExplorationGuide** | 用户友好区 → 重写为「知识概览」（标题/引导语/深度标签）→ 更易懂 |
| **P-U08 根因** | "下一站探索"中文维度标签→404 → ExplorationState 加 dimensionMapping → 真实实体 → 修复推演断掉 |
| **UI 细节** | 维度卡 logo 放大、2×2 网格、图片焦点、关系彩色 Badge → 视觉打磨 |
| **Connectivity Repair** | 数据孤岛 → 补 A 层跨包关系 + 回填证据来源 → 64 跨包关系 → 建立文明连接 |

**明确 UNKNOWN/无法确认**的部分：部分 admin/后台内容配置的完整决策链、以及某些 flag 默认值策略未在 git 中明确记录。

---

## 第八部分：Risks / Opportunities

### A. 当前阶段判断
**"功能完成度高于数据完成度、体验完整性高于架构收敛度"**——处于从"能力展示"向"认知闭环产品"迁移的过渡期。研究闭环已验证价值，但理解层和架构收敛未完成。

### B. 当前最大 5 个风险
1. **数据是硬瓶颈**：实体级 category 缺 96%、时间缺 38%、跨包连接仅 17.9%——产品核心价值（文明理解）直接受制于数据语义连接不足
2. **Git/协作混乱**：分支 ref 被钉死、游离 commit 链未 push、工作树 68+ 项未提交混批次——有丢失工作/提交错分支的现实风险
3. **架构未收敛**：App.tsx 1484 行 + 语义层 `next/` 未全面接 UI——后续并行开发和扩展成本高
4. **后端能力空转**：知识引擎/因果层已实现但前端未消费、因果层未装配——投入与价值未兑现
5. **AI 依赖未受控**：AI Gateway 默认关闭但研究/见解大量依赖 AI，LLM 不稳定输出需持续兜底（JSON 清洗、中英文门控）

### C. 当前最大 5 个机会
1. **研究闭环已验证**——这是当前最能证明产品价值的核心，可放大为产品招牌
2. **后端知识引擎已就绪**——一旦前端接入 `/explore`、`/entity` 等端点，能力可立即变现，去掉本地 JSON 打包
3. **因果层可激活**——模型已实现，注入引擎即可开启"为什么发生"的解释深化
4. **数据补全路径已建立**（analyze_graph/apply_b_layer 脚本 + 回填证据）——补 category/时间/跨包连接有工具支撑
5. **多语言（zh/en/ja）已铺好**——国际化是现成差异化

### D. 若只允许做 3 件事
1. **补数据语义连接**（category 96% + 跨包连接 + 时间字段）——这是产品核心价值的地基
2. **前端接入后端知识引擎**（去掉本地 JSON，接通 /explore /entity /explore-starters）——让已实现能力真正被消费
3. **解决 Git 协作机制**（游离链 push、工作树分拣、worktree/分支隔离）——防止现有成果丢失，为并行开发铺路

### E. 最需要项目总监重新裁决的 5 个问题
1. **数据语义连接的优先级**：是否把"补实体级 category + 扩展跨包连接"列为下一里程碑唯一主线？
2. **前端是否接入后端知识引擎**：是保留本地 JSON（快、稳）还是切后端端点（能力统一、但有迁移成本）？
3. **因果层是否激活**：将 CausalObject 注入运行引擎，开启解释深化，还是保持现状？
4. **理解层体验形态**：是否投资将语义层统一为"认知推进容器"，还是维持区块化呈现？
5. **Git 协作治理**：是否采用 worktree + 每 Agent 独立分支 + 独立身份，解决当前提交混乱？

### F. 是否具备大规模补数据条件？
**基本具备但不完全**：
- ✅ 有：数据 schema 清晰、有补全脚本（analyze_graph/apply_b_layer/fill_sources）、有校验（validation.py）
- ❌ 缺：实体级 category 语义定义（96% 缺失，需先定 category 枚举）、时间字段补全来源、以及"补多少/连接哪些"的产品决策——**缺的是语义标准和拍板，不是工具**

### G. 前端是否承载核心产品价值？
**部分是，但未完全**。前端已经能承载"浏览 + 四维研究 + AI 问答"的真实价值闭环（研究是最强证明），但**"认知结构探索"的核心（理解形成、认知推进）仍主要是"能力展示层"**——区块丰富但未形成统一的认知推进容器，Understanding Loop 未真正闭环。

---

## 第九部分：Top Decisions Needed（同第八部分 E，最急 5 项）

1. **数据主线**：下一里程碑是否锁定"数据语义连接"（category + 跨包 + 时间）？
2. **前端数据源**：本地 JSON vs 后端端点？
3. **因果层**：激活 or 冻结？
4. **理解层形态**：统一容器 or 区块化？
5. **Git 协作治理**：worktree + 分支隔离方案是否采纳？

---

## ONE-PAGE PROJECT STATE

| | |
|---|---|
| **项目是什么** | 认知结构探索系统，首个载体 = 历史知识探索（History Explorer） |
| **已经有什么** | 前端 206 组件 + 语义层 next/；后端 Knowledge Core/AI Gateway/研究存档/溯源；10 包 184 实体 357 关系 64 跨包连接；zh/en/ja |
| **真正能做什么** | 浏览主题/实体 → 四维研究 → AI 综合报告 → 存入研究库回顾；AI 问答、见解、溯源 |
| **还缺什么** | 实体级 category(96%)、时间字段(38%)、跨包连接(仅17.9%)；前端未接后端知识引擎；理解层未成统一容器；因果层未激活 |
| **当前最大问题** | **数据语义连接不足 + 前端/后端能力割裂 + Git 协作混乱**（三者相互放大） |
| **下一阶段最重要目标** | **以"数据语义连接"为主线补数据，同时接通后端知识引擎，并落地 Git 协作治理**——三件事共同构成从"能力展示"到"认知闭环产品"的迁移 |

---

## 附：数据可信度说明

本报告的数据（184/357/64 跨包/17.9%）是**实时跑脚本统计当前文件**所得，非历史数据。前端/后端/能力部分基于三个并行只读探索 + 关键文件直接读取，证据均已附。若发现与当前实际不符，以代码为准并重新核验。
