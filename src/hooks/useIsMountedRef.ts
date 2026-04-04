import { useEffect, useRef } from 'react';

/**
 * Tracks whether the current component is still mounted.
 */
export function useIsMountedRef() {
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  return isMountedRef;
}
