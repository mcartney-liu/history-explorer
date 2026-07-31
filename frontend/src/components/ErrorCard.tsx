// Unified error card (M2-003, requirement 8).
// One presentation for every failure mode: 404 (entity not found), network
// failure, and parse/response failure. The caller passes a kind so the copy
// stays accurate, but the visual treatment is always the same.
// M74 Phase1 (C3): + 'invalid' — backend rejected the topic format (400,
// TOPIC_PATTERN). Previously folded into 'network', which misled users into
// checking the backend while it was online.
import { useLocale } from '../data/locale'

export type ErrorKind = 'notfound' | 'network' | 'parse' | 'invalid'

type ErrorCardProps = {
  kind: ErrorKind
  onRetry?: () => void
}

const COPY: Record<ErrorKind, { titleKey: string; messageKey: string }> = {
  notfound: { titleKey: 'error.notFoundTitle', messageKey: 'error.notFoundMessage' },
  network: { titleKey: 'error.networkTitle', messageKey: 'error.networkMessage' },
  parse: { titleKey: 'error.parseTitle', messageKey: 'error.parseMessage' },
  invalid: { titleKey: 'error.invalidTopicTitle', messageKey: 'error.invalidTopicMessage' },
}

function ErrorCard({ kind, onRetry }: ErrorCardProps) {
  const { t } = useLocale()
  const copy = COPY[kind]
  return (
    <div className="he-error-card" role="alert">
      <h3 className="he-error-title">{t(copy.titleKey)}</h3>
      <p className="he-error-message">{t(copy.messageKey)}</p>
      {onRetry && (
        <button className="explore-button he-error-retry" type="button" onClick={onRetry}>
          {t('common.retry')}
        </button>
      )}
    </div>
  )
}

export default ErrorCard
