/**
 * هوك WebAuthn الرئيسي — يجمع الهوكات الفرعية (تسجيل/مصادقة/إدارة)
 */
import { useWebAuthnManage } from './useWebAuthnManage';
import { useWebAuthnRegister } from './useWebAuthnRegister';
import { useWebAuthnAuth } from './useWebAuthnAuth';
import { STORAGE_KEYS } from '@/constants/storageKeys';
import { safeGet } from '@/lib/storage';

const BIOMETRIC_ENABLED_KEY = STORAGE_KEYS.BIOMETRIC_ENABLED;

export function useWebAuthn() {
  const {
    isSupported, isEnabled, isLoading, credentials,
    setIsLoading, setIsEnabled,
    fetchCredentials, removeCredential,
  } = useWebAuthnManage();

  const { registerBiometric } = useWebAuthnRegister({
    setIsLoading, setIsEnabled, fetchCredentials,
  });

  const { authenticateWithBiometric } = useWebAuthnAuth({
    setIsLoading,
  });

  return {
    isSupported,
    isEnabled,
    isLoading,
    credentials,
    registerBiometric,
    authenticateWithBiometric,
    removeCredential,
    fetchCredentials,
  };
}

export function isBiometricEnabled(): boolean {
  return safeGet<string>(BIOMETRIC_ENABLED_KEY, 'false') === 'true';
}
