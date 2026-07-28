// ============================================================
// M59-008 — ViewSwitcher
// Museum-style view mode selector for ConnectionExplorer.
// Three modes: Graph | Timeline | Map.
// Pure presentational. State owned by parent.
// ============================================================

export type ViewMode = 'graph' | 'timeline' | 'map'

interface ViewSwitcherProps {
  current: ViewMode
  onChange: (mode: ViewMode) => void
}

const MODES: { id: ViewMode; label: string }[] = [
  { id: 'graph', label: '关系网络' },
  { id: 'timeline', label: '时间线' },
  { id: 'map', label: '空间' },
]

export function ViewSwitcher({ current, onChange }: ViewSwitcherProps) {
  return (
    <nav className="vs" role="tablist" aria-label="探索视角切换">
      {MODES.map(({ id, label }) => (
        <button
          key={id}
          type="button"
          role="tab"
          className={`vs-tab${current === id ? ' vs-tab--active' : ''}`}
          aria-selected={current === id}
          onClick={() => onChange(id)}
        >
          {label}
        </button>
      ))}
    </nav>
  )
}

export default ViewSwitcher
