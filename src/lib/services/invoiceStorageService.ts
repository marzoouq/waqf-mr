/**
 * خدمة عمليات تخزين ملفات الفواتير
 * مسؤولة عن رفع ملفات PDF إلى Storage وتحديث file_path في قاعدة البيانات
 */
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

export const removeInvoiceFile = async (filePath: string) => {
  await supabase.storage.from('invoices').remove([filePath]);
};

/** تنظيف مسار الملف من الأحرف غير الآمنة */
const sanitizeStoragePath = (name: string): string =>
  name.replace(/[./\\]+/g, '_');

/**
 * رفع PDF إلى Storage وتحديث file_path في جدول payment_invoices
 * @returns URL محلي للعرض أو null عند الفشل
 */
export const uploadPaymentInvoicePdf = async (
  pdfBlob: Blob,
  invoiceId: string,
  invoiceNumber: string,
): Promise<string | null> => {
  try {
    const safeName = sanitizeStoragePath(invoiceNumber);
    const storagePath = `payment-invoices/${safeName}.pdf`;

    const { error: uploadError } = await supabase.storage
      .from('invoices')
      .upload(storagePath, pdfBlob, {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (uploadError) {
      // محاولة ثانية بإضافة timestamp
      const timestampPath = `payment-invoices/${safeName}-${Date.now()}.pdf`;
      const { error: retryError } = await supabase.storage
        .from('invoices')
        .upload(timestampPath, pdfBlob, {
          contentType: 'application/pdf',
          upsert: true,
        });

      if (!retryError) {
        const { error: updateError } = await supabase
          .from('payment_invoices')
          .update({ file_path: timestampPath })
          .eq('id', invoiceId);
        if (updateError) {
          logger.warn('[uploadPaymentInvoicePdf] DB update failed (retry path)', {
            invoiceId,
            storagePath: timestampPath,
            pathType: 'retry',
            error: updateError,
          });
        }
      } else {
        logger.warn('[uploadPaymentInvoicePdf] Storage upload failed (retry path)', {
          invoiceId,
          storagePath: timestampPath,
          error: retryError,
        });
      }
    } else {
      const { error: updateError } = await supabase
        .from('payment_invoices')
        .update({ file_path: storagePath })
        .eq('id', invoiceId);
      if (updateError) {
        logger.warn('[uploadPaymentInvoicePdf] DB update failed (primary path)', {
          invoiceId,
          storagePath,
          pathType: 'primary',
          error: updateError,
        });
      }
    }

    return URL.createObjectURL(pdfBlob);
  } catch (err) {
    logger.error('[uploadPaymentInvoicePdf] Error:', err);
    return null;
  }
};

/**
 * تحديث file_path في جدول invoices (فواتير عامة)
 */
export const updateInvoiceFilePath = async (
  invoiceId: string,
  invoiceNumber: string,
): Promise<void> => {
  const safeName = sanitizeStoragePath(invoiceNumber || invoiceId);
  const storagePath = `payment-invoices/${safeName}.pdf`;
  const { error: updateError } = await supabase
    .from('invoices')
    .update({ file_path: storagePath })
    .eq('id', invoiceId);
  if (updateError) {
    logger.warn('[updateInvoiceFilePath] DB update failed', {
      invoiceId,
      storagePath,
      error: updateError,
    });
  }
};

/**
 * حفظ PDF محلياً كملف تنزيل (fallback عند فشل الرفع)
 */
export const saveInvoicePdfLocally = async (
  pdfBlob: Blob,
  fileName: string,
): Promise<void> => {
  const url = URL.createObjectURL(pdfBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
};
