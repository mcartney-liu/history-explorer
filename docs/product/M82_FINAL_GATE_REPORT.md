# M82 Final Gate Report

> **阶段**：M82 Final Gate + Architecture Baseline Freeze
> **模式**：只读审查
> **日期**：2026-08-05
> **结论**：**PASS — M82 PHASE 1 COMPLETE. PHASE 2/3 READY.**

---

## A. Gate Verdict

### M82 Phase 1 Status: PASS

| 维度 | 结果 |
| --- | --- |
| 全链路验证 | ✅ Entity → Relationship → Adapter → CausalStatement → Evidence — 完整走通 |
| Schema 冻结 | ✅ 7 字段未变动 |
| 8 条 Constraint | ✅ 全部满足 |
| 测试 | ✅ 48 tests PASS（P1.2:9 + P1.3:8 + P1.4:7 + P1.8:24） |
| 前端组件 | ✅ CausalStatementCard + evidenceTrace + i18n 三语就绪 |
| 满足进入下一阶段条件 | ✅ 是 |

---

## B. Architecture Validation

### B.1 Semantic Layer 独立于 Graph Core

| 检查项 | 状态 | 证据 |
| --- | --- | --- |
| `causal/` 包不 import `graph.py` | ✅ | P1.8 Test 13 验证 |
| `Edge` 未增加 causal 字段 | ✅ | P1.8 Test 12 验证 |
| `CausalStatement` 仅引用 KG GID（不定义新 Entity） | ✅ | ADR-M79 L46："referencing existing KG identifiers, never extending vocabulary" |
| Entity/Relationship 与 CausalStatement 职责分离 | ✅ | Entity/Relationship = Fact Layer（结构化）；CausalStatement = Semantic Layer（自然语言） |

### B.2 Evidence Layer 保持独立

| 检查项 | 状态 | 证据 |
| --- | --- | --- |
| CausalStatement 仅保存 `evidence_refs: string[]` | ✅ | 不保存 source/book/page/chapter/doi |
| Evidence Claim 仍在 `evidence_claims.json` | ✅ | 76 条 claim 未修改 |
| Source 仍在 `sources.json` | ✅ | 未新增 source |
| evidenceTrace.ts 仅调用已有 API | ✅ | `getEvidenceWithSources()` + `getEvidenceClaim()` |

### B.3 Frontend Boundary

| 检查项 | 状态 | 证据 |
| --- | --- | --- |
| CausalStatementCard 不承担 Relationship 展示 | ✅ | RelationshipChain 独立渲染 Entity→Relationship→Entity 结构 |
| CausalStatementCard 不承担 Evidence 数据管理 | ✅ | 仅通过 `onEvidenceClick` 回调传递 `evidenceId` |
| CausalStatementCard 不承担 SourceChain 逻辑 | ✅ | 不 import SourceChain |
| evidenceTrace.ts 不保存状态 | ✅ | 纯函数 |

---

## C. Frozen Decisions

### C.1 CausalStatement Schema（M82 Phase 1 Freeze）

| # | 字段 | 类型 | 状态 |
| --- | --- | --- | --- |
| 1 | `id` | `str` | 🔒 FROZEN |
| 2 | `cause_id` | `str` | 🔒 FROZEN |
| 3 | `effect_id` | `str` | 🔒 FROZEN |
| 4 | `mechanism` | `str \| null` | 🔒 FROZEN |
| 5 | `consequence` | `str \| null` | 🔒 FROZEN |
| 6 | `confidence` | `"high"` \| `"medium"` \| `"low"` \| `null` | 🔒 FROZEN |
| 7 | `evidence_refs` | `str[]` | 🔒 FROZEN |

**Phase 1 不允许新增字段。**

### C.2 Confidence Model

| 值 | 语义 | 来源 |
| --- | --- | --- |
| `"high"` | 学术界广泛共识 | Curator assessment |
| `"medium"` | 有证据支撑，存在学术争议 | Curator assessment |
| `"low"` | 初步假设，学术界仍有争议 | Curator assessment |
| `null` | 未标注 | — |

**这不是 AI probability，不是算法置信度。**

### C.3 Evidence Model

```
CausalStatement.evidence_refs[] → Evidence Claim (evidence_claims.json) → Source (sources.json)
```

**CausalStatement 不进入 provenance。Source 层扩展（book/chapter/page/doi）属于 Source Infrastructure，不修改 Semantic Layer。**

### C.4 Runtime Boundary

| 模块 | 职责 | 禁止 |
| --- | --- | --- |
| **Loader** | 从 JSON 加载 → 构建 CausalIndex | 生成内容、校验因果合理性 |
| **Adapter** | 只读查询（get_for_entity/relationship/path） | 生成 CausalStatement、调用 AI |
| **ExplorationEngine** | 消费 Adapter 输出 → enrichment | 修改 Edge、内联访问 Loader |
| **Frontend** | CausalStatementCard 渲染 | 承担 Relationship/Source 职责 |

**Semantic Layer 不生成事实。**

---

## D. Future Extension Boundary

### M84+（内容扩展时引入）

| 字段 | 类型 | 用途 |
| --- | --- | --- |
| `status` | `"published"` \| `"deprecated"` \| `null` | 生命周期状态 |
| `replaces` | `str \| null` | 取代的旧版本 CS ID |
| `replaced_by` | `str \| null` | 被新版本取代的 CS ID |

### M85+（AI Pipeline 建立时引入）

| 字段 | 类型 | 用途 |
| --- | --- | --- |
| `proposed_by` | `"human"` \| `"ai"` \| `null` | 内容来源区分 |

### Future Source Layer（M84+）

| 字段 | 归属 | 说明 |
| --- | --- | --- |
| `book` / `chapter` / `page` / `edition` / `doi` | Source Infrastructure（`sources.json`） | 不进入 Semantic Layer |

**这些不是 M82 Schema 缺陷，而是未来扩展点。** 当前 7 字段 Schema 对所有这些扩展免疫——新增字段均为 `Optional`，不影响 Loader 反序列化。

---

## E. Architecture Decision Record

参见：`docs/product/ADR-M82-CAUSAL-SEMANTIC-LAYER.md`

### 摘要

| 决策 | 内容 |
| --- | --- |
| **Context** | 为什么引入 Causal Semantic Layer？M79 Debt-2：CausalStatement 模型已定义但未落地。M80.5 Revision P03/P04/P06/P07 要求因果关系可读、可追溯、可验证 |
| **Decision** | CausalStatement 不放入 Graph Edge。通过 Adapter 旁挂，Semantic Layer 独立于 Fact Layer |
| **Rejected A** | Graph Edge 扩展 causal 字段 → 导致 Graph Core 与 Semantic 混合，违反 Side Index 原则 |
| **Rejected B** | AI 自动生成 causal → 违反 Non-goal（AI 不生成事实），破坏信任 |
| **Rejected C** | Evidence provenance 塞入 CausalStatement → Source Layer 污染 Semantic Layer |

---

## F. M83 前置建议

### 问题：M83 应该继续扩展数据规模，还是优先做 Causal Explorer Experience Integration？

### 分析

**当前状态**：M82 Phase 1 完成——5 条 CausalStatement（中国文明包），48 tests PASS。但 Explorer 尚未实际体验因果语义——CausalStatementCard 未嵌入 RelationshipChain（P3.2 待做）。

**Explorer 用户路径**：

```
Entity → Relationship → Why? → Causal Explanation → Evidence → Continue Exploration
```

M82 Phase 1 实现了 Why?（CausalStatement）和 Evidence（evidenceTrace），但**Why? 还没有出现在 Explorer 的探索路径上**——它存在于 API 和独立组件中，尚未嵌入 RelationshipChain。

### 建议：优先 Causal Explorer Experience Integration（M82 Phase 2+3），而非扩展数据规模

| 理由 | 说明 |
| --- | --- |
| M81a 验证的教训 | 4 场 Explorer 验证的核心发现是"关系只有标识没有因果"——不是数据不够多，是现有数据没有讲因果故事 |
| Phase 2/3 的交付物直接解决这个痛点 | Guide 叙事理由 + Fact/Inference 视觉区分 = Explorer 能看到"为什么 A 和 B 有关联" |
| 5 条 CS 已足够验证机制 | 扩展数据规模前，应先验证 5 条 CS 的 Explorer 体验——如果 Explorer 看到因果陈述后探索行为改变，再决定扩展策略 |
| M84 是数据扩展的里程碑 | 包库扩展（4-6 个官方包）是 M84 的职责，不是 M83 的 |

**建议 M83 启动顺序**：M82 Phase 2+3 完成 → Explorer 体验验证 → 根据验证结果决定数据规模策略。

---

## G. Final Output

| 产出 | 文件 |
| --- | --- |
| Final Gate Verdict | **本文件** — M82 Phase 1 PASS |
| Frozen Architecture Baseline | `docs/product/M82_FINAL_GATE_REPORT.md` §C |
| ADR Summary | `docs/product/ADR-M82-CAUSAL-SEMANTIC-LAYER.md` |
| Deferred Decisions | `docs/product/M82_FINAL_GATE_REPORT.md` §D |
| M83 Recommendation | `docs/product/M82_FINAL_GATE_REPORT.md` §F |

---

> 审查模式：只读
> 审查对象：M82 Phase 1 全链路（P1.1-P1.8）
> 日期：2026-08-05
> 结论：**M82 PHASE 1 PASS — READY FOR PHASE 2**
