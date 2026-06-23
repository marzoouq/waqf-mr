/**
 * جالب بيانات التصدير — مستخرج من useDataExport لفصل طبقة البيانات
 */
import { supabase } from '@/integrations/supabase/client';
import type { ExportableTable } from '@/types/ui';

export async function fetchTableData(table: ExportableTable, signal?: AbortSignal) {
  if (table === 'beneficiaries') {
    // استبعاد national_id و bank_account المشفرة
    const query = supabase
      .from('beneficiaries')
      .select('id,name,email,phone,share_percentage,notes,created_at,updated_at')
      .limit(5000);
    
    if (signal) query.abortSignal(signal);
    
    const { data, error } = await query;
    return { data: data as unknown as Record<string, unknown>[] | null, error };
  }

  // تحديد الأعمدة لكل جدول — استبعاد PII من contracts
  const contractColumns =
    'id, contract_number, tenant_name, property_id, unit_id, start_date, end_date, rent_amount, payment_type, payment_count, payment_amount, status, fiscal_year_id, created_at, updated_at';
  const selectCols = table === 'contracts' ? contractColumns : '*';
  
  const query = supabase.from(table).select(selectCols).limit(5000);
  if (signal) query.abortSignal(signal);
  
  const { data, error } = await query;
  return { data: data as unknown as Record<string, unknown>[] | null, error };
}
