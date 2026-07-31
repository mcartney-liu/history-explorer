# History Explorer — QA 健康体检（严过关）

> 评估时间：2026-07-30｜评估方：测试工程师 严过关（独立只读核验）
> 范围：当前 HEAD = `a690645`（M65 WIP，Companion 真实 AI 模式已激活）
> 方法：实拉代码 `git`/`grep`/`Read` + 本地跑门禁脚本，未跑全量测试

---

## 总体评估

**1. 门禁是否真有效？—— 有效，但只管"能不能改"，不管"对不对"。**
【已核实】本地跑三个门禁脚本（当前 `master` HEAD）：`freeze-check.mjs` PASSED（无 D 类违规）、`emoji-scan.mjs` SYMBOL GUARD + EMOJI GUARD 均 PASSED、`visual-check.mjs` PASSED（仅 GraphViewPanel 22 处硬编码色 WARN）。`ci.yml` 把四道门禁设为 CI job，确实在 `push→master`/`PR→master` 上跑了——M65 已合入 master，所以门禁对 M65 生效。

但 `freeze-check` 本质是**治理门禁**：范围 allowlist + 剥离注释后扫禁 AI token + 依赖扫描 + enum 计数。它验证"M65 的 Companion 文件落在 `components/ai/`+`data/ai/`（M59-011 已放行目录）内、没碰红线"，**完全不验证测试覆盖、断言质量、E2E、性能、无障碍**。"freeze PASS" 与"AI 运行时是否正确"零相关。

【已核实】上份报告头号硬发现（10 文件用 `★☆✓✗⚠○` 当功能图标，P0-1 违规）**已修复**：独立 grep 这些符号于 `frontend/src/**/*.{ts,tsx}` 仅命中 `m62-emoji-guard.test.ts`（测试文件注释），运行时源码已干净，且 `emoji-scan` 新增的 SYMBOL_DINGBAT 守卫现已拦截。这是真改进，应如实确认。

**2. "量≠质量"现状——无改善，反而被 M65 复制。**
【已核实】106 个前端测试文件中 **63 个（440 条断言）** 用 `toContain('…中文…')` 锁死 UI 中文字面量。连**新增的 M65 测试** `CompanionShell.test.tsx` 也在重复该脆弱模式：`toContain('AI 历史学家')`/`toContain('解释')`/`toContain('对话')`…。测试量从 941→951 微增，断言范式未变——"改一词红全盘"风险依旧。

**3. M65 真实 AI 运行时测试是否跟上？—— 没有。**
【已核实】`git show 13335c5`（提交信息"add CompanionContext + Shell + Router tests"）实际只加了 `CompanionShell.test.tsx`（5 个测试）。仓库现存 Companion 测试文件**仅此一个**。

- `CompanionRouter.tsx`（激活 Chat/Explain/Discover 真实 AI 模式）—— **无测试**
- `useCompanionAI.ts`（连接后端 `/ai/*` 的真实运行时 hook）—— **无测试**
- `CompanionContext.tsx`（m65-phase3c 实体上下文感知）—— 仅 `CompanionShell.test.tsx` 里一个"越界抛错"负向用例，无行为测试
- `AISidebar.tsx` —— **无测试**

且该测试用 `renderToStaticMarkup` + `toContain` 中文，其"Router Tests"只渲染 Shell 查 `ai-explanation` class，**根本不触发真实模式切换或真实 AI 调用**。

【已核实】**无 E2E 框架**：无 `playwright.config`/`cypress` 配置、无 `e2e/` 目录。M65 最高风险的新能力（真实 AI 调用链 CompanionRouter→useCompanionAI→backend）零集成/端到端覆盖。

---

## 各自问题（优先级）

- **P0 真实 AI 运行时零测试覆盖**：CompanionRouter / useCompanionAI / CompanionContext 行为无自动化防护。风险：核心新能力若回归，无测试拦截，且门禁绿灯不报警。建议：补 `useCompanionAI` mock-AI 集成测试 + CompanionRouter 模式切换测试（断言 class/role/loading/error 态），M65 收尾前至少点亮真实链路。
- **P1 断言锁死中文字面量（63/106 文件）**：i18n 改一词即 951 红。建议：契约化断言——键存在 + DOM 结构 + role/aria，文案抽 snapshot。
- **P1 门禁"required"状态不在仓库内**：`ci.yml` 注释称"在 GitHub 设置 required"，文件本身未强制；`release-consistency` 显式 advisory（push-only + continue-on-error）。治理不可自检。建议：把 required status check 落到 ADR/CI 可审计处。
- **P2 无 E2E / 真实流**：探索→对话→导出零端到端。建议：引 Playwright 跑 1–2 条核心旅程作强制门禁。
- **P2 visual-check 软**：仅 4 个 M62 硬编码 class FAIL，其余色彩/px 全 WARN（GraphViewPanel 22 处硬编码色）。建议：升像素对比 + axe-core + 性能预算。
- **P2 ci.yml 无 perf/a11y/health/deploy 链路**：本地 `grep` ci.yml 确认仅 freeze/visual/emoji/structure/pytest/tsc/build。生产就绪缺可观测与回滚。

---

## RoleVerdict

**`conditional`** —— 门禁绿、无 CI 阻断缺陷，但**商业交付条件未满足**。

- **blocking**：M65 真实 AI 运行时（CompanionRouter / useCompanionAI / CompanionContext 行为）零测试覆盖——须补至至少点亮真实调用链，否则核心新能力处于零防护状态。
- **advisory**：① 契约化断言去脆（降"改一词红全盘"）；② 补 E2E 冒烟；③ 将 required status check 与 release-consistency 从 advisory 提升为可审计强制；④ 扩 visual-check 为像素/a11y/性能门禁；⑤ ci.yml 增 /health 探活与版本化回滚。

> 一句话：门禁守住了"不能乱改"，但没守住"改对没"。上份报告的符号图标 P0 已修复是亮点；M65 真实 AI 这条最该测的线却仍是盲区，是本次体检最该补的洞。
