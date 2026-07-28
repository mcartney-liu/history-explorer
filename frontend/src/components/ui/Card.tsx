import type { ReactNode } from 'react'

export type CardVariant = 'default' | 'featured' | 'glass'

interface CardProps {
  variant?: CardVariant
  hover?: boolean
  children: ReactNode
  className?: string
}

const baseClass: Record<CardVariant, string> = {
  default: 'card',
  featured: 'card-featured',
  glass: 'card-glass',
}

export function Card({ variant = 'default', hover = false, children, className = '' }: CardProps) {
  const classes = [baseClass[variant], hover ? 'card-hover' : '', className].filter(Boolean).join(' ')
  return <div className={classes}>{children}</div>
}

export default Card
