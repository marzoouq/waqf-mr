import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";
import { visualizer } from "rollup-plugin-visualizer";
import { mcpPlugin } from "@lovable.dev/mcp-js/stacks/supabase/vite";
import pkg from "./package.json";
import { getManualChunks } from "./build/chunks";
import { PWA_RUNTIME_CACHING } from "./build/pwa-runtime-caching";


// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => ({
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
    command === "serve" && mcpPlugin(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: 'prompt',
      // التسجيل الوحيد للـ SW يتم عبر SwUpdateBanner مع حارس preview/iframe/dev.
      // 'auto' كان يحقن تسجيلاً مستقلاً يلتف على الحارس.
      injectRegister: null,
      devOptions: {
        enabled: false,
      },
      includeAssets: ['favicon.ico', 'pwa-192x192.png', 'pwa-512x512.png'],
      workbox: {
        cleanupOutdatedCaches: true,
        skipWaiting: false,
        clientsClaim: false,
        // index.html مُستبعد عمداً من precache → نُعطّل navigateFallback لمنع
        // workbox من استدعاء createHandlerBoundToURL('index.html') ورمي
        // non-precached-url. التنقل يُخدم عبر NetworkFirst في runtimeCaching.
        navigateFallback: null,
        // index.html مُستبعد عمداً من precache — يُخدم عبر NetworkFirst أدناه.
        // هذا يضمن أن بمب النسخة وحده لا يُولّد SW جديد؛ يحتاج تغيير محتوى JS/CSS فعلي.
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
        globPatterns: ['**/*.{js,css,ico,png,svg,woff2,ttf}'],
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
        runtimeCaching: PWA_RUNTIME_CACHING,

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
    // المهمة A — bundle analyzer شرطي عند `vite build --mode analyze`
    mode === "analyze" && visualizer({
      filename: "/mnt/documents/stats.html",
      template: "treemap",
      gzipSize: true,
      brotliSize: true,
      open: false,
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime"],
  },
  build: {
    modulePreload: {
      polyfill: true,
      // استثناء حزم PDF/html2canvas الثقيلة من modulepreload
      // تُحمَّل فقط عند أول dynamic import فعلي (زر تصدير)
      resolveDependencies: (_filename, deps) => {
        return deps.filter(
          (dep) =>
            !dep.includes('vendor-pdf') &&
            !dep.includes('vendor-pdf-table') &&
            !dep.includes('vendor-pdf-svg') &&
            !dep.includes('vendor-qr') &&
            !dep.includes('html2canvas'),
        );
      },
    },
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
          if (id.includes('node_modules/zod')) return 'vendor-form';
          if (id.includes('node_modules/date-fns')) return 'vendor-date';
          if (id.includes('node_modules/sonner')) return 'vendor-sonner';
          if (id.includes('node_modules/@dnd-kit/')) return 'vendor-dnd';
          if (id.includes('node_modules/jspdf-autotable')) return 'vendor-pdf-table';
          // فصل canvg/SVG-to-PDF عن jspdf — يُحمَّل فقط عند طباعة SVG (نادر)
          if (id.includes('node_modules/canvg') || id.includes('node_modules/rgbcolor') || id.includes('node_modules/stackblur-canvas')) return 'vendor-pdf-svg';
          // arabic-reshaper مستخدم فقط مع PDF — ضمّه إلى vendor-pdf لتقليل عدد chunks
          if (id.includes('node_modules/jspdf') || id.includes('node_modules/arabic-reshaper')) return 'vendor-pdf';

          if (id.includes('node_modules/recharts')) return 'vendor-recharts';
          if (id.includes('node_modules/victory-vendor') || id.includes('node_modules/d3-')) return 'vendor-d3';
          if (id.includes('node_modules/react-markdown') || id.includes('node_modules/remark-') || id.includes('node_modules/rehype-') || id.includes('node_modules/unified') || id.includes('node_modules/mdast-') || id.includes('node_modules/micromark') || id.includes('node_modules/hast-') || id.includes('node_modules/unist-')) return 'vendor-markdown';
          if (id.includes('node_modules/qrcode')) return 'vendor-qr';
          if (id.includes('node_modules/class-variance-authority') || id.includes('node_modules/clsx') || id.includes('node_modules/tailwind-merge') || id.includes('node_modules/cmdk') || id.includes('node_modules/vaul') || id.includes('node_modules/input-otp') || id.includes('node_modules/embla-carousel') || id.includes('node_modules/next-themes') || id.includes('node_modules/react-resizable-panels')) return 'vendor-ui-utils';
          if (id.includes('node_modules/@simplewebauthn/')) return 'vendor-webauthn';
        },
      },
    },
    chunkSizeWarningLimit: 600,
    // تطوير: sourcemap كامل يمنع تجمّد DevTools عند فتح ملفات vendor الكبيرة
    sourcemap: mode === 'production' ? false : true,
  },
}));
