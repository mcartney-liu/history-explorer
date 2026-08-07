// M3.5-004: render the backend's additive `connections_explained` field.
//
// The backend (M3.5-003) now returns, for GET /entity/{id} and GET /explore/{topic},
// a top-level `connections_explained: ConnectionExplained[]`. This panel is
// strictly additive: when the field is absent it renders nothing, so the legacy
// UI (and the legacy <ConnectionsPanel/>) is untouched.
//
// M61: merged ExplorationPathsPanel's path-chain rendering into this component.
// When onNodeClick is provided and a connection has path data, a clickable
// node chain is rendered below the explanation row.
import { Fragment } from 'react'
import { useLocale } from '../data/locale'
import { getEntityDisplayName } from '../data/explorationPackages'
import { getRelationshipLabel } from '../data/entity/entityLabels'
export type ConnectionExplained = {
  global_id: string
  depth: number
  path: unknown[]
  steps: unknown[]
  score: number
  score_breakdown: Record<string, unknown>
  explanation: string
}

type PathStep = {
  from_global_id: string
  to_global_id: string
  relationship: string
  direction: string
  weight?: number
}

type ConnectionsExplainedPanelProps = {
  connections?: ConnectionExplained[]
  onNodeClick?: (globalId: string) => void
}

function ConnectionsExplainedPanel({ connections, onNodeClick }: ConnectionsExplainedPanelProps) {
  const { t, locale } = useLocale()
  if (!connections || connections.length === 0) return null

  // M73-A P0-1 fix: use display-name resolver (labels[locale] → name → fallback)
  // instead of raw local-id slicing which exposed internal DSL like "person-zhang-qian".
  const displayName = (gid: string): string =>
    getEntityDisplayName(gid, locale as 'zh' | 'en' | 'ja')

  // M73-A P0-1 fix: the backend explanation is "<structural path> | <causal
  // enrichment>". The structural half is re-rendered below as a localized,
  // clickable chain — showing both duplicates the same fact in two languages.
  // So when the chain is present we keep only the causal enrichment, which the
  // chain cannot express. Without a chain, the full sentence is still shown.
  const CAUSAL_SEPARATOR = ' | '
  const explanationFor = (raw: string, hasChain: boolean): string => {
    if (!raw) return ''
    if (!hasChain) return raw
    const sep = raw.indexOf(CAUSAL_SEPARATOR)
    return sep === -1 ? '' : raw.slice(sep + CAUSAL_SEPARATOR.length)
  }
  const hasChainFor = (item: ConnectionExplained): boolean =>
    Boolean(onNodeClick) && Array.isArray(item.path) && item.path.length > 0

  return (
    <div className="result-section">
      <h3>{t('common.explainableConnections')}</h3>
      <div className="ce-list">
        {connections.map((item, idx) => (
          <div className="main-entity ce-item" key={idx}>
            <div className="ce-head">
              <span className="re-name">{displayName(item.global_id)}</span>
              {item.depth != null && (
                <span className="me-type">{t('common.depthLabel', { n: String(item.depth) })}</span>
              )}
              {typeof item.score === 'number' && (
                <span className="me-type">{t('common.scoreLabel', { n: String(item.score) })}</span>
              )}
            </div>
            {(() => {
              const detail = explanationFor(item.explanation, hasChainFor(item))
              return detail ? <span className="re-rel">{detail}</span> : null
            })()}
          </div>
        ))}
      </div>
      {onNodeClick && (
        <div className="ep-list">
          {connections.map((item, idx) => {
            const path = Array.isArray(item.path) ? (item.path as string[]) : []
            const steps = Array.isArray(item.steps) ? (item.steps as PathStep[]) : []
            if (path.length === 0) return null
            return (
              <div className="main-entity ep-item" key={`path-${idx}`}>
                <div className="ep-chain">
                  {path.map((node, i) => {
                    const edge =
                      i < path.length - 1
                        ? steps.find(
                            (s) =>
                              s.from_global_id === node &&
                              s.to_global_id === path[i + 1],
                          )
                        : undefined
                    const isIncoming = edge?.direction === 'incoming'
                    return (
                      <Fragment key={`${node}-${i}`}>
                        <button
                          type="button"
                          className="ep-node is-clickable"
                          aria-label={t('common.openLabel', { name: displayName(node) })}
                          onClick={() => onNodeClick(node)}
                        >
                          {displayName(node)}
                        </button>
                        {i < path.length - 1 && (
                          <span className="ep-edge" aria-hidden="true">
                            {edge ? (
                              <>
                                {isIncoming ? '\u2190' : '\u2014'}
                                <span className="ep-edge-label">
                                  {getRelationshipLabel(edge.relationship, locale as 'zh' | 'en' | 'ja')}
                                </span>
                                {isIncoming ? '\u2014' : '\u2192'}
                              </>
                            ) : (
                              '\u2192'
                            )}
                          </span>
                        )}
                      </Fragment>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default ConnectionsExplainedPanel
