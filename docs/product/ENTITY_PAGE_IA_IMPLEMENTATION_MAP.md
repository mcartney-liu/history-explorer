# 实体页 IA 施工前代码映射 / 变更清单 v2（施工契约版）

> 版本：v2（2026-08-16，PO 二次审核：**有条件通过，可进入施工准备，但暂缓开工**）。
> 配套 `ENTITY_PAGE_IA_PLAN.md`（v2.1 冻结基线）。
> v2 变更：封死 PO 二次审核卡住的 **4 个缝**（A4 禁自算推荐 / A5 NextStep 归 L2 / A1 来源优先级 / A3 状态规则），并把 A6 写死、D7 语义边界、D8 呈现原则、验收认知任务测试、P5 可以/不可以清单全部精确化。
> 全部"当前行为"来自 2026-08-16 代码核对（行号以当日 HEAD 为准）。

---

## R0. 施工契约核心原则（不可破坏）

> **"谁决定下一步"必须始终是 Phase C；"谁决定现在怎么展示"才是 EntityPage。**
> 本条是本次重构不沦为普通 UI 重构的边界——实体页 IA 重构是 **Phase D 认知闭环的第一块界面基础设施**。

```
决策层（不可改）        Phase C next-step decision / Phase B relation engine
        │  只读消费（不可改变结果，只允许搬运展示）
        ▼
展示层（本轮可改）      EntityPage 及其子组件编排 / 视觉 / 折叠 / tab 归属
```

---

## 0. 现状总映射（实体页 13 个可见信息块）

| # | 信息块 | 组件 | 文件:行号 | 挂载点 | 归属层(v2.1) | 施工动作 |
|---|---|---|---|---|---|---|
| 1 | 类型标签 | EntityHeader | EntityPage.tsx:221 | tab 外 | — | 不动 |
| 2 | **入口桥**（从 XX 来） | **内联 origin-bridge** | EntityPage.tsx:225-243 | tab 外 | L1 | **A1 并入衔接卡** |
| 3 | **ConnectionCard** | ConnectionCard | package/ConnectionCard.tsx:120-243 | tab 外 | L1 | **A1 宿主 + A6 行程收敛** |
| 4 | 标题+摘要 | SummaryPanel | EntityPage.tsx:254 | tab 外 | L1 | 不动（与 EntityHero 视觉合并） |
| 5 | **探索引导卡**（M5-A-5） | EntityExplorationGuide | components/EntityExplorationGuide.tsx | EntityPage.tsx:258-265 | L1→L2 桥 | **A4 压成轻提示** |
| 6 | **行程条**（全局足迹） | JourneyTrail | ai/JourneyTrail.tsx | EntityPage.tsx:270-272 | 辅助 | **A6：本轮不动（写死）** |
| 7 | EntityHero + 知识概览（eg） | EntityExperienceHeader > EntityHero + ExplorationGuide | entity/*.tsx | info tab | L1 + L1→L2 | 视觉合并；eg 移除推荐自算（A4） |
| 8 | 历史叙事 + 为什么重要 | StorySection + WhyImportantPanel | exploration/*.tsx | EntityPage.tsx:323-332 | L1 | 叙事区合并（D8）|
| 9 | **它意味着什么** | InterpretationPanel | components/InterpretationPanel.tsx | EntityPage.tsx:338-348 | L1 | **D8 并入叙事区** |
| 10 | 关系洞察 | RelationshipInsight | ai/RelationshipInsight.tsx | EntityPage.tsx:353-358 | L2 | 顺序保持 |
| 11 | 关系探索（图/时间/地图） | ConnectionExplorer | entity/ConnectionExplorer.tsx | EntityPage.tsx:361-366 | L2 | 不动 |
| 12 | AI 历史学家 | HistorianChat | components/HistorianChat.tsx | EntityPage.tsx:369-381 | L3 | **A2 移入 AI tab** |
| 13 | 证据与溯源 | ProvenancePanel | components/ProvenancePanel.tsx | EntityPage.tsx:388 | L3 | **A3 折叠 + 状态规则** |
| 14 | 探索足迹（底部 journey） | ExplorationPath | components/ExplorationPath.tsx | App.tsx:1037 | — | 本轮不动 |
| 15 | **下一站探索**（Phase C 决策） | NextStepPanel | components/NextStepPanel.tsx | App.tsx:1038（EntityPage 外） | L2 | **A5：只读 props 移入 L2** |
| 16 | **继续探索** | ContinueExploringPanel | components/ContinueExploringPanel.tsx | App.tsx:1039 | L3 | **A5：收「更多」** |

**核实过的工程事实（2026-08-16）：**
1. 入口桥是 **EntityPage 内联实现**（非独立组件）。
2. **两个"探索引导"组件并存**：`EntityExplorationGuide`（顶部独立卡 he-guide）与 `ExplorationGuide`（EntityExperienceHeader guide 槽="知识概览"eg）。
3. **transition 解释链只有一套**：ConnectionCard 与 originBridge 都走 `collectRelationEvidence → buildExplanationCandidates → selectBestExplanation / expressHonestNone`（continuityEngine + continuityExplanation）；`describeTransition`（data/transition.ts:50）**已无任何组件引用**（遗留种子，勿在施工中复活为第三套）。
4. NextStepPanel / ContinueExploringPanel 挂在 **App.tsx entity-exploration-footer**（EntityPage 外），依赖 App 层 state（nextStepActions / journeyReasons / seenGlobalIds）。
5. tabs = `info / research / extensions`，extensions 是占位（EntityPage.tsx:489-494）。
6. ProvenancePanel 状态类型：`loading | success | empty | error | disabled`（ProvenancePanel.tsx:13）；**标题+副标题无条件渲染**（L108-109）。
7. EntityExplorationGuide：starters 空时仅 null 列表，**大卡标题+intro 仍渲染**（违反 P4，A4 改整卡不渲染）。

---

## A1 站间衔接合一（D1 ✅ 冻结 · 补来源优先级 + 防第三套逻辑）

**目标模型（PO 定稿，不变）：**
```
ConnectionCard
├── 第 X / N 站
├── 从哪里来
├── 为什么来到这里
└── 极简 Journey Trail（① → ② → ③）
```

**来源优先级规则（v2 补，必须冻结）：**
```
Package Journey Context（探索包上下文）
        ↓ 优先
Direct Entity Origin（实体 A→B 直接来源）
        ↓
No Context → 整卡不渲染（P4）
```
- 用户正在执行探索包时，"我为什么在这里"首先解释**当前站点在这条探索线里的位置**；实体 A→B 的关系作为站间解释存在，**不得抢走 package context**（防"超级衔接卡"）。
- 两来源并存时（包 A → 实体 X → 实体 Y）：显示 package 承接为主、实体来源为站间解释，**不是两张卡、不是三行叙述**。

**防第三套 transition（v2 补，硬约束）：**
- **合并的是呈现宿主，不是复制 transition 逻辑。**
- 代码事实：ConnectionCard 与 originBridge **已共用同一套** continuityEngine 解释链（见 §0 事实 3）。施工时：
  - 迁入来源承接 → **继续调用原有解释函数**（collectRelationEvidence 等），禁止在 ConnectionCard 内新写一套解释/fallback；
  - `describeTransition`（transition.ts）是遗留种子、无引用 → **不得在施工中复活或混用**；
  - 验收：A1 后全仓 transition 解释入口仍只有 continuityEngine 一套。

**施工映射：**
| 项 | 内容 |
|---|---|
| 改文件 | `EntityPage.tsx`（删内联桥块 L225-243，改为传来源 prop）；`package/ConnectionCard.tsx`（新增"从哪里来"区 + 来源优先级分支） |
| 数据语义 | **不变**（PO 红线：ConnectionCard 是 Exploration Context → Entity Understanding 的接口） |
| 回归点 | 包内跳转（jump 携带 originSlug）、实体跳入（takeOriginEntity）、包→实体→实体三跳链 |
| 风险 | 低。⚠ 唯一红线：实体 A→B 跳入路径（无包上下文）不能因合并丢来源承接 |

---

## A6 两套 Journey 分离（D6 ✅ 冻结 · 写死不动）

| 行程 | 组件 | 数据 | 语义 | 本轮动作 |
|---|---|---|---|---|
| 包内行程 | ConnectionCard 内嵌 journey 区 | buildStations(pkg) | "我在这条探索包的哪一站" | **A6 主体**：收敛为极简 secondary nav（①→②→③），「查看完整行程」保留为小链接 |
| 全局足迹 | ai/JourneyTrail.tsx（独立 section） | UserBehaviorEvent 流 | "我的全局探索足迹" | **本轮不得修改** |

**v2 写死（PO 要求）：**
- `ai/JourneyTrail.tsx` **本轮不得修改**：不得移动其数据来源、状态或语义；
- **未经 PO 单独批准，不调整其挂载位置**（v1 清单"如调整挂载位置"的口子**关闭**）；
- **绝对不要为了视觉统一把两个 Journey 合成一个**（两套数据/语义不同，合并=数据流重构=P5 禁）。

---

## A4 探索引导 → 轻量认知提示（D4 ✅ 冻结 · 🔴 禁 UI 自算推荐）

**🔴 v2 硬约束（PO 点名的第一关键项）：**
> **禁止 `ExplorationGuide` 组件内部继续计算 `nextNode`。**

- 现状：`entity/ExplorationGuide.tsx:47-49` 存在
  `const nextNode = nodes.find(n => n.name !== entityName && ... && !visitedIds.includes(n.id))` —— **组件自己在决定"推荐探索谁"**，这与 P2 直接冲突。
- **修正为：组件只能消费上游已解析的推荐结果**，展示层零决策。

**A4 方案选型（v2 定案 = 方案 B）：**
- **方案 B**：把已有的 `entityStarters`（App 已从 explorationStarters.ts 解析）作为**只读 prop** 传入展示。
- 允许：为"展示既有决策结果"增加**最小只读 prop**（这是呈现层数据输入调整，不是架构重构——P5 范围内）。
- 禁止：组件内部新增决策、排序、推荐算法；禁止"为了不改数据流而继续用 first unvisited"。

**组件级动作：**
| 组件 | 动作 |
|---|---|
| `entity/ExplorationGuide.tsx`（eg） | **删除 nextNode 自算与"推荐探索"卡**；保留统计入口（关联数/关系数/时间线数） |
| `components/EntityExplorationGuide.tsx`（he-guide） | 卡 → 一行轻提示：「接下来可以了解：{starter} →」；**无 starters → 整卡不渲染**（改掉现在"空态大卡仍渲染"的行为） |
| `EntityPage.tsx` | 挂载顺序：EntityHero / 主体叙事区之后、关系探索之前（L1→L2 桥）；只传已有结果 |

**注意：** eg 删除"推荐探索"卡可能破坏既有测试（ExplorationGuide 相关 test 断言了 nextNode 行为）——施工时同步更新测试断言，断言方向改为"组件不产生推荐、只展示传入结果"。

---

## A3 证据与溯源折叠（D3 ✅ 冻结 · 补状态规则）

**v2 补：ProvenancePanel 状态规则（写死）：**

| 状态 | 折叠行/面板行为 |
|---|---|
| loading | **不显示折叠行**（避免首屏闪烁；骨架屏也收起，面板整体延迟到结果确定） |
| success | 显示 `[证据与溯源 ▾]` 折叠行，展开看来源+论断 |
| empty | **不显示**（无策展记录 = 无模块，P4） |
| disabled | **不显示**（功能未启用 = 无模块，P4） |
| error | **显示"证据与溯源"入口 + 错误状态**（ErrorCard + 重试保留）——"没有证据"与"证据服务加载失败"不是一个语义，error 必须可见可重试 |

- 现状：标题+副标题无条件渲染（L108-109），loading/empty/disabled 都渲染整块占位 → **需收敛为按状态显隐折叠行**（标题只在 success/error 呈现）。
- 原则：**Evidence = 低干扰、高可达；不是低优先级、低可发现**（信任层是未来可信度基础设施，error 必须诚实可见）。

---

## A2 + D7 AI 收进独立 tab（D2/D7 ✅ 冻结 · 写死 Research/AI 语义边界）

**tab 体系：概览 / 研究 / AI（D7 甲案冻结）。**

**v2 补：Research 与 AI 的语义边界（写死，防 AI tab 变垃圾桶）：**
```
Research（研究） = AI-assisted research / explanation（AI 辅助研究与解释 —— 保留现状 AIExplanationPanel 等）
AI（问史）       = direct conversational historian（直接对话式历史学家 —— HistorianChat）
```
- 用户看到"研究里也有 AI，AI tab 又是什么"的困惑 → 由上述边界消除：研究=工具性 AI 解释，AI=对话。
- **AI tab 准入条件**：只有"直接对话式"能力进 AI tab；其余 AI 功能按各自任务归属（研究类留 research）。与 P3 同构：**tab 不是剩余能力容器**。

**施工映射：**
| 项 | 内容 |
|---|---|
| 改文件 | `EntityPageShell.tsx`（TABS L19-23 + EntityTab 类型）；词典；`EntityPage.tsx`（info 移除 HistorianChat L369-381；新增 AI tab case） |
| tab id | 倾向**新增 `ai` id + 删除 extensions 占位**（语义干净） |
| research tab | **保持现状结构不动**（研究主区/事件专属/解读与 AI 是既有研究任务结构） |
| 注意 | tab 标签运营可编辑（`entity_tabs.nav_labels` slot）——代码改名与运营配置同步，避免覆盖 |
| 回归点 | 「深研」initialTab='research' 直达；tab 持久化（localStorage）；AI tab 无 globalId 空态 |

---

## A5 下一站探索归位 L2（D5 ✅ 冻结 · 🔴 方向 2 定案）

**🔴 v2 关键决策（PO 倾向方向 2，定案）：**

> 认知顺序「关系 → 下一步」必须在页面呈现上成立。NextStepPanel 不能永远卡在 EntityPage 外部 footer——否则 **IA 正确但呈现不实现 IA**，Phase C 的结果无法成为 Phase D 的界面输入。

**方向 2：允许一次非常小的呈现层 prop plumbing**
- **允许**：App → EntityPage 传只读 props，将 NextStepPanel 移入 EntityPage，**紧跟 ConnectionExplorer**（关系探索之后、即 L2 末尾），形成「关系洞察 → 关系探索 → 下一站探索」真实顺序。
- **禁止（不改决策结果，只搬运）**：
  - 修改 `nextStepActions` 计算；
  - 修改 decision engine / Phase C 决策逻辑；
  - 修改 `journeyReasons` 产生逻辑（App.tsx:1038 的写入回调原样保留）；
  - 修改状态模型。
- 验收措辞：**允许搬运决策结果，不允许改变决策结果。**

**继续探索（L3「更多」）：**
- ContinueExploringPanel 收敛为「更多」入口（展开看相关内容池），留在 footer 或随 NextStep 就近——**两个概念永不合并**（Phase D 接入的是 Next Exploration，不是 Continue）。

**施工映射：**
| 项 | 内容 |
|---|---|
| 改文件 | `App.tsx`（footer 编排：NextStep 的渲染从 footer 移到 EntityPage props；Continue 收「更多」）；`EntityPage.tsx`（接收只读 props，L2 末尾渲染 NextStepPanel）；`ContinueExploringPanel.tsx`（折叠形态） |
| 数据流 | **只读透传**，零计算改动 |
| 风险 | 中（触碰 App.tsx 编排）。缓解：NextStepPanel 渲染逻辑整体搬迁、props 原样透传，diff 可读 |
| 回归点 | 点击下一站 → journeyReasons 写入仍生效（回调不换）；历史/后退栈不变 |

---

## D8 InterpretationPanel 归位（D8 ✅ 冻结 · Surface ≠ Card）

**v2 补呈现原则（PO 要求写清）：**
- **Surface ≠ Card。** 目标是：`历史叙事 → 为什么重要 → 它意味着什么` 三个**语义连续的段落**，消灭**视觉权重的离散化**——不是"3 个 Card 套 1 个 Card"。
- 施工验收：不按"有几个卡片容器"判断，按"视觉上是否是一个连续主体叙事"判断。
- 组件保持：StorySection / WhyImportantPanel / InterpretationPanel 仍在，容器与视觉合并。
- 冲突处理：`hasNarrative ? <Story+Why/> : <EmptyState/>`（L323-332）——M35 空态 vs P4 → **按 P4 执行**（无叙事不渲染空态），留痕。

---

## P4 缺失态（Progressive Presence）核查表（v2 更新）

| 组件 | 现状 | 符合 P4？ | v2 动作 |
|---|---|---|---|
| ConnectionCard | 无包上下文 → return null | ✅ | 无 |
| EntityExplorationGuide | **空态大卡仍渲染** | ❌ | A4：无 starters 整卡不渲染 |
| JourneyTrail | trail 空 → null | ✅ | 无 |
| InterpretationPanel | 无理解 → null | ✅ | 无 |
| NextStepPanel | actions 空 → null（L132） | ✅ | 无 |
| Story/WhyImportant | 无叙事 → EmptyState | ❌ | D8：按 P4 不渲染空态 |
| ProvenancePanel | 空态/disabled 整块占位 | ❌ | A3：按状态规则（empty/disabled 不显示；error 可见可重试） |

---

## 验收工程化 v2

**1. 首屏 = 固定 1440 × 900 viewport**（无头浏览器固定尺寸实测）。

**2. 视觉焦点**：第一屏 ≤3 个主要视觉焦点（① 站间上下文 ② 实体/核心意义 ③ ——）。

**3. 首屏认知任务测试（v2 新增，PO 要求）：**
> 用户看完首屏，**不用点击**能否回答三个问题：
- **Q1 我为什么来到这里？** → ConnectionCard
- **Q2 这个东西是什么？** → EntityHero / Summary
- **Q3 为什么值得继续看？** → Narrative / Meaning
>
> 三问答不出 = 失败（即使 ≤3 个视觉焦点）。因为要解决的是**认知结构**，不是视觉密度。

**4. 功能寻址/可发现性：**
| 能力 | 正常状态 | 用户能否预测入口 |
|---|---|---|
| Relationship | 可见 | 是（L2 顺位） |
| Graph / Timeline / Map | 可见 | 是（ConnectionExplorer 三视图） |
| Next Exploration | 可见 | 是（紧跟关系探索，L2 末尾） |
| AI | Tab「AI」 | 是（tab 名即语义） |
| Evidence | 折叠行 | 是（success/error 时 `[证据与溯源 ▾]` 可见） |
| Continue Exploring | More 折叠 | 是（入口有"更多"字样） |

**5. 重复消除：** A1 后无「从 XX 来」与「从上一站来」并存双叙述。

**6. 解释链单一性：** A1 后 transition 解释入口仍只有 continuityEngine 一套（describeTransition 不复活）。

**7. 回归：** tsc + 相关组件测试（EntityPageShell / ExplorationGuide / ConnectionCard / ProvenancePanel / NextStepPanel）+ freeze-check + 隧道重建（4173）。

---

## 施工顺序（PO §13 版，A5 改为含只读 plumbing）

```
Phase 1  A1 + A6        → 只处理 Context / Journey（来源优先级 + 极简行程）
Phase 2  L1 Narrative   → D8 + Story/WhyImportant 叙事区（建立主体阅读流）
Phase 3  A4             → L1→L2 桥（轻提示；eg 删 nextNode 自算）
Phase 4  L2 + A5        → 关系洞察/关系探索 + NextStep 只读移入（呈现实现 IA）
Phase 5  A3             → Evidence 折叠 + 状态规则
Phase 6  A2 + D7        → AI / tabs（最后）
```
每个 Phase 独立可验证、可回滚、可独立 commit。

---

## P5 施工边界精确化（v2，采纳 PO 清单）

### 可以
- 组件重新编排（顺序/挂载/层级）
- 组件视觉合并（Narrative Surface / 衔接卡宿主合并）
- 增加折叠容器（Evidence / More）
- 调整 tab 归属（AI 独立 tab）
- 调整现有组件的**只读输入**（为展示既有决策结果增加最小只读 prop）
- **传递已经存在的决策结果**（nextStepActions / entityStarters 只读透传）
- 删除组件内部已有的重复推荐逻辑（eg 的 nextNode 自算）
- 样式和文案调整

### 不可以
- 新增推荐算法 / 排序算法
- 修改 Phase B relation engine（continuityEngine / continuityExplanation / transition.ts 一律不碰）
- 修改 Phase C next-step decision（next/exploration/*）
- 修改 `nextStepActions` 计算
- 修改 `journeyReasons` 产生逻辑
- 修改探索包数据结构（explorationPackages / explorationStarters）
- 修改 JourneyTrail 数据模型 / 数据来源 / 语义 / 挂载位置（未经 PO 批准）
- 新增 API / 新增依赖
- 把现有 UI 重构成新的状态管理体系
- 复活遗留逻辑（describeTransition 不混用）

---

## 允许修改 vs 禁改文件清单（最终版）

**允许修改（呈现层，上限即此）：**
- `frontend/src/components/EntityPage.tsx`
- `frontend/src/components/EntityPageShell.tsx`
- `frontend/src/components/package/ConnectionCard.tsx`
- `frontend/src/components/EntityExplorationGuide.tsx`
- `frontend/src/components/entity/ExplorationGuide.tsx`（仅删 nextNode 自算 + 推荐卡，保留统计入口）
- `frontend/src/components/ProvenancePanel.tsx`（折叠包装 + 状态显隐）
- `frontend/src/components/ContinueExploringPanel.tsx`（收"更多"）
- `frontend/src/components/NextStepPanel.tsx`（仅视觉，如需要；渲染位置由 App/EntityPage 编排）
- `frontend/src/App.tsx`（仅 footer 编排 + 只读 props 透传；nextStepActions/journeyReasons 计算与回调原样）
- 样式（EntityPage / eps / connection-card / origin-bridge / he-guide / eg / narrative / provenance 相关 css）
- 文案词典（`entity.*` / `discover.*`）
- 相关组件测试断言（仅随行为变更更新）

**禁改（P5 / 红线 / PO 明确）：**
- `backend/**`
- `data/continuityEngine*` / `data/continuityExplanation*` / `data/transition.ts`
- `next/exploration/*`（Phase C 决策）
- `ai/JourneyTrail.tsx`（本轮不得修改，含挂载位置）
- 探索包数据结构（explorationPackages / explorationStarters）
- 任何组件的状态模型 / 数据流 / 组件职责重构
- 不引新依赖；无新 API

---

## 风险登记（v2 更新）

| 风险 | 等级 | 缓解 |
|---|---|---|
| A4 删 eg"推荐探索"破坏现有测试 | 中 | 同步更新测试断言（断言方向："组件不产生推荐、只展示传入结果"） |
| A5 触碰 App.tsx 编排（只读 plumbing） | 中 | NextStepPanel 渲染整体搬迁 + props 原样透传，diff 可读；journeyReasons 回调不换 |
| A5 只读 prop 是否算"数据流改动"边界模糊 | 中 | 以本清单"可以/不可以"为准：**搬运结果可，改变结果不可**；每步 commit 可回滚 |
| A2 tab 改名与运营配置 `entity_tabs.nav_labels` 冲突 | 中 | 施工时同步检查/更新运营 slot |
| A3 error 状态误被"折叠隐藏" | 低 | 状态规则表写死：error 必须可见可重试 |
| 施工越界（顺手重构 EntityPage） | 高 | 本清单 §P5 即闸门；每 Phase 独立 commit 便于回滚 |
