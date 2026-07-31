import type { Page } from '@playwright/test'

// M73 Phase3-A — shared E2E helpers.
// Backend (:8000) is a precondition for the exploration chain specs (entity
// fetchNode goes through the FastAPI backend). webServer only manages Vite.

export async function assertBackendUp(): Promise<void> {
  const res = await fetch('http://localhost:8000/topics')
  if (!res.ok) {
    throw new Error(
      'Backend not reachable on http://localhost:8000 — start it first: ' +
        'cd backend && .venv/Scripts/python.exe -m uvicorn app.main:app --port 8000',
    )
  }
}

/** Read the anonymous local behavior-event stream (test-scoped storage). */
export async function readEvents(
  page: Page,
  action?: string,
): Promise<Array<Record<string, unknown>>> {
  return page.evaluate(
    ({ act }) => {
      const es: Array<{ action?: string }> = JSON.parse(
        localStorage.getItem('history-explorer.events.v1') || '[]',
      )
      return act ? es.filter((e) => e.action === act) : es
    },
    { act: action ?? null },
  )
}
