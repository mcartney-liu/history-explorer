// ============================================================
// Wave2-#138 (ADR-0019) — DisputesPanel
//
// Truth-layer dissent navigation. The topic view's relationship
// network is a star graph centred on the main entity, so a
// `disputes` / `reinterprets` edge between two OTHER entities
// never surfaces there. This panel re-scans the topic's full raw
// relationships and renders the scholarly dissent as a compact,
// navigable list — "historians disagree here" is the most
// truth-relevant signal Article 0 layer 3 can show.
//
// Display-only, zero business logic. Falls back to a single muted
// line when no dispute edges exist in the topic.
// ============================================================

interface RawRel {
  source?: string
  target?: string
  type?: string
  narrative?: string
  citation?: string
}

interface DisputesPanelProps {
  /** Full raw relationships from the explore response. */
  relationships: RawRel[]
  /** id -> display name for endpoints (resolved from entities). */
  nameById?: Record<string, string>
  /** id -> global_id for navigation. */
  globalIdById?: Record<string, string>
  /** Navigate to an endpoint entity. */
  onNodeClick?: (globalId: string) => void
}

const DISPUTE_TYPES = new Set(['disputes', 'reinterprets'])

export function DisputesPanel({ relationships, nameById, globalIdById, onNodeClick }: DisputesPanelProps) {
  const edges = (relationships || []).filter((r) => DISPUTE_TYPES.has(r.type || ''))
  if (edges.length === 0) return null

  return (
    <section className="disputes-panel" aria-label="争议与重释">
      <h4 className="disputes-panel-heading">史学争议 · 有不同解释</h4>
      <ul className="disputes-panel-list">
        {edges.map((r, i) => {
          const typeLabel = r.type === 'disputes' ? '存在争议' : '重新解释'
          const srcName = nameById?.[r.source || ''] ?? r.source
          const tgtName = nameById?.[r.target || ''] ?? r.target
          const srcGid = globalIdById?.[r.source || '']
          const tgtGid = globalIdById?.[r.target || '']
          return (
            <li key={`${r.source}-${r.type}-${r.target}-${i}`} className="disputes-edge">
              <span className="disputes-edge-types">
                <button
                  type="button"
                  className="disputes-edge-endpoint"
                  disabled={!srcGid}
                  onClick={() => srcGid && onNodeClick?.(srcGid)}
                >
                  {srcName}
                </button>
                <span className={`disputes-edge-type disputes-edge-type--${r.type}`}>{typeLabel}</span>
                <button
                  type="button"
                  className="disputes-edge-endpoint"
                  disabled={!tgtGid}
                  onClick={() => tgtGid && onNodeClick?.(tgtGid)}
                >
                  {tgtName}
                </button>
              </span>
              {r.narrative && <p className="disputes-edge-narrative">{r.narrative}</p>}
              {r.citation && <span className="disputes-edge-citation">{r.citation}</span>}
            </li>
          )
        })}
      </ul>
    </section>
  )
}

export default DisputesPanel
