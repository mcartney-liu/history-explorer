# M83 Architecture Gate Review

> **阶段**：M83 Architecture Gate Review
> **模式**：严格只读审查
> **日期**：2026-08-05
> **结论**：**PASS WITH CONDITIONS — 3 Conditions, 0 Blockers**

---

## 1. M82 Baseline Assessment

### 1.1 Frozen Architecture 完整性

| 维度 | 状态 | 证据 |
| --- | --- | --- |
| **CausalStatement Schema（7 字段）** | 🔒 FROZEN | `M82_FINAL_GATE_REPORT.md` §C.1 — Phase 1-3 期间 0 次修改 |
| **confidence Model（enum string）** | 🔒 FROZEN | C-7 约束：`high\|medium\|low\|null`，非 float |
| **Evidence Boundary** | 🔒 FROZEN | CausalStatement → evidence_refs → Evidence Layer → Source Layer |
| **Runtime Boundary** | 🔒 FROZEN | Loader 只加载不生成 / Adapter 只查询不生成 / Engine 只消费 |
| **Graph Core** | 🔒 FROZEN | `Edge` 未增加 causal 字段，`causal/` 不 import `graph.py` |
| **AI Boundary** | 🔒 FROZEN | `causal/` 包内无 AI/LLM import，C-8：空 CS → 模板 fallback |

**8/8 Freeze Constraint 全部满足。架构基线完整。**

### 1.2 未关闭约束

| 约束 | 状态 | 影响 M83? |
| --- | --- | --- |
| M82-P2-DEBT-001 | **OPEN** | ✅ 是（详见 §2） |
| 假阳性测试（CausalStatementCard data-confidence） | 低优先级 | ❌ 否 |

**仅 1 条未关闭技术债，影响 M83。**

### 1.3 M83 遗留风险

| 风险 | 严重程度 | 说明 |
| --- | --- | --- |
| **DEBT-001 未偿还** | 低 | Frontend 硬编码 CS 数据，需要 M83 迁移到 API |
| **CausalStatement 数据量（5 条）** | 低 | 中国文明包有 5 条 CS，其他包（罗马/丝路）为 0。当前足以验证体验，但规模化需 M84 |
| **M80.5 Revision 未合并** | 中 | 9 Proposals ACCEPTED 但未合并至 M80.5 原文。M83 设计需要 P01/P02/P08 约束 |

### 1.4 M82 Baseline Status

```
PASS
```

M82 Baseline 完整、稳定、可冻结。8/8 约束满足，7 字段 Schema 0 次修改，104 tests PASS。M83 可在其上安全建设。

---

## 2. Open Debt Review — M82-P2-DEBT-001

### 2.1 当前状态

```
ExplorationPackagePage.tsx
    │
    ├── const CHINA_CAUSAL_STATEMENTS: CausalStatementData[]  ← 硬编码
    │       │
    │       ├── CausalStatementCard
    │       ├── GuidePanel
    │       └── RelationshipChain
    │
    └── 数据来源：复制自 data/causal_statements.json（5 条）
```

**问题**：前端维护了一份与 `data/causal_statements.json` 完全重复的数据。任何 CS 的增删改都需要同时修改两处。

### 2.2 为什么 Phase 2 可以接受？

1. **Phase 2 的目标是验证 UI 集成，不是验证数据管道**。硬编码让 GuidePanel/RelationshipChain 能快速集成 CausalStatementCard，而不必等待后端 API 就绪
2. **Phase 2 的 5 条 CS 与后端完全一致**——这是 P2.1 的刻意设计：前端硬编码 = 后端的精确副本，确保 UI 渲染效果与未来 API 接入后一致
3. **数据量极小（5 条）**，不构成维护负担。当 CS 扩展到 50+ 条时，双重维护才成为实际问题

### 2.3 是否必须在 M83 修复？

**是。** 理由：

1. **M83 如果引入新的 CausalStatement（如罗马/丝路包的 CS），双重维护会从 5 条扩展到 15+ 条**，此时不再可接受
2. **M83 可能引入 CausalStatement 的包级过滤**（按包 slug 筛选 CS），硬编码无法支持
3. **M80.5 Revision P03 要求 "CausalStatement 必须在 AI 不可用时仍可呈现"**——如果 CS 数据源头不统一（前端一份、后端一份），P03 的信任基础不成立
4. **E3（M82 commit）已解决**——M82 代码已在 Git 历史中，DEBT-001 是下一个要处理的 OPEN item

### 2.4 三方案评估

#### 方案 A：Frontend 继续维护本地 Semantic Dataset

| 维度 | 评价 |
| --- | --- |
| 架构一致性 | ❌ 差 — 数据源分裂（后端 `causal_statements.json` vs 前端 `CHINA_CAUSAL_STATEMENTS`），违反 Single Source of Truth |
| 开发成本 | 🟢 零（不修改） |
| 未来扩展能力 | ❌ 差 — 包级过滤、增量加载、多包 CS 都需要后端支持 |
| 对 Explorer Flow 影响 | ❌ 负 — CS 数据与 PathCandidate API 解耦，未来无法从探索路径中动态获取 CS |
| **结论** | **不推荐。** 仅在 M82 Phase 2 作为临时方案可接受。 |

#### 方案 B：新增 Causal API Endpoint

```
GET /api/v1/causal/{entity_id}
→ 返回该 Entity 相关的所有 CausalStatements
```

| 维度 | 评价 |
| --- | --- |
| 架构一致性 | 🟡 中 — 新增独立端点，语义清晰，但增加了 API surface |
| 开发成本 | 🟡 中 — 需要新增路由 + 前端 fetch 逻辑 + loading/error 状态 |
| 未来扩展能力 | 🟢 好 — 独立端点可独立演化（包过滤、分页、排序），不受 Exploration API 约束 |
| 对 Explorer Flow 影响 | 🟡 中 — 前端需要额外的 fetch 调用，增加页面加载的瀑布流（waterfall） |
| **结论** | **备选方案。** 适合 M84+ 当 CausalStatement 成为独立 Exploration Object 时。M83 阶段过度设计。 |

#### 方案 C：复用现有 Exploration API 扩展 PathCandidate

```
GET /api/v1/explore/{topic}
→ ExplorationResult.paths[].causal_statements  ← 已存在（M82 P1.5）
```

| 维度 | 评价 |
| --- | --- |
| 架构一致性 | 🟢 好 — `PathCandidate.causal_statements` 已在 M82 实现，后端已完成，只需前端消费 |
| 开发成本 | 🟢 低 — 删除 `CHINA_CAUSAL_STATEMENTS` 常量（59 行），改为从 API response 提取。5 个消费组件接口不变 |
| 未来扩展能力 | 🟢 好 — CausalStatement 与探索路径自然绑定（"这条路径上有什么因果解释"），未来 multi-hop 自然扩展 |
| 对 Explorer Flow 影响 | 🟢 正 — CS 数据与探索结果一致，不需要额外请求 |
| **结论** | **推荐。** 这是 M82 架构设计的自然延伸——CausalStatement 本就应该通过 PathCandidate 传递。 |

### 2.5 推荐方案

```
方案 C — 复用现有 Exploration API 扩展 PathCandidate
```

**迁移路径**：

```
Before (DEBT-001):
  ExplorationPackagePage
      ├── const CHINA_CAUSAL_STATEMENTS (硬编码)
      └── → PackageJourney → GuidePanel / RelationshipChain

After (方案 C):
  ExplorationPackagePage
      ├── fetch /api/v1/explore/{topic}
      ├── explorationResult.paths[].causal_statements
      └── → PackageJourney → GuidePanel / RelationshipChain
```

**变更量**：删除 59 行硬编码 + ~5 行 API 提取逻辑。5 个消费组件（CausalStatementCard、GuidePanel、RelationshipChain、PackageJourney、resolveCausalForEdge）接口不变。

**开发成本**：Low（1 个文件修改，< 10 行代码变更）。

---

## 3. CausalStatement Object Position

### 3.1 当前核心 Exploration Object

| Object | 所属层 | 职责 |
| --- | --- | --- |
| **Entity** | Fact Layer | 历史实体（人物、事件、思想、地点...） |
| **Relationship** | Fact Layer | 实体间结构连接（caused / influenced / located_at...） |
| **Timeline** | Fact Layer | 时间轴（从 Entity 的 start_date/end_date 派生） |
| **Map** | Fact Layer | 空间分布（从 Entity 的 location 属性派生） |

### 3.2 CausalStatement 是否应成为第五类 Exploration Object？

**判定：是，但时机在 M84+，不在 M83。**

| 理由 | 说明 |
| --- | --- |
| **CausalStatement 已有独立数据模型** | 7 字段 frozen Schema，独立于 Entity/Relationship |
| **CausalStatement 已有独立查询层** | CausalStatementAdapter（get_for_entity / get_for_relationship / get_for_path） |
| **CausalStatement 已有独立 UI 组件** | CausalStatementCard（4-section card + LayerBadge） |
| **但当前数据量不足以支撑独立 Object** | 5 条 CS，仅覆盖中国文明包。独立 Object 需要 ≥50 条 + 多包覆盖 |
| **M83 的焦点是体验验证，不是对象扩展** | M83 应先验证 "Explorer 看到 CS 后行为是否改变"，再决定是否将 CS 升级为独立 Object |

### 3.3 如果升级，未来需要什么？

| 能力 | 优先级 | 建议里程碑 |
| --- | --- | --- |
| Causal Detail Page | P1 | M84 — 点击 CausalStatementCard 进入独立 CS 详情页（mechanism/consequence/evidence 全量展示） |
| Causal Timeline | P2 | M84 — "这条因果链在时间上如何展开？"（cause 时间 → effect 时间） |
| Causal Graph | P2 | M85 — "这个因果网络有多大？"（A 导致了 B/C/D，B 又被 E 导致...） |
| Causal Search | P2 | M85 — "有哪些因果解释涉及唐朝？" |
| Causal Recommendation | P3 | M86 — "基于你正在看的因果链，你可能还想了解..." |

### 3.4 是否应该在 M83 冻结该方向？

**不建议在 M83 冻结。** 理由：

1. **CausalStatement 作为独立 Object 的方向已经明确**（ADR-M79 + ADR-M82），但冻结需要数据规模支撑
2. **M83 应先完成 Explorer Validation**（P2 条件），根据验证结果决定优先级
3. **冻结应该在 M84 Entry Gate 时进行**——当 CS 数据达到 50+ 条、覆盖 3+ 个包时，独立 Object 的方向才是可验证的

**建议**：M83 不冻结此方向，但在 M83 Closure 时记录 "CausalStatement Object Position Decision" 作为 M84 Entry Criteria 之一。

---

## 4. Multi-hop Causal Exploration Assessment

### 4.1 当前状态 vs 未来状态

```
Current (M82):
  Entity A ──[causal]──→ Entity B
  (单跳因果解释，CausalStatement 附着在单条 Edge 上)

Future (multi-hop):
  Entity A
      │
      ├──[causal]──→ Entity B
      │                   │
      │                   ├──[causal]──→ Entity C
      │                   │                   │
      │                   │                   └──[causal]──→ Entity D
      │                   │
      │                   └──[causal]──→ Entity E
      │
      └──[causal]──→ Entity F
```

### 4.2 需要什么？

| 能力 | 描述 | 是否必需 |
| --- | --- | --- |
| **Causal traversal layer** | 从 Entity A 出发，沿 CausalStatement 链路遍历 → 到达 Entity B → 继续到 C... | ✅ 必需 — 这是 multi-hop 的核心 |
| **Causal graph index** | 基于 CausalStatement 的 cause_id/effect_id 构建有向图索引（与 GlobalGraph 并行） | ✅ 必需 — traversal 的性能前提 |
| **Explanation chain** | 多跳因果的叙事链："A 导致 B 因为...，B 又导致 C 因为...，所以 A 通过 B 间接影响了 C" | ✅ 必需 — 用户看到的不应是碎片化 CS，而是一条因果故事线 |
| **Conflict explanation** | 当两条因果链矛盾时（如 "A → B" 和 "A → ¬B"），标记学术争议 | 🟡 增强 — 学术严谨性要求，但不是 MVP |

### 4.3 里程碑归属

| 能力 | M83 | M84 | M85 | 理由 |
| --- | --- | --- | --- | --- |
| Causal traversal layer | ❌ | ❌ | ✅ | 需要 ≥50 条 CS + 多包覆盖才能验证 traversal 算法的正确性 |
| Causal graph index | ❌ | ❌ | ✅ | 依赖 traversal layer 的需求驱动——先确定 traversal 语义，再设计索引 |
| Explanation chain | ❌ | 🟡 | ✅ | 可以在 M84 做 prototype（3-hop chain with 15 CS），但正式实现需要 M85 的数据规模 |
| Conflict explanation | ❌ | ❌ | ✅ | 需要 confidence="low" 的 CS + 多条矛盾的 evidence chain，M85 才有足够数据 |

**核心判断**：

- **M83**：不做 multi-hop。当前 5 条 CS 都是 1-hop（A → B），multi-hop 需要 A → B → C 的链式 CS，数据不存在
- **M84**：如果 CS 扩展到 20+ 条且出现链式关系（如 "科举 → 文官 → 内阁"），可以做 explanation chain 的 prototype
- **M85**：正式引入 Causal graph index + traversal layer，这是 CausalStatement 作为独立 Exploration Object 的关键一步

---

## 5. M83 Scope Decision

### 5.1 M83 约束

```
- 不新增 AI runtime
- 不修改 Graph Core
- 不破坏 Semantic Layer Freeze（7 字段 Schema 不动）
```

### 5.2 M83 Recommended Scope

#### P0：必须解决的问题（Blockers）

| # | 任务 | 理由 | 依赖 |
| --- | --- | --- | --- |
| **M83-P0.1** | 偿还 M82-P2-DEBT-001（方案 C — 前端接入 PathCandidate.causal_statements） | 消除双重数据源，为 M83 新增 CS 铺路 | 无 |
| **M83-P0.2** | M80.5 Revision 正式合并（P01/P02/P08） | M83 设计需要这些约束。P01（Landing 引导层）、P02（入口显式化）、P08（Shell 状态感） | PO 签核 |
| **M83-P0.3** | M82 Explorer Validation（≥3/4 Explorer 能复述 CausalStatement 因果） | 验证 M82 的因果语义是否改变了 Explorer 行为 | M83-P0.1 |

#### P1：建议建设的问题

| # | 任务 | 理由 | 依赖 |
| --- | --- | --- | --- |
| **M83-P1.1** | M81b-B KG 数据层中文化（罗马/丝路实体名） | 解决 M81b 遗留问题，提升非中国包的可读性 | 无 |
| **M83-P1.2** | M81b-D 跨包指针评估（回填/删除/延后） | 解决 M81b 遗留问题，确保跨包探索可用 | 无 |
| **M83-P1.3** | Shell Landing 首屏重设计（基于 P01/P02/P08） | 解决 M81a 验证的 #1 问题——入口不显性 | M83-P0.2 |
| **M83-P1.4** | CausalStatement 数据扩展到 15+ 条（覆盖罗马/丝路包） | 为 M84 的 CausalStatement 独立 Object 准备数据基础 | M83-P0.1 |

#### P2：暂缓的问题

| # | 任务 | 理由 | 建议里程碑 |
| --- | --- | --- | --- |
| M83-P2.1 | CausalStatement 独立 Object（Detail Page/Timeline/Graph） | 数据量不足（当前 5 条） | M84 |
| M83-P2.2 | Multi-hop causal exploration | 数据量不足，需要链式 CS | M85 |
| M83-P2.3 | Causal API Endpoint（方案 B） | 当前 PathCandidate 通道已足够，独立端点适合 M84+ | M84 |
| M83-P2.4 | AI Causal Generation Pipeline | 违反 M82 Freeze（AI 不生成事实），且 M83.5 才是 AI 介入点 | M83.5 |

### 5.3 M83 Scope 一页纸

```
M83 — Explorer Experience Validation & Debt Repayment

P0 (Blockers):
  □ M82-P2-DEBT-001 偿还（方案 C — PathCandidate API 接入）
  □ M80.5 Revision 正式合并（P01/P02/P08）
  □ M82 Explorer Validation（≥3/4 Explorer）

P1 (Recommended):
  □ M81b-B KG 中文化
  □ M81b-D 跨包指针评估
  □ Shell Landing 首屏重设计（P01/P02/P08）
  □ CausalStatement 数据扩展到 15+ 条

P2 (Deferred → M84/M85):
  □ CausalStatement 独立 Object
  □ Multi-hop causal exploration
  □ Causal API Endpoint
  □ AI Causal Generation
```

---

## 6. Architecture Risks

| # | 风险 | 概率 | 影响 | 缓解措施 |
| --- | --- | --- | --- | --- |
| R1 | **CausalStatement 数据扩展不足** — M83 结束后仍只有 5 条 CS，Explorer Validation 的样本量不够 | 中 | M84 无法启动 CausalStatement 独立 Object | M83-P1.4 必须在 M83 完成 |
| R2 | **Explorer Validation 失败** — Explorer 看到 CS 后行为没有显著改变 | 低 | M82 的因果语义假设需要重新审视 | 如果 P2 失败，M84 应调整为 "增强 CS 呈现方式" 而非 "扩展 CS 数据规模" |
| R3 | **M80.5 Revision 合并延迟** — PO 签核未完成 | 中 | M83 的 Shell Landing 设计缺乏产品约束 | P01/P02/P08 的核心约束可以从 Proposal 文档中提取，不必等待原文合并 |
| R4 | **Semantic Layer 冻结被意外突破** — M83 开发中新增 CS 字段 | 低 | 破坏 M82 Freeze Baseline | M83 Gate 的 Constraint Lock 与 M82 一致：7 字段 Schema 不动 |

---

## 7. Gate Verdict

### 7.1 判定

```
PASS WITH CONDITIONS
```

### 7.2 Conditions

| # | Condition | 验证方式 |
| --- | --- | --- |
| **C1** | M82-P2-DEBT-001 必须在 M83 中偿还（方案 C），不得延续到 M84 | `ExplorationPackagePage.tsx` 中 `CHINA_CAUSAL_STATEMENTS` 常量被删除，替换为 API 数据提取 |
| **C2** | M83 不得新增 AI runtime | 代码审查：无新的 AI/LLM import 或 API 调用 |
| **C3** | M83 不得修改 CausalStatement Schema（7 字段） | `model.py` 中 `CausalStatement` 字段列表不变 |

### 7.3 不阻塞 M83 的因素

| 因素 | 理由 |
| --- | --- |
| M80.5 Revision 未合并 | M83 可以从 Proposal 文档中提取 P01/P02/P08 约束，不必等待原文合并 |
| M81b-B/E2 未完成 | 中文化和跨包指针是内容工作，与 M83 架构无关，可并行 |
| CausalStatement 数据量小（5 条） | M83 的焦点是验证，不是规模化。5 条足够验证 Explorer 行为变化 |

### 7.4 M83 Entry Criteria 更新

| # | Criterion | 状态（更新后） |
| --- | --- | --- |
| A1 | M82 Phase 1-3 complete | ✅ PASS |
| A2 | 四层架构稳定 | ✅ PASS |
| A3 | Freeze Boundary 未触 | ✅ PASS |
| P1 | M80.5 Revision 正式合并 | ⬜ BLOCKED（不阻塞 M83 架构启动） |
| P2 | M82 Explorer Validation | ⬜ BLOCKED（M83 内完成） |
| P3 | M83 设计接收 P01/P02/P08 | ⬜ BLOCKED（M83 内完成） |
| E1 | M81b-B KG 中文化 | ⬜ BLOCKED（M83 内完成） |
| E2 | M81b-D 跨包指针评估 | ⬜ BLOCKED（M83 内完成） |
| E3 | M82 代码 commit | ✅ PASS（2026-08-05 已完成） |

**更新后**：4/9 PASS（+E3），5/9 在 M83 内完成。

---

> 审查模式：只读
> 日期：2026-08-05
> 结论：**M83 Gate — PASS WITH CONDITIONS（3 Conditions, 0 Blockers）**
> 禁止执行任何代码修改。等待 PO Review。
