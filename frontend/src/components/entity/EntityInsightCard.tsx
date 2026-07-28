// ============================================================
// M59-019 — EntityInsightCard
// Shows a historical insight summary for the current entity.
// Data source: EntityInsightModel.buildInsight(entity).
// Future: wire to AIOrchestrator for AI-generated insights.
// ============================================================

interface EntityInsightCardProps {
  insight: string
  onAskMore?: () => void
}

export function EntityInsightCard({ insight, onAskMore }: EntityInsightCardProps) {
  return (
    <div className="eic">
      <div className="eic-header">
        <span className="eic-label">历史洞察</span>
      </div>
      <p className="eic-text">{insight}</p>
      {onAskMore && (
        <button type="button" className="eic-ask" onClick={onAskMore}>
          💬 深入询问
        </button>
      )}
    </div>
  )
}

export default EntityInsightCard
