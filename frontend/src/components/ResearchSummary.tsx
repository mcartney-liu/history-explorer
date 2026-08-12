import { useState, useMemo } from 'react'
import { explainAI, type AICitation, type AIEngine } from '../data/aiClient'
import GroundedAnswer from './GroundedAnswer'
import { humanizeAnswer } from './GroundedAnswer'
import CitationList from './CitationList'
import Icon from './ui/Icon'
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

// ─────────────────────────────────────────────────────────────────────────
// 本地综评兜底（无 LLM）：用已完成的各维度答案，拼出一篇跨维度中文综评。
// 当 AI 综述返回兜底占位 / 空串 / engine=deterministic 时启用，确保研究中评
// 永远有保底的真实内容，而不是英文占位句。
// ─────────────────────────────────────────────────────────────────────────
const FALLBACK_MARKERS = ['interpretation layer', 'currently unavailable']

/** 判断一段文本是否为 AI 不可用时的兜底占位。 */
export function isResearchFallback(text: string | undefined): boolean {
  if (!text || !text.trim()) return true
  const t = text.toLowerCase()
  return FALLBACK_MARKERS.some((m) => t.includes(m))
}

/** 仅保留「成功且答案非空且非兜底」的维度。 */
function validDimensions(dimensions: ResearchDimension[]): ResearchDimension[] {
  return dimensions.filter(
    (d) => d.status === 'success' && d.answer && !isResearchFallback(d.answer),
  )
}

/** 取答案片段，过长截断并补省略号。经 humanizeAnswer 清洗 JSON artifact。 */
function excerpt(text: string | undefined, max = 130): string {
  const flat = humanizeAnswer(text ?? '').replace(/\s+/g, ' ').trim()
  if (flat.length <= max) return flat
  return flat.slice(0, max).replace(/[，。、；：,.;:\s]+$/, '') + '…'
}

export type SyntheticSummary = {
  valid: { title: string; finding: string }[]
  theme: string
  conclusion: string
}

/** 由已完成维度答案本地拼出跨维度综评视图模型（不依赖 LLM）。 */
export function buildSyntheticSummary(
  dimensions: ResearchDimension[],
  entityName: string,
  entityType: string,
  comparedNames?: string[],
): SyntheticSummary | null {
  const valid = validDimensions(dimensions)
  if (valid.length === 0) return null
  const comparePrefix =
    comparedNames && comparedNames.length > 0
      ? `${entityName} 与 ${comparedNames.join('、')} 的比较研究中，`
      : ''
  const points = valid.map((d) => `「${d.title}」维度：${excerpt(d.answer, 90)}`)
  const theme =
    `${comparePrefix}围绕《${entityName}》的${entityType}研究，已从 ${valid.length} 个维度完成独立分析。` +
    points.join(' ')
  const conclusion =
    `${comparePrefix}综合上述 ${valid.length} 个维度的独立分析，《${entityName}》` +
    `的历史面貌由多重因素交织而成，各维度的发现互为印证，共同构成对其整体角色的理解。`
  return {
    valid: valid.map((d) => ({ title: d.title, finding: excerpt(d.answer, 130) })),
    theme,
    conclusion,
  }
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
  engine,
}: ResearchSummaryProps & {
  status?: SummaryStatus
  answer?: string
  citations?: AICitation[]
  rejected_citations?: AICitation[]
  grounded?: boolean
  error?: string
  engine?: AIEngine
}) {
  const completedCount = dimensions.filter((d) => d.status === 'success').length
  const allCitations = uniqueCitations(dimensions)
  const isComparative = !!(comparedNames && comparedNames.length > 0)

  // 本地综评兜底：answer 为空 / 兜底占位，且维度有真实答案时，用维度现拼。
  // 这样「研究中评」无论 AI 开没开、实体有没有事实存档，都有保底的真实内容。
  const synth = useMemo(
    () => buildSyntheticSummary(dimensions, entityName, entityType, comparedNames),
    [dimensions, entityName, entityType, comparedNames],
  )
  const useSynthetic =
    (engine === 'synthetic' || !answer || isResearchFallback(answer)) && !!synth

  // 质量门控（2026-08-12 bugfix）：AI answer 经 humanizeAnswer 清洗 JSON
  // artifact 后，如果可读中文太少，说明 LLM 返回的是英文或碎片垃圾输出，
  // 自动降级到本地综评兜底——用户始终看到有意义的可读内容。
  const cleanedAnswer = humanizeAnswer(answer).trim()
  const zhCharCount = (cleanedAnswer.match(/[\u4e00-\u9fff]/g) ?? []).length
  const shouldUseSynthetic = useSynthetic || zhCharCount < 10

  return (
    <div className="rsummary">
      <div className={`rsummary-header${isComparative ? ' rsummary-header--compare' : ''}`}>
        <h3 className="rsummary-title">
          <span className="rsummary-title-icon" aria-hidden="true">
            <Icon name="spark" size={20} />
          </span>
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

      {/* Success — 本地综评兜底（AI 不可用 / 返回占位 / 调用失败 / 英文垃圾时） */}
      {status === 'success' && shouldUseSynthetic && synth && (
        <div className="rsummary-content">
          <span className="rsummary-badge">
            基于 {synth.valid.length} 个已验证研究维度 · 本地综合
          </span>

          <p className="rsummary-synth-theme">{synth.theme}</p>

          <h4 className="rsummary-synth-title">各维度核心发现</h4>
          <ul className="rsummary-synth-list">
            {synth.valid.map((v, i) => (
              <li key={i}>
                <span className="rsummary-synth-dim">{v.title}</span>
                {v.finding}
              </li>
            ))}
          </ul>

          <h4 className="rsummary-synth-title">综合评述</h4>
          <p className="rsummary-synth-conclusion">{synth.conclusion}</p>

          {allCitations.length > 0 && (
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
          )}
        </div>
      )}

      {/* Success — AI 真实综述（仅当清洗后仍有充足中文内容时展示） */}
      {status === 'success' && !shouldUseSynthetic && answer && !isResearchFallback(answer) && (
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
              engine: engine ?? 'ai',
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
  const [engine, setEngine] = useState<AIEngine>('ai')

  // Start summary generation when component mounts with completed dimensions
  useState(() => {
    const completed = validDimensions(props.dimensions)
    if (completed.length === 0) return

    setStatus('loading')
    const context = buildSummaryContext(completed)
    const question =
      `请基于以下${completed.length}个维度的历史研究，提炼跨维度主题、维度间的关联，以及综合分析结论。` +
      `请务必使用简体中文回答，直接输出连贯的中文段落，不要输出 JSON 或任何代码格式：\n\n${context}`

    explainAI(question, [props.entityGlobalId])
      .then((res) => {
        // 把 AI 结果原样交给视图层判断：真实综述 → AI 分支；占位/空串 → 视图自动切本地兜底。
        setAnswer(res.answer)
        setCitations(res.citations)
        setRejected(res.rejected_citations ?? [])
        setGrounded(res.grounded)
        setEngine(res.engine)
        setStatus('success')
      })
      .catch((e) => {
        // 调用失败：answer 留空，视图层会基于维度答案自动拼本地综评。
        setAnswer('')
        setError(e instanceof Error ? e.message : 'AI 调用失败')
        setEngine('synthetic')
        setStatus('success')
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
      engine={engine}
    />
  )
}
