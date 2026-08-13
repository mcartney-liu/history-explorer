import { useState } from 'react'
import type { AICitation } from '../data/aiClient'
import GroundedAnswer from './GroundedAnswer'
import CitationList from './CitationList'
import Icon from './ui/Icon'
import { slotImageFocus } from '../data/contentRuntime'

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
  /** per-dimension key → optional artwork at assets/research/<key>.<ext> (bundle fallback). */
  dimKey?: string
  /** P-U03：单点「研究 / 重研」回调（传 dimKey，由容器映射回维度）。 */
  onResearch?: (dimKey: string) => void
  /** P-U04 纠偏：点「查看报告」弹 modal（容器接管），不再内联展开。 */
  onViewReport?: (dimKey: string) => void
  /** P-U10：后台（admin）上传的维度图 URL（slotImageName+mediaUrl 解析），优先于本地 bundle。 */
  artSrc?: string | null
  /** P-U09：受控内联展开（仅「全部展开」驱动）；false 时正文不渲染，点「查看报告」弹 modal。 */
  externalExpand?: boolean
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

export function ResearchDimensionCardView({
  dimension,
  dimKey,
  onResearch,
  onViewReport,
  artSrc,
  externalExpand = false,
}: ResearchDimensionCardProps) {
  const [phase, setPhase] = useState(0)
  // P-U10：优先后台上传图（artSrc），缺失时回退本地 bundle（assets/research/<key>.<ext>），
  // 与 idle 态 ResearchDimCard 同源，确保研究完成后背景图不消失。
  const formats = ['webp', 'png', 'jpg', 'jpeg']
  const hasConfigured = !!artSrc
  const maxPhase = formats.length + (hasConfigured ? 1 : 0)
  const withinPhase = phase < maxPhase
  let imgSrc = ''
  if (withinPhase) {
    if (hasConfigured && phase === 0) {
      imgSrc = artSrc as string
    } else if (dimKey) {
      const fIdx = hasConfigured ? phase - 1 : phase
      imgSrc = `${import.meta.env.BASE_URL}assets/research/${dimKey}.${formats[fIdx]}`
    }
  }
  const showImg = withinPhase && imgSrc !== ''
  // P-U14：复用 idle 态的图片焦点（slotImageFocus），让研究后卡片裁切位置与
  // 研究前（ResearchDimCard）一致，避免“图歪/变弯”。
  const focus = dimKey ? slotImageFocus(`research_dims.${dimKey}`) : null
  const dimIcon = (dimKey && DIM_ICONS[dimKey]) || undefined
  return (
    <div className={`rdc-card rdc-card--${dimension.status}${showImg ? ' has-art' : ''}`}>
      {showImg && (
        <img
          className="rdc-art"
          src={imgSrc}
          alt=""
          aria-hidden="true"
          style={focus ? { objectPosition: focus } : undefined}
          onError={() => setPhase((p) => p + 1)}
        />
      )}
      {dimIcon && (
        <span className="rdc-logo" aria-hidden="true">
          <Icon name={dimIcon} size={24} />
        </span>
      )}
      <h4 className="rdc-title">{dimension.title}</h4>
      <p className="rdc-question">{dimension.question}</p>

      {/* P-U03：单点「研究 / 重研」按钮（容器传入回调才显示） */}
      {(dimension.status === 'success' || dimension.status === 'error') && onResearch && (
        <button
          type="button"
          className="rdc-research-btn rdc-research-btn--re"
          onClick={() => onResearch(dimKey ?? dimension.id)}
        >
          重研
        </button>
      )}

      {dimension.status === 'idle' && (
        onResearch ? (
          <button
            type="button"
            className="rdc-research-btn"
            onClick={() => onResearch(dimKey ?? dimension.id)}
          >
            研究
          </button>
        ) : (
          <p className="rdc-idle">等待研究开始…</p>
        )
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
          {/* P-U04 纠偏：点「查看报告」弹 modal（容器接管 onViewReport）；
              内联正文仅由 externalExpand 受控（仅「全部展开」驱动）。 */}
          <button
            type="button"
            className="rdc-toggle-report"
            onClick={() => onViewReport?.(dimKey ?? dimension.id)}
          >
            查看报告
          </button>
          {externalExpand && (
            <div className="rdc-answer-body">
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
      )}
    </div>
  )
}

export default ResearchDimensionCardView
