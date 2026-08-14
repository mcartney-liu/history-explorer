import { useState, type ReactNode } from 'react'
import { useLocale } from '../../data/locale'

interface CollapsibleListProps {
  /** 全部条目（默认只渲染前 visible 条，展开后全部）。 */
  children: ReactNode[]
  /** 默认显示条数（INFO_FOLDING UX SPEC：列表类默认 3~5 条）。 */
  visible?: number
  /** 容器类名（复用触点既有类，保留原布局）。 */
  className?: string
}

// INFO_FOLDING UX SPEC (2026-08-15, PO)：统一列表折叠组件——
// 默认只显前 N 条 + 「查看全部 N 条 →」就地展开（再点收起）。
// 截断必有出路，不丢弃信息。容器为 div，条目保持原元素（li/div 皆可），
// 既有后代选择器样式不受影响。
export default function CollapsibleList({
  children,
  visible = 3,
  className = 'ui-collapsible-list',
}: CollapsibleListProps) {
  const { t } = useLocale()
  const [expanded, setExpanded] = useState(false)
  const items = Array.isArray(children) ? children : [children]
  if (items.length <= visible) {
    return <div className={className}>{items}</div>
  }
  const shown = expanded ? items : items.slice(0, visible)
  return (
    <div className={className}>
      {shown}
      <button
        type="button"
        className="ui-collapsible-toggle"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        {expanded ? t('common.collapse') : t('common.view_all', { count: String(items.length) })}
      </button>
    </div>
  )
}
