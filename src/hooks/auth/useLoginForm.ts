/**
 * هوك إدارة حالة نموذج تسجيل الدخول
 * مُستخرج من LoginForm لتقليل تعقيد المكون
 */
import { useState, useRef, useCallback } from 'react';
import { defaultNotify } from '@/lib/notify';
import { logAccessEvent } from '@/lib/services/accessLogService';
import { getSafeErrorMessage } from '@/utils/format/safeErrorMessage';
import { normalizeArabicDigits } from '@/utils/format/normalizeDigits';
import { STORAGE_KEYS } from '@/constants/storageKeys';
import { handleNationalIdLogin } from '@/lib/auth/nationalIdLogin';
import { useIsMountedRef } from '@/hooks/ui/useIsMountedRef';
import { EMAIL_REGEX } from '@/utils/validation/index';

type LoginMethod = 'email' | 'national_id';
type FieldErrors = { email?: string; password?: string; nationalId?: string };

interface UseLoginFormParams {
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
}

export function useLoginForm({ signIn }: UseLoginFormParams) {
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [loginMethod, setLoginMethod] = useState<LoginMethod>('email');
  const [isLoading, setIsLoading] = useState(false);
  const [nidAttemptsRemaining, setNidAttemptsRemaining] = useState<number | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [nidLockedUntil, setNidLockedUntil] = useState<number | null>(() => {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEYS.NID_LOCKED_UNTIL);
      if (stored) {
        const val = Number(stored);
        return val > Date.now() ? val : null;
      }
    } catch { /* silent */ }
    return null;
  });

  const isMountedRef = useIsMountedRef();
  const formRef = useRef<HTMLFormElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const nidRef = useRef<HTMLInputElement>(null);

  const clearFieldError = useCallback((field: keyof FieldErrors) => {
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  const validateEmailFormat = useCallback((value: string) => {
    if (value && !EMAIL_REGEX.test(value)) {
      setFieldErrors((prev) => ({ ...prev, email: 'صيغة البريد الإلكتروني غير صحيحة' }));
    }
  }, []);

  const focusFirstError = useCallback((errors: FieldErrors) => {
    if (errors.email) emailRef.current?.focus();
    else if (errors.nationalId) nidRef.current?.focus();
    else if (errors.password) passwordRef.current?.focus();
  }, []);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    const errors: FieldErrors = {};
    if (loginMethod === 'email') {
      if (!loginEmail) errors.email = 'يرجى إدخال البريد الإلكتروني';
      else if (!EMAIL_REGEX.test(loginEmail)) errors.email = 'صيغة البريد الإلكتروني غير صحيحة';
      if (!loginPassword) errors.password = 'يرجى إدخال كلمة المرور';
    } else {
      if (!nationalId) errors.nationalId = 'يرجى إدخال رقم الهوية';
      if (!loginPassword) errors.password = 'يرجى إدخال كلمة المرور';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      focusFirstError(errors);
      return;
    }

    setIsLoading(true);

    try {
      if (loginMethod === 'national_id') {
        await handleNationalIdLogin(nationalId, loginPassword, {
          nidLockedUntil,
          setNidLockedUntil,
          setNidAttemptsRemaining,
        });
        return;
      }

      const resolvedEmail = normalizeArabicDigits(loginEmail);

      const { error } = await signIn(resolvedEmail, loginPassword);
      if (error) {
        const msg = getSafeErrorMessage(error);
        setServerError(msg);
        defaultNotify.error(msg);
        logAccessEvent({
          event_type: 'login_failed',
          email: resolvedEmail,
          metadata: { error_message: 'login_error', login_method: loginMethod },
        });
      }
    } catch {
      const msg = 'حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.';
      setServerError(msg);
      defaultNotify.error(msg);
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  };

  return {
    // حالة
    loginEmail, setLoginEmail,
    loginPassword, setLoginPassword,
    nationalId, setNationalId,
    loginMethod, setLoginMethod,
    isLoading,
    nidAttemptsRemaining,
    serverError, setServerError,
    fieldErrors,
    nidLockedUntil,
    // مراجع
    formRef, emailRef, passwordRef, nidRef,
    // دوال
    clearFieldError,
    validateEmailFormat,
    handleSignIn,
  };
}
