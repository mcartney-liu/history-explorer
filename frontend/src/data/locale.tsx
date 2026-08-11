// ============================================================
// M62.5 — Locale Context
// Lightweight i18n. No dependencies. localStorage persistence via
// unified preference layer (lib/preferences). Supports zh/en/ja.
// Translation resources live in ../locales (modular, namespaced).
// ============================================================

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { lookup } from '../locales'
import { loadPreferences, savePreferences } from '../lib/preferences'

export type Locale = 'zh' | 'en' | 'ja'

interface LocaleContextValue {
  locale: Locale
  setLocale: (l: Locale) => void
  t: (key: string, vars?: Record<string, string>) => string
}

const LocaleContext = createContext<LocaleContextValue>({
  locale: 'zh',
  setLocale: () => {},
  t: (k) => k,
})

function loadLocale(): Locale {
  try {
    const lang = loadPreferences().language
    if (lang === 'zh' || lang === 'en' || lang === 'ja') return lang
  } catch { /* ignore */ }
  return 'zh'
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(loadLocale)

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l)
    try { savePreferences({ language: l }) } catch { /* ignore */ }
  }, [])

  const t = useCallback((key: string, vars?: Record<string, string>) => {
    let text = lookup(locale, key)
    if (vars) {
      for (const [k, v] of Object.entries(vars)) {
        text = text.replace(`%{${k}}`, v)
        text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), v)
      }
    }
    return text
  }, [locale])

  return (
    <LocaleContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LocaleContext.Provider>
  )
}

export function useLocale() {
  return useContext(LocaleContext)
}
