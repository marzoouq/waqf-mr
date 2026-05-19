/**
 * هوك WebAuthn الرئيسي — يجمع الهوكات الفرعية (تسجيل/مصادقة/إدارة)
 *
 * #27/#28 من الفحص العميق:
 *   ملف `useWebAuthn.test.ts` (~20KB) أكبر بكثير من هذا الملف لأنه **integration
 *   test** يغطي عائلة WebAuthn بالكامل من نقطة الدخول الموحّدة:
 *     - useWebAuthnRegister (تسجيل بصمة جديدة)
 *     - useWebAuthnAuth (مصادقة بالبصمة)
 *     - useWebAuthnManage (إدارة وحذف الـ credentials)
 *     - webAuthnErrors (تحويل أخطاء browser إلى رسائل عربية)
 *   هذا قرار مقصود: اختبار التكامل من الواجهة العامة أوثق من 4 ملفات اختبار unit
 *   منفصلة، ويُحاكي استخدام التطبيق الفعلي للهوك.
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
