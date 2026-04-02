import { useRegisterSW } from "virtual:pwa-register/react";
import { useState, useEffect, useCallback } from "react";
import { RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const SNOOZE_MS = 30 * 60 * 1000; // 30 دقيقة

const SwUpdateBanner = () => {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      // فحص دوري كل 60 ثانية لاكتشاف تحديثات جديدة
      if (registration) {
        setInterval(() => registration.update(), 60 * 1000);
      }
    },
  });

  const [dismissed, setDismissed] = useState(false);
  const [snoozedUntil, setSnoozedUntil] = useState<number>(0);

  // إعادة إظهار الشريط بعد انتهاء فترة التأجيل
  useEffect(() => {
    if (!dismissed || !snoozedUntil) return;
    const remaining = snoozedUntil - Date.now();
    if (remaining <= 0) {
      setDismissed(false);
      return;
    }
    const timer = setTimeout(() => setDismissed(false), remaining);
    return () => clearTimeout(timer);
  }, [dismissed, snoozedUntil]);

  const handleUpdate = useCallback(() => {
    // تخزين علامة التحديث لعرض سجل التغييرات بعد إعادة التحميل
    try { localStorage.setItem("pwa_just_updated", JSON.stringify({ ts: Date.now() })); } catch { /* ignored */ }
    updateServiceWorker(true);
  }, [updateServiceWorker]);

  const handleSnooze = useCallback(() => {
    setDismissed(true);
    setSnoozedUntil(Date.now() + SNOOZE_MS);
  }, []);

  if (!needRefresh || dismissed) return null;

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
          className="h-7 px-3 text-xs font-bold"
        >
          تحديث الآن
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
