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
    testTimeout: 15000,
    hookTimeout: 15000,
    maxWorkers: 4,
    minWorkers: 1,
    onConsoleLog(log) {
      // كل نمط مبرَّر — لا تضف نمطاً بدون سبب موثَّق.
      // إن ظهر log فيه /error/i لا يطابق أياً منها، لن يُكبَت (يفشل CI عند regression).
      const ALLOWED: Array<{ pattern: RegExp; reason: string }> = [
        { pattern: /Invalid prop `data-state` supplied to `React\.Fragment`/, reason: 'Radix UI warning معروف' },
        { pattern: /useAuth called outside AuthProvider/, reason: 'موك عام يوفّر useAuth افتراضياً' },
        { pattern: /was not wrapped in act\(\.\.\.\)/, reason: 'Suspense/lazy مغطى بـ waitFor' },
        { pattern: /^create error:|^delete error:/, reason: 'اختبارات معالجة أخطاء CRUD متوقّعة' },
        { pattern: /\[ProtectedRoute\]/, reason: 'مخرجات متوقّعة من اختبارات التوجيه' },
        { pattern: /فشل فحص الجهاز الجديد/, reason: 'اختبار WebAuthn فشل متعمَّد' },
      ];
      for (const { pattern } of ALLOWED) {
        if (pattern.test(log)) return false;
      }
      // أي رسالة أخرى — بما فيها [App Error]/Tenant payment error — تُظهَر.
      // إن كان مطلوباً كبتها في اختبار محدد، استخدم vi.spyOn(console, 'error') داخل الاختبار نفسه.
      return undefined;
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
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // stub للـ virtual module الذي يُولّده vite-plugin-pwa في الإنتاج فقط
      "virtual:pwa-register/react": path.resolve(
        __dirname,
        "./src/test/__mocks__/pwa-register-react.ts",
      ),
    },
  },
});
