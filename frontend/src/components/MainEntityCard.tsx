import { useLocale } from '../data/locale'
import { usePreferences, getDisplayName } from '../lib/preferences'
import { getEntityLabel } from '../data/entity/entityLabels'

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

  return (
    <div className="result-section">
      <h3>{t('entity.mainEntity')}</h3>
      <div className="main-entity">
        <span className="me-name">{getDisplayName(mainEntity.name, locale, prefs.properNameMode)}</span>
        <span className="me-type">{getEntityLabel(mainEntity.type, locale)}</span>
        <p className="me-desc">{mainEntity.description}</p>
      </div>
    </div>
  )
}

export default MainEntityCard
