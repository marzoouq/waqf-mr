import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initThemeFromStorage } from "./lib/theme/themeColor.utils";
import { initQueryMonitoring } from "./lib/initQueryMonitoring";
import { logger } from "./lib/logger";

/** إزالة شاشة البداية بأمان */
function removeSplash() {
  const splash = document.getElementById('splash');
  if (!splash) return;
  splash.style.opacity = '0';
  splash.addEventListener('transitionend', () => splash.remove(), { once: true });
  setTimeout(() => splash.remove(), 500);
}

// تهيئة الثيم المحفوظ قبل الرسم
initThemeFromStorage();

// تهيئة مراقبة أداء React Query
initQueryMonitoring();

// Preconnect to backend API — يقلل زمن أول طلب بـ 50-100ms
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
if (supabaseUrl) {
  const link = document.createElement('link');
  link.rel = 'preconnect';
  link.href = supabaseUrl;
  document.head.appendChild(link);
}

// ─── PWA/cache guard: غير معطّل — fire-and-forget بدون race/timeout ───
import("./lib/pwaBootstrap")
  .then(m => m.runPwaCacheGuard())
  .catch(() => { /* تجاهل — لا نمنع الإقلاع بسبب PWA */ });

// ─── React render ───
try {
  const rootEl = document.getElementById("root");
  if (!rootEl) throw new Error("Root element #root not found in DOM");

  createRoot(rootEl).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
} catch (error) {
  logger.error('[BOOT] فشل الإقلاع:', error);
  // عرض fallback HTML داخل #root قبل إزالة splash لمنع شاشة فارغة
  const rootEl = document.getElementById("root");
  if (rootEl && !rootEl.hasChildNodes()) {
    rootEl.innerHTML = `<div style="padding:2rem;text-align:center;font-family:sans-serif;direction:rtl"><h1>تعذّر تحميل التطبيق</h1><p>يرجى تحديث الصفحة. إذا استمرت المشكلة، تواصل مع الدعم.</p><button onclick="location.reload()" style="padding:0.5rem 1rem;cursor:pointer;margin-top:1rem">تحديث</button></div>`;
  }
} finally {
  removeSplash();
}

// #14 perf: تأجيل أدوات المراقبة إلى وقت الخمول لتحرير main thread أثناء الإقلاع
const idle: (cb: () => void) => void =
  typeof window !== 'undefined' && 'requestIdleCallback' in window
    ? (cb) => (window as Window & { requestIdleCallback: (cb: () => void) => void }).requestIdleCallback(cb)
    : (cb) => setTimeout(cb, 1500);

idle(() => {
  import('./lib/monitoring').then(m => m.reportPageLoadMetrics());
  import('./lib/monitoring/webVitals').then(m => m.initWebVitals());
});
