# VS-04 · Visual Contract — History Explorer FRW

> **Phase 4（Visual System）· 产出物 4 / 4**
> 本文档将视觉系统的**绑定规则、Article 0 三层契约化、验收标准**固化为不可违反的契约。
> 上游依据：`VS-01`（Token 权威）/ `VS-02`（组件）/ `VS-03`（30 触点）/ `IP-01`（X-R1~X-R8、AN-2）/ `IP-03`（模式）/ `ADR-0015` / `CURRENT_ARCHITECTURE_BASELINE`（冻结）。

---

## 1. 五条绑定规则（硬性，违反即退回）

### 规则① · 禁 emoji，锁 SVG 图标库
- **约束**：所有功能图标**仅**来自 Lucide（VS-01 §5），尺寸仅 16/20/24px，描边仅 2px；禁止 emoji、禁止多套图标库混用。
- **落地**：VS-02 §3 图标总表、VS-03 每触点图标列。
- **校验**：扫描实现，出现 emoji 或多库即违规（呼应 M62.5 Gate2 emoji-scan）。

### 规则② · 禁紫粉渐变主视觉
- **约束**：禁止 `linear-gradient(135deg,#7C3AED→#A855F7→#EC4899)` 及任意 Indigo→Pink 渐变；禁止「渐变 + 发光边框 + 毛玻璃」三位一体；accent 仅纯色（VS-01 §1.4/§1.7/§1.8）。
- **落地**：VS-01 §1.8 禁单；VS-02 组件无渐变；VS-03 零紫粉。
- **校验**：出现紫粉渐变 / glow / backdrop-blur 主视觉即违规。

### 规则③ · 禁 AI 模板味
- **约束**：禁止 Welcome / Lorem ipsum / 猜你喜欢 等空洞占位；禁止硬编码颜色（实现用 Token）；缓动仅 `linear` / `ease-in-out`，禁弹跳 `cubic-bezier(0.68,-0.55,0.265,1.55)`（VS-01 §6 / §0）。
- **落地**：VS-02 空态文案为真实语义；VS-03 零占位；动效全 `motion-*` Token。
- **校验**：出现占位文案 / 硬编码 hex / 弹跳缓动即违规（呼应 IP-01 AN-2）。

### 规则④ · 全 Token 化
- **约束**：实现层所有视觉属性引用 VS-01 Token 名（映射为 CSS 变量 / TS 常量），禁止在组件/样式中写死色值、间距、字号（VS-01 §11）。
- **落地**：VS-02 组件表全 Token 引用；VS-03 全 Token 引用。
- **校验**：代码中出现裸 hex / 硬编码 `px` 间距 / 字面色即违规（除非 Token 定义本身）。

### 规则⑤ · 视觉须映射 IP-03 模式
- **约束**：任何视觉落点须映射 IP-03 某模式（P-Anchor/P-Relation/P-Scale/P-Next/P-Switch/P-Panel/P-Rail/P-Dock/P-Companion/P-Feedback/P-State/P-Animation + 容器族），禁止另起视觉范式（呼应 IP-01 X-R3）。
- **落地**：VS-03 §0 映射表 30 触点全覆盖，无「无模式」触点。
- **校验**：出现未映射模式的视觉元素即违规。

---

## 2. Article 0 三层视觉契约化

将 B1 的 Article 0 三层落为**视觉契约**，任何触点违反即退回。

### 2.1 对象层（Object — 21 能力）
- **契约**：客体内容以 `color-ink-*` 结构 + `color-paper-*` 表面 + `color-truth-line` 关系网络呈现；「生长」用 `motion-duration-slow` 渐进揭示（非弹跳）。
- **覆盖触点**：TP-01…TP-05, TP-10…TP-14, TP-17, TP-21, TP-24…TP-27（对象层全部）。

### 2.2 主体层（Subject — C18/C19/C20/C22）
- **契约**：用户轨迹以 `color-accent` / `color-accent-soft` 高亮；Mirror（C22）为 L4.5 只读投影，视觉以 `lock` + `color-accent-soft` 浅底标识，**无出边**，与 EC-16（TP-16）隔离（ADR-0015 D2/D6）。
- **覆盖触点**：TP-16（EC-16, 实色+箭头）/ TP-18 / TP-19 / TP-20 / TP-22（lock 浅底，无出边）。

### 2.3 真值层（Truth — C06/C07/C08/C09/C30）
- **契约**：真相刻度三件套（TP-06 来源分级 / TP-07 证据强度 / TP-08 溯源异议）**贴附任一结论**；弱证据**不隐藏**、**不跳外链**（ADR-0015 D7）；异议为叙述型（非报错红）；成长度量（TP-30）属 Mirror 只读投影。
- **覆盖触点**：TP-06 / TP-07 / TP-08 / TP-09 / TP-30。

---

## 3. 冻结对齐（Freeze Alignment）

| 项 | 契约要求 | 来源 |
|----|----------|------|
| 图标库依赖 | 引入 `lucide-react` 须走 Freeze Revision Gate / SCOPE_ALLOWLIST 审查（FRW 授权上下文下仍显式标注） | `CURRENT_ARCHITECTURE_BASELINE` / VS-01 §5.3 |
| 枚举守卫 | 视觉不新增 ENTITY_TYPES(8)/RELATIONSHIP_TYPES(18)，仅呈现既有 | 同上 |
| 前端最小栈 | 仅 React+ReactDOM；图标库为唯一新增依赖，禁 neo4j/redis/graphql 等 FORBIDDEN_INFRA | `freeze-check.mjs` |
| 红线固化 | 规则①②③写入本契约，实现须通过 emoji-scan / freeze-check / 硬编码色扫描 | M62.5 Gate2 / VS-01 |

---

## 4. 验收标准：逐条回答「一个产品感」

> PO 验收核心命题：**「整个产品像一个产品，不是很多产品拼起来」**。以下逐条给出设计回答。

| # | 验收提问 | 设计回答（对应文档/规则） |
|---|----------|---------------------------|
| Q1 | 图标是否统一、无 emoji？ | 是。全锁 Lucide 2px 描边、16/20/24px（VS-01 §5，规则①）；30 触点图标总表（VS-02 §3）。 |
| Q2 | 配色是否一套、无紫粉渐变？ | 是。单一墨+纸+accent 体系，accent 纯色，禁紫粉渐变/glow/毛玻璃（VS-01 §1，规则②）。 |
| Q3 | 四主干是否同构、不各搞一套？ | 是。共享 Workspace 栅格、Rail 激活样式、标题位、卡圆角、真相刻度（VS-03 §7）；呼应 B3 §3 同构语法。 |
| Q4 | 是否无 AI 模板味（无占位/弹跳）？ | 是。零 Welcome/Lorem/猜你喜欢；缓动仅 linear/ease-in-out（VS-01 §6，规则③）；空态为真实语义文案。 |
| Q5 | 是否全 Token 化、无硬编码？ | 是。VS-02/VS-03 全引用 VS-01 Token 名；实现映射 CSS 变量（规则④）。 |
| Q6 | 是否每触点都映射到 IP-03 模式？ | 是。30 触点映射表全覆盖，无无模式元素（VS-03 §0，规则⑤）。 |
| Q7 | 真相刻度是否始终贴附、弱证据不隐藏？ | 是。TP-06/07/08 三件套贴任一结论；弱证据 `color-truth-weak` 陶土色显示不隐藏、不跳外链（VS-03 §2，ADR-0015 D7）。 |
| Q8 | Mirror 是否只读无出边、与下一步隔离？ | 是。TP-22 `lock`+浅底、无 Dock 操作、无外链；与 TP-16 实色+箭头视觉隔离（VS-03 §4，X-R5，ADR-0015 D2/D6）。 |
| Q9 | 下一步是否唯一、非推荐语汇？ | 是。TP-16 仅一个出口，5 个 ExplorationAction 类型，禁 recommendation 字样（VS-03 §5，X-R1/X-R6，ADR-0015 D1）。 |
| Q10 | Compare 是否可直入、不绕路？ | 是。TP-14 `P-Anchor+P-Switch` 直接入口，双栏同构 Panel（VS-03 §3，ADR-0015 D3）。 |
| Q11 | 首屏是否由探索承担、检索不主导？ | 是。TP-26 首屏承担者呈现真实可探索实体；TP-24 检索为次级小控件（VS-03 §1）。 |
| Q12 | 可达性是否达标（WCAG AA / 焦点 / 触控）？ | 是。焦点环 `a11y-focus-ring`、最小 44px 热区、对比 AA、reduced-motion 降级（VS-01 §7/§8）。 |
| Q13 | 冻结基线是否被尊重？ | 是。图标库走 Freeze Gate；不新增枚举/依赖（§3，VS-01 §10）。 |

> 结论：13 条验收全部有对应设计回答，「一个产品感」在 Token、组件、触点、契约四层一致落地。

---

## 5. 契约执行与回归

- **进入 Phase 5（实现）前**：本契约五条规则 + Article 0 三层契约须转为代码层 lint/扫描（emoji-scan、硬编码色扫描、freeze-check）。
- **回归门槛**：任一 Phase 5 PR 违反规则①②③④⑤任一条，视为破坏「一个产品感」，退回。
- **唯一权威**：VS-01 为 Token 唯一源；本文档为规则唯一源；二者冲突以 VS-01 Token 定义 + 本文档规则为准。

---
*VS-04 结束。Phase 4 视觉契约固化，五条规则 + 三层契约 + 13 条验收全部闭合。*
