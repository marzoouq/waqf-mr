/**
 * تنظيف أي Service Worker أو Cache قديم من النسخ السابقة.
 * بعد إزالة PWA من المشروع نُجبر إعادة تحميل واحدة فقط
 * لضمان جلب CSS/JS الحديثة وعدم بقاء واجهة قديمة أو مكسورة.
 */
import { logger } from './logger';

const CACHE_VERSION_KEY = 'pwa_cache_version';
const RELOAD_GUARD_KEY = 'pwa_cleanup_reload_ts';
const RELOAD_COOLDOWN = 10_000;
const DISABLED_PWA_VERSION = 'legacy-pwa-disabled';

const isPreviewHost =
  window.location.hostname.indexOf('id-preview--') !== -1 ||
  window.location.hostname.endsWith('.lovableproject.com');

function canReload(): boolean {
  try {
    const last = sessionStorage.getItem(RELOAD_GUARD_KEY);
    const now = Date.now();
    if (last && now - Number(last) < RELOAD_COOLDOWN) return false;
    sessionStorage.setItem(RELOAD_GUARD_KEY, now.toString());
    return true;
  } catch {
    return true;
  }
}

function withTimeout<T>(promise: Promise<T>, fallback: T, ms = 1200): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}

export type CacheGuardResult = 'continue' | 'reloading';

export async function runPwaCacheGuard(): Promise<CacheGuardResult> {
  try {
    const registrations = 'serviceWorker' in navigator
      ? await withTimeout(navigator.serviceWorker.getRegistrations(), [] as ServiceWorkerRegistration[])
      : [];

    const cacheNames = typeof caches !== 'undefined'
      ? await withTimeout(caches.keys(), [] as string[])
      : [];

    const hadLegacyPwa = registrations.length > 0 || cacheNames.length > 0;

    if (registrations.length > 0) {
      await Promise.all(
        registrations.map((registration) =>
          withTimeout(registration.unregister(), false, 800).catch(() => false)
        )
      );
    }

    if (cacheNames.length > 0) {
      await Promise.all(
        cacheNames.map((name) => withTimeout(caches.delete(name), false, 800).catch(() => false))
      );
    }

    localStorage.setItem(CACHE_VERSION_KEY, DISABLED_PWA_VERSION);

    if (hadLegacyPwa && canReload()) {
      logger.info(
        `[PWA] تم تنظيف الـ Service Worker والكاش القديم${isPreviewHost ? ' في المعاينة' : ''} — إعادة تحميل واحدة`
      );
      window.location.reload();
      return 'reloading';
    }

    return 'continue';
  } catch (error) {
    logger.warn('[PWA] تعذر تنظيف Service Worker أو الكاش القديم', error);
    return 'continue';
  }
}
