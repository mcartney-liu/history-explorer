// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { createRoot } from 'react-dom/client'
import { act } from 'react-dom/test-utils'
import { LocaleProvider } from '../../../data/locale'
import ConnectionExplorer from '../ConnectionExplorer'
import type { TimelineEvent } from '../../../data/entity/entityTypes'

// Regression for: entity page -> relationship network -> timeline view crashed
// with "Objects are not valid as a React child (found: object with keys
// {value, precision, certainty, label})". Backend returns each event's `date`
// as a TimeValue object, but the timeline list rendered it directly.
describe('ConnectionExplorer timeline date rendering', () => {
  it('renders a TimeValue-object date without throwing', () => {
    const container = document.createElement('div')
    document.body.appendChild(container)
    const root = createRoot(container)

    const timeline: TimelineEvent[] = [
      {
        event: '罗马建城',
        date: { value: -753, label: '', precision: 'year', certainty: 'high' } as any,
      },
      {
        event: '西罗马灭亡',
        date: { value: 476, label: '', precision: 'year', certainty: 'high' } as any,
      },
    ]

    act(() => {
      root.render(
        <LocaleProvider>
          <ConnectionExplorer graphNodes={[]} graphEdges={[]} timeline={timeline} />
        </LocaleProvider>,
      )
    })

    // Switch to the timeline view via the ViewSwitcher "时间线" tab.
    const buttons = Array.from(container.querySelectorAll('button')) as HTMLButtonElement[]
    const timelineBtn = buttons.find((b) => b.textContent?.includes('时间线'))
    expect(timelineBtn).toBeTruthy()
    act(() => {
      timelineBtn!.click()
    })

    const html = container.innerHTML
    expect(html).toContain('ce-timeline')
    // formatTimeValue(-753) -> "753 BC", formatTimeValue(476) -> "476 CE"
    expect(html).toContain('753 BC')
    expect(html).toContain('476 CE')

    act(() => {
      root.unmount()
    })
    container.remove()
  })

  it('still renders a plain string date', () => {
    const container = document.createElement('div')
    document.body.appendChild(container)
    const root = createRoot(container)

    const timeline: TimelineEvent[] = [{ event: '某事件', date: '100 CE' }]

    act(() => {
      root.render(
        <LocaleProvider>
          <ConnectionExplorer graphNodes={[]} graphEdges={[]} timeline={timeline} />
        </LocaleProvider>,
      )
    })

    const buttons = Array.from(container.querySelectorAll('button')) as HTMLButtonElement[]
    const timelineBtn = buttons.find((b) => b.textContent?.includes('时间线'))
    act(() => {
      timelineBtn!.click()
    })

    expect(container.innerHTML).toContain('100 CE')

    act(() => {
      root.unmount()
    })
    container.remove()
  })
})
