import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { Badge, type BadgeTone } from '../Badge'

describe('ui/Badge (DS Lite)', () => {
  it('renders neutral tone by default with badge class', () => {
    const html = renderToStaticMarkup(<Badge>参考</Badge>)
    expect(html).toContain('class="badge badge--neutral"')
    expect(html).toContain('>参考</span>')
  })

  it('maps primary/academic/reference tones to token classes', () => {
    const tones: [BadgeTone, string][] = [
      ['primary', 'badge--primary'],
      ['academic', 'badge--academic'],
      ['reference', 'badge--reference'],
    ]
    for (const [tone, cls] of tones) {
      const html = renderToStaticMarkup(<Badge tone={tone}>x</Badge>)
      expect(html).toContain(cls)
    }
  })

  it('merges extra className and passes title/onClick', () => {
    const html = renderToStaticMarkup(
      <Badge tone="primary" className="source-badge-tier" title="一手来源">
        一手来源
      </Badge>,
    )
    expect(html).toContain('badge badge--primary source-badge-tier')
    expect(html).toContain('title="一手来源"')
  })
})
