// rebuild: 2026-04-01T10:15
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { reportPageLoadMetrics } from "./lib/performanceMonitor";
import { initThemeFromStorage } from "./lib/theme/themeColor.utils";
import { setPerformanceToast } from "./lib/performanceMonitor";
import { toast as sonnerToast } from "sonner";
import { runPwaCacheGuard } from "./lib/pwaBootstrap";

// تهيئة الثيم المحفوظ قبل الرسم
initThemeFromStorage();

// ربط دالة التنبيه بمراقب الأداء (كان سابقاً في App.tsx)
setPerformanceToast((msg, opts) => sonnerToast.warning(msg, opts));

// Preconnect to backend API — يقلل زمن أول طلب بـ 50-100ms
const _supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
if (_supabaseUrl) {
  const link = document.createElement('link');
  link.rel = 'preconnect';
  link.href = _supabaseUrl;
  document.head.appendChild(link);
}

// ─── PWA/cache guard: preview يجب أن يتجاوز أي كاش قديم دائماً ───
runPwaCacheGuard();

const rootEl = document.getElementById("root");
if (!rootEl) throw new Error("Root element #root not found in DOM");

createRoot(rootEl).render(
  <StrictMode>
    <App />
  </StrictMode>
);

// إزالة splash screen بعد تحميل React
const splash = document.getElementById('splash');
if (splash) {
  splash.style.opacity = '0';
  splash.addEventListener('transitionend', () => splash.remove(), { once: true });
  // fallback في حال لم يعمل transitionend
  setTimeout(() => splash.remove(), 500);
}

// مراقبة أداء التحميل
reportPageLoadMetrics();

// قياس Core Web Vitals (LCP, CLS, INP)
import('./lib/webVitals').then(({ initWebVitals }) => initWebVitals());
