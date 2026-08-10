# P5-S2 落地路线图 — 30 触点视觉合规切片（VS/IP 契约）

> **状态**：草案 v2（PO 已批准开工；本版含 2026-08-07 实测修正）
> **日期**：2026-08-07
> **前置**：M60 类型债已清零（tsc 55→0，Task #112）
> **依据**：`VS-04`（五规则 + 三层契约 + 13 验收）/ `VS-03`（TP-01…30）/ `VS-01`（Token 唯一源）/ `VS-02`（组件库）/ `IP-02`（交互契约权威）/ `IP-03` / `B3`（导航架构）/ `ADR-0015` / `ADR-0016`（图标零依赖）
> **验收核心**（PO 六步法）：15min 顺滑体验 + 交互一致 + **一个产品感**

---

## 0. v2 修正说明（2026-08-07 实测发现，重要）

1. **lucide-react Freeze Gate 撤销**：`ADR-0016`（Phase 5 动工时 PO 已批）裁决图标库 = **M62 零依赖内联 SVG 注册表**（Lucide 风格 2px/16·20·24），**不引入 lucide-react**。本路线图不再含 lucide Gate；缺的图标（compass/lock 等）按 ADR-0016 第 4 条**扩展 M62 PATHS 注册表**（零新库）。
2. **TP-15 载体纠正**：VS-03 将 TP-15 误标为「主干切换（Rail）」；经 `IP-02`（Phase 3 交互契约，权威）+ `B3`（导航架构）双重核实——**TP-15 = C15 覆盖态（我懂了什么）**，载体是 `UnderstandingStatus`，**不是** ModeBar。常驻层六项映射见 §2.1。
3. **主题体系冲突**：现有 tokens.css 是**深色金色体系**（`#16130E`/`#CBA135`），VS-01 是 **light-first 浅色纸感体系**（`#FBF8F2`/`#4F46E5` 靛蓝，Phase 4 授权重写 V1 dark-first）。**P5-S2 本质 = 深→浅渐进迁移**。执行策略：先清违规（emoji/硬编码色），Token 落地用**深色兼容取值**保持视觉连贯，主题整体切换另排专项（§4 挂账）。
4. **ModeBar 体系冲突挂账**：现有 `ModeBar`（M90「4 模式视角」exploration/explanation/relationship/understanding）与 FRW「四主干」（Explore/Understand/Compare/Mirror）是**两个导航体系**（B3 §1.2 明言「主干不是 Mode 的改名」）。如何收敛属**导航架构决策**，本路线图不擅动，列 §4 挂账。
5. **P0-1 新违规发现**：`UnderstandingStatus.stageEmoji()` 用 🔍💡🔗🧠❓ emoji 作功能图标（M60 只修了 Icon 类型错、漏此函数）——**P0 红线，Step 0 优先修**。

---

## 1. 现状盘点（2026-08-07 实测）

**结论：功能骨架已就位（A3 收敛完成），视觉合规差距明显，且 VS-01 Token 在前端零落地。**

| 层面 | 现状 | 差距 |
|------|------|------|
| VS-01 Token | 文档已锁定浅色体系，**前端 CSS 零变量**（现有 `--gold-*`/`--hi/--low/--mid` 深色体系）| 需新建 VS-01 Token CSS 变量层（语义名 → CSS 变量，先深色兼容取值）|
| TP-15 覆盖态 | `UnderstandingStatus` 功能在位 | **P0-1 emoji 违规**（stageEmoji）+ 硬编码色 `#4FA784`/rgba + 绿色渐变 + `ease` 缓动 |
| TP-16 下一步 | `NextStepPanel` 已是 A3 产物（5 actionType、禁 recommendation）✅ | 按钮文案与 VS-03 不符（'打开维度' vs '展开维度' 等 5 处）|
| TP-20 轨迹链 | `HistoryBar` 在位 | 待按 VS-01 Token 合规化 |
| TP-23 定位 | `Breadcrumb`/`QuestionHeader` 在位 | 待按 VS-01 Token 合规化 |
| TP-28 语言 | `LanguageSwitcher` 在位 | 待按 VS-01 Token 合规化 |
| 旧组件 | GraphViewPanel / CrossTopicView / TopicComparisonPanel / LoadingSkeleton 等旧体系仍在 | 逐触点裁决「合规化 or 下线」（Batch 4）|

**范围界定**：P5-S2 只做「视觉合规化 + 触点点亮」，**不新增能力、不改后端、不碰枚举**（冻结红线）。需新能力的触点回 FRW P0 重评。

---

## 2. 落地批次

> 排序逻辑：① VS-01 Token 落地是**所有合规的地基**（Step 0）；② 「一个产品感」靠**常驻层同构**（六项共享）→ 先打地基；③ 15min 首访从**首屏**开始 → 再点首访路径；④ 理解链路 + **真相刻度**（P09/真值层）；⑤ Compare P0 + Mirror 红线；⑥ 隐性底层收尾。

### Step 0 · VS-01 Token 落地 + P0 违规清零（地基）
- 新建 VS-01 Token CSS 变量（tokens.css 追加，**保留旧 Token 不清除**——「改动只增不改」）：`--color-ink-*` / `--color-paper-*` / `--color-accent*` / `--color-truth-*` / `--color-status-*` / `--color-scrim` / `motion-*` / `layout-*` / `a11y-*`；取值**先深色兼容**（视觉连贯），主题整体切换另排专项。
- 修 `UnderstandingStatus.stageEmoji` **P0-1 emoji 违规**（→ Icon 注册表）+ 硬编码色 → Token + 绿色渐变 → 纯色 + `ease` → `ease-in-out`。
- 校验：emoji-scan（**函数返回字符串的 emoji 也扫**）0 命中；tsc 0。

### Batch 1 · 常驻层六项（TP-15/16/20/23/28 + 18）—「一个产品感」的地基
> 常驻层六项映射（IP-02 权威）：TP-15 覆盖态 / TP-16 下一步 / TP-20 轨迹链 / TP-23 定位 / TP-28 语言 / TP-18 上一段留下（Companion）。

| 触点 | 组件 | 动作 |
|------|------|------|
| TP-15 覆盖态 | `UnderstandingStatus` | Step 0 完成后继续：覆盖度进度条 `color-accent` 填充 + `paper-200` 轨道；数值 caption/ink-500；六块结构按 VS-01 Token |
| TP-16 下一步 | `NextStepPanel` | 对齐 VS-03 按钮文案（展开维度/追因/深入延续/比较语境/反思）；主按钮 `color-accent` 实色+`arrow-right`；附 `rationale` + `coverageBeforeAfter.delta`（caption/ink-500）|
| TP-20 轨迹链 | `HistoryBar` | 轨迹链 Token 化；单击回退/前进（IP-02 B-1）|
| TP-23 定位 | `Breadcrumb`/`QuestionHeader` | From/Why/Value 定位叙述 Token 化（IP-02 D-1）|
| TP-28 语言 | `LanguageSwitcher` | Token 化 |
| TP-18 Companion | `CompanionShell` | 宽 `layout-companion-w`；窄屏转抽屉 `resp-companion` |

### Batch 2 · 首屏 Explore 首访路径（TP-26/01/02/24/05）
（同 v1，载体：DiscoverPage / TopicCardGrid / SearchBox 次级化 / 维度展开网格）

### Batch 3 · Understand 理解链路 + 真相刻度（TP-10/11/12/13 + TP-06/07/08）
（同 v1，载体：UnderstandingCanvas / RelationshipChain / TimelineChain / TrustDisplay / EvidenceBlock+Dialog）

### Batch 4 · Compare 直入 + Mirror 隔离（TP-14 + TP-19/22）
（同 v1，载体：CrossTopicView / MemoryProjection+Mirror 面板；X-R5 无出边隔离）

### Batch 5 · 隐性底层打磨（TP-28 Toast 反馈 / TP-29 骨架 / TP-17 图例 / TP-21 过滤 / TP-30 成长度量 / TP-09 解释权威）
（同 v1；注：TP-28 在 B3 常驻层指「用什么语言说」= 语言切换，本批 TP-28 为 Toast 反馈——命名冲突以 IP-02 为准：常驻 TP-28=语言，Toast 反馈归 TP-21 附近/隐性底层，落地时核对 IP-02 定夺）

---

## 3. 每批验收门禁（Batch Gate，逐批强制）

| 门禁 | 命令/扫描 | 目标 |
|------|-----------|------|
| tsc | `npx tsc --noEmit` | 0 错 |
| 冻结红线 | `node scripts/freeze-check.mjs` | PASSED（改文件须先扩 SCOPE_ALLOWLIST，精确路径、保持 LF）|
| emoji 扫描 | emoji-scan + **函数级 emoji 审查**（stageEmoji 类）| 0 命中 |
| 硬编码色扫描 | VS-04 规则④ | 0 裸 hex（Token 定义本身除外）|
| 紫粉渐变扫描 | VS-04 规则② | 0 命中 |
| 弹跳缓动扫描 | VS-04 规则③ | 0 命中（仅 linear/ease-in-out）|
| 组件测试 | `vitest run <涉及测试>` | 全绿（存量陈旧测试挂账 OD-08 不纳入）|

每批独立 commit（`P5-S2-{Step/B}n: <TP 清单>`），保持单步 revert。

---

## 4. 挂账 / 决策点

| 项 | 说明 | 处置 |
|----|------|------|
| **ModeBar 体系冲突** | M90「4 模式视角」vs FRW「四主干」（B3 排斥 Mode 改名）| **导航架构决策**，需 PO 拍板（保留 ModeBar 视角切换 or 重构为四主干入口）；未裁决前不碰 ModeBar |
| **主题深→浅切换时机** | VS-01 light-first 已授权；渐进迁移中单组件切浅色会造成深色产品里的浅色斑块 | 建议：Step 0/Batch 1 用深色兼容取值保持连贯；**整体切换（一次性 or 分批）另排专项**，PO 定时机 |
| 旧组件双轨 | GraphViewPanel / CrossTopicView 等 | Batch 4 裁决「合规化 or 下线」；下线走范围变更记录 |
| 内联样式存量 | UnderstandingStatus 等残留硬编码色/rgba | 各 Batch 清理，Step 0 先清常驻层 |
| 文案对齐 | NextStepPanel ACTION_LABELS 与 VS-03 不一致 | Batch 1 统一（改文案属 UI 语义，须确认不破坏既有测试断言）|
| DiscoverPage 4 陈旧测试 | ProductIntro 已迁 App（OD-08）| 挂账，不纳入 |

---

## 5. 开工顺序（PO 已批准「开工」，本版为执行基线）

**Step 0（VS-01 Token + P0 违规清零）→ Batch 1（常驻层）→ 2 → 3 → 4 → 5 顺推。**

- 首批交付（Step 0 + Batch 1 的 TP-15 部分）：tokens.css 追加 VS-01 Token 层 + UnderstandingStatus 修 emoji/硬编码色/渐变/缓动。
- 每个切片独立 commit，独立门禁，可单步 revert。

---

*P5-S2 路线图 v2 结束。含 v1→v2 实测修正（lucide Gate 撤销 / TP-15 载体纠正 / 主题迁移策略 / ModeBar 挂账）。*
