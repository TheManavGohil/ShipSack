import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    tailwindcss(),
  ],
  server: {
    port: 5173,
    proxy: {
      '/deploy': 'http://localhost:3000',
      '/status': 'http://localhost:3000',
    },
  },
})