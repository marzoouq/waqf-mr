import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AuditLogEntry {
  id: string;
  table_name: string;
  operation: string;
  record_id: string | null;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  user_id: string | null;
  created_at: string;
}

const TABLE_NAMES_AR: Record<string, string> = {
  income: 'الدخل',
  expenses: 'المصروفات',
  accounts: 'الحسابات',
  distributions: 'التوزيعات',
  invoices: 'الفواتير',
  properties: 'العقارات',
  contracts: 'العقود',
  beneficiaries: 'المستفيدين',
  units: 'الوحدات',
  fiscal_years: 'السنوات المالية',
};

const OPERATION_NAMES_AR: Record<string, string> = {
  INSERT: 'إضافة',
  UPDATE: 'تعديل',
  DELETE: 'حذف',
};

export const getTableNameAr = (name: string) => TABLE_NAMES_AR[name] || name;
export const getOperationNameAr = (op: string) => OPERATION_NAMES_AR[op] || op;

export const useAuditLog = (filters?: {
  tableName?: string;
  operation?: string;
}) => {
  return useQuery({
    queryKey: ['audit_log', filters],
    queryFn: async () => {
      let query = supabase
        .from('audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);

      if (filters?.tableName) {
        query = query.eq('table_name', filters.tableName);
      }
      if (filters?.operation) {
        query = query.eq('operation', filters.operation);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as AuditLogEntry[];
    },
  });
};
