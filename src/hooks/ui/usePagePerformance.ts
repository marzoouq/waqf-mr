/**
 * Hook لقياس وقت تحميل الصفحات عند التنقل بين المسارات
 */
import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { recordPageLoad, notifyPerfUpdate } from '@/lib/monitoring';
import { logger } from '@/lib/logger';
import { PAGE_PERF_INITIAL_MEASURE_DELAY_MS } from '@/constants/timing';

export function usePagePerformance(): void {
  const { pathname } = useLocation();
  // lazy init: 0 يعني "غير مُهيّأ بعد" — يُملأ في mount effect أدناه
  const startRef = useRef<number>(0);
  const lastPathRef = useRef<string>(pathname);

  useEffect(() => {
    // fallback لتغطية أول render قبل تشغيل mount effect لـ initial
    if (!startRef.current) startRef.current = performance.now();
    // عند تغيير المسار — سجّل مدة بقاء المستخدم على المسار السابق (dwell)
    // وابدأ عداد المسار الجديد. لا نخلط الـ dwell مع وقت التحميل (load).
    if (lastPathRef.current !== pathname) {
      const duration = performance.now() - startRef.current;
      // تجاهل الأوقات الطويلة جداً (المستخدم ترك التبويب)
      if (duration < 120_000) {
        recordPageLoad(lastPathRef.current, duration, 'dwell');
        notifyPerfUpdate();
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
        notifyPerfUpdate();
      }
    };

    // تأجيل القياس قليلاً
    const timer = setTimeout(measureInitial, PAGE_PERF_INITIAL_MEASURE_DELAY_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- قياس مرة واحدة عند mount لكل صفحة فقط
  }, []);
}
