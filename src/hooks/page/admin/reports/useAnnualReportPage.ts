/**
 * هوك منطق صفحة التقرير السنوي
 */
import { useState, useMemo, useCallback, useRef } from 'react';
import { uiNotify } from '@/lib/notify';
import { safeNumber } from '@/utils/format/safeNumber';
import { fmtInt } from '@/utils/format/format';
import { useFiscalYear } from '@/contexts/FiscalYearContext';
import {
  useAnnualReportItems, useCreateReportItem, useUpdateReportItem,
  useDeleteReportItem, useReportStatus, useToggleReportPublish,
  type AnnualReportItem, type SectionType,
} from '@/hooks/data/content/useAnnualReport';
import { useProperties } from '@/hooks/data/properties/useProperties';
import { useIncomeByFiscalYear } from '@/hooks/data/financial/income/useIncome';
import { useExpensesByFiscalYear } from '@/hooks/data/financial/expenses/useExpenses';
import { useContractsByFiscalYear } from '@/hooks/data/contracts/useContracts';
import { useAccountByFiscalYear } from '@/hooks/data/financial/accounts/useAccounts';
import { usePdfWaqfInfo } from '@/hooks/data/settings/waqf/usePdfWaqfInfo';
import { useDashboardRealtime } from '@/hooks/data/core/useDashboardRealtime';
import { useAnnualReportExport } from './useAnnualReportExport';
import { DollarSign, Receipt, FileText, Building2 } from 'lucide-react';

export function useAnnualReportPage() {
  const { fiscalYearId, fiscalYear, isClosed } = useFiscalYear();

  // Realtime: تحديث فوري لمحتوى التقرير السنوي وحالته
  useDashboardRealtime(
    'annual-report-realtime',
    ['annual_report_items', 'annual_report_status', 'accounts', 'income', 'expenses', 'contracts', 'fiscal_years'],
    true,
    [['annual-report'], ['annual-report-items'], ['annual-report-status']],
  );

  const { data: items = [], isLoading } = useAnnualReportItems(fiscalYearId || undefined);
  const { data: reportStatus } = useReportStatus(fiscalYearId || undefined);
  const { data: properties = [] } = useProperties();
  const { data: income = [] } = useIncomeByFiscalYear(fiscalYearId ?? 'all');
  const { data: expenses = [] } = useExpensesByFiscalYear(fiscalYearId ?? 'all');
  const { data: contracts = [] } = useContractsByFiscalYear(fiscalYearId ?? 'all');
  const { data: accountsForFy = [] } = useAccountByFiscalYear(fiscalYear?.label, fiscalYearId ?? undefined);
  const waqfInfo = usePdfWaqfInfo();

  const createItem = useCreateReportItem();
  const updateItem = useUpdateReportItem();
  const deleteItem = useDeleteReportItem();
  const togglePublish = useToggleReportPublish();

  const [activeTab, setActiveTab] = useState('property_status');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<AnnualReportItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const isPublished = reportStatus?.status === 'published';
  const fyAccount = accountsForFy[0];

  // تصنيف العناصر حسب النوع
  const grouped = useMemo(() => ({
    property_status: items.filter(i => i.section_type === 'property_status'),
    achievement: items.filter(i => i.section_type === 'achievement'),
    challenge: items.filter(i => i.section_type === 'challenge'),
    future_plan: items.filter(i => i.section_type === 'future_plan'),
  }), [items]);

  // بطاقات ملخصة — للسنة المُقفلة نقرأ snapshot؛ للنشطة نحسب من السطور
  const totalIncome = useMemo(
    () => (isClosed && fyAccount ? safeNumber(fyAccount.total_income) : income.reduce((s, r) => s + safeNumber(r.amount), 0)),
    [isClosed, fyAccount, income],
  );
  const totalExpenses = useMemo(
    () => (isClosed && fyAccount ? safeNumber(fyAccount.total_expenses) : expenses.reduce((s, r) => s + safeNumber(r.amount), 0)),
    [isClosed, fyAccount, expenses],
  );
  const activeContracts = useMemo(() => contracts.filter(c => c.status === 'active').length, [contracts]);

  const summaryCards = useMemo(() => [
    { label: 'إجمالي الدخل', value: fmtInt(totalIncome) + ' ر.س', icon: DollarSign, color: 'text-success' },
    { label: 'إجمالي المصروفات', value: fmtInt(totalExpenses) + ' ر.س', icon: Receipt, color: 'text-destructive' },
    { label: 'العقود النشطة', value: String(activeContracts), icon: FileText, color: 'text-info' },
    { label: 'عدد العقارات', value: String(properties.length), icon: Building2, color: 'text-warning' },
  ], [totalIncome, totalExpenses, activeContracts, properties.length]);

  // إضافة/تعديل عنصر
  const handleSubmit = useCallback((data: { title: string; content: string; section_type: SectionType; property_id?: string | null }) => {
    if (!fiscalYearId) {
      // A3: تنبيه صريح بدلاً من فشل صامت
      uiNotify.error('يرجى اختيار سنة مالية محددة قبل إضافة/تعديل عنصر التقرير');
      return;
    }
    if (editingItem) {
      updateItem.mutate({ id: editingItem.id, ...data }, {
        onSuccess: () => {
          uiNotify.success('تم تحديث العنصر');
          setDialogOpen(false); setEditingItem(null);
        },
        onError: () => uiNotify.error('فشل في تحديث العنصر'),
      });
    } else {
      const sectionItems = grouped[data.section_type as keyof typeof grouped] || [];
      createItem.mutate({
        fiscal_year_id: fiscalYearId,
        title: data.title,
        content: data.content,
        section_type: data.section_type,
        property_id: data.property_id ?? null,
        sort_order: sectionItems.length,
      }, {
        onSuccess: () => {
          uiNotify.success('تمت إضافة العنصر بنجاح');
          setDialogOpen(false);
        },
        onError: () => uiNotify.error('فشل في إضافة العنصر'),
      });
    }
  }, [fiscalYearId, editingItem, grouped, createItem, updateItem]);

  // إعادة الترتيب — مع حماية من النقر المتكرر (#A13)
  const isReordering = useRef(false);
  const handleReorder = useCallback(async (id: string, direction: 'up' | 'down') => {
    if (isReordering.current) return;
    const sectionItems = grouped[activeTab as keyof typeof grouped];
    if (!sectionItems) return;
    const idx = sectionItems.findIndex(i => i.id === id);
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sectionItems.length) return;
    isReordering.current = true;
    try {
      await Promise.all([
        updateItem.mutateAsync({ id: sectionItems[idx]!.id, sort_order: sectionItems[swapIdx]!.sort_order }),
        updateItem.mutateAsync({ id: sectionItems[swapIdx]!.id, sort_order: sectionItems[idx]!.sort_order }),
      ]);
    } catch {
      uiNotify.error('فشل إعادة الترتيب');
    } finally {
      isReordering.current = false;
    }
  }, [grouped, activeTab, updateItem]);

  // تصدير PDF + طباعة (مُستخرَج إلى هوك مستقل)
  const { handleExportPdf, handlePrint } = useAnnualReportExport({
    fiscalYearLabel: fiscalYear?.label || '',
    grouped,
    properties,
    summaryCards,
    waqfInfo,
  });

  // نشر/إلغاء نشر
  const handleTogglePublish = useCallback(() => {
    if (!fiscalYearId) {
      uiNotify.error('يرجى اختيار سنة مالية محددة قبل النشر');
      return;
    }
    togglePublish.mutate({ fiscalYearId, publish: !isPublished }, {
      onSuccess: () => uiNotify.success(!isPublished ? 'تم نشر التقرير السنوي' : 'تم إرجاع التقرير إلى مسودة'),
      onError: () => uiNotify.error('فشل في تحديث حالة النشر'),
    });
  }, [fiscalYearId, isPublished, togglePublish]);

  const propertiesList = useMemo(
    () => properties.map(p => ({ id: p.id, property_number: p.property_number, location: p.location })),
    [properties]
  );

  return {
    fiscalYear, isLoading, isPublished,
    grouped, summaryCards, propertiesList,
    activeTab, setActiveTab,
    dialogOpen, setDialogOpen,
    editingItem, setEditingItem,
    deleteTarget, setDeleteTarget,
    createItem, updateItem, deleteItem, togglePublish,
    handleSubmit, handleReorder, handleExportPdf, handlePrint, handleTogglePublish,
  };
}
