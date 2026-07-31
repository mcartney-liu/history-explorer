import type { ReactNode } from 'react'

// DS Lite (M73 Phase2-B): Tabs — accessible tablist primitive (role=tab).
// Styling is delegated to className/tabClassName so existing page-specific
// styles (e.g. discover-tabs / discover-tab) stay the source of visual truth.
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
  return (
    <div className={['tabs', className].filter(Boolean).join(' ')} role="tablist" aria-label={ariaLabel}>
      {items.map((it) => (
        <button
          key={it.id}
          type="button"
          role="tab"
          id={`tab-${it.id}`}
          aria-selected={active === it.id}
          aria-controls={it.ariaControls}
          className={[tabClassName, active === it.id ? 'active' : ''].filter(Boolean).join(' ')}
          onClick={() => onChange(it.id)}
        >
          {it.label}
        </button>
      ))}
    </div>
  )
}

export default Tabs
