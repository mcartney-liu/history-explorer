import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { LocaleProvider } from '../data/locale'
import type { Candidate } from '../data/candidateUtils'

const r2s = renderToStaticMarkup
const render = (el: Parameters<typeof r2s>[0]) => r2s(<LocaleProvider>{el}</LocaleProvider>)
import MultiEntityContextPanel, {
  MultiEntityContextView,
  applyToggleSelection,
  resolveCandidates,
} from './MultiEntityContextPanel'

const GIDS = ['egypt:person-ramesses', 'egypt:place-giza', 'egypt:event-unification']
const CANDIDATES: Candidate[] = [
  { gid: 'qin_dynasty:person-qsh', name: '秦始皇', type: 'Person', topic: 'qin_dynasty' },
  { gid: 'ancient_greece:person-alex', name: '亚历山大', type: 'Person', topic: 'ancient_greece' },
]

describe('MultiEntityContextView (M13/M14)', () => {
  it('renders the heading and every candidate as a toggle chip (friendly name/type)', () => {
    const html = render(
      <MultiEntityContextView
        candidates={CANDIDATES}
        selectedGids={[]}
        maxSelectable={8}
        onToggle={() => {}}
      />,
    )
    expect(html).toContain('AI 多实体联合解读')
    expect(html).toContain('已选 0/8')
    expect(html).toContain('秦始皇')
    expect(html).toContain('亚历山大')
    expect(html).toContain('人物')
  })

  it('marks selected candidates as pressed and shows the count', () => {
    const html = render(
      <MultiEntityContextView
        candidates={CANDIDATES}
        selectedGids={['qin_dynasty:person-qsh', 'ancient_greece:person-alex']}
        maxSelectable={8}
        onToggle={() => {}}
      />,
    )
    expect(html).toContain('已选 2/8')
    // Selected chips render in the top bar with aria-pressed=true.
    expect(html).toContain('aria-pressed="true"')
    // The inner AIExplanationPanel renders an idle panel scoped to 2 entities.
    expect(html).toContain('选一个角度（必选）')
    expect(html).toContain('多实体联合解读')
  })

  it('disables unselected chips once the selection cap is reached (MAX_N is UI-only)', () => {
    const html = render(
      <MultiEntityContextView
        candidates={CANDIDATES}
        selectedGids={['qin_dynasty:person-qsh']}
        maxSelectable={1}
        onToggle={() => {}}
      />,
    )
    // The unselected candidate must be disabled at the cap.
    expect(html).toContain('disabled')
  })
})

describe('MultiEntityContextView — M15 resolved-context transparency', () => {
  it('shows a resolved-context count of 0 with no preview when nothing is selected', () => {
    const html = render(
      <MultiEntityContextView
        candidates={CANDIDATES}
        selectedGids={[]}
        maxSelectable={8}
        onToggle={() => {}}
      />,
    )
    expect(html).toContain('已解析上下文 0 个 global_id')
    expect(html).not.toContain('预览将发送的 global_id')
  })

  it('mirrors multiEntityContext: count + collapsible list of the exact ids sent', () => {
    const html = render(
      <MultiEntityContextView
        candidates={CANDIDATES}
        selectedGids={['qin_dynasty:person-qsh', 'ancient_greece:person-alex']}
        maxSelectable={8}
        onToggle={() => {}}
      />,
    )
    expect(html).toContain('已解析上下文 2 个 global_id')
    expect(html).toContain('预览将发送的 global_id')
    // exact global_ids that will be sent to /ai/explain are previewable
    expect(html).toContain('qin_dynasty:person-qsh')
    expect(html).toContain('ancient_greece:person-alex')
  })
})

describe('applyToggleSelection (M13 selection cap)', () => {
  it('adds a new gid when below the cap', () => {
    expect(applyToggleSelection(['a:1'], 'b:2', 8)).toEqual(['a:1', 'b:2'])
  })
  it('removes an already-selected gid', () => {
    expect(applyToggleSelection(['a:1', 'b:2'], 'a:1', 8)).toEqual(['b:2'])
  })
  it('does NOT exceed the cap when adding', () => {
    expect(applyToggleSelection(['a:1', 'b:2'], 'c:3', 2)).toEqual(['a:1', 'b:2'])
  })
})

describe('resolveCandidates (M14 compatibility-first resolution)', () => {
  it('uses candidates as the primary source when non-empty', () => {
    expect(resolveCandidates(CANDIDATES, GIDS)).toEqual(CANDIDATES)
  })
  it('falls back to candidateGids when candidates is empty/undefined', () => {
    expect(resolveCandidates(undefined, GIDS)).toEqual(
      GIDS.map((gid) => ({ gid, name: gid })),
    )
    expect(resolveCandidates([], GIDS)).toEqual(GIDS.map((gid) => ({ gid, name: gid })))
  })
  it('returns [] when neither source has entries', () => {
    expect(resolveCandidates(undefined, undefined)).toEqual([])
    expect(resolveCandidates([], [])).toEqual([])
  })
  it('de-duplicates by gid, preserving first-occurrence order', () => {
    const dup: Candidate[] = [
      { gid: 't:a', name: 'A' },
      { gid: 't:a', name: 'A dup' },
      { gid: 't:b', name: 'B' },
    ]
    expect(resolveCandidates(dup).map((c) => c.gid)).toEqual(['t:a', 't:b'])
  })
})

describe('MultiEntityContextPanel container (M13/M14)', () => {
  it('backward-compatible: parses bare candidateGids into readable display names/types', () => {
    const html = render(
      <MultiEntityContextPanel candidateGids={GIDS} onCitationClick={() => {}} />,
    )
    expect(html).toContain('AI 多实体联合解读')
    expect(html).toContain('已选 0/8')
    // Raw IDs are parsed into title-cased slugs and grouped by inferred type.
    expect(html).toContain('Ramesses')
    expect(html).toContain('Giza')
    expect(html).toContain('Unification')
    expect(html).toContain('人物')
    expect(html).toContain('地点')
    expect(html).toContain('事件')
  })

  it('M14: renders friendly candidates when the candidates prop is supplied', () => {
    const html = render(
      <MultiEntityContextPanel candidates={CANDIDATES} onCitationClick={() => {}} />,
    )
    expect(html).toContain('秦始皇')
    expect(html).toContain('亚历山大')
  })

  it('M14: candidates wins over candidateGids when both are supplied', () => {
    const html = render(
      <MultiEntityContextPanel
        candidates={CANDIDATES}
        candidateGids={GIDS}
        onCitationClick={() => {}}
      />,
    )
    expect(html).toContain('秦始皇')
    expect(html).toContain('亚历山大')
    expect(html).not.toContain('Ramesses')
  })
})
