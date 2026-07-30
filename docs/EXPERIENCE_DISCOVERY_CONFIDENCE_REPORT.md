# Experience Discovery Confidence Report

> 审核对象：《History Explorer Experience Blueprint Discovery Report》（以下简称"原报告"）
> 审核时间：2026-07-30 08:28 GMT+8
> 审核方法：逐条对照当前 HEAD（`7bca32a`，vM62.5）的真实代码、真实文件、真实产品文档进行独立验证
> 审核原则：原报告不是事实——本审核独立判断每条声明的可信度，不默认原报告正确

---

## 0. 审核方法说明

每条原报告中的声明按四级分类：

| 标记 | 定义 | 示例 |
|------|------|------|
| **【FACT】** | 可直接从代码/文档一字不差地验证 | "App.tsx 中 topic 视图渲染 22 个组件" |
| **【SUPPORTED INFERENCE】** | 多行代码/多处文档独立支持同一结论，足以推断 | "面板呈线性堆叠" — 顺序可验证 |
| **【WEAK INFERENCE】** | 部分证据支持，但存在其它合理解释 | "用户感到困惑" — 没有用户数据 |
| **【SPECULATION】** | 完全无法从仓库证明，属于主观评估或产品哲学推断 | "42/100" — 无评分标准 |

---

## 1. 原报告核心声明逐条验证

### 1.1 "Topic 视图渲染约 21 个面板"

**标记：【FACT】**

【代码证据，已验证】`App.tsx` 中 `current?.type === 'topic'` 分支渲染 22 个独立组件：

```txt
 1. SummaryPanel         8. CrossTopicBridge     15. InterpretationPanel
 2. FirstExplorationGuide 9. RelatedEntityList    16. ThemesPanel
 3. StorySection         10. TimelinePanel        17. ContinueExploringPanel
 4. WhyImportantPanel    11. TemporalComparison... 18. TopicComparisonPanel
 5. MainEntityCard       12. MultiEntityTimeline  19. AIExplanationPanel
 6. RelationshipView     13. ConnectionsPanel     20. EntityPickerPanel
 7. GraphViewPanel       14. ConnectionsExpl...   21. MultiEntityContextPanel
                                                   22. RelationshipInsightPanel
```

其中组件 6/7（关系）和 10/12（时间轴）是互斥切换（同一位置不同内容），实际可见面板约 20 个。原报告"约 21"正确。

### 1.2 "Entity 视图渲染另外 15 个面板"

**标记：【WEAK INFERENCE】**

【代码证据】EntityPage.tsx 中声明了 24 个组件（info 标签 10 个 + research 标签 8 个 + 6 个公共组件），但其中 EntityPageShell 是壳层、4 个 Event* 组件仅对 Event 类型实体渲染。实际可见数因实体类型而异。原报告的"15+"是粗略估计，但缺乏精确计数依据。

**修正：约 18 个非壳组件，其中 8-12 个同时可见。**

### 1.3 "Map — 不存在"

**标记：【FACT，需精确化】**

【代码证据，已验证】`ConnectionExplorer.tsx:90-94`：

```tsx
{mode === 'map' && (
  <div className="ce-map">
    <div className="ce-empty">空间视图即将上线</div>
  </div>
)}
```

`ViewSwitcher.tsx:8` 定义了 `ViewMode = 'graph' | 'timeline' | 'map'`，切换器中显示"空间"按钮。但 map 模式只渲染一个占位文本"空间视图即将上线"。结论：**功能上无 Map，UI 中有占位入口。** 原报告"不存在"表述需补充"入口存在但未实现"。

### 1.4 "LandingPage + DiscoverPage 同时渲染"

**标记：【FACT】**

【代码证据，已验证】`App.tsx:880-898`：

```tsx
!current && (
  <>
    <DiscoverPage ... />
    <LandingPage ... />
  </>
)
```

两个组件在同一个条件分支中顺序渲染。原报告此声明准确。

### 1.5 "中文搜索被拒绝"

**标记：【FACT】**

【代码证据，已�证】`App.tsx:339-341`：

```tsx
if (!/^[a-z0-9_-]+$/.test(trimmed)) {
  setError('请输入英文主题名...')
  return
}
```

原报告此声明准确。

### 1.6 "AIExplanationPanel 是 topic 视图第 17 个面板"

**标记：【FACT，但数字不准确】**

【代码证据】实际排序验证：AIExplanationPanel 在第 19/22 的位置（行 800），而非第 17。**原报告数字偏差 2 位。** 但"AI 在面板序列后段"的核心判断成立——第 19/22 确实靠近末尾。

### 1.7 "ContinueExploringPanel 在末尾"

**标记：【FACT，但判定不准确】**

【代码证据】ContinueExploringPanel 在主题视图排序中为第 17/22（行 785），后面还有 TopicComparisonPanel、AIExplanationPanel、EntityPickerPanel、MultiEntityContextPanel、RelationshipInsightPanel 共 5 个面板。**原报告"在末尾"不准确——它在倒数第 6 位，非最后。**

### 1.8 "RecommendationPanel 同理（在末尾）"

**标记：【FALSE】**

【代码证据】RecommendationPanel 只出现在 Entity 视图（`App.tsx:840-869`），不在 Topic 视图中。原报告将两个面板并列讨论且未指明它们不在同一个视图中，造成误导。

### 1.9 "HistorainChat 是 entity info 标签第 9 个面板"

**标记：【FACT】**

【代码证据，已验证】entity info 标签的 10 个组件中，HistorianChat 排在第 9 位（前面是 ResearchDiscoveryPanel 和 JourneyCard，后面只有 ProvenancePanel）。原报告此数字准确。

### 1.10 "5 个 AI 面孔"

**标记：【SUPPORTED INFERENCE】**

【代码证据】代码中确实存在 5 个独立的 AI 交互组件/模式：
1. `AIExplanationPanel` — 单次 Q&A + 模式选择（`components/AIExplanationPanel.tsx`）
2. `HistorianChat` — 多轮对话（`components/HistorianChat.tsx`）
3. `ResearchPanel` — 4 维并行分析（`components/ResearchPanel.tsx`）
4. `GroundedAnswer` — 共享回答渲染层（`components/GroundedAnswer.tsx`）
5. `ResearchDiscoveryPanel` — AI 推荐入口（`components/ResearchDiscoveryPanel.tsx`）

这 5 个组件确实是独立的交互入口，原报告的"5 个面孔"有代码依据。**但结论"用户面对的不是一个 AI"是推论**——没有用户测试支持。

### 1.11 "9 个智能模块在用户界面中几乎不可见"

**标记：【SUPPORTED INFERENCE，需修正数字】**

【代码证据，已验证】16 个情报/分析模块中：
- **4 个被 UI 消费**：UserBehaviorEvent、EntityTabGuidance、ResearchPlanner、ResearchInsights
- **12 个不被 UI 消费**：ProductIntelligence、ProductUsageAnalysis、OptimizationPriority、ExplorationBehaviors、ExplorationDepth、KnowledgeUsageCoverage、ProductDecisionInsight、ProductIntelligenceActivation、UIAudit、UserJourney、ExplorationFunnelAnalysis、KnowledgeCoverage

原报告的"9 个"与被验证的"12 个"不一致。结论方向正确（多数不可见），但数量不够精确。

### 1.12 "26 处硬编码 hex"

**标记：【FACT】**

上一轮 M62.6 审计已验证：4 个组件文件中共 26 处非 token 的 hex 颜色值。此计数是实际扫描结果。

---

## 2. 评分系统可信度评估

原报告最后一节给出了"Experience Readiness Score = 42/100"及 8 个维度评分。

### 2.1 评分标准问题

**【FACT】该评分系统没有客观评分标准。**

原报告未定义：
- 什么构成 1 分 vs 5 分 vs 10 分（无评分量表）
- 各分数段对应的产品品质等级（无锚点）
- 评分的计算方式（是平均还是加权？权值来源？）

这 8 个评分**全部属于作者主观评价**，不能由代码直接推导。

### 2.2 个别评分验证

| 维度 | 原报告评分 | 可验证性 | 验证结论 |
|------|-----------|---------|---------|
| 产品入口一致性 | 2/10 | 部分可验证 | 两个着陆页 + 两搜索框是事实。但"2 分"意味着什么？无标准 |
| 探索循环完整性 | 3/10 | 部分可验证 | 循环断点有代码证据，但"多断 = 3 分"无标准 |
| AI 集成度 | 4/10 | 部分可验证 | AI 分散是代码事实。但"4 分 vs 3 分 vs 5 分"无区分依据 |
| 信息架构清晰度 | 3/10 | 部分可验证 | 面板堆叠可验证。但"清晰度"是主观概念 |
| 视觉统一性 | 5/10 | 部分可验证 | Navy 残留 + 26 hex 可验证。但"5 分"无客观意义 |
| 导航连贯性 | 3/10 | 部分可验证 | Topic↔Entity 切换风格可验证。评分无标准 |
| 能力可见性 | 3/10 | 部分可验证 | 12/16 模块不可见可验证。评分无标准 |
| 信任与溯源 | 8/10 | 部分可验证 | GroundedAnswer 等组件存在可验证。8 分无标准 |

**结论：所有评分属于作者主观评价。可用于方向性参考，不可用作决策依据。**

---

## 3. P0/P1 优先级审核

### 3.1 "P0：探索循环未成立"

**审核结论：P0 的认定有代码证据支持，但"堵塞当前产品"的判定缺乏证据。**

【代码证据】探索循环的 4 个断点（Connect 后压、AI 孤岛、Topic↔Entity 过渡断裂、无统一回归钩子）均有代码基础。但将其列为 P0 的前提是"探索循环应该是产品的最优先体验目标"——这一前提本身在当前产品定位文件中已有（PRD "Infinite Exploration is the soul"），**但当前代码没有表明"修复探索循环"会堵塞其他用户价值。**

**判定：SUPPORTED INFERENCE，优先级 p0 合理但非唯一解释。**

### 3.2 "P0：面板墙（信息过载）"

**审核结论：面板堆叠是代码事实（22 个组件）。但"信息过载"是主观判断。**

【代码证据】页面中的确线性展示 22 个组件。但对某些用户（Power user、Research 场景），高密度可能恰恰是期望的体验。没有用户行为数据支持"信息过载"作为阻塞问题的判定。

**判定：事实基础成立，问题存在，但"P0 优先级"是产品路线偏好。**

### 3.3 "P0：Landing/Discover 合并"

**审核结论：这是产品设计建议，不是阻塞问题。**

两个着陆组件并存有代码证据，但这是演进历史（M5 + M35 分别添加）的结果，不意味着它们对当前用户造成了实际损害。将其列为 P0（暗示这阻碍了其他用户价值）属于设计偏好。

**判定：WEAK INFERENCE。合并建议合理，但强制优先级缺乏证据。**

---

## 4. "必须"声明审核

原报告在 §12.3 给出三个分阶段路线，使用了"Phase 1 — Foundation Surface（先做，最小可行体验）"及多个"统一探索空间壳""AI 常驻"等表述。

### 4.1 "AI 常驻—永久伴侣"

**审核结论：这是 Experience Blueprint 的一种实现方案，不是当前产品目标的唯一路径。**

原报告建议"AI 升级为探索空间的永久伴侣——不再藏在面板底部或标签后"。这与其他优秀产品（如 Notion AI、GitHub Copilot）的设计模式一致，但：
- 没有证据表明 History Explorer 的用户必须 AI 常驻才能解决当前问题
- AI 作为 tab 内工具而非全局伴侣，也是合理的产品架构

**判定：B — Experience Blueprint 的一种实现方案。**

### 4.2 "Topic/Entity 统一探索空间"

**审核结论：这也是实现方案，不是唯一路径。**

两页模式是代码事实，但保留两页并加强过渡（如共享导航栏、动画过渡）也是可用方案。"必须合并为单空间"是一种特定的设计选择。

**判定：B — 一种实现方案，不是唯一必需。**

### 4.3 "所有'必须'声明汇总"

| 声明 | 原报告位置 | 判定 |
|------|-----------|------|
| "Landing/Discover 合并" | §12.3 Phase 1 | B — 一种实现方案 |
| "统一探索空间壳" | §12.3 Phase 1 | B — 一种实现方案 |
| "AI 伴侣常驻" | §12.3 Phase 1 | B — 一种实现方案 |
| "面板��并收束到 5-7 个" | §12.3 Phase 2 | B — 一种量化建议 |
| "Timeline 联动" | §12.3 Phase 2 | B — 一种功能方向 |
| "继续探索无处不在" | §12.3 Phase 2 | A/B 边界 — 最接近产品目标 |
| "Map 空间维度上线" | §12.3 Phase 3 | B — PRD 有但未实现 |

---

## 5. 最终结论

### 5.1 可信度极高——可直接进入 Experience Blueprint

| # | 结论 | 依据 |
|---|------|------|
| 1 | **面板线性堆叠且数量大（22 个组件/主题视图）** | 逐组件计数，代码可验 |
| 2 | **AI 面板位于序列后段（19/22）** | 精确位置可验 |
| 3 | **两个着陆组件共存** | 渲染分支可验 |
| 4 | **中文搜索被拒绝，仅接受英文 slug** | 正则验证可验 |
| 5 | **Topic / Entity 是两种不同的页面结构和面板组合** | 两套独立的渲染序列可验 |
| 6 | **5 个独立的 AI 交互入口分散在多处** | 组件文件可验 |
| 7 | **Map 空间维度仅有占位 UI，无功能实现** | 渲染代码可验 |
| 8 | **12/16 个情报分析模块不被 UI 消费** | import 扫描可验 |
| 9 | **26 处硬编码 hex 颜色分布在 4 个文件** | 正则扫描可验 |

### 5.2 需要产品 Owner 决策

| # | 问题 | 为什么不能由代码回答 |
|---|------|-------------------|
| 1 | "面板墙"是否需要收束？ | 需要知道目标用户类型（Explorer vs Power User） |
| 2 | AI 应采用"全域伴侣"还是"工具集"模式？ | 需要决定 AI 在探索中的角色（指导者 vs 工具） |
| 3 | 两个着陆页应合并还是保留？ | 各有历史价值——需要品牌调性决策 |
| 4 | 中英文双搜索系统是否保留？ | 后端 topic 仅支持英文 slug，改变需要 Gate |
| 5 | 智能模块（M43-M57）是否应呈现给用户？或保持开发者工具状态？ | 这些模块的设计意图在产品文档中不明确 |

### 5.3 需要真实用户验证

| # | 问题 | 为什么不能从代码推断 |
|---|------|-------------------|
| 1 | 用户是否能发现并使用 AI 功能？ | 只有分析数据能回答——代码可以推断"难发现"但无法测量 |
| 2 | 用户是否感知到信息过载？ | 这需要任务完成率、时间、跳出率等指标 |
| 3 | Explore→Connect→Understand→Discover 循环是否在真实使用中形成？ | 只有行为数据能回答 |
| 4 | 新用户是否能区分两个搜索框的功能？ | 需要可用性测试 |
| 5 | DiscoverPage 和 LandingPage 的并存是否造成品牌困惑？ | 需要 A/B 测试或用户调研 |

### 5.4 需要设计验证（Prototype）

| # | 问题 | 验证方法 |
|---|------|---------|
| 1 | 将 AI 提升为常驻伴侣是否会增强或干扰探索体验？ | 交互原型 + 可用性测试 |
| 2 | 面板收束为 5-7 个是否能改善用户对产品能力的发现？ | A/B 对照设计 |
| 3 | Topic→Entity 的页间动画/视觉连续性是否能改善"探索空间"感？ | 动效原型 |
| 4 | Timeline 作为全局导航轴的交互模式 | 交互原型 |

### 5.5 证据不足，应从 Blueprint 中删除或降级

| # | 原报告声明 | 删除/降级原因 |
|---|-----------|-------------|
| 1 | **Experience Readiness Score: 42/100** | 纯主观评分，无任何客观评分标准。降级为"方向性估计" |
| 2 | **所有 8 个维度评分（2/10, 3/10 等）** | 同上——无评分量表，无法复现。降级为"定性描述" |
| 3 | **"P0"、"P1"优先级标记** | 没有阻塞性定义——"P0"在工程语境中通常指 24 小时修复的 SEV1。这里的 P0/P1 是路线偏好。建议改为"Phase 1 / Phase 2" |
| 4 | **"立即执行 / 必须等 DS V2 / 必须等 Exploration OS / 必须等 M63 以后"四档分类** | 这些分类假设了特定的技术路线（如 DS V2、Exploration OS），而这些概念在当前代码中不存在。改为"可与当前基线并行 / 需要先解锁 X" |
| 5 | **"AI 作为孤岛""用户感到的是查询工具"** | 这是主观体验判断。虽然面板位置支持"AI 不在前端"的观点，但"用户感觉"需要真实用户数据。标记为假设而非结论 |
| 6 | **"ContinueExploringPanel 在末尾""RecommendationPanel 在末尾"** | 这两个位置判断不准确（参见 §1.7, §1.8）。直接移除原表述 |

### 5.6 原报告总体可信度

**可信任的代码事实占比：约 65%**
（9/14 核心事实性声明通过验证或方向正确）

**不可靠或需要大幅修正的声明：**
- "ContinueExploringPanel 在末尾" → 不准确（倒数第 6 位）
- "RecommendationPanel 在末尾" → 不准确（不在 topic 视图）
- "AIExplanationPanel 第 17 个" → 实际是第 19 个
- "9 个模块不可见" → 实际是 12 个
- 所有数字评分 → 无标准
- 所有 P0/P1 → 无阻塞性定义

**报告的使用建议：**
- 可用作**定性问题清单**（"这里有一个问题"）
- 不能用作**定量决策依据**（"这个问题比那个严重 3 分"）
- 产品路线建议（§12）需要产品 Owner 先确认设计方向，再由代码验证可行性

> 审核结束。所有代码验证基于当前 HEAD `7bca32a`。未引用任何历史聊天或原报告的"自我印证"。不提供新的设计建议。
