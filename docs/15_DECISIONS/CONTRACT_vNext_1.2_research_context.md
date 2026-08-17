# History Explorer — Research Context Contract vNext 1.2

> **FROZEN**
> **NORMATIVE**
> **SUPERSEDES ANY CONFLICTING IMPLEMENTATION INTERPRETATION**
> If any implementation, ADR, or documentation conflicts with this Contract,
> **this Contract wins.**

---

## Source & Freeze Statement

- **Frozen source**: Contract vNext 1.2 was frozen in-conversation through the
  Contract Closure flow (Closure Audit → Fix Audit → Final Freeze Gate).
- **Faithful record**: ADR-0028 (`docs/15_DECISIONS/ADR-0028_research_context_grounding_revision.md`)
  adopts this Contract verbatim in its Contract Authority, Decision, Authorization
  Model, Invariants, and Runtime Tuning Boundary sections. This document
  consolidates that normative content without rewriting semantics.
- **Status of this artifact**: Documentation closure of Implementation Preflight
  Gap **G4**. It is the canonical on-disk normative Contract.
- **No runtime tuning values are frozen.** All tuning parameters are runtime
  configuration (see §19). Hard-coded legacy implementation values
  (`MAX_EXPANDED_ENTITIES=25`, `TEMPORAL_HALF_LIFE=500`, etc.) are
  **implementation facts, NOT Contract semantics** and are excluded here.

---

## 1. Permission Chain (Authorization Model)

```
Candidate ⊇ Approved ⊇ Model-visible ⊇ Citation-authorized
Candidate ∋ SOFT；Approved ∌ SOFT（eligibility 过滤）
Citation-authorized = ID(Model-visible)          （集合本身，禁拓扑扩张）
Synthesis-authorized ⊂ Citation-authorized       （仅 root + validated claim）
KG Fact ∩ AI Analysis = ∅
```

- **权限不可继承**：root 权限不传给邻域；contextual 不升级 authoritative。
- **Authorization Matrix (8 角色 × 7 权限)** is frozen in Contract §16. ADR-0028
  references it without restating (per its own note) and adopts the normative
  Authorization Model block above as the binding rule set. The enumerated 8×7
  sheet, where carried by the original freeze record, supersedes any summary.

---

## 2. Invariants I-01 ~ I-14

| # | Invariant (frozen, normative) |
|---|---|
| **I-01** | Temporal hard judgment 必须使用 interval-overlap primitive；单点 representative year 禁止作为 hard 依据。 |
| **I-02** | before/after 非 temporal exemption——相邻（≤TOL）ACCEPT，跨代 REJECT。 |
| **I-03** | spoke ∈ HARD relation（18 型 taxonomy 闭合）。 |
| **I-04** | gate 顺序固定 Temporal Hard Gate → Dimension-aware Eligibility → Relevance Ranking。 |
| **I-05** | 1-hop + ACCEPT 不做 relevance hard rejection。 |
| **I-06** | N-hop + ACCEPT 必须通过 dimension-aware eligibility。 |
| **I-07** | SOFT 最高权限层级 = Candidate；SOFT 永不得进入 Approved / Model-visible / Citation-authorized / Synthesis-authorized。 |
| **I-08** | `Citation-authorized := ID(Model-visible)`——只含实际进入 prompt facts 的 entity global_id、relation(src,rel,tgt) 引用 ID、timeline synthetic ID 的**集合本身**。 |
| **I-09** | 禁止 KG 邻居扩张、1-hop 扩张、2-hop/N-hop reachability 扩张、neighbor inheritance、shared topology 自动产生 citation authorization。**"可达 ≠ 可引用"、"邻居 ≠ 可引用"。** |
| **I-10** | 仅通过 EvidenceValidator 验证的 claim 具 authoritative claim 权限。unvalidated / no-source-binding / binding 失败 claim → Grounding Gate REJECT，无权限。 |
| **I-11** | Synthesis 只能使用 kg_fact / validated structured claim / Evidence Object；`Synthesis-authorized ⊂ Citation-authorized`（仅 root authoritative + validated claim）。 |
| **I-12** | question 构造层不得嵌入原始 AI answer；该规则为冻结级 invariant。 |
| **I-13** | Expansion 必须 bounded、depth-independent、gate-ordered（gate 后扩展）、deterministic、hard-terminated。 |
| **I-14** | 同输入 + 同 KG snapshot + 同 Contract 规则 + 同 tuning configuration → 确定性输出。 |

---

## 3. Temporal Rule Matrix

**Precedence order (strict)**:
1. **日期可用性**：任一侧无日期 → SOFT（先于分类）。
2. **relation 分类**：HARD / before-after / propagation / SOFT-WEAK。
3. **interval comparison**（仅对执行 interval 比较的类别生效；SOFT-WEAK 跳过此步）。

| Relation class | Overlap / Adjacent | Cross-generation |
|---|---|---|
| **HARD** (10 型) | ACCEPT | REJECT |
| **before / after** | 相邻（≤TOL）→ ACCEPT | REJECT |
| **propagation** (5 型) | ACCEPT | SOFT |
| **SOFT-WEAK** (related_to) | SOFT | SOFT |
| **no-date** | SOFT（中性，不硬拒） | SOFT（中性，不硬拒） |

### SOFT-WEAK — 正式 relation class 定义

`SOFT-WEAK` 是 Temporal Rule Matrix 的**正式 relation class**。其定义如下：

- **relation class**: yes（是 Temporal Rule Matrix 的第 4 个正式类别）
- **temporal constraint**: none（不施加 interval-overlap 时间约束）
- **decision**: SOFT
- **interval comparison**: skipped（precedence ③ 不执行）
- **knowledge-relation semantics**: unchanged（`related_to` 作为知识关系本身的语义不被本类别重新建模；`SOFT-WEAK` 不引入新的知识关系 taxonomy，也不对 `related_to` 做 weak/neutral 语义建模）

### 两种 SOFT 的语义来源区分

虽然 `PROPAGATION` 的 cross-generation 与 `SOFT-WEAK` 的任何 temporal state **最终 decision level 均为 SOFT**，但二者语义原因不同，implementation 不得错误合并为同一判断路径：

1. **PROPAGATION → SOFT**：relation 本身具有跨代传播 / 影响语义；cross-generation **并不否定** relation 本身，故 Temporal Gate 在执行 interval comparison 检出 cross-gen 后，将其**降级**为 SOFT。判断路径 = `执行 interval comparison` → 检出 cross-gen → 降级 SOFT。
2. **SOFT-WEAK → SOFT**：relation 本身没有可由 Temporal Gate 强制判断的时间约束；Temporal Gate **不执行 interval comparison**，直接输出 SOFT。判断路径 = `跳过 interval comparison` → 直接 SOFT。

> 契约要求：上述两条路径在 implementation 中必须为**独立分支**（class==SOFT-WEAK 直接 emit SOFT；class==PROPAGATION 经 interval comparison 后按结果 emit）。禁止将二者合并为"SOFT 即 SOFT"的单一路径，以免丢失 PROPAGATION 的降级语义与 SOFT-WEAK 的跳过语义。

### 18 型类别绑定（冻结）

- `spoke ∈ HARD`（不变）。
- HARD 完整 10 型：`spoke, participated_in, located_at, contemporary_with, part_of, ruled, traded_with, invented, discovered, conquered`。
- `contemporary_with ∈ HARD`：overlap/adjacent→ACCEPT，cross-gen→REJECT；当前不新增 temporal-equivalence 类别（列为 Future ADR）。
- BEFORE_AFTER 2 型：`before, after`（不变）。
- PROPAGATION 5 型：`caused, influenced, inherited, spread, practiced`（不变）。
- `related_to ∈ SOFT-WEAK`（见上）。

### I-03 澄清（非语义变更）

原 `I-03: spoke ∈ HARD relation（18 型 taxonomy 闭合）` 保留实质，并明确：

> 「18 型 taxonomy 闭合」指**集合闭合**（`M4-002_Architecture.md:14` 权威枚举 = `exploration_engine.RELATIONSHIP_MEANING`(18) = 冻结 REL=18 不变量）；其 **temporal category 闭合**由本 §3 全映射（10 HARD + 2 BEFORE_AFTER + 5 PROPAGATION + 1 SOFT-WEAK = 18）保证。

- TOL / SOFT discount / approximate expansion 数值为 `[T]` runtime tuning，不冻结。

---

## 4. Runtime Tuning Boundary (§19)

The following 12 parameters are **runtime configuration** provided via a
parametric interface. **This Contract freezes NO values.**

1. `TOL` — temporal adjacency tolerance.
2. `SOFT discount` — SOFT-tier ranking discount.
3. `approximate expansion` — enable/disable approximate expansion.
4. `FACTS_BUDGET` — max facts admitted to prompt.
5. `MAX_HOPS_HARD` — hard cap on expansion depth.
6. `MIN_PATH_SCORE` — minimum path/relation score to admit.
7. `layer cap` — per-layer entity cap.
8. `fanout cap` — per-node neighbor fanout cap.
9. `ranking weights` — relevance ranking weights.
10. `marginal stop` — marginal-contribution stop threshold.
11. `queue ordering` — expansion queue ordering policy.
12. `focus_terms vocabulary` — focus-term matching vocabulary.

Implementation MUST supply these via configuration injection; none may be
hard-coded as a Contract-level constant.

---

*End of frozen Contract vNext 1.2. Any later edit to this file requires an
explicit PO decision and a new Freeze Gate; it is NOT subject to routine
implementation changes.*
