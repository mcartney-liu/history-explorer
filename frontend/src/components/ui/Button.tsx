import type { ReactNode } from 'react'

export type ButtonVariant = 'gold' | 'ghost' | 'text'
export type ButtonSize = 'sm' | 'md'

interface ButtonProps {
  variant?: ButtonVariant
  size?: ButtonSize
  children: ReactNode
  className?: string
  onClick?: () => void
  type?: 'button' | 'submit'
  /** Accessible label — passed through to aria-label (M73 Phase2-B). */
  ariaLabel?: string
}

const base = 'btn'

const variantClass: Record<ButtonVariant, string> = {
  gold: 'btn-gold',
  ghost: 'btn-ghost',
  text: 'btn-text',
}

const sizeClass: Record<ButtonSize, string> = {
  sm: 'btn-sm',
  md: 'btn-md',
}

export function Button({
  variant = 'ghost',
  size = 'md',
  children,
  className = '',
  onClick,
  type = 'button',
  ariaLabel,
}: ButtonProps) {
  const classes = [base, variantClass[variant], sizeClass[size], className].filter(Boolean).join(' ')
  return (
    <button type={type} className={classes} onClick={onClick} aria-label={ariaLabel}>
      {children}
    </button>
  )
}

export default Button
