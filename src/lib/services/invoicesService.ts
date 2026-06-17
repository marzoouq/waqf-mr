/**
 * invoicesService — طبقة بنية تحتية لاستعلامات/CUD جدول `invoices`.
 * مستخرج من useInvoices.ts ضمن M2.2. لا يتعامل مع توليد PDF (Edge Function).
 */
import { supabase } from '@/integrations/supabase/client';
import type { Invoice } from '@/types/invoices';
import { isFyAll } from '@/constants/fiscalYearIds';
import { logger } from '@/lib/logger';

export const INVOICES_SELECT =
  '*, property:properties(id, property_number, location), contract:contracts(id, contract_number, tenant_name)';

export const invoicesService = {
  async listByFiscalYear(fiscalYearId: string | 'all'): Promise<Invoice[]> {
    let query = supabase
      .from('invoices')
      .select(INVOICES_SELECT)
      .order('date', { ascending: false })
      .limit(1000);
    if (!isFyAll(fiscalYearId)) {
      query = query.eq('fiscal_year_id', fiscalYearId);
    }
    const { data, error } = await query;
    if (error) throw error;
    return data as Invoice[];
  },

  /**
   * حذف فاتورة من قاعدة البيانات أولاً، ثم الملف من Storage (CRIT-4: ترتيب صحيح).
   * R-NOW (W7-1): حارس صريح ضد حذف فواتير مدفوعة جزئياً/كلياً (Invoice Deletion Safeguard).
   * فشل الحذف من Storage غير قاتل ويُسجَّل كملف يتيم.
   */
  async remove(id: string, filePath?: string | null): Promise<void> {
    // 1) جلب الحالة قبل الحذف لمنع تدمير سجل دفع مرتبط
    const { data: existing, error: fetchErr } = await supabase
      .from('invoices')
      .select('id, status, payment_status')
      .eq('id', id)
      .maybeSingle();
    if (fetchErr) throw fetchErr;
    if (!existing) throw new Error('الفاتورة غير موجودة');

    const blockedStatuses = new Set(['paid', 'partially_paid']);
    const rec = existing as { status?: string | null; payment_status?: string | null };
    if ((rec.status && blockedStatuses.has(rec.status)) || (rec.payment_status && blockedStatuses.has(rec.payment_status))) {
      throw new Error('لا يمكن حذف فاتورة مدفوعة أو مدفوعة جزئياً — قم بإلغائها بدلاً من الحذف');
    }

    const { error } = await supabase.from('invoices').delete().eq('id', id);
    if (error) throw error;

    if (filePath) {
      try {
        await supabase.storage.from('invoices').remove([filePath]);
      } catch (storageErr) {
        logger.warn('فشل حذف ملف الفاتورة من التخزين — سيبقى كملف يتيم', { file_path: filePath, error: storageErr });
      }
    }
  },
};
