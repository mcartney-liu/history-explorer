import { useState, useCallback } from 'react'

export type Locale = 'zh' | 'en' | 'ja'

export type ContentDisplayMode = 'original' | 'localized' | 'dual'
export type ProperNameMode = 'original' | 'localized' | 'dual'
export type AIPreference = 'follow_ui' | 'original' | 'auto_detect'

export interface AppPreferences {
  language: Locale
  contentDisplayMode: ContentDisplayMode
  properNameMode: ProperNameMode
  aiPreference: AIPreference
  // 预留槽位（仅 schema，M62.5 不实现 UI）
  future?: {
    theme?: unknown
    accessibility?: unknown
    motion?: unknown
  }
}

const PREFS_KEY = 'he-prefs'
const LEGACY_KEY = 'he-locale'

const DEFAULT_PREFS: AppPreferences = {
  language: 'zh',
  contentDisplayMode: 'localized',
  properNameMode: 'localized',
  aiPreference: 'follow_ui',
}

function isLocale(v: unknown): v is Locale {
  return v === 'zh' || v === 'en' || v === 'ja'
}

// 幂等迁移：he-locale -> he-prefs.language -> 删旧 key
// 重复调用安全：已存在 he-prefs 时直接返回。
function migrate(): void {
  try {
    const raw = localStorage.getItem(PREFS_KEY)
    if (raw) return
    const legacy = localStorage.getItem(LEGACY_KEY)
    const merged: AppPreferences =
      legacy && isLocale(legacy)
        ? { ...DEFAULT_PREFS, language: legacy }
        : { ...DEFAULT_PREFS }
    localStorage.setItem(PREFS_KEY, JSON.stringify(merged))
    localStorage.removeItem(LEGACY_KEY)
  } catch {
    // localStorage 不可用时静默降级
  }
}

export function loadPreferences(): AppPreferences {
  migrate()
  try {
    const raw = localStorage.getItem(PREFS_KEY)
    if (!raw) return { ...DEFAULT_PREFS }
    const parsed = JSON.parse(raw) as Partial<AppPreferences>
    return {
      ...DEFAULT_PREFS,
      ...parsed,
      language: isLocale(parsed.language) ? parsed.language : DEFAULT_PREFS.language,
    }
  } catch {
    return { ...DEFAULT_PREFS }
  }
}

export function savePreferences(partial: Partial<AppPreferences>): AppPreferences {
  const current = loadPreferences()
  const next = { ...current, ...partial }
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(next))
  } catch {
    // ignore
  }
  return next
}

export function usePreferences(): [
  AppPreferences,
  (partial: Partial<AppPreferences>) => void,
] {
  const [prefs, setPrefs] = useState<AppPreferences>(() => loadPreferences())

  const update = useCallback((partial: Partial<AppPreferences>) => {
    setPrefs((prev) => {
      const next = { ...prev, ...partial }
      try {
        localStorage.setItem(PREFS_KEY, JSON.stringify(next))
      } catch {
        // ignore
      }
      return next
    })
  }, [])

  return [prefs, update]
}

// W4 — Proper Name Display Policy（Original / Localized / Dual）
// 实体专名展示策略；禁止实体专名进入 t()（专名非 UI 文案，不翻译）。
// - original:  显示原始名称
// - localized: 显示本地化名称，无则 fallback 原始名称
// - dual:      显示 "本地化名称 / 原始名称"
// localizedName 缺省时 localized/dual 优雅降级为原始名称（B 阶段实体迁移时补数据源）。
export function getDisplayName(
  name: string,
  _locale: Locale,
  mode: ProperNameMode = 'original',
  localizedName?: string,
): string {
  const localized = localizedName && localizedName.trim().length > 0 ? localizedName : name
  switch (mode) {
    case 'localized':
      return localized
    case 'dual':
      return `${localized} / ${name}`
    case 'original':
    default:
      return name
  }
}
