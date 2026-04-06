/**
 * useStableCallback — مرجع ثابت لدالة callback لمنع إعادة الرسم
 * يحافظ على مرجع واحد ثابت بينما يستدعي دائماً أحدث نسخة من الدالة
 */
import { useRef, useCallback } from 'react';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useStableCallback<T extends (...args: any[]) => any>(callback: T): T {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return useCallback((...args: any[]) => callbackRef.current(...args), []) as T;
}
