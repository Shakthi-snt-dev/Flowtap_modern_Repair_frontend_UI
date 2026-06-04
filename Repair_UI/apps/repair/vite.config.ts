import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Workspace packages that use import.meta.env must be excluded from Vite's
// esbuild pre-bundling step. Pre-bundled deps don't receive app-level env vars,
// so VITE_API_BASE_URL / VITE_SIGNALR_URL would resolve to undefined and fall
// back to the wrong default port. Excluding them forces Vite to process them
// inline where import.meta.env IS properly substituted.
const workspacePackages = [
  '@flowtap/api-core',
  '@flowtap/shared',
  '@flowtap/ui-core',
  '@flowtap/store',
  '@flowtap/pages-core',
]

export default defineConfig({
  plugins: [react()],
  server: { port: 3005 },
  optimizeDeps: {
    exclude: workspacePackages,
  },
  resolve: {
    dedupe: ['react', 'react-dom', 'react-router-dom', 'react-redux'],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          redux:  ['@reduxjs/toolkit', 'react-redux'],
        },
      },
    },
  },
})
