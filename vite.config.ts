import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor: React core
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // Charts library (~200KB)
          'vendor-charts': ['recharts'],
          // PDF generation (~400KB)
          'vendor-pdf': ['jspdf', 'jspdf-autotable'],
          // UI primitives
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
          // Supabase client
          'vendor-supabase': ['@supabase/supabase-js'],
          // TanStack Query
          'vendor-query': ['@tanstack/react-query'],
          // Markdown renderer (AI assistant only)
          'vendor-markdown': ['react-markdown'],
        },
      },
    },
    // Increase chunk warning limit
    chunkSizeWarningLimit: 600,
  },
}));
