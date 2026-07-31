# History Explorer 前端健康体检报告（2026-07-30）

> 体检人：贾思敏（前端工程师）｜基准 HEAD = `a690645`（M65 phase3d）｜方法：实拉代码（`tsc`/`grep`/`git`/`Read`），非估算

## 一、总体评估

**前端健康度（良好，但两处红线失守）**：【已核实】`npx tsc --noEmit` 退出码 0、零类型错误；src 298、测试 106（上份 941→现 951 测试绿）。类型/构建纪律守得紧。但有两处对红线的真实违反（见 P0/P1），且上份报告"单文件≤300行合规"的判定经核验**本身不成立**。

**M65 Companion 实现质量（良好，未引入新债）**：【已核实】Chat/Explain/Discover 三模式已接真实后端 AI 运行时（`explainAI`），仅前端改动、零 backend diff（守住冻结）。`useCompanionAI` 实现规范：AbortController 取消、idle/loading/success/error 状态机、实体切换自动 reset、`CompanionRouter` 的 mode→View 路由清晰；Research 仍 idle 占位。M65 未带来 emoji/紫粉/新反模式。唯一副作用：13 次 "wire App.tsx" 提交使 App.tsx 由 909→956 行。

**旧问题闭环情况**
- **P0-1 符号图标**：【已核实】全量 grep `★☆✓✗⚠○▶◆●` 及常见 emoji，**0 处功能性使用**（仅 Icon.tsx 注释与 m62-emoji-guard 测试）——已闭环；`Icon.tsx` 为 name→SVG 注册表、未知 key 返 null 自愈。
- **P0-2 紫粉渐变**：【已核实】grep `from-purple|to-pink|#7C3AED|#A855F7|indigo-500` 0 命中——已闭环。
- **P2 引擎层英文 / P4 分层 / P3 测试脆性**：均未闭环（见 P1）。

## 二、各自问题

**P0｜单文件≤300行红线失守（且上份判定失实）**
【已核实】全量扫描 13 文件 >300 行：App.tsx 956、RelationshipInsightPanel.tsx 841、relationshipUtils.ts 759、DiscoverPage 383、EntityPage 356、EntityPickerPanel 368…… 而上份报告称 vM62 时"超阈值 0 个"——但 `git show 68cd0fa:App.tsx` 实测 909 行、vM62 同样 13 文件超 300。**该债务长期存在，上份"合规"结论为假阳性**。风险：god-file（App.tsx/RelationshipInsightPanel）难维护、违背单一职责。建议：冻结期先登记技术债，把 App.tsx 拆为 Shell/路由/面板编排层，RelationshipInsightPanel 的 SVG 抽独立组件。

**P1｜硬编码颜色违反 P0-3**
【已核实】grep 出 33 处非 `#fff`/`#000` 硬编码 hex：GraphViewPanel.tsx 实体类型调色板（`#dc2626/#2563eb/#7c3aed/#059669…`）、RelationshipInsightPanel.tsx SVG 时间轴（`#999/#e8a33d/#5b8fb0/#1a1a1a`）。违反"禁硬编码颜色"。风险：主题/暗色模式漂色、设计 token 双向漂移。建议：实体调色板与 SVG 色板抽为 `var(--token)`，CI 加裸 hex 扫描。

**P1｜i18n 终局缺口未闭环（引擎层英文 + 分层 + 脆性断言）**
【已核实】`compareTemporal.buildTemporalComparisonText` 与 `relationshipUtils.geoComparison` 直接返回英文串（如 `'No geographic data available…'`），不经 `t()`；`LocaleProvider` 仍在 `src/data/`（情报层）；测试 523 处中文字面量断言（`toContain('AI 历史学家')` 等），M65 的 CompanionShell.test 亦新增脆性断言。风险：改一词 951 红、非中文路径泄漏 key/英文。建议：引擎层术语走 i18n、`LocaleProvider` 迁 `contexts/`、断言改 role/结构契约 + 补 1–2 条 E2E。

## 三、RoleVerdict

`conditional`

- **blocking**
  1. 单文件>300行红线违约（13 文件，含 App.tsx 956），须拆分或登记技术债；
  2. 硬编码颜色 33 处违反 P0-3，须 token 化；
  3. i18n 引擎层英文 + `LocaleProvider` 分层 + 523 脆性断言，发布前须收口。
- **advisory**：M65 Companion 质量好，但停增 App.tsx 体积；补 E2E 冒烟；设计 token 接入 CI 硬门禁；上份报告"≤300合规"结论应更正，避免基线失真。
