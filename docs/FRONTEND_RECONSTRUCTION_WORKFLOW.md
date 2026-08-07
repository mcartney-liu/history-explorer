# History Explorer Frontend Reconstruction Workflow（Frozen v1）

> **状态：FROZEN**
>
> 任何 Agent 不允许跳阶段。
> 每一阶段必须完成验收才能进入下一阶段。

---

## 权威级别（ADR 同级）

- 本文件与 ADR 同级，**具有冻结治理决策的强制约束力**。
- 正式采纳记录见 **`docs/15_DECISIONS/ADR-0012_frontend_reconstruction_workflow_frozen.md`**（Status: Accepted / Frozen）。
- 适用权威入口：`docs/10_ARCHITECTURE/CURRENT_ARCHITECTURE_BASELINE.md` §8 已引用本流程。
- 维护者：项目总监（大湾区靓仔）。
- 变更机制：冻结后任何修改须走 Freeze Revision Gate（ADR + 架构评审 + PO 批准），就地追加版本并记录原因；**禁止在分支、临时对话或未来里程碑中"重新发明一套流程"替代本文件**。

---

## 强制适用范围（不可协商）

> 以后 History Explorer **任何前端重构、UI 重构、交互重构、新团队接手**，**全部必须按照这一套流程执行**。

具体至少包括（不限）：

- 前端整体重构、局部页面重构、面板重组；
- UI 重构（视觉系统、组件库、Design System 调整）；
- 交互重构（导航、Workspace、Companion、Panel 行为统一）；
- 引入新能力时的前端接入（须从 Phase 0 重新评估，而非直接改前端打补丁）；
- 新团队 / 新 Agent 接手前端工作——第一步即阅读本文件建立流程认知。

---

# Phase 0

# Product Discovery（产品理解）

## 唯一目标

> **让新团队真正理解 History Explorer 是什么产品。**

不是理解 React。

不是理解代码。

而是理解产品。

---

## Agent 必须阅读

必须完整阅读项目文档。

包括但不限于：

产品

PRD

Roadmap

Milestone

ADR

Architecture

Backend

Design System

UX

Interaction

AI Runtime

Data Model

Explorer Runtime

Knowledge Graph

Capability

等等全部文档。

同时：

分析代码。

分析目录。

分析 Runtime。

分析已有实现。

---

## Agent 必须完成

建立完整产品认知。

包括：

产品定位

产品目标

目标用户

产品价值

产品核心能力

产品边界

能力之间关系

未来规划

冻结原则

设计原则

所有约束

不能遗漏。

---

## Agent 输出

Product Discovery Report

内容至少包括：

产品定位

产品能力全景

能力关系图

产品原则

产品约束

产品边界

产品未来方向

---

## 验收标准

能够回答：

History Explorer 为什么存在？

核心价值是什么？

哪些能力属于核心？

哪些属于辅助？

为什么这样设计？

未来为什么还能继续扩展？

答不出来。

禁止进入 Phase 1。

---

# Phase 1

# Capability Validation（能力验证）

## 唯一目标

> **确认产品能力正确。**

不是讨论 UI。

不是讨论页面。

只讨论：

能力。

---

## Agent 必须做

逐项检查：

每一个能力。

每一个模块。

每一个 Runtime。

每一种数据。

每一种交互能力。

检查：

是否重复。

是否冲突。

是否断裂。

是否孤立。

是否废弃。

是否违反原则。

是否违反冻结规则。

是否存在能力无法被用户使用。

---

## 输出

Capability Inventory

Capability Relationship Map

Capability Validation Report

Capability Gap Report

---

## 验收标准

最终形成：

一张完整能力地图。

回答：

产品有哪些能力？

能力如何协同？

能力缺什么？

能力哪些不能改？

全部确认。

才能进入 Phase 2。

---

# Phase 2

# Experience Architecture（体验架构）

## 唯一目标

> **设计用户如何体验这些能力。**

注意：

不是页面。

不是组件。

不是按钮。

是：

体验。

---

## Agent 必须做

重新设计：

User Journey

User Flow

Experience Loop

Mental Model

Information Architecture

Navigation

Explorer Session

Mode

Workspace

Context

理解路径

探索路径

等等。

重点：

保证：

所有能力

都能自然进入体验。

不能遗漏。

不能孤岛。

---

## 输出

Experience Architecture

User Journey

Navigation Architecture

Experience Contract

Explorer Workflow

---

## 验收标准

回答：

第一次来的用户。

十五分钟。

能够顺滑体验所有能力吗？

任何能力是否需要跳出产品？

是否出现多个产品感觉？

是否存在体验断裂？

全部解决。

进入 Phase 3。

---

# Phase 3

# Interaction Architecture（交互架构）

## 唯一目标

> **设计人与产品如何交互。**

不是颜色。

不是字体。

而是：

操作逻辑。

---

## Agent 必须做

统一：

交互规范

点击行为

导航行为

返回行为

展开

折叠

切换

Workspace

Companion

Panel

Dock

Rail

反馈

动画逻辑

状态切换

所有交互行为。

全部统一。

---

## 输出

Interaction Specification

Interaction Contract

Interaction Pattern Library

---

## 验收标准

任何入口。

任何能力。

交互方式一致。

学习成本一致。

不存在：

这里一种交互。

那里另一种交互。

才能进入 Phase 4。

---

# Phase 4

# Visual System（视觉系统）

## 唯一目标

> **统一整个产品视觉。**

注意：

视觉永远服务体验。

不是反过来。

---

## Agent 必须做

统一：

Design System

Color

Typography

Spacing

Layout

Grid

Component

Icon

Motion

Accessibility

Responsive

所有视觉规范。

统一：

组件。

Card。

Panel。

Dialog。

Toolbar。

全部统一。

---

## 输出

Visual Design System

Component Library

UI Specification

Visual Contract

---

## 验收标准

整个产品：

像一个产品。

不是很多产品拼起来。

进入 Phase 5。

---

# Phase 5

# Frontend Implementation（前端实施）

## 唯一目标

> **严格按照前四阶段实施。**

不是重新设计。

不是讨论方案。

而是：

落地。

---

## Agent 必须做

制定：

Migration Plan

Task Plan

Priority

Risk

Implementation

Coding

Testing

Review

Acceptance

全部执行。

---

## 输出

Implementation Plan

Implementation Report

Acceptance Report

---

## 验收标准

最终产品：

所有能力可达。

所有体验一致。

所有规范一致。

未来新增能力：

无需推翻前端。

只需按照架构接入。

---

# 全流程铁律（冻结）

1. **不得跳阶段**：上一阶段未通过验收，不得进入下一阶段。
2. **不得提前设计**：例如在 Phase 0 讨论 UI、在 Phase 1 讨论颜色、在 Phase 2 写代码，均视为违规。
3. **每阶段必须有明确产出物**：没有文档、图、契约或报告，不算完成。
4. **每阶段必须有可验证的退出条件（Exit Criteria）**：不能以"感觉差不多"作为完成标准。
5. **任何新增能力必须重新从 Phase 0 开始评估接入方式**，而不是直接修改前端。
6. **前端必须服务产品能力，而不是让产品能力适应前端。**

---

# 元原则与 Gate

## 动工 Gate（最高优先级）

任何 Phase 的实际动工（拉团队、进入 Phase 1、写代码）**必须等 PO（翔哥）明确发出"动工"指令**。

总监可提前做需求澄清与治理落盘，但不得在未获"动工"前启动执行。

## 成果文档落盘资产原则（永久）

- 每一阶段产出物必须落盘到项目仓库 `docs/` 下对应目录，作为可复用资产。
- 文件命名带阶段与日期，建议格式：`FRW-{Phase}-{Artifact}-{YYYY-MM-DD}.md`（例：`FRW-Phase1-CapabilityValidation-2026-08-06.md`）。
- 阶段间信息流由总监中转，不在成员间直连；落盘文档即团队黑板（blackboard）事实源。
- 本冻结文档本身亦为资产，未来任何前端重构 / 新能力接入，第一步即引用本文件确认流程未被另起。

## 与团队标准 SOP 的阶段对齐（避免编号误读）

本流程的 Phase 0–5 是前端重构的**专属权威阶段划分**。它与项目通用 6-Phase SOP（调研 → Spec → 设计 → 开发 → 测试交付）在精神上一致，但本流程的编号与粒度以前端重构视角定义，未来团队以本文件为准：

| 本流程阶段 | 通用 SOP 对应关系（参考，非强制） | 核心动作 |
|------------|----------------------------------|----------|
| Phase 0 Product Discovery | 需求澄清 + 调研前置 | 理解产品，不碰 UI |
| Phase 1 Capability Validation | 调研（能力侧） | 验证能力，不碰 UI |
| Phase 2 Experience Architecture | 调研（体验侧） + Spec | 设计体验，不碰代码 |
| Phase 3 Interaction Architecture | 设计细化（交互） | 统一交互，不碰视觉 |
| Phase 4 Visual System | 设计细化（视觉） | 统一视觉 |
| Phase 5 Frontend Implementation | 开发 + 测试交付 | 落地 + 验收 |

铁律 2「不得提前设计」的精确含义：
- "在 Phase 0 讨论 UI" = 在产品理解阶段越界做视觉 / 交互设计；
- "在 Phase 1 讨论颜色" = 在能力验证阶段之前就锁定具体色值；
- "在 Phase 2 写代码" = 体验架构未确认就动手实现。

---

# 引用与演进

- 本文件是 Frontend Reconstruction Workflow 的**唯一冻结基线**，与 ADR-0012 互为引用。
- 演进只能经 **Freeze Revision Gate**：ADR + 架构评审 + PO（翔哥）批准，且必须就地追加版本并记录原因。
- 禁止在分支、临时对话或未来里程碑中"重新发明一套流程"替代本文件。
- 新增能力接入时，铁律 5 要求"重新从 Phase 0 评估接入方式"——即先把能力当作新产品需求走完整发现 → 验证 → 体验 → 交互 → 视觉 → 实施，而不是直接在前端打补丁。

---

## 变更记录

| 日期 | 版本 | 变更内容 | 原因 | 影响范围 | 批准 |
|------|------|----------|------|----------|------|
| 2026-08-06 | v1.0 (FROZEN) | 初始冻结：6 条全流程铁律 + 阶段映射 + 落盘资产原则 + 动工 Gate | PO 签发前端交互重新审视治理基线 | 全部未来前端重构 / 新能力接入 | 翔哥(PO) |
| 2026-08-06 | v1.1 (FROZEN) | 提升为 ADR 同级：新增 ADR 级元数据、强制适用范围（任何前端/UI/交互重构/新团队接手）、完整纳入 Phase 0–5 六阶段内容；新建 ADR-0012 正式采纳 | PO 要求与 ADR 同级、补充全流程细节 | 全部未来前端 / UI / 交互重构及新团队接手 | 翔哥(PO) |
