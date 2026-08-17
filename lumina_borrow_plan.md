# LUMINA 风格借鉴方案（取元件，不照搬）

> 目标：把 LUMINA demo 里"好看"的部分，以**元件级**方式借到 History Explorer 平台，
> 提升 M59 暗金主题的精致度与"活气"，同时**不牺牲信息密度、不引入新依赖、不触碰真相层红线**。
> 本文只给方案与位置，供 PO 先判断；未拍板前不改动任何代码。

---

## 一、总原则

| 项 | 决策 |
|----|------|
| 借鉴粒度 | **取元件**（玻璃面板 / 点阵互动 / 入场动画），**不照搬整页** |
| 新依赖 | **零新增**（平台无 `framer-motion`/`motion`，入场动画走纯 CSS） |
| 配色 | 一律用平台 token（`--gold-*`、`--bg-*`、`--intro-cosmos-*`），**不搬 LUMINA 蓝白** |
| 内容区 | 点阵/玻璃**只限欢迎页与浮层侧栏**，**不进实体阅读区** |
| 红线规避 | 不碰全屏视频、极简大留白、外部 CDN 字体、自动循环影像 |

---

## 二、可借鉴元件清单（含精确位置与改法）

### 元件 1 · 玻璃拟态（liquid-glass）→ 浮层/卡片容器

**平台现状**：`tokens.css:233-240` 的 `[data-theme="legacy"]` 块**已埋一套玻璃 token**
（`--surface-glass: blur(16px)`、`--glass-navy-panel` 渐变等），只是默认 v1 主题未启用。
→ 我们**复用这套命名与思路**，在 v1 下新增轻量玻璃类，不重复造轮子。

**落点 A（首选）· 欢迎页四宫格**
- 组件：`frontend/src/components/shell/ProductIntro.tsx`（第 78 行 `<Card className="discover-intro-card ...">`）
- 样式位置：`frontend/src/App.css`（`.discover-intro-card` 定义在此）
- 改法：给 `.discover-intro-card` 加轻玻璃质感——
  `backdrop-filter: blur(10px)` + `border: 1px solid var(--gold-line)`（金色细边）
  + 内阴影 `box-shadow: inset 0 1px 1px rgba(255,255,255,0.06)`。保留现有图片与文案不动。

**落点 B · 实体页侧栏卡片**
- 组件：`frontend/src/components/package/ConnectionCard.tsx`（第 161 行 `<aside className="connection-card">`）
- 样式位置：`frontend/src/styles/package.css`（`.connection-card` 主定义；`explorer-experience.css` 也有相关条目）
- 改法：`.connection-card` 加同款轻玻璃 + 细金边，提升侧栏层次感（侧栏非主阅读区，可适度用）。

**新增工具类（两处共用）**
- 文件：`frontend/src/styles/ui.css`（全局工具类区，此前面包屑 `.he-breadcrumb-*` 即加在此）
- 内容：新增 `.he-glass { backdrop-filter: blur(10px); background: rgba(42,36,26,0.35); border: 1px solid var(--gold-line); }`
  两处卡片直接挂这个类即可，避免重复 CSS。

---

### 元件 2 · KineticGrid 点阵 → 仅欢迎页背景（空闲区装饰）

**组件来源**：lumina-demo 的 `src/components/originkit/ui/kineticgrid.tsx` 已是**纯 canvas、零依赖**代码，
直接复制到平台本地即可，不引入任何 npm 包。

**落点 · 欢迎页背景层**
- 新增文件：`frontend/src/components/ui/KineticGrid.tsx`（从 lumina-demo 复制，仅改配色）
- 修改组件：`frontend/src/components/shell/ProductIntro.tsx`
  - 在 `.discover-intro` 外层包一个 `position:absolute; inset:0; z-index:0` 的背景层，
    内部渲染 `<KineticGrid background="transparent" dotColor="#CBA135" lineColor="#DDB84A" trailColor="#CBA135" spacing={40} radius={300} strength={3} trail />`
    （配色用 `--gold-500`/`--gold-hi`，呼应暗金而非蓝白）
  - 卡片内容层 `z-index` 提到背景之上，确保文字清晰可读。
- **约束**：此组件**只放欢迎页/首页空闲区**；**绝不**放进实体页、关系链等阅读区，避免干扰认知。

**配色对照（必须改，否则视觉不统一）**
| LUMINA 原值 | 平台替换 |
|----|----|
| `dotColor="#FFFFFF"` | `#CBA135`（--gold-500） |
| `lineColor="#80ACFF"` | `#DDB84A`（--gold-hi） |
| `trailColor="#FFFFFF"` | `#CBA135` |

---

### 元件 3 · 入场动画（Framer Motion 风格）→ 纯 CSS @keyframes

**平台现状**：无任何 `@keyframes`、无动画库；但 `tokens.css:66-69` 已有
`--animation-fast/normal`、`--motion-*` 动画 token，说明动画体系是"待补"而非"禁用"。

**落点 · 模块渐显 stagger**
- 四宫格卡片：进场依次淡入 + 上移（stagger 用 `:nth-child` 或内联 `animation-delay`）
- ConnectionCard 侧栏：进场淡入一次

**新增（CSS）**
- 文件：`frontend/src/styles/ui.css`
- 内容：
  ```css
  @keyframes he-fade-up {
    from { opacity: 0; transform: translateY(12px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .he-enter { animation: he-fade-up var(--animation-normal) both; }
  ```
- 应用：ProductIntro 四宫格挂 `.he-enter` + 递增 `animation-delay`；ConnectionCard 挂 `.he-enter`。
- **全程零新依赖**，符合红线。

---

### 元件 4 · 暗金 × 星尘氛围（方向，非独立元件）

LUMINA 的"宇宙星尘"感 ↔ 平台"时间星河"隐喻本就契合。
`tokens.css:174-179` 已有 `--intro-cosmos-*`（靛蓝星空，用于"AI 历史学家"卡），
可作为点阵/玻璃的**配色参考基调**，让借用元素天然融入现有暗金叙事，而非外来皮肤。

---

## 三、明确不碰（红线 / 风险）

| 不碰项 | 原因 |
|----|------|
| 全屏视频背景 | 外部 CDN 依赖 + 自动循环影像**易被误认为真实历史画面**，违反 Article 0 真相层 |
| 极简大留白 | 牺牲实体/关系/证据的信息密度，违背"离场变聪明"目标 |
| 引入 `framer-motion`/`motion` | 触碰"不引新依赖"红线 |
| 外部字体 CDN | 平台已用本地 token 字体体系，无需外链 |
| 把点阵放进阅读区 | 干扰认知任务 |

---

## 四、预期改动文件面（供工作量判断）

| 类型 | 文件 | 改动内容 |
|----|------|---------|
| 新增 | `frontend/src/components/ui/KineticGrid.tsx` | 从 lumina-demo 复制，配色改金色 token |
| 改 | `frontend/src/styles/ui.css` | 新增 `.he-glass`、`.he-enter`、`@keyframes he-fade-up` |
| 改 | `frontend/src/App.css` | `.discover-intro-card` 挂玻璃类 / 加玻璃质感 |
| 改 | `frontend/src/styles/package.css` | `.connection-card` 挂玻璃类 + 入场类 |
| 改 | `frontend/src/components/shell/ProductIntro.tsx` | 加 KineticGrid 背景层 + 卡片入场 stagger |
| 改 | `frontend/src/components/package/ConnectionCard.tsx` | 卡片挂 `.he-glass` + `.he-enter` |

**合计：1 新增 + 5 改动 = 6 个文件。纯前端、零新依赖、不碰后端/数据/红线。**

---

## 五、建议落地顺序（拍板后）

1. 先落 **元件 3 入场动画 + 元件 1 玻璃工具类**（纯 CSS，风险最低，立刻见效果）
2. 再落 **ProductIntro 四宫格玻璃化 + 点阵背景**（欢迎页是非阅读区，最安全）
3. 最后落 **ConnectionCard 侧栏玻璃 + 入场**（实体页，需克制，确认不挡阅读）

每一步都可独立提交、独立回滚。
