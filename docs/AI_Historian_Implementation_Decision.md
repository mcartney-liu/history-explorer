# AI Historian — Implementation Decision (§33/§34)

> Status: 已通过 Plan Self-Review（10 项自审全绿）→ 进入施工
> Scope: **仅 AI Response Layer**（AI Historian / Chat / Explain / Response Surface / Prompt / Context / Grounding 只读消费 / Citation / Response Contract / Validation / Provider / 错误处理 / AI-to-Exploration 衔接）
> 冻结边界（严禁改动）: Exploration Planner / Policy / Candidate Ranking / KG Traversal / Timeline / Phase2 Pipeline / ETL。AI **只读消费** `next_exploration`，**绝不**重排/重算/新生成候选。

---

## 1. Confirmed Problems

| # | 问题 | 证据（文件:行） |
|---|------|------------------|
| F1 | **JSON 契约冲突（致命）**：`SYSTEM_PROMPT` 规则 9 要求「Do NOT wrap in JSON」，而 `_CITATION_INSTRUCTION` 强制 LLM 返回 `{"answer","citations"}`。两者自相矛盾，LLM 行为不确定。 | `prompt_service.py:24` vs `answer_service.py:37-45` |
| F2 | **「答案→探索」断裂**：`HistorianChat.onAsk` 收到 `res.next_exploration` 但从未渲染；`TrustDisplay`（已存在、可复用）本就是这条桥梁，却没接上。 | `HistorianChat.tsx:267-278`（不读 next_exploration）；`TrustDisplay.tsx:31-45,158-248`（已支持 nextExploration + onNextClick） |
| F3 | **ResearchReport 诱发幻觉**：问题模板软指令「兴趣延展（可选小节）」暗示模型自造跨文明链接（如研究「战国」时注入「阿契美尼德波斯帝国」），违反 §13/§15「不杜撰、不脱离知识图谱」。根因是 prompt 自相矛盾 + LLM 用自己的知识补位，而非使用证据绑定的 `next_exploration`。 | `ResearchReport.tsx:277-285` |
| F4 | **事实/解释未分层**：system prompt 只要求「只用允许事实」，未要求 AI 显式区分「事实（来自 ALLOWED FACTS）」与「解释/综合（AI 合成）」，也未要求「证据不足时表达不确定」。 | `prompt_service.py:13-25` |
| F5 | **探索钩子策略缺失**：prompt 未利用已生成的证据绑定候选（`next_exploration`）作为「可进一步探索方向」——AI 没有把用户推向真实存在的下一步。 | `answer_service.py:379,453`（next_exploration 已算但未进 prompt） |

---

## 2. Root Causes

- **R1 (F1)**：历史遗留——M11-1 的 `SYSTEM_PROMPT` 写于「纯文本输出」假设，后续 M36/M74 把契约改成 JSON 加在 `user_prompt` 尾部，但 `SYSTEM_PROMPT` 规则 9 没同步改，形成系统/用户双指令冲突。
- **R2 (F2/F5)**：`next_exploration` 在后端 `grounded_answer` 早已返回（每条响应都带），但前端 AI 对话组件只消费 `answer/citations`，探索候选的渲染能力（`TrustDisplay`）只被「确定性推荐」路径用，AI 对话路径缺这一环。
- **R3 (F3)**：ResearchReport 把「激发探索」职责交给 LLM 自由发挥，而非交给证据绑定的 `next_exploration`。LLM 在「兴趣延展」软约束下用自身知识补位 → 杜撰跨文明链接。
- **R4 (F4)**：prompt 缺少「事实锚定 / 解释可延展但不可杜撰 / 不确定性表达」三层策略，AI 倾向于把综合陈述伪装成事实。

---

## 3. Product Decision

把 **AI Historian 重新定位为「历史解释与认知连接层」**：用户得到答案 → 理解 → 洞察 → 好奇 → **点击真实存在的探索候选** → 进入下一实体探索 → 新发现 → 新问题。

- AI **不替代**探索算法，AI 只消费探索结果并「推一把」。
- 所有「下一步」必须是**证据绑定、后端已校验**的 `next_exploration` 候选；AI 可引用之、不可自创之。
- 单一输出契约：**JSON**（`answer` + `citations`）——与运行时解析、校验器、前端消费一致。

---

## 4. AI Historian Target Behavior

1. 仅依据 `[ALLOWED FACTS]` 作答；事实与解释分层，解释明确锚定到事实。
2. 事实不足时**显式表达不确定**，不猜、不补。
3. 回答自然通向某候选时，可将其作为「进一步探索方向」提示——且**只引用 `[EXPLORATION CANDIDATES]` 列表中的项**。
4. 返回的 `next_exploration` 原样透传给前端 `TrustDisplay` 渲染，点击即 `onEntityClick(global_id)` 跳转。

---

## 5. User Experience Target

- AI 对话：每条 AI 回答下方出现「基于知识库证据的探索建议」卡片（复用 `TrustDisplay`），点候选节点 → 跳转到对应实体。
- 研究报告：删除 LLM 自造的「同一时期的世界」小节；改由证据绑定的 `next_exploration` 卡片提供「进一步探索」入口（无候选则静默不显示）。
- 全程零幻觉跨文明链接；所有探索入口都可点击、可追溯。

---

## 6. Runtime Changes（`answer_service.py`）

- **保留**：`GroundingTuningConfig(tol=75)`（builder 行 345、validator 行 433）——PO 批准的时间闸门，禁止改动。
- **新增** `_build_exploration_context(next_exploration)`：纯只读格式化冻结的 `next_exploration` 为 `[EXPLORATION CANDIDATES]` prompt 段；**不调用 planner、不重排、不评分、不新生成**；空列表返回 `""`。
- **拼接**：`user_prompt = prompt_service.user_prompt(question, facts) + _CITATION_INSTRUCTION + _build_exploration_context(next_exploration)`（仅当非空追加；`next_exploration` 在行 379 已就绪）。
- 不改动 validator / fallback / temporal gate / `next_exploration` 计算本身。

---

## 7. Prompt Changes（`prompt_service.py`）

- **统一契约（修 F1）**：规则 9 改为 JSON 契约——「必须按用户指令的 JSON 格式返回（含 `answer`/`citations`）；`answer` 内写一段简体中文自然语言，不要在其中嵌套 JSON/代码块/markdown 围栏；`citations` 只列你在 [ALLOWED FACTS] 中实际引用的来源 id。」
- **新增策略层（修 F4/F5）**：
  - 事实 vs 解释：明确区分「来自 ALLOWED FACTS 的事实」与「基于事实的综合/解释」；解释须锚定事实，不得伪装成事实。
  - 不确定性：ALLOWED FACTS 不足以回答时，显式说明「依据现有知识无法确认」，不补充外部知识。
  - 探索钩子：当回答自然通向 `[EXPLORATION CANDIDATES]` 中某项时，可将其作为「进一步探索方向」；**仅可引用该列表，绝不自创关系或实体**。
- **模式指令**：`_MODE_DIRECTIVES` 六模式保留，措辞不变（已含 grounding 约束）；新增策略层写入共享 `SYSTEM_PROMPT`，不逐模式削弱 grounding 契约。
- **禁令牌**：不引入 `rag/neo4j/redis/vectordb/langchain/graphql`（`test_ai_gateway.py:87-101` 守卫）。

---

## 8. Context Changes

- 后端：在 AI `user_prompt` 中只读追加 `[EXPLORATION CANDIDATES]` 段（来自冻结 `next_exploration`）。
- 前端：新增「AI 对话探索候选」渲染（消费既有 `res.next_exploration`），新增 `onEntityClick` 导航透传（EntityPage / CompanionRouter / ResearchPanel）。
- 无新增 context 数据通道；前端只提供实体 id 列表，绝不本地组装事实。

---

## 9. Validation Changes

- 校验器 `ResponseValidator`（`tol=75`）**不变**：负责校验 `citations` 是否落在已展开图谱内。
- 新增后端单测：
  - `_build_exploration_context` 空列表返回 `""`；非空正确格式化 global_id/relationship/reason；不调用 planner（mock 验证无 planner 调用）。
  - JSON 契约统一：构造 `PromptService().system_prompt(mode)` 断言其**包含** JSON 契约措辞、**不再包含**「Do NOT wrap it in JSON / 不要输出 JSON」式矛盾指令。
- 新增前端单测：
  - `HistorianChatView` 在 assistant 消息带 `next_exploration` 时渲染 `TrustDisplay` 且点击节点触发 `onEntityClick`。
  - `ResearchReportView` 问题模板**不含**「兴趣延展/同一时期的世界」字样；`next_exploration` 非空时渲染探索卡片。
- 11 类回归（见 §11 / 交付物）覆盖 Fact/Why/Cause/Impact/Relationship/Temporal/Comparison/Uncertainty/Out-of-context/Unsupported/Exploration。

---

## 10. Files to Change

| 文件 | 改动 | 边界 |
|------|------|------|
| `backend/app/ai_gateway/prompt_service.py` | 规则 9 改 JSON 契约；新增事实/解释/不确定/探索钩子策略层 | AI Response Layer ✅ |
| `backend/app/ai_gateway/answer_service.py` | 新增 `_build_exploration_context`；拼接进 user_prompt；保留 tol=75 | AI Response Layer ✅ |
| `backend/tests/test_ai_gateway.py` | 新增上述单测（追加 category 类） | 测试 ✅ |
| `frontend/src/components/HistorianChat.tsx` | 渲染 next_exploration via `TrustDisplay`；加 `onEntityClick` 透传；消息带 next_exploration | AI Response Layer ✅ |
| `frontend/src/components/ResearchReport.tsx` | 删除「兴趣延展」软指令；渲染 next_exploration 卡片；加 `onEntityClick` | AI Response Layer ✅ |
| `frontend/src/components/EntityPage.tsx` | `HistorianChat` 传 `onEntityClick` | 接入 ✅ |
| `frontend/src/components/ai/CompanionRouter.tsx` | `HistorianChatView` 传 `onEntityClick={onNavigateEntity}` | 接入 ✅ |
| `frontend/src/components/ResearchPanel.tsx` | 两处 `ResearchReport` 传 `onEntityClick`（若作用域有） | 接入 ✅ |
| `frontend/src/components/ResearchReport.test.tsx` | 断言无「兴趣延展」+ next_exploration 渲染 | 测试 ✅ |

---

## 11. Tests

- **后端 pytest**（追加到 `test_ai_gateway.py`）：
  - `TestExplorationContextBuilder`：空→`""`；非空→格式正确且**不触发 planner**（用 monkeypatch 确保 `exploration_planner.plan_exploration` 未被调用）。
  - `TestJsonContractUnified`：`system_prompt` 含 JSON 契约、不含矛盾指令。
- **前端**（追加/扩展 `ResearchReport.test.tsx`、`HistorianChat.test.tsx`）：
  - HistorianChat：mock `explainAI` 返回带 `next_exploration` 的响应，断言 `TrustDisplay` 渲染且点击调用 `onEntityClick`。
  - ResearchReport：断言生成的 question **不含**「兴趣延展/同一时期的世界」；`next_exploration` 非空时卡片出现。
- **11 类行为回归**（QA 交付物，独立脚本/用例集）：Fact / Why / Cause / Impact / Relationship / Temporal / Comparison / Uncertainty / Out-of-context / Unsupported / Exploration——每类给出「输入→期望契约行为」对照，证明 AI 不杜撰、能表达不确定、探索入口真实可点。

---

## 12. Risks

| 风险 | 缓解 |
|------|------|
| 改 system prompt 后旧调用方行为漂移 | 契约仍为 JSON（与运行时一致）；所有模式共用 SYSTEM_PROMPT，已逐模式验证 directive 不削弱 grounding |
| 探索候选段过长污染 prompt | 仅 `next_exploration`（limit=3）格式化，3 条以内；空则 `""` 不追加 |
| 前端 `onEntityClick` 在某些挂载点作用域缺失 | 工人先读挂载点确认 `onEntityClick/onNavigateEntity` 是否可用；不可用则仅接可用路径，不擅自新增导航逻辑 |
| 误触禁令牌守卫 | 仅用 exploration/claim/relationship/candidate 等白名单词；不写 rag/neo4j/redis/vectordb/langchain/graphql |
| 改动 `tol=75` 闸门 | 明确禁止；实现时不触碰 builder/validator 构造参数 |

---

## 13. Out of Scope（冻结，严禁改动）

- `exploration_planner.py` / `grounding_builder.derive_next_exploration` / `ExplorationPolicy` / Candidate 生成与排序
- `response_validator.py` 逻辑、`GroundingBuilder`、Phase2 Pipeline、`context_serializer`
- KG 遍历、时间轴、ETL/ingestion、`KnowledgeService`
- 任何新依赖、新的 memory/状态层（spec 明确 minimal memory）
- 既有的确定性「探索建议」路径（已正确，仅 AI 对话路径补缺口）

---

## 14. Plan Self-Review（10 项，§34）

| # | 自审项 | 结论 |
|---|--------|------|
| 1 | 是否只改 AI Response Layer？ | ✅ 仅 prompt_service / answer_service / 前端 AI 对话与报告组件 / 接入点 |
| 2 | 是否触碰冻结边界（planner/policy/KG/timeline/ETL）？ | ✅ 否；`_build_exploration_context` 仅只读消费 next_exploration |
| 3 | JSON 契约是否统一为单一来源（JSON）？ | ✅ 改 SYSTEM_PROMPT 规则 9 对齐运行时 JSON 契约 |
| 4 | 探索候选是否全部来自证据绑定、已校验的 next_exploration？ | ✅ 是；AI 只可引用列表，不可自创 |
| 5 | 「答案→探索」闭环是否真正打通（渲染+点击跳转）？ | ✅ 复用 TrustDisplay + onEntityClick 透传 |
| 6 | ResearchReport 幻觉源是否根除？ | ✅ 删除「兴趣延展」软指令，改由 next_exploration 卡片 |
| 7 | tol=75 时间闸门是否保留？ | ✅ 不在改动范围，实现约束写明 |
| 8 | 禁令牌守卫是否遵守？ | ✅ 仅用白名单词 |
| 9 | 是否引入新依赖/新状态层？ | ✅ 否（minimal memory） |
| 10 | 是否保持 uncommitted 供 PO 决策发布？ | ✅ 全部 dirty，不提交 |

**结论：10 项全绿，直接施工。** 优先级 P0（历史正确性/Grounding/Citation/Temporal）→ P1（AI Historian 产品行为/Prompt/Response Contract/AI 与探索结果衔接）→ P2（Runtime 一致性/Legacy-Mock 清理）。
