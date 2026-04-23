/**
 * هوك المصادقة بالبيومتري (WebAuthn)
 */
import { useCallback } from 'react';
import { startAuthentication } from '@simplewebauthn/browser';
import { supabase } from '@/integrations/supabase/client';
import { defaultNotify } from '@/lib/notify';
import { logBiometricEvent, handleAuthenticationError } from '@/utils/auth/webAuthnErrors';

interface UseWebAuthnAuthArgs {
  setIsLoading: (v: boolean) => void;
}

export function useWebAuthnAuth({ setIsLoading }: UseWebAuthnAuthArgs) {
  const authenticateWithBiometric = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: options, error: optErr } = await supabase.functions.invoke('webauthn', {
        body: { action: 'auth-options' },
      });

      if (optErr || !options) {
        logBiometricEvent('login_failed', 'auth-options', { reason: 'server_error' });
        defaultNotify.error('فشل في بدء عملية المصادقة. تحقق من اتصالك بالإنترنت');
        return false;
      }

      const credential = await startAuthentication({ optionsJSON: options });

      const { data: result, error: verErr } = await supabase.functions.invoke('webauthn', {
        body: { action: 'auth-verify', credential, challenge_id: options.challenge_id },
      });

      if (verErr || !result?.verified) {
        logBiometricEvent('login_failed', 'auth-verify', { reason: 'verification_failed' });
        defaultNotify.error('فشل في التحقق من البصمة');
        return false;
      }

      if (!result.access_token || !result.refresh_token) {
        logBiometricEvent('login_failed', 'auth-session', { reason: 'no_tokens' });
        defaultNotify.error('لم يتم استلام بيانات الجلسة. أعد المحاولة');
        return false;
      }

      const { error: sessionError } = await supabase.auth.setSession({
        access_token: result.access_token,
        refresh_token: result.refresh_token,
      });

      if (sessionError) {
        logBiometricEvent('login_failed', 'auth-session', { reason: 'session_set_error' });
        defaultNotify.error('فشل في إنشاء الجلسة');
        return false;
      }

      logBiometricEvent('login_success', 'authenticate', {});
      defaultNotify.success('تم تسجيل الدخول بالبصمة بنجاح');
      return true;
    } catch (err: unknown) {
      handleAuthenticationError(err);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [setIsLoading]);

  return { authenticateWithBiometric };
}
