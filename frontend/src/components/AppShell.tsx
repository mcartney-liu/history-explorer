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
  search?: ReactNode
  nav?: ReactNode
  /** M59-009: Workspace panel — right sidebar. */
  workspace?: ReactNode
  children?: ReactNode
}

function AppShell({ search, nav, workspace, children }: AppShellProps) {
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
      {workspace}
    </main>
  )
}

export default AppShell
