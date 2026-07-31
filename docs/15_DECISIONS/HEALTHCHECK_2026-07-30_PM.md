# History Explorer 健康体检 · 产品经理专项报告（许清楚）

> 评估时间：2026-07-30 ｜ 当前 HEAD = `a690645`（master）｜ M65 进行中
> 方法：实读 PRD / Charter / DNA / Roadmap / M62x 战略冻结 / M63 决策工作坊 / CURRENT_ARCHITECTURE_BASELINE / Companion 组件 + git 核验
> 带【已核实】= 本人 Read/grep/git 亲自确认

---

## 一、总体评估

**方向是否符合设想**：基本符合，但偏早且"被工程默认"。PRD/DNA 的「AI 作为向导 + 四元共等 + 探索循环」方向一致，M65 把"可信 AI 伙伴"从愿景变成真交互是大进步【已核实 useCompanionAI.ts / aiClient.ts 调真实 `/api/v1/ai/explain|chat`】。但真实 AI runtime 走的是 ADR-0003 已批准的后端 ai_gateway（后台 diff 自 vM62.5 以来 = 0）【已核实 `git diff --stat vM62.5 HEAD -- backend/` 为空】，属"既批准例外"，**不是**硬冻结违规——所以任务里"禁 AI/LLM 运行时"的红线表述与基线文件不符，基线实际允许 ai_gateway 内运行时。

**用户交互是否充足**：显著变好。Companion 已是常驻可交互的"AI 历史学家"（解释/对话/发现三模式真跑），外加 TimelineStrip 点击导航 + Workspace 持久化，闭环体验远超上次报告"AI 伙伴仍是愿景"的状态。但"研究"模式是空壳（传空 entity/dimensions、onStart 空操作）【已核实 CompanionRouter.tsx】，会伤信任。

---

## 二、各自的问题（按优先级）

**P0 · 方向治理缺口（唯一动摇根基的风险）**
- 风险：M62.x 战略冻结把 Q1（AI 角色模型）、Q2（Museum）标为 **CRITICAL PO 决策、状态"等待 PO 决策"**【已核实 M62x_STRATEGIC_FREEZE_RESULT.md §5；M63_DECISION_WORKSHOP.md 明示"不推荐选项，等 PO"】。但 M65 已实现 CompanionShell = 单一 AI 伴侣（= 决策 A 的 Option A）并重构 shell（= Q4 持久工作空间方向）【已核实 CompanionShell.tsx 四模式 + git log】，且 git 中**无 M63/M64/M65 的 ADR**（M61/M62 有 ADR-0004/0005/0006）【已核实 git log】。这违反 PROJECT_CHARTER §7「AI Agents must not change product direction without approval」。
- 建议：补 ADR-0007 把已实现的 Companion + 探索 shell 作为"PO 追认 + 方向锁定"。
- 【选择题+推荐项】Q1 已被代码默认成 Option A：
  - **(推荐) A**：PO 追认单一伴侣 + 补 ADR-0007 锁定，继续；
  - B：PO 改选 Toolbox，M65 Companion 需重构为 5 入口（返工）；
  - C：冻结 AI 方向，回退 Companion 至占位，等 Q1–Q4 全决策（最慢）。

**P1 · "真实 AI"是否真对用户生效未验证**
- 风险：aiClient 调真实端点，但依赖部署环境 `OPENAI_API_KEY`；缺则静默回退 deterministic（engine='deterministic'），用户可能以为在用真 AI，"激活真实 AI runtime"声明失真【已核实 aiClient.ts + baseline §3 允许 ai_gateway】。
- 建议：明确上线 key 配置；用已有的 engine 字段向用户透明标注 ai/deterministic；补 CI 断言 openai 依赖仅限 ai_gateway 且默认不启用（回应上次后端 P2）。

**P1 · 前端单轨继续堆叠**
- 风险：前端 .tsx 96→160（+64），M63–M65 一口气加 ~64 组件，无对应 ADR/阶段门禁收口【已核实 git ls-files】。package.json 仍仅 react/react-dom，依赖边界守住【已核实】。
- 建议：M65 收尾即冻结新功能，按上次建议做 allowlist 目录化 + 设计系统入 CI。

**P2 · 研究模式死按钮 / Museum Q2 仍 OPEN**
- 风险："研究"入口为空壳损伤信任；Gallery vs Curatorial（Q2）未决但 shell 已落地，若 PO 选 Curatorial 需视觉回调。
- 建议：M65 内隐藏或接真数据的"研究"入口；ADR-0007 标注 Q2 仍 OPEN，shell 用可换肤 token 隔离。

**已改善（相对上次报告）**：M62.5 已发 tag、工作树干净（仅 1 份未跟踪 doc）【已核实 git tag / git status】；符号图标 P0 违规（★☆✓✗○⚠）已清零，仅存于 m62-emoji-guard 禁令测试【已核实 grep】。

---

## 三、RoleVerdict

**`conditional`**

- **blocking（违反项 / 证据 / 期望）**
  1. 方向治理缺口：M63–M65 在 Q1/Q4 CRITICAL PO 决策未下时由 agent 实现 Companion + shell，违反 Charter §7；无 M63–M65 ADR。证据：CompanionShell 实现 Option A【已核实】、git 无 ADR-0007+【已核实】、M62x 冻结 §5 列 Q1/Q2 等待 PO【已核实】。期望：产品方向变更须 PO 批准 + Freeze Gate。
  2. 真实 AI 生效条件未验证：依赖部署 `OPENAI_API_KEY`，缺则静默回退 deterministic。证据：engine 字段区分 ai/deterministic【已核实】、上线配置未知。期望："激活真实 AI runtime"声明须可验证。
- **advisory**：allowlist 目录化瘦身、设计系统入 CI、清理"研究"死按钮、Museum Q2 用 token 隔离、测试去脆（契约化断言 + E2E）。

---

## 四、给 PO 的一句话

M62.5 已干净发布、符号图标已清零、真实 AI 交互终于落地——这些都是实打实的进步；但 M65 在您尚未拍板 Q1/Q2/Q4 时已由工程把方向默认成「单一 AI 伴侣 + 持久探索 shell」，请尽快用一份 ADR-0007 追认或纠偏，这是当前唯一会动摇产品根基的治理缺口。
