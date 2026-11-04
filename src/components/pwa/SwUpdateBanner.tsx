import { useRegisterSW } from "virtual:pwa-register/react";
import { useState, useEffect, useCallback, useRef } from "react";
import { RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { safeGet, safeSet } from '@/lib/storage';
import { canRegisterAppServiceWorker } from '@/lib/pwaBootstrap';

const RELOAD_FALLBACK_MS = 3000;                // إعادة تحميل قسرية إن لم تصل إشارة التحكم
const PERIODIC_CHECK_MS = 5 * 60 * 1000;       // فحص كل 5 دقائق بدل 60ث
const SNOOZE_MS = 30 * 60 * 1000;              // 30 دقيقة snooze افتراضي
const SNOOZE_VERSION_TTL_MS = 24 * 60 * 60 * 1000; // لا نُعيد عرض نفس النسخة قبل 24ساعة
const SNOOZED_VERSION_KEY = 'pwa_snoozed_version';

interface SnoozedVersion { sw: string; ts: number }

/**
 * المكون الخارجي: حارس صارم يمنع استدعاء useRegisterSW داخل preview/iframe/dev.
 * بدون هذا الحارس يقوم vite-plugin-pwa بتسجيل SW حتى في بيئات لا يجب أن يُسجَّل فيها.
 */
const SwUpdateBanner = () => {
  if (!canRegisterAppServiceWorker()) return null;
  return <SwUpdateBannerInner />;
};

const SwUpdateBannerInner = () => {
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);
  const [updating, setUpdating] = useState(false);
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      if (!registration) return;
      registrationRef.current = registration;
      const check = () => { registration.update().catch(() => undefined); };
      // فحص فوري عند الفتح، وعند العودة للتطبيق، ثم كل 5 دقائق
      check();
      const onVisible = () => { if (document.visibilityState === 'visible') check(); };
      document.addEventListener('visibilitychange', onVisible);
      setInterval(check, PERIODIC_CHECK_MS);
    },
  });

  const [snoozedUntil, setSnoozedUntil] = useState<number>(0);

  // عند انتهاء snooze، نُعيد فتح البانر تلقائياً
  useEffect(() => {
    if (!snoozedUntil) return;
    const remaining = snoozedUntil - Date.now();
    if (remaining <= 0) return;
    const timer = setTimeout(() => setSnoozedUntil(0), remaining);
    return () => clearTimeout(timer);
  }, [snoozedUntil]);

  // حارس "نسخة مرفوضة سابقاً" — يمنع إعادة العرض لنفس SW خلال 24 ساعة
  // ملاحظة: نستخدم بصمة بسيطة (طول precache manifest) عبر `needRefresh` toggle.
  // workbox يعيد إصدار needRefresh لكل SW جديد، فيكفينا تخزين علامة وقت + رقم نسخة التطبيق.
  const swFingerprint = (import.meta.env.VITE_APP_BUILD_ID as string | undefined) ?? 'unknown';

  useEffect(() => {
    if (!needRefresh) return;
    const stored = safeGet<SnoozedVersion | null>(SNOOZED_VERSION_KEY, null);
    if (stored && typeof stored === 'object' && stored.sw === swFingerprint) {
      if (Date.now() - stored.ts < SNOOZE_VERSION_TTL_MS) {
        // نفس النسخة المرفوضة سابقاً وما زالت ضمن TTL — لا نُظهر البانر
        setNeedRefresh(false);
      }
    }
  }, [needRefresh, swFingerprint, setNeedRefresh]);

  const handleUpdate = useCallback(() => {
    // علم لـ PwaUpdateNotifier ليعرض سجل التغييرات بعد reload — مصدر حقيقة وحيد
    safeSet('pwa_just_updated', { ts: Date.now(), version: swFingerprint });
    setUpdating(true);
    // أمر التفعيل مباشرة للنسخة المنتظرة — لا نعتمد على إشارة واحدة
    registrationRef.current?.waiting?.postMessage({ type: 'SKIP_WAITING' });
    void Promise.resolve(updateServiceWorker(true)).catch(() => undefined);
    setTimeout(() => window.location.reload(), RELOAD_FALLBACK_MS);
  }, [updateServiceWorker, swFingerprint]);

  const handleSnooze = useCallback(() => {
    // تذكُّر النسخة المرفوضة + snooze قصير الأمد
    safeSet(SNOOZED_VERSION_KEY, { sw: swFingerprint, ts: Date.now() });
    setNeedRefresh(false);
    setSnoozedUntil(Date.now() + SNOOZE_MS);
  }, [swFingerprint, setNeedRefresh]);

  if (!needRefresh) return null;

  return (
    <div
      className="fixed top-0 inset-x-0 z-[9999] bg-primary text-primary-foreground shadow-lg"
      dir="rtl"
      role="alert"
    >
      <div className="flex items-center justify-center gap-3 px-4 py-3 text-sm font-medium">
        <RefreshCw className="h-4 w-4 animate-spin" />
        <span>يوجد تحديث جديد للتطبيق</span>
        <Button
          size="sm"
          variant="secondary"
          onClick={handleUpdate}
          disabled={updating}
          className="h-7 px-3 text-xs font-bold"
        >
          {updating ? 'جاري التحديث...' : 'تحديث الآن'}
        </Button>
        <button
          onClick={handleSnooze}
          className="p-1 rounded-full hover:bg-primary-foreground/20 transition-colors"
          aria-label="لاحقاً"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default SwUpdateBanner;
