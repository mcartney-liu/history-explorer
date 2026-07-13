export type ConnectionItem = {
  type: string
  name: string
}

type ConnectionsPanelProps = {
  connections: ConnectionItem[]
}

function ConnectionsPanel({ connections }: ConnectionsPanelProps) {
  return (
    <div className="result-section">
      <h3>Connections</h3>
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
        <p className="empty">No connections.</p>
      )}
    </div>
  )
}

export default ConnectionsPanel
