// ============================================================
// M41 ResearchInsights — Deterministic Analytics Layer
// Analyzes ResearchHistory to produce user interest signals.
// Zero AI. Zero LLM. Zero backend.
// ============================================================

import type { SavedResearch } from './ResearchHistory'
import { getEvents, type UserBehaviorEvent as BehaviorEvent } from './UserBehaviorEvent'

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

/**
 * @deprecated for UI use — reads ResearchHistory, which is empty until the
 * user saves. The Discover surface now uses
 * {@link generateBehavioralInterestProfile}, which reads REAL behavioral
 * signals. Kept for the analytics tests and offline research analysis.
 */
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

// ============================================================
// T2 — Behavioral Interest Profile (Article 0 ②)
//
// COGNITIVE MIRROR, NOT A RECOMMENDER.
// This profile reflects the user's OWN trajectory back at them so they can
// recognise what they have been chasing. It is a read-only mirror:
//   - it MUST NOT be fed into any recommendation / ranking engine,
//   - it MUST NOT be sent to a backend or an LLM,
//   - it only restates signals the user themselves produced.
//
// Data sources are the signals that ACTUALLY exist in the app today
// (ResearchHistory is empty until the T1 save loop is used):
//   - product-usage events (UserBehaviorEvent)
//   - navigation history titles
//   - the `recent` list
//   - journey "why" reasons
//   - GrowthGraphStore node labels
// Threshold: >= 1 interaction (a single step already deserves a mirror).
// ============================================================

export interface BehavioralSignals {
  /** Defaults to getEvents() when omitted. */
  events?: BehaviorEvent[]
  /** Titles of nodes in the navigation history. */
  navTitles?: string[]
  /** Titles from the `recent` list. */
  recentTitles?: string[]
  /** "Why I followed this link" reasons captured on the journey. */
  journeyReasons?: string[]
  /** Labels of GrowthGraphStore nodes. */
  growthLabels?: string[]
  /**
   * Saved researches. Still a real behavioral signal (an explicit save is the
   * strongest interest signal there is) — it is just no longer the ONLY one,
   * which is what made this profile permanently empty before T1.
   */
  researches?: SavedResearch[]
}

export interface BehavioralInterestProfile {
  /** How many behavioral signals fed this profile. */
  interactionCount: number
  /** Subjects the user actually returned to, most frequent first. */
  topSubjects: { subject: string; count: number }[]
  /** Themes inferred from entity types the user opened. */
  topThemes: string[]
  /** How the user tends to think, inferred from action mix. */
  topDimensions: { dimension: string; count: number }[]
  /** Most recent subjects, newest first. */
  recentlyExplored: string[]
  /** Reflective one-liner — "你其实一直在追问「X」". Null when too thin. */
  reflection: string | null
}

const EMPTY_BEHAVIORAL_PROFILE: BehavioralInterestProfile = {
  interactionCount: 0,
  topSubjects: [],
  topThemes: [],
  topDimensions: [],
  recentlyExplored: [],
  reflection: null,
}

/** Action → the cognitive move it represents. Deterministic, no AI. */
const ACTION_TO_DIMENSION: Partial<Record<BehaviorEvent['action'], string>> = {
  click_relationship: '追问关系',
  co_relationship_view: '追问关系',
  co_related_object_click: '追问关系',
  cs_follow_entity: '追问因果',
  cs_card_expand: '追问因果',
  co_detail_open: '追问因果',
  co_entity_follow: '追问因果',
  start_research: '深度研究',
  complete_research: '深度研究',
  save_research: '深度研究',
  start_comparison: '横向对比',
  start_chat: '直接发问',
  view_source: '查证来源',
  cs_evidence_open: '查证来源',
  click_journey: '回看路径',
  open_package: '跟随策展',
  click_guide_next: '跟随策展',
  complete_package: '跟随策展',
}

/** Turn a slug / id into something a human recognises. */
function humanizeSubject(raw: string): string {
  const tail = raw.includes(':') ? raw.slice(raw.indexOf(':') + 1) : raw
  return tail
    .replace(/[_-]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim()
}

function rank(values: string[]): { key: string; count: number }[] {
  const map = new Map<string, number>()
  for (const v of values) {
    const k = v.trim()
    if (!k) continue
    map.set(k, (map.get(k) ?? 0) + 1)
  }
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([key, count]) => ({ key, count }))
}

/**
 * Build the Cognitive Mirror profile from real behavior.
 *
 * Pure + defensive: any missing signal source is simply skipped, and an empty
 * input yields an empty profile (never throws).
 */
export function generateBehavioralInterestProfile(
  signals: BehavioralSignals = {},
): BehavioralInterestProfile {
  let events: BehaviorEvent[]
  try {
    events = signals.events ?? getEvents()
  } catch {
    events = []
  }

  const navTitles = signals.navTitles ?? []
  const recentTitles = signals.recentTitles ?? []
  const journeyReasons = signals.journeyReasons ?? []
  const growthLabels = signals.growthLabels ?? []
  const researches = safeResearches(signals.researches ?? [])

  // ---- Subjects: what the user kept coming back to ----
  const eventSubjects = events
    .map((e) => e.entityGlobalId ?? e.packageSlug ?? e.entityType ?? '')
    .filter(Boolean)
    .map(humanizeSubject)

  const subjectSignals = [
    ...eventSubjects,
    ...navTitles.map(humanizeSubject),
    ...recentTitles.map(humanizeSubject),
    ...growthLabels.map(humanizeSubject),
    ...researches.map((r) => r.entityName).filter(Boolean),
  ].filter(Boolean)

  const interactionCount =
    events.length +
    navTitles.length +
    recentTitles.length +
    growthLabels.length +
    researches.length

  // >= 1 interaction is enough to reflect something back.
  if (interactionCount < 1) return EMPTY_BEHAVIORAL_PROFILE

  const rankedSubjects = rank(subjectSignals)
  const topSubjects = rankedSubjects
    .slice(0, 6)
    .map(({ key, count }) => ({ subject: key, count }))

  // ---- Themes: from entity types the user actually opened ----
  const themes = new Set<string>()
  for (const e of events) {
    if (!e.entityType) continue
    const theme = TYPE_TO_THEME[e.entityType]
    if (theme) themes.add(theme)
  }
  for (const r of researches) {
    const theme = TYPE_TO_THEME[r.entityType]
    if (theme) themes.add(theme)
  }

  // ---- Dimensions: how the user thinks, from their action mix ----
  const dimensionSignals = [
    ...events
      .map((e) => ACTION_TO_DIMENSION[e.action])
      .filter((d): d is string => Boolean(d)),
    ...researches.flatMap((r) => r.dimensions.map((d) => d.title).filter(Boolean)),
  ]
  const topDimensions = rank(dimensionSignals)
    .slice(0, 5)
    .map(({ key, count }) => ({ dimension: key, count }))

  // ---- Recently explored: newest first, de-duplicated ----
  const recentSeen = new Set<string>()
  const recentlyExplored: string[] = []
  for (const s of [...recentTitles.map(humanizeSubject), ...eventSubjects.slice().reverse()]) {
    if (!s || recentSeen.has(s)) continue
    recentSeen.add(s)
    recentlyExplored.push(s)
    if (recentlyExplored.length >= 8) break
  }

  // ---- Reflection: the mirror sentence ----
  let reflection: string | null = null
  const leadSubject = topSubjects[0]
  const leadDimension = topDimensions[0]
  if (leadSubject && leadSubject.count > 1) {
    reflection = `你其实一直在追问「${leadSubject.subject}」`
    if (leadDimension) reflection += `——而且你更爱${leadDimension.dimension}。`
    else reflection += '。'
  } else if (leadDimension) {
    reflection = `你最近的探索方式偏向${leadDimension.dimension}。`
  } else if (leadSubject) {
    reflection = `你最近从「${leadSubject.subject}」开始了探索。`
  } else if (journeyReasons.length > 0) {
    reflection = `你最近的追问：${journeyReasons[0]}`
  }

  return {
    interactionCount,
    topSubjects,
    topThemes: [...themes],
    topDimensions,
    recentlyExplored,
    reflection,
  }
}
