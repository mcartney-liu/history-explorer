import { useEffect, useRef, useState } from 'react'
import {
  getProvenance,
  ProvenanceDisabledError,
  type ProvenanceRecord,
} from '../data/provenanceApi'
import ErrorCard, { type ErrorKind } from './ErrorCard'
import CollapsibleList from './ui/CollapsibleList'
import './ProvenancePanel.css'

export type ProvenanceStatus = 'loading' | 'success' | 'empty' | 'error' | 'disabled'

// 注意：entityId 必须是 LOCAL id（entity.id），不是 global_id。
export type ProvenancePanelProps = {
  entityId: string
}

// Container: owns the request lifecycle only (status + abort + retry). All
// rendering is delegated to the presentational ProvenancePanelView so it can
// be tested without a DOM. No global state — the status lives in this instance.
export default function ProvenancePanel({ entityId }: ProvenancePanelProps) {
  const [status, setStatus] = useState<ProvenanceStatus>('loading')
  const [records, setRecords] = useState<ProvenanceRecord[]>([])
  const [errorKind, setErrorKind] = useState<ErrorKind | undefined>(undefined)
  // Bump to force a refetch (used by the retry button).
  const [reloadKey, setReloadKey] = useState(0)
  const controllerRef = useRef<AbortController | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    controllerRef.current = controller
    setStatus('loading')
    setErrorKind(undefined)
    getProvenance(entityId, controller.signal)
      .then((rows) => {
        setRecords(rows)
        setStatus(rows.length > 0 ? 'success' : 'empty')
      })
      .catch((e) => {
        if (controller.signal.aborted) return
        if (e instanceof ProvenanceDisabledError) {
          setStatus('disabled')
          return
        }
        setErrorKind('network')
        setStatus('error')
      })
    return () => controller.abort()
  }, [entityId, reloadKey])

  return (
    <ProvenancePanelView
      status={status}
      records={records}
      errorKind={errorKind}
      onRetry={() => setReloadKey((k) => k + 1)}
    />
  )
}

export type ProvenancePanelViewProps = {
  status: ProvenanceStatus
  records: ProvenanceRecord[]
  errorKind?: ErrorKind
  onRetry?: () => void
}

// Frontend-only grouping of provenance records by their source_id (read model).
// No new fields are introduced — source_id is already returned by the backend;
// we only reorganize the existing records for readability. subject_id stays hidden.
function groupBySource(records: ProvenanceRecord[]): Array<[string, ProvenanceRecord[]]> {
  const map = new Map<string, ProvenanceRecord[]>()
  for (const r of records) {
    const bucket = map.get(r.source_id)
    if (bucket) bucket.push(r)
    else map.set(r.source_id, [r])
  }
  return [...map.entries()]
}

// 中文序号：给论断行标"第一/第二…"，超过 10 用"第 N"兜底。
const ORDINALS = ['第一', '第二', '第三', '第四', '第五', '第六', '第七', '第八', '第九', '第十']
function ordinalLabel(i: number): string {
  return ORDINALS[i] ?? `第${i + 1}`
}

// Presentational view — drives every visual state purely from props, so tests
// can render any state without running an effect.
//
// Redesign (2026-08-11): the panel previously showed machine IDs
// (source_id / claim_id) as the primary content and repeated `reference` on
// every row. Now each source becomes a card whose human-readable `reference`
// citation is shown ONCE, the curated `claim_text` is the prominent content of
// each evidence row, and the internal IDs are demoted to secondary, dim tags.
// subject_id is never rendered.
export function ProvenancePanelView({
  status,
  records,
  errorKind,
  onRetry,
}: ProvenancePanelViewProps) {
  // A3 (Phase 5): 状态规则（写死）——loading/empty/disabled 不显示（P4 缺失态 silent），
  // error 可见可重试，success 折叠行默认收起。标题仅在 success/error 呈现。
  if (status === 'loading' || status === 'empty' || status === 'disabled') {
    return null
  }

  if (status === 'error') {
    return (
      <section className="provenance-panel" aria-label="实体证据与溯源">
        <h3 className="provenance-title">证据与溯源</h3>
        <ErrorCard kind={errorKind ?? 'network'} onRetry={onRetry} />
      </section>
    )
  }

  // status === 'success'：折叠行（默认收起），展开看来源 + 论断
  const groups = groupBySource(records)
  const sourceCount = groups.length
  const claimCount = records.length

  return (
    <section className="provenance-panel" aria-label="实体证据与溯源">
      <details className="provenance-fold">
        <summary className="provenance-title provenance-fold__summary">证据与溯源</summary>
        <p className="provenance-perspective">关于它，哪些事实可证、依据什么</p>
        <p className="provenance-summary">
          本实体的事实由 <strong>{sourceCount}</strong> 个来源、
          <strong>{claimCount}</strong> 条论断支撑。
        </p>
        <div className="provenance-sources">
          {groups.map(([sourceId, recs]) => {
            const reference = recs[0]?.reference ?? ''
            return (
              <article className="prov-source" key={sourceId}>
                <header className="prov-source__head">
                  <span className="prov-source__label">来源</span>
                  <span className="prov-source__id" title="来源编号">
                    {sourceId}
                  </span>
                </header>

                <p className="prov-source__cite">
                  {reference || '（出处未标注）'}
                </p>

                <div className="prov-source__claims-block">
                  <h4 className="prov-claims__label">论断</h4>
                  <CollapsibleList className="prov-source__claims" visible={3}>
                    {recs.map((r, i) => (
                      <li className="prov-claim" key={r.claim_id}>
                        <span className="prov-claim__index" aria-hidden="true">
                          {ordinalLabel(i)}
                        </span>
                        <span className="prov-claim__text">
                          {r.claim_text || reference || '（未提供论断文本）'}
                        </span>
                        <span className="prov-claim__id" title="证据编号">
                          {r.claim_id}
                        </span>
                      </li>
                    ))}
                  </CollapsibleList>
                </div>
              </article>
            )
          })}
        </div>
      </details>
    </section>
  )
}
