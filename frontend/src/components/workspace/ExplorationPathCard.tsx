// ============================================================
// M59-020 — ExplorationPathCard
// Shows the user's exploration journey as a path.
// "你的历史旅程" — not "browse history".
// ============================================================

interface ExplorationPathCardProps {
  path: string[]
}

export function ExplorationPathCard({ path }: ExplorationPathCardProps) {
  if (path.length === 0) return null

  return (
    <div className="epc">
      <span className="epc-label">探索路径</span>
      <div className="epc-steps">
        {path.map((name, i) => (
          <span key={i} className="epc-step">
            {i > 0 && <span className="epc-arrow">↓</span>}
            <span className="epc-name">{name}</span>
          </span>
        ))}
      </div>
    </div>
  )
}

export default ExplorationPathCard
