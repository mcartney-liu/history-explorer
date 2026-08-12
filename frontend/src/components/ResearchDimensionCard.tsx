import { useState } from 'react'
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
  /** per-dimension key → optional artwork at assets/research/<key>.<ext> */
  dimKey?: string
}

/** 2026-08-13 (PO)：维度 key → 图标映射（政治/军事/经济/文化 logo）。 */
const DIM_ICONS: Record<string, 'politics' | 'military' | 'economy' | 'culture' | 'event'> = {
  politics: 'politics',
  military: 'military',
  economy: 'economy',
  culture: 'culture',
  background: 'politics',
  process: 'military',
  impact: 'economy',
  significance: 'culture',
  life: 'politics',
  contribution: 'military',
  influence: 'economy',
  evaluation: 'culture',
  origin: 'culture',
  doctrine: 'politics',
  spread: 'economy',
  civilization: 'culture',
  invention: 'military',
  principle: 'politics',
  application: 'economy',
  'tech-impact': 'culture',
  geography: 'economy',
  strategy: 'military',
  events: 'event',
  connection: 'economy',
  'idea-origin': 'politics',
  meaning: 'culture',
  'idea-spread': 'economy',
  modern: 'politics',
}

export function ResearchDimensionCardView({ dimension, dimKey }: ResearchDimensionCardProps) {
  const [imgOk, setImgOk] = useState(true)
  const [fmt, setFmt] = useState(0)
  const formats = ['webp', 'png', 'jpg', 'jpeg']
  const showImg = !!dimKey && imgOk && fmt < formats.length
  const imgSrc = showImg
    ? `${import.meta.env.BASE_URL}assets/research/${dimKey}.${formats[fmt]}`
    : ''
  const dimIcon = (dimKey && DIM_ICONS[dimKey]) || undefined
  return (
    <div className={`rdc-card rdc-card--${dimension.status}${showImg ? ' has-art' : ''}`}>
      {showImg && (
        <img
          className="rdc-art"
          src={imgSrc}
          alt=""
          aria-hidden="true"
          onError={() => {
            if (fmt < formats.length - 1) setFmt(fmt + 1)
            else setImgOk(false)
          }}
        />
      )}
      {dimIcon && (
        <span className="rdc-logo" aria-hidden="true">
          <Icon name={dimIcon} size={24} />
        </span>
      )}
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
          {((dimension.citations?.length ?? 0) + (dimension.rejected_citations?.length ?? 0)) > 0 && (
            <CitationList
              citations={dimension.citations ?? []}
              rejected_citations={dimension.rejected_citations ?? []}
            />
          )}
        </div>
      )}
    </div>
  )
}

export default ResearchDimensionCardView
