# M65 Release History Audit

> 模式：严格只读（未 commit / 未 push / 未 tag / 未 merge / 未改文件）
> 执行时间：2026-07-30 23:49 GMT+8
> 数据来源：实时 git 命令输出（非记忆推断）

---

## 0. 仓库基准事实（实时核验）

| 项 | 值 |
|---|---|
| 本地分支 | `master` |
| 本地 HEAD | `7ad7005` (fix(workspace): rail overflow and accessibility fix) |
| origin/master | `8efebf3` (2026-07-28 13:33:39, "feat(product): add product decision insight fusion layer") |
| 领先 commit 数 | **60** (`git rev-list --count origin/master..HEAD`) |
| 60 个 commit 的公共祖先 | `8efebf3`（即 origin/master = 第 60 个 commit `2849a6b` 的父） |
| fast-forward 关系 | 是 — origin/master 是 HEAD 的祖先，常规 push 即可，无需 force |

**关键校验**：`git merge-base --is-ancestor` 对所有 vM 标签均返回 `exit=1`，证明
**vM62.5(9d7aa2e)、vM62(68cd0fa)、HEAD(7ad7005) 全部不在 origin/master 上** →
本仓库自 `8efebf3` 之后所有 60 个 commit 及全部里程碑 tag **从未推送到远端**。

---

## 1. git log origin/master..HEAD --oneline（60 条，按新→旧）

```
 1  7ad7005 fix(workspace): rail overflow and accessibility fix
 2  bad2925 feat(m65): companion AI foundation and graph governance
 3  a690645 feat(m65-phase3d): activate Companion Discover mode with backend recommendations
 4  567efa4 feat(m65-phase3d): wire TimelineStrip dot click to entity navigation
 5  75f8f9d feat(m65-phase3d): activate Companion Chat mode with real AI runtime
 6  5bc138c feat(m65-phase3c): add AI entity context awareness
 7  1153dcd feat(m65-phase3c): extend AI context with entityType + multi-entity contextGlobalIds
 8  13a6a9f feat(m65-phase3c): activate CompanionRouter Explain mode with real AI runtime
 9  fd6179d feat(m65-phase3b): bridge Workspace → Companion context (one-way)
10  d56ec8a feat(m65-phase3b): add unified Workspace persistence layer
11  d4e88dd feat(m65-phase3b): add entity pin/unpin to Workspace
12  c8f7a1e feat(m65-phase3a): establish TimelineStrip controlled navigation loop
13  c791234 feat(m65-phase3a): add interactive dot selection to TimelineStrip
14  f23294b feat(m65-phase3a): feed timeline data into ExplorationShell
15  e018142 feat(m65-phase3a): wire TimelineStrip into ExplorationShell timeline slot
16  5f5c1b8 feat(m65-phase3a): add TimelineStrip — bottom-axis timeline bar
17  a79ade1 feat(m65-phase2c): add ResearchSuite — unified Research panel-family entry
18  3107aed refactor(m65-phase2c): wire App.tsx to CrossTopicView — unified CrossTopic entry
19  a51b17a refactor(m65-phase2c): wire App.tsx to ExplorationPath — unified Journey entry
20  8a794cc refactor(m65-phase2c): wire App.tsx to RelationshipContext
21  8a7fecf feat(m65-phase2c): add RelationshipContext — unified Connections entry
22  13335c5 test(m65-phase2b): add CompanionContext + Shell + Router tests
23  a934e71 feat(m65-phase2b): connect CompanionRouter to real AI Views
24  782fa86 feat(m65-phase2b): replace CompanionPlaceholder with CompanionShell
25  9f20cc3 feat(m65-phase2b): add CompanionShell foundation with internal context
26  ebd69b0 refactor(m65-phase2a): migrate DiscoverPage entity cards to TopicCardGrid
27  e7ec609 refactor(m65-phase2a): migrate LandingPage to shared discover components
28  0feea52 feat(m65-phase2a): add shared discover components
29  05c137d fix(m65): restore root stacking context for exploration shell
30  d93dc51 test(m65): align structural tests with exploration shell
31  cf5900b refactor(m65): move workspace into exploration rail
32  66c11dd refactor(m65): migrate app rendering into exploration shell
33  db7ce68 feat(m65): add exploration shell foundation
34  44e33b9 style(m65): add exploration space tokens and layout foundation
35  60ef04e M62.x Strategic Freeze — governance foundation for future Blueprints
36  7bca32a fix(frontend): validate topic against backend pattern before fetch — prevent misleading 400 on Chinese input
37  e4a5462 fix(frontend): RelatedEntityList duplicate React key — person-zhang-qian
38  f17de2f fix(frontend): workspace column no longer stretches to match main column height
39  83c50d3 refactor(frontend): LanguageSwitcher — buttons to dropdown select
40  124a6d0 fix(frontend): guard handleExplore against non-string topic
41  4da1c65 chore: pre-M63 hygiene — archive stray reports + design-system docs, gitignore pip residue
42  9d7aa2e feat(m62.5): Global Language Experience System — i18n/l10n + emoji-free hardening
43  68cd0fa feat(m62): ux convergence and trust layer foundation
44  4e3c5c5 docs(release): sync README/PROJECT_CONTEXT/CHANGELOG to vM60
45  5842bcf chore(freeze): M61-bridge-build Freeze Revision Gate (ADR-0004 + allowlist)
46  a6f27e1 fix(frontend): M61-bridge-build — resolve 55 latent TypeScript errors
47  6ad42b0 docs: add History Explorer Development Playbook V1.0
48  257a733 docs: freeze History Explorer Design System V1.0 FINAL
49  61eb4c5 fix(frontend): M60 dev-server ReferenceError — rollback broken GroundedAnswer + AIExplanationPanel API calls in EntityPage
50  9af4097 fix(frontend): M60 dev-server breakage — remove duplicate navigateToEntity call + LandingPage parse error
51  ffdb4ca feat: M60-003 Landing Page productization (P0)
52  899e429 fix: homepage layout + workspace entity name bug
53  9eb0957 feat: M60 i18n support + homepage layout
54  1484505 feat: M60 product experience upgrade
55  bdff561 feat: complete M59 productization foundation
56  7faf9ec docs(release): sync README to vM58
57  3321cfb feat: M55-M58 pipeline calibration + UI design system
58  2b1e6b2 docs(release): sync vM53 documentation
59  b722c85 feat(product): add intelligence pipeline auto activation
60  2849a6b docs(release): sync vM52 documentation
```

---

## 2. 按 milestone 分类

### M65 — 34 个 commit（#1 ~ #34）
- 覆盖 `style(m65)` → `feat(m65)` → `refactor(m65)` → `test(m65)` → `fix(m65)` →
  `m65-phase2a/2b/2c` → `m65-phase3a/3b/3c/3d` → 正式 `feat(m65)` → Workspace Rail Fix。
- 含本次已提交的双 commit：`bad2925`（feat(m65)）+ `7ad7005`（fix(workspace)）。
- **这是真正待发布的新里程碑**，全部未推送。

### M63 — 0 个 commit ⚠️
- 在 60 个 commit 中**没有任何 commit message 包含 "M63"**。
- 仓库存在规划文档 `M63_EXECUTION_PLAN_V1.0.md`、`M63_STRATEGIC_DIRECTION_REVIEW.md`，
  但**实际实现未以 M63 独立提交**——原计划 M63/M64 的 phase 工作已被重新归入 M65 的
  `phase2a~phase3d` 命名体系下执行。
- 结论：**M63 作为独立发布里程碑在本仓库不存在**。

### M64 — 0 个 commit ⚠️
- 同理，**没有任何 commit message 包含 "M64"**。
- M64 未被单独实现/发布，工作随 M63 一并并入 M65。

### 其他（非 M63/M64/M65）— 26 个 commit（#35 ~ #60）
| 子类别 | commit | 说明 |
|---|---|---|
| M62.x 战略冻结 | `60ef04e` (#35) | 治理基线，介于 M62.5 与 M65 之间 |
| M62.5 工作 | `9d7aa2e` (#42, tag vM62.5) / `68cd0fa` (#43, tag vM62) | 全局语言系统 / UX 收敛 |
| M61 工作 | `5842bcf` (#45) / `a6f27e1` (#46) | 冻结修订门禁 + 55 个 TS 错误修复 |
| M60 工作 | `61eb4c5`~`1484505` (#49~#54，含多个 M60 引用) | 落地页产品化 / dev-server 修复 / i18n |
| M59 | `bdff561` (#55) | 产品化基础 |
| M55–M58 | `3321cfb` (#57) / `7faf9ec` (#56, vM58) | 管线校准 + UI 设计系统 |
| M53 | `2b1e6b2` (#58, vM53) | 文档同步 |
| M52 | `2849a6b` (#60) | 文档同步 |
| 通用前端修复 | `7bca32a`/`e4a5462`/`f17de2f`/`83c50d3`/`124a6d0` (#36~#40) | 输入校验 / React key / 布局 / 语言切换器 |
| 杂项 | `4da1c65` (#41, pre-M63 清理) / `6ad42b0`(#47) / `257a733`(#48) / `4e3c5c5`(#44) / `b722c85`(#59) | chore/docs |

> 注：这些 #35~#60 的 commit 虽早于 M65，但**同样从未推送**——它们都在
> `origin/master(8efebf3)` 之上。其中 `vM52`/`vM53`/`vM58`/`vM59`/`vM60`/`vM62`/`vM62.5`
> 七个 tag 全部为**本地未推送**状态。

---

## 3. 当前已有 tag

- **vM62.5 → `9d7aa2e`**（`feat(m62.5): Global Language Experience System`，2026-07-30 02:41:04）
- 本地全部 vM* tag 列表（节选相关）：`vM52 vM53 vM58 vM59 vM60 vM62 vM62.5` 以及更早期
  `vM9-006`…`vM50` 等。
- **重要**：经 `merge-base --is-ancestor` 校验，`vM62.5`/`vM62`/其余 vM5x 标签**均不在
  origin/master 上** → 全部为本地私有，远端无对应 tag。
- ⚠️ **与历史记忆冲突提示**：此前工作记忆记载"vM62 已发布并推远端"，但本次实时核验显示
  origin/master=`8efebf3` 且所有 vM 标签均未推送。可能原因：本地仓库被重置/重建，或先前
  push 到了不同远端/分支。**以本次实时 git 事实为准**，建议 PO 在 push 前用
  `git ls-remote --tags origin` 二次确认远端真实 tag 状态，避免重复/冲突推送。

---

## 4. 建议（供 PO 拍板，本轮未执行任何操作）

### 4.1 是否需要补 vM63 / vM64 tag —— **不需要**
- 理由：M63/M64 作为独立里程碑**不存在对应 commit**（工作已并入 M65 phase 体系）。
- 若强行打 `vM63`/`vM64` tag，会产生**空里程碑/幽灵 tag**，违背"改动只增不改 + tag 对应真实
  发布"的冻结纪律。
- 正确做法：以**实际完成的里程碑 M65** 为发布单元打 `vM65`。

### 4.2 是否一次性 push —— **建议一次性 fast-forward push**
- 关系已确认为 fast-forward（origin/master 是 HEAD 祖先），`git push origin master` 即可，
  **严禁 force / --force-with-lease / rebase / squash**（违反发布铁律）。
- 60 个 commit 体量较大但属同一特性演进，分多次 push 无收益且增加风险，一次性推送更干净。

### 4.3 push 后 tag 策略 —— **annotated tag + 里程碑 tag 一并推送**
1. **发布前**：先跑 `scripts/release-consistency-check.mjs` 复验 7/7（R4/R5/R6 按最新
   project tag 判定），并补全 CHANGELOG / README / PROJECT_CONTEXT 的 M65 里程碑条目。
2. **打 vM65**：在 HEAD(`7ad7005`) 打 **annotated** tag，真实时间，`-m` 说明 M65 范围
   （companion AI foundation + graph governance + workspace rail fix）。runtime 保持
   `0.13.0`，不 bump（无 runtime/契约变更）。
3. **推送顺序**（沿用双轨铁律：master 与 tag 分两次 push）：
   - `git push origin master`
   - `git push origin vM65`
4. **历史里程碑 tag 是否补推**：`vM52`~`vM62.5` 七个 tag 指向的 commit 将随 master 一并
   进入远端，但 **tag 对象本身需显式推送**。建议用
   `git push origin master --follow-tags`（仅推送可从 HEAD 到达的 annotated tag），
   一次性补齐 vM52~vM62.5 + vM65；**不要用 `git push --tags`**（会连带推送 vM9-006 等
   远古 tag，可能超出本次发布范围，引发远端预期外变更）。
5. **冻结护栏**：push 后复跑 `freeze-check.mjs` + `visual-check.mjs` + `tsc` + `vitest`
   确认远端一致；M65 后端 diff=0、ENTITY_TYPES=8、RELATIONSHIP_TYPES=18 维持不变。

### 4.4 一句话执行蓝图（待 PO 批准后由我执行）
```
# 1. 补文档里程碑条目 + 跑 consistency 7/7
# 2. git tag -a vM65 -m "M65: companion AI foundation, graph governance, workspace rail fix"
# 3. git push origin master            # ff-only
# 4. git push origin master --follow-tags   # 推送 vM52~vM62.5 + vM65
# 5. 复验 freeze/visual/tsc/vitest
```

---

## 5. 审计结论

- 60 个未推送 commit = **M65(34) + M62.x 战略冻结(1) + 早期 M52–M62.5 工作与通用修复(25)**。
- **M63 / M64 独立里程碑在本仓库不存在**（已被合并进 M65 phase 体系）。
- **所有 vM52~vM62.5 里程碑 tag 均为本地未推送**，与历史记忆"vM62 已发布"冲突，以本次实时
  核验为准，push 前建议 `git ls-remote` 二次确认远端状态。
- **不补 vM63/vM64 tag**；以 **vM65** 作为唯一新发布里程碑；建议一次性 ff push + follow-tags
  补齐历史里程碑 tag。
- 全程零写操作，HEAD 仍 `7ad7005`，等待 PO 最终确认后进入 push 阶段。
