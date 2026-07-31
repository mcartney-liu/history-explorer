import { defineConfig } from '@playwright/test'

// M74-003 (C3-2) — dedicated E2E config for the AI exploration touchpoints.
// Starts a SECOND vite dev server on :5174 with VITE_AI_SUGGESTIONS_ENABLED
// = true (the flag is build-time; the default :5173 server stays OFF so M73
// behaviour is verified separately in ai-suggestions-off.spec.ts).
//
// Every AI/backend call in these specs is mocked via page.route() (PO: "禁止
// 调用真实 backend") — the browser never makes a real cross-origin request,
// so the :5174 origin is not subject to the backend CORS whitelist.
export default defineConfig({
  testDir: './e2e',
  testMatch: /ai-suggestions\.spec\.ts/,
  timeout: 30_000,
  retries: 0,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:5174',
    headless: true,
  },
  webServer: {
    command: 'npx vite --port 5174 --strictPort',
    url: 'http://localhost:5174',
    reuseExistingServer: false,
    timeout: 60_000,
    env: {
      VITE_AI_SUGGESTIONS_ENABLED: 'true',
    },
  },
})
