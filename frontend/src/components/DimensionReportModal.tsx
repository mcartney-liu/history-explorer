import { useEffect } from 'react'
import type { ResearchDimension } from './ResearchDimensionCard'
import GroundedAnswer from './GroundedAnswer'
import CitationList from './CitationList'
import Icon from './ui/Icon'

export type DimensionReportModalProps = {
  /** 单点研究的维度（已 success，含答案与引用）。 */
  dimension: ResearchDimension
  /** 关闭弹窗。 */
  onClose: () => void
}

/** P-U05：单点研究报告弹层小窗口（非新页面、不走路由）。
 *  仅单点研究用 modal；批量四个仍走卡片折叠展开。 */
export default function DimensionReportModal({ dimension, onClose }: DimensionReportModalProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="dim-modal-overlay" onClick={onClose} role="presentation">
      <div
        className="dim-modal"
        role="dialog"
        aria-modal="true"
        aria-label={`${dimension.title} · 研究报告`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="dim-modal-header">
          <div className="dim-modal-title-wrap">
            <span className="dim-modal-title">{dimension.title}</span>
            <span className="dim-modal-question">{dimension.question}</span>
          </div>
          <button type="button" className="dim-modal-close" onClick={onClose} aria-label="关闭">
            <Icon name="cross" size={20} />
          </button>
        </div>
        <div className="dim-modal-body">
          {dimension.grounded !== undefined && (
            <span className={`rdc-grounded-badge ${dimension.grounded ? 'rdc-grounded-true' : 'rdc-grounded-false'}`}>
              {dimension.grounded ? (
                <><Icon name="check" size={16} /> 已验证</>
              ) : (
                <><Icon name="warning" size={16} /> 部分验证</>
              )}
            </span>
          )}
          <GroundedAnswer
            response={{
              answer: dimension.answer ?? '',
              citations: dimension.citations ?? [],
              rejected_citations: dimension.rejected_citations ?? [],
              grounded: dimension.grounded ?? true,
              engine: (dimension.engine as 'ai') ?? 'ai',
              question: dimension.question,
              context_global_ids: [],
              mode: 'explain',
            }}
          />
          {((dimension.citations?.length ?? 0) + (dimension.rejected_citations?.length ?? 0)) > 0 && (
            <CitationList
              citations={dimension.citations ?? []}
              rejected_citations={dimension.rejected_citations ?? []}
            />
          )}
        </div>
      </div>
    </div>
  )
}
