import { describe, it, expect } from 'vitest'
import {
  NavNode,
  pushHistory,
  canBack,
  canForward,
  backCursor,
  forwardCursor,
  crumbCursor,
  buildBreadcrumb,
  addRecent,
  HISTORY_MAX,
  RECENT_MAX,
} from '../components/navigation'

const topic = (t: string): NavNode => ({ type: 'topic', topic: t, title: t })
const entity = (id: string): NavNode => ({ type: 'entity', id, name: id })

describe('pushHistory (own exploration history)', () => {
  it('appends a node and moves the cursor to it', () => {
    const { history, cursor } = pushHistory([], -1, topic('roman_empire'))
    expect(history).toHaveLength(1)
    expect(cursor).toBe(0)
  })

  it('dedups when navigating to the current node (no infinite growth)', () => {
    let state = pushHistory([], -1, topic('roman_empire'))
    state = pushHistory(state.history, state.cursor, topic('roman_empire'))
    expect(state.history).toHaveLength(1)
    expect(state.cursor).toBe(0)
  })

  it('truncates forward entries when branching from the middle', () => {
    let s = pushHistory([], -1, topic('a'))
    s = pushHistory(s.history, s.cursor, topic('b'))
    s = pushHistory(s.history, s.cursor, topic('c'))
    // Go back to 'a', then branch to 'd' — forward 'b'/'c' must be dropped.
    s = pushHistory(s.history, 0, topic('d'))
    expect(s.history.map((n) => n.type === 'topic' ? n.topic : n.id)).toEqual(['a', 'd'])
    expect(s.cursor).toBe(1)
  })

  it('caps history at HISTORY_MAX (100) to avoid unbounded growth', () => {
    let s = { history: [] as NavNode[], cursor: -1 }
    for (let i = 0; i < HISTORY_MAX + 5; i++) {
      s = pushHistory(s.history, s.cursor, topic(`t${i}`))
    }
    expect(s.history).toHaveLength(HISTORY_MAX)
    expect(s.cursor).toBe(HISTORY_MAX - 1)
    // Oldest entries were dropped.
    expect(s.history[0].type === 'topic' && s.history[0].topic).toBe('t5')
  })
})

describe('back / forward navigation', () => {
  const hist = [topic('a'), topic('b'), topic('c')]

  it('reports canBack / canForward at the boundaries', () => {
    expect(canBack(0)).toBe(false)
    expect(canBack(1)).toBe(true)
    expect(canForward(2, 3)).toBe(false)
    expect(canForward(1, 3)).toBe(true)
  })

  it('clamps cursor movement', () => {
    expect(backCursor(0)).toBe(0)
    expect(backCursor(2)).toBe(1)
    expect(forwardCursor(2, 3)).toBe(2)
    expect(forwardCursor(1, 3)).toBe(2)
  })
})

describe('breadcrumb', () => {
  it('always starts with Home and lists visited nodes up to the cursor', () => {
    let s = pushHistory([], -1, topic('roman_empire'))
    s = pushHistory(s.history, s.cursor, entity('person-augustus'))
    const crumbs = buildBreadcrumb(s.history, s.cursor)
    expect(crumbs[0]).toEqual({ key: 'home', label: 'Home', index: 0 })
    expect(crumbs.map((c) => c.label)).toEqual(['Home', 'roman_empire', 'person-augustus'])
    expect(crumbs[crumbs.length - 1].index).toBe(s.cursor + 1)
  })

  it('crumbCursor maps a crumb index back to a history index (Home = -1)', () => {
    expect(crumbCursor(0)).toBe(-1)
    expect(crumbCursor(2)).toBe(1)
  })
})

describe('recent explorations', () => {
  it('dedups and keeps the most-recent first', () => {
    let r = addRecent([], topic('a'))
    r = addRecent(r, topic('b'))
    r = addRecent(r, topic('a')) // revisit 'a'
    expect(r.map((n) => (n.type === 'topic' ? n.topic : n.id))).toEqual(['a', 'b'])
  })

  it('caps at RECENT_MAX (10)', () => {
    let r: NavNode[] = []
    for (let i = 0; i < RECENT_MAX + 3; i++) {
      r = addRecent(r, topic(`t${i}`))
    }
    expect(r).toHaveLength(RECENT_MAX)
    expect(r[0].type === 'topic' && r[0].topic).toBe(`t${RECENT_MAX + 2}`)
  })
})
