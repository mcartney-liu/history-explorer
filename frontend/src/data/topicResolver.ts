// ============================================================
// M74 Phase1 + Wave2-#137 — deterministic Topic / Entry Resolution
// Maps free-text queries (Chinese questions / aliases / names /
// descriptions) to graph targets: an official Exploration Package,
// an entity, or a soft topic — ranked by lexical/semantic relevance.
//
// Design (Wave2-#137 upgrade over M74 Phase1):
//   normalize
//   -> ① QUICK_STARTS explicit mapping (question -> package)
//   -> ② QUESTION_TOPIC_ALIASES (question -> soft topic, understanding mode)
//   -> ③ entity exact (name/alias/label)
//   -> ④ package title exact / contains
//   -> ⑤ SEMANTIC fallback: weighted token-score over an enriched index
//        (package title/summary/category/seed + referenced entity names;
//         entity name/alias/label/description/type) with CJK bigram +
//        latin-word tokenization and curated synonym expansion; returns
//        ranked top-N via searchTopics().
//
// Hard constraints (PO Conditions, M74 Phase1 Coding Approval + freeze):
//   - ZERO AI / LLM / network: pure static mapping over bundled data.
//   - READ ONLY: never writes KG / entities / claims / sources.
//   - Deterministic: same input always yields the same output.
//   - Data reuse: getPackages() + getEntityByGlobalId() only — no
//     duplicate example-JSON imports.
// ============================================================

import {
  getPackages,
  getEntityByGlobalId,
  type ExplorationPackage,
} from './explorationPackages'

/** Resolution outcome: an official package, an entity, or no match. */
export type ResolvedTopic =
  | { kind: 'package'; slug: string }
  | { kind: 'entity'; globalId: string }
  | null

/** Intent inferred from the query phrasing (drives Understanding Mode). */
export type EntryIntent = 'understanding' | 'browse'

/** A ranked retrieval candidate returned by searchTopics(). */
export type SearchCandidate = {
  kind: 'package' | 'entity'
  slug?: string
  globalId?: string
  label: string
  score: number
  /** Best-matching field, for UI hinting (e.g. "title" | "description"). */
  reason: string
}

/** Full entry resolution used by the landing/entry wiring. */
export type EntryResolution = {
  resolution: ResolvedTopic | { kind: 'topic'; slug: string } | null
  intent: EntryIntent
}

// LandingPage QUICK_STARTS (frontend/src/components/LandingPage.tsx) —
// explicit question -> package mapping. Keys are NORMALIZED forms.
const QUICK_START_ALIASES: Record<string, string> = {
  '凯撒为什么重要': 'roman-empire-exploration',
  '秦始皇统一六国以后发生了什么': 'china-civilization-v1',
  '罗马为什么灭亡': 'roman-empire-exploration',
  '丝绸之路改变了什么': 'silk-road-exploration',
}

// Soft topic routing for questions whose target is not a frozen entity/
// package but is a supported Understanding-Mode narrative (M89). Keys are
// NORMALIZED forms. Folded in from App.tsx's prior hardcoded special-case.
const QUESTION_TOPIC_ALIASES: Record<string, string> = {
  '法国大革命为什么发生': 'french-revolution',
}

// Curated Chinese/English synonym expansion: query tokens matching a key are
// expanded with the listed surface forms so abbreviations resolve. Keys are
// normalized tokens (single char or bigram). Zero external dependency.
// Scoped to the 5 shipped Exploration Packages + their referenced entities
// (persian/greek/egypt/early_christianity have datasets + evidence but NO
// package yet, so they are intentionally out of entry scope — see summary).
const SYNONYMS: Record<string, string[]> = {
  '罗马': ['罗马帝国', '罗马共和国'],
  '丝路': ['丝绸之路'],
  '唐': ['唐朝', '大唐'],
  '宋': ['宋朝'],
  '元': ['元朝'],
  '明': ['明朝'],
  '清': ['清朝'],
  '印度': ['古印度', '印度文明'],
  '凯撒': ['尤利乌斯凯撒'],
}

// Question framing words stripped before scoring (kept for intent detection).
const QUESTION_WORDS = [
  '为什么', '为何', '怎么', '如何', '怎样', '是什么', '是谁', '介绍一下',
  '介绍', '了解', '研究', '我想知道', '我想', '请问', '讲讲', '说说',
  'tellmeabout', 'whois', 'whatis', 'who', 'what', 'why', 'how', 'when',
  'where', 'introduction', 'overview', 'about', 'explain',
]

// Minimum score for the semantic fallback to count as a real match.
const SEMANTIC_THRESHOLD = 1.5

// Field weights for the weighted token-score (higher = stronger signal).
const FIELD_WEIGHTS: Record<string, number> = {
  title: 6,
  summary: 2,
  category: 3,
  seed: 2,
  entities: 1.5,
  name: 6,
  description: 1,
  type: 1,
}

/**
 * Normalize a free-text query: trim, strip full/half-width punctuation,
 * whitespace and quotes, lowercase. Underscores are KEPT (slug chars).
 * Deterministic, no side effects.
 */
export function normalizeQuery(raw: string): string {
  return raw
    .trim()
    .replace(/[？?。，、！!·:：;；'"“”‘’\s\-—]/g, '')
    .toLowerCase()
}

// ------------------------------------------------------------------
// Tokenizer: CJK runs -> unigrams + bigrams; latin/number runs -> words.
// No external segmenter (zero-dep, deterministic). Good enough for
// lexical/semantic matching across the bundled datasets.
// ------------------------------------------------------------------

function tokenize(text: string): string[] {
  const out: string[] = []
  const lower = text.toLowerCase()
  const latin = lower.match(/[a-z0-9_]+/g)
  if (latin) out.push(...latin)
  const cjk = lower.match(/[一-鿿]+/g)
  if (cjk) {
    for (const run of cjk) {
      // Single-char runs -> one unigram (so "秦" still matches). Multi-char
      // runs -> bigrams only, to avoid single-char noise (手/新/机) matching
      // unrelated descriptions.
      if (run.length === 1) {
        out.push(run[0])
        continue
      }
      for (let i = 0; i < run.length - 1; i++) {
        out.push(run[i] + run[i + 1])
      }
    }
  }
  return out
}

function expandSynonyms(tokens: string[]): Set<string> {
  const set = new Set(tokens)
  for (const t of tokens) {
    const syn = SYNONYMS[t]
    if (syn) for (const s of syn) for (const st of tokenize(s)) set.add(st)
  }
  return set
}

function stripQuestionWords(norm: string): string {
  let s = norm
  for (const w of QUESTION_WORDS) s = s.split(w).join('')
  return s
}

// ------------------------------------------------------------------
// Search indexes (built lazily, module-level memo).
// ------------------------------------------------------------------

type SearchFieldMap = Record<string, Set<string>>

type PkgSearchEntry = {
  slug: string
  label: string
  rawTitleZh: string
  fields: SearchFieldMap
}

type EntitySearchEntry = {
  globalId: string
  label: string
  fields: SearchFieldMap
}

let _pkgTitleIndex: Array<{ slug: string; names: string[] }> | null = null
let _entityNameIndex: Array<{ globalId: string; names: string[] }> | null = null
let _pkgSearchIndex: PkgSearchEntry[] | null = null
let _entitySearchIndex: EntitySearchEntry[] | null = null

function pkgTitleIndex(): Array<{ slug: string; names: string[] }> {
  if (_pkgTitleIndex) return _pkgTitleIndex
  _pkgTitleIndex = getPackages().map((pkg: ExplorationPackage) => ({
    slug: pkg.slug,
    names: [pkg.title.zh, pkg.title.en].filter(Boolean).map(normalizeQuery),
  }))
  return _pkgTitleIndex
}

function entityNameIndex(): Array<{ globalId: string; names: string[] }> {
  if (_entityNameIndex) return _entityNameIndex
  const entries: Array<{ globalId: string; names: string[] }> = []
  const seen = new Set<string>()
  for (const pkg of getPackages()) {
    for (const gid of pkg.entity_references) {
      if (seen.has(gid)) continue
      seen.add(gid)
      const e = getEntityByGlobalId(gid)
      if (!e) continue
      const names = [e.name, e.labels?.zh, e.labels?.en]
        .concat(e.aliases ?? [])
        .filter(Boolean)
        .map((n) => normalizeQuery(String(n)))
      if (names.length > 0) entries.push({ globalId: gid, names })
    }
  }
  _entityNameIndex = entries
  return _entityNameIndex
}

function toFieldMap(fields: Record<string, string | string[] | undefined>): SearchFieldMap {
  const map: SearchFieldMap = {}
  for (const [k, v] of Object.entries(fields)) {
    const texts = Array.isArray(v) ? v : v ? [v] : []
    const set = new Set<string>()
    for (const t of texts) for (const tok of tokenize(String(t))) set.add(tok)
    if (set.size > 0) map[k] = set
  }
  return map
}

function pkgSearchIndex(): PkgSearchEntry[] {
  if (_pkgSearchIndex) return _pkgSearchIndex
  const entries: PkgSearchEntry[] = []
  for (const pkg of getPackages()) {
    const entityNames: string[] = []
    const seen = new Set<string>()
    for (const gid of pkg.entity_references) {
      if (seen.has(gid)) continue
      seen.add(gid)
      const e = getEntityByGlobalId(gid)
      if (!e) continue
      entityNames.push(
        ...[e.name, e.labels?.zh, e.labels?.en]
          .concat(e.aliases ?? [])
          .filter(Boolean)
          .map(String),
      )
    }
    entries.push({
      slug: pkg.slug,
      label: pkg.title.zh || pkg.title.en || pkg.slug,
      rawTitleZh: pkg.title.zh || '',
      fields: toFieldMap({
        title: [pkg.title.zh, pkg.title.en].filter(Boolean) as string[],
        summary: [pkg.summary.zh, pkg.summary.en].filter(Boolean) as string[],
        category: pkg.category ?? '',
        seed: pkg.seed_topic ?? '',
        entities: entityNames,
      }),
    })
  }
  _pkgSearchIndex = entries
  return _pkgSearchIndex
}

function entitySearchIndex(): EntitySearchEntry[] {
  if (_entitySearchIndex) return _entitySearchIndex
  const entries: EntitySearchEntry[] = []
  const seen = new Set<string>()
  for (const pkg of getPackages()) {
    for (const gid of pkg.entity_references) {
      if (seen.has(gid)) continue
      seen.add(gid)
      const e = getEntityByGlobalId(gid)
      if (!e) continue
      entries.push({
        globalId: gid,
        label: e.labels?.zh || e.name || gid,
        fields: toFieldMap({
          name: [e.name, e.labels?.zh, e.labels?.en]
            .concat(e.aliases ?? [])
            .filter(Boolean) as string[],
          description: e.description ?? '',
          type: e.type ?? '',
        }),
      })
    }
  }
  _entitySearchIndex = entries
  return _entitySearchIndex
}

// ------------------------------------------------------------------
// Scoring
// ------------------------------------------------------------------

function scoreTokens(q: Set<string>, fields: SearchFieldMap): { score: number; field: string } {
  let best = 0
  let bestField = ''
  for (const [fname, weight] of Object.entries(FIELD_WEIGHTS)) {
    const ftoks = fields[fname]
    if (!ftoks) continue
    let hit = 0
    for (const t of q) if (ftoks.has(t)) hit++
    if (hit > 0) {
      const s = weight * hit
      if (s > best) {
        best = s
        bestField = fname
      }
    }
  }
  return { score: best, field: bestField }
}

const INTENT_RE = /为什么|为何|怎么|如何|怎样|why|how|原因/

/**
 * Detect the user's intent from query phrasing. "Why / how" questions route
 * to Understanding Mode (M89); everything else is a browse navigation.
 */
export function detectIntent(query: string): EntryIntent {
  const norm = normalizeQuery(query)
  if (QUESTION_TOPIC_ALIASES[norm]) return 'understanding'
  if (INTENT_RE.test(norm)) return 'understanding'
  return 'browse'
}

/**
 * Ranked semantic entry retrieval. Returns up to `limit` candidates (packages
 * + entities) scored by weighted token overlap over the enriched index, with
 * a title-substring boost and curated synonym expansion. Deterministic.
 */
export function searchTopics(query: string, limit = 5): SearchCandidate[] {
  if (typeof query !== 'string' || !query.trim()) return []
  const norm = normalizeQuery(query)
  if (!norm) return []
  const qTokens = expandSynonyms(tokenize(stripQuestionWords(norm)))
  if (qTokens.size === 0) return []

  const cands: SearchCandidate[] = []
  for (const p of pkgSearchIndex()) {
    const { score, field } = scoreTokens(qTokens, p.fields)
    if (score > 0) cands.push({ kind: 'package', slug: p.slug, label: p.label, score, reason: field })
  }
  for (const e of entitySearchIndex()) {
    const { score, field } = scoreTokens(qTokens, e.fields)
    if (score > 0) cands.push({ kind: 'entity', globalId: e.globalId, label: e.label, score, reason: field })
  }

  // Title substring boost (strong lexical signal).
  for (const c of cands) {
    if (c.kind === 'package' && c.slug) {
      const raw = pkgSearchIndex().find((p) => p.slug === c.slug)?.rawTitleZh ?? ''
      if (raw && (raw.includes(norm) || norm.includes(raw))) c.score += 50
    }
  }

  cands.sort((a, b) => b.score - a.score)
  return cands.slice(0, limit)
}

/**
 * Full entry resolution used by the landing/entry wiring. Combines explicit
 * aliases, the semantic ranking, and intent detection into one call.
 */
export function resolveEntryQuery(query: string): EntryResolution {
  const norm = normalizeQuery(query)
  if (QUESTION_TOPIC_ALIASES[norm]) {
    return { resolution: { kind: 'topic', slug: QUESTION_TOPIC_ALIASES[norm] }, intent: 'understanding' }
  }
  // QUICK_STARTS explicit mapping (question -> package), consistent with
  // resolveTopic — preserves the M74 proven routing for known questions.
  const quickSlug = QUICK_START_ALIASES[norm]
  if (quickSlug) return { resolution: { kind: 'package', slug: quickSlug }, intent: 'understanding' }
  const top = searchTopics(query, 1)[0]
  const intent = detectIntent(query)
  if (!top || top.score < SEMANTIC_THRESHOLD) return { resolution: null, intent }
  const resolution: ResolvedTopic =
    top.kind === 'package'
      ? { kind: 'package', slug: top.slug! }
      : { kind: 'entity', globalId: top.globalId! }
  return { resolution, intent }
}

/**
 * Resolve a free-text query to a package / entity / null.
 * Pure and deterministic; never throws on arbitrary input.
 *
 * Match order:
 *   ① QUICK_STARTS explicit (question -> package)
 *   ② entity exact            (specific entity -> entity)
 *   ③ package title exact     (topic-level -> package)
 *   ④ package title contains  (partial topic -> package)
 *   ⑤ SEMANTIC fallback       (weighted token-score, ranked top-1)
 */
export function resolveTopic(rawQuery: string): ResolvedTopic {
  if (typeof rawQuery !== 'string') return null
  const q = normalizeQuery(rawQuery)
  if (!q) return null

  // ① QUICK_STARTS explicit mapping (question -> package).
  const quickSlug = QUICK_START_ALIASES[q]
  if (quickSlug) return { kind: 'package', slug: quickSlug }

  // ② Package title exact match.
  for (const p of pkgTitleIndex()) {
    if (p.names.includes(q)) return { kind: 'package', slug: p.slug }
  }

  // ③ Package title contains (loose fallback for partial queries).
  for (const p of pkgTitleIndex()) {
    if (p.names.some((n) => n.includes(q))) return { kind: 'package', slug: p.slug }
  }

  // ④ Entity exact match (specific entity wins last — package is the
  //    exploration starting point, entity is the deep-dive target).
  for (const entry of entityNameIndex()) {
    if (entry.names.includes(q)) return { kind: 'entity', globalId: entry.globalId }
  }

  // ⑤ SEMANTIC fallback: best ranked candidate above threshold.
  const top = searchTopics(rawQuery, 1)[0]
  if (top && top.score >= SEMANTIC_THRESHOLD) {
    return top.kind === 'package'
      ? { kind: 'package', slug: top.slug! }
      : { kind: 'entity', globalId: top.globalId! }
  }

  return null
}
