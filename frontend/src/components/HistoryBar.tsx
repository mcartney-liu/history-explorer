// History navigation bar (M2-003, requirement 2).
// Browser-style Back / Forward over the app's own exploration history
// (not the URL). Buttons disable themselves when there is nowhere to go.
// Pure presentational component; App owns the handlers.
import { useLocale } from '../data/locale'

type HistoryBarProps = {
  canBack: boolean
  canForward: boolean
  onBack: () => void
  onForward: () => void
}

function HistoryBar({ canBack, canForward, onBack, onForward }: HistoryBarProps) {
  const { t } = useLocale()
  return (
    <div className="he-history-bar" role="group" aria-label={t('common.historyNavAria')}>
      <button
        type="button"
        className="he-history-btn"
        onClick={onBack}
        disabled={!canBack}
        aria-label={t('common.goBackAria')}
      >
        {t('common.back')}
      </button>
      <button
        type="button"
        className="he-history-btn"
        onClick={onForward}
        disabled={!canForward}
        aria-label={t('common.goForwardAria')}
      >
        {t('common.forward')}
      </button>
    </div>
  )
}

export default HistoryBar
