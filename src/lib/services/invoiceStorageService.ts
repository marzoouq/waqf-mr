/**
 * خدمة عمليات تخزين ملفات الفواتير
 */
import { supabase } from '@/integrations/supabase/client';

export const removeInvoiceFile = async (filePath: string) => {
  await supabase.storage.from('invoices').remove([filePath]);
};
