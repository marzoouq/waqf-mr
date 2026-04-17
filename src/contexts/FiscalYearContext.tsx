import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { useActiveFiscalYear, FiscalYear } from '@/hooks/data/financial/useFiscalYears';
import { useAuth } from '@/hooks/auth/useAuthContext';
import { useDashboardPrefetch } from '@/hooks/data/dashboard/useDashboardPrefetch';
import { logger } from '@/lib/logger';
import { FY_NONE, FY_ALL, isFyReady, isFyAll } from '@/constants/fiscalYearIds';
import { STORAGE_KEYS } from '@/constants/storageKeys';

interface FiscalYearContextType {
  fiscalYearId: string;
  setFiscalYearId: (id: string) => void;
  fiscalYear: FiscalYear | null;
  fiscalYears: FiscalYear[];
  isClosed: boolean;
  isLoading: boolean;
  noPublishedYears: boolean;
  /** هل تم اختيار سنة مالية محددة (وليس "الكل")؟ */
  isSpecificYear: boolean;
}

const FiscalYearContext = createContext<FiscalYearContextType | undefined>(undefined);

const STORAGE_KEY = STORAGE_KEYS.FISCAL_YEAR;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function FiscalYearProvider({ children }: { children: React.ReactNode }) {
  const { data: activeFY, fiscalYears, isLoading } = useActiveFiscalYear();
  const { role, loading: authLoading } = useAuth();
  const [selectedId, setSelectedId] = useState<string>(() => {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY) || '';
      return UUID_RE.test(stored) ? stored : '';
    } catch { return ''; }
  });

  // #34: المحاسب يُعامَل كأنه ليس "non-admin" لأنه يحتاج وصولاً تشغيلياً
  // لكل السنوات (لإدخال قيود/تسديد فواتير في أي سنة مفتوحة). فقط المستفيد/الواقف
  // مقيّدان بالسنوات المنشورة عبر هذا الفلاغ.
  const isNonAdmin = role === 'beneficiary' || role === 'waqif';

  // Once fiscal years load, validate stored selection
  // D5: Also clean up when noPublishedYears (fiscalYears.length === 0)
  useEffect(() => {
    if (!isLoading && selectedId) {
      if (fiscalYears.length === 0) {
        // No fiscal years available (e.g. beneficiary with no published years)
        setSelectedId('');
        try { sessionStorage.removeItem(STORAGE_KEY); } catch { /* ignored */ }
      } else {
        const exists = fiscalYears.some(fy => fy.id === selectedId);
        if (!exists) {
          setSelectedId('');
          try { sessionStorage.removeItem(STORAGE_KEY); } catch { /* ignored */ }
        }
      }
    }
  }, [isLoading, fiscalYears, selectedId]);

  // For beneficiary/waqif: RLS already filters to published-only fiscal years.
  // If no fiscal years are available (all unpublished), don't fallback to 'all'.
  const noPublishedYears = !isLoading && !authLoading && isNonAdmin && fiscalYears.length === 0;

  const fiscalYearId = (isLoading || authLoading)
    ? FY_NONE
    : noPublishedYears
      ? FY_NONE
      : (selectedId || activeFY?.id || (isNonAdmin ? (fiscalYears[0]?.id || FY_NONE) : FY_ALL));

  const fiscalYear = useMemo(
    () => (isFyAll(fiscalYearId) || !isFyReady(fiscalYearId)) ? null : (fiscalYears.find(fy => fy.id === fiscalYearId) || activeFY || null),
    [fiscalYears, fiscalYearId, activeFY]
  );
  const isClosed = fiscalYear?.status === 'closed';
  const isSpecificYear = !isFyAll(fiscalYearId) && isFyReady(fiscalYearId);

  // جلب مسبق لبيانات لوحة التحكم — منقول إلى hook منفصل (#24)
  useDashboardPrefetch({ fiscalYearId, fiscalYears });

  const handleSetFiscalYearId = useCallback((id: string) => {
    setSelectedId(id);
    try {
      if (id) {
        sessionStorage.setItem(STORAGE_KEY, id);
      } else {
        sessionStorage.removeItem(STORAGE_KEY);
      }
    } catch { /* storage unavailable */ }
  }, []);

  return (
    <FiscalYearContext.Provider value={{
      fiscalYearId,
      setFiscalYearId: handleSetFiscalYearId,
      fiscalYear,
      fiscalYears,
      isClosed,
      isLoading,
      noPublishedYears,
      isSpecificYear,
    }}>
      {children}
    </FiscalYearContext.Provider>
  );
}

/** قيمة احتياطية آمنة تُستخدم عند فقدان السياق مؤقتاً (تحديث chunk / HMR) */
const FALLBACK: FiscalYearContextType = {
  fiscalYearId: FY_NONE,
  setFiscalYearId: () => {},
  fiscalYear: null,
  fiscalYears: [],
  isClosed: false,
  isLoading: true,
  noPublishedYears: false,
  isSpecificYear: false,
};

export const useFiscalYear = () => {
  const context = useContext(FiscalYearContext);
  if (!context) {
    // بدلاً من الانهيار الكامل، نسجل تحذير ونعيد قيمة آمنة
    // هذا يحدث عادةً عند تحميل chunk قديم بعد تحديث التطبيق
    logger.warn('[FiscalYearContext] استُدعي useFiscalYear خارج FiscalYearProvider — إعادة قيمة احتياطية');
    return FALLBACK;
  }
  return context;
};
