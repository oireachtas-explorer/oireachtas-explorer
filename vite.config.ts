import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// `base` must match the GitHub repository name for GitHub Pages to serve assets correctly.
// Update this if you rename the repository.
export default defineConfig({
  plugins: [react()],
  base: '/oireachtas-explorer/',
  server: { port: 5174 },
})
