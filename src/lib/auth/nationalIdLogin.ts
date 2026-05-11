/**
 * منطق تسجيل الدخول بالهوية الوطنية — مستخرج من LoginForm لتقليل حجم المكوّن
 * يستخدم AppNotify بدلاً من toast مباشر لضمان قابلية الاختبار
 */
import { supabase } from '@/integrations/supabase/client';
import { invoke } from '@/lib/api/invoke';
import { ApiError } from '@/lib/api/rpc';
import { defaultNotify } from '@/lib/notify';
import type { AppNotify } from '@/lib/notify';
import { logAccessEvent } from '@/lib/services/accessLogService';
import { STORAGE_KEYS } from '@/constants/storageKeys';
import { normalizeArabicDigits } from '@/utils/format/normalizeDigits';
import { safeSessionSet } from '@/lib/storage';

interface NidResponse {
  error?: string;
  remaining?: number;
  retry_after?: number;
  found?: boolean;
  masked_email?: string;
  auth_error?: string;
  session?: { access_token: string; refresh_token: string };
}

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

  // invoke() مع treatDataErrorAsFailure:false للحفاظ على نمط Edge Function الذي
  // يعيد 200 + { error, retry_after, remaining } في حالات rate-limit/validation.
  // maxAttempts:1 — endpoint حساس مع rate limiting، لا يجوز إعادة المحاولة تلقائياً.
  let data: NidResponse;
  try {
    data = await invoke<NidResponse>(
      'lookup-national-id',
      { body: { national_id: cleanId, password } },
      { maxAttempts: 1, treatDataErrorAsFailure: false },
    );
  } catch (e) {
    // أخطاء النقل/الشبكة. ملاحظة: 429 من Edge قد لا يصل body في data
    // (يذهب إلى error.context). هذه هشاشة قائمة قبل الترحيل.
    const msg = e instanceof ApiError ? e.message : '';
    if (msg.includes('تم تجاوز حد المحاولات')) {
      const lockTime = Date.now() + 180 * 1000;
      setNidLockedUntil(lockTime);
      safeSessionSet(STORAGE_KEYS.NID_LOCKED_UNTIL, String(lockTime));
      setNidAttemptsRemaining(0);
      notify.error('تم تجاوز حد المحاولات. يرجى الانتظار 180 ثانية');
      return false;
    }
    notify.error('حدث خطأ في الاتصال، يرجى المحاولة مرة أخرى');
    return false;
  }

  // معالجة rate-limit ضمن الجسم (200 + error + retry_after)
  if (data?.error) {
    const isRateLimited =
      data?.remaining === 0 ||
      !!data?.retry_after ||
      String(data?.error || '').includes('تم تجاوز حد المحاولات');

    if (isRateLimited) {
      const retryAfter = data?.retry_after || 180;
      const lockTime = Date.now() + retryAfter * 1000;
      setNidLockedUntil(lockTime);
      safeSessionSet(STORAGE_KEYS.NID_LOCKED_UNTIL, String(lockTime));
      setNidAttemptsRemaining(0);
      notify.error(`تم تجاوز حد المحاولات. يرجى الانتظار ${retryAfter} ثانية`);
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
