import type { KeyboardEvent, ReactNode } from 'react'

// DS Lite (M73 Phase2-B): Tabs — accessible tablist primitive (role=tab).
// Styling is delegated to className/tabClassName so existing page-specific
// styles (e.g. discover-tabs / discover-tab) stay the source of visual truth.
// M73 Phase3-B (Bug Sweep): added WAI-ARIA tabs keyboard pattern —
// roving tabindex + ArrowLeft/Right/Home/End. Purely additive; mouse
// behaviour and existing class-based styling unchanged.
export interface TabItem<T extends string = string> {
  id: T
  label: ReactNode
  ariaControls?: string
}

interface TabsProps<T extends string = string> {
  items: TabItem<T>[]
  active: T
  onChange: (id: T) => void
  className?: string
  tabClassName?: string
  ariaLabel?: string
}

export function Tabs<T extends string = string>({
  items,
  active,
  onChange,
  className = '',
  tabClassName = '',
  ariaLabel,
}: TabsProps<T>) {
  const moveFocus = (id: string) => {
    document.getElementById(`tab-${id}`)?.focus()
  }

  const onTabKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    const idx = items.findIndex((it) => it.id === active)
    if (idx < 0) return
    let next = idx
    if (e.key === 'ArrowRight') next = (idx + 1) % items.length
    else if (e.key === 'ArrowLeft') next = (idx - 1 + items.length) % items.length
    else if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = items.length - 1
    else return
    e.preventDefault()
    const target = items[next]
    onChange(target.id)
    moveFocus(target.id)
  }

  return (
    <div className={['tabs', className].filter(Boolean).join(' ')} role="tablist" aria-label={ariaLabel}>
      {items.map((it) => (
        <button
          key={it.id}
          type="button"
          role="tab"
          id={`tab-${it.id}`}
          tabIndex={active === it.id ? 0 : -1}
          aria-selected={active === it.id}
          aria-controls={it.ariaControls}
          className={[tabClassName, active === it.id ? 'active' : ''].filter(Boolean).join(' ')}
          onClick={() => onChange(it.id)}
          onKeyDown={onTabKeyDown}
        >
          {it.label}
        </button>
      ))}
    </div>
  )
}

export default Tabs
