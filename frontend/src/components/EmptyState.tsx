// Unified empty state (M2-003, requirement 6).
// Every "nothing here" case (no search results, missing entity, empty
// timeline / relationship / related list) routes through this one component
// so the empty UI is identical everywhere — no blank pages, no undefined.

type EmptyStateProps = {
  message: string
}

function EmptyState({ message }: EmptyStateProps) {
  return (
    <p className="empty he-empty" role="status">
      {message}
    </p>
  )
}

export default EmptyState
