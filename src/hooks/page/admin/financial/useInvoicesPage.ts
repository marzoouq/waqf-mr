/**
 * هوك صفحة الفواتير — orchestrator نحيف يجمع helpers مفصلة:
 * - useInvoicesFilters / useInvoiceFormState / useInvoiceFileUpload
 * - useInvoicePreviewBuilder / useInvoicesExport / useInvoiceSubmit
 */
import { useState, useMemo } from 'react';
import { invoiceStatusBadgeVariant } from '@/utils/ui/badgeVariants';
import { DEFAULT_PAGE_SIZE } from '@/constants/pagination';
import {
  INVOICE_TYPE_LABELS, INVOICE_STATUS_LABELS, Invoice, useInvoicesByFiscalYear,
  useGenerateInvoicePdf,
} from '@/hooks/data/invoices/useInvoices';
import type { InvoicePreviewData } from '@/types/invoices';
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
  const { data: properties = [] } = useProperties();
  const { data: contracts = [] } = useContractsByFiscalYear(fiscalYearId);
  const generatePdf = useGenerateInvoicePdf();

  const {
    searchQuery, setSearchQuery,
    filterType, setFilterType,
    filterStatus, setFilterStatus,
    filteredInvoices,
  } = useInvoicesFilters(invoices);

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
    () => invoices.filter(inv => !inv.file_path),
    [invoices]
  );

  const paginatedInvoices = useMemo(
    () => filteredInvoices.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE),
    [filteredInvoices, currentPage, ITEMS_PER_PAGE]
  );

  const exportActions = useInvoicesExport({
    filteredInvoices,
    invoicesWithoutFiles,
    fiscalYearId,
    fiscalYearLabel: fiscalYear?.label,
    pdfWaqfInfo,
    createInvoice,
    generatePdf,
    setTemplateOpen,
  });

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
    buildPreviewData, statusBadgeVariant: invoiceStatusBadgeVariant,
    createInvoice, updateInvoice, generatePdf,
    isSaving: createInvoice.isPending || updateInvoice.isPending,
    isGeneratingPdf: generatePdf.isPending,
    ITEMS_PER_PAGE, INVOICE_TYPE_LABELS, INVOICE_STATUS_LABELS,
    invoicesWithoutFiles, paginatedInvoices,
    handleExportPdf: exportActions.handleExportPdf,
    handleExportCsv: exportActions.handleExportCsv,
    handleSaveTemplate: exportActions.handleSaveTemplate,
    handleGeneratePdfForMissing: exportActions.handleGeneratePdfForMissing,
  };
};
