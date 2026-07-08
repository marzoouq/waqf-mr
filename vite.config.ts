import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";
import { visualizer } from "rollup-plugin-visualizer";
import { mcpPlugin } from "@lovable.dev/mcp-js/stacks/supabase/vite";
import pkg from "./package.json";

const chunkRules: ReadonlyArray<{
  match: (id: string) => boolean;
  name: string;
}> = [
  { match: (id) => id.includes('node_modules/react-dom'), name: 'vendor-react' },
  { match: (id) => id.includes('node_modules/react/'), name: 'vendor-react' },
  {
    match: (id) =>
      id.includes('node_modules/react-router') ||
      id.includes('node_modules/turbo-stream') ||
      id.includes('node_modules/@remix-run/'),
    name: 'vendor-router',
  },
  { match: (id) => id.includes('node_modules/@radix-ui/'), name: 'vendor-radix' },
  { match: (id) => id.includes('node_modules/@supabase/'), name: 'vendor-supabase' },
  { match: (id) => id.includes('node_modules/@tanstack/'), name: 'vendor-query' },
  { match: (id) => id.includes('node_modules/lucide-react'), name: 'vendor-icons' },
  { match: (id) => id.includes('node_modules/zod'), name: 'vendor-form' },
  { match: (id) => id.includes('node_modules/date-fns'), name: 'vendor-date' },
  { match: (id) => id.includes('node_modules/sonner'), name: 'vendor-sonner' },
  { match: (id) => id.includes('node_modules/@dnd-kit/'), name: 'vendor-dnd' },
  { match: (id) => id.includes('node_modules/jspdf-autotable'), name: 'vendor-pdf-table' },
  {
    match: (id) =>
      id.includes('node_modules/canvg') ||
      id.includes('node_modules/rgbcolor') ||
      id.includes('node_modules/stackblur-canvas'),
    name: 'vendor-pdf-svg',
  },
  {
    match: (id) => id.includes('node_modules/jspdf') || id.includes('node_modules/arabic-reshaper'),
    name: 'vendor-pdf',
  },
  { match: (id) => id.includes('node_modules/recharts'), name: 'vendor-recharts' },
  {
    match: (id) => id.includes('node_modules/victory-vendor') || id.includes('node_modules/d3-'),
    name: 'vendor-d3',
  },
  {
    match: (id) =>
      id.includes('node_modules/react-markdown') ||
      id.includes('node_modules/remark-') ||
      id.includes('node_modules/rehype-') ||
      id.includes('node_modules/unified') ||
      id.includes('node_modules/mdast-') ||
      id.includes('node_modules/micromark') ||
      id.includes('node_modules/hast-') ||
      id.includes('node_modules/unist-'),
    name: 'vendor-markdown',
  },
  { match: (id) => id.includes('node_modules/qrcode'), name: 'vendor-qr' },
  {
    match: (id) =>
      id.includes('node_modules/class-variance-authority') ||
      id.includes('node_modules/clsx') ||
      id.includes('node_modules/tailwind-merge') ||
      id.includes('node_modules/cmdk') ||
      id.includes('node_modules/vaul') ||
      id.includes('node_modules/input-otp') ||
      id.includes('node_modules/embla-carousel') ||
      id.includes('node_modules/next-themes') ||
      id.includes('node_modules/react-resizable-panels'),
    name: 'vendor-ui-utils',
  },
  { match: (id) => id.includes('node_modules/@simplewebauthn/'), name: 'vendor-webauthn' },
];

function getManualChunks(id: string): string | undefined {
  for (const rule of chunkRules) {
    if (rule.match(id)) return rule.name;
  }
  return undefined;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const pwaRuntimeCaching: any[] = [
  {
    urlPattern: ({ request }: { request: Request }) => request.mode === 'navigate',
    handler: 'NetworkFirst',
    options: {
      cacheName: 'html-navigations',
      networkTimeoutSeconds: 3,
      expiration: { maxEntries: 5, maxAgeSeconds: 60 * 60 * 24 },
    },
  },
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
  { urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/v1\/.*/i, handler: 'NetworkOnly' },
  { urlPattern: /^https:\/\/.*\.supabase\.co\/auth\/v1\/.*/i, handler: 'NetworkOnly' },
  { urlPattern: /^https:\/\/.*\.supabase\.co\/functions\/v1\/.*/i, handler: 'NetworkOnly' },
];

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
        runtimeCaching: pwaRuntimeCaching,

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
        manualChunks: getManualChunks,
      },
    },

    chunkSizeWarningLimit: 600,
    // تطوير: sourcemap كامل يمنع تجمّد DevTools عند فتح ملفات vendor الكبيرة
    sourcemap: mode === 'production' ? false : true,
  },
}));
