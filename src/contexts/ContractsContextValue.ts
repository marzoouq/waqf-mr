/**
 * تعريف ContractsContext + النوع — مُستخرَج لتفعيل Fast Refresh
 */
import { createContext } from 'react';
import type { useContractsPage } from '@/hooks/page/admin/contracts/useContractsPage';

export type ContractsContextValue = ReturnType<typeof useContractsPage>;

export const ContractsContext = createContext<ContractsContextValue | null>(null);
