import { useState } from 'react'
import AIExplanationPanel from './AIExplanationPanel'
import { multiEntityContext } from '../data/aiContext'

// M13 (Multi Entity Reasoning Foundation): the user explicitly picks N real
// entity global_ids from the current exploration graph and asks ONE grounded
// question across all of them, reusing the M12-1 single `/api/v1/ai/explain`
// primitive. Zero backend changes.
//
// Freeze constraints (M13 Correction #1 / #2):
//   - selectedGids is COMPONENT-LOCAL state. It is NOT lifted into App.tsx,
//     not stored in any global store / context provider, and never persisted.
//     App.tsx only supplies candidateGids + onCitationClick (navigation).
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

export type MultiEntityContextPanelProps = {
  // Real graph global_ids the user may choose from (supplied by the host from
  // the existing exploreEntityGlobalById map). Always real, resolvable ids.
  candidateGids: string[]
  onCitationClick?: (global_id: string) => void
}

// Container: owns the selection state (local only) and the toggle behavior.
// All rendering is delegated to MultiEntityContextView.
export default function MultiEntityContextPanel({
  candidateGids,
  onCitationClick,
}: MultiEntityContextPanelProps) {
  const [selectedGids, setSelectedGids] = useState<string[]>([])

  function toggle(gid: string) {
    setSelectedGids((prev) => applyToggleSelection(prev, gid, MAX_SELECTABLE))
  }

  return (
    <MultiEntityContextView
      candidateGids={candidateGids}
      selectedGids={selectedGids}
      maxSelectable={MAX_SELECTABLE}
      onToggle={toggle}
      onCitationClick={onCitationClick}
    />
  )
}

export type MultiEntityContextViewProps = {
  candidateGids: string[]
  selectedGids: string[]
  maxSelectable: number
  onToggle: (gid: string) => void
  onCitationClick?: (global_id: string) => void
}

// Presentational view — every visual state (checked / disabled / count) is
// derived purely from props, so tests can render any state without a click.
export function MultiEntityContextView({
  candidateGids,
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
        {candidateGids.map((gid) => {
          const checked = selectedGids.includes(gid)
          const disabled = !checked && selectedGids.length >= maxSelectable
          return (
            <li key={gid}>
              <label>
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={disabled}
                  onChange={() => onToggle(gid)}
                />
                <span className="mec-gid">{gid}</span>
              </label>
            </li>
          )
        })}
      </ul>
      <AIExplanationPanel contextGlobalIds={contextIds} onCitationClick={onCitationClick} />
    </section>
  )
}
