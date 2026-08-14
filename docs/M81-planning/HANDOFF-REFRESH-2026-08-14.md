# 交接刷新稿 · 2026-08-14（用于「整理仓库」尾巴交接）

> **本稿用途**：`handoff-2026-08-13-to-another-ai.md` 写于 M80 收口 + 发布**之前**，其 §3 仓库状态、§5 待办里「M80 待 PO 拍板」等已**过时**。本稿只刷新**与接手整理仓库相关的当前事实 + 红线 + 验收门禁**，不重复 08-13 稿里仍有效的「身份/项目红线/环境坑」——那些**仍以 08-13 稿为准**。
> **接手顺序**：先读 08-13 稿（身份/红线/环境坑）→ 再读本稿（当前状态 + 整理红线 + 验收）→ 动手。
> **所有 git 事实为本稿实时核验（2026-08-14 09:4x）**。

---

## 1. 当前仓库真相（实时核验，与 08-13 稿差异大）

| 项 | 08-13 稿写的 | **2026-08-14 实际** |
|---|---|---|
| HEAD | `ae4efe3`（被钉死） | **`e99716f`**（可正常提交，钉死已解除） |
| 分支 | `chore/cleanup-2026-08-12` | `chore/cleanup-2026-08-12`，**本地现 track `origin/chore/m80-gate-b-closure`** |
| 游离链 | 8 个（9e8f252→061b367）未 push | 仍存在 **8–9 个 dangling**（见 §3），与 HEAD 无关，无害 |
| M80 Gate B | D1-D4 **待 PO 拍板** | **已收口并发布**：vM80 tag = `e99716f` |
| 测试 | 未提 | 后端套件 **2 failed / 444 passed**（仅 `test_m82_*` M82 债，与整理无关） |

**`e99716f` 含 10 文件（+163/−15）**：`validation.py`（只报 ≥3 节点真环）、4 条反向边（数据零丢失）、2 项测试改动态、ADR-M80-RC/MAP→Accepted、`PO_DECISIONS_2026-08-08.md` §5、`VOCABULARY_SOURCE_MAP.md`、`PRD_VS_FREEZE_BASELINE_DRIFT.md`。

---

## 2. 🔒 冻结资产（绝对不可改 / 不可 force / 不可删）

接手人**任何整理动作都不得触碰以下三者**——它们是 M80 的发布基线，动了即破坏已发布的 Release：

1. **`vM80` tag** → 指向 `e99716f`（origin 复验一致 ✅）
2. **commit `e99716f`** 及其祖先链
3. **`chore/m80-gate-b-closure`** 分支（= `e99716f`，已推 origin）

> 补充：旧远程 **`chore/cleanup-2026-08-12 @ bb41b10`** 仍存在 origin，但与 `e99716f` **分叉且非祖先**（各有独立历史）。**不要**对它 `push --force` 或 `reset`；保留原样或交 PO 决定。

---

## 3. 整理范围（安全可做的「尾巴」）

以下均为**非发布**残留，整理时照此分拣：

**A. 可删除的纯临时物（无信息价值）**
- `scripts/_tmp_analyze_cycles.py`、`_tmp_check_edges.py`、`_tmp_remove_edges.py`、`_tmp_remove_edges_safe.py`、`_tmp_remove_textbook_lines.py`、`_tmp_reverse_edges.py`（6 个 triage 临时脚本）
- `data/evidence_claims.json.bak`、`_graph_analysis.txt`（scratch 残留）

**B. 工作笔记（交 PO 定夺，勿擅自丢弃/勿擅自提交到发布线）**
- `docs/M81-planning/` 下未跟踪文档：`Plan-*.md`(5)、`TaskPlan-*.md`、`project-state-report-2026-08-13.md`、`reality-baseline-2026-08-13.md`、`proposals/`、`PROJECT_STATE_HANDOFF_2026-08-13.md`、以及 08-13 本稿本身
- `docs/product/M81a_IDEA_SCRATCHPAD.md`（已修改未提交，**是活的产品文档，勿丢**）

**C. dangling commit（8–9 个，无害）**
- 2026-08-13 那轮 cleanup 的游离链（含 `bb41b10`）。建议：用 `git tag archive/cleanup-2026-08-13 <hash>` 归档其一或两个尖端即可保留，或整体留着不理。**不要** `gc --prune` 强行清、不要改写。

---

## 4. 🚫 整理红线（违反即事故）

1. **禁改发布基线**：不 amend / 不 rebase / 不 `push --force` `e99716f`、`vM80`、`chore/m80-gate-b-closure`。
2. **禁动 master 集成**：`master` 与本地仍分叉（master..HEAD=38 / HEAD..master=9）。整理不涉及合 master，留给 PO。
3. **禁删工作笔记**：`docs/M81-planning/` 与 `M81a_IDEA_SCRATCHPAD.md` 是上下文，删除前必须 PO 确认。
4. **禁为「变绿」而删数据**：若整理后测试回归，**先报根因**，严禁通过删 `data/examples/*.json` 边或实体来消除报错（369bcc0 教训：那样会丢事实 + 触发数据 hook 叶子校验）。
5. **禁 `git reset --hard` / 批量 `rm`**：本机 safe-delete 垫片会拦删；删项目文件用 `node -e "require('fs').unlinkSync('C:/abs/path')"`（见 08-13 稿 §6）。
6. 项目红线（无 DB / AI 仅 ai_gateway / 枚举 8-18 / FRW 固化等）**仍以 08-13 稿 §2 为准**，整理时同样不得违反。

---

## 5. ✅ 验收门禁（整理完必须跑，绿灯才算收口）

```bash
# 1) 后端套件（系统 Python 3.12 带 pytest）
cd backend
C:/Users/haizhi/AppData/Local/Programs/Python/Python312/python.exe -m pytest -q --tb=line -p no:cacheprovider
# 期望：2 failed, 444 passed
#   —— 仅 test_m82_*（causal_statements）失败，属分支独有 M82 债，与整理无关，可记录不修

# 2) 数据验收 hook（提交 data/ 改动会触发，整理前也先跑一遍基线）
cd <repo-root>
C:/Users/haizhi/.workbuddy/binaries/python/versions/3.13.12/python.exe scripts/data-patch-check.py
# 期望：叶子=0、孤岛=0、因果链>=25、evidence+citation 100%  → EXIT=0 ✅
```

若任一 M80 相关项（非 `test_m82_*`）回归 → **停手报 PO**，不要自己改数据糊弄。

---

## 6. 建议执行顺序

1. 先跑 §5 两道门禁，记录**整理前基线**（应已是 2 failed/444 + hook 绿）。
2. 删 §3-A 纯临时物（6 脚本 + 2 scratch 文件）。
3. `docs/M81-planning/` 与 `M81a` 笔记：列清单交 PO，定「入库（单独 commit，不碰发布线）/ 移 archive / 留着」。
4. dangling：按 §3-C 归档或留着。
5. 再跑 §5 门禁确认**无回归**，出一份「整理前后对照」给 PO 拍板。
6. **不推 master、不 force 任何发布相关 ref**。如需把整理 commit 推远程，推到 `chore/m80-gate-b-closure` 延伸（普通 push，非 force）或新分支，由 PO 定。

---

*本稿由小梦 2026-08-14 生成，git 事实实时核验（HEAD e99716f / vM80=e99716f / upstream origin/chore/m80-gate-b-closure / master..HEAD=38 HEAD..master=9 / 8-9 dangling）。本稿刷新 08-13 稿中过时的仓库状态与待办，项目红线与环境坑仍以 08-13 稿为准。*
