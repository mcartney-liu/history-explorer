import { useState, useEffect } from 'react'
import { explainAI, type AICitation } from '../data/aiClient'
import { recordEvent } from '../data/UserBehaviorEvent'
import ResearchDimensionCard, { type ResearchDimension, type DimensionStatus } from './ResearchDimensionCard'
import ResearchReport, { ResearchReportView } from './ResearchReport'
import ResearchSummary, { ResearchSummaryView } from './ResearchSummary'
import ResearchBookmarkView from './ResearchBookmarkButton'
import MultiEntitySelector, { type SelectableEntity } from './MultiEntitySelector'
import DimensionReportModal from './DimensionReportModal'
import { saveResearchRemote, type SavedResearch } from '../data/ResearchHistory'
import { saveGap } from '../data/GapLedger'
import type { EntityRelationship } from './EntityPage'
import { slotImageName, slotImageFocus, useContentRevision } from '../data/contentRuntime'
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
function ResearchDimCard({
  index,
  dim,
  onResearch,
}: {
  index: number
  dim: DimTpl
  /** P-U03：单点「研究」入口（计划态每维度独立触发）。 */
  onResearch?: (dimKey: string) => void
}) {
  useContentRevision()
  const configuredName = slotImageName(`research_dims.${dim.key}`)
  const focus = slotImageFocus(`research_dims.${dim.key}`)
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
          style={focus ? { objectPosition: focus } : undefined}
          onError={() => setPhase((p) => p + 1)}
        />
      )}
      <div className="rp-dim-card-body">
        <div className="rp-dim-card-head">
          <span className="rp-dim-badge">{index + 1}</span>
          <span className="rp-dim-title">{dim.title}</span>
        </div>
        <p className="rp-dim-question">{dim.question}</p>
        {onResearch && (
          <button
            type="button"
            className="rp-dim-research-btn"
            onClick={() => onResearch(dim.key)}
          >
            研究
          </button>
        )}
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
  // 2026-08-13 (PO 方案①)：三阶段自主触发状态。
  aiAvailable = false,
  summaryStarted = false,
  reportStarted = false,
  onStartSummary = () => {},
  onStartReport = () => {},
  onSummaryAnswered = (_answer: string) => {},
  onResearch,
  allSuccess = false,
  onViewReport,
  expandAll = false,
  onToggleExpandAll,
  // P-U07：待保存维度数（>0 显示顶部轻提示）。
  pendingSaveCount = 0,
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
  aiAvailable?: boolean
  summaryStarted?: boolean
  reportStarted?: boolean
  onStartSummary?: () => void
  onStartReport?: () => void
  /** P-U01：研究中评生成后回传正文，由容器随整份研究存档。 */
  onSummaryAnswered?: (answer: string) => void
  /** P-U03：单点「研究 / 重研」回调（传 dimKey，容器映射回维度）。 */
  onResearch?: (dimKey: string) => void
  /** P-U04 纠偏：点「查看报告」弹 modal（容器接管）。 */
  onViewReport?: (dimKey: string) => void
  /** P-U09：全部展开（受控内联展开所有维度报告）。 */
  expandAll?: boolean
  /** P-U09：切换全部展开 / 收起全部。 */
  onToggleExpandAll?: () => void
  /** P-U06：四维度全 success（研究中评门控用）。 */
  allSuccess?: boolean
  /** P-U07：已完成但尚未点「保存」的维度数（>0 时面板顶部显示轻提示）。 */
  pendingSaveCount?: number
}) {
  const template = templateFor(entityType)
  // P-U10：订阅内容修订，使 done/restored 卡片的背景图随后台改图实时更新（与 idle 同源）。
  useContentRevision()
  // 2026-08-13 (PO 纠偏)：研究中评门控 = 四维度全 success（error 维度不算成功，需重研补齐）。
  // 不再以 aiAvailable 隐藏——AI 关时研究中评仍显示，由 ResearchSummary 内部兜底（isResearchFallback）。
  const canAnalyze = (allSuccess ?? false)

  return (
    <section className="research-panel" aria-label="AI 研究模式">
      <h3 className="rp-title">AI 研究模式</h3>

      {/* 2026-08-13 (P-U07)：本会话已完成但尚未保存的维度提示（刷新即丢，提醒先保存）。 */}
      {pendingSaveCount > 0 && (
        <p className="rp-pending-save" role="status">
          本会话有 {pendingSaveCount} 个维度尚未保存，记得点「保存」进入收藏
        </p>
      )}

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
              <ResearchDimCard key={d.key} index={i} dim={d} onResearch={onResearch} />
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

          {/* P-U09：全部展开 / 收起全部——受控内联展开所有维度报告（仅此入口做内联展开）。 */}
          {dimensions.some((d) => d.status === 'success') && onToggleExpandAll && (
            <div className="rp-expand-all">
              <button
                type="button"
                className="rp-expand-all-btn"
                onClick={onToggleExpandAll}
              >
                {expandAll ? '收起全部' : '全部展开'}
              </button>
            </div>
          )}

          <div className="rdc-grid">
          {dimensions.map((dim, i) => {
            const dk = template[i]?.key
            // P-U10：后台上传图优先（slotImageName+mediaUrl），缺失回退本地 bundle。
            const artName = dk ? slotImageName(`research_dims.${dk}`) : null
            const artSrc = artName ? mediaUrl(artName as string) : null
            return (
              <ResearchDimensionCard
                key={dim.id}
                dimension={dim}
                dimKey={dk}
                onResearch={onResearch}
                onViewReport={onViewReport}
                artSrc={artSrc}
                externalExpand={expandAll}
              />
            )
          })}
          </div>

          {mode === 'done' && (
            <>
              {/* 2026-08-13 (PO 纠偏)：三阶段顺序触发。
                  研究中评：四维度全 success 即显示「生成」按钮（不再以 AI 可用性隐藏），
                  点击后挂载 ResearchSummary（其内部按 engine 决定是否走 AI，AI 关时兜底）。
                  综合报告：研究中评触发后出现「生成」按钮，点击后挂载 ResearchReport。 */}
              {canAnalyze && !summaryStarted && (
                <div className="rp-stage-trigger">
                  <button
                    type="button"
                    className="rp-stage-btn"
                    onClick={onStartSummary}
                  >
                    生成研究中评
                  </button>
                  <p className="rp-stage-hint">
                    基于 {dimensions.filter((d) => d.status === 'success').length} 个已验证维度，提炼跨维度主题与关联。
                  </p>
                </div>
              )}

              {summaryStarted && (
                <ResearchSummary
                  entityName={entityName}
                  entityType={entityType}
                  entityGlobalId={entityGlobalId}
                  dimensions={dimensions}
                  comparedNames={selectedEntities.map((e) => e.name)}
                  onAnswered={onSummaryAnswered}
                />
              )}

              {!reportStarted && (
                <div className="rp-stage-trigger">
                  <button
                    type="button"
                    className="rp-stage-btn"
                    onClick={onStartReport}
                  >
                    {aiAvailable && summaryStarted ? '生成综合报告' : '生成历史研究报告'}
                  </button>
                  <p className="rp-stage-hint">
                    从主题主线、维度关联、矛盾与未解、总体评价四个角度形成完整报告。
                  </p>
                </div>
              )}

              {reportStarted && (
                <ResearchReport
                  entityName={entityName}
                  entityType={entityType}
                  entityGlobalId={entityGlobalId}
                  dimensions={dimensions}
                  comparedNames={selectedEntities.map((e) => e.name)}
                />
              )}

              {/* M44: Research completion guidance */}
              <div className="rp-completion-guidance" role="status">
                <p>研究完成。你可以保存这份研究结果到「研究库」中，之后随时恢复查看或与其他实体进行对比。</p>
              </div>

              {/* T1: the save loop actually closes here — primary action. */}
              <div className="rp-save-actions">
                {saveState.status === 'saved' ? (
                  <div className="rp-save-done" role="status">
                    <span className="rp-save-done-text">
                      已保存到「研究库」
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
            <div className="rdc-grid">
              {dimensions.map((dim, i) => {
                const dk = template[i]?.key
                // P-U10：恢复态也引用后台上传图，保证背景图一致。
                const artName = dk ? slotImageName(`research_dims.${dk}`) : null
                const artSrc = artName ? mediaUrl(artName as string) : null
                return (
                  <ResearchDimensionCard
                    key={dim.id}
                    dimension={dim}
                    dimKey={dk}
                    onResearch={onResearch}
                    onViewReport={onViewReport}
                    artSrc={artSrc}
                  />
                )
              })}
            </div>
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
              <ResearchReportView
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
  // 2026-08-13 (PO 方案①)：三阶段自主触发——四维 → 研究中评 → 综合报告。
  // 研究中评/综合报告不再挂载即自动调 AI，改为用户点击「生成」按钮后才
  // 挂载组件触发；研究中评在 AI 不可用时整体隐藏（不假装综合）。
  const [summaryStarted, setSummaryStarted] = useState(false)
  const [reportStarted, setReportStarted] = useState(false)
  // 2026-08-13 (P-U01)：研究中评正文，生成后由 ResearchSummary 回传，随整份研究一起存档。
  const [summaryAnswer, setSummaryAnswer] = useState<string | null>(null)
  // 2026-08-13 (P-U05)：单点研究的报告弹窗（完成后弹出 modal 小窗）。
  const [singleReport, setSingleReport] = useState<ResearchDimension | null>(null)
  // 2026-08-13 (P-U09)：全部展开（受控内联展开所有维度报告）。
  const [expandAll, setExpandAll] = useState(false)
  // 2026-08-13 (P-U07)：已完成但尚未点「保存」的维度 key（单点/批量研究只写内存，
  // 不保存则刷新即丢；顶部轻提示「本会话有 N 个维度尚未保存」）。
  const [pendingSaveDims, setPendingSaveDims] = useState<string[]>([])

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
    // 2026-08-13 (P-U07)：恢复的研究来自存档，无需「尚未保存」提示。
    setPendingSaveDims([])
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
        summaryAnswer: summaryAnswer ?? undefined,
        question: `关于${props.entityName}的多维度分析`,
        contextGlobalIds: contextGlobalIds,
        visited: contextGlobalIds,
        citations,
      })
      // T1: the ONLY place save_research is emitted.
      recordEvent({ action: 'save_research', entityGlobalId: props.entityGlobalId })
      setSaveState({ status: 'saved', research, remote })
      // 2026-08-13 (P-U07)：保存成功 → 清除「尚未保存」提示。
      setPendingSaveDims([])
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
    // Cognitive loop (P2, 2026-08-14): write the User Action back to the gap
    // ledger so the research becomes part of the loop's persistent trail.
    saveGap(props.entityGlobalId, { exploring: 'overall' })
    // 三阶段自主触发：新研究开始，研究中评/综合报告回到未触发态
    setSummaryStarted(false)
    setReportStarted(false)

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
      // 2026-08-13 (P-U07)：批量研究完成 → 全部维度计入「尚未保存」。
      setPendingSaveDims(template.map((t) => t.key))
    } catch {
      setMode('error')
    }
  }

  // 2026-08-13 (P-U03)：单点「研究 / 重研」——只更新该维度，不重置其它维度；
  // 完成后弹出 modal 小窗（P-U05）。复用 contextGlobalIds 与批量同一套 grounding。
  async function onResearchSingle(dimKey: string) {
    const template = templateFor(props.entityType)
    const idx = template.findIndex((t) => t.key === dimKey)
    if (idx < 0) return
    const t = template[idx]
    // Cognitive loop (P2): record that this single-dimension research started
    // — the User Action that leaves a trail in the gap ledger.
    saveGap(props.entityGlobalId, { exploring: dimKey })

    // 首次单点：先把四维按 idle 初始化（其余维度等待单独触发）。
    let base = dimensions
    if (base.length === 0) {
      base = template.map((tt, i) => ({
        id: `dim-${i}`,
        title: tt.title,
        question: tt.question,
        status: 'idle' as DimensionStatus,
      }))
      setDimensions(base)
      setMode('running')
    }
    const dimId = `dim-${idx}`

    setDimensions((prev) =>
      prev.map((d) =>
        d.id === dimId ? { ...d, status: 'loading' as DimensionStatus, error: undefined } : d,
      ),
    )

    const comparisonPrefix = selectedEntities.length > 0
      ? `比较 ${props.entityName} 与 ${selectedEntities.map((e) => e.name).join('、')}»`
      : ''
    const question = comparisonPrefix
      ? `${comparisonPrefix}${t.question.replace('这个', '')}`
      : t.question.replace('这个', props.entityName).replace('他/她', props.entityName)

    const target = base.find((d) => d.id === dimId) ?? { id: dimId, title: t.title, question }
    try {
      const res = await explainAI(question, contextGlobalIds)
      const updated: ResearchDimension = {
        ...target,
        ...res,
        id: dimId,
        title: t.title,
        question,
        status: 'success' as DimensionStatus,
      }
      setDimensions((prev) => prev.map((d) => (d.id === dimId ? updated : d)))
      setSingleReport(updated) // P-U05：单点报告弹 modal
      // 2026-08-13 (P-U07)：单点研究完成 → 该维度计入「尚未保存」。
      setPendingSaveDims((prev) => (prev.includes(dimKey) ? prev : [...prev, dimKey]))
      recordEvent({ action: 'start_research', entityGlobalId: props.entityGlobalId })
    } catch {
      setDimensions((prev) =>
        prev.map((d) =>
          d.id === dimId
            ? {
                ...d,
                id: dimId,
                title: t.title,
                question,
                status: 'error' as DimensionStatus,
                error: '请求失败',
              }
            : d,
        ),
      )
    }
  }

  // 2026-08-13 (PO 纠偏)：aiAvailable 仍用于「综合报告 / 研究中评」文案区分（AI 走综合、否则走历史研究报告）。
  // 注意：研究中评按钮不再以 aiAvailable 隐藏（PO 要求跑完即出现），由 ResearchSummary 内部兜底。
  const aiAvailable = dimensions.some(
    (d) => d.status === 'success' && d.engine && d.engine !== 'deterministic',
  )

  // 2026-08-13 (P-U06)：四维度全 success（error 维度不算成功，需重研补齐）。
  const allSuccess =
    dimensions.length > 0 && dimensions.every((d) => d.status === 'success')

  // 2026-08-13 (P-U04 纠偏)：点「查看报告」→ 弹 modal（按 dimKey 找回该维度）。
  function handleViewReport(dimKey: string) {
    const tpl = templateFor(props.entityType)
    const idx = tpl.findIndex((t) => t.key === dimKey)
    if (idx < 0) return
    const dim = dimensions.find((d) => d.id === `dim-${idx}`)
    if (dim) setSingleReport(dim)
  }

  return (
    <>
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
        setSummaryStarted(false)
        setReportStarted(false)
        setPendingSaveDims([]) // P-U07：重置清空「尚未保存」提示
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
      aiAvailable={aiAvailable}
      allSuccess={allSuccess}
      onResearch={onResearchSingle}
      onViewReport={handleViewReport}
      expandAll={expandAll}
      onToggleExpandAll={() => setExpandAll((e) => !e)}
      summaryStarted={summaryStarted}
      reportStarted={reportStarted}
      onStartSummary={() => setSummaryStarted(true)}
      onStartReport={() => setReportStarted(true)}
      onSummaryAnswered={setSummaryAnswer}
      pendingSaveCount={pendingSaveDims.length}
    />
      {singleReport && (
        <DimensionReportModal dimension={singleReport} onClose={() => setSingleReport(null)} />
      )}
    </>
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
