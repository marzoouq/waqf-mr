import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    onConsoleLog(log) {
      // تحذيرات Radix UI المعروفة
      if (log.includes('Invalid prop `data-state` supplied to `React.Fragment`')) return false;
      // تحذير useAuth خارج AuthProvider (مغطى بالموك العام)
      if (log.includes('useAuth called outside AuthProvider')) return false;
      // تحذيرات act() من مكونات Suspense/lazy (مغطاة بـ waitFor)
      if (log.includes('was not wrapped in act(...)')) return false;
      // مخرجات متوقعة من اختبارات معالجة الأخطاء
      if (log.includes('create error:') || log.includes('delete error:')) return false;
      if (log.includes('[ProtectedRoute]')) return false;
      if (log.includes('فشل فحص الجهاز الجديد')) return false;
      if (log.includes('[App Error]')) return false;
      if (log.includes('Tenant payment error')) return false;
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
