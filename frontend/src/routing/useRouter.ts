// ============================================================
// M90.3 Stage A — useRouter (single hashchange subscription)
//
// This hook is the ONE place that subscribes to window
// hashchange and the ONE place that writes window.location.hash
// as a legitimate navigation action. Per K-1.2 and the Stage A
// acceptance, no other module may read window.location.hash for
// routing, and no other module may write it except via this
// hook's navigate / replace (see scripts/ static guard).
//
// The Router emits a RouteState (params + mode), never a
// component (K-4). The App passes that state down to the Shell.
//
// K-1.3 / K-1.4: App.tsx must contain ZERO hash early-returns
// and ZERO direct window.location.hash reads. This hook is the
// single indirection that makes that verifiable.
// ============================================================

import { useCallback, useEffect, useRef, useState } from 'react'
import { type RouteState, buildExploreUrl } from './routeSchema'
import { parseRoute } from './parseRoute'

export interface RouterApi {
  /** Current parsed route, or null when on landing. */
  route: RouteState | null
  /** Push a new experience route (adds a history entry). */
  navigate: (state: RouteState) => void
  /** Replace the current history entry (used by legacy migration). */
  replace: (state: RouteState) => void
}

/**
 * Read the current hash synchronously (no subscription).
 * Used for the initial mount value only — the subscription
 * below handles all subsequent changes.
 */
function readHash(): string {
  if (typeof window === 'undefined') return ''
  return window.location.hash
}

/**
 * The single hashchange subscription hook.
 *
 * Rules (Stage A acceptance):
 *   - This file is the ONLY module allowed to call
 *     window.location.hash = …  or subscribe to hashchange.
 *   - It returns { route, navigate, replace } — no component
 *     reference, no Shell, no Layout.
 *   - navigate() uses location.hash = (push) so the browser
 *     back button works. replace() uses history.replaceState
 *     for legacy one-shot migration.
 */
export function useRouter(): RouterApi {
  const [route, setRoute] = useState<RouteState | null>(() =>
    parseRoute(readHash()),
  )

  // Guard against navigating during an in-flight state update
  // (React 18 strict mode double-mount).
  const mountedRef = useRef(false)

  useEffect(() => {
    mountedRef.current = true

    const onHashChange = () => {
      if (!mountedRef.current) return
      // M90.3: #/package/:slug is managed by usePackageContext.
      // Don't override route to null — keep current route so
      // the App doesn't lose its exploration state.
      const hash = window.location.hash
      if (hash.startsWith('#/package/')) return
      const parsed = parseRoute(hash)
      setRoute(parsed)
    }

    window.addEventListener('hashchange', onHashChange)
    return () => {
      mountedRef.current = false
      window.removeEventListener('hashchange', onHashChange)
    }
  }, [])

  const navigate = useCallback((state: RouteState) => {
    const url = buildExploreUrl(state)
    window.location.hash = url
    // The hashchange listener will pick this up and update route.
  }, [])

  const replace = useCallback((state: RouteState) => {
    const url = buildExploreUrl(state)
    // history.replaceState does NOT trigger hashchange — we
    // must also call setRoute manually.
    history.replaceState(null, '', url)
    setRoute(state)
  }, [])

  return { route, navigate, replace }
}
