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
