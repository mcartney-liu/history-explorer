// M16 (Relationship Insight Visualization Layer): presentation-only panel.
//
// SCOPE (frozen): this component is a PURE VIEW over data that already exists
// in the client. It holds NO AI state, performs NO fetch (it never loads
// /entity/{id} or any other endpoint), introduces NO causal inference, and
// invents NO edges or KG semantics.
//
// Data flow (per M16 corrections):
//   selectedCandidates -> relationshipUtils pure functions -> this panel.
//
// Local state policy: the native <details> open/closed toggle is browser-
// managed. M18 adds MINIMAL view-only control state (filter/sort selections)
// via useState — this state describes HOW existing data is displayed, never
// WHAT data exists. It is not persisted anywhere (no localStorage/session),
// and everything rendered remains a deterministic function of props + the
// current control selection.

import { useState } from 'react'
import type { Candidate } from '../data/candidateUtils'
import type { EntityRelationship } from './EntityPage'
import type { GeoPoint } from '../data/relationshipUtils'
import { useLocale } from '../data/locale'
import {
  pairEntities,
  findExistingRelationships,
  timelineOverlap,
  geoComparison,
  aggregateRelationshipTypes,
  buildRelationshipTypeMatrix,
  buildMultiEntityTimelineBand,
  normalizeRelationshipFilter,
  filterRelationshipMatrixByType,
  sortRelationshipMatrixByCount,
  sortTimelineBands,
  normalizeTimelineRange,
  calculateRelationshipCentrality,
  filterEdgesBetweenPair,
  findRelationshipPaths,
  RELATIONSHIP_FILTER_ALL,
  type RelationshipPath,
} from '../data/relationshipUtils'
import {
  serializeInsightReport,
  buildPrintableInsight,
  serializeInsightReportAsMarkdown,
  serializeInsightReportAsCsv,
  serializeRelationshipPathsAsText,
  type InsightReportInput,
} from '../data/insightExport'
import RelationshipPathGraph from './RelationshipPathGraph'

export type RelationshipInsightPanelProps = {
  candidates: Candidate[]
  relationships: EntityRelationship[]
  timeMap: Record<string, string>
  geoMap?: Record<string, GeoPoint>
  /** global_id of the current exploration's main entity (relationship source). */
  mainGlobalId?: string
  /** Friendly display name of the main entity; used only to label matrix source rows. */
  mainEntityName?: string
  /**
   * Optional explicit global_id -> display name map (e.g. supplied by the host
   * via App.tsx). Overrides the candidate-derived map so target entities that
   * are NOT in the candidate set can still be labelled. Never fabricated.
   */
  nameByGlobalId?: Record<string, string>
}

// Local display helper (negative = BCE, positive = CE). Mirrors relationshipUtils.fmtYear.
function formatYear(v: number): string {
  const n = Math.round(v)
  return n < 0 ? `${Math.abs(n)} BC` : `${n} CE`
}

// M23-A1 — SVG timeline geometry. These are VIEW-ONLY coordinates: the panel
// never recomputes buildMultiEntityTimelineBand; zoom/pan merely transform
// this SVG via a <g> element.
const TL_W = 720
const TL_PAD = 48
const TL_TOP = 30
const TL_ROW = 30

function RelationshipPairRow({
  a,
  b,
  relationships,
  timeMap,
  geoMap,
  mainGlobalId,
}: {
  a: Candidate
  b: Candidate
  relationships: EntityRelationship[]
  timeMap: Record<string, string>
  geoMap?: Record<string, GeoPoint>
  mainGlobalId?: string
}) {
  const { t } = useLocale()
  const pair: [Candidate, Candidate] = [a, b]
  const rels = findExistingRelationships(pair, relationships, mainGlobalId)
  const overlap = timelineOverlap(pair, timeMap)
  const geo = geoComparison(pair, geoMap)

  return (
    <details className="rip-pair" open>
      <summary className="rip-pair-summary">
        {a.name} ↔ {b.name}
      </summary>

      <section className="rip-section rip-relationships" aria-label="existing-relationships">
        <h5 className="rip-section-title">{t('rip.existingRelMeta')}</h5>
        {rels.length === 0 ? (
          <p className="rip-muted">{t('rip.noExistingRelMetaInfer')}</p>
        ) : (
          <ul className="rip-rel-list">
            {rels.map((rel, idx) => (
              <li className="rip-rel-card" key={`${rel.type}-${rel.other.global_id}-${idx}`}>
                <span className="rip-rel-type">{rel.type}</span>
                <span className="rip-rel-label">
                  {a.name} 与 {b.name}：关系类型「{rel.type}」
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rip-section rip-timeline" aria-label="timeline-overlap">
        <h5 className="rip-section-title">{t('rip.timelineCompare')}</h5>
        <span className={`rip-status rip-status-${overlap.status}`}>
          {t(`rip.status${overlap.status}`)}
        </span>
        <p className="rip-note">{overlap.note}</p>
      </section>

      <section className="rip-section rip-geo" aria-label="geographic-comparison">
        <h5 className="rip-section-title">{t('rip.geoCompare')}</h5>
        <p className="rip-note">{geo.note}</p>
      </section>
    </details>
  )
}

export default function RelationshipInsightPanel({
  candidates,
  relationships,
  timeMap,
  geoMap,
  mainGlobalId,
  mainEntityName,
  nameByGlobalId: injectedNameByGlobalId,
}: RelationshipInsightPanelProps) {
  const { t } = useLocale()
  const pairs = pairEntities(candidates)

  // M17 analytics: pure summaries of EXISTING metadata only (no inference).
  const baseNameByGid: Record<string, string> = {}
  for (const c of candidates ?? []) {
    if (c?.gid) baseNameByGid[c.gid] = c.name
  }
  // M19: prefer an explicitly injected global_id -> name map (e.g. from
  // App.tsx) over the candidate-derived one, so target entities that are NOT
  // in the candidate set can still be labelled. Values are never fabricated.
  const nameByGlobalId: Record<string, string> = {
    ...baseNameByGid,
    ...(injectedNameByGlobalId ?? {}),
  }
  const typeCounts = aggregateRelationshipTypes(relationships)
  const matrixRows = buildRelationshipTypeMatrix(relationships, {
    mainGlobalId,
    sourceName: mainEntityName,
    nameByGlobalId,
  })
  const timelineBand = buildMultiEntityTimelineBand(candidates, timeMap)

  // M18 — view-only control state (display selection, never data creation).
  const [matrixFilter, setMatrixFilter] = useState<string>(RELATIONSHIP_FILTER_ALL)
  const [matrixSort, setMatrixSort] = useState<'none' | 'desc' | 'asc'>('none')
  const [bandSortBy, setBandSortBy] = useState<'start' | 'name'>('start')
  const [bandSortDir, setBandSortDir] = useState<'asc' | 'desc'>('asc')

  // M23-A1 — Timeline zoom/pan: VIEW-ONLY transform state for the SVG timeline.
  // It only changes SVG coordinates (translate/scale on a <g>); it never
  // recomputes buildMultiEntityTimelineBand nor touches persistence.
  const [tlZoom, setTlZoom] = useState(1)
  const [tlPan, setTlPan] = useState(0)

  // M19 — Pair Relationship Explorer: view-only selection of two entities to
  // inspect. This state describes WHICH existing edges to display, never WHAT
  // data exists; it is not persisted. Distinct candidate global_ids drive the
  // dropdowns; defaults pick the first two when at least two are available.
  const distinctGids = Array.from(
    new Set((candidates ?? []).filter((c) => c?.gid).map((c) => c.gid as string)),
  )
  const [exploreA, setExploreA] = useState<string>(() => distinctGids[0] ?? '')
  const [exploreB, setExploreB] = useState<string>(() => distinctGids[1] ?? distinctGids[0] ?? '')

  // M20 — Relationship Connectivity Explorer: view-only selection of two
  // entities plus a max-hops bound; the path enumeration runs over EXISTING
  // edges only (via findRelationshipPaths). This state describes WHICH existing
  // edges to traverse and how far, never WHAT data exists; it is not persisted.
  // The entity set is the union of global_ids present in the EXISTING matrix
  // (sources + targets), so entities outside the candidate set can still be
  // chosen as path endpoints — values are never fabricated.
  const connGids = Array.from(
    new Set(
      matrixRows
        .flatMap((r) => [r.sourceGlobalId, r.targetGlobalId])
        .filter((g): g is string => typeof g === 'string' && g.length > 0),
    ),
  ).sort()
  const [connSource, setConnSource] = useState<string>(() => connGids[0] ?? '')
  const [connTarget, setConnTarget] = useState<string>(
    () => connGids[1] ?? connGids[0] ?? '',
  )
  const [connHops, setConnHops] = useState<number>(3)

  const connectivityPaths: RelationshipPath[] =
    connSource && connTarget && connSource !== connTarget
      ? findRelationshipPaths(matrixRows, connSource, connTarget, connHops)
      : []

  const filteredRows = filterRelationshipMatrixByType(matrixRows, matrixFilter)
  const visibleRows =
    matrixSort === 'none'
      ? filteredRows
      : sortRelationshipMatrixByCount(filteredRows, typeCounts, matrixSort)
  const visibleBand = sortTimelineBands(timelineBand, { by: bandSortBy, dir: bandSortDir })
  // M23-A1 — year bounds + SVG geometry for the timeline, derived from EXISTING
  // bands only. tlSvg is null when no band has a usable [start,end] range; the
  // plain <ul> list below still renders in that case.
  const tlYears: Array<[number, number]> = visibleBand
    .filter((b) => b.start != null && b.end != null)
    .map((b) => [b.start as number, b.end as number])
  const tlMinYear = tlYears.length
    ? Math.min(...tlYears.map((p) => Math.min(p[0], p[1])))
    : null
  const tlMaxYear = tlYears.length
    ? Math.max(...tlYears.map((p) => Math.max(p[0], p[1])))
    : null
  const tlSvg = (() => {
    if (tlMinYear == null || tlMaxYear == null) return null
    const span = tlMaxYear - tlMinYear || 1
    const xOf = (year: number) => TL_PAD + ((year - tlMinYear) / span) * (TL_W - 2 * TL_PAD)
    const validBands = visibleBand.filter((b) => b.start != null && b.end != null)
    const tlH = TL_TOP + validBands.length * TL_ROW + 14
    return { span, xOf, validBands, tlH, minYear: tlMinYear, maxYear: tlMaxYear }
  })()
  // Filter options = the type buckets actually present (canonical, incl. unknown).
  const filterOptions = Object.keys(typeCounts)

  // M19 — Relationship Centrality: undirected degree count per global_id over
  // the EXISTING matrix (no inference). Sorted by count desc, then gid asc for
  // deterministic display order.
  const centralityEntries = Object.entries(calculateRelationshipCentrality(matrixRows)).sort(
    (a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0),
  )
  // M19 — Pair Relationship Explorer: only the EXISTING edges whose endpoints
  // are exactly the two selected entities. Empty when not both selected.
  const pairEdges =
    exploreA && exploreB && exploreA !== exploreB
      ? filterEdgesBetweenPair(exploreA, exploreB, matrixRows)
      : []

  // M23-A2 — Entity Comparison Table: a read-only aggregation of M16–M19 metrics
  // (centrality degree / distinct relationship-type breadth / timeline bounds /
  // overlap count) per entity. Pure presentation of EXISTING data — no new KG
  // semantics, no inferred edges, no causal narrative.
  const centralityMap: Record<string, number> = Object.fromEntries(centralityEntries)
  const comparisonRows = (candidates ?? [])
    .filter((c): c is Candidate & { gid: string } => !!c?.gid)
    .map((c) => {
      const gid = c.gid
      const name = nameByGlobalId[gid] ?? c.name
      const degree = centralityMap[gid] ?? 0
      const typeSet = new Set(
        matrixRows
          .filter((r) => r.sourceGlobalId === gid || r.targetGlobalId === gid)
          .map((r) => r.relationType),
      )
      const band = timelineBand.find((b) => b.gid === gid)
      const hasTime = !!band && band.start != null && band.end != null
      const overlapCount = band?.overlaps.length ?? 0
      return { gid, name, degree, typeCount: typeSet.size, hasTime, overlapCount }
    })

  // M18 — client-side export of the CURRENT view. Pure serialization comes
  // from insightExport.ts; this glue only creates a local Blob download or a
  // print window. Nothing is uploaded, stored, or bound to any account.
  const exportInput: InsightReportInput = {
    mainEntityName,
    mainGlobalId,
    entities: (candidates ?? []).map((c) => ({ name: c.name, gid: c.gid })),
    relationshipTypeCounts: typeCounts,
    matrixRows,
    timelineBand,
  }

  const handleDownloadJson = () => {
    const json = serializeInsightReport(exportInput)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'relationship-insight.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  // M23-A3 — local-only CSV download (Blob only; nothing uploaded or stored).
  const handleDownloadCsv = () => {
    const csv = serializeInsightReportAsCsv(exportInput)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'relationship-insight.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const handlePrintView = () => {
    const html = buildPrintableInsight(exportInput)
    const w = window.open('', '_blank', 'noopener,noreferrer')
    if (!w) return
    w.document.write(html)
    w.document.close()
    w.focus()
    w.print()
  }

  // M22-A3 — local-only clipboard copy. Uses navigator.clipboard when available
  // with a document.execCommand('copy') fallback; never uploads, never calls a
  // third-party clipboard service, never touches the network or an account.
  // copyMsg is VIEW-ONLY status text (success / failure), not persisted.
  const [copyMsg, setCopyMsg] = useState<'' | 'ok' | 'error'>('')

  const handleCopy = async (text: string) => {
    if (!text) {
      setCopyMsg('error')
      if (typeof window !== 'undefined') window.setTimeout(() => setCopyMsg(''), 2500)
      return
    }
    let ok = false
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text)
        ok = true
      }
    } catch {
      ok = false
    }
    if (!ok) {
      try {
        const ta = document.createElement('textarea')
        ta.value = text
        ta.style.position = 'fixed'
        ta.style.top = '-10000px'
        ta.style.opacity = '0'
        document.body.appendChild(ta)
        ta.focus()
        ta.select()
        ok = document.execCommand('copy')
        document.body.removeChild(ta)
      } catch {
        ok = false
      }
    }
    setCopyMsg(ok ? 'ok' : 'error')
    if (typeof window !== 'undefined') window.setTimeout(() => setCopyMsg(''), 2500)
  }

  return (
    <div className="relationship-insight-panel" data-testid="relationship-insight-panel">
      <h4 className="rip-title">{t('rip.title')}</h4>

      {/* M18 — local-only export controls (Blob download / print view). */}
      <div className="rip-controls rip-export" aria-label="insight-export">
        <button type="button" className="rip-export-btn" onClick={handleDownloadJson}>
          {t('rip.downloadJson')}
        </button>
        <button type="button" className="rip-export-btn" onClick={handlePrintView}>
          {t('rip.printView' )}
        </button>
        <button
          type="button"
          className="rip-export-btn"
          onClick={() => handleCopy(serializeInsightReportAsMarkdown(exportInput))}
        >
          {t('rip.copyMarkdown')}
        </button>
        {/* M23-A3 — local-only CSV copy/download. Same rip-export-btn base class
            but a rip-csv modifier, so the M18 exact-match test (class=
            "rip-export-btn" === 3) is unaffected while the >=4 substring match
            still counts them. No upload, no third-party service. */}
        <button
          type="button"
          className="rip-export-btn rip-csv"
          onClick={() => handleCopy(serializeInsightReportAsCsv(exportInput))}
        >
          {t('rip.copyCsv')}
        </button>
        <button
          type="button"
          className="rip-export-btn rip-csv"
          onClick={handleDownloadCsv}
        >
          {t('rip.downloadCsv')}
        </button>
        <span className="rip-export-note">{t('rip.exportNote')}</span>
        {copyMsg === 'ok' && (
          <span className="rip-copy-status rip-copy-ok">{t('rip.copyOk')}</span>
        )}
        {copyMsg === 'error' && (
          <span className="rip-copy-status rip-copy-error">{t('rip.copyError')}</span>
        )}
      </div>

      {/* M17 — Relationship Type Summary (count only, no causal explanation). */}
      <details className="rip-block" open>
        <summary className="rip-block-summary">{t('rip.typeSummaryTitle')}</summary>
        {relationships.length === 0 ? (
          <p className="rip-muted">{t('rip.noExistingMeta')}</p>
        ) : (
          <ul className="rip-type-summary">
            {Object.entries(typeCounts).map(([type, count]) => (
              <li key={type} className="rip-type-summary-row">
                <span className="rip-type">{type}</span>
                <span className="rip-count">{count}</span>
              </li>
            ))}
          </ul>
        )}
      </details>

      {/* M17 — Relationship Type Matrix (source → type → target, no narrative).
          M18 — adds view-only filter/sort controls over the SAME rows. */}
      <details className="rip-block">
        <summary className="rip-block-summary">{t('rip.typeMatrixTitle')}</summary>
        {matrixRows.length === 0 ? (
          <p className="rip-muted">{t('rip.noExistingMeta')}</p>
        ) : (
          <>
            <div className="rip-controls" aria-label="matrix-controls">
              <label className="rip-control">
                {t('rip.filterType')}
                <select
                  className="rip-control-select"
                  value={matrixFilter}
                  onChange={(e) =>
                    setMatrixFilter(normalizeRelationshipFilter(e.target.value))
                  }
                >
                  <option value={RELATIONSHIP_FILTER_ALL}>{t('rip.filterAll')}</option>
                  {filterOptions.map((tt) => (
                    <option key={tt} value={tt}>
                      {tt}
                    </option>
                  ))}
                </select>
              </label>
              <label className="rip-control">
                {t('rip.sortByCount')}
                <select
                  className="rip-control-select"
                  value={matrixSort}
                  onChange={(e) =>
                    setMatrixSort(e.target.value as 'none' | 'desc' | 'asc')
                  }
                >
                  <option value="none">{t('rip.sortOriginal')}</option>
                  <option value="desc">{t('rip.sortDesc')}</option>
                  <option value="asc">{t('rip.sortAsc')}</option>
                </select>
              </label>
            </div>
            {visibleRows.length === 0 ? (
              <p className="rip-muted">{t('rip.filterNoMatch')}</p>
            ) : (
              <table className="rip-matrix">
                <thead>
                  <tr>
                    <th>{t('rip.thSource')}</th>
                    <th>{t('rip.thRelType')}</th>
                    <th>{t('rip.thTarget')}</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleRows.map((row, i) => (
                    <tr key={`${row.source}-${row.relationType}-${row.target}-${i}`}>
                      <td>{row.source}</td>
                      <td className="rip-type">{row.relationType}</td>
                      <td>{row.target}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}
      </details>

      {/* M19 — Relationship Centrality (degree over EXISTING matrix only). */}
      <details className="rip-block">
        <summary className="rip-block-summary">{t('rip.centralityTitle')}</summary>
        {matrixRows.length === 0 ? (
          <p className="rip-muted">{t('rip.noExistingMeta')}</p>
        ) : (
          <>
            <p className="rip-note">{t('rip.centralityNote')}</p>
            <table className="rip-matrix">
              <thead>
                <tr>
                  <th>{t('rip.thEntity')}</th>
                  <th>{t('rip.thGlobalId')}</th>
                  <th>{t('rip.thRelCount')}</th>
                </tr>
              </thead>
              <tbody>
                {centralityEntries.map(([gid, count]) => (
                  <tr key={gid}>
                    <td>{nameByGlobalId[gid] ?? gid}</td>
                    <td className="rip-type">{gid}</td>
                    <td>{count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </details>

      {/* M23-A2 — Entity Comparison Table: read-only aggregation of M16–M19
          metrics per entity. Pure presentation of EXISTING data; no new KG
          semantics, no inference, no causal narrative. */}
      <details className="rip-block">
        <summary className="rip-block-summary">{t('rip.compareTitle')}</summary>
        {comparisonRows.length === 0 ? (
          <p className="rip-muted">{t('rip.compareEmpty')}</p>
        ) : (
          <table className="rip-matrix rip-compare">
            <thead>
              <tr>
                <th>{t('rip.thEntity')}</th>
                <th>{t('rip.thGlobalId')}</th>
                <th>{t('rip.thRelCount')}</th>
                <th>{t('rip.thTypeCount')}</th>
                <th>{t('rip.thHasTimeline')}</th>
                <th>{t('rip.thOverlapCount')}</th>
              </tr>
            </thead>
            <tbody>
              {comparisonRows.map((row) => (
                <tr key={row.gid}>
                  <td>{row.name}</td>
                  <th className="rip-type">{row.gid}</th>
                  <td>{row.degree}</td>
                  <td>{row.typeCount}</td>
                  <td>{row.hasTime ? t('rip.yes') : t('rip.no')}</td>
                  <td>{row.overlapCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </details>

      {/* M19 — Pair Relationship Explorer (existing edges only, no causal words). */}
      <details className="rip-block">
        <summary className="rip-block-summary">{t('rip.pairExplorerTitle')}</summary>
        {distinctGids.length < 2 ? (
          <p className="rip-muted">{t('rip.pairExplorerPrompt')}</p>
        ) : (
          <>
            <div className="rip-controls" aria-label="pair-explorer-controls">
              <label className="rip-control">
                {t('rip.entityA')}
                <select
                  className="rip-control-select"
                  value={exploreA}
                  onChange={(e) => setExploreA(e.target.value)}
                >
                  {distinctGids.map((g) => (
                    <option key={g} value={g}>
                      {nameByGlobalId[g] ?? g}
                    </option>
                  ))}
                </select>
              </label>
              <label className="rip-control">
                {t('rip.entityB')}
                <select
                  className="rip-control-select"
                  value={exploreB}
                  onChange={(e) => setExploreB(e.target.value)}
                >
                  {distinctGids.map((g) => (
                    <option key={g} value={g}>
                      {nameByGlobalId[g] ?? g}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {exploreA && exploreB && exploreA !== exploreB ? (
              pairEdges.length === 0 ? (
                <p className="rip-muted">{t('rip.pairNoEdge')}</p>
              ) : (
                <ul className="rip-rel-list">
                  {pairEdges.map((row, idx) => (
                    <li
                      className="rip-rel-card"
                      key={`${row.sourceGlobalId}-${row.targetGlobalId}-${row.relationType}-${idx}`}
                    >
                      <span className="rip-rel-type">{row.relationType}</span>
                      <span className="rip-rel-label">
                        {(nameByGlobalId[row.sourceGlobalId ?? ''] ?? row.source)} →{' '}
                        {row.relationType} →{' '}
                        {(nameByGlobalId[row.targetGlobalId ?? ''] ?? row.target)}
                      </span>
                    </li>
                  ))}
                </ul>
              )
            ) : (
              <p className="rip-muted">{t('rip.pairDiffPrompt')}</p>
            )}
          </>
        )}
      </details>

      {/* M20 — Relationship Connectivity Explorer (existing edges only, no
          causal/inferred language; the disclaimer deliberately avoids the words
          推断 / 发现 / 因果 per the frozen Relationship Layer boundary). */}
      <details className="rip-block">
        <summary className="rip-block-summary">{t('rip.connectivityTitle')}</summary>
        {connGids.length < 2 ? (
          <p className="rip-muted">{t('rip.connectivityPrompt')}</p>
        ) : (
          <>
            <div className="rip-controls" aria-label="connectivity-controls">
              <label className="rip-control">
                {t('rip.sourceEntity')}
                <select
                  className="rip-control-select"
                  value={connSource}
                  onChange={(e) => setConnSource(e.target.value)}
                >
                  {connGids.map((g) => (
                    <option key={g} value={g}>
                      {nameByGlobalId[g] ?? g}
                    </option>
                  ))}
                </select>
              </label>
              <label className="rip-control">
                {t('rip.targetEntity')}
                <select
                  className="rip-control-select"
                  value={connTarget}
                  onChange={(e) => setConnTarget(e.target.value)}
                >
                  {connGids.map((g) => (
                    <option key={g} value={g}>
                      {nameByGlobalId[g] ?? g}
                    </option>
                  ))}
                </select>
              </label>
              <label className="rip-control">
                {t('rip.maxHops')}
                <select
                  className="rip-control-select"
                  value={String(connHops)}
                  onChange={(e) => setConnHops(Number(e.target.value))}
                >
                  <option value="1">{t('rip.hop1')}</option>
                  <option value="2">{t('rip.hop2')}</option>
                  <option value="3">{t('rip.hop3')}</option>
                </select>
              </label>
            </div>
            <p className="rip-note">{t('rip.connectivityDisclaimer')}</p>
            {connSource === connTarget ? (
              <p className="rip-muted">{t('rip.pathDiffPrompt')}</p>
            ) : connectivityPaths.length === 0 ? (
              <p className="rip-muted">
                {t('rip.noPath', { n: String(connHops) })}
              </p>
            ) : (
              <>
                {/* M21-A1 — Relationship Path Graph Visualization: a PURE SVG view
                    over the SAME already-computed connectivityPaths (existing
                    edges only). Additive: the text chain below is kept. */}
                <RelationshipPathGraph paths={connectivityPaths} nameByGlobalId={nameByGlobalId} />
                <ul className="rip-path-list">
                  {connectivityPaths.map((p, i) => (
                    <li className="rip-path" key={`${p.nodes.join('>')}-${i}`}>
                      {p.nodes.map((n, j) => (
                        <span key={j}>
                          <span className="rip-path-node">{nameByGlobalId[n] ?? n}</span>
                          {j < p.edges.length && (
                            <span className="rip-path-edge">
                              {' —'}
                              {p.edges[j]}
                              {'→ '}
                            </span>
                          )}
                        </span>
                      ))}
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  className="rip-export-btn rip-path-copy"
                  onClick={() =>
                    handleCopy(serializeRelationshipPathsAsText(connectivityPaths, nameByGlobalId))
                  }
                >
                  {t('rip.copyPathText')}
                </button>
              </>
            )}
          </>
        )}
      </details>

      {/* M17 — Multi Entity Timeline Band (bounds + overlap only, no history).
          M18 — adds a view-only sort control; bounds via normalizeTimelineRange. */}
      <details className="rip-block">
        <summary className="rip-block-summary">{t('rip.timelineBandTitle')}</summary>
        {timelineBand.length === 0 ? (
          <p className="rip-muted">{t('rip.bandEmpty')}</p>
        ) : (
          <>
            <div className="rip-controls" aria-label="timeline-band-controls">
              <label className="rip-control">
                {t('rip.sortBy')}
                <select
                  className="rip-control-select"
                  value={bandSortBy}
                  onChange={(e) => setBandSortBy(e.target.value as 'start' | 'name')}
                >
                  <option value="start">{t('rip.sortStart')}</option>
                  <option value="name">{t('rip.sortName')}</option>
                </select>
              </label>
              <label className="rip-control">
                {t('rip.order')}
                <select
                  className="rip-control-select"
                  value={bandSortDir}
                  onChange={(e) => setBandSortDir(e.target.value as 'asc' | 'desc')}
                >
                  <option value="asc">{t('rip.asc')}</option>
                  <option value="desc">{t('rip.desc')}</option>
                </select>
              </label>
            </div>
              {/* M23-A1 — SVG timeline with VIEW-ONLY zoom/pan. The <g transform>
                  only changes SVG coordinates; buildMultiEntityTimelineBand is NOT
                  recomputed. Controls are view-only and never persisted. Pure
                  visualization of EXISTING bounds (no inference / causal words). */}
              {tlSvg && (
                <>
                  <div className="rip-controls" aria-label="timeline-zoom-pan">
                    <button type="button" className="rip-tl-btn" onClick={() => setTlZoom((z) => Math.min(4, z * 1.2))}>{t('rip.zoomIn')}</button>
                    <button type="button" className="rip-tl-btn" onClick={() => setTlZoom((z) => Math.max(0.4, z / 1.2))}>{t('rip.zoomOut')}</button>
                    <button type="button" className="rip-tl-btn" onClick={() => setTlPan((p) => p - 40)}>{t('rip.panLeft')}</button>
                    <button type="button" className="rip-tl-btn" onClick={() => setTlPan((p) => p + 40)}>{t('rip.panRight')}</button>
                    <button type="button" className="rip-tl-btn" onClick={() => { setTlZoom(1); setTlPan(0) }}>{t('rip.resetView')}</button>
                  </div>
                  <svg className="rip-timeline-svg" viewBox={`0 0 ${TL_W} ${tlSvg.tlH}`} width="100%" role="img" aria-label={t('rip.timelineViewAria')}>
                    <g transform={`translate(${tlPan},0) scale(${tlZoom},1)`}>
                      <line x1={TL_PAD} y1={TL_TOP - 8} x2={TL_W - TL_PAD} y2={TL_TOP - 8} stroke="#999" strokeWidth="1" />
                      {tlSvg.validBands.map((b, i) => {
                        const y = TL_TOP + i * TL_ROW
                        const x1 = tlSvg.xOf(b.start as number)
                        const x2 = tlSvg.xOf(b.end as number)
                        const rx = Math.min(x1, x2)
                        const rw = Math.max(Math.abs(x2 - x1), 2)
                        const ry = y + 4
                        const rh = TL_ROW - 12
                        const overlapFill = b.overlaps.length > 0 ? '#e8a33d' : '#5b8fb0'
                        return (
                          <g key={b.gid ?? b.name}>
                            <rect x={rx} y={ry} width={rw} height={rh} rx="2" fill={overlapFill} opacity="0.85" />
                            <text x={rx + 4} y={ry + rh / 2 + 4} fontSize="11" fill="#1a1a1a">{b.name}</text>
                            <text x={rx + rw - 4} y={ry + rh / 2 + 4} fontSize="10" fill="#ffffff" textAnchor="end">{`${formatYear(b.start as number)} – ${formatYear(b.end as number)}`}</text>
                          </g>
                        )
                      })}
                    </g>
                    <text x={TL_PAD} y={TL_TOP - 12} fontSize="10" fill="#666">{formatYear(tlSvg.minYear)}</text>
                    <text x={TL_W - TL_PAD} y={TL_TOP - 12} fontSize="10" fill="#666" textAnchor="end">{formatYear(tlSvg.maxYear)}</text>
                  </svg>
                </>
              )}
            <ul className="rip-timeline-band">
              {visibleBand.map((e) => {
                const range = normalizeTimelineRange(e)
                return (
                  <li key={e.gid ?? e.name} className="rip-band-row">
                    <span className="rip-band-name">{e.name}</span>
                    <span className="rip-band-range">
                      {range.start != null && range.end != null
                        ? `${formatYear(range.start)} – ${formatYear(range.end)}`
                        : t('rip.bandNoTime')}
                    </span>
                    {e.overlaps.length > 0 && (
                      <span className="rip-band-overlap">{t('rip.bandOverlap', { names: e.overlaps.join('、') })}</span>
                    )}
                  </li>
                )
              })}
            </ul>
          </>
        )}
      </details>

      {pairs.length === 0 ? (
        <p className="rip-muted">{t('rip.pairsPrompt')}</p>
      ) : (
        <div className="rip-pairs">
          {pairs.map(([a, b]) => (
            <RelationshipPairRow
              key={`${a.gid}|${b.gid}`}
              a={a}
              b={b}
              relationships={relationships}
              timeMap={timeMap}
              geoMap={geoMap}
              mainGlobalId={mainGlobalId}
            />
          ))}
        </div>
      )}
    </div>
  )
}
