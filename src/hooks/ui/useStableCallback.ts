/**
 * useStableCallback — مرجع ثابت لدالة callback لمنع إعادة الرسم
 * يحافظ على مرجع واحد ثابت بينما يستدعي دائماً أحدث نسخة من الدالة
 */
import { useRef, useCallback } from 'react';

export function useStableCallback<T extends (...args: never[]) => unknown>(callback: T): T {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  return useCallback((...args: never[]) => callbackRef.current(...args), []) as T;
}
