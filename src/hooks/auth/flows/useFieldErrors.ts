/**
 * هوك مشترك لإدارة أخطاء حقول النماذج
 * يُستخدم في نماذج تسجيل الدخول والتسجيل لتوحيد منطق الأخطاء
 */
import { useState, useCallback, useMemo } from 'react';
import { EMAIL_REGEX } from '@/utils/validation/index';

export type FieldErrors<K extends string> = Partial<Record<K, string>>;

export function useFieldErrors<K extends string>() {
  const [fieldErrors, setFieldErrors] = useState<FieldErrors<K>>({});

  const clearFieldError = useCallback((field: K) => {
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  const setFieldError = useCallback((field: K, msg: string) => {
    setFieldErrors((prev) => ({ ...prev, [field]: msg }));
  }, []);

  const setErrors = useCallback((errors: FieldErrors<K>) => {
    setFieldErrors(errors);
  }, []);

  const hasErrors = useMemo(() => Object.keys(fieldErrors).length > 0, [fieldErrors]);

  /** تحقق من صيغة البريد الإلكتروني وتعيين خطأ إذا كانت غير صحيحة */
  const validateEmailFormat = useCallback((value: string, field: K = 'email' as K) => {
    if (value && !EMAIL_REGEX.test(value)) {
      setFieldErrors((prev) => ({ ...prev, [field]: 'صيغة البريد الإلكتروني غير صحيحة' }));
    }
  }, []);

  return {
    fieldErrors,
    clearFieldError,
    setFieldError,
    setErrors,
    hasErrors,
    validateEmailFormat,
  };
}
