# M65 STAGING VERIFICATION REPORT

**Phase:** M65 Staging Verification (只读验证，未 commit / 未 push / 未 merge / 未改码)
**Date:** 2026-07-30
**Operator:** 小梦 (执行引擎)  |  **PO 裁决:** 翔哥 (待确认)
**HEAD (验证全程未变):** `a690645cb3b3ff04242042f1ab35ad8fc96a5df3`
**Final index state:** 已清空 (无暂存)，工作树 9 modified + 19 untracked 全部保留

---

## 1. 验证方法

layout-grid.css 含 4 个 hunk（顺序：rail / rail / companion / rail）。为精确拆分，采用 `git apply --cached` 按 hunk 暂存（非 `git add -A`，非 `git add -p`）：

- 抽取脚本（临时目录，不落仓库）：按 `'companion-shell' in hunk` 判定归属
  - Commit 1 → 仅取含 `companion-shell` 的 hunk（`@@ -94`）
  - Commit 2 → 取其余 3 个 rail hunk（`@@ -54` / `@@ -70` / `@@ -106`）
- 其余文件显式 `git add <path>` 逐条加入

---

## 2. Commit 1 — `feat(m65): companion AI foundation and graph governance`

### 2.1 实际暂存文件（验证通过，12 文件，+532 / −44）

| 文件 | 状态 | 对应功能 |
|---|---|---|
| `.gitignore` | M | 新增 `artifacts/` 忽略规则（先决条件） |
| `frontend/package.json` | M | +`jsdom` devDep（测试依赖，version 仍 `0.13.0`） |
| `frontend/src/components/GraphViewPanel.tsx` | M | A03 硬编码 hex → 令牌/实体色 SSOT |
| `frontend/src/components/RelationshipInsightPanel.tsx` | M | A03 同上 |
| `frontend/src/components/RelationshipPathGraph.tsx` | M | A03 同上 |
| `frontend/src/components/ai/CompanionContext.tsx` | M | A04 `SET_ERROR` reducer 修复 |
| `frontend/src/lib/entityColors.ts` | A | A03 实体色 SSOT 新增 |
| `frontend/src/data/aiClient.test.ts` | A | A04 新增（6 tests） |
| `frontend/src/components/ai/useCompanionAI.test.tsx` | A | A04 新增（5 tests，由 .ts 改名） |
| `docs/15_DECISIONS/ADR-0007-ai-companion-model.md` | A | A01 决策记录 |
| `scripts/freeze-check.mjs` | M | allowlist 增 `components/ai` + `aiClient.test.ts` |
| `frontend/src/styles/layout-grid.css` | M | **仅 `@@ -94` companion-shell hunk（61 行）** |

### 2.2 diff 检查结果（Step 2）

- `git diff --cached --stat` → 12 files, +532/−44 ✅
- layout-grid.css cached diff → 仅 `.companion-shell` 块（@94），**无 rail 标记** ✅
- rail 标记扫描（`overflow: visible` / `ws-rail-collapsed` / `focus-visible` 等）→ **0 命中** ✅
- artifacts / 报告文件扫描 → **0 命中** ✅

**结论：Commit 1 暂存内容 100% 符合方案，无串味、无越界。**

---

## 3. Commit 2 — `fix(workspace): rail overflow and accessibility fix`

### 3.1 实际暂存文件（验证通过，2 文件，+34 / −7）

| 文件 | 状态 | 对应 hunk / 改动 |
|---|---|---|
| `frontend/src/styles/layout-grid.css` | M | **3 个 rail hunk：`@@ -54` / `@@ -70` / `@@ -106`**（overflow:visible + 内层滚动 + 按钮 a11y/focus-visible） |
| `frontend/src/components/workspace/WorkspacePanel.tsx` | M | 2 行 `aria-expanded` 无障碍属性 |

### 3.2 diff 检查结果（Step 3）

- `git diff --cached --stat` → 2 files, +34/−7 ✅
- layout-grid.css cached diff → 仅 3 个 rail hunk，**无 companion-shell 块** ✅
- companion 标记扫描（`companion-shell` / `companion-title` / `companion-mode` / `companion-section` / `companion-hint`）→ **0 命中** ✅
- WorkspacePanel.tsx cached diff → 仅 2 行 `aria-expanded={false}` / `{true}` ✅
- artifacts / 报告文件扫描 → **0 命中** ✅

**结论：Commit 2 暂存内容 100% 符合方案，与 Commit 1 零重叠。**

---

## 4. 边界互斥性确认

| 维度 | Commit 1 | Commit 2 |
|---|---|---|
| layout-grid.css hunk | `@@ -94` companion | `@@ -54` `@@ -70` `@@ -106` rail |
| 全文件集合 | 12 文件（含 A01/A03/A04/包/忽略） | 2 文件（rail 修复） |
| 重叠 | **无** | **无** |

两提交在文件级与 hunk 级均完全正交，可独立 revert / bisect。

---

## 5. 排除文件（严禁 `git add -A`，全程未触碰）

- `artifacts/`（已在 .gitignore 忽略）
- 8 份 `HEALTHCHECK_2026-07-30_*.md`（独立体检，非 M65）
- `docs/M63_DECISION_WORKSHOP.md`（M63 规划）
- 6 份 M65 报告 md（`M65_*` / `WORKSPACE_RAIL_BUG_VERIFICATION.md`）
- 本报告 `M65_STAGING_VERIFICATION_REPORT.md`

---

## 6. 可执行的分步命令（PO 确认后由小梦执行）

```bash
# ---- Commit 1 ----
git add .gitignore \
  frontend/package.json \
  frontend/src/components/GraphViewPanel.tsx \
  frontend/src/components/RelationshipInsightPanel.tsx \
  frontend/src/components/RelationshipPathGraph.tsx \
  frontend/src/components/ai/CompanionContext.tsx \
  scripts/freeze-check.mjs \
  frontend/src/lib/entityColors.ts \
  frontend/src/data/aiClient.test.ts \
  frontend/src/components/ai/useCompanionAI.test.tsx \
  docs/15_DECISIONS/ADR-0007-ai-companion-model.md
git apply --cached --recount "$TMPD/lg_companion.patch"   # 仅 companion hunk
git commit -m "feat(m65): companion AI foundation and graph governance"

# ---- Commit 2 ----
git add frontend/src/components/workspace/WorkspacePanel.tsx
git apply --cached --recount "$TMPD/lg_rail.patch"        # 仅 rail hunks
git commit -m "fix(workspace): rail overflow and accessibility fix"
```
> `$TMPD/lg_companion.patch` 与 `$TMPD/lg_rail.patch` 为本轮验证产物（临时目录 `C:/Users/haizhi/AppData/Local/Temp/`），可重新由 `git diff frontend/src/styles/layout-grid.css` + 拆分脚本生成。

---

## 7. 是否可以最终 commit

**可以执行，待 PO（翔哥）最终确认。**

依据：
- Closure Audit 结论 Blockers = 0，四门禁（freeze-check / visual-check / tsc / vitest 962 passed）全绿
- 本轮暂存验证：Commit 1 / Commit 2 内容均精确符合方案，互斥无串味，无 artifacts / 报告越界
- 当前 HEAD = `a690645` 未变，index 已清空（零误提交风险）

**待 PO 拍板项：**
1. 采用两提交（推荐）还是单提交折叠？
2. `.gitignore` 已就位，是否直接并入 Commit 1？（本轮已验证此方案）
3. 确认后由小梦执行 Step 6 命令，并跑 release-consistency / freeze-check 复验、再 push + annotated tag。

**当前状态：未 commit / 未 push / 未 merge，等待 PO 确认。**
