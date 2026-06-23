/**
 * هوك دمج بيانات لوحة التحكم — RPC مُجمّعة عبر Edge Function.
 * Toast الخاص بانتهاء الجلسة نُقل إلى lib/api/invoke.ts كسلوك افتراضي
 * (lib مسموح له بـ toast، hooks/data نقية).
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { invoke } from '@/lib/api/invoke';
import { STALE_FINANCIAL } from '@/lib/queryStaleTime';
import { useMemo } from 'react';
import { isFyReady } from '@/constants/fiscalYearIds';
import { dashboardKeys } from '@/lib/queryKeys/dashboardKeys';

export type {
  AggregatedTotals, AggregatedCollection, AggregatedOccupancy, AggregatedCounts,
  AggregatedYoY, AggregatedFiscalYear, AggregatedBeneficiary, AggregatedData,
  AggregatedSettings,
  HeatmapInvoice, PendingAdvance, RecentContract, DashboardSummaryResponse,
} from '@/types/financial/dashboard';

import type { DashboardSummaryResponse, HeatmapInvoice, RecentContract } from '@/types/financial/dashboard';

export const useDashboardSummary = (fiscalYearId: string, fiscalYearLabel?: string) => {
  const query = useQuery<DashboardSummaryResponse>({
    queryKey: dashboardKeys.summary(fiscalYearId),
    staleTime: STALE_FINANCIAL,
    // F2: إبقاء بيانات السنة السابقة ظاهرة أثناء جلب السنة الجديدة (تبديل سلس بلا skeleton كامل)
    placeholderData: (prev) => prev,
    queryFn: async () => {
      const raw = await invoke<DashboardSummaryResponse>(
        'dashboard-summary',
        { body: { fiscal_year_id: fiscalYearId, fiscal_year_label: fiscalYearLabel } },
        {
          // عند انتهاء الجلسة: lib/api/invoke يُشعر المستخدم تلقائياً — نُكمل بـ signOut.
          onAuthError: async () => {
            await supabase.auth.signOut();
          },
        },
      );
      const { dashboardSummarySchema, parseOrThrow } = await import('@/lib/api/schemas');
      parseOrThrow(dashboardSummarySchema, raw, 'dashboard-summary');
      return raw;
    },
    enabled: !!fiscalYearId && isFyReady(fiscalYearId),
  });

  const data = query.data;

  const yoy = useMemo(() => {
    const y = data?.aggregated?.yoy;
    if (!y?.has_prev) {
      return { prevTotalIncome: 0, prevTotalExpenses: 0, prevNetAfterExpenses: 0, hasPrevYear: false };
    }
    const prevIncome = y.prev_income ?? 0;
    const prevExpenses = y.prev_expenses ?? 0;
    const prevNet = y.prev_has_account && typeof y.prev_net_after_zakat === 'number'
      ? y.prev_net_after_zakat
      : prevIncome - prevExpenses;
    return {
      prevTotalIncome: prevIncome,
      prevTotalExpenses: prevExpenses,
      prevNetAfterExpenses: prevNet,
      hasPrevYear: true,
    };
  }, [data?.aggregated?.yoy]);

  return {
    aggregated: data?.aggregated ?? null,
    pendingAdvances: data?.pending_advances ?? [],
    yoy,
    isLoading: query.isLoading,
    isError: query.isError,
  };
};

export const useDashboardSecondary = (fiscalYearId: string, enabled: boolean) => {
  const isAll = fiscalYearId === 'all';

  const heatmapQuery = useQuery<HeatmapInvoice[]>({
    queryKey: dashboardKeys.heatmap(fiscalYearId),
    staleTime: STALE_FINANCIAL,
    enabled: !!fiscalYearId && enabled && isFyReady(fiscalYearId),
    queryFn: async () => {
      let q = supabase
        .from('payment_invoices')
        .select('id, contract_id, invoice_number, payment_number, due_date, amount, status, paid_date, paid_amount, zatca_status, fiscal_year_id, contract:contracts(contract_number, tenant_name, property_id, payment_count, property:properties(property_number))')
        .order('due_date', { ascending: true })
        .limit(2000);
      if (!isAll) q = q.eq('fiscal_year_id', fiscalYearId);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as unknown as HeatmapInvoice[];
    },
  });

  const recentQuery = useQuery<RecentContract[]>({
    queryKey: dashboardKeys.recentContracts(fiscalYearId),
    staleTime: STALE_FINANCIAL,
    enabled: !!fiscalYearId && enabled && isFyReady(fiscalYearId),
    queryFn: async () => {
      let q = supabase
        .from('contracts')
        .select('id, contract_number, tenant_name, property_id, unit_id, start_date, end_date, rent_amount, payment_type, payment_count, payment_amount, status, fiscal_year_id, created_at, property:properties(id, property_number), unit:units(id, unit_number, status)')
        .order('created_at', { ascending: false })
        .limit(5);
      if (!isAll) q = q.eq('fiscal_year_id', fiscalYearId);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as unknown as RecentContract[];
    },
  });

  return {
    heatmapInvoices: heatmapQuery.data ?? [],
    recentContracts: recentQuery.data ?? [],
    isLoading: heatmapQuery.isLoading || recentQuery.isLoading,
    isError: heatmapQuery.isError || recentQuery.isError,
    heatmapError: heatmapQuery.error ?? null,
    recentContractsError: recentQuery.error ?? null,
    isHeatmapError: heatmapQuery.isError,
    isRecentContractsError: recentQuery.isError,
  };
};
