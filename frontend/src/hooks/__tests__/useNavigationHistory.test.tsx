// @vitest-environment jsdom
import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { useRef } from 'react'
import { useNavigationHistory, type NavigationApi } from '../useNavigationHistory'
import type { NavNode } from '../../components/navigation'
import { loadPath } from '../../utils/explorationPersistence'

// localStorage isolation per test (jsdom provides localStorage; we reset it).
beforeEach(() => {
  localStorage.clear()
})

type Log = {
  navigated: { node: NavNode; cursor: number }[]
  homeExits: number
}

function makeHarness(deps: {
  onNavigate?: (node: NavNode, c: number) => void
  onHomeExit?: () => void
}) {
  const log: Log = { navigated: [], homeExits: 0 }
  let api: NavigationApi | null = null
  function Harness() {
    const ref = useRef<NavigationApi | null>(null)
    ref.current = useNavigationHistory({
      onNavigate: (node, c) => {
        log.navigated.push({ node, cursor: c })
        deps.onNavigate?.(node, c)
      },
      onHomeExit: () => {
        log.homeExits += 1
        deps.onHomeExit?.()
      },
    })
    api = ref.current
    return null
  }
  const root: Root = createRoot(document.createElement('div'))
  act(() => root.render(<Harness />))
  return { api: () => api!, log, root }
}

const topicNode: NavNode = { type: 'topic', topic: 'roman_empire', title: 'Roman Empire' }
const entityNode: NavNode = { type: 'entity', id: 'loc-rome', name: 'Rome' }

describe('useNavigationHistory (M73 navigation state machine)', () => {
  it('navigateTo pushes history, moves cursor, persists and notifies App', () => {
    const { api, log } = makeHarness({})
    act(() => api().navigateTo(topicNode))
    act(() => api().navigateTo(entityNode))

    expect(api().history).toHaveLength(2)
    expect(api().cursor).toBe(1)
    expect(api().current).toEqual(entityNode)
    expect(log.navigated).toEqual([
      { node: topicNode, cursor: 0 },
      { node: entityNode, cursor: 1 },
    ])
    // persistence round-trip (read back through the adapter, not a re-render)
    const restored = loadPath()
    expect(restored?.history).toHaveLength(2)
    expect(restored?.cursor).toBe(1)
  })

  it('goBack / goForward move along the stack and notify App', () => {
    const { api, log } = makeHarness({})
    act(() => api().navigateTo(topicNode))
    act(() => api().navigateTo(entityNode))
    log.navigated = []

    act(() => api().goBack())
    expect(api().cursor).toBe(0)
    expect(api().current).toEqual(topicNode)
    expect(log.navigated).toEqual([{ node: topicNode, cursor: 0 }])

    act(() => api().goBack()) // no-op at start
    expect(api().cursor).toBe(0)

    act(() => api().goForward())
    expect(api().cursor).toBe(1)
    expect(api().current).toEqual(entityNode)
  })

  it('breadcrumb Home (index 0) exits everything (goHome + onHomeExit)', () => {
    const { api, log } = makeHarness({})
    act(() => api().navigateTo(topicNode))
    act(() => api().navigateTo(entityNode))

    act(() => api().onCrumbClick(0))
    expect(api().history).toHaveLength(0)
    expect(api().cursor).toBe(-1)
    expect(log.homeExits).toBe(1)
  })

  it('breadcrumb index > 0 jumps to that crumb position (crumb index = history index + 1)', () => {
    const { api } = makeHarness({})
    act(() => api().navigateTo(topicNode))
    act(() => api().navigateTo(entityNode))
    act(() => api().navigateTo(topicNode))

    // crumb 1 = history[0] (topic), crumb 2 = history[1] (entity)
    act(() => api().onCrumbClick(1))
    expect(api().cursor).toBe(0)
    expect(api().current).toEqual(topicNode)

    act(() => api().onCrumbClick(2))
    expect(api().cursor).toBe(1)
    expect(api().current).toEqual(entityNode)
  })

  it('goHome resets stack and persists empty path', () => {
    const { api } = makeHarness({})
    act(() => api().navigateTo(topicNode))
    act(() => api().goHome())
    expect(api().history).toHaveLength(0)
    expect(api().cursor).toBe(-1)
    const restored = loadPath()
    expect(restored?.history).toHaveLength(0)
    expect(restored?.cursor).toBe(-1)
  })

  it('exposes setErrorKind / setRecent for App wiring', () => {
    const { api } = makeHarness({})
    act(() => api().setErrorKind('network'))
    expect(api().errorKind).toBe('network')
    act(() => api().setRecent([topicNode]))
    expect(api().recent).toEqual([topicNode])
  })
})
