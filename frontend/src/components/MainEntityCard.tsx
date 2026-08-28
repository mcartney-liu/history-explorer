import { useState } from 'react'
import { useLocale } from '../data/locale'
import { usePreferences, getDisplayName } from '../lib/preferences'
import { getEntityLabel, getEntityIcon, entityImageUrl } from '../data/entity/entityLabels'
import { Icon } from '../components/ui/Icon'
import type { IconName } from '../components/ui/Icon'

export type MainEntity = {
  id: string
  type: string
  name: string
  description: string
  global_id?: string
}

type MainEntityCardProps = {
  mainEntity: MainEntity
}

function MainEntityCard({ mainEntity }: MainEntityCardProps) {
  if (!mainEntity?.id) {
    return null
  }
  const { t, locale } = useLocale()
  const [prefs] = usePreferences()
  const [imgFailed, setImgFailed] = useState(false)
  const imgSrc = entityImageUrl(mainEntity.global_id)

  return (
    <div className="result-section">
      <h3>{t('entity.mainEntity')}</h3>
      <div className="main-entity">
        {imgSrc && !imgFailed ? (
          <img src={imgSrc} alt={mainEntity.name} className="me-thumb" onError={() => setImgFailed(true)} />
        ) : (
          <Icon name={getEntityIcon(mainEntity.type) as IconName} size={16} className="me-name-icon" />
        )}
        <span className="me-name">{getDisplayName(mainEntity.name, locale, prefs.properNameMode)}</span>
        <span className="me-type">{getEntityLabel(mainEntity.type, locale)}</span>
        <p className="me-desc">{mainEntity.description}</p>
      </div>
    </div>
  )
}

export default MainEntityCard
