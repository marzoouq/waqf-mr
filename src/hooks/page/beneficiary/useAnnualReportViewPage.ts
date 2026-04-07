/**
 * هوك صفحة التقرير السنوي — يستخرج كل المنطق من AnnualReportViewPage
 */
import { useMemo, useState, useCallback } from 'react';
import { useIsMobile } from '@/hooks/ui/use-mobile';
import { safeNumber } from '@/utils/format/safeNumber';
import { useFiscalYear } from '@/contexts/FiscalYearContext';
import { useAnnualReportItems, useReportStatus } from '@/hooks/data/content/useAnnualReport';
import { useProperties } from '@/hooks/data/properties/useProperties';
import { useIncomeByFiscalYear } from '@/hooks/data/financial/useIncome';
import { useExpensesByFiscalYear } from '@/hooks/data/financial/useExpenses';
import { useContracts } from '@/hooks/data/contracts/useContracts';
import { usePdfWaqfInfo } from '@/hooks/data/settings/usePdfWaqfInfo';
import { buildCsv, downloadCsv } from '@/utils/export/csv';
import { generateAnnualReportPDF, type AnnualReportPdfData } from '@/utils/pdf/reports/annualReport';
import { DollarSign, Receipt, FileText, Building2 } from 'lucide-react';

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('ar-SA', { style: 'decimal', maximumFractionDigits: 0 }).format(v);

export function useAnnualReportViewPage() {
  const isMobile = useIsMobile();
  const [viewTab, setViewTab] = useState('property_status');
  const { fiscalYearId, fiscalYear } = useFiscalYear();
  const { data: items = [], isLoading } = useAnnualReportItems(fiscalYearId || undefined);
  const { data: reportStatus, isLoading: statusLoading } = useReportStatus(fiscalYearId || undefined);
  const { data: properties = [] } = useProperties();
  const { data: income = [] } = useIncomeByFiscalYear(fiscalYearId || 'all');
  const { data: expenses = [] } = useExpensesByFiscalYear(fiscalYearId || 'all');
  const { data: contracts = [] } = useContracts();
  const waqfInfo = usePdfWaqfInfo();

  const isPublished = reportStatus?.status === 'published';

  const grouped = useMemo(() => ({
    property_status: items.filter(i => i.section_type === 'property_status'),
    achievement: items.filter(i => i.section_type === 'achievement'),
    challenge: items.filter(i => i.section_type === 'challenge'),
    future_plan: items.filter(i => i.section_type === 'future_plan'),
  }), [items]);

  const totalIncome = useMemo(() => income.reduce((s, r) => s + safeNumber(r.amount), 0), [income]);
  const totalExpenses = useMemo(() => expenses.reduce((s, r) => s + safeNumber(r.amount), 0), [expenses]);
  const activeContracts = useMemo(() => contracts.filter(c => c.status === 'active').length, [contracts]);

  const summaryCards = [
    { label: 'إجمالي الدخل', value: formatCurrency(totalIncome) + ' ر.س', icon: DollarSign, color: 'text-success' },
    { label: 'إجمالي المصروفات', value: formatCurrency(totalExpenses) + ' ر.س', icon: Receipt, color: 'text-destructive' },
    { label: 'العقود النشطة', value: String(activeContracts), icon: FileText, color: 'text-info' },
    { label: 'عدد العقارات', value: String(properties.length), icon: Building2, color: 'text-warning' },
  ];

  const handleExportPdf = async () => {
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
    const ok = await generateAnnualReportPDF(pdfData, waqfInfo);
    const { toast } = await import('sonner');
    if (ok) toast.success('تم تصدير التقرير السنوي بنجاح');
    else toast.error('فشل في تصدير التقرير');
  };

  const handleExportCsv = () => {
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
  };

  return {
    // حالات التحميل
    isLoading: statusLoading || isLoading,
    isPublished,
    isMobile,
    // بيانات التبويب
    viewTab, setViewTab,
    // بيانات مجمّعة
    grouped, summaryCards, properties,
    fiscalYear,
    // دوال الإجراءات
    handleExportPdf, handleExportCsv,
  };
}
