import {
  getEntityDisplayName,
  getEvidenceWithSources,
  getSource,
  type ExplorationPackage,
  type Locale,
} from '../../data/explorationPackages'
import { getRelationshipLabel } from '../../data/entity/entityLabels'

interface SourceChainProps {
  pkg: ExplorationPackage
  locale?: Locale
}

function tierLabel(tier: string): string {
  if (tier === 'primary') return '一手来源'
  if (tier === 'academic') return '学术来源'
  if (tier === 'reference') return '参考来源'
  return tier || '来源'
}

// Source / Provenance Chain. For every relationship path that carries an
// `evidence` pointer, we resolve the EvidenceClaim(s) and their Sources directly
// from the local JSON (evidence_claims.json + sources.json). No backend call, no
// hallucination: every claim and source id was already graph-grounded by the
// Phase-1 validator. The user can see exactly what backs each relationship.
export default function SourceChain({ pkg, locale = 'zh' }: SourceChainProps) {
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
                      className={`source-badge source-badge--${(s.tier || 'unknown').toLowerCase()}`}
                      key={s.id}
                      title={s.creator ? `${s.creator} (${s.year})` : s.id}
                    >
                      <span className="source-badge-tier">{tierLabel(s.tier)}</span>
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
                <span className="source-badge-tier">{tierLabel(s?.tier || '')}</span>
                <span className="source-badge-title">{s?.title ?? sid}</span>
              </li>
            )
          })}
        </ul>
      </section>
    </div>
  )
}
