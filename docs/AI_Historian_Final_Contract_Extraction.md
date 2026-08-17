# Final AI Historian Contract Extraction

> 只读提取 · 基于当前 `phase5-journey-continuity` 已落地代码
> 用途：PO 前端实测前的 Final Product Contract Review
> 生成时间：2026-08-17
> 性质：**不修改任何代码、不优化算法、不提新方案**——仅把当前施工后的最终状态完整提取

---

## ① 最终实际生效的 System Prompt 原文

来源：`backend/app/ai_gateway/prompt_service.py` `SYSTEM_PROMPT`（ADR-0003 grounding 契约 + AI Historian 重定位 F1/F4/F5 加的规则 9–12）

```
You are a careful historian assistant for History Explorer.
You explain and synthesize knowledge that already exists in the user's exploration.
Rules you MUST follow:
1. Use ONLY the facts provided in the [ALLOWED FACTS] section. Do not use any outside knowledge.
2. Never invent historical facts, dates, people, or events.
3. Never claim relationships between entities that are not present in [ALLOWED FACTS].
4. Do not modify, extend, or rewrite the knowledge graph.
5. When the facts do not cover the question, say you cannot answer from the current knowledge.
6. Keep answers concise and cite the source entity or relationship names you used.
7. Answer in Simplified Chinese (简体中文) unless the user's question is written in another language.
8. The [ALLOWED FACTS] describe the entity the user is currently exploring. Keep that focal entity at the center of your answer. You MAY draw connections to its directly-related neighbors (also present in the facts) to give helpful context or cross-civilization comparison, but you MUST NOT wander to unrelated subjects that are absent from the provided facts.
9. You MUST reply in the JSON format described in the user instructions (an object with "answer" and "citations" fields). The "answer" field is a single natural-language paragraph in Simplified Chinese; do NOT nest JSON, code blocks, or markdown fences inside the "answer" string. The "citations" field lists only the source ids you actually used from [ALLOWED FACTS].
10. Fact vs interpretation: strictly separate facts taken from [ALLOWED FACTS] from your own synthesis or interpretation. Present interpretation as reasoning anchored to those facts; never present interpretation as if it were a stated fact.
11. Uncertainty: when [ALLOWED FACTS] are insufficient to answer, explicitly state that the current knowledge cannot confirm the answer. Do not fill gaps with outside knowledge or guesses.
12. Exploration hook: if your answer naturally leads toward one of the items in the [EXPLORATION CANDIDATES] section, you may mention it as a 'further exploration direction' for the user. You MAY ONLY reference items listed there — never invent a relationship, entity, or candidate of your own.
```

关键事实：规则 9 已被 AI Historian 重定位改为**强制 JSON 契约**（原 ADR-0003 是 "Do NOT wrap in JSON"）。规则 10/11/12 是本任务新增。

---

## ② 所有 Mode Directive 原文

来源：`prompt_service.py` `_MODE_DIRECTIVES`。每个 mode 指令**追加**到 `SYSTEM_PROMPT` 之后（base grounding 契约逐字共享，per-mode 不改写）。`template_for(mode)` 把二者拼成完整 system prompt。

| mode key | Directive 原文 |
|---|---|
| `explain` | "Focus: give a clear, balanced explanation of the subject using only the allowed facts." |
| `why_important` | "Focus: explain WHY the subject matters historically — its significance and legacy — using only the allowed facts." |
| `why_happened` | "Focus: explain WHY the subject happened — causes, preconditions and driving forces — using only relationships present in the allowed facts. Never assert a cause that is not backed by an allowed fact." |
| `historical_impact` | "Focus: explain the IMPACT and consequences of the subject — what changed afterwards — using only the allowed facts." |
| `multi_civilization_view` | "Focus: compare how the subject connects ACROSS civilizations and regions, using cross-topic relationships (including 2-hop chains) present in the allowed facts." |
| `timeline_explanation` | "Focus: explain the subject as a chronological sequence, ordering only the timeline facts provided. Never invent dates or periods." |

未知/空 mode 一律回退 `explain`（`template_for` 兜底）。

---

## ③ User Prompt 组装方式及最终结构

来源：`prompt_service.build_user_prompt` + `answer_service.grounded_answer`

**组装公式**（AI 路径）：
```
user_prompt =
    build_user_prompt(question, facts)        # = [ALLOWED FACTS] 段 + "Question: ..."
  + _CITATION_INSTRUCTION                     # JSON 契约指令
  + _build_exploration_context(next_exploration)   # [EXPLORATION CANDIDATES] 段（空则不加）
```

**`build_user_prompt` 原文逻辑**（`prompt_service.py:83`）：
```python
def build_user_prompt(question, facts):
    section = build_grounding_section(facts)   # "[ALLOWED FACTS]\n- f1\n- f2..."
    return "%s\nQuestion: %s\n" % (section, question)
```

**最终 User Prompt 三段式结构**：
```
[ALLOWED FACTS]
- {fact 1}
- {fact 2}
...（grounding.facts 实体/关系/时间线描述 + 经 Phase2 验证的 claim 证据行）

Question: {用户问题}

Reply ONLY with a JSON object of the form:
{"answer": "<your grounded answer>", "citations": [{"global_id": "<id>", "kind": "entity|relationship|timeline", "label": "<short source label>"}]}
Every citation.global_id MUST be an entity/relationship/timeline id that appears in [ALLOWED FACTS]. Do not cite anything absent from the facts.

[EXPLORATION CANDIDATES]
The following next-step exploration candidates are derived from the knowledge graph and already validated by the evidence layer (they are NOT generated by you):
- relationship=participated_in | target=roman_empire:event-roman-empire-established | reason=因为：...
...
If your answer naturally leads to one of them, you may point it out as a 'further exploration direction'. Reference ONLY the items listed here; never invent your own.
```

**facts 的来源**：`facts = list(grounding.facts) + _claim_facts(valid_claims, claim_sources)`（answer_service 第 423 行）——即 GroundingBuilder 抽出的事实 **加** Phase2 验证 claim 的证据行（`Evidence [source: 标题 | tier: 等级] 文本`）。

---

## ④ Grounding Context 注入结构

来源：`prompt_service.build_grounding_section` + `GroundingResult.facts` + `_claim_facts`

- **段头**：`[ALLOWED FACTS]`
- **无事实时**：`(none provided)`
- **有事实时**：每行 `- {fact}` 的 bullet 列表
- **事实内容两类**：
  1. `grounding.facts`：GroundingBuilder 从 KnowledgeService 抽出的实体/关系/时间线事实字符串
  2. `_claim_facts` 行：`Evidence [source: {title} | tier: {tier}] {claim_text}` —— 把 Truth layer（来源等级 + 争议备注）带进 prompt，让模型看见"哪条证据支撑、强度如何"

**边界**：AI **只读**这一段；`[ALLOWED FACTS]` 由后端确定性构建，模型不可修改、不可扩展知识图谱（规则 4）。

---

## ⑤ EXPLORATION CANDIDATES 注入结构

来源：`answer_service._build_exploration_context`（第 249–288 行）

**纯只读格式化**（F5）：**不调用 planner、不重排、不新生成**。直接把冻结的 `next_exploration`（来自 `plan_exploration`，已 evidence-validated）格式化为 prompt 段。

**段头**：`[EXPLORATION CANDIDATES]`
**引导语**：*"The following next-step exploration candidates are derived from the knowledge graph and already validated by the evidence layer (they are NOT generated by you):"*

**每条格式**：
```
- relationship={rel} | target={global_id} | reason={reason}
```
（`relationship`/`global_id` 必填；`reason` 有则附）

**尾部约束**：*"If your answer naturally leads to one of them, you may point it out as a 'further exploration direction'. Reference ONLY the items listed here; never invent your own."*

**`next_exploration` 每条数据字段**（来自 `exploration_planner`，最终透传到前端 `AINextExploration`）：
`global_id, label, relationship, source_id, claim_ids, reason?, claim_text?, source_title?, source_tier?, source_creator?, source_publisher?, source_type?`

---

## ⑥ 最终 JSON Response Contract

### 6a. 模型被要求产出的 JSON（LLM 输出契约，`_CITATION_INSTRUCTION`）
```json
{
  "answer": "<your grounded answer>",
  "citations": [
    {"global_id": "<id>", "kind": "entity|relationship|timeline", "label": "<short source label>"}
  ]
}
```
- `answer`：单段简体中文自然语言；**禁止**在 answer 字符串内嵌套 JSON / 代码块 / markdown fence（规则 9）
- `citations`：只列实际用到的、且出现在 `[ALLOWED FACTS]` 的 source id

### 6b. 服务端最终返回给前端的 `AIResponse`（answer_service，AI 路径）
```jsonc
{
  "answer": "string",
  "perspectives": "string[]",          // 来自 validated claims 的 interpretation_note（ADR-0018 策展异议，非模型编造）
  "evidence": [                        // 已验证证据视图（status: verified）
    {"global_id","kind","label","status":"verified", "claim_id"?,"source_id"?,"source_title"?,"source_tier"?,"truth"?}
  ],
  "confidence": "high|medium|low",     // 服务端按验证结果计算，不信任模型自评
  "citations": [{"global_id","kind","label"}],
  "rejected_citations": [{"global_id","kind","label"}],
  "grounded": "boolean",               // ResponseValidator 对 expanded scope 验证结果
  "engine": "ai|ai_unverified|deterministic",
  "next_exploration": [ AINextExploration... ],
  "question": "string",
  "context_global_ids": ["string"],
  "mode": "string"
}
```

**前端二次处理**（aiClient.ts `unwrapFencedAnswer`）：后端偶发把 ` ```json … ``` ` 原样塞进 answer（嵌套 JSON / 截断未闭合）→ 前端统一剥 fence 取 `answer` 字段；非该形态原样返回。

**确定性兜底路径**（provider 无 / 事实为空 / 解析失败）→ `engine="deterministic"` 或 `ai_unverified`，answer 由 validated claim 文本拼成，明确**不标为 AI 生成**。

---

## ⑦ AI Historian Behavior Contract（行为契约归纳）

| 维度 | 契约内容（源自代码规则） |
|---|---|
| **AI 的角色** | "careful historian assistant"——只解释与综合**用户探索中已存在**的知识，不做知识发现、不替代探索算法 |
| **回答原则** | 只用语义锚定在 `[ALLOWED FACTS]`；锚定实体居中；可延伸到直接相关邻居（跨文明比较）但**绝不**跑题到事实之外的主题（规则 1/8） |
| **事实处理** | 严格分离「事实（取自 FACTS）」与「自己的综合/解读」；解读必须锚定事实，不得伪装成既定事实（规则 10） |
| **解释/不确定性** | 事实不足时**明确声明**"当前知识无法确认"，不靠外部知识或猜测填补（规则 5/11） |
| **因果解释** | `why_happened` 模式：只讲 `[ALLOWED FACTS]` 中存在的因果关系；**绝不**断言无事实支撑的成因 |
| **历史关系解释** | `multi_civilization_view`：用事实中（含 2-hop 链）的跨主题关系解释连接；`timeline_explanation`：只按提供的时间线排序，**不编造日期/时期** |
| **探索引导** | 仅当答案自然引向 `[EXPLORATION CANDIDATES]` 中某项时，可点出为"further exploration direction"；**只引用列表项，绝不自造关系/实体/候选**（规则 12） |
| **禁止行为** | 不用外部知识；不编造事实/日期/人物/事件；不声称 FACTS 外的关系；不修改/扩展/重写知识图谱；不在 answer 内嵌 JSON/fence；不自评置信度（服务端算） |
| **不得幻觉的边界** | 硬边界 = `[ALLOWED FACTS]` 内容 + `[EXPLORATION CANDIDATES]` 列表；任何超出这两者的断言、关系、候选都违反契约；Citation 必须可回溯到 FACTS 中的 id（ResponseValidator 对 expanded scope 校验） |

---

## ⑧ Final User Experience Contract（用户最终应获得的体验）

来源：前端 `HistorianChat.tsx` + `TrustDisplay.tsx` + `aiClient.ts` + system prompt

**用户看完回答后应获得的认知**
- 围绕当前实体（如"商鞅变法"）的一个**简洁、有出处**的中文解释，且明确知道"这句话基于哪条知识库证据"
- 一个**可信度信号**：引擎徽标（AI 生成 / 知识库推荐）+ 置信度（高/中/低）+ 证据来源等级（primary/academic/reference）
- 一组**真实存在、可一键跳转**的"下一步探索"候选——每个带关系类型、理由、证据原文、来源书目，点击直接导航到对应实体（不丢用户回图谱）

**情绪 / 认知变化**
- 从"我知道了这个知识点"→"我知道**为什么**它成立、它连接着谁"——解释层把孤立事实织成关系网
- 由"被 AI 喂结论"→"我能审 AI 的证据"——citation + evidence + 置信度让答案**可审计**
- 由"看完即止"→"想顺着关系继续走"——探索候选把**好奇心变成可执行的下一步**

**为什么会产生下一步探索欲**
- 答案本身被约束为"锚定实体的解释"，天然留白（邻居、同期、因果）被 `[EXPLORATION CANDIDATES]` 显式接住——用户看到"原来还有这条相关的路"，且这条路是图谱验证过的、点一下就到

**什么样的回答算"达到目标"**
- answer 中文、单段、带 citation、不超事实边界
- 用户能说清"我懂了为什么在这个实体上会这么讲"
- 用户产生了**至少一个**点击下一步探索的动作（或明确感知到"还有可走的路"）
- 无幻觉、无跨时代错乱（ADR-0028 tol=75 已兜住丝路类 bug）、无静默虚构候选

---

## ⑨ 5 个典型用户问题 + 理想回答特征

不虚构知识库事实，只描述"理想回答应具备什么特征"。

**Q1「商鞅变法为什么会发生？」**（mode=why_happened）
- 特征：只讲 FACTS 中存在的成因（如战国争霸压力、秦国渴求强兵）；**不**断言"因为法家思想流行"之类无事实支撑的因果；结尾可点出 `[EXPLORATION CANDIDATES]` 里"秦国""战国"为下一步

**Q2「罗马帝国对后世有什么影响？」**（mode=historical_impact）
- 特征：列出 FACTS 中的后果（法律/行政遗产等）；每条带 citation；不扩展进 FACTS 外的"影响现代民主"等过度论断

**Q3「丝绸之路连接了哪些文明？」**（mode=multi_civilization_view）
- 特征：用跨主题关系（含 2-hop）解释连接；中文；标注"此连接基于知识图谱关系 X"；不编造未记录的中转文明

**Q4「文艺复兴的时间线是怎样的？」**（mode=timeline_explanation）
- 特征：只按提供的时间线事实排序叙述；**绝不**发明日期或时期；事实缺段时显式说"该时段暂无知识库记录"

**Q5「这个和同时期的波斯帝国有什么关系？」**（mode=explain + 探索钩子）
- 特征：若 FACTS 中确有跨文明关系则解释并带 citation；若**无**直接关系，诚实说"当前知识未记录二者直接联系"，**不**硬编；若 `[EXPLORATION CANDIDATES]` 含波斯相关实体，点出为可探索方向

---

## ⑩ 技术上已完成 vs 产品效果尚未证明

| 技术上已完成（代码已落地、测试已绿） | 产品效果尚未证明（需前端实测/用户验证） |
|---|---|
| System Prompt 12 条规则 + 强制 JSON 契约（规则 9–12）已写入并生效 | 用户实际读 answer 时是否"感到被解释清楚、而非被喂结论"（认知变化未测） |
| 6 个 Mode Directive + 未知回退 explain | 不同 mode 的回答质量差异是否用户可感知、是否有用 |
| `[ALLOWED FACTS]` 段（grounding.facts + Phase2 验证 claim 证据行）注入 | 事实不足时"诚实说无法确认"的措辞，用户是否接受（而非觉得答非所问） |
| `[EXPLORATION CANDIDATES]` 只读注入（F5，不重排/不新生成） | 探索候选"点击→真实跳转"在 5174 实测是否顺滑、是否真引发探索欲 |
| 后端 JSON 响应契约（answer/citations/evidence/confidence/next_exploration）+ 确定性兜底 | citation/evidence/置信度 UI 是否真提升"可审计感"，还是信息过载 |
| 前端 TrustDisplay 渲染候选（关系 badge + 理由 + 证据 + 来源，点击→onEntityClick） | "下一步探索欲"是否真被激发（UX 情绪目标未量化） |
| ResponseValidator 对 expanded scope 校验 citation（无幻觉边界） | 跨时代错乱在**真实用户随机问题**下是否零漏网（tol=75 仅减症状，非根治） |
| 前端 unwrapFencedAnswer 兜底后端 fence 异常 | 模型偶发不遵守 JSON 契约时，前端兜底后答案读感是否仍自然 |
| 41 项相关前端测试 + 85 项后端测试 + tsc 0 错误 + 禁令牌守卫通过 | 真实用户（非测试集）对"AI 历史学家"整体满意度的主观验证 |
| 全链路冻结边界未触碰（planner/policy/validator/tol=75/KnowledgeService） | 冻结边界"不改"是否真意味着产品体验达到 Article 0「离开更聪明」目标 |
