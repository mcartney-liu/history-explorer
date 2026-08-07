# VS-03 · UI Specification — History Explorer FRW（TP-01 … TP-30）

> **Phase 4（Visual System）· 产出物 3 / 4**
> 本文档为 **30 个触点（TP-01 … TP-30 = C01 … C30，无增删）** 的逐条视觉规范。
> **全部视觉属性引用 VS-01 Token 名，组件引用 VS-02 名**；每触点映射 **IP-03 某模式**（禁止另起范式，呼应 IP-01 X-R3）。
> Article 0 三层作为分类轴：对象层(Obj)/主体层(Sub)/真值层(Truth)。归属来自 `B3 §8`。

---

## 0. 红线与映射总览（先读）

- **红线①**：30 触点所用图标**全部 Lucide**（VS-01 §5），零 emoji。
- **红线②**：30 触点**零紫粉渐变**；accent 仅纯色。
- **红线③**：零 Welcome/Lorem/猜你喜欢 占位；零硬编码色；缓动仅 `linear`/`ease-in-out`。
- **四主干同构**：Explore/Understand/Compare/Mirror 共享 Workspace 栅格与 Rail 激活样式（B3 §3），仅内容组件不同 → 「一个产品感」。

### 归属与模式映射表（校验：9+7+1+2+6+5 = 30）

| 触点 | 主干/层 | Article 0 层 | 映射 IP-03 模式 |
|------|---------|--------------|----------------|
| TP-01 | Explore | Obj | P-Anchor |
| TP-02 | Explore | Obj | P-Anchor |
| TP-03 | Explore | Obj | P-Relation |
| TP-04 | Explore | Obj | P-Anchor |
| TP-05 | Explore | Obj | P-Anchor |
| TP-06 | Understand | **Truth** | P-Scale |
| TP-07 | Understand | **Truth** | P-Scale |
| TP-08 | Understand | **Truth** | P-Scale + P-State |
| TP-09 | 隐性底层 | **Truth** | P-Feedback |
| TP-10 | Understand | Obj | P-Panel |
| TP-11 | Understand | Obj | P-Panel |
| TP-12 | Understand | Obj | P-Panel |
| TP-13 | Understand | Obj | P-Panel |
| TP-14 | Compare | Obj | P-Anchor + P-Switch |
| TP-15 | 常驻层 | Obj | P-Rail + P-Switch |
| TP-16 | 常驻层 | Sub | P-Next + P-Dock |
| TP-17 | 隐性底层 | Obj | P-Relation |
| TP-18 | 常驻层 | Sub | P-Companion |
| TP-19 | Mirror | Sub | P-State + P-Panel |
| TP-20 | 常驻层 | Sub | P-State |
| TP-21 | 隐性底层 | Obj | P-Feedback |
| TP-22 | Mirror | Sub(**Truth**) | P-State + P-Panel |
| TP-23 | 常驻层 | Obj | P-Dock |
| TP-24 | Explore | Obj | P-Anchor（次级） |
| TP-25 | Explore | Obj | P-Relation |
| TP-26 | Explore | Obj | P-Anchor（首屏承担者） |
| TP-27 | Explore | Obj | P-Relation |
| TP-28 | 常驻层 | Obj | P-Feedback |
| TP-29 | 隐性底层 | Obj | P-Animation + P-Feedback |
| TP-30 | 隐性底层 | **Truth** | P-Scale |

---

## 1. Explore 主干（TP-01/02/03/04/05/24/25/26/27）

### TP-01 · 起点锚定（实体/主题入口）
- 模式：`P-Anchor`｜容器：Workspace + Card｜图标：`compass`(Lucide, `icon-size-l`)
- 视觉：标题位 `type-size-h2`/`color-ink-900`；入口卡用 VS-02 Card `default`，hover 边框 `color-paper-300`。
- 红线：无 Welcome 文案，直接呈现可探索实体（真实数据，C05 数据在能力不在时显空态「暂无已索引实体」）。

### TP-02 · 实体检索入口
- 模式：`P-Anchor`｜容器：SearchBox in Rail/Dock｜图标：`search`(`icon-size-m`)
- 视觉：输入底 `color-paper-50`，边框 `color-paper-200`，聚焦 `a11y-focus-ring`；结果下拉 Card 列表。
- 间距：`space-2` 项内距。

### TP-03 · 关系网络视图
- 模式：`P-Relation`｜容器：Workspace（图谱）｜图标：`share-2`(`icon-size-s`,`color-truth-line`)
- 视觉：节点 Card 圆角 `layout-card-radius`，连线 `color-truth-line` 1.5px；节点选中 `color-accent` 描边 + `color-accent-soft` 底。
- 红线：连线纯色，无发光。

### TP-04 · 实体详情卡
- 模式：`P-Anchor`｜容器：Panel｜图标：`file-text`(`icon-size-m`)
- 视觉：Panel 头 `type-size-title`；属性行 `type-size-body-s`/`color-ink-700`；脚注可贴真相刻度（见 TP-06/07）。

### TP-05 · 维度展开入口
- 模式：`P-Anchor`｜容器：Card 网格｜图标：`unfold-vertical`(`icon-size-m`)
- 视觉：同构卡片网格（`layout-col` 12 栅格），与 Understand/Compare 网格一致。

### TP-24 · 检索（次级，不主导首屏）
- 模式：`P-Anchor`（次级）｜容器：Dock 内 SearchBox｜图标：`search`
- **重点**：检索为**辅助**入口，不参与首屏主视觉；首屏由 TP-26 承担（X-R 隐性约束：检索不主导首屏）。视觉权重低于 TP-26（小控件、无大色块）。

### TP-25 · 关系展开
- 模式：`P-Relation`｜容器：Panel｜图标：`git-branch`
- 视觉：因果链用 `color-truth-line` 连线 + `scale` 证据点贴附（TP-07）。

### TP-26 · 首屏承担者（Home / Explore Landing）
- 模式：`P-Anchor`（首屏承担者）｜容器：Workspace 首屏
- **重点**：首屏主视觉由本触点承担——呈现「可探索的实体/主题」而非空欢迎页；主 CTA 为真实探索动作（如「选择一个起点」卡片网格）。
- 视觉：标题 `type-size-h1`/`color-ink-900`；主区 Card 网格 `layout-col`；accent 仅用于主 CTA 描边（`color-accent`），无渐变大图。

### TP-27 · 图谱总览
- 模式：`P-Relation`｜容器：Workspace 图谱｜同 TP-03 视觉语言（同构）。

---

## 2. Understand 主干（TP-06/07/08/10/11/12/13）

### TP-06 · 来源分级（真相刻度①）
- 模式：`P-Scale`｜容器：Card 脚注 / Companion｜图标：`layers`(`icon-size-s`)
- **重点（三件套①）**：任一结论旁贴来源分级点，用 `color-truth-strong/moderate/weak` 圆点（`space-1`）；标签底 `color-truth-strong-soft` 等。
- 红线：弱来源用 `color-truth-weak`（陶土，非粉）；**不隐藏**弱来源。

### TP-07 · 证据强度（真相刻度②）
- 模式：`P-Scale`｜容器：同 TP-06｜图标：`scale`(`icon-size-s`)
- **重点（三件套②）**：强度以刻度点+数值呈现（`type-weight-semibold`/`color-ink-900`）；弱证据仍显示并附 `color-truth-weak-soft` 标签。

### TP-08 · 溯源异议（真相刻度③）
- 模式：`P-Scale` + `P-State`｜容器：Dialog（叙述型）｜图标：`message-square`(`icon-size-s`,`color-truth-objection`)
- **重点（三件套③）**：异议以**叙述弹窗**呈现（VS-02 Dialog，遮罩 `color-scrim` 无毛玻璃），标记 `color-truth-objection`；**不跳外链**、**非报错红**（ADR-0015 D7）。

### TP-09 · 解释权威呈现（隐性·Truth）
- 模式：`P-Feedback`｜容器：Companion 解释块｜图标：`info`(`icon-size-s`,`color-status-info`)
- 视觉：解释文本 `type-size-body`/`color-ink-700`；权威顺序标注（AI Gateway > Causal > 模板短语，ADR-0015 D4）以 `color-truth-*` 徽标区分。

### TP-10 · 理解内容面板
- 模式：`P-Panel`｜容器：Panel（主）+ Companion（辅）｜图标：`book-open`
- 视觉：Panel `space-5` 内距；标题 `type-size-title`；正文 `type-size-body`/`type-lh-base`。

### TP-11 · 因果链呈现
- 模式：`P-Panel`｜容器：Panel｜图标：`git-branch`
- 视觉：因果步骤纵向 Card 链，连线 `color-truth-line`；每步贴 TP-07 强度点。

### TP-12 · 时间线呈现
- 模式：`P-Panel`｜容器：Panel｜图标：`calendar`
- 视觉：时间轴 `color-paper-200` 竖线 + `color-ink-500` 节点；事件卡 `layout-card-radius`。

### TP-13 · 概念解释
- 模式：`P-Panel`｜容器：Panel｜图标：`lightbulb`
- 视觉：术语卡 `color-accent-soft` 浅底标签（`type-weight-medium`/`color-accent-ink`）。

---

## 3. Compare 主干（TP-14）

### TP-14 · 比较视图（可直入）
- 模式：`P-Anchor` + `P-Switch`｜容器：Workspace 双栏 Panel｜图标：`columns`(`icon-size-l`)
- **重点**：比较可**直接入口**（不经 Explore 中转）；双栏同构 Panel（`layout-panel-radius`），分隔 `color-paper-200`。
- 视觉：差异高亮用 `color-accent-soft` 浅底（非渐变）；优先级 P0（ADR-0015 D3）。

---

## 4. Mirror 主干（TP-19/22）

### TP-19 · Mirror 态呈现
- 模式：`P-State` + `P-Panel`｜容器：Panel（只读）｜图标：`lock`(`icon-size-l`,`color-ink-500`)
- 视觉：只读标识 `lock` + `color-accent-soft` 浅底角标「只读投影」；无编辑控件。

### TP-22 · Mirror L4.5 只读投影出口（终点）
- 模式：`P-State` + `P-Panel`｜容器：Panel（L4.5）｜图标：`lock`
- **重点（红线 X-R5）**：**无出边**——无「下一步」/无外链/无编辑；与 TP-16（EC-16）**绝对视觉隔离**（TP-16 用实色 `color-accent`+箭头，TP-22 用 `color-accent-soft` 浅底+`lock`）。成长度量用 TP-30 刻度。
- 视觉：面板角标 `lock` + 「L4.5 只读投影」；底色 `color-paper-100`；无 Dock 操作区。

---

## 5. 常驻层（TP-15/16/18/20/23/28）

### TP-15 · 主干切换（Rail）
- 模式：`P-Rail` + `P-Switch`｜容器：Rail｜图标：`compass`/`book-open`/`columns`/`lock`(`icon-size-l`)
- 视觉：四主干图标同构（Lucide 2px）；激活 `color-accent` + `color-accent-soft` 左条；**同构语法**保证「一个产品感」（B3 §3）。

### TP-16 · 下一步 = ExplorationAction（5 actionType）
- 模式：`P-Next` + `P-Dock`｜容器：Dock｜图标：`unfold-vertical`/`git-branch`/`arrow-down-to-line`/`columns-2`/`lightbulb`(`icon-size-m`,`color-accent`)
- **重点（ADR-0015 D1 / X-R1 / X-R6）**：
  - 仅**一个**「下一步」出口（X-R6）；
  - 类型为 5 个 ExplorationAction：`open_dimension`(unfold)/`follow_cause`(git-branch)/`deep_continue`(arrow-down)/`compare_context`(columns-2)/`reflect`(lightbulb)；
  - **禁 recommendation 字样**（X-R1），按钮文本为动作语义（如「展开维度」「追因」「深入延续」「比较语境」「反思」）；
  - 附 `rationale` 与 `coverageBeforeAfter.delta` 显示（用 `type-size-caption`/`color-ink-500`）。
- 视觉：主按钮 `color-accent` 实色+`arrow-right` 图标；与 TP-22 **隔离**（无锁面板的下一步）。

### TP-18 · 常驻理解辅助（Companion）
- 模式：`P-Companion`｜容器：Companion｜图标：`panel-right`(`icon-size-m`)
- 视觉：宽 `layout-companion-w`；常驻真相刻度（TP-06/07）+ 解释（TP-09）；窄屏转抽屉（`resp-companion`）。

### TP-20 · 进度态（常驻）
- 模式：`P-State`｜容器：Rail 底部 / Companion 头｜图标：`activity`(`icon-size-s`,`color-accent`)
- 视觉：进度条 `color-accent` 填充 + `color-paper-200` 轨道；数值 `type-size-caption`/`color-ink-500`。

### TP-23 · 常驻操作（Dock 区）
- 模式：`P-Dock`｜容器：Dock｜图标：`settings`(`icon-size-m`)
- 视觉：Dock `layout-dock-h`，与 TP-16 同 Dock；分隔 `color-paper-200`。

### TP-28 · 常驻反馈（Toast）
- 模式：`P-Feedback`｜容器：Toast（角标）｜图标：`check`(`icon-size-s`,`color-status-success`)
- 视觉：Toast `color-paper-50`+`color-shadow-md`+`layout-radius-s`；成功 `color-status-success`，错误 `color-status-danger`（陶土非粉）；自动消失 `motion-duration-slow` `motion-ease-standard`。

---

## 6. 隐性底层（TP-09/17/21/29/30）

> 注：TP-09 已列入 §2。以下为 TP-17/21/29/30。

### TP-17 · 关系类型图例（隐性）
- 模式：`P-Relation`｜容器：Companion 图例块｜图标：`tag`(`icon-size-s`)
- 视觉：18 种关系类型以 `color-ink-500` 文字 + `color-truth-line` 色样列出；无新增枚举（冻结基线）。

### TP-21 · 检索过滤反馈（隐性）
- 模式：`P-Feedback`｜容器：筛选条｜图标：`filter`(`icon-size-s`)
- 视觉：激活筛选项 `color-accent-soft` 底 + `color-accent-ink` 文字；结果计数 `type-size-caption`/`color-ink-500`。

### TP-29 · 加载/骨架（隐性）
- 模式：`P-Animation` + `P-Feedback`｜容器：Skeleton｜图标：无（纯形状）
- 视觉：骨架块 `color-paper-200` 底，脉冲 `motion-duration-slow` `motion-ease-standard`（**非弹跳**）；`prefers-reduced-motion` 时静止。

### TP-30 · 成长度量（隐性·Truth·Mirror）
- 模式：`P-Scale`｜容器：Mirror 面板（TP-22 内）｜图标：`trending-up`(`icon-size-s`,`color-accent`)
- **重点（Truth 层 C30）**：成长度量作为 Mirror 只读投影的一部分（TP-22），用刻度呈现（强/中/弱维度）；`type-size-display` 仅用于主成长度量数（极少用）。

---

## 7. 四主干同构语法核对（「一个产品感」支柱）

| 同构项 | Explore | Understand | Compare | Mirror |
|--------|---------|-----------|---------|--------|
| Workspace 栅格 | `layout-col` 12 | 同 | 同 | 同 |
| Rail 激活样式 | `color-accent`+左条 | 同 | 同 | 同 |
| 标题位 | `type-size-h2` | 同 | 同 | 同 |
| 内容卡圆角 | `layout-card-radius` | 同 | 同 | 只读 `lock` |
| 真相刻度 | TP-06/07 贴附 | 同 | 差异高亮 `accent-soft` | TP-30 |
| 下一步出口 | TP-16（仅常驻层，四主干共享） | 同 | 同 | **无**（TP-22 隔离） |

> 校验：四主干共享 Rail/Workspace/刻度/Dock，差异仅在内容组件与 Mirror 只读隔离 → 视觉统一，无「多产品拼合」感。

---

## 8. 下游契约（供 VS-04）

1. 30 触点全部覆盖，无遗漏无新增（对照 §0 映射表 30 行）。
2. 每触点已标注 IP-03 模式，无「无模式」触点。
3. 真相三件套（TP-06/07/08）与 Mirror 隔离（TP-22 vs TP-16）已在视觉上强制区分。

---
*VS-03 结束。TP-01…TP-30 全映射，零 emoji、零紫粉渐变、零硬编码色。*
