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
  // M59-018: product navigation — no new pages, just anchors to existing sections
  const navItems = [
    { id: 'discover', label: '发现' },
    { id: 'explore', label: '探索' },
    { id: 'research', label: '研究' },
    { id: 'workspace', label: '工作台' },
  ]

  return (
    <main className="app">
      <header className="app-nav">
        <span className="app-nav-brand">History Explorer</span>
        <nav className="app-nav-links" aria-label="产品导航">
          {navItems.map(({ id, label }) => (
            <span key={id} className="app-nav-link" data-nav={id}>
              {label}
            </span>
          ))}
        </nav>
      </header>
      <section className="hero">
        <p className="tagline">Explore History. Discover Civilization.</p>

        <div className="page-container layout-grid">
          <div className="main-column">
            <div className="explorer">
              {search}
              {nav ? (
                <nav className="nav-shell" aria-label="Exploration navigation">
                  {nav}
                </nav>
              ) : null}
              {children}
            </div>
          </div>
          <div className="workspace-column">
            {workspace}
          </div>
        </div>
      </section>
    </main>
  )
}

export default AppShell
