/**
 * قواميس ترجمة أسماء الجداول والعمليات + دوال مساعدة لسجل المراجعة
 * تُستخدم من useAuditLog (hook) و auditLog.ts (PDF) و DataDiff (UI)
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

const FIELD_LABELS: Record<string, string> = {
  amount: 'المبلغ', source: 'المصدر', date: 'التاريخ', description: 'الوصف',
  expense_type: 'نوع المصروف', notes: 'ملاحظات', property_id: 'العقار',
  fiscal_year_id: 'السنة المالية', contract_id: 'العقد', created_at: 'تاريخ الإنشاء',
  updated_at: 'تاريخ التحديث', id: 'المعرف', total_income: 'إجمالي الدخل',
  total_expenses: 'إجمالي المصروفات', admin_share: 'حصة الناظر',
  waqif_share: 'حصة الواقف', waqf_revenue: 'ريع الوقف',
  name: 'الاسم', share_percentage: 'نسبة الحصة', status: 'الحالة',
  beneficiary_id: 'المستفيد', account_id: 'الحساب',
  reason: 'السبب', label: 'التسمية',
};

export const getTableNameAr = (name: string) => TABLE_NAMES_AR[name] || name;
export const getOperationNameAr = (op: string) => OPERATION_NAMES_AR[op] || op;
export const getFieldLabel = (key: string) => FIELD_LABELS[key] || key;

/** ألوان شارات العمليات لسجل المراجعة */
export const operationColor = (op: string) => {
  switch (op) {
    case 'INSERT': return 'bg-success/15 text-success border-success/30';
    case 'UPDATE': return 'bg-warning/15 text-warning border-warning/30';
    case 'DELETE': return 'bg-destructive/15 text-destructive border-destructive/30';
    case 'REOPEN': return 'bg-info/15 text-info border-info/30';
    case 'CLOSE': return 'bg-status-special/15 text-status-special-foreground border-status-special/30';
    default: return '';
  }
};

/** تنسيق قيمة عشوائية للعرض (string/number/object) */
export const formatValue = (val: unknown): string => {
  if (val === null || val === undefined) return '—';
  if (typeof val === 'object') return JSON.stringify(val, null, 2);
  return String(val);
};
