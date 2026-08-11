# 事件研究面板 UI 优化 Brief（给 UI 设计师）

> 用途：前端「实体详情页 → 研究 tab」中，**仅事件（Event）类型**实体比其余 7 种类型多展示的 4 个专属面板。本文档提取这 4 个面板**当前已展示的全部信息**，供 UI 重新设计布局。
> 来源：前端源码 `frontend/src/components/Event{CausalChain,ImpactPanel,NarrativeCard,NarrativeJourney}.tsx` 实读。
> 注意：本文档只描述「展示什么」，不规定「怎么排」——布局/视觉完全交给 UI。

---

## 0. 范围与容器

- 这 4 个面板挂在 `EntityPage.tsx` 研究 tab 的「**事件专属**」分组内，分组标题旁带一个 `仅事件` 徽标（badge），表示只有类型为 Event 的实体才渲染。
- 其余 7 种实体类型（Person / Civilization / Religion / Concept / Place / Organization / Technology 等）**不展示**这 4 个面板，只有「研究主区」（提问框 + 研究存档 + 相关实体列表）和「解读与 AI」区。
- 4 个面板在「事件专属」分组内按顺序自上而下排列：因果链 → 长期影响 → 历史叙事 → 探索旅程。

---

## 1. 面板一：事件因果链（EventCausalChain）

- **aria-label / 标题**：`事件因果链`
- **数据来源**：当前实体的关系列表（`relationships`），内部过滤「另一端也是 Event」且关系类型为以下两类：
  - 因果类：`caused`（导致）、`influenced`（影响）
  - 时间类：`before`（之前）、`after`（之后）
- **展示结构**：
  - **空态**：标题 + 文案「暂无因果链数据。随着知识图谱的丰富，这里将展示事件的因果关联。」
  - **有数据**，分三段纵向排列：
    1. **上半组「导致此事件」**（incoming 关系）：每条 = 一个可点击节点（节点上方显示「类型标签」+「实体名称」）+ 一条关系箭头文字
    2. **中心节点**：当前事件本身（类型标签 `Event` + 事件名称）
    3. **下半组「此事件导致」**（outgoing 关系）：结构同上
- **箭头文字映射**（关系方向决定措辞）：
  - `caused`：incoming 显示「→ 导致」/ outgoing 显示「导致 →」
  - `influenced`：incoming 显示「→ 影响」/ outgoing 显示「影响 →」
  - `before`：显示「← 在之前」
  - `after`：显示「在之后 →」
- **视觉区分**：因果类箭头用 `ecc-causal` 样式类，时间类用 `ecc-temporal` 样式类（当前仅靠样式类区分，无颜色/图标约定，UI 可强化）。
- **交互**：每个节点按钮可点击 → 跳转到该关联实体。

---

## 2. 面板二：长期影响（EventImpactPanel）

- **aria-label / 标题**：`长期影响`
- **副标题**：`· 此事件影响了 N 个实体`（N = 命中的关联实体总数，动态）
- **数据来源**：关系列表过滤「outgoing 方向 + 另一端不是 Event + 关系类型 ∈ {influenced, caused, spread, invented, discovered, conquered, related_to}」
- **展示结构**：
  - **空态**：标题 + 文案「暂无影响数据。随着知识图谱的丰富，这里将展示此事件对文明、技术、宗教等方面的长期影响。」
  - **有数据**：按「被影响实体的类型」分组（groupByType），每组：
    - **组标题**：被影响方的类型中文标签（如「文明」「技术」「宗教」…由 `getEntityLabel` 取）
    - **列表**：每条 = 可点击节点（类型标签 + 实体名称）+ 一个关系标签徽标（关系中文名，由 `getRelationshipLabel` 取，如「影响」「导致」「传播」…）
- **交互**：节点点击 → 跳转关联实体。
- **设计要点**：这是一个「一对多」的影响扩散视图，分组维度是「受影响实体类型」，UI 可考虑用分类卡片/标签云/辐射图表达。

---

## 3. 面板三：历史叙事（EventNarrativeCard）

- **aria-label / 标题**：`历史叙事`
- **性质**：4 个面板中**唯一调用 AI** 的（基于知识图谱生成带事实溯源的叙事；AI 网关默认关闭时多数情况走 error/ idle 态）。
- **数据来源**：当前实体 `global_id` + 名称 + 关系（仅用于统计计数）。
- **展示结构**：
  - **上下文徽标（条件显示）**：
    - 若有因果关联：{causeCount} 条因果关联
    - 若有影响实体：{impactCount} 个影响实体
  - **引导文案**：「AI 基于知识图谱生成 {实体名} 的历史叙事。选择一个角度开始探索。」
  - **3 个预设叙事角度按钮**（点击触发 AI 生成，按钮带 active 高亮态）：
    | 按钮文字 | 实际提问（AI prompt） |
    |---------|----------------------|
    | 历史影响 | 这个事件如何影响历史进程和后世文明？ |
    | 前因后果 | 导致这个事件发生的关键原因是什么？后续又引发了什么？ |
    | 多文明视角 | 不同文明如何理解这个事件？它如何跨越文明边界传播影响？ |
  - **四态**：
    - `idle`：文案「点击上方按钮，AI 将生成带事实溯源的历史叙事。」
    - `loading`：文案「AI 正在生成历史叙事…」（role=status）
    - `error`：文案「AI 叙事生成失败（{错误}）。你可以继续浏览确定性知识图谱。」（role=alert）
    - `success`：渲染 `GroundedAnswer`（带事实溯源的回答）+ `CitationList`（引用列表，引用可点击跳转）
- **交互**：3 个角度按钮、引用跳转。
- **设计要点**：这是「生成式 + 有 loading/error 边界」的面板，UI 需注意加载态/失败态不破坏整体布局（失败时区块仍占位、不塌陷）。

---

## 4. 面板四：探索旅程（EventNarrativeJourney）

- **aria-label / 标题**：`探索旅程`
- **副标题**：「以下是与 {实体名} 直接关联的事件，按因果和时间顺序排列。点击任意节点继续探索。」
- **数据来源**：关系列表过滤「另一端是 Event + 类型 ∈ {caused, before, after, influenced}」，并按优先级排序：`caused` > `before/after` > `influenced`。
- **展示结构**：
  - **空态**：标题 + 文案「暂无探索路径数据。随着知识图谱的丰富，这里将展示从当前事件出发的历史探索旅程。」
  - **有数据**，纵向"链条"三段：
    1. **上段（incoming）**：每个节点 + 向下箭头；箭头关系文字：
       - `caused`：由…导致
       - `influenced`：受影响于
       - `before`：在…之前
    2. **中心节点**：当前事件 + 「当前」标记（一个 `circle` 图标 + 文字"当前"）
    3. **下段（outgoing）**：箭头 + 节点；关系文字：
       - `caused`：导致了
       - `influenced`：影响了
       - `after`：在…之后
  - **跨主题徽标**：若关联事件所属数据集（topic）与当前事件不同，节点上显示该 topic 名称徽标（如 `roman_empire`），提示"这是另一个知识领域的事件"。
- **节点内容**：类型标签 + 实体名称 + （可选）跨主题徽标。
- **交互**：节点点击 → 跳转关联事件。
- **设计要点**：与面板一（因果链）信息高度重叠（都是 Event→Event 因果/时间），区别在于本面板强调"时间顺序排列的旅程感"且带"当前"锚点与跨主题标记。UI 可考虑与面板一合并或拉开视觉差异，避免用户觉得重复。

---

## 5. 四个面板的共性与给 UI 的提示

| 维度 | 因果链 | 长期影响 | 历史叙事 | 探索旅程 |
|------|--------|---------|---------|---------|
| 是否确定性知识（非 AI） | ✅ | ✅ | ❌（AI，可失败） | ✅ |
| 核心数据 | Event→Event 因果/时间 | Event→非Event 影响 | AI 生成叙事 | Event→Event 因果/时间 |
| 空态文案 | 有 | 有 | 有（idle） | 有 |
| 节点可点击跳转 | ✅ | ✅ | 仅引用可跳 | ✅ |
| 与"因果"信息重叠 | — | 部分 | — | 与因果链重叠 |

**提示**：
- 面板一（因果链）与面板四（探索旅程）数据同源、视觉易重复，UI 可评估合并或强化差异。
- 面板三（历史叙事）是唯一 AI 面板，必须保留 loading / error / idle / success 四种状态且不影响其他面板布局。
- 所有实体名称当前已走双语机制（中文界面显示中文名），UI 无需处理多语言，但需预留英文/日文切换时的文案空间。

---

## 6. 设计红线约束（防止设计跑偏——来自产品规范）

- **主题**：当前为暗色 + 暗金（gold/accent）主题，UI  redesign 须保持该调性。
- **禁止 emoji 作功能图标**：所有图标须用统一 SVG 图标方案（当前锁 Lucide 风格，2px 描边，16/20/24px），不可用 emoji。
- **禁止紫色→粉色渐变**主视觉（尤其避免"紫粉渐变 + 发光边框 + 毛玻璃"套路）。
- **禁止 AI 模板味**：文案须具体（如本 Brief 中的真实引导语），不用 "Welcome / Lorem ipsum" 等占位。
- **禁止硬编码颜色**：须用设计 Token（当前 CSS 变量 `--color-ink-*` / `--color-accent*` / `--color-paper-*` 等），不写死色值。
- **无障碍**：节点为 `<button>`，关系为带 `role` 的状态文案，UI 须保留可聚焦/可点击语义。

---

## 7. 附：当前样式类名（供还原/对照，非强制沿用）

- 因果链：`event-causal-chain` / `ecc-title` / `ecc-group` / `ecc-list` / `ecc-node` / `ecc-arrow` / `ecc-causal` / `ecc-temporal`
- 长期影响：`event-impact-panel` / `eip-title` / `eip-subtitle` / `eip-group` / `eip-group-type` / `eip-list` / `eip-node` / `eip-rel-badge`
- 历史叙事：`event-narrative-card` / `enc-title` / `enc-context` / `enc-badge` / `enc-hint` / `enc-prompts` / `enc-prompt-btn` / `enc-loading` / `enc-error` / `enc-result` / `enc-idle-hint`
- 探索旅程：`event-narrative-journey` / `enj-title` / `enj-subtitle` / `enj-chain` / `enj-segment` / `enj-step` / `enj-node` / `enj-center` / `enj-rel-badge` / `enj-topic-badge`
- 容器分组：`entity-research-group` / `entity-research-group--event` / `entity-research-group__title` / `entity-research-group__badge`
