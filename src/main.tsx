import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initThemeFromStorage } from "./components/ThemeColorPicker";

// Apply saved theme before render
initThemeFromStorage();

// ─── PWA: Purge stale caches on version change ───
const APP_CACHE_VERSION = 'v-' + (import.meta.env.VITE_BUILD_TIME || Date.now());
const CACHE_VERSION_KEY = 'pwa_cache_version';

(async () => {
  try {
    const stored = localStorage.getItem(CACHE_VERSION_KEY);
    if (stored && stored !== APP_CACHE_VERSION) {
      // Version changed — wipe all caches except workbox-managed ones
      const names = await caches.keys();
      await Promise.all(
        names
          .filter(n => !n.startsWith('workbox-precache'))
          .map(n => caches.delete(n))
      );
      console.info('[PWA] Stale caches purged after update');
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
