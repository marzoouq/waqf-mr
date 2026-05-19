/**
 * هوك المصادقة بالبيومتري (WebAuthn)
 */
import { useCallback } from 'react';
import { startAuthentication, type PublicKeyCredentialRequestOptionsJSON } from '@simplewebauthn/browser';
import { supabase } from '@/integrations/supabase/client';
import { invoke } from '@/lib/api/invoke';
import { uiNotify } from '@/lib/notify';
import { logBiometricEvent, handleAuthenticationError } from '@/utils/auth/webAuthnErrors';

interface UseWebAuthnAuthArgs {
  setIsLoading: (v: boolean) => void;
}

export function useWebAuthnAuth({ setIsLoading }: UseWebAuthnAuthArgs) {
  const authenticateWithBiometric = useCallback(async () => {
    setIsLoading(true);
    try {
      type AuthOptionsResponse = PublicKeyCredentialRequestOptionsJSON & { challenge_id?: string; error?: string };
      let options: AuthOptionsResponse | undefined;
      try {
        options = await invoke<AuthOptionsResponse>(
          'webauthn',
          { body: { action: 'auth-options' } },
          { maxAttempts: 1, treatDataErrorAsFailure: false },
        );
      } catch {
        logBiometricEvent('login_failed', 'auth-options', { reason: 'server_error' });
        uiNotify.error('فشل في بدء عملية المصادقة. تحقق من اتصالك بالإنترنت');
        return false;
      }
      if (!options) {
        logBiometricEvent('login_failed', 'auth-options', { reason: 'server_error' });
        uiNotify.error('فشل في بدء عملية المصادقة. تحقق من اتصالك بالإنترنت');
        return false;
      }

      const credential = await startAuthentication({ optionsJSON: options });

      let result: { verified?: boolean; access_token?: string; refresh_token?: string } | null = null;
      try {
        result = await invoke<{ verified?: boolean; access_token?: string; refresh_token?: string }>(
          'webauthn',
          { body: { action: 'auth-verify', credential, challenge_id: options.challenge_id } },
          { maxAttempts: 1, treatDataErrorAsFailure: false },
        );
      } catch {
        // fall-through إلى التحقق أدناه
      }

      if (!result?.verified) {
        logBiometricEvent('login_failed', 'auth-verify', { reason: 'verification_failed' });
        uiNotify.error('فشل في التحقق من البصمة');
        return false;
      }

      if (!result.access_token || !result.refresh_token) {
        logBiometricEvent('login_failed', 'auth-session', { reason: 'no_tokens' });
        uiNotify.error('لم يتم استلام بيانات الجلسة. أعد المحاولة');
        return false;
      }

      const { error: sessionError } = await supabase.auth.setSession({
        access_token: result.access_token,
        refresh_token: result.refresh_token,
      });

      if (sessionError) {
        logBiometricEvent('login_failed', 'auth-session', { reason: 'session_set_error' });
        uiNotify.error('فشل في إنشاء الجلسة');
        return false;
      }

      logBiometricEvent('login_success', 'authenticate', {});
      uiNotify.success('تم تسجيل الدخول بالبصمة بنجاح');
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
