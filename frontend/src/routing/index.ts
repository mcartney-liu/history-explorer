// ============================================================
// M90.3 Stage A — routing/ index (barrel)
//
// Single import surface for the Router layer. Nothing outside
// routing/ should import from individual routing files.
// ============================================================

export { type RouteState, type ExperienceMode, MODE_REGISTRY, isExperienceMode, buildExploreUrl, EXPLORE_PREFIX } from './routeSchema'
export { parseRoute } from './parseRoute'
export { useRouter, type RouterApi } from './useRouter'
export { runLegacyRedirect } from './legacyRedirect'
