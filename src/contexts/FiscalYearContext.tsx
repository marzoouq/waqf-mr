import React, { createContext, useContext } from 'react';
import type { FiscalYear } from '@/hooks/data/financial/useFiscalYears';
import { useDashboardPrefetch } from '@/hooks/data/dashboard/useDashboardPrefetch';
import { useFiscalYearPersistence } from '@/hooks/auth/useFiscalYearPersistence';
import { useResolvedFiscalYear } from '@/hooks/auth/useResolvedFiscalYear';
import { logger } from '@/lib/logger';
import { FY_NONE } from '@/constants/fiscalYearIds';

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

/**
 * FiscalYearProvider — composition خفيف بعد M1.2 (Version I-R).
 * المسؤوليات الفرعية مُستخرَجة:
 *  - persistence → useFiscalYearPersistence
 *  - role-aware resolution → useResolvedFiscalYear
 *  - prefetch → useDashboardPrefetch (يبقى داخل Provider عمدًا)
 */
export function FiscalYearProvider({ children }: { children: React.ReactNode }) {
  const resolved = useResolvedFiscalYear('');
  const { selectedId, setFiscalYearId } = useFiscalYearPersistence({
    isLoading: resolved.isLoading,
    fiscalYears: resolved.fiscalYears,
  });

  // إعادة الحل بقيمة selectedId الفعلية (الـ persistence hook يدير الـ state)
  const final = useResolvedFiscalYear(selectedId);

  // جلب مسبق لبيانات لوحة التحكم — يبقى داخل Provider (مراجعة Version I-R)
  useDashboardPrefetch({
    fiscalYearId: final.fiscalYearId,
    fiscalYears: final.fiscalYears,
  });

  return (
    <FiscalYearContext.Provider
      value={{
        fiscalYearId: final.fiscalYearId,
        setFiscalYearId,
        fiscalYear: final.fiscalYear,
        fiscalYears: final.fiscalYears,
        isClosed: final.isClosed,
        isLoading: final.isLoading,
        noPublishedYears: final.noPublishedYears,
        isSpecificYear: final.isSpecificYear,
      }}
    >
      {children}
    </FiscalYearContext.Provider>
  );
}

/** قيمة احتياطية آمنة عند فقدان السياق مؤقتاً (تحديث chunk / HMR) */
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
    logger.warn('[FiscalYearContext] استُدعي useFiscalYear خارج FiscalYearProvider — إعادة قيمة احتياطية');
    return FALLBACK;
  }
  return context;
};
