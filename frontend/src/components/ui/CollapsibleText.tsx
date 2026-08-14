import { useState } from 'react'
import { useLocale } from '../../data/locale'

interface CollapsibleTextProps {
  /** 长文内容（默认 N 行省略 + 「展开全文」）。 */
  text: string
  /** 默认显示行数（INFO_FOLDING UX SPEC：长文默认 3~4 行）。 */
  lines?: number
  /** 容器类名。 */
  className?: string
}

// INFO_FOLDING UX SPEC (2026-08-15, PO)：统一长文截断组件——
// 默认 N 行省略号 + 「展开全文」，展开后「收起全文」。
// 截断必有出路，不丢弃信息。
export default function CollapsibleText({
  text,
  lines = 3,
  className = 'ui-collapsible-text',
}: CollapsibleTextProps) {
  const { t } = useLocale()
  const [expanded, setExpanded] = useState(false)
  if (!text) return null
  return (
    <div className={className}>
      <p
        className={`ui-collapsible-text-body${expanded ? ' is-expanded' : ''}`}
        style={expanded ? undefined : { WebkitLineClamp: lines }}
      >
        {text}
      </p>
      <button
        type="button"
        className="ui-collapsible-toggle"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        {expanded ? t('common.collapse_text') : t('common.expand_text')}
      </button>
    </div>
  )
}
