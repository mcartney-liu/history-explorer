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
import { useState } from 'react'
import { useLocale } from '../../data/locale'
import type { AIConfidence, AIEngine, AIEvidence, AINextExploration } from '../../data/aiClient'
import { Badge, type BadgeTone } from '../ui/Badge'
import {
  getRelationshipLabel,
  getRelationshipCategory,
  RELATIONSHIP_CATEGORY_CLASS,
  formatSourceId,
  translateEvidenceText,
} from '../../data/entity/entityLabels'
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
  /** 2026-08-11 (PO): 覆盖引擎徽标——推荐列表为确定性产物时，调用方传入
   *  "知识库推荐"等准确文案，避免把 AI answer 的 engine 徽标错绑到
   *  确定性推荐内容上。undefined = 按 engine 推断；null = 不显示。 */
  engineBadgeLabel?: string | null
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
  engineBadgeLabel,
}: TrustDisplayProps) {
  const { t, locale } = useLocale()
  const evidenceList = evidence ?? []
  const nextList = nextExploration ?? []
  // 信息层级降维（PO 2026-08-11）：默认折叠详情、只展主干 3 条，
  // 其余点"查看更多"展开；每条详情默认收起，点"展开"才显示。
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [showAll, setShowAll] = useState(false)
  const VISIBLE_LIMIT = 3
  const toggleExpand = (gid: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(gid)) next.delete(gid)
      else next.add(gid)
      return next
    })
  }
  // 引擎徽标：调用方显式覆盖时以覆盖为准（推荐列表确定性产物标"知识库推荐"），
  // 否则按 engine 推断（AI 回答场景保持"AI 生成"）。
  const badge =
    engineBadgeLabel !== undefined
      ? engineBadgeLabel
        ? { tone: 'primary' as const, label: engineBadgeLabel }
        : null
      : engineBadge(engine, t)
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
      <p className="trust-display-perspective">{t('ai.trust_perspective')}</p>

      {nextList.length > 0 && (
        <div className="trust-display-section">
          <p className="trust-display-label">{t('ai.trust_next_label')}</p>
          <ol className="trust-display-chain">
            {nextList.map((item, idx) => {
              const isOpen = expanded.has(item.global_id)
              const cat = getRelationshipCategory(item.relationship)
              const isHidden = idx >= VISIBLE_LIMIT && !showAll
              return (
                <li
                  key={item.global_id}
                  className={`trust-display-link${isHidden ? ' is-hidden' : ''}`}
                  data-rel-category={cat}
                >
                  {/* 叙事卡片链：节点名 + 关系彩色 Badge + 展开按钮 */}
                  <div className="trust-display-node">
                    {onNextClick ? (
                      <button
                        type="button"
                        className="trust-display-node-btn"
                        onClick={() => onNextClick(item.global_id)}
                        aria-label={t('ai.trust_node_aria', { name: getEntityDisplayName(item.global_id, locale as 'zh' | 'en' | 'ja') })}
                      >
                        <span className="trust-display-node-name">{getEntityDisplayName(item.global_id, locale as 'zh' | 'en' | 'ja')}</span>
                      </button>
                    ) : (
                      <span className="trust-display-node-name">{getEntityDisplayName(item.global_id, locale as 'zh' | 'en' | 'ja')}</span>
                    )}
                    <Badge tone="neutral" className={`rel-badge ${RELATIONSHIP_CATEGORY_CLASS[cat]}`}>
                      {getRelationshipLabel(item.relationship, locale as 'zh' | 'en' | 'ja')}
                    </Badge>
                    <button
                      type="button"
                      className="trust-display-toggle"
                      aria-expanded={isOpen}
                      onClick={() => toggleExpand(item.global_id)}
                    >
                      {isOpen ? t('ai.trust_collapse') : t('ai.trust_expand')}
                    </button>
                  </div>
                  {/* M74-004-002 (2B): Evidence Card detail — 默认折叠(收起)，
                      所有字段来自后端 Planner。DOM 中始终存在以满足可访问性/
                      可审计；仅视觉上隐藏，展开才显示。 */}
                  <div className={`trust-display-detail${isOpen ? ' is-open' : ''}`}>
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
                        {/* 2026-08-11 (PO)：来源书目信息（作者·出版社），增强可信度 */}
                        {item.source_creator && <span className="trust-display-source-meta"> · {item.source_creator}</span>}
                        {item.source_publisher && <span className="trust-display-source-meta"> · {item.source_publisher}</span>}
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
                  </div>
                </li>
              )
            })}
          </ol>
          {nextList.length > VISIBLE_LIMIT && (
            <button
              type="button"
              className="trust-display-more"
              onClick={() => setShowAll((v) => !v)}
            >
              {showAll
                ? t('ai.trust_show_less')
                : t('ai.trust_show_more', { count: String(nextList.length - VISIBLE_LIMIT) })}
            </button>
          )}
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
                {/* 2026-08-11 (PO)：证据原文加"原文/摘要"标签，与引用格式对齐 */}
                <span className="trust-display-detail-label">{t('ai.evidence_summary')}：</span>
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
                {/* 2026-08-11 (PO)：引用格式——编者；出版社，年；ISBN（有值才显示） */}
                {ev.source_creator && <span className="trust-display-source-meta">；编者：{ev.source_creator}</span>}
                {ev.source_publisher && (
                  <span className="trust-display-source-meta">
                    ；出版社：{ev.source_publisher}
                    {ev.source_year ? `，${ev.source_year}` : ''}
                  </span>
                )}
                {ev.source_isbn && <span className="trust-display-source-meta">；ISBN：{ev.source_isbn}</span>}
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
