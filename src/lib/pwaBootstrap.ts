/**
 * منطق حماية كاش PWA — يُستدعى مرة واحدة عند بدء التطبيق.
 *
 * المسؤولية الوحيدة بعد إصلاح Update Loop:
 *   - في بيئة المعاينة/iframe (Lovable sandbox): إلغاء تسجيل أي SW متسرّب ومسح الكاش
 *     لمنع تثبيت SW داخل preview.
 *
 * في الإنتاج: لا نفعل شيئاً هنا. اكتشاف التحديث + reload مسؤولية workbox عبر
 * `SwUpdateBanner` (registerType: 'prompt') — مصدر الحقيقة الوحيد للتحديثات.
 *
 * لماذا أُزيل المنطق القديم؟ كان يقارن APP_BUILD_ID (= pkg.version) ويفرض reload
 * عند أي اختلاف. مع auto-version-on-every-push، النسخة تختلف دائماً → reload قسري
 * في كل cold launch حتى لو لم يتغيّر JS/CSS فعلاً.
 */
import { logger } from './logger';

/** حارس iframe — لا نسمح بـ SW داخل إطار */
const isInIframe = (() => {
  try { return window.self !== window.top; } catch { return true; }
})();

const isPreviewHost =
  window.location.hostname.includes('id-preview--') ||
  window.location.hostname.endsWith('.lovableproject.com') ||
  window.location.hostname.includes('-preview--') ||
  window.location.hostname === 'localhost';

export async function runPwaCacheGuard(): Promise<void> {
  if (!(isPreviewHost || isInIframe)) {
    // الإنتاج: workbox يتولى كل شيء.
    return;
  }

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
}
