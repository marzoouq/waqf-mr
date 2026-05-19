import { useEffect, type RefObject } from 'react';

/**
 * يستدعي handler عند النقر خارج العنصر المُشار إليه.
 * Primitive عام — لا يفترض أي UI محدّد.
 */
export function useClickOutside<T extends HTMLElement>(
  ref: RefObject<T | null>,
  handler: () => void,
  enabled: boolean = true,
): void {
  useEffect(() => {
    if (!enabled) return;
    const onMouseDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) handler();
    };
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [ref, handler, enabled]);
}
