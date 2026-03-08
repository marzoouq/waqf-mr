import { useEffect, useRef, useState, useCallback } from 'react';

const IDLE_EVENTS: (keyof DocumentEventMap)[] = [
  'mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click',
  'input', 'change', 'focus', 'wheel',
];

interface UseIdleTimeoutOptions {
  /** Total idle time before logout in ms (default 15 min) */
  timeout?: number;
  /** Warning shown this many ms before logout (default 60s) */
  warningBefore?: number;
  onIdle: () => void;
}

export const useIdleTimeout = ({
  timeout = 15 * 60 * 1000,
  warningBefore = 60 * 1000,
  onIdle,
}: UseIdleTimeoutOptions) => {
  const [showWarning, setShowWarning] = useState(false);
  const [remaining, setRemaining] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastActivityRef = useRef(Date.now());
  const firedRef = useRef(false);
  const onIdleRef = useRef(onIdle);
  useEffect(() => { onIdleRef.current = onIdle; }, [onIdle]);

  const clearTimers = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
  }, []);

  const resetTimer = useCallback(() => {
    lastActivityRef.current = Date.now();
    firedRef.current = false;
    setShowWarning(false);
    clearTimers();

    // Prevent negative/zero warning delay when timeout ≤ warningBefore
    const safeWarningBefore = Math.min(warningBefore, timeout * 0.5);

    warningTimerRef.current = setTimeout(() => {
      setShowWarning(true);
      setRemaining(Math.ceil(safeWarningBefore / 1000));
      countdownRef.current = setInterval(() => {
        const elapsed = Date.now() - lastActivityRef.current;
        const left = Math.max(0, Math.ceil((timeout - elapsed) / 1000));
        setRemaining(left);
        if (left <= 0 && !firedRef.current) {
          firedRef.current = true;
          clearTimers();
          onIdleRef.current();
        }
      }, 1000);
    }, timeout - safeWarningBefore);

    timerRef.current = setTimeout(() => {
      if (!firedRef.current) {
        firedRef.current = true;
        clearTimers();
        onIdleRef.current();
      }
    }, timeout);
  }, [timeout, warningBefore, clearTimers]);

  const stayActive = useCallback(() => {
    resetTimer();
  }, [resetTimer]);

  useEffect(() => {
    resetTimer();

    const handler = () => resetTimer();
    for (const event of IDLE_EVENTS) {
      document.addEventListener(event, handler, { passive: true });
    }

    // Page Visibility: reset timer when tab becomes visible again
    const visibilityHandler = () => {
      if (document.visibilityState === 'visible') {
        const elapsed = Date.now() - lastActivityRef.current;
        if (elapsed >= timeout) {
          // Idle time already exceeded — trigger logout immediately
          if (!firedRef.current) {
            firedRef.current = true;
            clearTimers();
            onIdleRef.current();
          }
        } else {
          resetTimer();
        }
      }
    };
    document.addEventListener('visibilitychange', visibilityHandler);

    return () => {
      clearTimers();
      for (const event of IDLE_EVENTS) {
        document.removeEventListener(event, handler);
      }
      document.removeEventListener('visibilitychange', visibilityHandler);
    };
  }, [resetTimer, clearTimers]);

  return { showWarning, remaining, stayActive };
};
