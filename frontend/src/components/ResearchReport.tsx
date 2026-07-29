import type { ResearchDimension } from './ResearchDimensionCard'
import type { AICitation } from '../data/aiClient'
import Icon from './ui/Icon'

export type ResearchReportProps = {
  /** Entity being researched. */
  entityName: string
  /** Entity type for context. */
  entityType: string
  /** Completed research dimensions. */
  dimensions: ResearchDimension[]
  /** Names of comparison entities (multi-entity research). */
  comparedNames?: string[]
}

function uniqueCitations(dims: ResearchDimension[]): AICitation[] {
  const seen = new Set<string>()
  const result: AICitation[] = []
  for (const d of dims) {
    for (const c of d.citations ?? []) {
      if (!seen.has(c.global_id)) {
        seen.add(c.global_id)
        result.push(c)
      }
    }
  }
  return result
}

export function ResearchReportView({ entityName, entityType, dimensions, comparedNames }: ResearchReportProps) {
  const completed = dimensions.filter((d) => d.status === 'success')
  const failed = dimensions.filter((d) => d.status === 'error')
  const allCitations = uniqueCitations(completed)
  const totalCitations = completed.reduce((sum, d) => sum + (d.citations?.length ?? 0), 0)
  const isComparative = !!(comparedNames && comparedNames.length > 0)

  return (
    <div className="rreport">
      <h3 className="rreport-title">
        {isComparative ? '比较研究报告' : '历史研究报告'}
      </h3>

      {/* Topic header */}
      <div className={`rreport-topic${isComparative ? ' rreport-topic--compare' : ''}`}>
        <span className="rreport-topic-type">{entityType}</span>
        <span className="rreport-topic-name">
          {isComparative ? `${entityName} × ${comparedNames!.join(' × ')}` : entityName}
        </span>
      </div>

      {/* Executive Summary */}
      <div className="rreport-section">
        <h4 className="rreport-section-title">研究概要</h4>
        <p className="rreport-summary">
          本研究从 {dimensions.length} 个维度分析了 {entityName}。
          完成 {completed.length} 个维度，{failed.length > 0 ? `失败 ${failed.length} 个维度` : '全部完成'}，
          共引用 {totalCitations} 个经知识图谱验证的事实。
        </p>
      </div>

      {/* Key Findings */}
      {completed.length > 0 && (
        <div className="rreport-section">
          <h4 className="rreport-section-title">关键发现</h4>
          {completed.map((dim) => (
            <div key={dim.id} className="rreport-finding">
              <h5 className="rreport-finding-title">{dim.title}</h5>
              <p className="rreport-finding-text">
                {dim.answer ? dim.answer.slice(0, 300) + (dim.answer.length > 300 ? '…' : '') : ''}
              </p>
              <span className="rreport-finding-citations">
                {(dim.citations?.length ?? 0)} 条引用
                {dim.grounded ? ' · 已验证' : ' · 部分验证'}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Evidence Summary */}
      {allCitations.length > 0 && (
        <div className="rreport-section">
          <h4 className="rreport-section-title">引用证据</h4>
          <p className="rreport-evidence-summary">
            共享 {allCitations.length} 个唯一知识图谱实体作为事实溯源。
          </p>
          <ul className="rreport-citation-list">
            {allCitations.slice(0, 10).map((c, i) => (
              <li key={i} className="rreport-citation-item">
                <span className="rreport-citation-kind">{c.kind}</span>
                <span className="rreport-citation-label">{c.label}</span>
                <span className="rreport-citation-id">{c.global_id}</span>
              </li>
            ))}
            {allCitations.length > 10 && (
              <li className="rreport-citation-item rreport-citation-more">
                …还有 {allCitations.length - 10} 条引用
              </li>
            )}
          </ul>
        </div>
      )}

      {/* Dimension Coverage */}
      <div className="rreport-section">
        <h4 className="rreport-section-title">维度覆盖</h4>
        <div className="rreport-coverage">
          {dimensions.map((dim) => (
            <span
              key={dim.id}
              className={`rreport-coverage-item rreport-coverage--${dim.status}`}
            >
              {dim.status === 'success' ? (
                <Icon name="check" size={16} />
              ) : dim.status === 'error' ? (
                <Icon name="cross" size={16} />
              ) : (
                <Icon name="circle" size={16} />
              )}
              {' '}{dim.title}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

export default ResearchReportView
