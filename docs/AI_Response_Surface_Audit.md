# AI Response Surface Audit — History Explorer（现状事实报告）

> **文档性质**：现状事实审计（Snapshot Audit），仅记录"平台现在在哪里、以什么方式、基于什么上下文让 AI 对用户说话"，**不含任何方案设计**。
> **审计日期**：2026-08-17
> **审计依据**：当前仓库真实代码（前端 `frontend/src` + 后端 `backend/app`），不依赖文档描述或记忆推测。
> **审计范围**：所有会产生 AI 回复 / AI 解释 / AI 推荐 / AI 对话 / 生成式输出的入口。

---

## 1. Executive Summary（最简事实）

当前仓库里有 **3 类 AI 产出机制**，共 **12 个入口**（其中 2 个是死/占位）：

1. **一个真实 LLM 引擎**：前端所有"真 AI 回复"最终都汇聚到 `POST /api/v1/ai/explain` → 后端 `grounded_answer()` → OpenAI-compatible 模型（`gpt-4o-mini` 默认，`temperature=0.0`，**非流式**）。
2. **一个确定流水线（无 LLM）**：`exploreSuggestions`（探索建议）在后端被**短路**，直接走 Phase2 确定性流水线返回 `next_exploration`，完全不调模型。
3. **一个后端 LLM 生成器**：`POST /api/v1/insights/{id}/generate` 调 LLM 生成"历史见解"并固化（管理/后台触发，非用户对话）。

另有一个 **Mock AI 系统**（`AIOrchestrator` / `AISidebar`）只挂在开发目录页，**生产环境不可达**。

> **核心事实**：所谓 "AI Historian / AI Chat / Explanation / Research / Report" 全部是 `grounded_answer` 这一个函数的不同前端包装，区别只在"传入的 question 文本 + mode 标签 + context_global_ids"。

---

## 2. AI Response Surface Map（全量入口）

| # | 入口名称 | 前端位置 | 触发方式 | Endpoint | 后端 Service | 真实模型 | 是否 LLM |
|---|---|---|---|---|---|---|---|
| S1 | AI Historian 对话 | `HistorianChat.tsx`（EntityPage AI tab + Companion chat） | 用户输入+发送 | `/ai/explain` | `grounded_answer` | OpenAI | **是** |
| S2 | 解释面板 | `AIExplanationPanel.tsx`（Companion explain） | 用户输入+模式 | `/ai/explain` | `grounded_answer` | OpenAI | **是** |
| S3 | Companion AI | `useCompanionAI.ts`（explain/chat 两模式） | 交互 | `/ai/explain` | `grounded_answer` | OpenAI | **是** |
| S4 | 维度研究 | `ResearchPanel.tsx`（RESEARCH_TEMPLATES ~30 题） | 点击研究/批量 | `/ai/explain` ×N | `grounded_answer` | OpenAI | **是** |
| S5 | 综合报告 | `ResearchReport.tsx`（挂载即生成） | 维度完成自动 | `/ai/explain` | `grounded_answer` | OpenAI | **是** |
| S6 | 摘要 | `ResearchSummary.tsx`（挂载即生成） | 维度完成自动 | `/ai/explain` | `grounded_answer` | OpenAI | **是** |
| S7 | 事件叙事 | `EventNarrativeCard.tsx`（默认 mode=historical_impact） | 用户提问 | `/ai/explain` | `grounded_answer` | OpenAI | **是** |
| S8 | 探索建议 | `RelationshipInsight.tsx` / `ExplorationSuggestions.tsx` | 实体打开/伴随 | `/ai/explain`（question='探索建议'） | 后端**短路**→Phase2 | — | **否（确定性）** |
| S9 | 历史见解生成 | `main.py _generate_entity_insight` → `insight_service` | 后台/管理触发 | `/insights/{id}/generate` | `generate_insight_text` | OpenAI | **是** |
| S10 | AISidebar（Mock） | `AISidebar.tsx` → `AIOrchestrator` | 仅 DevCatalog | 无（前端硬编码） | 无 | 无 | **否（假数据）** |
| S11 | Companion research 模式 | `CompanionRouter.tsx` | tab 切换 | 无 | 空壳 | 无 | **否（占位死）** |
| S12 | Companion discover 模式 | `NextStepPanel`（ExplorationPolicy） | tab 切换 | 无 | 前端策略 | 无 | **否（策略推荐）** |

**补充事实（Endpoint 层）**：
- `POST /api/v1/ai/chat` 在后端存在（`ai_chat` → 同样调 `grounded_answer`），但**前端没有任何组件调用 `chatAI()`**（`chatAI` 仅定义在 `aiClient.ts` 和测试里）。该端点**实际未被生产使用**。
- `POST /api/v1/ai/explain` 与 `/ai/chat` 后端逻辑**完全相同**；前端"chat"用的是 `explainAI(mode='chat')`，并非 `chatAI`。

---

## 3. AI Historian Deep Dive（真实调用链）

### 3.1 在哪里
`HistorianChat`（`HistorianChatView`）挂在两处——`EntityPage` 的 "AI" tab，以及 `ExplorerShell` 的 Companion Dock（`CompanionRouter` 的 chat 模式）。UI 文案即 "AI 历史学家"（`locales/en/ai.ts: 'workspace.ai': 'AI Historian'`）。

### 3.2 触发时机
用户在对话框输入并发送（主动输入）。挂载时记录 `start_chat` 事件，但**不自动生成**任何内容。

### 3.3 它知道什么（Context，来自 `grounding_builder.build` + Phase2）
- 当前实体：名称、类型、描述（`find_by_global_id`）✓
- 1-hop 邻居 + 关系事实（`X —[rel]→ Y`，`global_neighbors`）✓
- 2-hop 扩展实体（封顶 25 个，`expand_context`）✓
- 时间线索引（period + event，`get_timeline_index`）✓
- 焦点实体的"策展声明"（claims）+ 来源标题/等级（Phase2 `build_claim_graph` + `_claim_facts`）✓
- 用户问题 ✓
- **不知道**：前序对话（无记忆）、用户探索路径（仅当前实体 id 进 `context_global_ids`）、其他页面上下文、搜索结果、跨实体的全局综合（超出 2-hop 不取）。

### 3.4 它怎么回答（完整逻辑）
```
用户输入 question
→ HistorianChat.explainAI(question, [entityGlobalId])
→ POST /api/v1/ai/explain {question, context_global_ids:[gid], mode:'explain'}
→ main.ai_explain → grounded_answer(knowledge_service, question, [gid], mode)
→ GroundingBuilder.build(gid, question)  // 组装实体/邻居/2-hop/时间线事实
→ _run_phase2：ClaimGraph(焦点实体claims)→EvidenceSelector→Validator→plan_exploration
→ facts = grounding.facts + _claim_facts(已验证claims)  // 附来源等级
→ provider.complete(system_prompt(mode)+user_prompt+facts+_CITATION_INSTRUCTION, max_tokens=800)
→ 解析 JSON {answer, citations}
→ ResponseValidator 校验 citations（tol=75 时间闸门）
→ 返回 {answer, evidence, confidence(服务端算), citations, grounded, engine, next_exploration}
→ 前端渲染气泡
```
无后处理（前端直接渲染 `res.answer`）。**无流式**（provider 同步返回全文）。

### 3.5 它实际被设计成什么
按命名是"历史学家/伴随助手"，但代码事实是——**基于单一焦点实体 + 其 KG 邻域的、无状态的、证据绑定的解释器/问答器**。不是多轮对话历史学家（无记忆），不是搜索助手（无检索），不是主动引导者（推荐是独立确定性模块）。

---

## 4. Response Mechanism Analysis（机制）

**当前 AI 回复采用：Prompt + LLM + 当前实体 Context + Knowledge Graph grounding + 策展声明 + 时间闸门 + citation 校验。**

- 不是纯 LLM 自由生成（有 `[ALLOWED FACTS]` 约束）。
- 不是向量 RAG（未观察到 embedding/向量检索；上下文来自**确定性 KG 查询 + claims 查询**）。
- 是 **Graph-grounded generation**：上下文由 `GroundingBuilder` 从 `KnowledgeService` 确定性投影，LLM 被强制只引用 `[ALLOWED FACTS]` 中的 id。
- **非流式**：`provider.complete` 同步返回，前端等待完整响应。
- **无对话记忆**：每次调用独立，不传历史。

---

## 5. Context / Knowledge / Grounding Analysis

| 维度 | 事实 |
|---|---|
| Context | 焦点实体 + 1-hop + 2-hop(≤25) + 时间线 + 策展 claims/来源 |
| Knowledge（平台知识） | 是——claims + sources（带 tier/creator/publisher） |
| Grounding | 是——`GroundingBuilder` 投影 + `ResponseValidator` 校验 citations |
| History Data | 是——实体/关系/时间线/事件均来自 KG |
| 时间闸门 | 是——`GroundingTuningConfig(tol=75)`，拦截跨时代关系（已实测拦住丝路） |
| 前序对话 | **否**——无 chat history 传入 |
| 用户探索路径 | **部分**——仅当前实体进 context，不含路径历史 |

---

## 6. Product Role Analysis（AI Historian 实际角色）

**Actual Role（代码事实）**：单实体、无状态、证据绑定的**解释/问答引擎**。所有"历史学家/解释/研究/报告"共享同一引擎，仅 question 文本与 mode 标签不同。

---

## 7. Intended vs Actual

| 项目 | 内容 | 证据 |
|---|---|---|
| Intended | UI 命名 "AI Historian / Companion"，`AICapabilities.ts` 称"Complete catalog of what the AI Historian can do"，暗示多能力/伴随式助手 | `locales`, `AICapabilities.ts:3`, `AISidebar.tsx:3` |
| Actual | 单实体、无状态、单次 grounded 解释器；"chat" 无记忆；"research" Companion 模式是空壳 | `HistorianChat.explainAI` 仅传 `[entityGlobalId]`；`CompanionRouter` research 模式空 props |
| **Gap** | 命名暗示"多轮陪伴/引导的历史学家"，实际是"每次单问单答的实体解释器" | 上述代码 |

---

## 8. Duplication / Inconsistency（事实）

1. **两套 AI 系统并存**：真实 `aiClient`→`/ai/explain` vs Mock `AIOrchestrator`→`AISidebar`（仅 DevCatalog）。后者返回硬编码中文模板，**与真实后端完全脱钩**。[Fact]
2. **Prompt 自相矛盾**：`prompt_service.SYSTEM_PROMPT` 第 9 条写"**不要输出 JSON**"，但 `answer_service._CITATION_INSTRUCTION` **强制模型返回 JSON** `{"answer":...,"citations":[...]}`。运行时以 JSON 指令为准，system prompt 的"no JSON"规则对 AI 路径实际失效。[Fact]
3. **`/ai/explain` 与 `/ai/chat` 引擎完全相同**，"chat" 名不副实（无记忆）。[Fact]
4. **两个独立的"综合类"端点**：`ResearchReport`（综合报告）与 `ResearchSummary`（摘要）各自维护 prompt、各自组件、都调 `explainAI`，行为可能不一致。[Fact]
5. **Prompt 逻辑分散**：前端 7+ 处 question 模板 **+** 后端 `SYSTEM_PROMPT` + 6 个 mode 指令 + `_CITATION_INSTRUCTION` + `_claim_facts` 拼接，跨前后端多处维护。[Fact]
6. **Companion 'research' 模式是死占位**：`CompanionRouter` 渲染 `ResearchPanelView` 时传**空 entityName/entityType/dimensions** 且 `onStart={() => {}}`，即 idle 空壳。[Fact]
7. **`/ai/chat` 端点无人消费**：前端 `chatAI()` 无调用方（仅定义+测试）。[Fact]

---

## 9. Current Problems（仅列可证事实；Fact / Inference 分开）

**Fact（代码可证）：**
- F1. 前端存在一条**完全未接后端的 Mock AI 路径**（`AIOrchestrator`/`AISidebar`），生产不可达但仍留在代码库。
- F2. `prompt_service` 与 `answer_service` 对"是否 JSON"的指令**直接冲突**，system prompt 第 9 条对 AI 路径实际无效。
- F3. "AI Chat" **无对话记忆**，每次请求独立；与"聊天/历史学家"的命名预期不符。
- F4. Companion 'research' 模式是**空壳占位**（无实体、无操作）。
- F5. `/api/v1/ai/chat` 端点**无前端消费者**。
- F6. 所有真实 AI 回复共用一个 `grounded_answer`，但各前端入口各自写格式/免责要求，且部分自相矛盾（如 ResearchReport 既要"连贯段落"又要"分小节"）。
- F7. 综合报告（S5）与摘要（S6）是**两个独立综合端点**，prompt 各自为政。

**Inference（推测，非代码证明）：**
- I1. 推测用户在不同终端（对话 vs 报告 vs 摘要）可能得到**风格/边界不一致**的回答——因 prompt 分散且 system prompt 与运行时指令冲突。需实测验证。
- I2. 推测 Mock 路径（`AISidebar`）是历史遗留，可能与某次"AI Historian"重构未清理有关。需 git 历史确认。

---

## 10. Unknowns / Evidence Gaps（无法从代码确认者）

- U1. **运行时实际模型/provider**：`provider.py` 默认 `gpt-4o-mini`，但实际由 env（`config.is_enabled`/`api_key`/`base_url`/`model`）决定；当前是否启用 LLM、用哪个模型**未能从代码确认**（用户实测曾收到 AI 回复，说明运行时 AI 已启用，但具体模型未知）。
- U2. **`insight_service.generate_insight_text` 的 prompt 细节**：仅确认它调 LLM 且只用 claims 作 evidence（`main.py` 调用可见），未读 `insight_service.py` 内部 prompt，故"见解生成"的完整上下文组装未完全追踪。
- U3. **`exploration_planner.plan_exploration` 完整逻辑**：`answer_service` 导入使用，但 `derive_next_exploration`（在 `grounding_builder.py`）与 `plan_exploration`（在 `exploration_planner.py`）未全读；确定性推荐的最终排序/过滤细节未完全确认。
- U4. **EventNarrativeCard 的 question 文本**：确认走 `explainAI(question, [gid], undefined, mode)`（默认 historical_impact），但 question 具体构造在 View 层，未读其 View，文本细节未确认。
- U5. **`withAngle` 对 question 的具体改写**：`AIExplanationPanel` 调用 `withAngle(mode, question, angle)`，位于 `data/ai/questionTemplates.ts:58`，其拼接细节未读。
- U6. **git 历史**：Mock 路径与空壳 research 模式的来源/是否计划清理，需查 git 而非代码。

---

## 附：关键代码事实锚点（便于下一轮追溯）

- 统一编排点：`backend/app/ai_gateway/answer_service.py` → `grounded_answer()`（四维研究唯一编排点，经 `/ai/explain`）。
- 全局 System Prompt：`backend/app/ai_gateway/prompt_service.py` → `SYSTEM_PROMPT`（9 条 ADR-0003 grounding 契约 + 6 个 mode 指令）。
- 强制 JSON 指令：`answer_service._CITATION_INSTRUCTION`（与 system prompt 第 9 条冲突）。
- 时间闸门：`backend/app/ai_gateway/answer_service.py` 两处 `GroundingTuningConfig(tol=75)`（PO 拍板）。
- 上下文投影：`backend/app/ai_gateway/grounding_builder.py` → `GroundingBuilder.build`（实体/邻居/2-hop/时间线/claims）。
- 模型适配：`backend/app/ai_gateway/provider.py`（OpenAI-compatible，`gpt-4o-mini` 默认，`temperature=0.0`，非流式）。
- Mock 路径：`frontend/src/components/AISidebar.tsx` → `frontend/src/data/ai/AIOrchestrator.ts`（注释 "Mock today. Wire aiClient here in production"）。
- 综合报告 prompt：`frontend/src/components/ResearchReport.tsx` ~270（含"兴趣延展"指令）。
- 摘要 prompt：`frontend/src/components/ResearchSummary.tsx` ~281。
