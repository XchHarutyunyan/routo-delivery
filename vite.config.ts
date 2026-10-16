import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // The bundle includes ~300 KB of pre-computed Yerevan street routes
  build: { chunkSizeWarningLimit: 900 },
})
