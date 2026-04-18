/**
 * useStableRef — يحتفظ بمرجع ثابت يحمل آخر قيمة دون التسبب في re-render.
 *
 * يحل مشكلة `react-hooks/refs` الناتجة عن النمط الشائع:
 *   const ref = useRef(value);
 *   ref.current = value;  // ❌ تعديل أثناء render مرفوض من React Compiler
 *
 * البديل الآمن: التعيين داخل `useEffect` لضمان التزامن مع React lifecycle
 * مع الحفاظ على هوية المرجع ثابتة عبر renders.
 *
 * مثال:
 *   const queryClientRef = useStableRef(queryClient);
 *   const callback = useCallback(() => {
 *     queryClientRef.current.invalidateQueries(...);
 *   }, []);
 */
import { useEffect, useRef } from 'react';

export function useStableRef<T>(value: T) {
  const ref = useRef(value);
  useEffect(() => {
    ref.current = value;
  }, [value]);
  return ref;
}
