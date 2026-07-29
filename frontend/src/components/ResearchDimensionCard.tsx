import type { AICitation } from '../data/aiClient'
import GroundedAnswer from './GroundedAnswer'
import CitationList from './CitationList'
import Icon from './ui/Icon'

export type DimensionStatus = 'idle' | 'loading' | 'success' | 'error'

export type ResearchDimension = {
  id: string
  title: string
  question: string
  status: DimensionStatus
  answer?: string
  citations?: AICitation[]
  rejected_citations?: AICitation[]
  grounded?: boolean
  engine?: string
  error?: string
}

export type ResearchDimensionCardProps = {
  dimension: ResearchDimension
}

export function ResearchDimensionCardView({ dimension }: ResearchDimensionCardProps) {
  return (
    <div className={`rdc-card rdc-card--${dimension.status}`}>
      <h4 className="rdc-title">{dimension.title}</h4>
      <p className="rdc-question">{dimension.question}</p>

      {dimension.status === 'idle' && (
        <p className="rdc-idle">等待研究开始…</p>
      )}

      {dimension.status === 'loading' && (
        <p className="rdc-loading" role="status">
          正在分析{dimension.title}维度…
        </p>
      )}

      {dimension.status === 'error' && (
        <p className="rdc-error" role="alert">
          分析失败：{dimension.error || '未知错误'}
        </p>
      )}

      {dimension.status === 'success' && dimension.answer && (
        <div className="rdc-answer">
          {dimension.grounded !== undefined && (
            <span className={`rdc-grounded-badge ${dimension.grounded ? 'rdc-grounded-true' : 'rdc-grounded-false'}`}>
              {dimension.grounded ? (
                <><Icon name="check" size={16} /> 已验证</>
              ) : (
                <><Icon name="warning" size={16} /> 部分验证</>
              )}
            </span>
          )}
          {dimension.citations && dimension.citations.length > 0 && (
            <span className="rdc-citation-count">
              {dimension.citations.length} 条引用
            </span>
          )}
          <GroundedAnswer
            response={{
              answer: dimension.answer,
              citations: dimension.citations ?? [],
              rejected_citations: dimension.rejected_citations ?? [],
              grounded: dimension.grounded ?? true,
              engine: (dimension.engine as 'ai') ?? 'ai',
              question: dimension.question,
              context_global_ids: [],
              mode: 'explain',
            }}
          />
          {dimension.citations && dimension.citations.length > 0 && (
            <CitationList
              citations={dimension.citations}
              rejected_citations={dimension.rejected_citations}
            />
          )}
        </div>
      )}
    </div>
  )
}

export default ResearchDimensionCardView
