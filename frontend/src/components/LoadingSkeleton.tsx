// Unified loading skeleton (M2-003, requirement 7).
// One consistent loading presentation across every page/section so users
// never see a mix of spinner styles or a forever-loading blank.

type LoadingSkeletonProps = {
  label?: string
}

function LoadingSkeleton({ label = 'Loading…' }: LoadingSkeletonProps) {
  return (
    <div className="he-skeleton" role="status" aria-live="polite" aria-busy="true">
      <div className="he-skeleton-line he-skeleton-line--title" />
      <div className="he-skeleton-line" />
      <div className="he-skeleton-line" />
      <div className="he-skeleton-line he-skeleton-line--short" />
      <span className="he-skeleton-label">{label}</span>
    </div>
  )
}

export default LoadingSkeleton
