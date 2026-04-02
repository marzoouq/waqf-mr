/**
 * منطق حماية كاش PWA — يُستدعى مرة واحدة عند بدء التطبيق
 * يُرجع حالة واضحة: 'continue' | 'reloading'
 *
 * إصلاح جنائي: كل await حرجة محمية بـ withTimeout() لمنع التعليق اللانهائي
 * في بيئات Sandbox/Preview حيث تُجمّد navigator.serviceWorker و caches APIs.
 */
import { logger } from './logger';

const APP_BUILD_ID = import.meta.env.VITE_APP_BUILD_ID || import.meta.env.VITE_APP_VERSION || '0.0.0';
const CACHE_VERSION_KEY = 'pwa_cache_version';
const RELOAD_GUARD_KEY = 'pwa_reload_ts';
const RELOAD_COOLDOWN = 10_000;

const isPreviewHost =
  window.location.hostname.indexOf('id-preview--') !== -1 ||
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

/**
 * يلف أي Promise بـ timeout — إذا لم تُحل خلال ms مللي ثانية
 * تُحل تلقائياً بقيمة fallback بدلاً من التعليق اللانهائي.
 * هذا هو الإصلاح الجوهري لمشكلة تجميد SW/Cache APIs في بيئة المعاينة.
 */
function withTimeout<T>(p: Promise<T>, fallback: T, ms = 2000): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>(resolve => setTimeout(() => resolve(fallback), ms)),
  ]);
}

export type CacheGuardResult = 'continue' | 'reloading';

export async function runPwaCacheGuard(): Promise<CacheGuardResult> {
  try {
    // في بيئة المعاينة: تنظيف فقط بدون reload — لمنع الوميض
    if (isPreviewHost) {
      if ('serviceWorker' in navigator) {
        // timeout 1.5s: getRegistrations() قد تتجمد في Sandbox
        const registrations = await withTimeout(
          navigator.serviceWorker.getRegistrations(),
          [] as ServiceWorkerRegistration[],
          1500
        );
        // timeout 1s لكل unregister على حدة
        await Promise.all(
          registrations.map(r =>
            withTimeout(r.unregister(), false, 1000).catch(() => false)
          )
        );
      }

      // timeout 1.5s: caches.keys() قد تتجمد في Sandbox
      const names = await withTimeout(caches.keys(), [] as string[], 1500);
      if (names.length > 0) {
        await Promise.all(
          names.map(name =>
            withTimeout(caches.delete(name), false, 1000).catch(() => false)
          )
        );
        logger.info('[PWA] تم تنظيف كاش المعاينة بدون reload');
      }

      localStorage.setItem(CACHE_VERSION_KEY, APP_BUILD_ID);
      return 'continue';
    }

    // الموقع المنشور: سلوك التحديث الكامل
    const stored = localStorage.getItem(CACHE_VERSION_KEY);
    if (stored && stored !== APP_BUILD_ID) {
      // timeout 2s لـ caches.keys() في الموقع المنشور أيضاً
      const names = await withTimeout(caches.keys(), [] as string[], 2000);
      await Promise.all(
        names.map(name =>
          withTimeout(caches.delete(name), false, 1000).catch(() => false)
        )
      );

      if ('serviceWorker' in navigator) {
        const registrations = await withTimeout(
          navigator.serviceWorker.getRegistrations(),
          [] as ServiceWorkerRegistration[],
          2000
        );
        await Promise.all(
          registrations.map(r =>
            withTimeout(r.update().then(() => {}), undefined as void, 2000).catch(() => undefined)
          )
        );
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