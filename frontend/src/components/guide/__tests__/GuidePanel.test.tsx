import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { getPackages } from '../../../data/explorationPackages'
import GuidePanel from '../GuidePanel'

const china = () => getPackages().find((p) => p.slug === 'china-civilization-v1')!
const noop = () => {}

describe('GuidePanel (deterministic exploration navigation)', () => {
  it('renders the guide shell with title', () => {
    const html = renderToStaticMarkup(
      <GuidePanel pkg={china()} visited={[]} locale="zh" onEntityClick={noop} />,
    )
    expect(html).toContain('探索向导')
    expect(html).toContain('data-testid="exploration-guide"')
  })

  it('shows the entry position when nothing is visited', () => {
    const html = renderToStaticMarkup(
      <GuidePanel pkg={china()} visited={[]} locale="zh" onEntityClick={noop} />,
    )
    expect(html).toContain('本包入口')
    expect(html).toContain('你现在在')
  })

  it('shows next steps with reasons', () => {
    const html = renderToStaticMarkup(
      <GuidePanel pkg={china()} visited={[]} locale="zh" onEntityClick={noop} />,
    )
    expect(html).toContain('下一步可以探索')
    // Reason text comes from RELATIONSHIP_TEMPLATES (deterministic)
    expect(html).toContain('查看')
  })

  it('shows coverage counters', () => {
    const html = renderToStaticMarkup(
      <GuidePanel pkg={china()} visited={['china_v1:idea-keju']} locale="zh" onEntityClick={noop} />,
    )
    expect(html).toContain('已探索')
    expect(html).toContain('实体')
    expect(html).toContain('关系')
    expect(html).toContain('%')
  })

  it('renders "completed" state when everything is visited', () => {
    const all = china()
      .relationship_paths.flatMap((p) => [p.from, p.to])
      .filter((gid, i, arr) => arr.indexOf(gid) === i)
    const html = renderToStaticMarkup(
      <GuidePanel pkg={china()} visited={all} locale="zh" onEntityClick={noop} />,
    )
    expect(html).toContain('本包探索已全部完成')
  })
})
