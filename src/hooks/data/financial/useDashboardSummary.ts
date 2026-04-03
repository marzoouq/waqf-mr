/**
 * هوك دمج بيانات لوحة التحكم — طلب واحد بدلاً من ~10 طلبات
 */
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { STALE_FINANCIAL } from '@/lib/queryStaleTime';
import { logger } from '@/lib/logger';
import { useEffect, useMemo, useRef } from 'react';
import type { Income, Expense, Account, Property, Contract } from '@/types/database';
import type { PaymentInvoice } from '@/hooks/data/invoices/usePaymentInvoices';
import type { ContractFiscalAllocation } from '@/hooks/financial/useContractAllocations';
import type { AdvanceRequest } from '@/hooks/financial/useAdvanceRequests';
import type { FiscalYear } from '@/hooks/financial/useFiscalYears';
import { isFyReady } from '@/constants/fiscalYearIds';

interface ComputedStats {
  totalIncome: number;
  totalExpenses: number;
  monthlyData: Array<{ month: string; income: number; expenses: number }>;
  expenseTypes: Array<{ name: string; value: number }>;
  collection: {
    paidCount: number;
    partialCount: number;
    unpaidCount: number;
    total: number;
    percentage: number;
    totalCollected: number;
    totalExpected: number;
  };
}

interface DashboardSummaryResponse {
  properties: Property[];
  contracts: Contract[];
  units: Array<{ id: string; property_id: string; unit_number: string; unit_type: string; floor: string | null; area: number | null; status: string; notes: string | null; created_at: string; updated_at: string }>;
  payment_invoices: PaymentInvoice[];
  contract_allocations: ContractFiscalAllocation[];
  advance_requests: AdvanceRequest[];
  orphaned_contracts: Array<{ id: string; contract_number: string }>;
  income: Income[];
  expenses: Expense[];
  accounts: Account[];
  beneficiaries: Array<{ id: string; name: string; share_percentage: number; user_id: string | null }>;
  settings: Record<string, string>;
  fiscal_years: FiscalYear[];
  prev_year: {
    fiscal_year_id: string;
    label: string;
    total_income: number;
    total_expenses: number;
  } | null;
  computed?: ComputedStats;
  fetched_at: string;
}

export const useDashboardSummary = (fiscalYearId: string, fiscalYearLabel?: string) => {
  const queryClient = useQueryClient();
  const primedRef = useRef<string | null>(null);

  const query = useQuery<DashboardSummaryResponse>({
    queryKey: ['dashboard-summary', fiscalYearId],
    staleTime: STALE_FINANCIAL,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('dashboard-summary', {
        body: { fiscal_year_id: fiscalYearId, fiscal_year_label: fiscalYearLabel },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as DashboardSummaryResponse;
    },
    enabled: !!fiscalYearId && isFyReady(fiscalYearId),
  });

  const data = query.data;

  useEffect(() => {
    if (!data || primedRef.current === data.fetched_at) return;
    primedRef.current = data.fetched_at;

    queryClient.setQueryData(['properties'], data.properties);
    queryClient.setQueryData(['contracts', 'fiscal_year', fiscalYearId], data.contracts);
    queryClient.setQueryData(['all-units'], data.units);
    queryClient.setQueryData(['payment_invoices', fiscalYearId], data.payment_invoices);
    queryClient.setQueryData(['contract_fiscal_allocations', fiscalYearId !== 'all' ? fiscalYearId : undefined], data.contract_allocations);
    queryClient.setQueryData(['advance_requests', fiscalYearId !== 'all' ? fiscalYearId : 'all'], data.advance_requests);
    queryClient.setQueryData(['fiscal_years'], data.fiscal_years);
    queryClient.setQueryData(['income', 'fiscal_year', fiscalYearId], data.income);
    queryClient.setQueryData(['expenses', 'fiscal_year', fiscalYearId], data.expenses);
    queryClient.setQueryData(['accounts', 'fiscal_year', fiscalYearId], data.accounts);
    queryClient.setQueryData(['beneficiaries-safe'], data.beneficiaries);
    queryClient.setQueryData(['app-settings-all'], data.settings);
    queryClient.setQueryData(['contracts', 'orphaned'], data.orphaned_contracts);

    logger.info(`[dashboard-summary] تم تعبئة ${Object.keys(data).length - 1} cache في طلب واحد`);
  }, [data, fiscalYearId, queryClient]);

  const yoy = useMemo(() => {
    if (!data?.prev_year) {
      return { prevTotalIncome: 0, prevTotalExpenses: 0, prevNetAfterExpenses: 0, hasPrevYear: false };
    }
    const { total_income, total_expenses } = data.prev_year;
    return {
      prevTotalIncome: total_income,
      prevTotalExpenses: total_expenses,
      prevNetAfterExpenses: total_income - total_expenses,
      hasPrevYear: true,
    };
  }, [data?.prev_year]);

  return {
    properties: data?.properties ?? [],
    contracts: data?.contracts ?? [],
    allUnits: data?.units ?? [],
    paymentInvoices: data?.payment_invoices ?? [],
    contractAllocations: data?.contract_allocations ?? [],
    advanceRequests: data?.advance_requests ?? [],
    orphanedContracts: data?.orphaned_contracts ?? [],
    income: data?.income ?? [],
    expenses: data?.expenses ?? [],
    accounts: data?.accounts ?? [],
    beneficiaries: data?.beneficiaries ?? [],
    settings: data?.settings ?? null,
    allFiscalYears: data?.fiscal_years ?? [],
    yoy,
    isLoading: query.isLoading,
    isError: query.isError,
  };
};
