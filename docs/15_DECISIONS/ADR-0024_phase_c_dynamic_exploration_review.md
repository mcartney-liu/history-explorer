# ADR-0024 动态探索方向（Phase C）架构评审

> 状态：**Proposed（待 PO 逐条拍板）**
> 范围：Phase C「动态探索方向」= 替换 `stations[idx+1]` 写死路线，让"下一步去哪"由
>  **候选生成 + 证据打分 + C 决策层排序**驱动，选出"现在最值得用户理解的那一个"。
> 关联：ADR-0023（Phase B 探索连续性引擎，**Accepted，已施工 commit 550ad11**）、
>       `frontend/src/next/exploration/ExplorationPolicy.ts`（M88.2，C 的现有种子）、
>       `docs/product/PHASE_C_REALITY_AUDIT.md`（**已完成只读审计，候选/上下文/接口三块实证**）、
>       `docs/product/PHASE_C_IMPLEMENTATION_DESIGN.md`（Draft，待本 ADR 拍板后对齐）。
> 触发基线变更：是（新增 C 层候选生成/排序模块，触及 CURRENT_ARCHITECTURE_BASELINE）。
> **流程说明**：PO 2026-08-15 指出"先架构评审再施工设计"（Phase B 同惯例），且建议"先 Reality Audit 再写 ADR"——均已执行：
>   Reality Audit 已完成（`docs/product/PHASE_C_REALITY_AUDIT.md`），本 ADR 的候选/上下文/接口事实全部来自该审计，非臆测。

---

## 0. 为什么写这份评审（Context）

PO 2026-08-15 实机查看 Phase B 诚实表达后提出灵魂拷问：**"用户看不懂'为什么带我到这里'——那做这一大堆意义在哪？"**

诊断（PO 认可）：
- "没有找到联系"（B 层诚实表达）解决的是**不撒谎**，解决不了**"为什么用户此刻在这里"**。
- "为什么在这" = **C 层的核心命题**：下一站应是**当前理解状态下最值得去的那一个**，而非写死路线的下一个。
- B 的工作没白做：**C 判断"哪个候选值得去"必须知道候选与当前节点的关系证据**——正是 Phase B `collectRelationEvidence` 的产出。**B 是 C 的地基，C 是让用户"看懂"的根治。**

PO 同时指出流程问题：**Phase C 应先架构评审（ADR）再施工设计**——本 ADR 即为此补上。

---

## 1. 现状实证（已读代码 + 已完 Reality Audit，非臆测）

> 完整事实基线见 `docs/product/PHASE_C_REALITY_AUDIT.md`。核心结论：
> **候选四源全在现有前端数据层/后端现有响应（零新后端）；路径/维度/缺口上下文全现成；
> 时间仅中心实体级、空间不可得（与 B 期一致）；`ExplorationAction` 结构可直接复用。**

| 事实 | 现状 | 差距 |
|---|---|---|
| 写死路线 | 包内站间衔接走 `stations[idx±1]`（`JourneyRail.buildStations`），"下一站"= 数组下一个，**零实时判断** | 用户被带到无关系跳时产生"为什么在这" |
| C 层现有种子 | `ExplorationPolicy.evaluateExploration`（M88.2）：读**预写 ExplorationState**（missingDimensions/missingConnections/coverageRatio）输出 `ExplorationAction`，**规则选择器、不访问实时图数据、不生成候选集** | 有决策结构，无"候选生成 + 证据打分"能力 |
| 候选源（Audit 实测） | `relationship_neighbor`（entityCache，App 打开实体时写入）✅ / `cross_topic_bridge`（/explore 响应 cross_topic_related）✅ / `dimension_target`（dimensionMapping）✅ / `package_next`（buildStations）✅ | **四源全现成，零新后端** |
| 上下文（Audit 实测） | 当前节点/已探索（exploredAnchors+history）/路径（history/cursor）/主题/缺口（GapLedger openGaps）✅；时间仅中心实体级 ⚠️；空间 ❌ | ContextRelevance 第一版可算（路径/维度/缺口级），**不假装时间/空间语义** |
| B 引擎（可复用） | `collectRelationEvidence(from, to, context) → RelationEvidence[]` + `composeFeatures → ContinuityFeatures`（Phase B 已建，C5 单引擎） | ✅ 地基已备 |
| 决策产物结构 | `ExplorationAction { type, targetRef, reason, narrativeHook, expectedGrowth, confidence }`（M88.2 定型） | C 直接复用 |
| JCS | `deriveJourneyContinuityScore` 已标诊断启发式，B 期测试锁定 C 不消费（C3） | 保持 |
| 可解释性 | B 层 `buildExplanationCandidates` / `selectBestExplanation` 已建 | "下一步为什么"可直接复用 B 解释素材 |

---

## 2. 五个核心问（每问给：现状 / 待决 / 推荐立场）

### Q1 候选生成模型（Candidate Generation Model）

- **现状**：无候选生成。`stations[idx+1]` 是唯一"下一站"来源；ExplorationPolicy 只从预写状态挑目标，不生成候选集。
- **待决**：候选从哪些来源产生？是否允许跨出当前探索包？
- **推荐立场**：**多源候选 + 单集去重**：
  - `dimension_target`（预写维度映射解析出的真实实体——用户缺口最值得）
  - `package_next`（原写死路线的下一站，降级为候选之一，不再自动是"下一站"）
  - `relationship_neighbor`（实时图邻居：entityCache / entity relationships）
  - `cross_topic_bridge`（跨主题桥接实体）
  - 去重：`exploredAnchors` 已访问 gid 直接排除。
  - **允许跨包**（relationship_neighbor/cross_topic_bridge 天然跨包），但"跳出去"是候选行为而非自动行为——由排序决定。

### Q2 排序模型（"值得理解度"怎么算）—— PO 核心建议："连续 ≠ 值得探索"

- **现状**：ExplorationPolicy 有 confidence 计算（基于 coverageRatio），但那是"动作置信度"不是"候选排序"。
- **待决**：候选之间按什么排？是否引入用户缺口优先？JCS 能否参与？
- **推荐立场（红线 C3 锁死 + PO"连续 ≠ 值得探索"落地）**：
  **排序输入 = `RelationEvidence[]` + `ContinuityFeatures` + ContextRelevance（C 决策层填充）+ ExplorationValue（C 新增），绝不包含 JCS。**
  排序是多因素复合，**不是单一"连续性分数"**：
  1. **ContextRelevance（上下文相关度）**：候选是否命中用户缺口（openGaps）/未覆盖维度/当前主题——C 相对 B 的最大能力增量（B 期 CR=null，C 期由真实上下文计算）。
  2. **ExplorationValue（探索价值）**：候选能否解释"当前最大的历史缺口"——**与"关系强"明确区分**：一个关系极强的跳可能是用户已知的 trivial transition，一个关系中等但补缺口的跳更值得（PO 举例 A→B 强关系 vs A→C 补缺口）。
  3. **Continuity（连续性）**：来自 B 的 `composeFeatures`（RS/EQ 可用；TC/SC 为 null，不假装时间/空间语义）。
  4. **Novelty / Diversity（新颖性/多样性）**：避免反复推荐已覆盖维度/已探索方向。
  5. **无证据候选**：worthiness 最低但仍保留（防死路，reason 走诚实表达）。
  > ⚠️ JCS 定位（D8）：仅作**诊断/回归**用（route comparison、regression report），**绝不进候选排序/阈值**——PO"连续 ≠ 值得探索"的直接推论，继承 ADR-0023 D8/D10。

### Q3 与 ExplorationPolicy / M88.2 的关系

- **现状**：`evaluateExploration` 是唯一"下一步"决策入口，Rule 0–5 纯预写状态规则。
- **待决**：C 是替换还是增强？旧 Rule 1–5 去留？
- **推荐立场**：**增强不推翻（只增不改）**——在 Rule 0（用户缺口）之后、Rule 1 之前插入 C 候选决策：
  - `generateCandidates` → `rankCandidates` → 取第一 → 产出 `ExplorationAction`（type 按候选性质映射）。
  - **回退链**：候选为空 / 全被探索 → 落回现有 Rule 1–5 兜底（旧逻辑原样保留，测试全绿不动）。
  - 这保证 C 上线是"叠加能力"，不是"重写导航"，风险可控、可回滚。

### Q4 无证据候选怎么处理

- **现状**：写死路线里无关系跳直接发生（用户困惑）；B 期已能诚实表达。
- **待决**：排序时无证据候选是过滤掉还是保留？
- **推荐立场**：**保留但压到最低**（避免"当前实体的所有候选都被过滤 → 无路可走"）。
  被选中的无证据候选，其 reason 走 B 层诚实表达口径（"该方向与当前理解暂无可靠直接联系，但值得一探"），
  用户看到的是"产品知道没把握，但仍给了出口"，而非死路或假装有关系。

### Q5 C 与 B / 引擎的边界（防漂移）

- **现状**：Phase B 已定死：引擎只产证据，B/C 分别消费（D7/D10/C5）。
- **待决**：C 施工是否会产生第二套关系逻辑？
- **推荐立场（红线）**：**C 的候选排序唯一关系数据来源 = `collectRelationEvidence`（C5 单引擎复用率 100%）**。
  - C 决策层只做：候选生成（纯图/状态数据遍历）+ 排序（消费证据的上下文规则）+ 决策（选第一 + 映射 Action）。
  - **C 不另写关系判断、不消费 JCS、不访问 LLM**（M88.0：禁止 AI 决定探索方向）。
  - `stations` 保留为**回退兜底**（候选空时），不删除。

---

## 3. 测量问（如何知道 C 做成了）

| 指标 | 定义 | 数据来源 | 目标 / 定位 |
|---|---|---|---|
| **M1 候选覆盖** | 生成的候选集覆盖"真实可达且有证据支持"的实体的比例 | 离线比对（现有图数据） | ≥ 90%（候选不全不行） |
| **M2 决策可解释率** | 用户看到 C 产出的"下一步"后，能否答出"为什么推荐这个" | 反馈信号（复用已埋点） | 显式上升（呼应 PO"用户看不懂"） |
| **M3 无关系跳发生率** | 实际发生的"下一步"中，无可靠关系（NONE 证据）的占比 | 运行时统计 | **下降**（C 排序把无证据候选压后） |
| **M3b 探索价值命中率** | 排序命中的候选是"补当前最大缺口"而非"强关系 trivial"的比例（PO"连续 ≠ 值得探索"验证） | 运行时统计 + 人工抽查 | 探索价值维度参与后显著上升 |
| **M4 回退率** | 候选为空 → 落回 Rule 1–5 / stations 的比例 | 运行时统计 | 低（< 10% 理想；回退不报错即合格） |
| **M5 单引擎复用率** | C 的关系逻辑调用共享 `collectRelationEvidence` 而非重写的比例 | 代码审查 | 100%（C5 延续） |
| **M6 越界防护** | C 决策层是否引用 JCS / LLM / 新关系逻辑 | 代码审查 | JCS 引用 = 0；LLM 调用 = 0 |

---

## 4. 与 Phase D（认知闭环）的衔接

- C 产出的 `ExplorationAction` 已有 `reason/narrativeHook/confidence` 结构，可直接消费 B 的 `explain` 结果，
  使"下一步为什么"也变成可解释（呼应 Article 0 真相层 + P09）。
- C 的"用户缺口优先"排序直接服务 Phase D 的 Understanding→Gap→Candidate→Action 闭环
  （M88.2 Rule 0 已埋 openGaps 信号，C 期把它提升为最高权重）。
- 逐层演进（PO 拍板）：P1 → B（已施工）→ **C（本 ADR）** → D（暂缓施工，C 完成后评估）。

---

## 5. 风险与代价（Consequences）

- **正面**：根治"用户看不懂为什么在这"；"下一步"可解释、非随机；B 地基兑现价值；回退链保证不崩。
- **负面 / 代价**：
  - C 决策层新增 2 个模块（candidateGeneration / candidateRanking），`NextStepPanel`/`RecommendedNext` 调用点调整（红线内）。
  - 候选生成可能引入"跨包跳转"的导航语义变化——需 UI 明确"跳出去"的视觉语义（复用 B 解释素材）。
  - 排序规则（缺口/证据/覆盖权重）第一版是启发式，需上线后按 M3 校准，不承诺一步到位。
- **不触碰红线**：不引 Neo4j/PG/ES/RAG/GIS/新依赖；AI/LLM 仅限 `backend/app/ai_gateway/`（默认关）；JCS 不进决策；Relationship Layer 仅可视化。

---

## 6. 待 PO 拍板的决策点（Decision Points）

| # | 决策 | 我的推荐 |
|---|------|---------|
| D1 | C 是否正式立项（替换 `stations[idx+1]` 为候选驱动） | ✅ 是 |
| D2 | 候选是否多源（dimension_target / package_next / relationship_neighbor / cross_topic_bridge，Audit 实测四源全现成） | ✅ 是（单集去重） |
| D3 | 是否允许跨包候选（跳出去是候选行为，由排序决定） | ✅ 是（非自动） |
| **D4** | **排序是否多因素复合（ContextRelevance + ExplorationValue + Continuity + Novelty），而非单一连续性分数** | ✅ 是（PO"连续 ≠ 值得探索"） |
| **D5** | **ContextRelevance 是否成为 C 核心增量（第一版基于路径/维度/缺口真实上下文；不假装时间/空间语义，TC/SC 保持 null）** | ✅ 是（PO 建议第 3 点） |
| **D6** | **ExplorationValue 是否独立维度（补"当前最大缺口"的候选可压过强关系 trivial transition）** | ✅ 是（PO 建议第 4 点） |
| D7 | 无证据候选：保留但最低（防死路） vs 直接过滤 | ✅ 保留但最低 |
| D8 | `ExplorationPolicy` 增强不推翻（只增不改 + 回退链） | ✅ 是（可回滚） |
| **D9** | **红线：C 排序输入 = RelationEvidence[] + ContinuityFeatures + ContextRelevance + ExplorationValue，绝不包含 JCS** | ✅ 是（延续 C3 + PO 建议） |
| **D10** | **红线：C 不另写关系逻辑（单引擎复用 100%）；AI 不决定探索方向** | ✅ 是（C5 + M88.0） |
| D11 | `stations` 保留为回退兜底（不删除） | ✅ 是 |
| D12 | `ExplorationAction` 是否需扩展类型（如跨包跳转新语义） | 🟡 暂不（现有 5 类可覆盖；施工中发现需要再加，走 Freeze Revision Gate） |

---

## 7. 与 Phase C Implementation Design 的关系

- `docs/product/PHASE_C_REALITY_AUDIT.md`（已完成）——候选/上下文/接口事实基线。
- `docs/product/PHASE_C_IMPLEMENTATION_DESIGN.md`（Draft）以本 ADR 拍板结果为准修订：
  - 本 ADR D1–D12 全部 Accepted → 施工设计对齐后进入 TDD 施工（C-S1..C-S8）。
  - 任何决策点被 PO 修改 → 施工设计相应修订后再开工。

---

> 状态：**Proposed**。PO 逐条 accept/reject 后转 Accepted，再启动 C 施工。
