import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import type { ReactElement } from 'react'
import TopicComparisonPanel from '../components/TopicComparisonPanel'
import { CrossTopicRelated } from '../components/crossTopic'
import { LocaleProvider } from '../data/locale'

// Component now reads UI strings through t() (zh is the default locale), so
// tests render inside LocaleProvider and assert the zh strings.
function renderWithLocale(ui: ReactElement) {
  return renderToStaticMarkup(<LocaleProvider>{ui}</LocaleProvider>)
}

function edge(topic: string, global_id: string, name: string): CrossTopicRelated {
  return {
    id: global_id.split(':').pop() ?? null,
    name,
    type: 'person',
    global_id,
    topic,
    relationship: 'influenced',
    direction: 'outgoing',
  }
}

const noop = () => {}

describe('TopicComparisonPanel (M5-C)', () => {
  it('renders an empty state when there are no cross-topic connections', () => {
    const html = renderWithLocale(
      <TopicComparisonPanel crossTopicRelated={[]} onNodeClick={noop} onTopicClick={noop} />,
    )
    expect(html).toContain('跨主题对比')
    expect(html).toContain('暂无跨主题关联')
  })

  it('renders comparison target buttons (data-node=topic) and selects the first by default', () => {
    const edges: CrossTopicRelated[] = [
      edge('greek_philosophy', 'greek_philosophy:plato', 'Plato'),
      edge('persian_empire', 'persian_empire:cyrus', 'Cyrus'),
    ]
    const html = renderWithLocale(
      <TopicComparisonPanel crossTopicRelated={edges} onNodeClick={noop} onTopicClick={noop} />,
    )
    // Target buttons present (data-node = topic slug).
    expect(html).toContain('data-node="greek_philosophy"')
    expect(html).toContain('data-node="persian_empire"')
    // First target is active by default; its bridges are shown.
    expect(html).toContain('is-active')
    expect(html).toContain('桥接实体')
    expect(html).toContain('Plato')
  })

  it('exposes bridging entities as clickable nodes with global_id data-node and aria-label', () => {
    const edges: CrossTopicRelated[] = [edge('greek_philosophy', 'greek_philosophy:plato', 'Plato')]
    const html = renderWithLocale(
      <TopicComparisonPanel crossTopicRelated={edges} onNodeClick={noop} onTopicClick={noop} />,
    )
    expect(html).toContain('data-node="greek_philosophy:plato"')
    expect(html).toContain('aria-label="在 Greek Philosophy 中打开 Plato"')
    // The relationship type is surfaced (no scoring / ranking / similarity).
    expect(html).toContain('Influenced')
  })

  it('offers an "Explore" continuity action for the selected target topic', () => {
    const edges: CrossTopicRelated[] = [edge('greek_philosophy', 'greek_philosophy:plato', 'Plato')]
    const html = renderWithLocale(
      <TopicComparisonPanel crossTopicRelated={edges} onNodeClick={noop} onTopicClick={noop} />,
    )
    expect(html).toContain('data-node="explore:greek_philosophy"')
    expect(html).toContain('探索 Greek Philosophy')
  })
})
