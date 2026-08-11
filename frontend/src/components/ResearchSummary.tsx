import { useState } from 'react'
import { explainAI, type AICitation } from '../data/aiClient'
import GroundedAnswer from './GroundedAnswer'
import CitationList from './CitationList'
import type { ResearchDimension } from './ResearchDimensionCard'

export type ResearchSummaryProps = {
  entityName: string
  entityType: string
  entityGlobalId: string
  dimensions: ResearchDimension[]
  /** Names of comparison entities (multi-entity research). */
  comparedNames?: string[]
}

type SummaryStatus = 'pending' | 'loading' | 'success' | 'error'

function buildSummaryContext(dimensions: ResearchDimension[]): string {
  const completed = dimensions.filter((d) => d.status === 'success')
  return completed
    .map((d, i) => `${i + 1}. ${d.title}：${d.answer?.slice(0, 500) ?? ''}`)
    .join('\n\n')
}

function uniqueCitations(dimensions: ResearchDimension[]): AICitation[] {
  const seen = new Set<string>()
  const result: AICitation[] = []
  for (const d of dimensions) {
    for (const c of d.citations ?? []) {
      if (!seen.has(c.global_id)) {
        seen.add(c.global_id)
        result.push(c)
      }
    }
  }
  return result
}

export function ResearchSummaryView({
  entityName,
  entityType,
  dimensions,
  // Stateful props for testability
  status = 'pending' as SummaryStatus,
  answer = '',
  citations = [] as AICitation[],
  rejected_citations = [] as AICitation[],
  grounded = true,
  error = '',
  comparedNames,
}: ResearchSummaryProps & {
  status?: SummaryStatus
  answer?: string
  citations?: AICitation[]
  rejected_citations?: AICitation[]
  grounded?: boolean
  error?: string
}) {
  const completedCount = dimensions.filter((d) => d.status === 'success').length
  const allCitations = uniqueCitations(dimensions)
  const isComparative = !!(comparedNames && comparedNames.length > 0)

  return (
    <div className="rsummary">
      <div className={`rsummary-header${isComparative ? ' rsummary-header--compare' : ''}`}>
        <h3 className="rsummary-title">
          {isComparative ? '比较研究综述' : '研究综述'}
        </h3>
        <span className="rsummary-context">
          {isComparative
            ? `${entityName} vs ${comparedNames!.join(' vs ')}`
            : `${entityType} · ${entityName}`}
        </span>
      </div>

      {/* Loading */}
      {status === 'loading' && (
        <p className="rsummary-loading" role="status">
          正在从已完成维度中提炼跨维度综合分析…
        </p>
      )}

      {/* Error fallback */}
      {status === 'error' && (
        <div className="rsummary-error" role="alert">
          <p className="rsummary-error-title">维度研究完成，综合分析暂不可用</p>
          <p className="rsummary-error-detail">
            {error || 'AI 综合调用失败，但各维度独立分析已保存，可继续查看。'}
          </p>
        </div>
      )}

      {/* Success */}
      {status === 'success' && answer && (
        <div className="rsummary-content">
          <span className="rsummary-badge">
            基于 {completedCount} 个已验证研究维度
          </span>

          <GroundedAnswer
            response={{
              answer,
              citations,
              rejected_citations,
              grounded,
              engine: 'ai',
              question: `关于${entityName}的跨维度综合分析`,
              context_global_ids: [],
              mode: 'explain',
            }}
          />

          {(citations.length + rejected_citations.length) > 0 && (
            <CitationList
              citations={citations}
              rejected_citations={rejected_citations}
            />
          )}

          <div className="rsummary-evidences">
            <h4 className="rsummary-evidences-title">
              维度引用证据 ({allCitations.length} 个唯一实体)
            </h4>
            <ul className="rsummary-evidences-list">
              {allCitations.slice(0, 8).map((c, i) => (
                <li key={i}>
                  <span className="rsummary-evid-kind">{c.kind}</span>
                  {c.label}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}

export default function ResearchSummary(props: ResearchSummaryProps) {
  const [status, setStatus] = useState<SummaryStatus>('pending')
  const [answer, setAnswer] = useState('')
  const [citations, setCitations] = useState<AICitation[]>([])
  const [rejected, setRejected] = useState<AICitation[]>([])
  const [grounded, setGrounded] = useState(true)
  const [error, setError] = useState('')

  // Start summary generation when component mounts with completed dimensions
  useState(() => {
    const completed = props.dimensions.filter((d) => d.status === 'success')
    if (completed.length === 0) return

    setStatus('loading')
    const context = buildSummaryContext(completed)
    const question = `请基于以下${completed.length}个维度的历史研究，提炼跨维度主题、维度间的关联，以及综合分析结论：\n\n${context}`

    explainAI(question, [props.entityGlobalId])
      .then((res) => {
        setAnswer(res.answer)
        setCitations(res.citations)
        setRejected(res.rejected_citations ?? [])
        setGrounded(res.grounded)
        setStatus('success')
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : 'AI 调用失败')
        setStatus('error')
      })
  })

  return (
    <ResearchSummaryView
      {...props}
      status={status}
      answer={answer}
      citations={citations}
      rejected_citations={rejected}
      grounded={grounded}
      error={error}
    />
  )
}
