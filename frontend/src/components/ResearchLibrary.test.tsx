import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { ResearchLibraryView } from './ResearchLibrary'
import type { SavedResearch } from '../data/ResearchHistory'

function mkItem(overrides: Partial<SavedResearch> = {}): SavedResearch {
  return {
    id: 'r_1',
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    entityName: 'Roman Empire',
    entityType: 'Civilization',
    entityGlobalId: 't:civ-roman',
    comparedNames: [],
    dimensions: [
      { id: '0', title: 'Politics', question: 'Q', status: 'success', citationCount: 3 },
      { id: '1', title: 'Military', question: 'Q', status: 'success', citationCount: 5 },
    ],
    summaryCitations: [],
    bookmarked: false,
    labels: [],
    ...overrides,
  }
}

describe('ResearchLibraryView', () => {
  it('renders empty state', () => {
    const html = renderToStaticMarkup(<ResearchLibraryView items={[]} />)
    expect(html).toContain('研究收藏库')
    expect(html).toContain('暂无保存的研究')
  })

  it('renders saved research cards', () => {
    const html = renderToStaticMarkup(
      <ResearchLibraryView items={[
        mkItem(),
        mkItem({ id: 'r_2', entityName: 'Han Dynasty', comparedNames: ['Persian Empire'] }),
      ]} />,
    )
    expect(html).toContain('Roman Empire')
    expect(html).toContain('Han Dynasty')
    expect(html).toContain('vs Persian Empire')
  })

  it('shows dimension and citation counts', () => {
    const html = renderToStaticMarkup(
      <ResearchLibraryView items={[mkItem()]} />,
    )
    expect(html).toContain('2/2 维度')
    expect(html).toContain('8 条引用')
  })

  it('shows bookmark star', () => {
    const html = renderToStaticMarkup(
      <ResearchLibraryView items={[mkItem({ bookmarked: true })]} />,
    )
    expect(html).toContain('rlib-card-star')
  })

  it('renders open and delete buttons', () => {
    const html = renderToStaticMarkup(
      <ResearchLibraryView items={[mkItem()]} />,
    )
    expect(html).toContain('打开')
    expect(html).toContain('删除')
  })
})
