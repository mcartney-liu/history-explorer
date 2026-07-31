# History Explorer 架构健康体检 — Architect（高见远）

> 评估时间：2026-07-30｜HEAD = `a690645`（master）｜tag vM62.5｜范围：当前真实状态（实拉 `git`/`grep` 核验）

---

## 一、总体评估：方向是否偏离？

**结论：相对真实基线（CURRENT_ARCHITECTURE_BASELINE.md §3 + ADR-0003），方向未偏离。但 PO 复述的红线"禁 AI/LLM 运行时"已过时。**

- 【已核实】该红线在 M11（ADR-0003，PO 批准 2026-07-24）已被修订为"受控例外"，并在 M36.0（2026-07-27，PO 批准 Freeze Revision）激活。基线 §3 明文允许 `backend/app/ai_gateway/` 内的 grounded AI。
- 【已核实】M65 的"真实 AI 运行时"并非 M65 引入：`git diff --name-only db7ce68..HEAD -- backend/` 为空——M65 **backend diff = 0**，是纯前端里程碑。真实 AI 基座在 M36.0 落地（`ai_gateway/` + `main.py` 挂载 `/ai/explain`、`/ai/chat`）。
- M65 仅把前端 Companion Chat/Explain/Discover 接到既有 `aiClient.ts → /ai/*`。前端 Companion 文件位于 `frontend/src/components/ai/`、`data/ai/`，两目录前缀由 **M59-011（AI Companion Architecture, Frontze Revision Gate）预授权**。
- 是否走 Gate？AI 基座在 M36.0 走了 Gate；M65 前端接线落在 M59-011 授权目录内；但 M65 自增的 exploration-shell/discover/多合并/timeline/workspace 等 allowlist 条目，仅以代码注释"PO-approved 2026-07-30"记载，**docs/15_DECISIONS/ 下无独立 M65 ADR**（见 P1-B）。
- 此外 PO 红线提及"禁 Recommendation"亦不准确：确定性推荐引擎（M9）即产品核心（基线 §1"Deterministic engine is the source of truth"），M65 Discover 复用的即其后端 `fetchRecommendations()`，freeze-check 的 FORBIDDEN_TOKENS 亦不含 recommendation。

**一句话：M65 未撞"禁 AI"红线（该红线本身已被 Gate 修订）；真正问题是红线叙事与已发布/已激活代码之间的张力，及 M65 缺独立闸口文档。**

---

## 二、各自问题

### P1（方向/治理澄清，须 PO 裁定）
- **P1-A AI 红线叙事过时**：【已核实】基线 §3 已明文允许 ai_gateway 受控 AI，PO 复述仍称"禁 AI/LLM 运行时"。风险：后续里程碑无法据此判方向；且"配 `OPENAI_API_KEY` 即激活、无 CI 断言默认 off"构成审计盲区（延续上份报告后端 P2）。
- **P1-B M65 缺独立 Freeze Revision ADR**：【已核实】`docs/15_DECISIONS/` 仅有 ADR-0001~0006 + M34-ADR-001，无 M65 文档；M65 在 allowlist 新增 9 条（含 `shell/`、`discover/` 两目录前缀 + 7 精确文件），仅代码注释记载 PO 批准，审计轨迹不在决策库。
- **P1-C allowlist 继续膨胀 + 最小权限退化**：【已核实】`SCOPE_ALLOWLIST` 现 **206 条，其中 17 条为目录前缀（broad）**。M24 时仅 2 条精确文件；M62.5 注释自诩"精确路径、无 broad 前缀"，但 M35/M59 后已开 `components/ai/`、`data/ai/`、`pages/`、`styles/`、`ui/`、`entity/`、`workspace/` 等宽前缀——最小权限纪律退化。

### P2（技术债/扩展）
- **P2-A** 情报层无交叉校验：M43–M49 五模块独立累加、仅手工数据，M63 W2 收敛前仍缺 golden-file 校验（延续上份报告 P1）。
- **P2-B** 技术栈陈旧：React18.3 + Vite5 无升级路线（延续上份报告 P3）。

### P3（正向 / 已收敛）
- 【已核实】`node scripts/freeze-check.mjs` 在当前 HEAD 实跑 **PASSED**（无 D-class 违规）；`requirements.txt` 仍仅 `fastapi/uvicorn/openai`（唯一批准 SDK）；enum 守卫（`validation.py` frozenset）在位。
- 【已核实】工作树较上份报告（87 未提交）显著收敛：当前仅 1 条未跟踪（`docs/M63_DECISION_WORKSHOP.md`），基本干净。

---

## 三、RoleVerdict

**verdict: conditional**

**blocking:**
1. PO 须显式裁定 AI 运行时归属：维持 ADR-0003/M36.0 例外 → 在基线/ADR 补明文 + CI 断言默认 off；若撤回 → M65 Companion AI 调用须回退。否则方向判定无锚点。
2. 补 M65 独立 lightweight Freeze Revision ADR，将代码注释"PO-approved 2026-07-30"落档至 `docs/15_DECISIONS/`。

**advisory:**
- allowlist 瘦身：`components/ai/`、`data/ai/` 等宽前缀收回到精确文件（仿 M36.0 后端 5 文件精确登记），防 AI 域静默越界受控契约。
- 按 milestone 分文件 + TTL 管理 allowlist，降审批熵。
- 情报层补 cross-module 校验；规划 React18→19 非破坏性路线。
- 冻结守住了"不能做什么"，但缺"怎么健康地做"范式——沉淀 allowlist 分组 + ADR 模板化。
