/**
 * AnimatedCounter — عدّاد متحرك للأرقام الكبيرة في لوحات التحكم
 *
 * يستخدم requestAnimationFrame مع easing لتحريك القيمة من 0 إلى value.
 * يحترم prefers-reduced-motion ويظهر القيمة النهائية مباشرة عند تفعيله.
 */
import { useEffect, useRef, useState } from 'react';

interface AnimatedCounterProps {
  /** القيمة النهائية المراد الوصول إليها */
  value: number;
  /** مدة الحركة بالمللي ثانية (افتراضي 700ms) */
  duration?: number;
  /** عدد المنازل العشرية */
  decimals?: number;
  /** بادئة (مثل رمز عملة) */
  prefix?: string;
  /** لاحقة (مثل %) */
  suffix?: string;
  /** locale للتنسيق (افتراضي en-US لأرقام لاتينية موحّدة) */
  locale?: string;
  /** className اختياري */
  className?: string;
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export default function AnimatedCounter({
  value,
  duration = 700,
  decimals = 0,
  prefix = '',
  suffix = '',
  locale = 'ar-SA',
  className,
}: AnimatedCounterProps) {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduced || !Number.isFinite(value)) {
      setDisplay(value);
      return;
    }

    const start = performance.now();
    const from = fromRef.current;
    const delta = value - from;

    const tick = (now: number) => {
      const elapsed = now - start;
      const t = Math.min(1, elapsed / duration);
      const eased = easeOutCubic(t);
      setDisplay(from + delta * eased);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = value;
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      fromRef.current = value;
    };
  }, [value, duration]);

  const formatted = new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(display);

  return (
    <span className={className} aria-label={`${prefix}${value}${suffix}`}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}
