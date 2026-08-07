/** M83.1 — Instrumentation type & emit tests. */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'

// Mock localStorage for vitest node environment
const store: Record<string, string> = {}
const localStorageMock = {
  getItem: (key: string) => store[key] ?? null,
  setItem: (key: string, value: string) => { store[key] = value },
  removeItem: (key: string) => { delete store[key] },
}
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock })

import {
  recordEvent,
  getEvents,
  getEventsByAction,
  clearEvents,
} from '../UserBehaviorEvent'
import type { BehaviorAction } from '../UserBehaviorEvent'

beforeEach(() => {
  clearEvents()
})

afterEach(() => {
  clearEvents()
})

describe('M83.1 Event Types', () => {
  const csEvents: BehaviorAction[] = [
    'cs_card_view',
    'cs_card_expand',
    'cs_follow_entity',
    'cs_guide_next',
    'cs_evidence_open',
  ]

  it.each(csEvents)('recordEvent with causalId works for %s', (action) => {
    recordEvent({ action, causalId: 'cs-test-001' })
    const events = getEvents()
    expect(events).toHaveLength(1)
    expect(events[0].action).toBe(action)
    expect(events[0].causalId).toBe('cs-test-001')
  })

  it('causalId is optional — not required for non-CS events', () => {
    recordEvent({ action: 'open_entity', entityGlobalId: 'entity-1' })
    const events = getEvents()
    expect(events[0].causalId).toBeUndefined()
  })

  it('causalId is present when provided', () => {
    recordEvent({ action: 'cs_card_view', causalId: 'cs-001' })
    expect(getEvents()[0].causalId).toBe('cs-001')
  })

  it('no confidence field on event schema', () => {
    recordEvent({ action: 'cs_card_view', causalId: 'cs-001' })
    const event = getEvents()[0]
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((event as any).causalConfidence).toBeUndefined()
  })

  it('getEventsByAction filters CS events correctly', () => {
    recordEvent({ action: 'cs_card_view', causalId: 'cs-001' })
    recordEvent({ action: 'cs_card_view', causalId: 'cs-002' })
    recordEvent({ action: 'cs_card_expand', causalId: 'cs-001' })
    recordEvent({ action: 'open_entity', entityGlobalId: 'entity-1' })

    const views = getEventsByAction('cs_card_view')
    expect(views).toHaveLength(2)

    const expands = getEventsByAction('cs_card_expand')
    expect(expands).toHaveLength(1)

    const entities = getEventsByAction('open_entity')
    expect(entities).toHaveLength(1)
  })

  it('existing non-CS events still work', () => {
    recordEvent({ action: 'open_entity', entityGlobalId: 'entity-1' })
    recordEvent({ action: 'click_entity', entityGlobalId: 'entity-2' })
    recordEvent({ action: 'switch_tab', tab: 'timeline' })
    expect(getEvents()).toHaveLength(3)
  })
})
