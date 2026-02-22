import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { useActiveFiscalYear, FiscalYear } from '@/hooks/useFiscalYears';

interface FiscalYearContextType {
  fiscalYearId: string;
  setFiscalYearId: (id: string) => void;
  fiscalYear: FiscalYear | null;
  fiscalYears: FiscalYear[];
  isClosed: boolean;
  isLoading: boolean;
}

const FiscalYearContext = createContext<FiscalYearContextType | undefined>(undefined);

const STORAGE_KEY = 'waqf_selected_fiscal_year';

export const FiscalYearProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { data: activeFY, fiscalYears, isLoading } = useActiveFiscalYear();
  const [selectedId, setSelectedId] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEY) || '';
  });

  // Once fiscal years load, validate stored selection
  useEffect(() => {
    if (!isLoading && fiscalYears.length > 0 && selectedId) {
      const exists = fiscalYears.some(fy => fy.id === selectedId);
      if (!exists) {
        setSelectedId('');
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, [isLoading, fiscalYears, selectedId]);

  const fiscalYearId = selectedId || activeFY?.id || 'all';
  const fiscalYear = useMemo(
    () => fiscalYearId === 'all' ? null : (fiscalYears.find(fy => fy.id === fiscalYearId) || activeFY || null),
    [fiscalYears, fiscalYearId, activeFY]
  );
  const isClosed = fiscalYear?.status === 'closed';

  const handleSetFiscalYearId = (id: string) => {
    setSelectedId(id);
    if (id) {
      localStorage.setItem(STORAGE_KEY, id);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  return (
    <FiscalYearContext.Provider value={{
      fiscalYearId,
      setFiscalYearId: handleSetFiscalYearId,
      fiscalYear,
      fiscalYears,
      isClosed,
      isLoading,
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
