# M82 Semantic Layer Scale Stress Report

> **阶段**：M82 Semantic Layer Future Data Ingestion Stress Test
> **模式**：只读分析
> **日期**：2026-08-05
> **结论**：**PASS WITH FUTURE EXTENSION — 当前 Schema 对 M82 足够，未来扩展路径清晰**

---

## A. 真实历史数据建模压力测试

### Case 1：同一因果对的多学术解释

**场景**：工业革命 → 城市化，存在技术进步解释和资本积累解释。

**当前 Schema 能力**：

```json
{"id": "cs-100", "cause_id": "X:industrial-rev", "effect_id": "X:urbanization",
 "mechanism": "技术进步解释：蒸汽机和工厂系统将生产集中到城市...", ...}
{"id": "cs-101", "cause_id": "X:industrial-rev", "effect_id": "X:urbanization",
 "mechanism": "资本积累解释：圈地运动和原始积累将劳动力推向城市...", ...}
```

| 判定 | 说明 |
| --- | --- |
| ✅ **支持** | `(cause_id, effect_id)` 对不是唯一键。Adapter 返回 `List[CausalStatement]`——同一因果对的多个解释天然共存 |
| ✅ **无需新增字段** | `mechanism` 的自由文本足以承载不同学术解释。不需要 `theory`/`school` 字段——解释的内容差异体现在 mechanism 文本中，不需要用枚举标签归类 |

**为什么不需要 `theory`/`school` 字段**：学派标签是**元数据**（这条解释属于哪个学派），不是**语义**（这条解释说了什么）。如果加 `theory: "marxist"`，未来会出现学派分类的争议（"这条解释到底算不算马克思主义？"）。让 mechanism 文本自己说话，比贴标签更准确。

---

### Case 2：同一事件的多学派解释

**场景**：法国大革命的原因——马克思主义解释、经济结构解释、政治文化解释。

| 判定 | 说明 |
| --- | --- |
| ✅ **支持** | 三条独立的 CausalStatement，分别以不同 cause_id 指向法国大革命（或同一 cause_id 的不同方面），mechanism 文本承载各自的解释逻辑 |
| ✅ **无需 `perspective`/`school` 字段** | 同 Case 1 理由。CausalStatement 是"说了什么"，不是"谁说的" |

**唯一需要注意的**：三条 CS 的 `confidence` 可能不同（马克思主义解释在 20 世纪是 high，今天可能是 medium）。这恰是 confidence 字段的价值——它记录的是"策展者此刻评估的置信度"，会随时间变化。

---

### Case 3：因果关系的学术修订

**场景**：旧观点（战争因民族矛盾）→ 新研究（经济因素更重要）。

| 判定 | 说明 |
| --- | --- |
| ✅ **当前支持共存** | CS-old 和 CS-new 作为独立记录共存，用户看到两条解释 |
| ⚠️ **需 `replaces`/`replaced_by` 增强** | 如需标记"CS-new 取代 CS-old"，需要 Future Compatibility §D 的三个字段（M84+） |

**不需要 `revision`/`version` 数字字段**：历史因果解释的版本不是"v1.0 → v2.0"的线性迭代——它是"旧观点被新证据取代"。`replaces`（新→旧的单向链表）比版本号更准确地表达这种关系。版本号暗示"新版本总是更好"，但历史研究中新解释不一定比旧解释更正确——只是基于更新的证据。

---

### Case 4：跨文明因果

**场景**：中国科举制度 → 欧洲文官制度讨论（跨 `china_v1` 和 `europe` namespace）。

| 判定 | 说明 |
| --- | --- |
| ✅ **支持** | `cause_id` 和 `effect_id` 是全局 GID（如 `china_v1:idea-keju`、`europe:civil-service`），天然跨 namespace |
| ✅ **已验证** | 当前 `evidence_claims.json` 中 `ec-023`（佛教从印度传至中国沿丝绸之路）就是跨 `ancient_india` 和 `silk_road` 的 evidence claim。CausalStatement 的 GID 引用机制同样跨 namespace |

**不需要额外字段**。GID 的 `{namespace}:{local_id}` 格式本身就是跨文明索引方案。

---

### Case 5：长文本历史解释

**场景**：真实专著可能产生 500 字 mechanism + 1000 字 consequence。

| 判定 | 说明 |
| --- | --- |
| ✅ **支持** | `mechanism` 和 `consequence` 是 `str` 类型，无硬性长度限制 |
| ⚠️ **不应限制长度** | 当前 Writing Rule 建议 50-200 字——这是 MVP 阶段的写作指南，不是 Schema 约束。真实历史解释可能需要更长篇幅 |
| ⚠️ **不应拆分为 narrative** | `mechanism` 回答"怎么发生的"，`consequence` 回答"然后怎样了"——两者语义不同，拆分是正确的。但不应进一步拆分（如 `mechanism_part1`/`mechanism_part2`）——那是 UI 渲染层的分段逻辑，不是 Schema 的职责 |

**建议**：Writing Rule 的长度建议从"50-200 字"改为"50-500 字"（放宽上限），在 M82 后的内容生产指南中更新。Schema 本身不需要改动。

---

## B. Semantic Layer 边界检查

### 未来真实书本数据的四层归属

| 数据 | 归属层 | 理由 |
| --- | --- | --- |
| CausalStatement（因果语义） | **Semantic Layer** | ✅ 当前 Schema |
| 年份/人物/地点/事件 | **Fact Layer** | 已存在（Entity KG），CausalStatement 仅引用 GID |
| 书名/作者/章节/页码 | **Source Infrastructure** | 已存在（`sources.json`），CausalStatement 不承载 |
| 学派/作者观点 | **Semantic Layer** 或 **不单独建模** | 见下方分析 |
| 争议/学术辩论 | **Semantic Layer**（隐式） | 多条 CS 的共存 + `confidence` 差异 = 隐式表达争议 |

### 是否需要额外 Layer？

**不需要。** 四层架构（Fact/Semantic/Inference/Exploration）已完整覆盖未来真实书本数据的全部信息类型。

### 学派/作者观点的归属

学派信息有两种处理方式：

| 方式 | 做法 | 评价 |
| --- | --- | --- |
| A | 在 CausalStatement 中加 `perspective: "marxist"` | ❌ 标签化——分类争议、简化复杂性 |
| B | 在 mechanism 文本中自然表达 | ✅ 当前做法——"马克思主义学者认为..."写在文本中 |

**建议保持方式 B**。学派信息不是 Schema 字段，是内容的自然表达。当用户搜索"马克思主义对法国大革命的解释"时，应该搜索 mechanism/consequence 文本，而不是过滤 `perspective` 枚举值。

---

## C. AI 未来介入风险检查

### 场景：AI 从教材自动发现因果候选

```
教材文本 → LLM 抽取 → 候选 CausalStatement → 专家审核 → Published
```

### 当前 Schema 是否需要两个模型（Candidate vs Published）？

| 判定 | 说明 |
| --- | --- |
| ✅ **Schema 层面不需要两个模型** | `CandidateCausalStatement` 和 `PublishedCausalStatement` 的字段结构完全相同——都是 cause_id/effect_id/mechanism/consequence/confidence/evidence_refs。区别在于"谁写的、审了没" |
| ⚠️ **需要 `proposed_by` 字段区分** | 当 AI 候选和人工策展混在同一文件中时，`proposed_by: "ai"` 是区分两者的最小字段。但这不是两个模型——是一条记录的一个属性 |
| ⚠️ **需要 Curation Pipeline 隔离** | AI 候选不应直接写入 `causal_statements.json`——应进入独立的 staging 文件（如 `causal_candidates.json`），经审核后迁移至正式文件。这是流程隔离，不是 Schema 隔离 |

### 避免 AI 污染正式知识层

**当前 Schema 的防护机制**：

| 机制 | 说明 |
| --- | --- |
| C-6 约束 | AI 不生成 CausalStatement——M82 范围内 100% 人工策展 |
| `proposed_by` 字段（M84+） | 未来区分 human/ai 来源 |
| Curation Pipeline（M84+） | staging 文件隔离 AI 候选和正式数据 |
| confidence 值域 | 策展者置信度——AI 不能标注 confidence（AI 没有"学术判断"能力） |

**结论**：当前 Schema 不需要两个模型。一个 `CausalStatement` + `proposed_by` 字段 + staging 文件隔离 = 足够的 AI 防护。

---

## D. 百万级性能模型检查

### 查询需求 vs 当前 Adapter API

| 查询需求 | 当前 API | 是否支持？ | 说明 |
| --- | --- | --- | --- |
| 某 Entity 的所有因果解释 | `get_for_entity(entity_id)` | ✅ | 已设计 |
| 某 Relationship 的所有解释 | `get_for_relationship(source, target, type)` | ✅ | 已设计 |
| 某路径的所有因果链 | `get_for_path(path)` | ✅ | 已设计 |
| 某时代所有因果链 | ❌ 无 | ⚠️ | 见下方 |
| 某文明所有因果故事 | ❌ 无 | ⚠️ | 见下方 |

### 是否需要 `query_by_period()` / `query_by_civilization()` / `query_by_topic()`？

**不需要在 Adapter 层增加。** 理由：

1. **"时代"和"文明"不是 CausalStatement 的属性**——它们是 cause/effect Entity 的属性（Entity.type = Time Period / Civilization）。查询"唐代所有因果链"应该通过 `get_for_entity("china_v1:tp-tang")` 获取以唐代为 cause/effect 的所有 CS，然后由上层（Exploration Engine）按时间排序
2. **Adapter 的职责是"给 ID，返回 CS"**——不是"理解查询语义"。按时代/文明/主题查询是 Exploration Engine 的职责
3. **如果需要全文搜索**（"搜索 mechanism 中包含 '科举' 的所有 CS"）——那是 Search Engine 的职责，不是 Adapter 的职责

**百万级时的正确分层**：

```
Search Engine（全文搜索）→ 返回 CS ID 列表
    ↓
Adapter.get_for_entity() / get_for_relationship() → 返回 CausalStatement
    ↓
Exploration Engine → 排序/过滤/组合
```

**M82 不需要引入 Search Engine**——5 条 CS 全文搜索 O(5) 即可。

---

## E. 最终判定

### PASS WITH FUTURE EXTENSION

| 维度 | 判定 |
| --- | --- |
| **Schema 通过验证** | ✅ 7 字段对 6 个 Stress Case 全部可表达 |
| **无需新增字段** | ✅ 一对多/多对一/多解释/跨文明/长文本 均被当前 Schema 支持 |
| **无需新 Layer** | ✅ 四层架构完整，学派/争议信息通过文本自然表达 |
| **无需双模型** | ✅ AI 候选通过 `proposed_by` + staging 文件隔离，不需要 CandidateCausalStatement |
| **无需新 Adapter API** | ✅ 按时代/文明查询是上层职责，Adapter 保持简单 |

### 必须提前设计的问题（M82 范围内不实现，但需在文档中记录）

| # | 问题 | 解决方案 | 引入时机 |
| --- | --- | --- | --- |
| 1 | `proposed_by` 字段 | `"human"` / `"ai"` / `null` | M84+（AI Pipeline 建立时） |
| 2 | `replaces` / `replaced_by` | 单向链表版本管理 | M84+（首次内容更新时） |
| 3 | `status`（published/deprecated） | 生命周期状态 | M84+（同上） |

### 可以延后的问题

| # | 问题 | 原因 |
| --- | --- | --- |
| 4 | `language` 字段 | 当前 5 条 CS 全中文，M82 不需要 |
| 5 | Adapter 哈希索引（百万级优化） | 5 条 CS 不需要；替换 Loader 内部实现，API 签名不变 |
| 6 | Search Engine | M84+ 内容扩展时引入 |
| 7 | Curation Pipeline staging 隔离 | AI Pipeline 建立时引入 |

### M82 不应加入的字段

| # | 字段 | 原因 |
| --- | --- | --- |
| — | `theory` / `school` / `perspective` | 学派信息应体现在 mechanism 文本中，非枚举标签 |
| — | `revision` / `version` | 版本号不适用于历史因果解释的"取代"关系 |
| — | `author` / `created_at` / `updated_at` | Curation Pipeline 元数据，非 Semantic Layer |
| — | `generated_by` / `review_status` | 同上 |
| — | `narrative` / `narrative_parts` | UI 渲染层分段逻辑，非 Schema 职责 |

### M84+ Schema Evolution Roadmap

```
M82 (current):    7 fields — MVP validation
  ↓
M84 (content):    + status, replaces, replaced_by — version management
  ↓
M84+ (AI pipe):   + proposed_by — AI/human distinction
  ↓
M85+ (scale):     Adapter internal indexing — no schema change
```

---

> 审查模式：只读
> 审查对象：`data/causal_statements.json` + `M82_CAUSAL_DATA_CONTRACT_FREEZE_RECORD.md`
> 日期：2026-08-05
> 结论：**PASS WITH FUTURE EXTENSION — M82 Schema 对 6 个 Stress Case 全部通过**
