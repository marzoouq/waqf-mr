/**
 * هوك صفحة الفواتير — orchestrator نحيف يجمع helpers مفصلة:
 * - useInvoicesFilters / useInvoiceFormState / useInvoiceFileUpload
 * - useInvoicePreviewBuilder / useInvoicesExport / useInvoiceSubmit
 *
 * يدمج فواتير الشراء (invoices) وفواتير الإيجار (payment_invoices) في عرض موحّد.
 * الكتابة (إنشاء/تعديل/حذف/رفع) مقصورة على مصدر expense — فواتير الإيجار تُولَّد
 * تلقائياً من العقود ولا يُسمح بتعديلها هنا (انظر mem://business-logic/finance/invoices-page-unified-source).
 */
import { useState, useMemo } from 'react';
import { invoiceStatusBadgeVariant } from '@/utils/ui/badgeVariants';
import { DEFAULT_PAGE_SIZE } from '@/constants/pagination';
import {
  INVOICE_TYPE_LABELS, INVOICE_STATUS_LABELS, Invoice, useInvoicesByFiscalYear,
  useGenerateInvoicePdf,
} from '@/hooks/data/invoices/useInvoices';
import { usePaymentInvoices } from '@/hooks/data/invoices/usePaymentInvoices';
import type { InvoicePreviewData, InvoiceSourceFilter, UnifiedInvoiceItem } from '@/types/invoices';
import { safeNumber } from '@/utils/format/safeNumber';
import { useProperties } from '@/hooks/data/properties/useProperties';
import { useContractsByFiscalYear } from '@/hooks/data/contracts/useContracts';
import { useFiscalYear } from '@/contexts/FiscalYearContext';
import { usePdfWaqfInfo } from '@/hooks/data/settings/usePdfWaqfInfo';
import { useInvoicesFilters } from './useInvoicesFilters';
import { useInvoiceFormState } from './useInvoiceFormState';
import { useInvoiceFileUpload } from './useInvoiceFileUpload';
import { useInvoicePreviewBuilder } from './useInvoicePreviewBuilder';
import { useInvoicesExport } from './useInvoicesExport';
import { useInvoiceSubmit } from './useInvoiceSubmit';

export const useInvoicesPage = () => {
  const pdfWaqfInfo = usePdfWaqfInfo();
  const { fiscalYearId, fiscalYear, isClosed } = useFiscalYear();
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  const { data: invoices = [], isLoading } = useInvoicesByFiscalYear(fiscalYearId);
  const { data: rentInvoices = [], isLoading: loadingRent } = usePaymentInvoices(fiscalYearId);
  const { data: properties = [] } = useProperties();
  const { data: contracts = [] } = useContractsByFiscalYear(fiscalYearId);
  const generatePdf = useGenerateInvoicePdf();

  const [sourceFilter, setSourceFilter] = useState<InvoiceSourceFilter>('all');

  const {
    searchQuery, setSearchQuery,
    filterType, setFilterType,
    filterStatus, setFilterStatus,
    filteredInvoices,
  } = useInvoicesFilters(invoices);

  // عرض موحّد للمستخدم في تبويبات "الكل" و "إيجار"
  const unifiedInvoices: UnifiedInvoiceItem[] = useMemo(() => {
    const expenseItems: UnifiedInvoiceItem[] = invoices.map((inv) => ({
      id: inv.id,
      invoice_type: inv.invoice_type,
      invoice_number: inv.invoice_number,
      amount: safeNumber(inv.amount),
      date: inv.date,
      status: inv.status,
      file_path: inv.file_path,
      file_name: inv.file_name,
      property: inv.property ? { property_number: inv.property.property_number } : null,
      source: 'expense',
    }));
    const rentItems: UnifiedInvoiceItem[] = rentInvoices.map((inv) => ({
      id: inv.id,
      invoice_type: 'rent_invoice',
      invoice_number: inv.invoice_number || null,
      amount: safeNumber(inv.amount),
      date: inv.due_date,
      status: inv.status,
      file_path: inv.file_path,
      file_name: inv.invoice_number ? `${inv.invoice_number}.pdf` : null,
      property: inv.contract?.property ? { property_number: inv.contract.property.property_number } : null,
      source: 'rent',
    }));
    return [...expenseItems, ...rentItems].sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [invoices, rentInvoices]);

  const unifiedFiltered = useMemo(() => unifiedInvoices.filter((item) => {
    if (sourceFilter !== 'all' && item.source !== sourceFilter) return false;
    if (filterStatus !== 'all' && item.status !== filterStatus) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        (item.invoice_number || '').toLowerCase().includes(q) ||
        (INVOICE_TYPE_LABELS[item.invoice_type] || '').includes(q) ||
        item.date.includes(q)
      );
    }
    return true;
  }), [unifiedInvoices, sourceFilter, filterStatus, searchQuery]);

  const {
    editingInvoice, formData, setFormData,
    resetFormState, loadInvoiceIntoForm,
  } = useInvoiceFormState();

  const {
    selectedFile, isDragging, setIsDragging, previewUrl,
    fileInputRef, validateAndSetFile, resetFile,
  } = useInvoiceFileUpload();

  const buildPreviewData = useInvoicePreviewBuilder(pdfWaqfInfo, contracts);

  // حالة عامة للصفحة
  const [isOpen, setIsOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string; file_path?: string | null } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [viewerFile, setViewerFile] = useState<{ path: string; name: string | null } | null>(null);
  const [previewInvoice, setPreviewInvoice] = useState<InvoicePreviewData | null>(null);
  const [templateOpen, setTemplateOpen] = useState(false);

  const ITEMS_PER_PAGE = DEFAULT_PAGE_SIZE;

  const resetForm = () => { resetFormState(); resetFile(); };

  const handleEdit = (item: Invoice) => {
    loadInvoiceIntoForm(item);
    setIsOpen(true);
  };

  const {
    createInvoice, updateInvoice,
    uploading, handleSubmit, confirmDelete,
  } = useInvoiceSubmit({
    editingInvoice, formData, selectedFile,
    fiscalYearId: fiscalYear?.id ?? null,
    setIsOpen, resetForm, setViewerFile,
  });

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    await confirmDelete(deleteTarget);
    setDeleteTarget(null);
  };

  // مشتقات
  const invoicesWithoutFiles = useMemo(
    () => [
      ...invoices.filter(inv => !inv.file_path).map(inv => ({ id: inv.id, source: 'expense' as const })),
      ...rentInvoices.filter(inv => !inv.file_path).map(inv => ({ id: inv.id, source: 'rent' as const })),
    ],
    [invoices, rentInvoices]
  );

  const paginatedInvoices = useMemo(
    () => filteredInvoices.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE),
    [filteredInvoices, currentPage, ITEMS_PER_PAGE]
  );

  const paginatedUnified = useMemo(
    () => unifiedFiltered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE),
    [unifiedFiltered, currentPage, ITEMS_PER_PAGE]
  );

  const exportActions = useInvoicesExport({
    filteredInvoices,
    invoicesWithoutFiles: invoices.filter(inv => !inv.file_path),
    fiscalYearId,
    fiscalYearLabel: fiscalYear?.label,
    pdfWaqfInfo,
    createInvoice,
    generatePdf,
    setTemplateOpen,
  });

  return {
    invoices, filteredInvoices, properties, contracts, isLoading: isLoading || loadingRent, isClosed,
    fiscalYear, fiscalYearId, pdfWaqfInfo,
    viewMode, setViewMode, isOpen, setIsOpen, searchQuery, setSearchQuery,
    filterType, setFilterType, filterStatus, setFilterStatus,
    sourceFilter, setSourceFilter,
    deleteTarget, setDeleteTarget, currentPage, setCurrentPage,
    uploading, selectedFile, isDragging, setIsDragging, previewUrl,
    fileInputRef, viewerFile, setViewerFile, previewInvoice, setPreviewInvoice,
    templateOpen, setTemplateOpen, editingInvoice, formData, setFormData,
    validateAndSetFile, resetForm, handleEdit, handleSubmit, handleConfirmDelete,
    buildPreviewData, statusBadgeVariant: invoiceStatusBadgeVariant,
    createInvoice, updateInvoice, generatePdf,
    isSaving: createInvoice.isPending || updateInvoice.isPending,
    isGeneratingPdf: generatePdf.isPending,
    ITEMS_PER_PAGE, INVOICE_TYPE_LABELS, INVOICE_STATUS_LABELS,
    invoicesWithoutFiles, paginatedInvoices,
    unifiedInvoices, unifiedFiltered, paginatedUnified,
    handleExportPdf: exportActions.handleExportPdf,
    handleExportCsv: exportActions.handleExportCsv,
    handleSaveTemplate: exportActions.handleSaveTemplate,
    handleGeneratePdfForMissing: exportActions.handleGeneratePdfForMissing,
  };
};
