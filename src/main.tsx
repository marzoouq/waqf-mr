import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initThemeFromStorage } from "./components/ThemeColorPicker";

// Apply saved theme before render
initThemeFromStorage();

// ─── Suppress benign forwardRef warnings (React 18 StrictMode dev artifact) ───
const origConsoleError = console.error;
console.error = (...args: unknown[]) => {
  if (typeof args[0] === 'string' && args[0].includes('Function components cannot be given refs')) {
    return;
  }
  origConsoleError.apply(console, args);
};

// ─── PWA: Purge ALL stale caches on version change ───
const APP_CACHE_VERSION = 'v-' + (import.meta.env.VITE_BUILD_TIME || Date.now());
const CACHE_VERSION_KEY = 'pwa_cache_version';

(async () => {
  try {
    const stored = localStorage.getItem(CACHE_VERSION_KEY);
    if (stored && stored !== APP_CACHE_VERSION) {
      // Version changed — wipe ALL caches including workbox-precache
      const names = await caches.keys();
      await Promise.all(names.map(n => caches.delete(n)));

      // Unregister old Service Workers to force fresh install
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map(r => r.unregister()));
      }

      localStorage.setItem(CACHE_VERSION_KEY, APP_CACHE_VERSION);
      // Reload to pick up new assets
      window.location.reload();
      return;
    }
    localStorage.setItem(CACHE_VERSION_KEY, APP_CACHE_VERSION);
  } catch {
    // caches API unavailable (e.g. incognito) — ignore
  }
})();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
