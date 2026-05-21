/**
 * غلاف توافق — يضيف toast العربية فوق طبقة البيانات `useWebAuthnCredentials`.
 * API مطابق 100% للنسخة السابقة كي لا يتأثر أي مستهلك.
 */
import { useCallback } from 'react';
import { uiNotify } from '@/lib/notify';
import { useWebAuthnCredentials } from '@/hooks/data/auth/useWebAuthnCredentials';

export type { WebAuthnCredential } from '@/hooks/data/auth/useWebAuthnCredentials';

export function useWebAuthnManage() {
  const {
    isSupported, isEnabled, isLoading, credentials,
    setIsLoading, setIsEnabled,
    fetchCredentials: fetchRaw, deleteCredential,
  } = useWebAuthnCredentials();

  const fetchCredentials = useCallback(async (knownUserId?: string) => {
    const res = await fetchRaw(knownUserId);
    if (!res.ok) uiNotify.error('تعذر جلب بيانات الاعتماد');
    return res.data;
  }, [fetchRaw]);

  const removeCredential = useCallback(async (credentialId: string) => {
    const res = await deleteCredential(credentialId);
    if (!res.ok) {
      if (res.error === 'no_user') uiNotify.error('يجب تسجيل الدخول أولاً');
      else uiNotify.error('فشل في حذف البصمة');
      return false;
    }
    uiNotify.success('تم حذف البصمة بنجاح');
    return true;
  }, [deleteCredential]);

  return {
    isSupported, isEnabled, isLoading, credentials,
    setIsLoading, setIsEnabled,
    fetchCredentials, removeCredential,
  };
}
