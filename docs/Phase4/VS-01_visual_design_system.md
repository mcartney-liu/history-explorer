# VS-01 · Visual Design System — History Explorer FRW

> **Phase 4（Visual System）· 产出物 1 / 4**
> 唯一目标：统一整个产品视觉。本文档是 Phase 4 的唯一 Token 权威来源。
> 下游 `VS-02_component_library.md`、`VS-03_ui_specification.md`、`VS-04_visual_contract.md` 一律引用本文档的 **Token 名**，禁止出现任何硬编码字面色值（除本文档作为 Token 定义本身列出 hex 外）。
>
> 一致性锚点：本文档的 Token、Article 0 三层视觉语言、冻结对齐三项，与 `IP-03_interaction_pattern_library.md` 的 12 模式 + 容器族、`B1_experience_architecture.md` 的 Article 0 三层、`ADR-0015` 裁决逐条对齐。

---

## 0. 文档范围与红线声明（先读）

本文档产出的设计系统**严格遵守三条绝对红线**：

| 红线 | 声明 | 本文档落实位置 |
|------|------|----------------|
| ① 禁 emoji 作功能图标 | 已锁定统一 SVG 图标库（详见 §6），全文档零 emoji 图标方案 | §6 Icon |
| ② 禁紫粉渐变主视觉 | 全程无 `linear-gradient(135deg,#7C3AED→#A855F7→#EC4899)` 及 Indigo→Pink 任意渐变；Indigo `#6366F1`/Slate Blue `#4F46E5` 仅作纯色强调，禁「渐变+发光边框+毛玻璃」三位一体 | §1 Color |
| ③ 禁 AI 模板味 | 无 Welcome/Lorem ipsum/猜你喜欢 等占位；无硬编码颜色（实现用 Token）；缓动仅 `linear`/`ease-in-out`，禁弹跳 `cubic-bezier(0.68,-0.55,0.265,1.55)` | §7 Motion |

**Token 命名约定**：所有 Token 以语义前缀命名（`color-` / `type-` / `space-` / `icon-` / `motion-` / `layout-` / `a11y-` / `resp-`），不暴露具体色值语义。下游文档与（未来的）实现**只引用 Token 名**。

---

## 1. Color — 色彩 Token（含品牌基色论证）

### 1.1 品牌基色方向论证（重写 V1 dark-first）

现有 `History-Explorer-Design-System-V1.md` 采用 dark-first（暖黑底 `#16130E` + 古金 `#CBA135`）。本文档按 FRW Phase 4 授权**重新论证品牌基色方向**：

- **产品本质**：History Explorer 是「阅读型、理解型、求证型」工具。用户需要长时间在文字、关系网络、证据链上停留。暖白纸感底色降低视觉噪声、提升可读性，符合「纸感阅读」心智模型。
- **决策**：采用 **近黑墨色文字 + 暖白纸感底色 + 单一克制冷调强调色** 浅色优先（light-first）体系。
- **强调色克制原则**：全产品仅 **一个** 主强调色（accent），不引入第二强调色；Indigo `#6366F1` 与 Slate Blue `#4F46E5` 仅可作为 accent 纯色候选，**二选一**，不可同时出现于同一视图。
- **真相刻度（Truth 层）使用独立语义色阶**（绿→赭→陶），与 accent 严格区分，避免「强调=情绪」误读。

### 1.2 中性墨阶（Ink / 文字与结构）

| Token | 取值 | 用途 | 对齐 Article 0 |
|-------|------|------|----------------|
| `color-ink-900` | `#1A1815` | 主文字、标题、关键数值 | 对象层·结构 |
| `color-ink-700` | `#2E2A24` | 次级文字、正文 | 对象层·结构 |
| `color-ink-500` | `#57514A` | 辅助文字、说明、元信息 | 对象层·结构 |
| `color-ink-300` | `#8A8278` | 占位标签（非空内容占位）、禁用态文字 | 对象层·结构 |
| `color-ink-100` | `#B8B0A4` | 极弱提示、分割线文字 | 对象层·结构 |

> 墨阶带极轻暖调（Hue ≈ 35），与暖白纸感呼应，避免纯黑冷硬。

### 1.3 暖白纸感底色（Paper / 表面）

| Token | 取值 | 用途 | 对齐 Article 0 |
|-------|------|------|----------------|
| `color-paper-50` | `#FBF8F2` | 应用根背景（首层纸） | 对象层·纸感基底 |
| `color-paper-100` | `#F4EFE6` | 次级表面、凹陷区、列表底 | 对象层·纸感基底 |
| `color-paper-200` | `#E9E1D3` | 卡片/面板边框、分隔线、hover 底 | 对象层·边界 |
| `color-paper-300` | `#DCD2C0` | 强分割、禁用态底、轨道 | 对象层·边界 |

### 1.4 单一克制强调色（Accent — 冷调，纯色）

> 选定 **Slate Blue 作为全产品唯一 accent 纯色**（`#4F46E5`）。Indigo `#6366F1` 作为同族备选，仅在未引入 Slate Blue 的环境作为降级；二者**不可同屏共现**。

| Token | 取值 | 用途 | 对齐 Article 0 |
|-------|------|------|----------------|
| `color-accent` | `#4F46E5` | 主操作、激活态、焦点环、关键链接 | 主体层·用户轨迹高亮 |
| `color-accent-hover` | `#4338CA` | accent 悬停加深（同色相降明度，非渐变） | 主体层 |
| `color-accent-soft` | `#ECEAFB` | accent 浅底（标签底、选中行底，低饱和） | 主体层 |
| `color-accent-ink` | `#312E81` | accent 上的反白文字 | 主体层 |

> 注：accent 全部为 **纯色填充 / 纯色描边**，**绝不使用渐变**。accent-soft 为低饱和浅底，非发光、非毛玻璃。

### 1.5 真相刻度语义色（Truth Scale — 真值层专用，独立于 accent）

真相刻度三件套（TP-06 来源分级 / TP-07 证据强度 / TP-08 溯源异议）使用以下语义色阶，**与 accent 严格区分**，且**均为实色、非渐变、非粉**：

| Token | 取值 | 含义 | 对齐 Article 0 |
|-------|------|------|----------------|
| `color-truth-strong` | `#2F7D5B` | 强证据 / 一手来源 / 已核证 | 真值层·证据强度 |
| `color-truth-moderate` | `#B07A2B` | 中等证据 / 二手来源 | 真值层·证据强度 |
| `color-truth-weak` | `#A65A45` | 弱证据 / 三手或推断（**不隐藏**，陶土色非粉） | 真值层·证据强度 |
| `color-truth-objection` | `#7A5230` | 溯源异议标记（叙述型，非报错红） | 真值层·溯源异议 |
| `color-truth-line` | `#C9BFA8` | 溯源连线 / 证据链描边 | 真值层·溯源 |
| `color-truth-strong-soft` | `#E3F0E8` | 强证据浅底标签 | 真值层 |
| `color-truth-weak-soft` | `#F3E7E1` | 弱证据浅底标签（陶土浅底，非粉） | 真值层 |

> 红线校验：弱证据色 `color-truth-weak` 为 **陶土红（earthy brick）**，Hue ≈ 12，与紫粉（Hue ≈ 320）无关；全程无任何 pink / magenta / 紫粉渐变。

### 1.6 状态与反馈语义色（Feedback — 仅功能性，克制）

| Token | 取值 | 用途 |
|-------|------|------|
| `color-status-info` | `#3B6EA5` | 信息提示（蓝，纯色） |
| `color-status-success` | `#2F7D5B` | 成功 / 完成（与 truth-strong 同源复用） |
| `color-status-warn` | `#B07A2B` | 警告 / 需注意（与 truth-moderate 同源复用） |
| `color-status-danger` | `#A65A45` | 错误 / 阻断（与 truth-weak 同源复用，陶土非粉） |
| `color-status-info-soft` | `#E6EEF5` | 信息浅底 |
| `color-status-danger-soft` | `#F3E7E1` | 错误浅底 |

> 设计意图：状态色与真相刻度色**同源**，使「证据强弱」与「系统反馈」在视觉上属同一语义家族，强化「可信度即系统语言」的产品一致性（呼应 IP-01 X-R1 禁推荐语汇、ADR-0015 D4 解释权威顺序）。

### 1.7 阴影与遮罩（Shadow / Overlay — 无发光、无紫粉）

| Token | 取值 | 用途 |
|-------|------|------|
| `color-shadow-sm` | `0 1px 2px rgba(26,24,21,.06)` | 卡片静态 |
| `color-shadow-md` | `0 2px 8px rgba(26,24,21,.10)` | 面板浮起 |
| `color-shadow-lg` | `0 8px 24px rgba(26,24,21,.14)` | 对话框 / 浮层 |
| `color-scrim` | `rgba(26,24,21,.40)` | 模态遮罩（实色半透明，非毛玻璃） |
| `color-border-focus` | `color-accent` | 焦点环描边 |

> 红线校验：阴影为中性墨色低透明度，**无彩色发光（no glow）**；遮罩为实色半透明，**无 backdrop-blur 毛玻璃主视觉**。

### 1.8 渐变禁令（显式）

> **禁止清单（写入 VS-04 视觉契约绑定规则②）：**
> - 禁止 `linear-gradient(135deg, #7C3AED, #A855F7, #EC4899)` 及任意紫→粉渐变。
> - 禁止 Indigo→Pink 任意渐变。
> - 禁止「Indigo/Slate 渐变 + 发光边框 + 毛玻璃」三位一体组合。
> - accent 仅可纯色填充/描边；如确需层次，使用 `color-paper-*` 与 `color-ink-*` 的实色叠层，**不得用渐变模拟层次**。

---

## 2. Typography — 字体 Token

### 2.1 字族（拉丁 + 中文回退）

| Token | 取值 | 用途 |
|-------|------|------|
| `type-font-sans` | `"Inter", "Noto Sans SC", system-ui, sans-serif` | 全局正文字族（拉丁 Inter，中文 Noto Sans SC 回退） |
| `type-font-mono` | `"JetBrains Mono", "Noto Sans Mono CJK SC", monospace` | 实体 ID / 关系类型 / 溯源锚点等技术串 |

> 中文回退锁定 Noto Sans SC，保证「关系 / 来源 / 证据」等中文密集场景字形统一。

### 2.2 字号阶梯（Type Scale — 1.25 模数，base 16）

| Token | 取值 | 用途 | 行高 Token |
|-------|------|------|-----------|
| `type-size-caption` | `12px` | 元信息、刻度标签 | `type-lh-tight` |
| `type-size-body-s` | `14px` | 辅助文字、列表项 | `type-lh-base` |
| `type-size-body` | `16px` | 正文默认 | `type-lh-base` |
| `type-size-title-s` | `18px` | 卡片标题、小节标题 | `type-lh-snug` |
| `type-size-title` | `20px` | 面板标题、区块标题 | `type-lh-snug` |
| `type-size-h3` | `24px` | 页面级区块标题 | `type-lh-snug` |
| `type-size-h2` | `30px` | 主干视图标题 | `type-lh-tight` |
| `type-size-h1` | `36px` | 顶层标题（慎用） | `type-lh-tight` |
| `type-size-display` | `48px` | 仅首屏主数 / Mirror 成长度量（极少用） | `type-lh-tight` |

### 2.3 字重、行高、字距

| Token | 取值 | 用途 |
|-------|------|------|
| `type-weight-regular` | `400` | 正文 |
| `type-weight-medium` | `500` | 强调词、标签 |
| `type-weight-semibold` | `600` | 标题、数值 |
| `type-weight-bold` | `700` | 关键数值、主干标题 |
| `type-lh-tight` | `1.2` | 大标题 |
| `type-lh-snug` | `1.3` | 区块标题 |
| `type-lh-base` | `1.55` | 正文 |
| `type-ls-tight` | `-0.01em` | 大字号标题收紧 |
| `type-ls-wide` | `0.04em` | 刻度标签 / 大写标签放宽 |

> 禁用字重 < 400 的极细体（thin），避免浅色底上可读性下降。

---

## 3. Spacing — 间距 Token（4 / 8 基准）

| Token | 取值 | 用途 |
|-------|------|------|
| `space-1` | `4px` | 刻度点间距、icon 与文字微距 |
| `space-2` | `8px` | 控件内边距、列表项内距 |
| `space-3` | `12px` | 控件间距、标签间距 |
| `space-4` | `16px` | 卡片内边距、区块基本间距 |
| `space-5` | `24px` | 面板内边距、区块间距 |
| `space-6` | `32px` | 视图级间距 |
| `space-7` | `48px` | 主干视图区块间距 |
| `space-8` | `64px` | 首屏留白 |

> 间距一律取 4 的倍数；组件内部 padding 优先 `space-4`，面板 `space-5`。

---

## 4. Layout & Grid — 布局与栅格 Token

| Token | 取值 | 用途 |
|-------|------|------|
| `layout-max` | `1440px` | 应用最大内容宽度 |
| `layout-content` | `1200px` | 文本/理解视图舒适阅读宽度 |
| `layout-gutter` | `24px` | 栅格槽 |
| `layout-col` | `12` | 列数 |
| `layout-rail-w` | `56px` | 左侧 Rail 宽度（IP-03 P-Rail） |
| `layout-dock-h` | `48px` | 底部 Dock 高度（IP-03 P-Dock） |
| `layout-companion-w` | `360px` | 右侧 Companion 宽度（IP-03 P-Companion） |
| `layout-panel-radius` | `12px` | 面板圆角 |
| `layout-card-radius` | `10px` | 卡片圆角 |
| `layout-radius-s` | `6px` | 标签 / 控件小圆角 |

> 容器边距：移动端 `space-4`，桌面端 `space-5`~`space-6`。

---

## 5. Icon — 图标 Token（锁定 SVG 图标库）

### 5.1 锁定库名与选型理由（红线①落实）

| 项 | 值 |
|----|----|
| **锁定库** | **Lucide**（`lucide` npm 包，MIT 许可） |
| 描边风格 | 统一 **2px 描边**（`stroke-width: 2`），`fill: none`，圆角端点（`stroke-linecap: round`） |
| 尺寸阶梯 | **16 / 20 / 24 px** 三档（`icon-size-s/m/l`），矢量缩放无失真 |
| 语义明确 | 每个图标对应单一语义（如 `compass`=探索、`scale`=证据强度、`git-branch`=关系），命名即语义 |
| 选型理由 | ① 单一统一描边体系，杜绝多套混用；② 纯 SVG 矢量，可随 `currentColor` 取 `color-ink-*` / `color-accent` 着色，天然 token 化；③ 语义命名清晰，无 emoji 歧义；④ MIT 友好、体积可控、React 友好（`lucide-react`）；⑤ 2px 描边在暖白纸感底上对比清晰，符合可读性优先 |
| **红线校验** | 全程**零 emoji 图标方案**；所有功能图标来自 Lucide，尺寸仅 16/20/24，描边仅 2px |

### 5.2 图标 Token

| Token | 取值 | 用途 |
|-------|------|------|
| `icon-size-s` | `16px` | 列表项、刻度标签内图标 |
| `icon-size-m` | `20px` | 工具栏、按钮内图标 |
| `icon-size-l` | `24px` | 面板标题前、空态图标 |
| `icon-stroke` | `2` | 统一描边宽度 |
| `icon-color-default` | `color-ink-500` | 默认图标着色 |
| `icon-color-active` | `color-accent` | 激活/选中图标着色 |

### 5.3 冻结对齐声明（依赖新增）

> 当前 `frontend/package.json` 仅含 `react` / `react-dom`。引入 `lucide-react` 属**新增前端依赖**，须按 `CURRENT_ARCHITECTURE_BASELINE.md` 走 **Freeze Revision Gate / SCOPE_ALLOWLIST** 审查（FRW 即前端重构授权上下文，但仍需显式标注）。VS-04 §冻结对齐 复述此要求。图标库**禁止**引入多套（如同时 lucide + heroicons + tabler），仅 Lucide 一库。

---

## 6. Motion — 动效 Token（红线③落实）

| Token | 取值 | 用途 |
|-------|------|------|
| `motion-duration-fast` | `120ms` | 微交互（hover、刻度点切换） |
| `motion-duration-base` | `200ms` | 面板展开、视图过渡 |
| `motion-duration-slow` | `320ms` | 主干切换、Companion 滑入 |
| `motion-ease-standard` | `cubic-bezier(0.4, 0, 0.2, 1)` | 进入/退出（ease-in-out 族） |
| `motion-ease-linear` | `linear` | 进度、刻度扫描、连续位移 |
| `motion-ease-soft` | `ease-in-out` | 通用过渡 |

> **红线校验**：
> - 缓动**仅** `linear` 与 `ease-in-out` 族（`cubic-bezier(0.4,0,0.2,1)` 等价于标准 ease-in-out）。
> - **禁止**弹跳缓动 `cubic-bezier(0.68,-0.55,0.265,1.55)` 及任意 overshoot。
> - **降级策略**：`prefers-reduced-motion: reduce` 时，所有非必要动效转为 `0ms` 即时切换，仅保留焦点/状态可见性变化（见 §8）。

---

## 7. Accessibility — 可达性 Token

| Token | 取值 | 用途 |
|-------|------|------|
| `a11y-focus-ring` | `2px solid color-accent` + `offset 2px` | 键盘焦点环（所有可聚焦元素） |
| `a11y-min-target` | `44px` | 最小可点击区域（触控） |
| `a11y-contrast-text` | `color-ink-900/700 on color-paper-50` | 正文对比 ≥ WCAG AA（4.5:1） |
| `a11y-contrast-ui` | `color-ink-500 on color-paper-50` | UI 组件对比 ≥ 3:1 |
| `a11y-reduced-motion` | `@media (prefers-reduced-motion: reduce)` | 动效降级开关 |

> 全产品目标 **WCAG 2.1 AA**。正文文字对比 ≥ 4.5:1，大字号/UI 元素 ≥ 3:1。焦点环不得被 `outline:none` 移除。

---

## 8. Responsive — 响应式 Token

| Token | 取值 | 用途 |
|-------|------|------|
| `resp-bp-sm` | `640px` | 手机 |
| `resp-bp-md` | `1024px` | 平板 / 紧凑桌面 |
| `resp-bp-lg` | `1440px` | 桌面（触达 `layout-max`） |
| `resp-companion` | `常驻（md+）/ 抽屉（sm）` | Companion 在窄屏转为抽屉覆盖 |
| `resp-rail` | `常驻图标（md+）/ 隐藏或底 Dock（sm）` | Rail 在窄屏折叠为 Dock |
| `resp-touch-target` | `44px` | 触控最小热区（见 §7） |
| `resp-pointer` | `hover/focus 态仅指针设备生效` | 触摸设备不展示 hover 专属样式 |

> 触控（Touch）与指针（Pointer）区分：hover/tooltip 专属视觉仅在 `pointer: fine` 生效；触摸设备以 `active` 态与 44px 热区替代。

---

## 9. Article 0 三层视觉语言（视觉化映射）

本文档将 `B1_experience_architecture.md` 的 Article 0 三层落为视觉语言，供 VS-02 / VS-03 引用。

### 9.1 对象层（Object Layer — 21 项能力）

- **视觉命题**：结构、网络、生长感。
- **落点 Token**：`color-ink-*` 结构线 + `color-paper-*` 表面；关系网络用 `color-truth-line` 描边连线；「生长」用 `motion-duration-slow` 的渐进揭示，非弹跳。
- **对应能力**：C01–C21（探索/理解/比较的客体内容）。

### 9.2 主体层（Subject Layer — 4 项：C18/C19/C20/C22）

- **视觉命题**：用户轨迹的反射，Mirror 只读投影。
- **落点 Token**：用户轨迹高亮用 `color-accent` / `color-accent-soft`；Mirror（C22）为 **L4.5 只读投影**，视觉上以 `color-accent-soft` 浅底 + 锁形图标（`lock`，Lucide）标识「只读、无出边」，与 EC-16（TP-16）的 `color-accent` 主动作**在色相上同源但角色隔离**（Mirror 用 soft 浅底+锁，Action 用实色+箭头）。
- **对应能力**：C18 轨迹记录 / C19 进度 / C20 反思 / C22 Mirror。

### 9.3 真值层（Truth Layer — 5 项：C06/C07/C08/C09/C30）

- **视觉命题**：真相刻度三件套（来源分级 / 证据强度 / 溯源异议）始终贴附任一结论。
- **落点 Token**：`color-truth-strong/moderate/weak` 刻度点 + `color-truth-strong-soft/weak-soft` 标签底；溯源连线 `color-truth-line`；异议 `color-truth-objection` 叙述型标记（非报错红）。
- **对应能力**：C06 来源分级（TP-06）/ C07 证据强度（TP-07）/ C08 溯源异议（TP-08）/ C09 解释权威 / C30 成长度量（Mirror）。
- **硬约束（来自 B4 §4 / ADR-0015 D7）**：弱证据**绝不隐藏**、**绝不跳外链**，异议以叙述呈现。

---

## 10. 冻结对齐（Freeze Alignment）

| 项 | 对齐内容 | 来源 |
|----|----------|------|
| 前端最小栈 | 仅 React + ReactDOM；图标库 `lucide-react` 为新增依赖，须走 Freeze Revision Gate / SCOPE_ALLOWLIST | `CURRENT_ARCHITECTURE_BASELINE.md` |
| 实体/关系枚举 | 视觉不新增 ENTITY_TYPES(8) / RELATIONSHIP_TYPES(18)，仅呈现既有枚举 | 同上 |
| 禁紫粉渐变 | 见 §1.8，写入 VS-04 规则② | 红线② |
| 禁弹跳缓动 | 见 §6，写入 VS-04 规则③ | 红线③ / IP-01 AN-2 |
| 禁 emoji 图标 | 见 §5，写入 VS-04 规则① | 红线① |
| 模式映射 | 所有视觉落点须映射 IP-03 某模式，禁止另起范式（VS-03 逐条标注） | `IP-03` / `IP-01` X-R3 |

---

## 11. 下游契约（供 VS-02 / VS-03 / VS-04 引用）

1. 组件与触点**只能**引用本文档 Token 名；实现层将 Token 映射为 CSS 变量 / TS 常量。
2. 任何新色值需求，先在本文档新增 Token 并经 Phase 4 评审，不得在实现中写死 hex。
3. Article 0 三层视觉语言是 VS-03 触点规范的分类轴；每触点须标注所属层与映射的 IP-03 模式。
4. 图标一律 Lucide，尺寸 16/20/24，禁 emoji。

---
*VS-01 结束。本文件为 Phase 4 Token 唯一权威源。*
