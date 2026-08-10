# VS-02 · Component Library — History Explorer FRW

> **Phase 4（Visual System）· 产出物 2 / 4**
> 本文档定义可复用组件与容器族。**所有视觉属性一律引用 VS-01 Token 名，禁止任何硬编码字面色值**（icon 除外：图标名取自 Lucide，属语义引用）。
> 一致性锚点：组件覆盖 IP-03 §13 容器族（Workspace/Companion/Panel/Dock/Rail）+ 四基础组件（Card/Panel/Dialog/Toolbar），且每个组件标注其映射的 IP-03 模式。

---

## 0. 红线声明（先读）

- ① 组件内所有功能图标**仅**来自 Lucide（VS-01 §5），尺寸 16/20/24，零 emoji。
- ② 组件不使用紫粉渐变；accent 仅纯色；无发光边框、无毛玻璃主视觉。
- ③ 组件不出现 Welcome/Lorem/猜你喜欢 等占位；状态文案为真实语义（空态写「暂无已核证来源」而非「No data」）。
- 所有颜色引用 `color-*` Token；所有间距引用 `space-*`；圆角 `layout-*`；动效 `motion-*`。

---

## 1. 四基础组件

### 1.1 Card（卡片）

- **Anatomy**：容器（surface）+ 标题行（可选 icon + title）+ 内容区 + 脚注（可选 meta/刻度）。
- **映射模式**：`P-Anchor`（锚定一个实体/主题）/ `P-Relation`（关系卡）。
- **Token 引用**：

| 属性 | Token |
|------|-------|
| 背景 | `color-paper-50` |
| 边框 | `1px solid color-paper-200` |
| 圆角 | `layout-card-radius` |
| 内边距 | `space-4` |
| 阴影 | `color-shadow-sm` |
| 标题字 | `type-size-title-s` / `type-weight-semibold` / `color-ink-900` |
| 正文字 | `type-size-body` / `type-weight-regular` / `color-ink-700` |

- **状态**：
  - `default`：如上。
  - `hover`：边框 `color-paper-300`，阴影 `color-shadow-md`（指针设备）。
  - `active/selected`：边框 `color-accent`，浅底 `color-accent-soft`。
  - `disabled`：文字 `color-ink-300`，边框 `color-paper-200`，无阴影。
  - `empty`：居中 `icon-size-l` + `color-ink-300` 图标（如 `inbox`），文案「暂无内容」（真实语义，非占位）。
  - `error`：左边框 `3px solid color-status-danger`，图标 `alert-triangle`（Lucide），文字 `color-status-danger`。
- **刻度贴附**：Card 脚注可贴真相刻度点（TP-06/07/08），用 `color-truth-*` 圆点 `space-1` 间距。

### 1.2 Panel（面板）

- **Anatomy**：面板头（title + 操作区）+ 分隔线 + 主体（可滚动）+ 可选脚。
- **映射模式**：`P-Panel`（承载理解/比较内容）/ `P-Companion` 的子面板。
- **Token 引用**：

| 属性 | Token |
|------|-------|
| 背景 | `color-paper-100` |
| 圆角 | `layout-panel-radius` |
| 内边距 | `space-5`（主体）/ `space-4`（头） |
| 头部分隔 | `1px solid color-paper-200` |
| 阴影 | `color-shadow-md` |
| 标题字 | `type-size-title` / `type-weight-semibold` / `color-ink-900` |

- **状态**：`default` / `hover`（同 Card，`hover` 仅头部操作按钮）/ `collapsed`（头部保留，`color-ink-300` 折叠图标 `chevron-down`→`chevron-right`）/ `empty`（`icon-size-l` + `color-ink-300` + 真实语义文案）/ `error`（同 Card error 样式）。
- **滚动**：主体 `overflow:auto`，滚动条用 `color-paper-300` 轨道，无发光。

### 1.3 Dialog（对话框 / 模态）

- **Anatomy**：遮罩（scrim）+ 对话框（头 title + 主体 + 底部操作）。
- **映射模式**：`P-State`（确认/异议叙述态）/ `P-Feedback`（结果反馈）。
- **Token 引用**：

| 属性 | Token |
|------|-------|
| 遮罩 | `color-scrim`（实色半透明，**无 backdrop-blur**） |
| 对话框背景 | `color-paper-50` |
| 圆角 | `layout-panel-radius` |
| 内边距 | `space-5` |
| 阴影 | `color-shadow-lg` |
| 标题字 | `type-size-title` / `type-weight-semibold` |

- **状态**：`default` / `open`（遮罩淡入 `motion-duration-base` `motion-ease-standard`）/ `closed`（反向）/ 焦点陷阱（首个可聚焦元素获 `a11y-focus-ring`）。
- **用途示例**：TP-08 溯源异议叙述弹窗（非报错，用 `color-truth-objection` 标记 + `message-square` 图标，文字叙述）。

### 1.4 Toolbar（工具栏）

- **Anatomy**：横向操作组（图标按钮 + 分隔 + 文本按钮）。
- **映射模式**：`P-Next`（ExplorationAction 触发）/ `P-Switch`（主干切换）/ `P-Animation`（节奏控制）。
- **Token 引用**：

| 属性 | Token |
|------|-------|
| 背景 | `color-paper-100` |
| 高度 | `layout-dock-h`（若作底 Dock 工具条）或自适应 |
| 按钮内距 | `space-2` |
| 按钮圆角 | `layout-radius-s` |
| 图标 | `icon-size-m` / `icon-color-default` |

- **按钮状态**：`default`（`color-ink-500`）/ `hover`（底 `color-paper-200`）/ `active`（`color-accent` + `color-accent-soft` 底）/ `disabled`（`color-ink-300`，禁点击）/ `selected`（`color-accent` 描边 + `color-accent-soft` 底）。
- **红线**：工具栏按钮**全部 Lucide 图标 + 文本标签**，无 emoji；主干切换按钮禁用「多套范式」视觉（X-R3），四主干同构按钮样式。

---

## 2. 容器族（IP-03 §13 视觉规范）

> 容器族为「骨架」，组件在其中排布。所有容器引用 VS-01 布局/色彩 Token。

### 2.1 Workspace（工作区）

- **角色**：主干视图根容器，承载 Explore/Understand/Compare/Mirror 四同构视图。
- **映射模式**：`P-Anchor` + `P-Relation`（内容）+ `P-Switch`（主干切换由 Rail 驱动）。
- **Token**：背景 `color-paper-50`；最大宽 `layout-max`；内边距 `space-6`；栅格 `layout-col`（12 列，`layout-gutter`）。
- **同构语法**：四主干共享同一 Workspace 栅格与标题位（B3 §3），仅内容区组件不同，保证「一个产品感」。

### 2.2 Companion（伴随面板）

- **角色**：右侧常驻理解/证据辅助（IP-03 P-Companion）。
- **映射模式**：`P-Companion` / `P-Scale`（真相刻度常驻）。
- **Token**：宽 `layout-companion-w`；背景 `color-paper-100`；左边框 `1px solid color-paper-200`；内距 `space-5`；窄屏（sm）转抽屉覆盖（`resp-companion`），遮罩 `color-scrim`。

### 2.3 Panel（见 §1.2，容器族内的可复用内容容器）

- 在 Workspace / Companion 内作为内容块复用，遵循 §1.2 Token。

### 2.4 Dock（底部坞）

- **角色**：常驻全局操作（IP-03 P-Dock），承载 P-Next（下一步=ExplorationAction）、P-Feedback。
- **映射模式**：`P-Dock` + `P-Next` + `P-Feedback`。
- **Token**：高 `layout-dock-h`；背景 `color-paper-100`；顶边 `1px solid color-paper-200`；内距 `space-3`；内图标 `icon-size-m`。
- **红线**：Dock 中的「下一步」**仅一个出口**（X-R6），类型为 ExplorationAction（非推荐语汇，X-R1）；按钮用 `arrow-right`/`git-branch` 等 Lucide 图标 + 文本（如「深入延续」「比较语境」对应 5 actionType）。

### 2.5 Rail（左侧导航轨）

- **角色**：四主干切换（IP-03 P-Rail）。
- **映射模式**：`P-Rail` + `P-Switch`。
- **Token**：宽 `layout-rail-w`；背景 `color-paper-100`；右分隔 `1px solid color-paper-200`；图标 `icon-size-l`；激活项 `color-accent` + `color-accent-soft` 左条。
- **同构**：四主干图标风格统一（Lucide 2px），激活态一致，杜绝「每主干一套图标」。

---

## 3. 图标使用总表（Lucide 引用，零 emoji）

| 场景 | Lucide 图标名 | 尺寸 Token | 着色 |
|------|---------------|-----------|------|
| 探索主干 | `compass` | `icon-size-l` | `icon-color-default`/`icon-color-active` |
| 理解主干 | `book-open` | `icon-size-l` | 同上 |
| 比较主干 | `columns` | `icon-size-l` | 同上 |
| Mirror 只读 | `lock` | `icon-size-l` | `icon-color-default` |
| 来源分级 | `layers` | `icon-size-s` | `color-truth-*` |
| 证据强度 | `scale` | `icon-size-s` | `color-truth-*` |
| 溯源异议 | `message-square` | `icon-size-s` | `color-truth-objection` |
| 下一步·展开维度 | `unfold-vertical` | `icon-size-m` | `icon-color-active` |
| 下一步·追因 | `git-branch` | `icon-size-m` | 同上 |
| 下一步·深入延续 | `arrow-down-to-line` | `icon-size-m` | 同上 |
| 下一步·比较语境 | `columns-2` | `icon-size-m` | 同上 |
| 下一步·反思 | `sparkles`→改用 `lightbulb` | `icon-size-m` | 同上 |
| 关系网络 | `share-2` | `icon-size-s` | `color-truth-line` |
| 空态 | `inbox` | `icon-size-l` | `color-ink-300` |
| 错误 | `alert-triangle` | `icon-size-s` | `color-status-danger` |

> 红线校验：上表全部为 Lucide 语义图标，**无任一 emoji**；`sparkles` 因易与「AI 魔法」联想，改 `lightbulb`（反思/洞见），避免 AI 模板味（红线③）。

---

## 4. 组件→Token 一致性自检（节选）

| 组件 | 引用 Token 是否全为 VS-01 名 | 硬编码 hex | emoji |
|------|------------------------------|-----------|-------|
| Card | 是 | 否 | 否 |
| Panel | 是 | 否 | 否 |
| Dialog | 是 | 否 | 否 |
| Toolbar | 是 | 否 | 否 |
| Workspace/Companion/Dock/Rail | 是 | 否 | 否 |

> 实现层将 VS-01 Token 映射为 CSS 变量（如 `--color-accent`），组件只消费变量名，不出现字面色值。

---

## 5. 下游契约（供 VS-03 引用）

1. VS-03 每触点须指明使用本文件的哪个组件/容器 + 哪条状态。
2. 新增组件须先在本文档登记并引用 VS-01 Token，禁止在 VS-03 直接定义新视觉属性。
3. 容器族与四主干同构语法绑定（B3 §3），保证「一个产品感」。

---
*VS-02 结束。组件与容器全部 token 化、零 emoji、零紫粉渐变。*
