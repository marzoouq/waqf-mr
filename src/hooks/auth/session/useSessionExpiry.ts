/**
 * useSessionExpiry — كاشف انتهاء صلاحية الجلسة بشكل حتمي
 *
 * الغرض: useIdleTimeout يكتشف الخمول فقط. لكن JWT قد ينتهي قبل ذلك
 * (مثلاً: المستخدم ترك التبويب مفتوحاً ساعة، والـ refresh-token انتهى).
 * هذا الهوك يفحص session.expires_at دورياً وعند العودة للتبويب،
 * ويُطلق onExpired ليتم تنفيذ نفس مسار تسجيل الخروج الموحّد.
 *
 * تشغيله:
 * 1) timer دوري كل دقيقة يفحص الفرق بين الآن و expires_at
 * 2) visibilitychange — عند العودة للتبويب يفحص فوراً
 * 3) يضمن إطلاق onExpired مرة واحدة فقط (firedRef)
 */
import { useEffect, useRef } from 'react';
import type { Session } from '@supabase/supabase-js';

interface UseSessionExpiryOptions {
  session: Session | null;
  /** هامش أمان قبل expires_at الفعلي (افتراضي 5 ثوانٍ) */
  graceSeconds?: number;
  /** فترة الفحص الدوري بالميلي ثانية (افتراضي 60s) */
  pollMs?: number;
  onExpired: () => void;
}

export function useSessionExpiry({
  session,
  graceSeconds = 5,
  pollMs = 60_000,
  onExpired,
}: UseSessionExpiryOptions): void {
  const firedRef = useRef(false);
  const onExpiredRef = useRef(onExpired);
  useEffect(() => { onExpiredRef.current = onExpired; }, [onExpired]);

  useEffect(() => {
    // إعادة ضبط firedRef عند تجديد الجلسة (expires_at يتغير)
    firedRef.current = false;

    if (!session?.expires_at) return;

    const expiresAtMs = session.expires_at * 1000;

    const check = () => {
      if (firedRef.current) return;
      const now = Date.now();
      if (now >= expiresAtMs - graceSeconds * 1000) {
        firedRef.current = true;
        onExpiredRef.current();
      }
    };

    // فحص فوري — قد تكون الجلسة منتهية بالفعل عند mount
    check();

    const intervalId = window.setInterval(check, pollMs);

    const visibilityHandler = () => {
      if (document.visibilityState === 'visible') check();
    };
    document.addEventListener('visibilitychange', visibilityHandler);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', visibilityHandler);
    };
  }, [session?.expires_at, graceSeconds, pollMs]);
}
