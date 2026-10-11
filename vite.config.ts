import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['icon.svg', 'icons/apple-touch-icon.png'],
      manifest: {
        name: 'Kòkó: book independent creatives',
        short_name: 'Kòkó',
        description: 'Find and book photographers, barbers, stylists and makeup artists. See their work, pick a free slot, pay a deposit.',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait-primary',
        background_color: '#f4eee4',
        theme_color: '#f4eee4',
        categories: ['lifestyle', 'business'],
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        shortcuts: [
          { name: 'My bookings', url: '/bookings', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
          { name: 'Studio', url: '/studio', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,woff2}', 'icons/*.png'],
        navigateFallback: '/index.html',
        runtimeCaching: [
          {
            // photos are too heavy to precache; keep the ones people have actually seen
            urlPattern: ({ url }) => url.pathname.startsWith('/photos/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'koko-photos',
              expiration: { maxEntries: 250, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
        ],
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['src/test/setup.ts'],
  },
})
