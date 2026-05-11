/**
 * هوكات إدارة الإيرادات (CRUD)
 * يوفر: useIncome, useCreateIncome, useUpdateIncome, useDeleteIncome, useIncomeByFiscalYear
 * الجدول: income | الربط: properties | الترتيب: حسب التاريخ
 *
 * M2.1: استعلام fiscal-year-filtered يمر عبر incomeService.
 */
import { createCrudFactory } from '../core/useCrudFactory';
import { Income } from '@/types';
import { useQuery } from '@tanstack/react-query';
import { STALE_FINANCIAL } from '@/lib/queryStaleTime';
import { isFyReady } from '@/constants/fiscalYearIds';
import { PER_FY_LIMIT } from '@/constants/pagination';
import { incomeService, INCOME_SELECT } from '@/lib/services/incomeService';

const incomeCrud = createCrudFactory<'income', Income>({
  table: 'income',
  queryKey: 'income',
  select: INCOME_SELECT,
  orderBy: 'date',
  label: 'الدخل',
});

export const useIncome = incomeCrud.useList;
export const useCreateIncome = incomeCrud.useCreate;
export const useUpdateIncome = incomeCrud.useUpdate;
export const useDeleteIncome = incomeCrud.useDelete;

/** Income filtered by fiscal year */
export const useIncomeByFiscalYear = (fiscalYearId: string | 'all') => {
  return useQuery({
    queryKey: ['income', 'fiscal_year', fiscalYearId],
    enabled: isFyReady(fiscalYearId),
    staleTime: STALE_FINANCIAL,
    queryFn: () => incomeService.listByFiscalYear(fiscalYearId),
    meta: { warnLimit: PER_FY_LIMIT },
  });
};
