// ============================================================
// M73 Phase1 — useNavigationHistory
// Navigation state machine extracted from App.tsx (architecture
// hardening: reduce responsibility coupling, NOT a big rewrite).
//
// Scope (PO-approved):
//   - state:  history / cursor / recent / errorKind
//   - ops:    navigateTo / goTo / goBack / goForward / goHome /
//             onCrumbClick
//   - persistence: savePath / saveReasons / loadPath / loadRecent
//
// Deliberately OUT of scope (stays in App via dependency injection):
//   - page business logic (Guide / entity / render)
//   - journey trace (addJourneyEntry)  → deps.onNavigate
//   - data fetching (fetchNode)        → deps.onNavigate
//   - package lifecycle (closePackage) → deps.onHomeExit (App composes
//     usePackageContext + useNavigationHistory)
//
// First version keeps the interface simple — no over-abstraction.
// ============================================================

import { useCallback, useState, type Dispatch, type SetStateAction } from 'react'
import {
  NavNode,
  pushHistory,
  canBack,
  canForward,
  backCursor,
  forwardCursor,
  crumbCursor,
} from '../components/navigation'
import { loadRecent } from '../components/recentStore'
import { loadPath, savePath, saveReasons } from '../utils/explorationPersistence'
import type { ErrorKind } from '../components/ErrorCard'

export interface NavigationDeps {
  /** Called after the cursor moves (history pushed / jumped). App performs
   *  journey trace + data fetch here — the hook stays a pure state machine. */
  onNavigate?: (node: NavNode, targetCursor: number) => void
  /** Called when leaving everything (breadcrumb Home). App composes
   *  package exit (closePackage) + view-state resets here. */
  onHomeExit?: () => void
}

export interface NavigationApi {
  history: NavNode[]
  cursor: number
  recent: NavNode[]
  current: NavNode | null
  errorKind: ErrorKind | ''
  setErrorKind: (k: ErrorKind | '') => void
  /** React setter (value or function-form both supported — App uses value
   *  for restore/clear and function-form for pushRecent in fetchNode). */
  setRecent: Dispatch<SetStateAction<NavNode[]>>
  /** Exposed for App's fetchNode to refine breadcrumb labels in place
   *  (title/name resolution from the fetched payload). */
  setHistory: (updater: (h: NavNode[]) => NavNode[]) => void
  navigateTo: (node: NavNode) => void
  goTo: (newCursor: number) => void
  goBack: () => void
  goForward: () => void
  goHome: () => void
  onCrumbClick: (index: number) => void
}

export function useNavigationHistory(deps: NavigationDeps = {}): NavigationApi {
  const [history, setHistory] = useState<NavNode[]>(() => loadPath()?.history ?? [])
  const [cursor, setCursor] = useState<number>(() => loadPath()?.cursor ?? -1)
  const [recent, setRecent] = useState<NavNode[]>(() => loadRecent())
  const [errorKind, setErrorKind] = useState<ErrorKind | ''>('')

  const current: NavNode | null =
    cursor >= 0 && cursor < history.length ? history[cursor] : null

  /** Push a node onto the history stack, persist, and let App load it. */
  const navigateTo = useCallback(
    (node: NavNode) => {
      const { history: h, cursor: c } = pushHistory(history, cursor, node)
      setHistory(h)
      setCursor(c)
      savePath(h, c)
      deps.onNavigate?.(node, c)
    },
    [history, cursor, deps],
  )

  /** Jump to an existing history position (back / forward / breadcrumb). */
  const goTo = useCallback(
    (newCursor: number) => {
      if (newCursor < 0 || newCursor >= history.length) return
      setCursor(newCursor)
      savePath(history, newCursor)
      deps.onNavigate?.(history[newCursor], newCursor)
    },
    [history, deps],
  )

  const goBack = useCallback(() => {
    if (canBack(cursor)) goTo(backCursor(cursor))
  }, [cursor, goTo])

  const goForward = useCallback(() => {
    if (canForward(cursor, history.length)) goTo(forwardCursor(cursor, history.length))
  }, [cursor, history.length, goTo])

  /** Full reset: history stack + persisted path/reasons. View-state resets
   *  (result/entityData/journeyReasons/...) are App's job via onHomeExit. */
  const goHome = useCallback(() => {
    setHistory([])
    setCursor(-1)
    setErrorKind('')
    savePath([], -1)
    saveReasons(new Map())
    deps.onHomeExit?.()
  }, [deps])

  /** Breadcrumb: index 0 = Home (exit everything), else jump to crumb.
   *  goHome() already fires deps.onHomeExit — do not call it twice here. */
  const onCrumbClick = useCallback(
    (index: number) => {
      if (index <= 0) {
        goHome()
        return
      }
      goTo(crumbCursor(index))
    },
    [goHome, goTo],
  )

  return {
    history,
    cursor,
    recent,
    current,
    errorKind,
    setErrorKind,
    setRecent,
    setHistory,
    navigateTo,
    goTo,
    goBack,
    goForward,
    goHome,
    onCrumbClick,
  }
}
