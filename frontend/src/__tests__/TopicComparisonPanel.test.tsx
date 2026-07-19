import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import TopicComparisonPanel from '../components/TopicComparisonPanel'
import { CrossTopicRelated } from '../components/crossTopic'

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
    const html = renderToStaticMarkup(
      <TopicComparisonPanel crossTopicRelated={[]} onNodeClick={noop} onTopicClick={noop} />,
    )
    expect(html).toContain('Compare Across Topics')
    expect(html).toContain('no cross-topic connections')
  })

  it('renders comparison target buttons (data-node=topic) and selects the first by default', () => {
    const edges: CrossTopicRelated[] = [
      edge('greek_philosophy', 'greek_philosophy:plato', 'Plato'),
      edge('persian_empire', 'persian_empire:cyrus', 'Cyrus'),
    ]
    const html = renderToStaticMarkup(
      <TopicComparisonPanel crossTopicRelated={edges} onNodeClick={noop} onTopicClick={noop} />,
    )
    // Target buttons present (data-node = topic slug).
    expect(html).toContain('data-node="greek_philosophy"')
    expect(html).toContain('data-node="persian_empire"')
    // First target is active by default; its bridges are shown.
    expect(html).toContain('is-active')
    expect(html).toContain('Bridging entities')
    expect(html).toContain('Plato')
  })

  it('exposes bridging entities as clickable nodes with global_id data-node and aria-label', () => {
    const edges: CrossTopicRelated[] = [edge('greek_philosophy', 'greek_philosophy:plato', 'Plato')]
    const html = renderToStaticMarkup(
      <TopicComparisonPanel crossTopicRelated={edges} onNodeClick={noop} onTopicClick={noop} />,
    )
    expect(html).toContain('data-node="greek_philosophy:plato"')
    expect(html).toContain('aria-label="Open Plato in Greek Philosophy"')
    // The relationship type is surfaced (no scoring / ranking / similarity).
    expect(html).toContain('Influenced')
  })

  it('offers an "Explore" continuity action for the selected target topic', () => {
    const edges: CrossTopicRelated[] = [edge('greek_philosophy', 'greek_philosophy:plato', 'Plato')]
    const html = renderToStaticMarkup(
      <TopicComparisonPanel crossTopicRelated={edges} onNodeClick={noop} onTopicClick={noop} />,
    )
    expect(html).toContain('data-node="explore:greek_philosophy"')
    expect(html).toContain('Explore Greek Philosophy')
  })
})
