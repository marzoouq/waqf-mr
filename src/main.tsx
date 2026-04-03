// rebuild: 2026-04-03T23:00
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { reportPageLoadMetrics } from "./lib/monitoring";
import { initThemeFromStorage } from "./lib/theme/themeColor.utils";
import { initQueryMonitoring } from "./lib/initQueryMonitoring";

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
const _supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
if (_supabaseUrl) {
  const link = document.createElement('link');
  link.rel = 'preconnect';
  link.href = _supabaseUrl;
  document.head.appendChild(link);
}

// ─── PWA/cache guard: آمن ومحدود بمهلة زمنية ───
try {
  const { runPwaCacheGuard } = await import("./lib/pwaBootstrap");
  await Promise.race([
    runPwaCacheGuard(),
    new Promise((_, reject) => setTimeout(() => reject(new Error('PWA timeout')), 3000)),
  ]);
} catch {
  // تجاهل — لا نمنع الإقلاع بسبب PWA
}

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
  // eslint-disable-next-line no-console
  console.error('[BOOT] فشل الإقلاع:', error);
} finally {
  removeSplash();
}

// مراقبة أداء التحميل
reportPageLoadMetrics();

// تهيئة Core Web Vitals
import('./lib/monitoring/webVitals').then(m => m.initWebVitals());
