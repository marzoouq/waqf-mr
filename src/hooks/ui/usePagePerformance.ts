/**
 * Hook لقياس وقت تحميل الصفحات الفعلي عند التنقل بين المسارات
 * يقيس وقت التحميل (من بدء التنقل إلى اكتمال أول render) بدلاً من وقت المكوث
 */
import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { recordPageLoad, notifyPerfUpdate } from '@/lib/pagePerformanceTracker';
import { logger } from '@/lib/logger';

export function usePagePerformance(): void {
  const { pathname } = useLocation();
  const navigationStartRef = useRef<number>(performance.now());
  const lastPathRef = useRef<string>(pathname);
  const hasRenderedRef = useRef(false);

  // عند تغيير المسار — ابدأ عداد التحميل للمسار الجديد
  useEffect(() => {
    if (lastPathRef.current !== pathname) {
      lastPathRef.current = pathname;
      navigationStartRef.current = performance.now();
      hasRenderedRef.current = false;
    }
  }, [pathname]);

  // قياس وقت التحميل الفعلي — من بدء التنقل إلى اكتمال أول render
  useEffect(() => {
    if (hasRenderedRef.current) return;
    hasRenderedRef.current = true;

    // requestAnimationFrame يضمن أن الـ DOM رُسم فعلاً
    const rafId = requestAnimationFrame(() => {
      const loadTime = performance.now() - navigationStartRef.current;

      // تجاهل الأوقات الطويلة جداً (المستخدم ترك التبويب) والقصيرة جداً (أقل من 5ms)
      if (loadTime > 5 && loadTime < 30_000) {
        recordPageLoad(pathname, loadTime);
        notifyPerfUpdate();
        logger.info(`[Perf] صفحة "${pathname}" تحمّلت في ${Math.round(loadTime)}ms`);
      }
    });

    return () => cancelAnimationFrame(rafId);
  }, [pathname]);

  // عند أول تحميل — سجّل وقت التحميل الأولي من Navigation Timing API
  useEffect(() => {
    const measureInitial = () => {
      const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
      if (!nav) return;
      const loadTime = Math.round(nav.loadEventEnd - nav.startTime);
      if (loadTime > 0 && loadTime < 60_000) {
        recordPageLoad(pathname, loadTime);
        notifyPerfUpdate();
      }
    };

    const timer = setTimeout(measureInitial, 1500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
