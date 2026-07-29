# History Explorer — 发布就绪度评估（2026-07-29）

> 所有仓库事实均来自本次实时 `git` / 脚本核验，非记忆值。
> 评估时间：2026-07-29 11:09 GMT+8

## 结论：🔴 NO-GO（当前不能上线发布）

三个硬阻塞均未解除：发布一致性闸门 4/7 FAIL、前端生产构建坏（55 个 TS 错误）、master 领先 origin 14 个 commit 未推送。

---

## 实时仓库事实（来源：git 现查）

| 项 | 值 |
|---|---|
| HEAD | `6ad42b0`（docs: add History Explorer Development Playbook V1.0） |
| master vs origin/master | **ahead 14**（未推送） |
| 最新 project tag（按时间） | **vM59**（2026-07-29 01:32，annotated，指向 `3bbdb00`） |
| HEAD 相对 vM59 | 之后 **8 个 commit**（M60 工作 + 2 个 docs） |
| Runtime 版本 | `0.13.0`（package.json / tag v0.13.0 均存在且 annotated） |
| 工作树 | 仅 1 个未跟踪项 `.pip_target/`（pip 目标目录，非项目代码，不影响发布） |

vM59 之后的 8 个 commit：
```
6ad42b0 docs: add History Explorer Development Playbook V1.0
257a733 docs: freeze History Explorer Design System V1.0 FINAL
61eb4c5 fix(frontend): M60 dev-server ReferenceError — rollback broken GroundedAnswer + AIExplanationPanel
9af4097 fix(frontend): M60 dev-server breakage — duplicate navigateToEntity + LandingPage parse error
ffdb4ca feat: M60-003 Landing Page productization (P0)
899e429 fix: homepage layout + workspace entity name bug
9eb0957 feat: M60 i18n support + homepage layout
1484505 feat: M60 product experience upgrade
```

---

## 闸门结果

### ✅ 绿灯（已通过）
- **冻结基线 freeze-check：PASS**（无 D 类违例；backend/frontend 冻结 intact，无禁项依赖/AI/DB）
- 一致性 **R1** PASS：package.json 纯 semver `0.13.0`
- 一致性 **R2** PASS：runtime tag `v0.13.0` 存在且 annotated
- 一致性 **R3** PASS：project tag `vM59` 存在且 annotated（按 creatordate 取最新）
- 一致性 **R7** PASS：checker 仅只读（for-each-ref）
- M60 dev-server 崩溃已被 `61eb4c5` / `9af4097` 修复（开发态可跑）

### 🔴 红灯（阻塞）
1. **发布一致性 4/7 FAIL**（R4 / R5 / R6）
   - **R4 README**：`Latest Project Release` 写的是 **vM58**，但最新 tag 是 **vM59** → 不匹配
   - **R5 PROJECT_CONTEXT §5**：Current State 仍写 **Project Release vM53** → 不匹配
   - **R6 CHANGELOG**：最新条目停在 **[vM53]**，无 [vM59] / [vM58] 条目 → 缺失
   - 即：文档自 vM53~vM59（及 M60）从未同步到版本同步文档，存在显著 doc drift
2. **前端生产构建坏**（`tsc && vite build` 会卡在 `tsc`）
   - `tsc --noEmit` 报 **55 个 TS 错误**
   - 真 bug（非仅未用变量）：`JourneyCard.tsx`（null/类型谓词）、`EntityInsightModel.ts`（`{}[]` vs `string[]`）、`UserBehaviorEvent.ts`（timestamp）、`ExplorationHistoryModel.ts`（NavNode 缺 name/id/topic）、`DevCatalog.tsx`（缺 `id`、EntityInsight 类型错）——后两者是 M60 Landing Page 代码
   - 其余多为 `TS6133` 未用声明（lint 级，但量大会拖垮 build）
3. **未推送 + 范围模糊**
   - master 领先 origin 14 commit；vM59 tag 也未在 origin
   - 发布铁律要求：ff-merge master → annotated vM tag → master+tag 分两次 push → ls-remote 复验 → 一致性 7/7
   - 当前 8 个 M60 commit 既未打 tag 也未文档化，需先决定"发 vM59 还是收成 vM60"

---

## 建议发布路径（待 PO 拍板）

**选项 1（推荐）— 收成 vM60 一次性发布**
先把当前 HEAD 这 8 个 M60 commit 作为一次 `vM60` 发布：
1. 清 55 个 TS 错（历史上已规划为 **M61-bridge-build，需 ADR 立项**，本就是要做的收口）
2. 把 README / PROJECT_CONTEXT / CHANGELOG 同步到 vM60（含 M54–M60 内容）
3. 跑一致性到 7/7
4. ff-merge + annotated vM60 tag + master/tag 分两次 push + ls-remote 复验

**选项 2 — 只补文档发 vM59**
把三份文档对齐到 vM59，M60 那 8 个 commit 暂不发布、悬在 master。
→ 不推荐：README 现在还写 vM58，即使发 vM59 也得先修文档；且 M60 功能无法随版本出去，意义不大。

**选项 3 — 暂不发布，先打磨 M60**
先把 M60 这波类型错误和设计系统收尾做完，再统一评估。
→ 合理，若翔哥想先打磨体验可选；但构建错误本身就是发布前必须清的债。

---

## 备注
- 本机 `scripts/freeze-check.mjs` 于 07-29 08:35 有改动；`visual-check.mjs` 为 07-29 新增脚本（本次未运行）。
- 项目内存 `MEMORY.md` 基线（写于 vM35.1.1 时代）已严重过时，本次以实时 git 为准重写结论。
