import type { ReactNode } from 'react'

// DS Lite (M73 Phase2-B): Badge — semantic tone chip built on Design Tokens.
// Tones map to the source-tier vocabulary used across the exploration journey:
// primary (一手来源) / academic (学术来源) / reference (参考来源) / neutral.
export type BadgeTone = 'primary' | 'academic' | 'reference' | 'neutral'

interface BadgeProps {
  tone?: BadgeTone
  children: ReactNode
  className?: string
  title?: string
  onClick?: () => void
}

const toneClass: Record<BadgeTone, string> = {
  primary: 'badge--primary',
  academic: 'badge--academic',
  reference: 'badge--reference',
  neutral: 'badge--neutral',
}

export function Badge({
  tone = 'neutral',
  children,
  className = '',
  title,
  onClick,
}: BadgeProps) {
  const classes = ['badge', toneClass[tone], className].filter(Boolean).join(' ')
  return (
    <span className={classes} title={title} onClick={onClick}>
      {children}
    </span>
  )
}

export default Badge
