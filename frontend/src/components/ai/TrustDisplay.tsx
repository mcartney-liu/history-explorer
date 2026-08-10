// M74-003 (C3-1) + M74-004-002 (Commit 2B): TrustDisplay → Evidence Card.
//
// Renders evidence-bound exploration output as a trust card. Pure
// presentational component: it consumes ONLY fields that already passed
// EvidenceValidation server-side (evidence / next_exploration / confidence)
// and renders them as-is. It never assembles facts, never fetches, never
// infers — every claim_text / source_title / source_tier / reason comes from
// the backend response (PO C2: no frontend query of claims/sources, no
// reasoning from relationships).
//
// PO Condition 1/2: deterministic output is explicitly NOT presented as
// "AI-generated" — the title reads "基于知识库证据的探索建议" and an engine
// badge distinguishes deterministic vs AI output.
import { useLocale } from '../../data/locale'
import type { AIConfidence, AIEngine, AIEvidence, AINextExploration } from '../../data/aiClient'
import { Badge, type BadgeTone } from '../ui/Badge'
import { getRelationshipLabel, formatSourceId, translateEvidenceText } from '../../data/entity/entityLabels'
import { getEntityDisplayName } from '../../data/explorationPackages'

interface TrustDisplayProps {
  evidence?: AIEvidence[]
  nextExploration?: AINextExploration[]
  engine?: AIEngine
  /** M74-004-002 (2B): server-side confidence from the validated bindings. */
  confidence?: AIConfidence
  /** M74-003 (C3-2): optional navigation — fired with the suggestion's
   *  global_id when a next-exploration item is clicked. The consumer wires
   *  this to the EXISTING onEntityClick path; no new navigation logic here. */
  onNextClick?: (globalId: string) => void
}

function engineBadge(engine: AIEngine | undefined, t: (k: string) => string): {
  tone: BadgeTone
  label: string
} | null {
  if (engine === 'ai' || engine === 'ai_unverified') {
    return { tone: 'academic', label: t('ai.trust_engine_ai') }
  }
  if (engine === 'deterministic') {
    return { tone: 'primary', label: t('ai.trust_engine_deterministic') }
  }
  return null
}

function tierLabel(tier: string | undefined, t: (k: string) => string): string {
  switch (tier) {
    case 'primary':
      return t('ai.tier_primary')
    case 'academic':
      return t('ai.tier_academic')
    case 'reference':
      return t('ai.tier_reference')
    default:
      return t('ai.tier_unknown')
  }
}

// M74-004-003 (G1): map source tier to the EXISTING Design System Badge
// semantic tones (primary / academic / reference) — reuses DS Lite, no new
// color system. Unknown tiers fall back to neutral.
function tierTone(tier: string | undefined): BadgeTone {
  switch (tier) {
    case 'primary':
      return 'primary'
    case 'academic':
      return 'academic'
    case 'reference':
      return 'reference'
    default:
      return 'neutral'
  }
}

// M74-004-003 (G3): confidence localisation — pure frontend presentation
// mapping. The backend confidence enum (high/medium/low) is unchanged; the
// labels come from locale keys so zh never shows English confidence text.
function confidenceLabel(confidence: AIConfidence | undefined, t: (k: string) => string): string {
  switch (confidence) {
    case 'high':
      return `${t('ai.evidence_confidence')}：${t('ai.confidence_high')}`
    case 'medium':
      return `${t('ai.evidence_confidence')}：${t('ai.confidence_medium')}`
    case 'low':
      return `${t('ai.evidence_confidence')}：${t('ai.confidence_low')}`
    default:
      return ''
  }
}

export function TrustDisplay({
  evidence,
  nextExploration,
  engine,
  confidence,
  onNextClick,
}: TrustDisplayProps) {
  const { t, locale } = useLocale()
  const evidenceList = evidence ?? []
  const nextList = nextExploration ?? []
  const badge = engineBadge(engine, t)
  const conf = confidenceLabel(confidence, t)

  if (evidenceList.length === 0 && nextList.length === 0) {
    return (
      <section className="trust-display" data-testid="trust-display" aria-label={t('ai.trust_aria_label')}>
        <p className="trust-display-empty">{t('ai.trust_no_evidence')}</p>
      </section>
    )
  }

  return (
    <section className="trust-display" data-testid="trust-display" aria-label={t('ai.trust_aria_label')}>
      <header className="trust-display-header">
        <h3 className="trust-display-title">{t('ai.trust_title')}</h3>
        <span className="trust-display-meta">
          {conf && <span className="trust-display-confidence">{conf}</span>}
          {badge && <Badge tone={badge.tone}>{badge.label}</Badge>}
        </span>
      </header>

      {nextList.length > 0 && (
        <div className="trust-display-section">
          <p className="trust-display-label">{t('ai.trust_next_label')}</p>
          <ul className="trust-display-next">
            {nextList.map((item) => (
              <li key={item.global_id} className="trust-display-next-item">
                <div className="trust-display-next-head">
                  {onNextClick ? (
                    <button
                      type="button"
                      className="trust-display-next-btn"
                      onClick={() => onNextClick(item.global_id)}
                    >
                      <span className="trust-display-next-name">{getEntityDisplayName(item.global_id, locale as 'zh' | 'en' | 'ja')}</span>
                      <span className="trust-display-next-rel">{getRelationshipLabel(item.relationship, locale as 'zh' | 'en' | 'ja')}</span>
                    </button>
                  ) : (
                  <span className="trust-display-next-name">
                    {getEntityDisplayName(item.global_id, locale as 'zh' | 'en' | 'ja')} <span className="trust-display-next-rel">{getRelationshipLabel(item.relationship, locale as 'zh' | 'en' | 'ja')}</span>
                  </span>
                  )}
                </div>
                {/* M74-004-002 (2B): Evidence Card detail — ALL fields come from
                    the backend Planner (reason / claim_text / source_title /
                    source_tier). Rendered as-is; never joined locally. */}
                {item.reason && (
                  <p className="trust-display-next-reason">
                    <span className="trust-display-detail-label">{t('ai.evidence_reason')}：</span>
                    {translateEvidenceText(item.reason)}
                  </p>
                )}
                {item.claim_text && (
                  <p className="trust-display-next-claim">
                    <span className="trust-display-detail-label">{t('ai.evidence_claim')}：</span>
                    {translateEvidenceText(item.claim_text)}
                  </p>
                )}
                {(item.source_title || item.source_tier) && (
                  <p className="trust-display-next-source">
                    <span className="trust-display-detail-label">{t('ai.evidence_source')}：</span>
                    {item.source_title && <span className="trust-display-source-title">{item.source_title}</span>}
                    {item.source_tier && (
                      <Badge tone={tierTone(item.source_tier)}>{tierLabel(item.source_tier, t)}</Badge>
                    )}
                    {/* source_id always surfaces — auditable reference id */}
                    <code className="trust-display-source">{formatSourceId(item.source_id)}</code>
                  </p>
                )}
                {!item.reason && !item.claim_text && !item.source_title && !item.source_tier && (
                  <code className="trust-display-source">{formatSourceId(item.source_id)}</code>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {evidenceList.length > 0 && (
        <EvidenceList items={evidenceList} />
      )}

      {/* M90.x: 有证据但无推荐时给明确提示（避免"探索建议"标题下静默空白） */}
      {nextList.length === 0 && evidenceList.length > 0 && (
        <p className="trust-display-empty">{t('ai.trust_no_next')}</p>
      )}
    </section>
  )
}

/**
 * M90.x: 可复用的证据列表（从 TrustDisplay 抽出，供身份卡历史见解等场景复用）。
 * 保持原 TrustDisplay 证据样式（claim 原文 + 来源标题 + tier 徽标 + 来源编号）；
 * source_url 存在时来源标题渲染为外链（<a target="_blank">）。
 */
export function EvidenceList({ items }: { items: AIEvidence[] }) {
  const { t, locale } = useLocale()
  return (
    <div className="trust-display-section">
      <p className="trust-display-label">{t('ai.trust_evidence_label')}</p>
      <ul className="trust-display-evidence">
        {items.map((ev, i) => (
          <li key={`${ev.global_id}-${i}`} className="trust-display-evidence-item">
            <div className="trust-display-next-head">
              <span className="trust-display-evidence-name">{getEntityDisplayName(ev.global_id, locale as 'zh' | 'en' | 'ja')}</span>
              {ev.status === 'verified' && (
                <Badge tone="primary">{t('ai.trust_verified')}</Badge>
              )}
            </div>
            {ev.label && (
              <p className="trust-display-next-claim">
                {translateEvidenceText(ev.label)}
              </p>
            )}
            {(ev.source_title || ev.source_tier) && (
              <p className="trust-display-next-source">
                <span className="trust-display-detail-label">{t('ai.evidence_source')}：</span>
                {ev.source_title &&
                  (ev.source_url ? (
                    <a
                      className="trust-display-source-title trust-display-source-link"
                      href={ev.source_url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {ev.source_title}
                    </a>
                  ) : (
                    <span className="trust-display-source-title">{ev.source_title}</span>
                  ))}
                {ev.source_tier && (
                  <Badge tone={tierTone(ev.source_tier)}>{tierLabel(ev.source_tier, t)}</Badge>
                )}
                {ev.source_id && <code className="trust-display-source">{formatSourceId(ev.source_id)}</code>}
              </p>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

export default TrustDisplay
