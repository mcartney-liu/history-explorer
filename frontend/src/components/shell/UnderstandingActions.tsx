// ============================================================
// P5 理解视角补强 — UnderstandingActions
//
// 挂在 UnderstandingCanvas 的 understandingSection 内，补齐
// 理解视角的两个动作/展示：
//   1. 「深度研究此主题」按钮 —— 复用 openEntity(gid, name, 'research')，
//      把当前主题的主实体导向实体页研究 Tab（AI 默认关时走兜底答案）。
//   2. 「你的探索偏好」标签区 —— 显式展示个人偏好维度
//      （跟随策展 / 因果解释 / 直接发问），复用 discover.dim.* 文案。
//
// 第二批（2026-08-12）：「对此主题直接发问」已落地 —— 通过 onAskCompanion
// 回调把 ExplorerShell 的 companionCollapsed 提升到 App 层，跨组件展开
// AI 历史学家 dock 并切到对话模式（chat）。主题上下文已由 workspaceContext 自动带出。
// ============================================================

import { useLocale } from '../../data/locale'

interface UnderstandingActionsProps {
  mainEntityGlobalId: string
  mainEntityName: string
  onDeepResearch: (globalId: string, name: string) => void
  /** 从理解视角「直接发问」：展开 AI 历史学家对话模式 */
  onAskCompanion: () => void
}

// 个人偏好维度（与「我的」模块 DEFAULT_DIMENSIONS 同源）
const PREF_DIMENSIONS = ['discover.dim.curator', 'discover.dim.causal', 'discover.dim.ask'] as const

export function UnderstandingActions({
  mainEntityGlobalId,
  mainEntityName,
  onDeepResearch,
  onAskCompanion,
}: UnderstandingActionsProps) {
  const { t } = useLocale()
  const canResearch = Boolean(mainEntityGlobalId)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 4 }}>
      <div className="discover-understanding-block">
        <span className="discover-understanding-label">{t('understand.prefTitle')}</span>
        <div className="discover-understanding-tags">
          {PREF_DIMENSIONS.map((d) => (
            <span key={d} className="discover-understanding-tag">{t(d)}</span>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {canResearch && (
          <button
            type="button"
            onClick={() => onDeepResearch(mainEntityGlobalId, mainEntityName)}
            aria-label={t('understand.deepResearch')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 18px',
              borderRadius: 'var(--radius-sm, 8px)',
              border: '1px solid var(--color-accent)',
              background: 'var(--color-accent)',
              color: '#fff',
              fontFamily: 'inherit',
              fontSize: '0.92rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {t('understand.deepResearch')}
          </button>
        )}
        <button
          type="button"
          onClick={onAskCompanion}
          aria-label={t('understand.askCompanion')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 18px',
            borderRadius: 'var(--radius-sm, 8px)',
            border: '1px solid var(--color-accent)',
            background: 'transparent',
            color: 'var(--color-accent)',
            fontFamily: 'inherit',
            fontSize: '0.92rem',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          {t('understand.askCompanion')}
        </button>
      </div>
    </div>
  )
}

export default UnderstandingActions
