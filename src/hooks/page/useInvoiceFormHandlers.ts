/**
 * معالجات نموذج الفاتورة — submit, edit, delete, preview
 */
import { useMemo } from 'react';
import { safeNumber } from '@/utils/safeNumber';
import { supabase } from '@/integrations/supabase/client';
import {
  useCreateInvoice, useUpdateInvoice, useDeleteInvoice, uploadInvoiceFile,
  INVOICE_TYPE_LABELS, INVOICE_STATUS_LABELS, type Invoice, useInvoicesByFiscalYear,
  useGenerateInvoicePdf,
} from '@/hooks/data/useInvoices';
import type { InvoicePreviewData } from '@/components/invoices/InvoicePreviewDialog';
import { useProperties } from '@/hooks/data/useProperties';
import { useContractsByFiscalYear } from '@/hooks/data/useContracts';
import { usePdfWaqfInfo } from '@/hooks/data/usePdfWaqfInfo';
import { toast } from 'sonner';
import type { InvoiceFormData } from './useInvoiceFormState';

// تعقيم الوصف ضد CSV Injection
const sanitizeDescription = (value: string): string => {
  if (!value) return value;
  return value.replace(/^[=+\-@\t\r]+/, '');
};

interface FormHandlersDeps {
  fiscalYearId: string;
  fiscalYearObj: { id: string } | null;
  editingInvoice: Invoice | null;
  selectedFile: File | null;
  formData: InvoiceFormData;
  setIsOpen: (v: boolean) => void;
  setUploading: (v: boolean) => void;
  setViewerFile: (v: { path: string; name: string | null } | null) => void;
  resetForm: () => void;
}

export const useInvoiceFormHandlers = (deps: FormHandlersDeps) => {
  const { fiscalYearId, fiscalYearObj, editingInvoice, selectedFile, formData, setIsOpen, setUploading, setViewerFile, resetForm } = deps;

  const pdfWaqfInfo = usePdfWaqfInfo();
  const { data: invoices = [], isLoading } = useInvoicesByFiscalYear(fiscalYearId);
  const { data: properties = [] } = useProperties();
  const { data: contracts = [] } = useContractsByFiscalYear(fiscalYearId);
  const createInvoice = useCreateInvoice();
  const updateInvoice = useUpdateInvoice();
  const deleteInvoice = useDeleteInvoice();
  const generatePdf = useGenerateInvoicePdf();

  // بناء بيانات المعاينة
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.invoice_type || !formData.date) { toast.error('يرجى ملء الحقول المطلوبة'); return; }
    if (!editingInvoice && !selectedFile) { toast.error('يرجى رفع ملف الفاتورة'); return; }
    if (!(parseFloat(formData.amount) > 0)) { toast.error('يرجى إدخال مبلغ أكبر من صفر'); return; }

    try {
      setUploading(true);
      const invoiceData: Record<string, unknown> = {
        invoice_number: formData.invoice_number || null, invoice_type: formData.invoice_type,
        amount: parseFloat(formData.amount) || 0, date: formData.date,
        property_id: formData.property_id || null, contract_id: formData.contract_id || null,
        description: sanitizeDescription(formData.description) || null, status: formData.status,
      };
      if (!editingInvoice && fiscalYearObj?.id) invoiceData.fiscal_year_id = fiscalYearObj.id;

      if (selectedFile) {
        if (editingInvoice?.file_path) {
          try { await supabase.storage.from('invoices').remove([editingInvoice.file_path]); } catch { /* تجاهل */ }
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
        toast.success(editingInvoice ? 'تم تحديث الفاتورة بنجاح' : 'تم رفع الفاتورة بنجاح', {
          action: { label: 'عرض', onClick: () => setViewerFile({ path: viewablePath, name: viewableName || null }) },
        });
      }
    } catch {
      toast.error('حدث خطأ أثناء حفظ الفاتورة');
    } finally {
      setUploading(false);
    }
  };

  const handleConfirmDelete = async (deleteTarget: { id: string; file_path?: string | null } | null) => {
    if (!deleteTarget) return;
    try {
      await deleteInvoice.mutateAsync({ id: deleteTarget.id, file_path: deleteTarget.file_path });
    } catch { /* mutation handles toast */ }
  };

  const filteredInvoices = useMemo(() => {
    const { searchQuery, filterType: ft, filterStatus: fs } = { searchQuery: formData.invoice_number, filterType: 'all', filterStatus: 'all' };
    return invoices;
  }, [invoices]);

  const statusBadgeVariant = (status: string) => {
    if (status === 'paid') return 'default' as const;
    if (status === 'cancelled') return 'destructive' as const;
    return 'secondary' as const;
  };

  return {
    invoices, properties, contracts, isLoading, pdfWaqfInfo,
    createInvoice, updateInvoice, generatePdf,
    buildPreviewData, handleSubmit, handleConfirmDelete, statusBadgeVariant,
    INVOICE_TYPE_LABELS, INVOICE_STATUS_LABELS,
  };
};
