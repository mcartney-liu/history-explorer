# M65 Release Preflight Report

> 模式：严格只读审计（无 commit / push / tag / merge / 改文件 / 改 CHANGELOG·README·PROJECT_CONTEXT）
> 生成时间：2026-07-31（基于本次 `git ls-remote` 实时核验）
> 状态：**WAITING FOR PO APPROVAL**

---

## 1. Remote State（远端真实状态，来自 `git ls-remote origin`）

| Ref | Local | Remote (GitHub) | 是否一致 |
|---|---|---|---|
| `master` | HEAD=`7ad7005`；本地 `origin/master`（过期）=`8efebf3a` | `60ef04e2d88eff143e99e1976869799e4eeb54d3` | **不一致** — 本地跟踪引用过期，远端领先 34 commit |
| `vM52` | `74a8c2a` | `74a8c2a` | ✅ 一致 |
| `vM53` | `af341de` | `af341de` | ✅ 一致 |
| `vM58` | `d789214` | `d789214` | ✅ 一致 |
| `vM59` | `3bbdb00` | `3bbdb00` | ✅ 一致 |
| `vM60` | `28cb92a` | `28cb92a` | ✅ 一致 |
| `vM62` | `c082634` | `c082634` | ✅ 一致 |
| `vM62.5` | `729e44a` | `729e44a` | ✅ 一致 |
| `vM63` | 不存在 | 不存在 | — |
| `vM64` | 不存在 | 不存在 | — |
| `vM65` | 不存在 | 不存在 | 待创建 |

**重要更正**：上一轮 *M65 Release History Audit* 结论"vM52~vM62.5 全部是本地未推送标签"**有误**——根因是当时 `origin/master`(`8efebf3a`) 是过期引用（`8efebf3a` 实为远端 `vM52` 指向的 commit，远端 master 早已推进到 `60ef04e`）。本次直接打 GitHub 权威核验后确认：**7 个历史 tag 全部已存在于远端且与本地 SHA 逐字节一致**，不存在标签冲突风险。

---

## 2. Commit Gap（提交缺口）

- 真实远端基线：`60ef04e`（= 远端 `master` 当前 tip，commit 类型已确认）
- 本地 HEAD：`7ad7005`
- **未推送 commit 数**：`git rev-list --count 60ef04e..HEAD` = **34**
- 起始祖先：`60ef04e`（= 本地 #34 `44e33b9` 的父提交）
- **Fast-Forward 检查**：`git merge-base --is-ancestor 60ef04e HEAD` → exit 0 → **FF_PUSH_ALLOWED = YES**
- 这 34 个 commit 全部为 M65 工作（见 §4），不含任何 backend 改动。

```
git rev-list --count 60ef04e..HEAD   → 34
git merge-base --is-ancestor 60ef04e HEAD  → exit 0 (FF OK)
```

**禁止 force push**：本场景为纯 fast-forward，无需也不会使用 `--force`。

---

## 3. Tag Gap（标签缺口）

- 已存在于 GitHub 且与本地一致：vM52 / vM53 / vM58 / vM59 / vM60 / vM62 / vM62.5（共 7 个）
- 缺失于远端：vM63 / vM64 / vM65
- 远端不存在的 tag（vM63/vM64/vM65）**不会与任何远端 ref 冲突**，可安全创建。

---

## 4. Milestone Mapping（里程碑映射，依据 commit history + tag + release boundary）

**判定原则**：不依赖文档存在与否，只看真实 commit message、tag、release 边界。

| Milestone | 真实 commit 数（未推送区间） | 远端已有 tag | 是否真实存在 |
|---|---|---|---|
| M60 | 0 | vM60（已存在） | 已完成、已发布 |
| M61 | 0 | （无独立 tag，并入后续） | 已完成、已发布 |
| M62 | 0 | vM62 / vM62.5（已存在） | 已完成、已发布 |
| M62.5 | 0 | vM62.5（已存在） | 已完成、已发布 |
| M63 | **0** | 无 | ❌ **不存在真实 commit** |
| M64 | **0** | 无 | ❌ **不存在真实 commit** |
| M65 | **34** | 无（待 vM65） | ✅ 唯一待发布里程碑 |

- **M63 是否存在真实 commit？** → 否。34 个未推送 commit 的 message 全部为 `m65` / `m65-phase2a`~`m65-phase3d` 前缀；`git log 60ef04e..HEAD` 中无任何含 "M63" 的提交。规划文档 `M63_EXECUTION_PLAN_V1.0.md` 存在，但**未形成发布 commit**，不构成里程碑。
- **M64 是否存在真实 commit？** → 否。同上，无任何 "M64" commit。
- **是否应创建 vM63 / vM64 tag？** → **不应**。会凭空制造"幽灵里程碑"，违反冻结纪律与发布铁律（tag 必须对应真实发布边界）。

**M65 的 34 个 commit 概览**（最新在上，最旧在下；首尾为本次双提交）：
```
 1 7ad7005  fix(workspace): rail overflow and accessibility fix        ← Commit 2
 2 bad2925  feat(m65): companion AI foundation and graph governance    ← Commit 1
 3 a690645  feat(m65-phase3d): activate Companion Discover mode ...
 4 567efa4  feat(m65-phase3d): wire TimelineStrip dot click ...
 5 75f8f9d  feat(m65-phase3d): activate Companion Chat mode ...
 6 5bc138c  feat(m65-phase3c): add AI entity context awareness
 7 1153dcd  feat(m65-phase3c): extend AI context ...
 8 13a6a9f  feat(m65-phase3c): activate CompanionRouter Explain mode ...
 9 fd6179d  feat(m65-phase3b): bridge Workspace → Companion context
10 d56ec8a  feat(m65-phase3b): add unified Workspace persistence
11 d4e88dd  feat(m65-phase3b): add entity pin/unpin to Workspace
12 c8f7a1e  feat(m65-phase3a): establish TimelineStrip controlled nav
13 c791234  feat(m65-phase3a): add interactive dot selection ...
14 f23294b  feat(m65-phase3a): feed timeline data into ExplorationShell
15 e018142  feat(m65-phase3a): wire TimelineStrip into ExplorationShell
16 5f5c1b8  feat(m65-phase3a): add TimelineStrip
17 a79ade1  feat(m65-phase2c): add ResearchSuite
18 3107aed  refactor(m65-phase2c): wire App.tsx to CrossTopicView
19 a51b17a  refactor(m65-phase2c): wire App.tsx to ExplorationPath
20 8a794cc  refactor(m65-phase2c): wire App.tsx to RelationshipContext
21 8a7fecf  feat(m65-phase2c): add RelationshipContext
22 13335c5  test(m65-phase2b): add CompanionContext + Shell + Router tests
23 a934e71  feat(m65-phase2b): connect CompanionRouter to real AI Views
24 782fa86  feat(m65-phase2b): replace CompanionPlaceholder with CompanionShell
25 9f20cc3  feat(m65-phase2b): add CompanionShell foundation
26 ebd69b0  refactor(m65-phase2a): migrate DiscoverPage entity cards
27 e7ec609  refactor(m65-phase2a): migrate LandingPage
28 0feea52  feat(m65-phase2a): add shared discover components
29 05c137d  fix(m65): restore root stacking context
30 d93dc51  test(m65): align structural tests
31 cf5900b  refactor(m65): move workspace into exploration rail
32 66c11dd  refactor(m65): migrate app rendering into exploration shell
33 db7ce68  feat(m65): add exploration shell foundation
34 44e33b9  style(m65): add exploration space tokens and layout foundation
```

---

## 5. Risk Assessment（风险评估）

| 风险项 | 等级 | 说明 |
|---|---|---|
| 非 fast-forward / 需 force | 🟢 无 | `60ef04e` 是 `HEAD` 祖先，纯 FF；远端 master 自 `60ef04e` 后无新提交（ls-remote 实测），无他人并发提交冲突 |
| 标签冲突 | 🟢 无 | vM65 远端不存在；vM52~vM62.5 本地与远端 SHA 一致，不会产生冲突 |
| 冻结基线破坏 | 🟢 无 | M65 仅动 frontend/runtime(test dep)；backend diff=0（见 §6） |
| 误推远古 tag | 🟡 可控 | 禁用 `git push --tags`；仅推 `vM65` 单 tag 即可避免带出 vM9-006 等历史 tag |
| 一致性制品未更新 | 🟡 待办 | CHANGELOG/README/PROJECT_CONTEXT 的 M65 里程碑条目**未更新**（本 preflight 阶段按规禁止修改）；需在正式 release 步骤补，并跑 `release-consistency-check.mjs` 复验 7/7 |

---

## 6. Recommended Push Plan（推荐发布方案）

### 门禁复核（Release Boundary，HEAD=`7ad7005` 含 `bad2925`+`7ad7005`）

> 以下四项在 *M65 Final Commit Phase*（2026-07-30）已实时跑过；本次 preflight 选 A 不重跑，标 **[previously verified]**。逻辑再确认：真实远端基线 `60ef04e` 是先前校验基线 `a690645` 的祖先，而 M65 全程未触 backend，故门禁结论只会更稳。

| 门禁 | 结果 |
|---|---|
| backend diff = 0（`60ef04e..HEAD -- backend/`） | ✅ **[previously verified]** 空 diff |
| freeze-check | ✅ **[previously verified]** PASSED（exit 0，无 D-class） |
| visual-check | ✅ **[previously verified]** exit 0（2 WARN 为 HEAD 既有，非 M65 引入） |
| tsc --noEmit | ✅ **[previously verified]** exit 0 |
| vitest run | ✅ **[previously verified]** 962 passed / 108 files，0 error |
| ENTITY_TYPES | = 8 ✅ |
| RELATIONSHIP_TYPES | = 18 ✅ |
| Runtime version | 保持 `0.13.0`，不 bump（仅 frontend test dep 变更，双轨铁律不触发） |

### 方案评估（A / B / C）

- **方案 A：`push master` + 创建并推送 `vM65`**（推荐 ✅）
  - GitHub 可追溯性：✅ 单一清晰 release 标记
  - 历史版本完整性：✅ 历史 tag 已在远端，无需补
  - 误推风险：🟢 最低（只动 1 个新 tag）
  - 冻结纪律：✅ 不补幽灵里程碑、不碰未发布历史
- **方案 B：`push master` + `--follow-tags`**
  - 会把 vM52~vM62.5 也尝试推送；因它们已存在且一致，服务端视为 no-op，无害但**多余**，且易误带出 vM9-006 等远古 tag → 不推荐
- **方案 C：只推 `master`，不推任何 tag**
  - 无 GitHub release 标记，M65 在远端不可作为独立版本追溯 → 不推荐

**结论：采用方案 A。**

---

## 7. Exact Commands（仅展示，未执行）

```bash
# 0. (可选) 刷新过期跟踪引用，避免后续审计再被 stale origin/master 误导
git fetch origin master

# 1. 推送 34 个 M65 commit（fast-forward，禁用 --force）
git push origin master

# 2. 创建 annotated tag vM65（runtime 保持 0.13.0，不 bump）
git tag -a vM65 -m "M65: companion AI foundation, graph governance, workspace rail fix"

# 3. 仅推送新 tag（禁用 git push --tags，避免带出远古 tag）
git push origin refs/tags/vM65

# 4. 推送后复验
git ls-remote --heads origin | grep master      # 期望 = 7ad7005
git ls-remote --tags origin  | grep vM65        # 期望存在且 = 本地新 tag

# 5. (发布步骤，需 PO 另行批准) 补制品 + 一致性门禁
#    - 更新 CHANGELOG.md / README.md / PROJECT_CONTEXT.md 的 M65 里程碑条目
#    - node scripts/release-consistency-check.mjs   # 期望 7/7
```

> ⚠️ 第 5 步（改 CHANGELOG/README + 跑 consistency）**不在本 preflight 范围内**（本阶段禁止修改），列为正式 release 的前置动作，待 PO 拍板后执行。

---

## CURRENT STATUS

**WAITING FOR PO APPROVAL**

- 本地 master = `7ad7005`（含双提交 `bad2925` + `7ad7005`），未 push、未打 tag。
- 真实未推送区间 = `60ef04e..HEAD` = **34 commit（全部 M65）**，FF 可推。
- 历史 tag 全部已上 GitHub 且与本地一致；vM65 缺失待建。
- M63 / M64 **无真实 commit**，不建 tag。
- 推荐方案 A（`push master` + 单推 `vM65`）。
- 待 PO 确认后，由我执行 §7 命令（及第 5 步制品更新 + consistency 复验）。
