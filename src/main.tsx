// rebuild: 2026-04-01T11:00
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { reportPageLoadMetrics } from "./lib/performanceMonitor";
import { initThemeFromStorage } from "./lib/theme/themeColor.utils";
import { runPwaCacheGuard } from "./lib/pwaBootstrap";

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

// ─── Bootstrap: تشغيل حارس الكاش أولاً ثم الرسم ───
(async () => {
  const result = await runPwaCacheGuard();

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
  requestAnimationFrame(() => {
    const splash = document.getElementById('splash');
    if (splash) {
      splash.style.opacity = '0';
      splash.addEventListener('transitionend', () => splash.remove(), { once: true });
      setTimeout(() => splash.remove(), 500);
    }
  });

  // مراقبة أداء التحميل
  reportPageLoadMetrics();

  // قياس Core Web Vitals
  import('./lib/webVitals').then(({ initWebVitals }) => initWebVitals());
})();
