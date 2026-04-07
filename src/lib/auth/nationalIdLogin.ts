/**
 * منطق تسجيل الدخول بالهوية الوطنية — مستخرج من LoginForm لتقليل حجم المكوّن
 * يستخدم AppNotify بدلاً من toast مباشر لضمان قابلية الاختبار
 */
import { supabase } from '@/integrations/supabase/client';
import { defaultNotify } from '@/lib/notify';
import type { AppNotify } from '@/lib/notify';
import { logAccessEvent } from '@/hooks/data/audit/useAccessLog';
import { STORAGE_KEYS } from '@/constants/storageKeys';
import { normalizeArabicDigits } from '@/utils/format/normalizeDigits';

interface NidLoginState {
  nidLockedUntil: number | null;
  setNidLockedUntil: (val: number | null) => void;
  setNidAttemptsRemaining: (val: number | null) => void;
}

export async function handleNationalIdLogin(
  nationalId: string,
  password: string,
  state: NidLoginState,
  notify: AppNotify = defaultNotify,
): Promise<boolean> {
  const { nidLockedUntil, setNidLockedUntil, setNidAttemptsRemaining } = state;

  if (!nationalId) {
    notify.error('يرجى إدخال رقم الهوية الوطنية');
    return false;
  }

  if (nidLockedUntil && Date.now() < nidLockedUntil) {
    const secs = Math.ceil((nidLockedUntil - Date.now()) / 1000);
    notify.error(`تم تجاوز حد المحاولات. يرجى الانتظار ${secs} ثانية`);
    return false;
  }

  if (!password) {
    notify.error('يرجى إدخال كلمة المرور');
    return false;
  }

  const cleanId = normalizeArabicDigits(nationalId);

  if (!/^\d{10}$/.test(cleanId)) {
    notify.error('رقم الهوية يجب أن يكون 10 أرقام');
    return false;
  }

  const { data, error: lookupError } = await supabase.functions.invoke('lookup-national-id', {
    body: { national_id: cleanId, password },
  });

  // معالجة أخطاء Rate Limit و أخطاء الاتصال
  if (lookupError || data?.error) {
    const isRateLimited =
      data?.remaining === 0 ||
      data?.retry_after ||
      String(data?.error || '').includes('تم تجاوز حد المحاولات') ||
      String(lookupError?.message || '').includes('تم تجاوز حد المحاولات');

    if (isRateLimited) {
      const retryAfter = data?.retry_after || 180;
      const lockTime = Date.now() + retryAfter * 1000;
      setNidLockedUntil(lockTime);
      try { sessionStorage.setItem(STORAGE_KEYS.NID_LOCKED_UNTIL, String(lockTime)); } catch { /* silent */ }
      setNidAttemptsRemaining(0);
      notify.error(`تم تجاوز حد المحاولات. يرجى الانتظار ${retryAfter} ثانية`);
      return false;
    }

    if (lookupError) {
      notify.error('حدث خطأ في الاتصال، يرجى المحاولة مرة أخرى');
      return false;
    }
  }

  if (data?.remaining !== undefined) {
    setNidAttemptsRemaining(data.remaining);
  }

  if (!data?.found) {
    notify.error('بيانات الدخول غير صحيحة');
    return false;
  }

  if (data?.auth_error) {
    notify.error(data.auth_error);
    logAccessEvent({
      event_type: 'login_failed',
      metadata: { error_message: 'nid_auth_error', login_method: 'national_id' },
    });
    return false;
  }

  if (data?.session?.access_token && data?.session?.refresh_token) {
    const { error: sessionError } = await supabase.auth.setSession({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    });
    if (sessionError) {
      notify.error('حدث خطأ في تسجيل الدخول. يرجى المحاولة مرة أخرى.');
      logAccessEvent({
        event_type: 'login_failed',
        metadata: { error_message: 'session_set_error', login_method: 'national_id' },
      });
      return false;
    }
    notify.success('تم تسجيل الدخول بنجاح');
    logAccessEvent({
      event_type: 'login_success',
      metadata: { login_method: 'national_id' },
    });
    return true;
  }

  notify.error('حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.');
  return false;
}
