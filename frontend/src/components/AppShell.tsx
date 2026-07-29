import type { ReactNode } from 'react'
import { useLocale } from '../data/locale'
import LanguageSwitcher from './LanguageSwitcher'

// AppShell — presentational chrome. Hero band + explorer container + nav shell.
// M60: added locale switcher in nav bar.

type AppShellProps = {
  search?: ReactNode
  nav?: ReactNode
  workspace?: ReactNode
  children?: ReactNode
}

function AppShell({ search, nav, workspace, children }: AppShellProps) {
  const { t } = useLocale()

  // M60-003: nav tabs hidden — no real routing or scroll-to-section yet.
  // Keep brand + locale only.

  return (
    <main className="app">
      <header className="app-nav">
        <span className="app-nav-brand">History Explorer</span>
        <div className="app-nav-right">
          <LanguageSwitcher />
        </div>
      </header>

      <section className="hero">
        <p className="tagline">{t('hero.tagline')}</p>

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
