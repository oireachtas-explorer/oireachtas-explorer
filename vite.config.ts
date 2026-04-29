import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// Served from a custom domain root, so base is '/'.
export default defineConfig({
  plugins: [react()],
  base: '/',
  server: { port: 5174 },
})
