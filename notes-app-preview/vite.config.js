import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // three.js is now lazy-loaded so the real initial bundle is well under 500 KB.
    // Raise the threshold to avoid spurious warnings from the three chunk itself.
    chunkSizeWarningLimit: 700,

    rollupOptions: {
      output: {
        manualChunks(id) {
          // React core — stable, cache indefinitely
          if (
            id.includes('node_modules/react/') ||
            id.includes('node_modules/react-dom/') ||
            id.includes('node_modules/react-error-boundary/')
          ) {
            return 'vendor-react';
          }
          // React Router — changes infrequently, keep separate from app code
          if (
            id.includes('node_modules/react-router') ||
            id.includes('node_modules/@remix-run/')
          ) {
            return 'vendor-router';
          }
          // three.js — already lazy; isolate so the chunk hash reflects only it
          if (id.includes('node_modules/three/')) {
            return 'vendor-three';
          }
        },
      },
    },
  },
})
