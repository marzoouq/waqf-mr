/**
 * هوك صفحة التقرير السنوي — يستخرج كل المنطق من AnnualReportViewPage.
 *
 * P1 fix: عقود السنة فقط، الحسابات الرسمية للسنة المقفلة عبر RPC،
 * وRealtime موسَّع ليشمل income/expenses/contracts/properties.
 */
import { useMemo, useState, useCallback } from 'react';
import { useIsMobile } from '@/hooks/ui/useIsMobile';
import { safeNumber } from '@/utils/format/safeNumber';
import { fmtInt } from '@/utils/format/format';
import { useFiscalYear } from '@/contexts/FiscalYearContext';
import { useAnnualReportItems, useReportStatus } from '@/hooks/data/content/useAnnualReport';
import { useProperties } from '@/hooks/data/properties/useProperties';
import { useIncomeByFiscalYear } from '@/hooks/data/financial/income/useIncome';
import { useExpensesByFiscalYear } from '@/hooks/data/financial/expenses/useExpenses';
import { useContractsSafeByFiscalYear } from '@/hooks/data/contracts/useContracts';
import { useEndUserDashboardData } from '@/hooks/application/dashboard/useEndUserDashboardData';
import { useEndUserFinancials } from '@/hooks/application/dashboard/useEndUserFinancials';
import { usePdfWaqfInfo } from '@/hooks/data/settings/waqf/usePdfWaqfInfo';
import { isFyReady } from '@/constants/fiscalYearIds';
import { buildCsv, downloadCsv } from '@/utils/export/csv';
import { useDashboardRealtime } from '@/hooks/data/core/useDashboardRealtime';
import type { AnnualReportPdfData } from '@/utils/pdf/reports/annualReport';
import { DollarSign, Receipt, FileText, Building2 } from 'lucide-react';

export function useAnnualReportViewPage() {
  const isMobile = useIsMobile();
  const [viewTab, setViewTab] = useState('property_status');
  const { fiscalYearId, fiscalYear, isClosed } = useFiscalYear();
  const safeFyId = isFyReady(fiscalYearId) ? fiscalYearId : undefined;

  // Realtime: انعكاس فوري لتعديلات التقرير السنوي + الأرقام المالية للبطاقات
  useDashboardRealtime(
    'annual-report-view-realtime',
    ['annual_report_items', 'annual_report_status', 'income', 'expenses', 'contracts', 'properties', 'accounts'],
    true,
    [['annual-report-items'], ['annual-report-status'], ['beneficiary-dashboard-rpc']],
  );

  const { data: items = [], isLoading } = useAnnualReportItems(safeFyId);
  const { data: reportStatus, isLoading: statusLoading } = useReportStatus(safeFyId);
  const { data: properties = [] } = useProperties();
  const { data: income = [] } = useIncomeByFiscalYear(safeFyId || 'all');
  const { data: expenses = [] } = useExpensesByFiscalYear(safeFyId || 'all');
  const { data: contracts = [] } = useContractsSafeByFiscalYear(safeFyId || 'all');
  const { data: dashData } = useEndUserDashboardData(safeFyId);
  const fin = useEndUserFinancials(dashData, safeFyId);
  const waqfInfo = usePdfWaqfInfo();

  const isPublished = reportStatus?.status === 'published';

  const grouped = useMemo(() => ({
    property_status: items.filter(i => i.section_type === 'property_status'),
    achievement: items.filter(i => i.section_type === 'achievement'),
    challenge: items.filter(i => i.section_type === 'challenge'),
    future_plan: items.filter(i => i.section_type === 'future_plan'),
  }), [items]);

  // مصدر الأرقام: السنة المقفلة → حساب رسمي (account snapshot)، غير ذلك → تجميع حي
  const totalIncome = useMemo(
    () => (isClosed && dashData ? fin.totalIncome : income.reduce((s, r) => s + safeNumber(r.amount), 0)),
    [isClosed, dashData, fin.totalIncome, income],
  );
  const totalExpenses = useMemo(
    () => (isClosed && dashData ? fin.totalExpenses : expenses.reduce((s, r) => s + safeNumber(r.amount), 0)),
    [isClosed, dashData, fin.totalExpenses, expenses],
  );
  // عقود نشطة ضمن السنة (لا تستعمل كل العقود)
  const activeContracts = useMemo(() => contracts.filter(c => c.status === 'active').length, [contracts]);

  const summaryCards = useMemo(() => [
    { label: 'إجمالي الدخل', value: fmtInt(totalIncome) + ' ر.س', icon: DollarSign, color: 'text-success' },
    { label: 'إجمالي المصروفات', value: fmtInt(totalExpenses) + ' ر.س', icon: Receipt, color: 'text-destructive' },
    { label: 'العقود النشطة', value: String(activeContracts), icon: FileText, color: 'text-info' },
    { label: 'عدد العقارات', value: String(properties.length), icon: Building2, color: 'text-warning' },
  ], [totalIncome, totalExpenses, activeContracts, properties.length]);

  const handleExportPdf = useCallback(async () => {
    const pdfData: AnnualReportPdfData = {
      fiscalYearLabel: fiscalYear?.label || '',
      achievements: grouped.achievement.map(i => ({ title: i.title, content: i.content })),
      challenges: grouped.challenge.map(i => ({ title: i.title, content: i.content })),
      futurePlans: grouped.future_plan.map(i => ({ title: i.title, content: i.content })),
      propertyStatuses: grouped.property_status.map(i => {
        const prop = properties.find(p => p.id === i.property_id);
        return { title: i.title, content: i.content, propertyName: prop ? `${prop.property_number} — ${prop.location}` : undefined };
      }),
      summaryCards: summaryCards.map(c => ({ label: c.label, value: c.value })),
    };
    const { generateAnnualReportPDF } = await import('@/utils/pdf/reports/annualReport');
    const ok = await generateAnnualReportPDF(pdfData, waqfInfo);
    const { uiNotify } = await import('@/lib/notify');
    if (ok) uiNotify.success('تم تصدير التقرير السنوي بنجاح');
    else uiNotify.error('فشل في تصدير التقرير');
  }, [fiscalYear?.label, grouped, properties, summaryCards, waqfInfo]);

  const handleExportCsv = useCallback(() => {
    const rows: Record<string, string>[] = [];
    summaryCards.forEach(c => rows.push({ القسم: 'ملخص', العنوان: c.label, المحتوى: c.value }));
    const sectionLabels: Record<string, string> = {
      achievement: 'إنجازات', challenge: 'تحديات', future_plan: 'خطط مستقبلية', property_status: 'حالة العقارات',
    };
    items.forEach(item => {
      rows.push({ القسم: sectionLabels[item.section_type] || item.section_type, العنوان: item.title, المحتوى: item.content });
    });
    const csv = buildCsv(rows, ['القسم', 'العنوان', 'المحتوى']);
    downloadCsv(csv, `تقرير-سنوي-${fiscalYear?.label || ''}.csv`);
  }, [summaryCards, items, fiscalYear?.label]);

  return {
    isLoading: statusLoading || isLoading,
    isPublished,
    isMobile,
    viewTab, setViewTab,
    grouped, summaryCards, properties,
    fiscalYear,
    handleExportPdf, handleExportCsv,
  };
}
