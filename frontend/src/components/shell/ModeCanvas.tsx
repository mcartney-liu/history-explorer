// ============================================================
// M90.3 Stage C-1 — ModeCanvas
//
// Renders the Canvas content based on the active RouteState
// (topic + mode + focus) and the current exploration result.
//
// This component REPLACES the 400-line topic-branch JSX block
// currently in App.tsx. It is NOT a new state owner — it
// receives all data as props from App.tsx and is purely a
// rendering switch.
//
// Stage C-2 will generalize the Understanding Mode (M89) from
// frenchRevolution hardcode to data-driven.
// Stage D will replace Panel groups with Explorer Primitives.
// ============================================================

import { type ReactNode } from 'react'

import { type ExperienceMode } from '../../routing'

// ============================================================
// Canvas region types
// ============================================================

export type CanvasRegion =
  | 'search'
  | 'nav'
  | 'loading'
  | 'error'
  | 'topic_root'
  | 'entity_detail'
  | 'causal_detail'
  | 'package_detail'
  | 'landing'
  | 'dev_catalog'

export interface CanvasContext {
  /** Which region to render. */
  region: CanvasRegion
  /** Active mode from the Router. */
  mode: ExperienceMode | null
}

// ============================================================
// Props
// ============================================================

export interface ModeCanvasProps {
  /** Active RouteState mode (null = landing / package detail). */
  mode: ExperienceMode | null

  // --- Pre-rendered children from App.tsx ---
  /** Search slot (always visible at top). */
  searchSlot: ReactNode
  /** Navigation slot (always visible at top). */
  navSlot: ReactNode

  /** Loading skeleton. */
  loadingSlot: ReactNode
  /** Error card. */
  errorSlot: ReactNode

  /** Topic root content (Exploration Mode default). */
  topicRoot: ReactNode
  /** Entity detail content. */
  entityDetail: ReactNode
  /** Causal object detail content. */
  causalDetail: ReactNode
  /** Package detail content. */
  packageDetail: ReactNode
  /** Landing page content. */
  landing: ReactNode
  /** Shared product intro (rendered above landing content on all home tabs). */
  productIntro: ReactNode

  /** Understanding Mode content (M89 workspace, generalized in C-2). */
  understandingMode: ReactNode
  /** Dev catalog (special case). */
  devCatalog: ReactNode

  /** Whether dev catalog is active. */
  isDevCatalog: boolean
  /** Whether the current route is an understanding mode route. */
  isUnderstandingRoute: boolean
  /**
   * T3: whether a package is currently open. A package deep-link can land on
   * an understanding route; without this the understanding early-return
   * swallowed `packageDetail` and the package page never rendered.
   */
  hasPackage?: boolean
}

// ============================================================
// Component
// ============================================================

export function ModeCanvas({
  mode,
  searchSlot,
  navSlot,
  loadingSlot,
  errorSlot,
  topicRoot,
  entityDetail,
  causalDetail,
  packageDetail,
  landing,
  productIntro,
  understandingMode,
  devCatalog,
  isDevCatalog,
  isUnderstandingRoute,
  hasPackage = false,
}: ModeCanvasProps) {
  // Dev catalog — bypass Shell Canvas (it's a dev tool, not exploration).
  if (isDevCatalog) {
    return <>{devCatalog}</>
  }

  // Understanding Mode — when the route explicitly targets understanding AND
  // no package is open (T3: a package page must win over the understanding
  // early-return, otherwise package deep-links render nothing).
  if (isUnderstandingRoute && mode === 'understanding' && !hasPackage) {
    return (
      <>
        {searchSlot}
        {navSlot}
        {understandingMode}
      </>
    )
  }

  // Standard Mode Canvas: search + nav + product intro + mode-specific content.
  return (
    <>
      {searchSlot}
      {navSlot}
      {loadingSlot}
      {errorSlot}
      {productIntro}
      {topicRoot}
      {entityDetail}
      {causalDetail}
      {packageDetail}
      {landing}
    </>
  )
}

/**
 * Derive the canvas region from the current NavNode type and route state.
 * Used by App.tsx to decide which children to render.
 */
export function deriveCanvasRegion(params: {
  navType: string | null
  mode: ExperienceMode | null
  isLanding: boolean
  isDevCatalog: boolean
  isUnderstandingRoute: boolean
}): CanvasContext {
  const { navType, mode, isLanding, isDevCatalog, isUnderstandingRoute } = params

  if (isDevCatalog) return { region: 'dev_catalog', mode: null }
  if (isUnderstandingRoute) return { region: 'topic_root', mode: 'understanding' }
  if (isLanding) return { region: 'landing', mode: null }

  switch (navType) {
    case 'topic':
      return { region: 'topic_root', mode: mode ?? 'exploration' }
    case 'entity':
      return { region: 'entity_detail', mode: mode ?? 'exploration' }
    case 'causal_object':
      return { region: 'causal_detail', mode: 'explanation' }
    case 'package':
      return { region: 'package_detail', mode: null }
    default:
      return { region: 'landing', mode: null }
  }
}
