/**
 * useNowClock — قيمة `Date.now()` مُتحدّثة دورياً عبر useState/useEffect.
 *
 * يحل مشكلة `react-hooks/purity` الناتجة عن استدعاء `Date.now()` في render body.
 * كل المستهلكين يشاركون نفس الفترة الزمنية افتراضياً (60 ثانية) — كافٍ لعرض
 * مؤشرات SLA والتأخير دون استهلاك مفرط للـ CPU.
 *
 * @param intervalMs الفترة الزمنية بين التحديثات (افتراضي 60_000ms)
 * @returns قيمة timestamp رقمية محدّثة دورياً
 */
import { useEffect, useState } from 'react';

export function useNowClock(intervalMs: number = 60_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}
