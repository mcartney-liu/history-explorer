// P5-S4 — Civilization Understanding Seeds（文明问题入口）
//
// 三个"为什么"问题种子，供「研究」tab 使用（提问式探索）。
// 原定义在 DiscoverPage（M85.9），随"了解/研究对调"抽出为共享组件：
//   - 研究 tab（LandingPage）渲染它，作为提问式探索入口
//   - 每个 seed 点击 → onCausalObjectClick(entryObjectId) 进入因果对象
// 文案 key 仍走 discover.seed.* 命名空间（扁平 map，任何 tab 都可 t()）。

import type { CSSProperties } from 'react'
import { useLocale } from '../../data/locale'
import { Icon, type IconName } from '../ui/Icon'

const UNDERSTANDING_SEEDS = [
  {
    id: 'institutional_evolution',
    qKey: 'discover.seed.q1',
    rKey: 'discover.seed.r1',
    pKey: 'discover.seed.p1',
    entryObjectId: 'co-004',
  },
  {
    id: 'civilization_contrast',
    qKey: 'discover.seed.q2',
    rKey: 'discover.seed.r2',
    pKey: 'discover.seed.p2',
    entryObjectId: 'co-009',
  },
  {
    id: 'technological_chain',
    qKey: 'discover.seed.q3',
    rKey: 'discover.seed.r3',
    pKey: 'discover.seed.p3',
    entryObjectId: 'co-008',
  },
]

// 每个 seed 对应的图标（VS-01：仅用 Lucide 锁定图标，禁 emoji）
const SEED_ICON: Record<string, IconName> = {
  institutional_evolution: 'civilization',
  civilization_contrast: 'globe',
  technological_chain: 'idea',
}

// 文明编码色（参照 UI Polish 表 #4）：按 seed 个性化左边框/图标/外发光
const SEED_ACCENT: Record<string, string> = {
  institutional_evolution: '#1E4F7D', // 石青/深蓝
  civilization_contrast: '#A67C52', // 古铜
  technological_chain: '#5E8B7E', // 苔绿（区分第三类）
}

export function UnderstandingSeeds({
  onCausalObjectClick,
}: {
  onCausalObjectClick: (objectId: string) => void
}) {
  const { t } = useLocale()
  return (
    <div className="discover-understanding-seeds">
      <h3 className="discover-section-heading">{t('discover.seedHeading')}</h3>
      <p className="discover-section-sub">
        {t('discover.seedIntro')}
      </p>
      <div className="discover-seeds-grid">
        {UNDERSTANDING_SEEDS.map((seed) => (
          <button
            key={seed.id}
            type="button"
            className="discover-seed-card"
            style={{ '--seed-accent': SEED_ACCENT[seed.id] } as CSSProperties}
            onClick={() => onCausalObjectClick(seed.entryObjectId)}
          >
            <span className="discover-seed-icon" aria-hidden="true">
              <Icon name={SEED_ICON[seed.id] ?? 'book'} size={24} />
            </span>
            <span className="discover-seed-question">{t(seed.qKey)}</span>
            <span className="discover-seed-relation">{t(seed.rKey)}</span>
            <span className="discover-seed-path">{t(seed.pKey)}</span>
            <span className="discover-seed-cta">{t('discover.seedCta')}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

export default UnderstandingSeeds
