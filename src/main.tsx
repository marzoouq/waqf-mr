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

// ─── دالة مساعدة لإزالة الـ splash بأمان ───
function removeSplash() {
  const splash = document.getElementById('splash');
  if (splash) {
    splash.style.opacity = '0';
    splash.addEventListener('transitionend', () => splash.remove(), { once: true });
    setTimeout(() => splash.remove(), 500);
  }
}

// ─── رسم التطبيق مباشرة ───
function renderApp() {
  const rootEl = document.getElementById("root");
  if (!rootEl) throw new Error("Root element #root not found in DOM");

  createRoot(rootEl).render(
    <StrictMode>
      <App />
    </StrictMode>
  );

  requestAnimationFrame(removeSplash);
  reportPageLoadMetrics();
  import('./lib/webVitals').then(({ initWebVitals }) => initWebVitals()).catch(() => {});
}

// ─── Bootstrap بسيط: cache guard ثم render ───
runPwaCacheGuard()
  .catch(() => 'continue' as const)
  .then((result) => {
    if (result === 'reloading') return;
    renderApp();
  })
  .catch((err) => {
    console.error('[main] Bootstrap failed:', err);
    // شبكة أمان: حاول الرسم على أي حال
    try { renderApp(); } catch {
      const loader = document.getElementById('splash-loader');
      const errorEl = document.getElementById('splash-error');
      if (loader) loader.style.display = 'none';
      if (errorEl) errorEl.style.display = 'block';
    }
  });
