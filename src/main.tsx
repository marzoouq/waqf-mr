import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { reportPageLoadMetrics } from "./lib/performanceMonitor";
import { initThemeFromStorage } from "./components/themeColor.utils";
import { logger } from "./lib/logger";

// Apply saved theme before render
initThemeFromStorage();

// Preconnect to backend API — يقلل زمن أول طلب بـ 50-100ms
const _supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
if (_supabaseUrl) {
  const link = document.createElement('link');
  link.rel = 'preconnect';
  link.href = _supabaseUrl;
  document.head.appendChild(link);
}


// ─── PWA/cache guard: preview يجب أن يتجاوز أي كاش قديم دائماً ───
const APP_BUILD_ID = import.meta.env.VITE_APP_BUILD_ID || import.meta.env.VITE_APP_VERSION || '0.0.0';
const CACHE_VERSION_KEY = 'pwa_cache_version';
const PREVIEW_CACHE_KEY = 'preview_cache_cleared_for';
const isPreviewHost = window.location.hostname.endsWith('.lovable.app') || window.location.hostname.endsWith('.lovableproject.com');

(async () => {
  try {
    if (isPreviewHost) {
      const clearedFor = localStorage.getItem(PREVIEW_CACHE_KEY);
      if (clearedFor !== APP_BUILD_ID) {
        if ('serviceWorker' in navigator) {
          const registrations = await navigator.serviceWorker.getRegistrations();
          await Promise.all(registrations.map(r => r.unregister()));
        }

        const names = await caches.keys();
        await Promise.all(names.map((name) => caches.delete(name)));
        localStorage.setItem(PREVIEW_CACHE_KEY, APP_BUILD_ID);
        window.location.reload();
        return;
      }

      localStorage.setItem(CACHE_VERSION_KEY, APP_BUILD_ID);
      return;
    }

    const stored = localStorage.getItem(CACHE_VERSION_KEY);
    if (stored && stored !== APP_BUILD_ID) {
      const names = await caches.keys();
      await Promise.all(names.map((name) => caches.delete(name)));

      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((registration) => registration.update()));
      }

      localStorage.setItem(CACHE_VERSION_KEY, APP_BUILD_ID);
      try {
        localStorage.setItem('pwa_just_updated', JSON.stringify({
          version: APP_BUILD_ID,
          ts: Date.now(),
        }));
      } catch (error) {
        logger.warn('[PWA] تعذر حفظ علم التحديث', error);
      }
      window.location.reload();
      return;
    }

    localStorage.setItem(CACHE_VERSION_KEY, APP_BUILD_ID);
  } catch (error) {
    // caches API unavailable (e.g. incognito) — ignore
    logger.warn('[PWA] تعذر تنفيذ حماية الكاش', error);
  }
})();

const rootEl = document.getElementById("root");
if (!rootEl) throw new Error("Root element #root not found in DOM");

createRoot(rootEl).render(
  <StrictMode>
    <App />
  </StrictMode>
);

// مراقبة أداء التحميل
reportPageLoadMetrics();
