# P5-00 A/B 对比策略（老版本可打开 · 可一键切换）

> 目的：Phase 5 落地新前端期间，PO 希望老版本仍可打开、可对比、可做最终决策。
> 本文评估两种方案的体积与风险，并给出推荐。均**不破坏现有成果**。

## 0. 澄清

此前"分支隔离"是为**保护 master 不被改坏**，并非"新老不能共存"。恰恰相反——老版本已被 `phase5-baseline` 标签 + `master` 完整钉死（commit `96b5aa9`），让它"同时可打开"非常容易。以下两种方案对老成果风险均为**零**。

## 1. 现状事实（已核实）

| 项 | 事实 |
|----|------|
| 前端栈 | Vite + React 18，`npm run dev` 默认端口 **5173**（vite.config.ts 无自定义端口） |
| 老应用入口 | `frontend/src/App.tsx`（真实可运行主应用） |
| 游离 L4 层 | `frontend/src/next/`（Phase 1 确认不在冻结白名单，游离 Gate 之外） |
| 老版本保存点 | `phase5-baseline` 标签 + `master` 分支，commit `96b5aa9`，一字未动 |
| 新版本落地分支 | `phase5/reconstruction`（当前所在分支） |
| 后端 | FastAPI（默认 8000），新栈会下线 `/entity/{id}/recommendations` 公开端点（A3） |

## 2. 方案 A：共存（两个同时跑，左右对比）★ 推荐

机制：`git worktree` 给老版本开一个**独立活 checkout**，与新分支互不干扰、磁盘上两份代码。

| 步骤 | 指令 | 体积 |
|------|------|------|
| 开老版本独立目录 | `git worktree add ../he-legacy phase5-baseline` | 秒级，0 代码 |
| 跑老栈 | `../he-legacy/frontend` → `npm run dev -- --port 5173`；老后端 `:8000` | 配置级 |
| 跑新栈 | `frontend` → `npm run dev -- --port 5174`；新后端 `:8001` | 配置级 |
| 便利脚本 | `compare.bat` / `compare.sh` 一键起两套 | 小脚本 |
| worktree 依赖 | 共享 `node_modules` 软链，或缓存 `npm i`（已命中缓存则秒级） | 秒级 |
| `.env` | 拷贝到 worktree（或软链） | 配置级 |

- **体积评估**：**几乎为零产品代码**。全是 git / 端口 / 脚本的基建动作；老文件一字不改。
- **对老成果风险**：**零**。worktree 是独立目录，新分支的所有改动永不触碰它。
- **最适合**：你"左右开两个标签页对比做决策"的目标——老版与新版并排，实时 A/B。

> 后端注意（关键）：新栈 A3 会下线 `/entity/{id}/recommendations`，老前端若指向新后端该端点会 404。故建议**两套后端也分开端口**（8000 老 / 8001 新）——老前端配老后端、新前端配新后端，对比才公平。

## 3. 方案 B：一键切换（二选一，不并存）

机制：切分支 + 重启 dev server。

| 步骤 | 指令 | 体积 |
|------|------|------|
| 看老版 | `git checkout master && npm run dev` | 0 |
| 看新版 | `git checkout phase5/reconstruction && npm run dev` | 0 |
| 一键脚本 | `switch.bat <old\|new>`（checkout + 起 dev） | 小脚本 |

- **体积**：**零设置**（分支已存在）。"一键"= 一条命令，但需杀掉/重启 dev server（约 3–5 秒），**不能同时看两个**。
- **风险**：零（纯 git 分支）。
- **最适合**：快速来回 toggle、开销最低，但非并排对比。

## 4. 推荐

**主选方案 A（worktree 共存）**——最契合你"对比后决策"的目标，老成果零风险，体积最小。
**附送方案 B 切换脚本**作便利兜底。两者均非破坏性，可并存。

落地顺序（Phase 5 动工后**第一刀**，先于任何产品代码）：
1. `git worktree add ../he-legacy phase5-baseline`（开老版本独立目录）
2. 配两套端口（前端 5173/5174，后端 8000/8001）+ 写 `compare.bat`
3. 验证老栈可独立打开 → 你**立刻拥有对比基线**
4. 之后才在 `phase5/reconstruction` 上做 A3 红线降级 + 前端重建

> 若你觉得两套后端（8000/8001）太重，可只分前端端口（5173/5174）、后端共用 8000——但老前端在对比时其 recommendations 端点会失效（新版已下线），属已知降级，不影响"看老界面长什么样"的视觉对比。
