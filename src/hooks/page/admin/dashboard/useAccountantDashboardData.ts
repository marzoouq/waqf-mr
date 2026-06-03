/**
 * هوك بيانات لوحة المحاسب المخصصة — يستخرج مقاييس تشغيلية من بيانات RPC المُجمّعة
 */
import { useMemo } from 'react';
import type { AggregatedData } from '@/hooks/data/financial/dashboard/useDashboardSummary';
import type { HeatmapInvoice } from '@/hooks/data/financial/dashboard/useDashboardSummary';

export interface OverdueInvoice {
  id: string;
  invoiceNumber: string;
  tenantName: string;
  propertyNumber: string;
  /** المبلغ المتبقي (amount - paid_amount للجزئية) */
  amount: number;
  dueDate: string;
  daysOverdue: number;
}


export interface MonthlyCollectionItem {
  month: string;
  expected: number;
  collected: number;
  rate: number;
}

export interface AccountantMetrics {
  /** فواتير متأخرة */
  overdueInvoices: OverdueInvoice[];
  overdueTotal: number;
  /**
   * نسبة توثيق المصروفات — `null` تعني "غير متاح حالياً" (لا يوجد RPC يحسبها).
   * المنطق الفعلي مُتاح في `utils/financial/documentationRate.ts` لكن يتطلب جلب
   * expenses + invoices كاملة — تأجيل التكامل لتفادي توسيع scope الجلب.
   */
  undocumentedExpensesCount: number | null;
  documentationRate: number | null;
  /** ملخص التحصيل الشهري */
  monthlyCollection: MonthlyCollectionItem[];
  /** فواتير ZATCA غير مُرسلة */
  unsubmittedZatcaCount: number;
  /** عقود بدون فواتير */
  orphanedContractsCount: number;
  /** إجمالي الفواتير المعلقة */
  pendingInvoicesCount: number;
  /** إجمالي المُحصّل / المتوقع */
  totalCollected: number;
  totalExpected: number;
}

interface UseAccountantDashboardDataParams {
  aggregated: AggregatedData | null;
  heatmapInvoices: HeatmapInvoice[];
}

export function useAccountantDashboardData({ aggregated, heatmapInvoices }: UseAccountantDashboardDataParams): AccountantMetrics {
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  /** فواتير متأخرة — مرتبة بالأقدم أولاً (تشمل partially_paid المتأخرة، والمبلغ = المتبقي) */
  const overdueInvoices = useMemo<OverdueInvoice[]>(() => {
    if (!heatmapInvoices.length) return [];
    const now = new Date();
    return heatmapInvoices
      .filter(inv => {
        const isPastDue = inv.due_date < today;
        return inv.status === 'overdue'
          || (isPastDue && (inv.status === 'pending' || inv.status === 'partially_paid'));
      })
      .map(inv => {
        const dueDate = new Date(inv.due_date);
        const daysOverdue = Math.floor((now.getTime() - dueDate.getTime()) / 86_400_000);
        const remaining = inv.status === 'partially_paid'
          ? Math.max(0, inv.amount - (inv.paid_amount ?? 0))
          : inv.amount;
        return {
          id: inv.id,
          invoiceNumber: inv.invoice_number,
          tenantName: inv.contract?.tenant_name ?? '—',
          propertyNumber: inv.contract?.property?.property_number ?? '—',
          amount: remaining,
          dueDate: inv.due_date,
          daysOverdue,
        };
      })
      .sort((a, b) => b.daysOverdue - a.daysOverdue);
  }, [heatmapInvoices, today]);


  const overdueTotal = useMemo(() => overdueInvoices.reduce((s, i) => s + i.amount, 0), [overdueInvoices]);

  /** ملخص تحصيل شهري */
  const monthlyCollection = useMemo<MonthlyCollectionItem[]>(() => {
    if (!heatmapInvoices.length) return [];
    const monthMap = new Map<string, { expected: number; collected: number }>();

    for (const inv of heatmapInvoices) {
      const month = inv.due_date.slice(0, 7);
      const entry = monthMap.get(month) ?? { expected: 0, collected: 0 };
      entry.expected += inv.amount;
      if (inv.status === 'paid') {
        entry.collected += inv.paid_amount ?? inv.amount;
      } else if (inv.status === 'partially_paid') {
        entry.collected += inv.paid_amount ?? 0;
      }
      monthMap.set(month, entry);
    }

    return Array.from(monthMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, { expected, collected }]) => ({
        month,
        expected,
        collected,
        rate: expected > 0 ? Math.round((collected / expected) * 100) : 0,
      }));
  }, [heatmapInvoices]);

  /** فواتير معلقة — pending ولم يحن استحقاقها بعد (لا تتداخل مع overdueInvoices) */
  const pendingInvoicesCount = useMemo(
    () => heatmapInvoices.filter(inv => inv.status === 'pending' && inv.due_date >= today).length,
    [heatmapInvoices, today],
  );

  /** بيانات من counts المُجمّعة */
  const unsubmittedZatcaCount = aggregated?.counts?.unsubmitted_zatca ?? 0;
  const orphanedContractsCount = aggregated?.counts?.orphaned_contracts ?? 0;

  /** نسبة التوثيق — من بيانات التحصيل */
  const totalCollected = aggregated?.collection?.total_collected ?? 0;
  const totalExpected = aggregated?.collection?.total_expected ?? 0;

  // documentationRate — لا يحسبه RPC الحالي؛ نُرجع null بدلاً من قيمة وهمية (100 أو 0)
  // الواجهة مسؤولة عن إخفاء أي عرض يعتمد على null. القيمة الحقيقية تتطلب
  // جلب expenses + invoices ثم استدعاء computeDocumentationStats من utils.
  const documentationRate: number | null = null;
  const undocumentedExpensesCount: number | null = null;

  return {
    overdueInvoices,
    overdueTotal,
    undocumentedExpensesCount,
    documentationRate,
    monthlyCollection,
    unsubmittedZatcaCount,
    orphanedContractsCount,
    pendingInvoicesCount,
    totalCollected,
    totalExpected,
  };
}
