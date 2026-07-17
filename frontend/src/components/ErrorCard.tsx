// Unified error card (M2-003, requirement 8).
// One presentation for every failure mode: 404 (entity not found), network
// failure, and parse/response failure. The caller passes a kind so the copy
// stays accurate, but the visual treatment is always the same.

export type ErrorKind = 'notfound' | 'network' | 'parse'

type ErrorCardProps = {
  kind: ErrorKind
  onRetry?: () => void
}

const COPY: Record<ErrorKind, { title: string; message: string }> = {
  notfound: {
    title: 'Not found',
    message: 'We could not find that entity. It may belong to another topic.',
  },
  network: {
    title: 'Connection problem',
    message: 'Unable to reach the backend. Is the server running on :8000?',
  },
  parse: {
    title: 'Something went wrong',
    message: 'The response could not be read. Please try again.',
  },
}

function ErrorCard({ kind, onRetry }: ErrorCardProps) {
  const copy = COPY[kind]
  return (
    <div className="he-error-card" role="alert">
      <h3 className="he-error-title">{copy.title}</h3>
      <p className="he-error-message">{copy.message}</p>
      {onRetry && (
        <button className="explore-button he-error-retry" type="button" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  )
}

export default ErrorCard
