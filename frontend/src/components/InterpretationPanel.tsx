// M5-A-6: Interpretation layer. This panel is the designated seam that answers
// "WHY are these connections worth exploring" — as opposed to
// ConnectionsExplainedPanel, which answers "WHAT connections exist". It is a
// PURE presentational component: it does not compute, generate, or format
// anything, and it does NOT import navigation. All data arrives pre-mapped via
// `interpretations` (see interpretationFormatter.ts, which preserves the
// backend's deterministic `explanation` verbatim — no AI, no invented text).
//
// M90.3 Stage D-1 — migrated to UnderstandingCard Explorer Primitive for the
// "understandings" section. The interpretations list retains its existing
// rendering (scores + clickable nodes) because UnderstandingCard is designed
// for Before→Evidence→After transitions, not scored entity lists.
//
// P5-S5: interpretation cards — entity-type badges, relevance strength bars,
// and readable card layout. The backend `explanation` text is still rendered
// verbatim; only presentation structure changes.
import { useLocale, type Locale } from '../data/locale'
import { InterpretationViewModel } from '../data/interpretationFormatter'
import type { UnderstandingViewModel } from '../data/understandingRules'
import { UnderstandingCard } from './primitives/UnderstandingCard'
import CollapsibleList from './ui/CollapsibleList'
import { getEntityIcon, entityTypeFromGlobalId } from '../data/entity/entityLabels'
import { Icon } from './ui/Icon'
import type { IconName } from './ui/Icon'

type EntityTypeKey =
  | 'civilization'
  | 'event'
  | 'person'
  | 'location'
  | 'technology'
  | 'religion'
  | 'entity'

const TYPE_LABELS: Record<EntityTypeKey, Record<Locale, string>> = {
  civilization: { zh: '文明', en: 'Civilization', ja: '文明' },
  event: { zh: '事件', en: 'Event', ja: '出来事' },
  person: { zh: '人物', en: 'Person', ja: '人物' },
  location: { zh: '地点', en: 'Location', ja: '場所' },
  technology: { zh: '技术', en: 'Technology', ja: '技術' },
  religion: { zh: '宗教', en: 'Religion', ja: '宗教' },
  entity: { zh: '实体', en: 'Entity', ja: '実体' },
}

const PREFIX_TO_TYPE: Record<string, EntityTypeKey> = {
  civ: 'civilization',
  event: 'event',
  person: 'person',
  loc: 'location',
  tech: 'technology',
  religion: 'religion',
}

function inferEntityType(globalId: string): EntityTypeKey {
  if (!globalId || !globalId.includes(':')) return 'entity'
  const prefix = globalId.split(':')[0]?.split('_')[0]?.toLowerCase()
  return PREFIX_TO_TYPE[prefix] ?? 'entity'
}

function strengthVariant(score: number): 'high' | 'medium' | 'low' {
  if (score >= 0.9) return 'high'
  if (score >= 0.75) return 'medium'
  return 'low'
}

type InterpretationPanelProps = {
  interpretations?: InterpretationViewModel[]
  understandings?: UnderstandingViewModel[]
  title?: string
  onNodeClick?: (globalId: string) => void
  /** 2026-08-13 (PO)：当前实体名，用于「历史意义」标题（如「罗马文明的历史意义」）。 */
  entityName?: string
}

function InterpretationPanel({
  interpretations,
  understandings,
  title,
  onNodeClick,
  entityName = '',
}: InterpretationPanelProps) {
  const { t, locale } = useLocale()
  const hasInterpretations = !!interpretations && interpretations.length > 0
  const hasUnderstandings = !!understandings && understandings.length > 0
  if (!hasInterpretations && !hasUnderstandings) return null

  const resolvedTitle = title ?? t('discover.interpretationTitle')
  const meaningTitle = entityName
    ? t('discover.historicalMeaning', { name: entityName })
    : t('discover.historicalMeaning', { name: '该实体' })

  return (
    <div className="result-section interpretation-panel">
      <h3>{resolvedTitle}</h3>
      {hasInterpretations && (
        <div className="he-interpret-grid">
          {interpretations!.map((item, idx) => {
            const type = inferEntityType(item.global_id)
            const typeLabel = TYPE_LABELS[type][locale] ?? TYPE_LABELS[type].zh
            const pct = Math.round(item.score * 100)
            const variant = strengthVariant(item.score)
            return (
              <div
                className={`he-interpret-card he-interpret-card--${variant}`}
                key={`${item.global_id}-${idx}`}
              >
                <div className="he-interpret-card-top">
                  <span className={`he-interpret-type he-interpret-type--${type}`}>
                    {typeLabel}
                  </span>
                  {onNodeClick ? (
                    <button
                      type="button"
                      className="he-interpret-node is-clickable"
                      data-node={item.global_id}
                      aria-label={t('discover.openAria', { name: item.localName })}
                      onClick={() => onNodeClick(item.global_id)}
                    >
                      {item.localName}
                    </button>
                  ) : (
                    <span className="he-interpret-name">
                      <Icon
                        name={getEntityIcon(entityTypeFromGlobalId(item.global_id)) as IconName}
                        size={16}
                        className="he-interpret-name-icon"
                      />
                      {item.localName}
                    </span>
                  )}
                  <span className="he-interpret-strength" title={t('common.scoreLabel', { n: String(item.score) })}>
                    <span className="he-strength-track">
                      <span
                        className={`he-strength-bar he-strength-bar--${variant}`}
                        style={{ width: `${pct}%` }}
                        aria-hidden="true"
                      />
                    </span>
                    <span className="he-interpret-score">{t('discover.score', { score: String(item.score) })}</span>
                  </span>
                </div>
                {item.explanation && (
                  <p className="he-interpret-why">{item.explanation}</p>
                )}
              </div>
            )
          })}
        </div>
      )}
      {hasUnderstandings && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 16 }}>
          <h4 style={{ fontSize: '0.9rem', color: 'var(--color-ink-500)', fontWeight: 600 }}>
            {meaningTitle}
          </h4>
          <CollapsibleList visible={3}>
            {understandings!.map((u, idx) => (
              <UnderstandingCard
                key={idx}
                before={`${u.actor} 与 ${u.target}`}
                evidence={
                  <>
                    <span style={{ color: 'var(--color-accent)', fontWeight: 600 }}>
                      {u.perspective}
                    </span>
                    {u.timeContext && (
                      <span className="he-meaning-time" style={{ marginLeft: 8, fontSize: '0.75rem', color: 'var(--color-ink-500)' }}>
                        · {t('discover.timeLabel')} {u.timeContext}
                      </span>
                    )}
                  </>
                }
                after={u.meaning}
              />
            ))}
          </CollapsibleList>
        </div>
      )}
    </div>
  )
}

export default InterpretationPanel
