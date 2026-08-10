import { useEffect, useRef, useState } from 'react'
import {
  getProvenance,
  ProvenanceDisabledError,
  type ProvenanceRecord,
} from '../data/provenanceApi'
import EmptyState from './EmptyState'
import ErrorCard, { type ErrorKind } from './ErrorCard'
import LoadingSkeleton from './LoadingSkeleton'

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

// Presentational view — drives every visual state purely from props, so tests
// can render any state without running an effect.
export function ProvenancePanelView({
  status,
  records,
  errorKind,
  onRetry,
}: ProvenancePanelViewProps) {
  return (
    <section className="provenance-panel" aria-label="实体证据与溯源">
      <h3>证据与溯源</h3>
      {status === 'loading' && <LoadingSkeleton label="读取事实溯源…" />}
      {status === 'disabled' && (
        <EmptyState message="事实溯源投影未启用（PROVENANCE_PROJECTION=false）。" />
      )}
      {status === 'empty' && (
        <EmptyState message="该实体暂无策展的事实溯源记录。" />
      )}
      {status === 'error' && (
        <ErrorCard kind={errorKind ?? 'network'} onRetry={onRetry} />
      )}
      {status === 'success' && (
        <div className="provenance-groups">
          {groupBySource(records).map(([sourceId, recs]) => (
            <section className="provenance-group" key={sourceId}>
              <h4 className="provenance-group-head">来源：{sourceId}</h4>
              <ul className="provenance-list">
                {recs.map((r) => (
                  <li className="provenance-item" key={r.claim_id}>
                    <div>
                      <strong>论断：</strong>{r.claim_id}
                    </div>
                    <div>
                      <strong>引用：</strong>{r.reference}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </section>
  )
}
