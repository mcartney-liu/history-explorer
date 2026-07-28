// ============================================================
// M59-018 — EntityExperienceHeader
// Unified container for EntityHero + ExplorationGuide.
// Pure layout. No business logic. Delegates to children.
// ============================================================

import type { ReactNode } from 'react'

interface EntityExperienceHeaderProps {
  hero: ReactNode
  guide?: ReactNode
}

export function EntityExperienceHeader({ hero, guide }: EntityExperienceHeaderProps) {
  return (
    <header className="eex" aria-label="实体探索入口">
      {hero}
      {guide && <div className="eex-guide">{guide}</div>}
    </header>
  )
}

export default EntityExperienceHeader
