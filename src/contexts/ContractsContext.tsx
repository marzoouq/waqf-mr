/**
 * ContractsContext — يلغي props drilling بين ContractsPage و ContractsTabContent
 * (موجة 17 — decoupling)
 *
 * يُغلِّف القيمة المُعادة من useContractsPage ويوفّرها للأبناء عبر hook واحد.
 */
import { createContext, useContext, type ReactNode } from 'react';
import type { useContractsPage } from '@/hooks/page/admin/contracts/useContractsPage';

export type ContractsContextValue = ReturnType<typeof useContractsPage>;

const ContractsContext = createContext<ContractsContextValue | null>(null);

export const ContractsProvider = ({ value, children }: { value: ContractsContextValue; children: ReactNode }) => (
  <ContractsContext.Provider value={value}>{children}</ContractsContext.Provider>
);

export const useContractsContext = (): ContractsContextValue => {
  const ctx = useContext(ContractsContext);
  if (!ctx) throw new Error('useContractsContext must be used within ContractsProvider');
  return ctx;
};
