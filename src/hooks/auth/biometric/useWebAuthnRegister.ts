/**
 * هوك تسجيل بيانات بيومترية جديدة (WebAuthn)
 */
import { useCallback } from 'react';
import { startRegistration, type PublicKeyCredentialCreationOptionsJSON } from '@simplewebauthn/browser';
import { supabase } from '@/integrations/supabase/client';
import { invoke } from '@/lib/api/invoke';
import { uiNotify } from '@/lib/notify';
import { logger } from '@/lib/logger';
import { logBiometricEvent, handleRegistrationError, getDeviceName } from '@/lib/auth/webAuthnErrors';
import { STORAGE_KEYS } from '@/constants/storageKeys';
import { safeSet } from '@/lib/storage';

const BIOMETRIC_ENABLED_KEY = STORAGE_KEYS.BIOMETRIC_ENABLED;

interface UseWebAuthnRegisterArgs {
  setIsLoading: (v: boolean) => void;
  setIsEnabled: (v: boolean) => void;
  fetchCredentials: (userId?: string) => Promise<unknown[]>;
}

export function useWebAuthnRegister({ setIsLoading, setIsEnabled, fetchCredentials }: UseWebAuthnRegisterArgs) {
  const registerBiometric = useCallback(async (deviceName?: string) => {
    setIsLoading(true);
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        uiNotify.error('يرجى تسجيل الدخول أولاً');
        return false;
      }

      type RegisterOptionsResponse = PublicKeyCredentialCreationOptionsJSON & { challenge_id?: string; error?: string };
      let options: RegisterOptionsResponse | undefined;
      try {
        options = await invoke<RegisterOptionsResponse>(
          'webauthn',
          { body: { action: 'register-options' } },
          { maxAttempts: 1, treatDataErrorAsFailure: false },
        );
      } catch (e) {
        logger.error('WebAuthn register-options error:', e);
        logBiometricEvent('login_failed', 'register-options', { reason: 'server_error' });
        uiNotify.error('فشل في بدء عملية التسجيل. تحقق من اتصالك بالإنترنت وأعد المحاولة');
        return false;
      }
      if (!options) {
        logBiometricEvent('login_failed', 'register-options', { reason: 'server_error' });
        uiNotify.error('فشل في بدء عملية التسجيل. تحقق من اتصالك بالإنترنت وأعد المحاولة');
        return false;
      }

      if (options.error) {
        logger.error('WebAuthn register-options server error');
        logBiometricEvent('login_failed', 'register-options', { reason: options.error });
        uiNotify.error(options.error || 'فشل في بدء عملية التسجيل');
        return false;
      }

      const credential = await startRegistration({ optionsJSON: options });

      type RegisterVerifyResponse = { verified?: boolean; error?: string; [k: string]: unknown };
      let result: RegisterVerifyResponse | null = null;
      try {
        result = await invoke<RegisterVerifyResponse>(
          'webauthn',
          { body: { action: 'register-verify', credential, deviceName: (deviceName || getDeviceName()).slice(0, 100), challenge_id: options.challenge_id } },
          { maxAttempts: 1, treatDataErrorAsFailure: false },
        );
      } catch {
        // معالجة موحّدة أدناه
      }

      if (!result?.verified) {
        logBiometricEvent('login_failed', 'register-verify', { reason: result?.error || 'verification_failed' });
        uiNotify.error(result?.error || 'فشل في تسجيل البصمة');
        return false;
      }

      safeSet(BIOMETRIC_ENABLED_KEY, 'true');
      setIsEnabled(true);
      await fetchCredentials(user.id);
      uiNotify.success('تم تسجيل البصمة بنجاح! يمكنك الآن تسجيل الدخول بها');
      return true;
    } catch (err: unknown) {
      handleRegistrationError(err);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [fetchCredentials, setIsLoading, setIsEnabled]);

  return { registerBiometric };
}
