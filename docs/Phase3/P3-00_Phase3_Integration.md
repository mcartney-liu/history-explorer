# Phase 3 — Interaction Architecture 集成与 Gate 关闭

> FRW 六步法 · Phase 3（Interaction Architecture / 交互架构）
> 日期：2026-08-07
> 角色：项目总监（大湾区靓仔）
> 上游：Phase 2 体验架构（B1–B5 + A1–A3）· FRW 冻结 v1.1 · ADR-0013 / ADR-0015
> 本文：集成校验 + Exit Criteria + 移交 Phase 4 的事实

---

## 0. Phase 3 使命回顾（不跑偏）

> 唯一目标：**设计人与产品如何交互 = 操作逻辑**。不是颜色、不是字体、不是视觉、不写代码。

验收标准：**任何入口、任何能力，交互方式一致、学习成本一致；不存在「这里一种交互、那里另一种交互」。** 满足 → 进 Phase 4。

---

## 1. 交付物清单（3 份，docs/Phase3/）

| 文件 | 角色 | 内容 |
|------|------|------|
| `IP-01_interaction_specification.md` | 交互规范总纲 | 14 术语词汇表 + 20 维度统一规则（§2.1–§2.20）+ 禁用清单 X-R1~X-R8 + 八条一致性原则 + 逐条落实 B3 §9 八守则 |
| `IP-02_interaction_contract.md` | 交互契约 | TP-01…TP-30 全量契约化（点击/导航/返回/展开/折叠/切换/反馈/状态切换/衔接），节点集 = C01–C30 |
| `IP-03_interaction_pattern_library.md` | 交互模式库 | 12 模式（P-Anchor…P-Animation）+ 容器族（Workspace/Companion/Panel/Dock/Rail）统一规范 |

---

## 2. 三份一致性校验

| 校验项 | 结果 | 依据 |
|--------|------|------|
| IP-01 维度规则 = IP-02 触点援引 | 一致 | IP-02 §9 每触点字段援引 IP-01 规则编号（C-/N-/B-/E-/F-/S-/W-/P-/A-/D-/R-/FB-/AN-/ST-/PP-/TS-/NP-/ME-/CD-） |
| IP-02 触点 = IP-03 模式抽取 | 一致 | IP-03 §14 模式→触点→规则映射总表 |
| 节点集锁定 C01–C30 | 一致 | IP-02 §8 计数 9+7+1+2+6+5=30，并集=C01–C30、交集空 |
| 无新增/遗漏能力 | 一致 | 全流程节点集与上游客体（B3 §8）恒等 |

---

## 3. Exit Criteria 自检（四问全通过）

| 判据 | 结果 | 依据 |
|------|------|------|
| 任何入口、任何能力，交互方式一致 | ✅ | IP-01 §5 八条一致性原则；四主干同构语法（锚点→关系→理由→推进） |
| 学习成本一致 | ✅ | IP-01 §1 统一词汇表 + 同构语法（学会一次四处通用） |
| 不存在「这里一种交互、那里另一种交互」 | ✅ | X-R3 禁用多套范式 + X-R4 禁用第五主干 + 容器族在四主干一致 |
| 不跳出产品 / 无断裂 | ✅ | N-1 单容器 + PP 常驻保全 + B3 §7 转移矩阵无死角 |

**附加红线遵守（来自裁决与冻结基线）：**
- ✅ 禁用推荐语汇（X-R1 / A2 命名红线 / P1-01 X01）
- ✅ 禁用弹跳缓动 `cubic-bezier(0.68,-0.55,0.265,1.55)`（X-R2 / AN-2）
- ✅ TP-16 下一步唯一出口 = A2 `ExplorationAction`，五 actionType，旧 `/recommendations` 无位置（X-R6 / A3 §2）
- ✅ Mirror 无出边、不作 Policy 输入、不持久化画像（X-R5 / ADR-0013 D3 / ADR-0015 D2+D6）
- ✅ 零视觉/颜色/字体/代码定义，零 emoji

---

## 4. 关键结论

1. **交互层红线闭合**：C-01/C-02 的「下一步」在 Phase 2 契约解耦后，于 Phase 3 获统一交互表达——全产品唯一出口、认知缺口驱动、禁用推荐语汇，与 A2 `ExplorationAction` 五 actionType 完全对齐。
2. **C1–C4 体验落点在交互层固化**：下一步非推荐（C1）/ 真相刻度三件套贴结论（C2）/ 对比 P0 可直入（C3）/ Mirror L4.5 只读终点（C4）均转为可复用交互模式（P-Next / P-Scale / P-Switch / P-Anchor-Mirror）。
3. **四主干同构 = 学习成本一致的根**：用户只需学会「锚点→关系→理由→推进」一次，Explore/Understand/Compare/Mirror 四处通用；Mirror 推进格为空是唯一刻意差异（即终点语义）。
4. **移交 Phase 4 的事实**：
   - 任何视觉实现必须映射到 IP-03 某一模式，不得新造范式（守 X-R3）；
   - 视觉层须表达 IP-01 禁用清单（禁弹跳缓动、禁推荐语汇）；
   - 容器族（Workspace/Companion/Panel/Dock/Rail）交互已定，Phase 4 只补视觉皮肤；
   - C14 对比数据供给仍是 Phase 4/5 前置数据任务（与 Phase 2 提示一致）。

---

## 5. Gate 状态

**Phase 3 Interaction Architecture：EXIT CRITERIA 全通过 → Gate 关闭，可进 Phase 4（Visual System）。**

仍 OPEN 不阻塞项：OD-01 / OD-03 / OD-04 / OD-05（北极星度量 / P09 前台 / 旧文档同步 / 跨学科原子化）+ Phase 0 残留 R2/R3/R4/R7/R8。

---

## 6. 下一步（等 PO「动工」进 Phase 4）

Phase 4（Visual System）唯一目标 = 统一整个产品视觉，视觉永远服务体验。须统一：Design System / Color / Typography / Spacing / Layout / Grid / Component / Icon / Motion / Accessibility / Responsive，组件（Card/Panel/Dialog/Toolbar）。验收 = 整个产品像一个产品，不是很多产品拼起来。

移交物：本 Phase 3 三份文档即 Phase 4 的唯一交互依据。
