// Entity Exploration Guide (M5-A-5), 重构为 A4 一行轻量认知提示。
//
// A4 (ADR-0025): 原本是一张大卡（标题 + 引导语 + 多张 starter 卡）。
// 重构后压成一行轻提示：「接下来可以了解：{starter} → {starter} → …」，
// 不再占视觉权重。无 starters 时整卡不渲染（silent，P4），不再出现空态大卡。
//
// 与 FirstExplorationGuide（主题版）共用 .he-guide* class 族的视觉基底，
// 但本组件用 .he-guide--lite 修饰符走一行布局，互不影响。
//
// 设计纪律（同 M5-A-4 / FirstExplorationGuide）：
//  - No fetch, no localStorage, no navigation logic, no AI/LLM。
//  - 接收 `starters` 已由 App 从 data/explorationStarters.ts 解析（只读消费）。
//  - 点击 starter 调用 onStarterClick(item.target)，App 接到同一 navigateTo。
//  - 本地 `dismissed` 仅隐藏本次会话提示，不写存储。

import { Fragment, useState } from 'react'
import { useLocale } from '../data/locale'
import { usePreferences, getDisplayName } from '../lib/preferences'
import type { NavNode } from './navigation'
import type { StarterItem } from '../data/explorationStarters'

type EntityExplorationGuideProps = {
  entityId: string
  starters: StarterItem[]
  onStarterClick: (target: NavNode) => void
}

function EntityExplorationGuide({
  entityId,
  starters,
  onStarterClick,
}: EntityExplorationGuideProps) {
  const [dismissed, setDismissed] = useState(false)
  const { t, locale } = useLocale()
  const [prefs] = usePreferences()

  // A4 (ADR-0025): 无 starters → 整卡不渲染（silent，P4 / ADR-0025）。
  // 改掉原先"空态仍渲染 heading+intro 大卡"的行为。
  if (dismissed || starters.length === 0) return null

  return (
    <section className="he-guide he-guide--lite" aria-label={t('discover.guideEntityAria')} data-entity={entityId}>
      <span className="he-guide-lite-hint">{t('discover.nextCanExplore')}</span>
      <span className="he-guide-lite-items">
        {starters.map((s, i) => (
          <Fragment key={s.id}>
            {i > 0 && <span className="he-guide-lite-arrow">→</span>}
            <button
              type="button"
              className="he-guide-lite-chip"
              data-starter={s.id}
              aria-label={t('discover.exploreStarterAria', {
                label: getDisplayName(s.label, locale, prefs.properNameMode),
              })}
              onClick={() => onStarterClick(s.target)}
            >
              {getDisplayName(s.label, locale, prefs.properNameMode)}
            </button>
          </Fragment>
        ))}
      </span>
      <button
        type="button"
        className="he-guide-dismiss"
        aria-label={t('discover.dismissAria')}
        onClick={() => setDismissed(true)}
      >
        &times;
      </button>
    </section>
  )
}

export default EntityExplorationGuide
