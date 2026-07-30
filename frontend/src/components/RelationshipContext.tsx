// ============================================================
// M65 Phase 2C — RelationshipContext
// Unified entry point for the Connections family of components.
// Wraps: ConnectionsPanel, ConnectionsExplainedPanel,
//        RelationshipInsightPanel, RelationshipEvidence, RelationshipPathGraph.
// Commit 1: composition wrapper. No logic change. No App.tsx migration yet.
// ============================================================

import ConnectionsPanel from './ConnectionsPanel'
import type { ConnectionItem } from './ConnectionsPanel'
import ConnectionsExplainedPanel from './ConnectionsExplainedPanel'
import type { ConnectionExplained } from './ConnectionsExplainedPanel'
import RelationshipInsightPanel from './RelationshipInsightPanel'
import type { EntityRelationship } from './EntityPage'
import type { Candidate } from '../data/candidateUtils'

interface RelationshipContextProps {
  // ConnectionsPanel props
  connections?: ConnectionItem[]
  // ConnectionsExplainedPanel props
  connectionsExplained?: ConnectionExplained[]
  onNodeClick?: (globalId: string) => void
  // RelationshipInsightPanel props
  candidates?: Candidate[]
  relationships?: EntityRelationship[]
  timeMap?: Record<string, string>
  mainGlobalId?: string
  mainEntityName?: string
  nameByGlobalId?: Record<string, string>
}

export function RelationshipContext({
  connections,
  connectionsExplained,
  onNodeClick,
  candidates,
  relationships,
  timeMap,
  mainGlobalId,
  mainEntityName,
  nameByGlobalId,
}: RelationshipContextProps) {
  return (
    <>
      {connections && connections.length > 0 && (
        <ConnectionsPanel connections={connections} />
      )}
      {connectionsExplained && connectionsExplained.length > 0 && (
        <ConnectionsExplainedPanel
          connections={connectionsExplained}
          onNodeClick={onNodeClick}
        />
      )}
      {candidates && relationships && timeMap && mainGlobalId && mainEntityName && nameByGlobalId && (
        <RelationshipInsightPanel
          candidates={candidates}
          relationships={relationships}
          timeMap={timeMap}
          mainGlobalId={mainGlobalId}
          mainEntityName={mainEntityName}
          nameByGlobalId={nameByGlobalId}
        />
      )}
    </>
  )
}

export default RelationshipContext
