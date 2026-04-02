import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/health': 'http://127.0.0.1:8000',
      '/register': 'http://127.0.0.1:8000',
      '/login': 'http://127.0.0.1:8000',
      '/chat': 'http://127.0.0.1:8000',
      '/medical-history': 'http://127.0.0.1:8000',
      '/me': 'http://127.0.0.1:8000',
      '/patients': 'http://127.0.0.1:8000',
      '/doctor': 'http://127.0.0.1:8000',
    },
  },
})
