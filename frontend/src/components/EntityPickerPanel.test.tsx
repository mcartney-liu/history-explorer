import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import type { ReactElement } from 'react'
import type { SearchResultItem } from './SearchResults'
import type { Candidate } from '../data/candidateUtils'
import { LocaleProvider } from '../data/locale'
import { EntityPickerView } from './EntityPickerPanel'
import {
  resultsToCandidates,
  addCandidate,
  removeCandidate,
} from './EntityPickerPanel'

const r2s = renderToStaticMarkup
const render = (el: ReactElement) => r2s(<LocaleProvider>{el}</LocaleProvider>)

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
    const html = render(
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
    const html = render(
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
    expect(html).toContain('人物')
    expect(html).toContain('qin_dynasty')
    expect(html).toContain('亚历山大')
  })

  it('renders selected chips and marks already-added results', () => {
    const html = render(
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
    const html = render(
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

describe('EntityPickerView — M15 enhanced UX', () => {
  const base = {
    query: '人',
    loading: false,
    error: '',
    onQueryChange: () => {},
    onSearch: () => {},
    onAdd: () => {},
    onRemove: () => {},
  }

  it('renders topic filter chips (incl. 全部) when topics + handler provided', () => {
    const html = render(
      <EntityPickerView
        {...base}
        results={[QIN, ALEX]}
        selected={[]}
        topics={['qin_dynasty', 'ancient_greece']}
        activeTopic=""
        onTopicFilter={() => {}}
      />,
    )
    expect(html).toContain('按主题筛选')
    expect(html).toContain('全部')
    expect(html).toContain('qin_dynasty')
    expect(html).toContain('ancient_greece')
  })

  it('marks the active topic chip with aria-pressed', () => {
    const html = render(
      <EntityPickerView
        {...base}
        results={[QIN]}
        selected={[]}
        topics={['qin_dynasty']}
        activeTopic="qin_dynasty"
        onTopicFilter={() => {}}
      />,
    )
    expect(html).toContain('is-active')
    expect(html).toContain('aria-pressed="true"')
  })

  it('renders the sort control when a handler is provided', () => {
    const html = render(
      <EntityPickerView
        {...base}
        results={[QIN, ALEX]}
        selected={[]}
        sortKey="type"
        onSortChange={() => {}}
      />,
    )
    expect(html).toContain('排序')
    expect(html).toContain('名称')
    expect(html).toContain('类型')
  })

  it('renders reorder arrows and a clear-all button for the selection', () => {
    const html = render(
      <EntityPickerView
        {...base}
        results={[]}
        selected={[QIN, ALEX]}
        onReorder={() => {}}
        onClearAll={() => {}}
      />,
    )
    expect(html).toContain('清空')
    expect(html).toContain('上移')
    expect(html).toContain('下移')
  })

  it('disables up on the first and down on the last selected chip', () => {
    const html = render(
      <EntityPickerView
        {...base}
        results={[]}
        selected={[QIN, ALEX]}
        onReorder={() => {}}
      />,
    )
    // first chip's up button and last chip's down button are disabled
    expect(html).toContain('aria-label="上移 秦始皇"')
    expect(html).toContain('aria-label="下移 亚历山大"')
    expect((html.match(/disabled/g) ?? []).length).toBeGreaterThanOrEqual(2)
  })

  it('caps rendered rows and shows an overflow notice', () => {
    const many: Candidate[] = Array.from({ length: 5 }, (_, i) => ({
      gid: `t:e${i}`,
      name: `E${i}`,
      topic: 't',
    }))
    const html = render(
      <EntityPickerView
        {...base}
        results={many}
        selected={[]}
        maxVisibleResults={2}
      />,
    )
    expect(html).toContain('E0')
    expect(html).toContain('E1')
    expect(html).not.toContain('E2')
    expect(html).toContain('还有 3 个结果')
  })

  it('stays backward-compatible: omitting M15 props renders no chips/sort/arrows', () => {
    const html = render(
      <EntityPickerView
        {...base}
        results={[QIN]}
        selected={[QIN]}
      />,
    )
    expect(html).not.toContain('按主题筛选')
    expect(html).not.toContain('排序')
    expect(html).not.toContain('清空')
    expect(html).toContain('已选 1')
  })
})
