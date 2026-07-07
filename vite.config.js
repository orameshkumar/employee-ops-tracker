import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/employee-ops-tracker/',
  build: { outDir: 'dist' },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      base: '/employee-ops-tracker/',
      scope: '/employee-ops-tracker/',
      includeAssets: ['favicon.ico', 'icon-192.png', 'icon-512.png'],
      manifest: {
        name: 'Employee Ops Tracker',
        short_name: 'OpsTracker',
        description: 'Employee attendance, tasks, sales and expenses',
        start_url: '/employee-ops-tracker/',
        scope: '/employee-ops-tracker/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#0f172a',
        theme_color: '#3b82f6',
        icons: [
          { src: '/employee-ops-tracker/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/employee-ops-tracker/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/employee-ops-tracker/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        navigateFallback: '/employee-ops-tracker/index.html',
        navigateFallbackDenylist: [/^\/employee-ops-tracker\/404/],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.firebaseio\.com\/.*/i,
            handler: 'NetworkOnly',
          },
          {
            urlPattern: /^https:\/\/firestore\.googleapis\.com\/.*/i,
            handler: 'NetworkOnly',
          },
        ],
      },
    }),
  ],
})
