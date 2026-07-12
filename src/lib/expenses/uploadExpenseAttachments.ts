/**
 * دالة رفع مرفقات المصروف — مستخرجة من useExpensesMutations.
 * ترفع كل ملف كسجل فاتورة (invoice) مرتبط بـ expense_id.
 * تستخدم Promise.allSettled لعدم إيقاف البقية عند فشل ملف واحد.
 */
import { logger } from '@/lib/logger';
import { uploadInvoiceFile } from '@/hooks/data/invoices/useInvoiceFileUtils';
import { mapExpenseTypeToInvoiceType } from '@/utils/financial/expenses/expenseInvoiceTypeMap';
import type { StagedFile } from '@/hooks/ui/useMultipleFilesUpload';

export interface UploadExpenseAttachmentsParams {
  files: StagedFile[];
  expenseId: string;
  expenseType: string;
  amount: number;
  date: string;
  propertyId: string | null;
  fiscalYearId: string;
  description: string | null;
  createInvoice: { mutateAsync: (data: unknown) => Promise<unknown> };
}

/** @returns عدد الملفات التي فشلت */
export async function uploadExpenseAttachments(params: UploadExpenseAttachmentsParams): Promise<number> {
  const { files, expenseId, expenseType, amount, date, propertyId, fiscalYearId, description, createInvoice } = params;
  if (files.length === 0) return 0;

  const invoiceType = mapExpenseTypeToInvoiceType(expenseType);
  const results = await Promise.allSettled(
    files.map(async (sf) => {
      const { path, name } = await uploadInvoiceFile(sf.file);
      await createInvoice.mutateAsync({
        expense_id: expenseId,
        invoice_type: invoiceType,
        amount,
        date,
        property_id: propertyId,
        fiscal_year_id: fiscalYearId,
        status: 'paid',
        file_path: path,
        file_name: name,
        description,
        vat_rate: 0,
        vat_amount: 0,
      });
    })
  );

  const failed = results.filter((r) => r.status === 'rejected');
  failed.forEach((r) => {
    if (r.status === 'rejected') logger.error('Attach invoice to expense failed', r.reason);
  });
  return failed.length;
}
