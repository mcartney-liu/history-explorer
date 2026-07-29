# M62 — UX Convergence (博物馆级产品打磨) Implementation Report

> 生成时间：2026-07-29 | 执行方式：接管后台 worker 卡死后的剩余 W6/W7 + 全量验证
> runtime 0.13.0 不变 | ENTITY_TYPES=8 | RELATIONSHIP_TYPES=18 | 纯前端组合，无 backend/schema/enum/dependency/API 变更
> Release tag: vM62

---

## 1. Executive Summary

M62 是一次纯前端组合里程碑，目标是博物馆级 UX 收敛：用统一 SVG 图标注册表替换所有 emoji 作功能图标的用法、主结果视图改为三层叙事结构、关系/时间线视图加内联折叠开关、AI 解释加已验证/未验证溯源徽章、Discover 页改为探索优先、新增 5 套 QA 守卫测试、CI 新增 4 道门禁。全部 7 道验证门禁已转绿。

执行说明：两名后台 worker（frontend-2 / devops-2）在 tsc 自检循环里卡死约 18 分钟（根因是 `Icon.tsx` 旧有的错误导入路径），我接管直接完成了 W6/W7 与全部验证。

---

## 2. Deliverables

- **W1/W3**：`App.tsx` 三层 `<section data-tier="narrative|interpretation|supporting">` 包裹 + 内联 `relView`(list/spatial) / `timeView`(single/multi) 折叠开关。
- **W2**：规范图标注册表 `Icon.tsx`（22 个命名，1.5px 描边，currentColor，尺寸 16/20/24，未知 key→null 自约束，绝不 emoji）；新增 `check`、`close` 图标。
- **W2（修复）**：修正 `AISidebar.tsx` / `WorkspacePanel.tsx` 的 `Icon` 错误导入路径；删除 `FeedbackWidget.tsx` 未使用的 `IconName` 导入（TS6133）。
- **W4**：`DiscoverPage.tsx` 探索优先重设计。
- **W5**：`GroundingBadge.tsx`（已验证/未验证药丸，AA 对比度）+ CSS，接入 `AIExplanationPanel.tsx`；emoji→Icon 替换：`EntityHero.tsx`（`⌖`→location）、`MultiEntitySelector.tsx`（`✕`→close）。
- **W6**：`frontend/src/__tests__/` 下 5 套守卫测试（icon-registry / emoji-guard / entity-labels / structure / grounding-contrast）。
- **W7**：3 个门禁脚本（`emoji-scan.mjs`、`m62-structure-check.mjs`、`visual-check.mjs` 升级 critical-class 门禁）+ `ci.yml` 七 job 流水线 + `ADR-0005_M62_ux_convergence.md`。

---

## 3. Files Changed

**已跟踪、已修改（git diff --stat 真实值）：18 files changed, 342 insertions(+), 119 deletions(-)**

| 文件 | 改动 |
|------|------|
| `.github/workflows/ci.yml` | +48（4 新 job） |
| `frontend/src/App.css` | +22（grounding-badge / m62-view-toggle） |
| `frontend/src/App.tsx` | +53（三层结构 + 开关） |
| `frontend/src/components/AIExplanationPanel.tsx` | +9（接入 GroundingBadge） |
| `frontend/src/components/FeedbackWidget.tsx` | +5（删除未用导入） |
| `frontend/src/components/MultiEntitySelector.tsx` + `.test.tsx` | +4 / +4（✕→close，陈测更新） |
| `frontend/src/components/ai/AISidebar.tsx` | +10（修正 Icon 导入） |
| `frontend/src/components/entity/EntityHero.tsx` | +8（⌖→location） |
| `frontend/src/components/entity/ExplorationCard.tsx` | +8 |
| `frontend/src/components/entity/ExplorationGuide.tsx` | +17 |
| `frontend/src/components/workspace/ExplorationHistoryList.tsx` | +9 |
| `frontend/src/components/workspace/WorkspacePanel.tsx` | +6（修正 Icon 导入） |
| `frontend/src/data/ai/AIAction.ts` | +16 |
| `frontend/src/data/entity/entityLabels.ts` | +18 |
| `frontend/src/pages/DevCatalog.tsx` | +6 |
| `frontend/src/pages/DiscoverPage.tsx` | +132（探索优先重设计） |
| `scripts/visual-check.mjs` | +86（critical-class 门禁） |

**新增未跟踪交付物（10 个）**
- `frontend/src/components/ui/Icon.tsx`、`frontend/src/components/ui/GroundingBadge.tsx`
- `frontend/src/__tests__/m62-emoji-guard.test.ts`、`m62-entity-labels.test.ts`、`m62-grounding-contrast.test.tsx`、`m62-icon-registry.test.tsx`、`m62-structure.test.ts`
- `scripts/emoji-scan.mjs`、`scripts/m62-structure-check.mjs`
- `docs/15_DECISIONS/ADR-0005_M62_ux_convergence.md`

**临时文件（勿提交）**：`scripts/_m62_emoji_fix.py`、`tsc_out.txt`、`vitest_out.txt`、`build_out.txt`、`freeze_out.txt`、`.pip_target/`、`artifacts/`

---

## 4. Validation

| Gate | Command | Result |
|------|---------|--------|
| Typecheck | `tsc --noEmit`（frontend） | 0 errors |
| Build | `npm run build` | 154 modules transformed，exit 0 |
| Emoji scan | `node scripts/emoji-scan.mjs` | exit 0（保留箭头/破折号/dingbat 雕刻符号） |
| Structure | `node scripts/m62-structure-check.mjs` | exit 0（三层结构 + allowlist 确认） |
| Visual | `node scripts/visual-check.mjs` | exit 0（M62-critical CSS 类齐备） |
| Unit | `npx vitest run` | 105 files / 941 tests，exit 0 |
| Freeze | `node scripts/freeze-check.mjs` | PASSED（无 D-class 违规） |

---

## 5. Remaining Risks

- **测试配置改动已回退**：W6 计划给 `vitest.config.ts` 加 `testTimeout`/`forceExit`，但该文件不在冻结白名单内，已回退以保持 freeze 绿。如需这两个选项，须走 Freeze Revision Gate（ADR + 架构评审 + PO 批准）。当前测试无依赖即可通过（37s 自然退出）。
- **visual-check 的 602 项 `missing` 清单故意不门禁**：均为 App.css + styles/*.css 的预存在扫描器误报（非 M62 范围）。仅对 M62-critical 类门禁。风险：那 602 类的真实回归不会让 CI 红，由 structure-check + emoji-scan 兜底。
- **`GraphViewPanel.tsx` 内 25 个硬编码色值**：预存在、在 M62 范围外（可视化专用，非产品表层），已标注未修。
- **尚未提交**：所有改动仅在工作树，未 commit/tag/release（按"搞定即可，未要求发版"）。

---

## 6. Merge Readiness

- 7 道门禁全绿 → **质量层面可合并**。
- 冻结基线完好（无需新冻结门禁；除已回退的 vitest.config.ts 外，所有触碰路径均预先白名单）。
- `ADR-0005` 记录决策并确认治理合规。
- **合并阻塞点**：需 PO（翔哥）批准 + 标准发版流程（ff-only merge master → annotated vM tag → consistency 7/7）。按项目规则不自动合并。
- 无 `testTimeout`/`forceExit`：若未来 CI 因 open handle 挂起，再议 vitest.config.ts 的冻结修订。

---

## 7. Next Recommendation

1. **PO 评审 + 发版**：翔哥确认后走 Release 铁律（ff-only merge → annotated vM62 tag → consistency 7/7）。
2. **（可选）测试配置冻结修订**：若要 `testTimeout`/`forceExit`，补 ADR 并将 `frontend/vitest.config.ts` 加入 SCOPE_ALLOWLIST。
3. **M63 候选**：收敛 5 个产品智能模块的独立输出 + 真实事件流验证（此前按翔哥意见延后）——建议优先于新增模块。
4. **清理**：提交前删除临时文件（`scripts/_m62_emoji_fix.py` 及 *_out.txt 日志）。
