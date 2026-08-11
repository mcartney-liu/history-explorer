import { useState, useEffect } from 'react'
import { explainAI, type AICitation } from '../data/aiClient'
import { recordEvent } from '../data/UserBehaviorEvent'
import ResearchDimensionCard, { type ResearchDimension, type DimensionStatus } from './ResearchDimensionCard'
import ResearchReport from './ResearchReport'
import ResearchSummary, { ResearchSummaryView } from './ResearchSummary'
import ResearchBookmarkView from './ResearchBookmarkButton'
import MultiEntitySelector, { type SelectableEntity } from './MultiEntitySelector'
import { saveResearchRemote, type SavedResearch } from '../data/ResearchHistory'
import type { EntityRelationship } from './EntityPage'
import { slotImageName, useContentRevision } from '../data/contentRuntime'
import { mediaUrl } from '../data/contentApi'

/** T1: an explicit restore request raised by the parent (ResearchLibrary). */
export type RestoreRequest = {
  research: SavedResearch
  /** Monotonic token — a new value re-triggers the restore. */
  requestId: number
}

export type ResearchPanelProps = {
  entityGlobalId: string
  entityName: string
  entityType: string
  relationships: EntityRelationship[]
  /** T1: restore a saved research selected in the parent's ResearchLibrary. */
  restoreRequest?: RestoreRequest | null
  /** T1: fired after a successful save so the parent can refresh the library. */
  onSaved?: (research: SavedResearch) => void
}

/** Save lifecycle for the "保存研究" primary action. */
type SaveState =
  | { status: 'idle' }
  | { status: 'saving' }
  | { status: 'saved'; research: SavedResearch; remote: boolean }
  | { status: 'error'; message: string }

type ResearchMode = 'idle' | 'planning' | 'running' | 'done' | 'error' | 'restored'

/** Entity-type-specific research dimension templates. */
const RESEARCH_TEMPLATES: Record<string, { key: string; title: string; question: string }[]> = {
  Civilization: [
    { key: 'politics', title: '政治制度', question: '这个文明的政治制度如何影响其发展与扩张？' },
    { key: 'military', title: '军事体系', question: '军事能力如何影响这个文明的领土扩张和防御？' },
    { key: 'economy', title: '经济网络', question: '经济体系与贸易网络如何支撑这个文明的繁荣？' },
    { key: 'culture', title: '文化影响', question: '文化如何传播并影响其他文明和后世？' },
  ],
  Event: [
    { key: 'background', title: '背景原因', question: '导致这个事件发生的关键前因是什么？' },
    { key: 'process', title: '事件过程', question: '这个事件的核心过程是什么？关键人物和转折点有哪些？' },
    { key: 'impact', title: '直接影响', question: '这个事件的直接后果是什么？影响了哪些文明和群体？' },
    { key: 'significance', title: '长期意义', question: '这个事件对后世有什么深远的历史意义？' },
  ],
  Person: [
    { key: 'life', title: '生平背景', question: '这个人物成长的时代环境如何塑造了他/她？' },
    { key: 'contribution', title: '核心贡献', question: '他/她在历史上最重要的贡献是什么？' },
    { key: 'influence', title: '历史影响', question: '他/她的思想和行动如何改变了历史进程？' },
    { key: 'evaluation', title: '后世评价', question: '不同文明和时代如何评价这个人物？' },
  ],
  Religion: [
    { key: 'origin', title: '起源背景', question: '这个宗教在什么历史背景下产生？' },
    { key: 'doctrine', title: '核心教义', question: '其核心教义和思想体系是什么？' },
    { key: 'spread', title: '传播路径', question: '它如何传播并适应不同的文明环境？' },
    { key: 'civilization', title: '文明影响', question: '它对政治、文化和社会产生了什么深远影响？' },
  ],
  Technology: [
    { key: 'invention', title: '发明背景', question: '这项技术在什么条件下被发明？' },
    { key: 'principle', title: '技术原理', question: '它的核心原理和创新点是什么？' },
    { key: 'application', title: '传播应用', question: '它如何传播到其他文明并被应用？' },
    { key: 'tech-impact', title: '历史影响', question: '它如何改变了社会的生产方式和生活方式？' },
  ],
  Location: [
    { key: 'geography', title: '地理特征', question: '这个地方的地理特征如何塑造其历史角色？' },
    { key: 'strategy', title: '战略意义', question: '为什么这个地方在历史上具有战略重要性？' },
    { key: 'events', title: '历史事件', question: '这里发生了哪些改变历史进程的事件？' },
    { key: 'connection', title: '文明连接', question: '它如何连接不同的文明和贸易路线？' },
  ],
  Idea: [
    { key: 'idea-origin', title: '思想起源', question: '这个思想是如何产生和发展的？' },
    { key: 'meaning', title: '核心内涵', question: '它的核心内涵和理论体系是什么？' },
    { key: 'idea-spread', title: '传播影响', question: '它如何传播并影响其他文明的思想？' },
    { key: 'modern', title: '当代意义', question: '它对今天的世界有什么启示？' },
  ],
}

type DimTpl = { key: string; title: string; question: string }

/** A single research dimension, rendered as a full-bleed artwork card (image
 *  is generic per-dimension and shared across all entities; falls back to a
 *  plain paper card when no image is dropped). Mirrors the exploration-pack
 *  "image-as-card" treatment. */
function ResearchDimCard({ index, dim }: { index: number; dim: DimTpl }) {
  useContentRevision()
  const configuredName = slotImageName(`research_dims.${dim.key}`)
  const formats = ['webp', 'png', 'jpg', 'jpeg']
  // phase 0 = admin-configured artwork (when present); 1..4 = bundle fallback
  // chain (assets/research/{key}.{webp|png|jpg|jpeg}), mirroring the explore
  // pack treatment. The configured upload is the first attempt; on failure we
  // fall through to the bundle artwork, exactly like PackageCard.
  const [phase, setPhase] = useState(0)
  const showImg = phase <= formats.length
  const useConfigured = configuredName !== null && phase === 0
  const src = !showImg
    ? ''
    : useConfigured
      ? mediaUrl(configuredName as string)
      : `${import.meta.env.BASE_URL}assets/research/${dim.key}.${formats[Math.max(0, phase - 1)]}`
  return (
    <li className={`rp-dim-card${showImg ? ' has-art' : ''}`}>
      {showImg && (
        <img
          className="rp-dim-card-art"
          src={src}
          alt=""
          aria-hidden="true"
          onError={() => setPhase((p) => p + 1)}
        />
      )}
      <div className="rp-dim-card-body">
        <div className="rp-dim-card-head">
          <span className="rp-dim-badge">{index + 1}</span>
          <span className="rp-dim-title">{dim.title}</span>
        </div>
        <p className="rp-dim-question">{dim.question}</p>
      </div>
    </li>
  )
}

function templateFor(type: string): DimTpl[] {
  return RESEARCH_TEMPLATES[type] ?? RESEARCH_TEMPLATES['Civilization']
}

export function ResearchPanelView({
  entityGlobalId,
  entityName,
  entityType,
  // Stateful props for testability
  mode = 'idle' as ResearchMode,
  dimensions = [] as ResearchDimension[],
  onStart = (_q: string) => {},
  onReset = () => {},
  selectedEntities = [] as SelectableEntity[],
  availableEntities = [] as SelectableEntity[],
  onSelectEntities = (_entities: SelectableEntity[]) => {},
  saveState = { status: 'idle' } as SaveState,
  onSave = () => {},
  onBookmarkUpdate = () => {},
  // 2026-08-11 (PO 方案①)：恢复的研究记录（横幅显示实体名 + 摘要）。
  restoreData = null as SavedResearch | null,
}: ResearchPanelProps & {
  mode?: ResearchMode
  dimensions?: ResearchDimension[]
  onStart?: (question: string) => void
  onReset?: () => void
  selectedEntities?: SelectableEntity[]
  availableEntities?: SelectableEntity[]
  onSelectEntities?: (entities: SelectableEntity[]) => void
  saveState?: SaveState
  onSave?: () => void
  onBookmarkUpdate?: () => void
  restoreData?: SavedResearch | null
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
          <ul className="rp-dim-grid">
            {template.map((d, i) => (
              <ResearchDimCard key={d.key} index={i} dim={d} />
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

          {dimensions.map((dim, i) => (
            <ResearchDimensionCard key={dim.id} dimension={dim} dimKey={template[i]?.key} />
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

              {/* M44: Research completion guidance */}
              <div className="rp-completion-guidance" role="status">
                <p>研究完成。你可以保存这份研究结果到「研究收藏库」中，之后随时恢复查看或与其他实体进行对比。</p>
              </div>

              {/* T1: the save loop actually closes here — primary action. */}
              <div className="rp-save-actions">
                {saveState.status === 'saved' ? (
                  <div className="rp-save-done" role="status">
                    <span className="rp-save-done-text">
                      已保存到「研究收藏库」
                      {saveState.remote ? '' : '（当前离线，已存在本机，联网后可再次保存同步）'}
                    </span>
                    <ResearchBookmarkView
                      researchId={saveState.research.id}
                      bookmarked={saveState.research.bookmarked}
                      labels={saveState.research.labels}
                      onUpdate={onBookmarkUpdate}
                    />
                  </div>
                ) : (
                  <button
                    type="button"
                    className="rp-save-btn"
                    disabled={saveState.status === 'saving'}
                    onClick={onSave}
                  >
                    {saveState.status === 'saving' ? '保存中…' : '保存研究'}
                  </button>
                )}

                {saveState.status === 'error' && (
                  <p className="rp-save-error" role="alert">
                    保存失败：{saveState.message}
                  </p>
                )}

                <button
                  type="button"
                  className="rp-reset-btn rp-reset-btn--secondary"
                  onClick={() => {
                    const confirmed =
                      typeof window === 'undefined' ||
                      window.confirm('重新研究会清空当前结果。确定继续吗？')
                    if (confirmed) onReset()
                  }}
                >
                  重新研究
                </button>
              </div>
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
          {/* 2026-08-11 (PO 方案①)：醒目横幅，打开后一眼看到恢复发生 */}
          <div className="rp-restored-banner" role="status">
            <span className="rp-restored-banner-dot" />
            <span className="rp-restored-banner-text">
              已恢复历史研究
              {restoreData?.entityName ? ` — ${restoreData.entityName}` : ''}
            </span>
          </div>
          {restoreData?.summaryAnswer && (
            <div className="rp-restored-summary">
              <h4 className="rp-restored-summary-title">研究摘要</h4>
              <p className="rp-restored-summary-text">{restoreData.summaryAnswer}</p>
            </div>
          )}
          {dimensions.length > 0 && (
            <div className="rp-results">
              {dimensions.map((dim, i) => (
                <ResearchDimensionCard key={dim.id} dimension={dim} dimKey={template[i]?.key} />
              ))}
            </div>
          )}
          {/* 2026-08-11 (PO 问题二)：恢复的研究也要展示完整报告——
              综合报告（用存档摘要，不重调 AI）+ 研究报告（纯展示），
              与 done 模式对齐，让「打开」后能立即看到报告内容。 */}
          {dimensions.length > 0 && (
            <div className="rp-restored-reports">
              <ResearchSummaryView
                entityName={entityName}
                entityType={entityType}
                entityGlobalId={entityGlobalId}
                dimensions={dimensions}
                comparedNames={selectedEntities.map((e) => e.name)}
                status="success"
                answer={restoreData?.summaryAnswer ?? ''}
                grounded={true}
              />
              <ResearchReport
                entityName={entityName}
                entityType={entityType}
                dimensions={dimensions}
                comparedNames={selectedEntities.map((e) => e.name)}
              />
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
  const [saveState, setSaveState] = useState<SaveState>({ status: 'idle' })

  // Build available entities from relationships
  const availableEntities: SelectableEntity[] = (props.relationships ?? [])
    .filter((r) => r.other.global_id && r.other.name)
    .map((r) => ({ id: r.other.id, globalId: r.other.global_id, name: r.other.name, type: r.other.type }))

  // Compute context_global_ids: primary entity + selected comparison entities
  const contextGlobalIds: string[] = [
    props.entityGlobalId,
    ...selectedEntities.map((e) => e.globalId!).filter(Boolean),
  ]

  // T1: `save_research` MUST NOT auto-fire on completion — it now fires only
  // inside handleSave (a real user save). Reaching 'done' is a *completion*,
  // which is its own event.
  useEffect(() => {
    if (mode === 'done') {
      recordEvent({ action: 'complete_research', entityGlobalId: props.entityGlobalId })
    }
  }, [mode, props.entityGlobalId])

  // M45 Phase 3: record restore event
  useEffect(() => {
    if (mode === 'restored') {
      recordEvent({ action: 'restore_research', entityGlobalId: props.entityGlobalId })
    }
  }, [mode, props.entityGlobalId])

  // T1: parent-driven restore (ResearchLibrary "打开" in EntityPage).
  const restoreId = props.restoreRequest?.requestId
  const restoreResearchData = props.restoreRequest?.research
  useEffect(() => {
    if (restoreId === undefined || !restoreResearchData) return
    setDimensions(restoreResearch(restoreResearchData))
    // 2026-08-11 (PO 方案①)：恢复对比实体选中态（按名字匹配关系实体），
    // 让多实体研究的上下文一并还原。
    const names = restoreResearchData.comparedNames ?? []
    if (names.length > 0) {
      const matched = availableEntities.filter((e) => names.includes(e.name))
      if (matched.length > 0) setSelectedEntities(matched)
    }
    setSaveState({ status: 'idle' })
    setMode('restored')
    // 2026-08-11 (PO 方案①)：自动滚动到研究主区，恢复结果立即可见。
    requestAnimationFrame(() => {
      const panel = document.querySelector('.entity-research-group')
      if (panel) panel.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps — availableEntities is
    // re-derived every render; only restoreId/research drive this effect.
  }, [restoreId, restoreResearchData])

  async function handleSave() {
    if (saveState.status === 'saving') return
    setSaveState({ status: 'saving' })

    // Aggregate every citation the dimensions produced (same de-dup rule
    // ResearchSummary uses) so the saved record keeps its provenance.
    const seen = new Set<string>()
    const citations: AICitation[] = []
    for (const d of dimensions) {
      for (const c of d.citations ?? []) {
        if (!seen.has(c.global_id)) {
          seen.add(c.global_id)
          citations.push(c)
        }
      }
    }

    try {
      const { research, remote } = await saveResearchRemote({
        entityName: props.entityName,
        entityType: props.entityType,
        entityGlobalId: props.entityGlobalId,
        comparedNames: selectedEntities.map((e) => e.name),
        dimensions,
        summaryCitations: citations,
        question: `关于${props.entityName}的多维度分析`,
        contextGlobalIds: contextGlobalIds,
        visited: contextGlobalIds,
        citations,
      })
      // T1: the ONLY place save_research is emitted.
      recordEvent({ action: 'save_research', entityGlobalId: props.entityGlobalId })
      setSaveState({ status: 'saved', research, remote })
      props.onSaved?.(research)
    } catch (err) {
      setSaveState({
        status: 'error',
        message: err instanceof Error ? err.message : '未知错误',
      })
    }
  }

  async function onStart(_q: string) {
    // M45: record research start
    recordEvent({ action: 'start_research', entityGlobalId: props.entityGlobalId })
    if (selectedEntities.length > 0) {
      recordEvent({ action: 'start_comparison', entityGlobalId: props.entityGlobalId })
    }

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
      onReset={() => {
        setMode('idle')
        setDimensions([])
        setSelectedEntities([])
        setSaveState({ status: 'idle' })
      }}
      selectedEntities={selectedEntities}
      availableEntities={availableEntities}
      onSelectEntities={setSelectedEntities}
      saveState={saveState}
      onSave={handleSave}
      restoreData={restoreResearchData}
      onBookmarkUpdate={() => {
        // ResearchBookmarkButton already persisted the flip; mirror it so the
        // button reflects the new state without a remount.
        setSaveState((prev) =>
          prev.status === 'saved'
            ? { ...prev, research: { ...prev.research, bookmarked: !prev.research.bookmarked } }
            : prev,
        )
        if (saveState.status === 'saved') props.onSaved?.(saveState.research)
      }}
    />
  )
}

/** Restore a saved research — does NOT re-call explainAI.
 *  2026-08-11 (PO 方案①)：恢复引用明细（d.citations），出处不再丢失。 */
export function restoreResearch(research: SavedResearch): ResearchDimension[] {
  return research.dimensions.map((d) => ({
    id: d.id,
    title: d.title,
    question: d.question,
    status: d.status as DimensionStatus,
    answer: d.answer,
    grounded: d.grounded,
    citations: (d.citations ?? []).map((c) => ({
      global_id: c.global_id,
      kind: c.kind,
      label: c.label,
    })),
    rejected_citations: [],
  }))
}
