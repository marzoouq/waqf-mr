/**
 * منطق حماية كاش PWA — يُستدعى مرة واحدة عند بدء التطبيق.
 *
 * المسؤوليات:
 *   1) منع تسجيل أي SW داخل preview/iframe/dev، وإلغاء أي SW متسرّب سابقاً.
 *   2) تنظيف انتقائي صارم لكاشات Workbox الخاصة بالتطبيق فقط
 *      (لا نمسح كل caches.keys() — قد يحوي كاشات إشعارات/طرف ثالث مستقبلاً).
 *   3) إزالة أعلام sessionStorage القديمة المرتبطة بإصلاحات سابقة.
 *
 * مصدر الحقيقة لتسجيل SW في الإنتاج: `SwUpdateBanner` (useRegisterSW).
 */
import { logger } from './logger';

/** أسماء الكاشات التي ينتجها workbox runtimeCaching في vite.config.ts */
const APP_CACHE_PREFIXES = [
  'workbox-precache',
  'html-navigations',
  'static-assets',
  'lazy-vendor-chunks',
  'local-fonts',
  'images',
];

const STALE_STORAGE_KEYS = [
  'chunk_retry',
  'pwa_snoozed_version',
  'pwa_just_updated',
];

/** هل نحن داخل iframe؟ */
const isInIframe = (() => {
  try { return window.self !== window.top; } catch { return true; }
})();

/** هل المضيف هو بيئة معاينة/تطوير لا يجوز تسجيل SW فيها؟ */
function isPreviewOrDevHost(hostname: string): boolean {
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname.startsWith('id-preview--') ||
    hostname.startsWith('preview--') ||
    hostname.endsWith('.lovableproject.com') ||
    hostname.endsWith('.lovableproject-dev.com') ||
    hostname.endsWith('.lovable.dev')
  );
}

/** هل URL الحالي يطلب تعطيل SW يدوياً عبر ?sw=off ؟ */
function hasSwOffFlag(): boolean {
  try {
    return new URLSearchParams(window.location.search).get('sw') === 'off';
  } catch {
    return false;
  }
}

/**
 * البوابة الموحَّدة: هل يجوز تسجيل SW الآن؟
 * مستخدمة من `SwUpdateBanner` كذلك للتأكد من اتساق القرار.
 */
export function canRegisterAppServiceWorker(): boolean {
  if (typeof window === 'undefined') return false;
  if (!import.meta.env.PROD) return false;
  if (isInIframe) return false;
  if (hasSwOffFlag()) return false;
  if (isPreviewOrDevHost(window.location.hostname)) return false;
  return true;
}

/** هل اسم الكاش من إنتاج التطبيق؟ */
function isAppCacheName(name: string): boolean {
  return APP_CACHE_PREFIXES.some((p) => name === p || name.startsWith(`${p}-`));
}

async function unregisterAppServiceWorkers(): Promise<void> {
  if (!('serviceWorker' in navigator)) return;
  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(
      regs
        .filter((r) => {
          const url = r.active?.scriptURL || r.installing?.scriptURL || r.waiting?.scriptURL || '';
          // SW التطبيق ينتهي عادةً بـ /sw.js؛ نلغي فقط هذا حتى لا نلمس إشعارات/طرف ثالث.
          return url.endsWith('/sw.js') || url.endsWith('/service-worker.js');
        })
        .map((r) => r.unregister().catch(() => false)),
    );
  } catch (error) {
    logger.warn('[PWA] تعذر إلغاء تسجيل SW', error);
  }
}

async function deleteAppCaches(): Promise<void> {
  if (typeof caches === 'undefined') return;
  try {
    const names = await caches.keys();
    const toDelete = names.filter(isAppCacheName);
    await Promise.all(toDelete.map((n) => caches.delete(n).catch(() => false)));
  } catch (error) {
    logger.warn('[PWA] تعذر تنظيف caches التطبيق', error);
  }
}

function clearStaleStorageFlags(): void {
  try {
    for (const k of STALE_STORAGE_KEYS) {
      try { sessionStorage.removeItem(k); } catch { /* صامت */ }
      try { localStorage.removeItem(k); } catch { /* صامت */ }
    }
  } catch { /* صامت */ }
}

export async function runPwaCacheGuard(): Promise<void> {
  // في الإنتاج: لا نلمس شيئاً — workbox عبر SwUpdateBanner يتولى الإدارة.
  if (canRegisterAppServiceWorker()) {
    return;
  }

  // preview/iframe/dev/?sw=off: تنظيف صارم انتقائي.
  await unregisterAppServiceWorkers();
  await deleteAppCaches();
  clearStaleStorageFlags();
}
