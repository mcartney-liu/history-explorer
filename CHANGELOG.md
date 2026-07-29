# Changelog

All notable changes to this project will be documented in this file.

---

## [vM62.5] - 2026-07-30 (Project Release — M62.5)

> **Non-runtime release.** `frontend/package.json` remains `[0.13.0]`. Global Language Experience System (M62.5): i18n runtime with live locale switching (zh/en/ja), full l10n resource skeletons across namespaces, Terminology layer (`getTermLabel`) for consistent proper-noun rendering, LanguageSwitcher UX, and Preference foundation (localStorage language/theme persistence). Closes the W10 R14 English-string blind-spot audit. Includes emoji-free hardening: tightened `scripts/emoji-scan.mjs` to cover the Geometric Shapes block and removed the dingbat carve-out; migrated 13 component/test files off `★☆✓✗⚠○◷●` symbol icons to the canonical SVG registry (`star`/`warning`/`circle`/`cross`/`time-period`). Pure frontend — zero backend / schema / AI Gateway / dependency change. 22 consecutive milestones with backend diff = 0. Invariants: ENTITY_TYPES=8 / RELATIONSHIP_TYPES=18 untouched; runtime 0.13.0. freeze-check EXIT 0; emoji-scan EXIT 0; release-consistency 7/7; 941 tests pass.

### Global Language Experience System (M62.5)

**i18n Runtime**: `data/locale.tsx` — `LocaleProvider` + `useLocale` with live switching across zh/en/ja; resource loading and fallback chain wired through `lib/preferences.ts`.

**l10n Resources**: `locales/{zh,en,ja}/*` — namespace resource skeletons (common / entity / discover / relationship / etc.) externalizing UI copy from hardcoded strings.

**Terminology Layer**: `getTermLabel` consistent proper-noun rendering across surfaces (W4 Proper Name Display Policy).

**Language UX**: `LanguageSwitcher.tsx` replaces the inline toggle in `AppShell.tsx`; preference persisted via `lib/preferences.ts` (localStorage).

**W10 R14 Closure**: test suite migrated to locale-aware assertions (Chinese under `<LocaleProvider>`); full vitest 941/941 green.

**Emoji-Free Hardening (Gate 2)**: tightened `emoji-scan.mjs` (Geometric Shapes block + removed dingbat carve-out); 13 files migrated off symbol icons (`★☆✓✗⚠○◷●`) to the canonical SVG registry. `m62-icon-registry` guardrail extended (new icons render real `<svg><path>`).

**Freeze Gate**: `scripts/freeze-check.mjs` SCOPE_ALLOWLIST extended — `frontend/src/components/__tests__/` (W10 migrated tests) + the 13 symbol-icon fix files already covered by `entity/` / `components/` prefixes. ENTITY_TYPES=8, RELATIONSHIP_TYPES=18, runtime 0.13.0 — untouched. 22 consecutive milestones — backend diff = 0.

---

## [vM62] - 2026-07-29 (Project Release — M62)

> **Non-runtime release.** `frontend/package.json` remains `[0.13.0]`. UX Convergence (M62): unified SVG icon registry (22 canonical names, emoji-free per P0 rule), three-tier narrative structure (Narrative/Interpretation/Supporting) on primary result views, inline collapse toggles for relationship/timeline views, AI explanation GroundingBadge (verified/partial/unverified) wired to real provenance, Discover page re-oriented to exploration-first, 5 new QA guardrail tests, 4 new CI gates (visual/emoji/structure/grounding-contrast). Pure frontend — zero backend / schema / AI Gateway / dependency change. 21 consecutive milestones with backend diff = 0. Invariants: ENTITY_TYPES=8 / RELATIONSHIP_TYPES=18 untouched; runtime 0.13.0. freeze-check EXIT 0; release-consistency 7/7; 941 tests pass.

### UX Convergence (M62)

**SVG Icon Registry**: `components/ui/Icon.tsx` — 22 canonical stroke icons replace all emoji used as functional icons (P0 compliance); `MultiEntitySelector` ✕ and `EntityHero` ⌖ migrated to SVG.

**Three-Tier Narrative**: primary result views wrap content in `data-tier="narrative|interpretation|supporting"` sections; relationship/timeline views get inline collapse toggles (list/spatial, single/multi) instead of separate routes.

**GroundingBadge**: `components/ui/GroundingBadge.tsx` added; `AIExplanationPanel` surfaces verified/partial/unverified state from real `response.grounded` + `evidence[].status` (previously a static count-based label).

**Discover Convergence**: `pages/DiscoverPage.tsx` re-oriented to exploration-first with 了解/研究/扩展 tabs; warm, personalized copy restored.

**QA Guardrails**: 5 new tests (`m62-icon-registry`, `m62-emoji-guard`, `m62-entity-labels`, `m62-grounding-contrast`, `m62-structure`).

**CI Gates**: `scripts/emoji-scan.mjs`, `scripts/m62-structure-check.mjs`, `scripts/visual-check.mjs` (extended); GitHub Actions CI wires visual/emoji/structure gates.

**Freeze Gate**: No SCOPE_ALLOWLIST change required (all M62 paths already allowlisted via M35/M61). ENTITY_TYPES=8, RELATIONSHIP_TYPES=18, runtime 0.13.0 — untouched. 21 consecutive milestones — backend diff = 0.

---

## [vM60] - 2026-07-29 (Project Release — M60)

> **Non-runtime release.** `frontend/package.json` remains `[0.13.0]`. M60 Landing Page productization (M60-003) + i18n support + Design System V1.0 FINAL freeze + Development Playbook V1.0, plus the M61-bridge-build TypeScript cleanup: 55 latent TS errors resolved across 9 modules; production `tsc && vite build` now exits 0. Zero backend / schema / AI Gateway / dependency change — 20 consecutive milestones with backend diff = 0. Invariants: ENTITY_TYPES=8 / RELATIONSHIP_TYPES=18 untouched; runtime 0.13.0. freeze-check EXIT 0; release-consistency 7/7.

### Landing Page Productization & Build Stabilization (M60)

**Landing Page (M60-003)**: Productized landing page with curated topic entries, hero identity, and product capability framing — pure-frontend, no new API.

**i18n Support**: Internationalization layer for the homepage/layout; locale-aware copy for core surfaces.

**Design System V1.0 FINAL**: `docs/design-system/` frozen as the authoritative V1.0 design system (Chapter 0–15); `scripts/freeze-check.mjs` SCOPE_ALLOWLIST extended for the design-system docs path.

**Development Playbook V1.0**: `docs/DEVELOPMENT_PLAYBOOK.md` added — canonical engineering runbook; build (`tsc && vite build`) must exit 0, latent TS errors are release blockers.

**M61-bridge-build (TypeScript cleanup)**: Resolved 55 latent TypeScript errors (20 real type errors across 9 files + 35 unused-declaration dead code from refactors); production build now passes `tsc --noEmit` + `vite build`. No public type contracts changed; App.tsx and tests unaffected.

**Freeze Gate**: SCOPE_ALLOWLIST extended (+ design-system docs path). ENTITY_TYPES=8, RELATIONSHIP_TYPES=18, runtime 0.13.0 — untouched. 20 consecutive milestones — backend diff = 0.

---

## [vM53] - 2026-07-28 (Project Release — M53)

> **Non-runtime release.** `frontend/package.json` remains `[0.13.0]`. Pipeline Auto-Activation — zero backend / schema / AI Gateway / dependency change. 17 consecutive milestones without backend changes.

### Pipeline Auto-Activation (M53)

**ProductIntelligenceActivation**: Activation gate — determines when the M45-M52 intelligence pipeline should auto-run. Rules: milestone events (save_research, start_comparison, research_loop) → immediate activation; event threshold (≥5) → activation; throttle (60s) → prevent spam; zero events → skip. Deterministic, no mutation of input events.

**Auto-Trigger Integration**: ProductUsageAnalysis devtools block extended with `setInterval` checker (15s) that reads localStorage, runs activation gate, and invokes full pipeline. Console output with ProductDecisionInsight summary. Manual control via `__pa_start()` / `__pa_stop()`.

**Semantics Hardening (Phase 2)**: Verified auto-trigger output equals manual `analyzeProductUsage()` output. Activation gate does not mutate events. Throttle stability confirmed. Pipeline semantics unchanged — all M45-M52 analysis outputs identical.

**M43-M53 Arc Complete**: Measure → Fix → Verify → Optimize → Decide → Behavior → Depth → Knowledge → Activation → Fusion → Auto-Trigger.

**Freeze Gate**: SCOPE_ALLOWLIST extended (+2 M53 entries). ENTITY_TYPES=8, RELATIONSHIP_TYPES=18, runtime 0.13.0 — untouched. 17 consecutive milestones — backend diff = 0.

**Tests**: Backend 247 (+0). Frontend 96 files, 908 passed (+9 vs vM52).

## [vM52] - 2026-07-28 (Project Release — M52)

> **Non-runtime release.** `frontend/package.json` remains `[0.13.0]`. Product Decision Insight Fusion Layer — zero backend / schema / AI Gateway / dependency change. 16 consecutive milestones without backend changes. **Convergence milestone** — closes the M43-M50 intelligence build cycle.

### Product Decision Insight Fusion Layer (M52)

**ProductDecisionInsight**: Deterministic fusion engine — converts 6 independent intelligence outputs (Funnel/Intelligence/Priority/Capability/Behaviors/Depth/Knowledge) into 1 explainable decision object with 9 fields: `overallStatus` (healthy/attention/critical from validated primaryIssue), `primaryIssue` (with validation gate: requires 2+ supporting modules or 3+ events), `recommendedAction` (evidence-derived with reason), `evidence` (sourceModules + keyMetrics + eventCount), `confidence` (0-1 evidence completeness, NOT AI probability), `summary` (one paragraph), `concerns` (ordered by severity), `positives` (what's working).

**Semantic Hardening (Phase 2)**: Empty events → healthy + confidence 0 (no data ≠ bad product). OverallStatus from primaryIssue severity (not raw concern count). PrimaryIssue validation gate blocks single weak signals. Confidence bounds verified (0 ≤ c ≤ 1).

**ProductUsageAnalysis integration**: `decisionInsight` field added (additive, backward compatible). Summary extended with `[决策]` section (status/confidence/primary issue/action).

**M43-M52 Arc Complete**: Measure → Fix → Verify → Optimize → Decide → Behavior → Depth → Knowledge → Activation → Fusion.

**Freeze Gate**: SCOPE_ALLOWLIST extended (+2 M52 entries). ENTITY_TYPES=8, RELATIONSHIP_TYPES=18, runtime 0.13.0 — untouched. 16 consecutive milestones — backend diff = 0.

**Tests**: Backend 247 (+0). Frontend 95 files, 899 passed (+16 vs vM50).

## [vM50] - 2026-07-28 (Project Release — M50)

> **Non-runtime release.** `frontend/package.json` remains `[0.13.0]`. Usage-Informed Knowledge Intelligence — zero backend / schema / AI Gateway / dependency change. 15 consecutive milestones without backend changes.

### Usage-Informed Knowledge Intelligence (M50)

**KnowledgeUsageCoverage**: Entity type coverage from UserBehaviorEvent data — `exploredEntityTypes/unexploredEntityTypes` from event `entityType` field, `topEntryEntities` from click/open/research frequency, `entityCoverage` ratio (0-1). Relationship coverage marked as `null` + `relationshipDataAvailable=false` because events lack `relationshipType` — unknown is not zero. This is a deliberate data boundary decision: the module does NOT falsely claim "0 relationships explored" when no data source exists.

**Semantic Amendment (Phase 2)**: `exploredRelationshipTypes=[]`, `unexploredRelationshipTypes=[]`, `relationshipCoverage=null` — empty arrays and null values protect against misleading "0/18 explored" claims.

**ProductUsageAnalysis integration**: `knowledgeUsageCoverage` field added. Summary shows conditional output: "关系使用数据不可用" when relationship data unavailable; entity counts when available.

**Freeze Gate**: SCOPE_ALLOWLIST extended (+2 M50 entries). ENTITY_TYPES=8, RELATIONSHIP_TYPES=18, runtime 0.13.0 — untouched. 15 consecutive milestones — backend diff = 0.

**Tests**: Backend 247 (+0). Frontend 93 files, 883 passed (+10 vs vM49).

## [vM49] - 2026-07-28 (Project Release — M49)

> **Non-runtime release.** `frontend/package.json` remains `[0.13.0]`. Exploration Depth Layer — zero backend / schema / AI Gateway / dependency change. 14 consecutive milestones without backend changes.

### Exploration Depth Layer (M49)

**ExplorationDepth**: 5-level deterministic depth scoring from event sequences — 0=None, 1=Surface (open_discover/open_entity only), 2=Browse (+switch_tab), 3=Explore (+journey/chat), 4=Research (+start/save/restore), 5=Deep (+comparison or research loop). Highest depth wins. Deliberately avoids session/path reconstruction — localStorage lacks session context, so M49 measures depth rather than reconstructing journeys.

**ProductUsageAnalysis integration**: `explorationDepth` field added (additive, backward compatible). Summary extended with `[探索深度]` section. Complements M48's ExplorationBehaviors ("what pattern") with depth quantification ("how deep").

**Freeze Gate**: SCOPE_ALLOWLIST extended (+2 M49 entries). ENTITY_TYPES=8, RELATIONSHIP_TYPES=18, runtime 0.13.0 — untouched. 14 consecutive milestones — backend diff = 0.

**Tests**: Backend 247 (+0). Frontend 92 files, 873 passed (+14 vs vM48).

## [vM48] - 2026-07-28 (Project Release — M48)

> **Non-runtime release.** `frontend/package.json` remains `[0.13.0]`. Exploration Behavior Intelligence — zero backend / schema / AI Gateway / dependency change. 13 consecutive milestones without backend changes.

### Exploration Behavior Intelligence (M48)

**ExplorationBehaviors**: Behavioral pattern detection from event sequences — 6 patterns: `comparison_research` (start_comparison), `research_loop` (start+save OR restore), `deep_exploration` (journey OR tab+chat), `limited_exploration` (entity only, neutral — not "failed"), `quick_lookup` (entity + exit), `unknown` (zero events). Deterministic rules, priority resolver (comparison > research > deep > limited > quick > unknown), rule confidence (0-0.9). Deliberately uses "behaviors" not "intent" — events show what users DO, not what they THINK.

**ProductUsageAnalysis integration**: `explorationBehaviors` field added (additive, backward compatible). Summary extended with `[行为模式]` section showing dominant pattern, confidence, and insights.

**Freeze Gate**: SCOPE_ALLOWLIST extended (+2 M48 entries). ENTITY_TYPES=8, RELATIONSHIP_TYPES=18, runtime 0.13.0 — untouched. 13 consecutive milestones — backend diff = 0.

**Tests**: Backend 247 (+0). Frontend 91 files, 859 passed (+14 vs vM47).

## [vM47] - 2026-07-28 (Project Release — M47)

> **Non-runtime release.** `frontend/package.json` remains `[0.13.0]`. Product Decision Intelligence Layer — zero backend / schema / AI Gateway / dependency change. 12 consecutive milestones without backend changes.

### Product Decision Intelligence Layer (M47)

**OptimizationPriority**: Priority scoring engine — ranks optimization candidates by `reach × severity × fixProximity`. Generates `topRecommendation` + ranked list with severity levels (critical/warning/healthy) and human-readable reasons. Safe for empty data (returns "暂无数据").

**CapabilityHealth**: 6 capabilities scored on 0-100 scale — Discovery (discoveryToEntityRate), Exploration (funnel conversion), AI Chat (chatAdoptionRate), Research (funnel conversion), Comparison (unused detection), Save & Restore (researchSaveRate). Each includes severity classification and gap description.

**DecisionIntelligence**: Unified output combining priority + health. ProductUsageAnalysis extended with `priority` and `capabilityHealth` fields.

**M47 bridges the gap** from "we see problems" to "this is the one to fix first." No more guessing which UX issue matters most.

**Freeze Gate**: SCOPE_ALLOWLIST extended (+2 M47 entries). ENTITY_TYPES=8, RELATIONSHIP_TYPES=18, runtime 0.13.0 — untouched. 12 consecutive milestones — backend diff = 0.

**Tests**: Backend 247 (+0). Frontend 90 files, 845 passed (+9 vs vM46).

## [vM46] - 2026-07-28 (Project Release — M46)

> **Non-runtime release.** `frontend/package.json` remains `[0.13.0]`. Product Optimization Loop — zero backend / schema / AI Gateway / dependency change. 11 consecutive milestones without backend changes.

### Product Optimization Loop (M46)

**start_chat Event Wiring**: HistorianChat first message capture via useRef guard — fires once per session. Closes the Exploration funnel gap: open_entity → switch_tab → click_journey → start_chat now has complete event chain.

**ProductIntelligence Extended**: 3 new fields — `dropOffPoints` (per-funnel user stop detection: Discovery/Exploration/Research), `chatAdoptionRate` (start_chat/open_entity), `unusedCapabilities` (7 capability checks: AI对话/保存/恢复/对比/旅程/Tab切换/首页进入).

**ProductUsageAnalysis**: Unified analysis entry — delegates to ExplorationFunnelAnalysis + ProductIntelligence, produces structured summary with sections: [基础] event volume, [Discovery/Exploration/Research] funnel health, [互动] engagement, [流失] drop-off points, [未用] unused capabilities.

**10/10 events wired**: open_discover / click_entity / open_entity / switch_tab / click_journey / start_chat / start_research / save_research / restore_research / start_comparison — complete coverage across all funnel steps.

**Freeze Gate**: SCOPE_ALLOWLIST extended (+2 M46 entries). ENTITY_TYPES=8, RELATIONSHIP_TYPES=18, runtime 0.13.0 — untouched. 11 consecutive milestones — backend diff = 0.

**Tests**: Backend 247 (+0). Frontend 89 files, 836 passed (+12 vs vM45).

## [vM45] - 2026-07-28 (Project Release — M45)

> **Non-runtime release.** `frontend/package.json` remains `[0.13.0]`. Product Intelligence Layer — zero backend / schema / AI Gateway / dependency change. "Verify what we fixed."

### Product Intelligence Layer (M45)

**Event Wiring**: 9 UserBehaviorEvents wired to production code across 4 components — DiscoverPage (open_discover, click_entity), EntityPageShell (open_entity, switch_tab), ResearchPanel (start_research, save_research, restore_research, start_comparison), JourneyCard (click_journey). Events auto-recorded via useEffect and callback wrappers.

**Funnel Runtime Validation**: 3 simulation scenarios — Discovery (open→click→entity, 100%), Exploration (open→tab→journey, all steps), Research (start→save→restore→compare, full loop). Validates M43 funnel analysis pipeline works end-to-end.

**ProductIntelligence**: 8-field product insight from event data — totalEvents, sessions (30min gap detection), discoveryToEntityRate, exploreEngagementRate, researchSaveRate, mostUsedTab, mostExploredTypes, recommendations (5 bottleneck rules). Pure data module, no UI dependency.

**M43→M44→M45 Arc**: Measure → Fix → Verify. The product can now answer "are users using what we built?" with real behavior data.

**Freeze Gate**: SCOPE_ALLOWLIST extended (+2 M45 entries). ENTITY_TYPES=8, RELATIONSHIP_TYPES=18, runtime 0.13.0 — untouched.

**Tests**: Backend 247 (+0). Frontend 88 files, 824 passed (+14 vs vM44).

## [vM44] - 2026-07-28 (Project Release — M44)

> **Non-runtime release.** `frontend/package.json` remains `[0.13.0]`. User Experience Improvement — zero backend / schema / AI Gateway / dependency change. "Fix what we measured."

### User Experience Improvement (M44)

**DiscoverPage**: Product Intro (4 capability cards: 历史叙事/关系探索/深度研究/AI历史对话), empty state optimization (RecentResearches onboarding + InterestProfile explanation for new users), ResearchLibrary entry (saved bookmark links with count).

**EntityTabGuidance**: Per-tab guidance data for all 5 tabs — title/description/recommendedActions. EntityPageShell renders inline guidance panel between tab navigation and content.

**ResearchPanel**: Completion guidance — when research finishes, displays save-prompt pointing to ResearchLibrary. Idle mode unaffected.

**HistorianChat Visibility**: Enhanced explore tab guidance text ("你也可以向 AI 历史学家提问") plus inline hint in Explore tab panel area.

**All M43-identified UX blockers resolved**: 6/6 problems addressed through guidance text and conditional rendering — zero business logic changes.

**Freeze Gate**: SCOPE_ALLOWLIST extended (+2 M44 entries). ENTITY_TYPES=8, RELATIONSHIP_TYPES=18, runtime 0.13.0 — untouched.

**Tests**: Backend 247 (+0). Frontend 87 files, 810 passed (+17 vs vM43).

## [vM43] - 2026-07-28 (Project Release — M43)

> **Non-runtime release.** `frontend/package.json` remains `[0.13.0]`. Product Validation Layer — zero backend / schema / AI Gateway / dependency change. "Measure before you build more."

### Product Validation Layer (M43)

**UIAudit**: structured page audit for DiscoverPage (6 sections) and EntityPage (6 sections). Each section carries `userGoal` ("为什么存在？") and `successMetric` ("怎样算成功？"), identifies missing guidance and empty states.

**UserJourney**: 3 funnel path maps (Discovery: 3 nodes, Exploration: 5 nodes, Research: 5 nodes). Each node identifies entry points, blockers, missing guidance, and next-step visibility. Total: 13 nodes, 7 blockers, 7 missing guidance items.

**UserBehaviorEvent**: localStorage behavior telemetry with 13 domain-neutral action types across Discovery/Exploration/Research/Persistence funnels. Analysis helpers: action frequencies, unique entity count, session duration detection, tab usage stats. Max 1000 events, auto-capped.

**ExplorationFunnelAnalysis**: 3 funnel metrics with conversion rates and bottleneck detection. Each funnel computes per-step entered/completed counts, overall conversion rate, and identifies bottleneck steps where drop-off occurs.

**Freeze Gate**: SCOPE_ALLOWLIST extended (+6 M43 entries). ENTITY_TYPES=8, RELATIONSHIP_TYPES=18, runtime 0.13.0 — untouched. All modules are data-only (tree-shaken from production).

**Tests**: Backend 247 (+0). Frontend 86 files, 793 passed (+36 vs vM42).

## [vM42] - 2026-07-28 (Project Release — M42)

> **Non-runtime release.** `frontend/package.json` remains `[0.13.0]`. Product Foundation Upgrade — zero backend / schema / AI Gateway / dependency change.

### Product Foundation Upgrade (M42)

**EntityPageShell**: 5-tab navigation (了解/探索/研究/分析/扩展) with localStorage tab persistence. EntityPage refactored from 13-panel flat scroll into layered shell — all M36-M41 panels preserved across tabs, zero loss.

**DiscoverPage Activation**: Recent researches from ResearchHistory (top 3 by date), interest profile from UserInterestProfile (themes + dimensions), 6 entity-type exploration cards (Civilization/Event/Person/Religion/Technology/Location). No AI feed, no infinite scroll, no social features.

**UserInterestProfile** (ResearchInsights extension): 7-field profile — topEntityTypes, topDimensions, topThemes, recentlyExplored, comparisonPairs, activeExplorationDays, bookmarkCategories. Deterministic from ResearchHistory, no AI memory.

**KnowledgeCoverage**: Internal data quality utility — per-type coverage metrics (entity/source/claim/relationship counts + avg dimensions), warning system, coverage summary. Tree-shaken from production bundle.

**Freeze Gate**: SCOPE_ALLOWLIST extended (+6 M42 entries). ENTITY_TYPES=8, RELATIONSHIP_TYPES=18, runtime 0.13.0 — untouched.

**Tests**: Backend 247 (+0). Frontend 82 files, 757 passed (+31 vs vM41).

## [vM41] - 2026-07-28 (Project Release — M41)

> **Non-runtime release.** `frontend/package.json` remains `[0.13.0]`. Research Intelligence is additive — no backend core / schema / AI Gateway / enum / dependency change. Grounding First: zero AI planner, zero memory, zero agent.

### Research Intelligence (M41)

**ResearchPlanner**: deterministic recommendation engine (zero AI calls). 5 priority rules: causal chain → history → comparison → generic related → similar type. Deduplication by entityGlobalId. Input: EntityInfo + RelationshipInfo[] + ResearchHistory.

**ResearchRecommendationCard**: explainable suggestion card. 5 reason types mapped to human-readable Chinese labels + explanation text. Shows suggested dimensions. Explore button with aria label.

**ResearchDiscoveryPanel**: entity-driven discovery. Calls ResearchPlanner with current entity + relationships + history. Renders recommendation cards. Shows history insight ("您经常探索 Civilization 与 Military 主题"). Mounted before ResearchPanel on EntityPage.

**ResearchInsights**: deterministic analytics from ResearchHistory. 5 rules: research count, entity type frequency ranking, dimension frequency ranking, relationship interest inference, theme mapping (7 entity→theme pairs). `insightSummary()` generates human-readable text.

**Freeze Gate**: SCOPE_ALLOWLIST extended (+6 M41 entries). ENTITY_TYPES=8, RELATIONSHIP_TYPES=18, runtime 0.13.0 — untouched.

**Tests**: Backend 247 (+0). Frontend 80 files, 726 passed (+31 vs vM40).

## [vM40] - 2026-07-27 (Project Release — M40)

> **Non-runtime release.** `frontend/package.json` remains `[0.13.0]`. Research Persistence is additive — no backend core / schema / AI Gateway / enum / dependency change.

### Research Persistence (M40)

**ResearchHistory**: localStorage CRUD module with versioned schema (`history-explorer.research.v1`, CURRENT_VERSION=1) — save/load/list/delete/update. SavedResearch includes serialized dimensions, citations, comparedNames, bookmarks, labels.

**ResearchBookmarkButton**: toggle bookmark with star UI (☆/★) + label tags display. Calls updateResearch() for persistence.

**ResearchLibrary**: list view of saved researches — entity type badge, name, comparedNames, dimension completion ratio, citation count, relative timestamps. Open (onSelect) and delete actions.

**Restore Workflow**: ResearchPanel `restored` mode — displays saved dimensions without re-calling explainAI. restoreResearch is a pure data mapper with zero AI overhead.

**Freeze Gate**: SCOPE_ALLOWLIST extended (+6 M40 entries). ENTITY_TYPES=8, RELATIONSHIP_TYPES=18, runtime 0.13.0 — untouched.

**Tests**: Backend 247 (+0). Frontend 76 files, 695 passed (+23 vs vM39).

## [vM39] - 2026-07-27 (Project Release — M39)

> **Non-runtime release.** `frontend/package.json` remains `[0.13.0]`. Research Intelligence is additive — no backend core / schema / AI Gateway / enum / dependency change. Grounding First: zero conversation memory, zero AI planner.

### Research Intelligence (M39)

**ResearchSummary**: explainAI-powered cross-dimensional research synthesis with comparative header (single: "研究综述", multi: "比较研究综述"), adaptive header via `comparedNames`, unique citation aggregation, grounded badge.

**MultiEntitySelector**: add/remove comparison entities from relationships, max 3 entities, auto-generates `context_global_ids[]`, duplicate prevention via filtering.

**Multi-Entity Research**: `ResearchPanel` orchestrates single/multi-entity research via `context_global_ids[]` + comparison-prefixed dimension questions (e.g. "比较 Roman Empire 与 Han Dynasty: 政治制度...").

**Comparative UX**: `ResearchReport` and `ResearchSummary` adapt titles and headers based on `comparedNames` — zero AI impact, pure UI adaptation.

**Freeze Gate**: SCOPE_ALLOWLIST extended (+4 M39 entries). ENTITY_TYPES=8, RELATIONSHIP_TYPES=18, runtime 0.13.0 — untouched.

**Tests**: Backend 247 (+0). Frontend 73 files, 672 passed (+14 vs vM38).

## [vM38] - 2026-07-27 (Project Release — M38)

> **Non-runtime release.** `frontend/package.json` remains `[0.13.0]`. AI Research Mode is additive — no backend core / schema / AI Gateway / enum / dependency change. Grounding First: zero conversation memory, zero AI planner.

### AI Research Mode (M38)

**ResearchPanel**: frontend research orchestrator — 7 entity-type research templates (Civilization, Event, Person, Religion, Technology, Location, Idea) with 4 dimensions each. `Promise.all(explainAI(...))` parallel execution, progress bar, context badge, and reset action. Zero backend changes.

**ResearchDimensionCard**: per-dimension display with grounded badge (✓已验证 / ⚠部分验证), citation count, and GroundedAnswer rendering. States: idle → loading → success → error.

**ResearchReport**: structured historical report aggregating all dimension results — topic header, executive summary with completion stats, key findings per dimension, unique citation de-duplication, and dimension coverage matrix. Pure frontend aggregation, zero AI calls.

**EntityPage**: mounts ResearchPanel for all entity types. `scripts/freeze-check.mjs` SCOPE_ALLOWLIST extended (+6 M38 entries). ENTITY_TYPES=8, RELATIONSHIP_TYPES=18, runtime 0.13.0 — untouched.

**Tests**: Backend 247 (+0). Frontend 71 files, 658 passed (+23 vs vM37).

## [vM37] - 2026-07-27 (Project Release — M37)

> **Non-runtime release.** `frontend/package.json` remains `[0.13.0]`. AI Historian Interaction Layer is additive — no backend core / schema / AI Gateway / enum / dependency change. Grounding First architecture: zero conversation memory.

### AI Historian Interaction Layer (M37)

**HistorianChat**: Grounding First conversational AI — context badge (entityType + entityName), 8 entity-type-specific suggested question templates, follow-up input, clear chat, chat message history (frontend-only state). explainAI receives only question + entityGlobalId — no conversation_id, session_id, or memory injected.

**JourneyCard**: relationship-driven exploration recommendations — pure frontend data from entity.relationships, priority-sorted (caused > before > after > influenced > participated_in), capped at 6 cards, global_id routing with local id fallback. Zero AI calls, zero API modifications.

**EntityPage**: mounts both components for all entity types. `scripts/freeze-check.mjs` SCOPE_ALLOWLIST extended (+4 M37 entries). EntITY_TYPES=8, RELATIONSHIP_TYPES=18, runtime 0.13.0 — untouched.

**Tests**: Backend 247 (+0). Frontend 68 files, 635 passed (+18 vs vM36.2).

## [vM36.2] - 2026-07-27 (Project Release — M36.2)

> **Non-runtime release.** `frontend/package.json` remains `[0.13.0]`. Historical Narrative Layer is additive — no backend core / schema / AI Gateway / enum / dependency change.

### Historical Narrative Layer (M36.2)

**Frontend Components**
- `EventNarrativeCard.tsx`: AI-powered historical narrative entry — 3 pre-set narrative modes (historical_impact, why_happened, multi_civilization_view) with causal/impact badge counts. Reuses M36.0 explainAI + GroundedAnswer + CitationList.
- `EventNarrativeJourney.tsx`: event exploration path visualization — Event→Event chain with priority sorting (caused > before/after > influenced), cross-topic topic badges, and global_id routing. `currentTopic` prop safe (optional, backward-compatible).
- `EntityPage.tsx`: mounts both behind `entity.type === 'Event'` guard — zero impact on non-Event types.

**Freeze Gate**: SCOPE_ALLOWLIST extended (+4 M36.2 entries). ENTITY_TYPES=8, RELATIONSHIP_TYPES=18, runtime 0.13.0 — untouched.

**Tests**: Backend 247 (+0 vs vM36.1). Frontend 66 files, 617 passed (+18).

## [vM36.1] - 2026-07-27 (Project Release — M36.1)

> **Non-runtime release.** `frontend/package.json` remains `[0.13.0]`. Event Intelligence Layer is additive — no backend core / schema / AI Gateway / enum / dependency change.

### Event Intelligence Layer (M36.1)

**Event Data Enrichment**
- `roman_empire_example.json`: +3 Events (Republic End, Pax Romana, Empire Fall) + 7 Event→Event causal relationships (caused, before, influenced).
- `hellenistic_world_example.json`: +2 Events (Alexander's Conquest, Diadochi Wars) + 6 Event→Event causal relationships.

**Frontend Components**
- `EventCausalChain.tsx`: directed causal chain view — incoming causes → center event → outgoing effects, with temporal before/after labels.
- `EventImpactPanel.tsx`: long-term impact grouped by entity type (Civilization, Religion, etc.).
- `EntityPage.tsx`: mounts both behind `entity.type === 'Event'` guard — zero impact on non-Event types.

**Freeze Gate**: SCOPE_ALLOWLIST extended (+7 M36.1 entries). ENTITY_TYPES=8, RELATIONSHIP_TYPES=18, runtime 0.13.0 — untouched.

**Tests**: Backend 247 (+15 vs vM36.0). Frontend 64 files, 599 passed (+15).

## [vM36.0] - 2026-07-27 (Project Release — M36.0)

> **Non-runtime release.** This is a Project Release, not a Runtime Version bump. `frontend/package.json` remains `[0.13.0]`; the AI Interpretation Layer is additive — no backend core / schema / data / validation / registry / deterministic engine change. See `docs/RELEASE_VERSION_POLICY.md`.

### AI Interpretation Layer Activation (M36.0)

**Backend — AI Gateway (`backend/app/ai_gateway/`)**
- **2-hop grounding context**: `GroundingBuilder.expand_context()` performs BFS from root global_ids, capped at `MAX_EXPANDED_ENTITIES=25`. Bridge entities pushed into `GroundingResult.expanded_global_ids` so the frozen `ResponseValidator` can resolve 2-hop entity references without modification.
- **Prompt mode system**: `PromptService.template_for(mode)` appends a mode-specific directive to `SYSTEM_PROMPT`. Six modes: `explain`, `why_important`, `why_happened`, `historical_impact`, `multi_civilization_view`, `timeline_explanation`. ADR-0003 grounding contract never weakened.
- **Response contract upgrade**: Additive fields `perspectives` (LLM-supplied), `evidence` (server-verified citations as `{global_id, kind, label, status:"verified"}`), `confidence` (server-computed `high|medium|low` from validation result). Old fields retained. `_CITATION_INSTRUCTION` updated.
- **main.py**: `AIRequest.mode: str = "explain"` — pure pass-through, no AI logic in main.py.

**Frontend — AI UX (`frontend/src/`)**
- `aiClient.ts`: `AIEvidence` / `AIConfidence` types, `PROMPT_MODES` export, `mode` pass-through in request body.
- `AIExplanationPanel.tsx`: 5 mode chips (为何重要 / 为何发生 / 历史影响 / 多文明视角 / 时间线解读), permanent disclaimer, deterministic fallback UI block.
- `GroundedAnswer.tsx`: renders `perspectives` block, `evidence` block, `confidence` badge — all guarded for backward compatibility.

**Freeze Gate**
- `scripts/freeze-check.mjs` SCOPE_ALLOWLIST extended (12 precise file entries).
- Freeze invariants: ENTITY_TYPES=8, RELATIONSHIP_TYPES=18, runtime 0.13.0 — untouched.

**Tests**
- Backend: `test_ai_gateway.py` +13 (confidence 6, perspectives 5, evidence 2) → 232 passed.
- Frontend: +10 tests across 3 `.test.tsx` files → 584 passed.

## [vM35.1.1] - 2026-07-27 (Project Release — M35.1)

> **Non-runtime release.** This is a Project Release, not a Runtime Version bump. `frontend/package.json` remains `[0.13.0]`; only frontend additive narrative-consistency code + tests were changed (no `backend/app` / data / schema / validation / registry / runtime change). See `docs/RELEASE_VERSION_POLICY.md`.

Narrative Consistency Patch (M35.1) — a pure-frontend additive fix over vM35.1:

- **U1 (Topic narrative mount)**: `App.tsx` Topic view now mounts `<StorySection narrativeKey={current.topic} />` + `<WhyImportantPanel narrativeKey={current.topic} />` after `FirstExplorationGuide`, surfacing the already-curated `data/narrative.ts` (e.g. `silk_road`) on topic pages — previously only reachable from the Discover page.
- **U2 (Search global_id normalization)**: `App.tsx` search landing now reconstructs the entity `global_id` via `resolveNarrativeKey()` (in `data/narrative.ts`) before `openEntity()`, so `EntityPage` can match the curated narrative for searched entities (e.g. Search "Buddhism" → `ancient_india:religion-buddhism`).
- New pure helper `resolveNarrativeKey({ global_id?, topic?, id? })` in `data/narrative.ts` (NARRATIVE data unchanged); 5 new unit tests in `data/narrative.test.ts` (topic+id / global_id priority / topic-only / Search Buddhism key / empty+id-only safe fallback).
- **Governance / invariants**: no new feature; no `backend/app` change; no schema change; ENTITY_TYPES=8 / RELATIONSHIP_TYPES=18 untouched; zero new dependency; no AI / LLM; runtime stays `[0.13.0]`. Backend **219 passed** (unchanged); frontend **574 passed** (+5); freeze-check EXIT 0; governance tests **9/9**. Release tag: `vM35.1.1`.

## [vM35.1] - 2026-07-27 (Project Release — M35)

> **Non-runtime release.** This is a Project Release, not a Runtime Version bump. `frontend/package.json` remains `[0.13.0]`; only frontend additive exploration-experience code + release-quality fixes (CI workflow, one dataset alias, one backend test assertion) + freeze-guard script + release-metadata docs were changed (no `backend/app` / schema / validation / registry / runtime change). See `docs/RELEASE_VERSION_POLICY.md`.

User Exploration Experience MVP (M35) — a pure-frontend additive release over vM34.1, admitted via the Frontend Freeze Revision Gate (same mechanism as M30-A/M30-B/M34):

- **Discover landing**: `frontend/src/pages/DiscoverPage.tsx` — static discover page with curated topic entries; no new API, no backend call beyond the existing endpoints.
- **Narrative layer (static)**: `frontend/src/components/exploration/StorySection.tsx` + `WhyImportantPanel.tsx`, sourced exclusively from hand-curated `frontend/src/data/narrative.ts` — **NO AI generation**, no LLM, no external fetch.
- **Journey trace (local-only)**: `frontend/src/components/journey/JourneyPanel.tsx` + `frontend/src/lib/journey.ts` — localStorage-only exploration trace; nothing uploaded, no account binding.
- **Feedback capture (no-op/local)**: `frontend/src/components/FeedbackWidget.tsx` — localStorage only, no network.
- **Mount points**: `App.tsx` / `EntityPage.tsx` — additive mounts only; existing views untouched.
- **M35 Release Quality Corrections** (release-quality fixes, NOT feature scope): `.github/workflows/ci.yml` frontend job `npm ci` → `npm install` with corrected `cache-dependency-path` (lockfile is gitignored, `npm ci` cannot run); `data/examples/roman_empire_example.json` — duplicated `Byzantium` alias removed from `civ-byzantine` (kept on `loc-constantinople`), eliminating the `DUPLICATE_ALIAS` validation warning; `backend/tests/test_search_index.py` — assertion synced to the legitimately-enriched `person-augustus.location == "Roman Italy"` (test/data drift; PO-approved single-file Freeze Revision Gate, registered in `scripts/freeze-check.mjs` SCOPE_ALLOWLIST).
- **Governance / invariants**: no new feature beyond M35 scope; no `backend/app` change; no schema change; ENTITY_TYPES=8 / RELATIONSHIP_TYPES=18 untouched; zero new dependency; no AI / LLM; runtime stays `[0.13.0]`. Backend **219 passed**; frontend **569 passed** (+29); freeze-check EXIT 0; governance tests **9/9**. Release tag: `vM35.1`.

## [vM34.1] - 2026-07-27 (Project Release — M34)

> **Non-runtime release.** This is a Project Release, not a Runtime Version bump. `frontend/package.json` remains `[0.13.0]`; only frontend additive exploration-UX + graph-viz code + freeze-guard script + a strategy doc + release-metadata docs were changed (no backend / data / schema / validation / registry / runtime change). See `docs/RELEASE_VERSION_POLICY.md`.

Exploration UX Hardening + Knowledge Graph Visualization MVP (M34) — a pure-frontend additive release over M33 A-1.5, admitted via the Frontend Freeze Revision Gate (M34-ADR-001):

- **A1 - Exploration UX Hardening**: extracts `AppShell` (hero + semantic `<nav class="nav-shell">`) and `EntityHeader` out of the `App.tsx` / `EntityPage.tsx` monolith; hoists the duplicated navigation callbacks into single named handlers (`openNode` / `openNodeNamed`) reused by both views - fixes TD-1 (duplicated rendering) and TD-nav (no navigation shell). DOM and navigation behavior preserved verbatim.
- **A2 - Knowledge Graph Visualization MVP**: adds `lib/graphLayout.ts` (pure, deterministic radial layout; hard MVP caps nodes <=30 / edges <=60, scope = main entity + direct neighbours) and `components/GraphViewPanel.tsx` (self-drawn SVG, zero new dependency, node colors from the 8 frozen entity types, edge labels from the 18 frozen relationship types). Reuses the already-fetched `/explore` + `/entity` relationship data - no new API, no backend change. Mounted in both topic view (`App.tsx`) and entity view (`EntityPage.tsx`).
- **A3 - Civilization Expansion Strategy** (docs only): `docs/product/M34-A3_Civilization_Expansion_Strategy.md` - a strategy-only document proposing a repeatable, freeze-safe civilization/topic expansion pipeline.
- **Governance**: `docs/15_DECISIONS/M34-ADR-001_Exploration_UX_and_Graph_MVP.md` (ADR); `scripts/freeze-check.mjs` SCOPE_ALLOWLIST extended with the ten M34-A1/A2 frontend paths (`EntityPage.tsx` already allowlisted). No backend / data / schema / validation / registry / runtime change; runtime stays `[0.13.0]`; no AI / LLM / new dependency. Frontend **540 passed** (+22); freeze-check EXIT 0; governance tests **9/9**. Release tag: `vM34.1`.

## [vM33.1.1] - 2026-07-26 (Project Release — M33 A-1.5)

> **Non-runtime release.** This is a Project Release, not a Runtime Version bump. `frontend/package.json` remains `[0.13.0]`; only curated dataset files were changed (no backend / frontend / schema / validation / registry / runtime change). See `docs/RELEASE_VERSION_POLICY.md`.

Source Governance Stabilization Migration (M33 A-1.5) — a data-only governance fix over vM33.1 that brings the Knowledge Production Pipeline to "Governance Complete Gold":

- **Source Tier backfill**: `data/sources.json` — 12 sources missing a frozen `tier` field (`src-herodotus-histories`, `src-thucydides-peloponnesian`, `src-rosenberg-1999`, `src-ashoka-edicts`, `src-strabo-geography`, `src-pliny-nh`, `src-nt-greek`, `src-silk-road-archives`, `src-arthashastra`, `src-tipitaka`, `src-aryabhatiya`, `src-thapar-early-india`) now carry `tier ∈ {primary, academic, reference}`; distribution primary 18 / academic 13 / reference 8 / missing 0. `src-rosenberg-1999` also adds a non-vocabulary `verification_status: pending` field.
- **Evidence Claim source corrections**: `data/evidence_claims.json` — `ec-002` source corrected from `herodotus` to `arthashastra` (injects `source_ids: [arthashastra, strabo]`); `ec-023` re-pointed to `thapar-early-india`; `ec-rom-027` re-pointed to `iranica-rome` (the latter two retain `silk-road` inside `source_ids[]`).
- **Validation**: Gold Gate (G1 Source / G2 Wikipedia / G3 Registry / G4 Vocabulary) + Greek Checklist (C1–C5) all pass; 39 sources, 64 claims, missing-tier count 0. No backend / frontend / schema / validation / registry / runtime change; runtime stays `[0.13.0]`; no AI / LLM / new dependency. Release commit: `f58d57f`; tag `vM33.1.1`.

## [vM33.1] - 2026-07-27 (Project Release — M31 + M33)

> **Non-runtime release.** This is a Project Release, not a Runtime Version bump. `frontend/package.json` remains `[0.13.0]`; only curated dataset files were changed (no backend / frontend / schema / validation / registry / runtime change). See `docs/RELEASE_VERSION_POLICY.md`.

Data checkpoints — two milestones released as independent commits/tags on one feature branch:

- **M31 Knowledge Model Expansion (vM31.1)**: `data/examples/ancient_india_example.json` enriched with geo / language / external_refs; `data/sources.json` adds 4 India curated sources (`src-arthashastra`, `src-tipitaka`, `src-thapar-early-india`, `src-aryabhatiya`); `data/evidence_claims.json` adds 14 legacy claims (`ec-011`–`ec-024`); `scripts/freeze-check.mjs` allowlist extended (M31 Pilot annotation). No API / runtime change; no AI / LLM; no new dependency.
- **M33 A-1 Roman Gold Dataset (vM33.1)**: `data/examples/roman_empire_example.json` added; `data/evidence_claims.json` adds 40 Roman claims (`ec-rom-001`–`ec-rom-040`); `data/sources.json` adds 27 Roman curated sources. Upgrades the Knowledge Production Pipeline from "structural Gold" (ancient_india + Roman) toward "Governance Complete Gold". No backend / frontend / schema / validation change; runtime stays `[0.13.0]`; no AI / LLM / new dependency.

## [vM30.2] - 2026-07-26 (Project Release — M30-B)

> **Non-runtime release.** This is a Project Release, not a Runtime Version bump. `frontend/package.json` remains `[0.13.0]`; only frontend additive exploration-flow code + freeze-guard script + tests were added, closing the Entity → Relationship → Evidence → Source → Historical Context loop over the existing M30-A provenance panel and M29.1 provenance projection. See `docs/RELEASE_VERSION_POLICY.md`.

Frontend Exploration Flow Closure (M30-B). A pure-frontend additive closure of the entity-exploration loop over the M30-A provenance panel — approved via the Frontend Freeze Revision Gate (lightweight ADR) — that surfaces provenance evidence for a relationship and groups it by source inside the Entity Page. No backend / data / schema / validation / registry / runtime change:

- `frontend/src/components/RelationshipEvidence.tsx` (new): a 5-state container (`RelationshipEvidence`) + view (`RelationshipEvidenceView`) — loading / success / empty / disabled / error. The success view reuses `ProvenancePanelView` to render `GET /provenance/{entity_id}` records for the relationship's **local id** (the same ADR-006 contract as M30-A; no new API). `AbortController` aborts the in-flight fetch on unmount; retry re-keys the request. It mounts only when the user clicks "查看依据" — never auto-fetches for every relationship.
- `frontend/src/components/RelationshipEvidence.test.tsx` (new, 5 + 1 tests): 5-state render + a local-id contract test asserting the fetch URL uses the LOCAL id (`person-ashoka`, no `:`). No Playwright / Jest / RTL; `renderToStaticMarkup` + vitest node env.
- `frontend/src/components/ExplorationFlowGuide.tsx` (new): a static, state-free 4-step guide (Relationship → Evidence → Source → Historical Context) rendered as an `<ol>`; no buttons, no inputs, no state. Additive on `EntityPage`.
- `frontend/src/components/ExplorationFlowGuide.test.tsx` (new): asserts the 4 steps render and the HTML contains no `<button` / `<input`.
- `frontend/src/components/RelationshipView.tsx` (changed): adds a lazy "查看依据" button (class `rel-evidence-btn`, kept distinct from the focus button class to avoid breaking existing focus tests) that mounts `<RelationshipEvidence entityId={item.id} entityName={displayName} />` only on click. Default: no evidence fetch for any relationship.
- `frontend/src/components/EntityPage.tsx` (changed): mounts `<ExplorationFlowGuide />` after the AI panel and before the cross-topic list (additive; the existing `EntityExplorationGuide` is untouched). `ProvenancePanel entityId={entity.id}` (local id) is retained.
- `frontend/src/components/ProvenancePanel.tsx` (changed): records are now grouped by `source_id` on the frontend via a pure `groupBySource` function. No new field; no `claim_text` / `confidence`; `subject_id` still hidden.
- `frontend/src/components/ProvenancePanel.test.tsx` (changed): adds a grouping case (3 records / 2 sources → exactly 2 `provenance-group-head`, contains `claim-1` / `claim-3`, never `person-ashoka`).
- `scripts/freeze-check.mjs` (changed): `SCOPE_ALLOWLIST` extended from 21 → 26 entries. M30-B adds exactly five files (`frontend/src/components/RelationshipEvidence.tsx`, `frontend/src/components/RelationshipEvidence.test.tsx`, `frontend/src/components/ExplorationFlowGuide.tsx`, `frontend/src/components/ExplorationFlowGuide.test.tsx`, `frontend/src/components/RelationshipView.tsx`); M24 / M25.1 / M26.1 / M29.1 / M30-A entries retained.

Tests: frontend **518 passed** (+8 exploration-flow tests); backend **219 passed** (unchanged). `freeze-check` EXIT 0; governance tests **9/9**; backend diff = 0; `data/examples` diff = 0. Runtime held at `[0.13.0]`; no schema / enum (`ENTITY_TYPES=8`, `RELATIONSHIP_TYPES=18`) change. No new API / no new fact / no AI / LLM introduced. No new dependency.

## [vM27.1] - 2026-07-26 (Project Release — M27.1)

> **Non-runtime release.** This is a Project Release, not a Runtime Version bump. `frontend/package.json` remains `[0.13.0]`; only curated provenance data + documentation were changed. See `docs/RELEASE_VERSION_POLICY.md`.

Project Release — M27.1 Provenance Coverage Expansion

Changes:

- Expanded curated source registry (Source Registry curated sources **3 → 8**).
- Expanded evidence claim dataset (Evidence Claims **2 → 10**).
- Added provenance coverage for additional historical entities and relationships (human-curated records outside `data/examples`; no AI-generated sources, no `confidence` field).

Architecture:

- No runtime change (held at `0.13.0`).
- No API change.
- No frontend change.

Freeze Compliance:

- `main.py` / `api/*` / `validation.py` / frontend untouched; `data/examples` diff = 0.
- No schema / enum (`ENTITY_TYPES=8`, `RELATIONSHIP_TYPES=18`) change. No backend code changed.
- DatasetProvider Runtime Activation (E2) remains deferred.
- Backend **205 passed** (unchanged) / frontend **500 passed** (unchanged); `freeze-check` EXIT 0; governance tests **9/9**. No AI / LLM introduced. No new dependency.

## [vM30.1] - 2026-07-26 (Project Release — M30-A)

> **Non-runtime release.** This is a Project Release, not a Runtime Version bump. `frontend/package.json` remains `[0.13.0]`; only frontend additive provenance-UI code + freeze-guard script + tests were added, surfacing the existing M29.1 provenance projection. See `docs/RELEASE_VERSION_POLICY.md`.

Frontend Provenance Exploration Panel (M30-A). A pure-frontend additive layer over the M29.1 runtime provenance projection — approved via the Frontend Freeze Revision Gate (lightweight ADR) — that surfaces the existing `GET /provenance/{entity_id}` read model inside the Entity Page. No backend / data / schema / validation / registry / runtime change:

- `frontend/src/data/provenanceApi.ts` (new): HTTP-only client for `GET /provenance/{entity_id}` (`API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000'`); `getProvenance(entityId)` returns the `provenance` array (empty array when none); a 404 raises `ProvenanceDisabledError` (the panel then shows a friendly disabled state rather than a hard error). No AI, no new dependency.
- `frontend/src/components/ProvenancePanel.tsx` (new): a 5-state container (`ProvenancePanel`) + view (`ProvenancePanelView`) — loading / success / empty / disabled / error. The success view shows Source / Claim / Reference only (never `subject_id`); `AbortController` aborts the in-flight fetch on unmount; retry re-keys the request. Reuses the existing `EmptyState` / `ErrorCard` / `LoadingSkeleton` UX atoms. No edge creation / inference / causal reasoning.
- `frontend/src/components/EntityPage.tsx` (changed): mounts `<ProvenancePanel entityId={entity.id} />` right after the relationship cluster (RelatedEntityList), before the AI panel. It passes `entity.id` — the **local id** — because the backend indexes provenance by local id per ADR-006 (NOT the `global_id`); this contract fix is the key correctness change vs the earlier global_id assumption.
- `frontend/src/data/provenanceApi.test.ts` (new, 5 tests): 200 + records, 200 + empty, 404 → `ProvenanceDisabledError`, 500 → Error, malformed JSON.
- `frontend/src/components/ProvenancePanel.test.tsx` (new, 5 tests): renders `ProvenancePanelView` with forced status (loading / empty / disabled / error / success).
- `scripts/freeze-check.mjs` (changed): `SCOPE_ALLOWLIST` extended from 16 → 21 entries. M30-A adds exactly five files (`frontend/src/data/provenanceApi.ts`, `frontend/src/data/provenanceApi.test.ts`, `frontend/src/components/ProvenancePanel.tsx`, `frontend/src/components/ProvenancePanel.test.tsx`, `frontend/src/components/EntityPage.tsx`); M24 / M25.1 / M26.1 / M29.1 entries retained.

Tests: frontend **510 passed** (+10 provenance UI tests); backend **219 passed** (unchanged). `freeze-check` EXIT 0; governance tests **9/9**; backend diff = 0; `data/examples` diff = 0. Runtime held at `[0.13.0]`; no schema / enum (`ENTITY_TYPES=8`, `RELATIONSHIP_TYPES=18`) change. No AI / LLM introduced. No new dependency.

## [vM29.1] - 2026-07-26 (Project Release — M29.1)

> **Non-runtime release.** This is a Project Release, not a Runtime Version bump. `frontend/package.json` remains `[0.13.0]`; only backend additive provenance-projection code + freeze-guard script + tests were added, and the runtime provenance projection was activated. See `docs/RELEASE_VERSION_POLICY.md`.

Runtime Provenance Projection Activation (M29.1). A backend additive activation of the provenance projection over the M27.1 provenance layer — approved via the Architecture Freeze Gate (ADR-005 for `main.py`, ADR-006 for the projection read model) — that builds a runtime `ProvenanceIndex` read model from the DatasetProvider and exposes it through a new read-only endpoint. No schema / API-contract break / frontend / data change:

- `backend/app/core/provenance_index.py` (new): `ProvenanceIndex` (frozen `ProvenanceRecord` dataclass: `subject_id` / `source_id` / `claim_id` / `reference`; no confidence / score). `ProvenanceIndex.build(provider)` reads `provider.load_evidence_claims()` + `provider.load_sources()` and indexes `subject_id → List[ProvenanceRecord]` via the `SourceRegistry` O(1) `reference` resolution; `resolve(subject_id)` returns `[]` when absent; `to_json()` is deterministic (sorted keys, no time / random / network). Derived read model only — it does NOT become a Source of Truth.
- `backend/app/main.py` (changed, via ADR-005 Freeze Gate): composition root now wires a module-level `provenance_index` behind the `PROVENANCE_PROJECTION` env flag (default `true`; `"false"` → no projection, `GET /provenance` returns 404, runtime falls back to the vM27.1 behaviour). No lifespan / no new dependency.
- `backend/app/main.py` (changed): added `GET /provenance/{entity_id}` (dual-mounted `/api/v1` + legacy) returning `{"entity_id": ..., "provenance": [...]}`; 200 with the records (empty array when none), 404 when the flag is off; KnowledgeService untouched. The provenance is NOT merged into the `/entity` response (Option B).
- `backend/tests/test_provenance_index.py` (new, 9 tests): source resolve, claim resolve, unknown subject → `[]`, deterministic build ×2 `to_json`, examples-immutable hash.
- `backend/tests/test_provenance_api.py` (new, 5 tests): flag on v1 / legacy 200 + records, missing → `[]`, flag off 404 + KnowledgeService alive.
- `scripts/freeze-check.mjs` (changed): `SCOPE_ALLOWLIST` extended from 12 → 16 entries. M29.1 adds exactly four files (`backend/app/core/provenance_index.py`, `backend/app/main.py`, `backend/tests/test_provenance_index.py`, `backend/tests/test_provenance_api.py`); M24 / M25.1 / M26.1 entries retained.
- `scripts/freeze-check.test.mjs` (changed): governance test 10 added (asserts the four M29.1 files are in the allowlist and PASS scope, and that M24 / M25.1 / M26.1 entries remain) — 10 / 10.

Tests: backend **219 passed** (+14 Provenance Index / API tests); frontend **500 passed** (unchanged). `freeze-check` EXIT 0; governance tests **10 / 10**; backend diff (vs vM27.1) limited to `provenance_index.py` + `main.py` + their tests; `data/examples` diff = 0. Runtime held at `[0.13.0]`; no schema / enum (`ENTITY_TYPES=8`, `RELATIONSHIP_TYPES=18`) change. No AI / LLM introduced. No new dependency.

## [vM26.1] - 2026-07-26 (Project Release — M26.1)

> **Non-runtime release.** This is a Project Release, not a Runtime Version bump. `frontend/package.json` remains `[0.13.0]`; only backend additive Source Registry + Evidence Claim code + curated data + freeze-guard script + tests were added. See `docs/RELEASE_VERSION_POLICY.md`.

Dataset Source Registry + Evidence Claim Boundary (M26.1). A backend additive provenance layer over the M25.1 Dataset Provider Layer — approved via the Architecture Freeze Gate — that adds a human-curated Source Registry and a typed Evidence Claim boundary, keeping provenance metadata in an independent curated layer outside `data/examples`. No schema / API / runtime / AI / frontend change:

- `backend/app/core/source_registry.py` (new): a human-curated `SourceRegistry` indexed by `source_id`. `SourceRecordV1` extends the M25.1 `SourceRecord` with `publisher_or_archive`. `FileSourceLoader` reads `data/sources.json` (returns `[]` when absent); sources are an independent curated layer and NEVER enter the knowledge graph (no CITED_FROM relation; `RELATIONSHIP_TYPES=18` unchanged), and AI-generated sources / citations / confidence are forbidden.
- `backend/app/core/evidence_claim.py` (new): a typed `EvidenceClaim` record linking a subject (entity or relationship) to a curated source via `source_id`, plus `FileEvidenceClaimLoader` reading `data/evidence_claims.json`. Evidence Claims are a separate curated layer and do NOT modify `data/examples/*`; validation is orchestration-only (see `dataset_validator.validate_evidence_claims`).
- `backend/app/core/dataset_provider.py` (changed): `__init__` gains an `evidence_path` argument; `build_dataset_provider` now defaults to wiring `FileSourceLoader` (graceful `[]` when `data/sources.json` is absent) and adds `load_evidence_claims()`; composition over `TopicRepository` unchanged, no lifecycle methods.
- `backend/app/core/dataset_validator.py` (changed): adds `validate_source_registry()` (id uniqueness + required human-curated fields) and `validate_evidence_claims()` (valid `subject_type`, resolvable `source_id`, required fields). Both are orchestration-only and reuse the single frozen `app.validation.build_validation_report`; `validation.py` unchanged.
- `backend/tests/test_source_registry.py` (new, 12 tests): loader returns `[]` when file absent, `SourceRecordV1` carries `publisher_or_archive`, registry id-index lookup, duplicate-id detection, curated-field validation, no graph mutation.
- `backend/tests/test_evidence_claim.py` (new, 12 tests): loader returns `[]` when file absent, typed claim construction, `subject_type` validation, `source_id` resolution, required-field checks, no `data/examples` access.
- `data/sources.json` (new, curated) + `data/evidence_claims.json` (new, curated): independent provenance metadata layer outside `data/examples`; human-curated, no AI.
- `scripts/freeze-check.mjs` (changed): `SCOPE_ALLOWLIST` extended from 6 → 12 entries. M26.1 adds exactly six files (`backend/app/core/source_registry.py`, `backend/app/core/evidence_claim.py`, `backend/tests/test_source_registry.py`, `backend/tests/test_evidence_claim.py`, `data/sources.json`, `data/evidence_claims.json`); M24's two and M25.1's four entries are retained. `data/examples/*` stays frozen.
- `scripts/freeze-check.test.mjs` (changed): governance test 9 added (asserts the six M26.1 files are in the allowlist and PASS scope, and that M24/M25.1 entries remain) — 9/9.

Tests: backend **205 passed** (+24 Source Registry/Evidence Claim tests); frontend **500 passed** (unchanged). `freeze-check` EXIT 0; governance tests **9/9**; backend diff (vs vM25.1) limited to `source_registry.py` + `evidence_claim.py` + `dataset_provider.py` + `dataset_validator.py` + their tests; `main.py` unchanged — the provider is NOT wired into any runtime path (E1/E2 deferred); AI pipeline diff = 0. Runtime held at `[0.13.0]`; no schema / enum (`ENTITY_TYPES=8`, `RELATIONSHIP_TYPES=18`) change. No AI / LLM introduced. No new dependency.

## [vM25.1] - 2026-07-26 (Project Release — M25.1)

> **Non-runtime release.** This is a Project Release, not a Runtime Version bump. `frontend/package.json` remains `[0.13.0]`; only backend additive Dataset Provider Layer code + freeze-guard script + tests were added. See `docs/RELEASE_VERSION_POLICY.md`.

Dataset Provider Layer (M25.1). A backend additive layer over the M24 Dataset identity foundation — approved via the Architecture Freeze Gate — that groups read-only dataset access behind a single facade and adds dataset-level validation orchestration. No schema / API / runtime / AI / frontend change:

- `backend/app/core/dataset_provider.py` (new): a lightweight, composition-based `DatasetProvider` that holds a `TopicRepository` (R1 — it does NOT inherit from `TopicRepository` and does NOT become a `DatasetRepository`; no `save_dataset()` / `publish_dataset()` / `switch_dataset()`). It delegates `list_topics` / `load_topic` / `load_all` transparently and derives a `DatasetManifest` (frozen 9-field identity descriptor: `dataset_id` / `version` / `manifest_schema_version` / `dataset_schema_version` / `name` / `creator` / `license` / `content_hash` / `provenance_policy`, with `provenance_policy="human-curated"`; R3 — NO lifecycle fields `status` / `published_at` / `approval`). `content_hash` reuses the canonical deterministic M24 hash. `SourceLoader` / `EmptySourceLoader.load()` returns `[]` (R4 — no `sources.json`, no AI-generated sources; the real `SourceRegistry` is deferred to M26). `build_dataset_provider` factory mirrors `JsonTopicRepository(data_dir)`.
- `backend/app/core/dataset_validator.py` (new): `DatasetValidator` (R2 — orchestration only). It reuses the single frozen schema engine `app.validation.build_validation_report`; it does NOT define `validate_entity()` / `validate_relationship()` / `validate_timeline()` / `DatasetSchemaValidator`, and `validation.py` is unchanged. `DatasetValidationReport` (frozen) summarises manifest validity, schema-version validity, entity / relationship / timeline counts, and error issues.
- `backend/tests/test_dataset_provider.py` (new, 10 tests): composition-not-inheritance, delegated reads match the repository, manifest has exactly 9 fields with no lifecycle, `content_hash` equals the M24 canonical hash, no lifecycle methods, `load_sources()` returns `[]`, zero `TopicRepository` side effects, factory usable.
- `backend/tests/test_dataset_validator.py` (new, 3 tests): orchestration reuses the frozen engine (counts + error issues match `build_validation_report`), unknown schema version FAILS, no Evidence Claim methods / fields (R5 — `provenance_policy` is `human-curated`; AI does not generate provenance or assign confidence).
- `scripts/freeze-check.mjs` (changed): `SCOPE_ALLOWLIST` extended from 2 → 6 entries. M25.1 adds exactly four files (`backend/app/core/dataset_provider.py`, `backend/app/core/dataset_validator.py`, `backend/tests/test_dataset_provider.py`, `backend/tests/test_dataset_validator.py`); M24's two entries are retained. All other backend/frontend paths stay frozen.
- `scripts/freeze-check.test.mjs` (changed): governance test 8 added (asserts the four M25.1 files are in the allowlist and PASS scope, and that M24 entries remain) — 8/8.

Tests: backend **181 passed** (+13 Dataset Provider/Validator tests); frontend **500 passed** (unchanged). `freeze-check` EXIT 0; governance tests **8/8**; backend diff (vs vM24) limited to `dataset_provider.py` + `dataset_validator.py` + their tests; `main.py` unchanged — the provider is NOT wired into any runtime path (E1 deferred to M26); AI pipeline diff = 0. Runtime held at `[0.13.0]`; no schema / enum (`ENTITY_TYPES=8`, `RELATIONSHIP_TYPES=18`) change. No AI / LLM introduced. No new dependency.

## [vM24] - 2026-07-26 (Project Release — M24)

> **Non-runtime release.** This is a Project Release, not a Runtime Version bump. `frontend/package.json` remains `[0.13.0]`; only backend additive foundation code + freeze-guard script + tests were added. See `docs/RELEASE_VERSION_POLICY.md`.

Data Foundation (Minimal Dataset Layer) + Freeze Guard allowlist mode (M24). A backend additive foundation release, approved via the Architecture Freeze Gate, that gives the curated multi-topic graph a stable, reproducible Dataset identity — and hardens the freeze guard. No schema / API / runtime / AI / frontend change:

- `backend/app/core/dataset.py` (new): a lightweight, composition-based `DatasetMetadataProvider` that derives a stable curated-dataset identity (`dataset_id = curated-history-graph` + canonical deterministic `content_hash` sha256) from EXISTING topic content via `TopicRepository`. The hash sorts topic / entity / relationship / timeline before hashing, so it is independent of JSON key/array order; same content → same bytes. No new storage, no `repository.py` / API / runtime change.
- `backend/tests/test_dataset_metadata.py` (new, 6 tests): hash stability across calls, JSON key/array order independence, content-change sensitivity, provider topics match repository, determinism, and zero `TopicRepository` side effects.
- `scripts/freeze-check.mjs` (changed): scope guard upgraded from `frontend-only` mode to an explicit **allowlist** mode. DEFAULT — every `backend/` and `frontend/` change is FROZEN; a change passes ONLY when it matches `SCOPE_ALLOWLIST`. M24 adds exactly two entries (`backend/app/core/dataset.py`, `backend/tests/test_dataset_metadata.py`). All other backend/frontend paths — incl. `main.py`, `api/*`, `ai_gateway/*`, `global_graph.py`, `registry.py`, `data/examples/*`, `frontend/*` — stay frozen and require a new Freeze Revision Gate. This revokes the M11 ADR-0003 scope-level exception for `ai_gateway/` and `main.py`; TOKEN/DEP governance for the AI module is retained.
- `scripts/freeze-check.test.mjs` (changed): governance tests revised (tests 2/5 reflect the new scope policy; new test 7 asserts the M24 allowlist) — 7/7.

Tests: backend **168 passed** (+6 dataset tests); frontend **500 passed** (unchanged). `tsc -b` / `vite build` clean; `freeze-check` EXIT 0; backend diff (vs vM23) limited to `dataset.py` + its test; AI pipeline diff = 0. Runtime held at `[0.13.0]`; no schema / enum (`ENTITY_TYPES=8`, `RELATIONSHIP_TYPES=18`) change. No AI / LLM introduced. No new dependency.

## [vM23] - 2026-07-25 (Project Release — M23)

> **Non-runtime release.** This is a Project Release, not a Runtime Version bump. `frontend/package.json` remains `[0.13.0]`; only frontend code + tests were added (additive, backend unchanged). See `docs/RELEASE_VERSION_POLICY.md`.

Timeline Zoom/Pan + Entity Comparison Table + Insight CSV Export (M23). A pure-frontend additive release over the M17–M22 insight views — no backend, runtime, schema, causal, AI-memory, session-persistence, or proactive-AI change. Everything surfaces EXISTING relationship metadata only; nothing is fetched, inferred, or uploaded:

- `frontend/src/data/insightExport.ts` (extended, A3): a new pure, deterministic serializer — `serializeInsightReportAsCsv` (RFC-4180 CSV of the SAME insight view already rendered by the panel: entities / type counts / relationship matrix / timeline band; alphabetical type-count ordering, same input → same bytes, no timestamp/randomness/privacy/network). Export-only helper with no AI, no network, no persistence.
- `frontend/src/components/RelationshipInsightPanel.tsx` (extended): (A1) an SVG multi-entity timeline with VIEW-ONLY zoom/pan controls (放大 / 缩小 / 左移 / 右移 / 重置视图) that only transform SVG coordinates via a `<g>` element — `buildMultiEntityTimelineBand` is never recomputed, no data mutation; (A2) a read-only entity comparison table aggregating M16–M19 metrics per entity (centrality degree / distinct relationship-type count / timeline bounds / overlap count) — pure presentation of EXISTING data, no new KG semantics, no inferred edges, no causal narrative; (A3) local-only "复制 CSV 报告" and "下载 CSV" buttons using `navigator.clipboard` (with a `document.execCommand` fallback and a clear success/failure status) and a Blob download — no upload, no account binding, no third-party service. Centrality / Pair Explorer / Timeline list / Connectivity / Graph blocks are unchanged (the timeline `<ul>` list is kept; the SVG is additive).
- `frontend/src/components/RelationshipInsightPanel.test.tsx` (extended): presentation tests for A1 (SVG timeline + view-only zoom/pan controls present, no 推断 / 发现 / 因果 inside the SVG), A2 (read-only comparison table over existing metrics, no causal words), and A3 (local-only Copy CSV / Download CSV buttons; the exact `class="rip-export-btn" === 3` rule is preserved because CSV buttons use a `rip-csv` modifier; the `>= 4` substring rule still holds). `frontend/src/data/insightExport.test.ts` (extended): unit test for `serializeInsightReportAsCsv` (deterministic, RFC-4180 quoting of commas). Existing "no fetch / no inference" assertions unchanged.

Tests: +4 (panel A1/A2/A3 ×3, insightExport CSV ×1). Frontend 500 passed / backend 162 passed; build clean; freeze-check EXIT 0. Runtime held at `[0.13.0]`; no schema / enum (`ENTITY_TYPES=8`, `RELATIONSHIP_TYPES=18`) change. No AI / LLM introduced. No new dependency.

## [vM22] - 2026-07-26 (Project Release — M22)

> **Non-runtime release.** This is a Project Release, not a Runtime Version bump. `frontend/package.json` remains `[0.13.0]`; only frontend code + tests were added (additive, backend unchanged). See `docs/RELEASE_VERSION_POLICY.md`.

Insight Share / Copy Enhancement + RelationshipPathGraph Layout Toggle (M22). A pure-frontend additive release over the M21 graph and the M18 export layer — no backend, runtime, schema, causal, AI-memory, session-persistence, or proactive-AI change. Everything surfaces EXISTING relationship metadata only; nothing is fetched, inferred, or uploaded:

- `frontend/src/data/insightExport.ts` (extended): two new pure, deterministic serializers — `serializeInsightReportAsMarkdown` (Markdown of the SAME insight view already rendered by the panel; alphabetical type-count ordering, same input → same bytes, no timestamp/randomness/privacy/network) and `serializeRelationshipPathsAsText` (plain-text `A — rel → B` chain over EXISTING M20 path edges only; multiple paths joined by newlines, never invents/infers a relationship). Both are export-only helpers with no AI, no network, no persistence.
- `frontend/src/components/RelationshipInsightPanel.tsx` (extended, A3): local-only "复制 Markdown 报告" and "复制关系路径文本" buttons using `navigator.clipboard` (with a `document.execCommand` fallback and a clear success/failure status); no upload, no account binding, no third-party clipboard service. Centrality / Pair Explorer / Timeline / Connectivity / Graph blocks are unchanged.
- `frontend/src/components/RelationshipPathGraph.tsx` (extended, A4): a layout toggle (Horizontal Chain / Compact Grid) that ONLY changes SVG coordinates — the `RelationshipPath[]` data, `findRelationshipPaths()`, and every existing edge are untouched; no graph algorithm, no edge creation, no inferred connection. Hover-to-highlight and empty state preserved.
- `frontend/src/data/insightExport.test.ts` / `RelationshipPathGraph.test.tsx` / `RelationshipInsightPanel.test.tsx` (extended): unit + presentation tests for the Markdown/path-text serializers (Markdown output, multi-entity report, path text, empty data, deterministic, no 推断 / 发现 / 因果 / 导致) and the layout toggle (default horizontal, grid layout, toggle reflects state, data consistency, hover structure preserved, no banned words). Existing "no fetch / no inference" assertions unchanged.

Tests: +19 (insightExport ×10, RelationshipPathGraph ×6, panel A3 ×3). Frontend 496 passed / backend 162 passed; build clean; freeze-check EXIT 0. Runtime held at `[0.13.0]`; no schema / enum (`ENTITY_TYPES=8`, `RELATIONSHIP_TYPES=18`) change. No AI / LLM introduced. No new dependency.

## [vM21] - 2026-07-25 (Project Release — M21)

> **Non-runtime release.** This is a Project Release, not a Runtime Version bump. `frontend/package.json` remains `[0.13.0]`; only frontend code + tests were added (additive, backend unchanged). See `docs/RELEASE_VERSION_POLICY.md`.

Relationship Path Graph Visualization (M21). A pure-frontend additive SVG visualization over the M20 Connectivity Explorer — no backend, runtime, schema, causal, AI-memory, session-persistence, or proactive-AI change. It surfaces EXISTING relationship edges only; nothing is fetched, inferred, or uploaded:

- `frontend/src/components/RelationshipPathGraph.tsx` (new): a PURE VIEW component that receives the already-computed `RelationshipPath[]` (M20 `findRelationshipPaths`) and renders node + edge SVG chains over EXISTING edges only. Includes hover-to-highlight a single path, multi-path layout, and an empty state ("No relationship path available"). It performs no path recomputation, no data query, no API call, no edge creation, no inference, no causal reasoning — Relationship Layer position remains Visualization Only.
- `frontend/src/components/RelationshipInsightPanel.tsx` (extended): embeds `<RelationshipPathGraph />` inside the existing M20 Relationship Connectivity Explorer block (additive; the text `node —relation→ node` chain is kept). Centrality / Pair Explorer / Timeline / Export blocks are unchanged.
- `frontend/src/components/RelationshipPathGraph.test.tsx` / `RelationshipInsightPanel.test.tsx` (extended): unit + presentation tests for the graph (node-name render, relation-type render, multi-hop chain, multi-path render, empty state, no 推断 / 发现 / 因果) and its panel integration (SVG present for connected endpoints, no causal words). Existing "no fetch / no inference" assertions unchanged.

Tests: +7 (RelationshipPathGraph ×6, panel graph integration ×1). Frontend 477 passed / backend 162 passed; build clean; freeze-check EXIT 0. Runtime held at `[0.13.0]`; no schema / enum (`ENTITY_TYPES=8`, `RELATIONSHIP_TYPES=18`) change. No AI / LLM introduced. No new dependency.

## [vM20] - 2026-07-25 (Project Release — M20)

> **Non-runtime release.** This is a Project Release, not a Runtime Version bump. `frontend/package.json` remains `[0.13.0]`; only frontend code + tests were added (additive, backend unchanged). See `docs/RELEASE_VERSION_POLICY.md`.

Relationship Connectivity Explorer (M20). A pure-frontend additive path-exploration over the M17–M19 insight views — no backend, runtime, schema, causal, AI-memory, session-persistence, or proactive-AI change. It surfaces EXISTING relationship edges only; nothing is fetched, inferred, or uploaded:

- `frontend/src/data/relationshipUtils.ts` (extended): one pure, state-free, AI-free helper — `findRelationshipPaths(rows, gidA, gidB, maxHops=3)` (bounded DFS over EXISTING edges only; returns `[{ nodes: string[], edges: string[] }]` where `nodes.length === edges.length + 1`; never invents, infers, or implies a relationship; never mutates its input; input type/empty guards return `[]`).
- `frontend/src/components/RelationshipInsightPanel.tsx` (extended): one new `<details>` block — Relationship Connectivity Explorer (two view-only `<select>` source/target entity controls + a max-hops control; renders `node —relation→ node` chains over existing edges only; shows a clear notice when no path exists among the loaded edges; disclaimer states it only visualises edges already present, no causal words). The panel still never fetches and never modifies `grounded_answer` / `/api/v1/ai/explain` / `multiEntityContext()`.
- `frontend/src/App.tsx` (unchanged): `exploreNameByGlobalId` (M19) is already passed to the panel, so M20 needs no App wiring change; AI pipeline diff = 0.
- `frontend/src/data/relationshipUtils.test.ts` / `RelationshipInsightPanel.test.tsx` (extended): unit + presentation tests for `findRelationshipPaths` (direct edge / two-hop / no path / cyclic A→B→A / maxHops bound / non-mutating input / directed semantics) and the new block (renders controls + disclaimer, renders a path chain over existing edges, reports no path, and never emits 推断 / 发现 / 因果). Existing "no fetch / no inference" assertions unchanged.

Tests: +11 (relationshipUtils findRelationshipPaths ×7, panel connectivity-explorer ×4). Frontend 470 passed / backend 162 passed; build clean; freeze-check EXIT 0. Runtime held at `[0.13.0]`; no schema / enum (`ENTITY_TYPES=8`, `RELATIONSHIP_TYPES=18`) change. No AI / LLM introduced. No new dependency.

## [vM19] - 2026-07-25 (Project Release — M19)

> **Non-runtime release.** This is a Project Release, not a Runtime Version bump. `frontend/package.json` remains `[0.13.0]`; only frontend code + tests were added (additive, backend unchanged). See `docs/RELEASE_VERSION_POLICY.md`.

Relationship Centrality & Pair Explorer (M19). A pure-frontend additive visualization over the M17/M18 insight views — no backend, runtime, schema, causal, AI-memory, session-persistence, or proactive-AI change. Both new capabilities surface EXISTING relationship metadata only; nothing is fetched, inferred, or uploaded:

- `frontend/src/data/relationshipUtils.ts` (extended): two pure, state-free, AI-free helpers — `calculateRelationshipCentrality` (undirected degree count per global_id over the EXISTING relationship matrix; never invents edges) and `filterEdgesBetweenPair` (returns only existing edges whose endpoints are exactly A and B, either direction; never infers a relationship).
- `frontend/src/components/RelationshipInsightPanel.tsx` (extended): two new `<details>` blocks — Relationship Centrality (entity name / global_id / relationship count, labelled via an optional injected `nameByGlobalId`) and Pair Relationship Explorer (two view-only `<select>` controls showing only existing edges between the selected pair, no causal words). The panel still never fetches and never modifies `grounded_answer` / `/api/v1/ai/explain` / `multiEntityContext()`.
- `frontend/src/App.tsx` (extended): derives `exploreNameByGlobalId` from already-fetched exploration metadata (`exploreEntityGlobalById` + `exploreNameById`) and passes it to the panel so target entities outside the candidate set are labelled; additive only — no change to MultiEntityContext / AIExplanationPanel / aiContext / API contract.
- `frontend/src/data/relationshipUtils.test.ts` / `RelationshipInsightPanel.test.tsx` (extended): unit + presentation tests for the new pure functions and blocks; existing "no fetch / no inference" assertions unchanged.

Tests: +12 (relationshipUtils centrality/pair-edge, panel centrality/pair-explorer). Frontend 459 passed / backend 162 passed; build clean; freeze-check EXIT 0. Runtime held at `[0.13.0]`; no schema / enum (`ENTITY_TYPES=8`, `RELATIONSHIP_TYPES=18`) change. No AI / LLM introduced. No new dependency.

## [vM18] - 2026-07-25 (Project Release — M18)

> **Non-runtime release.** This is a Project Release, not a Runtime Version bump. `frontend/package.json` remains `[0.13.0]`; only frontend code + tests were added (additive, backend unchanged). See `docs/RELEASE_VERSION_POLICY.md`.

Relationship Insight Controls & Local Export (M18). A pure-frontend deterministic interaction + export layer over the M17 insight views — no backend, runtime, schema, causal, AI-memory, session-persistence, or proactive-AI change. Controls reorder/filter EXISTING rows only; export serializes EXISTING metadata locally — nothing is fetched, inferred, or uploaded:

- `frontend/src/data/relationshipUtils.ts` (extended): five pure, state-free, AI-free helpers — `normalizeRelationshipFilter` (validates against the frozen 18-type `RELATIONSHIP_TYPES` mirror; blank/`all` → `RELATIONSHIP_FILTER_ALL` sentinel, out-of-vocabulary → `unknown`), `filterRelationshipMatrixByType` (non-mutating matrix row filter incl. `unknown` bucket), `sortRelationshipMatrixByCount` (count-based asc/desc sort with stable original-order tie-break), `sortTimelineBands` (by `start` or `name`; null time bounds always sort last, never fabricated), `normalizeTimelineRange` (swaps inverted bounds only, invents no dates).
- `frontend/src/data/insightExport.ts` (new): pure serialization layer — `serializeInsightReport` (deterministic JSON, schema `history-explorer/insight-report@1`, alphabetical count keys, same input → same bytes) and `buildPrintableInsight` (self-contained escaped HTML, no `<script>` / external links, explicit metadata-only disclaimer). No network, no persistence, no timestamps, no randomness.
- `frontend/src/components/RelationshipInsightPanel.tsx` (extended): matrix filter/sort `<select>` controls and timeline-band sort controls (component-local `useState` view state only), plus a download-JSON button (client-side Blob + object URL) and a print-view button (`window.open` + `print`), labeled 「仅本地生成，不上传。」. The panel still never fetches and never modifies `grounded_answer` / `/api/v1/ai/explain` / `multiEntityContext()`.
- `frontend/src/App.css` (extended): `.rip-controls` / `.rip-control-select` / `.rip-export*` styles reusing the parchment/bronze `--he-*` tokens.

Tests: +34 (relationshipUtils controls, panel controls/export, insightExport determinism/escaping). Frontend 447 passed / backend 162 passed; build clean; freeze-check EXIT 0. Runtime held at `[0.13.0]`; no schema / enum (`ENTITY_TYPES=8`, `RELATIONSHIP_TYPES=18`) change. No AI / LLM introduced. No new dependency.

## [vM17] - 2026-07-25 (Project Release — M17)

> **Non-runtime release.** This is a Project Release, not a Runtime Version bump. `frontend/package.json` remains `0.13.0`; only frontend code + tests were added (additive, backend unchanged). See `docs/RELEASE_VERSION_POLICY.md`.

Relationship Insight Enhancement (M17, Theme A + Theme B). Extends the M16 Relationship Insight Layer with aggregated analytics over EXISTING relationship metadata — no backend, runtime, schema, causal, AI-memory, session-persistence, or proactive-AI change. The new views VISUALIZE only; they perform no fetch, invent no edges, and draw no causal inference:

- `frontend/src/data/relationshipUtils.ts` (extended): added pure, state-free, AI-free helpers — `aggregateRelationshipTypes` (counts relationships by `type`; validates against a frozen frontend mirror of the backend 18-type `RELATIONSHIP_TYPES` vocabulary, bucketing any out-of-vocabulary type as `unknown`), `buildRelationshipTypeMatrix` (one `source → relation_type → target` row per existing edge, never inferred), `buildMultiEntityTimelineBand` (per-entity parsed time bounds + overlap-only comparison via `max(start) <= min(end)`, no historical/causal narrative). No React state; `global_id` stays authoritative.
- `frontend/src/components/RelationshipInsightPanel.tsx` (extended): adds three native `<details>` sections — Relationship Type Summary (counts only, no explanation), Relationship Type Matrix (source → type → target table), and Multi Entity Timeline Band (time ranges + overlap labels). The panel never fetches and never modifies `grounded_answer` / `/api/v1/ai/explain` / `multiEntityContext()`.
- `frontend/src/App.css` (extended): styling for the three new analytics blocks.
- `frontend/src/App.tsx` (additive): passes `mainEntityName` to `RelationshipInsightPanel` for accurate matrix source labels.

Tests: +16 (12 in `relationshipUtils.test.ts`, 4 in `RelationshipInsightPanel.test.tsx`). Frontend 413 passed / backend 162 passed; build 89 modules; freeze-check PASSED. Runtime held at `0.13.0`; no schema / enum (`ENTITY_TYPES=8`, `RELATIONSHIP_TYPES=18`) change. No AI / LLM introduced. No new dependency.

## [vM16] - 2026-07-25 (Project Release — M16)

> **Non-runtime release.** This is a Project Release, not a Runtime Version bump. `frontend/package.json` remains `0.13.0`; only frontend code + tests were added (additive, backend unchanged). See `docs/RELEASE_VERSION_POLICY.md`.

Relationship Insight Visualization Layer (M16, Theme B). A pure-frontend visualization of EXISTING relationship metadata across the user's picked candidates — no backend, runtime, schema, causal, AI-memory, session-persistence, or proactive-AI change. The panel VISUALIZES only; it performs no fetch (never loads `/entity/{id}`), invents no edges, and draws no causal inference:

- `frontend/src/data/relationshipUtils.ts` (new): pure, state-free, AI-free inspectors — `pairEntities` (unique unordered candidate pairs, gid-deduped, deterministic order), `findExistingRelationships` (looks up existing edges from `exploreThemesRelationships` matching the pair's global_ids; never inferred), `timelineOverlap` (self-contained BCE/CE parser over `buildEntityTimeMap` output; reports overlap / gap / partial / unknown, no inference), `geoComparison` (great-circle distance when coordinates exist; backend exposes none today, so it reports "no geographic data" honestly). No React state; `global_id` stays authoritative.
- `frontend/src/components/RelationshipInsightPanel.tsx` (new): a PURE VIEW over existing client data. Per pair it renders relationship cards (existing `rel.type` only), a timeline-overlap view, a geographic-comparison view, and a native collapsible `<details>` (browser-managed fold, no React state). It never fetches and never modifies `grounded_answer` / `/api/v1/ai/explain` / `multiEntityContext()`.
- `frontend/src/App.tsx`: mounts `RelationshipInsightPanel` in the topic result block, fed `pickedCandidates` + `exploreThemesRelationships` + `exploreEntityTimeByName` + `mainGlobalId`. Additive only — no existing pipeline is modified.
- `frontend/src/App.css`: additive `.relationship-insight-panel` / `.rip-*` styles reusing the parchment/bronze `--he-*` tokens.
- New/updated frontend tests (full suite 397 passed): `relationshipUtils.test.ts` (17), `RelationshipInsightPanel.test.tsx` (5). `npm run build` clean; freeze-check EXIT 0; backend diff = 0.
- Deferred (per Scope Freeze / M16 corrections): causal reasoning, relationship discovery, inferred edges, new KG semantics, AI memory / session persistence, proactive AI recommendation, backend changes, runtime bump.

## [vM15] - 2026-07-25 (Project Release — M15)

> **Non-runtime release.** This is a Project Release, not a Runtime Version bump. `frontend/package.json` remains `0.13.0`; only frontend code + tests were added (additive, backend unchanged). See `docs/RELEASE_VERSION_POLICY.md`.

Multi Entity Reasoning Enhancement (M15, Theme A). A pure-frontend UX thickening of the M14 Cross Topic Picker — no backend, runtime, schema, causal, AI-memory, session-persistence, or proactive-AI change. `global_id` stays the authoritative identity throughout:

- `frontend/src/data/pickerUtils.ts` (new): pure, state-free, AI-free helpers — `filterByTopic` (exact-topic filter, blank == all, fresh copy), `distinctTopics` (first-seen distinct topics for filter chips), `sortCandidates` (non-mutating locale-aware sort over name/type/topic/gid; blanks sink last; deterministic gid tie-break), `reorderCandidates` (bounds-checked move for the selected list), `clearCandidates` (fresh empty array). No React state; ids are never synthesized, only rearranged.
- `frontend/src/components/EntityPickerPanel.tsx`: container adds LOCAL-only `sortKey`/`activeTopic` state and derives the visible list via `sortCandidates(filterByTopic(results, activeTopic))`. View gains OPTIONAL, backward-compatible props — topic-filter chips (全部 + `distinctTopics`, `aria-pressed`), a sort control (名称/类型/主题/标识), selected reorder arrows (↑/↓, boundary-disabled), a clear-all button, and a results overflow notice capped at `MAX_VISIBLE_RESULTS` (UI-only). All new View props default to no-op so M14 callers/tests are unchanged.
- `frontend/src/components/MultiEntityContextPanel.tsx`: the view now mirrors `multiEntityContext(selectedGids)` read-only — a resolved-context count (`已解析上下文 N 个 global_id`) plus a native collapsible `<details>` previewing the exact `global_id` list sent to `/ai/explain` (ADR-0003 honesty). No new React state, `selectedGids` stays local, `MAX_SELECTABLE` stays UI-only, `multiEntityContext()` unchanged.
- New/updated frontend tests (full suite 375 passed): `pickerUtils.test.ts` (19), extended `EntityPickerPanel.test.tsx` (9→16), extended `MultiEntityContextPanel.test.tsx` (13→15). `npm run build` clean; freeze-check EXIT 0; backend diff = 0.
- Deferred (per Scope Freeze): Theme B relationship-aware explanation (→ M16), causal reasoning, AI memory / session persistence, proactive AI recommendation, backend changes, runtime bump.

## [vM14] - 2026-07-25 (Project Release — M14)

> **Non-runtime release.** This is a Project Release, not a Runtime Version bump. `frontend/package.json` remains `0.13.0`; only frontend code + tests were added (additive, backend unchanged). See `docs/RELEASE_VERSION_POLICY.md`.

Cross Topic Selection Picker + Candidate UX Enhancement (M14). Lets the user search ANY topic, hand-pick N real entities across different topics (acceptance: 秦始皇 + 亚历山大 + 罗马帝国 selectable across topics into ONE grounded question), see friendly candidate info, and feed their global_ids into the existing M13 multi-entity grounded pipeline. No backend, runtime, schema, causal, AI-memory, session-persistence, or proactive-AI change:

- `frontend/src/components/SearchResults.tsx`: `SearchResultItem` gains an optional additive `global_id?: string` (the `/search` API still omits it, so it stays optional).
- `frontend/src/data/candidateUtils.ts` (new): pure `Candidate` normalization — `deriveGlobalId` (canonical `${topic}:${id}`, prefers explicit `global_id`) + `toCandidate` (only real Entity rows with a resolvable global_id). No AI logic; deliberately kept out of the `aiContext` Grounded-AI layer.
- `frontend/src/components/EntityPickerPanel.tsx` (new): searches ANY topic by reusing `GET /search`, shows friendly name/type/topic, and adds/removes candidates. Selection is COMPONENT-LOCAL state (no App global AI state); notifies the host via `onCandidatesChange`. Pure helpers (`resultsToCandidates` map+dedup, `addCandidate`, `removeCandidate`) extracted & tested.
- `frontend/src/components/MultiEntityContextPanel.tsx`: compatibility-first extension — retains `candidateGids?: string[]` (now optional) and adds `candidates?: Candidate[]`. `resolveCandidates()` rule: `candidates` wins when non-empty, else falls back to `candidateGids` (existing callers unchanged); dedupe by gid, preserve order. The view renders friendly name/type instead of bare global_ids; `MAX_N = 8` stays UI-layer only and `multiEntityContext()` is unchanged.
- `App.tsx`: mounts `EntityPickerPanel` and holds the picked candidates in a plain selection list (`pickedCandidates`, NOT AI state), feeding `MultiEntityContextPanel` `candidates` while keeping `candidateGids` as fallback.
- New/updated frontend tests (full suite 347 passed): `candidateUtils.test.ts`, `EntityPickerPanel.test.tsx`, and extended `MultiEntityContextPanel.test.tsx` (backward-compat + candidates-primary + `resolveCandidates`). `npm run build` clean; freeze-check EXIT 0; backend diff = 0.
- Deferred (per Scope Freeze): causal reasoning, AI memory / session persistence, proactive AI recommendation, backend changes, runtime bump.

## [vM13] - 2026-07-25 (Project Release — M13)

> **Non-runtime release.** This is a Project Release, not a Runtime Version bump. `frontend/package.json` remains `0.13.0`; only frontend code + tests were added (additive, backend unchanged). See `docs/RELEASE_VERSION_POLICY.md`.

Multi Entity Reasoning Foundation (M13). Lets the user explicitly pick N real entity global_ids from the current exploration graph and ask ONE grounded question across them — reusing the existing M12-1 Grounded AI `/api/v1/ai/explain` primitive. No backend, runtime, schema, causal, AI-memory, or proactive-AI change:

- `frontend/src/data/aiContext.ts`: new `multiEntityContext(ids)` — a pure, stateless N-id builder that validates / normalizes / deduplicates / preserves first-occurrence order. It imposes NO selection cap (MAX_N is a UI-layer concern per M13 Correction #2); the backend `grounded_answer(context_global_ids: Sequence[str])` already accepts N context ids.
- `frontend/src/components/MultiEntityContextPanel.tsx` (new): owns `selectedGids` as COMPONENT-LOCAL `useState` — NOT lifted into `App.tsx`, no global store / context provider, never persisted (M13 Correction #1). `MAX_N = 8` enforced only at the UI layer; renders `AIExplanationPanel` with `multiEntityContext(selectedGids)`. This delivers the panel M12-2 promised but never shipped (resolves M12-2 scope drift).
- `App.tsx`: mounts `MultiEntityContextPanel` on the Explore page, passing `candidateGids={Object.values(exploreEntityGlobalById)}` and `onCitationClick=openEntity`. App holds NO AI selection state — additivity preserved (the legacy auto-context `AIExplanationPanel` is kept unchanged).
- 16 new frontend tests (322 total: `aiContext.multiEntityContext` + `MultiEntityContextPanel` view + `applyToggleSelection` cap logic); `npm run build` clean; freeze-check EXIT 0.
- Deferred (per Scope Freeze): causal reasoning, AI memory / session persistence, proactive AI recommendation, backend changes, runtime bump, cross-topic selection picker (current candidate pool = current Explore page entities).

## [vM12-2] - 2026-07-25 (Project Release — M12-2)

> **Non-runtime release.** This is a Project Release, not a Runtime Version bump. `frontend/package.json` remains `0.13.0`; only frontend code + tests were added (additive, backend unchanged). See `docs/RELEASE_VERSION_POLICY.md`.

AI Contextual Exploration (M12-2). Brings the M12-1 Grounded AI capability into real exploration flows through a frontend Context Assembly Layer — no new AI, backend unchanged:

- `frontend/src/data/aiContext.ts` (new, pure & stateless): turns an exploration selection into the `context_global_ids` array consumed by `AIExplanationPanel` / `aiClient`. Rejects empty ids and synthetic `topic:timeline:<label>` ids; `timelineContext` only accepts a real entity global_id — the frontend never invents timeline citation ids.
- `EntityPage` integrates `AIExplanationPanel` (context = `[entity.global_id]`); `RelationshipView` integrates it for the focused pair (`relationshipContext`, explicitly non-causal — no 导致/引起/因果 wording); `TimelinePanel` integrates it scoped to the entity (`entityContext` only). `EntityPage` forwards `onNodeClick` to both sub-panels; citation clicks reuse `openEntity`.
- `CitationList` made kind-aware: entity / relationship citations stay clickable (M12-1), timeline citations render as plain references (their synthetic global_id is unresolvable → prevents dead-link navigation).
- 15 new frontend tests (306 total: `aiContext` validation + CitationList anti-deadlink); `npm run build` clean; freeze-check EXIT 0.
- Deferred (per Scope Freeze): Multi-Entity Context UI, Journey Summary, Causal Reasoning, AI Memory.

## [vM12-1] - 2026-07-25 (Project Release — M12-1)

> **Non-runtime release.** This is a Project Release, not a Runtime Version bump. `frontend/package.json` remains `0.13.0`; only frontend code + tests were added (additive, backend unchanged). See `docs/RELEASE_VERSION_POLICY.md`.

Grounded AI Exploration Experience Foundation (M12-1). Surfaces the existing back-end Grounded AI endpoints (ADR-0003) in the Explorer UI:

- Frontend-only integration (`Backend NO CHANGE`, `Runtime 0.13.0` unchanged): `aiClient` (thin fetch wrapper for `POST /api/v1/ai/explain` + `/ai/chat`, `AbortController` race protection), `GroundedAnswer` (honest engine/grounded rendering — never fakes a reliable fact), `CitationList` (verified citations clickable; rejected citations shown, never hidden, never clickable), `AIExplanationPanel` (container + testable view; idle/loading/success/error states).
- `App.tsx` mounts `AIExplanationPanel`; grounding context is taken ONLY from the existing exploration graph (`main_entity.global_id` + related entities resolved via `exploreEntityGlobalById`); citation clicks reuse `openEntity` — no new ids, no new business logic.
- 14 new frontend tests (291 total); `npm run build` clean; freeze-check EXIT 0.

## [vM11-3] - 2026-07-25 (Project Release — M11-3)

> **Non-runtime release.** This is a Project Release, not a Runtime Version bump. `frontend/package.json` remains `0.13.0`; only documentation + tests were changed (additive). See `docs/RELEASE_VERSION_POLICY.md`.

Governance Hardening (M11-3). Clears the tracked governance debt from M11-2:

- Documented `answer_service` orchestration layer (builder → serializer → provider → validator → fallback) in M11-2 Planning §2 and Architecture Baseline §3; added `main.py` thin-handler invariant (route mounting / delegation only — no `KnowledgeService`, no graph mutation, no AI business logic).
- Added ADR-0003 grounding validation tests: malformed-JSON → `ai_unverified` fallback, validator-bypass prevention, wrong-citation-kind rejection, fake-timeline rejection, `/ai/chat` stateless contract, `main.py` thin-handler regression.
- Strengthened AI boundary regression coverage; governance debt cleared.

## [vM11-2] - 2026-07-24 (Project Release — M11-2)

> **Non-runtime release.** This is a Project Release, not a Runtime Version bump. `frontend/package.json` remains `0.13.0`; only backend `ai_gateway/` code + tests were added (additive). See `docs/RELEASE_VERSION_POLICY.md`.

Grounded AI Interpretation Layer (**M11-1 / M11-2**). Introduces an *additive* AI explanation layer over the deterministic knowledge graph, governed by **ADR-0003** — the deterministic graph stays the single source of truth and AI only consumes read-only grounding.

### Added

- **AI Gateway foundation (M11-1)** — `backend/app/ai_gateway/`: `provider` (transport adapter, no business logic), `prompt_service`, `fallback_handler`, `config`. The provider returns `None` when disabled / missing credentials, never raises.
- **Grounded Context Engine (M11-2)** — `backend/app/ai_gateway/`: `citation_model` (pure `Citation`), `grounding_builder` (read-only KnowledgeService adapter → `GroundingResult`), `context_serializer` (`GroundingResult` → `[ALLOWED FACTS]`), `response_validator` (validates every AI citation against real graph facts — `global_id` / `kind` / relationship / timeline; illegal citations rejected; all-illegal → `grounded=false`), `answer_service` (orchestration: builder → serialize → provider → validate, with deterministic fallback on provider failure / timeout).
- **AI endpoints** — `POST /ai/explain` + `POST /ai/chat`, dual-mounted (`/api/v1` + legacy). `/ai/chat` is **strictly stateless**: context is self-carried via `context_global_ids[]`; no conversation / history / session / memory / DB / Redis.

### Freeze Compliance

- Runtime held at `0.13.0`; no frontend / schema / enum (`ENTITY_TYPES=8`, `RELATIONSHIP_TYPES=18`) change.
- AI is **additive** and grounded per ADR-0003; the deterministic graph is never mutated. New dependency scope (`openai` SDK) is confined to `ai_gateway/`; `main.py` is route-mount only (no forbidden bare tokens).
- `scripts/freeze-check.mjs` **EXIT 0**; backend **156 passed** (incl. 12 new in `test_grounded_context.py`); M0–M10 zero regression.

---

## [vM10-2] - 2026-07-24 (Project Release — M10-2)

> **Non-runtime release.** This is a Project Release, not a Runtime Version bump. `frontend/package.json` remains `0.13.0`. See `docs/RELEASE_VERSION_POLICY.md`. (Backfilled for changelog completeness — the `vM10-2` tag was created without a matching CHANGELOG entry.)

Exploration Narrative Integration (**M10-1 / M10-2**), the M10 project-release series.

### Added

- **Exploration state persistence & trail visualization (M10-1)** — exploration state persistence plus an enriched exploration trail visualization.
- **Exploration narrative focus linkage (M10-2)** — links the exploration narrative to the focused entity/topic so trail and narrative stay in sync.

### Freeze Compliance

- No schema / enum (`ENTITY_TYPES=8`, `RELATIONSHIP_TYPES=18`) change. No AI / LLM introduced. No new dependency. Runtime held at `0.13.0`.

---

## [vM9-006] - 2026-07-23 (Project Release — M9-006)

> **Non-runtime release.** This is a Project Release, not a Runtime Version bump. `frontend/package.json` remains `0.13.0`; no code changed. See `docs/RELEASE_VERSION_POLICY.md`.

Release Governance & Documentation Hygiene (M9-006). Establishes the dual-track release-version policy and its automated consistency guard, closing the version-drift that existed before M9-006.

### Added

- **Release Version Policy** (`docs/RELEASE_VERSION_POLICY.md`, new): dual-track versioning model; seven release-version artifacts each with a single responsibility; formal "do not mix" rules; Release authority retained by Product Owner (D8).
- **Release Consistency Checker** (`scripts/release-consistency-check.mjs`, new): CI guard enforcing the policy via R1–R7 (package.json / runtime tag / project tag / README / PROJECT_CONTEXT §5 / CHANGELOG / self-integrity). stdlib-only, strictly read-only.

### Freeze Compliance

- No backend / frontend / schema / enum (`ENTITY_TYPES=8`, `RELATIONSHIP_TYPES=18`) change. No AI / LLM introduced. No new dependency.
- `frontend/package.json` held at `0.13.0`; README / PROJECT_CONTEXT / CHANGELOG synced to reflect the dual-track reality.

---

## [vM9-004.2] - 2026-07-22 (Project Release — M9-004)

> **Non-runtime release.** This is a Project Release (data milestone), not a Runtime Version bump. `frontend/package.json` remains `0.13.0`; no code changed. See `docs/RELEASE_VERSION_POLICY.md`.

Historical Knowledge Graph Data Expansion (**M9-004.2**). Expands the example dataset coverage across all 8 topics.

### Data (from `validation.py` / `GET /health`)

- **8 topics / 99 entities / 154 relations / 45 cross-topic edges / 15 timelines / 0 warnings** (previously 8 / 69 / 104 / 31 / 15 / 0).

### Freeze Compliance

- No backend / frontend / schema / enum (`ENTITY_TYPES=8`, `RELATIONSHIP_TYPES=18`) change. Pure data expansion.
- No AI / LLM introduced. No new dependency.
- Validation report: **0 warnings / 0 errors**.

---

## [0.13.0] - 2026-07-22

Exploration Journey Panel milestone (**M9-003**). Adds an explainable, retractable exploration journey that annotates each stop with *why it was reached* — frontend-only, no backend or AI.

### Added

- **Exploration Journey Panel (M9-003)**
  - `frontend/src/components/ExplorationJourney.tsx` (new): pure-consumer Journey panel — `buildJourney` (pure fn) / `ExplorationJourneyView` (presentational) / `ExplorationJourney` (container). Renders App navigation history with per-stop "why" annotations; **owns no navigation state**.
  - `frontend/src/App.tsx` (additive): session-scoped `journeyReasons` annotation map + `goHome` reset + `<ExplorationJourney>` sibling mount (Trail → Journey → RecPanel); `onNodeClick` 2-arg capture of recommendation context.
  - `frontend/src/components/RecommendationPanel.tsx` (additive): `RecommendationContext` type + `buildRecommendationContext` pure fn + backward-compatible `onNodeClick(gid, ctx?)`.
  - `frontend/src/App.css` (additive): `.he-journey*` styles (reuse `--he-*` tokens).
  - `frontend/src/components/__tests__/ExplorationJourney.test.tsx` (new): 13 tests.

### Freeze Compliance

- No backend / `navigation.ts` / schema / enum (`ENTITY_TYPES=8`, `RELATIONSHIP_TYPES=18`) change. `journeyReasons` is an annotation map, never enters `navigation.ts`.
- No AI / LLM / Provider / Recommendation-as-ML introduced — deterministic graph sort surfaced read-only.
- No new dependency. Frontend vitest **242 passed** (229 + 13); `tsc --noEmit` 0 errors; `vite build` 0 errors; freeze-check (`FROZEN_SCOPE=frontend`) PASSED.

---

## [0.12.0] - 2026-07-22

RecommendationPanel milestone (**M9-002**). Surfaces the M9-001 recommendation API in the frontend — frontend-only, no backend or AI.

### Added

- **RecommendationPanel (M9-002)**
  - `frontend/src/components/RecommendationPanel.tsx` (new): self-fetching panel consuming `GET /entity/{id}/recommendations`; 3-layer (fetch helper + view + container); `he-recommend` namespace; empty → null; loading → skeleton; error → retry.
  - `frontend/src/App.tsx` (additive): mount `RecommendationPanel` as entity-branch sibling (EntityPage → RecommendationPanel → ContinueExploringPanel), wired with `entityId` / `seenGlobalIds` / `max` / `onNodeClick`.
  - `frontend/src/App.css` (additive): `.he-recommend*` styles.
  - `frontend/src/components/__tests__/RecommendationPanel.test.tsx` (new): 9 tests.

### Freeze Compliance

- No backend / schema / enum change. No AI / LLM. No new dependency. Frontend vitest **229 passed** (220 + 9); `tsc --noEmit` 0 errors; `vite build` 0 errors; freeze-check (`FROZEN_SCOPE=frontend`) PASSED.

---

## [0.11.0] - 2026-07-22

Deterministic Next-Node Recommendation Engine milestone (**M9-001.2**). Adds a backend, explainable "next node" recommendation API reusing the frozen four-dimensional scoring — no AI/LLM, no schema change, no new dependency. All changes additive and freeze-safe.

### Added

- **Next-Node Recommendation Engine (M9-001)**
  - `core/exploration_engine.py`: `recommend_next()` — deterministic composite recommendation score reusing the frozen scoring primitives (relationship meaning / temporal coherence / entity importance / path simplicity); returns ranked candidates with `reasons`, `relation_path`, `score_breakdown`.
  - `core/knowledge_service.py`: `recommend_next()` facade over the engine.
  - `main.py`: `GET /entity/{entity_id}/recommendations` (dual-mounted `/api/v1` + legacy) returning `RecommendationResult` (`RecommendationItem[]` + `algorithm_version` + `parameters` + `metadata`). New types `RecommendationItem` / `RecommendationResult` / `REC_W_*`.
  - `tests/test_recommend.py`: 15 new backend tests.

### Freeze Compliance

- No frontend / schema / enum (`ENTITY_TYPES=8`, `RELATIONSHIP_TYPES=18`) change.
- No AI / LLM / Provider / Recommendation-as-ML introduced — this is a deterministic graph sort, PO-authorized (M9-000 / M9-001 Planning Baseline).
- No new dependency. Backend pytest **130 passed** (incl. 15 new); frontend vitest **220 passed** (unchanged); freeze-check (`FROZEN_SCOPE=backend`) PASSED (D=0).

---

## [0.10.0] - 2026-07-20

Engineering Foundation Cleanup milestone (**M8.6**, Phase 1 — Version Source Alignment). Establishes a single source of truth for versioning and reconciles release documentation that had drifted behind the actual Git tags.

### Changed (completed in M8.6 Phase 1)

- **Version Source Alignment**
  - `frontend/package.json`: `version` aligned `0.6.0` → `0.10.0` and adopted as the single source of truth for the frontend; Git tags remain the release-event markers. No dependency, script, or formatting changes.
  - `CHANGELOG.md`: reconciled against real Git history — added the missing `[0.7.0]`, `[0.8.0]`, and `[0.9.0]` entries (previously only `[0.6.0]` was present).
  - `README.md`: Project Status updated from the stale "M2 — Exploration MVP" to reflect M8 completion and the in-progress foundation cleanup.

### Scoped for follow-up M8.6 phases (NOT in v0.10.0)

- **CI pipeline** (`.github/workflows/ci.yml`) — automated test / type-check / build / freeze-guard.
- **Freeze-guard automation** (`scripts/freeze-check`) — enforced M3.5 freeze protection as a CI gate.
- **Engineering Playbook** (`docs/ENGINEERING_PLAYBOOK.md`) — codified milestone lifecycle and release discipline.

### Freeze Compliance

- No backend / API / Knowledge Model / AI / LLM change.
- No UI feature change; only version string and documentation updated.
- Frontend tests: `220 passed` (29 files, unchanged from v0.9.0); `tsc --noEmit` 0 errors; `vite build` 0 errors.

---

## [0.9.0] - 2026-07-20

Multi Entity Temporal Visualization milestone (**M8**). Adds a system-driven, multi-entity temporal view that overlays many entities on a shared year axis and surfaces deterministic overlaps — frontend-only, no backend or AI.

### Added

- **Multi Entity Temporal Axis (`temporalAxis.ts`)**
  - Three pure, deterministic functions: `computeAxisBounds`, `layoutBars`, `detectOverlaps`. No `Date()`, `random()`, `async`, or I/O. Reuses `compareTemporalRanges` as the single source of truth for interval relations.
- **Multi Entity Timeline (`MultiEntityTimeline.tsx`)**
  - Renders N entities as CSS-positioned bands on one shared year axis with fixed time-bucket ticks; overlap facts reuse the M7 comparison-text engine. No canvas/SVG; no sorting (input order + name dedupe only).

### Changed

- `frontend/src/data/compareTemporal.ts`: `numericValue` exported (was private) — behavior unchanged, enables M8 reuse.
- `App.tsx` / `App.css`: panel mounted after `TemporalComparisonPanel`; added `.multi-entity-*` styles reusing `--he-*` tokens.

### Freeze Compliance

- No backend / `exploration_engine.py` / `validation.py` / `navigation.ts` / Knowledge Model change.
- No AI / LLM / ranking / similarity / confidence / era inference. Forbidden-token business-logic hits: 0.
- Frontend tests: `220 passed` (29 files, +26 vs M7); `tsc --noEmit` 0 errors; `vite build` 0 errors (74 modules).

---

## [0.8.0] - 2026-07-20

Temporal Comparison Layer milestone (**M7**). Lets a user compare two entities' lifespans/periods on a shared axis and read a deterministic natural-language relation — frontend-only, no backend or AI.

### Added

- **Temporal Comparison Engine (`compareTemporal.ts`)**
  - Pure functions for comparing two temporal entities: `compareTemporalRanges`, `buildTemporalComparisonText`, `numericValue`. Fixed templates, no scoring/ranking/similarity.
- **Temporal Comparison Panel (`TemporalComparisonPanel.tsx`)**
  - Two entity selectors + A/B comparison on a shared year axis; renders the deterministic relation text. No re-sort, no recommender.

### Changed

- `App.tsx` / `App.css`: panel mounted; added `.temporal-comparison-*` styles reusing `--he-*` tokens.

### Freeze Compliance

- No backend / API / Knowledge Model change.
- No AI / LLM / ranking / similarity. Frontend-only.
- Regression gate green at release: frontend vitest passed; `tsc --noEmit` 0 errors; `vite build` 0 errors.

---

## [0.7.0] - 2026-07-20

Temporal Understanding Layer milestone (**M6**). Extends the deterministic understanding layer with temporal context and a structured timeline view — frontend-only, no backend or AI.

### Added

- **Temporal Utilities (`temporalUtils.ts`, `timelineUtils.ts`)**
  - Deterministic date/period formatting and timeline arithmetic helpers; pure functions, no `Date()`/`random()`/`async`.
- **Timeline Panel enhancement (`TimelinePanel.tsx`)**
  - Structured timeline rendering with temporal context injected from entity data.
- **Understanding layer temporal injection (`understandingRules.ts`, `InterpretationPanel.tsx`, `EntityPage.tsx`)**
  - Temporal context threaded into the existing deterministic "Historical Meaning" understanding flow.

### Changed

- `App.tsx` / `App.css`: timeline panel wired into entity views; added `.timeline-*` styles.

### Freeze Compliance

- No backend / API / Knowledge Model change.
- No AI / LLM / ranking / similarity. Frontend-only.
- Regression gate green at release: frontend vitest passed; `tsc --noEmit` 0 errors; `vite build` 0 errors.

---

## [0.6.0] - 2026-07-19

Historical Meaning Layer milestone (**M5-D**). Adds a deterministic, rule-based "Historical Meaning" layer that explains *why* a connection exists and *what it meant* — derived purely from existing relationship data (type + direction) via fixed templates, with no AI/LLM, no new dependencies, and no backend change. All changes are additive and freeze-safe; the frozen schema (8 entity types / 18 relationship types) and public API contract are preserved.

### Added

- **Historical Meaning Layer (M5-D)**
  - Understanding rule engine (`understandingRules.ts`): pure `filter`/`map`/`transform` + fixed templates with `{actor}`/`{target}`/`{type}` substitution, covering all 18 `RELATIONSHIP_TYPES` plus a guaranteed fallback. No scoring, ranking, similarity, or recommendation logic. Exposes `buildUnderstanding`, `buildUnderstandingsFromRelationships`, `buildUnderstandingsFromConnectionsExplained`.
  - InterpretationPanel enhancement: optional `understandings?` prop appends a "Historical Meaning" block (meaning + perspective tag) after the existing M5-A interpretation list. When absent/empty, behavior is 100% unchanged. No `navigation.ts` import.
  - EntityPage wiring: derives understandings from `entity.relationships` and passes them to InterpretationPanel.
  - Topic view wiring: derives understandings from `result.connections_explained` + a local `global_id→name` map; no new API endpoint, no backend contract change.

### Changed

- **Frontend**
  - `App.tsx`: additive `understandings` prop on the Topic-view InterpretationPanel, sourced from already-fetched `connections_explained` / `entities`.
  - `App.css`: appended `.he-meaning*` rules reusing existing `--he-*` design tokens; no existing class modified.

### Freeze Compliance

- No backend / `exploration_engine.py` / `validation.py` / `navigation.ts` / Knowledge Model change.
- No AI / LLM / Provider / Recommendation / score / similarity introduced.
- No new dependency (`package.json` / `requirements.txt` unchanged; only `version` / `APP_VERSION` bumped).
- Frontend tests: `127 passed` (22 files); backend: `115 passed`; `vite build` 0 errors; `tsc --noEmit` 0 errors.

---

## [0.5.0] - 2026-07-19

Cross-Topic Comparative Synthesis milestone (**M5-C**). Lets a user compare the current topic against the topics it connects to and jump straight into the bridging entities — using the already-present `cross_topic_related` data, with no ranking, scoring, or AI. All changes are additive and freeze-safe; the frozen schema (8 entity types / 18 relationship types) and public API contract are preserved.

### Added

- **Cross-Topic Comparative Synthesis (M5-C)**
  - Topic Comparison Panel (`TopicComparisonPanel.tsx`): on a Topic view (after *Continue Exploring*), presents the de-duplicated list of comparison-target topics from `cross_topic_related`, and — once a target is selected — the bridge entities that belong to it. Clicking a bridge node routes through the existing `openEntity` → `navigateTo`; clicking a target chip routes through `navigateTo`. Empty `cross_topic_related` renders a graceful empty state. No re-sort, no recommender, no score — engine/backend order preserved verbatim.
  - Comparison helper (`comparison.ts`): three pure filter/map/transform functions — `pickComparisonTargets` (de-dup preserving order), `deriveBridgedEntities` (filter by target topic), `extractTopicFromGlobalId` (parse the `namespace:id` global id). No scoring, ranking, similarity, or recommendation logic.

### Changed

- **Frontend**
  - `App.tsx`: additive mount of `TopicComparisonPanel` in the Topic view block (after `ContinueExploringPanel`); `key={result?.topic ?? current.topic}` forces a clean `selected` reset on topic switch (Phase 4.6 Freeze Hygiene).
  - `App.css`: appended `.he-comparison*` rules reusing existing `--he-*` design tokens; no existing class modified.

### Freeze Compliance

- No backend / `exploration_engine.py` / `navigation.ts` / Knowledge Model change.
- No AI / LLM / Provider / Recommendation / score / similarity introduced.
- No new dependency (`package.json` / `requirements.txt` unchanged; only `version` / `APP_VERSION` bumped).
- Frontend tests: `116 passed` (21 files); backend: `115 passed`; `vite build` 0 errors; `tsc --noEmit` 0 errors.

---

## [0.4.0] - 2026-07-19

Continuous Discovery milestone (**M5-B**). Turns a single exploration session into a continuous, self-directed journey. All changes are additive and freeze-safe; the frozen schema (8 entity types / 18 relationship types) and public API contract are preserved.

### Added

- **Continuous Discovery (M5-B)**
  - Continue Exploring panel (`ContinueExploringPanel.tsx`): re-presents the engine's already-ranked `connections_explained` as top-N next-step actions after a Topic/Entity view. Already-visited nodes are softened via the local `recent` store (no re-sort, no recommender, no score — engine order preserved verbatim).
  - Exploration Trail (`ExplorationTrail.tsx`): renders the full exploration footprint from `history`/`cursor`; clicking a past step reuses the existing `goTo` to jump back and continue. Uses a local `TrailNode` type (no `navigation.ts` import).
  - Dead-end fallback (B-3): when direct connections are sparse, the panel falls back to `cross_topic_related` / `related_topics` so discovery never dead-ends.

### Changed

- **Frontend**
  - `App.tsx`: additive mount of `ContinueExploringPanel` (topic + entity views) and `ExplorationTrail` (after `HistoryBar`); `seenGlobalIds` derived from `recentStore` for seen-aware softening.
  - `App.css`: appended `.he-continue*` / `.he-trail*` rules reusing existing `--he-*` design tokens; no existing class modified.

### Freeze Compliance

- No backend / `exploration_engine.py` / `navigation.ts` / Knowledge Model change.
- No AI / LLM / Provider / Recommendation / score introduced.
- No new dependency (`package.json` / `requirements.txt` unchanged).
- Frontend tests: `107 passed` (19 files); backend: `115 passed`; `vite build` 0 errors; `tsc --noEmit` 0 errors.

---

## [0.3.0] - 2026-07-18

Discovery & Onboarding milestone (**M5-A**). The entry journey a first-time user takes from landing to a connected, interpretable exploration session. All changes are additive and freeze-safe.

### Added

- **A-1 Topic Catalog API** — `GET /topics` returning `{topic,title,summary}`, mounted under both `/api/v1` and the legacy route (`v1 == legacy`).
- **A-2 Landing Catalog** — curated landing page topic grid with loading/empty/error states, single navigation path.
- **A-3 Featured Topics** — editorial "Start here" strip (4 real topic slugs) derived as a filtered view of the catalog.
- **A-4 First Exploration Guide** — presentational nudge on the topic page with 3 real, grounded starters; session-only dismissible.
- **A-5 Entity Exploration Guide** — entity-level exploration starters in a frozen-safe dedicated component.
- **A-6 Interpretation Layer** — rule-based "why these connections are worth exploring" panel rendering the backend's verbatim `explanation`; ordered after Connections Explained (WHAT → WHY → HOW). The old "future AI layer" placeholder was deleted.

### Freeze Compliance

- No change to `exploration_engine.py`, `navigation.ts`, Knowledge Model, or backend core.
- No AI / LLM / Provider / Prompt introduced.
- No new dependency (`package.json` / `requirements.txt` unchanged).
- Frontend tests: `97 passed` (17 files); backend: `115 passed`; `vite build` 0 errors.

---

## [0.2.0] - 2026-07-18

First formal changelog entry. Cumulative changes for milestones **M1 → M4** since `v0.1.0`. All changes are additive or non-breaking; the frozen schema (8 entity types / 18 relationship types) and public API contract are preserved.

### Added

- **Core Platform / Knowledge Layer**
  - Knowledge Core Foundation (M3-001): new `core/` package with `Repository`, `Registry`, `Graph`, `Search`, `Timeline`, `Exploration`, and the `KnowledgeService` facade; centralized composition root in `main.py`. Replaces ad-hoc data access with a single swappable repository seam (Neo4j-ready).
  - GlobalGraph (M3.5-001): unified cross-topic graph built on top of per-topic graphs plus the global registry, enabling cross-topic neighbor discovery and path finding without changing the public API or frontend.
  - Exploration Engine (M3.5-002): deterministic, explainable scoring that ranks related entities across four weighted dimensions — relationship meaning (0.35), temporal coherence (0.25), entity importance (0.20), path simplicity (0.20). No AI, no GIS, no Neo4j, no recommendation system.
  - Knowledge Model v2 (M2): generic entity model and relationship triples over an extensible vocabulary of 8 entity types / 18 relationship types.
  - Interconnected datasets (M3-003): cross-topic edges linking entities across topics via `namespace:id` global ids; validated with zero dangling references.
  - Clickable-entity exploration loop (M1): related entities are clickable and trigger a new exploration, closing the Explore → Connect → Discover cycle.

- **Search**
  - Unified Search v2 (M4-004): rewritten backend search provider (`core/search.py`) and frontend results surface (`SearchResults.tsx`) on a provider-agnostic, structured search architecture; covered by a new `test_search_v2` suite.

- **Cross Topic**
  - Cross-topic API projections (M4-002): additive `related_topics` (topic-level and entity-level) and `exploration.cross_topic_related` fields on `GET /explore` and `GET /entity`. No new endpoints, no contract break (`v1 == legacy`).
  - Cross-topic UI (M4-003): `CrossTopicTopicList` ("Connected Topics") and `CrossTopicConnectionsPanel` (clickable cross-topic neighbor chips) on the Explore and Entity pages, backed by a new pure helper module `crossTopic.ts`.

- **Frontend**
  - Five-zone exploration interface (M3.5-004): Related / Explained / Paths / Timeline / Themes zones rendering real cross-topic data.
  - In-app navigation model (M2/M3): history stack (`navigation.ts`) with breadcrumb and back/forward, driving both the Explore and Entity views.

### Changed

- **Core Platform / API**
  - API routing now serves canonical `/api/v1` endpoints alongside frozen legacy routes (M3-002).
  - Configuration externalized via `config.py` (`CORS_ORIGINS`, `DATA_DIR`, `APP_VERSION`) read from environment variables (M3-002).
  - Logging switched from `print` to the structured `logging` module (M3-002).
  - Topic id hardening (M1): the `topic` path parameter is validated with `^[a-z0-9_-]+$` before file access.

### Improved

- **Data & Quality**
  - Data scale & quality (M4-001): added 4 topics (`persian_empire`, `greek_philosophy`, `early_christianity`, `ancient_india`); the repository now holds **8 topics / 69 entities / 104 relationships / 15 timelines / 31 cross-topic edges**; data validation reports **0 warnings / 0 errors** (healthy).
  - Runtime health surface (M2-005): `GET /health` reports the full validation summary (topics / entities / relationships / timeline + warnings / errors).
  - Separate `GET /healthz` liveness probe (M3-002).

- **Frontend**
  - Hero copy aligned to the non-AI positioning ("A data-driven global history exploration platform") (M2-006).

### Refactored

- **Backend cleanup (M4-005)**
  - Removed the API-layer compatibility shim (`_ENTITY_INDEX` / `_get_entity_index` / `_load_topic_data`) from `main.py`; routing now uses the `KnowledgeService` path directly.
  - Renamed the `AIGuidePanel` placeholder component to `InterpretationPanel` to match the non-AI product positioning; removed the dead placeholder component.
  - Added single-responsibility annotations to `RelationshipView` and `RelatedEntityList`.

### Documentation

- Team Operating Specification v1.2 (frozen).
- History Explorer Documentation Standard v1.0.
- Architecture & report docs: M3-001 / M3-002 / M3-003, M3.5-000 / 001 / 002 / 003 / 004, M4-001 Data Scale & Quality Report, M4-002 Completion Report, M4-003 Architecture.
- Schema Freeze Review (M3.5-000) locking 8 entity types / 18 relationship types as the immutable vocabulary.

### QA

- M4-006 full QA cycle (Planning → Backend → Integration → Frontend → Regression → Final Sign-off): all phases **PASS**; backend **112** / frontend **61** tests passing; production build **0 errors**; TypeScript **0 type errors**; no architectural drift; schema freeze intact.
- Minimum API-contract test layer (M1): `TestClient` contract tests plus frontend smoke tests prevent accidental contract regressions.
- Test baselines grew across milestones (M2: 50 backend / 38 frontend → M4: 112 backend / 61 frontend).
