# ADR-M82: Causal Semantic Layer Architecture

> **类型**：Architecture Decision Record
> **日期**：2026-08-05
> **状态**：ACCEPTED — M82 Phase 1 已实施
> **上游**：ADR-M79（CausalStatement 模型定义）

---

## Context

M79 定义了 `CausalStatement` 模型（cause_id / effect_id / mechanism / consequence / confidence / evidence_refs），作为 "interpretive semantic layer"。但 M79 仅定义模型，未定义该模型如何与现有 Fact Layer（Entity/Relationship KG）集成。

M80.5 Revision（P03/P04/P06/P07）要求：
- P03：AI 缺位时呈现 CausalStatement 因果骨架
- P04：Guide 推荐附带叙事理由
- P06：CausalStatement 附带 Evidence 引用
- P07：Fact-Layer vs Inference-Layer UI 区分

M82 需要决定：**CausalStatement 的存储和访问架构**——是嵌入 Graph Core，还是旁挂？

---

## Decision

**CausalStatement 不放入 Graph Edge。通过 `CausalStatementAdapter` 旁挂，保持 Semantic Layer 与 Fact Layer 物理分离。**

### 架构

```
Fact Layer (graph.py):
  Edge { source, target, type }  — 不变

Semantic Layer (causal/):
  CausalStatement { cause_id, effect_id, mechanism, consequence, confidence, evidence_refs }
    → CausalStatementAdapter（旁挂查询）
      → ExplorationEngine._explain_path（消费）
```

### 关键约束

1. `causal/` 包不 import `graph.py`、`domain/`、`validation.py`
2. `Edge` 不增加 causal 字段
3. `CausalStatement` 仅引用 KG GID，不定义新 Entity/Relationship
4. Adapter 只查询（`get_for_entity` / `get_for_relationship` / `get_for_path`），不生成
5. CausalStatement 缺失 → fallback 到 Relationship Template（`understandingRules.ts`）

---

## Alternatives Rejected

### A: Graph Edge 扩展 causal 字段

**方案**：在 `Edge` 上增加 `causal_statement_ids: Tuple[str, ...]` 字段。

**Reject reason**：
1. **Graph Core 与 Semantic 混合**：Edge 是 Fact Layer 的数据结构，写入 Semantic Layer 的引用 = 跨层污染。违反 ADR-M79 的 "CausalStatement is NOT a domain vocabulary extension"
2. **所有图算法受影响**：修改 Edge = 修改 `DirectedGraph` 的所有路径算法签名。Graph Core 稳定是 Freeze Boundary 的核心
3. **Side Index 原则**：项目已有 precedent——Signal/评分通过旁挂模块计算，不写入 Entity/Relationship 本体。CausalStatement 应遵循同一模式

### B: AI 自动生成 CausalStatement

**方案**：当 CausalStatement 缺失时，调用 LLM 自动生成 mechanism/consequence 文本。

**Reject reason**：
1. **违反 Non-goal**：M82 Entry Brief §3.4 明确 "AI 不作为事实来源"。CausalStatement 属于 Fact-Layer（基于 Evidence 的因果陈述），不是 Inference-Layer
2. **破坏信任**：M81a 验证发现 Explorer 的核心信任问题是 "不知道系统为什么做关联"。AI 生成的因果陈述会加剧这个问题——Explorer 无法区分 "这是事实" 和 "这是 AI 猜的"
3. **M83.5 才是 AI 介入点**：AI 的角色是在 M82 完成后，在 CausalStatement 骨架上叠加个性化解释——不是在 M82 替代 CausalStatement

### C: Evidence provenance 塞入 CausalStatement

**方案**：在 CausalStatement 上增加 `book` / `chapter` / `page` / `doi` 等 provenance 字段。

**Reject reason**：
1. **Source Layer 污染**：provenance 属于 Source Infrastructure（`sources.json`），不属于 Semantic Layer。CausalStatement 的 `evidence_refs` 只需引用 Evidence Claim ID——由 Evidence Layer 负责 source 关联
2. **Schema 膨胀**：如果 CausalStatement 直接保存 provenance，每条 CS 都需要重复 book/author/page 信息——这是数据冗余
3. **未来扩展灵活**：provenance 通过 Source 层的独立扩展（新增 `sources.json` 字段），不影响 CausalStatement Schema。三层解耦（Semantic → Evidence → Source）

---

## Consequences

### Positive

- Semantic Layer 与 Fact Layer 物理分离——Graph Core 不受影响
- CausalStatement 可以独立演化（增删改），不影响 Entity/Relationship KG
- 未来扩展字段（status/replaces/proposed_by）均为 `Optional`，向后兼容
- Adapter API 签名对百万级数据兼容（仅需内部索引优化）

### Negative

- 增加了一层抽象（Adapter）——调用方需要处理 "CS 存在" 和 "CS 缺失" 两种情况
- CausalStatement 的完整性依赖策展者——当前 5 条，需要 M84+ 内容扩展

---

## Status

**ACCEPTED — M82 Phase 1 已实施。**

M82 Phase 1 验证：
- P1.2 Loader: 9 tests PASS
- P1.3 Adapter: 8 tests PASS
- P1.4 Integration: 7 tests PASS
- P1.8 Final Validation: 24 tests PASS
- 8 条 Constraint 全部满足

---

> 上游：ADR-M79
> 日期：2026-08-05
> 状态：ACCEPTED
