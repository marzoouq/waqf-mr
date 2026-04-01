/**
 * منطق حماية كاش PWA — يُستدعى مرة واحدة عند بدء التطبيق
 * يُرجع حالة واضحة: 'continue' | 'reloading'
 */
import { logger } from './logger';

const APP_BUILD_ID = import.meta.env.VITE_APP_BUILD_ID || import.meta.env.VITE_APP_VERSION || '0.0.0';
const CACHE_VERSION_KEY = 'pwa_cache_version';
const RELOAD_GUARD_KEY = 'pwa_reload_ts';
const RELOAD_COOLDOWN = 10_000;

const isPreviewHost =
  window.location.hostname.endsWith('.lovable.app') ||
  window.location.hostname.endsWith('.lovableproject.com');

/** يمنع أكثر من reload واحد كل 10 ثوانٍ */
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

export type CacheGuardResult = 'continue' | 'reloading';

export async function runPwaCacheGuard(): Promise<CacheGuardResult> {
  try {
    // في بيئة المعاينة: تنظيف فقط بدون reload — لمنع الوميض
    if (isPreviewHost) {
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map(r => r.unregister()));
      }
      const names = await caches.keys();
      if (names.length > 0) {
        await Promise.all(names.map(name => caches.delete(name)));
        logger.info('[PWA] تم تنظيف كاش المعاينة بدون reload');
      }
      localStorage.setItem(CACHE_VERSION_KEY, APP_BUILD_ID);
      return 'continue';
    }

    // الموقع المنشور: سلوك التحديث الكامل
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

      if (canReload()) {
        window.location.reload();
        return 'reloading';
      }
      logger.warn('[PWA] تم تخطي reload لمنع حلقة لا نهائية');
      return 'continue';
    }

    localStorage.setItem(CACHE_VERSION_KEY, APP_BUILD_ID);
    return 'continue';
  } catch (error) {
    logger.warn('[PWA] تعذر تنفيذ حماية الكاش', error);
    return 'continue';
  }
}
