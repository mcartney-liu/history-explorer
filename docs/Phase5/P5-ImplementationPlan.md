# Phase 5 — Implementation Plan (前端落地 + 护栏)

> 生成日期：2026-08-07（晚）
> 定位：FRW Phase 5 = **严格落地**前四阶段产出物（VS-01~04 / IP-01~03），**非重新设计**
> 当前进度：A3 红线收敛（第一刀）已提交闭环；全量视觉落地待切片推进

---

## 0. 保护模型（三层 + 分支隔离，已全部就位）

| 层 | 机制 | 当前状态 |
|----|------|----------|
| 0 不可破坏快照 | `phase5-baseline` tag @ `54ef060` | ✅ 钉死，可 `git reset --hard phase5-baseline` 还原 |
| 1 分支隔离 | `phase5/reconstruction` 承载提交，master 冻结 | ✅ master @ `54ef060`，`phase5/reconstruction` @ `57108d1` |
| 2 冻结护栏 | `scripts/freeze-check.mjs`（SCOPE_ALLOWLIST 模式） | ✅ A3 改动在 allowlist，PASSED |
| 3 增量可验 | 每小步单独 commit + freeze-check | ✅ A3 前端收敛单 commit `57108d1` |
| A/B 对比 | he-legacy worktree @ `54ef060` + 主树 `compare.bat` | ✅ worktree 重建，compare.bat 在主树根（gitignored 本地脚本） |

---

## 1. 已落地（本会话）

### 1.1 A3 后端降级（Task #109，已在 baseline `54ef060`）
- `recommend_next` → `generate_candidates`（内部候选生成器，不对外暴露推荐语义）
- 公开 `/entity/{id}/recommendations` 端点下线
- 15 测试保留，语义对齐 ExplorationPolicy

### 1.2 A3 前端收敛（Task #110，commit `57108d1`）
- **新增** `NextStepPanel.tsx`：消费 `ExplorationAction[]`，无 fetch、无"推荐"词汇，`className=he-nextstep*`，locale `discover.nextStepHeading`，`onNodeClick(gid, NextStepContext)`
- **删除** `RecommendationPanel.tsx` + 测试（A3 后纯死文件）
- **改造** `CompanionShell.tsx` / `CompanionRouter.tsx`：透传 `actions?: ExplorationAction[]`（discover 模式）
- **改造** `ExplorationJourney.tsx`：去未用 `locale` 解构
- **改造** `App.tsx`：RecommendationPanel → NextStepPanel（6 行 swap）
- **改名** `locales/{zh,en,ja}/discover.ts`：补 `discover.nextStepHeading`
- **freeze-check.mjs**：allowlist 末追加 Phase5 段（NextStepPanel/CompanionShell/CompanionRouter）
- **测试**：`NextStepPanel.test.tsx`（含 A3 红线守护：断言 UI 零"推荐/recommend"）；`ExplorationJourney.test.tsx` 重写为 ExplorationAction 形态、去 RecommendationPanel 依赖

### 1.3 A/B 对比环境
- he-legacy worktree 重建（旧 stale 目录改名 `he-legacy-stale` 挪开，原路径重建 @ `54ef060`）
- `compare.bat` 在主树根目录（gitignored），一键启双栈：老 5173/8000，新 5174/8001

---

## 2. 待推进（后续切片，非本会话范围）

| 切片 | 内容 | 依赖 | 验收锚点 |
|------|------|------|----------|
| P5-S2 视觉系统落地 | 按 VS-01~04 Token 逐组件实现（Card/Panel/Dialog/Toolbar/容器族） | VS-01~04 | 像素级对齐设计 Token，零 emoji，禁紫粉渐变 |
| P5-S3 交互规范落地 | 按 IP-01~03 逐触点实施（TP-01…TP-30），统一交互模式 | IP-01~03 | 交互一致性 Exit 四问 |
| P5-S4 导航架构落地 | B3 四主干同构导航 | IP-02 | 任意入口交互一致 |
| P5-S5 体验契约落地 | EC-01…EC-30 对齐 Article 0 三层 | B4/VS-04 | 15min 首访顺滑体验 |

每个切片走：设计提示词 → 前端实现 → lint/tsc/vitest 自检 → freeze-check → commit `phase5/reconstruction`。

---

## 3. 已知债（不阻塞 A3，独立跟踪）

- **M60 tsc 债（55 错误）**：App.tsx 19（TS6133/2339/2322/2741 死代码/类型）+ CausalStatementCard/UnderstandingStatus/DiscoverPage/EvidenceBlock/GuidePanel/RelationshipChain/NavigationContractBar 等。归属 Task #1，独立于 A3。
- **vitest 沙箱拦截**：vite 缓存重建触发 safe-delete，shell 被终止；测试代码就绪，本地 `npm test` 验证。
- **M62 零依赖红线**：本会话未引入 lucide-react（图标沿用既有方案），守 M62。

---

## 4. 下一步建议

1. 本地跑 `cd frontend && npm test` 验证 NextStepPanel 红线守护（沙箱外）。
2. 若需全量视觉落地，从 P5-S2 起按切片推进，每片单 commit + freeze-check。
3. M60 类型债排入 Task #1 专项清理（与 Phase 5 切片可并行）。
