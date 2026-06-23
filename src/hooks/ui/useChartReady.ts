/**
 * هوك للتأكد من جاهزية حاوية الرسم البياني قبل عرض الرسم.
 * يحل تحذير recharts: `width(-1) and height(-1) of chart should be greater than 0`.
 *
 * استراتيجية التحصين:
 * - عتبة `>= 2px` لتجاوز قيم التخطيط الجزئية اللحظية.
 * - فحص أولي متزامن عبر `getBoundingClientRect()` لتفادي وميض الحالة الفارغة.
 * - تأجيل `setReady(true)` داخل `requestAnimationFrame` ليُلتقط الرسم بعد
 *   استقرار CSS layout.
 * - تصدير القياسات الفعلية `{ width, height }` لتمريرها مباشرة إلى
 *   `<PieChart width=... height=...>` بدون الاعتماد على `ResponsiveContainer`
 *   الذي قد يفشل في القياس الأول داخل Suspense → blank chart.
 * - لا نفصل `ResizeObserver` بعد أول قياس صالح؛ نفصله فقط عند unmount.
 */
import { useLayoutEffect, useState, useRef } from 'react';

const MIN_DIM = 2;

export function useChartReady() {
  const ref = useRef<HTMLDivElement>(null);
  const readyRef = useRef(false);
  const rafRef = useRef<number | null>(null);
  const [ready, setReady] = useState(false);
  const [size, setSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const markReady = (w: number, h: number) => {
      setSize((prev) => (prev.width === w && prev.height === h ? prev : { width: w, height: h }));
      if (readyRef.current) return;
      readyRef.current = true;
      rafRef.current = requestAnimationFrame(() => setReady(true));
    };

    // 1) فحص أولي مُؤجَّل عبر rAF لتفادي forced reflow أثناء mount
    //    (getBoundingClientRect المتزامن داخل useLayoutEffect كان يُسبّب
    //     [Violation] Forced reflow في كل صفحة تحتوي رسماً بيانياً).
    const initialRaf = requestAnimationFrame(() => {
      const rect = el.getBoundingClientRect();
      if (rect.width >= MIN_DIM && rect.height >= MIN_DIM) {
        markReady(rect.width, rect.height);
      }
    });

    // 2) مراقبة مستمرة (دون فصل بعد أول قياس) — ResizeObserver لا يُسبّب reflow
    const obs = new ResizeObserver((entries) => {
      const cr = entries[0]?.contentRect;
      if (!cr) return;
      if (cr.width >= MIN_DIM && cr.height >= MIN_DIM) {
        markReady(cr.width, cr.height);
      }
    });
    obs.observe(el);

    return () => {
      cancelAnimationFrame(initialRaf);
      obs.disconnect();
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return { ref, ready, width: size.width, height: size.height };
}
