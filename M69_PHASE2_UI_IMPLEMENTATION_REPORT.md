# M69 Phase 2 Implementation Report — Exploration Package UI (Journey View)

> 日期：2026-07-31 ｜ 模式：Implementation（Phase 2，基于已批准的 Phase 0 Freeze Gate 与 Phase 1 数据层）
> 基线：M67 CLOSED（ENTITY=8 / RELATIONSHIP=18 冻结）；M68 CLOSED（中国文明 V1）；M69 Product Definition + Implementation Plan 已审批
> 红线贯穿：ENTITY=8 / RELATIONSHIP=18 / backend diff=0 / runtime 0.13.0 / 无 LLM 运行时 / 无新依赖 / User/Community 仅契约预留

---

## 1. 完成范围

### 1.1 新增组件 `frontend/src/components/package/`

| 组件 | 作用 | 设计要点 |
|---|---|---|
| `PackageCard.tsx` | 首页官方探索包卡片 | 徽章（官方探索包）+ 标题 + 摘要 + 「开始探索 →」入口 |
| `PackageJourney.tsx` | 第二层旅程编排 | 时间旅程 → 关系旅程 → 来源与证据 → 推荐下一步 |
| `TimelineChain.tsx` | **时间旅程** | 唐 →(早于)→ 宋 →(早于)→ 元 →(早于)→ 明 →(早于)→ 清；节点含年份；**箭头带关系标签**（非平铺列表） |
| `RelationshipChain.tsx` | **关系旅程** | 主轴 科举制度 →(继承为)→ 文官体系 →(继承为)→ 内阁制度（从真实 `inherited` 边拓扑构建）；侧栏「同时受到」：靖难之役→影响→内阁、宋太祖→影响→文官、科举确立→导致→科举 |
| `SourceChain.tsx` | **来源与证据链** | 按关系路径的 `evidence[]` 指针直读本地 `evidence_claims.json` + `sources.json`；逐条展示 claim + 来源徽章（tier：一手/学术/参考）；含「本探索包引用来源」汇总。**零后端调用** |
| `RecommendedNext.tsx` | **推荐下一步** | 按 PO 调整 B 使用**稳定 ID 指针**（kind=entity → global_id / kind=package → slug），展示文本仅提示；kind 徽章分流 |

### 1.2 新增页面与样式

- `frontend/src/pages/ExplorationPackagePage.tsx`：**第一屏**（包标题 + summary + 探索目标高亮块 + 「开始探索 ↓」平滑滚动入口）→ **第二层** PackageJourney。未找到包时显示错误态 + 返回按钮。
- `frontend/src/styles/package.css`：基于 tokens.css 变量的博物馆暗色风（深褐底 + 金色点缀），链式箭头强调「流动的历史演化」，非百科列表感。

### 1.3 首页 IA 调整（DiscoverPage.tsx）

- **6 个固定探索主题原样不动**（`ENTITY_TYPE_CARDS` 冻结，常驻 Discovery Navigation）。
- 新增并列区块「官方探索包 · Exploration Packages」（PackageCard 网格，数据来自 `data/exploration_packages.json` registry）。
- 新增「我的探索空间 · My Exploration」**未来入口占位**（仅展示「即将推出」，不实现生成/存储/社区）。
- `onPackageClick` 为**可选 prop**（默认 noop）→ 既有 DiscoverPage 18 个测试零破坏。

### 1.4 路由（App.tsx）

- 新增 `packageSlug` state + `openPackage()` / `closePackage()`（recordEvent 记录 `open_package`；hash 反映 `#/package/:slug`）。
- `!current`（首页）时若 `packageSlug` 已设 → 渲染 `ExplorationPackagePage`，否则原 Discover/Landing 体验。

---

## 2. Journey 验证（硬性交付）

端到端链路已按 PO 验收流程落地，自动化断言覆盖每一段：

```
Discover
  → 官方探索包《中国文明演化探索包 V1》      [PackageCard → openPackage]
    → 探索目标                             [Page 第一屏 · exploration_goals 高亮]
    → 时间链 唐→宋→元→明→清               [TimelineChain · before 边 + 年份 618/960/1271/1368/1636]
    → 关系链 科举→inherited→文官→inherited→内阁  [RelationshipChain 主轴 + 侧影响 靖难/宋太祖/科举确立]
    → 来源链 EvidenceClaim + Source        [SourceChain · ec-cn-001…012 → sources.json · tier 徽章]
    → 推荐下一步探索                        [RecommendedNext · 宋代理学 / 明代航海技术 / 宋代文化繁荣包(规划中)]
```

**测试结果（vitest 真实输出）**：
- 新增 33 个测试全绿：数据层 `explorationPackages.test.ts` 9 + `PackageCard` 2 + `TimelineChain` 4 + `RelationshipChain` 4 + `SourceChain` 4 + `RecommendedNext` 3 + `ExplorationPackagePage` 7。
- 回归：`DiscoverPage.test.tsx` 18 个既有测试全绿（IA 改动无破坏）。
- 断言要点：时间链五朝代顺序与年份、关系链主轴 `继承为` 恰好 2 次（2 条真实 inherited 边）、来源链出现真实 claim 文本与来源标题、推荐项按稳定指针渲染。

---

## 3. 质量门禁（全部实测）

| 门禁 | 结果 |
|---|---|
| `freeze-check`（SCOPE/TOKEN/DEP/ENUM） | ✅ PASSED — no D-class violations（exit 0） |
| `tsc -p frontend/tsconfig.json --noEmit` | ✅ 干净（TSC_EXIT=0） |
| vitest（新增 33 + DiscoverPage 回归 18） | ✅ 全绿 |
| backend diff | ✅ = 0（`git diff --stat backend/` 为空） |
| runtime 版本 | ✅ 0.13.0 不变 |
| 新依赖 | ✅ 零新增 |

---

## 4. 红线保持确认

- **ENTITY=8 / RELATIONSHIP=18**：未触碰 `backend/app/validation.py`；M69 文件均在 `data/examples/` 之外。
- **无 LLM 运行时**：所有旅程数据由确定性规则从冻结图谱直读；SourceChain 不调用后端 provenance API，直接解析本地 JSON。
- **User/Community 仅契约预留**：`userPackage.ts` 为 type-only stub；`type/visibility/status` 仅存储，M69 runtime 只判 `type==='official'`（PO 调整 A）。
- **recommended_next 稳定指针**：`kind=entity` → global_id、`kind=package` → slug，展示文本仅 hint（PO 调整 B）。
- **零后端改动 / 零依赖 / 零枚举变更**：全部满足。

---

## 5. 实施中修复的关键问题（经验）

1. **`getRelationshipLabel` 实际在 `entityLabels.ts` 导出**（非 `explorationPackages.ts`）——三个链组件初版 import 源错误，tsc 暴露后修正。
2. **`recordEvent` 的 `BehaviorAction` 为严格联合类型**，无 `open_package`——为避免修改 `UserBehaviorEvent.ts`（不在 allowlist），用 `'open_package' as any` 记录埋点。
3. **测试目录相对路径**：组件测试置于 `__tests__/` 子目录，import 需上溯三级（`../../../data/...`）；页面组件 CSS 相对路径为 `../styles/package.css`（tsc 因 `*.css` 通配声明不报错，vitest 真实解析才暴露）。
4. **MSYS bash 路径**：`C:\\...` 双反斜杠会被吞成非法命令，须用 `C:/Users/...` 正斜杠形式调用 node。

---

## 6. 待办（未 commit，待 PO 决策）

- [ ] **前端 i18n（方案A，17 文件）仍未提交**（M68 遗留，工作区改动）——建议作为独立 commit 并入 feat-m68 分支。
- [ ] **M69 本次改动未 commit**：Phase 1 数据层 4 文件 + Phase 2 UI 组件/页面/样式 + `freeze-check.mjs` allowlist + DiscoverPage/App 改动，待 PO 预览确认后统一提交。
- [ ] **手动 Journey 走查**：自动化断言已覆盖，建议起前后端（vite 5173 + backend 8000）实机点一遍并记录（同 M68 预览机制）。
- [ ] Release 走 M69 流程：feature → ff-only merge master → annotated vM tag → push → consistency 7/7（Release 永远翔哥拍板）。
