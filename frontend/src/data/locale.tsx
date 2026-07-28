// ============================================================
// M60 — Locale Context
// Lightweight i18n. No dependencies. localStorage persistence.
// Supports zh (default) and en. Add translations below.
// ============================================================

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'

export type Locale = 'zh' | 'en'

export const MESSAGES: Record<Locale, Record<string, string>> = {
  zh: {
    'nav.discover': '发现',
    'nav.explore': '探索',
    'nav.research': '研究',
    'nav.workspace': '工作台',
    'hero.tagline': '探索历史，发现文明。',
    'search.placeholder': '探索历史人物、事件与文明...',
    'search.button': '搜索',
    'discover.title': '探索历史',
    'discover.subtitle': '从这里开始你的历史旅程',
    'entity.ai_insight': '历史洞察',
    'entity.continue': '继续探索',
    'entity.explore': '探索引导',
    'entity.provenance': '数据来源',
    'entity.relations': '关联实体',
    'entity.relations_count': '条关系',
    'entity.timeline_count': '个时间节点',
    'entity.recommend': '推荐探索',
    'entity.explore_path': '探索路径',
    'entity.research': '深入研究',
    'entity.compare': '加入对比',
    'workspace.title': '探索工作台',
    'workspace.current': '当前探索',
    'workspace.history': '探索足迹',
    'workspace.pinned': '已置顶',
    'workspace.notes': '研究笔记',
    'workspace.compare': '对比队列',
    'workspace.ai': 'AI Historian',
    'workspace.ai_subtitle': '你的历史研究伙伴',
    'workspace.empty_history': '你探索过的实体会出现在这里',
    'workspace.empty_pinned': '长按实体卡片即可置顶到这里',
    'workspace.empty_notes': '在研究面板中记录你的历史发现',
    'workspace.empty_compare': '添加多个实体，横向对比他们的时间线和关系',
    'tab.info': '了解',
    'tab.research': '研究',
    'tab.extensions': '扩展',
    'insight.intro': '%{name} 是历史上重要的%{type}。',
  },
  en: {
    'nav.discover': 'Discover',
    'nav.explore': 'Explore',
    'nav.research': 'Research',
    'nav.workspace': 'Workspace',
    'hero.tagline': 'Explore History. Discover Civilization.',
    'search.placeholder': 'Search historical figures, events & civilizations...',
    'search.button': 'Search',
    'discover.title': 'Explore History',
    'discover.subtitle': 'Begin your historical journey here',
    'entity.ai_insight': 'Historical Insight',
    'entity.continue': 'Continue Exploring',
    'entity.explore': 'Exploration Guide',
    'entity.provenance': 'Provenance',
    'entity.relations': 'Related Entities',
    'entity.relations_count': 'relations',
    'entity.timeline_count': 'events',
    'entity.recommend': 'Recommended',
    'entity.explore_path': 'Exploration Path',
    'entity.research': 'Research',
    'entity.compare': 'Compare',
    'workspace.title': 'Workspace',
    'workspace.current': 'Current',
    'workspace.history': 'Exploration History',
    'workspace.pinned': 'Pinned',
    'workspace.notes': 'Research Notes',
    'workspace.compare': 'Compare Queue',
    'workspace.ai': 'AI Historian',
    'workspace.ai_subtitle': 'Your History Research Partner',
    'workspace.empty_history': 'Entities you explore will appear here',
    'workspace.empty_pinned': 'Long-press an entity card to pin it here',
    'workspace.empty_notes': 'Record your historical discoveries in the research panel',
    'workspace.empty_compare': 'Add entities to compare their timelines and relationships',
    'tab.info': 'Overview',
    'tab.research': 'Research',
    'tab.extensions': 'Extensions',
    'insight.intro': '%{name} is a historically significant %{type}.',
  },
}

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
    const saved = localStorage.getItem('he-locale')
    if (saved === 'zh' || saved === 'en') return saved
  } catch { /* ignore */ }
  return 'zh'
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(loadLocale)

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l)
    try { localStorage.setItem('he-locale', l) } catch { /* ignore */ }
  }, [])

  const t = useCallback((key: string, vars?: Record<string, string>) => {
    const msg = MESSAGES[locale]
    let text = msg[key] ?? key
    if (vars) {
      for (const [k, v] of Object.entries(vars)) {
        text = text.replace(`%{${k}}`, v)
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
