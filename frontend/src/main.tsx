import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { LocaleProvider } from './data/locale'
import './styles/tokens.css'
import './styles/typography.css'
import './styles/layout-grid.css'
import './styles/components.css'
import './styles/ui.css'
import './styles/explorer-experience.css'
import './styles/package.css'
import './pages/m89/m89.css'
import './App.css'

// ADR-0021 — the content console lives at #/admin.
//
// The split is done HERE rather than inside App.tsx on purpose: App.tsx is
// under active parallel development on phase5/reconstruction, and a top-level
// branch in main.tsx keeps this feature's merge conflict surface at zero.
//
// Lazily loaded, so the console's code and stylesheet never enter the
// landing-page bundle — visitors pay nothing for an operator tool.
const AdminPage = React.lazy(() => import('./pages/admin/AdminPage'))

const ADMIN_ROUTE = '#/admin'

function isAdminRoute(): boolean {
  return window.location.hash.startsWith(ADMIN_ROUTE)
}

function Root() {
  const [admin, setAdmin] = React.useState(isAdminRoute)

  React.useEffect(() => {
    const sync = () => setAdmin(isAdminRoute())
    window.addEventListener('hashchange', sync)
    return () => window.removeEventListener('hashchange', sync)
  }, [])

  if (admin) {
    // No visible fallback: the chunk is small and a flash of spinner would be
    // noisier than a brief blank frame.
    return (
      <React.Suspense fallback={null}>
        <AdminPage />
      </React.Suspense>
    )
  }

  return <App />
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <LocaleProvider>
      <Root />
    </LocaleProvider>
  </React.StrictMode>,
)
