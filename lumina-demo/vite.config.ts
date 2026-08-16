import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5175,
    strictPort: true,
    host: true,
  },
  // Skip esbuild dep prebundling — the native binary download is unreliable
  // behind the corporate proxy. Browsers can import modern ESM directly.
  optimizeDeps: {
    noDiscovery: true,
    include: [],
  },
})
