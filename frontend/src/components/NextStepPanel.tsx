// Phase 5 — A3 red-line convergence (ADR-0015 D1): NextStepPanel
//
// Replaces RecommendationPanel. Surfaces the ExplorationPolicy output
// (ExplorationAction[]) as a "where to explore next, and why" discovery zone
// in the entity view — WITHOUT the retired GET /entity/{id}/recommendations
// endpoint and WITHOUT any recommendation vocabulary (per M88.0 §8.3:
// ExplorationPolicy is not a RecommendationPolicy).
//
// The actions are produced client-side by App via evaluateExploration()
// (ExplorationPolicy) — never fetched, never re-scored. App owns navigation;
// this panel only calls the supplied onNodeClick.
//
// Layering (testable under vitest node env, no jsdom):
//   NextStepPanelView  -> pure presentational (renderToStaticMarkup)
//   NextStepPanel      -> thin container: null when no actions

import { useLocale } from '../data/locale'
import { usePreferences, getDisplayName } from '../lib/preferences'
import { getEntityDisplayName } from '../data/explorationPackages'
import LayerBadge from './common/LayerBadge'
import type { ExplorationAction, ExplorationActionType } from '../next/exploration/ExplorationPolicy'

// Re-exported for backward-compatible type imports (ExplorationJourney).
export type RelationPathStep = {
  from: string
  to: string
  relationship: string
  direction: string
  weight: number
}

// Context handed to the consumer (App) when a next-step card is clicked.
// Lets App annotate the resulting navigation edge with the "why" (so the
// ExplorationJourney panel can show *why* this node was suggested).
export type NextStepContext = {
  source: 'next-step'
  actionType: ExplorationActionType
  reason: string
  narrativeHook: string
  confidence: number
  targetRef: string
}

// Short Chinese labels for the cognitive-action types (policy-internal).
// P5-S2 TP-16 (VS-03 §5): button copy aligned to the visual contract —
// action semantics, not recommendation vocabulary (ADR-0015 D1 / X-R1).
const ACTION_LABELS: Record<ExplorationActionType, string> = {
  open_dimension: '展开维度',
  follow_cause: '追因',
  deep_continue: '深入延续',
  compare_context: '比较语境',
  reflect: '反思',
}

// M73-A P0-1: use display-name resolver (labels[locale] → name → fallback).
const resolveName = (gid: string, locale: string): string =>
  getEntityDisplayName(gid, locale as 'zh' | 'en' | 'ja')

// --- Pure presentational view ---

export type NextStepPanelViewProps = {
  actions: ExplorationAction[]
  seenGlobalIds?: Set<string>
  onNodeClick?: (globalId: string, context?: NextStepContext) => void
}

export function NextStepPanelView({
  actions,
  seenGlobalIds,
  onNodeClick,
}: NextStepPanelViewProps) {
  const { t, locale } = useLocale()
  const [prefs] = usePreferences()
  return (
    <div className="result-section he-nextstep">
      <h3>
        {t('discover.nextStepHeading')}
        <LayerBadge layer="inference" />
      </h3>
      <ul className="he-nextstep-list">
        {actions.map((action, idx) => {
          const gid = action.targetRef
          const name = action.targetRef ? resolveName(gid, locale) : ''
          const displayName = getDisplayName(name, locale, prefs.properNameMode)
          const seen = seenGlobalIds?.has(gid) ?? false
          return (
            <li key={`${gid}-${idx}`} className="he-nextstep-item">
              <button
                type="button"
                className={seen ? 'he-nextstep-node is-seen' : 'he-nextstep-node'}
                aria-label={t('entity.exploreAria', { name: displayName })}
                onClick={() =>
                  onNodeClick?.(gid, {
                    source: 'next-step',
                    actionType: action.type,
                    reason: action.reason,
                    narrativeHook: action.narrativeHook,
                    confidence: action.confidence,
                    targetRef: gid,
                  })
                }
              >
                <span className="he-nextstep-name">{displayName}</span>
                <span className="he-nextstep-action">{ACTION_LABELS[action.type]}</span>
              </button>

              {action.reason ? (
                <p className="he-nextstep-reason">{action.reason}</p>
              ) : null}

              {action.narrativeHook ? (
                <p className="he-nextstep-hook">{action.narrativeHook}</p>
              ) : null}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

// --- Container (null when no actions; navigation delegated to App) ---

export type NextStepPanelProps = {
  actions: ExplorationAction[]
  seenGlobalIds?: Set<string>
  onNodeClick?: (globalId: string, context?: NextStepContext) => void
}

export function NextStepPanel({ actions, seenGlobalIds, onNodeClick }: NextStepPanelProps) {
  if (!actions || actions.length === 0) return null
  return (
    <NextStepPanelView
      actions={actions}
      seenGlobalIds={seenGlobalIds}
      onNodeClick={onNodeClick}
    />
  )
}

export default NextStepPanel
