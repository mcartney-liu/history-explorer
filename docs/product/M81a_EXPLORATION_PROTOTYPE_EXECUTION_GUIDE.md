# M181a — Exploration Prototype Execution Guide

> **Product Validation Execution Manual（验证执行手册），非产品设计文档，非开发方案。**
> 本手册把 `M81a_EXPLORATION_PROTOTYPE_PLAN.md` 从"验证计划"细化为"如何执行一次真实体验验证"的操作手册。
> 消费 `M80.5_EXPLORATION_EXPERIENCE_DEFINITION.md`（A2 Exit PASS）。
> 不写任何代码、不创建生产页面、不进入 M83 / M83.5 实现、不触碰 Freeze Boundary（ENTITY=8 / RELATIONSHIP=18 / Runtime 0.13.0 / AI Trust Boundary）。

---

## 1. Validation Session Definition

**一次 M81a 验证会话的定义**：在受控环境下，由一名 Explorer 基于开放任务自然探索，Moderator 仅发任务、Observer 静默记录行为，以采集可客观计数的体验证据。

**测试角色**：

| 角色 | 职责 | 禁止 |
| --- | --- | --- |
| **Explorer（体验者）** | 执行任务脚本，自然行为，不被引导 | 不得被提示"应该点哪"；不得被暗示预期答案 |
| **Moderator（主持）** | 宣读任务脚本、回答"怎么操作"级问题 | 不得引导探索方向、不得评价内容、不得提示功能名 |
| **Observer（观察记录）** | 按第4/5节框架实时填表 | 不得与 Explorer 对话、不得解释界面、不得推断主观感受 |

**会话目标**：
- 采集 Explorer 在 First 5 Minutes 的三信号达成情况。
- 记录 Exploration Loop 八步是否自然发生。
- 识别 Object Model / Shell 是否被误读（图谱浏览器 / 百科 / 收藏夹）。
- 记录 AI 摩擦点位置（供 M63-A，不选型）。

**会话时间建议**：
- 单场 30–45 分钟：任务探索 15–20 分钟 + 轻访谈 10 分钟 + 归档 5 分钟。
- 不强制填满时间；Explorer 自然结束即停。

**环境要求**：
- 可呈现 M80.5 Object Model 语义的载体（详见 M81a 计划第6节允许范围：状态草图 / 现有 frontend 演示态 / paper prototype）。
- 静默录像或屏幕记录（仅行为，用于 Observer 回看核对，不进 Gate 主观裁定）。
- 无工程改动、无新数据接入。

**禁止**：设计产品功能（本手册只定义"如何验证"，不定义"产品该有什么"）。

---

## 2. Prototype Validation Flow

```
准备阶段
  ↓
任务发布（Moderator 宣读脚本）
  ↓
自由探索（Explorer 自然行为，Observer 记录）
  ↓
观察记录（实时填第4/5节表）
  ↓
轻访谈（仅追问"你刚才为什么这么做"，不引导）
  ↓
结果归档（生成第7节输出包）
```

**重点**：验证**用户行为**，不测试**功能**。
- 准备阶段：确认载体可用、角色就位、脚本一致。
- 任务发布：只念脚本原文（第3节），不演示、不举例。
- 自由探索：Explorer 自主决定每一步；Moderator 沉默。
- 观察记录：Observer 用发生制打勾，不写"感觉"。
- 轻访谈：问"你刚才为什么点这个 / 没点那个"，不教正确路径。
- 结果归档：按第7节模板落盘，不修饰结论。

---

## 3. User Task Script

基于 M81a 计划场景 A / B，生成给 Explorer 看的说明、Moderator 口径、禁止提示。

**场景 A — 制度承袭演化**（v2，2026-08-03 替换；原「秦统一与汉承秦制」因 KG 无数据取消）
- 给用户看的任务说明：
  > "请探索：一项制度是怎样一代代传下来、又慢慢变样的？你在探索过程中想到的任何问题，都可以随时记下来。"
- Moderator 口径：宣读上述说明；若 Explorer 问"怎么用"，答"就像平时了解一段历史那样去了解它"；不指向任何具体对象。
- 禁止提示内容：❌"点击这里"、❌"查看关系"、❌"使用某功能"、❌"看罗马节点"、❌"保存到 Trail"、❌ 提示具体朝代或制度名。

**场景 B — 思想/技术跨文明传播**
- 给用户看的任务说明：
  > "请探索：某个思想或技术是如何在不同文明之间流动的？你发现了什么关联都可以继续看下去。"
- Moderator 口径：同上，只念脚本；不指定思想/技术名称、不暗示对照对象。
- 禁止提示内容：❌"点击这里"、❌"比较功能"、❌"查看来源"、❌"使用筛选"。

**原则**：全程不得告诉用户操作路径或功能名；保持自然探索，任务只给"探索目标"，不给"操作指引"。

---

## 4. Observation Framework

### First 5 Minutes
观察（发生制打勾）：
- [ ] 是否知道自己探索什么（First 5 Minutes 锚点）
- [ ] 是否理解一个变化（信号1）
- [ ] 是否发现跨文明关联（信号2）
- [ ] 是否产生未知方向（信号3）

### Exploration Loop（八步）
逐步骤观察是否自然出现：
- [ ] 进入主题
- [ ] 获得上下文（理解）
- [ ] 发现关联 / 异常
- [ ] 提出问题
- [ ] 探索下一节点
- [ ] 形成个人路径（Trail）
- [ ] 留存（留下未完成问题）
- [ ] 回访意愿

### Object Model
观察用户是否把对象理解为：
- [ ] Entity → 主角（而非"节点"）
- [ ] Relationship → 作用力（而非"边/RELATION_TYPE"）
- [ ] Signal → 线索（而非"相似度分数"）
- [ ] CausalStatement → 故事（而非"三元组"）

失败退化信号（出现即记）：
- [ ] 节点浏览（只点列表不进叙事）
- [ ] 数据查询（把产品当检索工具）
- [ ] 百科阅读（当静态目录消费）

### Shell
观察用户是否理解：
- [ ] Trail ≠ 收藏（未要求"保存"才离开）
- [ ] Trail ≠ 历史记录（回到任一点恢复上下文，非孤立重开）
- [ ] Trail = 探索状态（感知"活着的探索"而非静态容器）

---

## 5. Evidence Recording Template

### 用户行为记录（逐条）
```
时间点：
行为：
触发原因（用户自述/可观察）：
下一步动作：
是否进入 Loop（对应八步之一）：
```

### AI Role Discovery 记录（按 M80.5 第5节四类）
记录用户在**哪一步**产生摩擦（仅记位置，不判形态）：
- **Interpreter（解释）**：步骤2/3 卡在"为什么"（理解困难）
- **Guide（向导）**：步骤3/5 不知下一步点哪（选择困难）
- **Navigator（导航）**：步骤1/5/7 路径不清（迷失）
- **Analyst（分析）**：步骤3/4 想比较不同文明（比较需求）

**禁止**：基于上述记录直接判断 AI 产品形态（Companion / Toolbox）。选型留 M83 前。

---

## 6. PASS / FAIL Gate Criteria

**判定语言：禁用"感觉成功"。** 一律以第5节量化阈值 + 本手册观察框架的客观打勾为准。

**PASS（满足全部，放行 M81b / M82 并行展开）**：
- ≥ 80% 测试者完成 First 5 Minutes 三信号中至少两个。
- ≥ 60% 测试者主动产生下一探索方向。
- ≥ 50% 测试者产生未完成问题或回访意愿。
- 且失败退化信号（第4节 Object Model/Sell 失败项）在 < 50% 测试者出现。

**NEED REVISION（返回 M80.5 修正定义，不进大规模工程）**，出现任一即判：
- 用户无法完成 First 5 Minutes（三信号均不达成）。
- 用户退化为图谱浏览器（节点浏览 / 数据查询 / 百科阅读高频出现）。
- 用户无法形成探索路径（无带顺序对象序列）。
- 用户没有产生继续探索意愿（零回访意愿 + 零未完成问题）。
- 或失败退化信号在 ≥ 50% 测试者出现（数量达标也不掩盖误读）。

---

## 7. Validation Output Package

验证完成后必须产出：

1. **Prototype Observation Report**：逐人行为记录（第5节模板）+ 观察框架打勾汇总。
2. **Exploration Loop Findings**：八步自然发生率、断裂步、动机失效点。
3. **Object Model Findings**：四类语义理解率、退化类型分布。
4. **Shell Interpretation Findings**：Trail 三性质（非收藏/非历史/是状态）误读率。
5. **AI Need Evidence Report**：第5节四类摩擦点按 Loop 步骤频次表。
6. **M80.5 Revision Recommendation**（如 NEED REVISION）：回 A2 修正的具体定义层建议，不擅自改母文档。

---

## Boundary Check（执行手册自我合规核验）

- **是否越界进入 M83 / M83.5？** 否。本手册未定义 Trail 存储/Shell 实现，未实现 AI Runtime/Agent；仅观察与记录，实现归 M83 / M83.5。
- **是否触碰 Freeze Boundary？** 否。未改 ENTITY=8 / RELATIONSHIP=18、未碰 Runtime 0.13.0、未破 AI Trust Boundary（KG=事实层 / AI=解释层）、未改 Ontology / Schema。
- **是否把 Trail 错误理解为收藏？** 否。第4节 Shell 观察显式区分 Trail ≠ 收藏、= 探索状态；第6节将"要求保存才离开"列为失败信号。
- **是否把 AI 变成预设功能？** 否。第5节仅记录摩擦位置，第6/7节禁止基于观察预裁 Companion/Toolbox；AI 始终为"需求发现"非"功能实现"。

---

**M181a Execution Guide Review Result：PASS**
