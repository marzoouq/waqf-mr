import { useState, useEffect, type ReactNode } from 'react';

/**
 * يؤجّل عرض المكونات غير الحرجة حتى يفرغ المتصفح —
 * يستخدم requestIdleCallback مع timeout كحد أقصى.
 */
const DeferredRender = ({ children, delay = 3000 }: { children: ReactNode; delay?: number }) => {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let timerId: number;
    if (window.requestIdleCallback) {
      timerId = window.requestIdleCallback(() => setReady(true), { timeout: delay });
    } else {
      timerId = window.setTimeout(() => setReady(true), delay) as unknown as number;
    }
    return () => {
      if (window.cancelIdleCallback) window.cancelIdleCallback(timerId);
      else window.clearTimeout(timerId);
    };
  }, [delay]);
  if (!ready) return null;
  return <>{children}</>;
};

export default DeferredRender;
