/**
 * useAggregatedAnnualReport — يجمّع بيانات التقرير السنوي المُجمَّع للناظر
 * مصدر الأرقام: dashboard-summary RPC (نفس بطاقات لوحة الناظر → ضمان تطابق)
 * مصدر التفاصيل: income/expenses/distributions/beneficiaries/annual_report_items
 */
import { useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useFiscalYear } from '@/contexts/FiscalYearContext';
import { useDashboardSummary } from '@/hooks/data/financial/dashboard/useDashboardSummary';
import { useIncomeByFiscalYear } from '@/hooks/data/financial/income/useIncome';
import { useExpensesByFiscalYear } from '@/hooks/data/financial/expenses/useExpenses';
import { useAnnualReportItems } from '@/hooks/data/content/useAnnualReport';
import { useProperties } from '@/hooks/data/properties/useProperties';
import { usePdfWaqfInfo } from '@/hooks/data/settings/waqf/usePdfWaqfInfo';
import { uiNotify } from '@/lib/notify';
import { safeNumber } from '@/utils/format/safeNumber';
import { toGregorianShort } from '@/utils/format/date';
import { isFyReady } from '@/constants/fiscalYearIds';
import { STALE_FINANCIAL } from '@/lib/queryStaleTime';
import type { AggregatedAnnualPdfData } from '@/utils/pdf/reports/aggregatedAnnualReport';

interface DistributionRow {
  date: string;
  amount: number;
  status: string;
  beneficiary: { name: string } | null;
}

export function useAggregatedAnnualReport() {
  const { fiscalYearId, fiscalYear } = useFiscalYear();
  const ready = isFyReady(fiscalYearId);
  const waqfInfo = usePdfWaqfInfo();

  const summary = useDashboardSummary(fiscalYearId, fiscalYear?.label);
  const { data: income = [] } = useIncomeByFiscalYear(ready ? fiscalYearId : 'all');
  const { data: expenses = [] } = useExpensesByFiscalYear(ready ? fiscalYearId : 'all');
  const { data: items = [] } = useAnnualReportItems(ready ? fiscalYearId : undefined);
  const { data: properties = [] } = useProperties();

  const { data: distributions = [] } = useQuery<DistributionRow[]>({
    queryKey: ['aggregated-distributions', fiscalYearId],
    staleTime: STALE_FINANCIAL,
    enabled: ready,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('distributions')
        .select('date, amount, status, beneficiary:beneficiaries(name)')
        .eq('fiscal_year_id', fiscalYearId)
        .eq('status', 'paid')
        .order('date', { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as unknown as DistributionRow[];
    },
  });

  const handleExport = useCallback(async () => {
    if (!summary.aggregated || !fiscalYear) {
      uiNotify.error('يرجى اختيار سنة مالية محددة');
      return;
    }
    const agg = summary.aggregated;
    const t = agg.totals;
    const adminPct = safeNumber(agg.settings.admin_share_percentage) || 10;
    const waqifPct = safeNumber(agg.settings.waqif_share_percentage) || 5;

    // breakdown من السطور (للسنة النشطة) — للسنة المقفلة الأرقام من snapshot أصلاً
    const incomeBySource: Record<string, number> = {};
    income.forEach(r => {
      const k = r.source ?? 'غير محدد';
      incomeBySource[k] = (incomeBySource[k] ?? 0) + safeNumber(r.amount);
    });
    const expensesByType: Record<string, number> = {};
    expenses.forEach(r => {
      // استبعاد VAT (مُدار مركزياً)
      const type = (r as { expense_type?: string }).expense_type ?? 'غير محدد';
      if (type === 'vat' || type === 'ضريبة القيمة المضافة') return;
      expensesByType[type] = (expensesByType[type] ?? 0) + safeNumber(r.amount);
    });

    const beneficiariesData = (agg.beneficiaries ?? []).map(b => ({
      name: b.name,
      share_percentage: safeNumber(b.share_percentage),
      computedShare: safeNumber(t.available_amount) * (safeNumber(b.share_percentage) / 100),
    }));

    const grouped = {
      property_status: items.filter(i => i.section_type === 'property_status'),
      achievement: items.filter(i => i.section_type === 'achievement'),
      challenge: items.filter(i => i.section_type === 'challenge'),
      future_plan: items.filter(i => i.section_type === 'future_plan'),
    };

    const gregorianRange = fiscalYear.start_date && fiscalYear.end_date
      ? `${toGregorianShort(fiscalYear.start_date)}م — ${toGregorianShort(fiscalYear.end_date)}م`
      : undefined;

    const pdfData: AggregatedAnnualPdfData = {
      fiscalYearLabel: fiscalYear.label,
      gregorianRange,
      isClosed: fiscalYear.status === 'closed',
      totalIncome: safeNumber(t.total_income),
      totalExpenses: safeNumber(t.total_expenses),
      netAfterExpenses: safeNumber(t.net_after_expenses),
      vatAmount: safeNumber(t.vat_amount),
      netAfterVat: safeNumber(t.net_after_vat),
      zakatAmount: safeNumber(t.zakat_amount),
      netAfterZakat: safeNumber(t.net_after_zakat),
      adminShare: safeNumber(t.admin_share),
      adminPct,
      waqifShare: safeNumber(t.waqif_share),
      waqifPct,
      waqfRevenue: safeNumber(t.waqf_revenue),
      waqfCorpusManual: safeNumber(t.waqf_corpus_manual),
      waqfCorpusPrevious: safeNumber(t.waqf_corpus_previous),
      availableAmount: safeNumber(t.available_amount),
      distributionsAmount: safeNumber(t.distributions_amount),
      remainingBalance: safeNumber(t.remaining_balance),
      incomeBySource,
      expensesByType,
      beneficiaries: beneficiariesData,
      distributions: distributions.map(d => ({
        date: d.date,
        beneficiary: d.beneficiary?.name ?? '-',
        amount: safeNumber(d.amount),
        status: d.status,
      })),
      yoy: summary.yoy.hasPrevYear && agg.yoy.prev_label
        ? {
            prevLabel: agg.yoy.prev_label,
            prevIncome: summary.yoy.prevTotalIncome,
            prevExpenses: summary.yoy.prevTotalExpenses,
            prevNetAfterZakat: summary.yoy.prevNetAfterExpenses,
          }
        : null,
      achievements: grouped.achievement.map(i => ({ title: i.title, content: i.content })),
      challenges: grouped.challenge.map(i => ({ title: i.title, content: i.content })),
      futurePlans: grouped.future_plan.map(i => ({ title: i.title, content: i.content })),
      propertyStatuses: grouped.property_status.map(i => {
        const prop = properties.find(p => p.id === i.property_id);
        return {
          title: i.title,
          content: i.content,
          propertyName: prop ? `${prop.property_number} — ${prop.location}` : undefined,
        };
      }),
      counts: {
        properties: safeNumber(agg.counts.properties),
        activeContracts: safeNumber(agg.counts.active_contracts),
        beneficiaries: safeNumber(agg.counts.beneficiaries),
        rentedUnits: safeNumber(agg.occupancy.rented_units),
        totalUnits: safeNumber(agg.occupancy.total_units),
      },
    };

    const { generateAggregatedAnnualReportPDF } = await import('@/utils/pdf');
    const ok = await generateAggregatedAnnualReportPDF(pdfData, waqfInfo);
    if (ok) uiNotify.success('تم تصدير التقرير السنوي المُجمَّع بنجاح');
    else uiNotify.error('فشل تصدير التقرير السنوي المُجمَّع');
  }, [summary, fiscalYear, income, expenses, items, properties, distributions, waqfInfo]);

  const canExport = useMemo(
    () => ready && !!summary.aggregated && !summary.isLoading,
    [ready, summary.aggregated, summary.isLoading],
  );

  return { handleExport, canExport, isLoading: summary.isLoading };
}
