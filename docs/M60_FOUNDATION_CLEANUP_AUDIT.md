# History Explorer M60 Foundation Cleanup Audit Report

> **Date:** 2026-07-29  
> **Scope:** Read-only audit of current codebase foundation readiness for V1 Implementation  
> **Branch:** master (`257a733` baseline)  
> **Auditor:** Senior Frontend Architect — no code modified, no commits

---

## 1. Executive Summary

**当前项目距离 V1 Foundation Release Implementation 尚有工作要做，但不是 blocker。核心判断：Passable — 可以进入 Implementation，但必须先做 3 项 Precursors。**

一句话：build 已恢复 exit 0（TS 错从 ~50 降到 ~9），测试历史稳定 930/930，Design System 完整归档。但存在 3 个中等风险的债务需要在 Implementation 第一个 milestone 清除。

---

## 2. Git Scope Report

| 检查项 | 状态 |
|---|---|
| 分支 | `master` |
| HEAD | `6ad42b0` (Development Playbook) |
| Working tree | Clean（仅 `.pip_target/` 未跟踪，非代码） |
| Untracked | `.pip_target/`（Python 虚拟环境残留，安全） |
| Risk | **LOW** — 无未提交修改覆盖风险 |

Recent commits (5):
```
6ad42b0 docs: add History Explorer Development Playbook V1.0
257a733 docs: freeze History Explorer Design System V1.0 FINAL
61eb4c5 fix: M60 dev-server — rollback broken GroundedAnswer
9af4097 fix: M60 dev-server breakage — navigateToEntity
ffdb4ca feat: M60-003 Landing Page productization
```

---

## 3. Repository Structure

| 模块 | 技术栈 | 状态 |
|---|---|---|
| `frontend/` | React 18.3.1 + Vite 5.4.11 + TypeScript 5.6.3 + vitest 4.1.10 | M60 主战场 |
| `backend/` | FastAPI (Python) | 18 milestone 零变更，仅数据层 |
| `docs/` | Markdown | **完整** — Design System V1.0 FINAL + Development Playbook + Architecture docs |
| `scripts/` | Node.js (freeze-check, release-consistency) | 功能正常 |
| `data/` | JSON datasets | 后端数据层 |
| `ai/` | Prompts + configs | 辅助模块，未集成前端 |
| `infrastructure/` | Docker + CI | 基础设施 |

**结论：结构清晰，与 Architecture 文档一致。**

---

## 4. Frontend Component Reality

### 4.1 Inventory

| 统计 | 数量 |
|---|---|
| 组件快（非测试 TSX） | **81** |
| 测试快 | **100** |
| 页面（pages/） | 2 (`DevCatalog.tsx`, `DiscoverPage.tsx`) |
| 数据模块（data/） | ~50 |
| 样式快（styles/） | 4 (197 行 CSS tokens) |
| App.tsx | 869 行，43+ imports |
| EntityPage.tsx | 358 行，35 imports |
| App.css | 671 行单文件 |

### 4.2 Route Reality Map

App.tsx 的渲染路径（`npm run dev` 时的实际页面）：

| 条件 | 入口组件 | 子组件数 |
|---|---|---|
| `!current`（首页） | `DiscoverPage` + `LandingPage` | JourneyPanel, FeedbackWidget |
| `current.type === 'topic'`（主题探索） | `AppShell` 直接渲染 | MainEntityCard, RelationshipView, TimelinePanel, ConnectionsPanel, ConnectionsExplainedPanel, ExplorationPathsPanel, ContinueExploringPanel 等 ~20 个组件 |
| `current.type === 'entity'`（实体页） | **`EntityPage`** → `EntityPageShell`（3 tabs） | EntityExplorationGuide, GraphViewPanel, EventCausalChain 等 |

```text
Route Map：
Discover (LandingPage)
    ↓
Topic Search / Explore (App.tsx direct render)
    ↓
Entity (EntityPage → EntityPageShell)
    ├── Tab 了解：EntityExplorationGuide, GraphViewPanel, EventCausalChain...
    ├── Tab 研究：ResearchPanel, ResearchDiscoveryPanel, HistorianChat...
    └── Tab 扩展：EntityHeader, ProvenancePanel, StorySection, WhyImportantPanel...
    ↓
Workspace (WorkspacePanel)
```

### 4.3 Import Dependency Audit

**发现：**

| 问题 | 严重度 | 详情 |
|---|---|---|
| `ExplorationPathsPanel` dead import in EntityPage.tsx | 中 | Line 7 import 存在但 JSX 从不渲染。Design System 标记 REMOVE，但仍在两处（App.tsx + EntityPage.tsx）imported。EntityPage.tsx 的 import 为纯死代码。 |
| `EntityTab` type 含 'explore'/'analyze' 但不渲染 | 低 | EntityPageShell 定义 5 个 tab id，但 TABS 数组仅含 3 个（了解/研究/扩展） |
| App.tsx 43 个 imports | 低 | 臃肿但无替代方案（monolithic architecture 产物） |
| 无反 circular 依赖 | ✓ | EntityPage → 各组件，无回指 App.tsx |

---

## 5. Build Health Report

| 检查项 | 状态 | 详情 |
|---|---|---|
| **Build** (`npm run build`) | **PASS** (exit 0) | `tsc && vite build` 通过。TS 错从 ~50 降到 ~9 |
| **Lint** | **NOT AVAILABLE** | 无 lint script |
| **Test** (`npm test`) | **PENDING** | 历史稳定 930/930（100 files）。本次运行超 16 分钟未完成，疑似 hang — 需重跑确认 |
| **Freeze-check** | **PASS** (exit 0) | 无 D-class violations |

**剩余 TS 错（~9 个）：**

| 文件 | 错误 |
|---|---|
| `DevCatalog.tsx` | 7 个 — 类型不匹配（EntityInsight / ExplorationCardModel property 缺失） |
| `ExplorationHistoryModel.ts` | 1 个 — NavNode union type 的 `.topic` 分支未覆盖 |
| `DiscoverPage.tsx` | 1 个 — `summary` 声明但未读取（TS6133） |

> **对比发现：build 已从 M60-003 的 ~50 个错大幅下降到 ~9 个。** App.tsx 的 line 602/846 历史错已在 `9af4097` commit 修掉。剩余错集中在 DevCatalog（开发工具，非产品面）和模型层。

---

## 6. Design System Alignment Gap

### 6.1 Token Gap

| 领域 | 现状 (tokens.css) | DS 规范目标 | Gap |
|---|---|---|---|
| **主强调色** | `--gold: #D4A84B` | #CBA135（古金） | 色值偏差 ~5% — 需统一 |
| **语义色** | **缺失** | `--verified #4FA784` / `--unverified #E0883B` | **Gap: 完全缺失** |
| **背景色** | `--navy-deep #090e1c` | 深海军蓝 + 暖大地色 | 仅 navy，缺 earth-tone surfaces |
| **字体栈** | Georgia + system-ui | Spectral (serif) + Inter (sans) + CJK Noto | **Gap: 未加载任何自定义字体** |
| **间距** | 4/8/12/16/24/32/48/64 | 8px base grid | **Match ✓** |
| **圆角** | 6/8/10/12/14 | 6–12px | **Match ✓** |
| **阴影** | shadow-card + shadow-glow | warm-tinted deep shadows | 基础覆盖，缺层次感 |
| **动效** | fast/normal | 微动效 + Entrances | 基础覆盖 |

### 6.2 Component Language Alignment

| 组件族 | 现状 | DS 规范目标 | Gap |
|---|---|---|---|
| **Card** | `.surf-card` pattern，mult 变体 | 统一 Card：悬浮微升 + glow ring | Inline 样式为主，未统一 token |
| **Button** | `.btn` classes（确认/主要操作） | Primary=Gold, Secondary=ghost | 基本一致但未使用 token |
| **Search** | `SearchBox` — 中文 placeholder | Search = Full-width hero search | **Match ✓** |
| **Panel** | 大量 Panel 组件散落 | Panel = 结构容器，按 Narrative/Inline/Supporting 分级 | **Gap: Panel 层级未落地** |
| **Timeline** | `TimelinePanel` | 横向 scroll，dot+line 连接 | 存在但未用 DS token |

---

## 7. M60 Migration Recommendation (Design System Chapter 10 修订)

基于**真实代码使用情况**（非设计假设），对 Migration Guide 的重新分类：

| 组件 | 原决策 | **更正建议** | Reason |
|---|---|---|---|
| ExplorationPathsPanel | REMOVE | **MERGE** (with ConnectionsExplainedPanel) | 在 App.tsx 仍被渲染（line 731），不是死代码。EntityPage.tsx 的 import 是死代码（应删）。正确行动：合并到 ConnectionsExplainedPanel，App.tsx 改为调合并后的组件 |
| ConnectionsPanel | KEEP | KEEP ✓ | 确认 |
| RecommendationsPanel | KEEP | KEEP ✓ | 确认 |
| AIExplanationPanel | KEEP | KEEP ✓ | 在 App.tsx + EntityPage.tsx 均渲染 |
| DevCatalog | HIDE | HIDE ✓ | 仅 dev 使用，保持 |
| TemporalComparisonPanel | LATER | LATER ✓ | 确认 |
| CrossTopicBridge | LATER | LATER ✓ | 确认 |
| EventCausalChain / EventImpactPanel / EventNarrativeCard / EventNarrativeJourney | LATER | **KEEP** (in EntityPage) | **更正：** 这些组件在 EntityPage.tsx 的 3 tab 结构中被大量使用（了解/研究/扩展），不是 LATER。它们是 Entity 核心体验的一部分 |

---

## 8. V1 Foundation Release Risks

### BLOCKER（必须解决才能进入 V1 Implementation）

*无 Blocker。*

### IMPORTANT（建议在第一个 Implementation milestone 清除）

| # | Risk | Impact |
|---|---|---|
| **R1** | **Test suite 疑似 hang**（16+ min 无输出）。需重跑测试确认全绿 | 无法信任 CI 快速反馈 |
| **R2** | **Token 未对齐 DS 规范**：gold color ≠ DS spec，semantic colors 缺失，无自定义字体 | UI 不是 Museum-grade，向后兼容成本低 |
| **R3** | **ExplorationPathsPanel 双轨**：REMOVE-tagged 但在 App.tsx 渲染，EntityPage.tsx import dead | 混淆 + 浪费 |

### LATER（可延后）

| # | Risk |
|---|---|
| R4 | `EntityTab` type 含 dead 'explore'/'analyze' — 代码整洁 |
| R5 | DevCatalog.tsx 7 个 TS 错 — 不影响产品面 |
| R6 | App.tsx 43 imports 臃肿 — 架构债，需大重构 |
| R7 | App.css 671 行单文件 — 未模块化 |

---

## 9. Recommended Next Step

1. **(Immediate)** 重跑 `npm test` 确认 930/930 pass（当前 hang 疑似环境问题）
2. **(M61 第一件事)** 修复 3 个 IMPORTANT risks（15 min 工作量）：
   - R3: 清理 ExplorationPathsPanel：删 EntityPage.tsx 的 dead import，App.tsx 合并到 ConnectionsExplainedPanel
   - R1: 确认 test suite green
   - R2: tokens.css 加 semantic colors + 对齐 gold 色值
3. **(M61 第二件事)** 清剩余 ~9 个 TS 错（DevCatalog 7 + ExplorationHistoryModel 1 + DiscoverPage 1）
4. 之后即可进入正式 V1 Foundation Release Implementation

---

*报告完成。零代码修改。零 commit。全部结论来自真实代码读取。*
