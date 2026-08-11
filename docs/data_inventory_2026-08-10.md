# 数据资产清单 — History Explorer

> 生成时间：2026-08-10（自动统计，来源：data/ 目录 JSON 文件）
> 复核更新：2026-08-11（来源字段增强 + ISBN 批量补全 + 全量历史见解生成）

## 一、总体概览

| 数据层 | 数量 | 说明 |
|--------|------|------|
| 主题包 | 10 | data/examples/*_example.json（不含 .bak） |
| 唯一实体 | 186 | 按 global_id 去重，当前无跨包重复 |
| 关系 | 257 | 全部主题包 relationships 合计 |
| 探索包 | 10 | data/exploration_packages.json（引用式编排） |
| 证据声明 | 227 | data/evidence_claims.json |
| 来源 | 105 | data/sources.json（year 105/105；isbn 17/105，见 1.1） |
| 因果对象 | 12 | data/causal_objects.json |
| 因果陈述 | 5 | data/causal_statements.json |
| 固化历史见解 | 186 | backend/data/entity_insights.db（sqlite，ADR-0018；engine=ai，2026-08-11 全量生成，186/186 实体全覆盖） |

## 1.1 来源字段完整性（2026-08-11 增强）

每条来源 = 一张完整书目卡，字段覆盖：

| 字段 | 覆盖 | 说明 |
|------|------|------|
| `id` / `type` / `title` / `creator` / `reference` / `license` / `publisher_or_archive` / `tier` | 105/105 | 基础字段，M74 起即有 |
| `year`（出版年份） | 105/105 | 全库已有；2026-08-11 起随证据区展示（"出版社，年份"） |
| `isbn`（图书全球唯一编号） | 17/105 | 2026-08-11 新增字段；16 条现代图书逐条联网查证 + ISBN-13 校验位自检 |

**isbn 缺省的 88 条（合理缺省，非遗漏）：**

| 分类 | 条数 | 原因 |
|------|------|------|
| 古籍经典（希罗多德、史记、吉本等原著年份 < 1900） | 43 | 原著无现代 ISBN；补现代译本反而误导 |
| 期刊 / 网站 / 百科（JSTOR、Britannica、Livius 等） | 12 | 无 ISBN 概念 |
| 查无实书（疑似占位条目） | 2 | src-rosenberg-1999、src-early-church，联网查无对应出版物 |
| 待补（未查到可靠值） | 1 | src-cn-subingqi《中国文明起源新探》，两轮搜索无 ISBN 证据，挂账 |
| 已有 ISBN（含 CAH Vol.13 首条 + 本轮 16 条） | 17 | — |

**展示效果（证据区引用格式，2026-08-11 起）：**
> 原文/摘要：\<claim\>；来源：\<title\>；编者：\<creator\>；出版社：\<publisher\>，\<year\>；ISBN：\<isbn\> [等级徽标] · \<source_id\>

等级徽标（source_tier）此前因 evidence_out 漏带字段从未显示，2026-08-11 修复：新生成记录直接携带，已固化记录由 `_enrich_evidence_with_source` 读时按 source_id 从 sources.json 补全——全部记录（含 sqlite 存量）全局生效，无需重新生成。

## 二、实体类型分布（8 类）

| 类型 | 数量 |
|------|------|
| Person | 47 |
| Location | 28 |
| Event | 26 |
| Idea | 26 |
| Technology | 19 |
| Time Period | 18 |
| Civilization | 13 |
| Religion | 9 |

## 三、每个主题包明细

| 主题包 | 实体数 | 关系数 | 类型分布 |
|--------|--------|--------|----------|
| 古印度 — 孔雀王朝与佛教传播 | 14 | 19 | Person×5, Location×2, Time Period×2, Civilization×1, Religion×1, Event×1, Idea×1, Technology×1 |
| 中国文明演化探索包 V1 — 唐至清的文化、制度与技术演化 | 41 | 48 | Idea×11, Person×10, Time Period×5, Technology×4, Event×4, Location×4, Religion×2, Civilization×1 |
| 早期基督教 — 从耶稣到保罗 | 11 | 19 | Person×3, Event×3, Location×2, Idea×2, Religion×1 |
| 古埃及 — 技术与宗教 | 13 | 19 | Technology×3, Civilization×2, Religion×2, Time Period×2, Event×1, Location×1, Idea×1, Person×1 |
| 希腊哲学 — 从苏格拉底到亚里士多德 | 12 | 21 | Person×5, Idea×3, Location×2, Event×1, Technology×1 |
| 希腊化世界 — 希腊、亚历山大与托勒密桥梁 | 14 | 27 | Event×4, Civilization×3, Person×2, Location×2, Idea×2, Technology×1 |
| 波斯帝国 — 从居鲁士到亚历山大 | 12 | 20 | Person×4, Location×2, Religion×2, Civilization×1, Technology×1, Event×1, Time Period×1 |
| 罗马帝国 | 16 | 29 | Event×5, Person×3, Civilization×3, Location×2, Time Period×2, Religion×1 |
| 丝绸之路 — 罗马与中国的连接 | 12 | 20 | Location×4, Technology×3, Person×2, Civilization×1, Event×1, Idea×1 |
| 人教版《中国历史》抽样包 V1 — 史前时期至夏商周 | 41 | 35 | Person×12, Location×7, Time Period×6, Event×5, Technology×5, Idea×5, Civilization×1 |
| **合计** | **186** | **257** | |

## 四、探索包（10 个，引用式编排）

| slug | 中文标题 | seed_topic | entity_references | relationship_paths | placement |
|------|----------|------------|-------------------|--------------------|-----------|
| china-civilization-v1 | 中国文明演化探索包 V1 | china_civilization_v1 | 12 | 9 | understand |
| silk-road-exploration | 丝绸之路探索包 V1 | silk_road | 12 | 8 | understand |
| roman-empire-exploration | 罗马帝国探索包 V1 | roman_empire | 13 | 13 | understand |
| india-classical-civilization | 印度文明探索包 V1 | ancient_india | 14 | 13 | understand |
| textbook-cn-history-v1 | 人教版《中国历史》抽样包 V1（史前—夏商周） | textbook_cn_history_v1 | 9 | 7 | understand |
| persian-empire-exploration | 波斯帝国探索包 V1 | persian_empire | 10 | 9 | understand |
| greek-philosophy-exploration | 古希腊哲学探索包 V1 | greek_philosophy | 12 | 10 | understand |
| hellenistic-world-exploration | 希腊化世界探索包 V1 | hellenistic_world | 14 | 12 | understand |
| egypt-technology-religion-exploration | 埃及技术与宗教探索包 V1 | egypt_technology_religion | 13 | 12 | understand |
| early-christianity-exploration | 早期基督教探索包 V1 | early_christianity | 11 | 10 | understand |
| **合计** | | | **120** | **103** | |

## 五、数据层 ↔ 页面归属（哪些有独立页面、哪些是页面内的板块）

> 说明：本产品前端是单页应用（自定义路由），不存在"每个数据一个 URL"的对应关系。
> 下表按「独立页面 / 页面内板块」两级标注每个数据层的真实 UI 落点。

### 5.1 独立页面清单（共 6 个）

| 页面 | 路由/触发条件 | 渲染组件 | 消费的数据层 |
|------|---------------|----------|--------------|
| 首页（3 tab） | 无当前节点 | `LandingTabs`（我的 / 了解 / 研究；扩展 tab 已按 Wave2-#141 移除） | 主题包（列表+精选）、探索包、因果对象（入口）、研究足迹 |
| 主题页（4 视角） | `current.type === 'topic'` | `UnderstandingCanvas` | 主题包（实体/关系/时间线） |
| 实体页（3 tab） | `current.type === 'entity'` | `EntityPage` | 实体、关系、证据声明、来源 |
| 探索包页 | `packageSlug` 命中 | `ExplorationPackagePage` | 探索包（引用主题包实体） |
| 因果对象页（三幕） | `current.type === 'causal_object'` | `CausalObjectDetailPage` | 因果对象、因果陈述 |
| 后台管理 | `#/admin` | `AdminPage` | 全部配置层（内容槽 + site_config） |

### 5.2 数据层归属明细

> 用法：第 4 列 = 页面里有哪些功能块（细粒度，如"了解 tab 里有哪几块"）；第 5 列 = 每块功能做什么（对照 UI 实测）。

| 数据层 | 独立页面 | 归属页面/板块 | 页面里有哪些东西（功能块） | 详细说明（每项功能做什么） |
|--------|:---:|----------------|------|------|
| **主题包** | ✅ | 主题页 `UnderstandingCanvas`（4 视角） | 探索视角：页头 / 概述卡 / 主实体卡 / 故事 / 为什么重要 / 探索起点；解释视角：时间线 / 时间对比 / 解释 / 争议；关系视角：关系视图 / 图面板；理解视角：认知概览 / 理解工作区 / 继续探索 | **探索**：页头（标题+"探索·主要信息"）→ 概述策展卡（编辑手写总述）→ 主实体卡（本主题主角）→ 故事（编辑手写叙事）→ 为什么重要策展卡 → 探索起点 chips；**解释**：时间线（单线/多线切换）→ 时间对比 → 解释面板（关系解读）→ 争议面板（学界分歧）；**关系**：关系视图 + 图面板（点实体聚焦）；**理解**：认知概览（理解度%）→ 五区工作区（导航/过渡/证据/路径/行动）→ 继续探索 |
| **实体** | ✅ | 实体页 `EntityPage`（3 tab，工作树实测版） | 顶部：类型头 / 概述卡 / 研究桥 / 探索引导 / 故事·为什么重要 / 关系洞察（探索建议） / 探索足迹；了解 tab：身份卡 / 历史洞察 / 推荐探索 / 关系网络·时间轴·空间 / 相关实体 / AI 历史学家 / 数据溯源；研究 tab：研究主区（AI 研究模式 / 资料库 / 相关实体）/ 事件专属（因果链 / 影响 / AI 叙事 / 叙事旅程）/ 解读与 AI（为何值得探索 / 历史意涵 / AI 溯源）；扩展 tab；附属：探索路径 / 下一步 / 继续探索 | **顶部**：类型头（如"事件"）→ 概述策展卡 → 研究 CTA 桥 → 实体级探索引导 → 故事/为什么重要（**仅该实体有手写叙事才显示**，实体级叙事多为空→隐藏）→ 关系洞察（探索建议）（**AI 后端关闭时请求失败→整块不渲染**）→ 探索足迹（本地行为流，AI 开关控制）；**了解 tab**：身份卡（实体名+类型，历史见解·已固化）→ 历史洞察卡（实体有固化见解则展示全文，无则占位）→ 推荐探索（从哪些节点继续）→ 关系网络/时间轴/空间（三视图切换）→ 相关实体卡（点击跳转该实体页）→ AI 历史学家（提问）→ 数据溯源 → 研究桥；**研究 tab**：研究主区 = AI 研究模式（按类型给模板问题：事件=背景/过程/影响/长期意义，人物=生平/贡献/影响/评价）+ 研究资料库 + 相关实体（点击跳转实体页）；事件专属 = 因果链 + 影响面板 + AI 历史叙事 + 叙事旅程；解读与 AI = 关系解读（为何值得探索）+ 理解卡（历史意涵）+ AI 事实溯源解读；**扩展 tab**：占位；**附属**：探索路径 + 下一步建议 + 继续探索 |
| **关系** | ❌ | 板块级，分散 4 处 | 主题页「关系」视角 / 实体页「相关实体」/ 实体页「关系洞察（探索建议）」/ 探索包「关系链」 | **主题页关系视角**：关系视图（主实体+相关实体连线）+ 图面板（可点击聚焦）；**实体页研究 tab 相关实体**：图谱引擎驱动的实体列表，**点击跳转到该实体页**（进入它的研究链路，非展开追问）；**实体页了解 tab 关系洞察（探索建议）**：AI 生成、证据绑定，**AI 后端关闭（AI_GATEWAY_ENABLED=false）时请求失败→整块不渲染**；**探索包关系链**：按 `relationship_paths` 编排的链式视图，边上可嵌因果陈述卡 |
| **探索包** | ✅ | 探索包页 `ExplorationPackagePage` | 首屏：标题 / 摘要 / 探索目标 / 开始按钮；第二层：探索引导 / 探索旅程（关系链 / 时间片 / 来源引用） | **首屏**：标题 + 摘要 + 探索目标（"为什么"）+ 开始探索按钮；**第二层**：探索引导（当前位置/下一步/原因/覆盖度）+ 探索旅程（关系链 + 时间片 + 来源引用）；**交互**：点实体进实体页、点来源看引用、返回 |
| **证据声明** | ❌ | 板块级，散布于证据展示 | 数据溯源 / 证据块徽标 / 关系证据 / 解释面板 / AI 溯源解读 / 探索包引用 | **数据溯源**（实体页了解 tab）：按实体拉取证据记录列表；**证据区引用格式**（2026-08-11 起）：原文/摘要 → 来源标题 → 编者 → 出版社+年份 → ISBN → 等级徽标 → 来源编号，有值才显示；**证据块徽标**：5 类型（事实/出处/策展/时间线/解释）各有配色；**关系证据**：关系边上"查看依据"；**解释面板**：关联强度条+为什么解释；**AI 溯源解读**：AI 生成带溯源引用；**探索包来源引用**：可点击 |
| **来源** | ❌ | 作为引用内嵌展示 | 证据块出处 / 溯源记录 / 探索包引用 / 来源书目卡 | **证据块出处**：如《资治通鉴》卷十二；**溯源记录**（ProvenancePanel）：证据来源分级展示；**来源书目卡**（2026-08-11 起）：证据区每条来源自动带出作者（creator）/ 出版社（publisher_or_archive）/ 年份（year）/ ISBN（isbn）/ 等级（tier），读时从 sources.json 补全，全量生效；**探索包 source_references**：PackageJourney 可点击看引用 |
| **因果对象** | ✅ | 因果对象页 `CausalObjectDetailPage`（三幕） | Act 1：机制 / 后果；Act 2：关联对象卡网格；Act 3：继续探索 | **Act 1 理解**：机制（为什么发生）+ 后果（带来什么影响）两段叙事；**Act 2 连接**："为什么值得一起探索"→ 关联因果对象卡（关系类型标签+对象名+解释+探索 CTA）；**Act 3 继续探索**：从这里出发跳转相关实体/对象；入口：首页研究 tab + 继续探索面板 |
| **因果陈述** | ❌ | 内嵌于 3 处 | 因果对象页 / 探索引导 / 探索包关系链 | **因果对象页**：内部证据卡；**探索引导 GuidePanel**：步骤带因果陈述时渲染完整 `CausalStatementCard`；**探索包关系链**：边匹配到 CS 即渲染（M82 P2） |

### 5.3 一句话总结

- **有独立页面的数据层（4 个）**：主题包、实体、探索包、因果对象。
- **纯板块/内嵌的数据层（4 个）**：关系、证据声明、来源、因果陈述——它们都不是"页"，而是挂在主题页 / 实体页 / 探索包页内的功能模块或徽标。

## 六、UI 页面与功能清单（共 6 个页面）

> 本产品是单页应用，以下 6 个页面 = 6 种"视图"（路由触发条件见 5.1）。
> 每个页面下列出的是**可见功能板块**（组件级），方便逐页核对 UI。

### 6.1 首页（无当前节点时的默认视图）

| 区域 | 功能板块 |
|------|----------|
| 全局壳 | 顶部栏（品牌 / 当前主题 / 模式 / 语言切换 / 内容配置后台入口）、模式栏、探索壳 |
| 我的 tab | 我的探索空间（探索维度：跟随策展 / 追问因果 / 直接发问；行为信号；足迹） |
| 了解 tab | 发现页：探索主题墙（主题卡）→ 官方探索包 → 系统精选·编辑策展（丝路主推+起点 chips）→ 大家都在探索；底部反馈组件 |
| 研究 tab | 快速开始（QuickStartChips）→ 探索起点（后台可配）→ 3 个"为什么"问题种子 → 精选主题（首页 curated 条）→ 最近探索 / 因果对象入口 |
| 扩展 tab | 已按 Wave2-#141 从导航栏移除（TabKey 保留，不渲染） |

### 6.2 主题页（UnderstandingCanvas，4 视角切换）

| 视角 | 功能板块 |
|------|----------|
| 探索视角 | 标题 + 副标题 → 概述策展卡（SummaryPanel）→ 主实体卡（MainEntityCard）→ 故事（StorySection）→ 为什么重要策展卡（WhyImportantPanel）→ 探索起点（TopicExploreStarters） |
| 解释视角 | 时间线视图切换（单线 / 多线）→ 时间线（TimelinePanel / MultiEntityTimeline）→ 时间对比（TemporalComparisonPanel）→ 解释面板（InterpretationPanel）→ 争议面板（DisputesPanel） |
| 关系视角 | 关系视图（RelationshipView）+ 关系图面板（GraphViewPanel），可点击实体聚焦 |
| 理解视角 | 认知概览（UnderstandingOverview）→ 理解工作区五区（UnderstandingWorkspace：导航 / 过渡 / 证据 / 路径 / 行动）→ 继续探索（ContinueExploringPanel） |

### 6.3 实体页（EntityPage，3 tab）—— 按工作树实测（M59 实体体验重构版）

> ⚠️ 本节为**用户实测**（以"西罗马帝国灭亡"为例，工作树最新代码）。
> HEAD 提交态仍是旧结构（概述策展卡 + 故事/为什么重要 + AI 对话 + 数据溯源），
> 待未拍板重构合并后以本节为准。

| 区域 | 功能板块（实测顺序） |
|------|----------|
| 页面顶部 | 实体类型头（如"事件"）→ 概述卡（策展徽标）→ 研究 CTA 桥（顶部）→ 实体级探索引导 → 故事 / 为什么重要（策展卡，有叙事数据才显示）→ 关系洞察（探索建议）（AI）→ 探索足迹（AI） |
| 了解 tab | 事件身份卡（实体名 + 类型，历史见解·已固化，186/186 实体全覆盖）→ 历史洞察卡（EntityInsightCard）→ 推荐探索（ExplorationGuide）→ 关系网络 / 时间轴 / 空间（ConnectionExplorer 三视图）→ 相关实体卡（"继续探索"）→ AI 历史学家（HistorianChat）→ 数据溯源（ProvenancePanel）→ 研究 CTA 桥（底部） |
| 研究 tab | 返回 CTA 桥 → **研究主区**：AI 研究模式（ResearchPanel，按实体类型给模板问题：事件=背景原因/事件过程/直接影响/长期意义，人物=生平背景/核心贡献/历史影响/后世评价）+ 研究资料库（ResearchLibrary）+ 相关实体（EntityRelatedList，**点击跳转该实体页**）→ **事件专属**（仅 Event，带"仅事件"徽标：因果链 EventCausalChain + 影响 EventImpactPanel + AI 历史叙事 EventNarrativeCard + 叙事旅程 EventNarrativeJourney）→ **解读与 AI**：为何这些关联值得探索（InterpretationPanel 关系解读卡 + 历史意涵 UnderstandingCard 理解区）+ AI 事实溯源解读（AIExplanationPanel） |
| 扩展 tab | 占位（"即将推出"） |
| 页面附属 | 探索路径（ExplorationPath / 旅程视图）、下一步建议（NextStepPanel）、继续探索（ContinueExploringPanel） |

### 6.4 探索包页（ExplorationPackagePage）

| 区域 | 功能板块 |
|------|----------|
| 首屏 | 标题 + 摘要 + 探索目标（为什么，exploration_goals）→ 「开始探索」金色按钮 |
| 第二层 | 探索引导（GuidePanel：当前位置 / 下一步 / 原因 / 覆盖度）→ 探索旅程（PackageJourney：关系链 RelationshipChain，关系边上可嵌因果陈述卡；时间片 TimelineSlices；来源引用 SourceReferences） |
| 交互 | 点实体进实体页、点来源看引用、返回首页 |

### 6.5 因果对象页（CausalObjectDetailPage，三幕）

| 幕 | 功能板块 |
|----|----------|
| Act 1 理解 | 为什么发生、带来了什么影响（解释层，含因果陈述卡） |
| Act 2 连接 | 为什么这些对象值得一起探索（理解层，M85） |
| Act 3 继续探索 | 下一步去哪里（Continue Exploring），可点实体 / 因果对象跳转 |

### 6.6 后台（AdminPage，#/admin）

> 入口：顶部栏「内容配置后台」链接（新窗口打开 #/admin）。M90.x 起含历史见解管理。

| 区域 | 功能板块 |
|------|----------|
| 内容配置 | 按模块分组的卡片编辑（首页 landing / 实体 tab / 探索流 / AI 能力 4 模块，26 槽），支持：改标题 / 描述 / 条目列表、逐卡「改回默认」、模块折叠、全局「恢复出厂」 |
| **历史见解管理**（M90.x） | 按 global_id 或名称查找实体 → **加载**固化见解（显示 engine + updated_at）→ **「AI 基于证据生成」**（POST /generate，AI 仅基于知识库证据生成并固化，前端只读）→ 人工**编辑保存**（engine=curated）；无见解时提示"该实体暂无历史见解，可点击「AI 基于证据生成」"；徽标"AI 基于证据生成 · 前端只读" |
| 站点配置 | SiteConfigEditor 四组：功能开关（related_entities / journey_trail）、首页精选主题排序（上移 / 下移）、实体页板块显隐（5 板块 toggle）、探索起点编辑（增 / 删 / 改，限 8 条） |
| 全局 | 保存 / 重置、后端可达状态条、离开未保存提醒 |

## 七、global_id 前缀分布（实体归属主题）

| 前缀（主题域） | 实体数 |
|----------------|--------|
| tb_cn_v1 | 41 |
| china_v1 | 41 |
| roman_empire | 16 |
| ancient_india | 14 |
| hellenistic_world | 14 |
| egypt_technology_religion | 13 |
| persian_empire | 12 |
| silk_road | 12 |
| greek_philosophy | 12 |
| early_christianity | 11 |

## 八、口径说明

- 主题包 = 一个完整知识域（entities + relationships + timeline），如「罗马帝国」。
- 实体 = 主题包内的节点，有 8 种类型，global_id 全局唯一。
- 探索包 = 基于主题包 seed 的「探索旅程」编排（entity_references / relationship_paths / timeline_slices / source_references / exploration_goals），自身不复制实体数据。
- 证据声明/来源/因果对象/因果陈述 = 真值层（Article 0 ③ 真相可逼近性）支撑数据。
- 固化历史见解 = AI（engine=ai）基于证据生成、由后台触发后固化到 sqlite（entity_insights.db，ADR-0018 范式）的实体总结；前端只读。2026-08-11 全量生成后 186/186 实体覆盖；人工编辑过的记录 engine=curated。生成接口：`POST /api/v1/insights/{global_id}/generate`（无证据 → 422 明确拒绝，不硬编）。
- isbn = 来源书目卡的全球唯一编号；只收录**逐条联网查证**的值（出版社官网/图书馆目录/权威书商），写入前过 ISBN-13 校验位自检。古籍/期刊/网站合理缺省，见 1.1。
- .bak 文件不计入。

## 九、数据进入方式（写路径）

> 2026-08-11 复核：全库知识数据无数据库、无通用录入 API、无管理后台——**JSON 即数据库**，靠 Git 版本管理。

### 9.1 数据入口（只有两条）

| 入口 | 覆盖数据 | 生效方式 |
|------|----------|----------|
| ① 手工编辑 JSON + Git 提交（主入口） | 主题包 / 证据声明 / 来源 / 探索包 / 因果对象 / 因果陈述 | 改完**重启后端**生效（KnowledgeService 启动时一次性读入内存） |
| ② content API（唯一程序写口） | 仅站点内容（`PUT /content`、`POST /content/reset`、`POST /content/media`） | 原子写 JSON，实时生效 |

例外（ADR-0018）：固化历史见解 + 匿名研究存档走 stdlib sqlite3（`backend/data/*.db`），有写 API（后台触发 / 研究闭环）。

### 9.2 现有校验强度（弱，2026-08-11 现状）

- ✅ JSON 必须合法（解析失败 → 主题静默不加载）
- ✅ 证据 `subject_id` 必须绑定到真实实体（绑不上 → 进不了索引，隐形）
- ✅ 实体 8 类 / 关系 18 类枚举冻结（M3.5-000）
- ❌ 无字段级 schema 校验：缺字段、id 重复、isbn 格式错等不拦截（**挂账：建议补 scripts/ 数据校验器**）

### 9.3 历史见解的写路径（AI 生成 → 固化 → 只读）

```
后台 #/admin 输入 global_id → POST /generate
  → GroundingBuilder.build_claim_graph_expanded（实体自身 + 图邻居证据池）
  → get_provider()（AI 网关：.env 配置，openai SDK 白名单 + 国产 base_url 重定向）
  → LLM 仅基于证据生成总结（真值层纪律：不新增证据外事实）
  → save_insight 固化 sqlite → 前端身份卡只读展示 + 支撑证据（EvidenceList）
```

- 无证据 → 422 明确拒绝（不硬编）；AI 不可用 → 503；生成失败 → 502。
- AI 开关：`AI_GATEWAY_ENABLED`（.env，默认关闭；2026-08-11 批量生成时为开启态）。

