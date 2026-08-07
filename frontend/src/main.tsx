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

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <LocaleProvider>
      <App />
    </LocaleProvider>
  </React.StrictMode>,
)
