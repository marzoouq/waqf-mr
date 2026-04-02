/**
 * منطق حماية كاش PWA — يُستدعى مرة واحدة عند بدء التطبيق
 * مُبسّط: لا reload في المعاينة، وreload واحد فقط في الإنتاج عند تغيّر الإصدار
 */
import { logger } from './logger';

const APP_BUILD_ID = __APP_BUILD_ID__ || __APP_VERSION__ || '0.0.0';
const CACHE_VERSION_KEY = 'pwa_cache_version';
const RELOAD_GUARD_KEY = 'pwa_reload_ts';
const RELOAD_COOLDOWN = 10_000;

const isPreviewOrIframe = (() => {
  const h = window.location.hostname;
  const inPreview = h.indexOf('id-preview--') !== -1 || h.endsWith('.lovableproject.com');
  let inIframe = false;
  try { inIframe = window.self !== window.top; } catch { inIframe = true; }
  return inPreview || inIframe;
})();

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
    // في بيئة المعاينة أو iframe: لا نفعل شيئاً — نتابع الرسم مباشرة
    if (isPreviewOrIframe) {
      localStorage.setItem(CACHE_VERSION_KEY, APP_BUILD_ID);
      return 'continue';
    }

    // الموقع المنشور فقط: تحقق من تغيّر الإصدار
    const stored = localStorage.getItem(CACHE_VERSION_KEY);
    if (stored && stored !== APP_BUILD_ID) {
      // مسح الكاش القديم
      const names = await caches.keys().catch(() => [] as string[]);
      await Promise.all(names.map(n => caches.delete(n).catch(() => false)));

      localStorage.setItem(CACHE_VERSION_KEY, APP_BUILD_ID);

      if (canReload()) {
        window.location.reload();
        return 'reloading';
      }
      logger.warn('[PWA] تم تخطي reload لمنع حلقة لا نهائية');
    }

    localStorage.setItem(CACHE_VERSION_KEY, APP_BUILD_ID);
    return 'continue';
  } catch (error) {
    logger.warn('[PWA] تعذر تنفيذ حماية الكاش', error);
    return 'continue';
  }
}
