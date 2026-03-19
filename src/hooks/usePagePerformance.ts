/**
 * Hook لقياس وقت تحميل الصفحات عند التنقل بين المسارات
 */
import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { recordPageLoad } from '@/lib/pagePerformanceTracker';
import { logger } from '@/lib/logger';

export function usePagePerformance(): void {
  const { pathname } = useLocation();
  const startRef = useRef<number>(performance.now());
  const lastPathRef = useRef<string>(pathname);

  useEffect(() => {
    // عند تغيير المسار — سجّل وقت المسار السابق وابدأ عداد المسار الجديد
    if (lastPathRef.current !== pathname) {
      const duration = performance.now() - startRef.current;
      // تجاهل الأوقات الطويلة جداً (المستخدم ترك التبويب)
      if (duration < 120_000) {
        recordPageLoad(lastPathRef.current, duration);
        logger.info(`[Perf] صفحة "${lastPathRef.current}" عُرضت لمدة ${Math.round(duration)}ms`);
      }
      lastPathRef.current = pathname;
      startRef.current = performance.now();
    }
  }, [pathname]);

  // عند أول تحميل — سجّل وقت التحميل الأولي
  useEffect(() => {
    const measureInitial = () => {
      const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
      if (!nav) return;
      const loadTime = Math.round(nav.loadEventEnd - nav.startTime);
      if (loadTime > 0 && loadTime < 60_000) {
        recordPageLoad(pathname, loadTime);
      }
    };

    // تأجيل القياس قليلاً
    const timer = setTimeout(measureInitial, 1500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
