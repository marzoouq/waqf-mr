import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import pkg from "./package.json";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  return {
    define: {
      "__APP_VERSION__": JSON.stringify(pkg.version),
      "__APP_BUILD_ID__": JSON.stringify(pkg.version),
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
  };
});