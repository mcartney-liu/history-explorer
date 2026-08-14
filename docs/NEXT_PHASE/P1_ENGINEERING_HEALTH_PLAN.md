# P1 工程健康可执行计划（Engineering Health）

> 分支：`plan/next-phase`（基于 `chore/cleanup-2026-08-12` @ `30ccff6`，即 M80 收口 + 归档 commit）
> 来源：2026-08-13 全面盘点 `docs/M81-planning/project-state-report-2026-08-13.md` §三「五大结构问题」
> 性质：**只删 / 只挪 / 只合并，不改用户可见行为**。纯清理，回归风险低。
> 实测时间：2026-08-14（前端 grep/wc 实时核验，非盘点旧快照）

---

## 0. 全局门禁（每项执行后都跑）

- `npm run test`（vitest）：期望 **2 failed / 444 passed**（仅 `test_m82_*` 因果链 M82 债，与 P1 无关，不视为回归）
- `node scripts/data-patch-check.py`：**✅ 达成**（叶子 0 / 因果链 ≥25 / evidence+citation 100% / 无悬空引用）——P1 不碰 `data/`，应恒绿
- `npm run build`（frontend）：成功，无新增 TS error
- `npx tsc --noEmit`：0 error
- 红线：改动只增不改；任何 `frontend/src` 删除/新建须先扩 `scripts/freeze-check.mjs` 的 `SCOPE_ALLOWLIST`（见 §6），且保持 **LF** 换行

---

## ① API_BASE 统一

**现状实测（2026-08-14）**：全仓 `API_BASE` 共 **10 处**散布：
- 默认 `8000`（8 处）：`App.tsx`、`aiClient`、`contentApi`、`AdminPage`、`EntityPickerPanel`、`provenanceApi`、`ResearchHistory`、`siteConfigApi`
- 硬编码 `8001`（2 处，bug 温床）：`EntityRelatedList.tsx:23`、`TopicExploreStarters.tsx:35`

端口 `8000`/`8001` 不一致是「页面连不上后端 / 研究库拉空」类 bug 的根因之一（与 M74 QuickStart 400 同源）。

**方案**：
1. 新增 `frontend/src/config/api.ts`，导出单一 `API_BASE`（取自 `import.meta.env.VITE_API_BASE`，默认 `"http://localhost:8000"`）。
2. 上述 10 处全部改为 `import { API_BASE } from "@/config/api"`，删除各自字面量。
3. 零新增依赖；`vite` 已支持 `@/` 别名（沿用现有 tsconfig paths）。

**涉及文件**：`frontend/src/config/api.ts`（NEW）+ 上述 10 处引用点。

**验收**：`grep -rn "8001" frontend/src` 仅剩 `api.ts` 默认值；`grep -rn "API_BASE" frontend/src` 仅 `api.ts` 定义 + 各引用；build + vitest 绿。

---

## ② App.tsx 拆分

**现状**：`frontend/src/App.tsx` 仍 **1484 行**巨型单体（盘点问题1）。注意：运行期真实主应用走 `ExplorerShell`（`components/shell/`），`App.tsx` 实际是入口壳 + 全局 Provider 装配。

**方案**（不引入新路由库）：
1. 抽 `AppProviders.tsx`：承载全局 Context / i18n / theme Provider 装配。
2. 抽 `AppRoutes.tsx`：承载路由表（Topic / Entity / Research / Admin 等），路由组件已是独立文件，仅装配上移。
3. `App.tsx` 收敛为 ≤80 行入口壳：渲染 `<AppProviders><ExplorerShell/></AppProviders>`。
4. 不涉及任何业务逻辑改写，纯结构搬迁。

**涉及文件**：`App.tsx`（瘦身）、`AppProviders.tsx`（NEW）、`AppRoutes.tsx`（NEW）。

**freeze-check**：`frontend/src/App.tsx` 及新建文件须在 `SCOPE_ALLOWLIST`（§6）。

**验收**：build 过、行为零变化（用 compare 环境双栈 smoke 一局）、vitest 绿、tsc 0 error。

---

## ③ 清理不可达代码（dead / unreachable code）

**现状**：盘点问题2——存在死代码与「import 了但运行期永不进入」的未激活分支，主要在遗留组件与旧探索流程里。

**方案**：
1. 用 `tsc --noUnusedLocals --noUnusedParameters` + vite build 告警 + IDE 未使用导出扫描，列出候选。
2. 对每个候选：先确认是否有测试/运行时引用（grep 全仓 + 测试守卫），确认不可达后才删。
3. 优先清理：旧 `ModeBar` 4 模式里已被 FRW 四主干取代的死分支（挂账 `M90` 未裁决，清理时只删确认不可达的、不碰架构争议）、`ExplorationGuide` 家族里被覆盖的冗余导出。

**涉及文件**：依扫描结果定，预期 `frontend/src/**` 多处小修。

**验收**：tsc 0 error；vitest 绿（删前先确认无测试依赖该符号）；build 过。

---

## ④ 清理 dead components（分级处理，不盲删）

**分级结论（实测）**：
| 组件 | 状态 | 处置 |
|---|---|---|
| `AppShell.tsx` | **真死**（仅被测试引用，运行期不挂载）| 安全删除 + 删其测试 |
| `RelationshipView` / `TimelinePanel` / `GraphViewPanel` / `DevCatalog` | **休眠**（被 import 但运行期不渲染）| 保留 + 显式标注「休眠」，不盲删（有测试守卫）|
| `ExplorationGuide` 家族（3+ 变体）| **在用**（仍被 `EntityPage` / `TopicExploreStarters` 引用）| **收敛**为单一组件，删冗余变体 |

**方案**：
- 删 `AppShell.tsx` 及其单测。
- `ExplorationGuide` 三变体合并为一个（保留被引用的 API 面），删冗余文件。
- 休眠组件加 `// @dormant` 注释，明确「保留原因」，避免后续误删或误启用。

**freeze-check**：删除/新建须在 `SCOPE_ALLOWLIST`（§6）。

**验收**：构建含这些引用的测试仍绿；`grep -rn "ExplorationGuide"` 仅剩单一入口；vitest 绿。

---

## ⑤ 统一数据入口（前端单一数据源，守冻结红线）

**现状**：盘点 §四后端发现——探索包**无后端 API**，包数据前端直接 `import` 本地 JSON；前后端数据源分叉，导致「本地有 / 线上空」「刷新即丢」类问题。

**方案（关键：不新建后端 API）**：
- 新建 `frontend/src/data/DataSource.ts`：统一封装「远程 fetch（经 ① 的 `API_BASE`）+ 本地 import 兜底」的单一数据源模块。
- 所有 `import` 包 JSON / `fetch` 研究数据的入口收敛到 `DataSource`，消除分叉。
- **严禁**为统一入口而新建后端路由/端点——「探索包无后端 API」是冻结基线，后端/AI 扩张须走 Freeze Revision Gate（红线禁项）。

**涉及文件**：`frontend/src/data/DataSource.ts`（NEW）+ 收敛各分散 import/fetch 点。

**验收**：`grep -rn "import .*example.json\|fetch(" frontend/src` 仅剩 `DataSource` 内部；`data-patch-check` 绿；vitest 绿。

---

## 6. freeze-check `SCOPE_ALLOWLIST` 扩展（L167）

P1 碰 `frontend/src` 大量文件，护栏会拦。动工前先把以下精确路径加入 `SCOPE_ALLOWLIST`（保持 LF 换行，改完自测 `node scripts/freeze-check.mjs`）：

```
frontend/src/config/api.ts
frontend/src/AppProviders.tsx
frontend/src/AppRoutes.tsx
frontend/src/App.tsx
frontend/src/components/shell/**
frontend/src/data/DataSource.ts
frontend/src/components/exploration/**
frontend/src/components/guides/**
```

> 沿用 M60 经验：改 `freeze-check.mjs` 要保持 LF；新增 frontend 文件须先在白名单，否则 commit 被拦。

---

## 7. 执行顺序（低风险高回报优先，② 拆最后）

**① API_BASE 统一 → ⑤ 统一数据入口 → ③ 清理不可达代码 → ④ 清理 dead components → ② App.tsx 拆分**

- ① 与 ⑤ 是「改一处即全局受益」的高杠杆、低风险入手，先做。
- ③ ④ 是局部删减，影响面小。
- ② 拆单体面最大、最易引入回归，放最后，且需 compare 双栈 smoke 兜底。

每项独立 commit，便于 review 与回滚。完成①~⑤ 后，工程健康达标，再启动 P2 认知闭环施工。
