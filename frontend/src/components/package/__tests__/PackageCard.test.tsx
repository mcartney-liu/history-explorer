import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { getPackages } from '../../../data/explorationPackages'
import PackageCard from '../PackageCard'

const china = getPackages().find((p) => p.slug === 'china-civilization-v1')!
const noop = () => {}

describe('PackageCard', () => {
  it('renders the official package title and summary', () => {
    const html = renderToStaticMarkup(<PackageCard pkg={china} onOpen={noop} />)
    expect(html).toContain('中国文明演化探索包 V1')
    expect(html).toContain('官方探索包')
  })

  it('calls onOpen with the slug when the button is clicked', () => {
    let captured = ''
    const html = renderToStaticMarkup(
      <PackageCard pkg={china} onOpen={(s) => { captured = s }} />,
    )
    expect(html).toContain('开始探索')
    // Simulated: the button is present with the correct testid.
    expect(html).toContain('data-testid="pkg-card-china-civilization-v1"')
  })
})
