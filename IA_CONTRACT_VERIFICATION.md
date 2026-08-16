# 契约可支撑性验证报告（G0-1 ~ G0-6）

> 日期：2026-08-15 ｜ 基于 commit `8197632` 的 IA 施工契约 v2 + 当前代码事实
> 目的：证明「我理解了契约」且「代码事实确实支持契约」（PO 硬性要求，开工前闸门）

## 总体结论

6 项检查全部「代码事实支持契约」或「可行且有明确施工条件」。契约 v2 对自身与代码的偏差是**诚实、自知的**——三处 P4/A3 违规已在 Implementation Map 逐条标注「当前违规 + v2 修复动作」，不是空中楼阁。开工前无需改契约，但有 2 点需 PO 拍板/知悉（见末尾）。

---

## G0-1 ｜ A1 两种来源能否同时被准确获得 ✅ PASS

**代码事实：**
- **包来源** `packageOrigin.ts`：模块单例 `originByEntity:Map<gid,slug>`；生产者 `setPackageOrigin`（openEntity 在 `closePackage()` 前调用，explorationNavigation.ts:91/102）；消费者 `takePackageOrigin`（ConnectionCard.tsx:47，只读不删）。
- **实体来源** `runtime/originEntity.ts`：模块单例 `originByEntity:Map<targetGid,fromGid>`（同名但**不同模块、互不干扰**）；生产者 `setOriginEntity`（explorationNavigation.ts:100）；消费者 `takeOriginEntity`（EntityPage.tsx:170 内联 originBridge，只读不删）。
- **唯一握手点** `openEntity`（explorationNavigation.ts:80-124）：L100 写实体来源 → L101 `closePackage()`（红线照常）→ L102 写包来源（用 L91 捕获的局部 `originSlug`，故 closePackage 后仍有效）。
- **三跳 包A→X→Y 全链路验证**：
  - 进包 A 点 X → `openEntity(X)`：originSlug=A、originGid=null（包页 nav.current 非实体）→ `setPackageOrigin(A,X)`；X 页持 pkg=A、无实体来源。
  - X 页点 Y（ConnectionCard.jump）→ `jump(Y)` 先 `setPackageOrigin(A,Y)` 再 `openEntity(Y)` 写 `setOriginEntity(X,Y)` → **Y 页同时持有 pkg=A 与 originEntity=X 两套来源**，互不冲突。

**契约对应：** Implementation Map A1 段（L67-76）已写死优先级 `Package → Direct → None`，并明确「包A→X→Y 两来源并存时，package 承接为主、实体来源为站间解释，不是两张卡、不是三行叙述」(L76)；`防第三套 transition`(L78-83) 与代码一致（ConnectionCard+originBridge 已共用 continuityEngine）。

→ **结论：** A1 最大真实风险（两套来源能否共存）已被代码 + 契约双重证实可解。施工注意：实体来源"从 X 来"须作为 ConnectionCard 内**子叙述**实现（非独立卡），且复用 `collectRelationEvidence`（已共享）。

---

## G0-2 ｜ entityStarters 只读搬运 ✅ PASS

**代码事实：**
- **生产者**：`resolveEntityStarters(globalId)`（explorationStarters.ts:480）→ `ENTITY_STARTERS[globalId] ?? DEFAULT_ENTITY_STARTERS`（空数组兜底）。
- **类型**：`StarterItem[] = { id, label, description?, reason?, target: NavNode }`（L16-24）。
- **在哪产生**：App.tsx:1035 计算 `resolveEntityStarters(current.id)` 后作为 prop 传入。
- **如何传到 EntityPage**：prop `entityStarters`（EntityPage.tsx:87/117）→ 仅转发给 `<EntityExplorationGuide starters={entityStarters}/>`（L258-264），且以 `onStarterClick && entityStarters` 守卫。
- **当前消费者**：仅 `EntityExplorationGuide`（he-guide）。该组件**无 fetch / 无 localStorage / 无自算**（EntityExplorationGuide.tsx:11-14 注释明示），纯展示。

→ **结论：** App→EntityPage→EntityExplorationGuide 确为只读搬运，符合 A4。A4 目标（压成一行轻提示、无 starters 整卡不渲染）是施工动作，不影响「只读」判定。

---

## G0-3 ｜ NextStep props 最小集合 ✅ PASS

**代码事实：**
- `NextStepPanelProps = { actions: ExplorationAction[]; seenGlobalIds?: Set<string>; onNodeClick?: (globalId, context?) => void }`（NextStepPanel.tsx:125-129）。
- **挂载位置**：App.tsx:1037-1040 footer，**在 EntityPage 之外**；仅收 `{ actions: nextStepActions, seenGlobalIds, onNodeClick }`，onNodeClick 是包裹 `openNode`+journey 理由捕获的回调，**不接收任何 App 状态**。
- A5（NextStep 归 L2）若将其移入实体页，EntityPage 只需新增 `nextStepActions`/`seenGlobalIds`/`onNodeClick` 三个只读 prop（即 NextStepPanelProps 形状），**不得**在 EntityPage 内重算 `nextStepActions`。

→ **结论：** props 已最小；「别把 App state 灌进 EntityPage」由结构天然满足。A5 的 read-only 管道与 G0-3 一致。

---

## G0-4 ｜ Research tab 的 AI 能力边界 ✅ PASS（当前为 A2 前基线，契约已诚实标注）

**代码事实（当前）：**
- `HistorianChat`（对话式 AI）→ 现位于 **info tab**（EntityPage.tsx:369-381）。
- `AIExplanationPanel`（AI 辅助解释）→ 位于 **research tab**（EntityPage.tsx:476，section「解读与 AI」）。
- `RelationshipInsight`（证据型 AI，非对话）→ info tab（L353，flag 门控）。
- `InterpretationPanel` → info tab（L338，注释明示「纯图/关系驱动、无 AI」）。`ProvenancePanel` → info tab（L388，非 AI）。
- 当前 TABS = info / research / extensions（EntityPageShell.tsx:19-23），**尚无独立 AI tab**。

**契约对应（A2+D7，L151-170）：** 目标三 tab「概览/研究/AI」；Research = AI 辅助研究与解释（AIExplanationPanel 留 research）；AI = 对话式历史学家（HistorianChat 移入）；**AI tab 仅收对话式能力，非对话式 AI 不误迁**。Implementation Map L39 已标注 HistorianChat「A2 移入 AI tab」。

→ **结论：** 无隐性 AI 误迁。InterpretationPanel 被正确识别为非 AI（不进 AI tab）；RelationshipInsight 为非对话式 AI，按「AI tab 仅对话式」规则正确留在 info。HistorianChat 当前在 info 属 A2 前基线，契约已诚实标注为待施工（Phase 6）。

---

## G0-5 ｜ P4 真实覆盖（四组件空/加载/错误分支）✅ 契约自查一致（代码中 P4 尚未达标，属施工范围）

| 组件 | 当前行为 | 符合 P4？ | 契约记录（Implementation Map） |
|---|---|---|---|
| StorySection / WhyImportantPanel | 组件内 `if(!block) return null`（P4 干净）；但父层 EntityPage.tsx:323-332 在 `!hasNarrative` 时渲染 `<EmptyState>` | ❌（父层占位） | L208/221：按 P4 不渲染空态（D8） |
| ProvenancePanel | 5 态（loading/success/empty/error/disabled）；标题+副标题**无条件渲染**（L110-111）；empty/disabled 显示 EmptyState | ❌（A3 要求 empty/disabled 不显示） | L51/142-143/222：A3 状态规则 |
| EntityExplorationGuide | starters 空时仅 null 列表，**大卡标题+intro 仍渲染** | ❌ | L52/127/217：A4 无 starters 整卡不渲染 |

→ **结论：** 契约 v2 **已逐条收录**这三处 P4/A3 违规并写死 v2 修复动作。代码事实与契约「现状」描述一致。P4 当前在 3 处未达标——这正是施工要做的，与「暂缓开工」状态一致。

> ⚠ **需 PO 知悉 ①**：EntityPage.tsx:206 注释「M35 板块始终可见（PO 判定），无叙事渲染空态占位」与 P4 / 契约 map L208「按 P4 执行（无叙事不渲染空态）」**直接冲突**。map 已裁定按 P4，等于推翻该旧 PO 注释。请 PO 确认「始终可见」正式退役。

---

## G0-6 ｜ 第一屏 ≤3 视觉焦点 可行性 ✅ 可行（含施工条件）

**人工定义三焦点**（基于 info tab 首屏渲染顺序 EntityPage.tsx:219-389）：
- **Focus1 = Context（我在哪/为何而来）**：originBridge(L225) + ConnectionCard(L247) + JourneyTrail(L270)。**条件渲染**——直达（无包/实体来源）时此焦点整体缺席。
- **Focus2 = Entity（这是谁）**：EntityHeader(L221) + SummaryPanel(L254) + EntityExperienceHeader/Hero（info tab 内）。
- **Focus3 = Meaning（这意味着什么）**：EntityExplorationGuide(L258) + InterpretationPanel(L338) + StorySection/WhyImportantPanel(L326)。

**为何 ≤3 可实现：**
1. Context 焦点**条件存在**——多数直达场景只有 Entity+Meaning 两个焦点。
2. 三焦点 = 三种**认知功能**，非三张卡。每焦点可含若干子组件，但视觉上应读作**一个区域**（清晰分区/留白/底色区分）。
3. **Surface ≠ Card**：验收以「眼睛是否看到 3 个区域」为准，而非 DOM/卡片计数。

> ⚠ **需 PO 知悉 ②（施工条件）**：当前组件**平铺、缺少显式区域分组**，可能读作多个焦点。施工须补「三区域视觉分组」（属 P5 呈现范畴）。
> ⚠ **需 PO 知悉 ③**：浏览器实测是**施工完成后的验收闸门**（非现在做），因 ≤3 焦点是目标态、当前尚未存在；测当前预施工 UI 无意义。解封后我用 agent-browser 实测并交付截图。

---

## 总体判定

契约 v2 **由代码事实支撑，可开工**。6 项中 5 项 PASS、1 项（G0-6）FEASIBLE-带施工条件。需在开工前/开工时由 PO 拍板 2 点：
1. **「板块始终可见」正式退役**（让位 P4）——EntityPage.tsx:206 旧注释 vs map L208。
2. **G0-6 浏览器实测作为合入闸门**——解封后执行。

其余均为已封死的施工动作，无需再议。
