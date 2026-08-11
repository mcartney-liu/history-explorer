# M83 Scope Freeze Review

> **文档类型**：Governance Contract（非 Planning Document）
> **状态**：READY (Frozen)
> **阶段**：M83.0 Scope Freeze — M83 Implementation 前的最终边界冻结
> **模式**：严格只读 | **日期**：2026-08-05 | **基线**：M82 committed（3 commits）
> **前置审查**：M83 Architecture Gate / M83 Implementation Plan / M83 Architecture Acceptance / M83 Explorer Data Flow
>
> **命名说明**：文件名保持 `M83_SCOPE_FREEZE_REVIEW.md`（遵循项目 `*_REVIEW` / `*_GATE` / `*_FREEZE` 命名体系）。文档类型已升级为 Governance Contract。

---

## 1. DEBT-001 最终拆分

### 判定：正式拆分为两个独立工作项。

---

### DEBT-001A — Runtime Causal Delivery Completion

| 属性 | 内容 |
| --- | --- |
| **归类** | M83.0 — Runtime Bug Fix |
| **优先级** | P0 |
| **本质** | M82 P1.4/P1.5 的实现补全 — `explore() → ExploredNode` 路径在 M82 中被遗漏 |
| **不是** | 新 Feature / Schema 变更 / API 设计 |

**范围**：

| 允许 | 禁止 |
| --- | --- |
| `ExploredNode` 增加 `causal_statements: list[dict]` 字段 | 修改 `CausalStatement` Schema（7 字段） |
| `ExploredNode.to_dict()` 增加 `causal_statements` 序列化 | 修改 `_explain_path()` 返回签名 |
| `explore()` 方法正确解包 `_explain_path` 的 `tuple[str, list[dict]]` | 修改 `PathCandidate` |
| | 修改 `find_connections` API |
| | 修改 `Graph Core`（Entity / Relationship / Edge） |
| | 新增 AI/LLM import |
| | 新增 CausalStatement 字段 |

**变更量**：1 file（`exploration_engine.py`），~7 行。

---

### DEBT-001B — Package Data Governance

| 属性 | 内容 |
| --- | --- |
| **归类** | M83.0b — Data Governance |
| **优先级** | P0 |
| **本质** | 消除 `CHINA_CAUSAL_STATEMENTS` 与 `data/causal_statements.json` 的数据重复 — 建立 Single Source of Truth |
| **不是** | Semantic Expansion / API Integration / Package 架构变更 |

**工作归属判定**：

| 判定 | 结论 | 理由 |
| --- | --- | --- |
| 是否属于 M83.x？ | ✅ **是** | 数据治理（Duplicate Data Elimination）是 Data Integrity 问题，不是功能扩展。不需要等 M84 Semantic Expansion |
| 是否属于 M84？ | ❌ 否 | M84 = Semantic Object Expansion（独立 Object / Search / Timeline），这是**能力建设**。消除重复数据是**数据卫生** |
| 是否与 Semantic Expansion 耦合？ | ❌ 否 | Package 只需引用同一份 JSON 文件 — 不依赖 CausalStatement 成为独立 Object，不依赖 Causal API |

**范围**：

| 允许 | 禁止 |
| --- | --- |
| 将 `CHINA_CAUSAL_STATEMENTS` 的数据来源从硬编码改为 import `data/causal_statements.json` | 让 Package 调用 `/explore/{gid}` API |
| 通过 build step 或直接 import 引用后端数据源 | 修改 `ExplorationPackage` 接口 |
| | 修改 Package 的静态体验特性 |
| | 新增 API Endpoint |

**变更量**：1 file（`ExplorationPackagePage.tsx`），~5 行（import + 变量替换）。

---

### DEBT-001 完整画像

```
DEBT-001 原始描述（M82 Phase 2）：
  "Frontend hardcoded CausalStatement data → 迁移到 API"

问题被过度简化了。

实际包含两个独立问题：
  ├── DEBT-001A：Runtime Explorer 的 API 未返回 causal_statements（Backend Bug）
  └── DEBT-001B：Package Experience 维护了第二份 CS 数据（Data Duplication）

两者性质不同、范围不同、互不阻塞。
应拆分为两个独立工作项，在 M83 内分步完成。
```

---

## 2. Runtime 与 Package 的长期关系

### 判定：长期共存，两个独立数据入口。

### 2.1 产品定位

| 维度 | Runtime Explorer | Static Package Experience |
| --- | --- | --- |
| **产品模式** | 自由探索 — 用户输入 topic → 系统动态生成路径 | 策划探索 — 内容编辑预先编排路径 |
| **数据入口** | `/explore/{gid}` API → `explore()` → `ExploredNode` | `getPackageBySlug(slug)` → `exploration_packages.json`（编译时静态） |
| **CausalStatement 数据源** | Backend `data/causal_statements.json` → API → Runtime | Backend `data/causal_statements.json` → 直接 import（DEBT-001B 后） |
| **体验特性** | 动态、不确定、可发现性高 | 稳定、可预测、叙事性强 |
| **渲染入口** | `App.tsx` → `current !== null` | `App.tsx` → `!current && packageSlug` |
| **互斥性** | 同一时间只显示一个 | 同上 |

### 2.2 长期共存理由

1. **两个模式解决不同的用户需求** — Runtime 回答 "我想探索 X"，Package 回答 "请带我了解 Y"
2. **Package 的静态特性是产品优势，不是技术债** — 策划路径需要稳定性和可预测性，API 的动态性反而削弱这一优势
3. **两个模式的数据源最终统一**（DEBT-001B 后）— 都引用 `causal_statements.json`，但通过不同通道获取
4. **不需要在未来合并** — 这是产品架构的两个独立分支，类似 Wikipedia 的 "搜索" 和 "特色条目"

### 2.3 对 M83 的影响

- M83 不尝试统一两条数据流
- DEBT-001A 只修复 Runtime 路径
- DEBT-001B 只消除 Package 的重复数据
- 两条路径在 M83 中独立演化

---

## 3. M83.0 Freeze Boundary

### 3.1 Allowed（M83.0 允许）

| # | 文件 | 操作 | 归类 |
| --- | --- | --- | --- |
| A1 | `backend/app/core/exploration_engine.py` L156-175 | `ExploredNode` 增加 `causal_statements: list[dict] = field(default_factory=list)` | DEBT-001A |
| A2 | `backend/app/core/exploration_engine.py` L150-155 | `ExploredNode.to_dict()` 增加 `causal_statements` 序列化（空数组时不输出，与 PathCandidate.to_dict() 行为一致） | DEBT-001A |
| A3 | `backend/app/core/exploration_engine.py` L514 | `explore()` 解包 `_explain_path` 的 tuple | DEBT-001A |
| A4 | `backend/tests/test_m82_p1_8_final_validation.py` | 新增 4 个 API Contract 测试（BT-1 to BT-4） | DEBT-001A 测试 |

### 3.2 Forbidden（M83.0 禁止）

| # | 模块/文件 | 禁止原因 |
| --- | --- | --- |
| F1 | `backend/app/core/causal/model.py` | CausalStatement Schema — M82 Frozen（C-7） |
| F2 | `backend/app/core/causal/` 包内（除 model.py） | Semantic Layer — M82 Frozen（C-4/C-5/C-6） |
| F3 | `backend/app/core/graph.py` | Graph Core — M82 Frozen（C-1/C-2） |
| F4 | `backend/app/core/exploration_engine.py` L730-770 | `_explain_path()` 签名 — 返回 `tuple[str, list[dict]]` 不变 |
| F5 | `backend/app/core/exploration_engine.py` L132-152 | `PathCandidate` — 已正确，不动 |
| F6 | `backend/app/core/exploration_engine.py` `find_connections()` | 已正确解包 tuple，不动 |
| F7 | `frontend/src/pages/ExplorationPackagePage.tsx` | DEBT-001B 范围，不在 M83.0 中 |
| F8 | `frontend/src/components/causal/CausalStatementCard.tsx` | 消费组件，接口不变 |
| F9 | `frontend/src/components/guide/GuidePanel.tsx` | 消费组件，接口不变 |
| F10 | `frontend/src/components/package/RelationshipChain.tsx` | 消费组件，接口不变 |
| F11 | `frontend/src/data/explorationGuide.ts` | 数据层，接口不变 |
| F12 | `frontend/src/App.tsx` | DEBT-001B 依赖确认，M83.0 不动 |
| F13 | `data/causal_statements.json` | 数据源，DEBT-001B 时才引用 |
| **F14** | **`ExploredNode` 新增其他字段** | **此次仅允许 `causal_statements` 一个字段。禁止新增 `confidence` / `reason` / `trust` / `explanation` / `source_count` 或任何其他 Runtime Model 字段** |

### 3.3 Future（M83.0b / M83.1 / M84 / M85）

| # | 工作 | 归属 | 理由 |
| --- | --- | --- | --- |
| FU1 | DEBT-001B — Package Data Governance | **M83.0b** | 数据治理，非 Semantic Expansion |
| FU2 | Explorer Validation Instrumentation（埋点） | **M83.1** | 依赖 M83.0 完成 |
| FU3 | Content Supplement（5-10 条高质量 CS） | **M83.2** | 依赖 DEBT-001B（Package 侧的数据源统一后才能验证新增 CS） |
| FU4 | M81b Legacy Resolution（中文化 + 跨包指针） | **M83.3** | 独立于因果层，可与 M83.0-M83.2 并行 |
| FU5 | Explorer Validation Execution（4-5 场 Session） | **M83.4** | 依赖 M83.1 + M83.2 |
| FU6 | M83 Closure & M84 Decision | **M83.5** | 依赖 M83.4 |
| FU7 | CausalStatement 独立 Object | **M84** | Semantic Expansion |
| FU8 | Multi-hop Causal Exploration | **M85** | Reasoning Engine |
| FU9 | Causal API Endpoint | **M84** | 需要 CausalStatement 独立 Object 驱动 |
| FU10 | AI Causal Generation | **M83.5+** | 需 PO 决策是否引入 AI |

---

## 4. Dependency Graph

```
                    M82 Baseline (Committed)
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
         M83.0          M83.3       [等待]
    DEBT-001A      M81b Legacy
   (Backend Only)  (可并行)
              │
              ▼
         M83.0b
    DEBT-001B
   (Package Data Gov)
              │
              ▼
         M83.1
   Validation Instrumentation
              │
              ▼
         M83.2
   Content Supplement
   (5-10 条高质量 CS)
              │
              ▼
         M83.4
   Explorer Validation
   (4-5 场 Session)
              │
              ▼
         M83.5
   Closure & M84 Decision
```

**并行说明**：
- M83.3（M81b Legacy）可与 M83.0-M83.2 并行，因为它是纯数据工作，不涉及因果层
- M83.0b 必须在 M83.0 之后 — DEBT-001B 引用后端 JSON，但不需要等 M83.0 的 ExploredNode 修复完成（Package 不消费 API）

---

## 5. Final Verdict

```
READY (Frozen)
```

`READY` = 可以开发。
`Frozen` = 开发过程中不再讨论 Scope。本文件是 M83 全阶段的唯一范围依据。

**无 Architecture Condition。**

M83.0 的边界已完全冻结：
- 1 file（`exploration_engine.py`），~7 行变更
- 4 个新增 backend tests
- 8/8 M82 Freeze 合规
- 不触及 Schema / Graph Core / Semantic Layer / AI

**无 Implementation Condition。**

DEBT-001A 是纯粹的 bug fix — 将 M82 P1.4/P1.5 已实现的能力（`_explain_path` 返回 cs_list）补全到 `explore()` 路径。不存在未知依赖或待确认前提。

---

## 6. Out of Scope（M83 绝对不做）

以下工作在 M83 全阶段（M83.0 → M83.5）均不在范围内。如需引入，须通过正式的 Scope Change Proposal 修订本文档。

| # | 工作 | 归属 | 理由 |
| --- | --- | --- | --- |
| O1 | Multi-hop Causal Exploration | M85 | 数据量不足（需要链式 CS），M83 仅验证单跳因果 |
| O2 | CausalStatement 独立 Object（Detail Page / Search / Timeline / Graph） | M84 | 需要 ≥50 条 CS + 多包覆盖，M83 数据量 5-10 条 |
| O3 | Causal API Endpoint（`GET /causal/...`） | M84 | 当前 PathCandidate 通道已覆盖消费场景 |
| O4 | CausalStatement 写入 Graph Edge | 永久不做 | 违反 ADR-M79/M82 — CausalStatement 是独立 Semantic Layer |
| O5 | AI 生成 CausalStatement | M83.5+ | 违反 M82 Freeze C-6 — 需 PO 决策是否引入 AI |
| O6 | Confidence 升级（enum → float / 多层） | 永久不做 | C-7 约束 — confidence = curator assessment enum string |
| O7 | Provenance UI（SourceChain 嵌入 CS Card） | M84+ | 当前 evidence_refs 通过已有 SourceChain API 间接展示 |
| O8 | Reasoning Engine | M85 | 需要 Multi-hop + Causal Graph Index 作为前提 |
| O9 | Semantic Layer Expansion（新 Schema 字段 / 新数据类型） | M84 | M82 Frozen Schema（7 字段）在 M83 全程不动 |
| O10 | Runtime 与 Package 数据流合并 | 永久不做 | 两个产品模式长期共存，各自独立数据入口 |
| O11 | ExploredNode 新增除 `causal_statements` 外的任何字段 | 永久不做 | Runtime Model 膨胀预防 — 参见 §3.2 F14 |

---

## 7. M83 Scope Baseline 声明

**本文档（`M83_SCOPE_FREEZE_REVIEW.md`）是 M83 全阶段的唯一范围基线（Scope Baseline）。**

| 规则 | 内容 |
| --- | --- |
| **范围引用** | M83 的代码评审、实现评审、验收，均以本文档的 Allowed / Forbidden / Out of Scope 三张表为唯一依据 |
| **不再回到** | M83 Architecture Gate Review / M83 Implementation Plan Review / M83 Architecture Acceptance Review 中的范围讨论 — 这些是前置规划，本文档是最终冻结 |
| **Scope Change** | 如需新增本文档未列出的工作，须通过正式的 Scope Change Proposal（修订本文档 + PO 签核） |
| **优先级排序** | 本文档不改变 M83.0 → M83.5 的执行顺序（§4 Dependency Graph），仅冻结边界 |

---

## 8. M83 全量路线图（冻结后）

---

## 6. M83 全量路线图（冻结后）

| 阶段 | 工作 | 文件数 | 变更量 | 类型 |
| --- | --- | --- | --- | --- |
| **M83.0** | DEBT-001A — Runtime Delivery | 2（1 backend + 1 test） | ~7 行代码 + 4 tests | Bug Fix |
| **M83.0b** | DEBT-001B — Package Data Gov | 1（frontend） | ~5 行 | Data Gov |
| **M83.1** | Validation Instrumentation | 1（UserBehaviorEvent.ts） | ~15 行 | Instrumentation |
| **M83.2** | Content Supplement | 1（causal_statements.json） | 5-10 条 CS | Content |
| **M83.3** | M81b Legacy | KG 数据文件 | TBD | Content |
| **M83.4** | Explorer Validation | 0（Session Review） | - | Validation |
| **M83.5** | Closure & M84 Decision | 文档 | - | Governance |

**M83 总代码变更量（预测）**：~30 行 + 5-10 条 CS 数据。

---

## 9. Scope Change Protocol

### 9.1 允许修改 Scope 的唯一条件

以下三种情况可以启动 Scope Change：

| # | 条件 | 说明 | 示例 |
| --- | --- | --- | --- |
| 1 | **Implementation Defect** | 发现已提交代码与 Scope Freeze 不一致 | ExploredNode 遗漏了某个 M82 已有字段 |
| 2 | **Architecture Defect** | 发现架构约束与已提交 Baseline 冲突（非产品需求变化） | Freeze Boundary 错误地将必要修复标记为 Forbidden |
| 3 | **Baseline Conflict** | 发现 Freeze Boundary 与已提交 Baseline 不一致 | Allowed 列表遗漏了某个必须修改的依赖文件 |

### 9.2 不接受的 Scope Change 理由

以下理由一律拒绝，相关工作进入 Future Milestone：

| 拒绝理由 | 处理方式 |
| --- | --- |
| "这里顺便改一下"（体验优化） | → 进入 M83.5 Closure 的 M84 建议列表 |
| "用户可能想要..."（功能建议） | → 进入 Future Milestone Backlog |
| "这样设计更优雅"（架构重构） | → 进入 M84 Architecture Gate |
| "先加个字段备用"（产品创意） | → 进入 Future Milestone Backlog |
| "M82 的时候就应该..."（事后聪明） | → 如果确实遗漏且属于 Implementation Defect，走条件 1；否则拒绝 |

### 9.3 Scope Change 流程

```
提出 Scope Change
    ↓
判断是否符合 3 个允许条件
    ↓
    ├── 不符合 → 拒绝，归入 Future Milestone
    │
    └── 符合 → 修订本文档 + PO 签核
                  ↓
              更新 Scope Baseline
                  ↓
              通知所有 Reviewer
```

---

## 10. Baseline References

M83 全阶段唯一有效的治理文档引用：

### 10.1 Architecture Baseline

| 文档 | 用途 | 状态 |
| --- | --- | --- |
| `ADR-M79-SEMANTIC-LAYER.md` | Semantic Layer 架构决策 | 🔒 Frozen |
| `ADR-M82-CAUSAL-SEMANTIC-LAYER.md` | CausalStatement 架构决策 | 🔒 Frozen |
| `M82_FINAL_GATE_REPORT.md` | M82 最终闸门（8/8 约束） | 🔒 Frozen |
| `M82_FINAL_CLOSE_REVIEW.md` | M82 关闭审查 | 🔒 Frozen |
| `M82_SCOPE_FREEZE_REVIEW.md` | M82 Scope Baseline | 🔒 Frozen（已过期，M83 引用 M82 Baseline 时使用） |

### 10.2 M83 Scope（唯一有效）

| 文档 | 用途 | 状态 |
| --- | --- | --- |
| **`M83_SCOPE_FREEZE_REVIEW.md`** | **M83 全阶段唯一 Scope Baseline** | ✅ Active（本文档） |

### 10.3 M83 前置审查（仅参考，不作为 Scope 依据）

| 文档 | 用途 | 状态 |
| --- | --- | --- |
| `M83_ARCHITECTURE_GATE_REVIEW.md` | M83 架构 Gate 审查 | 📄 已归档 — 决策已纳入本文档 |
| `M83_IMPLEMENTATION_PLAN_REVIEW.md` | M83 实施计划设计 | 📄 已归档 — 计划已纳入本文档 §8 |
| `M83_ARCHITECTURE_ACCEPTANCE_REVIEW.md` | ExploredNode 问题分类 | 📄 已归档 — 结论已纳入 DEBT-001A |
| `M83_EXPLORER_DATAFLOW_REVIEW.md` | Runtime/Package 数据流审查 | 📄 已归档 — 结论已纳入 §2 |

### 10.4 引用规则

```
M83 代码评审 → 引用本文档 §3（Freeze Boundary）
M83 实现评审 → 引用本文档 §6（Out of Scope）
M83 验收     → 引用本文档 §3 + §6 + §7（Scope Baseline）
M83 Scope 争议 → 引用本文档 §9（Scope Change Protocol）

不要回到 M83 Architecture Gate / Implementation Plan / Architecture Acceptance 中重新讨论范围。
```

---

## 11. Freeze Lifetime

### 11.1 有效期

```
本 Scope Baseline 有效期：

  M83 Start ──────────────────────→ M83 Close

  M84 开始后：本文档自动失效。
  M84 将重新建立 Scope Baseline。
```

### 11.2 失效后的处理

| 场景 | 处理 |
| --- | --- |
| M84 启动 | M84 从本文档的 §8（路线图）中提取 M84 方向建议，但不继承本文档的 Allowed / Forbidden / Out of Scope |
| M83 中发现的遗留问题 | 在 M83.5 Closure 中记录，进入 M84 Entry Gate |
| M84 Scope 制定 | 以 M83.5 Closure 为输入，重新建立 M84 Scope Baseline |

---

## 12. 文档定位

本文档不是 Planning Document，而是 **Governance Contract（治理契约）**。

| 属性 | 值 |
| --- | --- |
| **文档类型** | Governance Contract（非 Planning） |
| **作用域** | M83 全阶段（M83.0 → M83.5） |
| **约束力** | M83 代码评审 / 实现评审 / 验收的唯一范围依据 |
| **修订条件** | 仅限 §9 Scope Change Protocol 定义的 3 种情况 |
| **有效期** | M83 Start → M83 Close（M84 启动后自动失效） |

---

## 13. Authority（文档优先级与仲裁规则）

### 13.1 优先级规则

当 M83 相关文档之间发生冲突时：

| 优先级 | 文档 | 说明 |
| --- | --- | --- |
| **1（最高）** | M82 Frozen Baseline（ADR-M79 / ADR-M82 / M82 Final Gate） | 架构约束不可被 M83 文档覆盖 |
| **2** | **本文档（M83 Governance Contract）** | M83 Scope 的唯一有效依据 |
| **3** | M83 前置审查文档（Architecture Gate / Implementation Plan / Acceptance / Data Flow） | 仅参考，不作为 Scope 依据 |

### 13.2 仲裁规则

| 场景 | 规则 |
| --- | --- |
| **M83 内部文档冲突** | 若 M83 前置审查文档与本文档冲突 → **以本文档为准** |
| **M83 与 M82 Baseline 冲突** | 若本文档与 M82 Frozen Baseline 冲突 → **必须先修订 Baseline，不得直接修改实现** |
| **Implementation 与 Scope 冲突** | 若已提交代码与本文档的 Allowed / Forbidden 不一致 → 走 §9 Scope Change Protocol（Implementation Defect） |
| **Review 意见冲突** | 若不同 Reviewer 引用不同文档得出不同结论 → **以本文档的 §10 Baseline References 为准** |

### 13.3 简洁版本

```
发生冲突时：

  其它 M83 文档 ≠ 本文档 → 以本文档为准
  本文档 ≠ M82 Baseline  → 先修订 Baseline，再修订本文档
```

---

> 审查模式：只读 | M83 Scope Freeze 完成 | 状态：FROZEN（不再修订） | 本文档为 M83 Governance Contract | 本文档是 `docs/governance/MILESTONE_GOVERNANCE_TEMPLATE.md` 的来源（Origin） | 后续治理体系演进请修改模板，不再修改本文档
