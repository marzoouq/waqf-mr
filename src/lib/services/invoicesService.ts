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
   * فشل الحذف من Storage غير قاتل ويُسجَّل كملف يتيم.
   */
  async remove(id: string, filePath?: string | null): Promise<void> {
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
