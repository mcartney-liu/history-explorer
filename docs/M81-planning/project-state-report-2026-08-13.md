# History Explorer — 项目现状交接报告（2026-08-13 实时取证）

> **用途**：向项目总监/外部长期产品顾问完整汇报 History Explorer 当前真实状态，使其在不依赖旧对话记忆、不依赖历史计划假设的情况下重新接管项目认知。
> **依据**：当前 Git 工作树、`frontend/src` / `backend/app` 真实代码、`data/*.json` 实时统计、8000/8001/5174 运行状态。不采信旧 PRD 与历史计划假设；代码与文档冲突处以代码为准并明确标注。
> **取证方式**：git 实时核验 + data 实时重算（Python 只读脚本）+ 前端 Explore agent 代码盘点 + 后端 Explore agent 通读 58 个 Python 文件。

---

## 一、Executive Summary

**一句话**：History Explorer 是一个**功能已真实可用、正处于高频打磨期的前端研究型产品**——后端领域层（实体/关系/因果/证据/探索引擎）真实实现、数据网络已连通（0 孤立）、前端完成 M90.3 shell 重构并连续两周按 PO 逐条整改产品体验（24/24 清零），但**前端仍是 1484 行巨型单体 + 大量死代码/未激活分支，且主栈后端 8001 内存数据落后于当前数据文件（257 vs 357 关系）尚未重启**。

| 维度 | 判断 |
|---|---|
| 阶段 | FRW Phase 5（前端落地）进行中；产品能力 ≥85% 已实现，体验打磨为主战场 |
| 最大风险 | 前端单体膨胀 + 死代码/未激活分支 + 双栈数据不一致 + 游离 commit 链未 push |
| 最大机会 | 10 包数据网络已连通、后端领域层完整 → 具备规模化补数据 + 前端瘦身重构的条件 |
| 判定 | 前端仍偏向「能力展示层」，核心产品价值（认知结构探索）刚通过 NextStepPanel/UnderstandingStatus 等开始被用户真正感知 |

## 二、Current Product（从前端代码反推）

**首页（Landing，`App.tsx` L1429-1481 + `LandingTabs.tsx`）**：3 个 tab——「我的」（`MyExplorationPanel`：研究记录库/收藏/最近）、「了解」（`DiscoverPage`：话题目录 + 探索包 + 反馈）、「研究」（`LandingPage`：话题卡 + 特色 + 最近 + 快速开始）。顶部常驻：品牌（GlobalBar）+ 搜索框 + ProductIntro。

**真实用户旅程（代码可走通）**：
```
首页(搜索/话题卡/探索包/我的研究)
 → 主题页：探索结果 + 关系视图(列表⇄图谱) + 跨主题连接 + 相关实体 + 理解区(UnderstandingOverview/UnderstandingActions/继续探索)
 → 实体页（默认「信息」tab）：
    信息tab = 实体概览 + 知识概览(ExplorationGuide) + 连接浏览器(ConnectionExplorer) + AI 历史学家聊天 + 出处面板
    研究tab = ResearchPanel（四维研究）+ 研究库 + 事件面板 + AI 解读
    扩展tab = 仅占位文案（未实现）
 → 实体页底部：下一站探索(NextStepPanel，可点击跳实体) + 继续探索(ContinueExploringPanel)
 → 最终可做：搜索/浏览/跨实体跳转/四维研究(批量+单点)/生成研究中评与综合报告/收藏进研究库/AI 聊天/AI 见解/跟随下一步探索
```

**各能力实际形态**：
- **研究**：`ResearchPanel`(834L 巨型组件)——按实体类型配 4 维度模板（文明=政治/军事/经济/文化；事件=背景/过程/影响/意义…），支持批量研究与单点重研、完成后弹 modal 报告、三阶段自主触发（四维→研究中评→综合报告）、未保存维度轻提示（P-U07）、收藏入研究库。
- **探索**：话题目录→探索结果→关系网络（列表/图谱双视图）→跨主题连接（CrossTopicView）→下一步探索（NextStepPanel，走 ExplorationPolicy）。
- **理解**：UnderstandingStatus（6 区块：阶段/覆盖度/系统建议/认知增长/记忆图/缺口）+ 知识概览（ExplorationGuide）+ 理解工作区（UnderstandingWorkspace，M89）。
- **解释**：AI 事实溯源解读（大白话副标题+模式引导+示例问题）+ AI 历史学家（HistorianChat/Companion）。
- **探索包**：10 个官方包（中国文明/丝绸之路/罗马帝国/印度文明/教科书/波斯/希腊哲学/希腊化/埃及/早期基督教），`ExplorationPackagePage` 真实渲染。

**占位/未激活（用户碰不到）**：extensions tab 占位文案；DevCatalog 未激活（ModeCanvas 传 null）；NavigationContractBar 未挂载；ExplorationFlowGuide/ExplorationTrail 等仅测试引用。

## 三、Current Frontend

**体量**：456 个 .ts/.tsx 文件、约 15,769 行。App.tsx **1484 行**巨型单体。

**架构分层（真实）**：
- **Shell**（M90.3 新结构，全部挂载）：`ExplorerShell`(189L 槽位壳) → `GlobalBar`(品牌/主题/模式) + `ModeBar`(4 模式) + `ModeCanvas`(179L 纯渲染开关) + `QuestionHeader` + `UnderstandingStatus`(356L) 等。
- **路由**：真实 **hash 路由**（无 react-router）——`routing/useRouter.ts`(100L 唯一 hashchange 订阅)、`routeSchema.ts`(`#/explore/:topic/:mode/:focus`)、`parseRoute.ts`、`legacyRedirect.ts`。`#/package/:slug` 由 `usePackageContext` 独立管理。
- **Mode**：`ExperienceMode` 四值 = exploration/explanation/relationship/understanding（routeSchema.ts L33-37）。
- **策略层**（`next/`，纯函数）：ExplorationPolicy(247L)/ExplorationState(226L)/ExplorationMetrics(184L)/HistoricalKnowledgeProjection(189L)/UnderstandingProjection(273L)/ExplorerRuntimeContext(182L)/memory/companion。仅被 App.tsx L548-700 消费。
- **数据加载**：API_BASE **8 处重复定义、默认端口不一致**（EntityRelatedList.tsx L23 与 TopicExploreStarters.tsx L35 默认 8001，其余 8000）；App 内 fetch `/topics`、`/explore/:topic`、`/entity/:id`、`/search`；本地静态数据：causal_objects.json（直接 import）、explorationPackages.ts、narrative.ts、starters.ts。
- **i18n**：zh/en/ja 各 10 文件、扁平 key（zh 459 行兜底）。
- **CSS**：约 7,836 行——App.css 2843L 巨型 + styles/ 8 文件 + m89.css + ProvenancePanel.css；ModeBar/UnderstandingStatus 等大量**内联 style**。

**M90.3 遗留 vs 新结构**：新 = shell 五件套 + hash 路由 + 策略层；旧 = App.tsx 内约 450 行 state + 250 行业务 effect + 180 行 slot 构建仍留在 App（M90.3 只拆了渲染壳，没拆状态与管线）。

**五大结构问题（代码实证）**：
1. **App.tsx 1484L 巨型单体**——state/业务管线/渲染全在 App（L222-700 + L1297-1481）。
2. **死代码/未激活分支**：`AppShell.tsx` 仅测试引用；`NavigationContractBar` 传 null 不渲染；ModeCanvas 的 understandingMode/devCatalog 传 null、`isDevCatalog` 恒 false → `DevCatalog.tsx` 与 UnderstandingWorkspace 的 understanding 分支（ModeCanvas L123）**实际永不触发**。
3. **API_BASE 8 处重复且端口不一致**（8000 vs 8001）——「页面连不上后端」类 bug 的温床。
4. **组件冗余**：4 个 ExplorationGuide 变体并存；RelationshipView/TimelinePanel/GraphViewPanel 已从 info tab 移除但保留（注释明言「保留供回滚」）。
5. **样式三轨并存**：2843L App.css + styles/8 文件 + 内联 style 混用，M89 还有独立 m89.css。

## 四、Current Backend（代码实测 + 后端 agent 通读 58 文件）

**结构**：backend/app = main.py(703L 入口) / config.py / validation.py / **core/**（18 文件，6,370 行领域层）/ **content/**（4 文件）/ **ai_gateway/**（16 文件）。无 ORM、无外部 DB（研究存档用 stdlib sqlite3）。真正在跑的端点集中在 /api/v1 与 legacy 双套镜像，共约 30 个。

**逐项实现程度**：

| 能力 | 程度 | 证据 |
|---|---|---|
| Knowledge Core（实体/关系） | ✅ 已实现 | core/domain.py + repository.py + global_graph.py；/api/v1/topics、/explore/:topic、/entity/:id 真实返回 |
| Relationship | ✅ 已实现 | 随实体/topic 响应返回，含跨包 other.global_id |
| CausalStatement / CausalObject | ⚠️ **契约层** | `core/causal/` 代码齐全但**运行时从未加载**（KnowledgeService 未传 adapter）；`causal_objects.json` 实际由**前端直接 import 本地文件** |
| Exploration Engine | ✅ 已实现 | core/exploration_engine.py |
| Exploration Package | ⚠️ **无后端 API** | 后端仅 content_store 按 slug 读，完整包数据在**前端 import 本地 JSON**——前后端数据源分叉 |
| Exploration Guide / Runtime | ❌ 后端未实现 | 前端 next/ + 静态包驱动 |
| Memory / Trail / Metrics | ❌ 后端未实现 | 前端 memory/ 纯函数 + 无后端持久化（除研究存档） |
| AI Gateway | ✅ 已实现（默认关） | ai_gateway/ 16 文件（answer/insight/research/prompt/provider/grounding/fallback）；`AI_GATEWAY_ENABLED` 环境变量默认 false；openai SDK |
| Evidence / Source / Citation | ✅ 已实现 | provenance_index.py + sources.json + evidence_claims.json；实体响应含 connections_explained |
| 研究存档 | ✅ 已实现 | ai_gateway/research_router.py（create/read/remove）+ research_store.py（sqlite，ADR-0018） |
| 内容管理 | ✅ 已实现 | content/（media 上传/重置/status）+ site-config（站点配置） |
| i18n / terminology | ⚠️ 前端为主 | 后端无术语服务，前端 locales/ |

**前端真正消费的端点**：`/api/v1/topics`、`/explore/:topic`、`/entity/:id`、`/search?q=`、`/api/v1/ai/explain`、`/api/v1/insights/`、`/api/v1/related-entities?gid=`、`/api/v1/content/*`（media/reset/status）、`/api/v1/site-config/*`、`/api/v1/research`。

**⚠️ 运行异常（重要）**：8001（**主栈**，PID 10488）health = **186 实体/257 关系**；8000（老栈，PID 15524）= 184/357，与 data/examples 实时统计（184/357）一致。两进程读同一 `data/examples` 目录 → **8001 进程内存是旧数据（A 层跨包关系补全前），需重启**，否则用户在 5174 主栈看到的关系网络缺少最新跨包边。

**⚠️ 代码注释过时**：`knowledge_service.py` 注释称 claims 76 / sources 43，实际 `evidence_claims.json` 为 **506 条**、`sources.json` 为 **105 条**——注释与真实数据严重不符。

## 五、Current Data（2026-08-13 实时重算）

| 指标 | 数值 |
|---|---|
| 数据包 | 10 个（含 1 个教科书包 textbook_cn_history_v1） |
| 每包实体/关系 | ancient_india 14/26 · china_civilization_v1 41/74 · early_christianity 11/23 · egypt 13/26 · greek_philosophy 12/24 · hellenistic 14/29 · persian 12/25 · roman_empire 16/34 · silk_road 10/30 · textbook 41/66 |
| 总实体 / 总关系 | **184 / 357** |
| 跨包关系 | **65 条（18.2%）**，表达为 `source/target = topic:localid`（如 `silk_road:han_dynasty`） |
| 孤立节点（度 0） | **0**（网络完全连通） |
| 叶子节点（度 1） | 3（2%） |
| 枢纽 Top | Achaemenid Persian Empire(17)、Roman Civilization(17)、中华文明(15)、Ancient Egyptian(13)、华夏文明(12)、Early Christian Church(11)、Silk Road(11) |
| 时间字段缺失 | **69/184（38%）** 无 start/end 日期 |
| 重复实体名 | 1 处（「儒家」×2，轻微） |
| 中国与世界连接 | ✅ 已建立：china_civilization_v1 → silk_road（佛教/造纸/印刷/火药/郑和/泉州）、persian_empire（元→波斯）、ancient_india（佛教）、tb_cn_v1（中华文明→华夏文明） |
| Connectivity Repair | ✅ **已完成**——HEAD commit `ae4efe3 data: 补全 A 层跨包关系并回填证据来源`（2026-08-13）即本轮修复 |

**最大数据缺口**：① 时间字段缺失 38%（时间线叙事能力受制）；② 中国包（41 实体）与世界其他包连接仅有 ~6 条边，密度不足；③ 10 包中 8 包实体数 ≤16，单包过小，跨包探索深度有限；④ 教科书包与主流世界史包尚未形成强耦合。

## 六、Capability Reality Map

```
Experience（体验层）
 ├─ 搜索/话题浏览          [REAL]      # /search、/topics、首页三tab
 ├─ 主题探索结果页          [REAL]
 ├─ 实体信息页             [REAL]      # 概览+知识概览+连接+AI+出处
 ├─ 四维研究+报告+收藏      [REAL]      # ResearchPanel 三阶段
 ├─ 下一步探索              [REAL]      # NextStepPanel→ExplorationPolicy（P-U08 修复后）
 ├─ 扩展 tab               [PLANNED]   # 占位文案
 └─ 理解工作区入口          [PARTIAL]   # UnderstandingWorkspace 分支在 ModeCanvas 实际不触发
 ↓
Runtime（运行时）
 ├─ hash 路由              [REAL]
 ├─ ExplorerShell/ModeCanvas [REAL]
 ├─ 模式（exploration/explanation/relationship/understanding）[REAL]（但 understanding 分支未挂载）
 └─ 游离 commit 开发流      [REAL]（环境特例）
 ↓
Understanding（理解层）
 ├─ UnderstandingProjection [REAL]      # 纯函数
 ├─ ExplorationPolicy      [REAL]      # 纯规则，非 AI
 ├─ UnderstandingStatus    [REAL]      # 6 区块展示
 └─ 认知阶段推进            [PARTIAL]   # 数据驱动有限，多为静态展示
 ↓
Explanation（解释层）
 ├─ AI 见解/事实溯源        [REAL]（AI 关时 fallback）
 ├─ AI 历史学家聊天         [REAL]
 ├─ 证据/来源引用           [REAL]      # provenance/citations
 └─ 因果链解释              [PARTIAL]   # CausalObject 静态数据（后端契约层）
 ↓
Fact / Knowledge（知识层）
 ├─ 10 包 184 实体 357 关系  [REAL]
 ├─ 65 条跨包边             [REAL]
 ├─ 证据/来源回填           [REAL]      # 本轮完成（506 claims / 105 sources）
 └─ 大规模数据              [PLANNED]   # 38% 缺时间字段
```

**设计想让用户看到 vs 代码真正能给**（差距）：
1. **理解工作区**：产品定位是核心（M89 认知结构），但 `UnderstandingWorkspace` 的 understanding 分支在 ModeCanvas 中因 `isDevCatalog`/`hasPackage` 条件实际**永不渲染**——用户只能看到 UnderstandingStatus 展示块，进不去真正的工作区。
2. **「变聪明」主线**：Article 0 的三句话价值主张，代码里落地最实的是 NextStepPanel（下一步探索）+ 研究三阶段；「认知成长轨迹/镜像」仍是展示层，无用户可感知的持久成长。
3. **时间叙事**：数据 38% 缺时间字段 → 时间线/变迁叙事弱于关系叙事。

## 七、Recent Decisions（近一周，git 实证；无法确认标 UNKNOWN）

| 事项 | 原来 | 决策/变化 | 现在 | 为什么 |
|---|---|---|---|---|
| 四维研究门控 | 研究中评以 AI 可用性隐藏 | 改四维度全 success 即显示（P-U06/P-U12） | 跑完即出按钮 | PO：AI 关也要能出中评，别让用户死锁 |
| 研究交互 | 完成后内联展开 | 点「查看报告」弹 modal + 全部展开受控（P-U04/P-U09） | modal 小窗 | 内联展开体验差 |
| 研究卡片图 | 全宽扁幅易歪 | 2×2 网格 + 图片焦点（P-U13/P-U14） | 前后视觉一致 | PO 两次反馈"图歪"后真修 |
| 实体初始 tab | localStorage 记忆污染全局 | 初始 tab 由入口意图决定（P-U15） | 点实体=信息页 | PO：默认应是信息界面 |
| 搜索框冗余 | 提示文字+示例标签 | 删除（P-U16） | 干净 | PO：没必要 |
| 信息页概览 | 进度条+技术统计标签 | 重写为「知识概览」+可点击统计（P-U17） | 用户友好 | PO：看不懂 |
| 下一步探索 | 中文维度标签(404) | 目标改真实实体（P-U08） | 可点击可达 | 实证根因修复 |
| 研究未保存 | 无提示 | 顶部轻提示 N 维度未保存（P-U07） | 提醒收藏 | 防刷新丢失 |
| AI 见解 | 含 Markdown/JSON 碎片 | 后端纯文本约束+前端剥离（33c483e/293e92f） | 干净文本 | 多次 PO 反馈 |
| 研究三阶段 | 挂载即触发 | 点击「生成」按钮分步触发（d17e9ed） | 自主可控 | PO 方案① |
| 研究库 | 收藏列表 | 网格书架化+类型彩条（17ac20b） | 视觉化 | PO 2026-08-12 |
| 维度卡视觉 | 左侧小图标+序号徽章 | logo 右上角放大（24f15f6/f82c004） | 品牌感 | PO 2026-08-13 |
| 数据 | civ-roman 建模错误 | 修正为罗马文明（048fbde） | 语义正确 | 数据审核 |
| A 层跨包 | 缺跨包关系 | 补全+证据回填（ae4efe3，HEAD） | 65 条跨包边 | Connectivity Repair |

*（Phase 0-4 的 FRW 决策链见 docs/FRW-Phase0-v2 与 ADR-0015，git/文档可查，非 UNKNOWN。）*

## 八、Risks / Opportunities / 总判断

**A. 项目真正处于什么阶段**：FRW **Phase 5（前端落地）进行中**，P5-S2 视觉合规已全部完成；产品功能层 85%+ 真实可用，处于「PO 逐条体验→整改→验收」的高频打磨期。后端与数据领先于前端（领域层完整、数据连通），前端是当前主要瓶颈。

**B. 最大 5 个风险**：
1. **主栈 8001 后端未重启，内存数据落后**（257 vs 357 关系）——用户在 5174 看不到最新跨包网络，可能误判数据质量问题。
2. **游离 commit 链 8 个未 push**——HEAD 钉死在 `ae4efe3`，若环境重置或误操作，P-U03~P-U17 全部工作丢失。
3. **App.tsx 单体膨胀 + 死代码/未激活分支**——每次改动都在 1484 行上叠加，回归风险高（P-U08 这类"隐性旧逻辑"问题还会出现）。
4. **API_BASE 8 处重复且端口不一致**——「连不上后端」类 bug 温床。
5. **前端理解工作区（M89）实际不可达**——核心产品主张「认知结构」用户进不去，只剩展示块。

**C. 最大 5 个机会**：
1. 后端领域层完整 + 数据 0 孤立 → **具备规模化补数据条件**（缺时间字段补齐即可强化时间叙事）。
2. 10 包 + 65 跨包边 → 跨主题探索已成真，可做「世界史连接」产品亮点。
3. U 系列 24/24 清零 → 体验基线已稳，可转入新能力开发。
4. 前端瘦身重构窗口：M90.3 已拆 shell，顺势拆 App.tsx 状态层成本低。
5. 探索包体系完整（10 包）→ 可扩展包数量作为内容增长引擎。

**D. 若只允许做 3 件事**：
1. **重启 8001 主栈后端**（消除数据版本不一致）。
2. **push 游离链 8 个 commit**（收口 P-U03~P-U17 全部成果）。
3. **拆 App.tsx**：把 state + 三大 effect + slot 构建下沉到 hooks/context（先做 API_BASE 收敛 + 死代码清理）。

**E. 最需项目总监裁决的 5 个问题**：
1. 前端瘦身重构的投入时机（现在 vs 补数据后）？
2. M89 理解工作区入口是否开放（ModeCanvas understanding 分支要不要真正挂载）？
3. 「变聪明」主线（Article 0）下一步落到哪个可感知功能？
4. 数据补全优先级：先补时间字段（38% 缺失）还是先扩包数/跨包密度？
5. 游离 commit 链的 push 方式与 master 冻结策略是否调整？

**F. 是否具备大规模补数据条件**：**基本具备**——后端 repository/validation/provenance 已就位、数据校验流水线存在、0 孤立证明网络可维护。**缺**：① 时间字段标准化补全规则（38% 缺失是最大质量短板）；② 教科书包与主流世界史包的桥接实体清单；③ 8001 后端重启机制（避免每次补数据后主栈不同步）。

**G. 前端是否已承载核心产品价值**：**部分承载、仍偏能力展示**。用户已能真实完成「探索→研究→收藏→下一步」闭环（价值在路），但认知结构主线（阶段推进/理解工作区/成长轨迹）多数停留在展示块，用户可感知的「变聪明」证据不足——前端主要还是在「展示后端能力」，尚未成为价值引擎。

---

## ONE-PAGE PROJECT STATE

**项目现在是什么**：历史知识探索产品（认知结构探索系统的首个载体），前端 React + 后端 FastAPI + 10 包静态知识图谱，AI 网关默认关闭、研究存档 sqlite。

**已经有什么**：10 包 184 实体 357 关系（0 孤立、65 跨包边、中国已连世界）；后端领域层完整（实体/关系/因果/证据/探索引擎/AI 网关/内容管理）；前端完整旅程（搜索→主题→实体→四维研究→报告→收藏→下一步探索）；官方探索包 10 个；24 条产品问题全部整改验收。

**真正能做什么**：搜索浏览知识网络、四维 AI 研究（批量/单点）+ 中评/综合报告 + 收藏研究库、AI 历史学家问答、AI 事实溯源解读、跟随「下一步探索」跳实体、浏览官方探索包。

**还缺什么**：38% 实体缺时间字段；理解工作区（M89）不可达；认知成长轨迹无持久化；数据规模小（单包 ≤41 实体）；Causal/Package 后端契约未接线（前端本地数据）。

**当前最大问题**：主栈 8001 后端数据落后未重启 + 前端 1484 行单体/死代码 + 游离链未 push——三者都是「工程健康度」问题，非产品能力问题。

**下一阶段最重要目标**：① 重启 8001 + push 游离链（收口现有成果）；② 前端瘦身（拆 App.tsx、收敛 API_BASE、清死代码）；③ 补齐时间字段数据，打开 M89 理解工作区入口，把「变聪明」从展示变成可感知。

---

## 附：代码与文档冲突点（以代码为准）

1. 文档中的「FRW 四主干」在代码中无字面对应——ModeBar 4 模式是另一层概念（ExperienceMode 四值），并非四主干。
2. `UnderstandingWorkspace` 设计为主（M89），但代码中 ModeCanvas understanding 分支不可达（isDevCatalog/understandingMode 恒 null）。
3. master 冻结基线（96b5aa9）与当前活跃分支（chore/cleanup-2026-08-12）并存，游离提交已成为事实工作流（外部同步进程钉死分支 ref）。
4. `knowledge_service.py` 注释（claims 76 / sources 43）与真实数据（506 / 105）严重不符。
5. 8001 主栈后端内存数据与当前 data/examples 不一致（257 vs 357 关系），需重启。

*本报告由小梦 2026-08-13 实时取证生成；git 事实、数据统计、运行状态均为当日核验。*
