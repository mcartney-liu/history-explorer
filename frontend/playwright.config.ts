import { defineConfig } from '@playwright/test'

// M73 Phase3-A — Playwright E2E (local Alpha regression infra only).
// PO scope: local test infrastructure; NO CI cloud / auto-deploy / commercial
// test platform. vitest include stays src/** so e2e/ never interferes.
//
// webServer only manages the Vite dev server (5173). The backend (FastAPI,
// :8000) is a precondition — each spec probes it via helpers.assertBackendUp()
// and fails with a clear message if it is not running.
export default defineConfig({
  testDir: './e2e',
  // M74-003 (C3-2): the Feature-ON cases (ai-suggestions.spec.ts) need a
  // dedicated vite server with VITE_AI_SUGGESTIONS_ENABLED=true — they run
  // under playwright.ai.config.ts. The default :5173 build is OFF, so the
  // OFF verification lives in ai-suggestions-off.spec.ts (runs here).
  testIgnore: /ai-suggestions\.spec\.ts/,
  timeout: 30_000,
  retries: 0,
  // Local Alpha regression: run serially. The home page runs a background
  // animation + late web-font load; 3 parallel browser contexts on this dev
  // machine caused flaky actionability timeouts (verified: 1 worker is stable).
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:5173',
    headless: true,
  },
  webServer: {
    command: 'npm run dev',
    port: 5173,
    reuseExistingServer: true,
    timeout: 60_000,
  },
})
