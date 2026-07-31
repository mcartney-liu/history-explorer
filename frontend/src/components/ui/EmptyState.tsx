import type { ReactNode } from 'react'

// DS Lite (M73 Phase2-B): EmptyState — consistent empty/error placeholder.
// Used for the missing-package error state and future empty states.
interface EmptyStateProps {
  title: string
  description?: string
  children?: ReactNode
  className?: string
}

export function EmptyState({ title, description, children, className = '' }: EmptyStateProps) {
  const classes = ['empty-state', className].filter(Boolean).join(' ')
  return (
    <div className={classes}>
      <h3 className="empty-state-title">{title}</h3>
      {description ? <p className="empty-state-desc">{description}</p> : null}
      {children}
    </div>
  )
}

export default EmptyState
