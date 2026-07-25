// M16 (Relationship Insight Visualization Layer) — panel presentation tests.
// Mirrors the project convention: renderToStaticMarkup (no jsdom), assert on
// static HTML. The panel is a PURE VIEW — it must never fetch and must only
// surface EXISTING metadata.

import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import RelationshipInsightPanel from './RelationshipInsightPanel'
import type { Candidate } from '../data/candidateUtils'
import type { EntityRelationship } from './EntityPage'

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
    const html = renderToStaticMarkup(
      <RelationshipInsightPanel candidates={[qin]} relationships={[]} timeMap={timeMap} />,
    )
    expect(html).toContain('relationship-insight-panel')
    expect(html).toContain('请选择至少两个实体')
    // No pair sections rendered.
    expect(html).not.toContain('rip-pair')
  })

  it('does not fetch and only renders existing relationship metadata', () => {
    const html = renderToStaticMarkup(
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
    const html = renderToStaticMarkup(
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
    const html = renderToStaticMarkup(
      <RelationshipInsightPanel candidates={[qin, rome]} relationships={[]} timeMap={timeMap} />,
    )
    expect(html).toContain('时间线对比')
    expect(html).toContain('rip-status')
    expect(html).toContain('地理对比')
    expect(html).toContain('No geographic data available for comparison.')
  })

  it('uses collapsible <details> elements (native fold state, no React state)', () => {
    const html = renderToStaticMarkup(
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
    const html = renderToStaticMarkup(
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
    const html = renderToStaticMarkup(
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
    const html = renderToStaticMarkup(
      <RelationshipInsightPanel candidates={[qin, zhou]} relationships={[]} timeMap={bandTimeMap} />,
    )
    expect(html).toContain('多实体时间线带')
    expect(html).toContain('时间重叠')
    expect(html).toContain('周朝')
  })

  it('does not emit inferred/discovered edge language in any analytics section', () => {
    const html = renderToStaticMarkup(
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
    const html = renderToStaticMarkup(
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
    const html = renderToStaticMarkup(
      <RelationshipInsightPanel candidates={[qin, rome]} relationships={[]} timeMap={timeMap} />,
    )
    expect(html).toContain('排序依据')
    expect(html).toContain('起始时间')
    expect(html).toContain('名称')
    expect(html).toContain('升序')
  })

  it('default view still shows every matrix row (controls are additive, not destructive)', () => {
    const html = renderToStaticMarkup(
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
    const html = renderToStaticMarkup(
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
    const html = renderToStaticMarkup(
      <RelationshipInsightPanel candidates={[qin, rome]} relationships={[]} timeMap={timeMap} />,
    )
    expect(html).toContain('rip-export')
    expect(html).toContain('下载 JSON 报告')
    expect(html).toContain('打印视图')
    expect(html).toContain('仅本地生成，不上传。')
  })

  it('export buttons are plain <button type="button"> elements (no form submit, no links out)', () => {
    const html = renderToStaticMarkup(
      <RelationshipInsightPanel candidates={[qin, rome]} relationships={[]} timeMap={timeMap} />,
    )
    const buttons = html.match(/class="rip-export-btn"/g) ?? []
    expect(buttons).toHaveLength(2)
    expect(html).not.toContain('<form')
    expect(html).not.toContain('href="http')
  })
})
