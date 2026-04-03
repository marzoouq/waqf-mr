/**
 * هوك دمج بيانات لوحة التحكم — RPC مُجمّعة + 3 استعلامات خفيفة
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { STALE_FINANCIAL } from '@/lib/queryStaleTime';

import { useMemo } from 'react';
import { isFyReady } from '@/constants/fiscalYearIds';

// ═══ أنواع البيانات المُجمّعة من RPC ═══
export interface AggregatedTotals {
  total_income: number;
  total_expenses: number;
  net_after_expenses: number;
  contractual_revenue: number;
  grand_total: number;
  vat_amount: number;
  zakat_amount: number;
  net_after_vat: number;
  net_after_zakat: number;
  admin_share: number;
  waqif_share: number;
  waqf_revenue: number;
  waqf_corpus_manual: number;
  waqf_corpus_previous: number;
  distributions_amount: number;
  available_amount: number;
  remaining_balance: number;
  share_base: number;
}

export interface AggregatedCollection {
  paid_count: number;
  partial_count: number;
  unpaid_count: number;
  overdue_count: number;
  total: number;
  percentage: number;
  total_collected: number;
  total_expected: number;
}

export interface AggregatedOccupancy {
  rented_units: number;
  total_units: number;
  rate: number;
}

export interface AggregatedCounts {
  properties: number;
  active_contracts: number;
  beneficiaries: number;
  pending_advances: number;
  expiring_contracts: number;
  orphaned_contracts: number;
  unsubmitted_zatca: number;
}

export interface AggregatedYoY {
  prev_fy_id: string | null;
  prev_label: string | null;
  prev_income: number;
  prev_expenses: number;
  has_prev: boolean;
}

export interface AggregatedFiscalYear {
  id: string;
  label: string;
  status: string;
  start_date: string;
  end_date: string;
  published: boolean;
  created_at?: string;
}

export interface AggregatedBeneficiary {
  id: string;
  name: string;
  share_percentage: number;
  user_id: string | null;
}

export interface AggregatedData {
  totals: AggregatedTotals;
  collection: AggregatedCollection;
  occupancy: AggregatedOccupancy;
  counts: AggregatedCounts;
  monthly_data: Array<{ month: string; income: number; expenses: number }>;
  expense_types: Array<{ name: string; value: number }>;
  yoy: AggregatedYoY;
  fiscal_years: AggregatedFiscalYear[];
  settings: Record<string, string>;
  beneficiaries: AggregatedBeneficiary[];
  fiscal_year_id: string;
  fiscal_year_status: string;
  fiscal_year_label: string;
  is_closed: boolean;
}

// ═══ أنواع الصفوف الخام المحدودة ═══
export interface HeatmapInvoice {
  id: string;
  contract_id: string;
  invoice_number: string;
  payment_number: number;
  due_date: string;
  amount: number;
  status: string;
  paid_date: string | null;
  paid_amount: number | null;
  zatca_status: string | null;
  fiscal_year_id: string | null;
  contract?: {
    contract_number: string;
    tenant_name: string;
    property_id: string;
    payment_count: number;
    property?: { property_number: string };
  };
}

export interface PendingAdvance {
  id: string;
  beneficiary_id: string;
  fiscal_year_id: string | null;
  amount: number;
  status: string;
  reason: string | null;
  created_at: string;
  approved_at: string | null;
  paid_at: string | null;
  rejection_reason: string | null;
  beneficiary?: { id: string; name: string; share_percentage: number; user_id: string | null };
  fiscal_year?: { label: string };
}

export interface RecentContract {
  id: string;
  contract_number: string;
  tenant_name: string;
  property_id: string;
  unit_id: string | null;
  start_date: string;
  end_date: string;
  rent_amount: number;
  payment_type: string;
  payment_count: number;
  payment_amount: number | null;
  status: string;
  fiscal_year_id: string | null;
  created_at: string;
  property?: { id: string; property_number: string };
  unit?: { id: string; unit_number: string; status: string };
}

interface DashboardSummaryResponse {
  aggregated: AggregatedData;
  heatmap_invoices: HeatmapInvoice[];
  pending_advances: PendingAdvance[];
  recent_contracts: RecentContract[];
  fetched_at: string;
}

export const useDashboardSummary = (fiscalYearId: string, fiscalYearLabel?: string) => {
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

  // ── YoY من البيانات المُجمّعة ──
  const yoy = useMemo(() => {
    const y = data?.aggregated?.yoy;
    if (!y?.has_prev) {
      return { prevTotalIncome: 0, prevTotalExpenses: 0, prevNetAfterExpenses: 0, hasPrevYear: false };
    }
    return {
      prevTotalIncome: y.prev_income,
      prevTotalExpenses: y.prev_expenses,
      prevNetAfterExpenses: y.prev_income - y.prev_expenses,
      hasPrevYear: true,
    };
  }, [data?.aggregated?.yoy]);

  return {
    aggregated: data?.aggregated ?? null,
    heatmapInvoices: data?.heatmap_invoices ?? [],
    pendingAdvances: data?.pending_advances ?? [],
    recentContracts: data?.recent_contracts ?? [],
    yoy,
    isLoading: query.isLoading,
    isError: query.isError,
  };
};
