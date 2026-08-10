# M81a — Prototype Carrier Decision（验证载体决策记录）

> **Product Validation Decision Record（产品验证决策记录），非工程方案。**
> 本文档评估 M81a 验证"用什么承载"，不写代码、不创建页面、不进入 M83 / M83.5、不修改 frontend/backend、不修改 M80.5、不设计新 UI。
> 决策目标：M81a 验证的是"用户是否产生探索行为"，**不是验证 UI**。载体仅服务于体验行为观察。

---

## 候选方案

- **Option A：Existing Frontend Demo State（现有 frontend 演示态）**
- **Option B：Paper Prototype / Flow Prototype（纸面/流程原型）**

---

## 评估维度对照

| 维度 | A. Existing Frontend Demo | B. Paper Prototype |
| --- | --- | --- |
| 是否支持 First 5 Minutes 验证 | 若 frontend 已含基础探索入口/Entity/Relationship/Timeline，则可直接观察三信号 | 可手绘首屏剧本路径，但跨文明跳转/停留需人工推进，真实度低 |
| 是否支持 Exploration Loop 观察 | 真实交互流天然产生八步行为，Observer 直接记录 | 需主持者翻页模拟，Loop 节奏被人为控制，易失真 |
| 是否支持 Object Model 语义验证 | 若 frontend 已按 M80.5 3.2 呈现语义（主角/作用力/线索/故事），可直接验防退化 | 只能呈现静态草图，难验证"是否退化为节点浏览" |
| 是否支持 Shell 三层状态验证 | 若 frontend 已有 Trail/Open Threads 演示态，可观察"探索状态"感知 | 三层状态需手工标注，用户难自然感知"活着的探索" |
| 是否引入 UI 偏差 | **风险点**：若 frontend 有 UI bug，用户卡住是"UI 问题"而非"探索逻辑问题"，污染观察 | 无真实 UI，不引入 UI 偏差，但引入"人工模拟偏差" |
| 是否违反 M81a 边界 | 不违反（仅用现有演示态，不改码、不落 Trail 实现） | 不违反 M81a 边界（纯纸上，无代码/无实现） |

---

## 1. 推荐方案

**Option A：Existing Frontend Demo State（在确认准入条件满足的前提下）**

理由见下。但若 frontend 当前**不满足**下方"执行前置条件"中的任一准入项，则降级采用 Option B。

---

## 2. 推荐理由

- **真实程度最高**：Explorer 在真实交互流中自然产生 Loop 八步，Observer 记录的行为最接近实际产品体验，证据可信度高于纸面模拟。
- **直接验证防退化**：若 frontend 已按 M80.5 Object Model 语义呈现（非节点/边/分数），可现场观察是否退化为图谱浏览器——这是 M81a 核心判据，纸面难以复现。
- **Shell 可感知**：若演示态已含 Trail / Open Threads 初步呈现，用户能自然感知"探索状态"而非收藏/历史，直接验证第4节红线。
- **成本最低**：复用现有资产，不开新 Figma/Stitch 设计，避免重开 Museum/Shell/UI 讨论、偏离 M80.5。

---

## 3. 不选方案风险（Option B 的风险，以及 A 不满足条件时的兜底说明）

**若强行只用 Option B（Paper Prototype）的风险**：
- Loop 节奏由主持者翻页控制，行为非自然发生，Gate 裁定依据失真。
- Object Model 防退化、Shell 三层感知难以真实观察，可能得出"伪 PASS/伪 FAIL"。
- 人工模拟偏差 ≠ 产品真实偏差，决策依据薄弱。

**Option A 自身风险（即为何需前置条件）**：
- 若 frontend 存在 UI bug 导致用户卡住，Observer 无法区分"UI 卡住"与"探索逻辑卡住"，污染 First 5 Minutes / Loop 观察。
- 此时应切到 Option B 作为纯逻辑验证兜底，而非修 frontend（修 frontend = 进入工程，违反边界）。

---

## 4. 执行前置条件（Option A 准入门槛，须 PO 拍板满足后方可采用 A）

采用 Option A 前，**必须**确认现有 frontend 演示态已具备：
1. 基础探索入口（主题/事件进入，非全库罗列）
2. Entity 展示（按 M80.5 3.2 语义，非裸节点）
3. Relationship 展示（作用力语义，非 RELATION_TYPE 原值）
4. Timeline / 因果链呈现能力
5. Exploration flow（点击→展开→深入→返回 可走通）
6. 无阻断性 UI bug（否则触发 Option B 兜底）

若上述任一不满足 → **采用 Option B 兜底**，且不在 M81a 内修补 frontend（修补归工程里程碑，越界）。

---

## 决策待办（PO 产品决策点，Agent 不代裁）

- [ ] PO 确认 frontend 是否满足前置条件 1–6 → 定 Option A 或 B
- [ ] 若 A：指定用于验证的演示态入口与环境
- [ ] 若 B：指定纸面原型覆盖范围（仅流程，不设计视觉）

---

## Boundary Check

- **进入 M83 Trail 实现？** 否。本文仅决策验证载体，不实现 Trail 持久化/Shell。
- **进入 M83.5 AI？** 否。未实现 AI Runtime/Agent，仅沿用 M80.5 第5节观察框架。
- **修改 frontend/backend？** 否。仅评估现有演示态，不改动任何代码。
- **修改 M80.5？** 否。全文引用母文档定义，未改一字。
- **设计新 UI？** 否。Option B 仅限流程草图，不产出视觉/组件设计。
- **Freeze Boundary（8/18 / Runtime 0.13.0 / AI Trust Boundary / Ontology / Schema）？** 未触碰。

> 本决策记录本身不构成载体选定结论；最终选型由 PO 依据"执行前置条件"拍板后填入上方决策待办。
