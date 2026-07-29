# History Explorer 全项目健康体检报告

> 评估时间：2026-07-30（GMT+8）
> 评估方：MVP 开发专家团 —— 项目总监 大湾区靓仔 + 7 位领域专家（许清楚/颜好看/高见远/贾思敏/贝洛奇/严过关/卜宕机）
> 评估范围：当前 HEAD = vM62 (`68cd0fa`)，runtime `0.13.0`；含 M62.5 WIP
> 方法：7 位专家并行独立评估 + 总监综合裁决；关键发现由总监实拉代码（`grep`/`git`/`tsc`/`vitest`/`freeze-check`）核验

---

## 0. 项目快照（实拉事实，非估算）

| 维度 | 事实 |
|------|------|
| 定位 | 全球历史探索平台。React18 + TS + Vite 前端；Python FastAPI 后端（自 M9 起基本冻结，backend diff 连续 **21 里程碑 = 0**） |
| 规模 | 前端组件 `.tsx` **96 个**；`data/*.ts` 情报层 **60 个**；测试文件 **105 个**；**941 测试 0 失败**；`docs/*.md` **38 份**（M 开头里程碑文档 28 份） |
| 冻结红线 | 禁 AI/LLM 运行时、Neo4j/PG/ES/Redis/GraphQL/ORM、新依赖、后端 schema/API 变更、登录/权限。任何变更须 **Freeze Revision Gate（ADR + PO 批准）** |
| 当前 WIP | M62.5 Global Language Experience System（i18n/l10n/术语层 `getTermLabel`/`LanguageSwitcher`/偏好）。B1–B7 + W10 完成，941 测试绿；W11 发布待做 |
| 工作树 | 未提交条目 **87 个**（含 12 份未跟踪 `.md` 报告 + `.pip_target` 垃圾目录）；vs vM62 真实 diff = **69 文件 +1062/−778**，零 `backend/` diff |
| 门禁 | `tsc --noEmit` ✅；全量 `vitest` 941/941 ✅；`freeze-check` 当前 **❌ 4 文件越界**（W10 测试文件） |

---

## 1. 专家评估（各自的问题）

### 1.1 产品经理 · 许清楚
**总体评估**
1. 发布治理是头号风险，而非功能。M62 已发、M62.5 未发、87 条改动挂树——用户价值停留在"已构建未交付"，产品节奏被内部治理拖死。
2. 里程碑陷入前端单轨无限堆叠。后端冻结正确，但每次前端里程碑靠 expand allowlist 破冰，冻结基线被逐次例外侵蚀成"事实解冻"。
3. 用户价值主线清晰却被稀释。Explore→Connect→Understand→Discover 闭环已闭合，"可信 AI 伙伴"仍是愿景。
4. M43–M49 技术债与 M63 收敛直接冲突：5 个情报模块各自累加、仅手工数据、无交叉校验，而 M63 W2 恰恰要收敛它们。
5. 范围蔓延靠规则压制而非产品判断。emoji/紫粉/AI 模板味红线有效，但 allowlist 膨胀、设计系统游离、R14 英文串盲区说明一致性靠人工扫描，缺系统性护栏。

**各自的问题（优先级）**
- **P1 未发版基线 + 87 条挂树**：M62/M62.5 未发、M63 无干净基线。风险：新里程碑叠加在不可回滚基线上，consistency 门禁形同虚设。建议：冻结新功能，先发 M62→M62.5，分批清理 87 条。
- **P2 M43–M49 未验证即收敛**：5 模块手工数据、无交叉校验，M63 W2 直接收敛。风险：产出"连贯的未校验结论"，污染信任层。建议：M63 先做 W1 真实溯源修复，W2 推迟至真实事件流验证后。
- **P3 allowlist 逐里程碑膨胀**：每里程碑 carve exception。风险："冻结"名存实亡。建议：改目录前缀 + 定期瘦身，每次膨胀须 PO 在 ADR 记录理由。
- **P4 设计系统/质量护栏游离**：设计系统文档未提交、R14 英文串盲区 M62.5 才关闭。建议：设计系统入版本治理并补 CI 门禁。

**RoleVerdict**：`conditional`；blocking = P1（未发版）、P2（未验证不得收敛）；advisory = allowlist 目录化瘦身、设计系统入治理。

---

### 1.2 UI/UX 设计师 · 颜好看
**总体评估**
1. 设计方向与一致性基线成熟：museum-grade 暗色 + 暖棕底 + 古金强调，中文默认双语，Grounding 语义色作为护城河被编码进视觉系统。M62 三层叙事与 Discover 改版方向正确。
2. 图标注册表机制扎实：name→SVG 映射、1.5px 描边、currentColor、3 固定尺寸；未知 key 返回 null（绝不回退 emoji），自带防 emoji 回归护栏。
3. **治理是最大短板**：DS V1.0 FINAL 文档质量高（含修订史/治理章/迁移指南），但 695 行未提交、未入 freeze allowlist、未强制落地——"单一事实来源"目前只是纸面契约。
4. 视觉漂移风险真实：96 组件跨 60+ 里程碑，CI 门禁只能防"已知"回归，防不了"风格微漂"；DS 不入库即无权威基准。

**各自的问题（优先级）**
- **P1 设计系统未契约化落地**：未提交、未入 allowlist、非强制。风险：96 组件无权威 token 基准。建议：走 Freeze Revision Gate 纳入 allowlist，token 校验接入 CI（"DS 不达标 = CI 红"）。
- **P2 图标新增无评审闸门**：注册表只有消费侧护栏（未知→null），无供给侧评审。建议：补"新增图标 RFC"——复用语义名、对齐 1.5px/3 尺寸，PR 附视觉 diff，设计 owner 批。
- **P3 DS 与代码 token 双向漂移**：文档规定 `--gold-500`/`--verified` 等，前端是否同名字量消费、有无硬编码 hex 未知。建议：生成 `design-tokens.json` 供 import，CI 扫描裸 hex。
- **P4 museum-grade 抛光 vs 功能累加**：Chrome 噪音上升。建议：以 DS Panel 层级（Narrative > Inline > Supporting）作增删判据。

**RoleVerdict**：`conditional`；blocking = DS V1 未入 freeze allowlist 且未强制落地；advisory = 图标新增评审闸门、token 双向同步。

---

### 1.3 首席架构师 · 高见远
**总体评估**
1. 冻结基线健康：`freeze-check.mjs` 四道防线（scope allowlist / token 剥离后扫描 / 依赖扫描 / enum 守卫）机制扎实；backend diff 连续 21 里程碑=0 证明闸门有效。
2. **allowlist 气球化**：SCOPE_ALLOWLIST 从 M24 的"2 文件"膨胀到 M62.5 W0-bis 数十条精确路径，目录前缀极少，绝大多数靠逐文件精确登记——治理异味。
3. 模块边界缺失：`data/*.ts` 60 文件情报层无清晰分包。M43–M49 各自独立累加，靠 M52/M53 事后融合，缺乏统一契约与交叉校验。
4. 技术债累积：五智能模块仅手工测试、无交叉校验；M63 决策悬而未决；React 18.3 + Vite5 技术栈陈旧无升级路线。
5. 整体"冻结但不清晰"：后端稳定，前端在允许范围内快速膨胀，但膨胀由"逐文件放行"而非"分层边界"驱动。

**各自的问题（优先级）**
- **P0 冻结治理不可持续**：allowlist 逐文件膨胀，M63 W2 触及 RecommendationPanel/Hub 又需新闸口。建议：allowlist 由"逐文件"升级为"按特性目录分组"，ADR 模板化配自动校验。
- **P1 情报层无交叉校验**：M43–M49 五模块独立累加。建议：在 M52 融合层之上补独立 cross-module validation 套件。
- **P2 M63 决策悬而未决**：W2 已触及不在 allowlist 的推荐域。建议：PO 尽快裁定 M63 方向，并为推荐域开预批闸口。
- **P3 技术栈陈旧无路线**：React18 长期不升级。建议：规划"非破坏性"升级路线（React19/Vite6 仅前端，不触碰 backend 红线）。

**RoleVerdict**：`conditional`；blocking = 无 P0 致命；advisory = allowlist 模块化分组、情报层补 cross-module 校验、M63 预批闸口、React18→19 路线。

---

### 1.4 前端工程师 · 贾思敏
**总体评估**
1. 代码健康度良好：941 测试零失败、i18n 零依赖自实现、冻结纪律守得紧。
2. 单文件合规达标：全量 `.tsx/.ts` 跑 ≤300 行扫描，超阈值 0 个，"组件膨胀"经核验不成立。
3. **测试质量是最大短板**：941 测试多断言渲染 HTML 串（如 `toContain('★ 已收藏')`），脆性高、无 E2E。
4. i18n 不完整且有结构性裂缝：`LocaleProvider` 强制 zh 默认、无 Provider 时 `t()` 直接返 key；引擎层 `compareTemporal`/`geoComparison` 仍英文硬编码。
5. 分层边界模糊：`LocaleProvider` 竟置于 `src/data/`（情报层），组件/数据/上下文职责交叉。

**各自的问题（优先级）**
- **P1 符号图标违规（已核实）**：27 处命中，含 Research* 组件用 `★☆✓✗⚠○` 当功能图标、`Icon.tsx` 注释堆 emoji，违反 P0-1 零容忍。建议：收口统一 SVG 图标库，清注释 emoji。
- **P2 i18n 终局缺口**：W11 发布在即，引擎层英文 + 无 Provider 返 key，非 zh 路径会泄漏 key/英文。建议：发布前补齐引擎层术语，明确无 Provider 兜底策略。
- **P3 测试脆性**：HTML 串断言假绿、无 E2E。建议：升级语义查询断言，补 1–2 条关键路径 E2E。
- **P4 分层混乱**：`data/` 混入上下文组件。建议：冻结期迁 `LocaleProvider` 至 `contexts/` 并登记技术债。

**RoleVerdict**：`conditional`；blocking = P1 符号图标发布前清零；advisory = P2 引擎层英文补齐、P3 测试去脆、P4 分层登记。

---

### 1.5 后端工程师 · 贝洛奇
**总体评估**
1. 冻结利弊分明：自 M9"仅读投影"冻结守住契约稳定与 219 测试基线，代价是真实能力全被高成本 Gate 阻塞，技术债后置。
2. **冻结有孔隙**：`requirements.txt` 仍带 `openai`，`main.py` 已挂载 `/ai/explain`、`/ai/chat`，`ai_gateway` 完整。红线"禁止 AI/LLM 运行时"与已发布运行时代码存在张力——配 `OPENAI_API_KEY` 即悄然激活，绕开闸口难审计。
3. 数据策展是唯一活口却缺治理：`examples/*.json` 启动一次性载入内存，游离 Gate 外；87 条未提交项暗示改动漂在工作树、未经校验。
4. 扩展硬墙：全量内存、单点启动、无刷新/分页。provenance 只读读模型与关系可视化层守纪良好，应为范式。

**各自的问题（优先级）**
- **问题1（最高）：红线与已发布 AI 代码张力**：`openai` 依赖 + `/ai/*` 端点已挂载，配 env 即激活，红线被静默绕过且难审计。建议：部署层默认 off 不足，应明文写入 ADR 并加 CI 断言禁默认启用。
- **问题2：数据策展治理缺失**：唯一后端活动无评审/校验/提交纪律。建议：建 schema 校验 + 策展 PR 评审 + 提交门禁，支持带版本热更新。
- **问题3：内存单点载入扩展性**：数据集增长推高启动耗时/内存。建议：评估惰性分片载入与轻量缓存（仍须 Gate）。
- **问题4：高闸口致"伪冻结"**：需求被压制，后端债累积。建议：预研解冻路线图，把可预见能力做成 Gate 模板降动议成本。

**RoleVerdict**：`conditional`；blocking = AI 运行时代码已随镜像发布，与"禁止 AI/LLM 运行时"红线存在张力，须先收敛治理表述；advisory = 数据策展治理、解冻路线图、内存扩展性。

---

### 1.6 测试工程师 · 严过关
**总体评估**
1. 低质完整：941 测 0 败是"自验证"繁荣。抽样 `GroundedAnswer.test.tsx`，断言全锁中文串。W10 包进 `<LocaleProvider>` 断言中文，仅把"无 Provider 假阴性"换成"locale 脆弱"——i18n 改一词，941 红。量 ≠ 覆盖。
2. 门禁错配：`freeze-check` 唯一硬门禁，allowlist 已膨胀；它管范围/结构，管不了质量。`visual-check` 仅 FAIL 4 个硬编码 class，色值/px/缺类全 WARN，是软门禁。
3. 迁移治标：W10 的 Provider 化方向对，但断言文案本质未变，且隐含"默认 zh"假设，未触及契约化。
4. 盲区致命：无 E2E/真实流（探索→导出→切语言）；无性能/无障碍/视觉回归强制门；M43–M49 仅手工、无交叉校验。

**各自的问题（优先级）**
- **1 脆弱性（假绿）**：941 锁死中文串，i18n 一词红全盘。建议：改"契约断言"——键存在 + DOM 结构 + role/aria，文案抽 snapshot。
- **2 allowlist 治理**：87 未提交 + 逐里程碑膨胀成瓶颈。建议：allowlist 按 milestone 分文件/设 TTL，目录前缀收窄回精确路径。
- **3 缺 E2E**：冒烟仅组件 render。建议：引 Playwright 跑核心旅程作强制门禁。
- **4 性能/无障碍/视觉无强制**：`visual-check` 软、无 Lighthouse/a11y/像素 diff。建议：升级为像素对比 + axe-core + 性能预算。
- **5 M43–M49 无交叉校验**：管线产物加 golden-file + 跨里程碑一致性断言。

**RoleVerdict**：`conditional`；blocking = 无 P0 致命，但条件未满足不可商业交付；advisory = 941 绿 ≠ 可发布，W11 前须补契约化 locale 断言 + E2E 冒烟 + allowlist 治理。

---

### 1.7 运维工程师 · 卜宕机
**总体评估**
1. 发布流程纪律强但全手工：ff-only + annotated tag（真实时间）+ 分两次 push + ls-remote 复验是严谨铁律，但零 CI 介入，纯靠人工纪律。
2. **未提交树是最大隐患**：87 条挂树使回滚/审计几乎不可行，且 release-consistency 只读已提交态，M62.5 的 README/CHANGELOG/PROJECT_CONTEXT 未提交则 7/7 永远对不上。
3. 一致性门禁干净但仅 advisory：R1–R7 构造优秀，但 CI 中该 job 标 continue-on-error 且仅 push 时跑，不阻断合并，7/7 实为人工结论。
4. 部署/回滚/可观测全缺：CI 有 freeze/visual/emoji/structure 门禁，却无 deploy、回滚、健康检查、Sentry/RUM。
5. 冻结 allowlist 缺口：freeze-check 已含 M62.5 主体，但 W10 测试文件未列入，将致越界 FAIL。

**各自的问题（优先级）**
- **P0 未提交树阻断发布**：87 条挂树使回滚/审计/一致性校验全失真。建议：M62.5 发布前按批量惯例一次性提交。
- **P0 freeze allowlist 缺 4 文件**：W10 测试越界，M62.5 无法过冻结门禁进而 7/7。建议：立即在 ADR-M62.5 补 4 个 W10 测试精确路径。
- **P1 一致性未 CI 化**：7/7 仅人工跑脚本、CI advisory。建议：设 release-consistency 为 master push 的 required status check。
- **P1 前端无部署/回滚/可观测 + push 变通脆弱**：前者无自动链路；后者 MITM 下 openssl+wincred 易半推（master 推了 tag 没推），破坏分两次 push 铁律。建议：CI 增 deploy + 版本化回滚 + /health 探活，push 改由 CI 完成。

**RoleVerdict**：`conditional`；blocking = 87 未提交树 + W10 allowlist 越界（M62.5 7/7 前置不满足）；advisory = 发布门禁仅 advisory、前端无部署回滚可观测、push 变通脆弱。

---

## 2. 总监综合裁决（大湾区靓仔）

### 2.1 跨专家共识（3 条）
1. **"冻结但治理退化"是系统性风险**，不是单点问题。allowlist 从 2 文件膨胀到数十条、设计系统游离、一致性门禁仅 advisory——红线守住了"不能做什么"，但没建立"怎么健康地做"。
2. **测试量≠质量**。941 绿是资产也是盲区：断言锁死 UI 中文字面量 + 无 E2E + 情报层无交叉校验，使得"改一词红全盘""未校验数据被包装得更连贯"两类风险并存。
3. **发布挂树是眼前最硬阻塞**。87 条未提交 + M62.5 freeze 4 文件越界，直接导致 M62.5 无法干净 7/7，进而 M63 无基线。

### 2.2 已实拉核验的关键发现（总监亲自 `grep` 确认）
**【已核实 · 真实 P0-1 违规】符号图标当功能图标用 —— 10 个文件命中：**
- `ResearchBookmarkButton.tsx` → `★ 已收藏` / `☆ 收藏研究`
- `ResearchReport.tsx` → `✓`/`✗`/`○` 状态图标（`dim.status === 'success' ? '✓' : ...`）
- `ResearchDimensionCard.tsx` → `✓ 已验证` / `⚠ 部分验证`
- `DiscoverPage.tsx` / `ResearchLibrary.tsx` → `★` 收藏星标
- 对应测试 `*.test.tsx` 断言这些符号
- `ui/Icon.tsx:142` 注释含 `// ✓ check`（注释级，低危但应清）

**影响**：直接违反 P0-1（禁止 emoji 作功能图标），且与 vM62 CHANGELOG"emoji-free per P0 rule"声明矛盾。根因是 `emoji-scan.mjs` / `m62-emoji-guard` 未覆盖 `★☆✓✗⚠○` 这批发符号字（落在符号 Unicode 区，门禁正则盲区）。**这是本次体检最有价值的硬发现**——它说明"已通过 emoji 门禁"不等于"真的 emoji-free"。

### 2.3 优先级行动清单

| 等级 | 行动 | 归属 | 说明 |
|------|------|------|------|
| **P0** | 解 M62.5 freeze allowlist 4 文件越界（W10 测试目录入白名单） | 架构/运维 | M62.5 7/7 前置，已确认方案（目录前缀，测试专用） |
| **P0** | 清零符号图标违规（10 文件 → 统一 SVG 图标库） | 前端 | 修代码 + 测试断言 + 补 emoji-scan 正则盲区，否则 vM62"emoji-free"声明失真 |
| **P0** | 清理 87 条未提交树，先发 M62.5 | 运维/PO | 批量提交 + annotated tag + 双 push + 7/7 |
| **P1** | 设计系统入 freeze allowlist + 接入 CI token 校验 | 设计/架构 | "DS 不达标 = CI 红" |
| **P1** | 情报层 cross-module 校验 + M43–M49 真实事件流验证 | 架构/QA | M63 W2 收敛前必做 |
| **P1** | allowlist 改"按特性目录分组"+ ADR 模板化 | 架构 | 降审批熵 |
| **P1** | 一致性 7/7 升为 CI required status check | 运维 | 去 advisory |
| **P2** | 测试去脆：契约化断言 + 1–2 条 E2E 冒烟 | 前端/QA | 降"改一词红全盘"风险 |
| **P2** | 后端 AI 代码与红线张力收敛（默认 off + CI 断言禁默认启用） | 后端/PO | 治理表述清晰化 |
| **P2** | React18→19 非破坏性升级路线 | 架构 | 仅前端，不碰 backend 红线 |
| **P2** | 前端 deploy + 版本化回滚 + /health + 可观测 | 运维 | 生产就绪链路 |

---

## 3. 与 M62.5 收尾的关系（立即行动建议）

M62.5 本身代码已就绪（B1–B7 + W10，941 测试绿），但**有两道闸必须先解才能干净发布**：

1. **freeze allowlist 4 文件越界**（W10 测试文件 `components/__tests__/*`）—— 加目录前缀即解，属已批准 M62.5 闸口内延伸。
2. **符号图标 P0-1 违规（10 文件）** —— 这是体检新发现的真问题。严格说它不在 M62.5 范围，但**若不修，vM62 的"emoji-free"声明就是假的**，且 M62.5 发布会带着这个已知违规进 tag。建议：在 M62.5 发布前一并收口（修代码 + 测试 + 补 emoji-scan 正则），让 vM62.5 成为"真的 emoji-free"的干净基线。

**推荐发布序列（给 PO 拍板）：**
- **(推荐) 方案 A**：M62.5 收尾时顺带清零符号图标违规 + 补 emoji-scan 盲区 → 一次性发 vM62.5（真 emoji-free 基线）→ 随后 M63 在干净基线上启动。
- 方案 B：M62.5 仅解 allowlist 越界先发，符号图标违规单独立 M62.5.1 修。更快但基线仍带已知 P0 违规。
- 方案 C：暂缓 M62.5，先专项治理符号图标 + 设计系统 + allowlist 瘦身，再统一发。最稳但最慢。

---

## 4. 给 PO 的一句话总结

项目"能跑、测试绿、冻结红线没破"，但**治理能力在退化**：allowlist 膨胀、设计系统游离、一致性门禁只是 advisory、测试靠字面量断言、且刚发现 10 个文件偷偷用了符号图标违反 P0-1。**最该先做的不是加新功能，而是把 M62.5 干净发出去 + 把那 10 个符号图标清零 + 把设计系统纳入治理**——这三件做完，M63 才有健康基线。

> 报告完。所有"评估"类结论来自 7 位专家独立产出；带"【已核实】"标记的为总监实拉代码确认的事实。
