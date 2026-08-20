import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5175,
    strictPort: true,
    host: true,
    // 允许 cloudflared 临时隧道域名（每次重启都变）访问 dev server
    allowedHosts: true,
  },
})
