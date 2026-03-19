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
    'import.meta.env.VITE_APP_BUILD_ID': JSON.stringify(`${pkg.version}-${Date.now()}`),
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
      includeAssets: ['favicon.ico', 'pwa-192x192.png', 'pwa-512x512.png'],
      workbox: {
        cleanupOutdatedCaches: true,
        skipWaiting: false,
        clientsClaim: true,
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/^\/~oauth/, /^\/api\//, /\.(?:png|jpg|jpeg|svg|gif|ico|webp)$/, /^\/fonts\//],
        globPatterns: ['**/*.{html,js,css,ico,png,svg,woff2,ttf}'],
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
        manualChunks(id) {
          // — مكتبات أساسية —
          if (id.includes('node_modules/react-dom')) return 'vendor-react';
          if (id.includes('node_modules/react-router')) return 'vendor-react';
          if (id.includes('node_modules/react/')) return 'vendor-react';

          // — Radix UI —
          if (id.includes('node_modules/@radix-ui/')) return 'vendor-radix';

          // — مكتبات بيانات —
          if (id.includes('node_modules/@supabase/')) return 'vendor-supabase';
          if (id.includes('node_modules/@tanstack/')) return 'vendor-query';

          // — أيقونات —
          if (id.includes('node_modules/lucide-react')) return 'vendor-icons';

          // — نماذج وتحقق —
          if (id.includes('node_modules/react-hook-form') || id.includes('node_modules/@hookform/') || id.includes('node_modules/zod')) return 'vendor-form';

          // — تواريخ —
          if (id.includes('node_modules/date-fns')) return 'vendor-date';

          // — إشعارات —
          if (id.includes('node_modules/sonner')) return 'vendor-sonner';

          // — سحب وإفلات —
          if (id.includes('node_modules/@dnd-kit/')) return 'vendor-dnd';

          // — PDF وتبعياتها —
          if (id.includes('node_modules/jspdf') || id.includes('node_modules/canvg') || id.includes('node_modules/html2canvas') || id.includes('node_modules/rgbcolor') || id.includes('node_modules/stackblur-canvas') || id.includes('node_modules/css-line-break')) return 'vendor-pdf';

          // — رسوم بيانية —
          if (id.includes('node_modules/recharts') || id.includes('node_modules/d3-') || id.includes('node_modules/victory-vendor')) return 'vendor-charts';

          // — Markdown —
          if (id.includes('node_modules/react-markdown') || id.includes('node_modules/remark-') || id.includes('node_modules/rehype-') || id.includes('node_modules/unified') || id.includes('node_modules/mdast-') || id.includes('node_modules/micromark') || id.includes('node_modules/hast-') || id.includes('node_modules/unist-')) return 'vendor-markdown';

          // — QR —
          if (id.includes('node_modules/qrcode')) return 'vendor-qr';

          // — أدوات UI مساعدة —
          if (id.includes('node_modules/class-variance-authority') || id.includes('node_modules/clsx') || id.includes('node_modules/tailwind-merge') || id.includes('node_modules/cmdk') || id.includes('node_modules/vaul') || id.includes('node_modules/input-otp') || id.includes('node_modules/embla-carousel') || id.includes('node_modules/next-themes') || id.includes('node_modules/react-resizable-panels')) return 'vendor-ui-utils';

          // — مصادقة بيومترية —
          if (id.includes('node_modules/@simplewebauthn/')) return 'vendor-webauthn';

          // — عربي —
          if (id.includes('node_modules/arabic-reshaper')) return 'vendor-arabic';
        },
      },
    },
    chunkSizeWarningLimit: 500,
    sourcemap: false,
  },
}));
