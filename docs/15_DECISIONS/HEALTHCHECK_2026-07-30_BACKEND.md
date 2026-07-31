# History Explorer 后端健康体检报告

> 评估人：贝洛奇（后端工程师）｜HEAD = `a690645`（M65 WIP）｜方法：实拉 `git`/`grep`/读基线+ADR+`freeze-check`

## 1. 总体评估：冻结完整性 + AI 运行时红线判定

**【已核实】"禁 AI/LLM 运行时"红线已被基线明文 carved 为批准例外。** `docs/10_ARCHITECTURE/CURRENT_ARCHITECTURE_BASELINE.md` §3 标题即 *"Approved Exception — M11 Grounded AI Interpretation Layer (ADR-0003, Gate Passed)"*；§3/§6 写明 AI 运行时**仅**允许存在于 `backend/app/ai_gateway/`，additive + grounded。因此红线并非绝对——AI 是经批准的例外，不是违规。

**【已核实】AI 默认关闭，非"配 env 即激活"。** `backend/app/ai_gateway/config.py:34` 中 `enabled = _as_bool(os.environ.get("AI_GATEWAY_ENABLED"))` → 未设即 `False`；`provider.py::get_provider` 在 `enabled` 或 `credentials` 任一缺失时返回 `None` → 走确定性 fallback。仓库内**无任何文件**提交 `AI_GATEWAY_ENABLED=true` 或密钥（`git grep` 确认）。上份报告"配 OPENAI_API_KEY 即悄然激活"的判断不准确——还需显式 `AI_GATEWAY_ENABLED=true`。

**【已核实】Gate 已走，且门禁实时通过。** ADR-0003（PO 批准 2026-07-24）+ 基线 §3/§6 修订；M36.0 在 `scripts/freeze-check.mjs:266-285` 有 PO 批准 allowlist 条目（标注为 ADR-0003 演进）；event causal layer (`f27d0b6`) 在 `:286-297`。实时运行 `node scripts/freeze-check.mjs` → **PASSED**（无 D 类违规）。

**【已核实】PO 前提"backend diff 自 M9 起=0"与 git 实拉不符，属陈旧叙事。** `git log -- backend/` 显示 backend 自 M11（AI 网关）→ M24/M25.1/M26.1（数据/来源/证据层）→ M29.1（provenance）→ M35 → M36.0 → event causal (`f27d0b6`, 2026-07-27) 均有提交，全部 additive + 已 Gate。冻结是**健康的可控增量**，非"零 diff"。

**【已核实】M65 未触碰后端，红线未破。** `git show --stat HEAD~5..HEAD` 的 6 个提交全部是 frontend（`CompanionRouter`/`useCompanionAI`/`TimelineStrip`/`Workspace`/`CompanionShell`）。M65 "activate real AI runtime" = 前端接通**既有** `/ai/explain`、`/ai/chat` 端点；`backend recommendations` 指复用 M9-001 确定性 `/entity/{id}/recommendations` 引擎，非 AI 网关。后端零改动。

**判定**：AI 红线未破；Gate 已走；M65 合规。但"真实 AI 运行时"实际是否运行，取决于运维是否启用 `AI_GATEWAY_ENABLED`——目前无书面启用决策。

## 2. 各自问题（P0/P1/P2）

- **P0：无致命红线突破。** 无新依赖（除白名单 `openai`）、无 DB、无 schema/枚举变更、无越权 AI 代码。
- **P1 数据策展治理缺口**：`data/examples/*.json` 是确定性引擎与 AI grounding 的**共同唯一事实源**，但 `freeze-check` 的 `checkScope` 对 `data/` **全跳过**（M31 注释明示）；`f27d0b6` 一次性新增 454 行示例数据仅配套 test 改动，无强制 schema/校验评审门禁。建议把 `dataset_validator` + `build_global_validation_report` 接成 CI required check，`data/` 变更须 PR 评审。
- **P1 AI 启用缺书面决策**：M65 把"真实 AI 运行时"接通，但启用 `AI_GATEWAY_ENABLED` 应是 PO 签字的运行决策/runbook（含回滚），不应由前端 commit message 暗示。建议补一份启用决策记录。
- **P2 缺"AI 默认关闭"机器断言**：`freeze-check` 不校验 `AI_GATEWAY_ENABLED` 是否被提交为 `true`；当前仓库干净但无自动护栏，存在静默回归风险。建议补 CI 断言禁提交 `true`。
- **P2 扩展硬墙**：内存单点启动载入、无刷新/分页；event causal 等数据增长推高启动耗时/内存。`provenance` 只读读模型（M29.1）为推荐范式。

## 3. RoleVerdict

```
verdict: conditional
blocking:
  - P1: data/examples 数据策展无强制校验门禁（freeze-check 对 data/ 跳过），454 行新增数据无评审护栏
  - P1: AI 运行时启用缺 PO 书面决策/runbook（仅由 M65 前端提交暗示）
  - P2: 无 CI 断言禁止提交 AI_GATEWAY_ENABLED=true（默认关闭未机器守护）
advisory:
  - 修正"backend diff 连续 21 里程碑=0"陈旧叙事（git 实拉显示 M11→M36.0→event causal 均有 backend 提交）
  - 内存单点载入扩展性：评估惰性分片（仍须 Gate）
  - allowlist 持续膨胀（freeze-check 已数百条），建议按特性目录分组 + ADR 模板化降审批熵
  - 推荐域后续闸门（RecommendationPanel/Hub）需 PO 预批（架构师 M63 主张）
```

> 证据：所有【已核实】项均来自 `git`/`grep`/`Read` 实拉；`freeze-check` 实时运行 PASSED。
