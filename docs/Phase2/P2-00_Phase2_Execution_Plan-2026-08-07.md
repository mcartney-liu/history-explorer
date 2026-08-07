# Phase 2 开工清单（Execution Plan）—— Experience Architecture

> 日期：2026-08-07
> 依据：FRW 冻结 v1.1（ADR-0012）+ ADR-0015（Phase 1 裁决）+ P1-00 集成文档
> 状态：待 PO 发「动工」后执行
> 起草：项目总监（大湾区靓仔）

---

## 0. Phase 2 定位与边界（FRW 铁律复述）

FRW 工作流对 Phase 2 的权威定义是 **Experience Architecture（体验架构）**：

- **唯一目标**：设计用户如何体验这些能力。
- **不是**：页面、组件、按钮、颜色、代码。
- **是**：体验、User Journey、Experience Loop、Mental Model、Information Architecture、Navigation、Explorer Session、理解路径、探索路径。
- **铁律 2（不得提前设计）**：在 Phase 2 写代码 = 违规。本阶段只产文档/图/契约。
- **验收标准（Exit Criteria）**：第一次来的用户，15 分钟内能顺滑体验所有能力吗？任何能力是否需要跳出产品？是否出现多个产品感觉？是否存在体验断裂？全部解决 → 进 Phase 3。

**本清单的双重角色**：① 红线解耦前置（架构契约补全，不碰代码）；② Phase 2 体验架构主体的工作包分解与执行顺序。

---

## 1. 入口条件确认（已满足）

ADR-0015 八项裁决已于 2026-08-07 全部 RESOLVED（详见 `docs/15_DECISIONS/ADR-0015_phase1_adjudication.md` 与 `OPEN-DECISIONS.md`）：

| 未决项 | 裁决 | ADR 锚点 |
|--------|------|----------|
| OD-02 / Q-02 | Mirror 落 L4.5 只读投影出口 | D2 |
| Q-01 / Q-03 | 丙·分层共存：recommend_next 内部化 + ExplorationPolicy + ExplorationAction | D1 |
| R5 | C14 跨文明对比提 P0 | D3 |
| Q-04 | Explanation 分层仲裁（AI > Causal > 模板） | D4 |
| Q-05 | Package 承认纯前端能力 | D5 |
| OD-06 | Phase 2 不持久化，列 v2 | D6 |
| OD-07 | Evidence/Source 补用户出口 + 异议叙述 | D7 |

**结论**：Phase 2 入口条件已齐。仍 OPEN 的 OD-01/OD-03/OD-04/OD-05 与 Phase 0 残留 R2/R3/R4/R7/R8 **不阻塞** Phase 2，可在推进中并行处理。

---

## 2. 工作包总览（拓扑）

```
[A 红线解耦前置] ──→ [B 体验架构主体]
   A1 ExplorationPolicy 规则契约        B1 Experience Architecture（能力→体验映射）
   A2 ExplorationAction 输出契约        B2 User Journey（首访 15min）
   A3 recommend_next 降级路线           B3 Navigation Architecture
                                        B4 Experience Contract
  ── 已决能力在体验层的落点（C 包，映射进 B 产出）──
   C1 红线解耦的体验表达  ← 来自 A + D1
   C2 Evidence/Source 出口+异议叙述 ← 来自 D7（OD-07）
   C3 C14 跨文明对比 P0 入口 ← 来自 D3（R5）
   C4 L4.5 Mirror 只读出口 ← 来自 D2（OD-02）
```

**依赖关系**：A 必须在 B 之「前/中」闭合——否则体验架构里「下一步探索」无契约可依（ADR-0015 D1 Consequences 明示）。C 包不是独立阶段，而是把已决能力植入 B 各产出物的落点要求。

---

## 3. 工作包 A：红线解耦前置（架构契约补全，不碰代码）

> 对应 ADR-0015 D1。这是 Phase 2 真正的第一刀，**不写代码**，只产契约文档。

### A1 — ExplorationPolicy 规则契约
- **内容**：定义认知缺口驱动的选择算法契约。输入 = 当前用户的 coverageRatio / missingDimensions / missingConnections（来自已建图结构）；输出 = 候选集排序。明确拒绝「图相似度推荐」口径（M88.0 §8.3）。
- **产出**：`docs/Phase2/A1_exploration_policy_contract.md`（含伪代码级规则、输入/输出 schema、与 M88.0 的对照表）。
- **Exit Criteria**：契约可被后端工程师直接实现；明确标注哪些字段来自既有 runtime，哪些需新建。

### A2 — ExplorationAction 输出契约
- **内容**：定义对外暴露的 `ExplorationAction` 类型（Decision 载体）。字段至少含：actionType / targetEntity / rationale（RuleTrace：规则 id + 触发维度）/ coverageBeforeAfter。严禁使用 `recommendation` 命名。
- **产出**：`docs/Phase2/A2_exploration_action_contract.md`（OpenAPI/TS 类型草案）。
- **Exit Criteria**：前端可据此设计「下一步」呈现，无需知道后端算法细节。

### A3 — recommend_next 降级路线（与 D1 一致，不删测试）
- **内容**：明确 `recommend_next()` 改为内部候选生成器（不对外、不称 recommendation）；`GET /entity/{id}/recommendations` 公开端点下线；上层由 ExplorationPolicy 筛选后映射为 ExplorationAction。保留算法内核与 15 个测试（仅改命名与暴露方式，不删）。
- **产出**：`docs/Phase2/A3_recommend_downgrade_route.md`（含迁移步骤、前端调用点收敛清单）。
- **Exit Criteria**：旧端点在前端无新呈现设计（呼应 P1-05 §6 硬约束 1）；新 ExplorationAction 端点在 A2 已定义。

**A 包总 Exit Criteria**：A1+A2+A3 闭合后，「下一步探索」有可实现的契约 + 有对外出口 + 旧红线端点已规划下线。此时 B 包才可正式动笔体验设计。

---

## 4. 工作包 B：体验架构主体（FRW 六产出物取五）

按 FRW Phase 2 输出要求，产出以下 5 份（不含代码）：

### B1 — Experience Architecture（能力→体验映射）
- 把 P1-01 的 C01–C30 全部能力映射到体验触点，确保无能力孤岛、无体验断裂。L4.5 Mirror（C22）作为终点出口单列。
- 产出：`docs/Phase2/B1_experience_architecture.md`

### B2 — User Journey（首访 15 分钟路径）
- 设计「好奇进场 → 离场更聪明」的单次探索闭环；标注每个触点的能力来源（Cxx）。
- 产出：`docs/Phase2/B2_user_journey.md`

### B3 — Navigation Architecture
- 信息架构与导航，保证不跳出产品、不出现多个产品感。明确 Explore/Understand/Compare/Mirror 的导航主干。
- 产出：`docs/Phase2/B3_navigation_architecture.md`

### B4 — Experience Contract
- 体验契约：定义每个能力在体验层的「何时出现 / 何时结束 / 用户为何需要」与 Article 0 三层对齐（对象层/主体层/真值层）。
- 产出：`docs/Phase2/B4_experience_contract.md`

### B5 — Explorer Workflow
- 探索工作流：理解路径与探索路径的统一描述，含认知推进（C18）、成长度量（C19 continuityScore 会话态口径）、认知镜像（C22 L4.5）。
- 产出：`docs/Phase2/B5_explorer_workflow.md`

**B 包总 Exit Criteria**：首访用户 15 分钟能顺滑体验 C01–C30 全部能力；无跳出、无多产品感、无断裂。

---

## 5. 工作包 C：已决能力在体验层的落点（植入 B 产出）

四件事不是独立阶段，而是 B 各产出必须覆盖的硬要求：

| ID | 落点要求 | 来源裁决 | 在 B 包的落点 |
|----|----------|----------|--------------|
| C1 | 「下一步探索」在体验上不再叫推荐，呈现为认知缺口驱动的 ExplorationAction | D1（A 包支撑） | B2/B3/B4 的「下一步」触点 |
| C2 | Evidence/Source 给用户在结论处可见：证据强度分级 + 来源分级 + 异议叙述 | D7（OD-07） | B1/B4 的真相逼近触点；直接服务 Article 0 第三句 |
| C3 | 跨文明对比（C14）作为 P0 能力，在导航与首访路径有独立入口 | D3（R5） | B2/B3 的 Compare 主干 |
| C4 | Cognitive Mirror（C22）作为 L4.5 只读投影出口，反射用户自身轨迹，不投喂 | D2（OD-02） | B1/B4/B5 的终点出口；承载 Article 0 第二句 |

**注意 C4 与 OD-06 的耦合**：Mirror 只读投影不要求后端持久化（D6 裁决），Phase 2 用前端会话态 Trail/Memory 投影即可。

---

## 6. 不阻塞 Phase 2 的 OPEN 项（并行处理，不等）

以下项不阻塞 Phase 2 动工，但应在 B 包撰写时标注其影响，避免体验设计隐含未决假设：

- **OD-01**（北极星度量缺口）：understandingGrowthScore 公式已在 Phase 0 锁定，但 C19 continuityScore 因无持久化不可达（D6），Phase 2 先以会话态口径表达。
- **OD-03**（P09 前台形态）：C2 已覆盖其落地形态，无需另议。
- **OD-04**（旧文档同步）：PROJECT_CONTEXT/Product_DNA/PRD 旧定位同步，纯治理动作，不阻塞。
- **OD-05**（跨学科学原子化）：未来愿景，本期不预建。
- **R2/R3/R4/R7/R8**（Phase 0 残留）：属产品治理，非 Phase 2 体验架构阻塞项。

---

## 7. 与冻结 Gate 的关系

- 本清单本身不触发实施，仅规划。实施须等 PO 明确发 **「动工」**（FRW 动工 Gate 最高优先级）。
- 总监可在「动工」前继续做治理落盘（如本清单），但不得启动 Phase 2 执行团队或写代码。
- 进 Phase 3（Interaction Architecture）的硬门槛 = B 包 5 份产出 + A 包 3 份契约全部通过 Exit Criteria。

---

## 8. 建议执行顺序（供 PO 发「动工」后采用）

1. **A1 → A2 → A3**（红线解耦契约，约 1 个 focused 工作块）
2. **B1 → B3 → B2 → B4 → B5**（体验架构，B3 导航先于 B2 旅程，因旅程依赖导航主干）
3. C1–C4 在 B 撰写中同步植入，不作为独立排队。

**首刀提醒**：A 包是 Phase 2 真正的起点——`recommend_next` 降级后若无 ExplorationPolicy/Action 契约，「下一步」会暂时无对外出口（ADR-0015 D1 Consequences）。务必先闭合 A 再展开 B。

---

## 9. Phase 2 集成与 Gate 校验（2026-08-07 执行完成）

> PO 于 2026-08-07 授权「剩下的就靠你了」= 动工 Gate 放行。A 包（架构师）+ B 包（设计师）已按 A→B 顺序执行完毕，全程零代码改动，符合 FRW Phase 2 铁律。

### 9.1 八份产出物（全部落盘 docs/Phase2/）

| 工作包 | 文件 | 角色 | 核心产出 |
|--------|------|------|----------|
| A1 | A1_exploration_policy_contract.md | 架构师 | 认知缺口驱动 Policy 规则契约，5 条 ruleId+RuleTrace，逐条对照 M88.0 §8.3 |
| A2 | A2_exploration_action_contract.md | 架构师 | ExplorationAction 输出类型（actionType/targetEntity/rationale/coverageBeforeAfter），零 recommendation 命名 |
| A3 | A3_recommend_downgrade_route.md | 架构师 | recommend_next 降级内部候选生成器 + 下线公开端点 + 15 测试保留 + 前端调用点收敛清单 |
| B1 | B1_experience_architecture.md | 设计师 | C01–C30 → TP-01…TP-30 全量映射，孤岛 0、断裂接续 6/6 |
| B2 | B2_user_journey.md | 设计师 | 首访 15min 六段 T1–T6 闭环，30 触点全出场 |
| B3 | B3_navigation_architecture.md | 设计师 | 四主干同构导航 + C1/C3 落点 |
| B4 | B4_experience_contract.md | 设计师 | EC-01…EC-30 契约条目，对齐 Article 0 三层 |
| B5 | B5_explorer_workflow.md | 设计师 | 理解/探索双路径统一 + C4 落点 |

### 9.2 一致性校验

- 节点集一致：A2 的 ExplorationAction = B1 TP-16 下一步唯一契约来源；B1 的 TP-01…TP-30 = B3 导航项 = B2 旅程触点 = B4 契约条目 = B5 工作流节点，恒等于 C01–C30（无遗漏、无合并、无发明，B1 §2/§11）。
- C1–C4 落点：C1（下一步=ExplorationAction 非推荐）植入 B1§3.4/B2§T5/B3；C2（真相刻度三件套）植入 B1§5/B2§T3/B4；C3（C14 对比 P0 独立入口）植入 B1§3.3/B2§T1+T4/B3；C4（Mirror L4.5 只读出口）植入 B1§4/B2§T6/B4/B5。均守 ADR-0015 D1/D2/D3/D7 与 ADR-0013 D3。
- 红线闭合：A3 已规划下线 `GET /entity/{id}/recommendations` 并列出前端收敛清单，契约层自相矛盾（C-01/C-02）在 Phase 2 获一致解。

### 9.3 Exit Criteria 逐条结论（FRW Phase 2 验收四问）

| 判据 | 结论 | 依据 |
|------|------|------|
| 首访 15min 顺滑体验所有能力 | ✅ 通过 | B2 §2 六段时间预算合计 15min；§8 三十触点全出场；隐性/常驻触点全程在场不占动作 |
| 任何能力需跳出产品 | ✅ 否 | B1 §1.1 单容器 Explorer Session；B1 §5.2/§10 真相刻度贴结论出场，不外跳 |
| 出现多个产品感 | ✅ 否 | B3 四主干同构探索语法「锚点→关系→理由→推进」；C28/C29 能力层保证术语与语法恒等 |
| 存在体验断裂 | ✅ 否 | B1 §9 六处供需倒挂/重复实现风险全部给出体验层接续设计（F-1~F-6），0 处遗留 |

### 9.4 Phase 2 关闭声明

**Phase 2（Experience Architecture）通过 Gate，可进入 Phase 3（Interaction Architecture）。**

进 Phase 3 硬门槛（原 §7）：A(3)+B(5) 八份产出已全过 Exit Criteria（本条 §9.3）。

仍 OPEN 不阻塞：OD-01/OD-03/OD-04/OD-05 + R2/R3/R4/R7/R8。

### 9.5 移交 Phase 3 的关键事实（黑板）

- 「下一步」契约已锁定：A2 ExplorationAction（前端可直接消费，无需后端细节；既有 `frontend/src/next/exploration/ExplorationPolicy.ts` 已实现 `evaluateExploration → Decision<ExplorationAction>`）。
- 旧端点下线后前端遗留调用点（Phase 3/5 收敛）：`App.tsx:18/1336`、`components/ai/CompanionRouter.tsx:16/88`、`components/ExplorationJourney.tsx:19`、`components/RecommendationPanel.tsx:90-119`、`__tests__/RecommendationPanel.test.tsx`（全）、`__tests__/ExplorationJourney.test.tsx:11/14/173/186/188`、`locales/zh/entity.ts:8`、`locales/zh/discover.ts:17-20`。
- 对比数据供给（C14）仍是 Phase 3 前置数据任务：B1 F-3 要求对比台以「可对比对象成对存在」为出场条件，供给建设列为 Phase 3 前置。
