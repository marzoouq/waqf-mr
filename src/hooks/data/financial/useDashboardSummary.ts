/**
 * هوك دمج بيانات لوحة التحكم — RPC مُجمّعة عبر Edge Function
 * + هوك ثانوي لجلب heatmap و recent_contracts مباشرة من العميل
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { STALE_FINANCIAL } from '@/lib/queryStaleTime';
import { useMemo } from 'react';
import { isFyReady } from '@/constants/fiscalYearIds';

// إعادة تصدير الأنواع من الملف المنفصل
export type {
  AggregatedTotals, AggregatedCollection, AggregatedOccupancy, AggregatedCounts,
  AggregatedYoY, AggregatedFiscalYear, AggregatedBeneficiary, AggregatedData,
  HeatmapInvoice, PendingAdvance, RecentContract, DashboardSummaryResponse,
} from './useDashboardSummary.types';

import type { DashboardSummaryResponse, HeatmapInvoice, RecentContract } from './useDashboardSummary.types';

export const useDashboardSummary = (fiscalYearId: string, fiscalYearLabel?: string) => {
  const query = useQuery<DashboardSummaryResponse>({
    queryKey: ['dashboard-summary', fiscalYearId, fiscalYearLabel ?? ''],
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

  // ── YoY من البيانات المُجمّعة ──
  const yoy = useMemo(() => {
    const y = data?.aggregated?.yoy;
    if (!y?.has_prev) {
      return { prevTotalIncome: 0, prevTotalExpenses: 0, prevNetAfterExpenses: 0, hasPrevYear: false };
    }
    return {
      prevTotalIncome: y.prev_income ?? 0,
      prevTotalExpenses: y.prev_expenses ?? 0,
      prevNetAfterExpenses: (y.prev_income ?? 0) - (y.prev_expenses ?? 0),
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

/**
 * هوك ثانوي — يجلب heatmap_invoices و recent_contracts مباشرة من Supabase
 * يُحمّل بعد KPIs لتقليل زمن الاستجابة الأولي
 */
export const useDashboardSecondary = (fiscalYearId: string, enabled: boolean) => {
  const isAll = fiscalYearId === 'all';

  const heatmapQuery = useQuery<HeatmapInvoice[]>({
    queryKey: ['dashboard-heatmap', fiscalYearId],
    staleTime: STALE_FINANCIAL,
    enabled: !!fiscalYearId && enabled && isFyReady(fiscalYearId),
    queryFn: async () => {
      let q = supabase
        .from('payment_invoices')
        .select('id, contract_id, invoice_number, payment_number, due_date, amount, status, paid_date, paid_amount, zatca_status, fiscal_year_id, contract:contracts(contract_number, tenant_name, property_id, payment_count, property:properties(property_number))')
        .order('due_date', { ascending: true })
        .limit(500);
      if (!isAll) q = q.eq('fiscal_year_id', fiscalYearId);
      const { data, error } = await q;
      if (error) throw error;
      // nested join contract→property — cast مطلوب للعلاقة المتداخلة
      return (data || []) as unknown as HeatmapInvoice[];
    },
  });

  const recentQuery = useQuery<RecentContract[]>({
    queryKey: ['dashboard-recent-contracts', fiscalYearId],
    staleTime: STALE_FINANCIAL,
    enabled: !!fiscalYearId && enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contracts')
        .select('id, contract_number, tenant_name, property_id, unit_id, start_date, end_date, rent_amount, payment_type, payment_count, payment_amount, status, fiscal_year_id, created_at, property:properties(id, property_number), unit:units(id, unit_number, status)')
        .order('created_at', { ascending: false })
        .limit(5);
      if (error) throw error;
      // nested join property+unit — cast مطلوب للعلاقة المتداخلة
      return (data || []) as unknown as RecentContract[];
    },
  });

  return {
    heatmapInvoices: heatmapQuery.data ?? [],
    recentContracts: recentQuery.data ?? [],
    isLoading: heatmapQuery.isLoading || recentQuery.isLoading,
  };
};
