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
    <select
      className="app-locale-select"
      value={locale}
      onChange={(e) => setLocale(e.target.value as Locale)}
      aria-label="Language"
    >
      {SUPPORTED_LOCALES.map(({ code, label }) => (
        <option key={code} value={code}>
          {label}
        </option>
      ))}
    </select>
  )
}

export default LanguageSwitcher
