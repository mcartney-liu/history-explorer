# M59 Productization Foundation

## Goal

M59 完成 History Explorer 从能力建设阶段进入产品化基础阶段。

## Architecture Delivered

### AI Capability Layer

- **AIContext.ts** — Unified context model for all AI entry points
- **AIRegistry.ts** — Capability query engine (getCapabilitiesForContext, getSuggestedCapabilities)
- **AICapabilities.ts** — 8 defined AI capabilities (explain_entity, explain_relation, explain_timeline, compare_entities, research_topic, suggest_exploration, generate_story, summarize_research)
- **AIAction.ts** — User-facing action dispatch + interaction state machine (idle → thinking → explaining/answering/suggesting/researching → error)
- **AIOrchestrator.ts** — Central dispatch: action → capability → context → response. Mock today, aiClient wire point tomorrow.
- **AISidebar.tsx** — Collapsible AI Historian panel with full interaction flow

### Entity Experience Layer

- **EntityViewModel.ts** — Single data adapter: EntityDetail → typed view model for 16 panels
- **EntityExperienceHeader.tsx** — Unified container: EntityHero + EntityInsightCard + ExplorationGuide
- **EntityInsightCard.tsx** — Historical insight summary between hero and guide
- **ExplorationGuide.tsx** — Progress bar, stats, recommended next entity, exploration path
- **ConnectionExplorer.tsx** — Three-view switcher (Graph | Timeline | Map)
- **ExplorationCard.tsx** — Universal clickable entity card
- **ViewSwitcher.tsx** — Three-mode tab component
- **EntityHero.tsx** — Museum-grade entity identity with quick actions (AI, Research, Compare)

### Workspace Memory Layer

- **ExplorationHistoryModel.ts** — History, path, compare queue, AI memory data models
- **ExplorationPathCard.tsx** — Vertical exploration path visualization
- **ExplorationHistoryList.tsx** — Recent explored entities with time-ago labels
- **WorkspacePanel.tsx** — 6-section research desk sidebar

### Product Shell

- **AppShell.tsx** — Product navigation bar (发现·探索·研究·工作台) + layout grid
- **layout-grid.css** — 12-column grid, 9+3 main/workspace split, page container

### Tooling

- **visual-check.mjs** — CSS class existence checker + hardcoded value detection
- **DevCatalog.tsx** — Internal component showroom at `#/dev/catalog`

## User Experience

| Before (vM53) | After (M59) |
|---|---|
| AI入口隐藏，Workspace三层深 | EntityHero [💬 问历史助手] 一键触达 |
| RelationshipView + TimelinePanel + GraphViewPanel 三套重复 | ConnectionExplorer 三视角统一 |
| Workspace 6个空 placeholder | 探索足迹实时展示 + 路径可视化 |
| 63个组件平铺渲染 | EntityExperienceHeader 四级信息流 |
| 无产品导航 | 顶部固定导航栏 |
| 无 layout grid | 12-col grid + page container |

## Known Limitations

- AI 仍使用 mock response（AIOrchestrator.generateMockResponse）
- Compare queue 仅 EntityHero 入口，队列未可视化
- Workspace 已置顶/研究笔记/对比队列 三个 section 仍 placeholder
- Responsive 未实现
- Font-size scale 未统一
- 5 个 tab（了解/探索/研究/分析/扩展）未精简

## Stats

- 937 tests, 100 files, 0 failures
- Backend diff: 0 (M59-001 through M59-021)
- API diff: 0
- New dependencies: 0
- Legacy components preserved: all 63 retained for rollback

## Next Milestone

**M60 — Product Experience Refinement**

- Tab 精简 (5 → 3)
- Design System (font scale, icon system, spacing)
- AI 真实接入 (aiClient wire)
- Workspace 完善 (compare queue, notes, pinned)
- Responsive breakpoints
