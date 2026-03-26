/**
 * مكونات ودوال مساعدة لسجل المراجعة — DataDiff + ثوابت
 */


// ─── ألوان العمليات ───
// eslint-disable-next-line react-refresh/only-export-components
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

// ─── تنسيق القيم ───
export const formatValue = (val: unknown): string => {
  if (val === null || val === undefined) return '—';
  if (typeof val === 'object') return JSON.stringify(val, null, 2);
  return String(val);
};

// ─── تسميات الحقول ───
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

export const getFieldLabel = (key: string) => FIELD_LABELS[key] || key;

// ─── مكوّن عرض الفروقات ───
export function DataDiff({ oldData, newData, operation }: {
  oldData: Record<string, unknown> | null;
  newData: Record<string, unknown> | null;
  operation: string;
}) {
  if (operation === 'REOPEN' && newData) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
        {oldData && Object.entries(oldData).map(([key, val]) => (
          <div key={`old-${key}`} className="flex gap-2">
            <span className="font-medium text-muted-foreground">{getFieldLabel(key)} (قبل):</span>
            <span className="text-destructive line-through">{formatValue(val)}</span>
          </div>
        ))}
        {Object.entries(newData).map(([key, val]) => (
          <div key={`new-${key}`} className="flex gap-2">
            <span className="font-medium text-muted-foreground">{getFieldLabel(key)} (بعد):</span>
            <span className="text-success">{formatValue(val)}</span>
          </div>
        ))}
      </div>
    );
  }

  if (operation === 'INSERT' && newData) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
        {Object.entries(newData).filter(([k]) => !['id', 'created_at', 'updated_at'].includes(k)).map(([key, val]) => (
          <div key={key} className="flex gap-2">
            <span className="font-medium text-muted-foreground">{getFieldLabel(key)}:</span>
            <span className="text-success">{formatValue(val)}</span>
          </div>
        ))}
      </div>
    );
  }

  if (operation === 'DELETE' && oldData) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
        {Object.entries(oldData).filter(([k]) => !['id', 'created_at', 'updated_at'].includes(k)).map(([key, val]) => (
          <div key={key} className="flex gap-2">
            <span className="font-medium text-muted-foreground">{getFieldLabel(key)}:</span>
            <span className="text-destructive line-through">{formatValue(val)}</span>
          </div>
        ))}
      </div>
    );
  }

  if (operation === 'UPDATE' && oldData && newData) {
    const changedKeys = Object.keys(newData).filter(
      k => !['id', 'created_at', 'updated_at'].includes(k) && JSON.stringify(oldData[k]) !== JSON.stringify(newData[k])
    );
    if (changedKeys.length === 0) return <p className="text-sm text-muted-foreground">لا توجد تغييرات ظاهرة</p>;
    return (
      <div className="space-y-2 text-sm">
        {changedKeys.map(key => (
          <div key={key} className="flex flex-wrap gap-2 items-center">
            <span className="font-medium text-muted-foreground">{getFieldLabel(key)}:</span>
            <span className="text-destructive line-through">{formatValue(oldData[key])}</span>
            <span>←</span>
            <span className="text-success">{formatValue(newData[key])}</span>
          </div>
        ))}
      </div>
    );
  }

  return <p className="text-sm text-muted-foreground">لا توجد بيانات</p>;
}
