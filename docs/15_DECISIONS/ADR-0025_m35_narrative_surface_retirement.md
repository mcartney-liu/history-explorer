# ADR-0025 M35「叙事板块始终可见」规则退役

## ADR Number

ADR-0025

## Title

M35「叙事板块始终可见」规则正式退役，由 Entity Page IA v2.1 的 P4 Progressive Presence 取代

## Status

Accepted（2026-08-16，PO 翔哥拍板）

## Context

Entity Page 早期规则 M35（"叙事板块始终可见"）主张：即便实体无历史叙事 / 理解内容，叙事区（历史叙事 / 为什么重要 / 它意味着什么）也应渲染一个统一的 EmptyState 占位，使"板块"始终保持可见。

这与更高层的产品原则 **P4 Progressive Presence（渐进式呈现：缺失内容不占认知空间）** 直接冲突。在 Phase D 认知闭环的产品定位下，只有"认知成立的内容"才应占界面空间；对无叙事实体渲染空态占位，反而制造视觉噪音、暗示"这里本该有东西只是空的"，误导用户以为存在未加载/缺失的内容。

2026-08-16 实体页 IA 重构（施工契约 v2.1）将叙事区合并为连续主体叙事（D8：Surface ≠ Card，三个语义连续段落），并将缺失态统一收口到 P4。PO 在此轮 Gate 推进中明确裁定：**M35 旧规则退役，以 P4 / D8 为现行规则**。

此 ADR 同时作为**防复活锚点**：明确记录旧规则已被取代，防止未来 Agent 因"板块应该可见"的旧心智再次引入空态占位。

## Decision

> **M35「叙事板块始终可见」规则正式退役。**
> Entity Page IA v2.1 的现行规则 = **P4 Progressive Presence**：实体缺失历史叙事 / 理解内容时，**不渲染 EmptyState 占位，整段缺失（silent）**。
> StorySection / WhyImportantPanel / InterpretationPanel 沿用既有行为——无内容时组件本身返回 `null`，不补空态卡。

- 现行呈现约定：`hasNarrative ? <Story + Why + Meaning/> : null`（非 `<EmptyState/>`）。
- 此规则与 D8（叙事区合并为连续主体）同源；也适用于 A3 证据区（empty/disabled 状态不显示，error 必须可见可重试）。
- 任何未来"让板块可见"的诉求，须回到 P4 评估：只有认知成立的内容才占空间。

## Alternatives

- **(a) 保留 M35，无叙事时渲染统一"暂无叙事" EmptyState**
  否决：制造视觉噪音、暗示空内容有价值、与 P4 直接冲突；且 EmptyState 本身不提供任何认知价值。
- **(b) 部分保留（叙事空态渲染、Meaning 不渲染）**
  否决：规则不统一，未来 Agent 易在"哪些板块该可见"上混淆，违背"统一以 P4 为准"的裁定的。
- **(c) 退役 M35，统一以 P4 Progressive Presence 为准（采纳）**
  采纳：与 Article 0 / Phase D 认知闭环定位一致；缺失即沉默，界面只承载真实成立的认知。

## Consequences

**正面**
- 实体页首屏更干净：无叙事实体不再出现"空板块"噪音。
- 统一以 P4 为唯一呈现判据，消除"板块是否可见"的歧义。
- 留下明确决策记录（本 ADR），防止未来 Agent 复活 M35 旧心智。

**负面 / 注意**
- 进入无叙事实体时，用户看不到任何"叙事区"提示——这是**预期行为，不是缺陷**。
- 需要回归确认 StorySection / WhyImportantPanel / InterpretationPanel 在无内容时确实返回 `null`（而非渲染空态容器）。

**架构基线影响**
- 不需修订 `docs/10_ARCHITECTURE/CURRENT_ARCHITECTURE_BASELINE.md`（纯呈现策略，属 P5 范围内呈现层变更，未触碰架构冻结基线）。

**关联文档**
- 施工契约 `docs/product/ENTITY_PAGE_IA_IMPLEMENTATION_MAP.md` v2.1：§D8（Surface ≠ Card）、§P4 缺失态核查表、A3 证据区状态规则。

## Related Freeze Revision

- Freeze Revision Gate: **No**
- 说明：本决策仅改变实体页缺失叙事的呈现策略（EmptyState → 不渲染），属 P5 允许的纯呈现层变更，未触碰架构冻结基线（ENTITY=8 / REL=18 / Runtime=0.13.0 / 后端 / Phase B·C 决策层）。
- Linked docs: `docs/product/ENTITY_PAGE_IA_IMPLEMENTATION_MAP.md` §D8 / §P4 核查表；本 ADR 即 M35 退役的防复活锚点。

---

> **防复活声明（Anti-Resurrection Note）**
> 自 2026-08-16 起，任何"叙事板块应始终可见 / 无内容也要渲染占位"的改动，均视为违反本 ADR。
> 恢复该行为前，必须先由 PO 显式推翻 ADR-0025（Status 改为 Superseded 并新建取代 ADR），不得由施工 Agent 自行"顺手"加回空态卡。
