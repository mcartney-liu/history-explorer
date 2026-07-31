// @vitest-environment jsdom
// M73 Phase3-B Bug Sweep — WAI-ARIA tabs keyboard pattern
// (roving tabindex + ArrowLeft/Right/Home/End).
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { Tabs } from '../Tabs'

const items = [
  { id: 'understand', label: '了解' },
  { id: 'research', label: '研究' },
  { id: 'expand', label: '扩展' },
]

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => {
    root.unmount()
  })
  container.remove()
})

function mount(active: string, onChange: (id: string) => void) {
  act(() => {
    root.render(<Tabs items={items} active={active} onChange={onChange} ariaLabel="测试分类" />)
  })
}

function keyOn(id: string, key: string) {
  const el = document.getElementById(`tab-${id}`) as HTMLButtonElement
  act(() => {
    el.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }))
  })
}

describe('ui/Tabs keyboard (WAI-ARIA pattern)', () => {
  it('renders roving tabindex (active tab reachable, others skipped)', () => {
    mount('understand', () => {})
    expect(document.getElementById('tab-understand')!.tabIndex).toBe(0)
    expect(document.getElementById('tab-research')!.tabIndex).toBe(-1)
    expect(document.getElementById('tab-expand')!.tabIndex).toBe(-1)
  })

  it('ArrowRight activates the next tab and moves focus', () => {
    const log: string[] = []
    mount('understand', (id) => log.push(id))
    keyOn('understand', 'ArrowRight')
    expect(log).toEqual(['research'])
    expect(document.activeElement?.id).toBe('tab-research')
  })

  it('ArrowLeft wraps around to the last tab', () => {
    const log: string[] = []
    mount('understand', (id) => log.push(id))
    keyOn('understand', 'ArrowLeft')
    expect(log).toEqual(['expand'])
    expect(document.activeElement?.id).toBe('tab-expand')
  })

  it('Home / End jump to first / last tab', () => {
    const log: string[] = []
    mount('research', (id) => log.push(id))
    keyOn('research', 'Home')
    expect(log).toEqual(['understand'])
    keyOn('understand', 'End')
    expect(log).toEqual(['understand', 'expand'])
  })

  it('ignores non-navigation keys', () => {
    const log: string[] = []
    mount('understand', (id) => log.push(id))
    keyOn('understand', 'Enter')
    expect(log).toEqual([])
  })
})
