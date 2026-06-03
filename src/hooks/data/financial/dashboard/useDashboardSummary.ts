/**
 * هوك دمج بيانات لوحة التحكم — RPC مُجمّعة عبر Edge Function
 * + هوك ثانوي لجلب heatmap و recent_contracts مباشرة من العميل
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { invoke } from '@/lib/api/invoke';
import { STALE_FINANCIAL } from '@/lib/queryStaleTime';
import { useMemo } from 'react';
import { isFyReady } from '@/constants/fiscalYearIds';
import { dashboardKeys } from '@/lib/queryKeys/dashboardKeys';

// إعادة تصدير الأنواع من الملف المنفصل
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
    queryFn: async () => {
      const raw = await invoke<DashboardSummaryResponse>(
        'dashboard-summary',
        { body: { fiscal_year_id: fiscalYearId, fiscal_year_label: fiscalYearLabel } },
        {
          onAuthError: async () => {
            // جلسة منتهية — إعلام المستخدم قبل تسجيل الخروج (لا يجوز خروج صامت)
            const { uiNotify } = await import('@/lib/notify');
            uiNotify.error('انتهت الجلسة، يُرجى تسجيل الدخول من جديد');
            await supabase.auth.signOut();
          },
        },
      );
      // Zod: تحقق من الحقول الأساسية فقط (aggregated يبقى unknown — يأتي من RPC)
      const { dashboardSummarySchema, parseOrThrow } = await import('@/lib/api/schemas');
      parseOrThrow(dashboardSummarySchema, raw, 'dashboard-summary');
      return raw;
    },
    enabled: !!fiscalYearId && isFyReady(fiscalYearId),
  });

  const data = query.data;

  // ── YoY من البيانات المُجمّعة ──
  // P3-Stage3: استخدام prev_net_after_zakat من snapshot الحساب الختامي للسنة السابقة
  // (يتضمن corpus_previous + vat + zakat) بدل التقريب income - expenses
  const yoy = useMemo(() => {
    const y = data?.aggregated?.yoy;
    if (!y?.has_prev) {
      return { prevTotalIncome: 0, prevTotalExpenses: 0, prevNetAfterExpenses: 0, hasPrevYear: false };
    }
    const prevIncome = y.prev_income ?? 0;
    const prevExpenses = y.prev_expenses ?? 0;
    // إذا توفر snapshot للسنة السابقة نستخدم net_after_zakat الدقيق، وإلا fallback للفرق
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

/**
 * هوك ثانوي — يجلب heatmap_invoices و recent_contracts مباشرة من Supabase
 * يُحمّل بعد KPIs لتقليل زمن الاستجابة الأولي.
 * يعيد أخطاء كل استعلام بشكل منفصل لتمكين fallback UI دقيق.
 */
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
        .limit(2000); // التزام invoice-pagination-strategy (≤2000) لتفادي بتر السنوات الكبيرة
      if (!isAll) q = q.eq('fiscal_year_id', fiscalYearId);
      const { data, error } = await q;
      if (error) throw error;
      // nested join contract→property — cast مطلوب للعلاقة المتداخلة
      return (data || []) as unknown as HeatmapInvoice[];
    },
  });

  const recentQuery = useQuery<RecentContract[]>({
    queryKey: dashboardKeys.recentContracts(fiscalYearId),
    staleTime: STALE_FINANCIAL,
    enabled: !!fiscalYearId && enabled && isFyReady(fiscalYearId),
    queryFn: async () => {
      // إصلاح اتساق: فلترة بالسنة المختارة مثل heatmap — حتى لا تظهر عقود من سنة مختلفة
      let q = supabase
        .from('contracts')
        .select('id, contract_number, tenant_name, property_id, unit_id, start_date, end_date, rent_amount, payment_type, payment_count, payment_amount, status, fiscal_year_id, created_at, property:properties(id, property_number), unit:units(id, unit_number, status)')
        .order('created_at', { ascending: false })
        .limit(5);
      if (!isAll) q = q.eq('fiscal_year_id', fiscalYearId);
      const { data, error } = await q;
      if (error) throw error;
      // nested join property+unit — cast مطلوب للعلاقة المتداخلة
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
