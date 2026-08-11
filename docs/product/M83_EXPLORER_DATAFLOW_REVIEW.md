# M83 Explorer Data Flow Review

> **阶段**：M83.0 Explorer Data Flow Review
> **模式**：严格只读 | **日期**：2026-08-05 | **基线**：M82 committed

---

## 问题 1：ExplorationPackagePage 属于 Runtime Explorer 还是 Static Package Experience？

**答案：Static Package Experience。**

| 证据 | 内容 |
| --- | --- |
| 数据来源 | `getPackageBySlug(slug)` → `explorationPackages.ts` → `import registry from "../../../data/exploration_packages.json"` — 编译时静态 JSON |
| API 调用 | **零** — 文件中无 `fetch`/`axios`/`XMLHttpRequest` |
| 切换条件 | `!current && packageSlug`（无活跃 topic 且 hash 匹配 package slug） |
| 与 Runtime Explorer 的关系 | **互斥** — 同一时间只显示一个（`current` 非空 → Runtime；`current === null && packageSlug` → Package；否则 → Discover） |

**ExplorationPackagePage 不调用 `/explore/{gid}` API。** 它是一个独立的静态体验——所有数据在构建时从 JSON 打包，运行时仅读取内存对象。

---

## 问题 2：未来是否计划让 Package 直接消费 `/explore/{gid}` API？

**目前没有这个计划。** 理由：

1. `ExplorationPackage` 接口（`explorationPackages.ts` L55-68）不含任何 API 相关字段 — 只有静态引用（`entity_references`、`relationship_paths`、`source_references`）
2. `getPackageBySlug()` 的实现是纯内存查找（`.find()`），没有异步 fetch
3. M69 的 Package 设计文档将 Package 定义为 "curated exploration path"（策划探索路径），而非动态 API 消费
4. 没有 M83/M84 路线图中提到 "Package → API" 迁移

**Package 和 Runtime Explorer 是两个长期并存的产品模式：**
- Runtime Explorer = 自由探索（用户输入 topic → 系统动态生成路径）
- Package = 策划探索（内容编辑预先编排好的路径，静态可靠）

---

## 问题 3：如果保持静态 Package，CausalStatement 的正确数据归属是什么？

### 3.1 当前状态

```
data/causal_statements.json       ← Backend 数据源（5 条 CS）
                                      ↑
                                      │ 重复
                                      ↓
CHINA_CAUSAL_STATEMENTS            ← Frontend 硬编码副本（5 条 CS）
  ↓
ExplorationPackagePage.tsx
  ↓
GuidePanel / RelationshipChain
```

### 3.2 分析

CausalStatement 的归属取决于它的消费场景：

| 消费场景 | 当前实现 | 数据来源 |
| --- | --- | --- |
| Package Experience（GuidePanel / RelationshipChain） | ✅ 已实现 | `CHINA_CAUSAL_STATEMENTS` 硬编码 |
| Runtime Explorer（App.tsx → 各 Panel） | ❌ 未实现 | N/A — `App.tsx` 中无 causal 代码 |

**CausalStatement 的消费完全发生在 Package Experience 中，而 Package Experience 是静态的。**

### 3.3 三种归属方案

| 方案 | 数据归属 | 优点 | 缺点 |
| --- | --- | --- | --- |
| **方案 1**：CS 归属 Package 数据层 | 将 `causal_statements` 字段加入 `ExplorationPackage` 接口，写入 `exploration_packages.json` | 数据与消费场景同源；不引入 API 依赖；保持 Package 的静态可靠性 | CS 与后端 `causal_statements.json` 重复 — 双重数据源 |
| **方案 2**：CS 归属 Backend API（当前 M83.0 方案 X） | 通过 `App.tsx` 从 `/explore/{gid}` 响应中提取 `causal_statements`，传递给 ExplorationPackagePage | 单一数据源（`causal_statements.json`）；后端是 truth | **问题**：Package 不调用 `/explore/{gid}` API — `App.tsx` 只有在 Runtime Explorer 路径下才调用 API |
| **方案 3**：CS 作为独立静态数据层 | CS 保持为独立的静态 JSON 文件，Package 直接 import | 单一数据源（`causal_statements.json`）；Package 保持静态；前端直接 import JSON | 需要前端能 import 后端 data 目录的 JSON（可能需要构建配置） |

### 3.4 关键洞察

**方案 2（M83.0 当前方案）有一个根本问题**：

`App.tsx` 中的 `fetchNode()` 只在 Runtime Explorer 路径（`current !== null`）下调用 API。当用户进入 Package 体验时，`current === null`，`fetchNode()` 不会执行，因此 `App.tsx` 中没有可用的 `result`（`ExplorationResult | null` = `null`）。

即使修复了 `ExploredNode`，**Package 体验中也拿不到 causal_statements**，因为 Package 的渲染不经过 API 调用路径。

---

## 问题 4：M83.0 是否应该只修 Runtime，不修改 Package？

**是。** 基于以上分析：

### 4.1 应该做什么

| 路径 | 操作 | 理由 |
| --- | --- | --- |
| **Runtime Explorer**（`explore()` → `ExploredNode`） | ✅ 修复 — 增加 `causal_statements` 字段 + `explore()` 解包 tuple | 这是 M82 P1.4/P1.5 的实现补全。Runtime Explorer 是 M82 架构设计的目标路径 |
| **Package Experience**（`CHINA_CAUSAL_STATEMENTS`） | ❌ 不动 — 保持硬编码 | Package 是静态体验，不与 API 交互。强制 Package 消费 API 违反 Package 的静态设计原则 |

### 4.2 为什么 Package 硬编码可以继续保留

1. **Package 的 5 条 CS 与后端 `causal_statements.json` 完全一致** — 数据同步不是问题
2. **Package 的 CS 消费已经验证通过**（CausalStatementCard / GuidePanel / RelationshipChain 渲染正确）
3. **M83.2（Content Supplement）新增 CS 时，可以同步更新 Package 硬编码和后端 JSON** — 这是合理的策划工作流
4. **Package 最终可以迁移到方案 3**（直接 import `causal_statements.json`），但这不是 M83 的优先级

### 4.3 DEBT-001 的重新定义

```
原始 DEBT-001：
  "Frontend hardcoded CausalStatement data → 迁移到 API"

修订后 DEBT-001：
  Part A（M83.0 Runtime）：
    ExploredNode + causal_statements + explore() 解包 tuple
    → 让 Runtime Explorer 的 API 返回 causal_statements
    → 为未来 Runtime Explorer 消费 CS 铺路

  Part B（M83.x Package）：
    Package 保持静态 — 硬编码 CS 不删除
    → 当 CausalStatement 数据扩展到 20+ 条且覆盖 3+ 包时，再评估是否迁移
    → 迁移方案：Package 直接 import 后端的 causal_statements.json
```

---

## 5. 修正后的数据流全景

### Runtime Explorer（修复后）

```
GET /explore/{topic}
  ↓
explore() → ExploredNode ✅ 含 causal_statements
  ↓
App.tsx → ExplorationResult
  ↓
各 Panel（未来可消费 CS）
```

### Package Experience（不变）

```
getPackageBySlug(slug)
  ↓
exploration_packages.json（静态）
  ↓
CHINA_CAUSAL_STATEMENTS（硬编码，与后端 JSON 同步）
  ↓
GuidePanel / RelationshipChain
```

### 长期目标（M84+）

```
data/causal_statements.json  ← Single Source of Truth
  ↓                            ↓
Backend API                 Frontend import
(Runtime Explorer)          (Package Experience)
```

---

## 6. 对 M83.0 计划的影响

### M83.0 范围修订

| 原计划 | 修订后 | 理由 |
| --- | --- | --- |
| `ExploredNode` + `causal_statements` | ✅ 保持 | Runtime Explorer 的 bug fix |
| `explore()` 解包 tuple | ✅ 保持 | 同上 |
| 删除 `CHINA_CAUSAL_STATEMENTS` | ❌ **撤回** | Package 是静态体验，硬编码可接受 |
| `App.tsx` 传递 `causalStatements` | ❌ **撤回** | App.tsx 在 Package 模式下不调用 API，没有数据可传 |
| `ExplorationPackagePage` 从 props 获取 | ❌ **撤回** | 保持硬编码 |

### M83.0 最终范围

```
M83.0 Causal Delivery Pipeline Completion（修订）

Backend Only:
  ExploredNode + causal_statements: list[dict]    ← +1 行
  ExploredNode.to_dict() + causal_statements       ← +3 行
  explore() 解包 _explain_path tuple               ← +3 行

变更量：1 file, ~7 行
测试：4 new backend tests（BT-1 to BT-4）

Frontend: 不变
```

### DEBT-001 状态

```
M82-P2-DEBT-001 → 部分偿还（Runtime Explorer 路径已修复）
M83-Package-DEBT → 新建（Package 硬编码 CS 保留，M84+ 迁移）
```

---

## 7. Verdict

```
M83.0 = Backend Only
```

| 维度 | 原 M83.0 计划 | 修订后 |
| --- | --- | --- |
| Backend 变更 | `exploration_engine.py` ~8 行 | `exploration_engine.py` ~7 行 |
| Frontend 变更 | 4 files, ~40 行 | **0 files, 0 行** |
| 删除硬编码 | ✅ 计划 | ❌ 撤回 |
| 新增测试 | 8（4 backend + 4 frontend） | 4（backend only） |
| Freeze 合规 | 8/8 | 8/8 |

**ExplorationPackagePage 硬编码不删除。M83.0 仅修复 Runtime Explorer 的后端数据管道。**

---

> 审查模式：只读 | 等待 PO Review | 禁止进入 Implementation
