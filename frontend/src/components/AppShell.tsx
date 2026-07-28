import type { ReactNode } from 'react'
import { useLocale } from '../data/locale'

// AppShell — presentational chrome. Hero band + explorer container + nav shell.
// M60: added locale switcher in nav bar.

type AppShellProps = {
  search?: ReactNode
  nav?: ReactNode
  workspace?: ReactNode
  children?: ReactNode
}

function AppShell({ search, nav, workspace, children }: AppShellProps) {
  const { locale, setLocale, t } = useLocale()

  const navItems = [
    { id: 'discover', label: t('nav.discover') },
    { id: 'explore', label: t('nav.explore') },
    { id: 'research', label: t('nav.research') },
    { id: 'workspace', label: t('nav.workspace') },
  ]

  return (
    <main className="app">
      <header className="app-nav">
        <span className="app-nav-brand">History Explorer</span>
        <div className="app-nav-right">
          <nav className="app-nav-links" aria-label="产品导航">
            {navItems.map(({ id, label }) => (
              <span key={id} className="app-nav-link" data-nav={id}>
                {label}
              </span>
            ))}
          </nav>
          <button
            type="button"
            className="app-locale-btn"
            onClick={() => setLocale(locale === 'zh' ? 'en' : 'zh')}
            title={locale === 'zh' ? 'Switch to English' : '切换到中文'}
          >
            {locale === 'zh' ? 'EN' : '中'}
          </button>
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
