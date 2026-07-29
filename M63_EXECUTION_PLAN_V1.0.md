# M63 Execution Plan V1.0 — AI Explanation Trust & Intelligence Convergence

> 生成日期：2026-07-29
> 作者：大湾区靓仔（项目总监）统筹，7 位专家评审（PM / Designer / Architect / Frontend / QA / DevOps / Backend）
> 状态：**Awaiting PO Approval（待项目负责人刘翔批准）**
> 前置基线要求：M62 必须先发布（见 Gate 0），否则 M63 无干净基线
> 冻结纪律：backend / schema / ENTITY_TYPES(8) / RELATIONSHIP_TYPES(18) / API contract / 新 npm 依赖 / runtime / 删除既有能力 — 全禁止

---

## 1. Executive Summary

M62 UX Convergence 已完成审计，基础就绪：UX 三层结构、SVG Icon System、GroundingBadge 接入、Journey 系统已激活。M63 的唯一战略目标——将 History Explorer 从「信息探索工具」升级为「可信 AI 历史探索伙伴」——落点为 **M63 = AI Explanation Trust & Intelligence Convergence**。

M63 不扩展功能数量，只做两件事：**(a) 修复"假溯源徽标"，让 AI 解释成为可信解释层**；**(b) 把已存在但分散的情报模块收敛为一个连贯的用户探索智能层**。

经 7 专家评审，发现 **2 个阻断项** 与 **2 处设计事实错误**（已在本文修正）：
- 阻断 1（DevOps）：M62 代码仍在工作树未发布（无 vM62 tag），M63 必须先等 M62 发布。
- 阻断 2（Architect）：W2 触及的 `RecommendationPanel.tsx` / `ResearchDiscoveryPanel.tsx` 及新建 Hub 组件**不在冻结 allowlist**，须先走 Freeze Revision Gate。
- 错误 1（原 W3）：`journeyReasons` 已由 `explorationPersistence.saveReasons` 持久化（App.tsx:856），是 App 单一导航真源；"扩展 lib/journey.ts 存 journeyReasons" 会造成双写分叉——已改为"直接展现既有 journeyReasons"。
- 错误 2（原 W2）：`JourneyPanel`（首页面包屑）与 `ExplorationJourney`（实体页实时路径树，带 why 注解）**不是重复，是两个不同表面**；W2 不能删 `ExplorationJourney`。

全部工作纯前端组合/编排/测试/文档，**Backend 专家确认 M63 100% 零后端改动**（grounded + evidence[].status 早已在 AIResponse 返回）。

---

## 2. Strategic Goal

将 History Explorer 从「信息探索工具」升级为「可信 AI 历史探索伙伴」。

核心方向：**AI Explanation Trust & Intelligence Convergence**
- AI Explanation：从"展示答案"升级为"可信解释层"（真实溯源 + 可信状态 + 解释依据 + 不确定性表达）。
- Intelligence：已存在的 Journey / Recommendation / ResearchInsights 统一收敛为用户探索智能层。
- Continuity：强化"你为什么看到这个推荐 / 你之前探索过什么 / 下一步可以探索什么"的闭环。

**明确边界**：本里程碑的"AI 伙伴"= 信任层 + 情报收敛，**不等于对话式伙伴**。`AISidebar`（对话式 Historian）仍保持 dev-only，不进主流程。

---

## 3. Success Metrics

| ID | 指标 | 验证方式 |
|----|------|----------|
| SM1 | GroundingBadge 反映真实 provenance（verified/partial/unverified 由 `response.grounded` + `evidence[].status` 推导），而非 `contextCount` | W5 契约测试 |
| SM2 | 100% AI 解释展示"解释依据/来源"摘要，且关联到 citations | 手动 + 测试 |
| SM3 | 推荐位展示"你为什么看到这个推荐"（来自已持久化 `journeyReasons`） | W5 连续性测试 |
| SM4 | Journey / Recommendation / ResearchInsights 收敛为连贯"探索智能"区块且无回归 | W5 回归测试 |
| SM5 | 零 backend/schema/enum/API/依赖/runtime 改动 | freeze-check PASS |
| SM6 | 所有新增/改动前端文件被 W5 守护覆盖，CI 门禁绿 | CI |
| SM7 | Museum Feeling 保持（不拥挤、AA 对比度、无 emoji、无紫粉、信任态不用危险红） | 设计师门禁 + P0 扫描 |

---

## 4. Out of Scope（锁定，违反即退回）

- 禁止任何 backend 改动；禁止 schema / ENTITY_TYPES(8) / RELATIONSHIP_TYPES(18) 改动。
- 禁止新增 API 端点或改动 API contract。
- 禁止新增 npm 依赖；禁止改 runtime 版本。
- 禁止删除既有能力（尤其 `ExplorationJourney` 实时路径树 + why 注解、`AISidebar` dev 工具）。
- 禁止把死代码数据模块（ExplorationDepth / ExplorationBehaviors / ExplorationFunnelAnalysis）接到 UI——它们是 M43-M57 数据层，对终端用户零贡献，M63 不复活。
- 禁止新增百科/历史内容生成（W4 仅重新编排既有 provenance + relationship 数据）。
- 禁止把 `AISidebar` 对话式伙伴提升为主流程——保持 dev-only。
- 禁止超出 W1-W5 范围的功能数量扩张。

---

## 5. Implementation Roadmap

### 前置阶段（阻断门禁）

**Prerequisite A — M62 发布（Gate 0，阻断）**
- 当前 HEAD=`4e3c5c5`（vM60 同步提交），M62 代码在工作树（18 modified + 40 untracked，含 GroundingBadge.tsx / Icon.tsx / m62 测试）。无 vM62 tag。
- 必须先：commit → annotated `vM62` tag → master+tag 分两次 push → consistency 7/7。
- 不完成则 M63 无干净基线，且 W1 依赖的 `GroundingBadge.tsx` / `Icon.tsx` 尚未 allowlist。

**Prerequisite B — M63 Freeze Revision Gate（Gate 1，阻断）**
- 仿 M30-A / M35 / M61 机制：写 ADR（M63_Freeze_Gate）+ 向 `scripts/freeze-check.mjs` 的 `SCOPE_ALLOWLIST` 增量添加 W2 触及文件（精确文件或目录前缀），经 Architect + PO 批准。
- 待放行文件（实现时精确枚举）：`frontend/src/components/RecommendationPanel.tsx`（及 .test）、`frontend/src/components/ResearchDiscoveryPanel.tsx`（及 .test）、新建 Hub 容器组件 + 子组件 + 测试。

### W1 — AI Explanation Trust Layer（前端，M62 后即可，低风险）

目标：让 AI 回答具备来源提示、可信状态、解释依据、不确定性表达。

- GroundingBadge 改为读取 **真实** `response.grounded`(bool) + `evidence[].status`（aiClient.ts 早已返回，见 backend 专家证据 aiClient.ts:30-45）。
- 三态推导：
  - `verified`：`grounded===true` 且全部 evidence.status==='verified'
  - `partial`：`grounded===true` 但存在 `unverified`/`partial` evidence
  - `unverified`：`grounded===false` 或无 evidence
- 删除 `AIExplanationPanel.tsx:118-119` 的假逻辑 `contextCount>0 ? 'verified' : 'unverified'`。
- 新增"解释依据"摘要行：从既有 `CitationList` 提炼来源概览（不新增数据）。
- 技术债（设计师建议，冻结安全）：把 GroundingBadge 硬编码绿/金色 token 化进 Design System V1.0 FINAL（如 `--trust-verified/--trust-partial/--trust-unverified`，映射到语义 success/warn + 暖色强调），禁止危险红。
- 冻结安全：仅触及 `AIExplanationPanel.tsx`（M36.0 已放行）+ `GroundingBadge.tsx`（M62 放行，待 M62 发布）。

### W3 — Exploration Continuity（前端，低风险，修正后）

目标：强化"你之前探索过什么 / 你为什么看到这个推荐 / 下一步可以探索什么"。

- **修正**：`journeyReasons` 已由 `explorationPersistence.saveReasons`（App.tsx:856）持久化，App 的 `history/cursor/journeyReasons` 是单一导航真源（explorationPersistence.ts:4-11）。**不再扩展 `lib/journey.ts` 存 journeyReasons**（避免双写分叉）。
- 直接展现既有数据，不做新持久化（规避 DevOps 指出的 localStorage 不可回滚风险）：
  - 你之前探索过什么 → `JourneyPanel`（lib/journey.ts 首页面包屑）+ `ExplorationJourney` 路径树
  - 你为什么看到这个推荐 → 已持久化的 `journeyReasons` map，渲染在推荐位旁
  - 下一步可以探索什么 → `RecommendationPanel`
- 以安静排版 strip 呈现（generous spacing，无彩框），认知负荷 ≤4。

### W4 — AI Narrative Enhancement（前端，中风险，数据驱动）

目标：增强历史解释能力——增加 WHY / CONNECTION / CONTEXT / MEANING，不增加百科内容。

- 仅用既有 provenance（`provenanceApi.ts`）+ relationship 数据（`relationshipContext(a,b)` 已存在）重新编排叙事包装。
- PM / Frontend 联合建议：先验证 provenance/relationship 字段在数据形状中的丰富度；若稀薄则**降级或延后**（ROI 最低），不强行编造。
- 文案遵循博物馆克制中文表达，禁 AI 模板味（P0-3）。

### W2 — Intelligence Hub（前端，高风险，须 Freeze Gate 后，最后做）

目标：将 Journey + Recommendation + ResearchInsights 统一为连贯"探索智能"区块。

- 收敛三表面：`JourneyPanel`（首页面包屑）+ `RecommendationPanel`（真实 fetch）+ `ResearchDiscoveryPanel`/`ResearchInsights`。
- **不删** `ExplorationJourney`（实体页实时路径树 + why 注解，是独立能力，非重复）。
- **不复活** 死代码数据模块（ExplorationDepth/Behaviors/FunnelAnalysis）。
- 博物馆克制：divider 分组（非卡片盒）、渐进披露、gallery 密度 1-3。
- 工程：拆容器 + 3 子组件（单文件 ≤300 行）；用 React Context 提升推荐 fetch 状态（无新依赖）。
- 冻结：触及文件须先经 Prerequisite B 的 Freeze Revision Gate 放行。

### W5 — Test Guardrails（贯穿全程，前端）

- AI 解释契约测试：断言 GroundingBadge 反映 `response.grounded` + `evidence[].status`，**不从 contextCount 推导**；mock `AIResponse`（从 `aiClient.ts` import 类型以锁定契约）。
- Grounding 可见性测试：verified/partial/unverified 渲染正确（tokenized）颜色、AA 对比度、反映真实数据；不与既有 m62-grounding-contrast 重复。
- 旅程连续性测试：`saveReasons`/`loadReasons` 持久化 + 在连续性 strip 展现；用例间 `localStorage.clear()` 清理。
- W2 收敛回归测试：`JourneyPanel`/`RecommendationPanel` 收敛后依旧正确渲染。
- W4 叙事测试：断言 provenance/relationship 数据真实浮现（非占位）。

### 建议构建顺序

W1（信任修复，核心最低风险）→ W3（展现既有 journeyReasons，低风险）→ W4（叙事，数据校验后）→ W2（Hub 收敛，最高风险，Freeze Gate 后最后做）；W5 测试全程穿插。

---

## 6. Acceptance Criteria

| ID | 验收标准 |
|----|----------|
| AC1 | GroundingBadge 具三态；verified 须 `grounded===true` 且全部 evidence 为 verified；partial 当有 unverified/partial；unverified 当 `grounded===false`/无 evidence |
| AC2 | W5 契约测试在"徽标从 contextCount 推导"时失败 |
| AC3 | 每条 AI 解释展示 provenance/解释依据摘要，关联 citations |
| AC4 | 推荐位展示"你为什么看到这个推荐"，数据来自已持久化 `journeyReasons`（saveReasons/loadReasons） |
| AC5 | Intelligence Hub 渲染 Journey+Recommendation+ResearchInsights 且未回归各子面板（回归测试通过） |
| AC6 | `ExplorationJourney` 实时路径树 + why 注解完好（未被删除） |
| AC7 | freeze-check PASS，零 backend 文件改动 |
| AC8 | P0 规则成立（无 emoji 图标、无紫粉渐变、无 AI 模板味）；Museum Feeling 保持；AA 对比度 |
| AC9 | W5 守护测试在 CI 全绿 |

---

## 7. Risk Matrix

| 风险 | 可能性 | 影响 | 缓解 |
|------|--------|------|------|
| W2 触及文件不在 allowlist → freeze-check FAIL | 高 | 阻断 | Prerequisite B：先走 Freeze Revision Gate（ADR + allowlist） |
| M62 未发布 → M63 无基线 | 高 | 阻断 | Gate 顺序：M62 发布先于一切 M63 实现 |
| W2 UI 回归 / 单文件 >300 行 / 状态管理 | 中 | 高 | 拆容器+子组件；React Context；回归测试 |
| W3 误扩展 lib/journey.ts 致双写分叉 | 中 | 中 | 不扩展 lib/journey.ts；直接展现既有 journeyReasons |
| W4 数据稀薄 → ROI 低 | 中 | 低 | 先验证；稀薄则降级/延后 |
| localStorage 不可回滚（W3） | 低 | 中 | 不做 schema 迁移；只读既有持久化 reasons |
| Grounding 硬编码色技术债 | 低 | 低 | W1 内 token 化（Design System 扩展） |
| release-consistency 为 continue-on-error | 低 | 中 | 把 7/7 当作硬性手动门禁，不依赖 CI 拦截 |

---

## 8. Review Gates

| Gate | 内容 | 批准方 |
|------|------|--------|
| Gate 0 | M62 发布（vM62 tag + consistency 7/7） | PO + DevOps |
| Gate 1 | M63 Freeze Revision Gate（ADR + allowlist 增量） | Architect + PO |
| Gate 2 | W1 完成：契约测试绿，徽标反映真实 grounded | Frontend + QA |
| Gate 3 | W2 完成：回归测试绿，Museum Feeling 评审过 | Designer + QA |
| Gate 4 | 发布前：freeze-check PASS + W5 全绿 + P0 扫描净 | Architect + QA |
| Gate 5 | 发布：vM63 tag + consistency 7/7（硬性门禁） | PO |

---

## 9. Exit Criteria

- AC1-AC9 全部满足。
- freeze-check PASS，零 backend 改动。
- W5 守护在 CI 全绿。
- P0 规则核验通过（emoji 扫描、无紫粉、无 AI 模板味）。
- PO 对发布拍板批准。

> **当前阶段**：M63 Planning → Await Approval。未经批准，禁止 commit / push / merge / tag。

---

## Appendix A — Stage 0 Git Facts（只读核验，2026-07-29）

- HEAD：`4e3c5c5d239bd3663b3d30701197644ad4bfafbf`
- branch：`master`
- 最近 tag：`vM60`（nearest tag = vM60）；无 vM62 / vM63 tag
- 最近 5 commit：`4e3c5c5 docs(release): sync README/PROJECT_CONTEXT/CHANGELOG to vM60` → `5842bcf chore(freeze): M61-bridge-build Freeze Revision Gate (ADR-0004)` → ...
- modified（18）：`.github/workflows/ci.yml`, `frontend/src/App.css`, `App.tsx`, `components/AIExplanationPanel.tsx`, `FeedbackWidget.tsx`, `MultiEntitySelector.test.tsx/.tsx`, `ai/AISidebar.tsx`, `entity/EntityHero.tsx`, `entity/ExplorationCard.tsx`, `entity/ExplorationGuide.tsx`, `workspace/ExplorationHistoryList.tsx`, `workspace/WorkspacePanel.tsx`, `data/ai/AIAction.ts`, `data/entity/entityLabels.ts`, `pages/DevCatalog.tsx`, `pages/DiscoverPage.tsx`, `scripts/visual-check.mjs`
- untracked（40，节选）：`M62_UX_CONVERGENCE_REPORT.md`, `M63_STRATEGIC_DIRECTION_REVIEW.md`, `frontend/src/components/ui/GroundingBadge.tsx`, `frontend/src/components/ui/Icon.tsx`, `frontend/src/__tests__/m62-*`（5 个）, `docs/15_DECISIONS/ADR-0005_M62_ux_convergence.md`, `scripts/emoji-scan.mjs`, `scripts/m62-structure-check.mjs` 等
- 结论：M62 仍在工作树未发布，冻结基线仍为 vM60。

## Appendix B — Stage 1 Reality Audit（只读）

- **A. AI Explanation = 部分真实**：`AIExplanationPanel` 真实调 `/api/v1/ai/explain` 拿 `citations/evidence/grounded/engine`；但 `GroundingBadge` 状态是**假的**——`state = contextCount>0 ? 'verified':'unverified'`（AIExplanationPanel.tsx:118-119），未读 `response.grounded`/`evidence[].status`。
- **B. 情报模块**：JourneyPanel（接 UI，lib/journey.ts）/ RecommendationPanel（接 UI，真实 fetch）/ ResearchInsights（接 UI，ResearchDiscoveryPanel）已上线；ExplorationDepth/Behaviors/FunnelAnalysis **仅数据层、死代码**；JourneyPanel(localStorage) 与 ExplorationJourney(内存+why 注解) **非重复、两表面**；AISidebar **仅 dev-only**。
- **C. 探索闭环**：机械闭环基本闭合；"可信 AI 伙伴"层（真实溯源徽标、对话式）是愿景非现状。

## Appendix C — Stage 3 Expert Verdicts

| 专家 | verdict | 关键结论 |
|------|---------|----------|
| PM | pass-with-advisory | 尊重不扩张原则；优先级 W1→W2→W3→W5→W4；W3 防 creep；W4 数据稀薄则延后；AISidebar 不在 M63 |
| Designer | pass-with-advisory | token 化硬编码色；P0 emoji 守卫；Museum 克制（divider 分组、渐进披露、密度 1-3、无危险红）；W4 克制中文 |
| Architect | **fail（阻断）** | W2 触及文件不在 SCOPE_ALLOWLIST → 需 Freeze Revision Gate；ExplorationJourney 实时栈能力不可删；journeyReasons 已持久化（saveReasons），勿双写；W1/W3/W4/W5 纯前端通过 |
| Frontend | pass-with-advisory | W1 验证 evidence[].status 存在；W2 高风险（回归/300行/状态）；W3 localStorage 版本化；W4 先验证数据；顺序 W1→W4→W3→W2→W5 |
| QA | pass-with-advisory | 增 W2 回归测试 + W4 叙事测试；localStorage 清理；import AIResponse 类型锁契约；勿重复 m62 守护 |
| DevOps | **fail（阻断）** | M62 未发布无基线，须先发布；localStorage 不可回滚（勿迁移）；consistency 当硬性门禁；freeze-check 只管 backend |
| Backend | pass | M63 100% 零后端改动；grounded+evidence[].status 已在 AIResponse；勿给 AIResponse 加必填字段；journeyReasons 留 localStorage |

## Appendix D — Execution Log

【Execution Log · Stage 0】
- 当前任务：读取 git 状态（只读，禁止修改）
- 原因：确认 HEAD/branch/tag/modified/untracked，建立 M63 基线事实
- 影响范围：仅读取，零文件改动
- 预计操作：git rev-parse/branch/describe/log/status
- 【Stage 0 Complete】结果：HEAD=4e3c5c5(master)，nearest tag=vM60，无 vM62；18 modified + 40 untracked（M62 未发布）。证据：git 输出（见 Appendix A）。风险：M62 未发布是后续阻断。下一步：进入 Stage 1 审计。

【Execution Log · Stage 1】
- 当前任务：M63 Reality Audit（只读）
- 原因：把计划锚定真实代码，而非假设
- 影响范围：只读 Explore 子代理 + 冻结清单读取
- 预计操作：审计 AIExplanationPanel/GroundingBadge/Journey/Recommendation/ResearchInsights/ExplorationDepth 等
- 【Stage 1 Complete】结果：A=部分真实（徽标假）；B=三模块已接 UI、三数据层死代码、JourneyPanel≠ExplorationJourney、AISidebar dev-only；C=机械闭环闭合。证据：文件:行号（Appendix B）。风险：徽标假状态是核心缺口。下一步：Stage 2 设计。

【Execution Log · Stage 2】
- 当前任务：M63 Implementation Design（W1-W5，不编码）
- 原因：先把设计写准，再评审
- 影响范围：设计文档，无代码改动
- 预计操作：基于审计产出 W1-W5 草案
- 【Stage 2 Complete】结果：产出 W1-W5 草案。证据：本文件 §5。风险：草案含 2 处事实错误（W3 双写、W2 误删），待 Stage 3 修正。下一步：专家评审。

【Execution Log · Stage 3】
- 当前任务：专家团队 Review（PM/Designer/Architect/Frontend/QA/DevOps/Backend）
- 原因：多视角校验冻结安全/价值/复杂度/测试/发布
- 影响范围：评审，零文件改动
- 预计操作：并行 spawn 7 专家，按 RoleVerdict 回传
- 【Stage 3 Complete】结果：2 阻断（W2 冻结门禁、M62 未发布）+ 修正 2 设计错误（W3 不扩展 lib/journey.ts；W2 不删 ExplorationJourney）。证据：Appendix C。风险：W2 实现前必须 Freeze Gate。下一步：汇编计划。

【Execution Log · Stage 4】
- 当前任务：输出《M63 Execution Plan V1.0》并待批准
- 原因：PO 批准前禁止任何 commit/push/merge/tag
- 影响范围：仅文档（本文件），无代码改动
- 预计操作：写入 M63_EXECUTION_PLAN_V1.0.md，present 给 PO
- 【Stage 4 Complete】结果：9 章节计划 + 执行日志完成。证据：本文件。风险：无（纯规划）。下一步：**等待 PO（刘翔）批准**。未经批准，禁止 commit / push / merge / tag。
