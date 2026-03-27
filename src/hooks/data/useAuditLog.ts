import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { STALE_MESSAGING } from '@/lib/queryStaleTime';

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
  REOPEN: 'إعادة فتح',
  CLOSE: 'إقفال',
};

export const getTableNameAr = (name: string) => TABLE_NAMES_AR[name] || name;
export const getOperationNameAr = (op: string) => OPERATION_NAMES_AR[op] || op;

export const useAuditLog = (filters?: {
  tableName?: string;
  operation?: string;
  searchQuery?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
}) => {
  const page = filters?.page ?? 1;
  const pageSize = filters?.pageSize ?? 50;

  return useQuery({
    queryKey: ['audit_log', filters?.tableName, filters?.operation, filters?.searchQuery, filters?.dateFrom, filters?.dateTo, page, pageSize],
    queryFn: async () => {
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      let query = supabase
        .from('audit_log')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to);

      if (filters?.tableName) {
        query = query.eq('table_name', filters.tableName);
      }
      if (filters?.operation) {
        query = query.eq('operation', filters.operation);
      }
      if (filters?.searchQuery) {
        // تنظيف: إزالة الأحرف الخاصة لمنع التلاعب بالاستعلام
        const safe = filters.searchQuery.replace(/[%_\\(),.*]/g, '');
        if (safe.length > 0) {
          query = query.or(`table_name.ilike.%${safe}%,operation.ilike.%${safe}%`);
        }
      }
      if (filters?.dateFrom) {
        query = query.gte('created_at', filters.dateFrom);
      }
      if (filters?.dateTo) {
        query = query.lte('created_at', filters.dateTo + 'T23:59:59');
      }

      const { data, error, count } = await query;
      if (error) throw error;
      return {
        logs: (data || []) as AuditLogEntry[],
        totalCount: count ?? 0,
      };
    },
    staleTime: STALE_MESSAGING,
  });
};
