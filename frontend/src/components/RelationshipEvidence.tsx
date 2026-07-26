import { useEffect, useRef, useState } from 'react'
import {
  getProvenance,
  ProvenanceDisabledError,
  type ProvenanceRecord,
} from '../data/provenanceApi'
import EmptyState from './EmptyState'
import ErrorCard, { type ErrorKind } from './ErrorCard'
import LoadingSkeleton from './LoadingSkeleton'
// Reuse the provenance record list renderer from M30-A so the evidence
// presentation stays identical wherever provenance is shown.
import { ProvenancePanelView } from './ProvenancePanel'

// 注意：entityId 必须是 LOCAL id（例如 "person-ashoka"），不是 global_id。
export type RelationshipEvidenceProps = {
  entityId: string
  entityName?: string
}

// Container: owns the lazy fetch lifecycle only (status + abort + retry). The
// parent (RelationshipView) mounts this component ONLY when the user expands a
// branch's "查看依据" entry, so the fetch is strictly on-demand — never on page
// load. All rendering delegates to RelationshipEvidenceView.
export default function RelationshipEvidence({
  entityId,
  entityName,
}: RelationshipEvidenceProps) {
  const [status, setStatus] = useState<
    'loading' | 'success' | 'empty' | 'error' | 'disabled'
  >('loading')
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
    // entityId is the LOCAL id forwarded by RelationshipView (relatedEntities[].id).
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
    <RelationshipEvidenceView
      status={status}
      records={records}
      errorKind={errorKind}
      entityName={entityName}
      onRetry={() => setReloadKey((k) => k + 1)}
    />
  )
}

export type RelationshipEvidenceViewProps = {
  status: 'loading' | 'success' | 'empty' | 'error' | 'disabled'
  records: ProvenanceRecord[]
  errorKind?: ErrorKind
  entityName?: string
  onRetry?: () => void
}

// Presentational view — drives every visual state purely from props so tests
// can render any state without running an effect. For the success state it
// reuses ProvenancePanelView (the canonical provenance list renderer).
export function RelationshipEvidenceView({
  status,
  records,
  errorKind,
  entityName,
  onRetry,
}: RelationshipEvidenceViewProps) {
  return (
    <div
      className="rel-evidence"
      aria-label={`Evidence for ${entityName ?? 'related entity'}`}
    >
      {status === 'loading' && <LoadingSkeleton label="读取事实溯源…" />}
      {status === 'disabled' && (
        <EmptyState message="事实溯源投影未启用（PROVENANCE_PROJECTION=false）。" />
      )}
      {status === 'empty' && (
        <EmptyState message="该关系暂无策展的事实溯源记录。" />
      )}
      {status === 'error' && (
        <ErrorCard kind={errorKind ?? 'network'} onRetry={onRetry} />
      )}
      {status === 'success' && (
        <ProvenancePanelView status="success" records={records} />
      )}
    </div>
  )
}
