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
  type TimelineOverlapStatus,
  type RelationshipPath,
} from '../data/relationshipUtils'
import {
  serializeInsightReport,
  buildPrintableInsight,
  serializeInsightReportAsMarkdown,
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

const STATUS_LABEL: Record<TimelineOverlapStatus, string> = {
  overlap: '时间重叠',
  gap: '时间无重叠',
  partial: '时间数据不足',
  unknown: '无时间数据',
}

// Local display helper (negative = BCE, positive = CE). Mirrors relationshipUtils.fmtYear.
function formatYear(v: number): string {
  const n = Math.round(v)
  return n < 0 ? `${Math.abs(n)} BC` : `${n} CE`
}

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
        <h5 className="rip-section-title">既有关系元数据</h5>
        {rels.length === 0 ? (
          <p className="rip-muted">无既有关系元数据（仅展示已存在的关系，不做推断）。</p>
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
        <h5 className="rip-section-title">时间线对比</h5>
        <span className={`rip-status rip-status-${overlap.status}`}>
          {STATUS_LABEL[overlap.status]}
        </span>
        <p className="rip-note">{overlap.note}</p>
      </section>

      <section className="rip-section rip-geo" aria-label="geographic-comparison">
        <h5 className="rip-section-title">地理对比</h5>
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
      <h4 className="rip-title">关系洞察（可视化既有元数据）</h4>

      {/* M18 — local-only export controls (Blob download / print view). */}
      <div className="rip-controls rip-export" aria-label="insight-export">
        <button type="button" className="rip-export-btn" onClick={handleDownloadJson}>
          下载 JSON 报告
        </button>
        <button type="button" className="rip-export-btn" onClick={handlePrintView}>
          打印视图
        </button>
        <button
          type="button"
          className="rip-export-btn"
          onClick={() => handleCopy(serializeInsightReportAsMarkdown(exportInput))}
        >
          复制 Markdown 报告
        </button>
        <span className="rip-export-note">仅本地生成，不上传。</span>
        {copyMsg === 'ok' && (
          <span className="rip-copy-status rip-copy-ok">已复制到剪贴板</span>
        )}
        {copyMsg === 'error' && (
          <span className="rip-copy-status rip-copy-error">复制失败，请手动选择文本复制</span>
        )}
      </div>

      {/* M17 — Relationship Type Summary (count only, no causal explanation). */}
      <details className="rip-block" open>
        <summary className="rip-block-summary">关系类型汇总</summary>
        {relationships.length === 0 ? (
          <p className="rip-muted">无既有关系元数据。</p>
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
        <summary className="rip-block-summary">关系类型矩阵</summary>
        {matrixRows.length === 0 ? (
          <p className="rip-muted">无既有关系元数据。</p>
        ) : (
          <>
            <div className="rip-controls" aria-label="matrix-controls">
              <label className="rip-control">
                筛选类型
                <select
                  className="rip-control-select"
                  value={matrixFilter}
                  onChange={(e) =>
                    setMatrixFilter(normalizeRelationshipFilter(e.target.value))
                  }
                >
                  <option value={RELATIONSHIP_FILTER_ALL}>全部类型</option>
                  {filterOptions.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </label>
              <label className="rip-control">
                按数量排序
                <select
                  className="rip-control-select"
                  value={matrixSort}
                  onChange={(e) =>
                    setMatrixSort(e.target.value as 'none' | 'desc' | 'asc')
                  }
                >
                  <option value="none">原始顺序</option>
                  <option value="desc">数量降序</option>
                  <option value="asc">数量升序</option>
                </select>
              </label>
            </div>
            {visibleRows.length === 0 ? (
              <p className="rip-muted">当前筛选无匹配行（数据未改变，仅显示被过滤）。</p>
            ) : (
              <table className="rip-matrix">
                <thead>
                  <tr>
                    <th>源实体</th>
                    <th>关系类型</th>
                    <th>目标实体</th>
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
        <summary className="rip-block-summary">关系中心性（基于既有元数据）</summary>
        {matrixRows.length === 0 ? (
          <p className="rip-muted">无既有关系元数据。</p>
        ) : (
          <>
            <p className="rip-note">基于已存在的关系边计数，仅供参考。</p>
            <table className="rip-matrix">
              <thead>
                <tr>
                  <th>实体</th>
                  <th>global_id</th>
                  <th>关系计数</th>
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

      {/* M19 — Pair Relationship Explorer (existing edges only, no causal words). */}
      <details className="rip-block">
        <summary className="rip-block-summary">成对关系探查（仅既有边）</summary>
        {distinctGids.length < 2 ? (
          <p className="rip-muted">请选择至少两个实体以使用成对关系探查。</p>
        ) : (
          <>
            <div className="rip-controls" aria-label="pair-explorer-controls">
              <label className="rip-control">
                实体 A
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
                实体 B
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
                <p className="rip-muted">所选两实体间无已存在的关系边。</p>
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
              <p className="rip-muted">请选择两个不同的实体以查看它们之间的已存在关系边。</p>
            )}
          </>
        )}
      </details>

      {/* M20 — Relationship Connectivity Explorer (existing edges only, no
          causal/inferred language; the disclaimer deliberately avoids the words
          推断 / 发现 / 因果 per the frozen Relationship Layer boundary). */}
      <details className="rip-block">
        <summary className="rip-block-summary">关系连通性探查（路径，仅既有边）</summary>
        {connGids.length < 2 ? (
          <p className="rip-muted">请选择至少两个实体以使用关系连通性探查。</p>
        ) : (
          <>
            <div className="rip-controls" aria-label="connectivity-controls">
              <label className="rip-control">
                源实体
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
                目标实体
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
                最大跳数
                <select
                  className="rip-control-select"
                  value={String(connHops)}
                  onChange={(e) => setConnHops(Number(e.target.value))}
                >
                  <option value="1">1 跳</option>
                  <option value="2">2 跳</option>
                  <option value="3">3 跳</option>
                </select>
              </label>
            </div>
            <p className="rip-note">
              本模块仅以图形方式呈现已存在的关系边所形成的路径；不新增连接，亦不提供任何解释。
            </p>
            {connSource === connTarget ? (
              <p className="rip-muted">请选择两个不同的实体以查看它们之间的路径。</p>
            ) : connectivityPaths.length === 0 ? (
              <p className="rip-muted">
                所选两实体之间没有已存在的边所能组成的路径（在 {connHops} 跳内）。
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
                  复制关系路径文本
                </button>
              </>
            )}
          </>
        )}
      </details>

      {/* M17 — Multi Entity Timeline Band (bounds + overlap only, no history).
          M18 — adds a view-only sort control; bounds via normalizeTimelineRange. */}
      <details className="rip-block">
        <summary className="rip-block-summary">多实体时间线带</summary>
        {timelineBand.length === 0 ? (
          <p className="rip-muted">请选择实体以查看时间线带。</p>
        ) : (
          <>
            <div className="rip-controls" aria-label="timeline-band-controls">
              <label className="rip-control">
                排序依据
                <select
                  className="rip-control-select"
                  value={bandSortBy}
                  onChange={(e) => setBandSortBy(e.target.value as 'start' | 'name')}
                >
                  <option value="start">起始时间</option>
                  <option value="name">名称</option>
                </select>
              </label>
              <label className="rip-control">
                顺序
                <select
                  className="rip-control-select"
                  value={bandSortDir}
                  onChange={(e) => setBandSortDir(e.target.value as 'asc' | 'desc')}
                >
                  <option value="asc">升序</option>
                  <option value="desc">降序</option>
                </select>
              </label>
            </div>
            <ul className="rip-timeline-band">
              {visibleBand.map((e) => {
                const range = normalizeTimelineRange(e)
                return (
                  <li key={e.gid ?? e.name} className="rip-band-row">
                    <span className="rip-band-name">{e.name}</span>
                    <span className="rip-band-range">
                      {range.start != null && range.end != null
                        ? `${formatYear(range.start)} – ${formatYear(range.end)}`
                        : '无时间数据'}
                    </span>
                    {e.overlaps.length > 0 && (
                      <span className="rip-band-overlap">时间重叠：{e.overlaps.join('、')}</span>
                    )}
                  </li>
                )
              })}
            </ul>
          </>
        )}
      </details>

      {pairs.length === 0 ? (
        <p className="rip-muted">请选择至少两个实体以查看逐对关系洞察。</p>
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
