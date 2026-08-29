import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: './',
  build: { target: 'es2020', chunkSizeWarningLimit: 1500 },
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/apple-touch-icon.png', 'icons/icon-192.png', 'icons/icon-512.png'],
      workbox: {
        // Le pack de sprites est volontairement hors du pré-cache : quelques
        // centaines de PNG rallongeraient l'installation alors qu'ils ne servent
        // qu'au fil des rencontres.
        globPatterns: ['**/*.{js,css,html,svg,woff2}', 'icons/*.png'],
        globIgnores: ['**/sprites/**'],
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/\/sprites\//],
        runtimeCaching: [{
          // Chaque sprite réellement affiché est gardé : la partie reste jouable
          // hors ligne, sprites compris, une fois les espèces rencontrées.
          urlPattern: ({ url }) => url.pathname.includes('/sprites/'),
          handler: 'CacheFirst',
          options: {
            cacheName: 'pokelike-sprites',
            expiration: { maxEntries: 1500, maxAgeSeconds: 60 * 60 * 24 * 365 },
            cacheableResponse: { statuses: [0, 200] },
          },
        }],
      },
      manifest: {
        name: 'PokeLike — Aventure Valmore',
        short_name: 'PokeLike',
        description: 'RPG de monstres en 3D : 8 arènes, une Ligue et un post-game complet.',
        theme_color: '#0d1b2a',
        background_color: '#0d1b2a',
        display: 'fullscreen',
        orientation: 'any',
        start_url: './index.html',
        scope: './',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
});
