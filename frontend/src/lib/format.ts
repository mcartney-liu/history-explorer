import type { Locale } from './preferences'

const INTL_LOCALE: Record<Locale, string> = {
  zh: 'zh-CN',
  en: 'en-US',
  ja: 'ja-JP',
}

export function formatDate(value: string | number | Date, locale: Locale): string {
  try {
    const d = value instanceof Date ? value : new Date(value)
    if (isNaN(d.getTime())) return String(value)
    return new Intl.DateTimeFormat(INTL_LOCALE[locale], {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(d)
  } catch {
    return String(value)
  }
}

export function formatNumber(value: number, locale: Locale): string {
  try {
    return new Intl.NumberFormat(INTL_LOCALE[locale]).format(value)
  } catch {
    return String(value)
  }
}
