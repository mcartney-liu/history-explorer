import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// Minimal test config for the History Explorer frontend.
// - `environment: 'node'`: the smoke test renders with renderToStaticMarkup,
//   which needs no DOM, so we avoid pulling in jsdom.
// - `css: false`: component CSS imports are skipped (visual only).
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    css: false,
    include: ['src/**/*.test.{ts,tsx}'],
  },
})
