// M18 (Insight Export): pure, deterministic serialization of the relationship
// insight view.
//
// SCOPE (frozen): this module turns data ALREADY rendered by
// RelationshipInsightPanel into (a) a JSON string and (b) a printable HTML
// string. It is string-in/string-out only:
//   - NO network access (no upload, no fetch, no API calls)
//   - NO persistence (no database, no account binding, no browser storage)
//   - NO timestamps / randomness (same input -> byte-identical output)
//   - NO new KG semantics, NO inferred edges, NO causal narrative
// The browser-side glue (Blob download / print window) lives in the panel's
// event handlers, keeping everything here purely testable.

import type { RelationshipMatrixRow, TimelineBandEntry } from './relationshipUtils'

export const INSIGHT_REPORT_SCHEMA = 'history-explorer/insight-report@1'

export type InsightReportInput = {
  /** Friendly name of the exploration's main entity (display only). */
  mainEntityName?: string
  /** Authoritative global_id (`${topic}:${local_id}`) of the main entity. */
  mainGlobalId?: string
  /** Entities currently in the insight view. */
  entities: { name: string; gid?: string }[]
  /** Output of aggregateRelationshipTypes() — existing metadata tally. */
  relationshipTypeCounts: Record<string, number>
  /** Output of buildRelationshipTypeMatrix() — existing edges only. */
  matrixRows: RelationshipMatrixRow[]
  /** Output of buildMultiEntityTimelineBand() — bounds + overlaps only. */
  timelineBand: TimelineBandEntry[]
}

/** Sort record keys alphabetically so serialization is deterministic. */
function sortCounts(counts: Record<string, number>): Record<string, number> {
  const out: Record<string, number> = {}
  for (const key of Object.keys(counts ?? {}).sort()) out[key] = counts[key]
  return out
}

/**
 * Serialize the insight view to a pretty-printed JSON string. The report is a
 * FAITHFUL COPY of what the panel already shows — counts, matrix rows, and
 * timeline bounds — plus a schema identifier. It contains no timestamp and no
 * derived interpretation, so the same input always yields the same bytes.
 */
export function serializeInsightReport(input: InsightReportInput): string {
  const report = {
    schema: INSIGHT_REPORT_SCHEMA,
    mainEntity: {
      name: input.mainEntityName ?? null,
      globalId: input.mainGlobalId ?? null,
    },
    entities: (input.entities ?? []).map((e) => ({
      name: e.name,
      globalId: e.gid ?? null,
    })),
    relationshipTypeCounts: sortCounts(input.relationshipTypeCounts),
    matrix: (input.matrixRows ?? []).map((r) => ({
      source: r.source,
      sourceGlobalId: r.sourceGlobalId ?? null,
      relationType: r.relationType,
      target: r.target,
      targetGlobalId: r.targetGlobalId ?? null,
    })),
    timelineBand: (input.timelineBand ?? []).map((b) => ({
      name: b.name,
      globalId: b.gid ?? null,
      start: b.start,
      end: b.end,
      overlaps: [...b.overlaps],
    })),
  }
  return JSON.stringify(report, null, 2)
}

/** Minimal HTML escaping for text nodes/attributes in the printable view. */
function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

/** negative = BCE, positive = CE (mirrors the panel's formatYear). */
function fmtYear(v: number): string {
  const n = Math.round(v)
  return n < 0 ? `${Math.abs(n)} BC` : `${n} CE`
}

function fmtRange(start: number | null, end: number | null): string {
  if (start == null || end == null) return '无时间数据'
  return `${fmtYear(start)} – ${fmtYear(end)}`
}

/**
 * Build a self-contained, print-friendly HTML document string for the insight
 * view. Static markup only: no <script>, no external resources, no network.
 * All dynamic values are HTML-escaped. The document explicitly states that it
 * summarizes existing metadata only.
 */
export function buildPrintableInsight(input: InsightReportInput): string {
  const title = input.mainEntityName
    ? `关系洞察报告 — ${input.mainEntityName}`
    : '关系洞察报告'

  const entityItems = (input.entities ?? [])
    .map(
      (e) =>
        `<li>${escapeHtml(e.name)}${e.gid ? ` <code>${escapeHtml(e.gid)}</code>` : ''}</li>`,
    )
    .join('')

  const counts = sortCounts(input.relationshipTypeCounts)
  const countRows = Object.entries(counts)
    .map(
      ([type, count]) =>
        `<tr><td>${escapeHtml(type)}</td><td>${escapeHtml(count)}</td></tr>`,
    )
    .join('')

  const matrixRows = (input.matrixRows ?? [])
    .map(
      (r) =>
        `<tr><td>${escapeHtml(r.source)}</td><td>${escapeHtml(r.relationType)}</td><td>${escapeHtml(r.target)}</td></tr>`,
    )
    .join('')

  const bandRows = (input.timelineBand ?? [])
    .map(
      (b) =>
        `<tr><td>${escapeHtml(b.name)}</td><td>${escapeHtml(fmtRange(b.start, b.end))}</td><td>${escapeHtml(b.overlaps.join('、'))}</td></tr>`,
    )
    .join('')

  return [
    '<!DOCTYPE html>',
    '<html lang="zh-CN">',
    '<head>',
    '<meta charset="utf-8" />',
    `<title>${escapeHtml(title)}</title>`,
    '<style>',
    'body { font-family: system-ui, "Segoe UI", sans-serif; margin: 2rem; color: #222; }',
    'h1 { font-size: 1.3rem; } h2 { font-size: 1.05rem; margin-top: 1.5rem; }',
    'table { border-collapse: collapse; width: 100%; margin-top: 0.5rem; }',
    'th, td { border: 1px solid #bbb; padding: 0.35rem 0.55rem; text-align: left; font-size: 0.9rem; }',
    'th { background: #f2ede2; }',
    'code { background: #f5f5f5; padding: 0 0.25rem; }',
    '.disclaimer { color: #555; font-size: 0.85rem; margin-top: 1.5rem; border-top: 1px solid #bbb; padding-top: 0.5rem; }',
    '@media print { body { margin: 0.5rem; } }',
    '</style>',
    '</head>',
    '<body>',
    `<h1>${escapeHtml(title)}</h1>`,
    '<h2>实体清单</h2>',
    `<ul>${entityItems || '<li>无实体</li>'}</ul>`,
    '<h2>关系类型汇总</h2>',
    countRows
      ? `<table><thead><tr><th>关系类型</th><th>数量</th></tr></thead><tbody>${countRows}</tbody></table>`
      : '<p>无既有关系元数据。</p>',
    '<h2>关系类型矩阵</h2>',
    matrixRows
      ? `<table><thead><tr><th>源实体</th><th>关系类型</th><th>目标实体</th></tr></thead><tbody>${matrixRows}</tbody></table>`
      : '<p>无既有关系元数据。</p>',
    '<h2>多实体时间线带</h2>',
    bandRows
      ? `<table><thead><tr><th>实体</th><th>时间范围</th><th>时间重叠</th></tr></thead><tbody>${bandRows}</tbody></table>`
      : '<p>无时间线数据。</p>',
    '<p class="disclaimer">本报告仅汇总客户端已有的关系元数据与时间边界，不包含任何历史解释或自动结论。</p>',
    '</body>',
    '</html>',
  ].join('\n')
}
