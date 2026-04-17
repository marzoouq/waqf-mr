/**
 * هوك صفحة الفواتير — orchestrator نحيف يجمع helpers مفصلة:
 * - useInvoicesFilters: فلترة
 * - useInvoiceFormState: حالة النموذج + editing
 * - useInvoiceFileUpload: حالة الملف + معاينة
 * - useInvoicePreviewBuilder: بناء بيانات معاينة PDF
 */
import { useState } from 'react';
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
        // CRUD factory — cast مطلوب لأنواع عامة
        await updateInvoice.mutateAsync({ id: editingInvoice.id, ...invoiceData } as unknown as Parameters<typeof updateInvoice.mutateAsync>[0]);
      } else {
        // CRUD factory — cast مطلوب
        await createInvoice.mutateAsync(invoiceData as unknown as Parameters<typeof createInvoice.mutateAsync>[0]);
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
  };
};
