/** M82 P2 — RelationshipChain CausalStatement integration tests. */
import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { getPackages } from '../../../data/explorationPackages'
import RelationshipChain from '../RelationshipChain'
import type { CausalStatementData } from '../../../data/causalStatement'

const china = () => getPackages().find((p) => p.slug === 'china-civilization-v1')!

const CS_KUJU: CausalStatementData = {
  cause_id: 'china_v1:idea-keju',
  effect_id: 'china_v1:idea-wenguan',
  mechanism: '科举制度通过标准化考试选拔文官。',
  consequence: '文官体系持续1300年。',
  confidence: 'high',
  evidence_refs: ['ec-cn-001'],
}

describe('M82 P2 — RelationshipChain with CausalStatement', () => {
  it('renders CausalStatementCard when edge matches CS', () => {
    const html = renderToStaticMarkup(
      <RelationshipChain pkg={china()} locale="zh" causalStatements={[CS_KUJU]} />,
    )
    expect(html).toContain('data-testid="causal-statement-card"')
  })

  it('does NOT render CausalStatementCard without CS', () => {
    const html = renderToStaticMarkup(
      <RelationshipChain pkg={china()} locale="zh" />,
    )
    expect(html).not.toContain('data-testid="causal-statement-card"')
  })

  it('renders CausalStatementCard with correct CS mechanism text', () => {
    const html = renderToStaticMarkup(
      <RelationshipChain pkg={china()} locale="zh" causalStatements={[CS_KUJU]} />,
    )
    expect(html).toContain('科举制度通过标准化考试选拔文官')
  })

  it('does NOT render CausalStatementCard when CS does not match any edge', () => {
    const noMatchCS: CausalStatementData = {
      ...CS_KUJU,
      cause_id: 'nonexistent:a',
      effect_id: 'nonexistent:b',
    }
    const html = renderToStaticMarkup(
      <RelationshipChain pkg={china()} locale="zh" causalStatements={[noMatchCS]} />,
    )
    expect(html).not.toContain('data-testid="causal-statement-card"')
  })
})
