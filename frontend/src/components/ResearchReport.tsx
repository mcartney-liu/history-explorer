import { useState, useEffect, useMemo } from 'react'
import type { ResearchDimension } from './ResearchDimensionCard'
import type { AICitation, AIEngine } from '../data/aiClient'
import Icon from './ui/Icon'
import GroundedAnswer from './GroundedAnswer'
import { humanizeAnswer } from './GroundedAnswer'
import { explainAI } from '../data/aiClient'
import { isResearchFallback } from './ResearchSummary'

export type ResearchReportProps = {
  /** Entity being researched. */
  entityName: string
  /** Entity type for context. */
  entityType: string
  /** Entity global id (grounding context for AI synthesis). */
  entityGlobalId?: string
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

/** 取答案的一句话要点：清洗后按中文句号切第一句，过长截断。 */
function leadSentence(text: string | undefined, max = 90): string {
  const flat = humanizeAnswer(text ?? '').replace(/\s+/g, ' ').trim()
  if (!flat) return ''
  const first = flat.split(/[。！？；.!?;]/)[0]?.trim() || flat
  if (first.length <= max) return first
  return first.slice(0, max).replace(/[，,、\s]+$/, '') + '…'
}

/** 给 AI 的跨维度上下文：已完成维度的标题 + 答案片段。 */
function buildReportContext(dimensions: ResearchDimension[]): string {
  const completed = dimensions.filter((d) => d.status === 'success')
  return completed
    .map((d, i) => `${i + 1}. 【${d.title}】${humanizeAnswer(d.answer ?? '').slice(0, 600)}`)
    .join('\n\n')
}

export type LocalReport = {
  valid: { title: string; lead: string; citationCount: number; grounded: boolean }[]
  summary: string
}

/** 本地结构化报告（AI 不可用 / 降级时）：概要 + 每维度一句话要点，不拼接全文。 */
export function buildLocalReport(
  dimensions: ResearchDimension[],
  entityName: string,
  entityType: string,
  comparedNames?: string[],
): LocalReport | null {
  const completed = dimensions.filter((d) => d.status === 'success')
  if (completed.length === 0) return null
  const comparePrefix =
    comparedNames && comparedNames.length > 0
      ? `${entityName} 与 ${comparedNames.join('、')} 的比较研究中，`
      : ''
  const summary = `${comparePrefix}本研究从 ${dimensions.length} 个维度考察《${entityName}》（${entityType}），`
    + `${completed.length} 个维度完成分析，各维度要点如下。`
  return {
    valid: completed.map((d) => ({
      title: d.title,
      lead: leadSentence(d.answer),
      citationCount: d.citations?.length ?? 0,
      grounded: d.grounded ?? false,
    })),
    summary,
  }
}

// ─────────────────────────────────────────────────────────────────────────
// 纯展示视图（测试友好）：AI 报告或本地结构化报告二选一渲染。
// ─────────────────────────────────────────────────────────────────────────
export type ResearchReportViewProps = ResearchReportProps & {
  /** AI 综合报告（有状态 wrapper 传入）。 */
  aiAnswer?: string
  aiCitations?: AICitation[]
  aiRejectedCitations?: AICitation[]
  aiGrounded?: boolean
  aiEngine?: AIEngine
  /** AI 综合报告加载状态（loading 时显示占位，不闪降级）。 */
  aiLoading?: boolean
}

export function ResearchReportView({
  entityName,
  entityType,
  dimensions,
  comparedNames,
  aiAnswer,
  aiCitations = [],
  aiRejectedCitations = [],
  aiGrounded = true,
  aiEngine = 'ai',
  aiLoading = false,
}: ResearchReportViewProps) {
  const completed = dimensions.filter((d) => d.status === 'success')
  const failed = dimensions.filter((d) => d.status === 'error')
  const allCitations = uniqueCitations(completed)
  const totalCitations = completed.reduce((sum, d) => sum + (d.citations?.length ?? 0), 0)
  const isComparative = !!(comparedNames && comparedNames.length > 0)

  // 质量门控：AI 报告清洗后中文字符 < 10 → 视为垃圾输出，降级本地结构化报告。
  const cleanedAi = humanizeAnswer(aiAnswer ?? '').trim()
  const aiHasContent = cleanedAi.length > 0 &&
    (cleanedAi.match(/[\u4e00-\u9fff]/g) ?? []).length >= 10 &&
    !isResearchFallback(aiAnswer)
  const local = useMemo(
    () => buildLocalReport(dimensions, entityName, entityType, comparedNames),
    [dimensions, entityName, entityType, comparedNames],
  )

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

      {/* AI 综合报告（跨维度综合，非拼接） */}
      {aiLoading && (
        <div className="rreport-section">
          <h4 className="rreport-section-title">综合报告</h4>
          <p className="rreport-ai-loading" role="status">
            正在跨维度提炼主题主线与关联，生成综合报告…
          </p>
        </div>
      )}

      {!aiLoading && aiHasContent && (
        <div className="rreport-section">
          <h4 className="rreport-section-title">综合报告</h4>
          <span className="rreport-ai-badge">
            基于 {completed.length} 个已验证研究维度 · AI 综合
          </span>
          <GroundedAnswer
            response={{
              answer: aiAnswer ?? '',
              citations: aiCitations,
              rejected_citations: aiRejectedCitations,
              grounded: aiGrounded,
              engine: aiEngine,
              question: `关于${entityName}的历史综合研究报告`,
              context_global_ids: [],
              mode: 'explain',
            }}
          />
        </div>
      )}

      {/* 本地结构化降级：每维度一句话要点（AI 不可用 / 垃圾输出时） */}
      {!aiLoading && !aiHasContent && local && (
        <div className="rreport-section">
          <h4 className="rreport-section-title">关键发现</h4>
          <p className="rreport-local-note">{local.summary}</p>
          {local.valid.map((v) => (
            <div key={v.title} className="rreport-finding">
              <h5 className="rreport-finding-title">{v.title}</h5>
              <p className="rreport-finding-text">{v.lead}</p>
              <span className="rreport-finding-citations">
                {v.citationCount} 条引用
                {v.grounded ? ' · 已验证' : ' · 部分验证'}
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

// ─────────────────────────────────────────────────────────────────────────
// 有状态 wrapper：挂载时调 explainAI 生成跨维度综合报告。
// 与 ResearchSummary 同构：AI 结果交给视图层判定，垃圾输出自动降级。
// ─────────────────────────────────────────────────────────────────────────
export default function ResearchReport(props: ResearchReportProps) {
  const [aiAnswer, setAiAnswer] = useState('')
  const [aiCitations, setAiCitations] = useState<AICitation[]>([])
  const [aiRejected, setAiRejected] = useState<AICitation[]>([])
  const [aiGrounded, setAiGrounded] = useState(true)
  const [aiEngine, setAiEngine] = useState<AIEngine>('ai')
  const [aiLoading, setAiLoading] = useState(false)

  useEffect(() => {
    const completed = props.dimensions.filter((d) => d.status === 'success')
    if (completed.length === 0) return

    setAiLoading(true)
    const context = buildReportContext(completed)
    const question =
      `请以历史研究者的视角，基于以下 ${completed.length} 个已完成研究维度的内容，` +
      `撰写一份综合研究报告。不要重复罗列各维度的原始内容，而是做真正的跨维度综合：\n` +
      `1. 主题主线：提炼贯穿各维度的核心历史主题；\n` +
      `2. 维度关联：分析各维度发现之间的相互印证或张力；\n` +
      `3. 矛盾与未解：指出研究中出现的矛盾之处或尚待解答的问题（如有）；\n` +
      `4. 总体评价：对该历史主体的整体历史地位给出综合评述。\n\n` +
      `【${props.entityName}】各维度研究内容如下：\n\n${context}`

    explainAI(question, props.entityGlobalId ? [props.entityGlobalId] : [])
      .then((res) => {
        setAiAnswer(res.answer)
        setAiCitations(res.citations)
        setAiRejected(res.rejected_citations ?? [])
        setAiGrounded(res.grounded)
        setAiEngine(res.engine)
        setAiLoading(false)
      })
      .catch(() => {
        // 调用失败：answer 留空，视图层自动降级本地结构化报告。
        setAiAnswer('')
        setAiLoading(false)
      })
    // 仅挂载时生成一次；维度变化视为新的研究报告，重新生成。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.entityName, props.entityGlobalId, props.dimensions])

  return (
    <ResearchReportView
      {...props}
      aiAnswer={aiAnswer}
      aiCitations={aiCitations}
      aiRejectedCitations={aiRejected}
      aiGrounded={aiGrounded}
      aiEngine={aiEngine}
      aiLoading={aiLoading}
    />
  )
}
