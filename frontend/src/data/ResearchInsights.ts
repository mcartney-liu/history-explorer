// ============================================================
// M41 ResearchInsights — Deterministic Analytics Layer
// Analyzes ResearchHistory to produce user interest signals.
// Zero AI. Zero LLM. Zero backend.
// ============================================================

import type { SavedResearch } from './ResearchHistory'

// -----------------------------------------------------------
// Types
// -----------------------------------------------------------

export interface ResearchInsight {
  researchCount: number
  favoriteEntityTypes: string[]
  favoriteDimensions: string[]
  exploredRelationships: string[]
  frequentThemes: string[]
}

// -----------------------------------------------------------
// Rule implementations
// -----------------------------------------------------------

function topByFreq<T>(items: T[], limit = 5): T[] {
  const freq = new Map<string, T>()
  const counts = new Map<string, number>()
  for (const item of items) {
    const key = String(item)
    freq.set(key, item)
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([k]) => freq.get(k)!)
}

function favoriteEntityTypes(researches: SavedResearch[]): string[] {
  return topByFreq(researches.map((r) => r.entityType))
}

function favoriteDimensions(researches: SavedResearch[]): string[] {
  const allDims = researches.flatMap((r) =>
    r.dimensions.map((d) => d.title),
  )
  return topByFreq(allDims)
}

function exploredRelationships(researches: SavedResearch[]): string[] {
  // From comparedNames and entity types, infer relationship interest.
  // No relationshipType stored directly in SavedResearch.
  const relationalTypes = new Set<string>()

  for (const r of researches) {
    if (r.comparedNames.length > 0) {
      relationalTypes.add('comparison')
    }
    // Infer from entity type patterns
    if (r.entityType === 'Event') {
      relationalTypes.add('causal')
      relationalTypes.add('temporal')
    }
  }

  return [...relationalTypes]
}

function frequentThemes(researches: SavedResearch[]): string[] {
  // Deterministic: map entity types to themes, no AI.
  const typeToTheme: Record<string, string> = {
    Civilization: '古代文明',
    Event: '历史事件',
    Person: '历史人物',
    Religion: '宗教发展',
    Technology: '技术演进',
    Location: '地理探索',
    Idea: '思想传播',
  }

  const themes = new Set<string>()
  for (const r of researches) {
    const theme = typeToTheme[r.entityType]
    if (theme) themes.add(theme)
  }
  return [...themes]
}

// -----------------------------------------------------------
// Public API
// -----------------------------------------------------------

export function generateResearchInsights(
  researches: SavedResearch[],
): ResearchInsight {
  if (researches.length === 0) {
    return {
      researchCount: 0,
      favoriteEntityTypes: [],
      favoriteDimensions: [],
      exploredRelationships: [],
      frequentThemes: [],
    }
  }

  return {
    researchCount: researches.length,
    favoriteEntityTypes: favoriteEntityTypes(researches),
    favoriteDimensions: favoriteDimensions(researches),
    exploredRelationships: exploredRelationships(researches),
    frequentThemes: frequentThemes(researches),
  }
}

/** Human-readable insight summary for display. */
export function insightSummary(insight: ResearchInsight): string | null {
  if (insight.researchCount === 0) return null

  const parts: string[] = []

  if (insight.favoriteEntityTypes.length > 0) {
    parts.push(insight.favoriteEntityTypes.slice(0, 2).join('、'))
  }

  if (insight.favoriteDimensions.length > 0) {
    parts.push(insight.favoriteDimensions.slice(0, 2).join('与'))
  }

  if (parts.length === 0) return null

  return `您经常探索 ${parts.join(' ')}${
    insight.frequentThemes.length > 0 ? `（${insight.frequentThemes.slice(0, 2).join('、')}）` : ''
  } 主题`
}

// ============================================================
// M42 Phase 2 — UserInterestProfile
// Structured user exploration behavior signals.
// Zero AI. Zero backend. Deterministic from ResearchHistory.
// ============================================================

export interface UserInterestProfile {
  topEntityTypes: { type: string; count: number }[]
  topDimensions: { dimension: string; count: number }[]
  topThemes: string[]
  recentlyExplored: string[]
  comparisonPairs: { entities: string[] }[]
  activeExplorationDays: number
  bookmarkCategories: string[]
}

const TYPE_TO_THEME: Record<string, string> = {
  Civilization: '古代文明',
  Event: '历史事件',
  Person: '历史人物',
  Religion: '宗教发展',
  Technology: '技术演进',
  Location: '地理探索',
  Idea: '思想传播',
}

function safeResearches(researches: SavedResearch[]): SavedResearch[] {
  return researches.filter(
    (r) =>
      r &&
      typeof r.entityType === 'string' &&
      Array.isArray(r.dimensions) &&
      typeof r.createdAt === 'string',
  )
}

function topEntityTypes(researches: SavedResearch[]): { type: string; count: number }[] {
  const map = new Map<string, number>()
  for (const r of researches) {
    map.set(r.entityType, (map.get(r.entityType) ?? 0) + 1)
  }
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([type, count]) => ({ type, count }))
}

function topDimensions(researches: SavedResearch[]): { dimension: string; count: number }[] {
  const map = new Map<string, number>()
  for (const r of researches) {
    for (const d of r.dimensions) {
      if (d.title) map.set(d.title, (map.get(d.title) ?? 0) + 1)
    }
  }
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([dimension, count]) => ({ dimension, count }))
}

function topThemes(researches: SavedResearch[]): string[] {
  const set = new Set<string>()
  for (const r of researches) {
    const theme = TYPE_TO_THEME[r.entityType]
    if (theme) set.add(theme)
  }
  return [...set]
}

function recentlyExplored(
  researches: SavedResearch[],
  limit = 10,
): string[] {
  return [...researches]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit)
    .map((r) => r.entityGlobalId ?? r.id)
}

function comparisonPairs(researches: SavedResearch[]): { entities: string[] }[] {
  const pairs = researches
    .filter((r) => r.comparedNames && r.comparedNames.length > 0)
    .map((r) => ({
      entities: [r.entityName, ...(r.comparedNames ?? [])],
    }))
  // Deduplicate by sorted join
  const seen = new Set<string>()
  return pairs.filter((p) => {
    const key = [...p.entities].sort().join('|')
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function activeDays(researches: SavedResearch[]): number {
  if (researches.length < 2) return 0
  const times = researches.map((r) => new Date(r.createdAt).getTime())
  const min = Math.min(...times)
  const max = Math.max(...times)
  return Math.max(1, Math.ceil((max - min) / (1000 * 60 * 60 * 24)))
}

function bookmarkCategories(researches: SavedResearch[]): string[] {
  const set = new Set<string>()
  for (const r of researches) {
    for (const label of r.labels ?? []) {
      if (label) set.add(label)
    }
  }
  return [...set]
}

// -----------------------------------------------------------
// Public
// -----------------------------------------------------------

export function generateUserInterestProfile(
  researches: SavedResearch[],
): UserInterestProfile {
  const safe = safeResearches(researches)
  if (safe.length === 0) {
    return {
      topEntityTypes: [],
      topDimensions: [],
      topThemes: [],
      recentlyExplored: [],
      comparisonPairs: [],
      activeExplorationDays: 0,
      bookmarkCategories: [],
    }
  }

  return {
    topEntityTypes: topEntityTypes(safe),
    topDimensions: topDimensions(safe),
    topThemes: topThemes(safe),
    recentlyExplored: recentlyExplored(safe),
    comparisonPairs: comparisonPairs(safe),
    activeExplorationDays: activeDays(safe),
    bookmarkCategories: bookmarkCategories(safe),
  }
}
