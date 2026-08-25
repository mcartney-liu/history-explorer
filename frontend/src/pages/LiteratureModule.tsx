// ============================================================
// 文学板块（预览版）— 模块页面 · Working Volumes 编辑型书架
// 参考 ThreeUI《CompleteShelfLandingPage》的 "Working Volumes" 概念：
// 把六站策展脉络比作排放在书架上的「卷帙」，卷首特写当前焦点卷，
// 下方完整卷宗目录可点选切换，再展开本卷关系 / 全景脉络 / 继续探索。
//
// 方案 A：纯前端策展原型。复用 ConnectionExplorer（关系网络 + 时间线），
// 内部自管「聚焦节点」状态，不依赖后端语料、不破冻结不变量。
// 视觉锁定 [data-theme="legacy"]，仅用既有设计令牌，不引入新依赖。
// ============================================================

import { useRef, useState } from 'react'
import ConnectionExplorer from '../components/entity/ConnectionExplorer'
import { LIT_STATIONS } from '../data/literature/literatureData'
import {
  allGraphNodes,
  allGraphEdges,
  allTimeline,
  getNode,
  neighborhoodOf,
} from '../data/literature/literatureAdapter'

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X']

/** 负数年份渲染为「前 N」 */
function formatYear(year?: number): string {
  if (typeof year !== 'number') return '—'
  return year < 0 ? `前${-year}` : String(year)
}

export default function LiteratureModule() {
  const [focusId, setFocusId] = useState<string>(LIT_STATIONS[0].nodeId)
  const focus = getNode(focusId)
  const { nodes, edges } = neighborhoodOf(focusId)
  const activeIndex = Math.max(
    0,
    LIT_STATIONS.findIndex((s) => s.nodeId === focusId),
  )
  const relationsRef = useRef<HTMLDivElement>(null)

  const handleNodeClick = (id: string) => setFocusId(id)
  const openBook = () => {
    relationsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const volLabel = `VOLUME ${ROMAN[activeIndex] ?? activeIndex + 1}`

  return (
    <div className="lit-module">
      {/* 卷首标识区 */}
      <header className="lit-masthead">
        <div className="lit-masthead-kicker">中国文学脉络 · 策展预览</div>
        <h1 className="lit-masthead-title">文学卷帙</h1>
        <p className="lit-masthead-sub">
          Working Volumes of Chinese Literature — 六卷，自《诗经》至《红楼梦》
        </p>
        <div className="lit-masthead-edition">Edition 01 · 预览 · 骨白 · 铜金</div>
      </header>

      {/* 卷首特写 hero：当前焦点即「翻开的一卷」 */}
      <section className="lit-hero" aria-label="当前卷宗">
        <div className="lit-hero-figure">
          <span className="lit-hero-pageno">
            {String(activeIndex + 1).padStart(2, '0')} /{' '}
            {String(LIT_STATIONS.length).padStart(2, '0')}
          </span>
          <span className="lit-hero-spine">
            {volLabel} · {focus?.eraLabel ?? ''}
          </span>
        </div>
        <div className="lit-hero-body">
          <span className="lit-hero-volume">
            {volLabel} · {focus?.eraLabel ?? '—'}
          </span>
          <h2 className="lit-hero-title">{focus?.name ?? '—'}</h2>
          <p className="lit-hero-tagline">{focus?.summary}</p>
          <dl className="lit-hero-meta">
            <div className="lit-hero-meta-item">
              <dt>时代</dt>
              <dd>{focus?.eraLabel ?? '—'}</dd>
            </div>
            <div className="lit-hero-meta-item">
              <dt>类别</dt>
              <dd>{focus?.type ?? '—'}</dd>
            </div>
            <div className="lit-hero-meta-item">
              <dt>纪年</dt>
              <dd>{formatYear(focus?.year)}</dd>
            </div>
          </dl>
          {focus && focus.keyFacts.length > 0 && (
            <ul className="lit-hero-facts">
              {focus.keyFacts.map((f, i) => (
                <li key={i}>{f}</li>
              ))}
            </ul>
          )}
          <button type="button" className="lit-hero-open" onClick={openBook}>
            翻开本卷 · 查看关系
          </button>
        </div>
      </section>

      {/* 完整卷宗目录：六卷排放在书架上，可点选切换焦点 */}
      <section className="lit-toc" aria-label="卷宗目录">
        <h3 className="lit-toc-title">## 六卷 · 文学脉络</h3>
        <div className="lit-toc-grid">
          {LIT_STATIONS.map((s, i) => {
            const node = getNode(s.nodeId)
            const isActive = s.nodeId === focusId
            return (
              <button
                key={s.id}
                type="button"
                className={`lit-toc-card${isActive ? ' is-active' : ''}`}
                onClick={() => setFocusId(s.nodeId)}
              >
                <span className="lit-toc-vol">VOL {ROMAN[i] ?? i + 1}</span>
                <span className="lit-toc-name">{node?.name ?? s.title}</span>
                <span className="lit-toc-blurb">{s.blurb}</span>
              </button>
            )
          })}
        </div>
      </section>

      {/* 本卷关系 + 全景脉络 + 继续探索 */}
      <div className="lit-contents" ref={relationsRef}>
        {focus && (
          <section className="lit-section">
            <h3 className="lit-section-title">本卷关系</h3>
            <p className="lit-section-hint">
              以当前卷宗为中心的局部关系图，点击任意方块可切换焦点。
            </p>
            <ConnectionExplorer
              graphNodes={nodes}
              graphEdges={edges}
              timeline={[]}
              onEntityClick={handleNodeClick}
            />
          </section>
        )}

        <section className="lit-section">
          <h3 className="lit-section-title">全景脉络</h3>
          <p className="lit-section-hint">
            整条文学脉络的总览，可切换到「时间线」查看年代走向。
          </p>
          <ConnectionExplorer
            graphNodes={allGraphNodes()}
            graphEdges={allGraphEdges()}
            timeline={allTimeline()}
            onEntityClick={handleNodeClick}
          />
        </section>

        <section className="lit-section">
          <h3 className="lit-section-title">继续探索</h3>
          <div className="lit-chips">
            {LIT_STATIONS.filter((s) => s.nodeId !== focusId).map((s) => {
              const name = getNode(s.nodeId)?.name ?? s.title
              return (
                <button
                  key={s.id}
                  type="button"
                  className="lit-chip"
                  onClick={() => setFocusId(s.nodeId)}
                >
                  {name}
                </button>
              )
            })}
          </div>
        </section>
      </div>

      <footer className="lit-footer">
        文学卷帙 · 策展预览 — 纯前端种子数据，后续可平滑接入后端语料源。
      </footer>
    </div>
  )
}
