# History Explorer 运维健康体检（DEVOPS / 卜宕机）

> 评估时间：2026-07-30；评估方：运维工程师 卜宕机
> 评估范围：HEAD `a690645`（M65 WIP），branch `master`，最新已发 tag `vM62.5`，runtime `0.13.0`
> 方法：实拉代码 `git`/`Bash` 核验 + 实跑 `ci.yml` 各门禁脚本

## 一、总体评估

**发布链路健康度（治理层）：改善明显，但链未闭环。**

上份报告（2026-07-30 团队体检）我本人指出的 4 项问题中，2 项 P0 已实核验解决：

- **【已核实】工作树**：当前 `git status --short` 仅 1 份未跟踪文档 `docs/M63_DECISION_WORKSHOP.md`（87→1），回滚/审计基线恢复可用。
- **【已核实】freeze allowlist 4 文件越界已补**：实跑 `node scripts/freeze-check.mjs` → `PASSED — no D-class violations`；`visual-check`/`emoji-scan`/`m62-structure-check` 均 `exit=0`。
- **【已核实】一致性 7/7 已绿**：实跑 `node scripts/release-consistency-check.mjs --verbose` → R1–R7 全 PASS，`RC_EXIT=0`；README / PROJECT_CONTEXT §5 / CHANGELOG 均已同步到 `vM62.5`（R4/R5/R6 验证通过）。

**能否干净发 M65？—— 治理/tag 层面"可以"，生产交付层面"不行"。**

- 可发（前置满足）：干净工作树 + 7/7 + 四道质量门全绿，满足铁律"ff-only + annotated tag（真实时间）+ 双 push + ls-remote 复验 + 7/7"的前置条件。
- 不可交付：没有任何部署/回滚/可观测链路，tag 切了用户也触达不到，生产就绪不达标。

## 二、各自问题

- **P0 一致性门禁仍仅 advisory（未 CI 化）**：**【已核实】** `.github/workflows/ci.yml` 中 `release-consistency` job 标 `continue-on-error: true` 且 `if: push` 才跑，不阻断合并。铁律要求的"7/7 必须过"实际靠人工纪律，broken release 仍可绿 CI 合入。建议：设为 master push 的 **required status check**，与 freeze/visual/emoji/structure 同级强制。

- **P0 部署/回滚/可观测全缺（生产就绪链路空白）**：**【已核实】** 仓库无 `Dockerfile`/`docker-compose.yml`/`cloudbaserc.json`/`vercel.json`/`deploy.yml`、`delivery/`、`DEPLOY.md`、`.env.example`；无 `/health` 端点；app 代码 0 处 `Sentry`/`RUM`/`prometheus`/`grafana`（仅 venv/pip 内部命中）；frontend `scripts` 仅 dev/build/preview/test，无 deploy。部署治理仅在 `ENGINEERING_PLAYBOOK §6 H1–H4`（经 ADR-0002 引用）为"文档意图"，未落地。建议：补 `/health` 探活 + 版本化回滚 + 部署 job（CI 触发）+ Sentry/RUM，形成"部署即发布"闭环。

- **P1 push 变通脆弱**：MITM 下 `openssl+wincred` 手动 push，易半推（master 推了 tag 没推），破坏"分两次 push"铁律。建议：push/tag 改由 CI 完成，消除本地环境依赖。

- **P2 自包含交付包缺失**：无 `delivery/` 与 `.env.example`，用户拿到无法"复制即跑"。建议：按交付标准产出自包含包（README + compose/cloudbaserc + .env.example + DEPLOY.md + 回滚说明）。

## 三、RoleVerdict

`conditional`

- **blocking**：
  1. `release-consistency` 仍为 advisory（非 required）→ 一致性不被机器强制，M65 可能带 broken consistency 发布；
  2. 零部署/回滚/可观测链路 → M65 无法真正交付与运维，生产就绪不达标。
- **advisory**：手动 push 变通脆弱（宜 CI 化）；缺 `.env.example`/自包含交付包；无 `/health` 探活与错误监控。

> 结论：M65 的"打 tag"前置已具备，但"发布即交付"闭环缺失。先补一致性 required 门禁与生产就绪链路，再发 M65 方为干净发布。
