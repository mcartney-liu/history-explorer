# M65-A04 Closure Audit Packet

> 提交 PO 签署用的闭环审计材料
> 生成时间：2026-07-30 21:4x GMT+8
> **全部事实取自本次实时执行输出**（`git` / `vitest` / `tsc` / `freeze-check` / `visual-check`），未引用历史报告值。

---

## A. 审计头（Audit Header）

| 项 | 值 |
|---|---|
| 里程碑任务 | M65-A04 — 真实 AI 调用链测试覆盖（关闭 H9） |
| 分支 | `master` |
| HEAD | `a690645` |
| latest project tag | `vM62.5` |
| Runtime version | `0.13.0`（未 bump，无 runtime 行为变更） |
| commit / push / merge | **均未执行** |
| Scope 裁决 | **方案 A 已批准** — `CompanionContext.tsx` reducer 修复纳入 A04 范围 |

---

## B. 交付物清单（Deliverables）

### B.1 A04 范围内 —— 5 个文件

| # | 文件 | 状态 | 改动 | 性质 |
|---|---|---|---|---|
| 1 | `frontend/src/data/aiClient.test.ts` | 新增 | 94 行 | aiClient 契约测试（mock fetch） |
| 2 | `frontend/src/components/ai/useCompanionAI.test.tsx` | 新增 | 153 行 | 真实 hook + 真实 reducer 测试（mock aiClient） |
| 3 | `frontend/src/components/ai/CompanionContext.tsx` | 修改 | **+10 / −1** | **生产状态机缺陷修复**（PO 批准纳入） |
| 4 | `frontend/package.json` | 修改 | +1 | devDep `jsdom: ^29.1.1` |
| 5 | `scripts/freeze-check.mjs` | 修改 | +1（A04 部分） | allowlist 增补 `aiClient.test.ts` |

### B.2 明确排除 —— 工作区其他改动非 A04 产出

| 文件 | 归属 |
|---|---|
| `frontend/src/styles/layout-grid.css`、`components/workspace/WorkspacePanel.tsx` | M65 Workspace Rail 展开 Bug 修复 |
| `components/GraphViewPanel.tsx`、`RelationshipInsightPanel.tsx`、`RelationshipPathGraph.tsx`、`lib/entityColors.ts`、`freeze-check.mjs`(+3) | M65-A03（H7 实体色 SSOT） |
| `docs/15_DECISIONS/HEALTHCHECK_*.md`(8)、`ADR-0007`、`M63_DECISION_WORKSHOP.md` | 其他会话文档产出 |
| 根级 `M65*.md`、`WORKSPACE_RAIL_*.md`、`artifacts/` | 报告类产出 |

---

## C. 范围未扩大之实证（Scope Containment Proof）

PO 要求「不扩大修改范围，仅保留当前 SET_ERROR reducer 修复」。核验结果：

```
$ git diff --stat frontend/src/components/ai/CompanionContext.tsx
 frontend/src/components/ai/CompanionContext.tsx | 11 ++++++++++-
 1 file changed, 10 insertions(+), 1 deletion(-)
```

完整 diff（本次实时输出）：

```diff
@@ -48,8 +48,17 @@ function companionReducer(state, action): CompanionState {
       return { ...state, activeMode: action.payload, error: '' }
     case 'SET_STATUS':
       return { ...state, status: action.payload }
+    // A non-empty payload reports a failure and moves status to 'error'.
+    // An empty payload only CLEARS the error text and must NOT overwrite
+    // status — callers use it to reset the message before entering
+    // 'loading' / 'idle', and clobbering status there would surface a
+    // phantom error state in the UI.
     case 'SET_ERROR':
-      return { ...state, status: 'error', error: action.payload }
+      return {
+        ...state,
+        status: action.payload ? 'error' : state.status,
+        error: action.payload,
+      }
     case 'ADD_MESSAGE':
```

**核验结论**：
- 唯一被修改的分支是 `case 'SET_ERROR'`；10 行新增中 **5 行为解释性注释**，实质逻辑改动为 1 个三元表达式。
- 其余 reducer 分支、`CompanionStatus` / `CompanionState` / `CompanionAction` 类型定义、Provider 实现、导出签名 —— **零改动**。
- 裁决后**未追加任何代码变更**（本轮仅执行验证与文档更新）。

---

## D. 缺陷定性（Defect Classification）

**结论：生产状态机缺陷修复，非测试适配。**

| 判据 | 证据 |
|---|---|
| 期望值出自产品代码作者本人 | 失败用例断言的 `'loading'`/`'idle'` 正是 `useCompanionAI.ts:89`/`:61` 显式 dispatch 的值 |
| 调用侧语义自洽，reducer 单方违约 | `SET_ERROR` 全仓仅 5 个发送点全在该 hook：`62/90/118` 空串=清文案，`98/137` 非空=报错 |
| 触发率 100% | 两 dispatch 同步连发，批处理后由后者定终态；每次提问 + 每次实体切换必现 |
| UI 会编造错误原因 | `AIExplanationPanel.tsx:183` `{error \|\| '网络错误'}`、`HistorianChat.tsx:167` `{error \|\| '请稍后重试'}` → 空文案下向用户显示虚假归因，违反 Grounding First |
| 修复恢复既有设计意图 | `CompanionStatus` 四态与 UI 分支早已写好，缺陷使 `idle`/`loading` 事实上不可达 |

**若按"测试适配"处理**（把断言改为 `toBe('error')`）→ 等于把缺陷固化为规范，并使虚假错误提示长期存在。**已排除该路径。**

### 状态机行为差异

| `state.status` | Action | 前 | 后 |
|---|---|---|---|
| `loading` | `SET_ERROR ''` | `error` ❌ | `loading` ✅ |
| `idle` | `SET_ERROR ''` | `error` ❌ | `idle` ✅ |
| `success` | `SET_ERROR ''` | `error` ❌ | `success` ✅ |
| 任意 | `SET_ERROR '<msg>'` | `error` | `error`（不变） |

报错路径零变化；`error` 字段赋值行为完全一致。

### 影响分析 —— 四项全否

| 影响面 | 结论 | 依据 |
|---|---|---|
| AI 架构 | ❌ 不影响 | 未触及 Gateway / `aiClient` / `explainAI` / engine 选择 / grounding / abort；作用域限 CompanionShell 子树 |
| API 契约 | ❌ 不影响 | 无 fetch 变更；`aiClient.test.ts` 6 项契约断言未改一字且全绿 |
| 数据模型 | ❌ 不影响 | `CompanionStatus`/`State`/`Action` 签名全不变；backend diff = 0 |
| M65 冻结范围 | ❌ 未扩大 | `frontend/src/components/ai/` 已在 `freeze-check.mjs:423`，M65 前序引入；`CompanionContext.tsx` 为 Phase 2B 既有文件（`9f20cc3`/`fd6179d`/`1153dcd`）；本次未新增 allowlist 条目 |

---

## E. 门禁复验结果（本轮实时执行）

| # | 门禁 | 命令 | Exit | 结果 |
|---|---|---|---|---|
| 1 | Git Scope Audit | `git status --porcelain` / `git diff --stat` | 0 | ✅ backend **0 改动**；范围外目录 **NONE** |
| 2 | Freeze Baseline | `node scripts/freeze-check.mjs` | 0 | ✅ **PASSED — no D-class violations** |
| 3 | Type Check | `node_modules/typescript/bin/tsc --noEmit` | 0 | ✅ **0 errors**（输出 0 行） |
| 4 | Unit Tests（全量） | `npx vitest run` | 0 | ✅ **962 passed / 962（108 files），0 error** |
| 5 | A04 专项子集 | `npx vitest run src/data/aiClient.test.ts src/components/ai/useCompanionAI.test.tsx` | 0 | ✅ **11 passed / 11（2 files）** |
| 6 | Visual QA | `node scripts/visual-check.mjs` | 0 | ✅ PASS（2 WARN，均既有） |

**全量测试原文输出**：

```
 Test Files  108 passed (108)
      Tests  962 passed (962)
   Duration  47.53s
```

**Visual QA 2 条 WARN 归属核实**（均非本任务引入）：

| 告警 | 核实 |
|---|---|
| `RelationshipInsightPanel.tsx:358` — `10000px` | HEAD 同行号即存在（屏外测量 `ta.style.top = '-10000px'`） |
| `TimelineStrip.tsx:29` — `#CBA135` | HEAD 同位存在；该文件本次**完全未改动**；该值位于**注释文本**内，非实际样式 |

**Git Scope Audit 明细**：

```
BACKEND_CHANGES=0
范围外目录变化（非 frontend/backend/scripts/docs + 根级报告）：NONE
data/ infrastructure/ templates/：clean
```

---

## F. H9 关闭判定

**H9：M65 真实 AI 调用链零测试覆盖 → ✅ 已关闭**

```
CompanionShell (UI)
      │  ← CompanionShell.test.tsx（既有 5 tests）
      ▼
useCompanionAI (hook) ──┐
      │                 │ ← useCompanionAI.test.tsx（新增 5 tests）
      ▼                 │    驱动【真实 hook】+【真实 reducer】
CompanionContext reducer┘
      │
      ▼
   aiClient  ← mock 边界
      │  ← aiClient.test.ts（新增 6 tests）：放开真实 aiClient，只 mock fetch
      ▼
   fetch → /api/v1/ai/*  ← mock 边界
```

两层 mock 边界互补，链路上不再有零测试触及的环节。任务书列的 6 项覆盖要求（mock fetch 链路 / explainAI 成功 / explainAI 失败 / loading / sendChat / entity change reset）**全部命中**。

**诚实边界**（记 backlog，不影响关闭判定）：覆盖为分段契约式而非单进程 E2E；未对真实后端联调（AI Gateway 默认关闭）；组件卸载取消行为、重试/超时策略未覆盖。

---

## G. 遗留事项（不阻断 Closure）

| # | 事项 | 级别 | 状态 |
|---|---|---|---|
| 1 | `esbuild <= 0.24.2` + `vite <= 6.4.2` dev-server 漏洞（1 high / 1 moderate） | P2 | **待 PO 裁决**：走 Freeze Revision Gate 升 `vite@8`（breaking change），或记 backlog。与 A04 无关，仅影响开发期 |
| 2 | `useCompanionAI.test.tsx` 4 条 React `act(...)` warning | P3 | 断言全通过；按"不重构测试"未处理。引入 `@testing-library/react` 的 `renderHook` 可自然消除 |
| 3 | 单进程 E2E 与真实后端联调缺口 | P3 | 见 §F 诚实边界，建议随 AI Gateway 启用时一并补 |

---

## H. Closure Audit 签署清单

| # | 准入条件 | 状态 |
|---|---|---|
| 1 | jsdom 环境完整、无安装残缺（29.1.1 + tough-cookie 6.0.2 + tldts 7.4.9，实测可加载） | ✅ |
| 2 | A04 新增测试全绿 | ✅ 11 / 11 |
| 3 | AI/Companion 回归无回归 | ✅ 57 / 57（6 files） |
| 4 | 全量测试全绿、0 error | ✅ 962 / 962（108 files） |
| 5 | `freeze-check` | ✅ PASSED |
| 6 | `tsc --noEmit` | ✅ 0 errors |
| 7 | `visual-check` | ✅ PASS（2 WARN 均既有） |
| 8 | Git scope 无超范围（backend = 0） | ✅ |
| 9 | Scope 裁决明确、范围未扩大 | ✅ 方案 A，仅 SET_ERROR 单 case |
| 10 | 未 commit / 未 push / 未 merge | ✅ |

**判定：M65-A04 满足全部 10 项准入条件，可进入 Closure Audit 签署。**

---

## I. 关联文档

| 文档 | 用途 |
|---|---|
| `M65-A04_FINAL_VERIFICATION_REPORT.md` | 完整实施与验证报告（含逐条用例名、环境确认明细） |
| `M65-A04_COMPANION_CONTEXT_FIX_DECISION_NOTE.md` | reducer 修复的独立定性审计（PO 裁决依据） |
| `M65_WORKSPACE_RAIL_FIX_REPORT.md` | 同期但独立的 Rail 修复（非 A04 范围） |

---

**当前状态：未 commit / 未 push / 未 merge。等待 PO Closure Audit 签署。**
