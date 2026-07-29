// ============================================================
// M62 — Canonical Icon System
// Semantic, implementation-agnostic icon registry. Every icon is
// referenced by a semantic NAME (e.g. "book", "globe", "person"),
// never by a raw emoji or a hard-bound third-party library. The
// visual style is locked to DS V1.0 FINAL §2.6: 1.5px stroke,
// linear, currentColor, three fixed sizes (16 / 20 / 24). No new
// dependency is introduced (inline SVG keeps the freeze baseline
// intact).
//
// WHY: emoji are banned as functional icons (project P0 rule);
// binding to a specific icon library would violate the "no new
// dependency" freeze. A name→SVG map lets the whole app consume
// one consistent icon language and lets visual-check assert
// "every icon slot references a registry key" — eliminating emoji
// regressions permanently.
// ============================================================

import type { CSSProperties } from 'react'

export type IconName =
  // --- capability / action icons ---
  | 'book'
  | 'globe'
  | 'link'
  | 'research'
  | 'chat'
  | 'scroll'
  | 'note'
  | 'compare'
  | 'thumb-up'
  | 'thumb-down'
  | 'spark'
  | 'timeline'
  | 'arrow-right'
  | 'check'
  // --- entity-type icons (replaces the old emoji set) ---
  | 'person'
  | 'civilization'
  | 'event'
  | 'location'
  | 'time-period'
  | 'technology'
  | 'religion'
  | 'idea'
  | 'close'
  | 'star'
  | 'warning'
  | 'circle'
  | 'cross'

const PATHS: Record<IconName, JSX.Element> = {
  // 📖 open book
  book: (
    <>
      <path d="M12 6.5C10.5 5.5 8.5 5.5 7 6.5V18c1.5-.9 3.5-.9 5 .1V6.5Z" />
      <path d="M12 6.5C13.5 5.5 15.5 5.5 17 6.5V18c-1.5-.9-3.5-.9-5 .1V6.5Z" />
    </>
  ),
  // 🌐 globe
  globe: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M3.5 12h17" />
      <path d="M12 3.5c2.4 2.3 3.7 5.3 3.7 8.5s-1.3 6.2-3.7 8.5c-2.4-2.3-3.7-5.3-3.7-8.5S9.6 5.8 12 3.5Z" />
    </>
  ),
  // 🔗 link
  link: (
    <>
      <path d="M9.5 14.5l5-5" />
      <path d="M8 11l-1.5 1.5a3 3 0 0 0 4.2 4.2L12.3 15" />
      <path d="M16 13l1.5-1.5a3 3 0 0 0-4.2-4.2L11.7 9" />
    </>
  ),
  // 🔬 research (flask)
  research: (
    <>
      <path d="M10 3v5.5L6.5 17a2 2 0 0 0 1.8 3h7.4a2 2 0 0 0 1.8-3L14 8.5V3" />
      <path d="M9.5 3h5" />
      <path d="M8.2 14h7.6" />
    </>
  ),
  // 💬 chat
  chat: (
    <>
      <path d="M5 5h14a1.5 1.5 0 0 1 1.5 1.5v8A1.5 1.5 0 0 1 19 16H9l-4 3.5V16H5a1.5 1.5 0 0 1-1.5-1.5v-8A1.5 1.5 0 0 1 5 5Z" />
    </>
  ),
  // 📜 scroll
  scroll: (
    <>
      <path d="M7 5h10a1.5 1.5 0 0 1 1.5 1.5V17a2 2 0 0 1-2 2H8a2 2 0 0 0-2 2V7.5A1.5 1.5 0 0 1 7 5Z" />
      <path d="M7 5a1.5 1.5 0 0 0-1.5 1.5V19a2 2 0 0 1 2-2" />
      <path d="M10 9h6M10 12h6" />
    </>
  ),
  // 📝 note (pencil)
  note: (
    <>
      <path d="M14 4l6 6L9 21l-6 1 1-6L14 4Z" />
      <path d="M12.5 6.5L17.5 11.5" />
    </>
  ),
  // ⇔ compare / balance
  compare: (
    <>
      <path d="M12 4v16" />
      <path d="M7 8h6M7 8 9.5 5.5M7 8l2.5 2.5" />
      <path d="M17 16H11M17 16l-2.5-2.5M17 16l-2.5 2.5" />
    </>
  ),
  'thumb-up': (
    <>
      <path d="M8 11v8H5.5a1 1 0 0 1-1-1v-6a1 1 0 0 1 1-1H8Z" />
      <path d="M8 11l4-7c1.2 0 2 .9 2 2v3h4.5a1.5 1.5 0 0 1 1.5 1.8l-1.2 6A2 2 0 0 1 16.8 19H8" />
    </>
  ),
  'thumb-down': (
    <>
      <path d="M8 13V5H5.5a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1H8Z" />
      <path d="M8 13l4 7c1.2 0 2-.9 2-2v-3h4.5a1.5 1.5 0 0 0 1.5-1.8l-1.2-6A2 2 0 0 0 16.8 5H8" />
    </>
  ),
  // ✦ spark (AI / insight accent)
  spark: (
    <>
      <path d="M12 4l1.6 4.4L18 10l-4.4 1.6L12 16l-1.6-4.4L6 10l4.4-1.6L12 4Z" />
    </>
  ),
  // timeline (AI explain_timeline)
  timeline: (
    <>
      <path d="M4 12h16" />
      <circle cx="8" cy="12" r="1.9" />
      <circle cx="16" cy="12" r="1.9" />
    </>
  ),
  // → arrow-right (AI suggest next step)
  'arrow-right': (
    <>
      <path d="M5 12h13" />
      <path d="M13 6l6 6-6 6" />
    </>
  ),
  // ✓ check (grounding verified)
  check: (
    <path d="M5 12.5l4 4 10-10" />
  ),
  // 👤 person
  person: (
    <>
      <circle cx="12" cy="8" r="3.2" />
      <path d="M5.5 19a6.5 6.5 0 0 1 13 0" />
    </>
  ),
  // 🏛 civilization (columns + pediment)
  civilization: (
    <>
      <path d="M4 9l8-4 8 4" />
      <path d="M5 9v8M9 9v8M15 9v8M19 9v8" />
      <path d="M3 20h18" />
    </>
  ),
  // ⚔ event (flag on pole)
  event: (
    <>
      <path d="M7 4v16" />
      <path d="M7 5h9l-2 3 2 3H7" />
    </>
  ),
  // 📍 location (map pin)
  location: (
    <>
      <path d="M12 21s6-5.3 6-10a6 6 0 1 0-12 0c0 4.7 6 10 6 10Z" />
      <circle cx="12" cy="11" r="2.2" />
    </>
  ),
  // ⏳ time-period (hourglass)
  'time-period': (
    <>
      <path d="M7 4h10M7 20h10" />
      <path d="M8 4c0 4 4 4 4 8s-4 4-4 8M16 4c0 4-4 4-4 8s4 4 4 8" />
    </>
  ),
  // ⚙ technology (gear)
  technology: (
    <>
      <circle cx="12" cy="12" r="3.2" />
      <path d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M18.4 5.6l-1.8 1.8M7.4 16.6l-1.8 1.8" />
    </>
  ),
  // 🕌 religion (dome + pillars)
  religion: (
    <>
      <path d="M12 4l5 4H7l5-4Z" />
      <path d="M6 8v9M18 8v9M4 17h16" />
      <path d="M9 17v-4h6v4" />
    </>
  ),
  // 💡 idea (lightbulb)
  idea: (
    <>
      <path d="M10 20h4M10 17h4" />
      <path d="M12 3a5.5 5.5 0 0 1 3.5 9.7c-.8.6-1.5 1.5-1.5 2.8H10c0-1.3-.7-2.2-1.5-2.8A5.5 5.5 0 0 1 12 3Z" />
    </>
  ),
  // ✕ close (remove button)
  close: (
    <>
      <path d="M6 6l12 12M18 6 6 18" />
    </>
  ),
  // ★ star (bookmark / favorite; solid when `filled`)
  star: (
    <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
  ),
  // ⚠ warning (triangle with exclamation)
  warning: (
    <>
      <path d="M12 4l9 16H3L12 4Z" />
      <path d="M12 10v4" />
      <path d="M12 17h.01" />
    </>
  ),
  // ○ neutral circle (status ring)
  circle: (
    <path d="M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16Z" />
  ),
  // ✗ error (circle with cross)
  cross: (
    <>
      <path d="M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16Z" />
      <path d="M9 9l6 6M15 9l-6 6" />
    </>
  ),
}

const SIZES = { 16: 16, 20: 20, 24: 24 } as const
export type IconSize = keyof typeof SIZES

export interface IconProps {
  name: IconName
  size?: IconSize
  className?: string
  style?: CSSProperties
  title?: string
  filled?: boolean
}

// If a non-registry key ever slips through, we render nothing visible
// (never an emoji). This makes the contract self-enforcing.
export function Icon({ name, size = 20, className, style, title, filled }: IconProps) {
  const path = PATHS[name]
  if (!path) return null
  return (
    <svg
      className={className}
      style={style}
      width={SIZES[size]}
      height={SIZES[size]}
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      role="img"
      aria-label={title ?? name}
      aria-hidden={title ? undefined : true}
    >
      {title ? <title>{title}</title> : null}
      {path}
    </svg>
  )
}

export const ICON_NAMES = Object.keys(PATHS) as IconName[]

export default Icon
