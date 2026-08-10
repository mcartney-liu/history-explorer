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
//
// P5-S4 rethought: the PRIMARY view is now the reasoning chain — each
// connection is a path, rendered as a row of entity pills joined by
// relationship-labelled arrows. The verb answers "how are these connected",
// which is the whole point of the panel. The previous radial network graph
// collapsed the ordered reasoning into a mesh and hid the relationship verbs,
// so it was replaced. A 图(链)/列表 toggle keeps the original list as fallback.
import { Fragment, useState } from 'react'
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
  // Optional focus node — highlighted (accent pill) when it appears in a chain.
  mainId?: string
}

function shorten(name: string, max = 16): string {
  return name.length > max ? name.slice(0, max - 1) + '…' : name
}

// Reasoning-chain view (default). Each connection is a path; render it as a
// row of entity pills joined by relationship-labelled arrows. Connections
// without a path fall back to their explanation sentence.
function RelationshipChainView({
  connections,
  onNodeClick,
  mainId,
  locale,
}: {
  connections: ConnectionExplained[]
  onNodeClick?: (globalId: string) => void
  mainId?: string
  locale: string
}) {
  const displayName = (gid: string): string =>
    getEntityDisplayName(gid, locale as 'zh' | 'en' | 'ja')

  return (
    <div className="rel-chain">
      {connections.map((item, idx) => {
        const path = Array.isArray(item.path) ? (item.path as string[]) : []
        if (path.length === 0) {
          return (
            <p className="rel-chain-note" key={`note-${idx}`}>
              {item.explanation}
            </p>
          )
        }
        const steps = Array.isArray(item.steps) ? (item.steps as PathStep[]) : []
        return (
          <div className="rel-chain-row" key={`chain-${idx}`}>
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
              const isMain = typeof mainId === 'string' && node === mainId
              const clickable = Boolean(onNodeClick)
              return (
                <Fragment key={`${node}-${i}`}>
                  <button
                    type="button"
                    className={`rel-pill${isMain ? ' is-main' : ''}`}
                    disabled={!clickable}
                    aria-label={displayName(node)}
                    onClick={() => onNodeClick && onNodeClick(node)}
                  >
                    {shorten(displayName(node))}
                  </button>
                  {i < path.length - 1 && (
                    <span className="rel-arrow" aria-hidden="true">
                      <span className="rel-dir">{isIncoming ? '←' : '→'}</span>
                      <span className="rel-verb">
                        {getRelationshipLabel(
                          edge?.relationship ?? 'related',
                          locale as 'zh' | 'en' | 'ja',
                        )}
                      </span>
                    </span>
                  )}
                </Fragment>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}

function ConnectionsExplainedPanel({
  connections,
  onNodeClick,
  mainId,
}: ConnectionsExplainedPanelProps) {
  const { t, locale } = useLocale()
  if (!connections || connections.length === 0) return null

  const [view, setView] = useState<'chain' | 'list'>('chain')

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
      <div className="result-section-head">
        <h3>{t('common.explainableConnections')}</h3>
        <div className="viz-toggle" role="group" aria-label="关系视图切换">
          <button type="button" className={view === 'chain' ? 'active' : ''} aria-pressed={view === 'chain'} onClick={() => setView('chain')}>推理链</button>
          <button type="button" className={view === 'list' ? 'active' : ''} aria-pressed={view === 'list'} onClick={() => setView('list')}>列表</button>
        </div>
      </div>

      {view === 'chain' ? (
        <RelationshipChainView
          connections={connections}
          onNodeClick={onNodeClick}
          mainId={mainId}
          locale={locale}
        />
      ) : (
        <>
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
                                    {isIncoming ? '←' : '—'}
                                    <span className="ep-edge-label">
                                      {getRelationshipLabel(edge.relationship, locale as 'zh' | 'en' | 'ja')}
                                    </span>
                                    {isIncoming ? '—' : '→'}
                                  </>
                                ) : (
                                  '→'
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
        </>
      )}
    </div>
  )
}

export default ConnectionsExplainedPanel
