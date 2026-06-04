/**
 * useInvoiceSubmit — يفصل منطق إرسال/تحديث الفواتير عن orchestrator.
 * يحافظ على نفس التحقق والتدفق (رفع ملف + إنشاء/تحديث + Toast + reset).
 */
import { useState } from 'react';
import {
  useCreateInvoice, useUpdateInvoice, useDeleteInvoice, uploadInvoiceFile,
  type Invoice,
} from '@/hooks/data/invoices/useInvoices';
import { uiNotify } from '@/lib/notify';
import { removeInvoiceFile } from '@/lib/services';

const sanitizeDescription = (value: string): string => {
  if (!value) return value;
  return value.replace(/^[=+\-@\t\r]+/, '');
};

interface UseInvoiceSubmitParams {
  editingInvoice: Invoice | null;
  formData: {
    invoice_number?: string | null;
    invoice_type: string;
    amount: string;
    date: string;
    property_id?: string | null;
    contract_id?: string | null;
    description?: string;
    status: string;
  };
  selectedFile: File | null;
  fiscalYearId?: string | null;
  setIsOpen: (v: boolean) => void;
  resetForm: () => void;
  setViewerFile: (v: { path: string; name: string | null } | null) => void;
}

export function useInvoiceSubmit({
  editingInvoice, formData, selectedFile, fiscalYearId,
  setIsOpen, resetForm, setViewerFile,
}: UseInvoiceSubmitParams) {
  const createInvoice = useCreateInvoice();
  const updateInvoice = useUpdateInvoice();
  const deleteInvoice = useDeleteInvoice();
  const [uploading, setUploading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.invoice_type || !formData.date) { uiNotify.error('يرجى ملء الحقول المطلوبة'); return; }
    if (!editingInvoice && !selectedFile) { uiNotify.error('يرجى رفع ملف الفاتورة'); return; }
    if (!(parseFloat(formData.amount) > 0)) { uiNotify.error('يرجى إدخال مبلغ أكبر من صفر'); return; }

    try {
      setUploading(true);
      const invoiceData: Record<string, unknown> = {
        invoice_number: formData.invoice_number || null,
        invoice_type: formData.invoice_type,
        amount: parseFloat(formData.amount) || 0,
        date: formData.date,
        property_id: formData.property_id || null,
        contract_id: formData.contract_id || null,
        description: sanitizeDescription(formData.description ?? '') || null,
        status: formData.status,
      };
      if (!editingInvoice && fiscalYearId) invoiceData.fiscal_year_id = fiscalYearId;

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
        uiNotify.success(editingInvoice ? 'تم تحديث الفاتورة بنجاح' : 'تم رفع الفاتورة بنجاح', {
          action: { label: 'عرض', onClick: () => setViewerFile({ path: viewablePath, name: viewableName || null }) },
        });
      }
    } catch {
      uiNotify.error('حدث خطأ أثناء حفظ الفاتورة');
    } finally {
      setUploading(false);
    }
  };

  const confirmDelete = async (target: { id: string; file_path?: string | null }) => {
    try {
      await deleteInvoice.mutateAsync({ id: target.id, file_path: target.file_path });
      uiNotify.success('تم حذف الفاتورة بنجاح');
    } catch {
      uiNotify.error('حدث خطأ أثناء حذف الفاتورة');
    }
  };

  return {
    createInvoice, updateInvoice, deleteInvoice,
    uploading,
    handleSubmit,
    confirmDelete,
  };
}
