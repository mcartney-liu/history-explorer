# M82 Causal Data Contract Review

> **阶段**：M82 Phase 1 P1.1 前置审核
> **模式**：只读分析 + 数据契约设计
> **日期**：2026-08-05
> **状态**：Contract Review（禁止创建数据文件）

---

## A. Schema Definition

`CausalStatement` 数据契约（基于 `backend/app/core/causal/model.py` + M82 Constraint Lock C-7）：

| # | 字段 | 类型 | 必填 | 产品语义 |
| --- | --- | --- | --- | --- |
| 1 | `id` | `str` | ✅ 是 | 全局唯一标识符，格式：`cs-{编号}`（如 `cs-001`） |
| 2 | `cause_id` | `str` | ✅ 是 | 原因端的 KG Entity GID（如 `china_v1:idea-keju`） |
| 3 | `effect_id` | `str` | ✅ 是 | 结果端的 KG Entity GID（如 `china_v1:idea-wenguan`） |
| 4 | `mechanism` | `str \| null` | 否 | 因果机制：回答"通过什么过程，原因导致了结果？" |
| 5 | `consequence` | `str \| null` | 否 | 因果后果：回答"这个因果关系的长期影响是什么？" |
| 6 | `confidence` | `"high"` \| `"medium"` \| `"low"` \| `null` | 否 | 策展者置信度（C-7 固化） |
| 7 | `evidence_refs` | `str[]` | 否（默认 `[]`） | 引用的 Evidence Claim ID 列表（指向 `evidence_claims.json`） |

> 注：`id` 字段在 `causal/model.py` 的 `CausalStatement` dataclass 中未定义——它是数据层的标识符，建议在 `causal_statements.json` 中作为顶层字段，不写入 `CausalStatement` dataclass（`CausalStatement` 是语义模型，`id` 是数据管理字段）。

---

## B. Field Semantics

### B.1 `cause_id` / `effect_id`

| 项 | 内容 |
| --- | --- |
| **产品语义** | 因果关系的两端，引用 KG 中已存在的 Entity GID |
| **允许内容** | 任何 `data/examples/*.json` 中已注册的 `global_id` |
| **禁止内容** | 不存在的 GID；非 KG Entity 的任意字符串；Relationship ID（cause/effect 必须指向 Entity，不是 Relationship） |
| **示例** | `cause_id: "china_v1:idea-keju"`, `effect_id: "china_v1:idea-wenguan"` |

### B.2 `mechanism`

| 项 | 内容 |
| --- | --- |
| **产品语义** | 因果机制：回答"**通过什么过程**，原因导致了结果？" |
| **允许内容** | 自然语言中文文本，描述因果传导过程。长度建议 1–3 句（50–200 字） |
| **禁止内容** | 纯枚举列表（"1. A 2. B 3. C"）；重复 cause_id/effect_id 的名称而不解释过程；英文（Phase 1 仅中文） |
| **正例** | "科举制度通过标准化考试选拔文官，取代了门阀世袭的选官方式。考试成绩而非出身成为晋升标准，使得受过儒学教育的士人阶层进入权力核心，逐步形成以文官为主导的官僚体系。" |
| **反例** | "科举导致了文官体系。"（无过程，仅重复 cause→effect） |

### B.3 `consequence`

| 项 | 内容 |
| --- | --- |
| **产品语义** | 因果后果：回答"这个因果关系的**长期影响**是什么？" |
| **允许内容** | 自然语言中文文本，描述该因果链对后续历史的影响。长度建议 1–3 句（50–200 字） |
| **禁止内容** | 重复 mechanism 的内容（mechanism 讲过程，consequence 讲影响）；过度延伸的推测（"如果没有科举，中国今天会…"） |
| **正例** | "文官体系的确立使中国形成了世界上最早的职业官僚制度，这一体系持续了约1300年（隋至清），深刻塑造了东亚政治文化。与同时期的欧洲封建制度相比，中国文官体系的选拔性和专业性具有显著的制度优势。" |
| **反例** | "文官体系使中国成为一个强大的国家。"（空泛，无具体影响） |

### B.4 `mechanism` vs `consequence` 边界

| 维度 | mechanism | consequence |
| --- | --- | --- |
| **回答的问题** | "怎么发生的？" | "然后怎么样了？" |
| **时间焦点** | 因果发生的当下过程 | 因果关系产生后的长期影响 |
| **内容特征** | 传导链条、机制描述 | 影响范围、历史意义、跨文明对比 |
| **可缺省？** | 可以（`null`） | 可以（`null`） |
| **典型长度** | 50–150 字 | 50–200 字 |

### B.5 `confidence`

| 项 | 内容 |
| --- | --- |
| **产品语义** | 策展者评估的置信度（Curator assessed confidence） |
| **允许值** | `"high"` \| `"medium"` \| `"low"` \| `null` |
| **high** | 策展者确认：这一因果关系在学术界有广泛共识，有多个权威来源支撑 |
| **medium** | 策展者认为：有证据支撑但存在学术争议，或因果链中某些环节是推论 |
| **low** | 策展者标注：此为初步假设、有争议的解释、或证据有限 |
| **null** | 未标注置信度（等同于"不发表意见"） |
| **禁止内容** | 浮点数（0.0–1.0）；算法计算的置信度；AI 模型输出的置信度；预测概率 |

### B.6 `evidence_refs`

| 项 | 内容 |
| --- | --- |
| **产品语义** | 支撑此 CausalStatement 的 Evidence Claim 引用列表 |
| **允许内容** | `evidence_claims.json` 中已存在的 `id` 字段值（如 `"ec-001"`） |
| **禁止内容** | 不存在的 claim ID；空引用（`[]` 可接受，但建议每条 CS 至少有 1 个 evidence_ref）；新创建的 source ID（M82 不创建新 source） |

---

## C. Writing Rules

### C.1 通用规则

| # | 规则 | 理由 |
| --- | --- | --- |
| R1 | mechanism 和 consequence 必须用**完整中文句子**书写，不得使用项目符号列表 | Explorer 阅读的是自然语言叙事，不是结构化字段 |
| R2 | mechanism 中必须提及 cause 和 effect 的具体名称（如"科举制度""文官体系"），而非仅用 GID 或代词 | Explorer 看到的是文本，看不到 GID |
| R3 | consequence 应包含**跨文明/跨时代的对比视角**（如"与同时期的 X 相比…"） | M81a 验证发现跨文明对比是强需求（3/4 Explorer） |
| R4 | 每条 CS 至少引用 1 个 evidence_refs（`evidence_claims.json` 中的 claim） | M80.5 P06 要求：CausalStatement 附带 Evidence 引用 |
| R5 | confidence 为 `"low"` 的 CS，其 mechanism 中必须包含学术不确定性的表述（如"可能""推测""有争议"） | Risk #1 缓解：low confidence 必须与 mechanism 文本一致，避免 UI 上出现"文本说得很确定但标识是 low"的矛盾 |
| R6 | 不得在 mechanism/consequence 中引用不存在的 Entity/Event（即未在 KG 中注册的 GID） | KG 数据一致性 |

### C.2 策展者写作清单

策展者在创建每条 CausalStatement 时，应逐项确认：

- [ ] `cause_id` 和 `effect_id` 指向真实存在的 KG Entity GID
- [ ] `mechanism` 描述了因果传导过程（不是仅重复 cause→effect）
- [ ] `consequence` 描述了长期影响（不是重复 mechanism）
- [ ] `confidence` 为 `"high"` / `"medium"` / `"low"` / `null` 之一
- [ ] `evidence_refs` 中的每个 ID 存在于 `evidence_claims.json`
- [ ] 如果 `confidence` 为 `"low"`，mechanism 文本中包含学术不确定性表述

---

## D. Five CS Design Review

### CS-01：科举制度 → 文官体系建立

| 字段 | 设计审核 |
| --- | --- |
| `cause_id` | `china_v1:idea-keju`（科举制度）— ✅ GID 存在 |
| `effect_id` | `china_v1:idea-wenguan`（文官体系）— ✅ GID 存在 |
| `mechanism` | 需描述：科举如何通过考试选拔 → 取代门阀世袭 → 儒学士人进入权力核心 → 文官体系形成 |
| `consequence` | 需描述：文官体系持续 1300 年的历史影响 → 与欧洲封建制度的对比 |
| `confidence` | `"high"` — 学术界广泛共识，大量一手文献支撑 |
| `evidence_refs` | 需引用 1–2 条 evidence claim（建议涵盖科举制度和文官体系的文献证据） |
| **判定** | ✅ 设计合理。这是中国文明包中最基础的因果链，M81a 验证中 E1/E2/E5 三场都自然走了这条路径 |

### CS-02：三省六部 → 内阁体系

| 字段 | 设计审核 |
| --- | --- |
| `cause_id` | `china_v1:idea-sanxing-liubu`（三省六部）— ✅ GID 存在 |
| `effect_id` | `china_v1:idea-neige`（内阁体系）— ✅ GID 存在 |
| `mechanism` | 需描述：三省六部的决策效率问题 → 内阁作为皇帝的咨询机构崛起 → 权力从三省向内阁转移的过程 |
| `consequence` | 需描述：内阁制对明清政治的影响 → 与西方内阁制的差异 |
| `confidence` | `"high"` — 制度演化路径清晰，文献支撑充分 |
| `evidence_refs` | 需引用 2 条 evidence claim（三省六部和内阁的文献证据） |
| **判定** | ✅ 设计合理。这是 M81a 验证中 E2 实际探索的多跳因果链（科举→三省六部→内阁） |

### CS-03：汉朝 → 丝绸之路开通

| 字段 | 设计审核 |
| --- | --- |
| `cause_id` | `china_v1:tp-tang` 或汉朝 Entity（需确认汉朝是否有 GID）— ⚠️ 中国文明包聚焦唐至清，汉朝可能不在 `china_civilization_v1_example.json` 中。建议改用 `china_v1:civ-zhonghua`（中华文明）或唐→宋的丝绸之路延续作为替代 |
| `effect_id` | 丝绸之路相关 Entity — ⚠️ 中国文明包中可能无"丝绸之路"的独立 Entity |
| **判定** | ⚠️ **需要重新设计**。中国文明包聚焦唐至清，汉朝和丝绸之路的 Entity 可能在 `silk_road_example.json` 中。方案：改为唐→宋的文化传播因果链（如"唐诗 → 宋词演变"），使用中国包内已有的 GID |
| **替代方案** | CS-03 改为：`china_v1:idea-tangshi`（唐诗）→ `china_v1:idea-songci`（宋词），描述诗歌体裁从唐到宋的演化过程 |

### CS-04：宋朝 → 理学兴起

| 字段 | 设计审核 |
| --- | --- |
| `cause_id` | `china_v1:tp-song`（宋朝）— ✅ GID 存在 |
| `effect_id` | `china_v1:idea-lixue`（理学）— ✅ GID 存在 |
| `mechanism` | 需描述：宋朝重文抑武 → 儒学复兴 → 二程/朱熹融合佛道思想 → 理学成为官学。文本中需包含学术不确定性表述（如"理学兴起的原因在学术界仍有争议"）— R5 规则 |
| `consequence` | 需描述：理学对中国后世思想/教育/科举的深远影响 |
| `confidence` | `"low"` — 理学的兴起原因在学术界有争议（经济因素？政治因素？思想内在演化？） |
| `evidence_refs` | 需引用 1 条 evidence claim |
| **判定** | ✅ 设计合理。`confidence: "low"` 是 M82 验证低置信度 UI 展示的关键测试用例（Risk #1 缓解） |

### CS-05：明朝 → 郑和下西洋

| 字段 | 设计审核 |
| --- | --- |
| `cause_id` | `china_v1:tp-ming`（明朝）— ✅ GID 存在 |
| `effect_id` | `china_v1:event-zheng-he`（郑和下西洋）或 `china_v1:person-zheng-he`（郑和）— ⚠️ 建议用 `china_v1:event-zheng-he`（事件）作为 effect，比 person 更符合因果语义 |
| `mechanism` | 需描述：明成祖的政治需求（宣扬国威/寻找建文帝）→ 郑和船队的组建 → 航海技术支撑 → 七下西洋的历程 |
| `consequence` | 需描述：郑和下西洋对中国海洋贸易/外交的影响 → 与欧洲大航海的对比 → 为什么中国后来停止了远洋探索（复杂后果） |
| `confidence` | `"high"` — 历史记载明确 |
| `evidence_refs` | 需引用 2 条 evidence claim |
| **判定** | ✅ 设计合理（effect 建议用 `china_v1:event-zheng-he`）。consequence 的"复杂后果"（停止远洋探索的原因）是验证长文本 consequence 渲染的测试用例 |

### D 节结论

| CS | 判定 | 调整 |
| --- | --- | --- |
| CS-01 | ✅ 通过 | 无 |
| CS-02 | ✅ 通过 | 无 |
| **CS-03** | ⚠️ **需重新设计** | 汉朝/丝路不在中国包内。替代：唐诗→宋词（`china_v1:idea-tangshi` → `china_v1:idea-songci`） |
| CS-04 | ✅ 通过 | mechanism 需包含学术不确定性表述（R5） |
| CS-05 | ✅ 通过 | effect 建议用 `china_v1:event-zheng-he` 而非 `china_v1:person-zheng-he` |

---

## E. P1.1 Creation Checklist

策展者在创建 `data/causal_statements.json` 前，逐项确认：

### 文件级

- [ ] 文件路径：`data/causal_statements.json`
- [ ] 格式：JSON 数组，每条一个 CausalStatement 对象
- [ ] 包含 `id` 字段（格式 `cs-001` ~ `cs-005`）
- [ ] 文件编码：UTF-8

### 字段级（每条 CS 逐项检查）

- [ ] `cause_id` 和 `effect_id` 的 GID 存在于 `data/examples/china_civilization_v1_example.json`
- [ ] `mechanism` 描述了因果传导过程（非重复 cause→effect）
- [ ] `consequence` 描述了长期影响（非重复 mechanism）
- [ ] `confidence` 为 `"high"` / `"medium"` / `"low"` / `null` 之一
- [ ] `evidence_refs` 中的每个 ID 存在于 `data/evidence_claims.json`
- [ ] CS-04 的 mechanism 文本中包含学术不确定性表述（R5）
- [ ] CS-05 的 effect_id 使用 `china_v1:event-zheng-he`（事件）而非 person

### 跨 CS 检查

- [ ] 5 条 CS 覆盖了所有 confidence 级别（high × 3, medium × 1, low × 1）
- [ ] 5 条 CS 覆盖了不同的 evidence_refs 数量（1 条 / 2 条 / 3 条）
- [ ] CS-03 已重新设计（唐诗→宋词替代汉朝→丝路）

---

> 模式：只读分析
> 审查对象：`CausalStatement` schema + 5 条 CS 设计
> 日期：2026-08-05
> 状态：Contract Review — CS-03 需重新设计，其余通过
