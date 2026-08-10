# 产品概念术语表（Glossary）

> 用途：全团队（PO / 设计 / 前端 / 后端 / 测试 / 运维）沟通的统一词汇表。
> 本文档是**权威定义**——讨论界面、功能、数据时，以本文档概念为准。
> 创建：2026-08-09（PO 翔哥要求，解决"点进去是什么界面"沟通歧义）

---

## 一、内容对象（用户直接点击的"东西"）—— 4 种

| 概念 | 英文 | 白话定义 | 点进去的界面 |
|------|------|----------|---------------|
| **主题** | Topic | 一个文明的"展馆"，如"古代文明""罗马帝国"。后端 `/topics` 返回，是浏览主题库的最小单元。 | 主题探索页（5 tab：概览/关系/时间线/对比/更多探索） |
| **实体** | Entity | 知识图谱里的一个"点"，如奥古斯都、造纸术、罗马文明。是图谱的节点，带类型。 | 实体详情页（3 tab：事实/研究/扩展） |
| **探索包** | Exploration Package | 一条"导游路线"，围绕一个主题打造的引导式体验，把叙事/关系/证据串成可走的路。 | 探索包页（导游式：目标/导览/路径） |
| **因果对象** | Causal Object | 一个"为什么"的论证，如"如何治理千万人"。由机制→结果→证据构成。 | 因果对象页（三幕剧：理解/连接/探索） |

### 同一对象的三化身（易混点）

同一个历史对象（如"罗马"）有**三个化身**，入口不同、界面不同：

| 化身 | 数据源 | 入口 | 界面 |
|------|--------|------|------|
| 主题罗马（roman_empire） | backend `/topics` | 主题卡片墙/跨主题关联 | 主题探索页 |
| 实体罗马（roman_empire:civ-roman） | 知识图谱节点 | 关系图/实体卡/时间线节点 | 实体详情页 |
| 探索包罗马（roman-empire-exploration） | exploration_packages.json | 官方探索包卡片 | 探索包页 |

> 设计注意：三化身在 UI 上长得都像卡片，用户易混淆。后续设计需明确区分或收敛入口。

---

## 二、实体类型（实体内部细分）—— 8 种

定义于 `frontend/src/data/entity/entityTypes.ts`（ENTITY_TYPES，冻结基线不可改）。

```
Civilization（文明）· Event（事件）· Person（人物）· Religion（宗教）
Technology（技术）· Location（地点）· Idea（思想）· Time Period（时期）
```

---

## 三、关系类型（实体之间的连线）—— 20 种

定义于 `backend/app/validation.py`（RELATIONSHIP_TYPES，Schema Freeze 20 种，冻结不可改）。

```
caused（导致）· influenced（影响）· participated_in（参与）· located_at（位于）
related_to（相关）· before（先于）· after（后于）· contemporary_with（同时代）
part_of（属于）· ruled（统治）· traded_with（贸易）· invented（发明）
discovered（发现）· practiced（践行）· spoke（使用语言）· inherited（继承）
conquered（征服）· spread（传播）· disputes（争议）· reinterprets（重新解释）
```

> 其中 `disputes` / `reinterprets` 是 ADR-0019 为真值层（P09 异议导航）新增。

---

## 四、真值层概念（护城河核心）—— 3 种

| 概念 | 英文 | 白话定义 | 数据文件 |
|------|------|----------|----------|
| **证据** | Evidence Claim | 一条"说法"，带可信度（confidence: high/low）与学界共识（scholar_consensus）。220 条证据、120 条带解释说明。 | data/evidence_claims.json |
| **来源** | Source | 证据引用的出处，分级（tier：一手史料/二手研究…）。 | data/sources.json |
| **因果陈述** | Causal Statement | 机制→结果的论证链，支撑因果对象页的三幕剧。 | data/causal_statements.json |

> 真值层 = 平台与"查询类产品（百度百科）"的分水岭：百科给结论，我们给"结论的底气"（多可信、谁争议、为什么）。

---

## 五、体验模式（认知层）—— 4 种

定义于 `frontend/src/routing/routeSchema.ts`（ExperienceMode）。

| 模式 | 映射认知层 | 用户心智 |
|------|-----------|----------|
| exploration | Fact Layer | "这是什么" |
| explanation | Explanation Layer | "为什么发生" |
| relationship | Understanding Layer | "为什么值得一起理解" |
| understanding | Experience Runtime | "我形成了什么理解" |

---

## 六、界面类型速查（点进去是什么）

| 界面 | 英文组件 | 承载内容 | 对应内容对象 |
|------|----------|----------|--------------|
| 首页三 tab | LandingTabs | 我的 / 了解 / 研究 | 最外层入口 |
| 主题探索页 | UnderstandingCanvas | 概览/关系/时间线/对比/更多探索（5 tab） | 主题 |
| 实体详情页 | EntityPage | 事实/研究/扩展（3 tab） | 实体 |
| 探索包页 | ExplorationPackagePage | 目标/导览/路径 | 探索包 |
| 因果对象页 | CausalObjectDetailPage | 三幕剧（理解/连接/探索） | 因果对象 |
| 搜索下拉 | SearchResults | 分组结果（主题探索/具体对象） | 全对象 |

---

## 七、能力清单（护城河盘点）

| 能力 | 在哪能看到 |
|------|-----------|
| 关系图谱 | 主题探索页"关系"tab（列表/图谱切换） |
| 时间线（单线/多线对比） | 主题探索页"时间线"tab |
| 时间对比 | 主题探索页"时间线"tab（TemporalComparisonPanel） |
| 主题/实体对比 | 主题探索页"对比"tab |
| 争议展示 | 主题探索页"更多探索"（DisputesPanel） |
| 关系解释（每层附证据） | 主题探索页"关系"tab |
| 溯源（Provenance） | 实体详情页"事实"tab |
| 多维度研究（政治/军事/经济/文化） | 实体详情页"研究"tab |
| 因果论证（三幕剧） | 研究 tab 点"为什么"种子 → 因果对象页 |
| AI 历史学家对话 | 实体详情页"事实"tab |
| AI 解释 | 主题探索页"更多探索" + 实体页"研究"tab |
| 推荐探索 | "我的"tab + 主题页"更多探索" |

---

## 变更记录

| 日期 | 变更 | 原因 |
|------|------|------|
| 2026-08-09 | 创建 | PO 要求建立统一术语，消除"点进去是什么界面"沟通歧义 |
