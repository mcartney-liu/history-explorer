# AI Historian — Final Implementation Report

> 依据 §38 输出，17 节。所有改动位于 **AI Response Layer**，冻结边界（Exploration Planner / Policy / KG Traversal / Timeline / Phase2 Pipeline / ETL）未触碰。
> 当前状态：**全部 uncommitted（dirty）**，等待 PO（翔哥）决定是否发布。

---

## 1. 概览与目标

把 **AI Historian 重新定位为「历史解释与认知连接层」**：用户得到答案 → 理解 → 洞察 → 好奇 → **点击真实存在的探索候选** → 进入下一实体探索 → 新发现 → 新问题。AI 不替代探索算法，只消费探索结果并"推一把"。

## 2. 范围与冻结边界

- **仅改**：AI Response Layer（Prompt / Context 组装 / Grounding 只读消费 / Citation / Response Contract / Validation 消费 / Provider 调用 / 错误处理 / AI-to-Exploration 衔接 + 两个前端 AI 组件与接入点）。
- **冻结（未改）**：`exploration_planner.py`、`grounding_builder.derive_next_exploration`、`ExplorationPolicy`、Candidate 生成与排序、KG 遍历/排名/数据模型、Phase2 Pipeline、ETL/Ingestion、`KnowledgeService`。
- AI 对 `next_exploration` 仅**只读消费**，绝不重排、重算、新生成。

## 3. 确认的问题（Confirmed Problems）

| # | 问题 | 位置 |
|---|------|------|
| F1 | JSON 契约冲突（致命）：SYSTEM_PROMPT 规则 9 说"Do NOT wrap in JSON"，`_CITATION_INSTRUCTION` 强制 JSON | prompt_service.py:24 vs answer_service.py:37-45 |
| F2 | 「答案→探索」断裂：HistorianChat 收到 next_exploration 但不渲染 | HistorianChat.tsx:267-278 |
| F3 | ResearchReport 诱发幻觉：软指令「兴趣延展」让 LLM 自造跨文明链接 | ResearchReport.tsx:277-284 |
| F4 | 事实/解释未分层、不确定不表达 | prompt_service.py:13-25 |
| F5 | 探索钩子策略缺失：未利用证据绑定候选推动探索 | answer_service.py:379,453 |

## 4. 根因（Root Causes）

- R1（F1）：M11-1 纯文本 prompt 与后续 M36/M74 的 JSON 契约未同步。
- R2（F2/F5）：`next_exploration` 后端早已返回，但 AI 对话路径未接 `TrustDisplay` 桥梁。
- R3（F3）：研究报告把"激发探索"交给 LLM 自由发挥，而非证据绑定的 `next_exploration`。
- R4（F4）：prompt 缺事实锚定 / 解释可延展但不可杜撰 / 不确定性表达三层策略。

## 5. 产品决策（Product Decision）

AI Historian = 历史解释与认知连接层；所有"下一步"必须证据绑定、已校验；单一输出契约 = **JSON**。

## 6. AI Historian 目标行为

1. 仅依据 `[ALLOWED FACTS]`；事实与解释分层。
2. 证据不足时显式表达不确定，不猜不补。
3. 回答自然通向某候选时，可将其作为"进一步探索方向"——且只引用 `[EXPLORATION CANDIDATES]` 列表。
4. `next_exploration` 原样透传前端渲染，点击即 `onEntityClick` 跳转。

## 7. 用户体验目标（UX Target）

- AI 对话：每条回答下方出现「基于知识库证据的探索建议」卡片，点候选节点跳转。
- 研究报告：删除 LLM 自造「同一时期的世界」小节，改由证据绑定 `next_exploration` 卡片提供入口。
- 全程零幻觉跨文明链接；探索入口可点、可追溯。

## 8. 后端改动 — prompt_service.py（修复 F1/F4/F5）

- 规则 9 改为 JSON 契约："You MUST reply in the JSON format ... object with 'answer' and 'citations' ... answer 为简体中文自然语言段落，不要在 answer 内嵌套 JSON/代码块"。
- 新增规则 10（事实 vs 解释）、11（不确定性表达）、12（探索钩子：只引用 `[EXPLORATION CANDIDATES]` 列表，绝不自创）。
- `_MODE_DIRECTIVES` 六模式保持不变（共享 grounding 契约不削弱）。

## 9. 后端改动 — answer_service.py（修复 F5）

- 新增 `_build_exploration_context(next_exploration)`：**纯只读**格式化冻结的 `next_exploration` 为 `[EXPLORATION CANDIDATES]` 段；不调用 planner、不重排、不评分、不新生成；空列表返回 `""`。
- 在 `grounded_answer` 中拼接：`user_prompt = user_prompt(...) + _CITATION_INSTRUCTION + _build_exploration_context(next_exploration)`。
- **保留** `GroundingTuningConfig(tol=75)`（builder/validator，PO 批准时间闸门，未触碰）。

## 10. 前端改动 — HistorianChat.tsx + ResearchReport.tsx（修复 F2/F3）

- `HistorianChat`：渲染 `TrustDisplay`（复用既有）展示 `res.next_exploration`；`onEntityClick` 透传；assistant 消息携带 `next_exploration`。
- `ResearchReport`：**删除**「兴趣延展（可选小节）」幻觉软指令；修正矛盾的"不要输出 JSON"为统一 JSON 契约；`next_exploration` 非空时渲染 `TrustDisplay`（徽标"知识库推荐"）。
- 接入点：`EntityPage` `<HistorianChat onEntityClick={onEntityClick} />`；`CompanionRouter` `<HistorianChatView onEntityClick={onNavigateEntity} />`；`ResearchPanel` 作用域内无 `onEntityClick`，依规范未硬造。

## 11. JSON 契约统一（F1 收口）

前后端、校验器、前端消费现统一为 JSON（`answer`+`citations`）。SYSTEM_PROMPT 不再有"Do NOT wrap in JSON"矛盾指令；ResearchReport 问题模板同步对齐。运行时 `_parse_ai_json` 解析路径不变。

## 12. 探索钩子（F5 收口）

`[EXPLORATION CANDIDATES]` 段只读注入 AI 提示，策略层（规则 12）约束 AI 只可引用列表项。前端 `TrustDisplay` 是渲染桥梁，点击 `onNextClick → onEntityClick(global_id)` 跳转。闭环打通。

## 13. ResearchReport 幻觉根除（F3 收口）

删除软指令后，研究报告的"进一步探索"完全由证据绑定 `next_exploration` 驱动；测试断言生成的 question 不含「兴趣延展」「同一时期的世界」。

## 14. 测试与回归

- 后端（`test_ai_gateway.py` 追加）：`TestExplorationContextBuilder`（空→""、格式正确、不新创）、`TestJsonContractUnified`（JSON 契约存在、矛盾指令消失、grounding 未削弱）。
- 前端（`HistorianChat.test.tsx` + `ResearchReport.test.tsx` 追加/扩展）：mock `explainAI` 带 `next_exploration` 断言 `TrustDisplay` 渲染且点击触发 `onEntityClick`；断言 question 不含「兴趣延展」「同一时期的世界」。
- QA 11 类行为回归（已完成）：Fact/Why/Cause/Impact/Relationship/Temporal/Comparison/Uncertainty/Out-of-context/Unsupported/Exploration。

## 15. 验证（Verification）

| 项 | 结果 |
|----|------|
| 后端 pytest（test_ai_gateway.py） | **42 passed** |
| 后端 11 类行为回归（test_ai_historian_regression.py） | **43 tests / 107 assertions 全绿**（0.19s；3 轮变异自证断言有效） |
| 后端两项合计（gateway + regression） | **85 passed**，EXIT=0 |
| 前端 vitest（HistorianChat 14 + ResearchReport 12 + TrustDisplay 15） | **41 项全绿**，原有 ResearchReport 10 项不回归 |
| 禁令牌守卫（test_no_forbidden_infra_tokens_in_source） | **通过**（无 rag/neo4j/redis/vectordb/langchain/graphql） |
| 前端 tsc --noEmit | **PASS（0 错误，EXIT=0）** |
| 全量前端 vitest run | **1592 passed / 6 failed（EXIT=1）**——6 个失败**全为预存、与本任务无关**（见下） |
| 冻结边界（tol=75 / planner / validator 逻辑 / KnowledgeService） | **未触碰**（已逐文件核对 diff） |

### 全量前端 6 个失败均为预存、超出本任务范围（不阻断发布）

| # | 失败文件 | 失败原因 | 是否本任务引入 |
|---|----------|----------|----------------|
| 1–3 | `src/data/aiClient.test.ts`（explainAI / chatAI / exploreSuggestions） | 测试硬编码 `localhost:8000`，但本地 dev 后端现跑 `8001`（dev 端口改动未同步测试） | 否（AI Response Layer 未碰 `aiClient`） |
| 4 | `src/data/explorationPackages.test.ts`（M70 timeline slices） | `timeline_slices` 桩过期：`silk_road:tech-paper` → `china_v1:tech-zaopi` | 否（ExplorationPackage 数据模型冻结，未改） |
| 5 | `src/data/explorationPackages.test.ts`（M73 labels.zh） | 42 实体的双语 parity 桩缺失 `labels.zh` | 否（同上，预存） |
| 6 | `src/components/ai/ExplorationSuggestions.test.tsx`（T1 点击） | 查询 `.trust-display-next-btn`（该 class 在 `ui.css`，属未改动的 `ExplorationSuggestions` 组件）为 null | 否（未改动该组件 / TrustDisplay.tsx 定义未动） |

> 结论：本任务新增/修改的前端测试（HistorianChat / ResearchReport / TrustDisplay）**全部通过**；上述 6 失败在改动前即存在，属 dev 端口漂移与数据桩过期，建议列入 P1 跟踪，不阻塞 AI Historian 发布。

> 验证回填完成（2026-08-17）：tsc=PASS；全量 vitest=1592/6（6 预存）；后端 11 类回归=43 tests/107 assertions 全绿；禁令牌守卫=通过；tol=75 与冻结边界=未触碰。

## 16. 风险与超出范围（Risks & Out-of-Scope）

- 风险：改 system prompt 后旧调用方漂移 → 契约仍为 JSON，已逐模式验证 directive 不削弱 grounding。
- 风险：`onEntityClick` 部分挂载点作用域缺失 → 仅接可用路径（EntityPage/CompanionRouter），ResearchPanel 未硬造。
- 超出范围：探索算法/Policy/KG/Timeline/ETL、新依赖、新 memory/状态层——均未引入。

## 17. 发布决策（PO Gate）

所有改动保持 **uncommitted（dirty）**。详见 `git status`：
- `backend/app/ai_gateway/prompt_service.py`、`answer_service.py`、`tests/test_ai_gateway.py`
- `frontend/src/components/HistorianChat.tsx`、`ResearchReport.tsx`、`HistorianChat.test.tsx`、`ResearchReport.test.tsx`、`EntityPage.tsx`、`ai/CompanionRouter.tsx`

**请 PO（翔哥）审阅后决定是否 commit / push / 发布。** 配套文档：`AI_Historian_Implementation_Decision.md`（实施决策+10项自审）、`AI_Historian_Product_Walkthrough.md`（Users A–E 走查）。
