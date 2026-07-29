// M16 (Relationship Insight Visualization Layer) — panel presentation tests.
// Mirrors the project convention: renderToStaticMarkup (no jsdom), assert on
// static HTML. The panel is a PURE VIEW — it must never fetch and must only
// surface EXISTING metadata.

import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import type { ReactElement } from 'react'
import RelationshipInsightPanel from './RelationshipInsightPanel'
import { LocaleProvider } from '../data/locale'
import type { Candidate } from '../data/candidateUtils'
import type { EntityRelationship } from './EntityPage'
import { serializeInsightReportAsCsv } from '../data/insightExport'

const r2s = renderToStaticMarkup
const render = (el: ReactElement) => r2s(<LocaleProvider>{el}</LocaleProvider>)

const qin: Candidate = { gid: 'china:qin', name: '秦始皇', type: 'Person', topic: 'china' }
const alex: Candidate = { gid: 'greece:alex', name: '亚历山大', type: 'Person', topic: 'greece' }
const rome: Candidate = { gid: 'rome:empire', name: '罗马帝国', type: 'Empire', topic: 'rome' }

const relationships: EntityRelationship[] = [
  {
    type: 'contemporary_of',
    source: 'empire',
    target: 'alex',
    direction: 'outgoing',
    other: { id: 'alex', name: '亚历山大', type: 'Person', global_id: 'greece:alex', topic: 'greece' },
  },
]

const timeMap: Record<string, string> = {
  秦始皇: '259 BC - 210 BC',
  亚历山大: '356 BC - 323 BC',
  罗马帝国: '27 BC - 476 CE',
}

describe('RelationshipInsightPanel', () => {
  it('prompts for at least two entities when fewer than 2 candidates are selected', () => {
    const html = render(
      <RelationshipInsightPanel candidates={[qin]} relationships={[]} timeMap={timeMap} />,
    )
    expect(html).toContain('relationship-insight-panel')
    expect(html).toContain('请选择至少两个实体')
    // No pair sections rendered.
    expect(html).not.toContain('rip-pair')
  })

  it('does not fetch and only renders existing relationship metadata', () => {
    const html = render(
      <RelationshipInsightPanel
        candidates={[rome, alex]}
        relationships={relationships}
        timeMap={timeMap}
        mainGlobalId="rome:empire"
      />,
    )
    // Existing edge rome -> alex is shown.
    expect(html).toContain('rip-rel-card')
    expect(html).toContain('contemporary_of')
    // No inferred/discovered edge language.
    expect(html).not.toContain('推断')
    expect(html).not.toContain('发现')
  })

  it('reports "no existing relationship metadata" for a pair with no edge', () => {
    const html = render(
      <RelationshipInsightPanel
        candidates={[qin, alex]}
        relationships={relationships}
        timeMap={timeMap}
        mainGlobalId="rome:empire"
      />,
    )
    expect(html).toContain('无既有关系元数据')
    expect(html).not.toContain('rip-rel-card')
  })

  it('renders timeline status and a no-geo note for every pair', () => {
    const html = render(
      <RelationshipInsightPanel candidates={[qin, rome]} relationships={[]} timeMap={timeMap} />,
    )
    expect(html).toContain('时间线对比')
    expect(html).toContain('rip-status')
    expect(html).toContain('地理对比')
    expect(html).toContain('No geographic data available for comparison.')
  })

  it('uses collapsible <details> elements (native fold state, no React state)', () => {
    const html = render(
      <RelationshipInsightPanel candidates={[qin, alex, rome]} relationships={[]} timeMap={timeMap} />,
    )
    // 3 candidates -> 3 pairs -> 3 <details class="rip-pair">.
    const matches = html.match(/class="rip-pair"/g) ?? []
    expect(matches).toHaveLength(3)
    expect(html).toContain('<details')
  })
})

// ---------------------------------------------------------------------------
// M17 (Relationship Insight Enhancement) — aggregated analytics sections.
// ---------------------------------------------------------------------------

describe('RelationshipInsightPanel (M17 analytics)', () => {
  const zhou: Candidate = { gid: 'china:zhou', name: '周朝', type: 'Time Period', topic: 'china' }

  const m17Relationships: EntityRelationship[] = [
    {
      type: 'conquered',
      source: 'empire',
      target: 'alex',
      direction: 'outgoing',
      other: { id: 'alex', name: '亚历山大', type: 'Person', global_id: 'greece:alex', topic: 'greece' },
    },
    {
      type: 'inherited',
      source: 'empire',
      target: 'augustus',
      direction: 'outgoing',
      other: { id: 'augustus', name: '奥古斯都', type: 'Person', global_id: 'rome:augustus', topic: 'rome' },
    },
  ]

  it('renders the relationship type summary with counts (no causal text)', () => {
    const html = render(
      <RelationshipInsightPanel
        candidates={[rome, alex]}
        relationships={m17Relationships}
        timeMap={timeMap}
        mainGlobalId="rome:empire"
      />,
    )
    expect(html).toContain('关系类型汇总')
    expect(html).toContain('conquered')
    expect(html).toContain('inherited')
    expect(html).not.toContain('推断')
    expect(html).not.toContain('发现')
  })

  it('renders the relationship type matrix as source → type → target rows', () => {
    const html = render(
      <RelationshipInsightPanel
        candidates={[rome, alex]}
        relationships={m17Relationships}
        timeMap={timeMap}
        mainGlobalId="rome:empire"
      />,
    )
    expect(html).toContain('关系类型矩阵')
    expect(html).toContain('罗马帝国') // resolved source name
    expect(html).toContain('亚历山大') // target
    expect(html).toContain('奥古斯都')
  })

  it('renders the multi-entity timeline band with overlap labels', () => {
    const bandTimeMap: Record<string, string> = {
      ...timeMap,
      周朝: '1046 BC - 256 BC',
    }
    const html = render(
      <RelationshipInsightPanel candidates={[qin, zhou]} relationships={[]} timeMap={bandTimeMap} />,
    )
    expect(html).toContain('多实体时间线带')
    expect(html).toContain('时间重叠')
    expect(html).toContain('周朝')
  })

  it('does not emit inferred/discovered edge language in any analytics section', () => {
    const html = render(
      <RelationshipInsightPanel
        candidates={[rome, alex, qin]}
        relationships={m17Relationships}
        timeMap={timeMap}
        mainGlobalId="rome:empire"
      />,
    )
    expect(html).not.toContain('影响')
    expect(html).not.toContain('导致')
  })
})

// ---------------------------------------------------------------------------
// M18 (Interactive Controls) — view-only filter/sort controls.
// ---------------------------------------------------------------------------

describe('RelationshipInsightPanel (M18 controls)', () => {
  const m18Relationships: EntityRelationship[] = [
    {
      type: 'conquered',
      source: 'empire',
      target: 'alex',
      direction: 'outgoing',
      other: { id: 'alex', name: '亚历山大', type: 'Person', global_id: 'greece:alex', topic: 'greece' },
    },
    {
      type: 'inherited',
      source: 'empire',
      target: 'augustus',
      direction: 'outgoing',
      other: { id: 'augustus', name: '奥古斯都', type: 'Person', global_id: 'rome:augustus', topic: 'rome' },
    },
  ]

  it('renders matrix filter and sort controls with all/original defaults', () => {
    const html = render(
      <RelationshipInsightPanel
        candidates={[rome, alex]}
        relationships={m18Relationships}
        timeMap={timeMap}
        mainGlobalId="rome:empire"
      />,
    )
    expect(html).toContain('rip-controls')
    expect(html).toContain('筛选类型')
    expect(html).toContain('全部类型')
    expect(html).toContain('按数量排序')
    expect(html).toContain('原始顺序')
    // Filter options mirror the type buckets actually present.
    expect(html).toContain('<option value="conquered">')
    expect(html).toContain('<option value="inherited">')
  })

  it('renders timeline band sort controls (start/name, asc/desc)', () => {
    const html = render(
      <RelationshipInsightPanel candidates={[qin, rome]} relationships={[]} timeMap={timeMap} />,
    )
    expect(html).toContain('排序依据')
    expect(html).toContain('起始时间')
    expect(html).toContain('名称')
    expect(html).toContain('升序')
  })

  it('default view still shows every matrix row (controls are additive, not destructive)', () => {
    const html = render(
      <RelationshipInsightPanel
        candidates={[rome, alex]}
        relationships={m18Relationships}
        timeMap={timeMap}
        mainGlobalId="rome:empire"
      />,
    )
    expect(html).toContain('亚历山大')
    expect(html).toContain('奥古斯都')
    expect(html).toContain('conquered')
    expect(html).toContain('inherited')
  })

  it('controls introduce no persistence or inference language', () => {
    // Pair rome+alex has an existing edge, so the M16 "不做推断" disclaimer for
    // empty pairs is absent — any 推断/发现/保存 here would come from M18 controls.
    const html = render(
      <RelationshipInsightPanel
        candidates={[rome, alex]}
        relationships={m18Relationships}
        timeMap={timeMap}
        mainGlobalId="rome:empire"
      />,
    )
    expect(html).not.toContain('推断')
    expect(html).not.toContain('发现')
    expect(html).not.toContain('保存')
  })
})

// ---------------------------------------------------------------------------
// M18 (Insight Export) — local-only export buttons.
// ---------------------------------------------------------------------------

describe('RelationshipInsightPanel (M18 export)', () => {
  it('renders JSON download and print buttons with the local-only note', () => {
    const html = render(
      <RelationshipInsightPanel candidates={[qin, rome]} relationships={[]} timeMap={timeMap} />,
    )
    expect(html).toContain('rip-export')
    expect(html).toContain('下载 JSON 报告')
    expect(html).toContain('打印视图')
    expect(html).toContain('仅本地生成，不上传。')
  })

  it('export buttons are plain <button type="button"> elements (no form submit, no links out)', () => {
    const html = render(
      <RelationshipInsightPanel candidates={[qin, rome]} relationships={[]} timeMap={timeMap} />,
    )
    const buttons = html.match(/class="rip-export-btn"/g) ?? []
    expect(buttons).toHaveLength(3)
    expect(html).toContain('复制 Markdown 报告')
    expect(html).not.toContain('<form')
    expect(html).not.toContain('href="http')
  })
})

// ---------------------------------------------------------------------------
// M19 (Relationship Centrality / Pair Explorer) — presentation tests.
// The panel is a PURE VIEW; it must never fetch and must only surface
// EXISTING metadata. No causal/inferred language is allowed in the output.
// ---------------------------------------------------------------------------

describe('M19 — Relationship Centrality & Pair Explorer', () => {
  it('renders the centrality block with degree counts over existing edges', () => {
    const html = render(
      <RelationshipInsightPanel
        candidates={[rome, alex]}
        relationships={relationships}
        timeMap={timeMap}
        mainGlobalId="rome:empire"
      />,
    )
    expect(html).toContain('关系中心性')
    expect(html).toContain('关系计数')
    expect(html).toContain('rome:empire')
    expect(html).toContain('greece:alex')
  })

  it('pair explorer shows the existing edge between the selected two entities', () => {
    const html = render(
      <RelationshipInsightPanel
        candidates={[rome, alex]}
        relationships={relationships}
        timeMap={timeMap}
        mainGlobalId="rome:empire"
      />,
    )
    expect(html).toContain('成对关系探查')
    expect(html).toContain('contemporary_of')
    // No causal/inferred language anywhere in the rendered output.
    expect(html).not.toContain('推断')
    expect(html).not.toContain('发现')
  })

  it('pair explorer reports no edge for a pair with no existing relationship', () => {
    const html = render(
      <RelationshipInsightPanel
        candidates={[qin, alex]}
        relationships={relationships}
        timeMap={timeMap}
        mainGlobalId="rome:empire"
      />,
    )
    expect(html).toContain('无已存在的关系边')
  })

  it('honours an injected nameByGlobalId map to label target entities outside the candidate set', () => {
    const html = render(
      <RelationshipInsightPanel
        candidates={[rome]}
        relationships={relationships}
        timeMap={timeMap}
        mainGlobalId="rome:empire"
        nameByGlobalId={{ 'rome:empire': '罗马帝国', 'greece:alex': '希腊的亚历山大' }}
      />,
    )
    // '希腊的亚历山大' can ONLY come from the injected map: the candidate set
    // has no greece:alex, and the relationship's other.name is just '亚历山大'.
    expect(html).toContain('希腊的亚历山大')
  })
})

// ---------------------------------------------------------------------------
// M20 (Relationship Connectivity / Path Explorer) — presentation tests.
// The panel is a PURE VIEW; it must never fetch and must only surface EXISTING
// metadata. No causal/inferred/discovery language is allowed in the output.
// ---------------------------------------------------------------------------

describe('M20 — Relationship Connectivity Explorer', () => {
  // The connectivity explorer reads ONLY the EXISTING relationship matrix
  // (RelationshipMatrixRow[]), independent of the candidate set. These tests
  // therefore pass candidates={[]} so the per-pair section (which may surface
  // the pre-existing "不做推断" muted note) is suppressed, and supply an
  // explicit nameByGlobalId map so path endpoints are labelled.

  // rome -> alex -> cyrus: a 2-hop chain built from EXISTING edges only. Each
  // rel.source carries the real GLOBAL id of the edge's start (no mainGlobalId
  // override) so the matrix keeps the correct source global ids for traversal.
  const m20Relationships: EntityRelationship[] = [
    {
      type: 'conquered',
      source: 'rome:empire',
      target: 'alex',
      direction: 'outgoing',
      other: { id: 'alex', name: '亚历山大', type: 'Person', global_id: 'greece:alex', topic: 'greece' },
    },
    {
      type: 'traded_with',
      source: 'greece:alex',
      target: 'cyrus',
      direction: 'outgoing',
      other: { id: 'cyrus', name: '居鲁士', type: 'Person', global_id: 'persia:cyrus', topic: 'persia' },
    },
  ]

  const m20NameByGlobalId: Record<string, string> = {
    'rome:empire': '罗马帝国',
    'greece:alex': '亚历山大',
    'persia:cyrus': '居鲁士',
  }

  it('renders the connectivity explorer block with source/target/hops controls and a boundary disclaimer', () => {
    const html = render(
      <RelationshipInsightPanel
        candidates={[]}
        relationships={m20Relationships}
        timeMap={timeMap}
        nameByGlobalId={m20NameByGlobalId}
      />,
    )
    expect(html).toContain('关系连通性探查')
    expect(html).toContain('源实体')
    expect(html).toContain('目标实体')
    expect(html).toContain('最大跳数')
    expect(html).toContain('3 跳')
    // The disclaimer must state the panel only visualises EXISTING edges and
    // adds no connections / explanations — WITHOUT using the banned words
    // 推断 / 发现 / 因果 (per the frozen Relationship Layer boundary).
    expect(html).toContain('本模块仅以图形方式呈现已存在的关系边所形成的路径')
  })

  it('never emits 推断 / 发现 / 因果 anywhere in the rendered output', () => {
    const html = render(
      <RelationshipInsightPanel
        candidates={[]}
        relationships={m20Relationships}
        timeMap={timeMap}
        nameByGlobalId={m20NameByGlobalId}
      />,
    )
    expect(html).not.toContain('推断')
    expect(html).not.toContain('发现')
    expect(html).not.toContain('因果')
  })

  it('renders a path chain over existing edges (node —relation→ node) when endpoints are connected', () => {
    // gids are named so the SORTED default selection (smallest = source) has an
    // outgoing edge to the next gid: 'a:start' -> 'z:end'. Deterministic.
    const rels: EntityRelationship[] = [
      {
        type: 'related_to',
        source: 'a:start',
        target: 'end',
        direction: 'outgoing',
        other: { id: 'end', name: '终点', type: 'X', global_id: 'z:end', topic: 't' },
      },
    ]
    const html = render(
      <RelationshipInsightPanel
        candidates={[]}
        relationships={rels}
        timeMap={timeMap}
        nameByGlobalId={{ 'a:start': '起点', 'z:end': '终点' }}
      />,
    )
    expect(html).toContain('rip-path')
    expect(html).toContain('起点')
    expect(html).toContain('终点')
    expect(html).toContain('related_to')
    // No invented connection language.
    expect(html).not.toContain('推断')
    expect(html).not.toContain('发现')
    expect(html).not.toContain('因果')
  })

  it('reports no existing-edge path within the hop bound when endpoints are unconnected', () => {
    // Smallest gid 'a:first' is a SINK (the only edge points INTO it), so the
    // sorted default source has no outgoing edge -> no path to 'z:second'.
    const rels: EntityRelationship[] = [
      {
        type: 'before',
        source: 'z:second',
        target: 'first',
        direction: 'outgoing',
        other: { id: 'first', name: '甲', type: 'X', global_id: 'a:first', topic: 't' },
      },
    ]
    const html = render(
      <RelationshipInsightPanel
        candidates={[]}
        relationships={rels}
        timeMap={timeMap}
        nameByGlobalId={{ 'a:first': '甲', 'z:second': '乙' }}
      />,
    )
    expect(html).toContain('没有已存在的边所能组成的路径')
  })

  it('renders an SVG path graph (M21-A1) for connected endpoints, without causal words', () => {
    // SORTED default selection: 'a:start' (source) -> 'z:end' (target), one hop.
    const rels: EntityRelationship[] = [
      {
        type: 'related_to',
        source: 'a:start',
        target: 'end',
        direction: 'outgoing',
        other: { id: 'end', name: '终点', type: 'X', global_id: 'z:end', topic: 't' },
      },
    ]
    const html = render(
      <RelationshipInsightPanel
        candidates={[]}
        relationships={rels}
        timeMap={timeMap}
        nameByGlobalId={{ 'a:start': '起点', 'z:end': '终点' }}
      />,
    )
    // SVG graph present and carrying the resolved node labels from the path.
    expect(html).toContain('rpg-svg')
    expect(html).toContain('rpg-path')
    expect(html).toContain('起点')
    expect(html).toContain('终点')
    expect(html).toContain('related_to')
    // No causal/inferred/discovery language introduced by M21-A1.
    expect(html).not.toContain('推断')
    expect(html).not.toContain('发现')
    expect(html).not.toContain('因果')
  })
})

// ---------------------------------------------------------------------------
// M22 (Insight Share / Copy Enhancement — A3) — local-only clipboard copy.
// ---------------------------------------------------------------------------

describe('M22 — Insight Share / Copy Enhancement (A3)', () => {
  const m22Relationships: EntityRelationship[] = [
    {
      type: 'conquered',
      source: 'rome:empire',
      target: 'alex',
      direction: 'outgoing',
      other: { id: 'alex', name: '亚历山大', type: 'Person', global_id: 'greece:alex', topic: 'greece' },
    },
    {
      type: 'traded_with',
      source: 'greece:alex',
      target: 'cyrus',
      direction: 'outgoing',
      other: { id: 'cyrus', name: '居鲁士', type: 'Person', global_id: 'persia:cyrus', topic: 'persia' },
    },
  ]
  const m22NameByGlobalId: Record<string, string> = {
    'rome:empire': '罗马帝国',
    'greece:alex': '亚历山大',
    'persia:cyrus': '居鲁士',
  }

  it('renders a local-only Copy Markdown Report button (no upload / no links out)', () => {
    const html = render(
      <RelationshipInsightPanel candidates={[qin, rome]} relationships={[]} timeMap={timeMap} />,
    )
    expect(html).toContain('rip-export')
    expect(html).toContain('复制 Markdown 报告')
    expect(html).toContain('class="rip-export-btn"')
    expect(html).not.toContain('<form')
    expect(html).not.toContain('href="http')
  })

  it('renders a Copy Relationship Path Text button when connectivity paths exist', () => {
    const html = render(
      <RelationshipInsightPanel
        candidates={[]}
        relationships={m22Relationships}
        timeMap={timeMap}
        nameByGlobalId={m22NameByGlobalId}
      />,
    )
    expect(html).toContain('复制关系路径文本')
    expect(html).not.toContain('推断')
    expect(html).not.toContain('发现')
    expect(html).not.toContain('因果')
  })

  it('copy buttons are plain <button type="button"> (no form submit, no links out, no third-party service)', () => {
    const html = render(
      <RelationshipInsightPanel
        candidates={[]}
        relationships={m22Relationships}
        timeMap={timeMap}
        nameByGlobalId={m22NameByGlobalId}
      />,
    )
    const buttons = html.match(/rip-export-btn/g) ?? []
    expect(buttons.length).toBeGreaterThanOrEqual(4)
    expect(html).not.toContain('<form')
    expect(html).not.toContain('href="http')
    expect(html).not.toContain('第三方')
  })
})

// ---------------------------------------------------------------------------
// M23 (Timeline Zoom/Pan, Entity Comparison Table, CSV Export) — additive,
// view-only enhancements. The panel remains a PURE VIEW: no fetch, no new KG
// semantics, no inference, no causal narrative. Tests assert on static HTML.
// ---------------------------------------------------------------------------

describe('M23 — Timeline Zoom/Pan, Entity Comparison, CSV Export', () => {
  const zhou: Candidate = { gid: 'china:zhou', name: '周朝', type: 'Time Period', topic: 'china' }

  const m23Relationships: EntityRelationship[] = [
    {
      type: 'contemporary_of',
      source: 'empire',
      target: 'alex',
      direction: 'outgoing',
      other: { id: 'alex', name: '亚历山大', type: 'Person', global_id: 'greece:alex', topic: 'greece' },
    },
    {
      type: 'before',
      source: 'empire',
      target: 'qin',
      direction: 'outgoing',
      other: { id: 'qin', name: '秦始皇', type: 'Person', global_id: 'china:qin', topic: 'china' },
    },
  ]

  it('M23-A1 renders an SVG timeline with view-only zoom/pan controls (no causal words in the SVG)', () => {
    const bandTimeMap: Record<string, string> = {
      ...timeMap,
      周朝: '1046 BC - 256 BC',
    }
    const html = render(
      <RelationshipInsightPanel candidates={[qin, zhou]} relationships={[]} timeMap={bandTimeMap} />,
    )
    expect(html).toContain('rip-timeline-svg')
    expect(html).toContain('放大')
    expect(html).toContain('缩小')
    expect(html).toContain('重置视图')
    // The SVG timeline block (M23-A1's addition) must introduce no inference /
    // discovery / causal language. Scoped to the <svg> so the panel's separate
    // "不做推断" boundary disclaimer (outside the SVG) is not mistaken for a violation.
    const svgMatch = html.match(/<svg class="rip-timeline-svg"[\s\S]*?<\/svg>/)
    expect(svgMatch).not.toBeNull()
    const svgHtml = svgMatch?.[0] ?? ''
    expect(svgHtml).not.toContain('推断')
    expect(svgHtml).not.toContain('发现')
    expect(svgHtml).not.toContain('因果')
  })

  it('M23-A2 renders a read-only entity comparison table over existing metrics', () => {
    const html = render(
      <RelationshipInsightPanel
        candidates={[rome, alex]}
        relationships={m23Relationships}
        timeMap={timeMap}
        mainGlobalId="rome:empire"
      />,
    )
    expect(html).toContain('实体对比表')
    expect(html).toContain('关系类型数')
    expect(html).toContain('重叠数')
    expect(html).toContain('罗马帝国')
    expect(html).toContain('亚历山大')
    expect(html).not.toContain('推断')
    expect(html).not.toContain('发现')
  })

  it('M23-A3 renders local-only Copy CSV / Download CSV buttons without breaking the exact 3-button rule', () => {
    const html = render(
      <RelationshipInsightPanel candidates={[qin, rome]} relationships={[]} timeMap={timeMap} />,
    )
    expect(html).toContain('复制 CSV 报告')
    expect(html).toContain('下载 CSV')
    // M18 exact-match constraint: class="rip-export-btn" must remain exactly 3;
    // CSV buttons use the rip-csv modifier so they are excluded from that match.
    const exact = html.match(/class="rip-export-btn"/g) ?? []
    expect(exact).toHaveLength(3)
    expect(html).not.toContain('<form')
    expect(html).not.toContain('href="http')
  })

  it('M23-A3 serializeInsightReportAsCsv is deterministic and RFC-4180 quoted', () => {
    const input = {
      entities: [{ name: 'A', gid: 'a:1' }],
      relationshipTypeCounts: { contemporary_of: 2, 'before,of': 1 },
      matrixRows: [
        { source: 'A', sourceGlobalId: 'a:1', relationType: 'contemporary_of', target: 'B', targetGlobalId: 'b:2' },
      ],
      timelineBand: [{ name: 'A', gid: 'a:1', start: -200, end: 100, overlaps: ['B'] }],
    }
    const out1 = serializeInsightReportAsCsv(input)
    const out2 = serializeInsightReportAsCsv(input)
    expect(out1).toBe(out2)
    expect(out1).toContain('section,col1,col2,col3,col4')
    // A comma inside a cell must be wrapped in quotes per RFC 4180.
    expect(out1).toContain('"before,of"')
    expect(out1).toContain('relationship,A,contemporary_of,B,')
  })
})
