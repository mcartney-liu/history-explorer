# ADR-0022: ResearchPanel 三阶段交互模型（四维研究 → 研究中评 → 综合报告）

- **Status**: Accepted
- **Date**: 2026-08-14
- **Milestone**: M80（M80a 收口）
- **Related Freeze Revision Gate**: No（前端交互模型，不改 Architecture Baseline 核心契约）
- **Type**: Product / Frontend Interaction Model

---

## 1. Context

Entity Page 的 **Research 能力** 从"单次查询"升级为"具有推进感的研究流程"。

此前 ResearchPanel 的基本形态是一次性研究：用户触发后得到一组维度结果并展示。这种形态有两个问题：

1. **缺乏推进感**：四维（政治/军事/经济/文化等）结果一次性全部铺开，用户无法感知"研究在推进"，也无法在中间态做出判断。
2. **结果与综合理解脱节**：只有原始维度结果，缺少"基于四个维度的综合评价/报告"，无法支撑用户从"单维信息"走向"综合理解"。

当前产品需要围绕 **政治 / 军事 / 经济 / 文化（以及事件/人物/宗教/技术等按实体类型定制的维度）** 形成连续研究体验，并区分：

- a. **四维研究结果生成**（Phase 1）
- b. **研究中评**（Phase 2，门控）
- c. **综合报告**（Phase 3，产出可存档的综合理解）

单纯把所有结果一次性展示不能满足"从好奇走向结构化理解"的目标，因此需要明确的分阶段流程。

> 注：本 ADR 记录的是**已经实现**的 M80 架构/产品决策，基于 `frontend/src/components/ResearchPanel.tsx`、`ResearchDimensionCard.tsx`、`DimensionReportModal.tsx` 等真实代码。

---

## 2. Decision

ResearchPanel 采用**三阶段流程**：

- **Phase 1 — 四维研究**：按实体类型（Civilization/Event/Person/Religion/Technology）生成四个研究维度的结果状态。支持**单点研究**（单个维度）与**批量研究**（全量维度）。四维研究不是简单展示，而是形成四个独立的 `ResearchDimension` 结果状态（各含 answer + citations + grounded 状态）。
- **Phase 2 — 研究中评**：仅在**四维研究成功门控条件满足**（全部维度 success）后才开放。研究完成前不进入中评。
- **Phase 3 — 综合报告**：中评完成后生成综合报告，支持：
  - a. **单维报告**：单个维度的研究报告，通过 `DimensionReportModal` 弹层展示（P-U05，非新页面、不走路由）。
  - b. **四维综合报告**：覆盖全部维度的综合理解（批量四维完成后的报告）。
- **持久化**：研究结果通过现有 research 持久化链路（`saveResearchRemote` / `ResearchHistory`）保存与恢复。
- **AI 边界**：AI 参与中评与综合报告时，必须遵守现有 **AI Trust Boundary / `ai_gateway`** 治理（`explainAI` 经由 `aiClient` → `/api/v1/ai/explain`）。**本 ADR 不重新定义 AI Runtime**。

---

## 3. Architecture Boundary

本 ADR 与现有 **Exploration Engine** 决策的边界：

| 层 | 负责什么 | 文档 |
|---|---|---|
| **Exploration Engine** | "下一步探索什么 / 去哪里 / 如何产生 ExplorationAction" | **ADR-0015 D1** + **A1** + **A2** + **M88.x** |
| **ADR-0022（本 ADR）** | "用户如何围绕当前实体进行结构化研究" | 本 ADR |

- 两者**可以共享 `global_id` / entity context**。
- Research Flow **不重新定义** `ExplorationPolicy`。
- 不把 `resolveDimensionTarget` / `targetEntity` 重新写成新架构决策——如需引用，只引用已有 **ADR-0015 / A1 / A2**。

---

## 4. Consequences

### 正面
- 研究过程具有明确阶段和推进感。
- 四维结果、中评、报告职责分离，各阶段状态清晰。
- 用户可以从单维研究进一步进入综合理解。
- 研究结果具备后续存档（`saveResearchRemote`）和回顾（`ResearchLibrary` restore）基础。

### 负面 / 约束
- 流程状态更复杂（`ResearchMode = idle | planning | running | done | error | restored`）。
- 必须处理 loading / error / partial success（四维部分维度失败时不能进入中评）。
- AI 不可用时需遵守现有 fallback / feature flag 机制（AI Gateway 默认关闭时的行为）。
- 报告 modal 增加 UI 状态管理复杂度。

---

## 5. Alternatives Considered

- **A：继续保持单阶段 ResearchPanel** —— 研究一次展示，无推进感，不满足综合理解目标。**放弃**。
- **B：四维结果全部同时展示，不设置中评门控** —— 结果扁平，缺乏"综合"产出；用户没有从单维到综合的路径。**放弃**。
- **C：采用三阶段 Research Flow（四维 → 中评 → 综合报告）** —— 阶段清晰、职责分离、支持存档回顾、支撑综合理解。**选择**。

---

## 6. Compatibility / Governance

- 不改变现有 `ExplorationAction` 契约。
- 不改变 A1 / A2 / M88.x exploration contract。
- 不新增 runtime AI SDK。
- 不引入新的数据库 / ORM / 基础设施依赖。
- 不改变现有 Freeze Governance。
- 不重复记录已有 ADR-0015 的 ExplorationPolicy 决策。

---

## 7. References

真实仓库路径：

- ADR-0015：`docs/15_DECISIONS/ADR-0015_phase1_adjudication.md`
- A1 Exploration Policy Contract：`docs/Phase2/A1_exploration_policy_contract.md`
- A2 Exploration Action Contract：`docs/Phase2/A2_exploration_action_contract.md`
- M88 Exploration Intelligence / Boundary：`docs/product/M88.0_EXPLORATION_INTELLIGENCE_BOUNDARY.md`、`docs/product/M88.2_EXPLORATION_POLICY_CONTRACT.md`、`docs/product/M88.3_EXPLORATION_DECISION_CONTRACT.md`
- ResearchPanel：`frontend/src/components/ResearchPanel.tsx`
- ResearchDimensionCard：`frontend/src/components/ResearchDimensionCard.tsx`
- DimensionReportModal：`frontend/src/components/DimensionReportModal.tsx`
- Research 持久化：`frontend/src/data/ResearchHistory.ts`（`saveResearchRemote`）
- AI 边界：`frontend/src/data/aiClient.ts`（经 `/api/v1/ai/explain`）

---

## 8. Notes

- 本 ADR 不涉及 M81a 尚未实现的 `compare_context`、causal 数据深化等内容。
- 本 ADR 以真实当前代码为准，不引用 M81a scratch 文档作为决策依据。
