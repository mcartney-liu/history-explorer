# M82 Architecture Gate Report

> **阶段**：M82 Architecture Gate Review
> **审查对象**：`M82_IMPLEMENTATION_PLAN_v2.md`
> **模式**：只读审查，不修改代码、不新增文件、不进入 Implementation
> **日期**：2026-08-05

---

## 审查维度

| # | 维度 | 结果 |
| --- | --- | --- |
| 1 | Semantic Layer 定位 | PASS |
| 2 | Graph Core Stability | PASS |
| 3 | Data Model Review | PASS（附 1 条 Required Adjustment） |
| 4 | CausalStatement Data Scope Review | PASS（附 1 条 Risk） |
| 5 | Adapter Architecture Review | PASS（附 1 条 Risk） |
| 6 | Implementation Readiness | **READY WITH CONDITIONS** |

---

## 1. Semantic Layer 定位

### 审查问题

- CausalStatement 是否符合 ADR-M79 "interpretive semantic layer"？
- 是否与 Fact Layer / Inference Layer 边界清晰？
- 是否存在层污染风险？

### 事实

ADR-M79 L34-35 原文：
> M79 therefore establishes an **independent Causal Semantic Layer** that closes Debt-2 without disturbing the M78-SB boundary contract.

`causal/model.py` L8 docstring 原文：
> It is an **interpretive semantic layer**, NOT a domain vocabulary extension. Per ADR-M79 Boundary Rules it must never import the domain / validation / graph core modules, and must not introduce independent entity vocabulary.

### 审查结论

| 子项 | 判定 | 依据 |
| --- | --- | --- |
| 符合 ADR-M79 "interpretive semantic layer" | ✅ PASS | ADR-M79 和 `causal/model.py` 双重确认。v2 的 Semantic Layer 命名与 ADR-M79 的 "Causal Semantic Layer" 一致 |
| 与 Fact Layer 边界清晰 | ✅ PASS | Fact Layer 存储结构化标识符（Entity/Relationship/Evidence Claim id），Semantic Layer 存储自然语言文本（mechanism/consequence）。物理分离（独立 JSON 文件），逻辑关联（通过 id 引用） |
| 与 Inference Layer 边界清晰 | ✅ PASS | Inference Layer 存储算法产生的数值/枚举（评分/权重/语义匹配类型），Semantic Layer 存储人工策展的因果解释。CausalStatement 的 confidence 是策展者标注，非算法推断 |
| 无层污染风险 | ✅ PASS | CausalStatementAdapter 旁挂模式确保 Semantic Layer 不写入 Fact Layer（Edge 不变），不写入 Inference Layer（Signal 不变）。四层之间仅通过 id 引用关联 |

**判决**：PASS。四层边界定义清晰，与 ADR-M79 完全一致。

---

## 2. Graph Core Stability

### 审查问题

- Edge 不修改方案是否可执行？
- CausalStatementAdapter 旁挂方案是否与 Side Index 原则一致？
- 是否触碰 Freeze Boundary？

### 事实

`graph.py` Edge（L21-25）：
```python
@dataclass
class Edge:
    source: str
    target: str
    type: str
```

`exploration_engine.py` `_explain_path`（L699-711）：当前仅输出 `"—[{relationship} {direction}]→"` 模板文本，通过 `self._gg`（GlobalGraph）查询 Entity 信息。

### 审查结论

| 子项 | 判定 | 依据 |
| --- | --- | --- |
| Edge 不修改方案可执行 | ✅ PASS | Edge 保持 3 字段不变。Adapter 通过 `(source_id, target_id, type)` 三元组查询 CausalStatement，不需要 Edge 携带额外字段 |
| 与 Side Index 原则一致 | ✅ PASS | 项目已有 precedent：`exploration_engine.py` 的推荐评分/权重（REC_W_*）通过独立计算模块输出，不写入 Entity/Relationship。CausalStatementAdapter 遵循同一模式 |
| 不触碰 Freeze Boundary | ✅ PASS | `Edge`/`DirectedGraph`/`KnowledgeGraph`/`Relationship` 枚举全部不变。ENTITY=8 / RELATIONSHIP=18 不变。`freeze-check.mjs` 脚本不会因 Adapter 触发告警 |

**判决**：PASS。Graph Core 完全不受影响。Adapter 旁挂方案与项目现有的 Side Index 模式一致。

---

## 3. Data Model Review

### 审查问题

- CausalStatement 字段设计是否完整？
- confidence 语义是否明确？
- evidence_refs 关联是否可靠？
- 是否需要增加治理约束？

### 事实

`CausalStatement` 数据模型（`causal/model.py` L20-35）：
```python
@dataclass(frozen=True)
class CausalStatement:
    cause_id: str
    effect_id: str
    mechanism: str | None = None
    consequence: str | None = None
    confidence: float | None = None
    evidence_refs: Tuple[str, ...] = field(default_factory=tuple)
```

`evidence_claims.json`：76 条 evidence claim，有 `claim_id` 字段。

### 审查结论

| 子项 | 判定 | 依据 |
| --- | --- | --- |
| 字段设计完整 | ✅ PASS | 5 字段覆盖了因果陈述的核心维度（因果两端 + 机制 + 后果 + 置信度 + 证据引用）。M79 的 Debt-2 原始定义（Cause/Mechanism/Consequence/Confidence/Evidence）全部覆盖 |
| confidence 语义明确 | ⚠️ PASS with note | `confidence: float | None` 的类型定义正确，但缺少值域约束。当前 docstring 未定义 confidence 的合法范围（0.0–1.0? 0–100?）和三个档位（high/medium/low）的阈值。**Required Adjustment #1**：在 `causal/model.py` docstring 中增加 confidence 值域约定 |
| evidence_refs 关联可靠 | ✅ PASS | `evidence_refs` 是 `Tuple[str, ...]`，指向 `evidence_claims.json` 的 `claim_id`。Loader 需实现引用完整性校验（check evidence_refs 中的 claim_id 是否存在于 `evidence_claims.json`） |
| 治理约束 | ⚠️ PASS with note | 当前 `CausalStatement` 缺少 `author` 和 `last_modified` 字段。对于 Semantic Layer（人工策展内容），溯源不仅需要 Evidence 引用，还需要"谁写的、什么时候写的"。**建议（非阻断）**：在 M82 完成后（或 M84 内容扩展时）增加 `author` + `last_modified` 字段 |

**判决**：PASS。Required Adjustment #1（confidence 值域约定）必须在 M82 Phase 1 实现时补充，但这不是架构级问题，是文档补全。

---

## 4. CausalStatement Data Scope Review

### 审查问题

- 5 条 CausalStatement MVP 数据是否足够？
- 每条是否覆盖 M82 Gate Criteria？
- 是否存在历史语义误导风险？

### 审查结论

| 子项 | 判定 | 依据 |
| --- | --- | --- |
| 5 条数据是否足够 | ✅ PASS | 覆盖矩阵合理：CS-01（简单因果）、CS-02（多跳）、CS-03（多 Evidence）、CS-04（低 confidence）、CS-05（复杂 consequence）。5 条足以验证所有字段的端到端链路 |
| 覆盖 M82 Gate Criteria | ✅ PASS | SC-1（CausalStatement 可读）→ CS-01/02/03/05；SC-2（Evidence 可溯源）→ CS-03（3 evidence）；SC-5（AI 不可用时可用）→ 全部 |
| 历史语义误导风险 | ⚠️ RISK | **Risk #1**：CS-04（宋朝 → 理学兴起，低 confidence）的 confidence(low) 可能在 UI 上被 Explorer 误解为"这个因果关系不可信"——但实际上 low confidence 是策展者标注的学术不确定性，不是系统不可靠。**缓解措施**：CausalStatementCard 渲染 confidence 时必须附带解释文本（"策展者置信度：低——这一因果关系在学术界仍有争议"），而非仅显示数字 |

**判决**：PASS。Risk #1 需要在 Phase 1 的 CausalStatementCard 组件实现时处理，但不影响数据范围设计本身。

---

## 5. Adapter Architecture Review

### 审查问题

- Adapter API 是否会诱导自动因果推理？
- 是否需要限制查询边界？
- 是否符合 "AI 不生成事实" 红线？

### 审查结论

| 子项 | 判定 | 依据 |
| --- | --- | --- |
| 是否诱导自动因果推理 | ⚠️ RISK | **Risk #2**：`CausalStatementAdapter` 的 `get_causal_statements_for_path(path)` 方法签名暗示"给一条路径，返回因果陈述"。如果 path 中的两个 Entity 之间没有策展的 CausalStatement，Adapter 返回空列表——但调用方（`_explain_path`）需要有 fallback 行为。当前 `_explain_path` 已有模板 fallback（`"—[{relationship}]→"`），但需要明确：**不得在 CausalStatement 缺失时调用 AI 或算法生成替代文本**。**缓解措施**：Adapter 的 docstring 明确声明"只读查询，不生成"，fallback 行为是返回空列表 + 由调用方降级到模板文本 |
| 是否需要限制查询边界 | ✅ PASS | Adapter 是只读查询，不修改数据。查询边界由 `causal_statements.json` 的数据范围自然限制——只有 5 条，Adapter 只能查到这 5 条。不需要额外的权限/边界控制 |
| 是否符合 "AI 不生成事实" 红线 | ✅ PASS | Adapter 是纯数据查询层，不涉及 AI/LLM。CausalStatement 内容 100% 来自 `causal_statements.json`（人工策展）。与 `M82_ENTRY_BRIEF.md` §5 Non-Scope #1 一致 |

**判决**：PASS。Risk #2 需要在 Adapter 实现时通过 docstring + fallback 约定缓解，不是架构级问题。

---

## A. PASS 项（汇总）

| # | 项 | 判定 |
| --- | --- | --- |
| 1 | Semantic Layer 定位与 ADR-M79 一致 | ✅ PASS |
| 2 | 四层边界清晰（Fact/Semantic/Inference/Exploration） | ✅ PASS |
| 3 | Graph Core 不受影响（Edge/DirectedGraph/KnowledgeGraph 不变） | ✅ PASS |
| 4 | Adapter 旁挂方案与 Side Index 原则一致 | ✅ PASS |
| 5 | Freeze Boundary 未触（ENTITY=8 / RELATIONSHIP=18 不变） | ✅ PASS |
| 6 | CausalStatement 字段设计完整（5 字段覆盖 Debt-2） | ✅ PASS |
| 7 | evidence_refs 关联可靠 | ✅ PASS |
| 8 | 5 条 MVP 数据覆盖所有字段组合 | ✅ PASS |
| 9 | Adapter 纯查询，不生成，符合 "AI 不生成事实" 红线 | ✅ PASS |
| 10 | 3 Phase MVP Scope 划分合理 | ✅ PASS |
| 11 | 6 Gate Criteria 与 Phase 覆盖对应正确 | ✅ PASS |

---

## B. Risk 项

| # | 风险 | 严重度 | 缓解措施 | 责任方 | 时机 |
| --- | --- | --- | --- | --- | --- |
| **Risk #1** | CS-04 low confidence 可能在 UI 上被误解为"系统不可靠" | 🟡 Medium | CausalStatementCard 渲染 confidence 时附带解释文本（"策展者置信度：低——这一因果关系在学术界仍有争议"），不裸显示数字 | Frontend | Phase 1 P1.6 |
| **Risk #2** | Adapter 返回空列表时，调用方可能尝试 AI/算法生成替代文本 | 🟡 Medium | Adapter docstring 明确声明"只读查询，不生成"；`_explain_path` fallback 行为限定为模板文本降级，禁止调用 AI | Backend | Phase 1 P1.3 + P1.4 |

---

## C. Required Adjustment

| # | 调整项 | 优先级 | 说明 | 时机 |
| --- | --- | --- | --- | --- |
| **RA-1** | CausalStatement confidence 值域约定 | 🔴 必须 | 在 `causal/model.py` docstring 中增加：confidence 范围为 0.0–1.0；high ≥ 0.8 / medium 0.5–0.8 / low < 0.5；None 表示未标注。当前仅 `float \| None` 类型定义，缺少语义约定 | Phase 1 P1.1 实施时 |

---

## D. Final Decision

### READY WITH CONDITIONS

**M82 Implementation Plan v2 具备 Implementation 条件，附 2 条 Risk 和 1 条 Required Adjustment。**

进入 Implementation 的前置条件：

| 条件 | 状态 |
| --- | --- |
| RA-1（confidence 值域约定）已补充至 `causal/model.py` docstring | ⬜ 待 Phase 1 实施时执行 |
| Risk #1 缓解方案已纳入 P1.6（CausalStatementCard）实现 | ⬜ 待 Phase 1 实施时执行 |
| Risk #2 缓解方案已纳入 P1.3+P1.4（Adapter + `_explain_path`）实现 | ⬜ 待 Phase 1 实施时执行 |

**不阻断 Implementation**——以上 3 项均为实施时即可完成的文档/代码补全，不需要架构级返工。

---

> 审查人：Architecture Review
> 审查对象：`M82_IMPLEMENTATION_PLAN_v2.md`
> 审查依据：ADR-M79 + `causal/model.py` + `graph.py` + `exploration_engine.py` + `evidence_claims.json`
> 日期：2026-08-05
> 判决：**READY WITH CONDITIONS**
