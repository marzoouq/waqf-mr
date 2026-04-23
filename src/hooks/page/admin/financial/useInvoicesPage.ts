/**
 * هوك صفحة الفواتير — orchestrator نحيف يجمع helpers مفصلة:
 * - useInvoicesFilters: فلترة
 * - useInvoiceFormState: حالة النموذج + editing
 * - useInvoiceFileUpload: حالة الملف + معاينة
 * - useInvoicePreviewBuilder: بناء بيانات معاينة PDF
 */
import { useState, useMemo, useCallback } from 'react';
import { invoiceStatusBadgeVariant } from '@/utils/ui/badgeVariants';
import { DEFAULT_PAGE_SIZE } from '@/constants/pagination';
import {
  useCreateInvoice, useUpdateInvoice, useDeleteInvoice, uploadInvoiceFile,
  INVOICE_TYPE_LABELS, INVOICE_STATUS_LABELS, Invoice, useInvoicesByFiscalYear,
  useGenerateInvoicePdf,
} from '@/hooks/data/invoices/useInvoices';
import type { InvoicePreviewData } from '@/types/invoices';
import { useProperties } from '@/hooks/data/properties/useProperties';
import { useContractsByFiscalYear } from '@/hooks/data/contracts/useContracts';
import { useFiscalYear } from '@/contexts/FiscalYearContext';
import { usePdfWaqfInfo } from '@/hooks/data/settings/usePdfWaqfInfo';
import { defaultNotify } from '@/lib/notify';
import { removeInvoiceFile } from '@/lib/services';
import { safeNumber } from '@/utils/format/safeNumber';
import { buildCsv, downloadCsv } from '@/utils/export/csv';
import { asMutationArg } from '@/hooks/data/core';
import { useInvoicesFilters } from './useInvoicesFilters';
import { useInvoiceFormState } from './useInvoiceFormState';
import { useInvoiceFileUpload } from './useInvoiceFileUpload';
import { useInvoicePreviewBuilder } from './useInvoicePreviewBuilder';

// تعقيم الوصف ضد CSV Injection
const sanitizeDescription = (value: string): string => {
  if (!value) return value;
  return value.replace(/^[=+\-@\t\r]+/, '');
};

export const useInvoicesPage = () => {
  const pdfWaqfInfo = usePdfWaqfInfo();
  const { fiscalYearId, fiscalYear, isClosed } = useFiscalYear();
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  const { data: invoices = [], isLoading } = useInvoicesByFiscalYear(fiscalYearId);
  const { data: properties = [] } = useProperties();
  const { data: contracts = [] } = useContractsByFiscalYear(fiscalYearId);
  const createInvoice = useCreateInvoice();
  const updateInvoice = useUpdateInvoice();
  const deleteInvoice = useDeleteInvoice();
  const generatePdf = useGenerateInvoicePdf();

  // فلترة
  const {
    searchQuery, setSearchQuery,
    filterType, setFilterType,
    filterStatus, setFilterStatus,
    filteredInvoices,
  } = useInvoicesFilters(invoices);

  // حالة النموذج
  const {
    editingInvoice, formData, setFormData,
    resetFormState, loadInvoiceIntoForm,
  } = useInvoiceFormState();

  // حالة الملف + المعاينة
  const {
    selectedFile, isDragging, setIsDragging, previewUrl,
    fileInputRef, validateAndSetFile, resetFile,
  } = useInvoiceFileUpload();

  // بناء بيانات معاينة الفاتورة
  const buildPreviewData = useInvoicePreviewBuilder(pdfWaqfInfo, contracts);

  // حالة عامة للصفحة
  const [isOpen, setIsOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string; file_path?: string | null } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [uploading, setUploading] = useState(false);
  const [viewerFile, setViewerFile] = useState<{ path: string; name: string | null } | null>(null);
  const [previewInvoice, setPreviewInvoice] = useState<InvoicePreviewData | null>(null);
  const [templateOpen, setTemplateOpen] = useState(false);

  const ITEMS_PER_PAGE = DEFAULT_PAGE_SIZE;

  const resetForm = () => {
    resetFormState();
    resetFile();
  };

  const handleEdit = (item: Invoice) => {
    loadInvoiceIntoForm(item);
    setIsOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.invoice_type || !formData.date) { defaultNotify.error('يرجى ملء الحقول المطلوبة'); return; }
    if (!editingInvoice && !selectedFile) { defaultNotify.error('يرجى رفع ملف الفاتورة'); return; }
    if (!(parseFloat(formData.amount) > 0)) { defaultNotify.error('يرجى إدخال مبلغ أكبر من صفر'); return; }

    try {
      setUploading(true);
      const invoiceData: Record<string, unknown> = {
        invoice_number: formData.invoice_number || null, invoice_type: formData.invoice_type,
        amount: parseFloat(formData.amount) || 0, date: formData.date,
        property_id: formData.property_id || null, contract_id: formData.contract_id || null,
        description: sanitizeDescription(formData.description) || null, status: formData.status,
      };
      if (!editingInvoice && fiscalYear?.id) invoiceData.fiscal_year_id = fiscalYear.id;

      if (selectedFile) {
        if (editingInvoice?.file_path) {
          try { await removeInvoiceFile(editingInvoice.file_path); } catch { /* تجاهل */ }
        }
        const { path, name } = await uploadInvoiceFile(selectedFile);
        invoiceData.file_path = path;
        invoiceData.file_name = name;
      }

      const filePath = invoiceData.file_path as string | undefined;
      const fileName = invoiceData.file_name as string | undefined;

      if (editingInvoice) {
        type UpdateArg = Parameters<typeof updateInvoice.mutateAsync>[0];
        await updateInvoice.mutateAsync({ id: editingInvoice.id, ...invoiceData } as UpdateArg);
      } else {
        type CreateArg = Parameters<typeof createInvoice.mutateAsync>[0];
        await createInvoice.mutateAsync(invoiceData as CreateArg);
      }

      setIsOpen(false);
      resetForm();

      const viewablePath = filePath || editingInvoice?.file_path;
      const viewableName = fileName || editingInvoice?.file_name;
      if (viewablePath) {
        defaultNotify.success(editingInvoice ? 'تم تحديث الفاتورة بنجاح' : 'تم رفع الفاتورة بنجاح', {
          action: { label: 'عرض', onClick: () => setViewerFile({ path: viewablePath, name: viewableName || null }) },
        });
      }
    } catch {
      defaultNotify.error('حدث خطأ أثناء حفظ الفاتورة');
    } finally {
      setUploading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteInvoice.mutateAsync({ id: deleteTarget.id, file_path: deleteTarget.file_path });
      setDeleteTarget(null);
    } catch { /* mutation handles toast */ }
  };

  const statusBadgeVariant = invoiceStatusBadgeVariant;

  // ===== مشتقات + إجراءات منقولة من InvoicesPage.tsx =====
  const invoicesWithoutFiles = useMemo(
    () => invoices.filter(inv => !inv.file_path),
    [invoices]
  );

  const paginatedInvoices = useMemo(
    () => filteredInvoices.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE),
    [filteredInvoices, currentPage, ITEMS_PER_PAGE]
  );

  const handleExportPdf = useCallback(async () => {
    if (!fiscalYearId || fiscalYearId === 'all') {
      defaultNotify.warning('⚠️ أنت تصدّر فواتير جميع السنوات المالية.');
    }
    try {
      const fyLabel = fiscalYear?.label || (fiscalYearId ? '' : 'جميع السنوات');
      const { generateInvoicesViewPDF } = await import('@/utils/pdf');
      await generateInvoicesViewPDF(
        filteredInvoices.map(inv => ({
          invoice_type: INVOICE_TYPE_LABELS[inv.invoice_type] || inv.invoice_type,
          invoice_number: inv.invoice_number,
          amount: safeNumber(inv.amount),
          date: inv.date,
          property_number: inv.property?.property_number || '-',
          status: inv.status,
        })),
        pdfWaqfInfo,
        fyLabel,
      );
      defaultNotify.success('تم تحميل ملف PDF بنجاح');
    } catch {
      defaultNotify.error('حدث خطأ أثناء تصدير PDF');
    }
  }, [fiscalYearId, fiscalYear, filteredInvoices, pdfWaqfInfo]);

  const handleExportCsv = useCallback(() => {
    const fyLabel = fiscalYear?.label || 'جميع-السنوات';
    const csv = buildCsv(
      filteredInvoices.map(inv => ({
        'النوع': INVOICE_TYPE_LABELS[inv.invoice_type] || inv.invoice_type,
        'رقم الفاتورة': inv.invoice_number || '-',
        'المبلغ': safeNumber(inv.amount),
        'التاريخ': inv.date,
        'العقار': inv.property?.property_number || '-',
        'الحالة': INVOICE_STATUS_LABELS[inv.status] || inv.status,
      })),
    );
    downloadCsv(csv, `فواتير-${fyLabel}.csv`);
    defaultNotify.success('تم تصدير الفواتير بنجاح');
  }, [fiscalYear, filteredInvoices]);

  const handleSaveTemplate = useCallback(async (data: Record<string, unknown>) => {
    type CreateArg = Parameters<typeof createInvoice.mutateAsync>[0];
    await createInvoice.mutateAsync(
      asMutationArg(createInvoice, { ...data, fiscal_year_id: fiscalYear?.id } as unknown as CreateArg),
    );
    setTemplateOpen(false);
    defaultNotify.success('تم إنشاء الفاتورة بنجاح');
  }, [createInvoice, fiscalYear]);

  const handleGeneratePdfForMissing = useCallback(() => {
    generatePdf.mutate(invoicesWithoutFiles.map(inv => inv.id));
  }, [generatePdf, invoicesWithoutFiles]);

  return {
    invoices, filteredInvoices, properties, contracts, isLoading, isClosed,
    fiscalYear, fiscalYearId, pdfWaqfInfo,
    viewMode, setViewMode, isOpen, setIsOpen, searchQuery, setSearchQuery,
    filterType, setFilterType, filterStatus, setFilterStatus,
    deleteTarget, setDeleteTarget, currentPage, setCurrentPage,
    uploading, selectedFile, isDragging, setIsDragging, previewUrl,
    fileInputRef, viewerFile, setViewerFile, previewInvoice, setPreviewInvoice,
    templateOpen, setTemplateOpen, editingInvoice, formData, setFormData,
    validateAndSetFile, resetForm, handleEdit, handleSubmit, handleConfirmDelete,
    buildPreviewData, statusBadgeVariant,
    createInvoice, updateInvoice, generatePdf,
    isSaving: createInvoice.isPending || updateInvoice.isPending,
    isGeneratingPdf: generatePdf.isPending,
    ITEMS_PER_PAGE, INVOICE_TYPE_LABELS, INVOICE_STATUS_LABELS,
    // مشتقات وإجراءات منقولة من الصفحة
    invoicesWithoutFiles, paginatedInvoices,
    handleExportPdf, handleExportCsv, handleSaveTemplate, handleGeneratePdfForMissing,
  };
};
