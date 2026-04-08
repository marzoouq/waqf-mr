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
    'import.meta.env.VITE_APP_BUILD_ID': JSON.stringify(pkg.version),
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
      registerType: 'prompt',
      injectRegister: 'auto',
      devOptions: {
        enabled: false,
      },
      includeAssets: ['favicon.ico', 'pwa-192x192.png', 'pwa-512x512.png'],
      workbox: {
        cleanupOutdatedCaches: true,
        skipWaiting: false,
        clientsClaim: false,
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [
          /^\/~oauth/,
          /^\/api\//,
          /^\/rest\/v1\//,
          /^\/auth\/v1\//,
          /^\/functions\/v1\//,
          /^\/storage\/v1\//,
          /\.(?:png|jpg|jpeg|svg|gif|ico|webp|woff2?|ttf)$/,
          /^\/fonts\//,
        ],
        globPatterns: ['**/*.{html,js,css,ico,png,svg,woff2,ttf}'],
        // استبعاد الحزم الثقيلة من precache — تُحمّل عند الطلب فقط
        globIgnores: [
          '**/vendor-pdf*.js',
          '**/vendor-pdf-table*.js',
          '**/vendor-recharts*.js',
          '**/vendor-d3*.js',
          
          '**/vendor-markdown*.js',
          '**/vendor-dnd*.js',
          '**/vendor-webauthn*.js',
          '**/vendor-qr*.js',
          '**/vendor-arabic*.js',
        ],
        runtimeCaching: [
          // تحميل الحزم المستبعدة عند الطلب مع تخزين مؤقت
          {
            urlPattern: /\/assets\/vendor-(?:pdf|pdf-table|recharts|d3|markdown|dnd|webauthn|qr|arabic).+\.js$/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'lazy-vendor-chunks',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
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
            handler: 'NetworkFirst',
            options: {
              cacheName: 'static-assets',
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 7 },
            },
          },
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'images',
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 * 7 },
            },
          },
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/v1\/.*/i,
            handler: 'NetworkOnly',
          },
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/auth\/v1\/.*/i,
            handler: 'NetworkOnly',
          },
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/functions\/v1\/.*/i,
            handler: 'NetworkOnly',
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
            purpose: 'any',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
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
    modulePreload: { polyfill: true },
    rollupOptions: {
      // استبعاد ملفات الاختبار من البناء الإنتاجي
      external: (id) =>
        /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(id) ||
        id.includes('__tests__'),
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react-dom')) return 'vendor-react';
          if (id.includes('node_modules/react/')) return 'vendor-react';
          if (id.includes('node_modules/react-router') || id.includes('node_modules/turbo-stream') || id.includes('node_modules/@remix-run/')) return 'vendor-router';
          if (id.includes('node_modules/@radix-ui/')) return 'vendor-radix';
          if (id.includes('node_modules/@supabase/')) return 'vendor-supabase';
          if (id.includes('node_modules/@tanstack/')) return 'vendor-query';
          if (id.includes('node_modules/lucide-react')) return 'vendor-icons';
          if (id.includes('node_modules/react-hook-form') || id.includes('node_modules/@hookform/') || id.includes('node_modules/zod')) return 'vendor-form';
          if (id.includes('node_modules/date-fns')) return 'vendor-date';
          if (id.includes('node_modules/sonner')) return 'vendor-sonner';
          if (id.includes('node_modules/@dnd-kit/')) return 'vendor-dnd';
          if (id.includes('node_modules/jspdf-autotable')) return 'vendor-pdf-table';
          if (id.includes('node_modules/jspdf') || id.includes('node_modules/canvg') || id.includes('node_modules/rgbcolor') || id.includes('node_modules/stackblur-canvas')) return 'vendor-pdf';
          if (id.includes('node_modules/html2canvas') || id.includes('node_modules/css-line-break')) return 'vendor-html2canvas';
          if (id.includes('node_modules/recharts')) return 'vendor-recharts';
          if (id.includes('node_modules/victory-vendor') || id.includes('node_modules/d3-')) return 'vendor-d3';
          if (id.includes('node_modules/react-markdown') || id.includes('node_modules/remark-') || id.includes('node_modules/rehype-') || id.includes('node_modules/unified') || id.includes('node_modules/mdast-') || id.includes('node_modules/micromark') || id.includes('node_modules/hast-') || id.includes('node_modules/unist-')) return 'vendor-markdown';
          if (id.includes('node_modules/qrcode')) return 'vendor-qr';
          if (id.includes('node_modules/class-variance-authority') || id.includes('node_modules/clsx') || id.includes('node_modules/tailwind-merge') || id.includes('node_modules/cmdk') || id.includes('node_modules/vaul') || id.includes('node_modules/input-otp') || id.includes('node_modules/embla-carousel') || id.includes('node_modules/next-themes') || id.includes('node_modules/react-resizable-panels')) return 'vendor-ui-utils';
          if (id.includes('node_modules/@simplewebauthn/')) return 'vendor-webauthn';
          if (id.includes('node_modules/arabic-reshaper')) return 'vendor-arabic';
        },
      },
    },
    chunkSizeWarningLimit: 600,
    sourcemap: mode === 'production' ? false : 'hidden',
  },
}));
