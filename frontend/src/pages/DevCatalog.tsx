// ============================================================
// M59-021 — DevCatalog
// Internal component showroom. Development only.
// Not a test framework. Just a visual catalog.
// ============================================================

import { useState } from 'react'
import type { EntityInsight } from '../data/entity/EntityInsightModel'

// Entity components
import { EntityHero } from '../components/entity/EntityHero'
import { EntityInsightCard } from '../components/entity/EntityInsightCard'
import { EntityExperienceHeader } from '../components/entity/EntityExperienceHeader'

// Exploration components
import { ExplorationGuide } from '../components/entity/ExplorationGuide'
import { ExplorationCard } from '../components/entity/ExplorationCard'
import { ConnectionExplorer } from '../components/entity/ConnectionExplorer'
import { ViewSwitcher } from '../components/entity/ViewSwitcher'

// AI components
import { AISidebar } from '../components/ai/AISidebar'

// ---- Mock data ----
const mockIdentity = {
  id: 'caesar',
  name: 'Julius Caesar',
  type: 'Person',
  timeLabel: '100 BC – 44 BC',
  locationLabel: 'Rome',
  label: '军事统帅 · 政治家',
  icon: 'civilization',
  keyFacts: ['罗马共和国末期的军事统帅', '高卢战争的征服者', '被元老院刺杀于公元前44年'],
}

const mockNodes = [
  { id: 'caesar', name: 'Julius Caesar', type: 'Person' },
  { id: 'pompey', name: 'Pompey', type: 'Person' },
  { id: 'rome', name: 'Rome', type: 'Civilization' },
]

const mockEdges = [
  { source: 'caesar', target: 'pompey', relation: 'opposed', label: '对立' },
  { source: 'caesar', target: 'rome', relation: 'ruled', label: '统治' },
]

const mockTimeline = [
  { year: -100, event: 'Born' },
  { year: -58, event: 'Gallic Wars begin' },
  { year: -44, event: 'Assassinated' },
]

const mockInsight: EntityInsight = {
  text: 'Julius Caesar 是罗马共和国末期最重要的军事与政治人物之一。他的征服和改革改变了罗马政治结构，并最终推动共和国向帝国转变。',
  keyNames: ['Pompey', 'Rome'],
  timelineHighlights: ['高卢战争', '被刺杀'],
  sourceFields: ['summary.description', 'relationships'],
}

// ---- Section helper ----
function Section({ label, purpose, children }: { label: string; purpose: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 'var(--space-8)', borderBottom: '1px solid var(--line)', paddingBottom: 'var(--space-6)' }}>
      <h2 style={{ fontFamily: 'var(--serif)', fontSize: '1.3rem', color: 'var(--hi)', marginBottom: 4 }}>{label}</h2>
      <p style={{ fontSize: '0.8rem', color: 'var(--low)', marginBottom: 16 }}>Purpose: {purpose}</p>
      <div style={{ padding: 16, background: 'var(--navy-card)', border: '1px solid var(--line)', borderRadius: 12 }}>
        {children}
      </div>
    </section>
  )
}

export default function DevCatalog({
  onCausalObjectClick,
}: {
  onCausalObjectClick?: (objectId: string) => void
}) {
  const [viewMode, setViewMode] = useState<'graph' | 'timeline' | 'map'>('graph')

  return (
    <div className="page-container" style={{ paddingTop: 80, paddingBottom: 120 }}>
      <h1 style={{ fontFamily: 'var(--serif)', fontSize: '2rem', color: 'var(--hi)', marginBottom: 8 }}>Component Catalog</h1>
      <p style={{ color: 'var(--low)', marginBottom: 32 }}>Development reference — not visible to end users.</p>

      {/* Entity Components */}
      <Section label="EntityHero" purpose="Layer 1: Entity identity with type badge, meta, and quick actions.">
        <EntityHero
          identity={mockIdentity}
          onAskAI={() => alert('AI clicked')}
          onResearch={() => alert('Research clicked')}
          onCompare={() => alert('Compare clicked')}
        />
      </Section>

      <Section label="EntityInsightCard" purpose="Historical insight summary between hero and guide.">
        <EntityInsightCard
          insight={mockInsight}
        />
      </Section>

      <Section label="EntityExperienceHeader" purpose="Unified container: Hero + Insight + Guide.">
        <EntityExperienceHeader
          hero={<EntityHero identity={mockIdentity} />}
          guide={
            <>
              <EntityInsightCard insight={mockInsight} />
              <ExplorationGuide
                entityName="Julius Caesar"
                nodes={mockNodes}
                edges={mockEdges}
                timelineCount={3}
              />
            </>
          }
        />
      </Section>

      {/* Exploration Components */}
      <Section label="ExplorationGuide" purpose="Progress bar + stats + recommended next entity.">
        <ExplorationGuide
          entityName="Julius Caesar"
          nodes={mockNodes}
          edges={mockEdges}
          timelineCount={3}
          visitedIds={['rome']}
        />
      </Section>

      <Section label="ExplorationCard" purpose="Clickable related entity card. Reusable across entity/relationship types.">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <ExplorationCard
            model={{ id: 'pompey', title: 'Pompey', entityType: 'Person', icon: 'person', subtitle: 'Military rival of Caesar', target: 'pompey', summary: '', badges: [], meta: {} }}
            onClick={(id) => alert(`Go to ${id}`)}
          />
          <ExplorationCard
            model={{ id: 'rome', title: 'Rome', entityType: 'Civilization', icon: 'civilization', subtitle: 'Capital of the Roman Empire', target: 'rome', summary: '', badges: [], meta: {} }}
            onClick={(id) => alert(`Go to ${id}`)}
          />
        </div>
      </Section>

      <Section label="ViewSwitcher" purpose="Three-mode tab: Graph | Timeline | Map. Parent-controlled active state.">
        <ViewSwitcher current={viewMode} onChange={setViewMode} />
        <p style={{ marginTop: 8, fontSize: 13, color: 'var(--mid)' }}>Active: {viewMode}</p>
      </Section>

      <Section label="ConnectionExplorer" purpose="Graph/Timeline/Map views from viewModel.connections.">
        <ConnectionExplorer
          graphNodes={mockNodes}
          graphEdges={mockEdges}
          timeline={mockTimeline}
        />
      </Section>

      {/* AI Components */}
      <Section label="AISidebar" purpose="AI Historian Companion. Collapsible sidebar with interaction flow.">
        <div style={{ maxWidth: 300 }}>
          <AISidebar context={null} />
        </div>
      </Section>

      {/* Workspace components */}
      <Section label="WorkspacePanel" purpose="Right sidebar workspace with exploration assets.">
        <p style={{ fontSize: 13, color: 'var(--low)' }}>WorkspacePanel rendered in main app layout. See AppShell → workspace slot.</p>
      </Section>

      {/* M85.8 — Explorer Experience Alpha entry */}
      {onCausalObjectClick && (
        <Section label="Explorer Experience Alpha" purpose="M85.8 — First Understanding Journey: 秦制 → 科举 → 罗马法">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <p style={{ fontSize: 13, color: 'var(--mid)', margin: 0 }}>
              点击开始第一条探索旅程。体验三幕叙事弧：理解 → 关联 → 继续探索。
            </p>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {[
                { id: 'co-004', label: '秦制 → 三省六部' },
                { id: 'co-001', label: '科举 → 文官体系' },
                { id: 'co-009', label: '罗马法 → 法律体系' },
              ].map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => onCausalObjectClick(entry.id)}
                  style={{
                    padding: '10px 18px',
                    background: 'var(--navy-card)',
                    border: '1px solid var(--gold-500)',
                    borderRadius: 8,
                    color: 'var(--gold-hi)',
                    cursor: 'pointer',
                    font: 'inherit',
                    fontSize: 14,
                  }}
                >
                  {entry.label}
                </button>
              ))}
            </div>
          </div>
        </Section>
      )}
    </div>
  )
}
