import {
  getEntityDisplayName,
  getEvidenceWithSources,
  getSource,
  type ExplorationPackage,
  type Locale,
} from '../../data/explorationPackages'
import { getRelationshipLabel } from '../../data/entity/entityLabels'
import { Badge, type BadgeTone } from '../ui/Badge'

interface SourceChainProps {
  pkg: ExplorationPackage
  locale?: Locale
  /** M72 Line2 — fired when a claim source badge is clicked (view_source
   *  telemetry, M73 Pilot data base). Presentational passthrough only;
   *  wiring lives in the page layer. Default no-op keeps tests untouched. */
  onSourceClick?: (sourceId: string) => void
}

function tierLabel(tier: string): string {
  if (tier === 'primary') return '一手来源'
  if (tier === 'academic') return '学术来源'
  if (tier === 'reference') return '参考来源'
  return tier || '来源'
}

// M73 Phase2-B: map source tier to the DS Lite Badge tone.
function tierTone(tier: string): BadgeTone {
  if (tier === 'primary') return 'primary'
  if (tier === 'academic') return 'academic'
  return 'reference'
}

// Source / Provenance Chain. For every relationship path that carries an
// `evidence` pointer, we resolve the EvidenceClaim(s) and their Sources directly
// from the local JSON (evidence_claims.json + sources.json). No backend call, no
// hallucination: every claim and source id was already graph-grounded by the
// Phase-1 validator. The user can see exactly what backs each relationship.
export default function SourceChain({ pkg, locale = 'zh', onSourceClick }: SourceChainProps) {
  const edgesWithEvidence = pkg.relationship_paths.filter(
    (p) => p.evidence && p.evidence.length > 0,
  )

  return (
    <div className="source-chain" data-testid="source-chain">
      {edgesWithEvidence.map((p) => {
        const evs = getEvidenceWithSources(p.evidence!)
        const relLabel = `${getEntityDisplayName(p.from, locale)} ${getRelationshipLabel(
          p.type,
          locale,
        )} ${getEntityDisplayName(p.to, locale)}`
        return (
          <section className="source-group" key={`${p.from}-${p.to}-${p.type}`}>
            <h4 className="source-group-rel">{relLabel}</h4>
            {evs.map((ev) => (
              <div className="source-claim" key={ev.claimId}>
                <p className="source-claim-text">{ev.claim}</p>
                <ul className="source-badges">
                  {ev.sources.map((s) => (
                    <li
                      className={`source-badge source-badge--${(s.tier || 'unknown').toLowerCase()}${onSourceClick ? ' source-badge--clickable' : ''}`}
                      key={s.id}
                      title={s.creator ? `${s.creator} (${s.year})` : s.id}
                      onClick={onSourceClick ? () => onSourceClick(s.id) : undefined}
                    >
                      <Badge tone={tierTone(s.tier)} className="source-badge-tier">
                        {tierLabel(s.tier)}
                      </Badge>
                      <span className="source-badge-title">{s.title}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </section>
        )
      })}

      <section className="source-summary">
        <h4 className="source-summary-title">本探索包引用来源</h4>
        <ul className="source-summary-list">
          {pkg.source_references.map((sid) => {
            const s = getSource(sid)
            return (
              <li
                className={`source-badge source-badge--${(s?.tier || 'unknown').toLowerCase()}`}
                key={sid}
              >
                <Badge tone={tierTone(s?.tier || '')} className="source-badge-tier">
                  {tierLabel(s?.tier || '')}
                </Badge>
                <span className="source-badge-title">{s?.title ?? sid}</span>
              </li>
            )
          })}
        </ul>
      </section>
    </div>
  )
}
