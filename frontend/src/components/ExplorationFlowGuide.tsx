// M30-B (Exploration Flow Closure): a purely presentational, STATELESS guide
// that closes the exploration loop for an entity page. It explains the
// four-step flow a visitor can follow:
//   Relationship -> Evidence -> Source -> Historical Context
//
// Hard constraints (M30-B freeze):
//   - No fetch, no state, no navigation logic, no AI/LLM.
//   - No new storage contract, no new endpoint, no schema change.
//   - Pure copy + structure so the existing test-locked components are never
//     modified and the freeze holds. The existing M5-A-5 EntityExplorationGuide
//     (starter cards) is intentionally NOT touched — this is a separate,
//     complementary closure banner mounted once on the entity page.
//
// ADR-0021 R2: the step labels and copy are editable at runtime (#/admin,
// module `exploration_flow`). STEPS below remains the shipped default — with
// no backend this renders exactly as it did before, and the component stays
// stateless: `useContentRevision` only asks React to re-render when configured
// copy arrives; it holds no data of its own.
import { slotDesc, slotTitle, useContentRevision } from '../data/contentRuntime'

const STEPS = [
  {
    key: 'relationship',
    label: 'Relationship',
    desc: '从关系网络找到与当前实体相连的人物、事件与观念。',
  },
  {
    key: 'evidence',
    label: 'Evidence',
    desc: '点开任意关系的“查看依据”，看到支撑该关联的事实溯源记录。',
  },
  {
    key: 'source',
    label: 'Source',
    desc: '每条溯源都指向其策展来源（Source）与引用（Reference）。',
  },
  {
    key: 'historical-context',
    label: 'Historical Context',
    desc: '用已溯源的全局 ID 调用 AI 解读，获得有依据的历史语境。',
  },
] as const

/** Slot ids use underscores; the DOM keys predate them and stay as-is. */
function slotIdFor(key: string): string {
  return `exploration_flow.${key.replace(/-/g, '_')}`
}

function ExplorationFlowGuide() {
  useContentRevision()

  return (
    <section
      className="result-section exploration-flow-guide"
      aria-label="Exploration flow"
    >
      <h3>探索路径</h3>
      <ol className="efg-steps">
        {STEPS.map((s, i) => {
          const slot = slotIdFor(s.key)
          return (
            <li className="efg-step" key={s.key}>
              <span className="efg-step-index" aria-hidden="true">
                {i + 1}
              </span>
              <span className="efg-step-label">{slotTitle(slot, s.label)}</span>
              <span className="efg-step-desc">{slotDesc(slot, s.desc)}</span>
            </li>
          )
        })}
      </ol>
    </section>
  )
}

export default ExplorationFlowGuide
