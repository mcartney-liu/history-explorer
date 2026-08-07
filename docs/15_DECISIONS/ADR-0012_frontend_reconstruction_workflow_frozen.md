# ADR-0012 — Frontend Reconstruction Workflow 冻结为强制治理流程

## ADR Number

ADR-0012

## Title

Frontend Reconstruction Workflow Frozen as Mandatory Governance Process

## Status

Accepted (Frozen)

## Context

History Explorer 前端长期存在"面板割裂"问题：推荐 / 探索旅程 / 关系解释 / 继续探索 / 信任度等面板各自独立拼装，用户感知不到一条贯穿的主线叙事，也不清楚每块能力背后的产品逻辑。根因是历史上前端改动多为"按需求打补丁"，缺乏统一的、可重复的流程来把产品能力顺滑交付给用户。

项目已有稳定的架构冻结基线（`docs/10_ARCHITECTURE/CURRENT_ARCHITECTURE_BASELINE.md`，覆盖 schema / runtime / 依赖边界），但**前端 / UI / 交互层面的重构流程尚未被冻结**——每次里程碑都可能临时发明一套做法，导致不一致与割裂反复出现。

PO（翔哥）要求：将前端重构流程**提升为与 ADR 同级的冻结治理决策**，并明确"任何前端重构、UI 重构、交互重构、新团队接手，全部必须按照这一套流程执行"。

> 本 ADR 不触及架构冻结边界（无 schema / LLM runtime / 数据库 / 新依赖变更），因此**不需要 Freeze Revision Gate**；它是 PO 直接签发的治理流程决策，以 ADR 格式承载，使其具有与 ADR 同级的权威与可追溯性。

## Decision

1. 正式采纳 **`docs/FRONTEND_RECONSTRUCTION_WORKFLOW.md`（Frozen v1）** 为 History Explorer 前端重构的**唯一权威流程**，与 ADR 同级、具强制约束力。
2. 流程定义为六个强制阶段，任一阶段未完成验收不得进入下一阶段：
   - **Phase 0 Product Discovery（产品理解）** — 让新团队理解产品，不碰代码 / UI。
   - **Phase 1 Capability Validation（能力验证）** — 验证能力正确，只谈能力、不谈 UI。
   - **Phase 2 Experience Architecture（体验架构）** — 设计用户如何体验能力，不谈组件 / 按钮。
   - **Phase 3 Interaction Architecture（交互架构）** — 统一人与产品的交互操作逻辑。
   - **Phase 4 Visual System（视觉系统）** — 统一视觉，视觉永远服务体验。
   - **Phase 5 Frontend Implementation（前端实施）** — 严格按前四阶段落地，不是重新设计。
3. 冻结六条全流程铁律（不得跳阶段 / 不得提前设计 / 每阶段必有产出物 / 每阶段必有可验证 Exit Criteria / 新增能力须从 Phase 0 重评接入 / 前端服务产品能力）。
4. **强制适用范围**：任何前端重构、UI 重构、交互重构、新团队接手，全部必须按此流程执行；新增能力须从 Phase 0 重新评估接入方式，而非直接改前端打补丁。
5. 设**动工 Gate（最高优先级）**：任何 Phase 的实际动工（拉团队 / 进入 Phase 1 / 写代码）必须等 PO 明确发出"动工"指令。
6. 变更只能经 Freeze Revision Gate（ADR + 架构评审 + PO 批准），就地追加版本；禁止重新发明替代流程。

## Alternatives

- **Ad-hoc 按需求打补丁（现状）**：被拒。正是它导致了面板割裂、主线缺失、跨里程碑不一致。
- **每里程碑临时设计一套流程**：被拒。重复造轮子、不可追溯、质量随人波动。
- **仅口头约定、不落盘**：被拒。无法作为未来 M100 / M200 团队的强制约束，会随人员更替丢失。
- **写入团队运作规范而非独立冻结基线**：被拒。前端重构流程需要独立、显式、可被直接引用的权威入口，且与 ADR 互链以获同级权威。

## Consequences

**正面**
- 前端重构有了唯一权威、可重复的流程，跨越里程碑保持一致。
- 新能力接入走"先验证能力、再设计体验、最后落地"的路径，天然避免能力适应前端的倒挂。
- 新团队 / 新 Agent 接手第一步即读本流程，降低认知门槛与割裂复发。
- ADR 同级 + 落盘资产，使决策可追溯、可审计。

**负面 / 成本**
- 任何前端改动都要走完整阶段，单点小改的即时性下降（以受控性换取一致性）。
- 需要总监严格守 Gate 与阶段门禁，治理成本上升。

**对架构基线的影响**
- 不直接修改 `CURRENT_ARCHITECTURE_BASELINE.md` 的 schema / runtime 边界；仅在 §8 增加一条指向本 ADR 与流程文档的引用，便于治理体系统一发现。

## Related Freeze Revision

- Freeze Revision Gate: **No**（不触及架构冻结边界：无 schema / LLM runtime / 数据库 / 新依赖变更）
- 性质：PO 直接签发的**前端治理流程冻结决策**，以 ADR 格式承载以获得与 ADR 同级权威
- Linked docs:
  - `docs/FRONTEND_RECONSTRUCTION_WORKFLOW.md`（Frozen v1，唯一权威流程）
  - `docs/10_ARCHITECTURE/CURRENT_ARCHITECTURE_BASELINE.md` §8（引用本 ADR）
  - `docs/TEAM_OPERATING_SPEC_v1.2.md`（团队运作规范）
  - `docs/AGENT_WORKFLOW_PROTOCOL.md`（Agent 工作流协议）
