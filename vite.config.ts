import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// PROMIJENI 'premjer-slozaja' u naziv svog GitHub repoa
const REPO_NAME = 'premjer-slozaja'

export default defineConfig({
  base: process.env.NODE_ENV === 'production' ? `/${REPO_NAME}/` : '/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'icons/*.png'],
      manifest: {
        name: 'Premjer Složaja Drveta',
        short_name: 'Premjer',
        description: 'Terenski alat za procjenu obima složaja drveta',
        theme_color: '#2d5a27',
        background_color: '#f0f4f0',
        display: 'standalone',
        orientation: 'portrait',
        start_url: `/${REPO_NAME}/`,
        scope: `/${REPO_NAME}/`,
        icons: [
          {
            src: 'icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ],
        categories: ['utilities', 'productivity'],
        lang: 'bs'
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365
              }
            }
          }
        ]
      }
    })
  ]
})
