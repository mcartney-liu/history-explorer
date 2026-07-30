// M65 Phase 2C — ExplorationPath: unified Journey family entry point.
// Composition wrapper — delegates to sub-components transparently.
// All business logic stays in existing Journey family components.
// Uses `as any` casts to avoid re-exporting sub-component prop interfaces.

import ExplorationPathTree from './ExplorationPathTree'
import ExplorationJourney from './ExplorationJourney'
import JourneyPanel from './journey/JourneyPanel'

export type ExplorationPathProps =
  | { view: 'tree' | 'journey'; [key: string]: unknown }
  | { view: 'panel'; [key: string]: unknown }

/**
 * Unified Journey family entry. Delegates to:
 *   view="tree"    → ExplorationPathTree
 *   view="journey" → ExplorationJourney
 *   view="panel"   → JourneyPanel
 */
export function ExplorationPath(props: ExplorationPathProps) {
  const { view, ...rest } = props
  switch (view) {
    case 'tree':
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return <ExplorationPathTree {...(rest as any)} />
    case 'journey':
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return <ExplorationJourney {...(rest as any)} />
    case 'panel':
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return <JourneyPanel {...(rest as any)} />
  }
}

export default ExplorationPath
