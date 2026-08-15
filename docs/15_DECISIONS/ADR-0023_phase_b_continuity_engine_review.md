# ADR-0023 探索连续性引擎（Phase B）架构评审

> 状态：**Accepted（PO 二次修订 5 点 + 三次收紧 4 点后定稿；v3.1 已固化 §9 施工硬约束 C1–C6；B 施工待 P1 收口）**
> 范围：Phase B「探索连续性引擎」= 能力层，不是"补 26 段过渡文字"。
> 关联：`docs/product/TRANSITION_FUNCTION_SPEC.md`（过渡函数课题立项）、
>       `frontend/src/data/transition.ts`（`describeTransition`，现有种子）、
>       `frontend/src/next/exploration/ExplorationPolicy.ts`（`evaluateExploration`，C 的种子）、
>       `frontend/src/components/package/ConnectionCard.tsx`（B 的第一调用方）。
> 触发基线变更：是（新增/重定型 `ContinuityEngine` 模块，触及 CURRENT_ARCHITECTURE_BASELINE）。
> **修订记录**：v1 初稿 → v2 吸收 PO 二次修订 5 点 → v3 吸收 PO 三次收紧 4 点（Evidence 集合化 / JCS 降级 / HonestNone 去内部泄漏 / Evidence→B·C 中间层）→ v3.1 增补 §9 施工硬约束（PO 终审"三不三是的"，供 Phase B Implementation Audit 逐条核对）。

---

## 0. 为什么写这份评审（Context）

外部用户零提示盲测，独立写下"断裂感"——"卡片很多、相信有关系、但连不成一整篇故事"。
这与只读诊断逐字对应（NATURAL 28.2% / WEAK 48.2% / BROKEN 23.6%，100% 作者编排）。
Phase B 因此被定为当前最高优先级。

但 PO 在 2026-08-15 二次纠偏，明确**三点边界**，本评审必须锁死：

1. **B ≠ 补过渡文字。** B 的产物是一个**能力引擎**：关系判断（证据产出）+ 路径解释 + 无关系诚实表达 + 连续性特征。固定路线只是它的**第一个调用方**，先不动导航。
2. **B 与 C 不混同、不各造一套。** B 解决"A→B 是否成立、能否解释"；C 才解决"下一步去哪"（替代 `stations[idx+1]`，从候选里排序"最值得理解的那一个"）。两者**共用同一个底层引擎**，一次性建好复用。
3. **"为什么让用户在 A 去 B 本身可能不合理"归 C 层。** B 不处理导航合理性，那是 C 引入动态探索后才真正能管的。

**本评审的关键事实**：B 引擎**已经有一个可运行的种子**——`describeTransition()`。所以本评审不是"从零设计"，而是"把已有能力正式化为可复用引擎 + 补两块当前缺失的短板（连续性特征、无关系诚实表达面）+ 划清 B/C 复用边界"。

### PO 三次收紧（2026-08-15，4 点，已全部吸收进下文 v3）

1. **`RelationJudgment` → `RelationEvidence[]` 集合化**：引擎输出**所有检出的关系证据**（因果/时间/地理/弱桥可能并存），不预选"哪个更强"；最终由 B/C 决策层消费证据。
2. **`JourneyContinuityScore` 再降级**：Phase B 核心 = `ContinuityFeatures`；JCS 仅作**可选派生诊断值**，**非引擎核心、且禁止被 C 消费作"去哪"的决策信号**。
3. **Honest None 不暴露内部编排实现**：诚实陈述给"知识事实"（"当前知识中没找到足够可靠的直接联系"），不给"因为作者/探索包把它们放一起"。
4. **补 Evidence → B/C 中间层铁律**：`ContinuityEngine` 不产生"下一步"，也不产生最终"解释选择"；它产出**可审计的 Continuity Evidence**，B 与 C 分别消费这些证据。

---

## 1. 现状实证（已读代码，非臆测）

| 能力 | 当前落在哪 | 状态 |
|------|-----------|------|
| 关系判准（有边/有 claim 吗） | `describeTransition` ① claim ② 关系短句 ③ 共同邻居桥 ④ null | ✅ 已具备，4 层优先级隐含 |
| 路径解释（人话叙述） | `describeTransition` 返回 `text`（claim/短句/桥模板） | ✅ 已具备，但仅单字符串、非结构化 |
| 证据分级（真值层） | `TransitionResult.confidence` = strong/moderate/weak | ✅ 已具备 |
| 无关系诚实 | `text: null` → `ConnectionCard` **静默不渲染**（留白） | ⚠️ 诚实但"沉默"，用户只看到断、看不到"为何断" |
| 连续性特征 | **无**。仅有一次性的离线诊断（28.2/48.2/23.6），无运行时/逐旅程特征 | ❌ 缺失 |
| 候选方向排序（C 所需） | `ExplorationPolicy.evaluateExploration`：基于预写 `ExplorationState` 的**规则选择器**，非实时 KG 候选生成 | 🟡 C 的种子，但尚不是"生成+排序候选" |
| B/C 引擎统一 | `describeTransition`（B 用）与 `evaluateExploration`（C 用）**两套独立模块** | ❌ 尚未统一，C 若直接做会造第二套 |

**结论**：B 的"关系判断 + 解释 + 分级"地基已存在；真正要建的是 **连续性特征（ContinuityFeatures）**、**无关系诚实表达面**、以及 **B/C 共用的引擎接口（以 Evidence 集合为输出单元）**。这正是 PO 要的"一次性建好复用"。

---

## 2. 五个核心问（每问给：现状 / 待决 / 推荐立场）

### Q1 关系证据模型（Relation Evidence Model）—— 集合化，非结论、非绝对等级

- **现状**：`describeTransition` 隐含优先级 = 中文 claim > 冻结 18 类关系边 > 共同邻居桥 > null。但只建模了"有无直接边 / 有无共同邻居"两档，未体现 PO 提出的完整关系类型集；且返回的是"已选定的一条解释"，不是"全部证据"。
- **待决**：关系类型如何建模？引擎是否替调用方预选"哪个关系更重要"？
- **推荐立场（吸收 PO 二次修订点 3 + 三次收紧点 1）**：正式化为
  `collectRelationEvidence(from, to, context) → RelationEvidence[]`，其中每一项：
  `RelationEvidence { kind, strength, provenance, source }`
  - `kind` ∈ {DIRECT_HISTORICAL, CAUSAL, TEMPORAL_INHERIT, GEOGRAPHIC, SHARED_ENTITY, THEMATIC, WEAK_BRIDGE, NONE}
  - `strength` 由**图/声明数据本身**计算（如关系边的权重、时间跨度、共现强度），是**对单条证据的描述性度量**，不是跨证据的最终裁决。
  - `provenance` = 来自哪个数据源证明的（relationship_paths / entity relationships / 共同邻居缓存），`source` = 具体实体/声明 id，保证**可审计、可复用于 C**。
  - **关键修正（三次收紧点 1）**：引擎输出的是**证据集合**，不是"已下结论的 Judgment"。一跳里可能**同时检出** causal + temporal + geographic + weak_bridge——它们并列存在，引擎**不预选"哪个更值得解释"**。最终"选哪条证据做解释"由 **B 的解释选择层**决定；"哪条证据利于候选排序"由 **C** 决定。这样引擎彻底不碰决策，与 D7/D10 一致。
  - 这 7+1 类是**结构化的关系特征（枚举集合）**，用于数据建模与审计；**它们不是绝对固定的优先级阶梯**（吸收 PO 二次修订点 3）。某一跳里"因果"是否比"时间继承"更有连续性，取决于上下文——比如"真实因果但跨 500 年"与"相邻年份仅时间继承"，对"连续探索"的重要性需按上下文判断，不能写死 `CAUSAL > TEMPORAL`。引擎只输出特征向量，**最终权重由一条按上下文计算的规则**决定，规则在 B/C 各自的调用方，**不进引擎**。
  - 保留一个**默认次序仅作展示/兜底 tie-breaker**（当上下文规则无法区分时给 UI 一个稳定排序），**不进入评分权重**——避免重新把固定等级塞回引擎。
  - 不引入新依赖、不引入 AI 判关系（守红线：关系判准是规则/图数据驱动，非 LLM）。

### Q2 路径解释生成（Path Explanation Generation）

- **现状**：`describeTransition` 返回单字符串 `text`，视图层直接渲染。多条 claim 时取第一条，无质量排序。
- **待决**：解释如何排序质量？是否允许 LLM 生成叙述？
- **推荐立场**：解释**结构化、非自由生成**。`explain(evidence) → TransitionExplanation { kind, fact, confidence, provenance }`，由视图层渲染成文字。**注意：引擎只产出解释素材，不替 B 做"最终解释选择"——选哪条证据讲、怎么组织，是 B 解释选择层的事（见 D10）。**
  - 多条 claim：B 的解释选择层按 `confidence`（学术共识分级）排序取最高，不靠 AI 编。
  - 守红线：解释永远**图 grounded**，绝不 LLM 自由生成（呼应 Article 0 真相层）。

### Q3 无关系诚实表达（Honest "No-Relation" Expression）—— PO 重点

- **现状**：`text: null` → `ConnectionCard` **静默留白**。不编造（诚实），但用户看到的是"断"而无任何说明。这恰恰是外部"断裂感" 23.6% BROKEN 段的体验来源。
- **待决**：无可靠关系时，是保持沉默留白，还是**明确告诉用户真相**？且——告知的内容应是知识事实还是内部实现？
- **推荐立场（强烈建议，直击断裂感根因；吸收三次收紧点 3）**：**显式诚实表达，不沉默；且只给知识事实，不暴露内部编排。**
  - 推荐形态（的知识事实版）：在留白处渲染一句轻量诚实陈述——
    > "当前知识中，没有找到 A 与 B 之间足够可靠的直接联系。"
    可据上下文补一句方向说明（仍是知识/探索语义，非实现）：
    > "这是一次探索方向的切换。"
  - **禁止**把内部实现泄漏给用户，例如"我们是按探索包顺序带你看的""它们同属一个探索包"——这些是 author ordering / package 内部结构，对用户是噪声，且弱化"知识探索"的产品语义。诚实表达应落到**知识事实层**。
  - 这把 BROKEN 段从"用户觉得坏了"变成"用户理解为什么这样"，正是 Article 0「真值层」的产品化。
- **重要边界（吸收 PO 二次修订点 4）**：**"无可靠关系"是合法状态，不是 Bug。** 真实历史探索中本就可能出现"这里没有可靠关系"。它对应一次诚实表达，**不应被当作要消灭的指标**。真正要追求的是：BROKEN 段**不再静默、不欺骗用户**——而不是 `BROKEN = 0`。若把 `BROKEN = 0` 当硬 KPI，引擎会被迫"强行寻找关系"来凑数，恰恰违背 Article 0 真相原则。（详见 §3 M2 与 §6 D9。）

### Q4 连续性特征（Continuity Features）—— 核心能力；JCS 仅可选派生诊断

- **现状**：**完全缺失**。只有一次性离线诊断，无运行时特征、无逐旅程连贯度。
- **待决**：如何定义"连续"并量化？度量结果给谁用？JCS 与 Features 谁是核心？
- **推荐立场（吸收 PO 二次修订点 2 + 5 + 三次收紧点 2）**：
  - **核心输出 = `ContinuityFeatures`（特征向量，不是决策分数）**，由引擎的 `composeFeatures(evidence)` 产出：
    - **RelationshipStrength（关系强度）**：这一跳是否有被证明的关系、强度如何（来自各 `RelationEvidence.strength` + `provenance`）。
    - **ExplanationQuality（解释质量）**：是否有可理解的人话解释（来自 `explain` 的质量；或无关系时来自 `expressHonestNone` 的诚实陈述质量）。
    - **TemporalContinuity（时间连续性）**：时间上是否连贯（跨度是否可接受）。
    - **SpatialContinuity（空间连续性）**：空间/数据集上是否连贯。
    - **ContextRelevance（上下文相关度）**：与"用户当前理解 / 探索缺口"的相关度。
      - ⚠️ **Phase B 阶段此维退化**：固定路线尚无用户理解上下文，ContextRelevance 拿不到真实输入，作为**保留维**由 Phase C 填充。B 阶段的度量只使用 RS + EQ + TC + SC 四维也足以暴露"静默 BROKEN"与"关系弱但硬编"。**不要让 B 假装能算"用户相关度"——它此刻没有这个数据。**
  - **`JourneyContinuityScore` 的定位（三次收紧点 2）**：
    - 它**不是引擎核心能力**，是 `ContinuityFeatures` 之上的**可选派生诊断值**。
    - 第一版定位为**工程/诊断指标**，用途是：① **回归检测**——某次改动是否破坏连贯度；② **路线变体比较**——同一内容不同编排的连贯度差异；③ **暴露静默 BROKEN 段**——定位哪些跳既无关系又无诚实表达。
    - **硬约束（D8 + D10）**：JCS **不被 C 消费作"去哪"的决策信号**。绝不能出现"这个节点 JCS 高，所以推荐它"——那会偷偷把"连续性"变成导航决策器，重蹈 v1 越界覆辙。
    - 它与"自然感"的相关性**尚未被验证**（见 §3 M3/M4 降级为探索性相关，非确定性 KPI）。"自然感"还受信息密度、视觉结构、站点重要性、下一站价值、用户兴趣、内容质量、阅读节奏等多因素影响，JCS 仅是其中一维。
  - **关键区分（PO 二次修订点 2 核心）**："存在关系" ≠ "用户理解为什么从 A 到 B"。一个跳可以有 strong relation（A related_to B，weak bridge），但用户仍可能觉得"为什么突然看这个"。因此若归一化为一个 JCS，必须由上述多维加权，**且 ExplanationQuality 与 ContextRelevance 不能为 0 而只靠 RelationshipStrength 拉高分**——否则会得到一个好看的 0.82，用户却仍觉得乱。

### Q5 引擎接口与复用边界（Engine Interface & Reuse Boundary）—— 防两套引擎、防越界、明确 Evidence 中间层

- **现状**：`describeTransition`（B 用）与 `evaluateExploration`（C 用）是**两套独立模块**。C 若现在直接做，几乎必然再造一套关系逻辑。
- **待决**：如何保证 B/C 共用同一引擎、零重复？引擎输出的单元是什么？谁做决策？
- **推荐立场**：抽出一个统一 `ContinuityEngine` 模块，接口如下：

  ```
  collectRelationEvidence(from, to, context) → RelationEvidence[]   // Q1 输出证据集合
  collectTemporalEvidence(from, to)          → TemporalEvidence    // Q4
  collectSpatialEvidence(from, to)           → SpatialEvidence     // Q4
  composeFeatures(evidence)                  → ContinuityFeatures  // Q4 核心输出（特征向量，非决策分数）
  explain(evidence)                          → TransitionExplanation // B 消费
  expressHonestNone(evidence)                → HonestStatement       // B 消费（NONE 时）
  ```

  - **B 调用方**（如 `ConnectionCard`）：`collectRelationEvidence` → B 自己的**解释选择层**挑证据 → `explain` / `expressHonestNone`，解释固定路线。
  - **C 调用方**（未来 Phase C 候选排序器）：**复用** `collectRelationEvidence` 给每个候选打分（候选与当前节点的关系强度 + 证据），并**复用** `ContinuityFeatures` 作为排序输入之一；但**候选生成、排序、最终 `ExplorationAction` 的决策逻辑在 C 内**，不在引擎内。C **不消费 JCS** 作决策。
  - **硬边界（吸收 PO 二次修订点 1 + 三次收紧点 4，列为红线 D7 + D10）**：
    **`ContinuityEngine` 不产生"下一步"，也不产生最终"解释选择"；它产出可审计的 Continuity Evidence，B 与 C 分别消费这些证据。**
    引擎只提供"判断依据"（关系证据 + 连续性特征）。谁决定"去哪"（C）、谁决定"固定路线里讲哪条证据"（B 解释选择层），都在引擎之外。
  - 边界红线：引擎**只读图数据/预写状态，不访问 LLM、不决定最终导航**；最终"去哪"由 C 的规则层定（守 ExplorationPolicy "禁止 AI 决定探索方向"约束）。

  **最终架构（定型）：**

  ```
                  Knowledge Graph / Claims
                           │
                           ▼
                  ┌─────────────────────┐
                  │   ContinuityEngine  │
                  │                     │
                  │  RelationEvidence[] │
                  │  TemporalEvidence   │
                  │  SpatialEvidence    │
                  │  Provenance         │
                  └─────────┬───────────┘
                            │  composeFeatures
                            ▼
                     ContinuityFeatures
                        ↙          ↘
                       B            C
              “为什么到这里”    “去哪更值得”
          (固定路线解释+诚实)  (候选生成/排序/决策)
            ↑ B 解释选择层       ↑ C 规则层
              （不进引擎）         （不进引擎，不消费 JCS）
  ```

---

## 3. 测量问（如何知道 B 做成了）

| 指标 | 定义 | 数据来源 | 目标 / 定位 |
|------|------|---------|------------|
| **M1 关系证据召回率** | 引擎检出的 `RelationEvidence[]` 覆盖真实关系中可证维度的比例（P-U18 已策展 110 段可作起点金标） | 离线比对 | ≥ 95%（证据全不全） |
| **M2 无关系诚实表达覆盖率** | "无可靠关系"的跳中，获得显式诚实陈述（非沉默留白、且为知识事实而非内部实现）的占比 | 运行时统计 | BROKEN 段 **100% 显式表达**——注意这是"诚实表达覆盖"，**不是消灭 BROKEN**。（见 D9） |
| **M3 连续性度量探索性相关** | `JourneyContinuityScore` 与外部"断裂感"信号的相关趋势 | 上线前后同用户复测 / A-B | **探索性相关分析**，现阶段**不作为确定性 KPI**；"自然感"受多因素（信息密度/视觉结构/站点重要性/下一站价值/用户兴趣/内容质量/阅读节奏）影响，JCS 仅一维 |
| **M4 解释可理解率** | 用户看到结构化解释后，能否答出"为什么 A→B" | 反馈信号（已埋点收集） | 显式上升（目标信号，但最终以用户主观"我懂为什么在这"为准） |
| **M5 单引擎复用率** | C 的关系逻辑调用共享 `collectRelationEvidence` 而非重写的比例 | 代码审查 | 100%（单一引擎，排序决策在 C） |
| **M6 引擎越界防护** | `ContinuityEngine` 是否含 `rankCandidates` / 候选排序 / 导航决策 / 最终解释选择 / 消费 JCS 作决策 | 代码审查 | **必须 = 0**（硬边界，见 D7、D10） |

---

## 4. 与 Phase C / D 的衔接（防漂移）

- **B 不动导航**：固定路线 `stations[idx±1]` 继续作为第一调用方，B 只负责"把每一跳讲清楚 + 输出连续性特征/证据"。
- **C 复用 B、但决策在 C**：C 的"生成并排序最值得理解的候选" = 复用 `collectRelationEvidence` 给候选打分 + 复用 `ContinuityFeatures` 作为排序输入之一 + **C 自身的相关度/缺口规则做最终排序与 `ExplorationAction` 决策**。**C 不消费 JCS 作"去哪"信号**（呼应 D8、D10）。C 不另造关系引擎，但排序与去哪的逻辑在 C 内。
- **D 认知闭环**：C 产出的 `ExplorationAction`（已有 `reason`/`narrativeHook`/`confidence` 结构）可直接消费 B 的 `explain` 结果，使"下一步为什么"也变成可解释、非随机漫游。
- **逐层演进顺序（PO 拍板）**：P1 工程健康 → Phase B 引擎 → Phase C 动态方向 → Phase D 认知闭环。**不平行、不跳层。**

---

## 5. 风险与代价（Consequences）

- **正面**：地基一次定准，B/C 不返工；"断裂感"变可观测指标；诚实表达直接消减用户"系统坏了"的误感；Evidence 集合化让 B/C 真正共用、零重复。
- **负面 / 代价**：
  - 需把 `describeTransition` 重构为 `ContinuityEngine`（接口重定型），`ConnectionCard` 调用点随之调整——属红线内（`frontend/src` 在 freeze 白名单）。
  - Q3 显式诚实表达会增加 UI 文案与少量样式（沿用现有 token，不破 P0）。
  - 连续性特征需一处运行时采集点（前端计算、可选上报），不引入新后端存储。
- **不触碰红线**：不引入 Neo4j/PG/ES/RAG/GIS/Flutter/登录/权限/新依赖；AI/LLM 仅限 `backend/app/ai_gateway/`（默认关）；Relationship Layer 仅可视化、不建边/推演/因果。

---

## 6. 待 PO 拍板的决策点（Decision Points）

| # | 决策 | 我的推荐 |
|---|------|---------|
| D1 | B 是否正式化为 `ContinuityEngine`（重构 `describeTransition`） | ✅ 是 |
| D2 | 关系类型是否建模为**结构化特征（枚举集）**，而非绝对固定优先级阶梯（权重由按上下文的规则计算） | ✅ 是（特征化 + 上下文规则；保留默认次序仅作展示 tie-breaker） |
| D3 | 无关系时是否**显式诚实表达**（非沉默留白；且只给知识事实、不暴露内部编排） | ✅ 是（直击断裂感） |
| D4 | `ContinuityFeatures` 是否作为**核心能力**；`JourneyContinuityScore` 仅作**可选派生诊断值**（非引擎核心） | ✅ 是（核心=Features；JCS=派生/可选） |
| D5 | B/C 是否统一为单一 `ContinuityEngine` 接口 | ✅ 是（零重复） |
| D6 | 解释是否允许 LLM 自由生成 | ❌ 否（图 grounded、守红线） |
| **D7** | **硬边界：`ContinuityEngine` 是否明确不含 `rankCandidates` / 候选排序 / 下一步选择（决策权在 C）** | ✅ 是（PO 二次修订点 1，列为红线） |
| **D8** | `JourneyContinuityScore` 第一版是否定位为**工程/诊断指标**（非产品 KPI） | ✅ 是（PO 二次修订点 5） |
| **D9** | 是否**不追求 `BROKEN = 0`**，而追求"BROKEN 不再静默、不欺骗用户" | ✅ 是（PO 二次修订点 4；防引擎强行凑关系） |
| **D10** | **Evidence 中间层铁律：引擎产出可审计 Continuity Evidence（RelationEvidence[] 等），不产生"下一步"、也不产生最终"解释选择"；B/C 分别消费证据；C 不消费 JCS 作决策** | ✅ 是（PO 三次收紧点 1+2+4，列为红线，补强 D7） |

> 状态：**Accepted**。PO 已整体认可方向，v3 收紧后定稿。B 施工在 **P1 收口后**启动。

---

## 7. 修订记录（PO 二次修订 5 点吸收说明）

| PO 修订点 | 原 v1 问题 | v2 修正 |
|-----------|-----------|--------|
| 1. 引擎不含 rankCandidates | v1 把 `rankCandidates` 放进引擎、C 仅调用 | 删除；引擎只输出"判断依据"，排序/去哪归 C（D7 硬边界、Q5） |
| 2. JCS 太单维 | v1 = "有证明关系的跳占比 × 平均置信度" | 改多维度 RS+EQ+TC+SC+ContextRelevance；明确区分"有关系"与"用户懂"（Q4） |
| 3. 7 阶不写死绝对等级 | v1 写"显式建模 7 阶优先级阶梯" | 改为结构化特征枚举 + 按上下文规则计算权重；保留默认次序仅作 tie-breaker（Q1） |
| 4. 不追求 BROKEN=0 | v1 隐含以消灭 BROKEN 为目标 | 明确"无关系"是合法状态；KPI = 不静默不欺骗，非 BROKEN=0（Q3、M2、D9） |
| 5. JCS 不当产品 KPI | v1 把分数升↔断裂感降作为确定性 KPI | 降级为工程/诊断指标 + 探索性相关；真实产品指标=用户主观"我懂为什么在这"（Q4、M3/M4、D8） |

## 8. 修订记录（PO 三次收紧 4 点吸收说明，v2 → v3）

| PO 收紧点 | v2 残留问题 | v3 修正 |
|-----------|-----------|--------|
| 1. RelationEvidence[] 集合化 | v2 仍写 `judgeRelation → RelationJudgment {kind,strength,provenance}`，隐含引擎已替调用方选定"哪个关系更重要"，与"引擎不决策"自相矛盾 | 改为 `collectRelationEvidence → RelationEvidence[]`，输出**所有检出的关系证据**；最终解释选择/候选排序由 B/C 决策层做（Q1、Q5） |
| 2. JCS 再降级 | v2 D4 把 `ContinuityFeatures` 与 `JourneyContinuityScore` 并列成"能力"，易被未来 C 当"JCS 高就推荐" | 明确 `ContinuityFeatures` = 核心；JCS = 可选派生诊断值，**明文禁止被 C 消费作决策信号**（Q4、D4、D10） |
| 3. Honest None 去内部泄漏 | v2 示例"我们是按探索包顺序带你看的"把 author ordering / package 内部编排暴露给用户 | 改为只给**知识事实**："当前知识中，没有找到 A 与 B 之间足够可靠的直接联系"（可补"这是一次探索方向的切换"）；禁止暴露内部实现（Q3） |
| 4. Evidence→B/C 中间层铁律 | v2 有 D7 但缺一句把前三点收口的铁律 | 新增 D10 + 定型架构图：`ContinuityEngine` 不产生"下一步"、不产生最终"解释选择"，产出可审计 Continuity Evidence，B/C 分别消费（Q5、D10） |

---

## 9. 施工硬约束（Implementation Constraints，供 Phase B Implementation Audit 逐条核对）

PO 终审确认架构主线，并明确以下「三个不 / 三个是」作为**施工前必须硬编码、Phase B Implementation Audit 必须逐条核对**的硬约束。它们不是新架构决策，而是把 D7 / D8 / D9 / D10 落成**可操作的实现红线**——防止 B 做着做着漂回"关系解释器 + 漂亮分数"，而没真正形成 C 能复用的基础能力。

### 三个「不」（Engine 与 JCS 的禁区）

| # | 硬约束 | 落到 ADR | 施工审计硬判定（Implementation Audit 必查） |
|---|--------|---------|-------------------------------------------|
| **C1** | ❌ Engine 不决定「去哪」 | D7 + D10 | `ContinuityEngine` 及其任意子函数**不得含** `nextStep` / `rankCandidates` / `selectDestination` / 候选排序 / 导航决策调用；静态扫描 + 代码审查命中数必须 = 0 |
| **C2** | ❌ Engine 不决定「讲哪条证据」 | D10（"不产生最终解释选择"） | `explain()` / `expressHonestNone()` 只产出**解释素材集合**，不得返回"已被选定的唯一解释"；"从 `RelationEvidence[]` 里挑哪条讲、怎么组织"的逻辑**必须位于 B 解释选择层（引擎外）**，不在引擎内 |
| **C3** | ❌ JCS 不决定「去哪」 | D8 + D10 | `JourneyContinuityScore` **不得**出现在任何 `ExplorationAction` / 候选排序 / 导航决策的入参或阈值判断中；C 模块对 JCS 的引用计数必须 = 0（C 只消费 `RelationEvidence[]` 与 `ContinuityFeatures`） |

### 三个「是」（Evidence 基础的硬性要求）

| # | 硬约束 | 落到 ADR | 施工审计硬判定（Implementation Audit 必查） |
|---|--------|---------|-------------------------------------------|
| **C4** | ✅ Evidence 可审计 | Q1 / Q5（provenance + source） | 每一条 `RelationEvidence` 必须携带 `provenance`（来自哪个数据源）+ `source`（具体实体/声明 id）；任意一条 evidence 缺 `provenance` / `source` 即判实现不达标 |
| **C5** | ✅ B/C 共用同一证据基础 | D5 / D10 | B 与 C 调用的是**同一个** `ContinuityEngine.collectRelationEvidence`；不得出现 C 另写一套关系逻辑（M5 单引擎复用率 = 100%） |
| **C6** | ✅ 无关系可以存在，但绝不静默、绝不编造 | D3 / D9 | 任意 `RelationEvidence[].kind === NONE` 的跳**必须**渲染显式诚实陈述（知识事实层，非内部实现）；不得静默留白、不得用编造的关系填充（M2 诚实表达覆盖 = 100%） |

### 一句话总纲（建议写入 Phase B Implementation Spec 首页）

> `ContinuityEngine` 只产出**可审计的 Continuity Evidence + ContinuityFeatures**。
> **B** 消费证据做「为什么到这里」的解释与诚实表达；**C** 消费证据做「去哪更值得」的候选排序与决策。
> **Engine 不产生下一步、不预选解释、JCS 不进入导航决策。**
