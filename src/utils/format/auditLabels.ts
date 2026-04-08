/**
 * قواميس ترجمة أسماء الجداول والعمليات — طبقة المرافق
 * تُستخدم من useAuditLog (hook) و auditLog.ts (PDF) بدون انعكاس معماري
 */

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
