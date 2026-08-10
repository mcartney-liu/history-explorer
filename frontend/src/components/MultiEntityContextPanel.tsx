import { useState } from 'react'
import AIExplanationPanel from './AIExplanationPanel'
import { useLocale } from '../data/locale'
import { multiEntityContext } from '../data/aiContext'
import type { Candidate } from '../data/candidateUtils'
import { getEntityDisplayName, getEntityLabel } from '../data/entity/entityLabels'

// M13 (Multi Entity Reasoning Foundation): the user explicitly picks N real
// entity global_ids and asks ONE grounded question across all of them, reusing
// the M12-1 single `/api/v1/ai/explain` primitive. Zero backend changes.
//
// M14 (Cross Topic Selection + Candidate UX): the candidate pool may now be
// supplied as friendly `candidates` (name/type/topic) coming from the
// EntityPickerPanel, in addition to the original bare `candidateGids`. This is a
// COMPATIBILITY-FIRST extension:
//   - candidateGids?: string[]  (retained for existing callers)
//   - candidates?: Candidate[]  (new; primary source when non-empty)
//   Resolution rule (resolveCandidates): candidates wins when non-empty;
//   otherwise fall back to candidateGids. No breaking API change.
//
// M16 (Readable multi-entity selection): bare global_ids from the fallback path
// are parsed into human-readable display names + inferred entity types, then
// grouped by type and rendered as toggle chips. The raw global_id is still sent
// to the backend unchanged; only the presentation layer is improved.
//
// Freeze constraints (M13 Correction #1 / #2, unchanged):
//   - selectedGids is COMPONENT-LOCAL state. Not lifted into App, no global
//     store / context provider, never persisted.
//   - MAX_N (the selection cap) is a UI-layer concern defined here, NOT in the
//     context builder. multiEntityContext() stays a generic N-id builder.
const MAX_SELECTABLE = 8

/** Map raw global_id prefixes to canonical entity types. */
const TYPE_PREFIXES: Array<[string, string]> = [
  ['person', 'Person'],
  ['event', 'Event'],
  ['civ', 'Civilization'],
  ['loc', 'Location'],
  ['place', 'Location'],
  ['tp', 'Time Period'],
  ['technology', 'Technology'],
  ['tech', 'Technology'],
  ['religion', 'Religion'],
  ['idea', 'Idea'],
]

/** Stable group order so the UI feels consistent across topics. */
const GROUP_ORDER = [
  'Civilization',
  'Person',
  'Event',
  'Location',
  'Time Period',
  'Technology',
  'Religion',
  'Idea',
  'Entity',
]

/**
 * Pure toggle logic extracted so the cap can be unit-tested without a DOM.
 * Returns the next selection array for a checkbox click:
 *   - clicking an already-selected gid removes it,
 *   - clicking a new gid adds it UNLESS we are already at `max`,
 *   - otherwise the selection is unchanged.
 */
export function applyToggleSelection(prev: string[], gid: string, max: number): string[] {
  if (prev.includes(gid)) return prev.filter((g) => g !== gid)
  if (prev.length >= max) return prev
  return [...prev, gid]
}

/**
 * Resolve the effective candidate pool from the two compatible inputs.
 * `candidates` (friendly) wins when non-empty; otherwise bare `candidateGids`
 * are mapped to minimal candidates (name === gid) so existing callers keep
 * working unchanged. De-duplicates by gid, preserving first-occurrence order.
 * Pure — unit-testable without a DOM.
 */
export function resolveCandidates(
  candidates?: Candidate[],
  candidateGids?: string[],
): Candidate[] {
  const source: Candidate[] =
    candidates && candidates.length > 0
      ? candidates
      : (candidateGids ?? []).map((gid) => ({ gid, name: gid }))

  const seen = new Set<string>()
  const out: Candidate[] = []
  for (const c of source) {
    if (c && c.gid && !seen.has(c.gid)) {
      seen.add(c.gid)
      out.push(c)
    }
  }
  return out
}

/** Infer an entity type from a raw global_id such as `topic:event-foo`. */
function inferTypeFromGid(gid: string): string | undefined {
  const entityPart = gid.split(':').slice(1).join(':')
  for (const [prefix, type] of TYPE_PREFIXES) {
    if (entityPart.startsWith(prefix + '-')) return type
  }
  return undefined
}

/** Convert an entity-id slug like `roman-empire-established` into display text. */
function formatEntitySlug(slug: string): string {
  return slug.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

/**
 * Parse a bare global_id into a human-readable display triple.
 * Uses known Chinese display names when available; otherwise falls back to a
 * title-cased slug. The raw gid is preserved in `topic` so advanced users can
 * still inspect it via title/tooltip if desired.
 */
function parseRawGid(gid: string): { name: string; type: string; topic: string } {
  const parts = gid.split(':')
  const topic = parts[0] || ''
  const entityPart = parts.slice(1).join(':') || gid

  const matched = TYPE_PREFIXES.find(([prefix]) => entityPart.startsWith(prefix + '-'))
  const type = matched ? matched[1] : inferTypeFromGid(gid) || 'Entity'
  const rest = matched ? entityPart.slice(matched[0].length + 1) : entityPart

  const formatted = formatEntitySlug(rest).trim()
  const name = getEntityDisplayName(formatted) || formatted || gid

  return { name, type, topic }
}

/** Normalize any candidate — friendly or raw — into display metadata. */
function displayFor(c: Candidate): { name: string; type: string; topic: string } {
  const isRaw = !c.name || c.name === c.gid
  if (isRaw) {
    return parseRawGid(c.gid)
  }
  return {
    name: getEntityDisplayName(c.name) || c.name,
    type: c.type || inferTypeFromGid(c.gid) || 'Entity',
    topic: c.topic || parseRawGid(c.gid).topic,
  }
}

type EnrichedCandidate = { candidate: Candidate; display: ReturnType<typeof displayFor> }

/** Group enriched candidates by their resolved entity type. */
function groupByType(items: EnrichedCandidate[]): Record<string, EnrichedCandidate[]> {
  const groups: Record<string, EnrichedCandidate[]> = {}
  for (const item of items) {
    const type = item.display.type || 'Entity'
    if (!groups[type]) groups[type] = []
    groups[type].push(item)
  }
  return groups
}

/** Sort group keys by the canonical GROUP_ORDER, falling back to alphabetical. */
function orderedGroupKeys(groups: Record<string, EnrichedCandidate[]>): string[] {
  return Object.keys(groups).sort((a, b) => {
    const ia = GROUP_ORDER.indexOf(a)
    const ib = GROUP_ORDER.indexOf(b)
    if (ia === -1 && ib === -1) return a.localeCompare(b, 'zh-Hans-CN')
    if (ia === -1) return 1
    if (ib === -1) return -1
    return ia - ib
  })
}

export type MultiEntityContextPanelProps = {
  // Real graph global_ids the user may choose from (existing callers). Kept for
  // backward compatibility; now optional.
  candidateGids?: string[]
  // M14: friendly candidates (name/type/topic). Primary source when non-empty.
  candidates?: Candidate[]
  onCitationClick?: (global_id: string) => void
}

// Container: owns the selection state (local only) and the toggle behavior.
// All rendering is delegated to MultiEntityContextView.
export default function MultiEntityContextPanel({
  candidateGids,
  candidates,
  onCitationClick,
}: MultiEntityContextPanelProps) {
  const [selectedGids, setSelectedGids] = useState<string[]>([])
  const pool = resolveCandidates(candidates, candidateGids)

  function toggle(gid: string) {
    setSelectedGids((prev) => applyToggleSelection(prev, gid, MAX_SELECTABLE))
  }

  return (
    <MultiEntityContextView
      candidates={pool}
      selectedGids={selectedGids}
      maxSelectable={MAX_SELECTABLE}
      onToggle={toggle}
      onCitationClick={onCitationClick}
    />
  )
}

export type MultiEntityContextViewProps = {
  candidates: Candidate[]
  selectedGids: string[]
  maxSelectable: number
  onToggle: (gid: string) => void
  onCitationClick?: (global_id: string) => void
}

// Presentational view — every visual state (checked / disabled / count) is
// derived purely from props, so tests can render any state without a click.
export function MultiEntityContextView({
  candidates,
  selectedGids,
  maxSelectable,
  onToggle,
  onCitationClick,
}: MultiEntityContextViewProps) {
  const { t, locale } = useLocale()
  const contextIds = multiEntityContext(selectedGids)

  const enriched = candidates.map((c) => ({ candidate: c, display: displayFor(c) }))
  const groups = groupByType(enriched)
  const groupKeys = orderedGroupKeys(groups)

  const selectedItems = enriched.filter((item) => selectedGids.includes(item.candidate.gid))
  const reachedCap = selectedGids.length >= maxSelectable

  return (
    <section className="multi-entity-context" aria-label={t('workspace.mecTitle')}>
      <div className="mec-header">
        <h3 className="mec-title">{t('workspace.mecTitle')}</h3>
        <span className="mec-count" aria-live="polite">
          {t('workspace.mecHint', { n: String(selectedGids.length), max: String(maxSelectable) })}
        </span>
      </div>

      {selectedItems.length > 0 && (
        <div className="mec-selected-bar" aria-label="已选实体">
          {selectedItems.map(({ candidate, display }) => (
            <button
              key={candidate.gid}
              type="button"
              className="mec-chip mec-chip--selected"
              aria-pressed="true"
              onClick={() => onToggle(candidate.gid)}
              title={`取消选择 ${display.name}`}
            >
              <span className="mec-chip-type">{getEntityLabel(display.type, locale)}</span>
              <span className="mec-chip-name">{display.name}</span>
              <span className="mec-chip-remove" aria-hidden="true">×</span>
            </button>
          ))}
        </div>
      )}

      {groupKeys.length > 0 ? (
        <div className="mec-groups">
          {groupKeys.map((type) => (
            <div key={type} className="mec-group">
              <h4 className="mec-group-title">{getEntityLabel(type, locale)}</h4>
              <div className="mec-group-chips" role="group" aria-label={getEntityLabel(type, locale)}>
                {groups[type].map(({ candidate, display }) => {
                  const checked = selectedGids.includes(candidate.gid)
                  const disabled = !checked && reachedCap
                  return (
                    <button
                      key={candidate.gid}
                      type="button"
                      className={`mec-chip${checked ? ' mec-chip--selected' : ''}${disabled ? ' mec-chip--disabled' : ''}`}
                      aria-pressed={checked}
                      disabled={disabled}
                      onClick={() => onToggle(candidate.gid)}
                      title={disabled ? `最多选择 ${maxSelectable} 个实体` : `${display.name} (${candidate.gid})`}
                    >
                      <span className="mec-chip-name">{display.name}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="mec-empty">{t('picker.emptyResults')}</p>
      )}

      {/*
        M15: honest transparency — show exactly how many global_ids resolved into
        the AI context and let the user expand the precise list that will be
        sent. This is a read-only mirror of multiEntityContext(selectedGids); it
        adds NO new state and does not change the context builder.
      */}
      <div className="mec-resolved" aria-label="已解析上下文">
        <span className="mec-resolved-count">{t('workspace.mecResolved', { n: String(contextIds.length) })}</span>
        {contextIds.length > 0 && (
          <details className="mec-context-preview">
            <summary>{t('workspace.mecPreview')}</summary>
            <ul className="mec-context-ids">
              {contextIds.map((id) => (
                <li key={id} className="mec-context-id">{id}</li>
              ))}
            </ul>
          </details>
        )}
      </div>

      <AIExplanationPanel contextGlobalIds={contextIds} onCitationClick={onCitationClick} />
    </section>
  )
}
