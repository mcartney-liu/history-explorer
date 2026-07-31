// @vitest-environment jsdom
// M74-004-002 (Commit 2A): JourneyTrail — exploration path visualization.
// Asserts: consume-only of the EXISTING event stream (no new collection),
// renders the most recent N steps, and stays empty when no events exist.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'
import { JourneyTrail } from './JourneyTrail'
import { recordEvent } from '../../data/UserBehaviorEvent'
import { LocaleProvider } from '../../data/locale'

function render(node: React.ReactElement) {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const root = createRoot(host)
  act(() => root.render(node))
  return { root, host }
}

function cleanup(root: Root, host: HTMLDivElement) {
  act(() => root.unmount())
  host.remove()
}

describe('JourneyTrail (M74-004-002)', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    localStorage.clear()
  })

  it('renders nothing when the event stream is empty', () => {
    const { root, host } = render(
      <LocaleProvider>
        <JourneyTrail />
      </LocaleProvider>,
    )
    expect(host.querySelector('[data-testid="journey-trail"]')).toBeNull()
    cleanup(root, host)
  })

  it('renders the most recent steps from the existing open_entity sequence', () => {
    // Existing event API only — no new collection (PO C1).
    recordEvent({ action: 'open_entity', entityGlobalId: 'roman_empire:person-augustus' })
    recordEvent({ action: 'open_entity', entityGlobalId: 'roman_empire:person-caesar' })
    recordEvent({ action: 'open_entity', entityGlobalId: 'roman_empire:civ-roman-empire' })

    const { root, host } = render(
      <LocaleProvider>
        <JourneyTrail />
      </LocaleProvider>,
    )

    const steps = host.querySelectorAll('.journey-trail-step')
    expect(steps.length).toBe(3)
    const gids = [...host.querySelectorAll('.journey-trail-gid')].map((n) => n.textContent)
    expect(gids).toEqual([
      'roman_empire:person-augustus',
      'roman_empire:person-caesar',
      'roman_empire:civ-roman-empire',
    ])
    cleanup(root, host)
  })

  it('caps to maxSteps (most recent N)', () => {
    for (const gid of ['e:1', 'e:2', 'e:3', 'e:4', 'e:5', 'e:6', 'e:7']) {
      recordEvent({ action: 'open_entity', entityGlobalId: gid })
    }
    const { root, host } = render(
      <LocaleProvider>
        <JourneyTrail maxSteps={3} />
      </LocaleProvider>,
    )
    const gids = [...host.querySelectorAll('.journey-trail-gid')].map((n) => n.textContent)
    expect(gids).toEqual(['e:5', 'e:6', 'e:7'])
    cleanup(root, host)
  })

  it('renders clickable steps when onEntityClick is provided', () => {
    recordEvent({ action: 'open_entity', entityGlobalId: 'silk_road:silk_road' })
    const onClick = vi.fn()
    const { root, host } = render(
      <LocaleProvider>
        <JourneyTrail onEntityClick={onClick} />
      </LocaleProvider>,
    )
    const btn = host.querySelector<HTMLButtonElement>('.journey-trail-link')!
    act(() => btn.click())
    expect(onClick).toHaveBeenCalledWith('silk_road:silk_road')
    cleanup(root, host)
  })
})
