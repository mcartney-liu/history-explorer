# 实体页 IA 施工前代码映射 / 变更清单

> 版本：v1（2026-08-16）。配套 `ENTITY_PAGE_IA_PLAN.md`（v2.1 冻结基线）。
> 用途：把 A1–A6 / D7 / D8 逐项映射到**真实组件、当前行为、目标行为、允许修改文件**，防止施工把 IA 重构偷偷扩大成架构重构（P5）。
> 全部"当前行为"来自 2026-08-16 代码核对（行号以当日 HEAD 为准），非记忆推断。
> 本文档**不新增任何设计**，只翻译已冻结方案；发现的新问题（决策冲突）以「⚠ 需 PO 关注」标注。

---

## 0. 现状总映射（实体页 13 个可见信息块）

| # | 信息块 | 组件 | 文件:行号 | 挂载点 | 归属层(v2.1) | 施工动作 |
|---|---|---|---|---|---|---|
| 1 | 类型标签 | EntityHeader | EntityPage.tsx:221 | tab 外 | — | 不动 |
| 2 | **入口桥**（从 XX 来） | **内联 origin-bridge**（非独立组件） | EntityPage.tsx:225-243 | tab 外 | L1 | **A1 并入衔接卡** |
| 3 | **ConnectionCard**（来自探索包） | ConnectionCard | package/ConnectionCard.tsx:120-243 | tab 外 | L1 | **A1 宿主 + A6 行程收敛** |
| 4 | 标题+摘要 | SummaryPanel | EntityPage.tsx:254 | tab 外 | L1(EntityHero 部分) | 不动（EntityHero 已在 L1，注意与 #7 视觉合并） |
| 5 | **探索引导卡**（M5-A-5） | EntityExplorationGuide | components/EntityExplorationGuide.tsx（he-guide） | EntityPage.tsx:258-265 | L1→L2 桥 | **A4 压成轻提示** |
| 6 | **行程条**（全局足迹） | JourneyTrail | ai/JourneyTrail.tsx | EntityPage.tsx:270-272（flag 门控） | L2/辅助 | **A6：本轮收敛挂载，不碰数据逻辑** |
| 7 | EntityHero + 知识概览（eg） | EntityExperienceHeader > EntityHero + ExplorationGuide | entity/EntityExperienceHeader.tsx; entity/EntityHero.tsx; entity/ExplorationGuide.tsx | info tab | L1 + L1→L2 | 视觉合并（Narrative Surface 的一部分）|
| 8 | 历史叙事 + 为什么重要 | StorySection + WhyImportantPanel | exploration/StorySection.tsx; exploration/WhyImportantPanel.tsx | EntityPage.tsx:323-332 | L1 | 叙事区合并（D8 配套）|
| 9 | **它意味着什么** | InterpretationPanel | components/InterpretationPanel.tsx | EntityPage.tsx:338-348 | L1 | **D8 并入叙事区**（组件仍在）|
| 10 | 关系洞察 | RelationshipInsight | ai/RelationshipInsight.tsx | EntityPage.tsx:353-358（flag） | L2 | 顺序保持（关系洞察→关系探索）|
| 11 | 关系探索（图/时间/地图） | ConnectionExplorer | entity/ConnectionExplorer.tsx | EntityPage.tsx:361-366 | L2 | 不动 |
| 12 | AI 历史学家 | HistorianChat | components/HistorianChat.tsx | EntityPage.tsx:369-381 | L3 | **A2 移入 AI tab** |
| 13 | 证据与溯源 | ProvenancePanel | components/ProvenancePanel.tsx | EntityPage.tsx:388 | L3 | **A3 直接可见折叠** |
| 14 | 探索足迹（底部 journey） | ExplorationPath | components/ExplorationPath.tsx | App.tsx:1037 | — | 本轮不动（独立功能）|
| 15 | **下一站探索**（Phase C 决策） | NextStepPanel | components/NextStepPanel.tsx | App.tsx:1038（EntityPage 外 footer） | L2 | **A5：footer 内主位**（见 §A5 说明）|
| 16 | **继续探索** | ContinueExploringPanel | components/ContinueExploringPanel.tsx | App.tsx:1039（footer） | L3 | **A5：收「更多」** |

**关键工程事实（影响施工）：**
1. 入口桥是 **EntityPage 内联实现**（非独立组件）——A1 是把这段逻辑**迁入 ConnectionCard 或转为传参**，不是删组件。
2. **两个"探索引导"组件并存**：`EntityExplorationGuide`（顶部独立卡，he-guide）与 `ExplorationGuide`（EntityExperienceHeader 的 guide 槽="知识概览"，eg，**内含"推荐探索"卡**）。A4 必须分别处理，见 §A4。
3. 下一站探索/继续探索挂在 **App.tsx 的 entity-exploration-footer**（EntityPage 组件之外），依赖 App 层状态（nextStepActions / journeyReasons / setJourneyReasons / seenGlobalIds）——**物理挪进 EntityPage 需要新增 props 数据流（P5 禁）**，故 A5 走 footer 内收敛，见 §A5。
4. tabs 现状 = `info / research / extensions`，**extensions 是占位**（"扩展功能即将推出"，EntityPage.tsx:489-494）——D7 甲案可直接把 extensions 占位改造成 AI tab。

---

## A1 站间衔接合一（D1 ✅ 冻结）

**现状（重复实证）：**
- origin-bridge（EntityPage.tsx:225-243）：`从{fromName}来` + B 解释层叙述（collectRelationEvidence → buildExplanationCandidates → selectBestExplanation / expressHonestNone）。来源 `takeOriginEntity(entityGlobalId)`，仅"实体 A → 实体 B 跳入"时存在。
- ConnectionCard（ConnectionCard.tsx）：仅"从探索包进入"时渲染（`takePackageOrigin` 有值），内部已有 `connection-card-transition`（"从上一站{prev.name}来" + 同一套 B 解释层叙述）。

**目标模型（PO 定稿）：**
```
ConnectionCard
├── 第 X / N 站
├── 从哪里来（入口来源承接 OR 包内上一站承接）
├── 为什么来到这里（有证据走关系叙述 / 无证据走诚实陈述）
└── 极简 Journey Trail（secondary nav：① → ② → ③）
```

**施工映射：**
| 项 | 内容 |
|---|---|
| 改文件 | `EntityPage.tsx`（删内联桥块，改为给 ConnectionCard 传来源 prop）；`package/ConnectionCard.tsx`（新增"从哪里来"区，渲染入口承接） |
| 当前行为 | 两个独立卡片，各自渲染"从哪里来"叙述（包内场景下叙述可能同时出现→重复） |
| 目标行为 | 一张卡：包内进入→显示包行程承接；实体跳入→显示入口承接；两者都无→整卡不渲染（P4） |
| 数据语义 | **不变**（PO 红线：ConnectionCard 是 Exploration Context → Entity Understanding 的接口，只改呈现） |
| 关键注意 | 实体 A→B 跳入路径（无包上下文）不能因合并而丢"来源承接"——ConnectionCard 需支持"无 originSlug 但有来源"的渲染分支 |
| 风险 | 低。回归点：包内跳转（jump 携带 originSlug 顺延）、实体跳入（takeOriginEntity）两条路径都要实测 |

---

## A6 JourneyTrail 收敛（D6 ✅ 冻结）

**⚠ 必须先指认：存在两套"行程"，施工不许混：**

| 行程 | 组件 | 数据 | 语义 | 本轮动作 |
|---|---|---|---|---|
| 包内行程 | ConnectionCard 内嵌 `connection-card-journey`（第 X/N 站 + 上一站/下一站 + 查看完整行程） | buildStations(pkg) | "我在这条探索包的哪一站" | **A6 主体**：收敛为极简 secondary nav（①→②→③），不展开全部信息 |
| 全局足迹 | ai/JourneyTrail.tsx（独立 section，flag 门控） | UserBehaviorEvent 流（visitedFromEvents） | "我的全局探索足迹" | 本轮**只收敛挂载位置**（或维持），**不碰数据逻辑**（P5：无状态/数据流改动） |

**施工映射：**
| 项 | 内容 |
|---|---|
| 改文件 | `package/ConnectionCard.tsx`（journey 区样式收敛为极简 nav）；样式；`EntityPage.tsx`（如调整 JourneyTrail 挂载位置） |
| 当前行为 | 包内行程以大按钮组呈现（上一站/下一站带名字+箭头）；JourneyTrail 独立显示最近 5 步 gid 列表 |
| 目标行为 | ① 包内行程区：位置指示 + 极简 `① → ② → ③` 次级导航，点击可跳；「查看完整行程」保留为小链接；② JourneyTrail 保持"我在探索路径哪里"语义，不与衔接卡叙述重复（职责分离：衔接卡=为什么来，行程=在哪） |
| 数据语义 | 不变。两套行程数据源原样 |
| 风险 | 低。回归点：包内上一站/下一站跳转仍可用（jump 逻辑不动） |

---

## A4 探索引导 → 轻量认知提示（D4 ✅ 冻结 + P2 约束）

**⚠ 必须分别处理两个组件（语义不同）：**

| 组件 | 文件 | 现状 | 归属 |
|---|---|---|---|
| EntityExplorationGuide（顶部独立卡） | components/EntityExplorationGuide.tsx | 始终渲染（dismissible 卡，"探索{name}" + starters 列表 + 空态） | **A4 主目标**：压成一行轻量提示 |
| ExplorationGuide（知识概览 eg） | entity/ExplorationGuide.tsx | 统计标签（关联数/关系数/时间线数）+ **"推荐探索"卡**（first unvisited node）+ 探索路径 | 其"推荐探索"与 A4 轻提示**语义重复**，需收敛 |

**目标模型（PO 定稿）：**
```
（EntityHero / 主体叙事区之后，关系探索之前）
接下来可以了解：安史之乱 →
（无强推荐 → 整行不渲染，系统不说话也是高质量行为）
```

**施工映射：**
| 项 | 内容 |
|---|---|
| 改文件 | `components/EntityExplorationGuide.tsx`（卡→一行提示）；`entity/ExplorationGuide.tsx`（移除/收敛"推荐探索"卡，保留统计入口）；`EntityPage.tsx`（挂载顺序微调） |
| 当前行为 | 大卡平铺 + 空态占位；eg 内"推荐探索"显示 first unvisited node |
| 目标行为 | 一行轻量行动提示，**只消费已解析的 starters / 已有 next-step 结果**（P2：UI 层不新增决策逻辑）；无结果不渲染（P4） |
| **P2 硬约束** | EntityPage / 引导组件内**禁止新增推荐/排序逻辑**。数据来源只用：App 已解析的 `entityStarters`（explorationStarters.ts）与既有 next-step decision result。若"强推荐"需判定，判定留在 Phase C 层（本轮不动） |
| 风险 | 中。注意 eg 的"推荐探索"删除会影响现有测试（ExplorationGuide 相关 test）——施工时同步更新测试断言 |

---

## A3 证据与溯源折叠（D3 ✅ 冻结）

**施工映射：**
| 项 | 内容 |
|---|---|
| 改文件 | `components/ProvenancePanel.tsx`（或包一层折叠容器）；样式 |
| 当前行为 | ProvenancePanel 在 info tab 直接平铺渲染 |
| 目标行为 | 直接可见的 `[证据与溯源 ▾]` 折叠行，点击展开全文。**不塞"更多"**（低干扰、高可达；信任层是未来可信度基础设施） |
| 数据语义 | 不变 |
| 风险 | 低。回归点：折叠展开后证据内容完整、引用跳转仍可用 |

---

## A2 + D7 AI 收进独立 tab（D2/D7 ✅ 冻结 + P3 约束）

**施工映射（方案甲「概览/研究/AI」）：**
| 项 | 内容 |
|---|---|
| 改文件 | `EntityPageShell.tsx`（TABS 配置 L19-23 + 类型 EntityTab）；词典（`entity.tabInfo/tabResearch/tabExtensions` → 概览/研究/AI 语义）；`EntityPage.tsx`（info 移除 HistorianChat L369-381；新增 AI tab case 承接） |
| 当前行为 | tabs=info/research/extensions；extensions 为占位文本（EntityPage.tsx:489-494）；HistorianChat 平铺在 info tab 底部 |
| 目标行为 | tabs=**概览/研究/AI**；HistorianChat 移入 AI tab；概览 tab 只留 L1+L2 主体流（AI 按需唤起） |
| tab id 处理 | 建议复用 `extensions` id 改名（减少类型改动）或新增 `ai` id（类型/字典/测试改动略增）——施工时二选一，倾向**新增 `ai` id + 删除 extensions 占位**（语义干净，P3 精神） |
| **P3 硬约束** | research tab **保持现状结构不动**（研究主区/事件专属/解读与 AI 是既有研究任务结构，不是"剩余能力容器"）；本轮只做 tab 命名与 AI 归属，不往 research 塞东西 |
| 注意 | tab 标签本就运营可编辑（`entity_tabs.nav_labels` slot，EntityPageShell.tsx:67）——**代码改名与运营配置要同步**，避免覆盖 |
| 风险 | 中。回归点：①「深研」入口 initialTab='research' 仍直达研究 tab；② tab 持久化（localStorage saveTab）；③ AI tab 无 globalId 空态 |

---

## A5 下一站探索 vs 继续探索（D5 ✅ 冻结）

**⚠ 工程约束决定施工形态：** NextStepPanel / ContinueExploringPanel 挂在 **App.tsx footer**（EntityPage 外），依赖 App 层 state。**物理挪进 EntityPage = 新增 props 数据流（P5 禁）**。

**施工映射（推荐：footer 内收敛，物理位置不动）：**
| 项 | 内容 |
|---|---|
| 改文件 | `App.tsx`（footer 编排：顺序/视觉主次）；`ContinueExploringPanel.tsx`（收"更多"折叠形态）；`NextStepPanel.tsx`（仅视觉强化，如需要） |
| 当前行为 | footer 平铺：ExplorationPath + NextStepPanel + ContinueExploringPanel 三个同权块 |
| 目标行为 | NextStepPanel 视觉主位（系统判断的下一步）；ContinueExploringPanel 收敛为「更多」入口（展开看相关内容池）；**两个概念永不合并**（Phase D 接入的是 Next Exploration，不是 Continue） |
| 数据流 | **不变**（全部 props 原样，只改呈现与编排） |
| 风险 | 低-中。回归点：NextStepPanel 的 onNodeClick 携带 journeyReasons 写入逻辑（App.tsx:1038）不能动 |

---

## D8 InterpretationPanel 归位（D8 ✅ 冻结）

**施工映射：**
| 项 | 内容 |
|---|---|
| 改文件 | 样式（叙事区容器）；`EntityPage.tsx`（L323-348 区域视觉编排） |
| 当前行为 | StorySection + WhyImportantPanel + InterpretationPanel 三个独立卡片连续堆叠（hasNarrative ? 叙事 : EmptyState） |
| 目标行为 | **一个 Narrative Surface**：`历史叙事 → 为什么重要 → 这意味着什么` 形成连续"理解段落"（组件仍在，视觉上不是一个接一个的大卡片） |
| **⚠ 需 PO 关注** | 当前 `hasNarrative ? <Story+Why/> : <EmptyState/>`（EntityPage.tsx:323-332）——M35 旧决策"板块始终可见+空态占位"与 **P4（缺失不渲染空模块）冲突**。按 PO 最新定稿 P4 执行：无叙事 → 不渲染空态。此为唯一一处与历史决策的显式冲突，已在施工时按 P4 处理并记录 |
| 风险 | 低。回归点：有叙事实体（无空态回归）、无叙事实体（不再显示"暂无叙事"占位） |

---

## P4 缺失态（Progressive Presence）逐组件核查表

| 组件 | 现状 | 符合 P4？ | 施工动作 |
|---|---|---|---|
| ConnectionCard | 无包上下文 → return null | ✅ | 无 |
| EntityExplorationGuide | 始终渲染（空态存在） | ❌ | A4 改为无 starters 不渲染 |
| JourneyTrail | trail 空 → null | ✅ | 无 |
| InterpretationPanel | 无理解 → null（L334-337 注释确认） | ✅ | 无 |
| NextStepPanel | actions 空 → null（NextStepPanel.tsx:132） | ✅ | 无 |
| Story/WhyImportant | 无叙事 → EmptyState 占位 | ❌ | D8 配套：按 P4 不渲染空态 |
| ProvenancePanel | 需核对无证据行为 | ⚠ | A3 施工时核对：无证据 → 不渲染折叠行 |

---

## 验收工程化（PO §12-15 → 可执行标准）

**1. 首屏定义（固定 viewport）：**
- 验收统一使用 **1440 × 900** 默认 viewport 实测（无头浏览器固定尺寸），不靠主观"看起来"。
- 验收对象是**视觉焦点**（用户概念），不是组件数（工程概念）。

**2. 视觉焦点计数法：**
- 无头浏览器 eval：按 `aria-label / section / header` 语义边界 + 几何位置聚类，统计第一屏（viewport 内）独立视觉大块。
- 目标：**第一屏 ≤3 个主要视觉焦点**（① 站间上下文 ② 实体/核心意义 ③ ——）。

**3. 认知顺序走查：** 顺着「我在哪→它是什么→为什么重要→它和什么有关→下一步去哪」逐屏走通，任何一环断链=失败。

**4. 功能寻址/可发现性测试（PO 表格原样）：**

| 能力 | 正常状态 | 用户能否预测入口位置 |
|---|---|---|
| Relationship | 可见 | 是（L2 顺位） |
| Graph / Timeline / Map | 可见 | 是（ConnectionExplorer 三视图） |
| Next Exploration | 可见 | 是（footer 主位） |
| AI | Tab「AI」 | 是（tab 名即语义） |
| Evidence | 折叠行 | 是（`[证据与溯源 ▾]` 可见可点） |
| Continue Exploring | More 折叠 | 是（入口有"更多"字样） |

**5. 重复消除：** A1 后无「从 XX 来」与「从上一站来」并存的双叙述。

**6. 回归：** `tsc` + 相关组件测试（EntityPageShell.test / ExplorationGuide 相关 / ConnectionCard 相关）+ freeze-check + 隧道重建（4173）。

---

## 施工顺序（PO §13 修订版，风险隔离优先）

```
Phase 1  A1 + A6        → 只处理 Context / Journey（影响面最清晰）
Phase 2  L1 Narrative   → D8 + Story/WhyImportant 叙事区（建立主体阅读流）
Phase 3  A4             → L1→L2 桥（轻量探索提示）
Phase 4  L2             → Relationship → Next Exploration（footer 内主位）
Phase 5  A3             → Evidence 折叠
Phase 6  A2 + D7        → AI / tabs（最后，避免先动 tabs 再回头改主体）
```

**理由（PO）：先建立"主阅读流"，再处理外围能力。** 每个 Phase 独立可验证、可回滚、可独立 commit。

---

## 允许修改 vs 禁改文件清单

**允许修改（呈现层，上限即此）：**
- `frontend/src/components/EntityPage.tsx`
- `frontend/src/components/EntityPageShell.tsx`
- `frontend/src/components/package/ConnectionCard.tsx`
- `frontend/src/components/EntityExplorationGuide.tsx`
- `frontend/src/components/entity/ExplorationGuide.tsx`（仅收敛"推荐探索"）
- `frontend/src/components/ProvenancePanel.tsx`（折叠包装）
- `frontend/src/components/ContinueExploringPanel.tsx`（收"更多"）
- `frontend/src/components/NextStepPanel.tsx`（仅视觉）
- `frontend/src/App.tsx`（仅 footer 编排 + EntityPage 传参）
- 样式（EntityPage / eps / connection-card / origin-bridge / he-guide / eg / narrative 相关 css）
- 文案词典（`entity.*` / `discover.*`）

**禁改（P5 / 红线）：**
- `backend/**`；`data/continuityEngine*`；`data/continuityExplanation*`；`next/exploration/*`（Phase C 决策）
- 任何组件的状态模型 / 数据流 / 组件职责重构（含 ai/JourneyTrail.tsx 数据逻辑、App.tsx 的 nextStepActions/journeyReasons 计算）
- 不引新依赖；不动 explorationStarters / explorationPackages 数据结构

---

## 风险登记

| 风险 | 等级 | 缓解 |
|---|---|---|
| A1 合并后实体跳入路径丢来源承接 | 中 | ConnectionCard 增加无包分支；回归两条进入路径 |
| A4 删 eg"推荐探索"破坏现有测试 | 中 | 施工时同步更新测试断言（ExplorationGuide 相关） |
| A2 tab 改名与运营配置 `entity_tabs.nav_labels` 冲突 | 中 | 施工时同步检查/更新运营 slot，避免被覆盖 |
| D8 空态 vs M35 旧决策冲突 | 低 | 按 P4（PO 最新定稿）执行，文档留痕 |
| 施工越界（顺手重构 EntityPage） | 高 | 本清单 §"允许修改 vs 禁改"即闸门；每 Phase 独立 commit 便于回滚 |
