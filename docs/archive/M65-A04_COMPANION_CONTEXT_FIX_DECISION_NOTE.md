# CompanionContext Fix Decision Note

**任务** M65-A04 Final Scope Clarification — `CompanionContext.tsx` 单独范围审计
**分支** `master` ｜ **HEAD** `a690645` ｜ **latest project tag** `vM62.5`
**状态** 未 commit / 未 push / 未 merge ｜ 本次审计**未修改任何代码**
**审计方式** 全部结论基于本次实时读码与 `git diff`，不引用历史上下文数值

---

## 0. 审计对象（精确范围）

```
frontend/src/components/ai/CompanionContext.tsx | 11 ++++++++++-
1 file changed, 10 insertions(+), 1 deletion(-)
```

实质代码变更仅 **reducer 的 1 个 case**，其余 7 行为解释性注释：

```diff
     case 'SET_ERROR':
-      return { ...state, status: 'error', error: action.payload }
+      return {
+        ...state,
+        status: action.payload ? 'error' : state.status,
+        error: action.payload,
+      }
```

未触及：类型定义（`CompanionStatus` 联合值不变）、Action 签名（`SET_ERROR; payload: string` 不变）、Provider 结构、Context 暴露面、其余 5 个 case。

---

## 1. 为何这是生产逻辑缺陷修复，而非测试适配

### 判据一：测试断言的期望值来自**产品代码作者自己的 dispatch 意图**，非测试杜撰

两条曾失败的用例：

| 用例 | 断言 | 期望值的来源 |
|---|---|---|
| `reflects loading status while the request is in flight` | `status === 'loading'` | `useCompanionAI.ts:89` 作者显式 `dispatch({ type:'SET_STATUS', payload:'loading' })` |
| `resets response and status when the explored entity changes` | `status === 'idle'` | `useCompanionAI.ts:61` 作者显式 `dispatch({ type:'SET_STATUS', payload:'idle' })` |

即：产品代码**主动声明**了"此刻应为 loading / idle"，reducer 却把它改写成 `'error'`。测试只是把作者的既有意图断言出来。若为测试适配，正确做法应是把断言改成 `toBe('error')` —— 那等于把缺陷固化为规范。

### 判据二：两个 dispatch 语义在调用方**一致且自洽**，是 reducer 单方面违约

`SET_ERROR` 全仓仅 5 个发送点，全部位于 `useCompanionAI.ts`，语义泾渭分明：

| 行号 | payload | 调用方意图 |
|---|---|---|
| `62` | `''` | 重置上下文时**清空错误文案** |
| `90` | `''` | 发起 explain 请求前**清空错误文案** |
| `98` | `e.message` | explain 失败，**报告错误** |
| `118` | `''` | 发起 chat 请求前**清空错误文案** |
| `137` | `e.message` | chat 失败，**报告错误** |

空串 = 清文案、非空 = 报错，调用侧无一例外。旧 reducer 无条件 `status:'error'`，把"清空"误解为"报错"，属 reducer 侧的契约违反。

### 判据三：缺陷有**确定性、用户可见**的后果，且非边界情况

`SET_STATUS` 与 `SET_ERROR` 在同一同步块内连续 dispatch（React 自动批处理，按序归约），最终态由后者决定：

```
ask() / sendChat():
  SET_STATUS 'loading'  → status = loading
  SET_ERROR  ''         → status = 'error'    ← 旧行为，loading 态被吞

resetAIContext()（实体切换 useEffect 触发）:
  SET_STATUS 'idle'     → status = idle
  SET_ERROR  ''         → status = 'error'    ← 旧行为，idle 态被吞
```

触发率 **100%**：每一次 AI 提问、每一次实体切换必现，不依赖任何异常路径。

### 判据四：UI 会向用户**编造一条不存在的错误原因**

唯一 UI 消费方 `CompanionRouter.tsx:21` 将 `status`/`error` 透传给两个视图，二者均对空错误文案做了兜底：

- `AIExplanationPanel.tsx:183-187` → `无法获取 AI 解读（{error || '网络错误'}）。`
- `HistorianChat.tsx:167-171` → `当前无法生成解释（{error || '请稍后重试'}）。`

因错误文案恰为空串，旧行为下用户看到的是 **"网络错误" / "请稍后重试"** —— 一条系统凭空生成、与真实情况不符的失败归因。这直接违反项目 **Grounding First** 原则（对外陈述须有真实依据）。

**具体功能损失清单：**

| 场景 | 旧行为实际表现 |
|---|---|
| 提问加载期 | `ae-loading`／`hc-loading` 提示**永不显示**，改显 `role="alert"` 错误块 |
| 实体切换后 | 面板持续停留错误态（非瞬时），`status==='idle'` 的引导文案**永不显示** |
| Chat 推荐问题 | `HistorianChat.tsx:174` 条件 `status==='idle'` 恒假 → **推荐问题按钮从未出现过** |
| 无障碍 | 无故触发 `role="alert"`，屏幕阅读器朗读虚假错误 |

### 判据五：修复方向是**恢复**既有设计意图，而非引入新语义

`CompanionStatus` 联合类型 `'idle' | 'loading' | 'success' | 'error'` 早已完整定义 loading/idle 两态，且 UI 早已为其写好分支渲染。修复后这些既有代码路径才首次真正可达。属"让已写好的设计生效"，非新增行为。

> **结论**：`SET_ERROR` 空串路径的 status 覆写是一处**真实生产逻辑缺陷（P1）**。修复它是 A04 达成绿态的必要前提；不修则该缺陷被测试固化为"预期行为"。

---

## 2. 修改前后状态机行为差异

### 2.1 Reducer 真值表（唯一差异点）

| 输入状态 `state.status` | Action | **修改前** 结果 status | **修改后** 结果 status | 差异 |
|---|---|---|---|---|
| `loading` | `SET_ERROR ''` | `error` | `loading` | ✅ 修正 |
| `idle` | `SET_ERROR ''` | `error` | `idle` | ✅ 修正 |
| `success` | `SET_ERROR ''` | `error` | `success` | ✅ 修正 |
| `error` | `SET_ERROR ''` | `error` | `error` | 一致 |
| 任意 | `SET_ERROR 'AI 请求失败'` | `error` | `error` | **一致（报错路径零变化）** |

`error` 字段赋值在所有分支均为 `action.payload`，**前后完全一致**。

### 2.2 三条真实调用序列对照

**A. explain / chat 请求成功**

| 步骤 | 修改前 | 修改后 |
|---|---|---|
| `SET_STATUS 'loading'` | loading | loading |
| `SET_ERROR ''` | **error** ❌ | **loading** ✅ |
| （请求进行中，用户可见） | 显示"无法获取 AI 解读（网络错误）" | 显示"正在生成带事实溯源的解读…" |
| `SET_STATUS 'success'` | success | success |
| 终态 | success（一致） | success（一致） |

**B. explain / chat 请求失败**

| 步骤 | 修改前 | 修改后 |
|---|---|---|
| `SET_STATUS 'loading'` | loading | loading |
| `SET_ERROR ''` | error ❌ | loading ✅ |
| `SET_ERROR 'AI request failed (500)'` | error | error |
| 终态 | error + 真实文案 | error + 真实文案（**完全一致**） |

> 报错能力零削弱：非空 payload 路径行为逐字节相同。

**C. 实体切换（`useEffect` → `resetAIContext`）**

| 步骤 | 修改前 | 修改后 |
|---|---|---|
| `abort()` / 清空 response、chatMessages | 同 | 同 |
| `SET_STATUS 'idle'` | idle | idle |
| `SET_ERROR ''` | **error** ❌ | **idle** ✅ |
| 用户可见（持续态） | 虚假错误块，引导文案与推荐问题不出现 | 正常引导文案 + 推荐问题 |

### 2.3 状态可达性变化

| 状态 | 修改前可达性 | 修改后 |
|---|---|---|
| `idle` | 事实上**不可达**（每次进入即被覆写） | 可达 |
| `loading` | 事实上**不可达** | 可达 |
| `success` | 可达 | 可达（不变） |
| `error` | 可达，但**存在虚假触发** | 可达，仅真实失败触发 |

---

## 3. 影响面确认

| # | 审查项 | 结论 | 依据 |
|---|---|---|---|
| 1 | **是否影响 AI 架构** | ❌ **否** | 未触及 AI Gateway 开关、`aiClient` 调用链、`explainAI` 签名、engine 选择（`deterministic` / LLM）、grounding 与 citation 逻辑、abort 控制。改动位于 CompanionShell 子树内的**纯 UI 状态归约层**，注释明载 "Scope: CompanionShell subtree ONLY. Not exposed to App or global."（`CompanionContext.tsx:5`） |
| 2 | **是否影响 API 契约** | ❌ **否** | 无 fetch / URL / method / header / body / 错误码处理变更。`aiClient.test.ts` 6 项契约断言（真实 URL、method、body、错误码、abort signal）全绿且**未修改一字** |
| 3 | **是否影响数据模型** | ❌ **否** | `CompanionStatus` 联合值不变（4 态）；`CompanionState` 6 字段不变；`CompanionAction` 6 个 action 签名不变；`CompanionMessage` 不变。后端实体/关系模型 **ENTITY_TYPES=8 / RELATIONSHIP_TYPES=18** 未触及，`backend/` 改动数 **0** |
| 4 | **是否扩大 M65 冻结范围** | ❌ **否** | `frontend/src/components/ai/` 已在 `scripts/freeze-check.mjs:423` SCOPE_ALLOWLIST 内（该条目由 M65 前序阶段引入，**非本次新增**）。`freeze-check.mjs` 本次无需为此文件新增任何条目。`CompanionContext.tsx` 为 M65 Phase 2B 既有产出文件（`9f20cc3` / `fd6179d` / `1153dcd`），非新建 |

**补充**：`freeze-check.mjs` 本轮 exit 0 — PASSED, no D-class violations；后端 diff 为 0，维持"连续里程碑 backend 零变更"记录。

---

## 4. 变更风险评估

| 维度 | 评估 |
|---|---|
| 影响半径 | 单文件单 case；`SET_ERROR` 全仓唯一消费方为 `useCompanionAI.ts`（5 调用点语义一致），无第三方 reducer 复用 |
| 回归验证 | 全量 **962 / 962 通过（108 文件），0 error**；AI/Companion 回归子集 **57 / 57**；`tsc --noEmit` 0 错 |
| 报错能力 | 零削弱（非空 payload 路径行为完全一致） |
| 可回退性 | **完全可独立回退**，单 case 还原即可。回退后 `useCompanionAI.test.tsx` 退回 3 passed / 2 failed，A04 无法达成绿态 |
| 不修的代价 | ① 虚假错误提示长期存在，违反 Grounding First；② `loading`/`idle` 两态永久不可达，UI 既有分支成死代码；③ Chat 推荐问题功能持续失效；④ 缺陷被测试固化为规范 |

---

## 5. 建议裁决

**建议：接受纳入 M65-A04 范围**，理由如下：

1. 它不是"为让测试通过而改产品"，而是"测试暴露了产品缺陷，且该缺陷阻断 A04 验收目标"；
2. 修复面积最小（1 case / 实质 1 行判断），风险可控，可独立回退；
3. 四项影响面（AI 架构 / API 契约 / 数据模型 / 冻结范围）**全部为否**；
4. 若不纳入，A04 只能以 3 passed / 2 failed 收尾，与"关闭 H9：M65 真实 AI 调用链零测试覆盖"的既定目标冲突。

**替代选项（供 PO 权衡）**

| 选项 | 处置 | 后果 |
|---|---|---|
| **A（推荐）** | 纳入 A04，随 A04 一并提交 | A04 全绿闭环，缺陷即时消除 |
| B | 从 A04 剥离，另立 M65-A05 缺陷修复单 | 范围最纯净；但 A04 须以 2 项失败挂起，或临时 skip 该 2 测试（不建议——等于隐藏缺陷） |
| C | 回退此修改，将测试断言改为 `toBe('error')` | **不建议**：把生产缺陷固化为规范，且虚假错误提示长期留存 |

---

## 6. 当前状态声明

- 本次审计**未做任何代码修改**，工作区与 M65-A04 Final Verification 时点一致
- 保持 **未 commit / 未 push / 未 merge**
- 等待 PO 对上述 A / B / C 选项拍板

---

*报告数据来源：本次实时 `git diff` / `git status` / `git log` 与源码读取，非历史上下文缓存值。*
