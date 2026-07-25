import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import type { SearchResultItem } from './SearchResults'
import type { Candidate } from '../data/candidateUtils'
import { EntityPickerView } from './EntityPickerPanel'
import {
  resultsToCandidates,
  addCandidate,
  removeCandidate,
} from './EntityPickerPanel'

const QIN: Candidate = { gid: 'qin_dynasty:person-qsh', name: '秦始皇', type: 'Person', topic: 'qin_dynasty' }
const ALEX: Candidate = { gid: 'ancient_greece:person-alex', name: '亚历山大', type: 'Person', topic: 'ancient_greece' }

describe('resultsToCandidates (M14)', () => {
  it('maps entity rows to candidates and drops Topic / unresolvable rows', () => {
    const raw: SearchResultItem[] = [
      { result_type: 'Topic', name: 'Roman Empire', topic: 'roman_empire' },
      { result_type: 'Entity', id: 'person-qsh', name: '秦始皇', type: 'Person', topic: 'qin_dynasty' },
      { result_type: 'Entity', name: 'no-id', topic: 'x' }, // no id → dropped
    ]
    expect(resultsToCandidates(raw)).toEqual([
      { gid: 'qin_dynasty:person-qsh', name: '秦始皇', type: 'Person', topic: 'qin_dynasty' },
    ])
  })

  it('de-duplicates by gid, preserving first-occurrence order', () => {
    const raw: SearchResultItem[] = [
      { result_type: 'Entity', id: 'a', name: 'A', topic: 't' },
      { result_type: 'Entity', id: 'a', name: 'A dup', topic: 't' },
      { result_type: 'Entity', id: 'b', name: 'B', topic: 't' },
    ]
    expect(resultsToCandidates(raw).map((c) => c.gid)).toEqual(['t:a', 't:b'])
  })
})

describe('addCandidate / removeCandidate (M14 selection)', () => {
  it('adds a new candidate', () => {
    expect(addCandidate([QIN], ALEX)).toEqual([QIN, ALEX])
  })
  it('does NOT add a duplicate gid', () => {
    expect(addCandidate([QIN], { ...QIN, name: 'dup' })).toEqual([QIN])
  })
  it('removes a candidate by gid', () => {
    expect(removeCandidate([QIN, ALEX], QIN.gid)).toEqual([ALEX])
  })
})

describe('EntityPickerView (M14 presentational)', () => {
  it('renders the search input and title', () => {
    const html = renderToStaticMarkup(
      <EntityPickerView
        query=""
        results={[]}
        selected={[]}
        loading={false}
        error=""
        onQueryChange={() => {}}
        onSearch={() => {}}
        onAdd={() => {}}
        onRemove={() => {}}
      />,
    )
    expect(html).toContain('跨主题实体选择器')
    expect(html).toContain('搜索实体')
  })

  it('shows friendly name/type/topic for each result row', () => {
    const html = renderToStaticMarkup(
      <EntityPickerView
        query="人"
        results={[QIN, ALEX]}
        selected={[]}
        loading={false}
        error=""
        onQueryChange={() => {}}
        onSearch={() => {}}
        onAdd={() => {}}
        onRemove={() => {}}
      />,
    )
    expect(html).toContain('秦始皇')
    expect(html).toContain('Person')
    expect(html).toContain('qin_dynasty')
    expect(html).toContain('亚历山大')
  })

  it('renders selected chips and marks already-added results', () => {
    const html = renderToStaticMarkup(
      <EntityPickerView
        query="人"
        results={[QIN, ALEX]}
        selected={[QIN]}
        loading={false}
        error=""
        onQueryChange={() => {}}
        onSearch={() => {}}
        onAdd={() => {}}
        onRemove={() => {}}
      />,
    )
    expect(html).toContain('已选 1')
    expect(html).toContain('已添加') // QIN already selected → add button disabled/labelled
  })

  it('shows an error message when present', () => {
    const html = renderToStaticMarkup(
      <EntityPickerView
        query="x"
        results={[]}
        selected={[]}
        loading={false}
        error="Unable to search. Is the backend running?"
        onQueryChange={() => {}}
        onSearch={() => {}}
        onAdd={() => {}}
        onRemove={() => {}}
      />,
    )
    expect(html).toContain('Unable to search')
  })
})
