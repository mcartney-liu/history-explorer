import { useLocale } from '../data/locale'
import { getRelationshipLabel } from '../data/entity/entityLabels'

export type ConnectionItem = {
  type: string
  name: string
}

type ConnectionsPanelProps = {
  connections: ConnectionItem[]
}

function ConnectionsPanel({ connections }: ConnectionsPanelProps) {
  const { t, locale } = useLocale()
  return (
    <div className="result-section">
      <h3>{t('common.connectionsHeading')}</h3>
      {connections.length > 0 ? (
        <ul className="connections-list">
          {connections.map((item, idx) => (
            <li key={idx}>
              <span className="conn-type">{getRelationshipLabel(item.type, locale)}</span>
              <span className="conn-name">{item.name}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="empty">{t('common.connectionsEmpty')}</p>
      )}
    </div>
  )
}

export default ConnectionsPanel
