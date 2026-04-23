/**
 * هوك تسجيل بيانات بيومترية جديدة (WebAuthn)
 */
import { useCallback } from 'react';
import { startRegistration } from '@simplewebauthn/browser';
import { supabase } from '@/integrations/supabase/client';
import { defaultNotify } from '@/lib/notify';
import { logger } from '@/lib/logger';
import { logBiometricEvent, handleRegistrationError, getDeviceName } from '@/utils/auth/webAuthnErrors';
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
        defaultNotify.error('يرجى تسجيل الدخول أولاً');
        return false;
      }

      const { data: options, error: optErr } = await supabase.functions.invoke('webauthn', {
        body: { action: 'register-options' },
      });

      if (optErr || !options) {
        logger.error('WebAuthn register-options error:', optErr);
        logBiometricEvent('login_failed', 'register-options', { reason: 'server_error' });
        defaultNotify.error('فشل في بدء عملية التسجيل. تحقق من اتصالك بالإنترنت وأعد المحاولة');
        return false;
      }

      if (options.error) {
        logger.error('WebAuthn register-options server error');
        logBiometricEvent('login_failed', 'register-options', { reason: options.error });
        defaultNotify.error(options.error || 'فشل في بدء عملية التسجيل');
        return false;
      }

      const credential = await startRegistration({ optionsJSON: options });

      const { data: result, error: verErr } = await supabase.functions.invoke('webauthn', {
        body: { action: 'register-verify', credential, deviceName: (deviceName || getDeviceName()).slice(0, 100), challenge_id: options.challenge_id },
      });

      if (verErr || !result?.verified) {
        logBiometricEvent('login_failed', 'register-verify', { reason: 'verification_failed' });
        defaultNotify.error('فشل في تسجيل البصمة');
        return false;
      }

      safeSet(BIOMETRIC_ENABLED_KEY, 'true');
      setIsEnabled(true);
      await fetchCredentials(user.id);
      defaultNotify.success('تم تسجيل البصمة بنجاح! يمكنك الآن تسجيل الدخول بها');
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
