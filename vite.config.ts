import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";
import pkg from "./package.json";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  define: {
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(pkg.version),
  },
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: true,
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['favicon.ico', 'pwa-192x192.png', 'pwa-512x512.png'],
      workbox: {
        cleanupOutdatedCaches: true,
        skipWaiting: false,
        clientsClaim: true,
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/^\/~oauth/, /^\/api\//, /\.(?:png|jpg|jpeg|svg|gif|ico|webp)$/, /^\/fonts\//],
        globPatterns: ['**/*.{html,js,css,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /\/fonts\/.+\.(?:woff2?|ttf)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'local-fonts',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
          {
            urlPattern: /\/assets\/.+\.(?:js|css)$/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'static-assets',
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'images',
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/v1\/.*/i,
            handler: 'NetworkOnly', // بيانات مالية حساسة — لا تُخزَّن في كاش PWA. React Query يتولى الكاش في الذاكرة
          },
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/auth\/v1\/.*/i,
            handler: 'NetworkOnly',
          },
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/functions\/v1\/.*/i,
            handler: 'NetworkOnly', // Edge Functions — بيانات حساسة لا تُكَّش
          },
        ],
      },
      manifest: {
        name: 'نظام إدارة الوقف - وقف مرزوق بن علي الثبيتي',
        short_name: 'إدارة الوقف',
        description: 'منصة متكاملة لإدارة أملاك الوقف والعقارات والحسابات الختامية',
        theme_color: '#1a5c3a',
        background_color: '#faf8f5',
        display: 'standalone',
        dir: 'rtl',
        lang: 'ar',
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime"],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-radix': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-popover',
            '@radix-ui/react-select',
            '@radix-ui/react-tabs',
            '@radix-ui/react-toast',
            '@radix-ui/react-tooltip',
            '@radix-ui/react-accordion',
            '@radix-ui/react-alert-dialog',
          ],
          'vendor-supabase': ['@supabase/supabase-js'],
          'vendor-query': ['@tanstack/react-query'],
          'vendor-markdown': ['react-markdown'],
          'vendor-pdf': ['jspdf', 'jspdf-autotable'],
          'vendor-charts': ['recharts'],
        },
      },
    },
    chunkSizeWarningLimit: 500,
    sourcemap: false,
  },
}));
