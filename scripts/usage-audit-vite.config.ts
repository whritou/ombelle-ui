import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath } from 'node:url'
export default defineConfig({
  plugins: [tailwindcss()],
  server: {
    strictPort: true,
    fs: { allow: [fileURLToPath(new URL('../', import.meta.url))] },
  },
  optimizeDeps: { entries: ['*/index.html'] },
})
