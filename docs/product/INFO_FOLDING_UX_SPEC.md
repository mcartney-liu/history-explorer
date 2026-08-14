# 视觉交互规范提案：信息折叠与版面整洁（Info Folding UX Spec）

> 提案日期：2026-08-15 · 提出人：翔哥（PO） · 状态：待 PO 拍板参数后实施
> 背景：PO 反馈"身份卡片下方证据堆叠占版面"，要求整体梳理同类信息堆积点，形成统一折叠规范。

---

## 1. 核心问题

实体页 / 探索包页面上，多个面板把**全量信息一次性铺开**（证据、来源、关系列表、长文），
导致版面被次要信息占据，主内容（实体身份、核心叙述）被稀释。扫描 30 处信息展示区后
归纳为三类：

| 类别 | 表现 | 数量 |
|---|---|---|
| P0 全量堆积 | 默认把所有内容铺开，无折叠无截断 | ~11 处 |
| P1 截断无出路 | 有 slice 截断，但**没有"查看更多"**，截掉的信息永远不可达 | ~4 处 |
| 已有控制 | 有折叠/截断 + 展开交互 | ~8 处（含范本 TrustDisplay） |

---

## 2. 触点清单（扫描 30 处）

### P0 全量堆积（默认全铺开，最需规范）

| 触点 | 位置 | 内容 | 现状 |
|---|---|---|---|
| 身份卡证据 | `entity/EntityHero.tsx:147` `EvidenceList` | 支撑证据列表 | **全量**，无折叠 ← PO 举例 |
| 来源论断 | `ProvenancePanel.tsx:129-166` | 来源卡片+每条全部论断 | **全量** |
| 来源链 | `package/SourceChain.tsx:46-77` | 每边全部 claim+来源 | **全量** |
| 因果长文 | `causal/CausalStatementCard.tsx:72-85` | mechanism/consequence 长文 | **全量**（点击仅打点，无实际折叠） |
| 解读堆叠 | `InterpretationPanel.tsx:93-163` | 解读卡片+UnderstandingCard | **全量** map |
| 图节点 | `entity/ConnectionExplorer.tsx:60-72` | graph 节点列表 | **全量** |
| 事件链 | `EventCausalChain.tsx:69-126` / `EventImpactPanel.tsx:72-94` / `EventNarrativeJourney.tsx:122-161` | 关系节点链 | **全量** incoming/outgoing |
| 策展长文 | `StorySection.tsx:20-24` / `WhyImportantPanel.tsx:20-23` | 单段长文 | **全量** |
| 下一步动作 | `NextStepPanel.tsx:81-116` | 动作+reason+hook | **全量** |
| 相关实体 | `EntityRelatedList.tsx:126-141` | 全列表 | **全量** |
| 包内关系 | `package/ConnectionCard.tsx:197-227` | rels 列表 | **全量** |

### P1 截断无"查看更多"（信息不可达，应补出口）

| 触点 | 位置 | 现状 |
|---|---|---|
| ConnectionExplorer edges / timeline | `ConnectionExplorer.tsx:60-72` | `slice(0,5)` / `slice(0,8)`，无更多 |
| ConnectionCard 依据 | `ConnectionCard.tsx` | `slice(0,2)`，无更多 |
| EntityHero Key Facts | `EntityHero.tsx:170` | `slice(0,3)`，无更多 |

### 已有控制（范本与参照）

| 触点 | 控制方式 |
|---|---|
| **TrustDisplay 推荐链**（最佳范本） | `VISIBLE_LIMIT=3` + "查看更多" + **每条独立展开/收起** |
| ResearchPanel 维度卡 | "全部展开/收起全部" + "查看报告" modal |
| CitationList | verified 全量 / rejected 折叠（有展开按钮） |
| ContinueExploringPanel / GuidePanel / JourneyTrail | `slice(0,5)` / `slice(-4)` / `slice(-maxSteps)` 等 |

---

## 3. 统一规范（视觉交互规范核心）

### 3.1 五条原则

1. **列表默认折叠**：列表/关系/相关实体类，默认只显示前 N 条 + 尾部「查看全部 N 条 →」。
2. **证据/来源默认 2 条**：证据、依据、来源论断类，默认 2 条 + 「查看全部依据 →」。
3. **长文默认截断**：叙述/解释/因果长文超过 3~4 行省略号 + 「展开全文」。
4. **截断必有出路**：任何 `slice`/`limit` 必须配展开交互，**不允许信息不可达**（修 P1）。
5. **统一视觉**：折叠控件全项目一套——CSS 变量（`--color-accent` / `--color-paper-*` / `--radius` /
   `--animation-fast`）、右侧箭头图标（Lucide chevron，无 emoji）、hover 变色，禁用弹跳缓动。

### 3.2 交互范式（以 TrustDisplay 为范本）

```
[列表 N 条默认展开区]
  条目 1
  条目 2（可独立展开/收起明细）
  ...
  查看全部 N 条 →        ← 点击展开其余
```

- 批量展开用「查看全部 N 条 →」；单条明细长时，条目本身可独立展开/收起。
- 展开为就地展开（非弹窗/非跳页），动画用 `--animation-fast`。

### 3.3 建议默认参数（待 PO 拍板）

| 内容类型 | 默认显示 | 展开方式 |
|---|---|---|
| 证据 / 依据 / 来源 | 2 条 | 查看全部 N 条 → |
| 关系 / 相关实体 / 图节点 | 3~5 条 | 查看全部 N 条 → |
| 长文（叙述/解释/因果） | 3~4 行 | 展开全文 |
| 事件链 / 时间线 | 5~8 条 | 查看全部 N 条 → |

---

## 4. 实施建议

1. **先做统一折叠组件**：新建可复用 `CollapsibleList`（列表折叠）+ `CollapsibleText`（长文截断），
   一处实现、各触点复用，避免每处重写。
2. **试点（第一刀）**：EntityHero 证据折叠（PO 举例，最痛）——`EvidenceList` 接折叠参数。
3. **批量落地 P0**：ProvenancePanel / SourceChain / ConnectionCard rels / ConnectionExplorer 等
   套用统一组件。
4. **补漏 P1**：所有无出路的 `slice` 补「查看全部」。
5. 全程：不破红线（零新依赖、CSS 变量、无 emoji、无弹跳）、`tsc`+`freeze-check` 全绿。

---

## 5. 待 PO 拍板项

- [x] 默认参数（3.3 表）——PO 2026-08-15 采纳建议值
- [x] 试点范围——PO 选"先改证据一处"（EvidenceList，vM13-4 已发）
- [x] 统一组件命名与位置——`frontend/src/components/ui/CollapsibleList|CollapsibleText`

---

## 6. 实施进度（2026-08-15 第二批）

### 已完成（待发版）
- **统一折叠组件**：`CollapsibleList`（列表默认 N 条 + 查看全部 N 条 → / 收起）、`CollapsibleText`（长文默认 N 行 + 展开全文 / 收起全文），通用文案 key（common.view_all/collapse/expand_text/collapse_text，zh/en/ja）。
- **P0 列表类 5 处**：ConnectionCard rels（3 条）、EntityRelatedList（5 条）、NextStepPanel（4 条）、ProvenancePanel 论断（3 条）、InterpretationPanel understandings（3 条）。
- **P0 长文类 3 处**：CausalStatementCard mechanism/consequence（3 行）、StorySection（4 行）、WhyImportantPanel（4 行）。
- **P1 补出口 1 处**：ConnectionCard 依据（2 条 + 查看全部）。

### 保持布局型截断（不强行折叠，判断说明）
- ConnectionExplorer graph 节点网格 / edges 标签流（5）/ timeline 时间轴（8）、EntityHero KeyFacts 卡片横排（3）——**结构化布局**，折叠按钮会破坏布局语义；且当前数据上限内"截断=全量"，不构成信息不可达。若未来数据超限，再单独加适配布局的展开。
- Event 三组件关系链、JourneyRail 行程——链式/旅程结构化视图，保持全量。

### 状态
- tsc + freeze-check 全绿。改动 12 文件（2 新组件 + 3 locale + 1 样式 + 7 组件）。
