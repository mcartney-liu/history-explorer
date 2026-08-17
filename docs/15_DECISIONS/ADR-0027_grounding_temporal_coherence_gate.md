# ADR-0027: 接地 2 跳扩展"时间相干性"闸门（M36.0 方案修订）

## ADR Number

ADR-0027

## Title

接地 2 跳扩展增加"时间相干性"闸门 — 修正 M36.0 `expand_context` 方案缺陷（`backend/app/ai_gateway/`）

## Status

Proposed（待 PO 确认后转 Accepted）

## Context

### 1. 现象

战国思维研究报告"经济网络"维度正文出现"丝绸之路"（西汉张骞开通，战国根本不存在）。

### 2. 排查结论（2026-08-17 实测，只读探针）

- grounding 对战国（`tb_cn_v1:tp-warring-states`）**接地正常**：39 facts / 38 citations；
- 39 条事实中第 13 条 = `Achaemenid Persian Empire —[traded_with]→ Silk Road (2-hop via context)`；
- **泄漏路径** = 战国 →(同时代)→ 波斯帝国 →(贸易)→ 丝绸之路，由 `build()` 的 2 跳扩展 `expand_context()`
  自动生成并追加进 `[ALLOWED FACTS]`；
- 模型是**忠实使用** `[ALLOWED FACTS]` 里的事实，非幻觉、非无视软约束——回应 PO 质疑"零约束下模型
  不会平白编丝绸之路"：**不是模型编的，是接地把丝绸之路喂进去了**。

### 3. 方案缺陷定位（"当时的方案"在哪）

| 文档 | 内容 | 与本缺陷的关系 |
|---|---|---|
| `docs/M11-2_Grounded_Context_Engine_Planning.md` | M11-2 接地引擎**原始设计** | 只有"逐 context_global_ids 读实体事实 + 1 跳邻居事实"，**无 2 跳** |
| `M36_0_IMPLEMENTATION_REPORT.md`（2026-07-27） | **2 跳扩展引入方案** | 设计意图 = 支持跨文明链（Buddhism→Silk Road→China）；约束只有"去重 + `MAX_EXPANDED_ENTITIES=25` 上限"，**无时间/空间相干性约束** ← 缺陷源头 |
| `docs/M3.5-002_Architecture.md:98` | 路径引擎 `temporal_coherence` 信号（同代=1.0、时间差衰减） | 时间相干性概念**当时就有**，但 M36.0 做接地 2 跳时**未复用** |

**结论**：缺陷不在"跳数"，而在 M36.0 方案漏写了"时间/空间相干性"约束（PO 2026-08-17 指出：
"同一时间、同一地点范围内跳多少跳都可以"）。

### 4. 实测数据支撑（实体 `start_date/end_date` 已存在，只是扩展逻辑没用）

| 实体 | start | end | 与战国(-475~-221) | 判定 |
|---|---|---|---|---|
| 战国 | -475 | -221 | — | focal |
| 波斯帝国 | -550 | -330 | 重叠 | 放行 |
| 春秋 | -770 | -476 | 相邻(1年差) | 放行 |
| 苏格拉底 | -469 | -399 | 重叠 | 放行 |
| 丝绸之路 | -130 | 1453 | 晚 90 年 | 拦截 |
| 元 | 1271 | 1368 | 跨时代 | 拦截 |
| 唐 | 618 | 907 | 跨时代 | 拦截 |
| 西周 | -1046 | -771 | 早 296 年 | 拦截 |
| 佛教(ancient_india) | None | None | 数据缺口 | 不拦截（保全设计意图） |

### 5. 附带矛盾

2 跳实体**不在** `expanded_global_ids`（= roots + bridges，不可引用）却**进** `[ALLOWED FACTS]`
（可阅读）——"可看不可引"自相矛盾，模型写了却没引用依据。

## Decision

在 `grounding_builder.py` 的 `expand_context()` 2 跳候选过滤中增加**时间相干性闸门**：

1. **时间闸门**：候选 2 跳实体的 `[start,end]` 与 focal 根实体合并时间范围**重叠或相邻**
   （`ADJACENCY_TOLERANCE_YEARS = 10`，保住春秋→战国这类相接朝代）；缺失的边界视为无界
   （跨期实体如佛教、华夏文明不误伤）。
2. **数据缺口兜底**：任一侧无日期 → 不拦截（缺数据不误伤，佛教案例因此保全）。
3. **1 跳策展边不动**：跨文明比较（战国↔波斯）是产品特性，策展边属于 frozen KG，不拦。
4. **一致性修正**：通过闸门的 2 跳实体**加入 `expanded_global_ids`**（沿用 M36.0
   "冻结 validator 接受 context ∪ 1 跳邻居"机制，不改 frozen validator），使
   `[ALLOWED FACTS]` 里出现的都可引用，"可看不可引"矛盾关闭。
5. **参数策略**：`ADJACENCY_TOLERANCE_YEARS` 为模块顶部中央常量（策展而非 ML），可调。

## Alternatives

- **限跳数（1 跳封顶）**：rejected —— 非根因、过度限制，会砍掉同代多跳（PO 2026-08-17 明确指出）。
- **只加 prompt 声明**（2 跳事实标注"属桥接实体背景、不得归因于 focal 实体"）：rejected ——
  软约束，模型仍可能无视；结构性闸门才根治。
- **扩图谱覆盖**（罗马/基督教等实体入库）：rejected（对本缺陷）—— 不解决 2 跳泄漏本身，
  属独立数据工程。
- **正文事实核查层**（生成后抽专有名词查最早出现时间，晚于研究对象标红/删）：deferred ——
  大工程、碰 `response_validator` 红线，可作后续独立 ADR；本 ADR 先在源头（接地）拦截。

## Consequences

- 战国 grounding 中 丝绸之路/元/唐/西周 等跨时代 2 跳事实被拦；波斯、苏格拉底（同代）保留；
  2 跳上下文污染从 28 实体大幅收敛，回答更聚焦、时代错位从源头消除。
- Buddhism→Silk Road→China 设计意图保全（佛教无日期 → 不拦截）。
- `[ALLOWED FACTS]` 与可引用范围一致（出现即能引用）。
- 需同步 grounding 相关测试断言（如有断言 2 跳事实数量/内容的用例）。
- `CURRENT_ARCHITECTURE_BASELINE.md` **无需修订**：不变量（ENTITY=8 / REL=20 / 零新依赖 /
  AI runtime 仅限 ai_gateway）不变；`grounding_builder.py` 已在 M36.0 `SCOPE_ALLOWLIST`。

## Related Freeze Revision

- Freeze Revision Gate: Yes（ai_gateway 改动，走 ADR + PO 批准；`grounding_builder.py` 已在
  `scripts/freeze-check.mjs` SCOPE_ALLOWLIST，无需新登记）
- Product Owner approval: 待 PO 确认（Status 转 Accepted）
- Linked docs: `M36_0_IMPLEMENTATION_REPORT.md`（本 ADR 为其 Phase 2 的方案修订）、
  `docs/M11-2_Grounded_Context_Engine_Planning.md`、`docs/M3.5-002_Architecture.md`、
  `scripts/freeze-check.mjs`
