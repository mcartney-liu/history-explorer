# History Explorer M65 设计健康体检 · UI/UX 设计师专项报告

> 评估时间：2026-07-30｜评估人：颜好看（UI/UX 设计师）｜HEAD = `a690645`（M65 WIP）
> 方法：实读源码 + `grep`/`Git` 核验，独立产出，不与旧报告对答案。

## 一、总体评估

**UI 美感与博物馆级质感：基线稳健，但视觉一致性出现裂缝。**【已核实】图标系统（`Icon.tsx`）现采用 `name→SVG` 注册表、1.5px 描边、currentColor、3 固定尺寸，未知 key 返回 `null`（绝不回退 emoji）；【已核实】对 `.tsx` 全量 grep 符号字（★☆✓✗○⚠）与 emoji 区（U+1F300+），仅命中 `Icon.tsx` 注释与 `m62-emoji-guard` 测试——上次体检的 P0-1 符号图标违规（10 文件）已清零。这是本次最实的改善。

**但两块一致性裂缝真实存在（见 P1）。**【已核实】DS V1.0 FINAL 已于 `257a733` 提交入库（696 行），"未提交"已解；然而【已核实】`freeze-check.mjs` 的 `SCOPE_ALLOWLIST` 仅覆盖 `frontend/src` 与 `backend/app`，`docs/` 不在其列，且无任何 CI 对设计 token 做校验——"未强制落地"依旧成立。

**M65 Companion 新 UI（Chat/Explain/Discover）：功能已激活，视觉层却缺失。**【已核实】grep `companion-` 全仓，仅 `.companion-panel`（layout-grid.css:89，作为 ExplorationShell 右栏容器已正确着色）存在 CSS；而 M65 新增的 `companion-shell / companion-title / companion-modes / companion-mode-btn / companion-section / companion-hint` **无任何 CSS 定义**（App.css 亦无）。即新 Companion 外壳与模式切换标签以浏览器默认样式渲染——无古金强调、无卡片面、无设计字体（回退系统字体）、`.active` 态无视觉指示。M65 把真实 AI 模式接上了，设计层却没接。

## 二、各自问题

**P1 · M65 Companion 外壳缺 CSS（视觉质量不达标）**
- 风险：Chat/Explain/Discover 以未样式化 HTML 呈现，与博物馆级系统割裂，用户一眼看出"半成品"。
- 建议：为 `companion-shell/title/modes/mode-btn/hint/section` 补 tokens.css 驱动样式（复用 `.surf-card`/`.sec-label`/`.btn` 体系 + 古金 active 态），随 M65 收尾一并落地。

**P1 · 图谱/关系组件硬编码 Tailwind 默认调色板 + 浅色 hex（破坏品牌一致性）**
- 【已核实】`GraphViewPanel.tsx:42-51` 硬编码 `Civilization:'#7c3aed'`（即 P0-2 禁用的紫）、`Person:'#2563eb'`、`Event:'#dc2626'`、`Religion:'#db2777'` 等纯 Tailwind 默认色，注释还称"on the app's light background (#f7f5f0)"——但产品是暗色博物馆主题。
- 【已核实】`RelationshipPathGraph.tsx:50-54` 硬编码浅色锌系（`#f4f4f5/#52525b/#18181b/#a1a1aa`），暗底上不可读；`RelationshipInsightPanel.tsx:785` 亦硬编码 `#e8a33d/#5b8fb0/#1a1a1a`。
- 风险：数据可视化层与 earth+gold 暗色系统彻底脱节，且含被禁紫值（建议按 P0-2 邻近红线处理）。
- 建议：抽成 DS 语义色 token（实体类型色须适配暗底、避开 `#7c3aed`），CI 扫描裸 hex。

**P2 · token 双向漂移 + 悬空引用**
- 【已核实】`tokens.css` 并存两套文本 token（`--hi:#f7f5f0` vs DS 规范 `--text-high:#F2EBDD`，值不同），并保留 navy 遗留（`--navy-*`）；【已核实】`App.css:140/143/380` 用 `var(--gold-deep)`，但 `styles/` 全仓无此定义 → 金色 hover 渐变声明失效。
- 建议：以 DS 命名对齐、去重、补 `--gold-deep`，生成 `design-tokens.json` 供 import + CI 校验。

## 三、RoleVerdict

`conditional`

- **blocking**：
  1. M65 Companion 外壳/模式标签缺 CSS，新 UI 视觉不达标（须随 M65 收尾补齐）。
  2. 图谱/关系组件硬编码 Tailwind 默认 + 浅色 + 紫 `#7c3aed`，破坏博物馆一致性（按 P0-2 邻近红线处理）。
- **advisory**：DS 入 CI 强制校验（`design-tokens.json` + 裸 hex 扫描）；图标新增补 RFC 评审闸门；清理 token 双系统与 `--gold-deep` 悬空引用；所有 SVG 数据图做 dark-mode 适配。

**一句话**：emoji 红线已守住、DS 已入库是实打实的进步；但 M65 把 AI 能力接上了却没接设计层，图谱组件仍用默认调色板——"能跑"不等于"够美"。先把 Companion 外壳样式与图谱配色收口，博物馆级质感才稳。
