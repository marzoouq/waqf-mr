// rebuild: 2026-04-02T00:00
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { reportPageLoadMetrics } from "./lib/performanceMonitor";
import { initThemeFromStorage } from "./lib/theme/themeColor.utils";
import { runPwaCacheGuard } from "./lib/pwaBootstrap";
import type { CacheGuardResult } from "./lib/pwaBootstrap";

// تهيئة الثيم المحفوظ قبل الرسم
initThemeFromStorage();

// Preconnect to backend API
const _supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
if (_supabaseUrl) {
  const link = document.createElement('link');
  link.rel = 'preconnect';
  link.href = _supabaseUrl;
  document.head.appendChild(link);
}

// ─── دالة مساعدة لإزالة الـ splash بأمان ───
function removeSplash() {
  const splash = document.getElementById('splash');
  if (splash) {
    splash.style.opacity = '0';
    splash.addEventListener('transitionend', () => splash.remove(), { once: true });
    setTimeout(() => splash.remove(), 500);
  }
}

// ─── Bootstrap: تشغيل حارس الكاش أولاً ثم الرسم ───
(async () => {
  try {
    // timeout خارجي شامل: إذا علقت runPwaCacheGuard لأي سبب (SW/Cache APIs مجمّدة
    // في بيئات Sandbox/Preview)، نُكمل الإقلاع بعد 3 ثوانٍ على أقصى تقدير
    const result = await Promise.race<CacheGuardResult>([
      runPwaCacheGuard(),
      new Promise<CacheGuardResult>(resolve =>
        setTimeout(() => {
          console.warn('[main] runPwaCacheGuard timeout (3s) — forcing continue');
          resolve('continue');
        }, 3000)
      ),
    ]);

    // إذا تقرر إعادة التحميل، لا نرسم ولا نزيل splash
    if (result === 'reloading') return;

    const rootEl = document.getElementById("root");
    if (!rootEl) throw new Error("Root element #root not found in DOM");

    createRoot(rootEl).render(
      <StrictMode>
        <App />
      </StrictMode>
    );

    // إزالة splash بعد الرسم الأول المستقر
    requestAnimationFrame(removeSplash);

    // مراقبة أداء التحميل
    reportPageLoadMetrics();

    // قياس Core Web Vitals
    import('./lib/webVitals').then(({ initWebVitals }) => initWebVitals());
  } catch (err) {
    // شبكة أمان: إذا فشل الإقلاع لأي سبب، نُزيل الـ splash لمنع تجمّد الشاشة
    console.error('[main] Bootstrap failed:', err);
    removeSplash();
  }
})();
