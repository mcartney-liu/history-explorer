import { useState } from 'react'
import { explainAI } from '../data/aiClient'
import ResearchDimensionCard, { type ResearchDimension, type DimensionStatus } from './ResearchDimensionCard'
import ResearchReport from './ResearchReport'
import ResearchSummary from './ResearchSummary'
import MultiEntitySelector, { type SelectableEntity } from './MultiEntitySelector'
import { loadResearch, type SavedResearch } from '../data/ResearchHistory'
import type { EntityRelationship } from './EntityPage'

export type ResearchPanelProps = {
  entityGlobalId: string
  entityName: string
  entityType: string
  relationships: EntityRelationship[]
}

type ResearchMode = 'idle' | 'planning' | 'running' | 'done' | 'error' | 'restored'

/** Entity-type-specific research dimension templates. */
const RESEARCH_TEMPLATES: Record<string, { title: string; question: string }[]> = {
  Civilization: [
    { title: '政治制度', question: '这个文明的政治制度如何影响其发展与扩张？' },
    { title: '军事体系', question: '军事能力如何影响这个文明的领土扩张和防御？' },
    { title: '经济网络', question: '经济体系与贸易网络如何支撑这个文明的繁荣？' },
    { title: '文化影响', question: '文化如何传播并影响其他文明和后世？' },
  ],
  Event: [
    { title: '背景原因', question: '导致这个事件发生的关键前因是什么？' },
    { title: '事件过程', question: '这个事件的核心过程是什么？关键人物和转折点有哪些？' },
    { title: '直接影响', question: '这个事件的直接后果是什么？影响了哪些文明和群体？' },
    { title: '长期意义', question: '这个事件对后世有什么深远的历史意义？' },
  ],
  Person: [
    { title: '生平背景', question: '这个人物成长的时代环境如何塑造了他/她？' },
    { title: '核心贡献', question: '他/她在历史上最重要的贡献是什么？' },
    { title: '历史影响', question: '他/她的思想和行动如何改变了历史进程？' },
    { title: '后世评价', question: '不同文明和时代如何评价这个人物？' },
  ],
  Religion: [
    { title: '起源背景', question: '这个宗教在什么历史背景下产生？' },
    { title: '核心教义', question: '其核心教义和思想体系是什么？' },
    { title: '传播路径', question: '它如何传播并适应不同的文明环境？' },
    { title: '文明影响', question: '它对政治、文化和社会产生了什么深远影响？' },
  ],
  Technology: [
    { title: '发明背景', question: '这项技术在什么条件下被发明？' },
    { title: '技术原理', question: '它的核心原理和创新点是什么？' },
    { title: '传播应用', question: '它如何传播到其他文明并被应用？' },
    { title: '历史影响', question: '它如何改变了社会的生产方式和生活方式？' },
  ],
  Location: [
    { title: '地理特征', question: '这个地方的地理特征如何塑造其历史角色？' },
    { title: '战略意义', question: '为什么这个地方在历史上具有战略重要性？' },
    { title: '历史事件', question: '这里发生了哪些改变历史进程的事件？' },
    { title: '文明连接', question: '它如何连接不同的文明和贸易路线？' },
  ],
  Idea: [
    { title: '思想起源', question: '这个思想是如何产生和发展的？' },
    { title: '核心内涵', question: '它的核心内涵和理论体系是什么？' },
    { title: '传播影响', question: '它如何传播并影响其他文明的思想？' },
    { title: '当代意义', question: '它对今天的世界有什么启示？' },
  ],
}

function templateFor(type: string): { title: string; question: string }[] {
  return RESEARCH_TEMPLATES[type] ?? RESEARCH_TEMPLATES['Civilization']
}

export function ResearchPanelView({
  entityGlobalId,
  entityName,
  entityType,
  relationships,
  // Stateful props for testability
  mode = 'idle' as ResearchMode,
  dimensions = [] as ResearchDimension[],
  onStart = (_q: string) => {},
  onReset = () => {},
  selectedEntities = [] as SelectableEntity[],
  availableEntities = [] as SelectableEntity[],
  onSelectEntities = (_entities: SelectableEntity[]) => {},
}: ResearchPanelProps & {
  mode?: ResearchMode
  dimensions?: ResearchDimension[]
  onStart?: (question: string) => void
  onReset?: () => void
  selectedEntities?: SelectableEntity[]
  availableEntities?: SelectableEntity[]
  onSelectEntities?: (entities: SelectableEntity[]) => void
}) {
  const template = templateFor(entityType)

  return (
    <section className="research-panel" aria-label="AI 研究模式">
      <h3 className="rp-title">AI 研究模式</h3>

      {/* Context badge — what entity is being researched */}
      <div className="rp-context-badge">
        <span className="rp-context-label">研究对象：</span>
        <span className="rp-context-type">{entityType}</span>
        <span className="rp-context-name">{entityName}</span>
      </div>

      <p className="rp-subtitle">
        从多个维度深度分析 {entityName}。每个维度独立进行事实溯源，确保结论可验证。
      </p>

      {/* Research plan display */}
      {mode === 'idle' && (
        <div className="rp-plan">
          <p className="rp-plan-label">研究维度（{template.length} 个）：</p>
          <ul className="rp-dimension-list">
            {template.map((d, i) => (
              <li key={i} className="rp-dimension-item">
                <span className="rp-dim-num">{i + 1}.</span>
                <span className="rp-dim-title">{d.title}</span>
                <span className="rp-dim-question">{d.question}</span>
              </li>
            ))}
          </ul>
          <button
            type="button"
            className="rp-start-btn"
            onClick={() => onStart(`关于${entityName}的多维度分析`)}
          >
            开始研究
          </button>

          {availableEntities.length > 0 && (
            <MultiEntitySelector
              selected={selectedEntities}
              available={availableEntities}
              onChange={onSelectEntities}
            />
          )}
        </div>
      )}

      {/* Running / Done: show dimension cards with progress */}
      {(mode === 'running' || mode === 'done') && (
        <div className="rp-results">
          {/* Progress indicator */}
          <div className="rp-progress">
            <div className="rp-progress-bar">
              <div
                className="rp-progress-fill"
                style={{
                  width: `${(dimensions.filter((d) => d.status === 'success').length * 100) / Math.max(dimensions.length, 1)}%`,
                }}
              />
            </div>
            <span className="rp-progress-text">
              {dimensions.filter((d) => d.status === 'success').length}/{dimensions.length} 维度完成
              {mode === 'running' && ' — 正在研究中…'}
              {mode === 'done' && ' — 研究完成'}
            </span>
          </div>

          {dimensions.map((dim) => (
            <ResearchDimensionCard key={dim.id} dimension={dim} />
          ))}

          {mode === 'done' && (
            <>
              <ResearchSummary
                entityName={entityName}
                entityType={entityType}
                entityGlobalId={entityGlobalId}
                dimensions={dimensions}
                comparedNames={selectedEntities.map((e) => e.name)}
              />
              <ResearchReport
                entityName={entityName}
                entityType={entityType}
                dimensions={dimensions}
                comparedNames={selectedEntities.map((e) => e.name)}
              />
              <button type="button" className="rp-reset-btn" onClick={onReset}>
                重新研究
              </button>
            </>
          )}
        </div>
      )}

      {mode === 'error' && (
        <p className="rp-error" role="alert">
          研究执行失败。请稍后重试或使用解释模式获取单维度分析。
        </p>
      )}

      {mode === 'restored' && (
        <div className="rp-restored">
          <span className="rp-restored-badge">已恢复历史研究</span>
          {dimensions.length > 0 && (
            <div className="rp-results">
              {dimensions.map((dim) => (
                <ResearchDimensionCard key={dim.id} dimension={dim} />
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  )
}

export default function ResearchPanel(props: ResearchPanelProps) {
  const [mode, setMode] = useState<ResearchMode>('idle')
  const [dimensions, setDimensions] = useState<ResearchDimension[]>([])
  const [selectedEntities, setSelectedEntities] = useState<SelectableEntity[]>([])

  // Build available entities from relationships
  const availableEntities: SelectableEntity[] = (props.relationships ?? [])
    .filter((r) => r.other.global_id && r.other.name)
    .map((r) => ({ id: r.other.id, globalId: r.other.global_id, name: r.other.name, type: r.other.type }))

  // Compute context_global_ids: primary entity + selected comparison entities
  const contextGlobalIds: string[] = [
    props.entityGlobalId,
    ...selectedEntities.map((e) => e.globalId!).filter(Boolean),
  ]

  async function onStart(_q: string) {
    const template = templateFor(props.entityType)
    const comparisonPrefix = selectedEntities.length > 0
      ? `比较 ${props.entityName} 与 ${selectedEntities.map((e) => e.name).join('、')}»`
      : ''

    const initial: ResearchDimension[] = template.map((t, i) => ({
      id: `dim-${i}`,
      title: t.title,
      question: comparisonPrefix
        ? `${comparisonPrefix}${t.question.replace('这个', '')}`
        : t.question.replace('这个', props.entityName).replace('他/她', props.entityName),
      status: 'loading' as DimensionStatus,
    }))
    setDimensions(initial)
    setMode('running')

    try {
      const results = await Promise.all(
        initial.map(async (dim) => {
          try {
            const res = await explainAI(dim.question, contextGlobalIds)
            return { ...dim, ...res, status: 'success' as DimensionStatus }
          } catch {
            return { ...dim, status: 'error' as DimensionStatus, error: '请求失败' }
          }
        }),
      )
      setDimensions(results)
      setMode('done')
    } catch {
      setMode('error')
    }
  }

  return (
    <ResearchPanelView
      {...props}
      mode={mode}
      dimensions={dimensions}
      onStart={onStart}
      onReset={() => { setMode('idle'); setDimensions([]); setSelectedEntities([]) }}
      selectedEntities={selectedEntities}
      availableEntities={availableEntities}
      onSelectEntities={setSelectedEntities}
    />
  )
}

/** Restore a saved research — does NOT re-call explainAI. */
export function restoreResearch(research: SavedResearch): ResearchDimension[] {
  return research.dimensions.map((d) => ({
    id: d.id,
    title: d.title,
    question: d.question,
    status: d.status as DimensionStatus,
    answer: d.answer,
    grounded: d.grounded,
    citations: [],
    rejected_citations: [],
  }))
}
