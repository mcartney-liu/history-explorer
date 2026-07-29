// M62 W5 — Grounding badge.
//
// Tiny presentational indicator that communicates whether an AI answer has a
// verifiable knowledge-graph source. Rendered next to the AI panel title.
// No new dependency: reuses the canonical <Icon> registry (the `check` key
// added for this milestone). Text contrast is locked to >= 4.5:1 in App.css
// so the badge meets WCAG AA regardless of theme.

import { Icon } from './Icon'

export type GroundingBadgeState = 'verified' | 'unverified'

export interface GroundingBadgeProps {
  state: GroundingBadgeState
  className?: string
}

export default function GroundingBadge({ state, className = '' }: GroundingBadgeProps) {
  const classes = ['grounding-badge', `grounding-badge--${state}`, className]
    .filter(Boolean)
    .join(' ')

  if (state === 'verified') {
    return (
      <span className={classes}>
        <Icon name="check" size={16} />
        <span>已溯源</span>
      </span>
    )
  }

  return (
    <span className={classes}>
      <span>未溯源</span>
    </span>
  )
}
