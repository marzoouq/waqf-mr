import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    onConsoleLog(log) {
      if (log.includes('Invalid prop `data-state` supplied to `React.Fragment`')) return false;
      if (log.includes('useAuth called outside AuthProvider')) return false;
    },
    coverage: {
      provider: "v8",
      include: [
        "src/hooks/**/*.ts",
        "src/utils/**/*.ts",
        "src/contexts/**/*.tsx",
        "src/components/**/*.tsx",
        "src/pages/**/*.tsx",
      ],
      exclude: [
        "src/**/*.test.*",
        "src/**/*.spec.*",
        "src/test/**",
        "src/components/ui/**",
        "src/integrations/**",
        "src/vite-env.d.ts",
        "src/vite-pwa.d.ts",
      ],
      reporter: ["text", "text-summary", "json", "lcov"],
      thresholds: {
        statements: 60,
        branches: 60,
        functions: 60,
        lines: 60,
      },
    },
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
