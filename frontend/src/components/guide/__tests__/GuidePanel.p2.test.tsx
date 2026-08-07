/** M82 P2 — GuidePanel CausalStatement integration tests. */
import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { getPackages } from '../../../data/explorationPackages'
import GuidePanel from '../GuidePanel'
import type { CausalStatementData } from '../../../data/causalStatement'

const china = () => getPackages().find((p) => p.slug === 'china-civilization-v1')!
const noop = () => {}

const CS_KUJU: CausalStatementData = {
  cause_id: 'china_v1:idea-keju',
  effect_id: 'china_v1:idea-wenguan',
  mechanism: '科举制度通过标准化考试选拔文官，取代了门阀世袭。',
  consequence: '文官体系持续1300年。',
  confidence: 'high',
  evidence_refs: ['ec-cn-001'],
}

// renderToStaticMarkup has no React Context → useLocale returns i18n keys

describe('M82 P2 — GuidePanel with CausalStatement', () => {
  it('renders CS.mechanism as reason when CS matches', () => {
    const html = renderToStaticMarkup(
      <GuidePanel
        pkg={china()}
        visited={['china_v1:idea-keju']}
        locale="zh"
        onEntityClick={noop}
        causalStatements={[CS_KUJU]}
      />,
    )
    expect(html).toContain('科举制度通过标准化考试选拔文官')
  })

  it('renders CausalStatementCard when CS exists', () => {
    const html = renderToStaticMarkup(
      <GuidePanel
        pkg={china()}
        visited={['china_v1:idea-keju']}
        locale="zh"
        onEntityClick={noop}
        causalStatements={[CS_KUJU]}
      />,
    )
    expect(html).toContain('data-testid="causal-statement-card"')
  })

  it('falls back to template reason without CS', () => {
    const html = renderToStaticMarkup(
      <GuidePanel
        pkg={china()}
        visited={['china_v1:idea-keju']}
        locale="zh"
        onEntityClick={noop}
      />,
    )
    // Template reason contains relationship description, NOT CS mechanism
    expect(html).not.toContain('科举制度通过标准化考试选拔文官')
    expect(html).not.toContain('data-testid="causal-statement-card"')
  })

  it('does not crash with empty causalStatements array', () => {
    const html = renderToStaticMarkup(
      <GuidePanel
        pkg={china()}
        visited={['china_v1:idea-keju']}
        locale="zh"
        onEntityClick={noop}
        causalStatements={[]}
      />,
    )
    expect(html).not.toContain('data-testid="causal-statement-card"')
  })
})
