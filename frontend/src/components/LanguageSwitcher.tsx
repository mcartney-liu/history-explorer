import { useLocale } from '../data/locale'
import type { Locale } from '../lib/preferences'

const SUPPORTED_LOCALES: { code: Locale; label: string }[] = [
  { code: 'zh', label: '中文' },
  { code: 'en', label: 'English' },
  { code: 'ja', label: '日本語' },
]

export function LanguageSwitcher() {
  const { locale, setLocale } = useLocale()

  return (
    <div className="language-switcher" role="group" aria-label="Language">
      {SUPPORTED_LOCALES.map(({ code, label }) => (
        <button
          key={code}
          type="button"
          className={code === locale ? 'lang-btn lang-btn--active' : 'lang-btn'}
          aria-pressed={code === locale}
          onClick={() => setLocale(code)}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

export default LanguageSwitcher
