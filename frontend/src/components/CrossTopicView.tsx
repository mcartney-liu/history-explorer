// M65 Phase 2C — CrossTopicView: unified CrossTopic family entry point.
// Composition wrapper — delegates to CrossTopicBridge, which internally
// composes CrossTopicConnectionsPanel + CrossTopicTopicList.
// All business logic stays in existing CrossTopic family components.

import CrossTopicBridge from './CrossTopicBridge'
import type { CrossTopicRelated, RelatedTopic } from './crossTopic'

export interface CrossTopicViewProps {
  connections?: CrossTopicRelated[]
  relatedTopics?: RelatedTopic[]
  focusedId?: string
  onEntityClick: (gid: string) => void
  onTopicClick: (topic: string) => void
}

/**
 * Unified CrossTopic family entry. Delegates to CrossTopicBridge.
 */
export function CrossTopicView(props: CrossTopicViewProps) {
  return <CrossTopicBridge {...props} />
}

export default CrossTopicView
