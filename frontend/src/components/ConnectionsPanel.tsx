import { useLocale } from '../data/locale'

export type ConnectionItem = {
  type: string
  name: string
}

type ConnectionsPanelProps = {
  connections: ConnectionItem[]
}

function ConnectionsPanel({ connections }: ConnectionsPanelProps) {
  const { t } = useLocale()
  return (
    <div className="result-section">
      <h3>{t('common.connectionsHeading')}</h3>
      {connections.length > 0 ? (
        <ul className="connections-list">
          {connections.map((item, idx) => (
            <li key={idx}>
              <span className="conn-type">{item.type}</span>
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
