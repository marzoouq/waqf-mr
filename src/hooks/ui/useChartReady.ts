/**
 * هوك للتأكد من جاهزية حاوية الرسم البياني قبل عرض ResponsiveContainer
 * يحل مشكلة width(-1) height(-1) في Recharts
 */
import { useLayoutEffect, useState, useRef } from 'react';

export function useChartReady() {
  const ref = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  useLayoutEffect(() => {
    if (!ref.current) return;

    const rect = ref.current.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      setReady(true);
      return;
    }

    const obs = new ResizeObserver((entries) => {
      const { width, height } = entries[0]?.contentRect ?? {};
      if (width && width > 0 && height && height > 0) {
        setReady(true);
        obs.disconnect();
      }
    });
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  return { ref, ready };
}
