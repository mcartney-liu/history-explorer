# M83 Implementation Plan Review

> **阶段**：M83 Implementation Plan Design Phase
> **模式**：严格只读审查
> **日期**：2026-08-05
> **基线**：M82 三个 commit（0c5bb4f / 29cbaf9 / a727752）
> **前置**：M83_ARCHITECTURE_GATE_REVIEW.md（PASS WITH CONDITIONS）

---

## Executive Summary

M83 的定义是 **"Explorer Validation Milestone"**，不是 "Causal Feature Expansion Milestone"。核心矛盾不是"数据不够多"或"功能不够强"，而是**我们不知道 Explorer 是否真正理解和使用因果解释**。

M82 完成了因果语义层的技术实现——数据可以加载、索引、查询、渲染。但这是**工程完成**，不是**产品验证**。M83 的任务是回答一个问题：

> 当 Explorer 看到 "科举通过标准化考试选拔文官，取代了门阀世袭" 时，他的探索行为改变了吗？

如果答案是 YES → M84 扩展因果层、M85 引入 Reasoning Engine 是合理的。
如果答案是 NO → 应该重新设计呈现方式，而不是继续堆数据。

M83 的范围严格受限：偿还一笔技术债（DEBT-001）、验证因果解释的用户价值、以及解决 M81b 的两个遗留问题。不新增能力，不扩展 Schema，不引入 AI。

---

## 1. M83 Goal Definition

### 1.1 Milestone 定义

```
M83 = Explorer Validation Milestone

M83 ≠ Causal Feature Expansion Milestone
```

| 如果 M83 被误解为... | 后果 |
| --- | --- |
| "Causal Feature Expansion" | 过度建设 Causal API、Multi-hop、Causal Graph，在用户尚未理解因果解释之前投入大量资源 |
| "Explorer Validation"（正确） | 聚焦于验证因果解释的用户价值，用最少代码获取最大信息量 |

### 1.2 Success Definition

M83 成功的定义不是"做了多少功能"，而是"获得了多少验证证据"：

| 验证维度 | 指标 | 采集方式 | 成功阈值 |
| --- | --- | --- | --- |
| **Understanding** | Explorer 能否用自己的话复述 CS 的因果机制？ | User Behavior Event + Session Review | ≥3/4 Explorer 能复述 |
| **Engagement** | CausalStatementCard 是否被点击？ | UserBehaviorEvent（M82 已有埋点基础设施） | CS Card click rate > 模板 reason click rate |
| **Depth** | CS 出现后探索深度是否增加？ | visited_from_events 序列长度 | CS 路径的 exploration depth ≥ 非 CS 路径 |
| **Guide Quality** | CS 理由是否比模板 reason 更有效？ | 下一步点击率 | CS 理由的 follow-through rate > 模板理由 |
| **Return** | CS 体验是否产生回访？ | 跨 Session visit pattern | ≥2/4 Explorer 在后续 session 中回到含 CS 的路径 |

### 1.3 M83 不是这些

| M83 不是 | 为什么 | 正确时机 |
| --- | --- | --- |
| 因果数据规模化 | 5 条 CS 足够验证用户理解，50 条不会增加验证信息量 | M84 |
| Multi-hop 因果 | 当前 CS 都是 1-hop（A→B），链式数据不存在 | M85 |
| Causal API Endpoint | PathCandidate 通道已覆盖当前消费场景 | M84 |
| AI Causal Generation | 违反 M82 Freeze（C-6），且 M83.5 才是 AI 介入点 | M83.5 |
| CausalStatement 独立 Object | 需要数据规模 + 用户验证双重前提 | M84 |

---

## 2. Scope Boundary — Allowed / Forbidden Matrix

### 2.1 Allowed（允许）

| 操作 | 理由 | 涉及文件（预测，不修改） |
| --- | --- | --- |
| **数据源替换** — 删除 `CHINA_CAUSAL_STATEMENTS` 常量，改为从 API 提取 `causal_statements` | 偿还 DEBT-001，消除双重数据源 | `ExplorationPackagePage.tsx` |
| **ExploredNode 增加 `causal_statements` 字段** | 当前 `explore()` 方法丢弃了 `_explain_path` 的 cs_list 返回值，这是 bug fix，不是新能力 | `exploration_engine.py` L155-175, L506-514 |
| **前端 `ConnectionExplained` 类型增加 `causal_statements`** | 接收 API 数据 | `App.tsx` / `ConnectionsExplainedPanel.tsx` |
| **UX 调整** — CausalStatementCard 样式微调 | 基于 Explorer 反馈优化可读性 | `CausalStatementCard.tsx`, `components.css` |
| **Explorer 行为验证** — 埋点 + Session Review | 验证因果解释的用户价值 | `UserBehaviorEvent.ts`（已有基础设施） |
| **少量 CS 数据补充（5-10 条高质量）** | 覆盖验证所需的代表性场景，不追求数量 | `data/causal_statements.json` |
| **指标采集** — UserBehaviorEvent 扩展 | 采集 CS 相关行为事件 | `UserBehaviorEvent.ts` |
| **M81b-B 中文化** | 解决 M81b 遗留问题，提升非中国包可读性 | KG 数据文件 |
| **M81b-D 跨包指针评估** | 解决 M81b 遗留问题 | KG 数据文件 |

### 2.2 Forbidden（禁止）

| 操作 | 违反的约束 | 正确时机 |
| --- | --- | --- |
| **新增 Schema 字段** — CausalStatement 的 7 字段不动 | C-3（M83 Architecture Gate Condition 3） | M84（如果独立 Object 需要新字段） |
| **新增 Causal API Endpoint**（`GET /causal/...`） | M83 Gate 判定：PathCandidate 通道已足够 | M84 |
| **AI 生成 CausalStatement** | C-6（M82 Freeze：causal/ 包无 AI import） | M83.5 |
| **修改 Graph Core** — Entity/Relationship 模型不动 | C-4（M82 Freeze：causal/ 不 import graph.py） | N/A（Graph Core 可能永不动） |
| **修改 Relationship Model** — Edge 不增加 causal 字段 | C-2（M82 Freeze） | N/A |
| **Multi-hop traversal** | M83 Architecture Gate §4：数据量不足 | M85 |
| **Causal Graph Index** | M83 Architecture Gate §4：依赖 traversal 语义先确定 | M85 |
| **CausalStatement 独立 Object**（Detail Page/Search/Timeline） | M83 Architecture Gate §3：需要 ≥50 条 CS + 多包覆盖 | M84 |

### 2.3 边界原则

```
M83 的边界 = M82 Freeze Boundary + DEBT-001 Bug Fix + Validation Instrumentation

不是"建设新东西"，是"修复已知问题 + 验证已有东西是否工作"
```

---

## 3. DEBT-001 Implementation Strategy

### 3.1 问题重新定义

Baseline 审查发现了一个**额外的 bug**，超出了 DEBT-001 原本描述的范围：

```
DEBT-001 原始描述（M82 Phase 2）：
  "Frontend hardcoded CausalStatement data → 需要迁移到 API"

Baseline 审查发现的额外问题：
  ExploredNode 缺少 causal_statements 字段
  explore() 方法 L514: explanation=self._explain_path(steps)
  → _explain_path 返回 tuple[str, list[dict]]
  → 但只取了 str，丢弃了 list[dict]
  → 即使前端想消费 API，API 也没有返回 causal_statements

根因：
  ExploredNode（L155-175）与 PathCandidate（L132-152）设计不同步
  PathCandidate 有 causal_statements 字段 + to_dict() 序列化
  ExploredNode 没有——这是 M82 P1.4/P1.5 的实现遗漏
```

### 3.2 三方案评分

| 维度 | 方案 A：前端本地 loader | 方案 B：新增 Causal API | **方案 C：修复 ExploredNode + 删除硬编码** |
| --- | --- | --- | --- |
| **架构一致性** | ❌ 2/10 — 双重数据源，Semantic Consistency 风险 | 🟡 6/10 — 独立端点，但过度设计 | ✅ **10/10** — Single Source of Truth，沿 M82 架构路径 |
| **未来 M84/M85 扩展** | ❌ 2/10 — 无法支持包过滤、增量加载 | 🟡 7/10 — 独立演化，但 M83 阶段用不到 | ✅ **9/10** — PathCandidate 自然支持 multi-hop（未来路径中会有多跳 CS） |
| **修改成本** | 🟢 8/10 — 零后端变更 | 🟡 4/10 — 新路由 + 新 fetch 逻辑 + loading/error | ✅ **9/10** — 3 个文件，< 30 行代码变更 |
| **数据来源可靠性** | ❌ 1/10 — 前端维护副本，后台更新不可见 | ✅ 10/10 — 独立端点，单一来源 | ✅ **10/10** — 数据来源 = 后端 causal_statements.json |
| **总分** | **13/40** | **27/40** | **38/40** |

### 3.3 推荐方案：方案 C

```
修复 ExploredNode + 删除前端硬编码
```

**具体变更**（预测，不修改）：

| # | 文件 | 变更 | 行数（估） |
| --- | --- | --- | --- |
| 1 | `backend/app/core/exploration_engine.py` | `ExploredNode` 增加 `causal_statements: list[dict]` 字段 + `to_dict()` 序列化；`explore()` 方法解包 `_explain_path` 的 tuple | ~10 |
| 2 | `frontend/src/pages/ExplorationPackagePage.tsx` | 删除 `CHINA_CAUSAL_STATEMENTS` 常量（~40 行）；从 API response 提取 `causal_statements` | ~5（净删除 35 行） |
| 3 | `frontend/src/App.tsx`（或 `ConnectionsExplainedPanel.tsx`） | `ConnectionExplained` 类型增加 `causal_statements?: CausalStatementData[]` | ~3 |

**关键不变**：5 个消费组件（`CausalStatementCard`、`GuidePanel`、`RelationshipChain`、`PackageJourney`、`resolveCausalForEdge`）接口不变。

---

## 4. Validation Framework

### 4.1 User Understanding

**验证问题**：Explorer 是否理解 CS 传达的三层信息？

| 层级 | Explorer 应该能回答 | 验证方式 |
| --- | --- | --- |
| **Why** | "为什么 A 导致了 B？"（mechanism） | Session Review：Explorer 口头复述 CS 机制 |
| **So What** | "B 产生了什么影响？"（consequence） | Session Review：Explorer 是否点击 consequence 区域 |
| **Trust** | "这个解释有多可信？"（confidence） | Session Review：Explorer 是否注意到 confidence 标识 |

**采集方法**：
- UserBehaviorEvent：`CS_CARD_VIEW` / `CS_MECHANISM_EXPAND` / `CS_CONSEQUENCE_EXPAND` / `CS_EVIDENCE_CLICK`
- Session Review：Explorer 口头复述（与 M81a 相同的定性方法）

### 4.2 Exploration Behavior Metrics

| 指标 | 定义 | 采集 | 基线（无 CS） | 目标（有 CS） |
| --- | --- | --- | --- | --- |
| **CS Card Click Rate** | 含 CS 的路径中，CausalStatementCard 被点击的比例 | `CS_CARD_CLICK` event | N/A（M81a 无 CS） | > 模板 reason 区域点击率 |
| **Continue Exploration Rate** | 看到 CS 后点击"继续探索"的比例 | `GUIDE_NEXT_CLICK` after `CS_CARD_VIEW` | M81a 基线（模板 reason 的 follow-through rate） | > 基线 +20% |
| **Exploration Depth** | 含 CS 路径的 visited 序列长度 | `visited_from_events` 序列长度 | M81a 平均深度 | ≥ 非 CS 路径深度 |
| **Session Duration** | 含 CS 的 session 时长 | Session start/end events | M81a 平均时长 | 不退化 |
| **Return Rate** | CS session 后 7 天内回访比例 | Cross-session visit pattern | M81a 回访率 | ≥ M81a 回访率 |

### 4.3 Content Validation

**原则**：不追求数量，追求质量。

| 验证问题 | 方法 |
| --- | --- |
| 5-10 条 CS 是否覆盖了 Explorer 的主要探索路径？ | 统计含 CS 的路径 vs 总路径比例 |
| CS 的 mechanism/consequence 是否被 Explorer 理解？ | Session Review 口头复述 |
| confidence 标识是否被 Explorer 注意到？ | Session Review + eye-tracking（如果有条件） |

**建议新增 CS 的选择标准**：
1. 覆盖中国包的剩余关键因果（如 秦制→郡县制、丝绸之路→文化交流）
2. 覆盖罗马包的开篇因果（如 罗马共和→罗马帝国）
3. 避免"为了凑数而加"——每条 CS 必须有 Explorer 可能遇到的路径支撑

---

## 5. Milestone Plan

### 5.1 M83.0 — Baseline Repair

```
Objective: 偿还 DEBT-001，修复数据管道
```

| 维度 | 内容 |
| --- | --- |
| **Input** | M82 committed baseline |
| **Backend** | `exploration_engine.py`：ExploredNode + causal_statements 字段，explore() 解包 _explain_path tuple |
| **Frontend** | `ExplorationPackagePage.tsx`：删除 CHINA_CAUSAL_STATEMENTS 常量，从 API 提取；`App.tsx`：ConnectionExplained 类型扩展 |
| **Dependency** | 无（M82 baseline 已就绪） |
| **Gate Criteria** | `CHINA_CAUSAL_STATEMENTS` 常量被删除；`/explore/{topic}` API 响应包含 `causal_statements`；5 个消费组件渲染正确 |

### 5.2 M83.1 — Validation Instrumentation

```
Objective: 部署 Explorer 行为采集
```

| 维度 | 内容 |
| --- | --- |
| **Input** | M83.0 Baseline Repair |
| **Backend** | 无（UserBehaviorEvent 是纯前端埋点） |
| **Frontend** | `UserBehaviorEvent.ts`：新增 CS_CARD_VIEW / CS_MECHANISM_EXPAND / CS_CONSEQUENCE_EXPAND / CS_EVIDENCE_CLICK / CS_GUIDE_NEXT 事件类型 |
| **Dependency** | M83.0 |
| **Gate Criteria** | 所有 CS 交互事件可采集；事件数据可导出用于 Session Review |

### 5.3 M83.2 — Content Supplement

```
Objective: 补充 5-10 条高质量 CS
```

| 维度 | 内容 |
| --- | --- |
| **Input** | M83.0 Baseline Repair |
| **Backend** | `data/causal_statements.json`：新增 5-10 条 CS（中国包 3-5 条 + 罗马包 2-3 条） |
| **Frontend** | 无（M83.0 的 API 管道自动支持新增 CS） |
| **Dependency** | M83.0（数据管道必须已修复） |
| **Gate Criteria** | 新增 CS 覆盖中国包关键缺失路径 + 罗马包开篇路径；每条 CS 有 Explorer 可能遇到的 KG 路径支撑 |

### 5.4 M83.3 — M81b Legacy Resolution

```
Objective: 解决 M81b-B（KG 中文化）+ M81b-D（跨包指针）
```

| 维度 | 内容 |
| --- | --- |
| **Input** | M82 baseline |
| **Backend** | KG 数据文件：罗马/丝路包实体名中文化；跨包指针评估（回填/删除/延后） |
| **Frontend** | 无（数据层变更，渲染层自动受益） |
| **Dependency** | 无（独立于因果层） |
| **Gate Criteria** | M81b-B：罗马/丝路包实体名可读；M81b-D：跨包指针决策记录 |

### 5.5 M83.4 — Explorer Validation Execution

```
Objective: 执行 Explorer 验证，采集行为数据
```

| 维度 | 内容 |
| --- | --- |
| **Input** | M83.0 + M83.1 + M83.2（至少需要修复后的数据管道 + 埋点 + 足够的 CS） |
| **Method** | 4-5 场 Explorer Session（与 M81a 相同的 Session Review 方法） |
| **Deliverables** | 每场 Session Observation Record；M83 Validation Report（汇总指标 + 定性分析） |
| **Dependency** | M83.0 + M83.1 + M83.2 |
| **Gate Criteria** | ≥3/4 Explorer 能复述 CS 机制；CS Card Click Rate > 模板 reason 点击率；Exploration Depth 不退化 |

### 5.6 M83.5 — Closure & M84 Decision

```
Objective: 基于验证结果，决定 M84 方向
```

| 维度 | 内容 |
| --- | --- |
| **Input** | M83.4 Validation Report |
| **Decision** | 如果验证通过 → M84 = Semantic Object Expansion（CausalStatement 独立 Object）; 如果验证失败 → M84 = Causal Presentation Redesign（重新设计因果呈现方式） |
| **Deliverables** | M83 Closure Report；M84 Entry Gate Review |
| **Gate Criteria** | M84 方向决策明确；M83 技术债清零 |

### 5.7 Milestone Dependency Graph

```
M83.0 (Baseline Repair) ──┬── M83.1 (Instrumentation)
                           │
                           ├── M83.2 (Content Supplement)
                           │
                           └── M83.3 (M81b Legacy) [可并行]
                                │
                                ▼
                           M83.4 (Validation Execution)
                                │
                                ▼
                           M83.5 (Closure & M84 Decision)
```

---

## 6. M84/M85 Decision Dependencies

### 6.1 M83 结果对 M84 的影响

M84 的定义是 "Semantic Object Expansion"——将 CausalStatement 升级为第五类 Exploration Object。

**但 M84 是否应该这样做，取决于 M83 的验证结果**：

| M83 验证结果 | M84 方向 | 理由 |
| --- | --- | --- |
| **PASS** — Explorer 理解并使用 CS | Semantic Object Expansion — CausalStatement 独立 Object（Detail Page/Search/Timeline） | 用户已验证因果解释有价值，扩展是合理的 |
| **PARTIAL** — Explorer 看到但未深度使用 | Causal Presentation Enhancement — 优化 CS 呈现方式（交互、视觉、叙事链），不急于独立 Object | 问题可能不是数据不够，而是呈现方式不够好 |
| **FAIL** — Explorer 忽略或困惑 | Causal Presentation Redesign — 重新设计因果信息的呈现方式，可能改变 CS Card 的结构或位置 | M82 的呈现假设可能需要修正 |

### 6.2 M83 结果对 M85 的影响

M85 的定义是 "Reasoning Exploration Engine"——引入 Multi-hop causal exploration + Causal Graph Index。

| M83 验证结果 | M85 方向 | 理由 |
| --- | --- | --- |
| **PASS** — 单跳因果被理解 | 引入 Multi-hop causal traversal + Explanation chain | 单跳因果已验证，多跳是自然扩展 |
| **PARTIAL/FAIL** — 单跳因果未被充分使用 | 延迟 Multi-hop，先解决单跳呈现问题 | 在单跳因果未被理解之前，多跳因果是过度设计 |

### 6.3 关键决策树

```
M83 Explorer Validation
    │
    ├── Explorer 使用 CS？
    │   ├── YES → M84 = CausalStatement 独立 Object
    │   │         M85 = Multi-hop Reasoning
    │   │
    │   └── NO  → M84 = Causal Presentation Redesign
    │              M85 = 重新评估（可能不引入 Multi-hop）
    │
    └── Explorer 理解 confidence？
        ├── YES → M84 可以引入 confidence-based filtering
        │
        └── NO  → M84 需要增强 confidence 的视觉呈现
```

---

## 7. Architecture Risks

| # | 风险 | 概率 | 影响 | 缓解 |
| --- | --- | --- | --- | --- |
| R1 | **ExploredNode 修复引入回归** — `explore()` 方法的 tuple 解包逻辑改动可能影响现有路径 | 低 | 现有 `explanation` 字段不变，`causal_statements` 是新增字段 | 已有 48 backend tests，M83.0 前跑全量 |
| R2 | **前端 API 消费路径不明确** — `ExplorationPackagePage` 当前不调用 `/explore/{topic}` API，而是通过 props 获取数据 | 中 | 需要确认 ExplorationPackagePage 的数据来源链路 | M83.0 前审计数据流 |
| R3 | **Explorer Validation 样本量不足** — 5 条 CS 只能覆盖 5 条 KG 路径，Explorer 可能遇不到 | 中 | 如果 Explorer 探索的路径碰不到 CS，验证无意义 | M83.2 补充 CS 时必须确保覆盖 Explorer 高频路径 |
| R4 | **M80.5 Revision 未合并** — P01/P02/P08 约束未正式生效 | 低 | M83 可以从 Proposal 文档中提取约束，不阻塞架构 | M83 启动前提取 P01/P02/P08 关键约束 |

---

## 8. M83 Implementation Plan — One Page

```
M83 — Explorer Validation

P0 (MUST):
  1. M83.0 — DEBT-001 偿还（ExploredNode + 前端硬编码删除）
  2. M83.1 — Validation Instrumentation（CS 行为埋点）
  3. M83.4 — Explorer Validation Execution（4-5 场 Session）

P1 (SHOULD):
  4. M83.2 — Content Supplement（5-10 条高质量 CS）
  5. M83.3 — M81b Legacy Resolution（中文化 + 跨包指针）

P2 (Deferred → M84/M85):
  - CausalStatement 独立 Object
  - Multi-hop Causal Exploration
  - Causal API Endpoint
  - AI Causal Generation

Gate Conditions:
  C1: CHINA_CAUSAL_STATEMENTS 常量已删除
  C2: 无新增 AI/LLM import
  C3: CausalStatement Schema 7 字段不变

Success Metrics:
  ≥3/4 Explorer 复述 CS 机制
  CS Card Click Rate > 模板 reason 点击率
  Exploration Depth 不退化
```

---

> 审查模式：只读
> 日期：2026-08-05
> 基线：M82 committed（3 commits on master）
> 状态：等待 PO Review
> 禁止进入代码实现阶段
