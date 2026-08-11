// ============================================================
// P5-S5 — UnderstandingOverview
//
// 理解视角（四视角之一）：把用户在「当前主题」走过的路、形成的
// 画像汇总展示。复用 ResearchInsights 画像引擎（与「我的」tab
// 同源）——画像驱动，任何主题/实体都有内容，不依赖预置数据。
//
// Design notes:
//   - signals 是 App 的只读镜像（discoverSignals），不参与推荐。
//   - 空态给引导（先探索再回来看），不写死流程。
// ============================================================

import { useMemo } from 'react'
import { useLocale } from '../../data/locale'
import { generateBehavioralInterestProfile } from '../../data/ResearchInsights'
import type { BehavioralSignals } from '../../data/ResearchInsights'

interface UnderstandingOverviewProps {
  /** 用户行为信号（App 的 discoverSignals，只读镜像）。 */
  signals: BehavioralSignals
  /** 当前主题标题（语境文案用）。 */
  topicTitle: string
}

export function UnderstandingOverview({ signals, topicTitle }: UnderstandingOverviewProps) {
  const { t } = useLocale()
  const mirror = useMemo(() => generateBehavioralInterestProfile(signals), [signals])

  const footprints = (signals.navTitles ?? []).slice(-4).reverse()
  const focusThemes = mirror.topThemes.slice(0, 4)
  const dimensions = mirror.topDimensions.slice(0, 4).map((d) => d.dimension)

  if (footprints.length === 0 && focusThemes.length === 0) {
    return (
      <div className="discover-understanding discover-understanding--empty">
        <h3 className="discover-section-heading">{t('understand.emptyTitle')}</h3>
        <p className="discover-section-sub">{t('understand.emptyDesc', { topic: topicTitle })}</p>
      </div>
    )
  }

  return (
    <div className="discover-understanding">
      <div className="discover-understanding-head">
        <h3 className="discover-section-heading">{t('understand.title', { topic: topicTitle })}</h3>
        <p className="discover-section-sub">{t('understand.sub')}</p>
      </div>

      {footprints.length > 0 && (
        <div className="discover-understanding-block">
          <span className="discover-understanding-label">{t('understand.footprints')}</span>
          <ul className="discover-understanding-list">
            {footprints.map((f, i) => (
              <li key={`${f}-${i}`}>{f}</li>
            ))}
          </ul>
        </div>
      )}

      {focusThemes.length > 0 && (
        <div className="discover-understanding-block">
          <span className="discover-understanding-label">{t('understand.focus')}</span>
          <div className="discover-understanding-tags">
            {focusThemes.map((th) => (
              <span key={th} className="discover-understanding-tag">{th}</span>
            ))}
          </div>
        </div>
      )}

      {dimensions.length > 0 && (
        <div className="discover-understanding-block">
          <span className="discover-understanding-label">{t('understand.dimensions')}</span>
          <div className="discover-understanding-tags">
            {dimensions.map((d) => (
              <span key={d} className="discover-understanding-tag">{t(d)}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default UnderstandingOverview
