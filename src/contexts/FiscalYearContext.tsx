import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { useActiveFiscalYear, FiscalYear } from '@/hooks/useFiscalYears';
import { useAuth } from '@/contexts/AuthContext';

interface FiscalYearContextType {
  fiscalYearId: string;
  setFiscalYearId: (id: string) => void;
  fiscalYear: FiscalYear | null;
  fiscalYears: FiscalYear[];
  isClosed: boolean;
  isLoading: boolean;
  noPublishedYears: boolean;
}

const FiscalYearContext = createContext<FiscalYearContextType | undefined>(undefined);

const STORAGE_KEY = 'waqf_selected_fiscal_year';

export function FiscalYearProvider({ children }: { children: React.ReactNode }) {
  const { data: activeFY, fiscalYears, isLoading } = useActiveFiscalYear();
  const { role, loading: authLoading } = useAuth();
  const [selectedId, setSelectedId] = useState<string>(() => {
    try { return localStorage.getItem(STORAGE_KEY) || ''; }
    catch { return ''; }
  });

  const isNonAdmin = role === 'beneficiary' || role === 'waqif';

  // Once fiscal years load, validate stored selection
  useEffect(() => {
    if (!isLoading && fiscalYears.length > 0 && selectedId) {
      const exists = fiscalYears.some(fy => fy.id === selectedId);
      if (!exists) {
        setSelectedId('');
        try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignored */ }
      }
    }
  }, [isLoading, fiscalYears, selectedId]);

  // For beneficiary/waqif: RLS already filters to published-only fiscal years.
  // If no fiscal years are available (all unpublished), don't fallback to 'all'.
  const noPublishedYears = !isLoading && !authLoading && isNonAdmin && fiscalYears.length === 0;

  const fiscalYearId = (isLoading || authLoading)
    ? '__none__'
    : noPublishedYears
      ? '__none__'
      : (selectedId || activeFY?.id || (isNonAdmin ? (fiscalYears[0]?.id || '__none__') : 'all'));

  const fiscalYear = useMemo(
    () => (fiscalYearId === 'all' || fiscalYearId === '__none__') ? null : (fiscalYears.find(fy => fy.id === fiscalYearId) || activeFY || null),
    [fiscalYears, fiscalYearId, activeFY]
  );
  const isClosed = fiscalYear?.status === 'closed';

  const handleSetFiscalYearId = (id: string) => {
    setSelectedId(id);
    try {
      if (id) {
        localStorage.setItem(STORAGE_KEY, id);
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch { /* storage unavailable */ }
  };

  return (
    <FiscalYearContext.Provider value={{
      fiscalYearId,
      setFiscalYearId: handleSetFiscalYearId,
      fiscalYear,
      fiscalYears,
      isClosed,
      isLoading,
      noPublishedYears,
    }}>
      {children}
    </FiscalYearContext.Provider>
  );
};

export const useFiscalYear = () => {
  const context = useContext(FiscalYearContext);
  if (!context) {
    throw new Error('useFiscalYear must be used within FiscalYearProvider');
  }
  return context;
};
