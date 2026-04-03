/**
 * منطق حماية كاش PWA — يُستدعى مرة واحدة عند بدء التطبيق
 * مُستخرج من main.tsx لفصل المسؤوليات
 */
import { logger } from './logger';

const APP_BUILD_ID = import.meta.env.VITE_APP_BUILD_ID || import.meta.env.VITE_APP_VERSION || '0.0.0';
const CACHE_VERSION_KEY = 'pwa_cache_version';
const PREVIEW_CACHE_KEY = 'preview_cache_cleared_for';

/** حارس iframe — لا نُسجّل SW داخل إطار */
const isInIframe = (() => {
  try { return window.self !== window.top; } catch { return true; }
})();

const isPreviewHost =
  window.location.hostname.includes('id-preview--') ||
  window.location.hostname.endsWith('.lovableproject.com') ||
  window.location.hostname.includes('-preview--') ||
  window.location.hostname === 'localhost';

export async function runPwaCacheGuard(): Promise<void> {
  // في بيئة المعاينة أو iframe: فقط مسح الكاش بدون reload
  if (isPreviewHost || isInIframe) {
    try {
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map(r => r.unregister()));
      }
      const names = await caches.keys();
      await Promise.all(names.map(name => caches.delete(name)));
    } catch (error) {
      logger.warn('[PWA] تعذر مسح الكاش في المعاينة', error);
    }
    return;
  }

  // بيئة الإنتاج فقط
  try {
    const stored = localStorage.getItem(CACHE_VERSION_KEY);
    if (stored && stored !== APP_BUILD_ID) {
      const names = await caches.keys();
      await Promise.all(names.map(name => caches.delete(name)));

      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map(r => r.update()));
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
    logger.warn('[PWA] تعذر تنفيذ حماية الكاش', error);
  }
}
