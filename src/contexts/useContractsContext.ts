/**
 * useContractsContext — hook مستهلك لـ ContractsContext
 * (مُستخرَج من ContractsContext.tsx لتفعيل Fast Refresh)
 */
import { useContext } from 'react';
import { ContractsContext, type ContractsContextValue } from './ContractsContextValue';

export const useContractsContext = (): ContractsContextValue => {
  const ctx = useContext(ContractsContext);
  if (!ctx) throw new Error('useContractsContext must be used within ContractsProvider');
  return ctx;
};
