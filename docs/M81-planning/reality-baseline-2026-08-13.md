# History Explorer — Reality Baseline & Conflict Resolution（2026-08-13 实时复证）

> **用途**：第一轮现状报告（`docs/project-state-report-2026-08-13.md`）的基线收口与冲突仲裁版。针对第一轮中存在的"事实冲突、运行态差异、数据口径差异、代码可达性问题、Git 状态问题"逐项复核，作为 M80+ 后续工作的 Reality Baseline。
> **依据**：本轮全部重新取证——接口实测（8000/8001/5174 curl）、数据脚本重算（统一 key）、代码 grep（附路径+行号）、git fsck/rev-parse。分级：**[FACT]**（实测证据）/ **[INFER]**（推断）/ **[REC]**（建议）。
> **严格只读**：本轮未修改任何代码、未 commit/push/merge/tag/checkout、未创建项目文件（本档除外，经 PO 确认落档）。

---

## 一、Final Conflict Matrix

| 问题 | Agent 1（前端） | Agent 2（后端） | 本轮实测 | **最终事实** |
|---|---|---|---|---|
| cross-package 数量 | 65 | 64 | **65** | **[FACT]** 65 条 = 61 target-only + 2 双向 + 2 source-only；**全部经 src/dst 直接带 `topic:` 前缀表达**，`other.topic`/`other.global_id` 字段全空。Agent 64 是口径差异（按 other 字段判定得 0，或漏数 2 条 source-only）。证据：逐条判定条件分布脚本 |
| 数据规模 | 184/357 | — | **184/357**（文件） | **[FACT]** 数据文件=184 实体/357 关系/65 跨包/506 claims/105 sources |
| 8001 vs 8000 | 未查 | 提及"版本不一致" | 8001=186/257，8000=184/357 | **[FACT]** **8001 是旧代码+旧数据进程**（PID10488）：silk_road 含 `loc-chang-an`/`tech-paper` 两个**当前文件已删除**的实体（git -S 证明删除在 HEAD `ae4efe3`，今日）；8000=新代码+新数据。**[INFER]** 8001 启动早于今日数据落盘，未重启 |
| 前端是否消费 Knowledge Core | 是 | 是 | 13 个 v1 端点全有后端实现 | **[FACT]** 前端调用 `/topics` `/explore/{t}` `/entity/{id}` `/search` `/ai/explain` `/ai/chat` `/insights/{gid}` `/related-entities` `/topics/{t}/explore-starters` `/provenance/{id}` `/research` `/content/*` `/site-config/*`（fetch 逐处 grep），后端 main.py L584-625 + 独立 router 全部注册。**无"前端调了后端没有"** |
| UnderstandingWorkspace 可达性 | 未挂载/不可达 | — | **UNREACHABLE** | **[FACT]** `TOPIC_BUILDERS` 仅注册 `french-revolution`（topicUnderstandingState.ts L18-20），当前 10 包无此 slug → App.tsx L1420 条件恒 false。第一轮"传 null"判断有误——它**不是死 import，是有条件挂载但条件永假** |
| Memory/Trail 是否持久化 | 前端纯函数 | 后端无 | **未持久化** | **[FACT]** memory/ 为纯函数（前端），后端无 Trail 端点；唯一持久化=research 存档 sqlite（ADR-0018）。Trail 仅存 React state |
| Causal layer 是否 runtime active | 前端 import 本地 | 契约层 | **未接线** | **[FACT]** `causal_objects.json`(12 条) 仅前端 App.tsx L132 import；`causal_statements.json`(5 条) 后端 loader.py 存在但 **KnowledgeService 未传 adapter**；前端 ExplorationPackagePage L15-16 注释"P3.2 连接真实 API 前用常量" |
| Package data 是否 backend active | 前端 import 本地 | 无后端 API | **前端本地** | **[FACT]** explorationPackages.ts L1-6 直接 import registry+全部 example JSON；后端 `exploration_packages` 0 引用 |

## 二、八项逐项结论（附证据）

### 1. Runtime Truth
- **[FACT]** 5174（vite，PID13004）/ 8000（PID15524）/ 8001（PID10488）均在跑；5173 不在线。
- **[FACT]** health：8001=186 实体/257 关系/**0 warn**；8000=184/357/**13 warn**（CIRCULAR_REFERENCE×13）。8001 的 0 warn + 少 100 关系 + 多 2 实体 = 修复前数据。
- **[FACT]** 5174 前端 **全部模块连 8001**（vite 重启时 `VITE_API_BASE=http://localhost:8001`，8 处 API_BASE 全被 env 覆盖——App.tsx L142、aiClient.ts L10 等）。**用户当前实际看到的是修复前的旧关系网络（少约 100 条关系、无最新跨包边）**。
- **[INFER]** 8001 进程早于今日数据落盘（09:11-09:32）启动。

### 2. Data Canonical Metrics（统一 key = 文件名前缀:localid）
**[FACT]** 10 包 / 184 实体 / 357 关系 / **65 跨包（18.2%）** / isolated=**0** / leaf=1（长安）/ hub=Roman Civilization 22、Silk Road 21、Achaemenid 19、中华文明 15 / type 分布=Person 47·Location 27·Event 26·Idea 26·TimePeriod 18·Technology 18·Civilization 13·Religion 9 / 时间缺失 69/184（**38%**）/ duplicate global_id=0 / duplicate name=1（儒家×2）/ claims=**506** / sources=**105**。

**64 vs 65 仲裁**：见矩阵。**另发现口径陷阱**：`china_civilization_v1` 实体 global_id 前缀=`china_v1`、`textbook_cn_history_v1`=`tb_cn_v1`（≠文件名）→ 用 `global_id` 字段作统计 key 会出 **79 个伪孤立**。**规范口径：一律用文件名前缀。**

### 3. Frontend Reachability
| 组件 | 判定 | 证据 |
|---|---|---|
| ModeCanvas | **REAL** | App.tsx L1342 挂载 |
| RelationshipView / TimelinePanel / GraphViewPanel | **PARTIAL**（主题页真实渲染，实体页已移除） | App.tsx L1375/L1401/L1403 主题页挂载；EntityPage L292-294 注释"保留供回滚" |
| UnderstandingWorkspace | **UNREACHABLE** | topicUnderstandingState.ts L18-20 仅 french-revolution；App L1420 恒 false |
| understandingMode / isDevCatalog | **DEAD** | App.tsx L1473-1476 硬编码 null/false |
| DevCatalog / NavigationContractBar / AppShell | **DEAD** | 无挂载点（App L1340 nav=null；L1104 仅注释） |
| ExplorationFlowGuide / ExplorationTrail | **DEAD** | 无渲染点（App L1143 注释"retained but no longer rendered"） |

### 4. Backend Consumption
**[FACT]** 前端真实调用 13 个 v1 端点 + content/site-config/research 共 ~30 个（fetch 全量 grep），**后端全部注册**（main.py L584-625 add_api_route + 独立 router）。含 `/ai/chat`、`/topics/{t}/explore-starters`、`/provenance/{id}`、`/related-entities`（本轮实证存在）。

### 5. Data Source Split
| 数据 | 归属 |
|---|---|
| entities / relationships / timeline | **Backend Data**（JsonTopicRepository 加载 examples，前端经 API） |
| causal_objects（12 条） | **Frontend Local**（App.tsx L132 import） |
| causal_statements（5 条） | **Contract only**（后端 loader 未接线；前端 P3.2 常量占位） |
| exploration_packages + 全部 example JSON | **Frontend Local**（explorationPackages.ts L1-6 import；后端 0 引用） |
| sources / evidence_claims | **Shared 双轨**（后端 provenance_index + 前端 explorationPackages.ts L12-13 都 import 同一文件） |
| starters | **双轨**（前端 explorationStarters.ts 本地 + 后端 /explore-starters 端点，TopicExploreStarters.tsx L85 用 API） |
| narrative | **Frontend Local**（narrative.ts） |

### 6. Git Reality（本轮最重发现）
- **[FACT]** 分支 `chore/cleanup-2026-08-12` @ HEAD `ae4efe3`（非 detached）；**upstream 已 gone**（`origin/chore/cleanup-2026-08-12: gone`，`origin/release-2026-08-11-sync: gone`）。
- **[FACT]** **master 已推进到 `ba940af`（ahead origin/master 44）**——历史记忆"master 冻结 96b5aa9"**已过时**；**tag 全部不存在**（phase5-baseline/96b5aa9 均无）。
- **[FACT]** 游离链 `9e8f252→c981d30→213eb02→e00d7b6→9387f92→6c50690→40d8019→061b367` **完整连续**（parent 均正确）。
- **[FACT]** `git fsck` 另有 **7 个 dangling 头**：`cb8008e`（实体页 UI 批量整改）、`179a972`（实体页信息架构整改）、`4a214c9`+`e1accc6`（数据补全 A+B 层，疑似重复）、`69780c7`（研究库更名）、`61d5870`（Revert 首页）、`bb41b10`（CI 钩子）——**均为同事/其他会话未收口工作**。
- **[FACT]** 工作树 **71 项未提交**（A 12 / ?? 7 / MM 5 / M 47），含 data/*.json 与 docs/Plan-*（同事批次）+ ResearchPanel 等（游离链已含，工作树有残留 MM）。
- **丢失风险排序**：① 工作树 71 项未提交（最高）；② 9 个 dangling 链未 push 未引用；③ master ahead 44 未 push。

### 7. App.tsx Architecture（1485 行）
| 区段 | 行数 | 职责 | 拆分去向 [REC] |
|---|---|---|---|
| imports | 141 | 依赖 | 不动 |
| API_BASE | 9 | 常量 | 收敛到单一 config |
| 工具函数 | 71 | computeDelta/prettifyTopic | 移 lib/ |
| state 声明 | 243 | ~30 useState | → `useExplorerState` hooks（按域分 3-4 个） |
| effect1 topics | 83 | 目录拉取 | → `useTopics` |
| effect2 管线 | 153 | Projection→ExplorationState→Policy | → `useExplorationPipeline`（已是完整独立管线） |
| fetchNode+导航 | **406** | 导航/搜索/实体加载 | → `useEntityNavigation` + `useSearch` |
| slot 构建 | 190 | search/nav/workspace 等 | → 子组件 |
| 渲染 JSX | 188 | ExplorerShell→ModeCanvas | → 页面级组件拆分 |

### 8. Final Conflict Matrix
见第一节表格（8 项全仲裁）。

## 三、A-F 结论

**A. 已确认事实（全部 FACT）**
1. 用户主栈 5174→8001，看到的是**旧数据**（修复前，缺 ~100 关系/最新跨包边）。
2. 数据规范口径：184/357/65 跨包/0 孤立/38% 缺时间；统计 key 必须用文件名前缀（否则伪孤立）。
3. 前端 13 个端点全有后端实现；UnderstandingWorkspace 条件永假；Causal/Package 数据源在前端本地。
4. Git：master 未冻结（ba940af，ahead 44）、tag 全无、upstream 双 gone、9 个 dangling 链、71 项工作树未提交。
5. App.tsx 1485 行，最大块是导航 406 行 + state 243 行 + 管线 153 行。

**B. 已确认冲突及其原因**
1. 64 vs 65 跨包 = 统计口径（other 字段 vs src/dst 前缀）。
2. 184/357 vs 186/257 = **8001 旧进程**（非两数据源）。
3. "前端是否消费 Knowledge Core"两 agent 结论差异 = 一个按 fetch 一个按目录推断，实测 fetch 全匹配。
4. UnderstandingWorkspace 判断差异 = 前端 agent 只看 ModeCanvas props，未查 TOPIC_BUILDERS 条件。
5. master 冻结记忆 vs 实际 ba940af = **记忆过时**（master 被 PR merge 推进）。
6. claims 76/43 注释 vs 实际 506/105 = 代码注释过时。

**C. 仍然 UNKNOWN**
1. 8001 进程确切启动时间（PowerShell/wmic 被环境禁用，无法读进程时间戳）——但旧数据事实已由内容对比坐实。
2. 7 个同事 dangling 头的归属人/意图（4a214c9 与 e1accc6 疑似重复提交）。
3. 工作树 71 项中哪些是"进行中"、哪些是"待提交"——无法从 git 区分。
4. `master` 44 个 ahead commit 是否含未推送的重要工作（merge PR #14/#15/#16 可见，其余未知）。

**D. 最危险 5 个工程问题**
1. **8001 主栈喂旧数据**——用户当前所有浏览/研究都基于过时知识网络（FACT）。
2. **工作树 71 项未提交 + 9 个 dangling 链 + upstream 双 gone**——环境重置/误操作即大面积丢失（FACT）。
3. **master 与游离链双轨且均未 push**（master ahead 44 + 游离链 8）——分支现实与记忆记录严重脱节（FACT）。
4. **App.tsx 1485 行单体**（导航 406 + state 243）——回归风险持续累积（FACT）。
5. **UnderstandingWorkspace 条件永假 + 8 个 DEAD 组件**——产品主张与代码现实脱节，DEAD 代码增加维护噪音（FACT）。

**E. 最值得做 5 个产品问题**
1. **重启 8001**：让用户看到真实数据（30 秒，收益最大）。
2. **「变聪明」主线落地**：开放 UnderstandingWorkspace（给任意 topic 配 builder）或提供等效认知成长视图。
3. **时间叙事**：补 69 个实体时间字段（38%），解锁时间线能力。
4. **中国↔世界桥接密度**：当前仅 ~6 条中国跨包边，跨文化探索深度不足。
5. **探索包作为增长引擎**：10 包体系完整，扩展包数即扩内容面。

**F. 下一里程碑建议（不执行，仅建议）**
1. **M80a：运行态对齐**——重启 8001 + 收口游离链/工作树（git 三连：工作树分拣提交 → push master 44 → push 游离链）。**[REC]**
2. **M80b：前端基线**——API_BASE 收敛 + 清 DEAD 组件 + App.tsx state 抽 hooks（从 243 行 state 下手，风险最低）。**[REC]**
3. **M81：理解工作区开放**——为 1 个真实 topic（如 china_civilization_v1）配 UnderstandingWorkspace builder，验证"认知结构"产品主张可感知。**[REC]**
4. **M82：数据质量**——时间字段补全规则 + 跨包桥接清单。**[REC]**

---

## 附：与第一轮报告的关系

- 本文件是第一轮 `docs/project-state-report-2026-08-13.md` 的**基线收口修订版**。
- 相对第一轮的**结论修正**：① UnderstandingWorkspace 由"传 null 死引用"修正为"条件永假不可达"；② RelationshipView/TimelinePanel/GraphViewPanel 由"已移除保留"修正为"主题页真实渲染（PARTIAL）"；③ API_BASE 由"8 处重复端口不一致"修正为"运行时全被 VITE_API_BASE 覆盖（不一致仅作 fallback）"；④ Git 部分新增 master 未冻结/upstream 双 gone/9 dangling/71 项未提交；⑤ 数据口径新增 64/65 仲裁与 0/79 伪孤立陷阱。

*本 Baseline 由小梦 2026-08-13 严格只读取证生成；所有 FACT 均附接口返回/脚本统计/代码行号证据。*
