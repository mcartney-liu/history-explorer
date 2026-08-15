# Phase C Reality Audit —— 候选数据 / 上下文 / 接口 只读审计

> 状态：**完成（2026-08-15 晚，只读，零代码改动）**
> 目的：回答 PO 建议的"先审计再写 ADR-0024"，避免 C"设计很漂亮但候选数据/上下文/现有架构接不上"。
> 方法：全部基于 `frontend/src` 现有代码实证，不凭记忆、不写代码。
> 结论速览：**C 的核心候选源与用户上下文在纯前端即可得（零新后端、不破 Freeze 红线）；受限的是时间/空间语义维度（与 B 期一致）；现有 `ExplorationAction` 结构可直接复用。**

---

## 一、候选数据可得性（"从当前节点，我有哪些合理的下一步"）

| 候选源 | 数据在哪 | 可得性 | 备注 |
|---|---|---|---|
| `relationship_neighbor` 图邻居 | `runtime/entityCache.ts`（`cacheEntityNeighbors`，App.tsx:476 在每次打开实体时写入 `relationships` 的 gid+name；LRU cap 64） | ✅ **已可得** | 无需新请求；邻居即"当前实体的一跳关系目标" |
| `cross_topic_bridge` 跨主题桥 | 后端 `/explore` 响应 `exploration.cross_topic_related`（含 `global_id/topic/relationship/direction`），App.tsx:872/888/904 已在消费 | ✅ **已可得** | TopicComparisonPanel 已用同一数据源做桥接展示 |
| `dimension_target` 维度目标 | `ExplorationState.dimensionMapping`（Record<dim, gid[]>），ExplorationPolicy:262 解析 | ✅ **已可得** | M88.2 Rule 0/1 已用；缺口对应真实可达实体 |
| `package_next` 包内下一站 | `JourneyRail.buildStations(pkg)` → Station[]（gid/name） | ✅ **已可得** | 原写死路线，C 期降级为候选之一 |
| **backend/KG 新能力** | — | ❌ **不需要** | 上述四源全在前端数据层/缓存/后端现有响应内 |

**结论**：Candidate Generation 的四个候选源**全部现成**，C 不需要新增 backend 接口、不碰 Freeze 红线。

---

## 二、真实上下文可得性（"用户现在正在理解什么"）

| 上下文 | 数据在哪 | 可得性 | 备注 |
|---|---|---|---|
| 当前节点 | `currentAnchorRef`（ExplorationState）+ App 导航态 `history[cursor]` | ✅ 已可得 | |
| 已探索节点 | `exploredAnchors`（ExplorationState）+ App `seenGlobalIds` + `history` | ✅ 已可得 | 用于候选去重 + 已覆盖惩罚 |
| 用户路径顺序 | App 导航态 `history/cursor`（NavNode[]） | ✅ 已可得 | 最近访问序列 |
| 主题 | `currentTopic`（ExplorationState） | ✅ 已可得 | |
| 缺口信号 | `GapLedger`（openGaps，GapSnapshot）+ M88.2 Rule 0 已读 | ✅ 已可得 | **用户缺口优先**的直接输入 |
| 时间（中心实体级） | `entity.summary.start_date/end_date`（EntityPage:213） | ✅ 中心实体**有** | 但**关系目标日期不返回**（EntityPage:156 注释 = Future Scope） |
| 时间（跨实体对比） | — | ❌ **不可得（Phase B 同因）** | C 期无法做 A↔B 时间连续性对比；TC 保持 null |
| 空间/地理 | 后端无地理数据（relationshipUtils 测试注释 "backend has none"） | ❌ **不可得** | SC 保持 null；C 期不做空间语义 |

**结论**：
- **路径/维度/缺口级上下文全部现成** → ContextRelevance 第一版可基于"已探索维度 + 缺口 + 路径"计算（这是 C 相对 B 的最大能力增量，PO 建议的第 3 点成立）。
- **时间/空间语义受限** → C 的 Continuity 输入与 B 期一致（RS/EQ 可用，TC/SC 为 null），C 期**不能假装有时间/空间连续性**（诚实：哪些只是未来能力，如实标注）。

---

## 三、现有接口现状（C 直接复用 vs 需要扩展）

| 接口 | 现状 | C 期处置 |
|---|---|---|
| `ExplorationAction { type, targetRef, reason, narrativeHook, expectedGrowth, confidence }`（M88.2） | 已定型 | ✅ **直接复用**（"去哪里/为什么/confidence"三要素齐全） |
| `ExplorationPolicy.evaluateExploration`（Rule 0–5） | 预写状态规则选择器 | **增强不推翻**：Rule 0（缺口）后插入 C 候选决策，候选空回退 Rule 1–5 |
| `explorationNavigation.ts` / `NextStepPanel` / `RecommendedNext` | "下一站"来源 = stations[idx+1] / ExplorationAction | 调用点切到 C 产出（stations 保留为回退） |
| `buildExplanationCandidates / selectBestExplanation`（B 层） | 已建 | C 的 `reason/narrativeHook` 复用 B 解释素材 → "下一步为什么"可解释（呼应 P09） |
| `composeFeatures`（B 引擎） | RS/EQ/TC/SC/CR，CR=null | C 期 **CR 由 C 决策层填充**（真实上下文）——B 引擎接口不变，CR 语义从"退化"变"待 C 填" |
| `deriveJourneyContinuityScore`（B 引擎） | 诊断启发式 | **C 不消费**（C3 延续）；可作 route comparison/回归用 |

**Action 类型是否需要扩展**：暂不需要。现有 5 类（open_dimension/follow_cause/deep_continue/compare_context/reflect）可覆盖候选性质映射；如候选来源引入"跨包跳转"新语义，再评估加类型（**列入 ADR-0024 待决点，不预判**）。

---

## 四、审计结论（喂给 ADR-0024 的事实基线）

1. **候选生成 = 纯前端可行**：四源（图邻居/跨主题桥/维度目标/包内下一站）全在现有数据层，**零新后端、不破 Freeze 红线**——回应 PO 建议第 1 问。
2. **ContextRelevance 第一版可算**：基于已探索维度/缺口/路径的真实上下文，**不假装时间/空间语义**（TC/SC 保持 null，与 B 期一致）——回应第 2/3 问。
3. **排序 = 多因素，不是 JCS 总分**：Continuity（RS/EQ）+ Context Relevance（缺口/已探索）+ Exploration Value（补缺口价值）+ Novelty/Diversity，**JCS 绝不参与**——回应第 4/5 问（PO"连续 ≠ 值得探索"落地）。
4. **ExplorationAction 直接复用**，C 决策层只做"候选生成 + 排序 + 选一映射 Action"——回应第 6 问。
5. **C/D 边界**：C 决定"下一站"；D（认知闭环）的"用户是否真正理解"判断**不进 C**——回应第 7 问。

> 下一步：以本审计为事实基线，修订 `ADR-0024`（Proposed → 逐条拍板 → Accepted）→ 施工设计对齐 → C 施工。
