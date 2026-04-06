/**
 * هوك منطق صفحة الفواتير — state + form + handlers
 */
import { useState, useRef, useEffect, useMemo } from 'react';
import { safeNumber } from '@/utils/format/safeNumber';
import {
  useCreateInvoice, useUpdateInvoice, useDeleteInvoice, uploadInvoiceFile,
  INVOICE_TYPE_LABELS, INVOICE_STATUS_LABELS, Invoice, useInvoicesByFiscalYear,
  useGenerateInvoicePdf, ALLOWED_MIME_TYPES, MAX_FILE_SIZE,
} from '@/hooks/data/invoices/useInvoices';
import type { InvoicePreviewData } from '@/components/invoices';
import { useProperties } from '@/hooks/data/properties/useProperties';
import { useContractsByFiscalYear } from '@/hooks/data/contracts/useContracts';
import { useFiscalYear } from '@/contexts/FiscalYearContext';
import { usePdfWaqfInfo } from '@/hooks/data/settings/usePdfWaqfInfo';
import { defaultNotify } from '@/lib/notify';
import { removeInvoiceFile } from '@/lib/services';

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

  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string; file_path?: string | null } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [_fileError, setFileError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [viewerFile, setViewerFile] = useState<{ path: string; name: string | null } | null>(null);
  const [previewInvoice, setPreviewInvoice] = useState<InvoicePreviewData | null>(null);
  const [templateOpen, setTemplateOpen] = useState(false);

  const [formData, setFormData] = useState({
    invoice_number: '', invoice_type: '', amount: '', date: '',
    property_id: '', contract_id: '', description: '', status: 'pending',
  });

  const buildPreviewData = (inv: Invoice): InvoicePreviewData => {
    const contract = contracts.find(c => c.id === inv.contract_id);
    const hasVat = safeNumber(inv.vat_rate) > 0;
    const hasBuyerTax = !!contract?.tenant_tax_number;
    return {
      id: inv.id,
      invoiceNumber: inv.invoice_number || `INV-${inv.id.slice(0, 6)}`,
      date: inv.date, type: (hasVat && hasBuyerTax) ? 'standard' : 'simplified',
      sellerName: pdfWaqfInfo.waqfName || 'وقف مرزوق بن علي الثبيتي',
      sellerAddress: pdfWaqfInfo.address, sellerVatNumber: pdfWaqfInfo.vatNumber,
      sellerCR: pdfWaqfInfo.commercialReg, sellerLogo: pdfWaqfInfo.logoUrl,
      buyerName: contract?.tenant_name || inv.contract?.tenant_name || '-',
      buyerVatNumber: contract?.tenant_tax_number || undefined,
      buyerCR: contract?.tenant_crn || undefined,
      buyerIdType: contract?.tenant_id_type || undefined,
      buyerIdNumber: contract?.tenant_id_number || undefined,
      buyerStreet: contract?.tenant_street || undefined,
      buyerDistrict: contract?.tenant_district || undefined,
      buyerCity: contract?.tenant_city || undefined,
      buyerPostalCode: contract?.tenant_postal_code || undefined,
      buyerBuilding: contract?.tenant_building || undefined,
      items: [{
        description: `${INVOICE_TYPE_LABELS[inv.invoice_type] || inv.invoice_type}${inv.description ? ` — ${inv.description}` : ''}`,
        quantity: 1,
        unitPrice: safeNumber(inv.vat_amount) > 0
          ? safeNumber(inv.amount) - safeNumber(inv.vat_amount)
          : (safeNumber(inv.vat_rate) > 0 ? safeNumber(inv.amount) / (1 + safeNumber(inv.vat_rate) / 100) : safeNumber(inv.amount)),
        vatRate: safeNumber(inv.vat_rate),
      }],
      notes: inv.description || undefined, status: inv.status,
      bankName: pdfWaqfInfo.bankName, bankIBAN: pdfWaqfInfo.bankIBAN,
      zatcaUuid: inv.zatca_uuid || undefined, zatcaStatus: inv.zatca_status || undefined,
    };
  };

  useEffect(() => {
    return () => { if (previewUrl) URL.revokeObjectURL(previewUrl); };
  }, [previewUrl]);

  const ITEMS_PER_PAGE = 10;

  const validateAndSetFile = (file: File) => {
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      setFileError('نوع الملف غير مسموح. الأنواع المسموحة: PDF, JPG, PNG, WEBP');
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setFileError('حجم الملف يتجاوز الحد الأقصى (10 ميجابايت)');
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    setFileError('');
    setSelectedFile(file);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    if (file.type.startsWith('image/')) {
      setPreviewUrl(URL.createObjectURL(file));
    } else {
      setPreviewUrl(null);
    }
  };

  const resetForm = () => {
    setFormData({ invoice_number: '', invoice_type: '', amount: '', date: '', property_id: '', contract_id: '', description: '', status: 'pending' });
    setSelectedFile(null);
    setFileError('');
    setEditingInvoice(null);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleEdit = (item: Invoice) => {
    setEditingInvoice(item);
    setFormData({
      invoice_number: item.invoice_number || '', invoice_type: item.invoice_type,
      amount: item.amount.toString(), date: item.date, property_id: item.property_id || '',
      contract_id: item.contract_id || '', description: item.description || '', status: item.status,
    });
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
        await updateInvoice.mutateAsync({ id: editingInvoice.id, ...invoiceData } as unknown as Parameters<typeof updateInvoice.mutateAsync>[0]);
      } else {
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

  const filteredInvoices = useMemo(() => {
    return invoices.filter((item) => {
      if (filterType !== 'all' && item.invoice_type !== filterType) return false;
      if (filterStatus !== 'all' && item.status !== filterStatus) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (item.invoice_number || '').toLowerCase().includes(q) || (INVOICE_TYPE_LABELS[item.invoice_type] || '').includes(q) ||
          (item.description || '').toLowerCase().includes(q) || (item.file_name || '').toLowerCase().includes(q) || item.date.includes(q);
      }
      return true;
    });
  }, [invoices, filterType, filterStatus, searchQuery]);

  const statusBadgeVariant = (status: string) => {
    if (status === 'paid') return 'default' as const;
    if (status === 'cancelled') return 'destructive' as const;
    return 'secondary' as const;
  };

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
    ITEMS_PER_PAGE, INVOICE_TYPE_LABELS, INVOICE_STATUS_LABELS,
  };
};
