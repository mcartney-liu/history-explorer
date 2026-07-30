// ============================================================
// M66-A — ExplorationInsightPanel
// Read-only, explainable, NON-AI panel that surfaces the
// *exploration space connection state* — NOT user analytics.
//
// Hard constraints (enforced by unit tests):
//  - No user evaluation / scoring / profiling
//  - No recommendation / "you should" / "system thinks you" wording
//  - Never feeds data into explainAI (read-only display only)
//  - Communicates "how your exploration space is connected"
// ============================================================

import { useCompanion } from './CompanionContext'

// Neutral exploration-mode labels (facts, not judgements).
const PATTERN_LABELS: Record<string, string> = {
  research_loop: '研究循环',
  quick_lookup: '快速查阅',
  breadth_scan: '广度浏览',
  deep_dive: '深度钻研',
  comparison: '对比探索',
  unknown: '尚未形成模式',
}

function formatPercent(ratio: number): string {
  const clamped = Math.max(0, Math.min(1, Number.isFinite(ratio) ? ratio : 0))
  return `${Math.round(clamped * 100)}%`
}

export function ExplorationInsightPanel() {
  const { workspace } = useCompanion()
  const intel = workspace?.intelligence

  // Empty state — never judges the user, only states the absence of local data.
  if (!intel || intel.explorationActivityCount === 0) {
    return (
      <section className="companion-section exploration-insight-panel" aria-label="探索空间连接状态">
        <h4 className="exploration-insight-title">探索空间连接状态</h4>
        <p className="companion-hint">
          本地探索分析 · 非 AI。开始探索后，这里会显示你的探索空间如何连接。
        </p>
      </section>
    )
  }

  return (
    <section className="companion-section exploration-insight-panel" aria-label="探索空间连接状态">
      <div className="exploration-insight-header">
        <h4 className="exploration-insight-title">探索空间连接状态</h4>
        <span className="exploration-insight-badge">本地探索分析 · 非 AI</span>
      </div>

      <dl className="exploration-insight-list">
        <div className="exploration-insight-row">
          <dt>探索深度</dt>
          <dd>第 {intel.explorationDepth} 层</dd>
        </div>
        <div className="exploration-insight-row">
          <dt>探索模式</dt>
          <dd>{PATTERN_LABELS[intel.explorationPattern] ?? intel.explorationPattern}</dd>
        </div>
        <div className="exploration-insight-row">
          <dt>知识覆盖</dt>
          <dd>{formatPercent(intel.knowledgeCoverage)}</dd>
        </div>
        <div className="exploration-insight-row">
          <dt>关系数据可用</dt>
          <dd>{intel.knowledgeConnectionAvailable ? '可继续连接' : '暂未连接'}</dd>
        </div>
        <div className="exploration-insight-row">
          <dt>探索活动量</dt>
          <dd>{intel.explorationActivityCount} 次本地事件</dd>
        </div>
        <div className="exploration-insight-row">
          <dt>数据充分度</dt>
          <dd>{formatPercent(intel.evidenceCompleteness)}</dd>
        </div>
        <div className="exploration-insight-row">
          <dt>证据质量</dt>
          <dd>{formatPercent(intel.evidenceQuality)}</dd>
        </div>
      </dl>

      {intel.explorationSignals.length > 0 && (
        <div className="exploration-insight-signals">
          <p className="exploration-insight-signals-label">探索信号</p>
          <ul>
            {intel.explorationSignals.map((signal, i) => (
              <li key={i}>{signal}</li>
            ))}
          </ul>
        </div>
      )}

      <p className="companion-hint">
        以上为你的探索空间客观连接状态，基于本地浏览行为统计，仅作事实呈现。
      </p>
    </section>
  )
}

export default ExplorationInsightPanel
