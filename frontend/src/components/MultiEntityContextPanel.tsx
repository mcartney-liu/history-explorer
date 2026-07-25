import { useState } from 'react'
import AIExplanationPanel from './AIExplanationPanel'
import { multiEntityContext } from '../data/aiContext'
import type { Candidate } from '../data/candidateUtils'

// M13 (Multi Entity Reasoning Foundation): the user explicitly picks N real
// entity global_ids and asks ONE grounded question across all of them, reusing
// the M12-1 single `/api/v1/ai/explain` primitive. Zero backend changes.
//
// M14 (Cross Topic Selection + Candidate UX): the candidate pool may now be
// supplied as friendly `candidates` (name/type/topic) coming from the
// EntityPickerPanel, in addition to the original bare `candidateGids`. This is
// a COMPATIBILITY-FIRST extension:
//   - candidateGids?: string[]  (retained for existing callers)
//   - candidates?: Candidate[]  (new; primary source when non-empty)
//   Resolution rule (resolveCandidates): candidates wins when non-empty;
//   otherwise fall back to candidateGids. No breaking API change.
//
// Freeze constraints (M13 Correction #1 / #2, unchanged):
//   - selectedGids is COMPONENT-LOCAL state. Not lifted into App, no global
//     store / context provider, never persisted.
//   - MAX_N (the selection cap) is a UI-layer concern defined here, NOT in the
//     context builder. multiEntityContext() stays a generic N-id builder.
const MAX_SELECTABLE = 8

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
  const contextIds = multiEntityContext(selectedGids)

  return (
    <section className="multi-entity-context" aria-label="AI 多实体联合解读">
      <h3 className="mec-title">AI 多实体联合解读</h3>
      <p className="mec-hint">
        勾选多个实体，向 AI 提出一个跨实体的事实溯源问题（已选 {selectedGids.length}/{maxSelectable}）。
      </p>
      <ul className="mec-candidates">
        {candidates.map((c) => {
          const checked = selectedGids.includes(c.gid)
          const disabled = !checked && selectedGids.length >= maxSelectable
          return (
            <li key={c.gid}>
              <label>
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={disabled}
                  onChange={() => onToggle(c.gid)}
                />
                <span className="mec-name">{c.name}</span>
                {c.type && <span className="mec-type">{c.type}</span>}
                {c.topic && <span className="mec-topic">{c.topic}</span>}
              </label>
            </li>
          )
        })}
      </ul>

      {/*
        M15: honest transparency — show exactly how many global_ids resolved into
        the AI context and let the user expand the precise list that will be
        sent. This is a read-only mirror of multiEntityContext(selectedGids); it
        adds NO new state and does not change the context builder.
      */}
      <div className="mec-resolved" aria-label="已解析上下文">
        <span className="mec-resolved-count">已解析上下文 {contextIds.length} 个 global_id</span>
        {contextIds.length > 0 && (
          <details className="mec-context-preview">
            <summary>预览将发送的 global_id</summary>
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
