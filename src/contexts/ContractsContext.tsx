/**
 * ContractsProvider — يلغي props drilling بين ContractsPage و ContractsTabContent
 * (موجة 17 — decoupling)
 *
 * يُغلِّف القيمة المُعادة من useContractsPage ويوفّرها للأبناء عبر hook واحد.
 * الـ context value و hook المستهلك في ملفات منفصلة لتفعيل Fast Refresh.
 */
import type { ReactNode } from 'react';
import { ContractsContext, type ContractsContextValue } from './ContractsContextValue';

export const ContractsProvider = ({ value, children }: { value: ContractsContextValue; children: ReactNode }) => (
  <ContractsContext.Provider value={value}>{children}</ContractsContext.Provider>
);
