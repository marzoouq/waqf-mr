import { useState, useCallback, useRef } from 'react';

/**
 * Hook مشترك لإدارة أخطاء الحقول المحلية مع دعم focus management
 */
export function useFieldErrors<T extends string>(fields: readonly T[]) {
  const [errors, setErrors] = useState<Partial<Record<T, string>>>({});
  const fieldRefs = useRef<Partial<Record<T, HTMLInputElement | null>>>({});

  const setError = useCallback((field: T, message: string) => {
    setErrors((prev) => ({ ...prev, [field]: message }));
  }, []);

  const clearError = useCallback((field: T) => {
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  const clearAll = useCallback(() => setErrors({}), []);

  const setMultiple = useCallback((errs: Partial<Record<T, string>>) => {
    setErrors(errs);
  }, []);

  const hasErrors = Object.keys(errors).length > 0;

  /** ينقل التركيز إلى أول حقل خاطئ */
  const focusFirstError = useCallback((currentErrors?: Partial<Record<T, string>>) => {
    const errs = currentErrors ?? errors;
    for (const field of fields) {
      if (errs[field] && fieldRefs.current[field]) {
        fieldRefs.current[field]?.focus();
        break;
      }
    }
  }, [errors, fields]);

  const registerRef = useCallback((field: T) => (el: HTMLInputElement | null) => {
    fieldRefs.current[field] = el;
  }, []);

  return { errors, setError, clearError, clearAll, setMultiple, hasErrors, focusFirstError, registerRef };
}
