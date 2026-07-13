export type MainEntity = {
  id: string
  type: string
  name: string
  description: string
}

type MainEntityCardProps = {
  mainEntity: MainEntity
}

function MainEntityCard({ mainEntity }: MainEntityCardProps) {
  if (!mainEntity?.id) {
    return null
  }

  return (
    <div className="result-section">
      <h3>Main Entity</h3>
      <div className="main-entity">
        <span className="me-name">{mainEntity.name}</span>
        <span className="me-type">{mainEntity.type}</span>
        <p className="me-desc">{mainEntity.description}</p>
      </div>
    </div>
  )
}

export default MainEntityCard
