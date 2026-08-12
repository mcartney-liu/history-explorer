// ============================================================
// Content Console (ADR-0021) — #/admin
//
// Registry-driven surface: every editable card in the product is
// declared once in `backend/app/content/content_store.CONTENT_SLOTS`.
// This console fetches that registry (carried in the /content payload's
// `modules` + per-card metadata) and renders itself — a newly editable
// module needs ZERO code change here.
//
// Scope discipline (ADR-0021 D1): this console edits DISPLAY content
// only. Knowledge data — entities, relationships, evidence, sources —
// is never reachable from here. It belongs to the curated data
// pipeline, and mixing the two would let a copy edit silently rewrite
// the knowledge base.
//
// Access (ADR-0021 D2): writes are gated by the backend's
// ADMIN_ENABLED switch. This is an operator flag, NOT authentication
// — the freeze baseline forbids login / permission systems. When the
// gate is closed the console stays readable but every control is
// disabled, and the banner explains exactly how to open it.
//
// Visual contract: VS-01 tokens only, Lucide-style 2px stroke icons
// from the registry, zero emoji, no bounce easing (IP-03).
// ============================================================

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Icon } from '../../components/ui/Icon'
import { toCandidate, type Candidate } from '../../data/candidateUtils'
import type { SearchResultItem } from '../../components/SearchResults'
import {
  ACCEPTED_IMAGE_TYPES,
  DESC_LIMIT,
  DEFAULT_CARDS,
  ITEM_LIMIT,
  MAX_ITEMS,
  TITLE_LIMIT,
  cardImageSrc,
  cardTheme,
  defaultImageSrc,
  fetchAdminEnabled,
  fetchContent,
  fetchContentDefaults,
  resetContent,
  saveContent,
  uploadMedia,
  validateImageFile,
  type ContentCard,
  type ContentModule,
} from '../../data/contentApi'
// Imported here (not in main.tsx) so the stylesheet ships in the admin chunk
// and never lands in the landing-page bundle.
import '../../styles/admin.css'
// Lives in contentRuntime (the in-memory overlay), not contentApi.
import { applyContentDocument } from '../../data/contentRuntime'
// Site Configuration layer (ADR-0021 sibling) — feature flags / topic ordering
// / entity sections / exploration starters. Same discipline: registry-driven,
// fail-soft, no new dependency.
import {
  fetchSiteConfig,
  fetchSiteConfigDefaults,
  resetSiteConfig,
  saveSiteConfig,
  type SiteConfigDocument,
} from '../../data/siteConfigApi'
import { applySiteConfig } from '../../data/siteConfig'

// M90.x: 历史见解管理（固化内容，后台刷新）
import {
  getEntityInsight,
  regenerateEntityInsight,
  updateEntityInsight,
  type EntityInsight,
} from '../../data/aiClient'

/**
 * Presentation labels for the site-config switches. Mirrors the backend
 * registry (`site_config_store`) so the console reads human, not ids. The
 * *values* come from the fetched document; only the wording lives here.
 */
const FLAG_LABELS: Record<string, { label: string; desc: string }> = {
  related_entities: {
    label: '相关实体',
    desc: '实体页「研究」标签内的真实相关实体列表（图谱驱动，不碰 AI）。',
  },
  journey_trail: {
    label: '探索足迹',
    desc: '基于既有行为事件的探索路径可视化（无新采集、无画像）。',
  },
}

const SECTION_LABELS: Record<string, { label: string; desc: string }> = {
  why_important: { label: '了解核心', desc: '实体身份 + 叙事导览。' },
  relationship_insight: { label: '关系洞察', desc: '证据绑定的 AI 探索触点（增强层）。' },
  journey_trail: { label: '探索足迹', desc: '受「探索足迹」开关联动。' },
  related_entities: { label: '相关实体', desc: '受「相关实体」开关联动。' },
  research_library: { label: '研究库', desc: '已保存研究的回顾列表。' },
}

type StatusKind = 'success' | 'error' | 'info'
interface StatusMessage {
  kind: StatusKind
  text: string
}

/** Offline fallback so the page is never empty when the backend is down. */
const FALLBACK_MODULE: ContentModule = {
  module: 'landing',
  label: '首页能力卡',
  card_ids: DEFAULT_CARDS.map((c) => c.id),
}

function defaultFallbackCards(): ContentCard[] {
  return DEFAULT_CARDS.map((c) => ({
    ...c,
    module: 'landing',
    module_label: '首页能力卡',
    label: c.title,
    where: '',
    theme: cardTheme(c.id),
    supports_image: true,
    supports_items: false,
    items_label: '要点',
    items: [],
  }))
}

const clone = (cards: readonly ContentCard[]): ContentCard[] => cards.map((c) => ({ ...c }))

/** True when any editable field differs from the factory default. */
function cardIsEdited(card: ContentCard, def: ContentCard): boolean {
  return (
    card.title !== def.title ||
    card.desc !== def.desc ||
    card.image !== def.image ||
    JSON.stringify(card.items) !== JSON.stringify(def.items) ||
    JSON.stringify(card.title_i18n ?? null) !== JSON.stringify(def.title_i18n ?? null) ||
    JSON.stringify(card.summary_i18n ?? null) !== JSON.stringify(def.summary_i18n ?? null)
  )
}

export function AdminPage() {
  const [cards, setCards] = useState<ContentCard[]>(() => defaultFallbackCards())
  const [baseline, setBaseline] = useState<ContentCard[]>(() => defaultFallbackCards())
  const [modules, setModules] = useState<ContentModule[]>([FALLBACK_MODULE])
  const [defaults, setDefaults] = useState<ContentCard[]>([])
  const [adminEnabled, setAdminEnabled] = useState<boolean | null>(null)
  const [backendReachable, setBackendReachable] = useState<boolean | null>(null)
  const [status, setStatus] = useState<StatusMessage | null>(null)
  const [busy, setBusy] = useState(false)
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  // 横向维度 tab：按编辑维度分组，而非按栏目堆叠
  const [activeTab, setActiveTab] = useState<AdminTab>('image')

  // ---- site configuration (ADR-0021 sibling) -----------------------------
  const [siteConfig, setSiteConfig] = useState<SiteConfigDocument | null>(null)
  const [siteConfigBaseline, setSiteConfigBaseline] = useState<SiteConfigDocument | null>(null)
  const [siteConfigDefaults, setSiteConfigDefaults] = useState<SiteConfigDocument | null>(null)

  // ---- M90.x: 历史见解管理（固化内容，后台刷新） ----
  const [insightGid, setInsightGid] = useState('')
  const [insightRec, setInsightRec] = useState<EntityInsight | null>(null)
  const [insightText, setInsightText] = useState('')
  const [insightLoading, setInsightLoading] = useState(false)
  const [insightStatus, setInsightStatus] = useState<StatusMessage | null>(null)
  // 按名称查找实体（不知道 global_id 时，输入名称即可点选）
  const [insightQuery, setInsightQuery] = useState('')
  const [insightMatches, setInsightMatches] = useState<Candidate[]>([])
  const [insightSearching, setInsightSearching] = useState(false)

  async function loadInsight(gidOverride?: string) {
    const gid = (gidOverride ?? insightGid).trim()
    if (!gid) {
      setInsightStatus({ kind: 'error', text: '请输入实体 global_id，或先按名称查找。' })
      return
    }
    setInsightLoading(true)
    try {
      const rec = await getEntityInsight(gid)
      setInsightRec(rec)
      setInsightText(rec?.insight ?? '')
      setInsightStatus(
        rec
          ? {
              kind: 'success',
              text: `已加载固化历史见解（${rec.engine} · ${rec.updated_at.slice(0, 19).replace('T', ' ')}）`,
            }
          : { kind: 'info', text: '该实体暂无历史见解，可点击「AI 基于证据生成」。' },
      )
    } catch (e) {
      setInsightStatus({ kind: 'error', text: String(e) })
    }
    setInsightLoading(false)
  }

  // 按名称搜实体 → 点选自动填入 global_id 并读取。复用现有 /search 接口
  // + deriveGlobalId（与主界面跨主题选择器同源），零后端改动。
  async function searchInsightEntity() {
    const q = insightQuery.trim()
    if (!q) {
      setInsightStatus({ kind: 'error', text: '请输入实体名称，如：西罗马帝国。' })
      return
    }
    setInsightSearching(true)
    try {
      const apiBase: string = import.meta.env.VITE_API_BASE || 'http://localhost:8000'
      const res = await fetch(`${apiBase}/api/v1/search?q=${encodeURIComponent(q)}`)
      if (!res.ok) throw new Error(`搜索失败（HTTP ${res.status}）`)
      const data = (await res.json()) as { results?: SearchResultItem[] }
      const cands = (data.results ?? []).map(toCandidate).filter((c): c is Candidate => c !== null)
      setInsightMatches(cands)
      setInsightStatus(
        cands.length > 0
          ? { kind: 'success', text: `找到 ${cands.length} 个匹配实体，点选即可填入并读取。` }
          : { kind: 'info', text: '未找到匹配实体，换个名称或检查后端是否在运行。' },
      )
    } catch (e) {
      setInsightStatus({ kind: 'error', text: String(e) })
    }
    setInsightSearching(false)
  }

  function pickInsightMatch(cand: Candidate) {
    setInsightGid(cand.gid)
    setInsightMatches([])
    setInsightQuery('')
    void loadInsight(cand.gid)
  }

  async function generateInsight() {
    const gid = insightGid.trim()
    if (!gid) {
      setInsightStatus({ kind: 'error', text: '请输入实体 global_id。' })
      return
    }
    setInsightLoading(true)
    try {
      const rec = await regenerateEntityInsight(gid)
      setInsightRec(rec)
      setInsightText(rec.insight)
      setInsightStatus({ kind: 'success', text: '已基于证据重新生成并固化。' })
    } catch (e) {
      setInsightStatus({ kind: 'error', text: String(e) })
    }
    setInsightLoading(false)
  }

  async function saveInsight() {
    const gid = insightGid.trim()
    if (!gid) {
      setInsightStatus({ kind: 'error', text: '请输入实体 global_id。' })
      return
    }
    try {
      const rec = await updateEntityInsight(gid, insightText)
      setInsightRec(rec)
      setInsightStatus({ kind: 'success', text: '已保存（人工编辑）。' })
    } catch (e) {
      setInsightStatus({ kind: 'error', text: String(e) })
    }
  }

  // ---- initial load ------------------------------------------------------
  useEffect(() => {
    let active = true
    Promise.all([
      fetchContent(),
      fetchContentDefaults(),
      fetchAdminEnabled(),
      fetchSiteConfig(),
      fetchSiteConfigDefaults(),
    ]).then(([document, defaultsDoc, enabled, cfgDoc, cfgDefaultsDoc]) => {
      if (!active) return
      setBackendReachable(document !== null || cfgDoc !== null)
      setAdminEnabled(enabled)
      if (document) {
        setCards(clone(document.cards))
        setBaseline(clone(document.cards))
        if (Array.isArray(document.modules) && document.modules.length > 0) {
          setModules(document.modules)
        }
      }
      if (defaultsDoc) setDefaults(clone(defaultsDoc.cards))
      if (cfgDoc) {
        setSiteConfig(cfgDoc)
        setSiteConfigBaseline(cfgDoc)
      }
      if (cfgDefaultsDoc) setSiteConfigDefaults(cfgDefaultsDoc)
    })
    return () => {
      active = false
    }
  }, [])

  const byId = useMemo(() => {
    const map = new Map<string, ContentCard>()
    for (const card of cards) map.set(card.id, card)
    return map
  }, [cards])

  const dirty = useMemo(
    () => JSON.stringify(cards) !== JSON.stringify(baseline),
    [cards, baseline],
  )

  const siteConfigDirty = useMemo(
    () => !!siteConfig && !!siteConfigBaseline && JSON.stringify(siteConfig) !== JSON.stringify(siteConfigBaseline),
    [siteConfig, siteConfigBaseline],
  )

  const anyDirty = dirty || siteConfigDirty

  // Guard against losing edits to a stray refresh or back-navigation.
  useEffect(() => {
    if (!anyDirty) return
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [anyDirty])

  const patchCard = useCallback(
    (id: string, patch: Partial<ContentCard>) => {
      setCards((prev) => prev.map((card) => (card.id === id ? { ...card, ...patch } : card)))
      setStatus(null)
    },
    [],
  )

  const handleSave = useCallback(async () => {
    setBusy(true)
    setStatus(null)
    const contentResult = await saveContent(cards)
    if (!contentResult.ok) {
      setBusy(false)
      setStatus({ kind: 'error', text: contentResult.error ?? '内容保存失败' })
      return
    }
    // Persist site config only if it was actually loaded + edited.
    if (siteConfig && siteConfigDirty) {
      const configResult = await saveSiteConfig({
        feature_flags: siteConfig.feature_flags,
        topic_ordering: siteConfig.topic_ordering,
        entity_sections: siteConfig.entity_sections,
        exploration_starters: siteConfig.exploration_starters,
      })
      if (!configResult.ok) {
        setBusy(false)
        setStatus({ kind: 'error', text: configResult.error ?? '站点配置保存失败' })
        return
      }
      if (configResult.data) {
        setSiteConfig(configResult.data)
        setSiteConfigBaseline(configResult.data)
        applySiteConfig(configResult.data)
      }
    }
    setBusy(false)
    if (contentResult.data) {
      setCards(clone(contentResult.data.cards))
      setBaseline(clone(contentResult.data.cards))
      applyContentDocument(contentResult.data)
    }
    setStatus({ kind: 'success', text: '已保存，刷新前台即可看到更新' })
  }, [cards, siteConfig, siteConfigDirty])

  const handleReset = useCallback(async () => {
    const confirmed = window.confirm(
      '确定要恢复出厂内容吗？所有自定义文案与配图都会清除，此操作不可撤销。',
    )
    if (!confirmed) return
    setBusy(true)
    setStatus(null)
    const contentResult = await resetContent()
    if (!contentResult.ok) {
      setBusy(false)
      setStatus({ kind: 'error', text: contentResult.error ?? '内容重置失败' })
      return
    }
    const configResult = await resetSiteConfig()
    if (configResult.ok && configResult.data) {
      setSiteConfig(configResult.data)
      setSiteConfigBaseline(configResult.data)
      applySiteConfig(configResult.data)
    }
    setBusy(false)
    if (contentResult.data) {
      setCards(clone(contentResult.data.cards))
      setBaseline(clone(contentResult.data.cards))
      applyContentDocument(contentResult.data)
    }
    setStatus({ kind: 'success', text: '已恢复为出厂内容' })
  }, [])

  const handleDiscard = useCallback(() => {
    setCards(clone(baseline))
    setStatus({ kind: 'info', text: '已放弃未保存的修改' })
  }, [baseline])

  const toggleModule = useCallback((moduleId: string) => {
    // 默认语义：未记录(id 缺失) = 折叠；仅显式 false 才展开
    setCollapsed((prev) => ({ ...prev, [moduleId]: prev[moduleId] === false ? true : false }))
  }, [])

  // ---- site-config patch helpers ----------------------------------------
  const patchFlag = useCallback(
    (id: string, enabled: boolean) => {
      setSiteConfig((prev) =>
        prev ? { ...prev, feature_flags: { ...prev.feature_flags, [id]: enabled } } : prev,
      )
      setStatus(null)
    },
    [],
  )

  const patchSection = useCallback(
    (id: string, visible: boolean) => {
      setSiteConfig((prev) =>
        prev
          ? {
              ...prev,
              entity_sections: prev.entity_sections.map((s) =>
                s.id === id ? { ...s, visible } : s,
              ),
            }
          : prev,
      )
      setStatus(null)
    },
    [],
  )

  const moveTopic = useCallback(
    (index: number, dir: -1 | 1) => {
      setSiteConfig((prev) => {
        if (!prev) return prev
        const next = [...prev.topic_ordering]
        const target = index + dir
        if (target < 0 || target >= next.length) return prev
        ;[next[index], next[target]] = [next[target], next[index]]
        return { ...prev, topic_ordering: next }
      })
      setStatus(null)
    },
    [],
  )

  const setStarter = useCallback(
    (index: number, value: string) => {
      setSiteConfig((prev) => {
        if (!prev) return prev
        const next = [...prev.exploration_starters]
        next[index] = value.slice(0, 60)
        return { ...prev, exploration_starters: next }
      })
      setStatus(null)
    },
    [],
  )

  const addStarter = useCallback(() => {
    setSiteConfig((prev) => {
      if (!prev || prev.exploration_starters.length >= 8) return prev
      return { ...prev, exploration_starters: [...prev.exploration_starters, ''] }
    })
    setStatus(null)
  }, [])

  const removeStarter = useCallback((index: number) => {
    setSiteConfig((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        exploration_starters: prev.exploration_starters.filter((_, i) => i !== index),
      }
    })
    setStatus(null)
  }, [])

  const locked = adminEnabled !== true

  return (
    <div className="admin-root">
      <header className="admin-header">
        <div className="admin-header-inner">
          <div className="admin-brand">
            <Icon name="scroll" size={20} />
            <div>
              <h1 className="admin-title">内容配置</h1>
              <p className="admin-subtitle">按模块配置前端的展示文案与配图</p>
            </div>
          </div>
          <a className="admin-exit" href="#/">
            <Icon name="close" size={16} />
            返回站点
          </a>
        </div>
      </header>

      <main className="admin-main">
        <GateBanner adminEnabled={adminEnabled} backendReachable={backendReachable} />

        {/* 横向维度 tab：按编辑维度分组，而非按栏目堆叠 */}
        <div
          role="tablist"
          aria-label="编辑维度"
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 8,
            margin: '0 0 18px',
            paddingBottom: 12,
            borderBottom: '1px solid var(--color-paper-300, #e3dccb)',
          }}
        >
          {ADMIN_TABS.map((t) => {
            const selected = activeTab === t.id
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setActiveTab(t.id)}
                style={{
                  appearance: 'none',
                  cursor: 'pointer',
                  font: 'inherit',
                  fontSize: '0.9rem',
                  fontWeight: selected ? 600 : 500,
                  padding: '8px 16px',
                  borderRadius: 999,
                  border: selected
                    ? '1px solid var(--color-accent, #c8a83a)'
                    : '1px solid var(--color-paper-300, #e3dccb)',
                  background: selected ? 'var(--color-accent-soft, #f3ecd8)' : 'transparent',
                  color: selected ? 'var(--color-ink-900, #1c1810)' : 'var(--color-ink-600, #5b513c)',
                }}
              >
                {t.label}
              </button>
            )
          })}
        </div>

        {activeTab !== 'sitecfg' && (
          <>
            {modules.map((module) => {
          const isCollapsed = collapsed[module.module] !== false
          const moduleCards = module.card_ids
            .map((id) => byId.get(id))
            .filter((card): card is ContentCard => Boolean(card))
            .filter((card) => tabHasField(card, activeTab))
          if (moduleCards.length === 0) return null
          const editedCount = moduleCards.filter((card) => {
            const def = defaults.find((d) => d.id === card.id)
            return def ? cardIsEdited(card, def) : card.image !== null
          }).length

          return (
            <section className="admin-module" key={module.module}>
              <button
                type="button"
                className="admin-module-head"
                aria-expanded={!isCollapsed}
                onClick={() => toggleModule(module.module)}
              >
                <Icon
                  name="chevron-down"
                  size={20}
                  className={isCollapsed ? 'is-collapsed' : undefined}
                />
                <span className="admin-module-label">{module.label}</span>
                <span className="admin-module-count">
                  {moduleCards.length} 张
                  {editedCount > 0 ? ` · ${editedCount} 处已改` : ''}
                </span>
              </button>

              {!isCollapsed ? (
                <div className="admin-grid">
                  {moduleCards.map((card) => (
                    <CardEditor
                      key={card.id}
                      card={card}
                      activeTab={activeTab}
                      defaults={defaults.find((d) => d.id === card.id) ?? null}
                      locked={locked}
                      onPatch={patchCard}
                      onError={(text) => setStatus({ kind: 'error', text })}
                    />
                  ))}
                </div>
              ) : null}
            </section>
          )
        })}

        {/* M90.x: 历史见解管理（固化内容，后台刷新） */}
        <section className="admin-module">
          <button
            type="button"
            className="admin-module-head"
            aria-expanded={collapsed.entity_insights === false}
            onClick={() => toggleModule('entity_insights')}
          >
            <Icon
              name="chevron-down"
              size={20}
              className={collapsed.entity_insights !== false ? 'is-collapsed' : undefined}
            />
            <span className="admin-module-label">历史见解管理</span>
            <span className="admin-module-count">AI 基于证据生成 · 前端只读</span>
          </button>

          {collapsed.entity_insights === false && (
              <div className="admin-insight">
                <p className="admin-hint">
                  历史见解由 AI 基于该实体的知识库证据生成一次并固化；前端只读此内容，刷新由本后台管理。
                </p>
                <div className="admin-insight-lookup">
                  <input
                    className="admin-input"
                    type="text"
                    value={insightQuery}
                    onChange={(e) => setInsightQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') searchInsightEntity()
                    }}
                    placeholder="不知道 ID？按名称查找，如：西罗马帝国"
                  />
                  <button
                    type="button"
                    className="admin-btn"
                    onClick={searchInsightEntity}
                    disabled={insightSearching}
                  >
                    {insightSearching ? '查找中…' : '按名称查找'}
                  </button>
                </div>
                {insightMatches.length > 0 && (
                  <ul className="admin-insight-matches">
                    {insightMatches.map((c) => (
                      <li key={c.gid}>
                        <button type="button" onClick={() => pickInsightMatch(c)}>
                          <span className="match-name">{c.name}</span>
                          <span className="match-gid">{c.gid}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="admin-insight-controls">
                  <input
                    className="admin-input"
                    type="text"
                    value={insightGid}
                    onChange={(e) => setInsightGid(e.target.value)}
                    placeholder="实体 global_id，如 roman_empire:event-empire-fall"
                  />
                  <button type="button" className="admin-btn" onClick={() => loadInsight()} disabled={insightLoading}>
                    读取
                  </button>
                  <button
                    type="button"
                    className="admin-btn admin-btn-primary"
                    onClick={generateInsight}
                    disabled={insightLoading || locked}
                  >
                    AI 基于证据生成
                  </button>
                </div>

              {insightStatus && (
                <p className={`admin-status admin-status-${insightStatus.kind}`}>{insightStatus.text}</p>
              )}

              {insightRec && (
                <div className="admin-insight-editor">
                  <textarea
                    className="admin-textarea"
                    rows={6}
                    value={insightText}
                    onChange={(e) => setInsightText(e.target.value)}
                    disabled={locked}
                  />
                  <div className="admin-insight-actions">
                    <button type="button" className="admin-btn" onClick={saveInsight} disabled={locked}>
                      保存编辑
                    </button>
                    <span className="admin-insight-meta">
                      证据 {insightRec.evidence.length} 条 · 引擎 {insightRec.engine}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
          </>
        )}

        {activeTab === 'sitecfg' && siteConfig ? (
          <SiteConfigEditor
            config={siteConfig}
            defaults={siteConfigDefaults}
            locked={locked}
            onPatchFlag={patchFlag}
            onPatchSection={patchSection}
            onMoveTopic={moveTopic}
            onSetStarter={setStarter}
            onAddStarter={addStarter}
            onRemoveStarter={removeStarter}
          />
        ) : null}
      </main>

      <footer className="admin-actionbar">
        <div className="admin-actionbar-inner">
          <div className="admin-status" role="status" aria-live="polite">
            {status ? (
              <span className={`admin-status-msg admin-status-${status.kind}`}>
                <Icon name={status.kind === 'error' ? 'warning' : 'check'} size={16} />
                {status.text}
              </span>
            ) : anyDirty ? (
              <span className="admin-status-msg admin-status-info">
                <Icon name="circle" size={16} />
                有未保存的修改
              </span>
            ) : null}
          </div>

          <div className="admin-actions">
            <button
              type="button"
              className="admin-btn admin-btn-ghost"
              onClick={handleReset}
              disabled={locked || busy}
              title={locked ? '写入已关闭' : '清除所有自定义内容'}
            >
              恢复出厂内容
            </button>
            <button
              type="button"
              className="admin-btn admin-btn-ghost"
              onClick={handleDiscard}
              disabled={!anyDirty || busy}
            >
              放弃修改
            </button>
            <button
              type="button"
              className="admin-btn admin-btn-primary"
              onClick={handleSave}
              disabled={locked || !anyDirty || busy}
            >
              {busy ? '保存中…' : '保存'}
            </button>
          </div>
        </div>
      </footer>
    </div>
  )
}

// --------------------------------------------------------------------------
// Gate banner — explains *why* the console is read-only and how to fix it.
// A disabled UI with no explanation is a dead end; this is the difference
// between "broken" and "not switched on yet".
// --------------------------------------------------------------------------
function GateBanner({
  adminEnabled,
  backendReachable,
}: {
  adminEnabled: boolean | null
  backendReachable: boolean | null
}) {
  if (adminEnabled === null) return null

  if (backendReachable === false) {
    return (
      <div className="admin-banner admin-banner-warn">
        <Icon name="warning" size={20} />
        <div>
          <strong>未连接到后端服务</strong>
          <p>
            当前显示的是编译期内置内容。请先启动后端（默认 <code>http://localhost:8000</code>），
            或通过 <code>VITE_API_BASE</code> 指定地址。
          </p>
        </div>
      </div>
    )
  }

  if (adminEnabled) {
    return (
      <div className="admin-banner admin-banner-ok">
        <Icon name="check" size={20} />
        <div>
          <strong>可编辑</strong>
          <p>修改后点击右下角「保存」，前台刷新即刻生效。图片存储在后端运行时目录，与代码分支无关。</p>
        </div>
      </div>
    )
  }

  return (
    <div className="admin-banner admin-banner-locked">
      <Icon name="lock" size={20} />
      <div>
        <strong>编辑已关闭（只读）</strong>
        <p>
          后端未开启写入开关。启动后端时设置环境变量 <code>ADMIN_ENABLED=true</code> 即可编辑。
          该开关默认关闭，且仅适用于本地 / 单机环境 —— 它不是身份认证。
        </p>
      </div>
    </div>
  )
}

// --------------------------------------------------------------------------
// Single card editor: artwork dropzone + copy fields + (optional) item list.
// The card's registry metadata decides which controls appear.
// --------------------------------------------------------------------------

/** Clamp a percentage to the valid 0–100 range. */
function clampPct(n: number): number {
  return Math.max(0, Math.min(100, n))
}

/**
 * Parse a stored focal point ("x% y%") into clamped integer coordinates.
 * Anything malformed falls back to center (50% / 50%).
 */
function focusPoint(raw: string | null | undefined): { x: number; y: number } {
  if (typeof raw === 'string') {
    const m = raw.match(/(\d+(?:\.\d+)?)\s*%\s*(\d+(?:\.\d+)?)\s*%/)
    if (m) return { x: clampPct(Number(m[1])), y: clampPct(Number(m[2])) }
  }
  return { x: 50, y: 50 }
}

/** 后台编辑维度 tab。改图片就只看图片，改文字就只看文字。 */
export type AdminTab = 'image' | 'text' | 'i18n' | 'sitecfg'

const ADMIN_TABS: { id: AdminTab; label: string }[] = [
  { id: 'image', label: '图片与焦点' },
  { id: 'text', label: '文字内容' },
  { id: 'i18n', label: '三语与引导' },
  { id: 'sitecfg', label: '站点配置' },
]

/** 某张卡片在当前维度 tab 下是否有可编辑字段（用于隐藏空卡片）。 */
function tabHasField(card: ContentCard, tab: AdminTab): boolean {
  switch (tab) {
    case 'image':
      return true // 所有卡片均可配图（文字/按钮类卡片前端暂无图位，图存入作数据预埋）
    case 'text':
      return true // 标题/描述对所有卡片可用
    case 'i18n':
      return Boolean(card.supports_text_i18n || card.supports_guided_questions)
    case 'sitecfg':
      return false // 站点配置单独渲染，不进卡片网格
  }
}

function CardEditor({
  card,
  activeTab,
  defaults,
  locked,
  onPatch,
  onError,
}: {
  card: ContentCard
  activeTab: AdminTab
  defaults: ContentCard | null
  locked: boolean
  onPatch: (id: string, patch: Partial<ContentCard>) => void
  onError: (text: string) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)

  const theme = cardTheme(card.id)
  const edited = defaults ? cardIsEdited(card, defaults) : card.image !== null
  const focus = focusPoint(card.image_focus)
  const itemsLabel = card.items_label || '要点'

  const restore = useCallback(() => {
    if (!defaults) return
    onPatch(card.id, {
      title: defaults.title,
      desc: defaults.desc,
      image: defaults.image,
      image_focus: defaults.image_focus ?? null,
      items: [...defaults.items],
      title_i18n: defaults.title_i18n ?? null,
      summary_i18n: defaults.summary_i18n ?? null,
    })
  }, [card.id, defaults, onPatch])

  const setItems = useCallback(
    (next: string[]) => onPatch(card.id, { items: next }),
    [card.id, onPatch],
  )

  const setGuidedQuestions = useCallback(
    (next: string[]) => onPatch(card.id, { guided_questions: next }),
    [card.id, onPatch],
  )

  const ingest = useCallback(
    async (file: File) => {
      const problem = validateImageFile(file)
      if (problem) {
        onError(problem)
        return
      }
      setUploading(true)
      const result = await uploadMedia(file)
      setUploading(false)
      if (result.ok && result.data) {
        onPatch(card.id, { image: result.data.filename })
      } else {
        onError(result.error ?? '上传失败')
      }
    },
    [card.id, onPatch, onError],
  )

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault()
      setDragging(false)
      if (locked) return
      const file = event.dataTransfer.files?.[0]
      if (file) void ingest(file)
    },
    [ingest, locked],
  )

  return (
    <section className={`admin-card admin-card-${theme}`}>
      <div className="admin-card-head">
        <span className="admin-card-id">{card.id}</span>
        {edited ? <span className="admin-card-badge">已自定义</span> : null}
      </div>

      <div className="admin-card-label">{card.label}</div>
      {card.where ? <p className="admin-card-where">{card.where}</p> : null}

      {/* 前端预览：始终可见，实时反映这张卡在前台的渲染（图按 objectPosition 裁切 + 文字 + 引导问题），
          让后台编辑能直接对应"我改的是前端哪块"。 */}
      <div
        className="admin-preview"
        style={{
          marginTop: 8,
          marginBottom: 14,
          border: '1px solid var(--color-line-200, #e5e0d8)',
          borderRadius: 10,
          padding: 12,
          background: 'var(--color-surface-50, #faf8f4)',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 8,
            fontSize: '0.78rem',
            color: 'var(--color-ink-500)',
          }}
        >
          <span style={{ fontWeight: 600 }}>前端预览</span>
          <span style={{ fontFamily: 'monospace' }}>{card.id}</span>
        </div>
        <div
          style={{
            width: '100%',
            maxWidth: 320,
            aspectRatio: '16 / 10',
            overflow: 'hidden',
            borderRadius: 8,
            background: '#ddd',
          }}
        >
          <img
            key={`prev-${card.image ?? 'builtin'}`}
            src={cardImageSrc(card)}
            alt=""
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: card.image_focus || '50% 50%',
              display: 'block',
            }}
            onError={(e) => {
              const el = e.currentTarget as HTMLImageElement
              if (!card.image) {
                const order = ['png', 'jpg', 'jpeg']
                const step = parseInt(el.dataset.fb ?? '0', 10)
                if (step < order.length) {
                  el.dataset.fb = String(step + 1)
                  el.src = el.src.replace(/\.[a-z]+$/i, `.${order[step]}`)
                } else {
                  el.style.visibility = 'hidden'
                }
              } else {
                el.style.visibility = 'hidden'
              }
            }}
          />
        </div>
        <div style={{ marginTop: 8 }}>
          <div style={{ fontWeight: 600, fontSize: '0.92rem' }}>
            {card.title || card.label}
            {card.title_i18n && (card.title_i18n as Record<string, string>).en ? (
              <span
                style={{
                  fontWeight: 400,
                  color: 'var(--color-ink-500)',
                  marginLeft: 6,
                  fontSize: '0.8rem',
                }}
              >
                EN: {(card.title_i18n as Record<string, string>).en}
              </span>
            ) : null}
          </div>
          {card.desc ? (
            <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: 'var(--color-ink-600)' }}>
              {card.desc.length > 80 ? `${card.desc.slice(0, 80)}…` : card.desc}
            </p>
          ) : null}
          {Array.isArray(card.guided_questions) && (card.guided_questions as string[]).length > 0 ? (
            <ul style={{ margin: '6px 0 0', paddingLeft: 18, fontSize: '0.8rem', color: 'var(--color-ink-600)' }}>
              {(card.guided_questions as string[])
                .slice(0, 4)
                .map((q: string, i: number) => (
                  <li key={i}>{q}</li>
                ))}
            </ul>
          ) : null}
        </div>
      </div>

      {activeTab === 'image' ? (
        <>
          <div
            className={`admin-drop${dragging ? ' is-dragging' : ''}${locked ? ' is-locked' : ''}`}
            onDragOver={(e) => {
              e.preventDefault()
              if (!locked) setDragging(true)
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => !locked && inputRef.current?.click()}
            role="button"
            tabIndex={locked ? -1 : 0}
            aria-label={`更换 ${card.label} 的配图`}
            onKeyDown={(e) => {
              if (locked) return
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                inputRef.current?.click()
              }
            }}
          >
            <img
              key={card.image ?? 'builtin'}
              className="admin-drop-img"
              src={cardImageSrc(card)}
              alt=""
              onError={(e) => {
                const el = e.currentTarget
                // A console upload that fails to load: just hide the preview.
                if (card.image) {
                  el.style.visibility = 'hidden'
                  return
                }
                // Built-in artwork: mirror the front-end fallback chain
                // webp → png → jpg → jpeg so the operator sees the same cover
                // the card renders (explore packs/topics ship as png/jpg).
                const order = ['png', 'jpg', 'jpeg']
                const step = parseInt(el.dataset.fallback ?? '0', 10)
                if (step < order.length) {
                  el.dataset.fallback = String(step + 1)
                  el.src = el.src.replace(/\.[a-z]+$/i, `.${order[step]}`)
                } else {
                  el.style.visibility = 'hidden'
                }
              }}
              // Clear any lingering hidden state so a newly-selected image
              // (or a built-in that finally resolves) is always shown. Without
              // this, the inline `visibility:hidden` set on error sticks across
              // `src` changes and the preview stays invisible forever.
              onLoad={(e) => {
                e.currentTarget.style.visibility = 'visible'
              }}
            />
            <div className="admin-drop-overlay">
              {uploading ? (
                <span className="admin-drop-hint">上传中…</span>
              ) : locked ? (
                <span className="admin-drop-hint">
                  <Icon name="lock" size={16} />
                  只读
                </span>
              ) : (
                <span className="admin-drop-hint">
                  <Icon name="scroll" size={16} />
                  {dragging ? '松开即可替换' : '点击或拖入图片'}
                </span>
              )}
            </div>
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPTED_IMAGE_TYPES}
              className="admin-file-input"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) void ingest(file)
                e.target.value = '' // allow re-picking the same file
              }}
            />
          </div>

          {card.image ? (
            <button
              type="button"
              className="admin-linkbtn"
              disabled={locked}
              onClick={() => onPatch(card.id, { image: null })}
            >
              改回内置配图
            </button>
          ) : (
            <p className="admin-hint">
              当前使用内置配图{' '}
              <code>{defaultImageSrc(card.id).replace(/^.*\/assets/, 'assets')}</code>
            </p>
          )}
          {card.image ? (
            <div
              className="admin-focus"
              style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 10 }}
            >
              <div
                className="admin-focus-head"
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', fontWeight: 600 }}
              >
                <span>图片焦点位置</span>
                <span className="admin-focus-coord" style={{ color: 'var(--color-ink-500)', fontWeight: 400 }}>
                  {focus.x}% · {focus.y}%
                </span>
              </div>
              <p className="admin-hint">
                点击预览图，选择前台裁切时保留的重点区域；不设置则居中显示。
              </p>
              <div
                role="button"
                tabIndex={locked ? -1 : 0}
                aria-label="设置图片焦点位置"
                onClick={(e) => {
                  if (locked) return
                  const rect = e.currentTarget.getBoundingClientRect()
                  const x = clampPct(Math.round(((e.clientX - rect.left) / rect.width) * 100))
                  const y = clampPct(Math.round(((e.clientY - rect.top) / rect.height) * 100))
                  onPatch(card.id, { image_focus: `${x}% ${y}%` })
                }}
                onKeyDown={(e) => {
                  if (locked) return
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    onPatch(card.id, { image_focus: '50% 50%' })
                  }
                }}
                style={{
                  position: 'relative',
                  width: '100%',
                  maxWidth: 260,
                  aspectRatio: '16 / 10',
                  overflow: 'hidden',
                  borderRadius: 8,
                  cursor: locked ? 'default' : 'crosshair',
                  border: '1px solid var(--color-paper-300, #e3dccb)',
                  marginTop: 8,
                }}
              >
                <img
                  src={cardImageSrc(card)}
                  alt=""
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
                <span
                  style={{
                    position: 'absolute',
                    left: `${focus.x}%`,
                    top: `${focus.y}%`,
                    width: 14,
                    height: 14,
                    marginLeft: -7,
                    marginTop: -7,
                    borderRadius: '50%',
                    border: '2px solid #fff',
                    boxShadow: '0 0 0 1px rgba(0,0,0,0.4)',
                    background: 'rgba(165,160,245,0.7)',
                    pointerEvents: 'none',
                  }}
                />
              </div>
              <button
                type="button"
                className="admin-linkbtn"
                disabled={locked}
                onClick={() => onPatch(card.id, { image_focus: null })}
                style={{ marginTop: 6 }}
              >
                重置为居中
              </button>
            </div>
          ) : null}
          {!card.supports_image ? (
            <p className="admin-hint" style={{ marginTop: 8, color: 'var(--color-ink-500)' }}>
              提示：该栏位前端暂未设图位，图片会保存但当前不显示（数据预埋，后续组件支持即生效）。
            </p>
          ) : null}
        </>
      ) : null}

      {activeTab === 'text' && (
       <>
        <label className="admin-field">
        <span className="admin-field-label">
          标题
          <span className="admin-counter">{card.title.length}/{TITLE_LIMIT}</span>
        </span>
        <input
          className="admin-input"
          type="text"
          value={card.title}
          maxLength={TITLE_LIMIT}
          disabled={locked}
          onChange={(e) => onPatch(card.id, { title: e.target.value })}
        />
      </label>

      <label className="admin-field">
        <span className="admin-field-label">
          描述
          <span className="admin-counter">{card.desc.length}/{DESC_LIMIT}</span>
        </span>
        <textarea
          className="admin-textarea"
          value={card.desc}
          rows={5}
          maxLength={DESC_LIMIT}
          disabled={locked}
          onChange={(e) => onPatch(card.id, { desc: e.target.value })}
        />
      </label>
       </>
      )}

      {activeTab === 'i18n' && card.supports_text_i18n ? (
        <div className="admin-i18n">
          <p className="admin-field-label">三语标题（留空 = 沿用数据源）</p>
          {(['zh', 'en', 'ja'] as const).map((loc) => (
            <label className="admin-field" key={`t-${loc}`}>
              <span className="admin-field-label">{loc.toUpperCase()}</span>
              <input
                className="admin-input"
                type="text"
                value={card.title_i18n?.[loc] ?? ''}
                disabled={locked}
                onChange={(e) =>
                  onPatch(card.id, {
                    title_i18n: { ...(card.title_i18n ?? {}), [loc]: e.target.value },
                  })
                }
              />
            </label>
          ))}
          <p className="admin-field-label">三语描述（留空 = 沿用数据源）</p>
          {(['zh', 'en', 'ja'] as const).map((loc) => (
            <label className="admin-field" key={`s-${loc}`}>
              <span className="admin-field-label">{loc.toUpperCase()}</span>
              <textarea
                className="admin-textarea"
                rows={3}
                value={card.summary_i18n?.[loc] ?? ''}
                disabled={locked}
                onChange={(e) =>
                  onPatch(card.id, {
                    summary_i18n: { ...(card.summary_i18n ?? {}), [loc]: e.target.value },
                  })
                }
              />
            </label>
          ))}
        </div>
      ) : null}

      {activeTab === 'text' && card.supports_items ? (
        <ItemListEditor
          items={card.items}
          itemsLabel={itemsLabel}
          locked={locked}
          onChange={setItems}
          onError={onError}
        />
      ) : null}

      {activeTab === 'i18n' && card.supports_guided_questions ? (
        <ItemListEditor
          items={card.guided_questions ?? []}
          itemsLabel="引导问题"
          locked={locked}
          onChange={setGuidedQuestions}
          onError={onError}
        />
      ) : null}

      {defaults && edited ? (
        <button
          type="button"
          className="admin-linkbtn"
          disabled={locked}
          onClick={restore}
        >
          改回默认
        </button>
      ) : null}
    </section>
  )
}

// --------------------------------------------------------------------------
// Bullet-list editor — only rendered for slots that declare
// `supports_items`. Used for "推荐动作" and "示例问题".
// --------------------------------------------------------------------------
function ItemListEditor({
  items,
  itemsLabel,
  locked,
  onChange,
  onError,
}: {
  items: string[]
  itemsLabel: string
  locked: boolean
  onChange: (next: string[]) => void
  onError: (text: string) => void
}) {
  const update = (index: number, value: string) =>
    onChange(items.map((it, i) => (i === index ? value.slice(0, ITEM_LIMIT) : it)))

  const remove = (index: number) => onChange(items.filter((_, i) => i !== index))

  const add = () => {
    if (items.length >= MAX_ITEMS) {
      onError(`最多 ${MAX_ITEMS} 条`)
      return
    }
    onChange([...items, ''])
  }

  return (
    <div className="admin-items">
      <span className="admin-field-label">
        {itemsLabel}
        <span className="admin-counter">{items.length}/{MAX_ITEMS}</span>
      </span>
      {items.map((item, index) => (
        <div className="admin-item-row" key={index}>
          <input
            className="admin-item-input"
            value={item}
            maxLength={ITEM_LIMIT}
            disabled={locked}
            placeholder={`第 ${index + 1} 条`}
            onChange={(e) => update(index, e.target.value)}
          />
          <button
            type="button"
            className="admin-item-remove"
            disabled={locked}
            aria-label="删除这一条"
            onClick={() => remove(index)}
          >
            <Icon name="close" size={16} />
          </button>
        </div>
      ))}
      {items.length < MAX_ITEMS ? (
        <button type="button" className="admin-item-add" disabled={locked} onClick={add}>
          + 添加一条
        </button>
      ) : null}
    </div>
  )
}

// --------------------------------------------------------------------------
// Site Configuration editor (ADR-0021 sibling)
// Four registry-driven dimensions: feature flags, landing topic ordering,
// entity-page section visibility, exploration starters. Reads labels from
// FLAG_LABELS / SECTION_LABELS (mirroring the backend registry); values come
// from the fetched document. Component-level consumption of entity_sections
// is scheduled separately — the switches land now so the operator can flip
// them the moment wiring arrives.
// --------------------------------------------------------------------------
function SiteConfigEditor({
  config,
  defaults,
  locked,
  onPatchFlag,
  onPatchSection,
  onMoveTopic,
  onSetStarter,
  onAddStarter,
  onRemoveStarter,
}: {
  config: SiteConfigDocument
  defaults: SiteConfigDocument | null
  locked: boolean
  onPatchFlag: (id: string, enabled: boolean) => void
  onPatchSection: (id: string, visible: boolean) => void
  onMoveTopic: (index: number, dir: -1 | 1) => void
  onSetStarter: (index: number, value: string) => void
  onAddStarter: () => void
  onRemoveStarter: (index: number) => void
}) {
  const flagIds = Object.keys(config.feature_flags)
  const flagEdited = (id: string) =>
    defaults ? config.feature_flags[id] !== defaults.feature_flags[id] : false
  const sectionEdited = (id: string) => {
    if (!defaults) return false
    const cur = config.entity_sections.find((s) => s.id === id)
    const def = defaults.entity_sections.find((s) => s.id === id)
    return cur && def ? cur.visible !== def.visible : false
  }

  return (
    <section className="admin-module admin-module-sitecfg">
      <div className="admin-module-head is-static">
        <Icon name="technology" size={20} />
        <span className="admin-module-label">站点配置</span>
        <span className="admin-module-count">功能开关 · 主题排序 · 板块显隐 · 探索起点</span>
      </div>

      <div className="admin-sitecfg-body">
        {/* --- feature flags --- */}
        <div className="admin-sitecfg-group">
          <h3 className="admin-sitecfg-group-title">功能开关</h3>
          {flagIds.map((id) => {
            const meta = FLAG_LABELS[id] ?? { label: id, desc: '' }
            const on = config.feature_flags[id]
            return (
              <label className="admin-toggle-row" key={id}>
                <span className="admin-toggle-text">
                  <span className="admin-toggle-label">{meta.label}</span>
                  {meta.desc ? <span className="admin-toggle-desc">{meta.desc}</span> : null}
                </span>
                <span className="admin-toggle-control">
                  {flagEdited(id) ? <span className="admin-card-badge">已改</span> : null}
                  <input
                    type="checkbox"
                    className="admin-toggle-input"
                    checked={on}
                    disabled={locked}
                    onChange={(e) => onPatchFlag(id, e.target.checked)}
                    aria-label={`开关 ${meta.label}`}
                  />
                </span>
              </label>
            )
          })}
        </div>

        {/* --- topic ordering --- */}
        <div className="admin-sitecfg-group">
          <h3 className="admin-sitecfg-group-title">首页精选主题（排序 / 取舍）</h3>
          <p className="admin-hint">
            顺序即首页「从这里开始」的展示顺序；空值或目录中不存在的 slug 会被自动跳过。
          </p>
          {config.topic_ordering.map((slug, index) => (
            <div className="admin-slug-row" key={`${slug}-${index}`}>
              <span className="admin-slug-index">{index + 1}</span>
              <input
                className="admin-input admin-slug-input"
                value={slug}
                disabled
                readOnly
              />
              <span className="admin-slug-actions">
                <button
                  type="button"
                  className="admin-icon-btn"
                  disabled={locked || index === 0}
                  aria-label="上移"
                  onClick={() => onMoveTopic(index, -1)}
                >
                  <Icon name="chevron-up" size={16} />
                </button>
                <button
                  type="button"
                  className="admin-icon-btn"
                  disabled={locked || index === config.topic_ordering.length - 1}
                  aria-label="下移"
                  onClick={() => onMoveTopic(index, 1)}
                >
                  <Icon name="chevron-down" size={16} />
                </button>
              </span>
            </div>
          ))}
        </div>

        {/* --- entity sections --- */}
        <div className="admin-sitecfg-group">
          <h3 className="admin-sitecfg-group-title">实体页板块显隐</h3>
          {config.entity_sections.map((section) => {
            const meta = SECTION_LABELS[section.id] ?? { label: section.id, desc: '' }
            return (
              <label className="admin-toggle-row" key={section.id}>
                <span className="admin-toggle-text">
                  <span className="admin-toggle-label">{meta.label}</span>
                  {meta.desc ? <span className="admin-toggle-desc">{meta.desc}</span> : null}
                </span>
                <span className="admin-toggle-control">
                  {sectionEdited(section.id) ? <span className="admin-card-badge">已改</span> : null}
                  <input
                    type="checkbox"
                    className="admin-toggle-input"
                    checked={section.visible}
                    disabled={locked}
                    onChange={(e) => onPatchSection(section.id, e.target.checked)}
                    aria-label={`板块显隐 ${meta.label}`}
                  />
                </span>
              </label>
            )
          })}
        </div>

        {/* --- exploration starters --- */}
        <div className="admin-sitecfg-group">
          <h3 className="admin-sitecfg-group-title">探索起点（建议）</h3>
          <p className="admin-hint">进入探索时的推荐起点文案，最多 8 条。</p>
          {config.exploration_starters.map((starter, index) => (
            <div className="admin-item-row" key={index}>
              <input
                className="admin-item-input"
                value={starter}
                maxLength={60}
                disabled={locked}
                placeholder={`第 ${index + 1} 条`}
                onChange={(e) => onSetStarter(index, e.target.value)}
              />
              <button
                type="button"
                className="admin-item-remove"
                disabled={locked}
                aria-label="删除这一条"
                onClick={() => onRemoveStarter(index)}
              >
                <Icon name="close" size={16} />
              </button>
            </div>
          ))}
          {config.exploration_starters.length < 8 ? (
            <button type="button" className="admin-item-add" disabled={locked} onClick={onAddStarter}>
              + 添加一条
            </button>
          ) : null}
        </div>
      </div>
    </section>
  )
}

export default AdminPage
