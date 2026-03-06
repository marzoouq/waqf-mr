import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initThemeFromStorage } from "./components/ThemeColorPicker";

// Apply saved theme before render
initThemeFromStorage();

// ─── Suppress benign forwardRef warnings ───
if (import.meta.env.DEV) {
  const origConsoleError = console.error;
  console.error = (...args: unknown[]) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Function components cannot be given refs')
    ) {
      return;
    }
    origConsoleError.apply(console, args);
  };
}

// ─── PWA: Purge ALL stale caches on version change ───
const APP_CACHE_VERSION = import.meta.env.VITE_APP_VERSION || '0.0.0';
const CACHE_VERSION_KEY = 'pwa_cache_version';

(async () => {
  try {
    const stored = localStorage.getItem(CACHE_VERSION_KEY);
    if (stored && stored !== APP_CACHE_VERSION) {
      const names = await caches.keys();
      await Promise.all(names.map(n => caches.delete(n)));

      // Update SW instead of unregister to maintain offline support
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map(r => r.update()));
      }

      localStorage.setItem(CACHE_VERSION_KEY, APP_CACHE_VERSION);
      // Use localStorage with timestamp so toast survives tab close
      try {
        localStorage.setItem('pwa_just_updated', JSON.stringify({
          version: APP_CACHE_VERSION,
          ts: Date.now(),
        }));
      } catch {}
      window.location.reload();
      return;
    }
    localStorage.setItem(CACHE_VERSION_KEY, APP_CACHE_VERSION);
  } catch {
    // caches API unavailable (e.g. incognito) — ignore
  }
})();

const rootEl = document.getElementById("root");
if (!rootEl) throw new Error("Root element #root not found in DOM");

createRoot(rootEl).render(
  <StrictMode>
    <App />
  </StrictMode>
);
