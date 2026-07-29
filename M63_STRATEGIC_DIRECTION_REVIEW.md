# M63 Strategic Direction Review

> History Explorer — V1 Product Intelligence 阶段规划
> 状态：规划评审稿，等待 PO（翔哥）批准后再进入 Implementation
> 纪律：全文基于真实代码/状态 read → verify → conclude；未修改任何代码、未 commit/push、未触碰冻结边界

---

## Executive Summary

M62 代码实现已完成且全部门禁转绿，但**尚未走完 Release 流程**（未提交、未打 `vM62` tag）。经只读审计确认：探索闭环与长期行为分析两大能力**已在 M35/M61 阶段真实落地并激活**，当前最大短板是 **AI 解释可信度薄弱 + 既有智能模块碎片化**。

推荐 M63 方向：**AI Explanation Trust & Intelligence Convergence（AI 解释可信度深化 + 智能模块收敛）**。该方向直接命中"产品智能化 / AI 解释可信度 / 从 Demo 向真实产品演进"三大未解焦点，且**完全在冻结基线内（纯前端编排 + 复用既有数据）**，零后端/零 schema/零枚举/零依赖变更。

---

## Current State

### M62 收尾状态（实时 git 核验）
- HEAD = `4e3c5c5`（vM60），**无 `vM62` tag**，0 文件 staged
- 18 个 tracked 文件 modified + 一批 untracked 交付物（Icon.tsx、GroundingBadge.tsx、5 套 guardrail 测试、emoji-scan / m62-structure-check 脚本、ADR-0005、M62 报告）均在工作树
- 质量门禁（本次会话实测）：`tsc` 0 错 / build 154 modules exit 0 / `vitest` **941/941** / freeze-check **PASSED（无 D 类违规）** / emoji-scan PASS / structure-check PASS / visual-check PASS
- `ENTITY_TYPES=8`、`RELATIONSHIP_TYPES=18` 验证不变；**无 backend 文件变更**
- `ADR-0005_M62_ux_convergence.md` 存在（4454B）；freeze `SCOPE_ALLOWLIST` 已含 M62 全部路径 → 无需新冻结门禁

### 已具备但未充分利用的能力（审计关键发现）
| 能力 | 证据 | 状态 |
|------|------|------|
| 探索旅程持久化 | `frontend/src/lib/journey.ts`（`localStorage` 跨会话）+ `App.tsx:900` 渲染 `<JourneyPanel/>` | **已激活** |
| 探索深度/漏斗/行为分析 | `ExplorationDepth.ts`(110) / `ExplorationBehaviors.ts`(168) / `ExplorationFunnelAnalysis.ts`(170) 真实实现 | **已建，未收敛** |
| 兴趣画像 + 推荐 | `ResearchInsights.ts`（导出 `InterestProfile` 组件）+ `RecommendationPanel.tsx`（M9 推荐引擎） | **已激活** |
| AI 解释面板 | `AIExplanationPanel.tsx` + `GroundingBadge.tsx` | **存在，但徽章为装饰性** |

---

## Remaining Problems

### 发布流程（流程项，非质量阻塞）
- M62 未提交/未打 tag；走 Release 铁律（ff-merge → annotated `vM62` → consistency 7/7）即可关闭
- 工作树含应排除的临时/日志文件：`.pip_target/`、`*_out.txt`、`scripts/_m62_emoji_fix.py`、`RELEASE_READINESS_2026-07-29.md`（部分属交付物，提交前须清理）

### 技术债（LOW，非阻塞）
- **GroundingBadge 硬编码颜色**（`#0E3B2C/#E9FBF3/#1E6B4E/#D9C47E/#3B2F0E/#B59A4A`），偏离 P0-3「禁止硬编码颜色」；AA 对比度达标（验证态 ~12:1 / 未验证态 ~8.9:1），隔离于单一组件；修复方案（navy/gold token）已就绪
- **Discover tab 交互测试缺口**：tab 切换仅人工验证，缺自动化 interaction guard

### 产品债（核心）
- **智能模块碎片化**：PO 在 M61 已标注——"5 个产品智能模块各自独立输出未交叉校验…建议收敛+真实事件流验证而非加新模块"。`InterestProfile` / `RecommendationPanel` / `JourneyPanel` / `ExplorationDepth` 并存但互不对话，用户感知不到"智能"
- **AI 解释可信度薄弱**：`GroundingBadge` 是状态色药丸，未链接到真实 source 记录；解释论断无法追溯到 source 实体/关系，无置信度、无矛盾提示——这是"AI 驱动的历史探索系统"定位的最大体验缺口

---

## Candidate Directions

### 方向 A — AI Explanation Trust Layer（AI 解释可信度深化）
- **产品价值**：把"AI 解释"从单轮生成升级为 grounded、可溯源、带置信度与矛盾提示的解释，是产品定位的核心差异点
- **用户价值**：每条 AI 论断都能追到证据；看到"该说法与其他来源冲突"的提示；信任感从"它说"变"它证明"
- **技术影响**：前端编排既有 `provenance` / `relationship` / `entity` 数据；复用并深化 `GroundingBadge` / `AIExplanationPanel`；可选后端检索增强（**越界**）
- **是否突破冻结**：纯前端编排**不越界**；若引入 RAG / 新 LLM 依赖则**越界 → 需 Change Request**
- **工作量**：M
- **风险**：中（可信度若依赖后端 LLM 链路则越界，须 CR；纯前端版完全可控）

### 方向 B — Exploration Journey & Memory System（探索闭环 + 长期行为）
- **产品价值**：已是产品闭环基础
- **用户价值**：已具备跨会话记忆与深度分析
- **技术影响**：**经审计已完整实现并激活**（M35 Feature D + M61 分析层），不应"从零建"
- **是否突破冻结**：n/a（已建）
- **工作量**：若仅做"收敛"为 S
- **风险**：低
- **结论**：**不作为独立 M63 候选**；其价值以"收敛子项"并入方向 A，避免重复建设

### 方向 C — Historical Event Stream / Timeline Intelligence（时间线智能）
- **产品价值**：跨实体时间线聚合、同期文明事件流、因果链可视化
- **用户价值**：看到"同一时期不同文明发生了什么"的纵向叙事
- **技术影响**：复用 `relationship` / `timeline` 数据，前端为主
- **是否突破冻结**：不越界
- **工作量**：L
- **风险**：中（时间线数据密度大，渲染/性能压力）
- **结论**：价值高但工作量大、可独立成里程碑，建议作为 **M64 候选**，不与 M63 抢资源

---

## Recommended Direction

**M63 — AI Explanation Trust & Intelligence Convergence**

以**方向 A 为骨架**，并把方向 B 已建模块作为"收敛子项"纳入——既攻克最薄弱的可信度，又用最低成本消除 PO 已标注的产品债（碎片化），让既有智能真正"被用户感知"。

### Why This Direction
1. **最高杠杆**：可信度是"AI 驱动历史探索系统"的定位命门，当前最弱；旅程/行为分析已建，再投方向 B 是重复建设
2. **冻结安全**：纯前端编排 + 复用 provenance/relationship/entity/journey/ResearchInsights 数据，**零后端 / 零 schema / 零枚举 / 零依赖变更**，符合 M60/M61 红线
3. **回应 PO 已述关切**：直接解决 M61 笔记"收敛而非加新模块"——把 4 个孤立智能面板收敛为一个统一 Exploration Intelligence 视图
4. **可交付**：所有依赖数据已存在，无外部阻塞；风险可控在 freeze 内

### Expected Impact
- AI 解释从"装饰性徽章"变为"可溯源、带置信度、标注矛盾"的可信解释 → 产品从 Demo 质感跃迁至真实产品质感
- 4 个孤立智能模块收敛为 1 个统一视图，交叉校验而非各说各话 → 用户首次感知到"产品在理解我的探索"
- 全程冻结绿、测试覆盖不降反增 → Release 风险低

---

## M63 Draft Plan

### 1. Milestone Goal
将 AI 解释升级为可追溯、带置信度、标注矛盾的 grounded 解释；并将既有 Journey / InterestProfile / Recommendation / Depth 智能模块收敛为一个统一的 Exploration Intelligence 视图，使产品智能化对用户可见、可信。

### 2. Success Metrics
- AI 解释 100% 论断附 ≥1 个 source 引用（实体/关系 chip）
- 来源冲突时 100% 标注矛盾提示
- GroundingBadge 100% 通过 Design Token 引用（消除 P0-3 硬编码偏差）
- 统一 Intelligence 视图聚合全部 4 个既有模块，跨模块交叉校验 ≥ 3 项
- 测试：**≥ 现状 941** 且新增 trust/grounding/integration guardrail
- 冻结门禁全绿；**backend 0 文件变更**

### 3. Scope（冻结安全）
- 前端：`AIExplanationPanel` 深化（source chip + 置信度 + 矛盾标记）；`GroundingBadge` 真实链接 source record 并改 token 色
- 前端：Exploration Intelligence 收敛视图（聚合 Journey / InterestProfile / Recommendation / Depth analytics，交叉校验）
- 复用：provenance / relationship / entity 数据、`journey.ts`、`ResearchInsights`、`RecommendationPanel`、`ExplorationDepth/Funnel`
- 测试：新增 trust / grounding / integration guardrail；视觉/emoji/structure 门禁补强

### 4. Out of Scope
- 后端 LLM 编排 / RAG / 新依赖（如需 → **M64 + Change Request**）
- 新 API endpoint、schema、枚举变更
- 时间线智能（方向 C，独立里程碑 M64）
- 服务端用户存储（跨设备记忆 → 后续 CR）

### 5. Work Breakdown
- **W1** AI 解释溯源数据模型（前端类型 + 从 provenance/relationship 抽取 source 引用）
- **W2** `AIExplanationPanel` 重构（每条论断附 source chip + 置信度 + 矛盾标记）
- **W3** `GroundingBadge` 真实链接 source record（顺带修 P0-3 硬编码色 → token）
- **W4** Exploration Intelligence 收敛视图（聚合 4 模块 + 交叉校验）
- **W5** 交互闭环（解释 → source chip → 一键跳转实体/关系探索）
- **W6** QA guardrail（trust/grounding/integration）+ 视觉/emoji/structure 门禁
- **W7** CI gate 补全 + `ADR-0006` + freeze 影响复核

### 6. Acceptance Criteria（EARS）
- While 渲染 AI 解释，系统**必须**展示每条论断的 source 引用
- If 来源间冲突，系统**必须**标注矛盾提示
- While 用户点击 source chip，系统**必须**跳转对应实体/关系视图
- GroundingBadge **必须**通过 Design Token 引用（无硬编码色）
- 所有既有智能模块**必须**出现在统一 Intelligence 视图中
- 交付时 freeze-check **必须** PASSED 且无 backend 文件变更

### 7. Risk Matrix
| 风险 | 等级 | 缓解 |
|------|------|------|
| 可信度依赖后端 LLM 链路 | HIGH（若越界）| 本 M63 限定纯前端编排；服务端能力留 M64 + CR |
| source 数据稀疏导致覆盖率不足 | MEDIUM | 降级为"未验证"标签，绝不伪造引用 |
| 收敛破坏既有交互 | MEDIUM | guardrail 测试 + 既有 941 测试兜底 |
| 误触冻结基线 | LOW | freeze-check 门禁 + SCOPE_ALLOWLIST 复核 |

### 8. Release Gate
`tsc` 0 错 · build 绿 · **941+ tests** · freeze-check PASS · emoji/visual/structure PASS · **backend 0 变更** · `ADR-0006` 落地 · consistency 7/7

### 9. Rollback Strategy
- 纯前端、单 milestone commit，ff-merge 可逆；异常即 `git revert` M63 merge
- frozen backend 全程不变，回滚不影响数据/API
- 保持 vM60 backend 基线，M63 仅 bump frontend runtime（若确有必要）

---

## Waiting for PO Approval

以上为规划评审稿。**未进入 Implementation**。

请翔哥拍板：
1. 是否确认 M63 = **AI Explanation Trust & Intelligence Convergence**（方向 A + B 收敛）？
2. 若同意，是否授权按 W1–W7 推进（全程冻结安全）？
3. 方向 C（Timeline Intelligence）是否顺延为 M64 候选？

批准后我将进入实现，并维持实时执行日志。
