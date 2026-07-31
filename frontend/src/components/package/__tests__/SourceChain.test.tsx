import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { getPackages } from '../../../data/explorationPackages'
import SourceChain from '../SourceChain'

const china = getPackages().find((p) => p.slug === 'china-civilization-v1')!

describe('SourceChain', () => {
  it('renders relationship evidence sections', () => {
    const html = renderToStaticMarkup(<SourceChain pkg={china} locale="zh" />)
    // Claim text from ec-cn-001 (科举→inherited→文官)
    expect(html).toContain('科举')
    // Source title from src-cn-textbook
    expect(html).toContain('中国历史（义务教育教科书）')
    expect(html).toContain('国史大纲')
  })

  it('renders the package summary source list', () => {
    const html = renderToStaticMarkup(<SourceChain pkg={china} locale="zh" />)
    expect(html).toContain('本探索包引用来源')
    // Known package source refs
    expect(html).toContain('中国国家博物馆')
    expect(html).toContain('The Cambridge History of China')
  })

  it('renders tier badges', () => {
    const html = renderToStaticMarkup(<SourceChain pkg={china} locale="zh" />)
    // primary tier should appear
    expect(html).toContain('一手来源')
    // academic tier should appear
    expect(html).toContain('学术来源')
  })

  it('uses the correct testid', () => {
    const html = renderToStaticMarkup(<SourceChain pkg={china} locale="zh" />)
    expect(html).toContain('data-testid="source-chain"')
  })
})
