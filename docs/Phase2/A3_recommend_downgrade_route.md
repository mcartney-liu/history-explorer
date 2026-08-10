# A3 — recommend_next 降级路线

> 工作包 A（红线解耦前置）· FRW Phase 2（Experience Architecture）
> 裁决锚点：**ADR-0015 D1**（recommend_next 降级为内部候选生成器；下线公开端点；上层 ExplorationPolicy 筛选映射为 ExplorationAction）
> 关联文档：A1_exploration_policy_contract.md · A2_exploration_action_contract.md

---

## 1. 现状与红线冲突回顾（只读验证）

| 冲突 | 位置 | 性质 |
| --- | --- | --- |
| C-01 | `backend/app/core/exploration_engine.py:559` `recommend_next()` 三处实现（含公开端点）违反 M88.0 §8.3 | 图相似度口径 + recommendation 命名 |
| C-02 | 上位文档 Next Node 与 M88.0 禁止 Recommendation 直接对撞 | 命名/语义红线 |
| 端点 | `backend/app/main.py:410`（v1）+ `:448`（legacy 双路由）+ handler `:255` | 公开 `/recommendations` 暴露 |
| 委托 | `backend/app/core/knowledge_service.py:434` `recommend_next()` 纯委托 | 暴露链路 |
| 内核 | `exploration_engine.py:594-624` 四权重打分；`:619-620` `seen` 节点 `diversity=0.2` 仍入候选 | 保留（不应改） |
| 测试 | `backend/tests/test_recommend.py`（15 项）锁定 `recommend_next()` 行为 | **冻结，不删** |

---

## 2. 降级原则（ADR-0015 D1）

1. `recommend_next()` → **内部候选生成器**：不对外、不称 recommendation，仅作确定性候选源。
2. **下线** `GET /entity/{id}/recommendations` 公开端点（v1 + legacy 双路由一并移除）。
3. 上层由 **ExplorationPolicy（A1）** 基于认知缺口筛选，映射为 **ExplorationAction（A2）** 对外。
4. **保留算法内核与 15 测试**，仅改命名与暴露方式（不改打分逻辑）。
5. 不修订上位文档、不动 `/api/v1` 冻结契约（CURRENT_ARCHITECTURE_BASELINE：M74 信任体验冻结）。

---

## 3. 目标架构流向

```
[理解投影 / Memory 投影]
        │  (输入 ExplorationState，既有 runtime)
        ▼
┌─────────────────────────────┐
│ ExplorationPolicy (A1)       │  前端 runtime 已存在
│ evaluateExploration(state)  │  coverageRatio / missingDimensions /
│  → Decision<ExplorationAction>│ missingConnections 驱动，RuleTrace 可审计
└──────────────┬──────────────┘
               │  output: ExplorationAction (A2)
               ▼
       前端「下一步」触点（B 包）
       （无 backend 端点参与）

[后端 recommend_next() 降级后]
   generate_candidates()  ← 内部候选生成器（仅重命名，内核保留）
   不再经 main.py 暴露；15 测试仍覆盖其行为
```

> 关键：Phase 2 的「下一步」由**前端 ExplorationPolicy**（已实现于 `frontend/src/next/exploration/`）直接产出，
> 后端候选生成器退为内部工具，不对外提供 recommendation 端点。

---

## 4. 分步可逆迁移步骤

> 每一步均为小粒度 diff，可独立回滚；全部在特性分支进行，不动 `main` 冻结契约。

### 阶段一：后端（仅命名与暴露，不改内核）

**S1. 重命名内部函数（保留内核）**
- `exploration_engine.py:559` `recommend_next` → `generate_candidates`（函数体/四权重/`:619-620` 行为**原样保留**）。
- `knowledge_service.py:434` 同步重命名委托。

**S2. 收敛 15 测试引用（不删、不改断言）**
- `backend/tests/test_recommend.py`：将测试中对 `recommend_next` 的引用改为 `generate_candidates`，断言与权重常量**保持不变**（满足「保留 15 测试」）。

**S3. 移除公开端点（下线）**
- `main.py:255` `recommendations` handler → 删除。
- `main.py:410` v1 路由 `/entity/{entity_id}/recommendations` → 删除。
- `main.py:448` legacy 路由 → 删除。
- 不新增替代路由（替代由前端 ExplorationPolicy 承担，见 §3）。

**S4. 回滚保障**
- 上述改动均有 git diff，回滚即 `git revert` 单文件；无数据库/契约删除。

### 阶段二：前端（调用点收敛，呼应 P1-05 §6 硬约束 1）

**S5. 新增 NextStepPanel（消费 A2）**
- 新建 `frontend/src/components/NextStepPanel.tsx`：调用既有 `evaluateExploration(ExplorationState)` → `ExplorationDecision`（A2 §2），渲染「下一步探索」卡片（文案禁「推荐」）。
- 复用既有 `openNode` 导航模式（无需新端点）。

**S6. 替换旧组件引用**（详见 §5 收敛清单）
- `App.tsx:18 / :1336`、`CompanionRouter.tsx:16 / :88`：`RecommendationPanel` → `NextStepPanel`。
- `ExplorationJourney.tsx:19`：`RelationPathStep` 类型改从新模块导入（或随旧组件移除）。

**S7. 删除/归档旧组件与测试**
- `RecommendationPanel.tsx` 及 `RecommendationPanel.test.tsx` 随替换完成归档（保留历史于 git）。
- `ExplorationJourney.test.tsx` 中对 `RecommendationPanelView` 的导入改指向新组件测试。

**S8. 文案 key 去 recommendation**
- `locales/zh/entity.ts:8`、`locales/zh/discover.ts:17-20`：`recommend*` → `next*` / `nextStep*`（禁「推荐」）。

---

## 5. 前端调用点收敛清单（P1-05 §6 硬约束 1）

> **硬约束 1**：裁决落地前不得为旧端点设计新呈现。以下为旧端点下线后**必须收敛**的遗留调用点。

### 5.1 组件引用

| 文件:行号 | 内容 | 处置 |
| --- | --- | --- |
| `frontend/src/App.tsx:18` | `import RecommendationPanel from './components/RecommendationPanel'` | 改为 `NextStepPanel` |
| `frontend/src/App.tsx:1336` | `<RecommendationPanel entityId={current.id} seenGlobalIds={...} max={5} onNodeClick={...} />` | 改为 `<NextStepPanel .../>` |
| `frontend/src/components/ai/CompanionRouter.tsx:16` | `import RecommendationPanel from '../RecommendationPanel'` | 改为 `NextStepPanel` |
| `frontend/src/components/ai/CompanionRouter.tsx:88` | `<RecommendationPanel ... />` | 改为 `<NextStepPanel ... />` |
| `frontend/src/components/ExplorationJourney.tsx:19` | `import type { RelationPathStep } from './RecommendationPanel'` | 改为从新模块导入/移除 |
| `frontend/src/components/RecommendationPanel.tsx:97` | `fetch` URL `${API_BASE}/entity/.../recommendations` | 随组件废弃（新面板无 fetch） |
| `frontend/src/components/RecommendationPanel.tsx:90-119` | `fetchRecommendations()` 调旧端点 | 删除（被前端 Policy 取代） |

### 5.2 测试引用

| 文件:行号 | 内容 | 处置 |
| --- | --- | --- |
| `frontend/src/components/__tests__/RecommendationPanel.test.tsx` | 全文件（`:5-154`）引用 `RecommendationPanel` / `fetchRecommendations` / `/recommendations` | 迁移为 `NextStepPanel` 测试或归档 |
| `frontend/src/components/__tests__/ExplorationJourney.test.tsx:11,14` | `import { ..., RecommendationPanelView } from '../RecommendationPanel'` | 改指向新模块 |
| `frontend/src/components/__tests__/ExplorationJourney.test.tsx:173,186,188` | 引用 `RecommendationPanelView` | 改指向新组件 |

### 5.3 文案 key

| 文件:行号 | key | 处置 |
| --- | --- | --- |
| `frontend/src/locales/zh/entity.ts:8` | `'entity.recommend': '推荐探索'` | 改为 `'entity.nextStep': '下一步探索'` |
| `frontend/src/locales/zh/discover.ts:17` | `discover.recommendHeading` | 改为 `discover.nextHeading` |
| `frontend/src/locales/zh/discover.ts:18` | `discover.recommendSeen` | 改为 `discover.nextSeen` |
| `frontend/src/locales/zh/discover.ts:19` | `discover.recommendLoading` | 改为 `discover.nextLoading` |
| `frontend/src/locales/zh/discover.ts:20` | `discover.recommendPathTitle` | 改为 `discover.nextPathTitle` |

> 收敛后，全仓再无对 `GET /entity/{id}/recommendations` 的调用，旧端点下线无遗留引用（满足硬约束 1）。

---

## 6. 保留项与不可逆性评估

| 项 | 处理 | 可逆性 |
| --- | --- | --- |
| 算法内核（四权重） | 保留于 `generate_candidates` | 可逆（仅重命名） |
| 15 测试 | 保留，仅改引用名 | 可逆（git revert） |
| 旧端点 | 删除路由 | 可逆（git revert 单文件） |
| `/api/v1` 冻结契约 | 不涉及 | 不变 |
| 前端 ExplorationPolicy 已存在 | 直接复用，无新增后端 | — |

---

## 7. 与 A1 / A2 的衔接

- **← A1**：ExplorationPolicy（A1 §4）是上层筛选器，决定保留哪个候选并输出 `Decision<ExplorationAction>`。
- **← A2**：映射产物即 `ExplorationAction`（A2 §1）；旧 `RecommendationResult` 类型在本路线中彻底弃用。
- **闭环**：A1（Policy 规则）→ A2（Action 输出）→ A3（降级路线）构成红线解耦完整契约链，Phase 2 后续 B 包可基于 A2 直接设计「下一步」触点。
