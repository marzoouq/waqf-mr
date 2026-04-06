/**
 * هوك لتسجيل الدخول بالبصمة (WebAuthn)
 */
import { useState } from 'react';
import { defaultNotify } from '@/lib/notify';
import { supabase } from '@/integrations/supabase/client';
import { startAuthentication } from '@simplewebauthn/browser';
import { useIsMountedRef } from '@/hooks/ui/useIsMountedRef';

export function useBiometricAuth() {
  const [biometricLoading, setBiometricLoading] = useState(false);
  const isMountedRef = useIsMountedRef();

  const handleBiometricLogin = async () => {
    setBiometricLoading(true);
    try {
      const { data: options, error: optErr } = await supabase.functions.invoke('webauthn', {
        body: { action: 'auth-options' },
      });
      if (optErr || !options) {
        defaultNotify.error('فشل في بدء عملية المصادقة');
        return;
      }
      const credential = await startAuthentication({ optionsJSON: options });
      const { data: result, error: verErr } = await supabase.functions.invoke('webauthn', {
        body: { action: 'auth-verify', credential, challenge_id: options.challenge_id },
      });
      if (verErr || !result?.verified) {
        defaultNotify.error('فشل في التحقق من البصمة');
        return;
      }
      if (!result.access_token || !result.refresh_token) {
        defaultNotify.error('لم يتم استلام بيانات الجلسة');
        return;
      }
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: result.access_token,
        refresh_token: result.refresh_token,
      });
      if (sessionError) {
        defaultNotify.error('فشل في إنشاء الجلسة');
        return;
      }
      defaultNotify.success('تم تسجيل الدخول بالبصمة بنجاح');
    } catch (err: unknown) {
      const name = err instanceof DOMException || err instanceof Error ? err.name : '';
      const errMsg = err instanceof Error ? err.message : '';
      if (name === 'NotAllowedError') {
        if (errMsg.toLowerCase().includes('timeout')) {
          defaultNotify.error('انتهت مهلة المصادقة بالبصمة. أعد المحاولة');
        } else {
          defaultNotify.error('تم إلغاء عملية البصمة');
        }
      } else if (name === 'AbortError') {
        defaultNotify.error('تم إلغاء عملية المصادقة');
      } else if (errMsg.toLowerCase().includes('network') || errMsg.toLowerCase().includes('fetch')) {
        defaultNotify.error('خطأ في الاتصال. تحقق من الإنترنت وأعد المحاولة');
      } else {
        defaultNotify.error('حدث خطأ أثناء المصادقة بالبصمة. أعد المحاولة أو سجّل الدخول بكلمة المرور');
      }
    } finally {
      if (isMountedRef.current) {
        setBiometricLoading(false);
      }
    }
  };

  return { biometricLoading, handleBiometricLogin };
}
