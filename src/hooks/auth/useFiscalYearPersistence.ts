/**
 * useFiscalYearPersistence — M1.2 (Version I-R)
 * يعزل منطق sessionStorage hydration/cleanup للـ fiscal year.
 *
 * - يقرأ id محفوظ مبدئيًا (مع تحقق UUID).
 * - عند تحميل قائمة السنوات: يمسح id غير صالح أو غير موجود.
 * - يكشف setter يحفظ تلقائيًا في sessionStorage.
 */
import { useState, useEffect, useCallback } from 'react';
import { STORAGE_KEYS } from '@/constants/storageKeys';
import { safeSessionGet, safeSessionSet, safeSessionRemove } from '@/lib/storage';
import { UUID_REGEX } from '@/utils/validation/regexPatterns';
import type { FiscalYear } from '@/hooks/data/financial/useFiscalYears';

const STORAGE_KEY = STORAGE_KEYS.FISCAL_YEAR;

export function useFiscalYearPersistence(opts: {
  isLoading: boolean;
  fiscalYears: FiscalYear[];
}) {
  const { isLoading, fiscalYears } = opts;

  const [selectedId, setSelectedId] = useState<string>(() => {
    const stored = safeSessionGet(STORAGE_KEY, '');
    return UUID_REGEX.test(stored) ? stored : '';
  });

  // تنظيف selection غير الصالح بعد تحميل القائمة
  useEffect(() => {
    if (!isLoading && selectedId) {
      if (fiscalYears.length === 0) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- invalidate stale selection when remote list loads
        setSelectedId('');
        safeSessionRemove(STORAGE_KEY);
      } else {
        const exists = fiscalYears.some(fy => fy.id === selectedId);
        if (!exists) {
          setSelectedId('');
          safeSessionRemove(STORAGE_KEY);
        }
      }
    }
  }, [isLoading, fiscalYears, selectedId]);

  const setFiscalYearId = useCallback((id: string) => {
    setSelectedId(id);
    if (id) safeSessionSet(STORAGE_KEY, id);
    else safeSessionRemove(STORAGE_KEY);
  }, []);

  return { selectedId, setFiscalYearId };
}
