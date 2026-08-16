# Phase 1 施工任务：A1 站间衔接合一 + A6 两套 Journey 分离

> **阶段状态**：Phase 1 / 6（施工契约 v2.1 已 READY TO BUILD，PO 翔哥 2026-08-16 Gate 推进解封）
> **配套契约**：`docs/product/ENTITY_PAGE_IA_IMPLEMENTATION_MAP.md` v2.1（§A1 / §A6 / §P4 / §P5）
> **阶段规则**：一个 Phase = 一个独立施工单元 = 一个独立 commit = 一次完整验证 = 通过后再进下一 Phase。
> 本文件是施工 Agent 的**唯一任务简报**。施工前请先读完本文件 + 契约 §A1 / §A6 / §P4 / §P5 + §允许修改 vs 禁改文件清单。

---

## 0. 本 Phase 范围（只做这两件事）

| 动作 | 目标 | 一句话 |
|---|---|---|
| **A1** | 站间衔接合一 | 把 EntityPage 内联"从 XX 来"桥并入 ConnectionCard，并加来源优先级（Package→Direct→None） |
| **A6** | 两套 Journey 分离 | ConnectionCard 内嵌 journey 收敛为极简 ①→②→③；全局 JourneyTrail 本轮**禁止触碰** |

**不做**（本 Phase 红线，越界即回滚）：
- 不碰叙事区 / D8（Phase 2 L1 Narrative）
- 不碰探索引导 / A4（Phase 3）
- 不碰关系洞察 / L2 / A5 NextStep 移入（Phase 4）
- 不碰证据区 / A3（Phase 5）
- 不碰 AI tab / A2+D7（Phase 6）
- 不碰任何后端 / Phase B·C 决策层 / JourneyTrail

---

## 1. 施工前事实（G0 已证明，本 Phase 仅回归，不重证）

G0-1~G0-5 PASS、G0-6 FEASIBLE（详见 `IA_CONTRACT_VERIFICATION.md`）。本 Phase 直接消费以下已核实事实：

1. 入口桥是 **EntityPage 内联实现**（非独立组件），渲染"从 XX 来"。
2. transition 解释链**只有一套**：ConnectionCard 与 originBridge 都走
   `collectRelationEvidence → buildExplanationCandidates → selectBestExplanation / expressHonestNone`
   （continuityEngine + continuityExplanation）。`describeTransition`（data/transition.ts:50）**已无组件引用**（遗留种子）。
3. NextStepPanel / ContinueExploringPanel 挂在 **App.tsx entity-exploration-footer**（EntityPage 外）——本 Phase **不动**（A5 在 Phase 4）。

**施工 Agent 动作**：Phase 1 不重新跑 G0 证明；但每步改完后须跑 §6 验证，确认上述事实未被破坏（尤其"解释链仍只有 continuityEngine 一套"）。

---

## 2. 文件面（本 Phase 触及的文件）

| 文件 | 动作 | 说明 |
|---|---|---|
| `frontend/src/components/EntityPage.tsx` | **删**内联 origin-bridge 块（契约标记 L225-243，以实际代码为准） | 改为向 ConnectionCard 传"来源"prop；不再在 EntityPage 内渲染"从 XX 来" |
| `frontend/src/components/package/ConnectionCard.tsx` | **改 + 增** | ① 新增"从哪里来"区（承接来源 prop）；② 来源优先级分支（Package→Direct→None）；③ 内嵌 journey 收敛为极简 ①→②→③ + 「查看完整行程」小链接 |
| `frontend/src/ai/JourneyTrail.tsx` | **禁改** | 数据 / 语义 / 挂载位置全部锁定（见 §4 红线） |
| 样式 | 随组件改 | connection-card / origin-bridge 相关 css |
| 测试 | 随行为变更 | ConnectionCard 新逻辑加测试；既有 ConnectionCard 测试回归 |

> **定位提示**：契约行号以 2026-08-16 HEAD 为准，可能与当前代码偏移。施工 Agent 用 Grep/Read 定位实际位置，不要盲信行号：
> - 内联桥：在 `EntityPage.tsx` 搜 `originBridge` / "从" / "来" 相关渲染块。
> - 来源承接：确认 `collectRelationEvidence` / `buildExplanationCandidates` 的现有调用点，迁入后继续复用，**不新写解释逻辑**。

---

## 3. 具体施工映射

### A1 站间衔接合一

**目标模型（ConnectionCard 内）：**
```
ConnectionCard
├── 第 X / N 站
├── 从哪里来          ← 新增区，承接"来源"prop
├── 为什么来到这里    ← 复用既有 continuityEngine 解释
└── 极简 Journey Trail（① → ② → ③）  ← A6 收敛
```

**来源优先级规则（必须冻结）：**
```
Package Journey Context（探索包上下文）
        ↓ 优先
Direct Entity Origin（实体 A→B 直接来源）
        ↓
No Context → 整卡不渲染（P4，不是空态卡）
```
- 用户在执行探索包时，"我为什么在这里"首先解释**当前站点在探索线里的位置**；实体 A→B 关系作为站间解释，**不抢 package context**（防"超级衔接卡"）。
- 两来源并存（包 A → 实体 X → 实体 Y）：package 承接为主、实体来源为站间解释，**不是两张卡、不是三行叙述**。
- 无包上下文且非实体跳入 → 整卡不渲染（ConnectionCard 既有 `return null` 行为保持）。

**防第三套 transition（硬约束）：**
- 迁入来源承接 → **继续调用原有解释函数**（collectRelationEvidence 等），禁止在 ConnectionCard 内新写一套解释/fallback。
- `describeTransition`（transition.ts）是遗留种子、无引用 → **不得复活或混用**。
- 验收：A1 后全仓 transition 解释入口仍只有 continuityEngine 一套。

### A6 两套 Journey 分离

| 行程 | 组件 | 本轮动作 |
|---|---|---|
| 包内行程 | ConnectionCard 内嵌 journey 区 | **收敛为极简 secondary nav（①→②→③）**；「查看完整行程」保留为小链接 |
| 全局足迹 | `ai/JourneyTrail.tsx` | **禁止修改**（数据 / 语义 / 挂载位置全锁） |

- 内嵌 journey 仅展示"我在这条探索包的哪一站"，展开/完整行程走「查看完整行程」小链接（链接到既有完整行程视图，不在此重做）。
- **绝对不要把两个 Journey 合成一个**（两套数据/语义不同，合并 = 数据流重构 = P5 禁）。

---

## 4. 红线 / 不可动（违反即回滚）

> 施工 Agent 读到这里停一下：以下任一项被触碰 = 本 Phase 失败，立即 `git checkout --` 还原并回报。

1. **防第三套 transition**：`describeTransition`（data/transition.ts）不得复活/混用；不得新写解释 fallback。
2. **A6 写死**：`ai/JourneyTrail.tsx` 不得修改——不得改数据来源、状态、语义、**未经 PO 批准不得调整挂载位置**。
3. **两个 Journey 永不合成为一个**。
4. **数据语义不变**（PO 红线）：ConnectionCard 仍是 Exploration Context → Entity Understanding 的接口，A1 只改呈现宿主 + 加来源区，不改其数据契约。
5. **不越界**：本 Phase 只动 §2 列出的文件；动到 narrative / 探索引导 / L2 / 证据 / AI tab / backend / continuityEngine / next-exploration 任一 = 越界。

---

## 5. 验收

### G0 派生（施工前已证明，本 Phase 仅回归）
- 来源承接路径回归：包内跳转（jump 携带 originSlug）、实体跳入（takeOriginEntity）、包→实体→实体三跳链——三种路径进入后 ConnectionCard 都正确显示"从哪里来"。
- 解释链单一性：全仓 transition 解释入口仍只有 continuityEngine 一套。

### G1 验收（本 Phase 负责 = Q1）
> 首屏三问是 G1 主验收（契约 §验收工程化 v2 第 3 条）。本 Phase 只需证明 **Q1**；Q2/Q3 由后续 Phase 在首屏逐步成立。

- **Q1「我为什么来到这里？」→ 在 ConnectionCard（首屏）得到回答**：
  - 执行探索包时：ConnectionCard 优先解释"当前站点在探索线里的位置"（package context 为主）。
  - 实体 A→B 跳入时：站间解释正确显示，且不抢 package context。
  - **无包上下文且非实体跳入 → ConnectionCard 整卡不渲染**（P4，不是空态占位卡）。
  - 两来源并存时：package 承接为主 + 实体来源为站间解释，呈现为**一段衔接叙述**，不是两张卡/三行。
- **Journey 收敛**：ConnectionCard 内嵌 journey = 极简 ①→②→③；「查看完整行程」小链接存在；全局 JourneyTrail 仍在原位置、未被改。
- **汇报硬要求**：Agent 完工汇报必须逐条说明「Q1 在首屏哪个组件/位置得到回答」并附首屏截图标注；不接受"只有衔接卡所以通过"这类表面论证。

### 次级标准（契约 §验收 第 2 条）
- 第一屏 ≤3 个主要视觉焦点（含站间上下文）——仅作参考，不以它单独放行。

---

## 6. 验证步骤（每步提交前必跑）

1. **tsc 零错误**：`node .../vitest.mjs` 不适用时，跑 `tsc --noEmit`；注意本机 HTTP_PROXY 环境变量会干扰，命令前加 `env -u HTTP_PROXY -u HTTPS_PROXY`。（环境坑：vitest 须真实 node 直调 + `env -u HTTP_PROXY`，详见项目记忆。）
2. **组件测试**：
   - ConnectionCard 新逻辑加测试：来源优先级（Package 优先 / Direct 站间解释 / None 不渲染）、journey 收敛（①→②→③ + 小链接）。
   - 既有 ConnectionCard 测试回归通过。
3. **freeze-check（红线扫描）**：确认本 Phase diff 未触碰 `backend/**`、`data/continuityEngine*`、`data/continuityExplanation*`、`data/transition.ts`、`next/exploration/*`、`ai/JourneyTrail.tsx`、任何状态模型/数据流重构。
4. **隧道重建 4173 人工目检**：启动预览（端口 4173），进入一个探索包 + 一个实体跳入，目视确认首屏 Q1 在 ConnectionCard 回答、JourneyTrail 仍在原位置。
5. **回归**：包内跳转 / 实体跳入 / 包→实体→实体三跳链 的来源承接均正确。

---

## 7. 交付与流转

- **独立 commit**：标题约定 `[EntityPage IA Phase 1] A1+A6 站间衔接合一与 Journey 分离`。
  - 只提交本 Phase 那笔改动（YOLO 提交纪律：每人只提交自己那笔，commit 后 push 共享分支 `phase5-journey-continuity`）。
  - 引用 `git show --stat HEAD` 真实输出作为改动清单，不要手维护统计数字。
- **完成判据**：G1(Q1) 验收通过 + tsc/test/freeze 全绿 + PO 目检通过 → 标记本 Phase 完成，**再进 Phase 2（L1 Narrative / D8）**。
- **未完成不得进 Phase 2**：若 G1(Q1) 不通过或红线被触碰，先在本 Phase 内修复/回滚，不把问题留到下一 Phase。
