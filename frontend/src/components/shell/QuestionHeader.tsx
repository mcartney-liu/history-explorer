// ============================================================
// M90.3 Stage B-2 — Question Header
//
// Renders: the user's current question and understanding goal.
// Data source: ExplorerRuntimeContext (userQuestion, understandingGoal).
//
// This is the "why are we here?" region. Per EC-001 (Curiosity
// Entry) and EC-002 (Orientation), the user must always see
// their driving question.
//
// Stage E will add: question refinement, goal breakdown.
// ============================================================

import { useMemo } from 'react'

interface QuestionHeaderProps {
  /** The user's driving question, e.g. "为什么罗马帝国会衰落？" */
  question: string | null
  /** The understanding goal, e.g. "理解多因素因果链" */
  goal: string | null
}

export function QuestionHeader({ question, goal }: QuestionHeaderProps) {
  const displayQuestion = useMemo(() => {
    if (question) return question
    return '你想理解什么？'
  }, [question])

  return (
    <div style={{
      display: 'flex',
      alignItems: 'baseline',
      gap: 12,
    }}>
      <span style={{
        fontFamily: 'var(--serif, "Spectral", serif)',
        fontSize: '1.25rem',
        color: 'var(--color-ink-900)',
        lineHeight: 1.4,
      }}>
        {displayQuestion}
      </span>
      {goal && (
        <span style={{
          fontSize: '0.8rem',
          color: 'var(--color-ink-500)',
          fontStyle: 'italic',
        }}>
          · 目标：{goal}
        </span>
      )}
    </div>
  )
}
