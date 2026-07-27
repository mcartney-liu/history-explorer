import type { ReactNode } from 'react'

// M34-A1 (Exploration UX Hardening): the presentational chrome extracted out of
// the App.tsx monolith — the hero band + the `.explorer` container — PLUS a
// dedicated, semantic navigation shell (`<nav class="nav-shell">`) for the
// breadcrumb / history / path-tree cluster (fixes TD-nav: previously those were
// loose siblings with no navigation container).
//
// AppShell is strictly presentational: it holds NO state and performs NO data
// fetching. App still owns all navigation + fetch logic and simply passes slots
// in. Rendering the same hero copy the monolith used keeps the existing smoke
// tests (App.smoke / SearchEntity) green — behavior is unchanged.
type AppShellProps = {
  // Search cluster (topic SearchBox + entity search + results). Rendered at the
  // top of the explorer, exactly where App.tsx rendered it before.
  search?: ReactNode
  // Navigation cluster (Breadcrumb + HistoryBar + ExplorationPathTree). Wrapped
  // in the semantic nav shell ONLY when present, so the landing page (no active
  // node) does not render an empty <nav>.
  nav?: ReactNode
  // Main content: loading / error / topic view / entity view / landing page.
  children?: ReactNode
}

function AppShell({ search, nav, children }: AppShellProps) {
  return (
    <main className="app">
      <section className="hero">
        <h1 className="title">History Explorer</h1>
        <p className="tagline">Explore History. Discover Civilization.</p>
        <p className="description">
          A data-driven global history exploration platform.
        </p>

        <div className="explorer">
          {search}
          {nav ? (
            <nav className="nav-shell" aria-label="Exploration navigation">
              {nav}
            </nav>
          ) : null}
          {children}
        </div>
      </section>
    </main>
  )
}

export default AppShell
