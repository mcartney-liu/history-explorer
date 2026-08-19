// P1-② (Engineering Health, 2026-08-14): navigation / package adapter
// functions relocated out of App.tsx. In App these were thin wrappers over the
// `nav` (useNavigationHistory) and `pkg` (usePackageContext) hooks plus a few
// App-level setters; the actual navigation state-machine / hash / telemetry
// logic lives in those hooks.
//
// PURE RELOCATION — every function body below is byte-for-byte identical to
// App.tsx (447–571). Only the location moved; App passes the same `nav` /
// `pkg` / setters it previously closed over, so call sites in App are
// unchanged. No behavior, deps, or types altered.

import type { Dispatch, SetStateAction } from 'react'
import { recordVisit } from '../data/ExplorerPath'
import { saveRecent } from '../components/recentStore'
import type { NavNode } from '../components/navigation'
import { setPackageOrigin } from '../components/package/packageOrigin'
import { setOriginEntity } from './originEntity'
import type { NavigationApi } from '../hooks/useNavigationHistory'
import type { PackageContextApi } from '../hooks/usePackageContext'
import type {
  Anchor,
  CreateContextInput,
  ExplorerRuntimeContextValue,
  UpdateAnchorInput,
} from '../next/ExplorerRuntimeContext'

export interface UseExplorationNavigationInput {
  nav: NavigationApi
  pkg: PackageContextApi
  runtimeContext: ExplorerRuntimeContextValue
  createContext: (input: CreateContextInput) => void
  updateAnchor: (input: UpdateAnchorInput) => void
  setEntityInitialTab: Dispatch<SetStateAction<'info' | 'research' | 'ai'>>
  prettifyTopic: (t: string) => string
  /** M90.3 Stage A — push the canonical experience route so the unified
   *  Router (single URL truth source) sees the topic. Without this, the old
   *  state machine updates `current` but router.route stays null and the
   *  QuestionHeader / ModeBar (gated on router.route.topic) never render. */
  routerNavigate: (state: { topic: string; mode: string; focus?: string }) => void
}

export function useExplorationNavigation(input: UseExplorationNavigationInput): {
  navigateTo: (node: NavNode) => void
  openCausalObject: (objectId: string) => void
  openEntity: (id: string, name?: string, tab?: 'info' | 'research' | 'ai') => void
  goTo: (newCursor: number) => void
  goBack: () => void
  goForward: () => void
  onCrumbClick: (index: number) => void
  handleTopicClick: (t: string) => void
  openPackage: (slug: string) => void
  closePackage: () => void
  clearRecent: () => void
} {
  const {
    nav,
    pkg,
    runtimeContext,
    createContext,
    updateAnchor,
    setEntityInitialTab,
    prettifyTopic,
    routerNavigate,
  } = input

  // Push a node onto the history and load it (hook state machine + onNavigate).
  function navigateTo(node: NavNode) {
    nav.navigateTo(node)
  }

  // M85.8 — Open a CausalObject by id
  function openCausalObject(objectId: string) {
    // 2026-08-11 (PO): 从探索包点因果对象同样先退出包上下文
    //（causalDetail 渲染条件也带 !packageSlug）。
    if (pkg.packageSlug) closePackage()
    // M85.9.3 — Record visit on current exploration path
    recordVisit(objectId)
    navigateTo({ type: 'causal_object', objectId })
  }

  // Open an entity by id (with a display name for the breadcrumb).
  // M86.1 Batch 2 — Navigation Context Layer：每次跳转构造 Anchor 对象并更新。
  // EP-007: Anchor 存的是理解锚点（用户概念），不是 Entity 数据副本。
  // activeRelation 来源 = Causal Layer 已有关系数据（EP-009）。
  // cognitive_stage 不由 Navigation 写入——由 Understanding Layer 判定（M86.1.2）。
  function openEntity(
    id: string,
    name?: string,
    // T1: which EntityPage tab to land on (research bookmarks open 'research').
    tab: 'info' | 'research' | 'ai' = 'info',
  ) {
    // 2026-08-11 (PO): 从探索包/因果对象页点实体——先退出包上下文。
    // entityDetail 渲染条件带 !packageSlug，不关则实体页被挡住跳不过去。
    // 探索剧本化 ③：在 closePackage() 清掉 packageSlug 之前，把来源包 slug
    // 暂存一瞬（keyed 到实体 id），供实体页连接卡回答"这一站跟包有啥关系"。
    // 红线照常执行，不推翻。
    const originSlug = pkg.packageSlug
    // 入口桥 (2026-08-15, PO)：跳转前把来源实体暂存（keyed 到目标实体），
    // 实体页「入口桥」承接块据此显示"A ↔ B 的真实关系边"或降级来源。
    // 仅当来源节点携带实体 id（entity / causal_object）时捕获，避免 topic
    // 等非实体来源产生伪桥；每次跳转覆盖 → 同一目标从不同来源进入时
    // 桥随入口变化。
    const cur = nav.current
    const originGid =
      cur?.type === 'entity' ? cur.id : cur?.type === 'causal_object' ? cur.objectId : null
    if (originGid) setOriginEntity(originGid, id)
    if (pkg.packageSlug) closePackage()
    if (originSlug) setPackageOrigin(originSlug, id)
    const displayName = name || id
    setEntityInitialTab(tab)
    // 只有当 Context 已创建时才更新锚点（用户在一条 Exploration 内）
    if (runtimeContext.explorationId) {
      // Batch 2: 构造 Anchor 对象（entityProvenance + selectionContext 分离）
      const anchor: Anchor = {
        entityId: id,
        entityType: guessEntityType(id, displayName),
        displayName,
        entityProvenance: { source: 'knowledge_layer' },
        selectionContext: {
          source: runtimeContext.currentAnchor ? 'knowledge_layer' : 'curator_layer',
          reason: runtimeContext.currentAnchor
            ? `Related Entity: ${runtimeContext.currentAnchor.displayName} → ${displayName}`
            : '探索包入口',
        },
      }
      // Batch 2: activeRelation 暂为 null——Causal Layer 关系数据接入在 Batch 3
      updateAnchor({ anchor, relation: null })
    }
    navigateTo({ type: 'entity', id, name: displayName })
  }

  // M86.1 Batch 2: 辅助——从 entity id/name 推断类型（暂时简化，未来从 Knowledge Layer 查询）
  function guessEntityType(_id: string, _name: string): string {
    // Batch 2 简化版：后续可从 Entity 数据中获取准确类型
    return 'concept'
  }

  function goTo(newCursor: number) {
    nav.goTo(newCursor)
  }

  function goBack() {
    nav.goBack()
  }

  function goForward() {
    nav.goForward()
  }

  // goHome lives in the hook (resets history/cursor/errorKind + persists +
  // fires onHomeExit=closePackage); view-state resets were folded into
  // onCrumbClick's Home branch via the hook's onHomeExit wiring.

  function onCrumbClick(index: number) {
    // M72 Line1 (finding C) preserved: hook's Home branch (index 0) fires
    // onHomeExit → closePackage, so breadcrumb Home exits the package context.
    nav.onCrumbClick(index)
  }

  // M5-A-2: a catalog topic click reuses the existing exploration flow.
  // Same node shape as SearchResults / CrossTopicTopicList topic clicks, so
  // there is exactly one navigation path (navigateTo) — no duplicated logic,
  // no second navigation mechanism.
  function handleTopicClick(t: string) {
    // T3: a normal topic click must also open an Explorer Runtime Context.
    // Previously only openPackage() called createContext(), so anchorChain
    // never grew for topic navigation and UnderstandingStatus (Projection)
    // progress stayed permanently hidden.
    //
    // M86.2 (P1-①/② fix): topic-click now reuses the SAME curator question +
    // goal as the package path via getPackageByTopic(seed_topic === t), so the
    // Curiosity Entry is identical no matter which entry point the user took.
    // Fallback to prettifyTopic(t) only when no curated package exists for the
    // topic — never leaves userQuestion empty, never leaves goal empty-by-design.
    createContext({
      explorationId: `exp-${t}-${Date.now()}`,
      userQuestion: prettifyTopic(t),
      understandingGoal: '',
    })
    // Mirrors openPackage(): dynamic import avoids a circular dependency and
    // fills the Context with the curator-authored question/goal when available.
    import('../data/explorationPackages').then(({ getPackageByTopic }) => {
      const pkgData = getPackageByTopic(t)
      if (pkgData) {
        // M86.2 (P1-① true-question fix): userQuestion prefers the curator's
        // `question.zh` (a real "why" interrogative, satisfying C1 / EO-001),
        // falling back to title.zh, then prettifyTopic(t). seed_topic is a topic
        // *pointer* (slug), never used as the question text. Goal reuses
        // exploration_goals.zh so the Understanding Loop closure is visible on
        // the topic path too (P1-②).
        createContext({
          explorationId: `exp-${t}-${Date.now()}`,
          userQuestion: pkgData.question?.zh || pkgData.title?.zh || prettifyTopic(t),
          understandingGoal: pkgData.exploration_goals?.zh || pkgData.summary?.zh || '',
        })
      }
    })
    navigateTo({ type: 'topic', topic: t, title: prettifyTopic(t) })
    // M90.3 Stage A — keep the unified Router in sync. The old state machine
    // updates `current`, but QuestionHeader / ModeBar are gated on
    // router.route.topic. Push the canonical explore URL so they render.
    routerNavigate({ topic: t, mode: 'exploration', focus: t })
  }

  // M69 — Open an Exploration Package page (overlays Discover/home).
  // M73 Phase1 — lifecycle + #/package/ hash + open_package telemetry now live
  // in usePackageContext (telemetry injected via onOpenPackage callback).
  // M86.1 — 用户选择探索包时创建 Explorer Runtime Context（Curiosity Entry）
  function openPackage(slug: string) {
    pkg.openPackage(slug)
    // EP-009: user_question 和 understanding_goal 来自 Curator 预写数据。
    // 动态 import 避免循环依赖——getPackageBySlug 仅在 openPackage 时调用。
    import('../data/explorationPackages').then(({ getPackageBySlug }) => {
      const pkgData = getPackageBySlug(slug)
      if (pkgData) {
        // EP-009: user_question / understanding_goal come from curator-authored
        // data. userQuestion prefers question.zh (real "why" interrogative, C1 /
        // EO-001), falling back to title.zh. seed_topic is a topic *pointer*
        // (slug), never the question text. Consistent with handleTopicClick.
        createContext({
          explorationId: `exp-${slug}-${Date.now()}`,
          userQuestion: pkgData.question?.zh || pkgData.title?.zh || slug,
          understandingGoal: pkgData.exploration_goals?.zh || pkgData.summary?.zh || '',
        })
      }
    })
  }

  function closePackage() {
    pkg.closePackage()
  }

  function clearRecent() {
    nav.setRecent([])
    saveRecent([])
  }

  return {
    navigateTo,
    openCausalObject,
    openEntity,
    goTo,
    goBack,
    goForward,
    onCrumbClick,
    handleTopicClick,
    openPackage,
    closePackage,
    clearRecent,
  }
}
