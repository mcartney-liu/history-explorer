import { describe, it, expect, beforeEach, beforeAll } from 'vitest'
import {
  recordEvent,
  getEvents,
  getEventsByAction,
  getRecentEvents,
  getEventCount,
  clearEvents,
  actionFrequencies,
  uniqueEntities,
  lastsOver,
  tabUsage,
  firstEventTime,
} from './UserBehaviorEvent'

// localStorage polyfill
const store = new Map<string, string>()
beforeAll(() => {
  const mock: Storage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => { store.set(key, value) },
    removeItem: (key: string) => { store.delete(key) },
    clear: () => { store.clear() },
    get length() { return store.size },
    key: (index: number) => Array.from(store.keys())[index] ?? null,
  }
  Object.defineProperty(globalThis, 'localStorage', { value: mock, writable: true })
})

beforeEach(() => {
  localStorage.clear()
})

describe('UserBehaviorEvent', () => {
  it('records and retrieves events', () => {
    recordEvent({ action: 'open_discover' })
    const events = getEvents()
    expect(events).toHaveLength(1)
    expect(events[0].action).toBe('open_discover')
  })

  it('auto-generates timestamp when not provided', () => {
    recordEvent({ action: 'click_entity' })
    const events = getEvents()
    expect(events[0].timestamp).toBeTruthy()
  })

  it('filters events by action type', () => {
    recordEvent({ action: 'open_entity', entityGlobalId: 't:rome' })
    recordEvent({ action: 'start_research', entityGlobalId: 't:rome' })
    recordEvent({ action: 'open_entity', entityGlobalId: 't:han' })
    expect(getEventsByAction('open_entity')).toHaveLength(2)
    expect(getEventsByAction('start_research')).toHaveLength(1)
  })

  it('returns recent events limited', () => {
    for (let i = 0; i < 30; i++) {
      recordEvent({ action: 'click_entity' })
    }
    expect(getRecentEvents(10)).toHaveLength(10)
  })

  it('counts total events', () => {
    recordEvent({ action: 'open_discover' })
    recordEvent({ action: 'click_entity' })
    expect(getEventCount()).toBe(2)
  })

  it('computes action frequencies', () => {
    recordEvent({ action: 'open_entity' })
    recordEvent({ action: 'open_entity' })
    recordEvent({ action: 'switch_tab' })
    const freq = actionFrequencies()
    expect(freq[0].action).toBe('open_entity')
    expect(freq[0].count).toBe(2)
  })

  it('counts unique entities', () => {
    recordEvent({ action: 'open_entity', entityGlobalId: 't:rome' })
    recordEvent({ action: 'open_entity', entityGlobalId: 't:han' })
    recordEvent({ action: 'open_entity', entityGlobalId: 't:rome' })
    expect(uniqueEntities()).toBe(2)
  })

  it('detects session longer than N minutes', () => {
    recordEvent({ action: 'open_discover' }, '2026-07-28T00:00:00Z')
    recordEvent({ action: 'click_entity' }, '2026-07-28T00:20:00Z')
    expect(lastsOver(15)).toBe(true)
    expect(lastsOver(30)).toBe(false)
  })

  it('computes tab usage', () => {
    recordEvent({ action: 'switch_tab', tab: 'explore' })
    recordEvent({ action: 'switch_tab', tab: 'research' })
    recordEvent({ action: 'switch_tab', tab: 'explore' })
    const usage = tabUsage()
    expect(usage[0].tab).toBe('explore')
    expect(usage[0].count).toBe(2)
  })

  it('returns null for first event when empty', () => {
    expect(firstEventTime()).toBeNull()
  })

  it('clears all events', () => {
    recordEvent({ action: 'open_discover' })
    clearEvents()
    expect(getEvents()).toHaveLength(0)
  })

  // M71 — Exploration Validation telemetry contract
  it('records the new exploration-package actions (open_package / click_guide_next / view_source / complete_package)', () => {
    recordEvent({ action: 'open_package', packageSlug: 'china-civilization-v1' })
    recordEvent({ action: 'click_guide_next', entityGlobalId: 'china_v1:idea-wenguan' })
    recordEvent({ action: 'view_source', sourceId: 'src-cn-qianmu' })
    recordEvent({ action: 'complete_package', packageSlug: 'silk-road-exploration' })

    const events = getEvents()
    expect(events.map((e) => e.action)).toEqual([
      'open_package',
      'click_guide_next',
      'view_source',
      'complete_package',
    ])
    // New optional fields serialize round-trip through localStorage.
    const pkg = events[0]
    expect(pkg.packageSlug).toBe('china-civilization-v1')
    const src = events[2]
    expect(src.sourceId).toBe('src-cn-qianmu')
    // Filters work for the new actions too.
    expect(getEventsByAction('open_package')).toHaveLength(1)
    expect(getEventsByAction('click_guide_next')[0].entityGlobalId).toBe(
      'china_v1:idea-wenguan',
    )
    expect(getEventsByAction('complete_package')[0].packageSlug).toBe(
      'silk-road-exploration',
    )
  })

  it('keeps recordEvent interface backward-compatible (no new required fields)', () => {
    recordEvent({ action: 'open_entity', entityGlobalId: 't:rome' })
    recordEvent({ action: 'open_package', packageSlug: 'roman-empire-exploration' })
    const events = getEvents()
    // Existing events carry no packageSlug/sourceId — optional fields default undefined.
    expect(events[0].packageSlug).toBeUndefined()
    expect(events[1].sourceId).toBeUndefined()
  })
})
