// ============================================================
// M73 Phase1 — usePackageContext
// Exploration Package lifecycle + URL hash ownership, extracted
// from App.tsx (architecture hardening).
//
// Scope (PO-approved):
//   - state:  packageSlug
//   - ops:    openPackage / closePackage
//   - URL:    "#/package/:slug" hash parsing + hashchange listener
//             (initial restore + manual URL edits stay in sync)
//
// Telemetry: open_package recording is INJECTED via deps.onOpenPackage
// (callback) — the hook never imports recordEvent / metrics directly.
// Keeps behavior identical to M69-M72 (open_package on entry only;
// hash restore does NOT re-emit, avoiding duplicate counting).
// ============================================================

import { useCallback, useEffect, useState } from 'react'

export interface PackageContextDeps {
  /** Fired only on a user-initiated openPackage (not on URL restore).
   *  App wires recordEvent({ action: 'open_package', packageSlug }). */
  onOpenPackage?: (slug: string) => void
}

export interface PackageContextApi {
  packageSlug: string | null
  openPackage: (slug: string) => void
  closePackage: () => void
}

const PACKAGE_HASH_PREFIX = '#/package/'

function hashToSlug(hash: string): string | null {
  if (!hash.startsWith(PACKAGE_HASH_PREFIX)) return null
  const raw = hash.slice(PACKAGE_HASH_PREFIX.length)
  if (!raw) return null
  try {
    return decodeURIComponent(raw)
  } catch {
    return raw
  }
}

export function usePackageContext(deps: PackageContextDeps = {}): PackageContextApi {
  const [packageSlug, setPackageSlug] = useState<string | null>(() =>
    typeof window === 'undefined' ? null : hashToSlug(window.location.hash),
  )

  // Keep packageSlug in sync with manual URL edits / back-forward hash changes.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const onHashChange = () => setPackageSlug(hashToSlug(window.location.hash))
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  /** User-initiated open: set state, write hash, emit telemetry (once). */
  const openPackage = useCallback(
    (slug: string) => {
      setPackageSlug(slug)
      if (typeof window !== 'undefined') {
        window.location.hash = `${PACKAGE_HASH_PREFIX}${encodeURIComponent(slug)}`
      }
      deps.onOpenPackage?.(slug)
    },
    [deps],
  )

  /** Exit the package context: clear state + hash (Home / back-to-discover). */
  const closePackage = useCallback(() => {
    setPackageSlug(null)
    if (
      typeof window !== 'undefined' &&
      window.location.hash.startsWith(PACKAGE_HASH_PREFIX)
    ) {
      window.location.hash = ''
    }
  }, [])

  return { packageSlug, openPackage, closePackage }
}
