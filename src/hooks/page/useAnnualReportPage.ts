/**
 * هوك منطق صفحة التقرير السنوي
 */
import { useState, useMemo, useCallback } from 'react';
import { safeNumber } from '@/utils/safeNumber';
import { useFiscalYear } from '@/contexts/FiscalYearContext';
import {
  useAnnualReportItems, useCreateReportItem, useUpdateReportItem,
  useDeleteReportItem, useReportStatus, useToggleReportPublish,
  type AnnualReportItem, type SectionType,
} from '@/hooks/data/useAnnualReport';
import { useProperties } from '@/hooks/data/useProperties';
import { useIncomeByFiscalYear } from '@/hooks/data/useIncome';
import { useExpensesByFiscalYear } from '@/hooks/data/useExpenses';
import { useContractsByFiscalYear } from '@/hooks/data/useContracts';
import { usePdfWaqfInfo } from '@/hooks/data/usePdfWaqfInfo';
import { generateAnnualReportPDF, type AnnualReportPdfData } from '@/utils/pdf/reports/annualReport';
import { DollarSign, Receipt, FileText, Building2 } from 'lucide-react';

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('ar-SA', { style: 'decimal', maximumFractionDigits: 0 }).format(v);

export function useAnnualReportPage() {
  const { fiscalYearId, fiscalYear } = useFiscalYear();
  const { data: items = [], isLoading } = useAnnualReportItems(fiscalYearId || undefined);
  const { data: reportStatus } = useReportStatus(fiscalYearId || undefined);
  const { data: properties = [] } = useProperties();
  const { data: income = [] } = useIncomeByFiscalYear(fiscalYearId || 'all');
  const { data: expenses = [] } = useExpensesByFiscalYear(fiscalYearId || 'all');
  const { data: contracts = [] } = useContractsByFiscalYear(fiscalYearId || 'all');
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

  // تصنيف العناصر حسب النوع
  const grouped = useMemo(() => ({
    property_status: items.filter(i => i.section_type === 'property_status'),
    achievement: items.filter(i => i.section_type === 'achievement'),
    challenge: items.filter(i => i.section_type === 'challenge'),
    future_plan: items.filter(i => i.section_type === 'future_plan'),
  }), [items]);

  // بطاقات ملخصة
  const totalIncome = useMemo(() => income.reduce((s, r) => s + safeNumber(r.amount), 0), [income]);
  const totalExpenses = useMemo(() => expenses.reduce((s, r) => s + safeNumber(r.amount), 0), [expenses]);
  const activeContracts = useMemo(() => contracts.filter(c => c.status === 'active').length, [contracts]);

  const summaryCards = useMemo(() => [
    { label: 'إجمالي الدخل', value: formatCurrency(totalIncome) + ' ر.س', icon: DollarSign, color: 'text-success' },
    { label: 'إجمالي المصروفات', value: formatCurrency(totalExpenses) + ' ر.س', icon: Receipt, color: 'text-destructive' },
    { label: 'العقود النشطة', value: String(activeContracts), icon: FileText, color: 'text-info' },
    { label: 'عدد العقارات', value: String(properties.length), icon: Building2, color: 'text-warning' },
  ], [totalIncome, totalExpenses, activeContracts, properties.length]);

  // إضافة/تعديل عنصر
  const handleSubmit = useCallback((data: { title: string; content: string; section_type: SectionType; property_id?: string | null }) => {
    if (!fiscalYearId) return;
    if (editingItem) {
      updateItem.mutate({ id: editingItem.id, ...data }, {
        onSuccess: () => { setDialogOpen(false); setEditingItem(null); },
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
      }, { onSuccess: () => { setDialogOpen(false); } });
    }
  }, [fiscalYearId, editingItem, grouped, createItem, updateItem]);

  // إعادة الترتيب
  const handleReorder = useCallback(async (id: string, direction: 'up' | 'down') => {
    const sectionItems = grouped[activeTab as keyof typeof grouped];
    if (!sectionItems) return;
    const idx = sectionItems.findIndex(i => i.id === id);
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sectionItems.length) return;
    try {
      await updateItem.mutateAsync({ id: sectionItems[idx]!.id, sort_order: sectionItems[swapIdx]!.sort_order });
      await updateItem.mutateAsync({ id: sectionItems[swapIdx]!.id, sort_order: sectionItems[idx]!.sort_order });
    } catch {
      // خطأ يُعالج في onError
    }
  }, [grouped, activeTab, updateItem]);

  // تصدير PDF
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
    await generateAnnualReportPDF(pdfData, waqfInfo);
  }, [fiscalYear, grouped, properties, summaryCards, waqfInfo]);

  // طباعة
  const handlePrint = useCallback(async () => {
    try {
      await handleExportPdf();
    } catch {
      window.print();
    }
  }, [handleExportPdf]);

  // نشر/إلغاء نشر
  const handleTogglePublish = useCallback(() => {
    if (!fiscalYearId) return;
    togglePublish.mutate({ fiscalYearId, publish: !isPublished });
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
