import CrossTopicConnectionsPanel from './CrossTopicConnectionsPanel'
import CrossTopicTopicList from './CrossTopicTopicList'
import { CrossTopicRelated, RelatedTopic } from './crossTopic'

type CrossTopicBridgeProps = {
  // Direct cross-topic neighbors of the centered entity (Explore page only).
  connections?: CrossTopicRelated[]
  // Cross-topic "Connected Topics" projection.
  relatedTopics?: RelatedTopic[]
  // M10-2 cross-panel focus (VIEW STATE owned by App, global_id form). Threaded
  // to the connections panel so a focused cross-topic neighbor highlights in
  // sync with the Relationship / Timeline panels. Undefined = nothing focused.
  focusedId?: string
  // Reuse App's existing handlers; the panels already pass fully-qualified ids.
  onEntityClick: (globalId: string) => void
  onTopicClick: (topic: string) => void
}

// M10-2 (composition layer): a thin narrative-integration wrapper that groups
// the two existing cross-topic panels behind a single mount point and threads
// the shared focus through them. It OWNS no data, no state, and no navigation —
// it only composes CrossTopicConnectionsPanel + CrossTopicTopicList, both of
// which are PRESERVED (not replaced or reimplemented). Each child self-hides
// when it has no data, so the bridge introduces no empty chrome of its own.
function CrossTopicBridge({
  connections,
  relatedTopics,
  focusedId,
  onEntityClick,
  onTopicClick,
}: CrossTopicBridgeProps) {
  return (
    <>
      <CrossTopicConnectionsPanel
        connections={connections}
        focusedId={focusedId}
        onEntityClick={onEntityClick}
      />
      <CrossTopicTopicList relatedTopics={relatedTopics} onTopicClick={onTopicClick} />
    </>
  )
}

export default CrossTopicBridge
